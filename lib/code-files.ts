export interface CodeFile {
  fileName: string
  source: string
}

export function normalizeCodeFileName(fileName: string): string {
  return fileName
    .replace(/\\/g, '/')
    .replace(/^(\.\/)+/, '')
    .replace(/^\/+/, '')
    .trim()
}

function parseV0Source(source: string): CodeFile[] {
  const markerRegex = /\[V0_FILE\][^\r\n]*?file="([^"]+)"[^\r\n]*(?:\r?\n|$)/g
  const markers: Array<{
    fileName: string
    index: number
    contentStart: number
  }> = []
  let match: RegExpExecArray | null

  while ((match = markerRegex.exec(source)) !== null) {
    markers.push({
      fileName: match[1],
      index: match.index,
      contentStart: markerRegex.lastIndex,
    })
  }

  return markers.map((marker, index) => ({
    fileName: marker.fileName,
    source: source
      .slice(
        marker.contentStart,
        index + 1 < markers.length ? markers[index + 1].index : source.length,
      )
      .trim(),
  }))
}

function toCodeFile(value: unknown): CodeFile | null {
  if (!value || typeof value !== 'object') return null

  const file = value as Record<string, unknown>
  const metadata =
    file.meta && typeof file.meta === 'object'
      ? (file.meta as Record<string, unknown>)
      : {}
  const fileName =
    file.fileName ??
    file.filePath ??
    file.baseName ??
    file.path ??
    file.name ??
    metadata.fileName ??
    metadata.filename ??
    metadata.file ??
    metadata.path
  if (typeof fileName !== 'string' || !fileName) return null

  const source = file.content ?? file.source ?? file.code ?? file.text
  return {
    fileName: normalizeCodeFileName(fileName),
    source: typeof source === 'string' ? source : '',
  }
}

export function extractCodeFiles(content: unknown): CodeFile[] {
  const visited = new Set<object>()

  const visit = (value: unknown): CodeFile[] => {
    if (!value || typeof value !== 'object' || visited.has(value)) return []
    visited.add(value)

    if (Array.isArray(value)) {
      return value.flatMap(visit)
    }

    const node = value as Record<string, unknown>

    if (node.type === 'code-project') {
      const changedFiles = Array.isArray(node.changedFiles)
        ? node.changedFiles
            .map(toCodeFile)
            .filter((file): file is CodeFile => file !== null)
        : []
      const parsedFiles =
        typeof node.source === 'string' ? parseV0Source(node.source) : []
      return [...changedFiles, ...parsedFiles]
    }

    const codeFile = toCodeFile(node)
    if (
      codeFile &&
      typeof (node.content ?? node.source ?? node.code) === 'string'
    ) {
      return [codeFile]
    }

    if (node.type === 'task-coding-v1' && Array.isArray(node.parts)) {
      return visit(node.parts)
    }

    return Object.values(node).flatMap(visit)
  }

  const files = visit(content)
  const latestFiles = new Map<string, CodeFile>()
  for (const file of files) {
    if (!file.fileName) continue
    const existing = latestFiles.get(file.fileName)
    if (!existing || file.source) latestFiles.set(file.fileName, file)
  }
  return Array.from(latestFiles.values())
}
