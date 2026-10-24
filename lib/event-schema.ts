import { z } from 'zod';

export const RESIDENT_IDS = ['an', 'binh', 'chi'] as const;

export const PLACES = [
  'Sân chung',
  'Phòng An',
  'Phòng Bình',
  'Phòng Chi',
  'Bếp chung',
  'Vườn nhỏ',
  'Công viên',
  'Quán cà phê',
  'Thư viện',
  'Xưởng sáng tạo',
  'Quảng trường',
  'Phố đi bộ',
] as const;

export const STEP_KINDS = [
  'work',
  'eat',
  'rest',
  'social',
  'garden',
  'read',
  'play',
] as const;

const who = z.enum(RESIDENT_IDS);
const placeEnum = z.enum(PLACES);
const kindEnum = z.enum(STEP_KINDS);

export const stepSchema = z.object({
  location: placeEnum,
  activity: z.string().min(1).max(80),
  duration: z.number().int().min(30).max(180),
  kind: kindEnum,
});

export const dialogueLineSchema = z.object({
  speaker: who,
  text: z.string().min(1).max(300),
  atSecond: z.number().int().min(0).max(1200).optional(),
  location: z.string().max(80).optional(),
});

export const personChangeSchema = z.object({
  id: who,
  moneyDelta: z.number().int().min(-30000).max(30000).default(0),
  energyDelta: z.number().int().min(-20).max(20).default(0),
  hungerDelta: z.number().int().min(-20).max(20).default(0),
  skillDelta: z.number().int().min(0).max(3).default(0),
  activity: z.string().max(80),
  location: placeEnum,
  memory: z.string().min(1).max(240),
  plan: z.array(stepSchema).min(1).max(8).optional(),
});

export const relationshipChangeSchema = z.object({
  a: who,
  b: who,
  delta: z.number().int().min(-5).max(5),
  note: z.string().max(200),
});

export const eventSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  contextId: z.string().max(100).optional(),
  revision: z.number().int().nonnegative(),
  source: z.enum(['ai', 'opening']),
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(800),
  dialogue: z.array(dialogueLineSchema).min(1).max(12),
  changes: z.array(personChangeSchema).max(3),
  relationship: relationshipChangeSchema.optional(),
});

export type EventInput = z.infer<typeof eventSchema>;
export type DialogueLine = z.infer<typeof dialogueLineSchema>;
export type PersonChange = z.infer<typeof personChangeSchema>;
export type RelationshipChange = z.infer<typeof relationshipChangeSchema>;
