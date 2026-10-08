'use client'

import React, { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  className?: string
  showLineNumbers?: boolean
}

export function CodeBlock({
  code,
  language = 'typescript',
  filename,
  className,
  showLineNumbers = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }

  return (
    <div
      className={cn(
        'group relative my-4 overflow-hidden rounded-lg border border-border dark:border-input bg-gray-50 dark:bg-gray-900',
        className,
      )}
    >
      {/* Header with language label and copy button */}
      <div className="flex items-center justify-between border-b border-border dark:border-input bg-gray-100 dark:bg-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
              {filename}
            </span>
          )}
          {!filename && language && (
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
              {language}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={tomorrow}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.875rem',
          }}
          codeTagProps={{
            style: {
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            },
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
