/**
 * Explore by theme / sector: targeted browser checks (EN and NL, 1440 and 390, plus JavaScript disabled).
 *
 *  - choice and URL (?theme= / ?sector=), the chosen item is marked with aria-current, result shown on the same page;
 *  - switching, Back/Forward, direct open, refresh;
 *  - keyboard: Tab reaches the choices, Enter and Space choose, focus moves to the result heading, a visible focus ring;
 *  - mobile: no horizontal overflow;
 *  - invalid slug and "other": no-choice state with a notice;
 *  - no JavaScript: choices are links, the overview is server rendered;
 *  - per choice: use cases are listed and "See all matching use cases" opens the filtered catalogue with the same count;
 *    every shown organisation / credential / wallet links to a detail page (relations are traced in the PHP test);
 *  - NL: all links stay on /nl/.
 *  Repair round 2026-11-14 (targets: products_trade_supply_chains, healthcare, agriculture, food; all counts come from
 *  tests/output/explore-themes-sectors-counts.json that explore-themes-sectors-behaviour.php writes):
 *  - compact catalog row cards: status badge text equals the record field, catalog image present exactly where the record has one;
 *  - each organisation once, exact headings and totals, listing only rows are plain text, every link answers 200 (1440);
 *  - "In N of these examples" is a native <details>, closed by default, anchors reach the example cards, keyboard reachable;
 *  - broken images (all image requests blocked): fallbacks show, logo boxes stay 40x40, no overflow, same page height class;
 *  - NL: catalog content is lang="en" and not translated, the catalog-content note, Learn stays "Learn", Dutch notice/empty state;
 *  - no featured image: the introduction uses the full width; Explore menu entries on desktop and in the mobile menu.
 * Nothing is submitted: GET navigation only. The empty-data state needs the fixture: tests/run-explore-themes-sectors-empty.sh.
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/explore-themes-sectors-checks.cjs   (env: PILOT_URL, WIDTHS, LOCALES, SAMPLE=all)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "EN,NL").split(",");
const THEMES = ["identity_access", "business_authority", "payments_commerce", "work_qualifications", "products_trade_supply_chains", "government_compliance"];
const SECTORS = ["agriculture", "construction", "digital", "education", "energy", "finance", "food", "healthcare", "manufacturing", "mobility", "public_sector", "retail", "supply_chain", "trade"];
const KINDS = [
  { kind: "theme", param: "theme", path: "themes/", slugs: THEMES, sample: ["business_authority", "identity_access"] },
  { kind: "sector", param: "sector", path: "sectors/", slugs: SECTORS, sample: ["healthcare", "agriculture"] },
];

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${detail})` : ""}`);
}
const prefix = (loc) => (loc === "NL" ? "/nl" : "") + "/fides-design-pilot/";
const COOKIES = Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE }));

async function newPage(browser, width, js = true) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", javaScriptEnabled: js });
  await ctx.addCookies(COOKIES);
  return ctx.newPage();
}
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const current = (p) => p.evaluate(() => Array.from(document.querySelectorAll(".fides-explore__choice[aria-current]")).map((a) => a.getAttribute("data-choice")));
const state = (p) => p.evaluate(() => (document.querySelector("[data-fides-explore-result] [data-fides-explore-state]") || {}).dataset?.fidesExploreState || "");


// ---------------------------------------------------------------------------------------------------------------------
// Repair round 2026-11-14
// ---------------------------------------------------------------------------------------------------------------------
const COUNTS_FILE = path.join(__dirname, "output", "explore-themes-sectors-counts.json");
const TARGETS = [
  { kind: "theme", param: "theme", path: "themes/", slug: "products_trade_supply_chains" },
  { kind: "sector", param: "sector", path: "sectors/", slug: "healthcare" },
  { kind: "sector", param: "sector", path: "sectors/", slug: "agriculture" },
  { kind: "sector", param: "sector", path: "sectors/", slug: "food" },
];
const WORDS = {
  EN: { prod: "In production", notProd: "Not in production", listing: "Listing only", invalid: /is not a (theme|sector) we know/, noChoice: /get started/, empty: "No examples yet", all: "Browse all use cases", note: null },
  NL: { prod: "In productie", notProd: "Niet in productie", listing: "Alleen vermeld", invalid: /geen (thema|sector) /, noChoice: /om te beginnen/, empty: "Nog geen voorbeelden", all: "Bekijk alle usecases", note: "Catalogusinhoud wordt in het Engels getoond." },
};
const norm = (t) => (t || "").replace(/\s+/g, " ").trim();

async function repairChecks(browser) {
  if (!fs.existsSync(COUNTS_FILE)) {
    check("counts file exists (run explore-themes-sectors-behaviour.php first)", false, COUNTS_FILE);
    return;
  }
  const counts = Object.fromEntries(JSON.parse(fs.readFileSync(COUNTS_FILE, "utf8")).map((r) => [`${r.kind}:${r.slug}`, r]));
  const enTitles = {};
  const statusOk = {};
  for (const loc of LOCALES) {
    const W = WORDS[loc];
    for (const width of WIDTHS) {
      for (const T of TARGETS) {
        const c = counts[`${T.kind}:${T.slug}`];
        const tag = `${loc} ${width} ${T.slug}`;
        const url = `${BASE}${prefix(loc)}${T.path}?${T.param}=${T.slug}`;
        const page = await newPage(browser, width);
        await page.goto(url, { waitUntil: "networkidle" });
        const n = c.shown;

        // Cards: compact catalog row cards, status and image from the record.
        const cards = await page.$$eval("#explore-use-cases .fides-ds-card--row", (els) => els.map((e) => ({
          title: (e.querySelector(".fides-ds-card__title") || {}).textContent || "",
          status: ((e.querySelector(".fides-explore__status") || {}).textContent || "").trim(),
          kind: (e.querySelector(".fides-explore__status") || {}).dataset ? (e.querySelector(".fides-explore__status") || {}).dataset.status : "",
          hasImg: !!e.querySelector(".fides-ds-card__img"),
          mediaW: Math.round(e.querySelector(".fides-ds-card__media").getBoundingClientRect().width),
          statusVisible: (() => { const s = e.querySelector(".fides-explore__status"); if (!s) return false; const cs = getComputedStyle(s); const r = s.getBoundingClientRect(); return cs.visibility !== "hidden" && cs.opacity === "1" && r.width > 0 && r.height > 0; })(),
        })));
        check(`${tag}: ${n} compact catalog cards`, cards.length === n, cards.length);
        check(`${tag}: every card shows its status badge (not hidden or faded)`, cards.every((x) => x.statusVisible));
        check(`${tag}: status badges equal the record field (${c.status.yes} ${W.prod}, ${c.status.no} ${W.notProd})`,
          cards.filter((x) => x.status === W.prod && x.kind === "production").length === c.status.yes && cards.filter((x) => x.status === W.notProd && x.kind === "not-production").length === c.status.no,
          JSON.stringify(cards.map((x) => x.status)));
        check(`${tag}: catalog image on exactly the use cases that have one (${c.withImage})`, cards.filter((x) => x.hasImg).length === c.withImage, cards.filter((x) => x.hasImg).length);
        check(`${tag}: card images are compact (media <= 128px)`, cards.every((x) => x.mediaW <= 128), JSON.stringify(cards.map((x) => x.mediaW)));
        if (loc === "EN") enTitles[T.slug] = cards.map((x) => norm(x.title));
        else check(`${tag}: use case titles stay English (not translated, no invented translation)`, JSON.stringify(cards.map((x) => norm(x.title))) === JSON.stringify(enTitles[T.slug]));

        // Relations: once each, exact headings and totals.
        const sections = await page.$$eval(".fides-explore__relations", (els) => els.map((e) => ({
          type: e.dataset.relation, total: +e.dataset.total,
          heading: (e.querySelector("h2") || {}).textContent || "",
          count: (e.querySelector(".fides-explore__count") || {}).textContent || "",
          names: Array.from(e.querySelectorAll(".fides-explore__row-name")).map((x) => (x.textContent || "").replace(/\s+/g, " ").replace(/→|Listing only|Alleen vermeld/g, "").trim().toLowerCase()),
          rows: e.querySelectorAll(".fides-explore__row").length,
          listingRows: Array.from(e.querySelectorAll('.fides-explore__row[data-detail="no"]')).map((r) => ({ links: r.querySelectorAll(".fides-explore__row-name a").length, badge: r.querySelectorAll(".fides-explore__badge").length })),
          detailRows: Array.from(e.querySelectorAll('.fides-explore__row[data-detail="yes"]')).map((r) => ({ links: r.querySelectorAll(".fides-explore__row-name a").length, badge: r.querySelectorAll(".fides-explore__badge").length })),
        })));
        const headingWord = { credentials: loc === "EN" ? "Credential types" : "Credentialtypen", organizations: loc === "EN" ? "Organisations" : "Organisaties", wallets: "Wallets" };
        for (const type of ["credentials", "organizations", "wallets"]) {
          const sec = sections.find((x) => x.type === type);
          if (c[type] === 0) { check(`${tag}: no ${type} section when the data has none`, !sec); continue; }
          if (!sec) { check(`${tag}: ${type} section present`, false); continue; }
          const expectedHeading = n === 1 ? `${headingWord[type]} ${loc === "EN" ? "in this example" : "in dit voorbeeld"}` : `${headingWord[type]} ${loc === "EN" ? `in these ${n} examples` : `in deze ${n} voorbeelden`}`;
          check(`${tag}: ${type} heading is exactly "${expectedHeading}"`, norm(sec.heading) === expectedHeading, norm(sec.heading));
          check(`${tag}: ${type} total ${c[type]} = unique records (data-total, sentence, rows)`, sec.total === c[type] && sec.rows === Math.min(c[type], 8) && new RegExp(`\\b${c[type]}\\b`).test(sec.count), `${sec.total}/${sec.rows}/${sec.count}`);
          check(`${tag}: ${type} each name once`, new Set(sec.names).size === sec.names.length, sec.names.join("|"));
          check(`${tag}: ${type} listing only rows are plain text with a label, linked rows have a link and no label`, sec.listingRows.every((r) => r.links === 0 && r.badge === 1) && sec.detailRows.every((r) => r.links === 1 && r.badge === 0));
        }
        check(`${tag}: no horizontal overflow`, await noOverflow(page));

        // Legend and language note.
        const legend = await page.locator("[data-fides-explore-legend]").count();
        check(`${tag}: legend explains arrow versus "${W.listing}"`, legend === 1 && (await page.locator("[data-fides-explore-legend]").innerText()).includes(loc === "EN" ? "Listing only" : "Alleen vermeld"));
        const langNote = await page.locator("[data-fides-explore-lang-note]").count();
        if (loc === "NL") {
          check(`${tag}: NL states that catalog content is English`, langNote === 1 && norm(await page.locator("[data-fides-explore-lang-note]").innerText()) === W.note);
          const marked = await page.$$eval("#explore-use-cases .fides-ds-card__link[lang=en][data-no-translation], #explore-use-cases .fides-ds-card__summary[lang=en]", (e) => e.length);
          check(`${tag}: NL card titles and summaries are lang="en"`, marked === 2 * n, marked);
          const rowNames = await page.$$eval(".fides-explore__row-name [lang=en]", (e) => e.length);
          const rowsAll = await page.locator(".fides-explore__row").count();
          check(`${tag}: NL record names are lang="en"`, rowNames === rowsAll, `${rowNames}/${rowsAll}`);
          check(`${tag}: page language is Dutch, the chrome around catalog content is Dutch`, (await page.evaluate(() => document.documentElement.lang)).toLowerCase().startsWith("nl") && /usecases/i.test(await page.locator("#explore-use-cases-title").innerText()));
        } else {
          check(`${tag}: EN has no language marks`, langNote === 0 && (await page.locator("[lang=en][data-no-translation]").count()) === 0);
        }

        // <details> instead of repeated titles: closed by default, anchors reach the cards.
        const firstDetails = page.locator(".fides-explore__from").first();
        if (await firstDetails.count()) {
          check(`${tag}: example lists are closed by default (no repeated titles)`, (await page.locator(".fides-explore__from[open]").count()) === 0 && (await page.locator(".fides-explore__from-list a:visible").count()) === 0);
          await page.locator(".fides-explore__from > summary").first().scrollIntoViewIfNeeded();
          await page.locator(".fides-explore__from > summary").first().click();
          const link = firstDetails.locator("a").first();
          const href = await link.getAttribute("href");
          check(`${tag}: opening shows the examples as anchors to the cards`, (await link.isVisible()) && /^#explore-example-\d$/.test(href || ""), href);
          await link.click();
          check(`${tag}: anchor jumps to the example card`, (await page.evaluate(() => location.hash)) === href && (await page.locator(href).isVisible()));
          // Keyboard: Tab from the result heading reaches the first summary, Enter opens it, a focus ring is visible.
          await page.goto(url, { waitUntil: "networkidle" });
          await page.locator("#fides-explore-selected-title").focus();
          let reached = false;
          for (let i = 0; i < 80 && !reached; i += 1) {
            await page.keyboard.press("Tab");
            reached = await page.evaluate(() => document.activeElement && document.activeElement.tagName === "SUMMARY");
          }
          const ringOk = reached && (await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0; }));
          check(`${tag}: Tab reaches the example list summary with a visible focus ring`, reached && ringOk);
          if (reached) {
            await page.keyboard.press("Enter");
            check(`${tag}: Enter opens the example list`, await page.evaluate(() => document.activeElement.parentElement.open));
          }
        }

        // Hero without image: introduction uses the width.
        const hero = await page.evaluate(() => {
          const h = document.querySelector(".fides-explore__hero");
          const i = document.querySelector(".fides-explore__intro");
          return { noImage: h.classList.contains("fides-explore__hero--no-image"), figures: h.querySelectorAll("figure, img").length, ratio: i ? i.getBoundingClientRect().width / h.getBoundingClientRect().width : 0 };
        });
        check(`${tag}: no featured image: no figure, no placeholder, introduction takes the width (${hero.ratio.toFixed(2)})`, hero.noImage && hero.figures === 0 && (width < 1100 || hero.ratio > 0.9) && hero.ratio > 0.85, JSON.stringify(hero));

        // Learn links keep the site name.
        if (loc === "NL") {
          const learn = await page.$$eval(".fides-explore__intro a", (as) => as.map((a) => a.textContent.trim()));
          check(`${tag}: Learn link text keeps "Learn" (no "Leren")`, learn.every((t) => /· Learn →$/.test(t) && !/Leren/.test(t)), learn.join("|"));
        }

        // Destinations (1440 only): every link answers 200 and shows a record page; same-language links on NL.
        if (width === WIDTHS[0]) {
          const hrefs = await page.$$eval(".fides-explore__row-name a, .fides-ds-card__link, .fides-ds-card__owner-link", (as) => Array.from(new Set(as.map((a) => a.href))));
          const bad = [];
          const wrongLang = [];
          for (const h of hrefs) {
            if (loc === "NL" && !h.startsWith(`${BASE}/nl/`)) wrongLang.push(h);
            const r = await page.context().request.get(h);
            const body = r.ok() ? await r.text() : "";
            if (r.status() !== 200 || /<title>Page not found/.test(body) || !/fides-(org|wallet|credential|uc|use-case)[a-z-]*(detail|page)|fides-ds-page/.test(body)) bad.push(`${r.status()} ${h}`);
          }
          check(`${tag}: all ${hrefs.length} destinations answer 200 with a record page${loc === "NL" ? " and stay on /nl/" : ""}`, bad.length === 0 && wrongLang.length === 0, bad.slice(0, 3).concat(wrongLang.slice(0, 2)).join(" | "));
        }

        // Logos and broken images.
        const logoBoxes = await page.$$eval(".fides-explore__logo", (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), e.querySelector("img") ? e.querySelector("img").getAttribute("loading") : "none"]; }));
        check(`${tag}: ${logoBoxes.length} organisation logo boxes are 40x40 and lazy`, logoBoxes.length === sections.find((x) => x.type === "organizations").rows && logoBoxes.every((b) => b[0] === 40 && b[1] === 40 && (b[2] === "lazy" || b[2] === "none")), JSON.stringify(logoBoxes.slice(0, 3)));
        const heightBefore = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.context().close();

        const blocked = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
        await blocked.addCookies(COOKIES);
        await blocked.route("**/*", (route) => (route.request().resourceType() === "image" ? route.abort() : route.continue()));
        const bp = await blocked.newPage();
        await bp.goto(url, { waitUntil: "networkidle" });
        await bp.evaluate(async () => {
          const frame = () => new Promise((r) => setTimeout(r, 80));
          // Logos inside closed <details> never load; open them so lazy images can start.
          document.querySelectorAll(".fides-explore details").forEach((d) => { d.open = true; });
          for (const img of Array.from(document.querySelectorAll(".fides-explore img"))) { img.scrollIntoView({ block: "center" }); await frame(); }
          // Scrolling alone is timing dependent in headless Chrome; make sure every lazy image really starts loading.
          document.querySelectorAll(".fides-explore img").forEach((img) => { img.loading = "eager"; });
          window.scrollTo(0, 0);
        });
        await bp.waitForFunction(() => document.querySelectorAll(".fides-explore img").length === 0, null, { timeout: 15000 }).catch(() => {});
        await bp.evaluate(() => document.querySelectorAll(".fides-explore details").forEach((d) => { d.open = false; }));
        const left = await bp.locator(".fides-explore img").count();
        const fallbacks = await bp.$$eval(".fides-explore .fides-ds-card__fallback", (els) => els.map((e) => ({ hidden: e.hidden || getComputedStyle(e).display === "none", text: e.textContent.trim() })));
        const boxes = await bp.$$eval(".fides-explore__logo", (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
        check(`${tag}: all images blocked: no broken image stays, fallbacks with text are shown (${fallbacks.length})`, left === 0 && fallbacks.length > 0 && fallbacks.every((f) => !f.hidden && f.text.length > 0), `${left} img, ${fallbacks.filter((f) => f.hidden || !f.text).length} bad; ` + JSON.stringify(await bp.$$eval(".fides-explore img", (els) => els.slice(0, 2).map((e) => [e.className, e.complete, e.naturalWidth, e.loading, e.outerHTML.slice(0, 160)]))));
        check(`${tag}: blocked logos keep the 40x40 box (no layout jump)`, boxes.every((b) => b[0] === 40 && b[1] === 40));
        check(`${tag}: blocked images: no overflow`, await noOverflow(bp));
        const heightAfter = await bp.evaluate(() => document.documentElement.scrollHeight);
        check(`${tag}: blocked images change the page height by at most 160px (${heightBefore} -> ${heightAfter})`, Math.abs(heightAfter - heightBefore) <= 160);
        await blocked.close();
      }
    }

    // Menu entries (Explore > Themes / Sectors) and NL states.
    for (const width of WIDTHS) {
      const tag = `${loc} ${width} menu`;
      const page = await newPage(browser, width);
      await page.goto(`${BASE}${prefix(loc)}themes/`, { waitUntil: "networkidle" });
      const label = { themes: loc === "EN" ? "Themes" : "Thema’s", sectors: loc === "EN" ? "Sectors" : "Sectoren" };
      if (width >= 1100) {
        await page.locator('.fides-ds-site-nav__toggle:has-text("Explore")').click();
        const ids = await page.locator('.fides-ds-site-nav__toggle:has-text("Explore")').getAttribute("aria-controls");
        const scope = page.locator(`#${ids}`);
        const tl = scope.locator("a", { hasText: new RegExp(`^\\s*${label.themes}\\s*→?\\s*$`) }).first();
        const sl = scope.locator("a", { hasText: new RegExp(`^\\s*${label.sectors}\\s*→?\\s*$`) }).first();
        check(`${tag}: Explore menu lists "${label.themes}" and "${label.sectors}"`, (await tl.isVisible()) && (await sl.isVisible()));
        const th = await tl.getAttribute("href");
        const sh = await sl.getAttribute("href");
        check(`${tag}: menu links go to the pilot pages${loc === "NL" ? " on /nl/" : ""}`, th.includes(`${loc === "NL" ? "/nl" : ""}/fides-design-pilot/themes/`) && sh.includes(`${loc === "NL" ? "/nl" : ""}/fides-design-pilot/sectors/`), `${th} ${sh}`);
        await sl.click();
        await page.waitForLoadState("load");
        check(`${tag}: the Sectors entry opens the Sectors page`, page.url().includes("/sectors/"));
      } else {
        await page.locator("[data-fides-ds-menu-open]").click();
        await page.evaluate(() => document.querySelectorAll("#fides-ds-menu details").forEach((d) => { d.open = true; }));
        const tl = page.locator("#fides-ds-menu a", { hasText: new RegExp(`^\\s*${label.themes}\\s*→?\\s*$`) }).first();
        const sl = page.locator("#fides-ds-menu a", { hasText: new RegExp(`^\\s*${label.sectors}\\s*→?\\s*$`) }).first();
        check(`${tag}: mobile menu lists "${label.themes}" and "${label.sectors}"`, (await tl.count()) === 1 && (await sl.count()) === 1);
        const box = await sl.boundingBox();
        check(`${tag}: mobile menu entries are inside the viewport`, box && box.x >= 0 && box.x + box.width <= width + 1, JSON.stringify(box));
      }
      await page.context().close();
    }

    // Dutch/English states: no choice, invalid choice (and empty data when the fixture is installed).
    for (const T of [KINDS[0], KINDS[1]]) {
      const page = await newPage(browser, 390);
      await page.goto(`${BASE}${prefix(loc)}${T.path}`, { waitUntil: "networkidle" });
      check(`${loc} ${T.kind}: no choice state reads ${loc === "NL" ? "Dutch" : "English"}`, W.noChoice.test(await page.locator(".fides-explore__start-title").innerText()));
      await page.goto(`${BASE}${prefix(loc)}${T.path}?${T.param}=nonsense`, { waitUntil: "networkidle" });
      check(`${loc} ${T.kind}: invalid slug notice reads ${loc === "NL" ? "Dutch" : "English"}`, W.invalid.test(await page.locator(".fides-explore__notice").innerText()));
      if (process.env.EMPTY_FIXTURE === "1") {
        await page.goto(`${BASE}${prefix(loc)}${T.path}?${T.param}=${T.sample[0]}&fides_explore_fixture=empty`, { waitUntil: "networkidle" });
        const empty = await page.locator("[data-fides-explore-state=empty]").innerText();
        check(`${loc} ${T.kind}: empty data shows "${W.empty}" and "${W.all}"${loc === "NL" ? " in Dutch with the Dutch message" : ""}`, empty.includes(W.empty) && empty.includes(W.all) && (loc === "EN" || /De catalogus bevat hier nog geen gepubliceerde usecase/.test(empty)), empty.slice(0, 120));
        check(`${loc} ${T.kind}: empty data keeps the choices and has no overflow`, (await page.locator(".fides-explore__choice").count()) === T.slugs.length && (await noOverflow(page)));
      }
      await page.context().close();
    }
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  if (process.env.ONLY_REPAIR !== "1") for (const loc of LOCALES) {
    for (const width of WIDTHS) {
      for (const K of KINDS) {
        const tag = `${loc} ${width} ${K.kind}`;
        const url = (slug) => `${BASE}${prefix(loc)}${K.path}${slug ? `?${K.param}=${slug}` : ""}`;
        const page = await newPage(browser, width);
        await page.goto(url(), { waitUntil: "networkidle" });
        const total = await page.locator(".fides-explore__choice").count();
        check(`${tag}: no-choice state with ${K.slugs.length} visible choices, no dropdown`, total === K.slugs.length && (await state(page)) === "none" && (await page.locator("select").count()) === 0, `${total}/${await state(page)}`);
        check(`${tag}: "Other" is never offered`, (await page.locator(".fides-explore__choice", { hasText: /^\s*(Other|Overig)\b/ }).count()) === 0);
        check(`${tag}: no horizontal overflow (none)`, await noOverflow(page));

        // Direct open + refresh
        const sample = K.sample[0];
        await page.goto(url(sample), { waitUntil: "networkidle" });
        check(`${tag}: direct open marks exactly the chosen item (aria-current)`, JSON.stringify(await current(page)) === JSON.stringify([sample]), JSON.stringify(await current(page)));
        check(`${tag}: chosen state shows use cases and no horizontal overflow`, (await state(page)) === "selected" && (await page.locator(".fides-explore__cards li").count()) > 0 && (await noOverflow(page)));
        await page.reload({ waitUntil: "networkidle" });
        check(`${tag}: refresh keeps the choice`, JSON.stringify(await current(page)) === JSON.stringify([sample]));

        // Switch by click, then Back / Forward
        const other = K.sample[1];
        await page.locator(`.fides-explore__choice[data-choice="${other}"]`).click();
        await page.waitForFunction((s) => document.querySelector(`.fides-explore__choice[data-choice="${s}"][aria-current]`), other);
        check(`${tag}: click switches in place, URL updated, focus on the result heading`, page.url().includes(`${K.param}=${other}`) && (await page.evaluate(() => document.activeElement && document.activeElement.id)) === "fides-explore-selected-title", page.url());
        await page.goBack();
        await page.waitForFunction((s) => document.querySelector(`.fides-explore__choice[data-choice="${s}"][aria-current]`), sample);
        check(`${tag}: Back restores the previous choice`, JSON.stringify(await current(page)) === JSON.stringify([sample]));
        await page.goForward();
        await page.waitForFunction((s) => document.querySelector(`.fides-explore__choice[data-choice="${s}"][aria-current]`), other);
        check(`${tag}: Forward restores the next choice`, JSON.stringify(await current(page)) === JSON.stringify([other]));

        // Keyboard
        await page.goto(url(), { waitUntil: "networkidle" });
        const first = page.locator(".fides-explore__choice").first();
        await first.focus();
        const ring = await first.evaluate((el) => { const s = getComputedStyle(el); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 || s.boxShadow !== "none"; });
        check(`${tag}: focus ring visible on a choice`, ring);
        await page.keyboard.press("Tab");
        const second = await page.evaluate(() => document.activeElement.getAttribute("data-choice"));
        const expected = await page.locator(".fides-explore__choice").nth(1).getAttribute("data-choice");
        check(`${tag}: Tab moves through the choices in order`, second === expected, second);
        await page.keyboard.press("Enter");
        await page.waitForFunction(() => document.querySelector(".fides-explore__choice[aria-current]"));
        check(`${tag}: Enter chooses and moves focus to the result heading`, (await page.evaluate(() => document.activeElement && document.activeElement.id)) === "fides-explore-selected-title");
        await page.locator(".fides-explore__choice").nth(2).focus();
        await page.keyboard.press("Space");
        await page.waitForFunction((i) => document.querySelectorAll(".fides-explore__choice")[i].hasAttribute("aria-current"), 2);
        check(`${tag}: Space chooses`, (await current(page)).length === 1);

        // Invalid slug and "other"
        for (const bad of ["nonsense", "other"]) {
          await page.goto(url(bad), { waitUntil: "networkidle" });
          check(`${tag}: invalid "${bad}" falls back to no-choice with a notice`, (await state(page)) === "none" && (await page.locator(".fides-explore__notice, [role=status], .fides-explore__invalid").count()) > 0 && (await current(page)).length === 0);
        }
        await page.context().close();

        // No JavaScript
        const nojs = await newPage(browser, width, false);
        await nojs.goto(url(sample), { waitUntil: "load" });
        const hrefs = await nojs.$$eval(".fides-explore__choice", (as) => as.map((a) => a.getAttribute("href")));
        check(`${tag}: no JS: choices are real links and the overview is server rendered`, hrefs.length === K.slugs.length && hrefs.every((h) => h.includes(`${K.param}=`)) && (await nojs.locator(".fides-explore__cards li").count()) > 0);
        await nojs.locator(`.fides-explore__choice[data-choice="${other}"]`).click();
        await nojs.waitForLoadState("load");
        check(`${tag}: no JS: clicking a choice loads the chosen overview`, JSON.stringify(await current(nojs)) === JSON.stringify([other]));
        await nojs.context().close();

        // Per choice: data and catalogue links (all choices on 1440; a sample otherwise)
        if (width === WIDTHS[0] || process.env.SAMPLE === "all") {
          const p = await newPage(browser, width);
          for (const slug of K.slugs) {
            await p.goto(url(slug), { waitUntil: "domcontentloaded" });
            const cards = await p.locator(".fides-explore__cards li").count();
            const all = p.locator(".fides-explore__use-cases a.fides-ds-action-link, #explore-use-cases a.fides-ds-action-link").last();
            const href = (await all.count()) ? await all.getAttribute("href") : "";
            const links = await p.$$eval("#explore-use-cases a, #explore-credentials a, #explore-organisations a, #explore-wallets a", (as) => as.map((a) => a.getAttribute("href") || ""));
            const wrongLang = loc === "NL" ? links.filter((h) => h.startsWith("/") && !h.startsWith("/nl/") && !h.startsWith("#")) : [];
            const countText = (await p.locator(".fides-explore__count").first().textContent()) || "";
            const n = /^(One|Eén)/.test(countText.trim()) ? 1 : Math.max(...(countText.match(/\d+/g) || [0]).map(Number)); // EN "Showing 4 of 25" / NL "4 van de 25": the largest number is the total
            if (K.sample.includes(slug)) {
              // The filtered catalogue (first page, 24 per page) must hold exactly the stated number of use cases.
              await p.goto(href, { waitUntil: "networkidle" });
              const listed = await p.locator(".fides-uc-pilot__list .fides-ds-card").count();
              check(`${tag}/${slug}: "See all matching use cases" opens the filtered catalogue with ${n} use case(s)`, listed === Math.min(n, 24), `${listed} listed, ${n} stated`);
              await p.goto(url(slug), { waitUntil: "domcontentloaded" });
            }
            check(`${tag}/${slug}: yields data (${cards} use case cards), catalogue link present, no empty hrefs${loc === "NL" ? ", stays on /nl/" : ""}`, cards > 0 && href.includes("overview") && links.every((h) => h) && wrongLang.length === 0, `${cards} ${href} ${wrongLang.slice(0, 2)}`);
          }
          await p.context().close();
        }
      }
    }
  }
  await repairChecks(browser);
  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
})();
