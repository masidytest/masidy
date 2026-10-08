export interface MissingEnvVar {
  name: string
  description: string
  example: string
  required: boolean
}

function hasV0ApiKey(): boolean {
  return [
    process.env.V0_API_KEYS,
    process.env.V0_API_KEY0,
    process.env.V0_API_KEY,
  ].some((value) => value?.split(',').some((key) => key.trim()))
}

export function checkRequiredEnvVars(): MissingEnvVar[] {
  const isProduction = process.env.NODE_ENV === 'production'

  const requiredVars: MissingEnvVar[] = [
    {
      name: 'V0_API_KEYS, V0_API_KEY0, or V0_API_KEY',
      description: 'One or more v0 API keys for generating apps',
      example: 'v1:team_...',
      required: true,
    },
    {
      name: 'AUTH_SECRET',
      description: 'Secret key for NextAuth.js authentication',
      example: 'your-secret-key-here',
      required: true,
    },
    // TURSO_DATABASE_URL is required in production (Turso remote DB);
    // in dev the app falls back to a local SQLite file automatically.
    {
      name: 'TURSO_DATABASE_URL',
      description: 'Turso database URL (libsql://...) for the remote database',
      example: 'libsql://your-db.turso.io',
      required: isProduction,
    },
  ]

  const missing = requiredVars.filter((envVar) => {
    if (!envVar.required) return false
    if (envVar.name === 'V0_API_KEYS, V0_API_KEY0, or V0_API_KEY') {
      return !hasV0ApiKey()
    }
    const value = process.env[envVar.name]
    return !value || value.trim() === ''
  })

  return missing
}

export function hasAllRequiredEnvVars(): boolean {
  return checkRequiredEnvVars().length === 0
}

// At least one v0 API key and AUTH_SECRET are always required.
// In production, TURSO_DATABASE_URL is also required.
export const hasEnvVars =
  hasV0ApiKey() &&
  !!process.env.AUTH_SECRET &&
  (process.env.NODE_ENV !== 'production' || !!process.env.TURSO_DATABASE_URL)
