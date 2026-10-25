import { tickLiving } from "@/lib/living/service";
import { json, validOrigin } from "@/lib/store";
import { proposalSchema } from "@/lib/living/schema";
import { z } from "zod";
const schema = z.object({ proposal: proposalSchema.optional() }).strict();
export async function POST(req: Request) {
  if (!validOrigin(req)) return json({ error: "Origin không hợp lệ" }, 403);
  const text = await req.text();
  if (new TextEncoder().encode(text).length > 12000)
    return json({ error: "Dữ liệu quá lớn" }, 413);
  let data: unknown;
  try {
    data = JSON.parse(text || "{}");
  } catch {
    return json({ error: "JSON không hợp lệ" }, 400);
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    return json({ error: "Lượt sinh hoạt không hợp lệ" }, 400);
  const result = await tickLiving(parsed.data.proposal);
  return json(result.data, result.status);
}
