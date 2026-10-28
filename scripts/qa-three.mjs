import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright-core"
);
const shots = process.env.QA_OUT ?? fileURLToPath(new URL("../docs/screenshots/", import.meta.url));
await mkdir(shots, { recursive: true });
import assert from "node:assert/strict";
const base = process.env.QA_BASE ?? "http://127.0.0.1:5173";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Local fixture only");
const fixture = JSON.parse(execFileSync(process.execPath, ["scripts/social-preview-fixture.mjs"], {encoding:"utf8"}));
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_BIN ?? "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 960],
    ["mobile", 390, 844],
  ]) {
    const p = await b.newPage({
        viewport: { width, height },
        isMobile: name === "mobile",
        hasTouch: name === "mobile",
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.route("**/api/**", route => route.fulfill({status:200, contentType:"application/json", body:JSON.stringify({ok:true,views:1})}));
    await p.route("**/api/world*", route => { fixture.serverNow = new Date().toISOString(); return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(fixture)}); });
    await p.goto(base, { waitUntil: "domcontentloaded" });
    const host = p.locator('.three-canvas[data-ready="true"]');
    await host.waitFor({ timeout: 90000 });
    assert.equal(
      await host
        .locator("canvas")
        .evaluate(
          (c) => c.getContext("webgl2") instanceof WebGL2RenderingContext,
        ),
      true,
    );
    const stats = await host.evaluate((e) => ({ ...e.dataset }));
    assert.ok(
      +stats.buildings >= 280 && +stats.towers >= 150 && +stats.actors > 10,
    );
    assert.ok(+stats.drawCalls < 85);
    const box = await host.boundingBox();
    assert.equal(box.width, width);
    assert.equal(box.height, height);
    assert.equal(await p.locator("dialog[open]").count(), 0);
    await p.screenshot({ path: `${shots}/three-${name}-follow-preview.png` });
    const before = await host.getAttribute("data-camera");
    await p.getByRole("button", { name: "Phóng to", exact: true }).click();
    await p.waitForFunction(
      (before) =>
        document.querySelector(".three-canvas")?.dataset.camera !== before,
      before,
      { timeout: 15000 },
    );
    await p.getByRole("button", { name: "Khu cao ốc", exact: true }).click();
    await p.waitForFunction(
      () => document.querySelector(".three-canvas")?.dataset.view === "skyline",
    );
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${shots}/three-${name}-skyline-preview.png` });
    await p
      .getByRole("button", { name: "Toàn cảnh thành phố", exact: true })
      .click();
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${shots}/three-${name}-overview-preview.png` });
    await p.getByRole("button", { name: "Theo nhân vật", exact: true }).click();
    await p.waitForTimeout(400);
    const orbitBefore = await host.getAttribute("data-camera");
    if (name === "mobile") {
      const c = await p.context().newCDPSession(p);
      await c.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 220, y: 420 }],
      });
      await c.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 300, y: 460 }],
      });
      await c.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } else {
      await p.mouse.move(850, 500);
      await p.mouse.down();
      await p.mouse.move(1000, 540, { steps: 8 });
      await p.mouse.up();
    }
    await p.waitForFunction(
      (before) =>
        document.querySelector(".three-canvas")?.dataset.camera !== before,
      orbitBefore,
    );
    await p.waitForFunction(
      () =>
        document
          .querySelector('[aria-label="Theo nhân vật"]')
          ?.getAttribute("aria-pressed") === "false",
    );
    assert.equal(await host.getAttribute("data-view"), "orbit");
    await p.getByRole("button", { name: "Cư dân", exact: true }).click();
    await p.locator("dialog[open]").waitFor();
    await p.locator(".people-grid button").filter({ hasText: "Bình" }).click();
    await p.waitForFunction(
      () =>
        document.querySelector(".three-canvas")?.dataset.selected === "binh",
    );
    await p.getByRole("button", { name: "Địa điểm", exact: true }).click();
    await p.getByRole("button", { name: /^Bệnh viện/ }).click();
    await p.waitForFunction(
      () =>
        document
          .querySelector('[aria-label="Theo nhân vật"]')
          ?.getAttribute("aria-pressed") === "false",
    );
    assert.equal(
      await p
        .getByRole("button", { name: "Theo nhân vật", exact: true })
        .getAttribute("aria-pressed"),
      "false",
    );
    await p.getByRole("button", { name: "Học hỏi", exact: true }).click();
    await p.getByText("Trải nghiệm & thói quen", { exact: true }).waitFor();
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: "Ẩn giao diện", exact: true }).click();
    assert.equal(
      await p
        .getByRole("button", { name: "Khu cao ốc", exact: true })
        .isVisible(),
      false,
    );
    await p
      .getByRole("button", { name: "Hiện giao diện", exact: false })
      .click();
    await p.getByRole("button", { name: "Địa điểm", exact: true }).click();
    await p
      .getByRole("button", { name: "Tái dựng từ OpenStreetMap", exact: true })
      .click();
    await p
      .getByRole("link", { name: "© OpenStreetMap contributors" })
      .waitFor();
    await p.waitForFunction(
      () => Number(document.querySelector(".osm-three")?.dataset.buildings) > 500,
    );
    await p.getByRole("button", { name: "Địa điểm", exact: true }).click();
    await p
      .getByRole("button", { name: "Thành phố sống", exact: true })
      .click();
    await host.waitFor();
    await host
      .locator("canvas")
      .evaluate((c) =>
        c.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext(),
      );
    await p
      .getByText("Chưa mở được không gian 3D", { exact: true })
      .waitFor();
    assert.equal(await p.locator(".urban-map").count(), 0);
    assert.equal(await p.locator(".three-canvas canvas").count(), 0);
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      name,
      stats,
      "PASS: real WebGL2, full viewport, mouse/touch orbit, zoom/follow/skyline/overview, roster selection, venue focus, learning, hide/show, renderer disposal, OSM, context-loss message; no page errors or overflow.",
    );
    await p.close();
  }
  // A browser without WebGL reports a recoverable error without loading another renderer.
  const p = await b.newPage();
  await p.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (
        type === "webgl2" ||
        type === "webgl" ||
        type === "experimental-webgl"
      )
        return null;
      return original.call(this, type, ...args);
    };
  });
  await p.goto(base, { waitUntil: "domcontentloaded" });
  await p
    .getByText("Chưa mở được không gian 3D", { exact: true })
    .waitFor({ timeout: 30000 });
  assert.equal(await p.locator(".urban-map").count(), 0);
  console.log("PASS: unavailable WebGL shows a retry action.");
  await p.close();
} finally {
  await b.close();
}
