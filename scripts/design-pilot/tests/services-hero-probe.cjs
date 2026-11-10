/**
 * Probe: measures the Services hero (.fides-learn__hero) and the top of the first service row
 * under different conditions (consent banner, viewport height, font loading, reduced motion),
 * to explain hero-height differences between runs. Env: WIDTHS, PILOT_URL, CHROME_PATH, PLAYWRIGHT_MODULE.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const URL_ = `${BASE}/fides-design-pilot/services/`;
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const measure = (page) => page.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { h: Math.round(b.height), top: Math.round(b.top + scrollY), w: Math.round(b.width) }; };
  const h1 = document.querySelector("h1");
  return { hero: r(".fides-learn__hero"), h1: r("h1"), h1Lines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)), firstRow: r(".fides-learn-service"), main: r("main"), vh: innerHeight, clientW: document.documentElement.clientWidth, fonts: document.fonts.status, banner: !!document.querySelector(".cmplz-cookiebanner:not(.cmplz-dismissed)") && getComputedStyle(document.querySelector(".cmplz-cookiebanner")).display !== "none" };
});
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  for (const width of WIDTHS) {
    for (const [label, height, wait, dismiss] of [
      ["900px, early (domcontentloaded, banner)", 900, false, false],
      ["900px, loaded, banner", 900, true, false],
      ["900px, loaded, banner denied", 900, true, true],
      ["600px, loaded, banner denied", 600, true, true],
      ["1400px, loaded, banner denied", 1400, true, true],
    ]) {
      const ctx = await browser.newContext({ viewport: { width, height } });
      const page = await ctx.newPage();
      await page.goto(URL_, { waitUntil: wait ? "load" : "domcontentloaded" });
      if (wait) await page.evaluate(() => document.fonts.ready);
      if (dismiss) { const d = page.locator(".cmplz-btn.cmplz-deny:visible").first(); if (await d.waitFor({ state: "visible", timeout: 2000 }).then(() => true, () => false)) await d.click(); await page.waitForTimeout(400); }
      console.log(`${width} | ${label} | ${JSON.stringify(await measure(page))}`);
      await ctx.close();
    }
  }
  await browser.close();
})();
