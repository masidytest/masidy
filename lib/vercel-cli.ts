import 'server-only'

import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { promisify } from 'node:util'
import {
  getVercelPlatformConfig,
  VercelPlatformError,
} from '@/lib/vercel-platform'

const execFileAsync = promisify(execFile)
const require = createRequire(join(process.cwd(), 'package.json'))
const cliPath = require.resolve('vercel/dist/vc.js')

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export async function runVercelCli(
  projectId: string,
  args: string[],
  options: { cwd?: string; timeout?: number } = {},
): Promise<string> {
  const { token, teamId } = getVercelPlatformConfig()
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [cliPath, ...args, '--non-interactive'],
      {
        cwd: options.cwd,
        env: {
          ...process.env,
          VERCEL_TOKEN: token,
          VERCEL_ORG_ID: teamId,
          VERCEL_PROJECT_ID: projectId,
          NO_COLOR: '1',
        },
        windowsHide: true,
        maxBuffer: 1024 * 1024,
        timeout: options.timeout ?? 120_000,
      },
    )
    return stdout
  } catch (error) {
    const exitCode =
      isRecord(error) && typeof error.code === 'number' ? error.code : 502
    const stderr =
      isRecord(error) && typeof error.stderr === 'string'
        ? error.stderr
        : undefined
    const detail = stderr
      ?.split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('Vercel CLI '))
    console.error('Vercel CLI command failed:', { exitCode, detail })
    throw new VercelPlatformError(
      detail || 'Vercel could not complete this operation.',
      exitCode >= 400 && exitCode < 600 ? exitCode : 502,
    )
  }
}
