import { learnCompleted } from "@/lib/living/service";
import { readWorld, json, validOrigin, database } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const { world } = await readWorld();
  const models = world.living?.learning ?? {},
    experiences = world.living?.experiences ?? [];
  const url = new URL(req.url);
  if (url.searchParams.get("format") === "jsonl") {
    const after = Number(url.searchParams.get("after") ?? 0),
      limit = Number(url.searchParams.get("limit") ?? 1000);
    if (
      !Number.isSafeInteger(after) ||
      after < 0 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 1000
    )
      return json({ error: "Phân trang không hợp lệ" }, 400);
    const rows = await database()
      .prepare(
        "SELECT seq,data FROM agent_experiences WHERE seq>? ORDER BY seq LIMIT ?",
      )
      .bind(after, limit)
      .all<{ seq: number; data: string }>();
    return new Response(
      rows.results.map((row) => row.data).join("\n") +
        (rows.results.length ? "\n" : ""),
      {
        headers: {
          "content-type": "application/x-ndjson; charset=utf-8",
          "content-disposition":
            'attachment; filename="xom-ai-simulation-experiences.jsonl"',
          "cache-control": "private, no-store",
          "X-Next-Cursor": String(rows.results.at(-1)?.seq ?? after),
        },
      },
    );
  }
  return json({
    models,
    animalModels: world.living?.animalLearning ?? {},
    experiences,
    scope:
      "Per-character action policy fitted from completed simulation outcomes; Qwen weights are unchanged.",
    retainedExperiences: 200,
  });
}

export async function POST(req: Request) {
  if (!validOrigin(req)) return json({ error: "Origin không hợp lệ" }, 403);
  const result = await learnCompleted();
  return json(result.data, result.status);
}
