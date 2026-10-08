'use client'

import { MessageSquare, Monitor, Code } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/components/providers/locale-provider'

interface BottomToolbarProps {
  activePanel: 'chat' | 'preview' | 'code'
  onPanelChange: (panel: 'chat' | 'preview' | 'code') => void
  hasPreview: boolean
  hasCode: boolean
}

export function BottomToolbar({
  activePanel,
  onPanelChange,
  hasPreview,
  hasCode,
}: BottomToolbarProps) {
  const { t } = useLocale()
  return (
    <div className="bg-white dark:bg-black py-4 px-2 border-t border-border dark:border-input">
      <div className="flex items-center justify-center max-w-xs mx-auto">
        <div className="flex bg-secondary rounded-lg p-1 w-full">
          <button
            onClick={() => onPanelChange('chat')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-11 text-sm font-medium rounded-md transition-all duration-200 min-h-[44px] min-w-[44px]',
              activePanel === 'chat'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <MessageSquare className="h-4 w-4" />
            <span>{t('Chat')}</span>
          </button>

          <button
            onClick={() => onPanelChange('code')}
            disabled={!hasCode}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-11 text-sm font-medium rounded-md transition-all duration-200 min-h-[44px] min-w-[44px]',
              activePanel === 'code'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
              !hasCode &&
                'opacity-50 cursor-not-allowed hover:text-muted-foreground',
            )}
          >
            <Code className="h-4 w-4" />
            <span>{t('Code')}</span>
          </button>

          <button
            onClick={() => onPanelChange('preview')}
            disabled={!hasPreview}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-11 text-sm font-medium rounded-md transition-all duration-200 min-h-[44px] min-w-[44px]',
              activePanel === 'preview'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
              !hasPreview &&
                'opacity-50 cursor-not-allowed hover:text-muted-foreground',
            )}
          >
            <Monitor className="h-4 w-4" />
            <span>{t('Preview')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
