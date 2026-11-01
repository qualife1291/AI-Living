import data from "../../data/characters/themes.json" with { type: "json" };
import { z } from "zod";
import { hashSeed } from "../clock.ts";
export const themes = data;
export const appearanceSchema = z
  .object({
    theme: z
      .string()
      .min(1)
      .max(40)
      .refine(
        (value) => themes.some((theme) => theme.id === value),
        "Bộ trang phục không hợp lệ",
      ),
    shirt: z.string().regex(/^#[0-9a-f]{6}$/i),
    trousers: z.string().regex(/^#[0-9a-f]{6}$/i),
    skin: z.string().regex(/^#[0-9a-f]{6}$/i),
    hair: z.enum(["black", "brown", "gray", "bald"]),
    face: z.enum(["smile", "moustache", "glasses"]),
  })
  .strict();
export type Appearance = z.infer<typeof appearanceSchema>;
export function defaultAppearance(id: string, role = ""): Appearance {
  const job = role.toLowerCase();
  const theme = themes.find(
    (t) =>
      t.id ===
      (id === "an"
        ? "an"
        : /police|công an|an ninh/.test(job)
          ? "police"
          : /delivery|tài xế công nghệ|giao hàng|grab/.test(job)
            ? "delivery"
            : /teacher|giáo viên/.test(job)
              ? "teacher"
              : /nurse|doctor|bác sĩ|điều dưỡng/.test(job)
                ? "doctor"
                : /factory|worker|công nhân|mechanic|thợ/.test(job)
                  ? "worker"
                  : /pilot|phi công/.test(job)
                    ? "pilot"
                    : /metro|bus-driver|tài xế xe buýt/.test(job)
                      ? "metro"
                      : /chef|đầu bếp|chi/.test(job) || id === "chi"
                        ? "chef"
                        : /firefighter|cứu hỏa/.test(job)
                          ? "firefighter"
                          : id === "binh"
                            ? "office"
                            : hashSeed(id) % 7 === 0
                              ? "elder"
                              : "casual"),
  )!;
  // Civilian outfits are stable cosmetics only: diversify everyday streets
  // without changing resident identity, profession, skills or saved wardrobes.
  const palette=[
    ["#85aab0","#586e8c"],["#d99e78","#6c8691"],
    ["#a9bb82","#786f8c"],["#d4acbb","#637d7b"],
    ["#b8a5d2","#766e62"],["#e2bd73","#638b96"],
    ["#79b9a3","#77678b"],["#cf9785","#597c71"],
  ] as const;
  const colors=palette[hashSeed(id+'-outfit')%palette.length];
  return {
    theme: theme.id,
    shirt: theme.id==='casual'||theme.id==='sport'?colors[0]:theme.shirt,
    trousers: theme.id==='casual'||theme.id==='sport'?colors[1]:theme.trousers,
    skin: ["#efd6a7", "#d9ba91", "#c79d7d", "#ead5b7"][hashSeed(id) % 4],
    hair: theme.id === "elder" ? "gray" : hashSeed(id) % 3 ? "black" : "brown",
    face: theme.face as Appearance["face"],
  };
}
