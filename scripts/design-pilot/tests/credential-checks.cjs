/**
 * Credential overview and detail browser checks (Paper 20.7 / 20.8 /
 * 20.18 / 20.19 / 20.33–20.41).
 *
 * Search contract (pure helpers, synthetic and source fixtures): short-term
 * word starts, technical paths, AND, relevance tiers, exact names first.
 * Overview: layout per width, rows, search only on Enter / Search (including
 * attribute names), Relevance by default with a query, explicit sort, Clear,
 * filters and the TS11 metadata flag in the URL, reload keeps state, sort,
 * list / grid, pager, zero results, old ?credential= deeplinks, Back with
 * filters and focus, More filters (Listing, TS11 Explain dialog with scroll
 * lock, Escape and focus return, Technical filters row), the compact bar per
 * width (full / compact; Subject and Format in the bar, Ecosystem and Authority
 * in More filters, one control kept on resize),
 * Filters dialog (groups, Apply / Cancel, scroll lock, only the body scrolls).
 * Detail: EHIC, EUCC, Open Badge, vLEI and mDL at every width without
 * horizontal overflow; format tabs (click and arrow keys); attributes
 * show-all; TS11 and relations as accordions below 1100 px; 44 px targets;
 * legacy aliases; classic listing unchanged.
 *
 * Run through run-credential-checks.sh.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const OVERVIEW = `${BASE}/fides-design-pilot/credentials/`;
const DETAIL = `${BASE}/fides-design-pilot/credential/?credential=`;
const CLASSIC = `${BASE}/credential-catalog/`;
const RECORDS = (process.env.CREDENTIAL_IDS || [
  "cred:eu:ehic",
  "cred:webuild:eucc",
  "cred:eduwallet:open-badge",
  "cred:gleif:legal-entity-vlei",
  "cred:iso:mdl",
].join(",")).split(",");
const WIDTHS = (process.env.DETAIL_WIDTHS || "1440,1280,768,390,320").split(",").map(Number);

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

async function open(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (err) {
    console.log(`# retry ${url}: ${err.message.split("\n")[0]}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  }
}

async function newContext(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height: height || 900 } });
  await context.addCookies(
    Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" })
      .map(([name, value]) => ({ name: `cmplz_${name}`, value, url: BASE }))
  );
  return context;
}

async function overviewReady(page) {
  await page.waitForSelector("#fides-credential-catalog-root [data-pilot-count]", { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll("#fides-credential-catalog-root .fides-ds-card").length > 0, null, { timeout: 30000 });
}

async function count(page) {
  // On /nl/, TranslatePress clears a just-updated count for a moment, then puts the text back.
  await page.waitForFunction(() => /\d/.test(document.querySelector("[data-pilot-count]")?.textContent || ""), null, { timeout: 8000 });
  const text = await page.textContent("[data-pilot-count]");
  const match = String(text || "").match(/(\d+)/);
  return match ? Number(match[1]) : -1;
}

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/**
 * Filter alignment only (1440 and 390, EN and NL): Subject and Format in the bar,
 * Ecosystem and Authority in More filters, one-line fields, Cancel / Apply filters
 * without a count, direct links, chips, and Escape / Cancel discarding a draft.
 */
