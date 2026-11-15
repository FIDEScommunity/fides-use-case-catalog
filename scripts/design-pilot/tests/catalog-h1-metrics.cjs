/**
 * H1 metrics of the catalog overview, detail and explore pages (design pilot), at 1440 and 390 px, EN and NL.
 * Reports font-family, size, weight, line-height, letter-spacing, line count, horizontal overflow and the
 * spacing around the title (above, to the intro, intro to the next block). Optional screenshots of the page top.
 *
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/catalog-h1-metrics.cjs
 * Env: LABEL (before|after, part of the output name), PILOT_URL, WIDTHS, LOCALES, PAGES (comma list of keys),
 *      SHOTS=0 to skip screenshots, ASSERT=1 to exit non-zero when a page deviates from the agreed scale.
 * Output (git-ignored): tests/output/catalog-h1/<LABEL>-<run id>.json and <LABEL>-<key>-<loc>-<width>.png
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "EN,NL").split(",");
const LABEL = process.env.LABEL || "run";
const SHOTS = process.env.SHOTS !== "0";
const ASSERT = process.env.ASSERT === "1";
const OUT = path.join(__dirname, "output", "catalog-h1");
fs.mkdirSync(OUT, { recursive: true });
const RUN_ID = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);

// role: overview = catalog overview scale, detail = record detail scale, explore = Themes / Sectors (own scale).
const PAGES = {
  "use-cases": { path: "overview/", role: "overview" },
  organizations: { path: "organizations/", role: "overview" },
  "personal-wallets": { path: "personal-wallets/", role: "overview" },
  "business-wallets": { path: "business-wallets/", role: "overview" },
  credentials: { path: "credentials/", role: "overview" },
  issuers: { path: "issuers/", role: "overview" },
  "relying-parties": { path: "relying-parties/", role: "overview" },
  "use-case-detail": { path: "use-case/?usecase=ssitizens-verifiable-social-aid-how-municipalities-merchants-and-citizens-exchange-trust-with-wallets-mU94V3", role: "detail" },
  "organization-detail": { path: "organization/?org=org%3Auidai", role: "detail" },
  "wallet-detail": { path: "wallet/?wallet=eid-li", role: "detail" },
  "credential-detail": { path: "credential/?credential=cred%3Auidai%3Aaadhaar", role: "detail" },
  "issuer-detail": { path: "issuer/?issuer=issuer%3Acertizen%3Avlei%3Aproduction", role: "detail" },
  "rp-detail": { path: "relying-party/?rp=authologic-identity", role: "detail" },
  themes: { path: "themes/", role: "explore" },
  sectors: { path: "sectors/", role: "explore" },
  "explore-theme": { path: "explore-theme-identity-access/", role: "explore" },
  "explore-sector": { path: "explore-sector-finance/", role: "explore" },
};
const LONG_TITLE = "Interoperable verifiable credentials for cross-border qualification recognition and professional mobility";

// Agreed scale: [<600, 600-1099, >=1100] as [size, line-height].
const SCALE = { overview: [[32, 38], [30, 36], [30, 36]], detail: [[30, 34], [34, 40], [36, 42]] };
const band = (w) => (w < 600 ? 0 : w < 1100 ? 1 : 2);

function measure(longTitle) {
  const px = (v) => Math.round(parseFloat(v) * 100) / 100;
  const vis = (el) => el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== "hidden";
  const h1 = [...document.querySelectorAll("h1")].find(vis);
  if (!h1) return { missing: true };
  const result = (title) => {
    const cs = getComputedStyle(h1);
    const r = h1.getBoundingClientRect();
    const top = r.top + scrollY;
    const el = (n) => (n && n.nodeType === 1 && vis(n) ? n : null);
    let prev = h1.previousElementSibling;
    while (prev && !el(prev)) prev = prev.previousElementSibling;
    let anchor = h1.parentElement && /title-row/.test(h1.parentElement.className) ? h1.parentElement : h1;
    let next = null;
    for (let i = 0; i < 3 && anchor && !next; i += 1) {
      let n = anchor.nextElementSibling;
      while (n && !el(n)) n = n.nextElementSibling;
      next = n;
      if (!next) anchor = anchor.parentElement;
    }
    const nr = next && next.getBoundingClientRect();
    const ncs = next && getComputedStyle(next);
    let after = null;
    if (next) {
      after = next.nextElementSibling;
      while (after && !el(after)) after = after.nextElementSibling;
    }
    const sel = (n) => (n ? `${n.tagName.toLowerCase()}.${String(n.className).split(/\s+/).slice(0, 2).join(".")}` : null);
    return {
      title,
      cls: String(h1.className),
      font: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      size: px(cs.fontSize),
      lh: px(cs.lineHeight),
      weight: Number(cs.fontWeight),
      tracking: Math.round((px(cs.letterSpacing) / px(cs.fontSize)) * 1000) / 1000,
      lines: Math.round(r.height / px(cs.lineHeight)),
      width: Math.round(r.width),
      marginTop: px(cs.marginTop),
      marginBottom: px(cs.marginBottom),
      top: Math.round(top),
      gapAbove: prev ? Math.round(top - (prev.getBoundingClientRect().bottom + scrollY)) : null,
      next: sel(next),
      nextSize: ncs ? `${px(ncs.fontSize)}/${px(ncs.lineHeight)}` : null,
      gapToNext: nr ? Math.round(nr.top + scrollY - (r.bottom + scrollY)) : null,
      gapAfterNext: nr && after ? Math.round(after.getBoundingClientRect().top + scrollY - (nr.bottom + scrollY)) : null,
      after: sel(after),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      clipped: h1.scrollWidth > h1.clientWidth + 1,
    };
  };
  const m = result(h1.textContent.trim());
  if (longTitle) {
    const original = h1.textContent;
    h1.textContent = longTitle;
    m.long = result(longTitle);
    h1.textContent = original;
  }
  return m;
}

async function run() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const keys = (process.env.PAGES || Object.keys(PAGES).join(",")).split(",");
  const report = {};
  let bad = 0;
  try {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addCookies(
        Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" })
          .map(([name, value]) => ({ name: `cmplz_${name}`, value, url: BASE }))
      );
      const page = await context.newPage();
      for (const loc of LOCALES) {
        for (const key of keys) {
          const def = PAGES[key];
          const url = `${BASE}${loc === "NL" ? "/nl" : ""}/fides-design-pilot/${def.path}`;
          await page.goto(url, { waitUntil: "domcontentloaded" });
          await page.waitForSelector("h1", { state: "visible", timeout: 20000 }).catch(() => {});
          await page.evaluate(() => document.fonts.ready);
          await page.waitForFunction(() => !document.querySelector("[data-fides-ssr-spinner], .fides-loading"), null, { timeout: 8000 }).catch(() => {});
          const m = await page.evaluate(measure, def.role === "explore" ? null : LONG_TITLE);
          m.role = def.role;
          report[`${key}|${loc}|${width}`] = m;
          if (SHOTS) await page.screenshot({ path: path.join(OUT, `${LABEL}-${key}-${loc}-${width}.png`) });
          const want = SCALE[def.role];
          if (want && !m.missing) {
            const [s, l] = want[band(width)];
            const ok = m.size === s && m.lh === l && m.overflowX <= 0 && !(m.long && (m.long.overflowX > 0 || m.long.clipped));
            if (!ok) bad += 1;
            console.log(`${ok ? "ok" : "not ok"} - ${key} ${loc} ${width}: ${m.size}/${m.lh} w${m.weight} ls${m.tracking} lines${m.lines} overflow${m.overflowX} long ${m.long ? m.long.lines + " lines" : "-"}`);
          } else {
            console.log(`info - ${key} ${loc} ${width}: ${m.missing ? "NO H1" : `${m.size}/${m.lh} w${m.weight} ls${m.tracking} lines${m.lines} overflow${m.overflowX}`}`);
          }
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const file = path.join(OUT, `${LABEL}-${RUN_ID}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`Wrote ${file}`);
  if (ASSERT && bad) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
