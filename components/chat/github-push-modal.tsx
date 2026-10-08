'use client'

import { zipSync, strToU8 } from 'fflate'
import { Download, Github, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/components/providers/locale-provider'

interface FileEntry {
  fileName: string
  source: string
}

interface GithubPushModalProps {
  isOpen: boolean
  onClose: () => void
  changedFiles: FileEntry[]
  projectName?: string
}

export function GithubPushModal({
  isOpen,
  onClose,
  changedFiles,
  projectName = 'masidy-project',
}: GithubPushModalProps) {
  const { t } = useLocale()
  const handleDownloadZip = () => {
    // Build the file map for fflate zipSync
    const fileMap: Record<string, Uint8Array> = {}
    for (const file of changedFiles) {
      fileMap[file.fileName] = strToU8(file.source)
    }

    const zipped = zipSync(fileMap, { level: 6 })
    const blob = new Blob([zipped], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {t('Export Project')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Download ZIP section */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">{t('Download ZIP')}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('Download all project files as a ZIP archive. You can then open them locally in any code editor.')}
            </p>
            <Button
              onClick={handleDownloadZip}
              disabled={changedFiles.length === 0}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('Download ZIP')}
            </Button>
            {changedFiles.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t('Generate a completed project version before exporting its files.')}
              </p>
            )}
          </div>

          {/* Push to GitHub section */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">{t('Push to GitHub')}</h3>
            </div>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>{t('Download the ZIP above')}</li>
              <li>
                {t('Create a new repository at')}{' '}
                <a
                  href="https://github.com/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 inline-flex items-center gap-0.5"
                >
                  github.com/new
                  <ExternalLink className="h-3 w-3 inline" />
                </a>
              </li>
              <li>
                {t('Extract the ZIP and drag & drop the files into your repo')}
              </li>
              <li>{t('Commit and push')}</li>
            </ol>
            <Button variant="outline" className="w-full" asChild>
              <a
                href="https://github.com/new"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4 mr-2" />
                {t('Open GitHub')}
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <Button variant="ghost" onClick={onClose}>
            {t('Close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
