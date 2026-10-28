import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
}, table => [index("idx_memories_actor_event").on(table.personId, table.eventId)]);

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

export const agentExperiences = sqliteTable("agent_experiences", {
  seq: integer("seq").primaryKey({ autoIncrement: true }),
  id: text("id").notNull().unique(),
  actorId: text("actor_id").notNull(),
  createdAt: text("created_at").notNull(),
  data: text("data").notNull(),
}, table => [index("idx_experiences_actor_seq").on(table.actorId, table.seq)]);

export const learningPolicies = sqliteTable("learning_policies", {
  actorId: text("actor_id").primaryKey(),
  data: text("data").notNull(),
  updatedRevision: integer("updated_revision").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const viewSessions = sqliteTable("view_sessions", {
  id: text("id").primaryKey(),
  nonce: text("nonce").notNull(),
  createdAt: text("created_at").notNull(),
});
export const siteMetrics = sqliteTable("site_metrics", {
  id: text("id").primaryKey(),
  total: integer("total").notNull().default(0),
});
export const visitorExchanges = sqliteTable("visitor_exchanges", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  createdAt: text("created_at").notNull(),
  data: text("data").notNull(),
});

export const clientLogs = sqliteTable("client_logs", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at").notNull(),
  data: text("data").notNull(),
}, table => [index("client_logs_created_at").on(table.createdAt)]);

/** Manual historical-memory maintenance; never a live learning scheduler. */
export const memoryBackfillJobs = sqliteTable('memory_backfill_jobs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').notNull(),
  data: text('data').notNull(),
  checksum: text('checksum').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export const memoryBackfillBatches = sqliteTable('memory_backfill_batches', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => memoryBackfillJobs.id),
  sequence: integer('sequence').notNull(),
  planSha256: text('plan_sha256').notNull(),
  data: text('data').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [uniqueIndex('idx_memory_backfill_job_sequence').on(table.jobId, table.sequence)]);
