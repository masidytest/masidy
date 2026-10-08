import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import path from 'path'

// Load environment variables
import { config } from 'dotenv'
config()

// Dual-mode: use Turso when env vars are present, otherwise fall back to local SQLite file
const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

const client =
  tursoUrl && tursoToken
    ? createClient({ url: tursoUrl, authToken: tursoToken })
    : createClient({ url: `file:${path.join(process.cwd(), 'v0-clone.db')}` })

const db = drizzle(client, { schema })

export { client }
export default db
