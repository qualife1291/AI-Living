import { z } from "zod";
export const festivalSchema = z.object({
  title: z.string().min(1).max(240),
  url: z
    .string()
    .url()
    .refine((value) => {
      const u = new URL(value);
      return u.protocol === "https:" && u.hostname === "visithcmc.vn";
    }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const festivalFeedSchema = z.object({
  items: z.array(festivalSchema).max(200),
  unparsed: z.number().int().nonnegative(),
});
export type Festival = z.infer<typeof festivalSchema>;
const PAGE = "https://visithcmc.vn/festivals-events/";
function text(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => {
      const value = Number(n);
      return value <= 0x10ffff ? String.fromCodePoint(value) : "";
    })
    .replace(/&#x([a-f\d]+);/gi, (_, n) => {
      const value = parseInt(n, 16);
      return value <= 0x10ffff ? String.fromCodePoint(value) : "";
    })
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function iso(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null;
}
export function festivalDates(
  input: string,
  year: number,
): [string, string] | null {
  const value = input.trim().replace(/[–—]/g, "-");
  let start: string | null, end: string | null;
  const range = /^(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})$/.exec(value);
  const shared = /^(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})$/.exec(value);
  const single = /^(\d{1,2})\/(\d{1,2})$/.exec(value);
  if (range) {
    start = iso(year, +range[2], +range[1]);
    end = iso(year, +range[4], +range[3]);
  } else if (shared) {
    start = iso(year, +shared[3], +shared[1]);
    end = iso(year, +shared[3], +shared[2]);
  } else if (single) {
    start = end = iso(year, +single[2], +single[1]);
  } else return null;
  return start && end && end >= start ? [start, end] : null;
}
export function parseFestivalCards(html: string, year: number) {
  const items: Festival[] = [];
  let unparsed = 0;
  for (const match of html.matchAll(
    /<a\b[^>]*\bclass=["'][^"']*\bvn-event-card\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
  )) {
    const card = match[0],
      href = /\bhref=["']([^"']+)["']/i.exec(card)?.[1];
    const title =
      /<h3[^>]*class=["'][^"']*vn-e-title[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i.exec(
        card,
      )?.[1];
    const date = /<span[^>]*class=["']value["'][^>]*>([\s\S]*?)<\/span>/i.exec(
      card,
    )?.[1];
    const dates = date ? festivalDates(text(date), year) : null;
    try {
      const url = new URL(href ?? "");
      if (
        url.protocol !== "https:" ||
        url.hostname !== "visithcmc.vn" ||
        !dates ||
        !title
      )
        throw Error("Incomplete event");
      const item = festivalSchema.parse({
        title: text(title),
        url: url.href,
        startDate: dates[0],
        endDate: dates[1],
      });
      if (!items.some((x) => x.url === item.url)) items.push(item);
    } catch {
      unparsed++;
    }
  }
  // An upstream template change must not silently become an empty successful calendar.
  if (!items.length && !unparsed && !/vn-no-event/.test(html))
    throw Error("Unknown calendar markup");
  return festivalFeedSchema.parse({ items, unparsed });
}
export async function fetchFestivalMonth(
  year: number,
  month: number,
  fetcher: typeof fetch = fetch,
) {
  if (year < 2020 || year > 2100 || month < 1 || month > 12)
    throw Error("Invalid calendar month");
  const response = await fetcher(PAGE, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error("Calendar page unavailable");
  const page = await response.text();
  if (page.length > 2000000) throw Error("Calendar page too large");
  const raw = /var vn_event_ajax\s*=\s*(\{[^;]+\})\s*;/.exec(page)?.[1];
  const config = z
    .object({ nonce: z.string().min(1).max(100) })
    .parse(JSON.parse(raw ?? "{}"));
  const body = new URLSearchParams({
    action: "vn_load_events",
    nonce: config.nonce,
    year: String(year),
    month: String(month),
    type: "switch_month",
    limit: "200",
    lang: "en",
  });
  const result = await fetcher("https://visithcmc.vn/wp-admin/admin-ajax.php", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: PAGE,
    },
    body,
    signal: AbortSignal.timeout(10000),
  });
  if (!result.ok) throw Error("Calendar feed unavailable");
  const data = z
    .object({ events: z.string().max(1000000) })
    .parse(await result.json());
  return parseFestivalCards(data.events, year);
}
