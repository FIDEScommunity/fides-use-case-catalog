/**
 * Issuer and relying party design pilot: overview, record, limited record, filters, relations, back route,
 * deeplinks and the add/update routes.
 *
 * Per catalog, width (default 1440 and 390) and language (EN, NL; NL must keep /nl/):
 *  - overview: result rows, live count, no horizontal overflow, all record links on the language route;
 *  - filter: one option applied through the real Filters UI -> fewer results, a pill that removes it, shareable URL;
 *  - empty state: says why and offers the way back;
 *  - record from a result row: language, "Back to results" restores the exact overview URL, keyboard reaches the back link;
 *  - relation links: an accepted/offered credential opens the credential type pilot page and back returns to the record;
 *  - limited record: renders without empty sections or placeholder text;
 *  - deeplink (?issuer= / ?rp=) on the overview opens the pilot record;
 *  - add route: the add link opens the existing form page or its sign-in gate (nothing is submitted).
 * Route (EN, once per width): Explorer -> catalog -> record -> credential type -> back.
 * Nothing is submitted: GET navigation only.
 *
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/issuer-rp-checks.cjs   (env: PILOT_URL, WIDTHS, LOCALES, KINDS)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "EN,NL").split(",");
const ONLY = process.env.KINDS ? process.env.KINDS.split(",") : null;

const KINDS = [
  {
    key: "issuers", path: "issuers/", param: "issuer", detailPath: "issuer/", prefix: "issuer", noun: "issuers",
    rich: "issuer:animo:bundesdruckerei:test", limited: "issuer:eduwallet:uvh:test",
    search: "wallet", filterName: "country[]", emptyQuery: "zzzzqqqq",
    relation: "#credentials a.fides-issuer-eco__row", sections: { limitedAbsent: ["credentials", "use-cases"] },
    add: "Add issuer",
  },
  {
    key: "relying-parties", path: "relying-parties/", param: "rp", detailPath: "relying-party/", prefix: "rp", noun: "relying parties",
    rich: "pass2rent-car-rental-verifier", limited: "ksid-verifier",
    search: "wallet", filterName: "country[]", emptyQuery: "zzzzqqqq",
    relation: "#credentials a.fides-rp-eco__row", sections: { limitedAbsent: ["credentials", "use-cases", "features"] },
    add: "Add relying party",
  },
].filter((k) => !ONLY || ONLY.includes(k.key));

const BACK = { EN: "Back to results", NL: "Terug naar resultaten" };
const CARD = ".fides-uc-pilot__list .fides-ds-card";
const LINK = ".fides-ds-card__link";

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

const onRoute = (url, loc) => (loc === "NL" ? new URL(url, BASE).pathname.startsWith("/nl/") : !new URL(url, BASE).pathname.startsWith("/nl/"));
const rootFor = (loc) => `${BASE}${loc === "NL" ? "/nl" : ""}/fides-design-pilot`;

/** Same path and query parameters; the order and TranslatePress' form-language field do not matter. */
const sameView = (a, b) => {
  const norm = (u) => { const x = new URL(u, BASE); const p = [...x.searchParams.entries()].filter(([k]) => k !== "trp-form-language").map(([k, v]) => `${k}=${v}`).sort().join("&"); return `${x.pathname}?${p}`; };
  return norm(a) === norm(b);
};

