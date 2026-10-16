/**
 * Density measurements for the pilot (design system v1.1): Explore panel
 * height, first result row position and computed text sizes per viewport.
 * Writes measurements.json plus viewport screenshots to SCREENS_DIR.
 *
 * Run: run-measure-density.sh <label>
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const VIEWPORTS = [[1366, 768], [1440, 900], [1100, 800], [1024, 768], [768, 1024], [390, 844], [320, 640]];
const WIDE = 1100;

function textStyle(selector) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { font: s.fontSize + "/" + s.lineHeight, weight: s.fontWeight, tracking: s.letterSpacing, top: Math.round(r.top + scrollY), height: Math.round(r.height) };
  })()`;
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const report = {};
  try {
    for (const [width, height] of VIEWPORTS) {
      const key = `${width}x${height}`;
      const context = await browser.newContext({ viewport: { width, height } });
      await context.addCookies(
        Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" })
          .map(([name, value]) => ({ name: `cmplz_${name}`, value, url: BASE }))
      );
      const page = await context.newPage();
      const m = (report[key] = {});
      const githubStarts = new Map();
      m.githubRequests = [];
      page.on("request", (r) => { if (r.url().includes("raw.githubusercontent.com")) githubStarts.set(r, Date.now()); });
      page.on("requestfinished", (r) => { if (githubStarts.has(r)) m.githubRequests.push({ ms: Date.now() - githubStarts.get(r), ok: true }); });
      page.on("requestfailed", (r) => { if (githubStarts.has(r)) m.githubRequests.push({ ms: Date.now() - githubStarts.get(r), failure: r.failure() && r.failure().errorText }); });

      await page.goto(`${BASE}/fides-design-pilot/homepage-fragment/`);
      await page.evaluate(() => document.fonts.ready);
      m.header = await page.evaluate(() => Math.round(document.querySelector(".fides-ds-site-header").getBoundingClientRect().height));
      m.heroH1 = await page.evaluate(textStyle(".fides-ds-shell__main h1"));
      m.featuredTitle = await page.evaluate(textStyle(".fides-uc-featured .fides-ds-card__title"));
      await page.screenshot({ path: path.join(OUT, `fragment-${key}.png`) });
      if (width >= WIDE) {
        await page.getByRole("button", { name: "Explore" }).click();
        await page.waitForTimeout(200);
        m.explore = await page.evaluate(() => {
          const panel = document.getElementById("fides-ds-panel-explore");
          const r = panel.getBoundingClientRect();
          const link = panel.querySelector(".fides-ds-site-nav__group .fides-ds-site-nav__panel-link");
          const ls = getComputedStyle(link);
          const intro = panel.querySelector(".fides-ds-site-nav__intro-title");
          return {
            top: Math.round(r.top),
            height: Math.round(r.height),
            bottom: Math.round(r.bottom),
            link: `${ls.fontSize}/${ls.lineHeight}`,
            linkTarget: Math.round(link.getBoundingClientRect().height),
            introTitle: intro && `${getComputedStyle(intro).fontSize}/${getComputedStyle(intro).lineHeight}`,
            groups: [...panel.querySelectorAll(".fides-ds-site-nav__group-label")].map((n) => n.textContent),
            visibleDescriptions: [...panel.querySelectorAll(".fides-ds-site-nav__panel-text")].filter((n) => n.getClientRects().length).length,
          };
        });
        await page.screenshot({ path: path.join(OUT, `explore-${key}.png`) });
        for (const [name, id] of [["Community", "community"], ["Tools & API", "tools"]]) {
          await page.getByRole("button", { name }).click();
          await page.waitForTimeout(200);
          m[`${id}Panel`] = await page.evaluate(() => {
            const open = document.querySelector(".fides-ds-site-nav__panel:not([hidden])");
            return open ? Math.round(open.getBoundingClientRect().height) : null;
          });
        }
        await page.keyboard.press("Escape");
      }

      await page.goto(`${BASE}/fides-design-pilot/overview/`);
      await page.locator(".fides-ds-card--row").first().waitFor();
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.evaluate(() => document.fonts.ready);
      m.catalogH1 = await page.evaluate(textStyle(".fides-ds-shell__main h1"));
      m.count = await page.evaluate(textStyle("[data-pilot-count]"));
      m.staleNotice = (await page.locator("[data-fides-stale-catalog-notice]").count()) > 0;
      m.catalogSource = await page.evaluate(() => document.getElementById("fides-use-case-catalog-root").dataset.catalogSource || "");
      m.firstRow = await page.evaluate(() => {
        const row = document.querySelector(".fides-ds-card--row");
        const r = row.getBoundingClientRect();
        const ts = getComputedStyle(row.querySelector(".fides-ds-card__title"));
        const summary = row.querySelector(".fides-ds-card__summary");
        const ss = summary && getComputedStyle(summary);
        const media = row.querySelector(".fides-ds-card__media, img");
        return {
          top: Math.round(r.top + scrollY),
          imageTop: media ? Math.round(media.getBoundingClientRect().top + scrollY) : null,
          title: `${ts.fontSize}/${ts.lineHeight}`,
          summary: ss && `${ss.fontSize}/${ss.lineHeight}`,
        };
      });
      m.smallControls = await page.evaluate(() =>
        [...document.querySelectorAll(".fides-ds-shell__main :is(input:not([type=checkbox]):not([type=radio]), select, button, summary)")]
          .filter((n) => n.getClientRects().length && n.getBoundingClientRect().width > 0)
          .map((n) => ({ el: (n.getAttribute("aria-label") || n.textContent || n.placeholder || n.tagName).trim().replace(/\s+/g, " ").slice(0, 30), h: Math.round(n.getBoundingClientRect().height) }))
          .filter((c) => c.h < 44)
      );
      m.overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      await page.screenshot({ path: path.join(OUT, `overview-${key}.png`) });

      await page.locator(".fides-ds-card--row a.fides-ds-card__link").first().click();
      await page.waitForURL(/usecase=/);
      await page.evaluate(() => document.fonts.ready);
      m.detailH1 = await page.evaluate(textStyle(".fides-ds-shell__main h1"));
      m.articleBody = await page.evaluate(textStyle(".fides-uc-detail__prose p, .fides-uc-detail section p"));
      await page.screenshot({ path: path.join(OUT, `detail-${key}.png`) });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, "measurements.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  const failures = Object.entries(report).filter(([, m]) => m && typeof m === "object" && ((m.smallControls || []).length || m.overflow));
  for (const [key, m] of failures) console.error(`not ok - ${key}: ${m.overflow ? "horizontal overflow " : ""}${JSON.stringify(m.smallControls || [])}`);
  if (failures.length) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
