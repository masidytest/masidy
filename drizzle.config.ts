import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'
import path from 'path'

config({ path: '.env' })

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'turso',
  dbCredentials:
    tursoUrl && tursoToken
      ? { url: tursoUrl, authToken: tursoToken }
      : { url: `file:${path.join(process.cwd(), 'v0-clone.db')}` },
})
