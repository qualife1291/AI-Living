import assert from "node:assert/strict";
import {
  appearanceSchema,
  defaultAppearance,
  themes,
} from "../lib/city/appearance.ts";
assert.ok(themes.length >= 14);
for (const id of ["an", "binh", "chi", "neighbor-42"])
  assert.equal(appearanceSchema.safeParse(defaultAppearance(id)).success, true);
assert.equal(defaultAppearance("neighbor-1", "police-officer").theme, "police");
assert.equal(defaultAppearance("neighbor-2", "tài xế Grab").theme, "delivery");
assert.equal(defaultAppearance("neighbor-3", "giáo viên").theme, "teacher");
assert.equal(defaultAppearance("neighbor-4", "factory-worker").theme, "worker");
assert.deepEqual(
  defaultAppearance("stable", ""),
  defaultAppearance("stable", ""),
);
assert.equal(
  appearanceSchema.safeParse({
    ...defaultAppearance("an"),
    shirt: "url(javascript:bad)",
  }).success,
  false,
);
assert.equal(
  appearanceSchema.safeParse({ ...defaultAppearance("an"), theme: "unknown" })
    .success,
  false,
);
assert.equal(
  appearanceSchema.safeParse({ ...defaultAppearance("an"), hair: "<script>" })
    .success,
  false,
);
console.log(
  "PASS: 14 valid wardrobe themes, role-based police/delivery/teacher/worker defaults, stable identities and rejection of unsupported theme/CSS-like input.",
);
