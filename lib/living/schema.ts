import { z } from "zod";
import { PLACES, STEP_KINDS } from "../event-schema.ts";

export const roleSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
    label: z.string().min(1).max(80),
    place: z.enum(PLACES),
    activity: z.string().min(1).max(80),
    kind: z.enum(STEP_KINDS),
    greeting: z.string().min(1).max(240),
  })
  .strict();
export const catalogSchema = z
  .object({
    version: z.literal(1),
    initialPopulation: z.number().int().min(8).max(80),
    newResidentsPerDay: z.number().int().min(0).max(10),
    maxPopulation: z.number().int().min(8).max(240),
    names: z.array(z.string().min(1).max(30)).min(4).max(100),
    roles: z.array(roleSchema).min(4).max(40),
  })
  .strict()
  .refine((c) => c.maxPopulation >= c.initialPopulation, {
    message: "Giới hạn dân số phải đủ cho cư dân ban đầu",
  })
  .refine((c) => new Set(c.roles.map((r) => r.id)).size === c.roles.length, {
    message: "Vai trò phải có ID khác nhau",
  });
export type LivingCatalog = z.infer<typeof catalogSchema>;
export type Resident = {
  id: string;
  name: string;
  roleId: string;
  color: string;
  arrivedOn: string;
  familiarity: number;
  memories: string[];
  plan?: import("../world").PersonPlan;
};
export type LivingState = {
  version: 1;
  startedOn: string;
  lastTickAt: string;
  lastTurnId: string | null;
  residents: Resident[];
  catalog: LivingCatalog;
  energy: number;
  hunger: number;
  social: number;
  skills: Record<string, number>;
  daysExperienced: number;
  lastExpansionOn?: string;
  learning?: import("./learning").LearningPopulation;
  experiences?: import("./learning").Experience[];
  learningCommit?: string;
  appearances?: Record<string, import("../city/appearance").Appearance>;
  animalLearning?: Record<string, import("./animal-learning").AnimalPolicy>;
};
export type RealContext = {
  date: string;
  hour: number;
  weekday: number;
  timezone: "Asia/Ho_Chi_Minh";
  fetchedAt: string;
  weather: {
    status: "fresh" | "stale" | "unavailable";
    source: string;
    observedAt: string | null;
    temperature: number | null;
    humidity: number | null;
    precipitation: number | null;
    code: number | null;
    windKph: number | null;
  };
  calendar: {
    weekend: boolean;
    holidays: string[];
    source: string;
    status: "fresh" | "stale" | "unavailable";
    coverage: string;
  };
  traffic: { status: "unavailable"; label: string };
  festivals: {
    status: "fresh" | "stale" | "unavailable";
    label: string;
    source?: string;
    items?: import("./festivals").Festival[];
    unparsed?: number;
  };
};
export const proposalSchema = z
  .object({
    newRole: roleSchema.optional(),
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(600),
    dialogue: z
      .array(
        z
          .object({
            speaker: z.string().min(1).max(100),
            text: z
              .string()
              .min(1)
              .max(240)
              .regex(
                /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i,
                "Dùng tiếng Việt có dấu",
              ),
          })
          .strict(),
      )
      .min(2)
      .max(6),
  })
  .strict();
export type LivingTurn = {
  id: string;
  createdAt: string;
  date: string;
  title: string;
  summary: string;
  location: string;
  activity: string;
  kind: (typeof STEP_KINDS)[number];
  residentId: string;
  dialogue: { speaker: string; text: string }[];
  generator: "rules" | "local-llm";
  scriptId?: string;
  scenarioId?: string;
  transport?: import("./learning").Scenario["transport"];
  context: RealContext;
  simStartedAt?: number;
};
