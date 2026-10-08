import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import path from 'path'
import { config } from 'dotenv'

config()

const runMigrate = async () => {
  // Dual-mode: use Turso when env vars are present, otherwise fall back to local SQLite file
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  const client =
    tursoUrl && tursoToken
      ? createClient({ url: tursoUrl, authToken: tursoToken })
      : createClient({ url: `file:${path.join(process.cwd(), 'v0-clone.db')}` })

  const db = drizzle(client)

  console.log('⏳ Running migrations...')
  const start = Date.now()

  await migrate(db, { migrationsFolder: 'lib/db/migrations' })

  console.log('✅ Migrations completed in', Date.now() - start, 'ms')
  process.exit(0)
}

runMigrate().catch((err) => {
  console.error('❌ Migration failed', err)
  process.exit(1)
})
