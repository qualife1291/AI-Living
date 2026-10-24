import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const worlds = sqliteTable('worlds', { id: text('id').primaryKey(), revision: integer('revision').notNull().default(0), data: text('data').notNull() });
export const episodes = sqliteTable('episodes', { id: text('id').primaryKey(), createdAt: text('created_at').notNull(), source: text('source').notNull(), data: text('data').notNull() });