async function openList(page, url) {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector(CARD, { timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
}

const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const countOf = (page) => page.evaluate(() => { const m = (document.querySelector("[data-pilot-count]") || {}).textContent || ""; const n = m.match(/(\d+)(?: of (\d+))?/); return n ? Number(n[1]) : -1; });

/** Apply one option of a filter group through the real UI (Filters dialog on small screens, popover on desktop). */
async function applyFilter(page, kind) {
  const open = page.locator(`[data-${kind.prefix}-pilot-open]`).first();
  if (await open.isVisible()) {
    await open.click();
    await page.waitForSelector(`[data-${kind.prefix}-pilot-panel].is-open, [data-${kind.prefix}-pilot-panel]:visible`, { timeout: 10000 });
  }
  const box = page.locator(`input[name="${kind.filterName}"]`).first();
  const pop = box.locator("xpath=ancestor::*[@data-fides-ds-popover][1]");
  await pop.locator(".fides-ds-popover__toggle").click();
  const label = (await box.locator("xpath=following-sibling::*[contains(@class,'fides-ds-option__label')]").textContent()).trim();
  await box.check();
  await page.locator(`[data-${kind.prefix}-pilot-form] .fides-uc-pilot__panel-actions button[type=submit]`).click();
  await page.waitForFunction((n) => [...new URL(location.href).searchParams.keys()].includes(n), kind.filterName.replace("[]", "") + "[]", { timeout: 15000 });
  await page.waitForSelector(".fides-uc-pilot__count", { timeout: 15000 });
  return label;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  let allSent = [];
  for (const w of WIDTHS) {
    for (const loc of LOCALES) {
      const root = rootFor(loc);
      for (const kind of KINDS) {
        const tag = `${kind.key} ${loc} @${w}`;
        const listUrl = `${root}/${kind.path}`;
        const { ctx, page, sent } = await newPage(browser, w);

        // 1. Overview.
        await openList(page, listUrl);
        const total = await countOf(page);
        check(`${tag}: overview shows rows and a live count (${total})`, total > 0 && (await page.locator(CARD).count()) > 0, total);
        check(`${tag}: overview has no horizontal overflow`, await noOverflow(page));
        const hrefs = await page.$$eval(`.fides-uc-pilot__list a[href*="${kind.param}="]`, (as) => as.map((a) => a.getAttribute("href")));
        const off = hrefs.filter((h) => !onRoute(h, loc) || !h.includes(`/${kind.detailPath}`));
        check(`${tag}: record links point to the pilot record on the ${loc} route (${hrefs.length})`, hrefs.length > 0 && off.length === 0, off.slice(0, 2).join(" "));

        // 2. Filter -> fewer results, a pill removes it again.
        const label = await applyFilter(page, kind);
        const filtered = await countOf(page);
        check(`${tag} filter "${label}": fewer results (${filtered} of ${total})`, filtered > 0 && filtered < total, filtered);
        const filteredUrl = page.url();
        check(`${tag} filter: the URL keeps the language route`, onRoute(filteredUrl, loc), filteredUrl);
        const pill = page.locator(".fides-uc-pilot__pill").first();
        check(`${tag} filter: an active pill names the choice`, (await pill.count()) === 1 && (await pill.textContent()).includes(label));
        await pill.click();
        await page.waitForSelector(CARD, { timeout: 15000 });
        check(`${tag} filter: removing the pill restores all results`, (await countOf(page)) === total, await countOf(page));

        // 3. Empty state.
        await page.goto(`${listUrl}?q=${kind.emptyQuery}`, { waitUntil: "load" });
        await page.waitForSelector(".fides-uc-pilot__empty", { timeout: 15000 });
        const clear = page.locator(".fides-uc-pilot__empty a", { hasText: /Clear all filters|Alle filters wissen|filters/i }).first();
        check(`${tag}: empty state offers a way back`, (await clear.count()) === 1 && onRoute(await clear.getAttribute("href"), loc));

        // 4. Record from a row, Back to results, keyboard.
        await page.goto(`${listUrl}?q=${kind.search}`, { waitUntil: "load" });
        await page.waitForSelector(CARD, { timeout: 15000 });
        const searchUrl = page.url();
        await page.locator(CARD).first().locator(LINK).first().focus();
        await page.keyboard.press("Enter");
        await page.waitForSelector(".fides-ds-detail-top__back a", { timeout: 30000 });
        check(`${tag}: record opens on the ${loc} route`, onRoute(page.url(), loc) && page.url().includes(`/${kind.detailPath}?${kind.param}=`), page.url());
        const lang = await page.evaluate(() => document.documentElement.lang);
        check(`${tag}: record lang is ${loc === "NL" ? "nl" : "en"} (${lang})`, loc === "NL" ? lang.startsWith("nl") : lang.startsWith("en"));
        check(`${tag}: record has no horizontal overflow`, await noOverflow(page));
        const back = await page.evaluate(() => { const a = document.querySelector(".fides-ds-detail-top__back a"); return a ? { href: a.getAttribute("href"), label: a.textContent.replace(/\s+/g, " ").replace(/^←\s*/, "").trim() } : null; });
        check(`${tag}: back action reads "${BACK[loc]}"`, back && back.label === BACK[loc], JSON.stringify(back));
        check(`${tag}: back link restores the search overview`, back && sameView(back.href, searchUrl), back && `${back.href} vs ${searchUrl}`);
        let reached = false;
        for (let i = 0; i < 20 && !reached; i += 1) {
          await page.keyboard.press("Tab");
          reached = await page.evaluate(() => !!document.activeElement && document.activeElement.matches(".fides-ds-detail-top__back a"));
        }
        check(`${tag}: keyboard Tab reaches the back link`, reached);
        await page.keyboard.press("Enter");
        await page.waitForSelector(CARD, { timeout: 30000 });
        check(`${tag}: after Back the overview URL and search are restored`, sameView(page.url(), searchUrl) && (await page.locator("#fides-search-input").inputValue()) === kind.search, page.url());

        // 5. Relation link: record -> credential type -> back to the record.
        const richUrl = `${root}/${kind.detailPath}?${kind.param}=${encodeURIComponent(kind.rich)}`;
        await page.goto(richUrl, { waitUntil: "load" });
        const rel = page.locator(kind.relation).first();
        if (await rel.count()) {
          await rel.click();
          await page.waitForSelector(".fides-ds-detail-top", { timeout: 30000 });
          check(`${tag}: relation link opens the credential type pilot page on the ${loc} route`, onRoute(page.url(), loc) && /\/credential\/\?credential=/.test(page.url()), page.url());
          await page.goBack();
          await page.waitForSelector(`[data-${kind.prefix}-id]`, { timeout: 30000 });
          check(`${tag}: browser Back returns to the record`, sameView(page.url(), richUrl), page.url());
        } else {
          check(`${tag}: rich record has a credential relation`, false);
        }

        // 6. Limited record: no empty sections, no placeholders.
        const limitedUrl = `${root}/${kind.detailPath}?${kind.param}=${encodeURIComponent(kind.limited)}`;
        await page.goto(limitedUrl, { waitUntil: "load" });
        await page.waitForSelector(`[data-${kind.prefix}-id]`, { timeout: 30000 });
        const present = [];
        for (const id of kind.sections.limitedAbsent) if (await page.locator(`#${id}`).count()) present.push(id);
        check(`${tag}: limited record omits sections without data (${kind.sections.limitedAbsent.join(", ")})`, present.length === 0, present.join(","));
        const text = await page.locator(".fides-uc-detail").innerText();
        check(`${tag}: limited record shows no placeholder text`, !/undefined|\bnull\b|Array\b|N\/A|Unknown/i.test(text));
        check(`${tag}: limited record has no horizontal overflow`, await noOverflow(page));

        // 7. Deeplink on the overview opens the pilot record.
        await page.goto(`${listUrl}?${kind.param}=${encodeURIComponent(kind.rich)}`, { waitUntil: "load" });
        check(`${tag}: ?${kind.param}= deeplink opens the pilot record on the ${loc} route`, onRoute(page.url(), loc) && page.url().includes(`/${kind.detailPath}?${kind.param}=`), page.url());

        // 8. Add route up to the form.
        await page.goto(listUrl, { waitUntil: "load" });
        const add = page.locator("a.fides-uc-pilot__add").first();
        const addHref = (await add.count()) ? await add.getAttribute("href") : "";
        check(`${tag}: the add link is offered`, addHref !== "" && onRoute(addHref, loc), addHref);
        if (addHref) {
          await page.goto(new URL(addHref, BASE).toString(), { waitUntil: "load" });
          // A guest gets the sign-in gate of the existing form (a signed-in visitor gets the form itself).
          const reached = await page.evaluate(() => document.querySelectorAll("form").length > 0 || /signed in|sign in|ingelogd|inloggen/i.test(document.body.innerText));
          check(`${tag}: the add route opens the form or its sign-in gate (nothing submitted)`, reached, page.url());
        }

        if (sent.length) allSent = allSent.concat(sent);
        await ctx.close();
      }
    }

    // Route: Explorer -> catalog -> record -> credential type -> back (EN).
    for (const kind of KINDS) {
      const { ctx, page, sent } = await newPage(browser, w);
      const tag = `route ${kind.key} @${w}`;
      await page.goto(`${BASE}/explorer/`, { waitUntil: "load" });
      const entry = page.locator(`a[href*="/fides-design-pilot/${kind.path}"]`).first();
      check(`${tag}: Explorer links to the pilot catalog`, (await entry.count()) > 0);
      if (await entry.count()) {
        await page.goto(new URL(await entry.getAttribute("href"), BASE).toString(), { waitUntil: "load" });
        await page.waitForSelector(CARD, { timeout: 30000 });
        await page.locator(CARD).first().locator(LINK).first().click();
        await page.waitForSelector(".fides-ds-detail-top__back a", { timeout: 30000 });
        const recordUrl = page.url();
        const rel = page.locator(kind.relation).first();
        if (await rel.count()) {
          await rel.click();
          await page.waitForSelector(".fides-ds-detail-top", { timeout: 30000 });
          check(`${tag}: record opens its credential type`, /\/credential\/\?credential=/.test(page.url()), page.url());
          // The way back from Credential types: the credential page links to this catalog's records.
          const reverse = page.locator(`a[href*="/${kind.detailPath}?${kind.param}="], a[href*="/${kind.path}?"]`).first();
          check(`${tag}: the credential type links back to ${kind.key}`, (await reverse.count()) > 0);
          if (await reverse.count()) {
            // On small screens the relation list sits in a closed disclosure: follow the link address then.
            const shown = page.locator(`a[href*="/${kind.detailPath}?${kind.param}="]:visible, a[href*="/${kind.path}?"]:visible`).first();
            if (await shown.count()) await shown.click();
            else await page.goto(new URL(await reverse.getAttribute("href"), BASE).toString(), { waitUntil: "load" });
            await page.waitForSelector(`[data-${kind.prefix}-id], ${CARD}`, { timeout: 30000 });
            check(`${tag}: that link opens the pilot ${kind.key} page`, page.url().includes(`/fides-design-pilot/${kind.detailPath}`) || page.url().includes(`/fides-design-pilot/${kind.path}`), page.url());
          }
        } else {
          console.log(`# ${tag}: first record (${recordUrl}) has no credential relation; credential steps skipped`);
        }
      }
      if (sent.length) allSent = allSent.concat(sent);
      await ctx.close();
    }
  }
  check("no non-GET request to the pilot (nothing sent)", allSent.length === 0, allSent.join(" | "));
  await browser.close();
  console.log(failures ? `\n${failures} failed` : "\nall ok");
  process.exit(failures ? 1 : 0);
})();
