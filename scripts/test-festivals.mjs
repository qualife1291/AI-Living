import assert from "node:assert/strict";
import {
  festivalDates,
  parseFestivalCards,
  fetchFestivalMonth,
} from "../lib/living/festivals.ts";
assert.deepEqual(festivalDates("21/04 – 25/05", 2026), [
  "2026-04-21",
  "2026-05-25",
]);
assert.deepEqual(festivalDates("02 - 31/05", 2026), [
  "2026-05-02",
  "2026-05-31",
]);
assert.deepEqual(festivalDates("03 - 03/03", 2026), [
  "2026-03-03",
  "2026-03-03",
]);
assert.equal(festivalDates("31/02", 2026), null);
assert.equal(festivalDates("31/12 - 01/01", 2026), null);
assert.equal(festivalDates("Đang cập nhật", 2026), null);
const card = (
  date,
  title = "Triển lãm &#8211; Ánh sáng",
  url = "https://visithcmc.vn/listing/test/",
) =>
  `<a href="${url}" class="vn-event-card"><div><span class="value">${date}</span><h3 class="vn-e-title">${title}</h3></div></a>`;
const feed = parseFestivalCards(
  card("21/04 – 25/05") +
    card("02 - 31/05", "Ngày hội", "https://visithcmc.vn/listing/test-2/") +
    card("Chưa rõ", "Unknown", "https://visithcmc.vn/listing/unknown/"),
  2026,
);
assert.equal(feed.items.length, 2);
assert.equal(feed.unparsed, 1);
assert.equal(feed.items[0].title, "Triển lãm – Ánh sáng");
assert.equal(
  parseFestivalCards(card("03/03", "Invalid", "javascript:alert(1)"), 2026)
    .unparsed,
  1,
);
assert.deepEqual(
  parseFestivalCards('<div class="vn-no-event">No events</div>', 2026),
  { items: [], unparsed: 0 },
);
assert.throws(() => parseFestivalCards("<div>Changed template</div>", 2026));
let requests = 0;
const fixtureFetch = async (url, init) => {
  requests++;
  if (String(url).includes("admin-ajax")) {
    assert.equal(init.method, "POST");
    assert.equal(init.body.get("year"), "2026");
    assert.equal(init.body.get("month"), "5");
    return Response.json({ events: card("02 - 31/05") });
  }
  return new Response('var vn_event_ajax = {"nonce":"fixture-public-value"};');
};
const actual = await fetchFestivalMonth(2026, 5, fixtureFetch);
assert.equal(actual.items.length, 1);
assert.equal(requests, 2);
console.log(
  "PASS: official calendar markup, exact date intervals, shared months, unknown/invalid dates excluded, URL restriction, changed-template detection and public read-only AJAX adapter.",
);
