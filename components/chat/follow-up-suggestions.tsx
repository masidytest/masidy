'use client'

import { useLocale } from '@/components/providers/locale-provider'

interface FollowUpSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void
}

const SUGGESTIONS = [
  'Add a backend API',
  'Add a database',
  'Add authentication',
  'Make it mobile responsive',
  'Add dark mode',
  'Deploy this',
]

export function FollowUpSuggestions({
  onSuggestionClick,
}: FollowUpSuggestionsProps) {
  const { t } = useLocale()
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-4 py-3">
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSuggestionClick(t(suggestion))}
          className="inline-flex items-center px-4 py-2 rounded-full border border-border text-sm whitespace-nowrap hover:bg-muted transition-colors"
        >
          {t(suggestion)}
        </button>
      ))}
    </div>
  )
}
