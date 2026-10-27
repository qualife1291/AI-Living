import { z } from "zod";
import { database, readWorld, json, validOrigin } from "@/lib/store";
import { initializeLiving } from "@/lib/living/engine";
import { petOwners } from "@/lib/living/pets";
const schema = z.object({ pet: z.enum(["cun", "muop"]), owner: z.string().min(1).max(100).nullable(), revision: z.number().int().nonnegative() }).strict();
export async function POST(req: Request) {
  if (!validOrigin(req)) return json({ error: "Origin không hợp lệ" }, 403);
  const reader = req.body?.getReader(); if (!reader) return json({ error: "Thiếu dữ liệu" }, 400);
  let bytes = 0; const chunks: Uint8Array[] = [];
  while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 2048) { await reader.cancel(); return json({ error: "Dữ liệu quá lớn" }, 413); } chunks.push(value); }
  const raw = new Uint8Array(bytes); let offset = 0; for (const c of chunks) { raw.set(c, offset); offset += c.length; }
  let body: unknown; try { body = JSON.parse(new TextDecoder().decode(raw)); } catch { return json({ error: "JSON không hợp lệ" }, 400); }
  const parsed = schema.safeParse(body); if (!parsed.success) return json({ error: "Người chăm sóc không hợp lệ" }, 400);
  const current = await readWorld(), { pet, owner, revision } = parsed.data;
  if (current.revision !== revision) return json({ error: "Revision conflict" }, 409);
  if (owner && ![...current.world.people, ...(current.world.living?.residents ?? [])].some(a => a.id === owner)) return json({ error: "Không tìm thấy cư dân" }, 404);
  const owners = petOwners(current.world);
  if (owner) owners[pet] = owner; else delete owners[pet];
  current.world.living ??= initializeLiving(Date.now()); current.world.living.petOwners = owners;
  const result = await database().prepare("UPDATE worlds SET data=?,revision=revision+1 WHERE id='home' AND revision=?").bind(JSON.stringify(current.world), revision).run();
  return result.meta.changes ? json({ ok: true }) : json({ error: "Revision conflict" }, 409);
}
