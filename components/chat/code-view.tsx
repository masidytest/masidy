'use client'

import { useState } from 'react'
import { FileCode2, Folder, FolderOpen } from 'lucide-react'
import { CodeBlock } from '@/components/ui/code-block'
import { normalizeCodeFileName } from '@/lib/code-files'
import { useLocale } from '@/components/providers/locale-provider'

interface CodeFile {
  fileName: string
  source: string
}

interface CodeViewProps {
  files: CodeFile[]
}

type FileTreeNode =
  | {
      type: 'directory'
      name: string
      path: string
      children: FileTreeNode[]
    }
  | {
      type: 'file'
      name: string
      path: string
      file: CodeFile
    }

function buildFileTree(files: CodeFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = []

  for (const file of files) {
    const path = normalizeCodeFileName(file.fileName)
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0) continue

    let siblings = root
    let directoryPath = ''
    for (const segment of segments.slice(0, -1)) {
      directoryPath = directoryPath ? `${directoryPath}/${segment}` : segment
      let directory = siblings.find(
        (node) => node.type === 'directory' && node.path === directoryPath,
      )
      if (!directory) {
        directory = {
          type: 'directory',
          name: segment,
          path: directoryPath,
          children: [],
        }
        siblings.push(directory)
      }
      if (directory.type !== 'directory') continue
      siblings = directory.children
    }

    const name = segments[segments.length - 1]
    siblings.push({
      type: 'file',
      name,
      path,
      file: { ...file, fileName: path },
    })
  }

  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    for (const node of nodes) {
      if (node.type === 'directory') sortNodes(node.children)
    }
  }
  sortNodes(root)
  return root
}

function getLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const languages: Record<string, string> = {
    bash: 'bash',
    cjs: 'javascript',
    css: 'css',
    env: 'bash',
    html: 'html',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    md: 'markdown',
    mdx: 'mdx',
    mjs: 'javascript',
    py: 'python',
    scss: 'scss',
    sh: 'bash',
    sql: 'sql',
    ts: 'typescript',
    tsx: 'tsx',
    toml: 'toml',
    yml: 'yaml',
    yaml: 'yaml',
  }
  return languages[ext] || 'text'
}

export function CodeView({ files }: CodeViewProps) {
  const { t } = useLocale()
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    () => new Set(),
  )

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        {t('No files to display')}
      </div>
    )
  }

  const fileTree = buildFileTree(files)
  const selectedFile =
    files.find(
      (file) => normalizeCodeFileName(file.fileName) === selectedFileName,
    ) || files[0]
  const selectedPath =
    selectedFileName || normalizeCodeFileName(files[0].fileName)

  const renderNodes = (nodes: FileTreeNode[], depth = 0) =>
    nodes.map((node) => {
      if (node.type === 'directory') {
        const isCollapsed = collapsedFolders.has(node.path)
        const FolderIcon = isCollapsed ? Folder : FolderOpen
        return (
          <div key={node.path}>
            <button
              type="button"
              role="treeitem"
              aria-level={depth + 1}
              aria-expanded={!isCollapsed}
              onClick={() =>
                setCollapsedFolders((previous) => {
                  const next = new Set(previous)
                  if (next.has(node.path)) next.delete(node.path)
                  else next.add(node.path)
                  return next
                })
              }
              className="flex w-full items-center gap-1.5 py-1.5 pr-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              style={{ paddingInlineStart: 8 + depth * 12 }}
            >
              <FolderIcon className="size-3.5 shrink-0" />
              <span className="truncate">{node.name}</span>
            </button>
            {!isCollapsed && renderNodes(node.children, depth + 1)}
          </div>
        )
      }

      const isSelected = node.path === selectedPath
      return (
        <button
          key={node.path}
          type="button"
          role="treeitem"
          aria-level={depth + 1}
          aria-pressed={isSelected}
          onClick={() => setSelectedFileName(node.path)}
          className={`flex w-full items-center gap-1.5 py-1.5 pr-2 text-left text-xs font-mono hover:bg-muted ${
            isSelected
              ? 'bg-background text-foreground'
              : 'text-muted-foreground'
          }`}
          style={{ paddingInlineStart: 8 + depth * 12 }}
          title={node.path}
        >
          <FileCode2 className="size-3.5 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
      )
    })

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* File tree sidebar */}
      <div
        role="tree"
        aria-label={t('Project files')}
        className="w-48 min-w-[12rem] flex-shrink-0 overflow-y-auto border-r border-border bg-muted/20 py-2"
      >
        {renderNodes(fileTree)}
      </div>

      {/* Code display */}
      <div className="flex-1 overflow-auto bg-background">
        {selectedFile.source.length > 0 ? (
          <CodeBlock
            code={selectedFile.source}
            language={getLanguage(selectedFile.fileName)}
            filename={selectedFile.fileName}
            showLineNumbers={true}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            <div>
              <p className="font-medium">{t('Source content is empty')}</p>
              <p className="mt-1 text-xs">{selectedFile.fileName}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
