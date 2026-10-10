import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import {
  getChatIdsByUserId,
  getChatOwnership,
} from '@/lib/db/queries'
import { getAccessibleProjectIds } from '@/lib/project-access'
import { v0 } from '@/lib/v0-key-pool'
import { runVercelCli } from '@/lib/vercel-cli'
import { getVercelDeploymentFiles } from '@/lib/vercel-deployment-files'
import { VercelPlatformError } from '@/lib/vercel-platform'
import {
  getOrCreateLinkedVercelProjectId,
  verifyVercelProjectAccess,
} from '@/lib/vercel-projects'

export const runtime = 'nodejs'
export const maxDuration = 120

function getCliDeployment(output: string) {
  let parsed: unknown
  try {
    parsed = JSON.parse(output)
  } catch {
    throw new VercelPlatformError(
      'Vercel accepted no readable deployment details. Check the Vercel team dashboard.',
      502,
    )
  }

  const candidates = Array.isArray(parsed) ? parsed : [parsed]
  const deployment = candidates.find(
    (candidate): candidate is Record<string, unknown> & { url: string } =>
      candidate &&
      typeof candidate === 'object' &&
      'url' in candidate &&
      typeof candidate.url === 'string',
  )
  if (!deployment || typeof deployment.url !== 'string') {
    throw new VercelPlatformError(
      'Vercel did not return a deployment URL.',
      502,
    )
  }

  let webUrl: URL
  try {
    webUrl = new URL(
      deployment.url.startsWith('https://')
        ? deployment.url
        : `https://${deployment.url}`,
    )
  } catch {
    throw new VercelPlatformError(
      'Vercel returned an invalid deployment URL.',
      502,
    )
  }
  if (webUrl.protocol !== 'https:') {
    throw new VercelPlatformError(
      'Vercel returned an insecure deployment URL.',
      502,
    )
  }

  return {
    id:
      'id' in deployment && typeof deployment.id === 'string'
        ? deployment.id
        : undefined,
    webUrl: webUrl.toString(),
    inspectorUrl:
      'inspectorUrl' in deployment &&
      typeof deployment.inspectorUrl === 'string'
        ? deployment.inspectorUrl
        : undefined,
    readyState:
      'readyState' in deployment && typeof deployment.readyState === 'string'
        ? deployment.readyState
        : undefined,
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  let workDirectory: string | undefined
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      )
    }

    const { projectId } = await params
    const projectIds = await getAccessibleProjectIds(session.user.id)
    if (!projectIds.has(projectId)) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON.' },
        { status: 400 },
      )
    }
    if (
      !body ||
      typeof body !== 'object' ||
      !('chatId' in body) ||
      typeof body.chatId !== 'string' ||
      !body.chatId ||
      !('versionId' in body) ||
      typeof body.versionId !== 'string' ||
      !body.versionId
    ) {
      return NextResponse.json(
        { error: 'A chat ID and completed version ID are required.' },
        { status: 400 },
      )
    }

    const [ownership, ownedChatIds] = await Promise.all([
      getChatOwnership({ v0ChatId: body.chatId }),
      getChatIdsByUserId({ userId: session.user.id }),
    ])
    if (
      !ownership ||
      ownership.user_id !== session.user.id ||
      !ownedChatIds.includes(body.chatId)
    ) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    }

    const [chat, version] = await Promise.all([
      v0.chats.getById({ chatId: body.chatId }),
      v0.chats.getVersion({
        chatId: body.chatId,
        versionId: body.versionId,
      }),
    ])
    if (chat.projectId !== projectId) {
      return NextResponse.json(
        { error: 'This chat is not assigned to the selected project.' },
        { status: 409 },
      )
    }
    if (version.status !== 'completed') {
      return NextResponse.json(
        { error: 'Only completed versions can be deployed.' },
        { status: 409 },
      )
    }

    const archive = await v0.chats.downloadVersion({
      chatId: body.chatId,
      versionId: body.versionId,
      format: 'zip',
      includeDefaultFiles: true,
    })
    const files = await getVercelDeploymentFiles(archive)
    workDirectory = await mkdtemp(join(tmpdir(), 'masidy-vercel-deploy-'))
    for (const file of files) {
      const filePath = resolve(workDirectory, ...file.path.split('/'))
      const deploymentRoot = resolve(workDirectory) + (process.platform === 'win32' ? '\\' : '/')
      if (!filePath.startsWith(deploymentRoot)) {
        throw new VercelPlatformError(
          'The generated project archive contains an unsafe file path.',
          422,
        )
      }
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, file.content, { flag: 'wx' })
    }

    const vercelProjectId =
      await getOrCreateLinkedVercelProjectId(projectId)
    await verifyVercelProjectAccess(vercelProjectId)
    const output = await runVercelCli(
      vercelProjectId,
      [
        'deploy',
        workDirectory,
        '--yes',
        '--prod',
        '--no-wait',
        '--json',
        '--project',
        vercelProjectId,
        '--meta',
        `masidy_chat_id=${body.chatId}`,
        '--meta',
        `masidy_version_id=${body.versionId}`,
      ],
      { timeout: 120_000 },
    )
    const deployment = getCliDeployment(output)

    return NextResponse.json(
      {
        ...deployment,
        projectId: vercelProjectId,
        chatId: body.chatId,
        versionId: body.versionId,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof VercelPlatformError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      )
    }
    if (error instanceof Error && /generated project/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    console.error('Vercel project deployment failed:', error)
    return NextResponse.json(
      { error: 'Could not deploy this project to Vercel.' },
      { status: 500 },
    )
  } finally {
    if (workDirectory) {
      await rm(workDirectory, { recursive: true, force: true }).catch((error) =>
        console.error('Could not clean up Vercel deployment files:', error),
      )
    }
  }
}
