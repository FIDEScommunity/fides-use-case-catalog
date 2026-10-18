/**
 * UX round 16 browser checks, per width:
 * - Forced catalog fallback: GitHub is blocked for this browser context only, so
 *   the overview loads from the same-origin cache and shows the stale-data
 *   notice. Every visible functional control (notice included) must be at least
 *   44 px; the dismiss button 44x44. A self-test shrinks the dismiss button and
 *   expects the same check to fail.
 * Detail ecosystem checks moved to overview-detail-checks.cjs (new detail
 * layout, brief 2026-10-18).
 *
 * Run through run-ux16-checks.sh.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const WIDTHS = (process.env.WIDTHS || "1366,1440,1100,1024,768,390,320").split(",").map(Number);

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

/** Visible functional controls under 44 px; inline text links in prose are exempt. */
function smallTargets(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll(".fides-ds-shell__main :is(input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, button, summary, [role=button], a.fides-ds-action-link, a.fides-ds-button)")]
      .filter((n) => n.getClientRects().length && getComputedStyle(n).visibility !== "hidden")
      .map((n) => {
        const r = n.getBoundingClientRect();
        const square = n.matches(".fides-stale-catalog-notice-dismiss");
        return { el: (n.getAttribute("aria-label") || n.textContent || n.placeholder || n.tagName).trim().replace(/\s+/g, " ").slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), square };
      })
      .filter((c) => c.h < 44 || (c.square && c.w < 44))
  );
}

/** The PHP built-in server occasionally stalls on one worker; retry a navigation once. */
async function open(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (err) {
    console.log(`# retry ${url}: ${err.message.split("\n")[0]}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  }
}

async function newContext(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: width === 1366 ? 768 : 900 } });
  await context.addCookies(
    Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" })
      .map(([name, value]) => ({ name: `cmplz_${name}`, value, url: BASE }))
  );
  return context;
}

async function fallbackChecks(browser, width) {
  const context = await newContext(browser, width);
  await context.route("https://raw.githubusercontent.com/**", (route) => route.abort("connectionrefused"));
  const page = await context.newPage();
  await open(page, `${BASE}/fides-design-pilot/overview/`);
  const notice = page.locator("[data-fides-stale-catalog-notice]");
  await page.locator(".fides-ds-card--row").first().waitFor({ timeout: 20000 });
  const shown = await notice.waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false);
  const source = await page.locator("[data-catalog-source]").first().getAttribute("data-catalog-source").catch(() => null);
  check(`fallback @${width}: GitHub blocked -> fallback data with a visible notice`, shown && source && source !== "github", `shown=${shown} source=${source}`);
  if (!shown) return context.close();

  const box = await notice.locator(".fides-stale-catalog-notice-dismiss").boundingBox();
  check(`fallback @${width}: dismiss button is at least 44x44`, box && box.width >= 44 && box.height >= 44, JSON.stringify(box));
  const small = await smallTargets(page);
  check(`fallback @${width}: no functional target under 44 px while the notice is visible`, small.length === 0, JSON.stringify(small));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  check(`fallback @${width}: no horizontal overflow with the notice`, !overflow);
  await page.screenshot({ path: path.join(OUT, `fallback-${width}.png`) });

  // Self-test: the previous 20 px button must make the same check fail.
  await page.addStyleTag({ content: ".fides-stale-catalog-notice-dismiss{min-width:0!important;min-height:0!important;width:20px!important;height:20px!important;margin:0!important}" });
  const caught = await smallTargets(page);
  check(`fallback @${width}: self-test - a 20 px dismiss button is reported`, caught.some((c) => c.square), JSON.stringify(caught));
  await page.evaluate(() => document.querySelectorAll("style").forEach((s) => s.textContent.includes("width:20px!important") && s.remove()));

  await notice.locator(".fides-stale-catalog-notice-dismiss").focus();
  await page.keyboard.press("Enter");
  check(`fallback @${width}: Enter on dismiss removes the notice`, (await notice.count()) === 0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".fides-ds-card--row").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
  check(`fallback @${width}: the dismissed notice stays away in this session`, (await notice.count()) === 0);
  await context.close();
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    for (const width of WIDTHS) {
      await fallbackChecks(browser, width);
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`# pass ${results.length - failed}\n# fail ${failed}`);
  if (failed) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
