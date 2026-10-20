/**
 * Full-page screenshots of the wallet pilot pages for review.
 * Usage: node wallet-screens.cjs [url-path ...]; widths from SCREEN_WIDTHS.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const WIDTHS = (process.env.SCREEN_WIDTHS || "1440,390").split(",").map(Number);
const PATHS = process.argv.slice(2);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addCookies(
      Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" })
        .map(([name, value]) => ({ name: `cmplz_${name}`, value, url: BASE }))
    );
    const page = await context.newPage();
    page.on("pageerror", (err) => console.log(`# pageerror ${err.message}`));
    for (const target of PATHS) {
      await page.goto(`${BASE}${target}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(800);
      const name = `${target.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}-${width}.png`;
      await page.screenshot({ path: path.join(OUT, name), fullPage: true });
      console.log(path.join(OUT, name));
      const tile = Number(process.env.SCREEN_TILE || 0);
      if (tile > 0) {
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0, n = 1; y < height; y += tile, n += 1) {
          const file = path.join(OUT, name.replace(/\.png$/, `-part${n}.png`));
          await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y, width, height: Math.min(tile, height - y) } });
          console.log(file);
        }
      }
    }
    await context.close();
  }
  await browser.close();
})();
