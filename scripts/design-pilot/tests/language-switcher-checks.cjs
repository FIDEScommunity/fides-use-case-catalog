/**
 * Header language switcher (TranslatePress data): placement, accessible names, keyboard,
 * destinations (page, record parameters, filters), both directions, no floater, no overflow.
 * Run through run-language-switcher-checks.sh. Screenshots go to SCREENS_DIR.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const SHOTS = process.env.SCREENS_DIR || "/tmp";
const WIDTHS = (process.env.WIDTHS || "1440,1100,768,390,320").split(",").map(Number);
const PAGES = [
  ["/fides-design-pilot/learn/", "/nl/fides-design-pilot/learn/"],
  ["/fides-design-pilot/overview/", "/nl/fides-design-pilot/overview/"],
];
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}
async function go(page, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: "load" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
  await page.mouse.move(0, 0);
}
/** Same decoded parameters; the overview script may re-encode a space as + or %20. */
function sameParams(search) {
  const p = new URLSearchParams(search);
  return p.get("wallet") === "other" && p.get("filter") === "a b" && [...p.keys()].length === 2;
}
const toggle = (page) => page.locator("[data-fides-ds-lang-toggle]");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  for (const width of WIDTHS) {
    const L = (w) => `${w}@${width}`;
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 700 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    for (const [en, nl] of PAGES) {
      await go(page, en);
      const barH = await page.locator(".fides-ds-site-header__bar").evaluate((e) => Math.round(e.getBoundingClientRect().height));
      check(`${L(en)}: switcher in the header actions, header height unchanged`, (await page.locator(".fides-ds-site-header__actions [data-fides-ds-lang-toggle]").count()) === 1 && barH === (width >= 1100 ? 64 : 68), String(barH));
      check(`${L(en)}: toggle shows the EN flag and code, accessible name`, (await toggle(page).locator("img").count()) === 1 && (width < 380 || /EN/.test(await toggle(page).innerText())) && (await toggle(page).getAttribute("aria-label")) === "Language: English");
      check(`${L(en)}: no floating switcher`, (await page.locator(".trp-floating-switcher").count()) === 0);
      const geo = await page.evaluate(() => {
        const h = document.querySelector(".fides-ds-site-header__bar");
        const r = (e) => e.getBoundingClientRect();
        const kids = [...document.querySelectorAll(".fides-ds-site-header__brand, .fides-ds-site-header__actions > *")].filter((e) => r(e).width > 0).map(r);
        let overlap = false;
        for (let i = 1; i < kids.length; i++) if (kids[i].left < kids[i - 1].right - 0.5) overlap = true;
        return { overflow: document.documentElement.scrollWidth > innerWidth + 1, overlap, over: r(document.querySelector(".fides-ds-site-header__actions")).right > r(h).right + 0.5, toggleH: Math.round(r(document.querySelector("[data-fides-ds-lang-toggle]")).height) };
      });
      check(`${L(en)}: no overflow, no overlap, 44px target`, !geo.overflow && !geo.overlap && !geo.over && geo.toggleH >= 44, JSON.stringify(geo));

      // Open with click, both names present and focusable.
      await toggle(page).click();
      check(`${L(en)}: dropdown opens with English and Nederlands`, (await toggle(page).getAttribute("aria-expanded")) === "true" && (await page.locator("[data-fides-ds-lang-link]").evaluateAll((a) => a.map((x) => x.getAttribute("aria-label")).join("|"))) === "English|Nederlands");
      const box = await page.locator(".fides-ds-lang__list").boundingBox();
      check(`${L(en)}: dropdown stays inside the viewport`, box && box.x >= 0 && box.x + box.width <= width + 0.5, JSON.stringify(box));
      if (en.includes("learn")) await page.screenshot({ path: `${SHOTS}/lang-open-${width}.png`, clip: { x: 0, y: 0, width, height: 300 } });
      await page.keyboard.press("Escape");
      check(`${L(en)}: Escape closes and returns focus to the toggle`, (await toggle(page).getAttribute("aria-expanded")) === "false" && (await page.evaluate(() => document.activeElement.matches("[data-fides-ds-lang-toggle]"))));

      // Keyboard: ArrowDown opens and focuses the current language, arrows move, Tab leaves.
      await toggle(page).focus();
      await page.keyboard.press("ArrowDown");
      check(`${L(en)}: ArrowDown opens and focuses the current language`, await page.evaluate(() => document.activeElement.matches('[data-fides-ds-lang-link][aria-current="true"]')));
      await page.keyboard.press("ArrowDown");
      check(`${L(en)}: ArrowDown moves to Nederlands`, (await page.evaluate(() => document.activeElement.getAttribute("aria-label"))) === "Nederlands");

      // EN -> NL by keyboard, then NL -> EN.
      await page.keyboard.press("Enter");
      await page.waitForURL(/\/nl\//);
      check(`${L(en)}: Enter on Nederlands reaches ${nl}`, new URL(page.url()).pathname === nl, page.url());
      check(`${L(nl)}: html lang is nl, toggle shows NL`, /^nl/i.test(await page.locator("html").getAttribute("lang")) && (width < 380 || /NL/.test(await toggle(page).innerText())) && (await toggle(page).getAttribute("aria-label")) === "Language: Nederlands");
      check(`${L(nl)}: no floating switcher`, (await page.locator(".trp-floating-switcher").count()) === 0);
      await toggle(page).click();
      await page.locator('[data-fides-ds-lang-link][aria-label="English"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith("/nl/"));
      check(`${L(nl)}: back to English keeps the page`, new URL(page.url()).pathname === en, page.url());
    }

    // Parameters, filters and hash survive in both directions.
    await go(page, "/fides-design-pilot/overview/?wallet=test-wallet&q=eudi&sector=finance#results");
    await toggle(page).click();
    const nlHref = await page.locator('[data-fides-ds-lang-link][aria-label="Nederlands"]').getAttribute("href");
    check(`${L("params")}: Nederlands link keeps path, parameters and hash`, /^\/nl\/fides-design-pilot\/overview\/\?wallet=test-wallet&q=eudi&sector=finance#results$/.test(nlHref), nlHref);
    await page.evaluate(() => history.replaceState(null, "", location.pathname + "?wallet=other&filter=a%20b"));
    await page.locator('[data-fides-ds-lang-link][aria-label="Nederlands"]').click();
    await page.waitForURL(/\/nl\//);
    check(`${L("params")}: filters changed after load are carried to NL`, sameParams(new URL(page.url()).search), page.url());
    await toggle(page).click();
    const enHref = await page.locator('[data-fides-ds-lang-link][aria-label="English"]').getAttribute("href");
    check(`${L("params")}: English link from NL keeps the parameters`, enHref.startsWith("/fides-design-pilot/overview/?") && sameParams(enHref.split("?")[1]), enHref);

    check(`${L("all")}: no JavaScript errors`, errors.length === 0, errors.join("|"));
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `FAILED: ${failures}` : "All language switcher checks passed.");
  process.exit(failures ? 1 : 0);
})();
