import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const origin = process.env.XOM_ORIGIN ?? "http://127.0.0.1:5173";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname))
  throw Error(
    "This exporter only reads the local authenticated development instance",
  );
let after = 0,
  lines = [];
for (;;) {
  const response = await fetch(
    `${origin}/api/living/learning?format=jsonl&after=${after}&limit=1000`,
  );
  if (!response.ok) throw Error("Export failed");
  const body = await response.text();
  if (!body.trim()) break;
  lines.push(...body.trim().split("\n"));
  const next = Number(response.headers.get("X-Next-Cursor"));
  if (!Number.isSafeInteger(next) || next <= after)
    throw Error("Invalid export cursor");
  after = next;
}
await mkdir(".sites-runtime/training", { recursive: true });
const output = `.sites-runtime/training/experiences-${new Date().toISOString().replaceAll(":", "-")}.jsonl`;
await writeFile(output, lines.join("\n") + (lines.length ? "\n" : ""), {
  flag: "wx",
});
console.log(
  JSON.stringify({
    path: output,
    experiences: lines.length,
    source: "simulation; not automatically approved for LLM fine-tuning",
  }),
);
