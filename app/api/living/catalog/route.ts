import { readBoundedJson } from "@/lib/bounded-json";
import { catalogSchema } from "@/lib/living/schema";
import { saveCatalog } from "@/lib/living/service";
import { readWorld, json, validOrigin } from "@/lib/store";
import { defaultCatalog } from "@/lib/living/engine";
import { z } from "zod";
const schema = z
  .object({ revision: z.number().int().nonnegative(), catalog: catalogSchema })
  .strict();
export async function GET() {
  const current = await readWorld();
  return json({
    revision: current.revision,
    catalog: current.world.living?.catalog ?? defaultCatalog,
  });
}
export async function POST(req: Request) {
  if (!validOrigin(req)) return json({ error: "Origin không hợp lệ" }, 403);
  const decoded = await readBoundedJson(req, 32000);
  if (!decoded.ok) return json({ error: decoded.error }, decoded.status);
  const body = decoded.value;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: "Danh mục không hợp lệ" }, 400);
  try {
    return (await saveCatalog(parsed.data.catalog, parsed.data.revision))
      ? json({ ok: true })
      : json({ error: "Revision conflict" }, 409);
  } catch {
    return json({ error: "Giữ lại vai trò của cư dân hiện có" }, 400);
  }
}
