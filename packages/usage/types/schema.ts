import { mysqlTable, int, varchar, datetime } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const User = mysqlTable('User', {
  id: int('id').notNull().primaryKey().autoincrement(),
  dbgen: int('dbgen')
    .notNull()
    .default(sql`foobar`),
  cuid: varchar('cuid', {
    length: 191,
  }).notNull() /* Default cuid unsupported */,
  uuid: varchar('uuid', {
    length: 191,
  }).notNull() /* Default uuid unsupported */,
  now: datetime('now', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`now()`),
  foo: varchar('foo', { length: 191 }).notNull(),
  bar: varchar('bar', { length: 191 }).notNull(),
  baz: varchar('mapped_baz', { length: 191 }).notNull(),
})

export const Post = mysqlTable('Post', {
  id: int('id').notNull().primaryKey().autoincrement(),
  userId: int('userId').notNull(),
})
