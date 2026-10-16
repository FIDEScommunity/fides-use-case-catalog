/**
 * Which catalog source does the pilot overview use, and why does it fall back?
 * Loads the overview RUNS times in a fresh browser context (cold cache) and
 * logs each catalog request with timing and status, plus whether the
 * stale-data notice is shown.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const RUNS = Number(process.env.RUNS || 6);
const SOURCES = [
  ["github", /raw\.githubusercontent\.com\/FIDEScommunity\/fides-use-case-catalog\//],
  ["cache", /\/wp-json\/fides-catalog\/v1\/aggregated\/usecase/],
  ["local", /\/wp-json\/fides-use-case-catalog\/v1\/catalog/],
];

async function run() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const summary = [];
  try {
    for (let i = 1; i <= RUNS; i++) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      const page = await context.newPage();
      const t0 = Date.now();
      const open = new Map();
      const requests = [];
      const sourceOf = (url) => (SOURCES.find(([, re]) => re.test(url)) || [])[0];
      page.on("request", (r) => { const s = sourceOf(r.url()); if (s) open.set(r, { source: s, start: Date.now() - t0 }); });
      page.on("requestfinished", async (r) => {
        const e = open.get(r);
        if (e) { const res = await r.response(); requests.push({ ...e, ms: Date.now() - t0 - e.start, status: res && res.status() }); }
      });
      page.on("requestfailed", (r) => {
        const e = open.get(r);
        if (e) requests.push({ ...e, ms: Date.now() - t0 - e.start, failure: r.failure() && r.failure().errorText });
      });
      if (process.env.FIRST_PATH) await page.goto(`${BASE}${process.env.FIRST_PATH}`);
      await page.goto(`${BASE}/fides-design-pilot/overview/`);
      await page.locator(".fides-ds-card--row").first().waitFor({ timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      const notice = (await page.locator("[data-fides-stale-catalog-notice]").count()) > 0;
      const source = await page.evaluate(() => document.getElementById("fides-use-case-catalog-root").dataset.catalogSource || "");
      summary.push({ run: i, notice, source, requests });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  for (const r of summary) {
    console.log(`run ${r.run} source=${r.source} notice=${r.notice}`);
    for (const q of r.requests) console.log(`  ${q.source} start=${q.start}ms took=${q.ms}ms ${q.status || q.failure}`);
  }
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
