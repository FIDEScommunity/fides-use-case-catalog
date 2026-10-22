/**
 * Credential overview and detail browser checks (Paper 20.7 / 20.8 /
 * 20.18 / 20.19 / 20.33–20.35).
 *
 * Overview: rows, search only on Enter / Search (including attribute names),
 * filters and the TS11 metadata flag in the URL, reload keeps state, sort,
 * list / grid, pager, zero results, old ?credential= deeplinks, Back with
 * filters and focus, TS11 Explain dialog (scroll lock, Escape, focus return),
 * mobile Filters dialog (Apply / Cancel, scroll lock).
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
  const text = await page.textContent("[data-pilot-count]");
  const match = String(text || "").match(/(\d+)/);
  return match ? Number(match[1]) : -1;
}

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
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
  const browser = await chromium.launch();
  const errors = [];

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

    // Sort, view mode, pager.
    await open(page, OVERVIEW);
    await overviewReady(page);
    await page.selectOption(".fides-uc-pilot__sort-select", "name");
    await page.waitForTimeout(300);
    check("sort: sort=name in the URL", new URL(page.url()).searchParams.get("sort") === "name");
    const names = await page.$$eval(".fides-ds-card__title", (els) => els.slice(0, 5).map((e) => e.textContent.trim().toLowerCase()));
    check("sort: names ascending", names.join("|") === [...names].sort((a, b) => a.localeCompare(b)).join("|"), names.join(" | "));
    await page.click("[data-pilot-view-mode='grid']");
    await page.waitForTimeout(300);
    check("view: grid shows tiles", (await page.locator(".fides-ds-cards--tiles .fides-ds-card--tile").count()) > 0);
    await page.reload({ waitUntil: "domcontentloaded" });
    await overviewReady(page);
    check("view: grid remembered after reload", (await page.locator(".fides-ds-card--tile").count()) > 0);
    await page.click("[data-pilot-view-mode='list']");
    await page.waitForTimeout(200);
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

  // ---------- Overview, tablet and mobile ----------
  for (const width of [768, 390, 320]) {
    const context = await newContext(browser, width);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`overview ${width}: ${e.message}`));
    await open(page, OVERVIEW);
    await overviewReady(page);
    check(`overview ${width}: no horizontal overflow`, (await overflow(page)) <= 0);
    check(`overview ${width}: list only (no view toggle)`, !(await page.isVisible(".fides-credential-pilot__view")));
    const toggle = page.locator("[data-pilot-open]");
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(300);
      check(`filters ${width}: dialog locks background scroll`, await page.evaluate(() => document.documentElement.classList.contains("fides-ds-scroll-locked")));
      check(`filters ${width}: TS11 flag inside the dialog`, await page.isVisible("#fides-credential-pilot-filter-panel [data-pilot-flag='ts11CompliantOnly']"));
      const close = page.locator("#fides-credential-pilot-filter-panel .fides-uc-pilot__panel-close");
      const apply = page.locator("#fides-credential-pilot-filter-panel [data-pilot-apply]");
      check(`filters ${width}: close and apply reachable`, (await close.isVisible()) && (await apply.isVisible()));
      await page.check("#fides-credential-pilot-filter-panel [data-pilot-flag='ts11CompliantOnly']");
      await page.waitForTimeout(200);
      check(`filters ${width}: change stays pending until Apply`, new URL(page.url()).searchParams.get("ts11") === null);
      const applyText = (await apply.textContent()) || "";
      check(`filters ${width}: Apply shows the pending count`, /Show 19 credential types/.test(applyText), applyText);
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
      check(`filters ${width}: inline filters and TS11 flag visible`, (await page.isVisible("[data-pilot-key='vcFormat']")) && (await page.isVisible("[data-pilot-flag='ts11CompliantOnly']")));
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
    const group = (key) => {
      const list = document.getElementById(`eco-${key}-list`);
      if (!list) return null;
      const rows = [...list.children];
      const toggle = list.nextElementSibling && list.nextElementSibling.classList.contains("fides-ds-show-all__toggle") ? list.nextElementSibling : null;
      const catalog = list.parentElement.querySelector(".fides-credential-eco__catalog");
      const body = document.getElementById(`eco-${key}-body`);
      const head = list.closest(".fides-credential-eco__group").querySelector(".fides-ds-collapsible__toggle");
      return {
        total: rows.length,
        visible: rows.filter((li) => li.offsetParent !== null).length,
        toggle: toggle ? { text: toggle.textContent.trim(), expanded: toggle.getAttribute("aria-expanded"), visible: toggle.offsetParent !== null } : null,
        catalog: !!catalog && catalog.offsetParent !== null,
        bodyVisible: !!body && body.offsetParent !== null,
        accordion: head ? { expanded: head.getAttribute("aria-expanded"), height: Math.round(head.getBoundingClientRect().height) } : null,
      };
    };
    const eco = document.querySelector(".fides-credential-eco");
    const top = (sel) => { const el = document.querySelector(sel); return el ? Math.round(el.getBoundingClientRect().top + scrollY) : null; };
    const scrollers = eco ? [...eco.querySelectorAll("*")].filter((el) => /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1).length : -1;
    return {
      issuers: group("issuers"),
      rps: group("rps"),
      scrollers,
      order: { main: top(".fides-credential-detail .fides-uc-detail__main"), eco: top(".fides-credential-eco"), closing: top("#listing") },
      width: eco ? Math.round(eco.getBoundingClientRect().width) : 0,
      layoutWidth: Math.round(document.querySelector(".fides-credential-detail__body").getBoundingClientRect().width),
    };
  });
  for (const width of [1440, 390, 320]) {
    const context = await newContext(browser, width);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`eco ${width}: ${e.message}`));
    await open(page, DETAIL + encodeURIComponent("cred:eu:age-verification"));
    await page.waitForSelector(".fides-credential-eco");
    await page.waitForTimeout(300);
    const tag = `eco AV ${width}`;
    let s = await ecoState(page);
    check(`${tag}: both groups with records`, s.issuers && s.rps && s.issuers.total > 3 && s.rps.total > 3, JSON.stringify([s.issuers && s.issuers.total, s.rps && s.rps.total]));
    check(`${tag}: below main and aside, above the closing`, s.order.eco > s.order.main && s.order.eco < s.order.closing, JSON.stringify(s.order));
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    check(`${tag}: no internal scroll areas`, s.scrollers === 0, String(s.scrollers));
    const headCount = await page.textContent("#eco-issuers-title");
    check(`${tag}: heading count follows the data`, headCount.includes(String(s.issuers.total)), headCount);

    if (width >= 1100) {
      check(`${tag}: full content width`, s.width >= s.layoutWidth - 2, `${s.width}/${s.layoutWidth}`);
      const tops = await page.evaluate(() => [...document.querySelectorAll(".fides-credential-eco__group")].map((g) => Math.round(g.getBoundingClientRect().top)));
      check(`${tag}: groups side by side`, tops.length === 2 && tops[0] === tops[1], JSON.stringify(tops));
      check(`${tag}: three rows per group by default`, s.issuers.visible === 3 && s.rps.visible === 3, `${s.issuers.visible}/${s.rps.visible}`);
      check(`${tag}: View all N per group`, s.issuers.toggle && s.issuers.toggle.text.startsWith(`View all ${s.issuers.total}`) && s.rps.toggle.text.startsWith(`View all ${s.rps.total}`), `${s.issuers.toggle && s.issuers.toggle.text} | ${s.rps.toggle && s.rps.toggle.text}`);
      check(`${tag}: catalog route hidden while collapsed`, !s.issuers.catalog && !s.rps.catalog);

      await page.locator("#eco-issuers-list + .fides-ds-show-all__toggle").focus();
      await page.keyboard.press("Enter");
      s = await ecoState(page);
      check(`${tag}: keyboard View all expands only the issuers`, s.issuers.visible === s.issuers.total && s.rps.visible === 3, `${s.issuers.visible}/${s.rps.visible}`);
      check(`${tag}: issuer catalog route under the full list`, s.issuers.catalog && !s.rps.catalog);
      check(`${tag}: toggle becomes Show fewer`, s.issuers.toggle.expanded === "true" && /Show fewer issuers/.test(s.issuers.toggle.text), s.issuers.toggle.text);
      const catalogHref = await page.getAttribute("#eco-issuers-body .fides-credential-eco__catalog a", "href");
      check(`${tag}: catalog route lists the issuers`, /[?&]issuers=/.test(catalogHref || ""), catalogHref);

      await page.click("#eco-rps-list + .fides-ds-show-all__toggle");
      s = await ecoState(page);
      check(`${tag}: relying parties expand independently`, s.rps.visible === s.rps.total && s.issuers.visible === s.issuers.total);

      const toggle = page.locator("#eco-issuers-list + .fides-ds-show-all__toggle");
      await toggle.scrollIntoViewIfNeeded();
      await toggle.focus();
      const toggleTop = () => page.evaluate(() => Math.round(document.querySelector("#eco-issuers-list + .fides-ds-show-all__toggle").getBoundingClientRect().top));
      const topBefore = await toggleTop();
      await page.keyboard.press("Space");
      await page.waitForTimeout(100);
      s = await ecoState(page);
      const topAfter = await toggleTop();
      const focused = await page.evaluate(() => document.activeElement === document.querySelector("#eco-issuers-list + .fides-ds-show-all__toggle"));
      check(`${tag}: Show fewer collapses only the issuers`, s.issuers.visible === 3 && s.rps.visible === s.rps.total, `${s.issuers.visible}/${s.rps.visible}`);
      check(`${tag}: Show fewer keeps focus and the button in place`, focused && Math.abs(topAfter - topBefore) <= 1 && topAfter >= 0 && topAfter < 900, `${topBefore} -> ${topAfter}`);

      await page.locator("#eco-issuers-list .fides-credential-eco__row").first().focus();
      const focusRing = await page.evaluate(() => {
        const cs = getComputedStyle(document.activeElement);
        return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2;
      });
      check(`${tag}: row has a visible keyboard focus`, focusRing);
      await page.hover("#eco-rps-list .fides-credential-eco__row >> nth=0");
      await page.waitForTimeout(250);
      const hoverBg = await page.evaluate(() => getComputedStyle(document.querySelector("#eco-rps-list .fides-credential-eco__row")).backgroundColor);
      check(`${tag}: row hover is light blue`, hoverBg === "rgb(241, 246, 255)", hoverBg);
      const rowHref = await page.getAttribute("#eco-rps-list .fides-credential-eco__row >> nth=0", "href");
      check(`${tag}: rows open the existing record route`, /[?&]rp=/.test(rowHref || ""), rowHref);
    } else {
      const tops = await page.evaluate(() => [...document.querySelectorAll(".fides-credential-eco__group")].map((g) => Math.round(g.getBoundingClientRect().top)));
      check(`${tag}: groups stacked`, tops.length === 2 && tops[1] > tops[0], JSON.stringify(tops));
      check(`${tag}: accordions closed by default`, s.issuers.accordion && s.issuers.accordion.expanded === "false" && s.rps.accordion.expanded === "false" && !s.issuers.bodyVisible && !s.rps.bodyVisible);
      check(`${tag}: accordion heads at least 56px`, s.issuers.accordion.height >= 56 && s.rps.accordion.height >= 56, `${s.issuers.accordion.height}/${s.rps.accordion.height}`);

      await page.locator("#eco-rps-title .fides-ds-collapsible__toggle").focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      s = await ecoState(page);
      check(`${tag}: keyboard opens the relying parties with the full list`, s.rps.accordion.expanded === "true" && s.rps.visible === s.rps.total, `${s.rps.visible}/${s.rps.total}`);
      check(`${tag}: issuers stay closed`, s.issuers.accordion.expanded === "false" && !s.issuers.bodyVisible);
      check(`${tag}: catalog route under the open list`, s.rps.catalog);
      check(`${tag}: Show fewer offered in the open group`, s.rps.toggle && /Show fewer relying parties/.test(s.rps.toggle.text), s.rps.toggle && s.rps.toggle.text);
      const stacked = await page.evaluate(() => {
        const row = document.querySelector("#eco-rps-list .fides-credential-eco__row");
        const meta = row.querySelector(".fides-credential-eco__meta");
        const status = row.querySelector(".fides-credential-eco__slot");
        return !!meta && !!status && status.getBoundingClientRect().top >= meta.getBoundingClientRect().bottom - 1;
      });
      check(`${tag}: status sits under the organization`, stacked);
      await page.click("#eco-issuers-title .fides-ds-collapsible__toggle");
      s = await ecoState(page);
      check(`${tag}: second group opens independently`, s.issuers.accordion.expanded === "true" && s.rps.accordion.expanded === "true" && s.issuers.visible === s.issuers.total);
      const small = await smallTargets(page, ".fides-credential-eco .fides-ds-collapsible__toggle, .fides-credential-eco .fides-ds-show-all__toggle, .fides-credential-eco__row, .fides-credential-eco a");
      check(`${tag}: targets at least 44px`, small.length === 0, small.slice(0, 4).join(", "));
      const wallets = await page.textContent(".fides-credential-eco__wallets").catch(() => "");
      check(`${tag}: wallets named as an indirect route`, /linked through these relying parties/.test(wallets) && /do not guarantee/.test(wallets), wallets.slice(0, 120));
    }
    const closing = await page.textContent("#listing");
    check(`${tag}: closing kept`, /Help keep this credential type current\./.test(closing) && /Updated/.test(closing));
    await page.screenshot({ path: path.join(OUT, `ecosystem-age-verification-${width}.png`), fullPage: true });
    await context.close();
  }
  {
    const context = await newContext(browser, 1440);
    const page = await context.newPage();
    await open(page, DETAIL + encodeURIComponent("cred:eu:ehic"));
    await page.waitForSelector(".fides-credential-eco");
    await page.waitForTimeout(300);
    const s = await ecoState(page);
    check("eco EHIC 1440: up to three relying parties need no View all", s.rps && s.rps.total <= 3 && !s.rps.toggle && s.rps.visible === s.rps.total, JSON.stringify(s.rps));
    check("eco EHIC 1440: catalog route shown for the full short list", s.rps.total < 2 || s.rps.catalog);
    await open(page, DETAIL + encodeURIComponent("cred:webuild:eucc"));
    await page.waitForSelector(".fides-credential-detail");
    check("eco EUCC 1440: empty relying-party group left out", (await page.locator("#eco-issuers-list").count()) === 1 && (await page.locator("#eco-rps-list").count()) === 0);
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
