/**
 * Browser check for the organisation filters linked from the trust-service-providers article, 1440 and 390 px.
 * For role=eidas_trust_service_provider, cert=qtsp and both: reads the shown count, pages through ALL result pages,
 * compares the listed organisations with the expected sets from tests/output/org-qtsp-filter-expected.json
 * (run tests/org-qtsp-filter-data-check.cjs first), and opens the detail of a few organisations to confirm the
 * role or the QTSP certification is shown there.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/org-qtsp-filter-checks.cjs
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const exp = JSON.parse(fs.readFileSync(path.join(__dirname, "output/org-qtsp-filter-expected.json"), "utf8"));
const slug = (id) => id.replace(/^org:/, "");
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d && !ok ? ` (${String(d).slice(0, 300)})` : ""}`); };
const CASES = [
  { q: "?role=eidas_trust_service_provider", want: exp.role },
  { q: "?cert=qtsp", want: exp.qtsp },
  { q: "?role=eidas_trust_service_provider&cert=qtsp", want: exp.both },
];
async function open(page, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
  await page.waitForSelector("#fides-org-catalog-root .fides-uc-pilot__count", { timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector("#fides-org-catalog-root [data-pilot-ssr]"), null, { timeout: 30000 });
}
const rows = (page) => page.evaluate(() => [...document.querySelectorAll("#fides-org-catalog-root .fides-uc-pilot__list .fides-ds-card--row")].map((r) => (r.querySelector("a[href]") || r.closest("a") || {}).href || r.textContent.trim().slice(0, 60)));
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
    for (const c of CASES) {
      const tag = `${c.q} @${width}`;
      await open(page, `/fides-design-pilot/organizations/${c.q}`);
      const countText = (await page.textContent("[data-pilot-count]")).trim();
      const shown = parseInt(countText, 10);
      const seen = [];
      for (let guard = 0; guard < 20; guard += 1) {
        seen.push(...(await rows(page)));
        const next = page.locator("#fides-org-catalog-root .fides-catalog-pagination__next:not([disabled]):not([aria-disabled=true])").first();
        if (!(await next.count()) || !(await next.isVisible())) break;
        await next.click();
        await page.waitForTimeout(400);
      }
      const ids = [...new Set(seen.map((h) => { const m = /[?&]org=([^&#]+)/.exec(h); return m ? decodeURIComponent(m[1]).replace(/^org:/, "") : h; }))];
      const want = new Set(c.want.map(slug));
      check(`${tag}: count "${countText}" equals the data (${want.size})`, shown === want.size, countText);
      check(`${tag}: all pages list ${want.size} unique organisations`, ids.length === want.size && seen.length === ids.length, `${seen.length} rows, ${ids.length} unique`);
      check(`${tag}: nobody missing, nobody extra`, ids.every((i) => want.has(i)) && [...want].every((i) => ids.includes(i)), `extra ${ids.filter((i) => !want.has(i)).slice(0, 5)} missing ${[...want].filter((i) => !ids.includes(i)).slice(0, 5)}`);
    }
  }
  await browser.close();
  console.log(failures ? `${failures} failure(s)` : "all checks passed");
  process.exit(failures ? 1 : 0);
})();
