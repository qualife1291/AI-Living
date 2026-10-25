import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const worlds = sqliteTable("worlds", {
  id: text("id").primaryKey(),
  revision: integer("revision").notNull().default(0),
  data: text("data").notNull(),
});

export const episodes = sqliteTable("episodes", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  source: text("source").notNull(),
  data: text("data").notNull(),
});

export const memories = sqliteTable("memories", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  eventId: text("event_id").notNull(),
  text: text("text").notNull(),
  kind: text("kind").notNull().default("observation"),
  importance: integer("importance").notNull().default(3),
  witnessedWith: text("witnessed_with"),
  createdAt: text("created_at").notNull(),
});

export const tickRuns = sqliteTable("tick_runs", {
  id: text("id").primaryKey(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: text("status").notNull(),
  model: text("model"),
  eventId: text("event_id"),
  neuronsEst: integer("neurons_est"),
  error: text("error"),
});

export const commitments = sqliteTable("commitments", {
  id: text("id").primaryKey(),
  fromId: text("from_id").notNull(),
  toId: text("to_id").notNull(),
  text: text("text").notNull(),
  dueAt: text("due_at"),
  status: text("status").notNull().default("open"),
  eventId: text("event_id").notNull(),
});

export const nudges = sqliteTable("nudges", {
  id: text("id").primaryKey(),
  hint: text("hint").notNull(),
  createdAt: text("created_at").notNull(),
  consumedByEventId: text("consumed_by_event_id"),
});

export const contextCache = sqliteTable("context_cache", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const livingTurns = sqliteTable("living_turns", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  data: text("data").notNull(),
});
