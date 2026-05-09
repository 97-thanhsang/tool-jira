import { pgTable, text, integer, serial } from 'drizzle-orm/pg-core';

export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const bookmarks = pgTable('bookmarks', {
  id: serial('id').primaryKey(),
  issueKey: text('issue_key').notNull().unique(),
  summary: text('summary').notNull(),
  projectKey: text('project_key').notNull(),
  createdAt: integer('created_at').notNull(),
});