async function credentialFilterAlign(browser, errors) {
  const widths = [1440, 390];
  const locales = ["EN", "NL"];
  const text = {
    EN: { more: "More filters", technical: "Technical filters", apply: "Apply filters", cancel: "Cancel", closeMore: "Close more filters" },
    NL: { more: "Meer filters", technical: "Technische filters", apply: "Filters toepassen", cancel: "Annuleren", closeMore: "Meer filters sluiten" },
  };
  const rootFor = (loc) => `${BASE}${loc === "NL" ? "/nl" : ""}/fides-design-pilot/credentials/`;
  const onRoute = (url, loc) => (loc === "NL" ? new URL(url).pathname.startsWith("/nl/") : !new URL(url).pathname.startsWith("/nl/"));

  async function fieldLine(toggle) {
    return toggle.evaluate((el) => {
      const label = el.querySelector(".fides-ds-popover__label");
      const value = el.querySelector(".fides-ds-popover__value");
      if (!label || !value) return null;
      const lr = label.getBoundingClientRect();
      const vr = value.getBoundingClientRect();
      const after = getComputedStyle(label, "::after").content || "";
      return { sameRow: vr.top < lr.bottom - 1 && lr.top < vr.bottom - 1, dot: after.includes("·") };
    });
  }

  for (const width of widths) {
    for (const loc of locales) {
      const T = text[loc];
      const tag = `credentials ${loc} @${width}`;
      const context = await newContext(browser, width);
      const page = await context.newPage();
      const sent = [];
      page.on("request", (r) => { if (!["GET", "HEAD", "OPTIONS"].includes(r.method()) && r.url().startsWith(BASE) && !/trp-ajax\.php/.test(r.url())) sent.push(`${r.method()} ${r.url()}`); });
      page.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`));
      const listUrl = rootFor(loc);
      await open(page, listUrl);
      await overviewReady(page);
      const total = await count(page);
      check(`${tag}: stays on the language route`, onRoute(page.url(), loc), page.url());
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);

      const barKeys = () => page.evaluate(() => [...document.querySelectorAll(".fides-uc-pilot__filter-row > *")]
        .filter((el) => el.offsetParent !== null)
        .map((el) => el.dataset.pilotKey || (el.hasAttribute("data-pilot-more-toggle") ? "more" : el.tagName)));
      const where = (key) => page.evaluate((name) => {
        const el = document.querySelector(`[data-pilot-key="${name}"]`);
        if (!el) return "missing";
        return el.closest("#fides-credential-pilot-more") ? "more" : "row";
      }, key);

      if (width >= 600) {
        check(`${tag}: layout full`, (await page.getAttribute("#fides-credential-catalog-root", "data-pilot-layout")) === "full");
        check(`${tag}: the bar shows Subject, Format and More filters`, (await barKeys()).join(",") === "subjectType,vcFormat,more", (await barKeys()).join(","));
        check(`${tag}: Ecosystem and Authority are not in the bar`, (await where("ecosystem")) === "more" && (await where("authority")) === "more" && !(await page.locator(".fides-uc-pilot__filter-row [data-pilot-key='ecosystem']").isVisible()));
        const moreToggle = page.locator("[data-pilot-more-toggle]");
        check(`${tag}: More filters is closed (${T.more})`, (await moreToggle.isVisible()) && (await moreToggle.getAttribute("aria-expanded")) === "false" && (await moreToggle.textContent()).includes(T.more), await moreToggle.textContent());
        const subjectLine = await fieldLine(page.locator("[data-pilot-key='subjectType'] .fides-ds-popover__toggle"));
        check(`${tag}: Subject keeps label and value on one line`, !!(subjectLine && subjectLine.sameRow && subjectLine.dot), JSON.stringify(subjectLine));
        await moreToggle.click();
        await page.locator("#fides-credential-pilot-more").waitFor({ state: "visible" });
        const chrome = await page.locator("#fides-credential-pilot-more").evaluate((el) => {
          const s = getComputedStyle(el);
          return {
            bg: s.backgroundColor,
            top: s.borderTopWidth,
            topColor: s.borderTopColor,
            title: (el.querySelector(".fides-uc-pilot__more-title") || {}).textContent || "",
            close: !!(el.querySelector(".fides-uc-pilot__more-close") && el.querySelector(".fides-uc-pilot__more-close").offsetParent),
          };
        });
        check(`${tag}: More filters is a white panel with a 2px top line, title and close`, /rgb\(255,\s*255,\s*255\)/.test(chrome.bg) && chrome.top === "2px" && chrome.topColor !== chrome.bg && chrome.title.includes(T.more) && chrome.close, JSON.stringify(chrome));
        const ecoLine = await fieldLine(page.locator("#fides-credential-pilot-more [data-pilot-key='ecosystem'] .fides-ds-popover__toggle"));
        const authLine = await fieldLine(page.locator("#fides-credential-pilot-more [data-pilot-key='authority'] .fides-ds-popover__toggle"));
        check(`${tag}: Ecosystem and Authority are one-line fields inside More filters`, !!(ecoLine && ecoLine.sameRow && ecoLine.dot && authLine && authLine.sameRow && authLine.dot), JSON.stringify({ ecoLine, authLine }));
        check(`${tag}: Sector, Theme and Listing stay in More filters`, (await page.locator("#fides-credential-pilot-more [data-pilot-key='sector']").isVisible()) && (await page.locator("#fides-credential-pilot-more [data-pilot-key='theme']").isVisible()) && (await page.locator("#fides-credential-pilot-more [data-pilot-quick]").isVisible()));
        const tech = page.locator("[data-pilot-tech-toggle]");
        check(`${tag}: Technical filters is closed (${T.technical})`, (await tech.isVisible()) && !(await page.locator("#fides-credential-pilot-technical").isVisible()) && (await tech.textContent()).includes(T.technical));
        await tech.click();
        check(`${tag}: Technical filters opens Schema type`, (await page.locator("#fides-credential-pilot-technical [data-pilot-key='schemaType']").isVisible()));
        await tech.click();
        check(`${tag}: Technical filters closes again`, !(await page.locator("#fides-credential-pilot-technical").isVisible()));
        await page.locator("[data-pilot-key='ecosystem'] .fides-ds-popover__toggle").click();
        const eco = page.locator("[data-pilot-key='ecosystem'] input[type='checkbox']").first();
        const ecoValue = await eco.getAttribute("value");
        await eco.check();
        await page.waitForFunction((value) => new URL(location.href).searchParams.get("ecosystem") === value, ecoValue);
        check(`${tag}: choosing Ecosystem applies it (URL, pill, More badge)`, new URL(page.url()).searchParams.get("ecosystem") === ecoValue && (await page.locator("[data-pilot-remove-group='ecosystem']").count()) === 1 && ((await page.locator("[data-pilot-more-badge]").textContent()) || "").trim() === "1");
        await page.keyboard.press("Escape");
        check(`${tag}: Escape closes the option list and leaves More filters open`, (await page.locator("#fides-credential-pilot-more").isVisible()) && (await page.locator("[data-fides-ds-popover].is-open").count()) === 0);
        await page.keyboard.press("Escape");
        check(`${tag}: a second Escape closes More filters`, !(await page.locator("#fides-credential-pilot-more").isVisible()));
        await page.locator("[data-pilot-remove-group='ecosystem']").click();
        await page.waitForFunction(() => !new URL(location.href).searchParams.get("ecosystem"));
        check(`${tag}: removing the chip clears Ecosystem`, (await page.locator(".fides-uc-pilot__pill").count()) === 0 && (await count(page)) === total);
        await page.locator("#fides-search-input").focus();
        let reached = false;
        for (let i = 0; i < 8 && !reached; i += 1) {
          await page.keyboard.press("Tab");
          reached = await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-pilot-more-toggle"));
        }
        check(`${tag}: Tab from search reaches More filters`, reached);
      } else {
        check(`${tag}: layout compact`, (await page.getAttribute("#fides-credential-catalog-root", "data-pilot-layout")) === "compact");
        const opener = page.locator("[data-pilot-open]");
        check(`${tag}: one Filters button, no More filters button`, (await opener.isVisible()) && !(await page.locator("[data-pilot-more-toggle]").isVisible()));
        await opener.click();
        await page.locator("#fides-credential-pilot-filter-panel.is-open").waitFor();
        const order = await page.evaluate(() => [...document.querySelectorAll("#fides-credential-pilot-filter-panel [data-pilot-key], #fides-credential-pilot-filter-panel [data-pilot-quick], #fides-credential-pilot-filter-panel [data-pilot-tech-toggle]")]
          .filter((el) => el.offsetParent !== null)
          .map((el) => el.dataset.pilotKey || (el.hasAttribute("data-pilot-quick") ? "listing" : "technical"))
          .join(","));
        check(`${tag}: the dialog lists Subject, Format, then More filters groups`, order === "subjectType,vcFormat,ecosystem,authority,sector,theme,listing,technical", order);
        const dialogLine = await fieldLine(page.locator("#fides-credential-pilot-filter-panel [data-pilot-key='subjectType'] .fides-ds-popover__toggle"));
        check(`${tag}: the dialog field keeps label and value on one line`, !!(dialogLine && dialogLine.sameRow && dialogLine.dot), JSON.stringify(dialogLine));
        const apply = page.locator("#fides-credential-pilot-filter-panel [data-pilot-apply]");
        const cancel = page.locator("#fides-credential-pilot-filter-panel [data-pilot-cancel]").last();
        const applyText = ((await apply.textContent()) || "").replace(/\s+/g, " ").trim();
        const cancelText = ((await cancel.textContent()) || "").replace(/\s+/g, " ").trim();
        check(`${tag}: Cancel and Apply filters, without a result count`, cancelText === T.cancel && applyText === T.apply && !/\d/.test(applyText), `${cancelText} | ${applyText}`);
        check(`${tag}: the result count stays on the results line`, /\d/.test((await page.locator("[data-pilot-count]").textContent()) || ""));
        await page.locator("#fides-credential-pilot-filter-panel [data-pilot-key='vcFormat'] .fides-ds-popover__toggle").click();
        const format = page.locator("[data-pilot-key='vcFormat'] input[type='checkbox']").first();
        const formatValue = await format.getAttribute("value");
        await format.check();
        check(`${tag}: a dialog choice stays draft`, new URL(page.url()).searchParams.get("format") === null);
        await page.keyboard.press("Escape");
        await page.keyboard.press("Escape");
        check(`${tag}: Escape closes the dialog and discards the draft`, !(await page.locator("#fides-credential-pilot-filter-panel.is-open").count()) && new URL(page.url()).searchParams.get("format") === null && (await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-pilot-open"))));
        await opener.click();
        await page.locator("#fides-credential-pilot-filter-panel.is-open").waitFor();
        await page.locator("#fides-credential-pilot-filter-panel [data-pilot-key='vcFormat'] .fides-ds-popover__toggle").click();
        await page.locator(`[data-pilot-key='vcFormat'] input[value='${formatValue}']`).check();
        await page.locator("#fides-credential-pilot-filter-panel [data-pilot-cancel]").filter({ hasText: T.cancel }).click();
        check(`${tag}: Cancel discards the draft and returns focus to Filters`, new URL(page.url()).searchParams.get("format") === null && (await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-pilot-open"))));
        await opener.click();
        await page.locator("#fides-credential-pilot-filter-panel.is-open").waitFor();
        await page.keyboard.press("Shift+Tab");
        check(`${tag}: Shift+Tab stays inside the dialog`, await page.evaluate((label) => {
          const el = document.activeElement;
          return !!el && !!el.closest(".fides-uc-pilot__filter-panel.is-open") && (el.textContent || "").includes(label);
        }, T.apply));
        await page.keyboard.press("Escape");
      }

      await open(page, `${listUrl}?format=sd_jwt_vc`);
      await overviewReady(page);
      check(`${tag}: direct ?format= keeps the route, a chip and a narrower list`, onRoute(page.url(), loc) && new URL(page.url()).searchParams.get("format") === "sd_jwt_vc" && (await page.locator("[data-pilot-remove-group='vcFormat']").count()) === 1 && (await count(page)) < total && (await count(page)) > 0);
      await open(page, `${listUrl}?ecosystem=eudi_wallet`);
      await overviewReady(page);
      check(`${tag}: direct ?ecosystem= selects Ecosystem`, new URL(page.url()).searchParams.get("ecosystem") === "eudi_wallet" && (await page.locator("[data-pilot-remove-group='ecosystem']").count()) === 1 && (await count(page)) < total);
      if (width >= 600) check(`${tag}: direct ?ecosystem= marks More filters`, ((await page.locator("[data-pilot-more-badge]").textContent()) || "").trim() === "1");
      await open(page, `${listUrl}?sector=education`);
      await overviewReady(page);
      check(`${tag}: direct ?sector=education selects Sector`, new URL(page.url()).searchParams.get("sector") === "education" && (await page.locator("[data-pilot-remove-group='sector']").count()) === 1 && (await count(page)) < total);
      await page.locator("[data-pilot-clear-filters]").click();
      await page.waitForFunction(() => !new URL(location.href).searchParams.get("sector"));
      check(`${tag}: Clear filters removes the sector choice`, (await page.locator(".fides-uc-pilot__pill").count()) === 0 && (await count(page)) === total);
      check(`${tag}: nothing was submitted (GET only)`, sent.length === 0, sent.slice(0, 2).join(" "));
      await context.close();
    }
  }
}

async function smallTargets(page, selector) {
  return page.evaluate((sel) => [...document.querySelectorAll(sel)]
    .filter((el) => el.offsetParent !== null)
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.height > 0 && r.height < 43.5)
    .map(({ el, r }) => `${el.className || el.tagName} ${Math.round(r.height)}px`), selector);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  // Classic modal link builder (catalogDeepLink in credential-catalog.js), without a browser.
  {
    const source = fs.readFileSync(path.resolve(__dirname, "../../../../credential-catalog/wordpress-plugin/fides-credential-catalog/assets/credential-catalog.js"), "utf8");
    const match = source.match(/\n  function catalogDeepLink\([\s\S]*?\n  }\n/);
    check("classic links: catalogDeepLink present", !!match);
    if (match) {
      const link = new Function(`${match[0]}; return catalogDeepLink;`)();
      const rp = "https://fides.community/ecosystem-explorer/relying-party-catalog/";
      check("classic links: one relying party", link(rp, "rp", "eideasy-afterhours-cinema-demo") === `${rp}?rp=eideasy-afterhours-cinema-demo`);
      check("classic links: several ids, literal commas, encoded once", link(rp, "rps", ["a", "b:c"]) === `${rp}?rps=a,b%3Ac`);
      check("classic links: base without trailing slash", link("https://example.org/rp", "rp", "a") === "https://example.org/rp/?rp=a");
      check("classic links: base query kept", link("https://example.org/rp/?lang=nl", "rps", ["a", "b"]) === "https://example.org/rp/?lang=nl&rps=a,b");
      check("classic links: same parameter and fragment replaced", link("https://example.org/rp/?rp=old&lang=nl#top", "rp", "new") === "https://example.org/rp/?lang=nl&rp=new");
      check("classic links: empty base gives no link", link("", "rp", "a") === "");
    }
  }

  // Pilot search contract (credential-refinements-2026-10-23 § 5), without a browser.
  const PLUGIN = path.resolve(__dirname, "../../../../credential-catalog/wordpress-plugin/fides-credential-catalog");
  const SOURCE = JSON.parse(fs.readFileSync(path.join(PLUGIN, "data/aggregated.json"), "utf8"));
  const SOURCE_LIST = SOURCE.credentials || SOURCE;
  {
    const source = fs.readFileSync(path.join(PLUGIN, "assets/credential-catalog.js"), "utf8");
    const block = source.match(/\/\* pilot-search:begin \*\/([\s\S]*?)\/\* pilot-search:end \*\//);
    check("search contract: pure search block present", !!block);
    if (block) {
      const api = new Function(`${block[1]}; return { pilotSearchTerms, pilotSearchIndex, pilotSearchMatches, pilotSearchTier };`)();
      const index = (f) => api.pilotSearchIndex(Object.assign({ title: "", identifier: "", authority: "", tags: [], taxonomy: [], description: "", attributes: [] }, f));
      const hit = (q, f) => api.pilotSearchMatches(index(f), api.pilotSearchTerms(q));
      const tier = (q, f) => api.pilotSearchTier(index(f), q, api.pilotSearchTerms(q));
      check("search contract: a short term is no mid-word match (EHIC / vehicle)", !hit("ehic", { title: "Vehicle Registration" }) && hit("ehic", { title: "EHIC" }));
      check("search contract: PID is not found inside LPID", !hit("pid", { tags: ["LPID"] }) && !hit("pid", { attributes: ["lpid_issuer"] }) && !hit("pid,", { tags: ["LPID"] }));
      check("search contract: a separate PID tag or attribute segment still matches", hit("pid", { tags: ["PID"] }) && hit("pid", { attributes: ["pid_issuer"] }) && hit("pid", { identifier: "urn:eudi:pid:1" }));
      check("search contract: a short term matches a word start", hit("veri", { title: "Age Verification" }) && hit("eu", { taxonomy: ["eudi-wallet"] }));
      check("search contract: camelCase and separators split words", hit("birth", { attributes: ["dateOfBirth"] }) && hit("of", { attributes: ["dateOfBirth"] }) && hit("mdl", { title: "mDL" }) && hit("invoice", { title: "eInvoice" }));
      check("search contract: longer terms keep substring matching", hit("nvoice", { title: "eInvoice" }) && hit("verification", { description: "Proof of age verification." }));
      check("search contract: technical paths match as a substring", hit("birth_date", { attributes: ["place_of_birth_date"] }) && hit("date_of_birth", { attributes: ["date_of_birth"] }) && hit("eu.europa.ec.eudi", { identifier: "eu.europa.ec.eudi.ehic.1" }) && !hit("birth_date", { attributes: ["date_of_birth"] }));
      check("search contract: every word in the same record, any field", hit("age health", { title: "Age", description: "health" }) && !hit("age health", { title: "Age" }));
      check("search contract: case and whitespace do not matter", hit("  EHIC  ", { title: "ehic" }) && api.pilotSearchTerms("  Age   Verification ").map((t) => t.text).join() === "age,verification");
      check("search contract: punctuation-only input is no query", api.pilotSearchTerms(" -- , ").length === 0);
      check("search contract: relevance tiers 0 exact title, 1 title words or prefix, 2 exact tag/identifier/authority, 3 other title, 4 the rest",
        tier("ehic", { title: "EHIC" }) === 0
        && tier("pid", { title: "PID (WE BUILD SD-JWT VC)" }) === 1
        && tier("age veri", { title: "Age Verification" }) === 1
        && tier("pid", { title: "Citizen ID", tags: ["PID"] }) === 2
        && tier("ehic", { title: "Card", identifier: "urn:eudi:ehic:1" }) === 2
        && tier("india", { title: "Aadhaar", authority: "Unique Identification Authority of India" }) === 2
        && tier("veri", { title: "Verifier Pass" }) === 1
        && tier("ification", { title: "Age Verification" }) === 3
        && tier("ehic", { title: "Card", description: "An EHIC card" }) === 4);

      // Source fixtures: expectations from the catalog data itself, no fixed totals.
      const sourceIndex = (c) => api.pilotSearchIndex({ title: c.displayName, identifier: c.nativeIdentifier, authority: c.authority && c.authority.name, tags: c.tags, taxonomy: [].concat(c.sectors || [], c.ecosystems || [], c.themes || []), description: c.shortDescription || c.schemaDescription, attributes: (c.attributes || []).map((a) => a && a.name) });
      const rank = (q) => {
        const terms = api.pilotSearchTerms(q);
        return SOURCE_LIST.filter((c) => api.pilotSearchMatches(sourceIndex(c), terms))
          .map((c) => ({ id: c.id, name: c.displayName, tier: api.pilotSearchTier(sourceIndex(c), q, terms) }))
          .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
      };
      const withVehicle = SOURCE_LIST.filter((c) => /vehicle/i.test(JSON.stringify(c)) && !/\behic\b/i.test(JSON.stringify(c))).map((c) => c.id);
      const ehic = rank("ehic");
      check("source: EHIC first for ehic", ehic.length > 0 && ehic[0].id === "cred:eu:ehic", ehic.map((r) => r.id).join(","));
      check("source: records with only 'vehicle' do not match ehic", withVehicle.length > 0 && withVehicle.every((id) => !ehic.some((r) => r.id === id)), withVehicle.join(","));
      const withLpid = SOURCE_LIST.filter((c) => /lpid/i.test(JSON.stringify(c)) && !/(^|[^a-z])pid([^a-z]|$)/i.test(JSON.stringify(c).replace(/lpid/gi, ""))).map((c) => c.id);
      const pid = rank("pid");
      check("source: PID first for pid", pid.length > 0 && pid[0].id === "cred:eu:pid" && pid[0].tier === 0, pid.slice(0, 3).map((r) => r.id).join(","));
      check("source: eInvoice does not match pid through LPID", withLpid.length > 0 && withLpid.every((id) => !pid.some((r) => r.id === id)), withLpid.join(","));
      const withBirthDate = SOURCE_LIST.filter((c) => (c.attributes || []).some((a) => a && /birth_date/i.test(a.name || ""))).map((c) => c.id);
      const birth = rank("birth_date").map((r) => r.id);
      check("source: birth_date finds every record with that attribute", withBirthDate.length > 0 && withBirthDate.every((id) => birth.includes(id)), `${withBirthDate.length}/${birth.length}`);
      const av = rank("age verification");
      check("source: two words put the exact title first", av[0] && av[0].id === "cred:eu:age-verification", av.map((r) => r.id).join(","));
      const exactNames = SOURCE_LIST.filter((c) => c.displayName && SOURCE_LIST.filter((o) => (o.displayName || "").toLowerCase() === c.displayName.toLowerCase()).length === 1).slice(0, 40);
      const misses = exactNames.filter((c) => { const r = rank(c.displayName); return !r[0] || r[0].id !== c.id; }).map((c) => c.displayName);
      check("source: an exact name is first for its own title", misses.length === 0, misses.slice(0, 5).join(" | "));
    }
  }

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const errors = [];

  if (process.env.CREDENTIAL_ONLY === "filters") {
    await credentialFilterAlign(browser, errors);
    check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
    await browser.close();
    const failed = results.filter((r) => !r.ok).length;
    console.log(`# pass ${results.length - failed}\n# fail ${failed}`);
    process.exit(failed ? 1 : 0);
  }

  // ---------- Overview, desktop ----------
  {
    const context = await newContext(browser, 1440);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`overview: ${e.message}`));
    await open(page, OVERVIEW);
    await overviewReady(page);
    const total = await count(page);
    check("overview: all credential types listed", total >= 100, String(total));
    check("overview: H1 Credential Types", (await page.textContent("h1")).trim() === "Credential Types");
    const firstHref = await page.getAttribute(".fides-ds-card__link", "href");
    check("overview: rows link to the pilot detail with ?credential=", /\/fides-design-pilot\/credential\/\?credential=cred%3A|\/fides-design-pilot\/credential\/\?credential=cred:/.test(firstHref || ""), firstHref);
    check("overview: rows are compact list rows", (await page.locator(".fides-ds-card--row").count()) > 0);
    check("overview: no horizontal overflow at 1440", (await overflow(page)) <= 0);

    // Search only applies on Enter / Search.
    await page.fill("#fides-search-input", "personal_administrative_number");
    await page.waitForTimeout(500);
    check("search: typing alone does not filter", (await count(page)) === total);
    await page.press("#fides-search-input", "Enter");
    await page.waitForTimeout(400);
    const attrHits = await count(page);
    check("search: Enter filters on attribute names", attrHits > 0 && attrHits < total, String(attrHits));
    check("search: query in the URL", new URL(page.url()).searchParams.get("q") === "personal_administrative_number");
    const ids = await page.$$eval(".fides-ds-card[data-credential-id]", (cards) => cards.map((c) => c.getAttribute("data-credential-id")));
    check("search: attribute search finds EHIC", ids.includes("cred:eu:ehic"), ids.join(","));
    await page.fill("#fides-search-input", "zzzz-no-such-credential");
    await page.click(".fides-uc-pilot__search-submit");
    await page.waitForTimeout(400);
    check("search: Search button submits", (await count(page)) === 0);
    check("zero results: clear action offered", (await page.locator("[data-pilot-clear-filters], [data-pilot-clear-search]").count()) > 0);
    await page.fill("#fides-search-input", "");
    await page.press("#fides-search-input", "Enter");
    await page.waitForTimeout(400);
    check("search: clearing restores all results", (await count(page)) === total);

    // Relevance: default with a query, visible in the select; ranking from the source.
    const ids5 = () => page.$$eval(".fides-ds-card[data-credential-id]", (cards) => cards.map((c) => c.getAttribute("data-credential-id")));
    const sortState = () => page.evaluate(() => {
      const sel = document.querySelector("#fides-sort-select");
      return { value: sel.value, label: sel.options[sel.selectedIndex].textContent, options: [...sel.options].map((o) => o.value).join(","), url: new URL(location.href).searchParams.get("sort") };
    });
    const submit = async (q, how) => {
      await page.fill("#fides-search-input", q);
      if (how === "button") await page.click(".fides-uc-pilot__search-submit");
      else await page.press("#fides-search-input", "Enter");
      await page.waitForTimeout(400);
    };
    let sortNow = await sortState();
    check("relevance: not offered without a query; Likes is the default", sortNow.value === "rating" && !sortNow.options.includes("relevance") && sortNow.url === null, JSON.stringify(sortNow));
    await submit("ehic");
    sortNow = await sortState();
    let hits = await ids5();
    check("relevance: a query selects Relevance visibly, without ?sort=", sortNow.value === "relevance" && sortNow.label === "Relevance" && sortNow.options.startsWith("relevance,") && sortNow.url === null, JSON.stringify(sortNow));
    check("relevance: EHIC first for ehic; vehicle records not matched", hits[0] === "cred:eu:ehic" && !hits.includes("cred:iso:mvrc") && !hits.includes("cred:uncefact:packing-list"), hits.join(","));
    await submit("  EHIC ", "button");
    check("relevance: case and whitespace give the same result", JSON.stringify(await ids5()) === JSON.stringify(hits) && new URL(page.url()).searchParams.get("q") === "EHIC", page.url());
    await submit("pid");
    hits = await ids5();
    check("relevance: PID first for pid; eInvoice not matched through LPID", hits[0] === "cred:eu:pid" && !hits.includes("cred:fides:einvoicing") && !hits.includes("cred:webuild:einvoice"), hits.join(","));
    await submit("birth_date");
    hits = await ids5();
    const birthIds = SOURCE_LIST.filter((c) => (c.attributes || []).some((a) => a && /birth_date/i.test(a.name || ""))).map((c) => c.id);
    check("search: technical attribute path finds every record with it", birthIds.length > 0 && (await count(page)) >= birthIds.length && birthIds.filter((id) => hits.includes(id)).length === Math.min(birthIds.length, hits.length), `${birthIds.length} in source, ${await count(page)} shown`);
    await submit("age verification");
    hits = await ids5();
    check("search: two words, exact title first", hits[0] === "cred:eu:age-verification" && (await count(page)) >= 1, hits.slice(0, 3).join(","));

    // A facet with the query; an explicit sort survives a new query and Clear.
    await submit("pid");
    const pidCount = await count(page);
    await page.click("[data-pilot-key='vcFormat'] summary, [data-pilot-key='vcFormat'] button");
    await page.waitForTimeout(200);
    await page.check("[data-pilot-key='vcFormat'] input[value='sd_jwt_vc']");
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape");
    const facetCount = await count(page);
    const metas = await page.$$eval(".fides-ds-card", (cards) => cards.map((c) => c.textContent));
    check("search + facet: both in the URL, results narrow to SD-JWT VC", new URL(page.url()).searchParams.get("q") === "pid" && new URL(page.url()).searchParams.get("format") === "sd_jwt_vc" && facetCount >= 1 && facetCount <= pidCount && metas.every((t) => /SD-JWT VC/.test(t)), `${facetCount}/${pidCount} ${page.url()}`);
    check("search + facet: sort stays Relevance", (await sortState()).value === "relevance");
    await page.selectOption("#fides-sort-select", "name");
    await page.waitForTimeout(400);
    sortNow = await sortState();
    check("explicit sort: A–Z with a query writes sort=name", sortNow.value === "name" && sortNow.url === "name", JSON.stringify(sortNow));
    await submit("eu");
    sortNow = await sortState();
    const azNames = await page.$$eval(".fides-ds-card__title", (els) => els.slice(0, 8).map((e) => e.textContent.trim()));
    check("explicit sort: a new query keeps A–Z", sortNow.value === "name" && sortNow.url === "name" && azNames.join("|") === [...azNames].sort((a, b) => a.localeCompare(b)).join("|"), `${JSON.stringify(sortNow)} ${azNames.join(" | ")}`);
    await page.click("#fides-search-clear");
    await page.waitForTimeout(400);
    sortNow = await sortState();
    check("Clear: query gone, facet and explicit sort kept", new URL(page.url()).searchParams.get("q") === null && new URL(page.url()).searchParams.get("format") === "sd_jwt_vc" && sortNow.value === "name" && !sortNow.options.includes("relevance"), `${page.url()} ${JSON.stringify(sortNow)}`);
    check("Clear: focus back in the search field", await page.evaluate(() => document.activeElement && document.activeElement.id === "fides-search-input"));
    await open(page, OVERVIEW);
    await overviewReady(page);

    // Pagination with a query, Clear back to the default sort, detail and Back.
    await submit("eu");
    const euCount = await count(page);
    sortNow = await sortState();
    check("relevance: default again for a fresh query", sortNow.value === "relevance" && sortNow.url === null, JSON.stringify(sortNow));
    const firstPage = await ids5();
    const page2 = page.locator("[data-pilot-pagination-slot] a[data-catalog-page='2']").first();
    if (euCount > 30 && (await page2.count())) {
      await page2.click();
      await page.waitForTimeout(400);
      const secondPage = await ids5();
      check("pager with a query: page 2 keeps q and Relevance", new URL(page.url()).searchParams.get("catalog_page") === "2" && new URL(page.url()).searchParams.get("q") === "eu" && (await sortState()).value === "relevance" && secondPage.every((id) => !firstPage.includes(id)), page.url());
      await submit("eu");
      check("search: a new search returns to page 1", new URL(page.url()).searchParams.get("catalog_page") === null, page.url());
    } else {
      check("pager with a query: more than one page for eu", false, String(euCount));
    }
    await submit("ehic");
    const ehicUrl = page.url();
    await page.locator(".fides-ds-card[data-credential-id='cred:eu:ehic'] .fides-ds-card__link").focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector(".fides-credential-detail", { timeout: 30000 });
    const backFromQuery = await page.getAttribute("[data-fides-ds-back]", "href");
    check("detail from a query: back link keeps q", (backFromQuery || "").includes("q=ehic"), backFromQuery);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await overviewReady(page).catch(() => {});
    await page.waitForTimeout(600);
    check("Back from detail: query, Relevance and first row restored", page.url() === ehicUrl && (await page.inputValue("#fides-search-input")) === "ehic" && (await sortState()).value === "relevance" && (await ids5())[0] === "cred:eu:ehic", page.url());
    check("Back from detail: focus on the opened row", await page.evaluate(() => !!(document.activeElement && document.activeElement.closest && document.activeElement.closest("[data-credential-id='cred:eu:ehic']"))));
    await page.click("#fides-search-clear");
    await page.waitForTimeout(400);
    sortNow = await sortState();
    check("Clear: back to Likes without a query", sortNow.value === "rating" && sortNow.url === null && (await count(page)) === total, JSON.stringify(sortNow));

    // More filters (Paper 20.45): lists, Listing with TS11 + Explain, closed Technical filters row.
    check("More filters: Listing flags are not visible while More filters is closed", !(await page.isVisible("[data-pilot-flag='ts11CompliantOnly']")) && (await page.locator("[data-pilot-quick]").count()) === 1);
    await page.click("[data-pilot-more-toggle]");
    await page.waitForTimeout(200);
    const morePanel = await page.evaluate(() => {
      const more = document.querySelector("#fides-credential-pilot-more");
      const rect = (el) => el && el.getBoundingClientRect();
      const tech = more.querySelector("[data-pilot-tech-toggle]");
      const grid = more.querySelector("[data-pilot-more-grid]");
      const lists = [...grid.querySelectorAll(":scope > [data-pilot-key]")];
      const listing = more.querySelector("[data-pilot-quick]");
      const title = more.querySelector(".fides-uc-pilot__more-title");
      const close = more.querySelector("[data-pilot-more-close]");
      const style = getComputedStyle(more);
      return {
        lists: lists.map((el) => el.dataset.pilotKey),
        listsOneLine: new Set(lists.map((el) => Math.round(rect(el).top))).size === 1,
        listWidths: lists.map((el) => Math.round(rect(el).width)),
        listingBelow: rect(listing).top >= Math.max(...lists.map((el) => rect(el).bottom)),
        listingInside: more.contains(listing),
        explainInside: !!listing.querySelector(".fides-credential-explain"),
        intro: !!more.querySelector(".fides-ds-meta"),
        techLabel: tech && tech.textContent.replace(/\s+/g, " ").trim(),
        techExpanded: tech && tech.getAttribute("aria-expanded"),
        techControls: tech && tech.getAttribute("aria-controls"),
        techHeight: tech && Math.round(rect(tech).height),
        techChevronRight: tech && Math.round(rect(tech).right - rect(tech.querySelector(".fides-uc-pilot__technical-icon")).right),
        techGridHidden: document.getElementById("fides-credential-pilot-technical").hidden,
        title: [getComputedStyle(title).fontSize, getComputedStyle(title).lineHeight, getComputedStyle(title).fontWeight].join("/"),
        close: close && Math.round(rect(close).width),
        border: style.borderTopWidth,
        background: style.backgroundColor,
      };
    });
    check("More filters: Sector and Theme side by side", morePanel.lists.join(",") === "sector,theme" && morePanel.listsOneLine && morePanel.listWidths.every((w) => w <= 300), JSON.stringify(morePanel));
    check("More filters: Listing with TS11 Explain below the lists, inside the panel", morePanel.listingBelow && morePanel.listingInside && morePanel.explainInside);
    check("More filters: no intro text, title 20/26 semibold, close at least 44px", !morePanel.intro && morePanel.title === "20px/26px/600" && morePanel.close >= 44, `${morePanel.title} ${morePanel.close}`);
    check("More filters: white panel with a 2px top line", morePanel.border === "2px" && morePanel.background === "rgb(255, 255, 255)", `${morePanel.border} ${morePanel.background}`);
    check("Technical filters: closed row with the Schema type summary", morePanel.techExpanded === "false" && morePanel.techGridHidden && /Technical filters/.test(morePanel.techLabel) && /Schema type/.test(morePanel.techLabel) && morePanel.techControls === "fides-credential-pilot-technical", morePanel.techLabel);
    check("Technical filters: row at least 56px, chevron at the far end", morePanel.techHeight >= 56 && morePanel.techChevronRight <= 2, `${morePanel.techHeight}px, ${morePanel.techChevronRight}`);
    await page.locator("[data-pilot-tech-toggle]").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
    check("Technical filters: Enter opens the Schema type list", (await page.getAttribute("[data-pilot-tech-toggle]", "aria-expanded")) === "true" && (await page.isVisible("#fides-credential-pilot-technical [data-pilot-key='schemaType']")));
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
    check("Technical filters: Enter closes it again and keeps focus", (await page.getAttribute("[data-pilot-tech-toggle]", "aria-expanded")) === "false" && (await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-pilot-tech-toggle"))));

    // TS11 metadata flag.
    const ts11Label = page.locator("label:has([data-pilot-flag='ts11CompliantOnly'])");
    check("TS11 flag: labelled 'TS11 metadata'", ((await ts11Label.textContent()) || "").includes("TS11 metadata"));
    await page.check("[data-pilot-flag='ts11CompliantOnly']");
    await page.waitForTimeout(400);
    const ts11Count = await count(page);
    check("TS11 flag: filters to 19 records", ts11Count === 19, String(ts11Count));
    check("TS11 flag: ts11=1 in the URL", new URL(page.url()).searchParams.get("ts11") === "1");
    check("TS11 flag: rows show the TS11 metadata status", (await page.locator(".fides-ds-card .fides-ds-card__status", { hasText: "TS11 metadata" }).count()) > 0);

    // Explain dialog: scroll lock, Escape, focus return.
    const explain = page.locator(".fides-credential-pilot__quick .fides-credential-explain");
    await explain.click();
    await page.waitForSelector("dialog.fides-ds-dialog[open]", { timeout: 5000 });
    const dialogText = await page.evaluate(() => (document.querySelector("dialog.fides-ds-dialog[open]") || {}).textContent || "");
    check("Explain: dialog explains the marker and the API check", /TS11/.test(dialogText) && /semantic version/i.test(dialogText) && /trusted authorit/i.test(dialogText), dialogText.slice(0, 120));
    check("Explain: background scroll locked", await page.evaluate(() => document.documentElement.classList.contains("fides-ds-scroll-locked")));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    check("Explain: Escape closes and unlocks", !(await page.evaluate(() => document.documentElement.classList.contains("fides-ds-scroll-locked"))));
    check("Explain: focus returns to the button", await page.evaluate(() => document.activeElement && document.activeElement.classList.contains("fides-credential-explain")));
    check("Explain: More filters stays open after the dialog", await page.isVisible("#fides-credential-pilot-more"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    check("More filters: Escape closes the panel and returns focus to More filters", !(await page.isVisible("#fides-credential-pilot-more")) && (await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-pilot-more-toggle"))));
    const closedState = await page.evaluate(() => ({
      pill: [...document.querySelectorAll("[data-pilot-remove-group='ts11CompliantOnly']")].map((b) => ({ text: b.textContent.replace(/\s+/g, " ").trim(), height: Math.round(b.getBoundingClientRect().height) })),
      badge: (document.querySelector("[data-pilot-more-badge]") || {}).textContent,
      expanded: document.querySelector("[data-pilot-more-toggle]").getAttribute("aria-expanded"),
    }));
    check("More filters closed: TS11 metadata stays visible as a removable pill", closedState.pill.length === 1 && /TS11 metadata/.test(closedState.pill[0].text) && /remove filter/.test(closedState.pill[0].text), JSON.stringify(closedState));
    check("More filters closed: the button counts the hidden selection", closedState.badge === "1" && closedState.expanded === "false", JSON.stringify(closedState));

    const terms = page.locator(".fides-credential-pilot__terms .fides-credential-explain");
    check("overview: EUDI terminology line links to Credentials & attestations", (await terms.count()) === 1 && /Credentials & attestations explained/.test(await terms.textContent()));
    await terms.click();
    await page.waitForSelector("dialog.fides-ds-dialog[open]", { timeout: 5000 });
    const termsText = await page.evaluate(() => (document.querySelector("dialog.fides-ds-dialog[open]") || {}).textContent || "");
    check("overview: Credentials & attestations dialog", /Credential is the broad term used in this catalog/.test(termsText) && /does not mean “non-qualified”/.test(termsText), termsText.slice(0, 120));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Format popover filter, URL state and reload.
    await page.click("[data-pilot-key='vcFormat'] summary, [data-pilot-key='vcFormat'] button");
    await page.waitForTimeout(200);
    const mdocBox = page.locator("[data-pilot-key='vcFormat'] input[value='sd_jwt_vc']");
    if (await mdocBox.count()) {
      const box = await page.locator("[data-pilot-key='vcFormat'] [class*='panel'], [data-pilot-key='vcFormat'] .fides-ds-popover__panel").first().boundingBox();
      check("format popover: inside the viewport", !box || (box.x >= 0 && box.x + box.width <= 1440));
      await mdocBox.check();
      await page.waitForTimeout(400);
      check("format filter: format=sd_jwt_vc with ts11=1 in the URL", new URL(page.url()).searchParams.get("format") === "sd_jwt_vc" && new URL(page.url()).searchParams.get("ts11") === "1", page.url());
      await page.keyboard.press("Escape");
    } else {
      check("format popover: SD-JWT VC option present", false);
    }
    const filteredCount = await count(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await overviewReady(page).catch(() => {});
    await page.waitForTimeout(400);
    check("reload: filters and count kept", (await count(page)) === filteredCount && (await page.isChecked("[data-pilot-flag='ts11CompliantOnly']")), `${filteredCount}`);

    // Back from a detail page keeps the filters and focuses the row.
    const firstRow = page.locator(".fides-ds-card__link").first();
    const rowId = await page.locator(".fides-ds-card[data-credential-id]").first().getAttribute("data-credential-id");
    const filteredUrl = page.url();
    await firstRow.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/fides-design-pilot\/credential\//, { timeout: 30000 });
    await page.waitForSelector(".fides-credential-detail", { timeout: 30000 });
    const backHref = await page.getAttribute("[data-fides-ds-back]", "href");
    check("detail: back link returns to the filtered overview", (backHref || "").includes("ts11=1"), backHref);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await overviewReady(page).catch(() => {});
    await page.waitForTimeout(600);
    check("Back: URL with filters restored", page.url() === filteredUrl, page.url());
    check("Back: focus on the row that was opened", await page.evaluate((id) => {
      const el = document.activeElement;
      return !!(el && el.closest && el.closest(`[data-credential-id="${id}"]`));
    }, rowId));

    // Sort, list only (no list/grid switch, also with a stored grid preference), pager.
    await page.evaluate(() => localStorage.setItem("fides-credential-pilot-view", "grid"));
    await open(page, OVERVIEW);
    await overviewReady(page);
    check("view: no list/grid switch", (await page.locator("[data-pilot-view-mode], .fides-credential-pilot__view").count()) === 0);
    check("view: rows only, no tiles (old grid preference ignored)", (await page.locator(".fides-ds-card--tile, .fides-ds-cards--tiles").count()) === 0 && (await page.locator(".fides-ds-card--row").count()) > 0);
    await page.selectOption(".fides-uc-pilot__sort-select", "name");
    await page.waitForTimeout(300);
    check("sort: sort=name in the URL", new URL(page.url()).searchParams.get("sort") === "name");
    const names = await page.$$eval(".fides-ds-card__title", (els) => els.slice(0, 5).map((e) => e.textContent.trim().toLowerCase()));
    check("sort: names ascending", names.join("|") === [...names].sort((a, b) => a.localeCompare(b)).join("|"), names.join(" | "));
    const barRight = await page.evaluate(() => {
      const bar = document.querySelector(".fides-uc-pilot__results-bar").getBoundingClientRect();
      const sort = document.querySelector(".fides-uc-pilot__sort").getBoundingClientRect();
      return Math.round(bar.right - sort.right);
    });
    check("results bar: sort sits at the right edge", barRight >= 0 && barRight <= 2, `${barRight}px`);
    const next = page.locator(".fides-catalog-pagination a, [data-pilot-pagination-slot] a").filter({ hasText: "2" }).first();
    if (await next.count()) {
      const before = await page.$$eval(".fides-ds-card[data-credential-id]", (cards) => cards.map((c) => c.getAttribute("data-credential-id")).join(","));
      await next.click();
      await page.waitForTimeout(400);
      const after = await page.$$eval(".fides-ds-card[data-credential-id]", (cards) => cards.map((c) => c.getAttribute("data-credential-id")).join(","));
      check("pager: page 2 shows other rows and keeps sort", before !== after && new URL(page.url()).searchParams.get("catalog_page") === "2" && new URL(page.url()).searchParams.get("sort") === "name", page.url());
    } else {
      check("pager: page 2 link present", false);
    }
    await page.screenshot({ path: path.join(OUT, "overview-1440.png") });

    // Old deeplinks.
    await open(page, `${OVERVIEW}?credential=cred:eu:ehic-mdoc:mdoc`);
    await page.waitForURL(/\/fides-design-pilot\/credential\//, { timeout: 30000 }).catch(() => {});
    await page.waitForSelector(".fides-credential-detail", { timeout: 30000 }).catch(() => {});
    check("old deeplink: ?credential= on the overview opens the detail", (await page.getAttribute(".fides-credential-detail", "data-credential-id").catch(() => "")) === "cred:eu:ehic", page.url());
    await open(page, `${OVERVIEW}?credentials=cred:eu:ehic-mdoc:mdoc,cred:webuild:eucc`);
    await overviewReady(page);
    check("linked list: ?credentials= with aliases shows both types", (await count(page)) === 2);
    await context.close();
  }

  // ---------- Overview bar: Subject and Format beside search; Ecosystem and Authority in More filters ----------
  const LONG_AUTHORITY = "Unique Identification Authority of India";
  for (const width of [1440, 1320, 1280, 1200, 1100, 1024, 768, 390, 320]) {
    const context = await newContext(browser, width);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`overview layout ${width}: ${e.message}`));
    await open(page, OVERVIEW);
    await overviewReady(page);
    const tag = `overview bar ${width}`;
    const measure = () => page.evaluate(() => {
      const root = document.querySelector("#fides-credential-catalog-root");
      const box = (el) => { if (!el || el.offsetParent === null) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) }; };
      const q = (s) => root.querySelector(s);
      const controls = [...root.querySelectorAll(".fides-uc-pilot__filter-row > *")]
        .map((el) => ({ key: el.dataset.pilotKey || "more", label: (el.querySelector(".fides-ds-popover__label, span") || el).textContent.trim(), box: box(el), target: box(el.querySelector(".fides-ds-popover__toggle") || el) }));
      const eco = root.querySelectorAll("[data-pilot-key='ecosystem']");
      return {
        layout: root.dataset.pilotLayout,
        ecoCount: eco.length,
        ecoIn: eco[0] ? (eco[0].closest("#fides-credential-pilot-more") ? "more" : "row") : null,
        label: box(q(".fides-uc-pilot__search-label")),
        ask: box(q(".fides-uc-pilot__ask")),
        search: box(q(".fides-uc-pilot__search")),
        input: box(q(".fides-uc-pilot__search-input")),
        submit: box(q(".fides-uc-pilot__search-submit")),
        toggle: box(q("[data-pilot-open]")),
        listingVisible: !!box(q("[data-pilot-quick]")),
        controls,
      };
    });
    const m = await measure();
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    check(`${tag}: layout is full on a wide desktop and compact on a phone`, (width >= 1100 ? m.layout === "full" : width < 600 ? m.layout === "compact" : m.layout === "full" || m.layout === "compact"), m.layout);
    check(`${tag}: exactly one Ecosystem control, in More filters`, m.ecoCount === 1 && m.ecoIn === "more", `${m.ecoCount} in ${m.ecoIn}`);
    check(`${tag}: no Listing row outside More filters`, !m.listingVisible);
    check(`${tag}: input and Search stay one pair`, m.input && m.submit && Math.abs(m.input.top - m.submit.top) <= 6 && m.submit.left > m.input.left, JSON.stringify([m.input, m.submit]));
    if (m.ask) check(`${tag}: Ask FIDES beside the search label`, Math.abs(m.ask.top + m.ask.height / 2 - (m.label.top + m.label.height / 2)) <= 4 && m.ask.left > m.label.right, JSON.stringify([m.label, m.ask]));
    const minTarget = width >= 1100 ? 40 : 44;
    if (m.layout !== "compact") {
      const visible = m.controls.filter((c) => c.box);
      const keys = visible.map((c) => c.key).join(",");
      check(`${tag}: Subject, Format and More filters`, keys === "subjectType,vcFormat,more", keys);
      check(`${tag}: search, Search and filters on one line`, visible.every((c) => Math.abs(c.box.top + c.box.height / 2 - (m.submit.top + m.submit.height / 2)) <= 3), JSON.stringify(visible.map((c) => c.box.top)));
      check(`${tag}: search input at least 280px`, m.search.width >= 280, String(m.search.width));
      if (width >= 1440) check(`${tag}: search takes the room the two lists leave`, m.search.width >= 280, String(m.search.width));
      check(`${tag}: no Filters dialog button`, !m.toggle);
      check(`${tag}: controls ${minTarget}px or more`, visible.every((c) => c.target.height >= minTarget) && m.submit.height >= minTarget && m.input.height >= minTarget, visible.map((c) => c.target.height).concat(m.submit.height).join("/"));
      if (width >= 1100) check(`${tag}: controls 40px with a fine pointer`, visible.every((c) => c.target.height === 40) && m.submit.height === 40, visible.map((c) => c.target.height).join("/"));
      if ([1440, 1200, 1100].includes(width)) {
        await page.click("[data-pilot-more-toggle]");
        await page.waitForTimeout(200);
        await page.click("#fides-credential-pilot-more [data-pilot-key='authority'] .fides-ds-popover__toggle");
        await page.waitForTimeout(200);
        const option = page.locator(`[data-pilot-key='authority'] input[value='${LONG_AUTHORITY}']`);
        if (await option.count()) {
          await option.check();
          await page.waitForTimeout(400);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);
          const chosen = await page.evaluate(() => {
            const el = document.querySelector("[data-pilot-key='authority'] .fides-ds-popover__toggle");
            const label = el.querySelector(".fides-ds-popover__label").getBoundingClientRect();
            const value = el.querySelector(".fides-ds-popover__value").getBoundingClientRect();
            return {
              sameRow: value.top < label.bottom - 1 && label.top < value.bottom - 1,
              name: el.textContent.replace(/\s+/g, " ").trim(),
              title: el.title || "",
            };
          });
          check(`${tag}: long authority stays on one line and the button names it`, chosen.sameRow && chosen.name.includes(LONG_AUTHORITY) && chosen.title.includes(LONG_AUTHORITY), JSON.stringify(chosen));
          check(`${tag}: long selection keeps the desktop bar`, (await page.getAttribute("#fides-credential-catalog-root", "data-pilot-layout")) !== "compact" && (await overflow(page)) <= 0);
        } else {
          check(`${tag}: long authority option present`, false);
        }
      }
    } else {
      check(`${tag}: one Filters button instead of the filter row`, !!m.toggle && m.controls.every((c) => !c.box) && m.toggle.height >= 44, JSON.stringify(m.toggle));
      check(`${tag}: search controls at least 44px`, m.input.height >= 44 && m.submit.height >= 44, `${m.input.height}/${m.submit.height}`);
    }
    if ([1440, 1280, 1100, 768, 390].includes(width)) await page.screenshot({ path: path.join(OUT, `overview-bar-${width}.png`) });
    await context.close();
  }

  // ---------- Ecosystem keeps one value across resizes (full and compact; it stays in More filters) ----------
  {
    const context = await newContext(browser, 1280);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`ecosystem resize: ${e.message}`));
    await open(page, OVERVIEW);
    await overviewReady(page);
    const where = () => page.evaluate(() => {
      const root = document.querySelector("#fides-credential-catalog-root");
      const eco = root.querySelectorAll("[data-pilot-key='ecosystem']");
      return {
        layout: root.dataset.pilotLayout,
        count: eco.length,
        inMore: !!(eco[0] && eco[0].closest("#fides-credential-pilot-more")),
        checked: [...root.querySelectorAll("[data-pilot-key='ecosystem'] input:checked")].map((i) => i.value),
        pills: [...root.querySelectorAll("[data-pilot-remove-group='ecosystem']")].length,
        badge: (root.querySelector("[data-pilot-more-badge]") || {}).textContent,
      };
    });
    await page.click("[data-pilot-more-toggle]");
    await page.waitForTimeout(200);
    let s = await where();
    check("ecosystem 1280: first list in More filters", s.layout === "full" && s.inMore && (await page.evaluate(() => document.querySelector("[data-pilot-more-grid] > *").dataset.pilotKey)) === "ecosystem", JSON.stringify(s));
    await page.click("#fides-credential-pilot-more [data-pilot-key='ecosystem'] .fides-ds-popover__toggle");
    await page.waitForTimeout(200);
    const ecoOption = page.locator("[data-pilot-key='ecosystem'] input[type='checkbox']").first();
    const ecoValue = await ecoOption.getAttribute("value");
    await ecoOption.check();
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const urlReduced = page.url();
    s = await where();
    check("ecosystem 1280: selection in the URL, pill and More count", new URL(urlReduced).searchParams.get("ecosystem") === ecoValue && s.pills === 1 && s.badge === "1", JSON.stringify(s));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    s = await where();
    check("ecosystem 1440: stays in More filters, same value, no reset", s.layout === "full" && s.inMore && s.count === 1 && s.checked.join() === ecoValue && page.url() === urlReduced && s.badge === "1", JSON.stringify(s));
    await page.setViewportSize({ width: 768, height: 900 });
    await page.waitForTimeout(500);
    s = await where();
    check("ecosystem 768: the value and the pill stay", s.count === 1 && s.checked.join() === ecoValue && s.pills === 1 && page.url() === urlReduced, JSON.stringify(s));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(500);
    s = await where();
    check("ecosystem 1280 again: one control in More filters, value kept", s.layout === "full" && s.inMore && s.count === 1 && s.checked.join() === ecoValue && (await overflow(page)) <= 0, JSON.stringify(s));
    await context.close();
  }

  // ---------- Overview, tablet and mobile ----------
  for (const width of [768, 390, 320]) {
    const context = await newContext(browser, width);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`overview ${width}: ${e.message}`));
    await open(page, OVERVIEW);
    await overviewReady(page);
    check(`overview ${width}: no horizontal overflow`, (await overflow(page)) <= 0);
    check(`overview ${width}: list only (no view toggle)`, (await page.locator("[data-pilot-view-mode], .fides-credential-pilot__view, .fides-ds-card--tile").count()) === 0);
    const toggle = page.locator("[data-pilot-open]");
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(300);
      check(`filters ${width}: dialog locks background scroll`, await page.evaluate(() => document.documentElement.classList.contains("fides-ds-scroll-locked")));
      check(`filters ${width}: TS11 flag inside the dialog`, await page.isVisible("#fides-credential-pilot-filter-panel [data-pilot-flag='ts11CompliantOnly']"));
      const close = page.locator("#fides-credential-pilot-filter-panel .fides-uc-pilot__panel-close");
      const apply = page.locator("#fides-credential-pilot-filter-panel [data-pilot-apply]");
      check(`filters ${width}: close and apply reachable`, (await close.isVisible()) && (await apply.isVisible()));
      const dialog = await page.evaluate(() => {
        const panel = document.querySelector("#fides-credential-pilot-filter-panel");
        const vis = (el) => !!(el && el.offsetParent !== null);
        const order = [...panel.querySelectorAll("[data-pilot-key], [data-pilot-quick], [data-pilot-tech-toggle]")].filter(vis)
          .map((el) => el.dataset.pilotKey || (el.hasAttribute("data-pilot-quick") ? "listing" : "technical"));
        const lefts = [...panel.querySelectorAll(".fides-uc-pilot__filter-row > [data-pilot-key], [data-pilot-more-grid] > [data-pilot-key]")].filter(vis).map((el) => Math.round(el.getBoundingClientRect().left));
        const tech = panel.querySelector("[data-pilot-tech-toggle]");
        return {
          order: order.join(","),
          stacked: new Set(lefts).size === 1,
          moreTitle: vis(panel.querySelector(".fides-uc-pilot__more-title")),
          moreClose: vis(panel.querySelector("[data-pilot-more-close]")),
          moreToggle: vis(document.querySelector("[data-pilot-more-toggle]")),
          techHeight: tech ? Math.round(tech.getBoundingClientRect().height) : 0,
          wide: panel.scrollWidth - panel.clientWidth,
        };
      });
      check(`filters ${width}: primary lists, More filters lists, Listing, Technical filters in order`, dialog.order === "subjectType,vcFormat,ecosystem,authority,sector,theme,listing,technical", dialog.order);
      check(`filters ${width}: stacked controls without a nested More toggle or close`, dialog.stacked && dialog.moreTitle && !dialog.moreClose && !dialog.moreToggle && dialog.wide <= 0, JSON.stringify(dialog));
      check(`filters ${width}: Technical filters row at least 56px`, dialog.techHeight >= 56, String(dialog.techHeight));
      await page.click("#fides-credential-pilot-filter-panel [data-pilot-tech-toggle]");
      await page.waitForTimeout(150);
      check(`filters ${width}: Technical filters opens inside the dialog`, await page.isVisible("#fides-credential-pilot-filter-panel #fides-credential-pilot-technical [data-pilot-key='schemaType']"));
      const scroll = await page.evaluate(async () => {
        const panel = document.querySelector("#fides-credential-pilot-filter-panel");
        const before = window.scrollY;
        panel.scrollTop = panel.scrollHeight;
        await new Promise((r) => setTimeout(r, 100));
        return { panel: panel.scrollTop, page: window.scrollY - before, scrollable: panel.scrollHeight > panel.clientHeight };
      });
      check(`filters ${width}: only the dialog body scrolls`, scroll.page === 0 && (!scroll.scrollable || scroll.panel > 0), JSON.stringify(scroll));
      await page.click("#fides-credential-pilot-filter-panel [data-pilot-tech-toggle]");
      await page.waitForTimeout(150);
      await page.check("#fides-credential-pilot-filter-panel [data-pilot-flag='ts11CompliantOnly']");
      await page.waitForTimeout(200);
      check(`filters ${width}: change stays pending until Apply`, new URL(page.url()).searchParams.get("ts11") === null);
      const applyText = (await apply.textContent()) || "";
      check(`filters ${width}: Apply filters has no result count`, applyText.replace(/\s+/g, " ").trim() === "Apply filters", applyText);
      await page.click("#fides-credential-pilot-filter-panel [data-pilot-cancel] >> nth=0");
      await page.waitForTimeout(300);
      check(`filters ${width}: Cancel discards and unlocks`, new URL(page.url()).searchParams.get("ts11") === null
        && !(await page.evaluate(() => document.documentElement.classList.contains("fides-ds-scroll-locked"))));
      await toggle.click();
      await page.waitForTimeout(200);
      await page.check("#fides-credential-pilot-filter-panel [data-pilot-flag='ts11CompliantOnly']");
      await apply.click();
      await page.waitForTimeout(400);
      check(`filters ${width}: Apply commits to the URL`, new URL(page.url()).searchParams.get("ts11") === "1" && (await count(page)) === 19);
      check(`filters ${width}: focus back on Filters`, await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-pilot-open")));
    } else {
      check(`filters ${width}: Subject and Format stay in the bar`, (await page.isVisible("[data-pilot-key='subjectType']")) && (await page.isVisible("[data-pilot-key='vcFormat']")) && !(await page.locator(".fides-uc-pilot__filter-row [data-pilot-key='ecosystem']").isVisible()));
    }
    await page.waitForFunction(() => {
      const el = document.querySelector("[data-pilot-flag-count='usedByRPsOnly']");
      return el && el.textContent.trim() !== "";
    }, null, { timeout: 15000 }).catch(() => {});
    const rpCount = await page.textContent("[data-pilot-flag-count='usedByRPsOnly']").catch(() => "");
    check(`overview ${width}: relying-party count fills in once usage loads`, Number(rpCount) > 0, rpCount);
    await page.screenshot({ path: path.join(OUT, `overview-${width}.png`) });
    await context.close();
  }

  // ---------- Detail pages ----------
  for (const width of WIDTHS) {
    const context = await newContext(browser, width);
    for (const id of RECORDS) {
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(`${id} ${width}: ${e.message}`));
      await open(page, DETAIL + encodeURIComponent(id));
      await page.waitForSelector(".fides-credential-detail", { timeout: 30000 });
      await page.waitForTimeout(300);
      const tag = `${id.split(":").pop()} ${width}`;
      check(`${tag}: renders the record`, (await page.getAttribute(".fides-credential-detail", "data-credential-id")) === id);
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0, String(await overflow(page)));
      const formatLabels = await page.evaluate(() => {
        const labels = [...document.querySelectorAll(".fides-credential-detail__hero .fides-credential-format-label")];
        const hero = document.querySelector(".fides-credential-detail__hero").getBoundingClientRect();
        const facts = document.querySelector(".fides-credential-detail__facts");
        return {
          texts: labels.map((l) => l.textContent.trim()),
          styles: labels.map((l) => { const cs = getComputedStyle(l); return `${cs.fontSize}/${cs.lineHeight}/${cs.fontWeight} ${cs.color} ${cs.backgroundColor} ${cs.borderTopWidth} ${cs.borderTopColor} ${cs.paddingTop} ${cs.paddingLeft} ${cs.cursor}`; }),
          focusable: labels.filter((l) => l.tabIndex >= 0 || l.closest("a, button") || l.getAttribute("role")).length,
          inside: labels.every((l) => { const r = l.getBoundingClientRect(); return r.left >= hero.left - 1 && r.right <= hero.right + 1; }),
          subjectApart: !facts || !labels.some((l) => facts.contains(l)),
          facts: facts ? facts.textContent.trim() : "",
          formatsSection: !!document.querySelector("#formats[data-credential-formats]"),
        };
      });
      check(`${tag}: one static Formats label per format`, formatLabels.texts.length > 0 && new Set(formatLabels.texts).size === formatLabels.texts.length && formatLabels.focusable === 0 && formatLabels.formatsSection, JSON.stringify(formatLabels.texts));
      check(`${tag}: format labels 14/22/500, brand-strong on info surface, 1px divider border, default cursor`, formatLabels.styles.every((st) => st === "14px/22px/500 rgb(8, 72, 163) rgb(241, 246, 255) 1px rgb(143, 168, 198) 2px 8px default"), formatLabels.styles[0]);
      check(`${tag}: format labels wrap inside the hero; subject kept apart`, formatLabels.inside && formatLabels.subjectApart && (!formatLabels.facts || /^Subject · /.test(formatLabels.facts)), formatLabels.facts);
      if (id === "cred:eu:ehic") check(`${tag}: EHIC labels mDoc and SD-JWT VC`, formatLabels.texts.join() === "mDoc,SD-JWT VC", formatLabels.texts.join());
      if (width === 1440 && id === "cred:eu:ehic") {
        const label = page.locator(".fides-credential-format-label").first();
        const before = await label.evaluate((l) => getComputedStyle(l).backgroundColor + getComputedStyle(l).textDecorationLine);
        await label.hover();
        await page.waitForTimeout(200);
        check(`${tag}: format label has no hover state`, (await label.evaluate((l) => getComputedStyle(l).backgroundColor + getComputedStyle(l).textDecorationLine)) === before);
        await page.mouse.move(0, 0);
      }
      if (width <= 390) {
        const small = await smallTargets(page, ".fides-credential-detail .fides-ds-button, .fides-credential-detail .fides-credential-like__button, .fides-credential-detail .fides-credential-explain, .fides-credential-detail .fides-ds-collapsible__toggle, .fides-credential-detail [data-fides-ds-show-all-button], .fides-credential-detail .fides-ds-show-all__toggle, .fides-credential-detail .fides-credential-eco__row, .fides-credential-detail .fides-credential-formats__tab");
        check(`${tag}: interactive targets at least 44px`, small.length === 0, small.slice(0, 4).join(", "));
      }
      const ts11Collapsible = await page.evaluate(() => {
        const panel = document.querySelector(".fides-credential-ts11");
        const toggle = panel && panel.querySelector(".fides-ds-collapsible__toggle");
        return { toggle: !!toggle, expanded: toggle ? toggle.getAttribute("aria-expanded") : null };
      });
      const layout = await page.evaluate(() => {
        const main = document.querySelector(".fides-credential-detail__main");
        const aside = document.querySelector(".fides-credential-detail__aside");
        const where = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          return main.contains(el) ? "main" : aside.contains(el) ? "aside" : "other";
        };
        const top = (sel) => { const el = document.querySelector(sel); return el ? Math.round(el.getBoundingClientRect().top + scrollY) : null; };
        const acc = (sel) => {
          const el = document.querySelector(sel);
          const t = el && el.querySelector(":scope > h2 .fides-ds-collapsible__toggle");
          return t ? { expanded: t.getAttribute("aria-expanded"), height: Math.round(t.getBoundingClientRect().height) } : null;
        };
        const navLinks = [...document.querySelectorAll(".fides-uc-detail__sections nav a")].map((a) => a.textContent.trim());
        return {
          where: Object.fromEntries(["#overview", "#use-cases", "#attributes", "#details", "#formats", "#ts11", "#tags", "#sources"].map((s) => [s, where(s)])),
          tops: Object.fromEntries(["#overview", "#attributes", "#details", "#formats", "#ts11", "#tags", "#sources", ".fides-credential-eco", "#listing"].map((s) => [s, top(s)])),
          asideLeft: Math.round(aside.getBoundingClientRect().left),
          mainRight: Math.round(main.getBoundingClientRect().right),
          acc: { formats: acc("#formats"), ts11: acc("#ts11"), sources: acc("#sources"), details: acc("#details"), tags: acc("#tags") },
          formatsBody: !!document.querySelector("#formats-body") && document.querySelector("#formats-body").offsetParent !== null,
          sourcesBody: !!document.querySelector("#sources-body") && document.querySelector("#sources-body").offsetParent !== null,
          nav: navLinks,
          schemaInSources: [...document.querySelectorAll("#sources a")].some((a) => /schema|metadata/i.test(a.textContent) && !/API record/.test(a.textContent)),
        };
      });
      const inMain = ["#overview", "#attributes"].every((s) => layout.where[s] === "main") && (layout.where["#use-cases"] === null || layout.where["#use-cases"] === "main");
      const inAside = ["#details", "#formats", "#ts11", "#sources"].every((s) => layout.where[s] === "aside") && (layout.where["#tags"] === null || layout.where["#tags"] === "aside");
      check(`${tag}: Overview, Use cases and Attributes in the main column`, inMain, JSON.stringify(layout.where));
      check(`${tag}: details, formats, TS11, tags and sources in the context column`, inAside, JSON.stringify(layout.where));
      check(`${tag}: navigation lists Attributes and Formats & identifiers separately`, layout.nav.includes("Attributes") && layout.nav.includes("Formats & identifiers") && !layout.nav.some((l) => /Formats & attributes/.test(l)), layout.nav.join(" | "));
      check(`${tag}: no schema link repeated in Sources`, !layout.schemaInSources);
      if (width >= 1100) {
        check(`${tag}: context column sits right of the main column`, layout.asideLeft >= layout.mainRight, `${layout.mainRight} -> ${layout.asideLeft}`);
        check(`${tag}: context blocks open, no accordions`, !layout.acc.formats && !layout.acc.ts11 && !layout.acc.sources && layout.formatsBody && layout.sourcesBody, JSON.stringify(layout.acc));
        const t = layout.tops;
        check(`${tag}: context order details, formats, TS11, tags, sources`, t["#details"] < t["#formats"] && t["#formats"] < t["#ts11"] && (t["#tags"] === null || (t["#ts11"] < t["#tags"] && t["#tags"] < t["#sources"])) && t["#ts11"] < t["#sources"], JSON.stringify(t));
      } else {
        const t = layout.tops;
        check(`${tag}: one column in Paper order`, t["#overview"] < t["#attributes"] && t["#attributes"] < t["#details"] && t["#details"] < t["#formats"] && t["#formats"] < t["#ts11"] && t["#ts11"] < t["#sources"] && t["#sources"] < (t[".fides-credential-eco"] || t["#listing"]) && (t[".fides-credential-eco"] || 0) < t["#listing"], JSON.stringify(t));
        check(`${tag}: Formats accordion open`, layout.acc.formats && layout.acc.formats.expanded === "true" && layout.formatsBody, JSON.stringify(layout.acc.formats));
        check(`${tag}: TS11 and Sources accordions closed`, layout.acc.ts11 && layout.acc.ts11.expanded === "false" && layout.acc.sources && layout.acc.sources.expanded === "false" && !layout.sourcesBody, JSON.stringify([layout.acc.ts11, layout.acc.sources]));
        check(`${tag}: accordion rows at least 56px`, ["formats", "ts11", "sources"].every((k) => layout.acc[k] && layout.acc[k].height >= 56), JSON.stringify(layout.acc));
        check(`${tag}: Credential details and Tags are not accordions`, !layout.acc.details && !layout.acc.tags);
        const framed = await page.evaluate(() => ["#details", "#tags", "#formats"].filter((s) => document.querySelector(s)).every((s) => {
          const cs = getComputedStyle(document.querySelector(s));
          return cs.borderTopStyle === "solid" && cs.borderLeftStyle === "solid" && cs.backgroundColor !== "rgba(0, 0, 0, 0)";
        }));
        check(`${tag}: context blocks framed as their own group`, framed);
        await page.click("#sources .fides-ds-collapsible__toggle");
        check(`${tag}: Sources accordion opens`, (await page.getAttribute("#sources .fides-ds-collapsible__toggle", "aria-expanded")) === "true" && (await page.isVisible("#sources-body")));
      }
      if (width < 1100) {
        check(`${tag}: TS11 is a closed accordion`, ts11Collapsible.toggle && ts11Collapsible.expanded === "false", JSON.stringify(ts11Collapsible));
        await page.click(".fides-credential-ts11 .fides-ds-collapsible__toggle");
        check(`${tag}: TS11 accordion opens`, (await page.getAttribute(".fides-credential-ts11 .fides-ds-collapsible__toggle", "aria-expanded")) === "true"
          && (await page.isVisible("#ts11-body")));
      } else {
        check(`${tag}: TS11 panel open in the context column`, !ts11Collapsible.toggle && (await page.isVisible("#ts11-body")));
      }

      // Compact TS11 (Paper 20.39): short explanation, technical metadata closed at every width.
      const tech = () => page.evaluate(() => {
        const b = document.querySelector("[data-credential-ts11-toggle]");
        const p = document.getElementById("ts11-technical");
        const r = b.getBoundingClientRect();
        return {
          expanded: b.getAttribute("aria-expanded"),
          controls: b.getAttribute("aria-controls"),
          label: b.textContent.trim(),
          visible: b.offsetParent !== null,
          height: Math.round(r.height),
          top: Math.round(r.top),
          panel: p.offsetParent !== null,
          focused: document.activeElement === b,
        };
      });
      const summary = (await page.textContent(".fides-credential-ts11__summary")) || "";
      check(`${tag}: TS11 short explanation visible`, (await page.isVisible(".fides-credential-ts11__summary")) && /provided|supported format|Issuer metadata is linked/.test(summary), summary);
      let t11 = await tech();
      check(`${tag}: technical metadata closed by default`, t11.visible && t11.expanded === "false" && t11.label === "View technical metadata" && !t11.panel && t11.controls === "ts11-technical", JSON.stringify(t11));
      check(`${tag}: technical metadata toggle at least 44px`, t11.height >= 44, String(t11.height));
      await page.locator("[data-credential-ts11-toggle]").scrollIntoViewIfNeeded();
      await page.locator("[data-credential-ts11-toggle]").focus();
      const before = (await tech()).top;
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      t11 = await tech();
      check(`${tag}: Enter opens the technical metadata`, t11.expanded === "true" && t11.label === "Hide technical metadata" && t11.panel && t11.focused, JSON.stringify(t11));
      check(`${tag}: toggle stays in place (no scroll jump)`, Math.abs(t11.top - before) <= 1, `${before} -> ${t11.top}`);
      const facts = await page.evaluate(() => {
        const rows = [...document.querySelectorAll("#ts11-technical .fides-ds-facts__row")];
        return {
          labels: rows.map((r) => r.querySelector("dt").textContent.trim()),
          stacked: rows.every((r) => r.querySelector("dd").getBoundingClientRect().top >= r.querySelector("dt").getBoundingClientRect().bottom - 1),
          source: (rows.find((r) => r.querySelector("dt").textContent.trim() === "Source URIs") || { textContent: "" }).textContent,
          caption: (document.querySelector(".fides-credential-ts11__caption") || {}).textContent || "",
        };
      });
      check(`${tag}: all nine technical fields with readable labels`, facts.labels.join("|") === "Metadata ID|Version|Rulebook|Trusted authorities|Security level|Holder binding|Formats (TS11)|Source URIs|API metadata coverage", facts.labels.join("|"));
      check(`${tag}: technical metadata caption`, /^Technical metadata · /.test(facts.caption), facts.caption);
      if (width < 600) check(`${tag}: labels above values`, facts.stacked);
      check(`${tag}: no horizontal overflow with technical metadata open`, (await overflow(page)) <= 0, String(await overflow(page)));
      if (id === "cred:eduwallet:open-badge") {
        check(`${tag}: Source URIs names the issuer metadata endpoint`, /1 issuer metadata endpoint; not an attribute-schema link/.test(facts.source) && !/schema link(?!;)/.test(facts.source.replace("attribute-schema link", "")), facts.source);
        check(`${tag}: short explanation names the issuer metadata endpoint`, /^Issuer metadata is linked; an attribute index is not available\./.test(summary.trim()), summary);
      }
      if (id === "cred:webuild:eucc") check(`${tag}: EUCC source is one schema link`, /1 schema link/.test(facts.source), facts.source);
      await page.keyboard.press("Space");
      await page.waitForTimeout(100);
      t11 = await tech();
      check(`${tag}: Space closes the technical metadata and keeps focus`, t11.expanded === "false" && t11.label === "View technical metadata" && !t11.panel && t11.focused, JSON.stringify(t11));

      if (id === "cred:eu:ehic") {
        const tabs = page.locator("[role='tab']");
        check(`${tag}: two format tabs`, (await tabs.count()) === 2);
        const firstPanel = await page.locator("[data-credential-format-panel]").first().getAttribute("id");
        const attrsBefore = await page.locator("#attributes-list > li").count();
        await tabs.nth(1).click();
        check(`${tag}: format switch keeps the type-level attribute index`, (await page.locator("#attributes-list > li").count()) === attrsBefore && (await page.isVisible("#attributes")));
        check(`${tag}: second tab shows its panel`, (await tabs.nth(1).getAttribute("aria-selected")) === "true"
          && (await page.locator(`#${firstPanel}`).isHidden()));
        await tabs.nth(1).focus();
        await page.keyboard.press("ArrowLeft");
        check(`${tag}: arrow keys move between formats`, (await tabs.nth(0).getAttribute("aria-selected")) === "true"
          && (await page.evaluate(() => document.activeElement && document.activeElement.getAttribute("role") === "tab")));
        check(`${tag}: 8 top-level fields need no show-all`, (await page.locator("[aria-controls='attributes-list']").count()) === 0);
        const note = await page.textContent("[data-credential-source-note]").catch(() => "");
        check(`${tag}: schema source note shown`, /automatically generated/i.test(note || "") && /provisional/i.test(note || ""), note);
      }
      if (width <= 390) {
        const hero = await page.evaluate(() => {
          const title = document.querySelector(".fides-credential-detail .fides-org-detail__title");
          const hero = title && title.closest(".fides-credential-detail__hero");
          if (!title || !hero) return null;
          const lh = parseFloat(getComputedStyle(title).lineHeight);
          return { lines: Math.round(title.getBoundingClientRect().height / lh), titleWidth: Math.round(title.getBoundingClientRect().width), heroWidth: Math.round(hero.clientWidth) };
        });
        check(`${tag}: title uses the full hero width`, hero && hero.titleWidth >= hero.heroWidth - 1, JSON.stringify(hero));
        check(`${tag}: title at most three lines`, hero && hero.lines <= 3, JSON.stringify(hero));
      }
      if (id === "cred:eduwallet:open-badge") {
        check(`${tag}: no-index message`, await page.isVisible("text=No attribute index is available for this catalog record yet."));
      }
      if (id === "cred:webuild:eucc") {
        check(`${tag}: TS11 metadata marker`, (await page.locator(".fides-credential-ts11-status").count()) > 0);
        const topLevel = await page.locator("#attributes-list > li").count();
        check(`${tag}: 30 top-level fields`, topLevel === 30, String(topLevel));
        const showAll = page.locator("#attributes-list ~ [data-fides-ds-show-all-button], [aria-controls='attributes-list']").first();
        if (await showAll.count()) {
          const hiddenBefore = await page.locator("#attributes-list > li[hidden]").count();
          await showAll.click();
          check(`${tag}: show all reveals every top-level field`, hiddenBefore > 0 && (await page.locator("#attributes-list > li[hidden]").count()) === 0, String(hiddenBefore));
        } else {
          check(`${tag}: show all control present`, false);
        }
      }
      if (width === 1440 || width === 390) {
        await page.screenshot({ path: path.join(OUT, `detail-${id.split(":").pop()}-${width}.png`), fullPage: true });
      }
      await page.close();
    }
    await context.close();
  }

  // ---------- Ecosystem connections (Paper 20.36 / 20.37 / 20.38) ----------
  const ecoState = (page) => page.evaluate(() => {
    const visibleText = (el) => (el && el.offsetParent !== null ? el.innerText.replace(/\s+/g, " ").trim() : "");
    const group = (key) => {
      const groupEl = document.querySelector(`.fides-credential-eco__group--${key}`);
      if (!groupEl) return null;
      const cs = getComputedStyle(groupEl);
      const r = groupEl.getBoundingClientRect();
      const box = { top: Math.round(r.top + scrollY), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height), bg: cs.backgroundColor, border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`, side: `${cs.borderLeftWidth} ${cs.borderLeftStyle} ${cs.borderLeftColor}` };
      const badgeEl = groupEl.querySelector(".fides-credential-eco__count");
      const bs = badgeEl ? getComputedStyle(badgeEl) : null;
      const badge = badgeEl && badgeEl.offsetParent !== null && bs.display !== "none"
        ? { text: badgeEl.textContent.trim(), font: `${bs.fontSize}/${bs.lineHeight}/${bs.fontWeight}`, bg: bs.backgroundColor, padding: `${bs.paddingTop} ${bs.paddingRight}`, gap: Math.round(badgeEl.getBoundingClientRect().left - groupEl.querySelector(".fides-credential-eco__question").getBoundingClientRect().right) }
        : null;
      const title = groupEl.querySelector(".fides-credential-eco__title");
      const ts = getComputedStyle(title.querySelector(".fides-credential-eco__question") || title);
      if (groupEl.classList.contains("fides-credential-eco__group--missing")) {
        return {
          missing: true,
          box,
          badge,
          headingTag: title.tagName,
          titleFont: `${ts.fontSize}/${ts.lineHeight}`,
          role: visibleText(groupEl.querySelector(".fides-credential-eco__role")),
          state: visibleText(groupEl.querySelector(".fides-credential-eco__missing")),
          explanation: visibleText(groupEl.querySelector(".fides-credential-eco__missing-text")),
          controls: groupEl.querySelectorAll("a, button, ul, [tabindex], [aria-expanded], .fides-ds-collapsible__chevron, svg").length,
          collapsible: groupEl.hasAttribute("data-fides-ds-collapsible"),
          text: groupEl.innerText.replace(/\s+/g, " ").trim(),
        };
      }
      const list = document.getElementById(`eco-${key}-list`);
      const rows = [...list.children];
      const toggle = list.nextElementSibling && list.nextElementSibling.classList.contains("fides-ds-show-all__toggle") ? list.nextElementSibling : null;
      const catalog = list.parentElement.querySelector(".fides-credential-eco__catalog");
      const body = document.getElementById(`eco-${key}-body`);
      const head = groupEl.querySelector(".fides-ds-collapsible__toggle");
      return {
        missing: false,
        total: rows.length,
        visible: rows.filter((li) => li.offsetParent !== null).length,
        toggle: toggle ? { text: toggle.textContent.trim(), expanded: toggle.getAttribute("aria-expanded"), visible: toggle.offsetParent !== null } : null,
        catalog: !!catalog && catalog.offsetParent !== null,
        catalogHref: catalog ? catalog.querySelector("a").getAttribute("href") : null,
        bodyVisible: !!body && body.offsetParent !== null,
        accordion: head ? { expanded: head.getAttribute("aria-expanded"), height: Math.round(head.getBoundingClientRect().height), label: head.innerText.replace(/\s+/g, " ").trim() } : null,
        box,
        badge,
        titleFont: `${ts.fontSize}/${ts.lineHeight}`,
        chevron: head ? !!head.querySelector(".fides-ds-collapsible__chevron") : false,
        names: rows.map((li) => li.querySelector(".fides-credential-eco__name").textContent.trim()),
      };
    };
    const eco = document.querySelector(".fides-credential-eco");
    const top = (sel) => { const el = document.querySelector(sel); return el ? Math.round(el.getBoundingClientRect().top + scrollY) : null; };
    const scrollers = eco ? [...eco.querySelectorAll("*")].filter((el) => /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1).length : -1;
    return {
      present: !!eco,
      issuers: group("issuers"),
      wallets: group("wallets"),
      rps: group("rps"),
      groupKeys: eco ? [...eco.querySelectorAll(".fides-credential-eco__group")].map((g) => (g.className.match(/__group--(issuers|wallets|rps)\b/) || [])[1]) : [],
      missingNote: eco ? visibleText(eco.querySelector(".fides-credential-eco__missing-note")) : "",
      navLink: !!document.querySelector(".fides-uc-detail__sections a[href='#ecosystem']"),
      note: eco ? (eco.querySelector(".fides-credential-eco__note") || {}).textContent || "" : "",
      arrowsBetween: eco ? eco.querySelectorAll(".fides-credential-flow, .fides-credential-eco__connector").length : 0,
      scrollers,
      order: { main: top(".fides-credential-detail .fides-uc-detail__main"), eco: top(".fides-credential-eco"), closing: top("#listing") },
      width: eco ? Math.round(eco.getBoundingClientRect().width) : 0,
      layoutWidth: Math.round(document.querySelector(".fides-credential-detail__body").getBoundingClientRect().width),
    };
  });
  const sortedNames = (names) => [...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  const NOTE = "These catalog connections do not guarantee that every issuer, wallet and service works together.";

  const BADGE = { font: "14px/22px/400", bg: "rgb(241, 246, 255)", padding: "2px 8px" };
  const badgeOk = (b, n) => !!b && b.text === String(n) && b.font === BADGE.font && b.bg === BADGE.bg && b.padding === BADGE.padding;
  for (const width of [1440, 1280, 1279, 1200, 768, 390, 320]) {
    const context = await newContext(browser, width);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`eco ${width}: ${e.message}`));
    await open(page, DETAIL + encodeURIComponent("cred:eu:age-verification"));
    await page.waitForSelector(".fides-credential-eco");
    await page.waitForTimeout(300);
    const tag = `eco AV ${width}`;
    let s = await ecoState(page);
    check(`${tag}: three groups in order issuers, wallets, relying parties`, s.groupKeys.join() === "issuers,wallets,rps", s.groupKeys.join());
    check(`${tag}: counts follow the data`, s.issuers.total > 3 && s.wallets.total > 3 && s.rps.total > 3, JSON.stringify([s.issuers.total, s.wallets.total, s.rps.total]));
    check(`${tag}: each group alphabetical`, ["issuers", "wallets", "rps"].every((k) => JSON.stringify(s[k].names) === JSON.stringify(sortedNames(s[k].names))));
    check(`${tag}: below main and aside, above the closing`, s.order.eco > s.order.main && s.order.eco < s.order.closing, JSON.stringify(s.order));
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    check(`${tag}: no internal scroll areas`, s.scrollers === 0, String(s.scrollers));
    check(`${tag}: catalog note kept`, s.note.trim() === NOTE, s.note);
    check(`${tag}: no connectors between groups`, s.arrowsBetween === 0);
    const heads = {
      issuers: await page.textContent("#eco-issuers-title"),
      wallets: await page.textContent("#eco-wallets-title"),
      rps: await page.textContent("#eco-rps-title"),
    };
    check(`${tag}: headings keep question and dynamic count`, /Who issues it\?/.test(heads.issuers) && heads.issuers.includes(String(s.issuers.total)) && /Which wallets\?/.test(heads.wallets) && heads.wallets.includes(String(s.wallets.total)) && /Where is it accepted\?/.test(heads.rps) && heads.rps.includes(String(s.rps.total)), JSON.stringify(heads));
    check(`${tag}: no Not specified state when every role has links`, !s.issuers.missing && !s.wallets.missing && !s.rps.missing && s.missingNote === "", s.missingNote);
    check(`${tag}: ecosystem nav entry`, s.navLink);
    if (width >= 1280) {
      check(`${tag}: small 14/22 count badge beside the 20/26 heading, 8px apart`, ["issuers", "wallets", "rps"].every((k) => badgeOk(s[k].badge, s[k].total) && s[k].titleFont === "20px/26px" && Math.abs(s[k].badge.gap - 8) <= 1), JSON.stringify(["issuers", "wallets", "rps"].map((k) => [s[k].badge, s[k].titleFont])));
    } else {
      check(`${tag}: closed heads show the count once, in Role · N`, ["issuers", "wallets", "rps"].every((k) => !s[k].badge && (s[k].accordion.label.match(/\d+/g) || []).length === 1), ["issuers", "wallets", "rps"].map((k) => s[k].accordion.label).join(" | "));
    }

    if (width >= 1280) {
      check(`${tag}: full content width`, s.width >= s.layoutWidth - 2, `${s.width}/${s.layoutWidth}`);
      check(`${tag}: three columns side by side`, s.issuers.box.top === s.wallets.box.top && s.wallets.box.top === s.rps.box.top && s.issuers.box.left < s.wallets.box.left && s.wallets.box.left < s.rps.box.left, JSON.stringify([s.issuers.box, s.wallets.box, s.rps.box]));
      check(`${tag}: equal column widths`, Math.abs(s.issuers.box.width - s.wallets.box.width) <= 1 && Math.abs(s.wallets.box.width - s.rps.box.width) <= 1, JSON.stringify([s.issuers.box.width, s.wallets.box.width, s.rps.box.width]));
      check(`${tag}: no accordions`, !s.issuers.accordion && !s.wallets.accordion && !s.rps.accordion);
      check(`${tag}: three rows per group by default`, s.issuers.visible === 3 && s.wallets.visible === 3 && s.rps.visible === 3, `${s.issuers.visible}/${s.wallets.visible}/${s.rps.visible}`);
      check(`${tag}: View all N per group`, ["issuers", "wallets", "rps"].every((k) => s[k].toggle && s[k].toggle.text.startsWith(`View all ${s[k].total}`)), ["issuers", "wallets", "rps"].map((k) => s[k].toggle && s[k].toggle.text).join(" | "));
      check(`${tag}: catalog routes hidden while collapsed`, !s.issuers.catalog && !s.wallets.catalog && !s.rps.catalog);
      const slots = await page.evaluate(() => {
        const slot = document.querySelector("#eco-issuers-list .fides-credential-eco__slot");
        const arrow = document.querySelector("#eco-issuers-list .fides-org-eco__arrow");
        const wallet = document.querySelector("#eco-wallets-list .fides-credential-eco__row");
        return { slot: Math.round(slot.getBoundingClientRect().width), arrow: Math.round(arrow.getBoundingClientRect().width), walletSlot: !!wallet.querySelector(".fides-credential-eco__slot") };
      });
      check(`${tag}: 96px status slot, 24px arrow; wallets have no status`, slots.slot === 96 && slots.arrow === 24 && !slots.walletSlot, JSON.stringify(slots));

      await page.locator("#eco-wallets-list + .fides-ds-show-all__toggle").focus();
      await page.keyboard.press("Enter");
      s = await ecoState(page);
      check(`${tag}: keyboard View all expands only the wallets`, s.wallets.visible === s.wallets.total && s.issuers.visible === 3 && s.rps.visible === 3, `${s.issuers.visible}/${s.wallets.visible}/${s.rps.visible}`);
      check(`${tag}: wallet catalog route under the full list`, s.wallets.catalog && !s.issuers.catalog && !s.rps.catalog && /[?&]wallets=/.test(s.wallets.catalogHref || ""), s.wallets.catalogHref);
      check(`${tag}: wallet toggle becomes Show fewer wallets`, s.wallets.toggle.expanded === "true" && /Show fewer wallets/.test(s.wallets.toggle.text), s.wallets.toggle.text);
      await page.click("#eco-issuers-list + .fides-ds-show-all__toggle");
      s = await ecoState(page);
      check(`${tag}: issuers expand independently`, s.issuers.visible === s.issuers.total && s.wallets.visible === s.wallets.total && s.rps.visible === 3);
      check(`${tag}: issuer catalog route lists the issuers`, s.issuers.catalog && /[?&]issuers=/.test(s.issuers.catalogHref || ""), s.issuers.catalogHref);

      const toggle = page.locator("#eco-wallets-list + .fides-ds-show-all__toggle");
      await toggle.scrollIntoViewIfNeeded();
      await toggle.focus();
      const toggleTop = () => page.evaluate(() => Math.round(document.querySelector("#eco-wallets-list + .fides-ds-show-all__toggle").getBoundingClientRect().top));
      // Wait until late layout (fonts, logos) has settled with the button in view.
      let topBefore = await toggleTop();
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(150);
        const now = await toggleTop();
        if (now === topBefore && now >= 0 && now < 860) break;
        if (now < 0 || now >= 860) await toggle.scrollIntoViewIfNeeded();
        topBefore = await toggleTop();
      }
      await page.keyboard.press("Space");
      await page.waitForTimeout(100);
      s = await ecoState(page);
      const topAfter = await toggleTop();
      const focused = await page.evaluate(() => document.activeElement === document.querySelector("#eco-wallets-list + .fides-ds-show-all__toggle"));
      check(`${tag}: Show fewer collapses only the wallets`, s.wallets.visible === 3 && s.issuers.visible === s.issuers.total, `${s.issuers.visible}/${s.wallets.visible}`);
      check(`${tag}: Show fewer keeps focus and the button in place`, focused && Math.abs(topAfter - topBefore) <= 1 && topAfter >= 0 && topAfter < 900, `${topBefore} -> ${topAfter}`);

      if (width === 1440) {
        await page.locator("#eco-issuers-list .fides-credential-eco__row").first().focus();
        const focusStyle = await page.evaluate(() => {
          const cs = getComputedStyle(document.activeElement);
          return { color: cs.outlineColor, offset: cs.outlineOffset, width: cs.outlineWidth, style: cs.outlineStyle };
        });
        check(`${tag}: focus is a 2px brand-blue ring inside the row`, focusStyle.style !== "none" && focusStyle.color === "rgb(10, 110, 243)" && focusStyle.offset === "-2px" && focusStyle.width === "2px", JSON.stringify(focusStyle));
        const geometry = (sel) => page.evaluate((sel) => {
          const row = document.querySelector(sel);
          const li = row.parentElement;
          const r = row.getBoundingClientRect();
          const l = li.getBoundingClientRect();
          const cs = getComputedStyle(row);
          const pos = (q) => { const e = row.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top)]; };
          return {
            sameEdge: Math.abs(r.left - l.left) < 1 && Math.abs(r.right - l.right) < 1,
            margin: [cs.marginLeft, cs.marginRight].join(),
            padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(),
            status: pos(".fides-credential-eco__slot"),
            arrow: pos(".fides-org-eco__arrow"),
            bg: cs.backgroundColor,
            underline: getComputedStyle(row.querySelector(".fides-org-eco__name")).textDecorationLine,
            metaDeco: row.querySelector(".fides-credential-eco__meta") ? getComputedStyle(row.querySelector(".fides-credential-eco__meta")).textDecorationLine : "none",
            slotDeco: row.querySelector(".fides-credential-eco__slot") ? getComputedStyle(row.querySelector(".fides-credential-eco__slot")).textDecorationLine : "none",
          };
        }, sel);
        for (const [key, sel] of [["rps", "#eco-rps-list .fides-credential-eco__row"], ["wallets", "#eco-wallets-list .fides-credential-eco__row"]]) {
          await page.mouse.move(0, 0);
          await page.waitForTimeout(250);
          const rest = await geometry(sel);
          check(`${tag}: ${key} row, divider and hover share one outer edge; 16/12 padding`, rest.sameEdge && rest.margin === "0px,0px" && rest.padding === "16px,12px,16px,12px", JSON.stringify(rest));
          await page.hover(`${sel} >> nth=0`);
          await page.waitForTimeout(250);
          const hovered = await geometry(sel);
          check(`${tag}: ${key} row hover: info surface, name underlined only`, hovered.bg === "rgb(242, 247, 255)" && /underline/.test(hovered.underline) && hovered.slotDeco === "none", JSON.stringify(hovered));
          check(`${tag}: ${key} status and arrow do not move on hover`, JSON.stringify([rest.status, rest.arrow]) === JSON.stringify([hovered.status, hovered.arrow]));
        }
        const rowHref = await page.getAttribute("#eco-rps-list .fides-credential-eco__row >> nth=0", "href");
        check(`${tag}: relying-party rows use the configured ?rp= route`, /[?&]rp=/.test(rowHref || ""), rowHref);

        // Wallet rows open the matching local wallet record; Back returns here.
        const detailUrl = page.url();
        const walletHref = await page.getAttribute("#eco-wallets-list .fides-credential-eco__row >> nth=0", "href");
        const walletId = new URL(walletHref).searchParams.get("wallet") || new URL(walletHref).searchParams.get("wallets");
        await page.click("#eco-wallets-list .fides-credential-eco__row >> nth=0");
        await page.waitForSelector("[data-wallet-id], .fides-wallet-detail, .fides-ds-detail-top", { timeout: 30000 });
        const opened = await page.evaluate(() => {
          const el = document.querySelector("[data-wallet-id]");
          const h1 = document.querySelector("h1");
          return { id: el ? el.getAttribute("data-wallet-id") : null, h1: h1 ? h1.textContent.trim() : "" };
        });
        const walletName = s.wallets.names[0];
        check(`${tag}: wallet row opens the matching wallet record`, /\/fides-design-pilot\/wallet\//.test(page.url()) && new URL(page.url()).searchParams.get("wallet") === walletId && (opened.id === null || opened.id === walletId) && opened.h1.includes(walletName), `${page.url()} ${JSON.stringify(opened)} expected ${walletName}`);
        await page.goBack();
        await page.waitForSelector(".fides-credential-eco");
        check(`${tag}: browser back returns to the credential`, page.url() === detailUrl && (await page.getAttribute(".fides-credential-detail", "data-credential-id")) === "cred:eu:age-verification", page.url());

        // Relying-party rows: only navigation and Back, with a stubbed external page.
        await page.route("https://fides.community/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>stub</title>" }));
        await page.click("#eco-rps-list .fides-credential-eco__row >> nth=0");
        await page.waitForLoadState("domcontentloaded");
        check(`${tag}: relying-party row navigates to its ?rp= link`, /[?&]rp=/.test(page.url()), page.url());
        await page.goBack();
        await page.waitForSelector(".fides-credential-detail");
        check(`${tag}: browser back from a relying party returns to the credential`, page.url() === detailUrl, page.url());
        await page.unroute("https://fides.community/**");
      }
    } else {
      check(`${tag}: three stacked accordions`, s.issuers.box.top < s.wallets.box.top && s.wallets.box.top < s.rps.box.top && s.issuers.box.left === s.wallets.box.left, JSON.stringify([s.issuers.box, s.wallets.box, s.rps.box]));
      check(`${tag}: accordions closed by default`, ["issuers", "wallets", "rps"].every((k) => s[k].accordion && s[k].accordion.expanded === "false" && !s[k].bodyVisible));
      check(`${tag}: accordion heads at least 56px`, ["issuers", "wallets", "rps"].every((k) => s[k].accordion.height >= 56), ["issuers", "wallets", "rps"].map((k) => s[k].accordion.height).join("/"));
      check(`${tag}: heads show question and Role · N`, /Who issues it\?\s*Issuers · \d+/.test(s.issuers.accordion.label) && /Which wallets\?\s*Wallets · \d+/.test(s.wallets.accordion.label) && /Where is it accepted\?\s*Relying parties · \d+/.test(s.rps.accordion.label), [s.issuers.accordion.label, s.wallets.accordion.label, s.rps.accordion.label].join(" | "));
      check(`${tag}: equal heads: background, border and chevron`, s.issuers.box.bg === s.wallets.box.bg && s.wallets.box.bg === s.rps.box.bg && s.issuers.box.border === s.wallets.box.border && s.wallets.box.border === s.rps.box.border && s.issuers.chevron && s.wallets.chevron && s.rps.chevron, JSON.stringify([s.issuers.box, s.wallets.box, s.rps.box]));

      await page.locator("#eco-wallets-title .fides-ds-collapsible__toggle").focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      s = await ecoState(page);
      check(`${tag}: keyboard opens the wallets with the full list`, s.wallets.accordion.expanded === "true" && s.wallets.visible === s.wallets.total, `${s.wallets.visible}/${s.wallets.total}`);
      check(`${tag}: open head shows the small badge, the role line without a second count`, badgeOk(s.wallets.badge, s.wallets.total) && !/Wallets · \d/.test(s.wallets.accordion.label) && (s.wallets.accordion.label.match(/\d+/g) || []).length === 1, `${s.wallets.accordion.label} ${JSON.stringify(s.wallets.badge)}`);
      check(`${tag}: issuers and relying parties stay closed`, s.issuers.accordion.expanded === "false" && !s.issuers.bodyVisible && s.rps.accordion.expanded === "false" && !s.rps.bodyVisible);
      check(`${tag}: wallet catalog route and Show fewer in the open group`, s.wallets.catalog && s.wallets.toggle && /Show fewer wallets/.test(s.wallets.toggle.text), s.wallets.toggle && s.wallets.toggle.text);
      const walletText = await page.textContent("#eco-wallets-body");
      check(`${tag}: wallet group says who names the wallets`, /Wallets named by these relying parties\./.test(walletText) && /Named by /.test(walletText), walletText.slice(0, 120));
      if (width <= 390) {
        const stacked = await page.evaluate(() => {
          const row = document.querySelector("#eco-rps-list .fides-credential-eco__row");
          const meta = row.querySelector(".fides-credential-eco__meta");
          const status = row.querySelector(".fides-credential-eco__slot");
          const wrow = document.querySelector("#eco-wallets-list .fides-credential-eco__row");
          const name = wrow.querySelector(".fides-credential-eco__name").getBoundingClientRect();
          const arrow = wrow.querySelector(".fides-org-eco__arrow").getBoundingClientRect();
          return { status: !!meta && !!status && status.getBoundingClientRect().top >= meta.getBoundingClientRect().bottom - 1, walletArrowRight: arrow.left >= name.right - 1 };
        });
        check(`${tag}: status under the organization; wallet arrow beside the name`, stacked.status && stacked.walletArrowRight, JSON.stringify(stacked));
      }
      await page.click("#eco-rps-title .fides-ds-collapsible__toggle");
      s = await ecoState(page);
      check(`${tag}: relying parties open independently`, s.rps.accordion.expanded === "true" && s.wallets.accordion.expanded === "true" && s.rps.visible === s.rps.total && s.issuers.accordion.expanded === "false");
      const small = await smallTargets(page, ".fides-credential-eco .fides-ds-collapsible__toggle, .fides-credential-eco .fides-ds-show-all__toggle, .fides-credential-eco__row, .fides-credential-eco a");
      check(`${tag}: targets at least 44px`, small.length === 0, small.slice(0, 4).join(", "));
      check(`${tag}: no horizontal overflow with groups open`, (await overflow(page)) <= 0);
    }
    const closing = await page.textContent("#listing");
    check(`${tag}: closing kept`, /Help keep this credential type current\./.test(closing) && /Updated/.test(closing));
    await page.screenshot({ path: path.join(OUT, `ecosystem-age-verification-${width}.png`), fullPage: true });
    await context.close();
  }

  // Records with few or no relations: the three roles stay; a role without links says Not specified.
  const MISSING = {
    issuers: ["Issuers", "No issuer is recorded for this credential type."],
    wallets: ["Wallets", "No wallet is recorded through the linked relying parties."],
    rps: ["Relying parties", "No relying party is recorded for this credential type."],
  };
  for (const width of [1440, 1320, 1319, 1280, 1279, 1200, 1199, 1100, 768, 390, 320]) {
    const context = await newContext(browser, width);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`eco cases ${width}: ${e.message}`));
    const cases = [
      { id: "cred:eu:ehic", missing: [] },
      { id: "cred:eu:loyalty", missing: ["wallets"] },
      { id: "cred:eduwallet:open-badge", missing: ["issuers"] },
      { id: "cred:webuild:eucc", missing: ["wallets", "rps"] },
      { id: "cred:uidai:aadhaar", missing: ["issuers", "wallets"] },
      { id: "cred:eduwallet:exam-enrollment", missing: null },
    ];
    for (const c of cases) {
      await open(page, DETAIL + encodeURIComponent(c.id));
      await page.waitForSelector(".fides-credential-detail");
      await page.waitForTimeout(200);
      const tag = `eco ${c.id.split(":").pop()} ${width}`;
      const s = await ecoState(page);
      if (!c.missing) {
        check(`${tag}: no links at all hides the section and its nav entry`, !s.present && !s.navLink && (await page.locator("a[href='#ecosystem']").count()) === 0);
        continue;
      }
      const keys = ["issuers", "wallets", "rps"];
      const known = keys.filter((k) => !c.missing.includes(k));
      check(`${tag}: all three roles in order`, s.groupKeys.join() === "issuers,wallets,rps", s.groupKeys.join());
      check(`${tag}: ecosystem nav entry`, s.navLink);
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
      check(`${tag}: compatibility note kept`, s.note.trim() === NOTE, s.note);
      const wide = width >= 1280;
      if (wide) {
        const tops = keys.map((k) => s[k].box.top);
        check(`${tag}: three equal columns from 1280px`, tops.every((t) => t === tops[0]) && s.issuers.box.left < s.wallets.box.left && s.wallets.box.left < s.rps.box.left && Math.abs(s.issuers.box.width - s.wallets.box.width) <= 1 && Math.abs(s.wallets.box.width - s.rps.box.width) <= 1, JSON.stringify(keys.map((k) => s[k].box)));
        check(`${tag}: same 2px top rule on every column`, keys.every((k) => s[k].box.border === s.issuers.box.border && /^2px solid/.test(s[k].box.border)), JSON.stringify(keys.map((k) => s[k].box.border)));
      } else {
        const lefts = keys.map((k) => s[k].box.left);
        check(`${tag}: stacked below 1280px`, s.issuers.box.top < s.wallets.box.top && s.wallets.box.top < s.rps.box.top && lefts.every((l) => l === lefts[0]), JSON.stringify(keys.map((k) => s[k].box)));
      }
      check(`${tag}: Not specified note only below 1280px and only with a missing role`, s.missingNote === (!wide && c.missing.length ? "Not specified means no link is recorded in this catalog." : ""), s.missingNote);
      for (const k of c.missing) {
        const g = s[k];
        check(`${tag}: ${k} is a static section with a real heading`, g.missing && !g.collapsible && g.controls === 0 && g.headingTag === "H3" && !g.badge, JSON.stringify({ controls: g.controls, collapsible: g.collapsible, tag: g.headingTag, badge: g.badge }));
        if (wide) {
          check(`${tag}: ${k} says Not specified and why`, g.role === MISSING[k][0] && g.state === "Not specified" && g.explanation === MISSING[k][1], JSON.stringify([g.role, g.state, g.explanation]));
        } else {
          check(`${tag}: ${k} shows Role · Not specified directly`, g.role === `${MISSING[k][0]} · Not specified` && g.state === "" && g.explanation === "", JSON.stringify([g.role, g.state, g.explanation]));
          if (known.length) {
            const ref = s[known[0]].box;
            check(`${tag}: ${k} has the same box as a closed accordion`, g.box.bg === ref.bg && g.box.border === ref.border && g.box.side === ref.side && [-26, 0, 26].some((line) => Math.abs(g.box.height - ref.height - line) <= 2) && g.box.width === ref.width, JSON.stringify([g.box, ref]));
          }
        }
        check(`${tag}: ${k} has no zero count or empty action`, !/\b0\b|View all|Open these/.test(g.text), g.text);
      }
      for (const k of known) {
        const n = s[k].total;
        if (wide) {
          check(`${tag}: ${k} column without accordion, badge ${n}`, !s[k].accordion && badgeOk(s[k].badge, n), JSON.stringify(s[k].badge));
          check(`${tag}: ${k} shows ${Math.min(n, 3)} of ${n}; toggle only above three`, s[k].visible === Math.min(n, 3) && (n > 3 ? !!s[k].toggle : !s[k].toggle), JSON.stringify(s[k].toggle));
          check(`${tag}: ${k} catalog route only for more than one record`, n > 1 && n <= 3 ? s[k].catalog : n === 1 ? !s[k].catalog : true);
        } else {
          check(`${tag}: ${k} closed accordion, count once in Role · ${n}`, s[k].accordion && s[k].accordion.expanded === "false" && s[k].chevron && !s[k].badge && s[k].accordion.label.endsWith(`· ${n}`) && (s[k].accordion.label.match(/\d+/g) || []).length === 1, s[k].accordion && s[k].accordion.label);
        }
      }
      if (!wide && width <= 390) {
        const small = await smallTargets(page, ".fides-credential-eco .fides-ds-collapsible__toggle, .fides-credential-eco a, .fides-credential-eco button");
        check(`${tag}: targets at least 44px`, small.length === 0, small.slice(0, 4).join(", "));
      }
      if (c.id === "cred:uidai:aadhaar") {
        check(`${tag}: one relying party (Multipaz Verifier)`, s.rps.total === 1 && s.rps.names[0] === "Multipaz Verifier", JSON.stringify(s.rps.names));
        if (!wide) {
          await page.click("#eco-rps-title .fides-ds-collapsible__toggle");
          const open1 = await ecoState(page);
          check(`${tag}: relying parties open to the one row, no View all or list route`, open1.rps.visible === 1 && !open1.rps.toggle && !open1.rps.catalog && badgeOk(open1.rps.badge, 1), JSON.stringify(open1.rps));
        }
        if (width === 1440 || width === 390) await page.screenshot({ path: path.join(OUT, `ecosystem-aadhaar-${width}.png`), fullPage: true });
      }
      if (c.id === "cred:webuild:eucc" && (width === 1440 || width === 390)) await page.screenshot({ path: path.join(OUT, `ecosystem-eucc-${width}.png`), fullPage: true });
      if (c.id === "cred:eduwallet:open-badge") {
        const walletHref = await page.getAttribute("#eco-wallets-list .fides-credential-eco__row", "href");
        check(`${tag}: single wallet links to its local record`, /\/fides-design-pilot\/wallet\/\?wallet=/.test(walletHref || ""), walletHref);
        const intro = await page.evaluate(() => document.querySelector("#eco-wallets-body .fides-credential-eco__intro").textContent);
        check(`${tag}: singular wallet intro`, intro.trim() === "Wallets named by this relying party.", intro);
      }
    }
    await context.close();
  }

  // Detail: Explain dialog, guest like and legacy alias.
  {
    const context = await newContext(browser, 390);
    const page = await context.newPage();
    await open(page, DETAIL + encodeURIComponent("cred:eu:ehic-sd-jwt-vc:sd-jwt-vc"));
    await page.waitForSelector(".fides-credential-detail");
    check("alias: legacy format id renders EHIC", (await page.getAttribute(".fides-credential-detail", "data-credential-id")) === "cred:eu:ehic");
    const canonical = await page.getAttribute("link[rel='canonical']", "href").catch(() => "");
    check("alias: canonical points at the type id", /credential=cred%3Aeu%3Aehic$|credential=cred:eu:ehic$/.test(canonical || ""), canonical);
    await page.click(".fides-credential-ts11 .fides-ds-collapsible__toggle");
    await page.click(".fides-credential-ts11 .fides-credential-explain");
    await page.waitForTimeout(300);
    const text = await page.evaluate(() => (document.querySelector("dialog.fides-ds-dialog[open]") || {}).textContent || "");
    check("detail Explain: lists provided and missing fields", /Provided:/.test(text) && /Not provided:/.test(text), text.slice(0, 120));
    check("detail Explain: scroll locked", await page.evaluate(() => document.documentElement.classList.contains("fides-ds-scroll-locked")));
    const closeVisible = await page.evaluate(() => {
      const d = document.querySelector("dialog.fides-ds-dialog[open]");
      const btn = d && d.querySelector("button");
      if (!btn) return false;
      const r = btn.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight;
    });
    check("detail Explain: close button in view at 390", closeVisible);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    check("detail Explain: Escape unlocks", !(await page.evaluate(() => document.documentElement.classList.contains("fides-ds-scroll-locked"))));
    const terms = page.locator("#details .fides-credential-explain");
    await terms.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const termsText = await page.evaluate(() => (document.querySelector("dialog.fides-ds-dialog[open]") || {}).textContent || "");
    check("Credentials & attestations: opens the shared dialog from Credential details", /Credentials & attestations/.test(termsText) && /QEAA: a qualified EAA/.test(termsText) && /Regulation \(EU\) 2024\/1183/.test(termsText), termsText.slice(0, 120));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    check("Credentials & attestations: focus returns to Explain", await page.evaluate(() => document.activeElement && document.activeElement.closest("#details") !== null));
    const like = page.locator(".fides-credential-like__button").first();
    const likeHref = await like.getAttribute("href");
    check("guest like: sign-in link with return", (likeHref || "").length > 0 && /return|redirect/i.test(likeHref), likeHref);
    await open(page, `${BASE}/fides-design-pilot/credential/?credential=cred:missing:nothing`);
    check("unknown id: missing state", await page.isVisible("text=This credential type is not in the current FIDES catalog."));
    await context.close();
  }

  // Classic listing unchanged.
  {
    const context = await newContext(browser, 1280);
    const page = await context.newPage();
    await open(page, CLASSIC);
    await page.waitForSelector("#fides-credential-catalog-root", { timeout: 30000 });
    await page.waitForTimeout(1500);
    check("classic listing: no pilot markup", (await page.getAttribute("#fides-credential-catalog-root", "data-design")) !== "pilot"
      && (await page.locator(".fides-credential-grid, .fides-credential-card, .fides-catalog-card").count()) > 0);
    await context.close();
  }

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`# pass ${results.length - failed}\n# fail ${failed}`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
