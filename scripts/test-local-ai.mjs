import assert from "node:assert/strict";
import { proposalSchema } from "../lib/living/schema.ts";
const schema = {
  type: "object",
  required: ["title", "summary", "dialogue"],
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    dialogue: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["speaker", "text"],
        properties: {
          speaker: { type: "string", enum: ["an", "neighbor-1"] },
          text: { type: "string" },
        },
      },
    },
  },
};
const started = Date.now();
const response = await fetch("http://127.0.0.1:8090/v1/chat/completions", {
  method: "POST",
  headers: { "content-type": "application/json" },
  signal: AbortSignal.timeout(90000),
  body: JSON.stringify({
    model: "qwen2.5",
    temperature: 0.4,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content:
          "Viết một tình huống hư cấu rất ngắn bằng tiếng Việt. Chỉ trả JSON. Hai nhân vật An (an) và Minh (neighbor-1) cùng đọc sách ở thư viện, có hỏi và đáp. Không nêu thời tiết hay tin tức thật.",
      },
      {
        role: "assistant",
        content: JSON.stringify({
          title: "Cùng đọc sách",
          summary: "An ghé thư viện hỏi Minh về quyển sách mới.",
          dialogue: [
            { speaker: "an", text: "Mình ngồi đọc cùng bạn nhé?" },
            {
              speaker: "neighbor-1",
              text: "Được chứ, mình vừa tìm được một quyển khá hay.",
            },
          ],
        }),
      },
      {
        role: "user",
        content:
          "Viết một cảnh đọc sách khác. BẮT BUỘC dùng tiếng Việt có dấu cho title, summary và mọi câu thoại. Có ít nhất 2 câu hỏi đáp.",
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "test_scene", strict: true, schema },
    },
  }),
});
assert.equal(response.status, 200);
const result = await response.json();
const data = proposalSchema.parse(
  JSON.parse(result.choices[0].message.content),
);
assert.ok(data.dialogue.some((d) => d.speaker === "an"));
assert.ok(data.dialogue.some((d) => d.speaker === "neighbor-1"));
console.log(
  JSON.stringify(
    {
      status: "PASS",
      provider: "local CPU llama.cpp",
      model: "Qwen2.5-1.5B-Instruct",
      elapsedSeconds: (Date.now() - started) / 1000,
      tokens: result.usage?.completion_tokens,
      fixture: data,
    },
    null,
    2,
  ),
);
