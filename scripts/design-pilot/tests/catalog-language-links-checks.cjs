/**
 * Catalog overviews keep the language route: use cases, credential types, organizations, personal and business wallets.
 *
 * Real clicks, EN and NL, per width (default 1440 and 390):
 *  - result card after a search, after a filter (Filters dialog, Apply) and after paging -> the record opens on the same
 *    language route (NL: /nl/...) with the matching <html lang>;
 *  - every result card link of the overview stays on the language route (also after a search);
 *  - "Back to results" returns to the exact overview URL (search, filter, page) and the results are shown again.
 * Nothing is submitted: GET navigation only.
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/catalog-language-links-checks.cjs   (env: PILOT_URL, WIDTHS, LOCALES, KINDS)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "EN,NL").split(",");
const ONLY = process.env.KINDS ? process.env.KINDS.split(",") : null;

const KINDS = [
  { key: "use-cases", path: "overview/", search: "wallet", detail: /\/use-case\/\?usecase=/ },
  { key: "credentials", path: "credentials/", search: "wallet", detail: /\/credential\/\?credential=/ },
  { key: "organizations", path: "organizations/", search: "identity", detail: /\/organization\/\?org=/ },
  { key: "personal-wallets", path: "personal-wallets/", search: "wallet", detail: /\/wallet\/\?wallet=/ },
  { key: "business-wallets", path: "business-wallets/", search: "wallet", detail: /\/wallet\/\?wallet=/ },
].filter((k) => !ONLY || ONLY.includes(k.key));

const BACK = { EN: "Back to results", NL: "Terug naar resultaten" };
const CARD = ".fides-uc-pilot__list .fides-ds-card--row, .fides-uc-pilot__list .fides-ds-card";
const LINK = ".fides-ds-card__link";
const PANEL = ".fides-uc-pilot__filter-panel";

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${detail})` : ""}`);
}

async function newPage(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
  const page = await ctx.newPage();
  const sent = [];
  // TranslatePress fetches dynamic Dutch strings with a POST to its own ajax endpoint; that is not a form submission.
  page.on("request", (r) => { if (!["GET", "HEAD", "OPTIONS"].includes(r.method()) && r.url().startsWith(BASE) && !/trp-ajax\.php/.test(r.url())) sent.push(`${r.method()} ${r.url()}`); });
  return { ctx, page, sent };
}

/** The overview is interactive once the script has taken over the server-rendered list (the result count is live). */
async function hydrated(page) {
  await page.waitForSelector(CARD, { timeout: 30000 });
  await page.waitForFunction(() => { const c = document.querySelector("[data-pilot-count]"); return c && /\d/.test(c.textContent) && document.querySelector("#fides-uc-pilot-root, [data-design='pilot']")?.getAttribute("aria-busy") !== "true"; }, null, { timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(300);
}

async function openList(page, url) {
  await page.goto(url, { waitUntil: "load" });
  await hydrated(page);
}

/** The card links of the overview must all live on the language route. */
async function cardHrefs(page) {
  return page.evaluate((sel) => [...document.querySelectorAll(`${sel} a[href]`)].map((a) => a.getAttribute("href")).filter((h) => /(usecase|credential|org|wallet)=/.test(h)), `.fides-uc-pilot__list`);
}

/** Same path and same query parameters; the order and TranslatePress'\ form-language field do not matter. */
const sameView = (a, b) => {
  const norm = (u) => { const x = new URL(u, BASE); const p = [...x.searchParams.entries()].filter(([k]) => k !== "trp-form-language").map(([k, v]) => `${k}=${v}`).sort().join("&"); return `${x.pathname}?${p}`; };
  return norm(a) === norm(b);
};

const onRoute = (url, loc) => (loc === "NL" ? new URL(url, BASE).pathname.startsWith("/nl/") : !new URL(url, BASE).pathname.startsWith("/nl/"));

/** Click the first card, assert the record page, return to the overview with the back action. */
async function openAndBack(page, loc, kind, tag, listUrl) {
  const before = new URL(listUrl);
  // A card whose record the server catalog does not know ("not in the current FIDES catalog", data drift between the
  // remote catalog JSON and the server copy) is reported as a note and the next card is tried.
  let opened = false;
  for (let idx = 0; idx < Math.min(5, await page.locator(CARD).count()) && !opened; idx += 1) {
    await page.locator(CARD).nth(idx).locator(LINK).first().click();
    try {
      await page.waitForSelector(".fides-ds-detail-top__back a, .fides-ds-detail-top, .fides-uc-detail__missing", { timeout: 30000 });
    } catch (err) {
      check(`${tag}: card ${idx + 1} opens a record page`, false, page.url());
      return;
    }
    if (await page.locator(".fides-uc-detail__missing").count()) {
      console.log(`# note ${tag}: card ${idx + 1} (${page.url()}) is not in the server catalog; trying the next card`);
      await page.goBack();
      await hydrated(page);
    } else {
      opened = true;
    }
  }
  if (!opened) {
    // Data drift, not a language problem: the overview (remote catalog JSON) lists records the server copy lacks.
    console.log(`# DATA-DRIFT ${tag}: none of the first cards has a record in the server catalog; link and back checks skipped for this step`);
    return;
  }
  const lang = await page.evaluate(() => document.documentElement.lang);
  check(`${tag}: record opens with lang ${loc === "NL" ? "nl" : "en"} (${lang})`, loc === "NL" ? lang.startsWith("nl") : lang.startsWith("en"), lang);
  check(`${tag}: record URL is on the ${loc === "NL" ? "/nl/" : "English"} route and is the pilot record page`, onRoute(page.url(), loc) && kind.detail.test(page.url()), page.url());
  await page.waitForFunction((label) => ((document.querySelector(".fides-ds-detail-top__back a") || {}).textContent || "").includes(label), BACK[loc], { timeout: 8000 }).catch(() => {});
  if (process.env.DEBUG_BACK) console.log("# debug", tag, await page.evaluate(() => JSON.stringify({ ss: sessionStorage.getItem("fides-ds-return:" + (document.querySelector("[data-fides-ds-back]") || { getAttribute: () => "" }).getAttribute("data-fides-ds-back")), id: (document.querySelector("[data-fides-ds-back]") || { getAttribute: () => "" }).getAttribute("data-fides-ds-back-id"), ref: document.referrer })));
  const back = await page.evaluate(() => {
    const a = document.querySelector(".fides-ds-detail-top__back a");
    return a ? { href: a.getAttribute("href"), label: a.textContent.replace(/\s+/g, " ").replace(/^←\s*/, "").trim() } : null;
  });
  check(`${tag}: back action reads "${BACK[loc]}"`, back && back.label === BACK[loc], JSON.stringify(back));
  if (!back) return;
  const target = new URL(back.href, BASE);
  check(`${tag}: back link keeps the language route`, onRoute(back.href, loc), back.href);
  check(`${tag}: back link keeps path, search, filters and page`, sameView(back.href, listUrl), `${back.href} vs ${listUrl}`);
  await page.locator(".fides-ds-detail-top__back a").first().click();
  await page.waitForSelector(CARD, { timeout: 30000 });
    check(`${tag}: after Back the overview URL is restored`, sameView(page.url(), listUrl), page.url());
  const q = before.searchParams.get("q");
  if (q) {
    const val = await page.locator("#fides-search-input").inputValue().catch(() => "");
    check(`${tag}: after Back the search box still holds "${q}"`, val === q, val);
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  let allSent = [];
  for (const w of WIDTHS) {
    for (const loc of LOCALES) {
      const root = `${BASE}${loc === "NL" ? "/nl" : ""}/fides-design-pilot`;
      for (const kind of KINDS) {
        const base = `${kind.key} ${loc} @${w}`;
        const listUrl = `${root}/${kind.path}`;

        // 0. Unfiltered overview: all record links on the language route.
        {
          const { ctx, page, sent } = await newPage(browser, w);
          await openList(page, listUrl);
          const hrefs = await cardHrefs(page);
          const off = hrefs.filter((h) => !onRoute(h, loc));
          check(`${base}: overview card links on the ${loc} route (${hrefs.length})`, hrefs.length > 0 && off.length === 0, off.slice(0, 2).join(" "));

          // 1. After a search.
          await page.fill("#fides-search-input", kind.search);
          await page.press("#fides-search-input", "Enter");
          await page.waitForFunction((q) => new URL(location.href).searchParams.get("q") === q, kind.search);
          await hydrated(page);
          const afterSearch = await cardHrefs(page);
          const offS = afterSearch.filter((h) => !onRoute(h, loc));
          check(`${base} search: result card links on the ${loc} route (${afterSearch.length})`, afterSearch.length > 0 && offS.length === 0, offS.slice(0, 2).join(" "));
          await openAndBack(page, loc, kind, `${base} search`, page.url());

          // 2. After a filter (Filters dialog on small screens, filter list on desktop): the first option that leaves results.
          let filteredUrl = "";
          for (let attempt = 0; attempt < 6 && !filteredUrl; attempt += 1) {
            await openList(page, listUrl);
            if (await page.locator("[data-pilot-open]").first().isVisible()) {
              await page.click("[data-pilot-open]");
              await page.waitForSelector(PANEL, { state: "visible", timeout: 10000 });
              await page.locator(`${PANEL} .fides-uc-pilot__more-field input[type='checkbox']`).nth(attempt).check({ force: true });
              await page.click(`${PANEL} [data-pilot-apply]`);
            } else {
              const boxes = page.locator("[data-fides-ds-popover] input[type='checkbox']");
              if (attempt >= (await boxes.count())) break;
              const pop = boxes.nth(attempt).locator("xpath=ancestor::*[@data-fides-ds-popover][1]");
              await pop.locator(".fides-ds-popover__toggle").click();
              await boxes.nth(attempt).check();
              await page.keyboard.press("Escape");
            }
            await page.waitForFunction(() => new URL(location.href).search !== "", null, { timeout: 10000 }).catch(() => {});
            await page.waitForTimeout(400);
            if ((await page.locator(CARD).count()) > 0) filteredUrl = page.url();
          }
          if (filteredUrl) {
            const afterFilter = await cardHrefs(page);
            const offF = afterFilter.filter((h) => !onRoute(h, loc));
            check(`${base} filter: result card links on the ${loc} route (${afterFilter.length})`, offF.length === 0, offF.slice(0, 2).join(" "));
            await openAndBack(page, loc, kind, `${base} filter`, filteredUrl);
          } else {
            check(`${base} filter: an option leaves results`, false, page.url());
          }
          if (sent.length) allSent = allSent.concat(sent);
          await ctx.close();
        }

        // 3. After paging (page 2 of the unfiltered overview).
        {
          const { ctx, page, sent } = await newPage(browser, w);
          await openList(page, listUrl);
          const next = page.locator('a[data-catalog-page="2"]:visible').first();
          if (await next.count()) {
            await next.click();
            await page.waitForFunction(() => new URL(location.href).searchParams.get("catalog_page") === "2", null, { timeout: 10000 }).catch(() => {});
            await page.waitForSelector(CARD, { timeout: 15000 });
            await hydrated(page);
            const afterPage = await cardHrefs(page);
            const offP = afterPage.filter((h) => !onRoute(h, loc));
            check(`${base} paging: result card links on the ${loc} route (${afterPage.length})`, afterPage.length > 0 && offP.length === 0, offP.slice(0, 2).join(" "));
            await openAndBack(page, loc, kind, `${base} paging`, page.url());
          } else {
            console.log(`# ${base}: no second result page (single page overview), paging step skipped`);
          }
          if (sent.length) allSent = allSent.concat(sent);
          await ctx.close();
        }
      }
    }
  }
  check("no non-GET request to the pilot (nothing sent)", allSent.length === 0, allSent.join(" | "));
  await browser.close();
  console.log(failures ? `\n${failures} failed` : "\nall ok");
  process.exit(failures ? 1 : 0);
})();
