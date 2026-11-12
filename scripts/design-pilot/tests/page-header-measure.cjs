/**
 * Measures the computed page-header values (H1, label, intro, breadcrumb, spacing, start position) of the five
 * pilot pages at 1440 / 768 / 390 px in EN and NL. Class-agnostic: selectors cover both the old and the shared
 * page-header classes, so the same script produces the baseline and the "after" numbers.
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/page-header-measure.cjs <label>
 * Output: tests/output/page-headers/measure-<label>.json (git-ignored). Env: PILOT_URL, WIDTHS, LOCALES, ONLY (page keys).
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,768,390").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "EN,NL").split(",");
const PAGES = {
  learn: { path: "learn/sessions/", role: "standard" },
  updates: { path: "updates/", role: "standard" },
  awards: { path: "global-digital-trust-awards/", role: "standard" },
  wallets: { path: "personal-wallets/", role: "compact" },
  detail: { path: "wallet/?wallet=mattr-go-hold", role: "compact" },
};
const OUT = path.join(__dirname, "output", "page-headers");
fs.mkdirSync(OUT, { recursive: true });

/** Runs in the page: returns the computed header metrics. */
function measure() {
  const px = (v) => Math.round(parseFloat(v) * 100) / 100;
  const h1 = document.querySelector("h1");
  const main = document.querySelector(".fides-ds-shell__main") || document.body;
  const scope = h1.closest("header, .fides-ph, .fides-awards-hero, .fides-ds-page") || main;
  const q = (sel, root) => [...(root || document).querySelectorAll(sel)].find((e) => e.offsetParent !== null && e.getBoundingClientRect().height > 0) || null;
  const label = q(".fides-ph__label, .fides-ds-kicker, .fides-awards-kicker, .fides-learn__eyebrow", scope);
  const intro = q(".fides-ph__intro, .fides-learn__intro, .fides-ds-lead, .fides-uc-pilot__lead p, .fides-uc-pilot__lead", scope);
  const crumbsNav = q(".fides-ph__crumbs, .fides-learn__crumbs, .fides-ds-detail-top__crumbs", document);
  const crumbs = crumbsNav && (crumbsNav.querySelector("ol") || crumbsNav);
  const back = q("[data-fides-ds-back], .fides-learn__back, .fides-ds-detail-top__back a", document);
  const ink = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      font: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      size: px(cs.fontSize),
      lh: cs.lineHeight === "normal" ? "normal" : px(cs.lineHeight),
      tracking: cs.letterSpacing === "normal" ? 0 : Math.round((px(cs.letterSpacing) / px(cs.fontSize)) * 1000) / 1000,
      weight: cs.fontWeight,
      transform: cs.textTransform,
      color: cs.color,
      left: Math.round(r.left * 10) / 10,
      top: Math.round((r.top + scrollY) * 10) / 10,
      bottom: Math.round((r.bottom + scrollY) * 10) / 10,
      width: Math.round(r.width * 10) / 10,
      height: Math.round(r.height * 10) / 10,
      lines: cs.lineHeight === "normal" ? null : Math.round(r.height / px(cs.lineHeight)),
      text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
    };
  };
  const m = { h1Count: document.querySelectorAll("h1").length, h1: ink(h1), label: ink(label), intro: ink(intro), crumbs: ink(crumbs), back: ink(back) };
  const mr = main.getBoundingClientRect();
  m.mainTop = Math.round((mr.top + scrollY) * 10) / 10;
  const items = [m.crumbs, m.label, m.h1, m.intro].filter(Boolean);
  const bar = document.querySelector(".fides-learn-bar");
  const barBottom = bar ? bar.getBoundingClientRect().bottom + scrollY : m.mainTop;
  const detailTop = document.querySelector(".fides-ds-detail-top");
  const first = Math.min(...[m.crumbs, m.label, m.h1].filter(Boolean).map((i) => i.top), detailTop && !m.crumbs ? detailTop.getBoundingClientRect().top + scrollY : Infinity);
  m.startTop = first - m.mainTop;
  m.startGap = Math.round((first - barBottom) * 10) / 10;
  const gap = (a, b) => (a && b ? Math.round((b.top - a.bottom) * 10) / 10 : null);
  m.gaps = { crumbsToNext: gap(m.crumbs, m.label || m.h1), labelToH1: gap(m.label, m.h1), h1ToNext: gap(m.h1, m.intro) };
  m.hScroll = document.documentElement.scrollWidth > innerWidth + 1;
  m.crumbItems = crumbs ? [...crumbs.querySelectorAll("li")].map((li) => ({ text: li.textContent.trim(), link: !!li.querySelector("a"), href: li.querySelector("a") && li.querySelector("a").getAttribute("href"), current: !!li.querySelector("[aria-current=page]") || li.getAttribute("aria-current") === "page" })) : [];
  m.crumbName = crumbsNav ? crumbsNav.getAttribute("aria-label") : null;
  void items;
  return m;
}

(async () => {
  const label = process.argv[2] || "run";
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  const result = {};
  for (const loc of LOCALES) {
    for (const [key, p] of Object.entries(PAGES)) {
      if (process.env.ONLY && !process.env.ONLY.split(",").includes(key)) continue;
      for (const w of WIDTHS) {
        const pg = await b.newPage({ viewport: { width: w, height: 900 } });
        const url = `${BASE}${loc === "NL" ? "/nl" : ""}/fides-design-pilot/${p.path}`;
        try {
          await pg.goto(url, { waitUntil: "load" });
          await pg.waitForTimeout(700);
          result[`${key}|${loc}|${w}`] = { url, role: p.role, ...(await pg.evaluate(measure)) };
        } catch (e) {
          result[`${key}|${loc}|${w}`] = { url, error: String(e).slice(0, 120) };
        }
        await pg.close();
      }
    }
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, `measure-${label}.json`), JSON.stringify(result, null, 1));
  for (const [k, v] of Object.entries(result)) {
    if (v.error) { console.log(k, "ERROR", v.error); continue; }
    const f = (i) => (i ? `${i.size}/${i.lh} w${i.weight} ls${i.tracking} x${i.left}` : "-");
    console.log(k.padEnd(18), "h1", f(v.h1), "| label", f(v.label), "| intro", f(v.intro), "| crumbs", f(v.crumbs), "| start", v.startTop, "gap", v.startGap, "| gaps", JSON.stringify(v.gaps), v.h1.font);
  }
})();
