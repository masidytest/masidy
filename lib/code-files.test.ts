import assert from 'node:assert/strict'
import test from 'node:test'
import { extractCodeFiles } from './code-files'

test('extracts complete paths and source from v0 coding task parts', () => {
  const files = extractCodeFiles({
    type: 'task-coding-v1',
    parts: [
      {
        type: 'code-project',
        changedFiles: [
          {
            meta: { fileName: 'src\\app.tsx' },
            source: 'export default 1',
          },
          { path: 'src/empty.ts', content: '' },
        ],
        source: '[V0_FILE] file="src/README.md"\nDocs',
      },
    ],
  })

  assert.deepEqual(
    files.map((file) => file.fileName),
    ['src/app.tsx', 'src/empty.ts', 'src/README.md'],
  )
  assert.equal(files[0].source, 'export default 1')
  assert.equal(files[1].source, '')
  assert.equal(files[2].source, 'Docs')
})

test('prefers non-empty latest content for duplicate file paths', () => {
  const files = extractCodeFiles([
    { fileName: './src/app.tsx', content: 'older source' },
    { path: 'src\\app.tsx', source: '' },
    { fileName: 'src/app.tsx', source: 'latest source' },
  ])

  assert.deepEqual(files, [
    { fileName: 'src/app.tsx', source: 'latest source' },
  ])
})
