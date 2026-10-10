import assert from 'node:assert/strict'
import test from 'node:test'
import { strToU8, zipSync } from 'fflate'
import { getVercelDeploymentFiles } from './vercel-deployment-files'

function archiveBuffer(files: Record<string, string>): ArrayBuffer {
  const archive = zipSync(
    Object.fromEntries(
      Object.entries(files).map(([path, content]) => [path, strToU8(content)]),
    ),
  )
  return archive.buffer.slice(
    archive.byteOffset,
    archive.byteOffset + archive.byteLength,
  )
}

test('keeps app source and removes private or generated files', async () => {
  const files = getVercelDeploymentFiles(
    archiveBuffer({
      'package.json': '{}',
      'src/app.ts': 'export {}',
      '.env.local': 'SECRET=value',
      'node_modules/pkg/index.js': 'ignored',
      '.git/config': 'ignored',
      'private.pem': 'ignored',
    }),
  )

  assert.deepEqual(
    (await files).map(({ path }) => path).sort(),
    ['package.json', 'src/app.ts'],
  )
})

test('rejects archive paths that could escape the deployment directory', async () => {
  await assert.rejects(
    () =>
      getVercelDeploymentFiles(
        archiveBuffer({ '../outside.txt': 'unsafe' }),
      ),
    /unsafe file path/,
  )
})

test('rejects archives without deployable files', async () => {
  await assert.rejects(
    () => getVercelDeploymentFiles(archiveBuffer({ '.env': 'SECRET=value' })),
    /no deployable files/,
  )
})
