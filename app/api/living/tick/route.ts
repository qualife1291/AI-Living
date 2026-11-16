import { readBoundedJson } from "@/lib/bounded-json";
import { tickLiving, auditTick } from "@/lib/living/service";
import { json, validOrigin } from "@/lib/store";
import { proposalSchema } from "@/lib/living/schema";
import { z } from "zod";
const schema = z.object({ proposal: proposalSchema.optional(), basis: z.object({ revision: z.number().int().nonnegative(), turnId: z.string().max(100) }).strict().optional() }).strict();
export async function POST(req: Request) {
  if (!validOrigin(req)) return json({ error: "Origin không hợp lệ" }, 403);
  const decoded = await readBoundedJson(req, 12000, { allowEmpty: true });
  if (!decoded.ok) return json({ error: decoded.error }, decoded.status);
  const data = decoded.value;
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    await auditTick("rejected", { status: 400, reason: "invalid_tick_payload" });
    return json({ error: "Lượt sinh hoạt không hợp lệ" }, 400);
  }
  const result = await tickLiving(parsed.data.proposal, parsed.data.basis);
  return json(result.data, result.status);
}
