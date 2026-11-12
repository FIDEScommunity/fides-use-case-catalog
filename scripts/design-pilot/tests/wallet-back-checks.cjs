/**
 * Wallet record: the back action in EN and NL, for personal and business wallets.
 *  - From a filtered overview: "Back to results" / "Terug naar resultaten", returns to the same URL with the same
 *    search, filters and result count; the action is reachable by keyboard; there is no second back link next to the breadcrumb.
 *  - Opened directly (new tab, or typed address in a tab that visited the overview earlier): "All personal wallets" /
 *    "All business wallets" (NL "Alle persoonlijke wallets" / "Alle zakelijke wallets"), pointing at the matching overview.
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/wallet-back-checks.cjs   (env: PILOT_URL, WIDTHS, LOCALES)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "EN,NL").split(",");

const TEXT = {
  EN: { back: "Back to results", personal: "All personal wallets", business: "All business wallets" },
  NL: { back: "Terug naar resultaten", personal: "Alle persoonlijke wallets", business: "Alle zakelijke wallets" },
};
const KINDS = {
  personal: { path: "personal-wallets/", filter: "?q=wallet&platform=Android" },
  business: { path: "business-wallets/", filter: "?q=wallet" },
};

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${detail})` : ""}`);
}

const ROWS = ".fides-uc-pilot__list .fides-ds-card--row";
const backInfo = (page) => page.evaluate(() => {
  const all = [...document.querySelectorAll(".fides-ds-detail-top__back a, [data-fides-ds-back]")];
  const a = document.querySelector(".fides-ds-detail-top__back a");
  return {
    count: new Set(all).size,
    href: a ? a.getAttribute("href") : "",
    label: a ? a.textContent.replace(/\s+/g, " ").replace(/^←\s*/, "").trim() : "",
    crumbBack: [...document.querySelectorAll(".fides-ph__crumbs a")].some((c) => /^(back|terug)/i.test(c.textContent.trim())),
    hiddenText: [...document.querySelectorAll("[data-fides-ds-back-return]")].every((e) => e.hidden),
  };
});

async function newPage(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
  return { ctx, page: await ctx.newPage() };
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const w of WIDTHS) {
    for (const loc of LOCALES) {
      const t = TEXT[loc];
      const root = `${BASE}${loc === "NL" ? "/nl" : ""}/fides-design-pilot`;
      for (const [kind, cfg] of Object.entries(KINDS)) {
        const tag = `${kind} ${loc} @${w}`;
        const { ctx, page } = await newPage(browser, w);
        const listUrl = `${root}/${cfg.path}`;
        await page.goto(listUrl, { waitUntil: "load" });
        await page.waitForSelector(ROWS, { timeout: 30000 });
        const total = await page.locator(ROWS).count();

        // 1. Filtered overview -> record -> Back.
        await page.goto(`${listUrl}${cfg.filter}`, { waitUntil: "load" });
        await page.waitForSelector(ROWS, { timeout: 30000 });
        const filteredUrl = page.url();
        const filtered = await page.locator(ROWS).count();
        const firstId = await page.locator(ROWS).first().getAttribute("data-wallet-id");
        check(`${tag}: filtered overview has results (${filtered})`, filtered >= 1, `${filtered}/${total}`);
        await page.locator(`${ROWS}[data-wallet-id="${firstId}"] .fides-ds-card__link`).first().click();
        await page.waitForSelector(".fides-wallet-detail h1", { timeout: 30000 });
        await page.waitForFunction((label) => (document.querySelector(".fides-ds-detail-top__back a") || {}).textContent?.includes(label), t.back, { timeout: 5000 }).catch(() => {});
        const fromList = await backInfo(page);
        check(`${tag}: from the list the action reads "${t.back}"`, fromList.label === t.back, fromList.label);
        check(`${tag}: one back action, none inside the breadcrumb, helper text hidden`, fromList.count === 1 && !fromList.crumbBack && fromList.hiddenText, JSON.stringify(fromList));
        check(`${tag}: the action carries the search and filters`, new URL(fromList.href, BASE).search === new URL(filteredUrl).search, `${fromList.href} vs ${filteredUrl}`);
        // Keyboard: Tab reaches the action and shows a focus ring.
        await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); });
        let reached = false;
        for (let i = 0; i < 25 && !reached; i += 1) {
          await page.keyboard.press("Tab");
          reached = await page.evaluate(() => !!document.activeElement && document.activeElement.matches(".fides-ds-detail-top__back a"));
        }
        const ring = reached ? await page.evaluate(() => { const c = getComputedStyle(document.activeElement); return (parseFloat(c.outlineWidth) >= 2 && c.outlineStyle !== "none") || /rgb/.test(c.boxShadow) && c.boxShadow !== "none"; }) : false;
        check(`${tag}: keyboard reaches the action with a visible focus ring`, reached && ring, `reached=${reached} ring=${ring}`);
        await page.keyboard.press("Enter");
        await page.waitForSelector(ROWS, { timeout: 30000 });
        await page.waitForTimeout(500);
        const after = await page.evaluate(() => ({ url: location.href, rows: document.querySelectorAll(".fides-uc-pilot__list .fides-ds-card--row").length, q: (document.querySelector("#fides-search-input") || {}).value }));
        check(`${tag}: Back lands on the same URL`, after.url === filteredUrl, `${after.url} vs ${filteredUrl}`);
        check(`${tag}: same result count and search text`, after.rows === filtered && (after.q || "") === "wallet", JSON.stringify(after));

        // 2. Same tab, record typed in directly after visiting the overview: plain overview link.
        const detailUrl = `${root}/wallet/?wallet=${encodeURIComponent(firstId)}`;
        await page.goto(detailUrl, { waitUntil: "load" });
        await page.waitForSelector(".fides-wallet-detail h1", { timeout: 30000 });
        const typed = await backInfo(page);
        check(`${tag}: typed address in the same tab shows "${t[kind]}" -> overview`, typed.label === t[kind] && new URL(typed.href, BASE).pathname === new URL(listUrl).pathname && new URL(typed.href, BASE).search === "", JSON.stringify(typed));
        await ctx.close();

        // 3. New tab, direct open.
        const fresh = await newPage(browser, w);
        await fresh.page.goto(detailUrl, { waitUntil: "load" });
        await fresh.page.waitForSelector(".fides-wallet-detail h1", { timeout: 30000 });
        const direct = await backInfo(fresh.page);
        check(`${tag}: direct open shows "${t[kind]}"`, direct.label === t[kind], direct.label);
        check(`${tag}: direct open points at the ${kind} overview`, new URL(direct.href, BASE).pathname === new URL(listUrl).pathname, direct.href);
        check(`${tag}: direct open has one back action and no horizontal overflow`, direct.count === 1 && !direct.crumbBack && (await fresh.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, JSON.stringify(direct));
        await fresh.ctx.close();
      }
    }
  }
  await browser.close();
  console.log(failures ? `\n${failures} failed` : "\nall wallet back checks passed");
  process.exit(failures ? 1 : 0);
})();
