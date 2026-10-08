import type { InferSelectModel } from 'drizzle-orm'
import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: text('id').primaryKey().notNull(),
  email: text('email', { length: 64 }).notNull(),
  password: text('password', { length: 64 }),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

export type User = InferSelectModel<typeof users>

export const chat_ownerships = sqliteTable(
  'chat_ownerships',
  {
    id: text('id').primaryKey().notNull(),
    v0_chat_id: text('v0_chat_id', { length: 255 }).notNull(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id),
    created_at: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    unique_v0_chat: unique().on(table.v0_chat_id),
  }),
)

export type ChatOwnership = InferSelectModel<typeof chat_ownerships>

export const project_ownerships = sqliteTable(
  'project_ownerships',
  {
    id: text('id').primaryKey().notNull(),
    v0_project_id: text('v0_project_id', { length: 255 }).notNull(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id),
    created_at: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    unique_v0_project: unique().on(table.v0_project_id),
  }),
)

export type ProjectOwnership = InferSelectModel<typeof project_ownerships>

export const anonymous_chat_logs = sqliteTable('anonymous_chat_logs', {
  id: text('id').primaryKey().notNull(),
  ip_address: text('ip_address', { length: 45 }).notNull(),
  v0_chat_id: text('v0_chat_id', { length: 255 }).notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

export type AnonymousChatLog = InferSelectModel<typeof anonymous_chat_logs>
