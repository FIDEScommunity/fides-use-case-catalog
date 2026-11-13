/**
 * First-visit probe of the Complianz banner (cmplz-*) on the pilot: language, text, share of the viewport it covers.
 * Read-only, GET navigation only. Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/cookie-banner-first-visit-probe.cjs
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const [loc, root] of [["EN", ""], ["NL", "/nl"]]) {
    for (const [w, h] of [[390, 844], [1440, 900]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}${root}/fides-design-pilot/`, { waitUntil: "load" });
      await page.waitForSelector("#cmplz-cookiebanner-container .cmplz-cookiebanner, .cmplz-cookiebanner", { state: "visible", timeout: 8000 }).catch(() => {});
      const r = await page.evaluate(() => {
        const el = document.querySelector(".cmplz-cookiebanner");
        if (!el) return null;
        const b = el.getBoundingClientRect();
        const vis = Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0)) * Math.max(0, Math.min(b.right, innerWidth) - Math.max(b.left, 0));
        return { lang: document.documentElement.lang, shown: getComputedStyle(el).display !== "none", pctViewport: Math.round(vis / (innerWidth * innerHeight) * 100), height: Math.round(b.height), buttons: [...el.querySelectorAll("button, .cmplz-btn")].filter((x) => x.offsetParent).map((x) => x.textContent.trim()), title: (el.querySelector(".cmplz-title") || {}).textContent, message: ((el.querySelector(".cmplz-message") || {}).textContent || "").trim().slice(0, 120) };
      });
      console.log(`${loc} @${w}: ${JSON.stringify(r)}`);
      if (w === 390) await page.screenshot({ path: `tests/output/cookie-banner-${loc}-390.png` });
      await ctx.close();
    }
  }
  await browser.close();
})();
