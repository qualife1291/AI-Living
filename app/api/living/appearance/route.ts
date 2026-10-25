import { z } from "zod";
import { appearanceSchema, defaultAppearance } from "@/lib/city/appearance";
import { readWorld, database, json, validOrigin } from "@/lib/store";
import { initializeLiving } from "@/lib/living/engine";
const schema = z
  .object({
    id: z.string().min(1).max(100),
    revision: z.number().int().nonnegative(),
    appearance: appearanceSchema,
  })
  .strict();
export async function GET(req: Request) {
  const current = await readWorld();
  const id = new URL(req.url).searchParams.get("id") ?? "an";
  const actor =
    current.world.people.find((p) => p.id === id) ??
    current.world.living?.residents.find((r) => r.id === id);
  if (!actor) return json({ error: "Không tìm thấy cư dân" }, 404);
  return json({
    revision: current.revision,
    id,
    appearance:
      current.world.living?.appearances?.[id] ??
      defaultAppearance(id, "role" in actor ? actor.role : actor.roleId),
  });
}
export async function POST(req: Request) {
  if (!validOrigin(req)) return json({ error: "Origin không hợp lệ" }, 403);
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > 4000)
    return json({ error: "Dữ liệu quá lớn" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "JSON không hợp lệ" }, 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: "Tạo hình không hợp lệ" }, 400);
  const current = await readWorld();
  if (current.revision !== parsed.data.revision)
    return json({ error: "Revision conflict" }, 409);
  if (
    !current.world.people.some((p) => p.id === parsed.data.id) &&
    !current.world.living?.residents.some((r) => r.id === parsed.data.id)
  )
    return json({ error: "Không tìm thấy cư dân" }, 404);
  current.world.living ??= initializeLiving(Date.now());
  current.world.living.appearances ??= {};
  current.world.living.appearances[parsed.data.id] = parsed.data.appearance;
  const result = await database()
    .prepare(
      "UPDATE worlds SET data=?,revision=revision+1 WHERE id=? AND revision=?",
    )
    .bind(JSON.stringify(current.world), "home", current.revision)
    .run();
  return result.meta.changes
    ? json({ ok: true })
    : json({ error: "Revision conflict" }, 409);
}
