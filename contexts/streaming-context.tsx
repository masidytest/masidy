'use client'

import { createContext, useContext, useRef, useState, ReactNode } from 'react'

interface StreamingHandoff {
  chatId: string | null
  stream: ReadableStream<Uint8Array> | null
  userMessage: string | null
}

interface StreamingContextType {
  handoff: StreamingHandoff
  startHandoff: (
    chatId: string,
    stream: ReadableStream<Uint8Array>,
    userMessage: string,
  ) => void
  clearHandoff: () => void
  setGenerationController: (controller: AbortController) => void
  clearGenerationController: () => void
  stopGeneration: () => boolean
  getGenerationSignal: () => AbortSignal | undefined
}

const StreamingContext = createContext<StreamingContextType | null>(null)

export function useStreaming() {
  const context = useContext(StreamingContext)
  if (!context) {
    throw new Error('useStreaming must be used within a StreamingProvider')
  }
  return context
}

interface StreamingProviderProps {
  children: ReactNode
}

export function StreamingProvider({ children }: StreamingProviderProps) {
  const generationControllerRef = useRef<AbortController | null>(null)
  const [handoff, setHandoff] = useState<StreamingHandoff>({
    chatId: null,
    stream: null,
    userMessage: null,
  })

  const startHandoff = (
    chatId: string,
    stream: ReadableStream<Uint8Array>,
    userMessage: string,
  ) => {
    setHandoff({ chatId, stream, userMessage })
  }

  const clearHandoff = () => {
    setHandoff({ chatId: null, stream: null, userMessage: null })
  }

  const setGenerationController = (controller: AbortController) => {
    generationControllerRef.current = controller
  }

  const clearGenerationController = () => {
    generationControllerRef.current = null
  }

  const stopGeneration = () => {
    const controller = generationControllerRef.current
    generationControllerRef.current = null
    if (!controller || controller.signal.aborted) return false
    controller.abort()
    return true
  }

  const getGenerationSignal = () => generationControllerRef.current?.signal

  return (
    <StreamingContext.Provider
      value={{
        handoff,
        startHandoff,
        clearHandoff,
        setGenerationController,
        clearGenerationController,
        stopGeneration,
        getGenerationSignal,
      }}
    >
      {children}
    </StreamingContext.Provider>
  )
}
