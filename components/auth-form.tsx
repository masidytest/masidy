'use client'

import { useActionState } from 'react'
import { signInAction, signUpAction } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useLocale } from '@/components/providers/locale-provider'

interface AuthFormProps {
  type: 'signin' | 'signup'
  returnTo?: string
}

export function AuthForm({ type, returnTo = '/' }: AuthFormProps) {
  const { t } = useLocale()
  const [state, formAction, isPending] = useActionState(
    type === 'signin' ? signInAction : signUpAction,
    undefined,
  )

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <div>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={t('Email')}
          required
          autoFocus
          className="w-full"
        />
      </div>
      <div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={t('Password')}
          required
          className="w-full"
          minLength={type === 'signup' ? 6 : 1}
        />
      </div>

      {state?.type === 'error' && (
        <div className="text-sm text-red-500">{t(state.message)}</div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? type === 'signin'
            ? t('Signing in...')
            : t('Creating account...')
          : type === 'signin'
            ? t('Sign In')
            : t('Create Account')}
      </Button>

      {type === 'signup' && (
        <p className="text-center text-xs leading-5 text-muted-foreground">
          {t('By creating an account, you agree to our')}{' '}
          <Link href="/terms" className="underline hover:text-foreground">
            {t('Terms')}
          </Link>{' '}
          {t('and acknowledge the')}{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            {t('Privacy Policy')}
          </Link>
          .
        </p>
      )}

      <div className="text-center text-sm text-muted-foreground">
        {type === 'signin' ? (
          <>
            {t("Don't have an account?")}{' '}
            <Link
              href={`/register?returnTo=${encodeURIComponent(returnTo)}`}
              className="text-primary hover:underline"
            >
              {t('Sign up')}
            </Link>
          </>
        ) : (
          <>
            {t('Already have an account?')}{' '}
            <Link
              href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
              className="text-primary hover:underline"
            >
              {t('Sign in')}
            </Link>
          </>
        )}
      </div>
    </form>
  )
}
