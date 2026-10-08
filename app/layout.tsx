import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { StreamingProvider } from '@/contexts/streaming-context'
import { SWRProvider } from '@/components/providers/swr-provider'
import { SessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { WorkspaceShell } from '@/components/shared/workspace-shell'
import { auth } from '@/app/(auth)/auth'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Masidy',
  description:
    'Masidy — AI-powered app builder. Generate and preview React apps instantly with AI.',
  icons: {
    icon: '/masidy-icon.svg?v=2',
    shortcut: '/masidy-icon.svg?v=2',
    apple: '/masidy-icon.svg?v=2',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider session={session}>
            <SWRProvider>
              <StreamingProvider>
                <WorkspaceShell>{children}</WorkspaceShell>
              </StreamingProvider>
            </SWRProvider>
          </SessionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
