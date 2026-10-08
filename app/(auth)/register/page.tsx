import { redirect } from 'next/navigation'
import { auth } from '../auth'
import { AuthForm } from '@/components/auth-form'
import { BrandMark } from '@/components/brand-mark'
import { LegalFooter } from '@/components/legal/legal-footer'

interface RegisterPageProps {
  searchParams: Promise<{ returnTo?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const session = await auth()
  const { returnTo } = await searchParams

  if (session) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center gap-8 bg-background py-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-border bg-background px-4 py-6 pt-8 text-center sm:px-16">
          <BrandMark className="size-14 rounded-full" />
          <p className="text-sm font-semibold tracking-wide text-foreground">
            Masidy
          </p>
          <h3 className="text-xl font-semibold text-foreground">
            Create Account
          </h3>
          <p className="text-sm text-muted-foreground">
            Create your account to get started
          </p>
        </div>
        <div className="flex flex-col space-y-4 bg-muted/50 px-4 py-8 sm:px-16">
          <AuthForm type="signup" returnTo={returnTo} />
        </div>
      </div>
      <LegalFooter className="w-full border-border text-muted-foreground [&_a:hover]:text-foreground" />
    </div>
  )
}
