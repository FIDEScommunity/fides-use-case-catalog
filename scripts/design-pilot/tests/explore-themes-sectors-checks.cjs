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
 * ONLY_MAIN=1 runs only the general checks above; ONLY_ROUND2=1 only the UX round checks; ONLY_ROUND4=1 only round 4 ("More from the catalog": parts per catalog type, basis, links with counts, follow-and-back, dedupe, low data, no use cases, EN/NL, 1440/390; needs output/explore-catalog-block.json from the behaviour test run with ONLY_ROUND4=1); ONLY_ROUND3=1 only round 3 (section anchors with Back/Forward and final scroll, listener clean-up after repeated switches, mobile picker with #fides-explore-choices with and without JavaScript, translated status message; TILES_JS_OVERRIDE=<file> serves another design-system.js as a negative control). Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/explore-themes-sectors-checks.cjs   (env: PILOT_URL, WIDTHS, LOCALES, SAMPLE=all)
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
  EN: { prod: "In production", notProd: "Not in production", listing: "Listing only", onPage: "On this page", related1: "Related use case", relatedN: (n) => `${n} related use cases`, change: { sector: "Change sector", theme: "Change theme" }, invalid: /is not a (theme|sector) we know/, noChoice: /get started/, empty: "No examples yet", all: "Browse all use cases", note: null },
  NL: { prod: "In productie", notProd: "Niet in productie", listing: "Alleen vermeld", onPage: "Op deze pagina", related1: "Gerelateerde usecase", relatedN: (n) => `${n} gerelateerde usecases`, change: { sector: "Sector wijzigen", theme: "Thema wijzigen" }, invalid: /geen (thema|sector) /, noChoice: /om te beginnen/, empty: "Nog geen voorbeelden", all: "Bekijk alle usecases", note: "Catalogusinhoud wordt in het Engels getoond." },
};
const norm = (t) => (t || "").replace(/\s+/g, " ").trim();
// Below 1100px the list is folded away after a choice; "Change sector / theme" opens it (also works without JavaScript via #anchor).
const NARROW = (w) => w < 1100;
async function openPicker(page, width) {
  if (NARROW(width) && (await page.locator(".fides-explore__choices").first().isHidden())) await page.locator("[data-fides-explore-change]").first().click();
}

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
          names: Array.from(e.querySelectorAll(".fides-explore__row-name")).map((x) => (x.textContent || "").replace(/\s+/g, " ").replace(/→/g, "").trim().toLowerCase()),
          rows: e.querySelectorAll(".fides-explore__row").length,
          listingRows: Array.from(e.querySelectorAll('.fides-explore__row[data-detail="no"]')).map((r) => ({ links: r.querySelectorAll(".fides-explore__row-name a").length, badge: r.querySelectorAll(".fides-explore__badge").length })),
          detailRows: Array.from(e.querySelectorAll('.fides-explore__row[data-detail="yes"]')).map((r) => ({ links: r.querySelectorAll(".fides-explore__row-name a").length, badge: r.querySelectorAll(".fides-explore__badge").length })),
        })));
        const headingWord = { credentials: loc === "EN" ? "Credential types" : "Credentialtypen", organizations: loc === "EN" ? "Organisations" : "Organisaties", wallets: "Wallets" };
        for (const type of ["credentials", "organizations", "wallets"]) {
          const sec = sections.find((x) => x.type === type);
          if (c[type] === 0) { check(`${tag}: no ${type} section when the data has none`, !sec); continue; }
          if (!sec) { check(`${tag}: ${type} section present`, false); continue; }
          const expectedHeading = headingWord[type];
          check(`${tag}: ${type} heading is exactly "${expectedHeading}" (the examples are named once above, not in every heading)`, norm(sec.heading) === expectedHeading, norm(sec.heading));
          check(`${tag}: ${type} total ${c[type]} = unique records (data-total, rows); no repeated sentence about duplicates`, sec.total === c[type] && sec.rows === Math.min(c[type], 8) && sec.count === "", `${sec.total}/${sec.rows}/${sec.count}`);
          check(`${tag}: ${type} each name once`, new Set(sec.names).size === sec.names.length, sec.names.join("|"));
          check(`${tag}: ${type} rows without a catalog page are plain text (no link, no label), rows with one have a link with an arrow`, sec.listingRows.every((r) => r.links === 0 && r.badge === 0) && sec.detailRows.every((r) => r.links === 1 && r.badge === 0));
        }
        check(`${tag}: no horizontal overflow`, await noOverflow(page));

        // One sentence about the lists, no "Listing only" label, no legend; language note.
        const body = norm(await page.locator(".fides-explore").innerText());
        check(`${tag}: the lists are explained once, no legend, no "${W.listing}", no repeated duplicate explanation`, (await page.locator("[data-fides-explore-relations-note]").count()) === 1 && !body.includes(W.listing) && (await page.locator("[data-fides-explore-legend]").count()) === 0 && !/Each is listed once|Elk item staat/.test(body));
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
          await page.locator("#fides-explore-title").focus();
          let reached = false;
          for (let i = 0; i < 150 && !reached; i += 1) {
            await page.keyboard.press("Tab");
            reached = await page.evaluate(() => document.activeElement && document.activeElement.tagName === "SUMMARY" && !!document.activeElement.closest(".fides-explore__from"));
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


// ---------------------------------------------------------------------------------------------------------------------
// UX repair round 2026-11-14 (b): chosen name as H1, folded list on phones, editorial order, shorter relations, section bar.
// Targets: sectors/?sector=education and themes/?theme=business_authority, direct link and no-choice state, 1440 and 390, EN and NL.
// ---------------------------------------------------------------------------------------------------------------------
const R2 = [
  { kind: "theme", param: "theme", path: "themes/", slug: "business_authority", other: "identity_access", name: { EN: "Business & Mandates", NL: "Bedrijven en mandaten" }, page: { EN: "Explore by theme", NL: "Ontdek per theme".replace("theme", "thema") }, first: [/^Business Wallet-Based KYB/, /^From Document Trust/] },
  { kind: "sector", param: "sector", path: "sectors/", slug: "education", other: "healthcare", name: { EN: "Education", NL: "Onderwijs" }, page: { EN: "Explore by sector", NL: "Ontdek per sector" }, first: [/Verification of Education Credentials/, /Academic Credential/] },
];

// Geometry checks need the final scroll position at once: the site scrolls smoothly, and headless Chrome ignores reduced motion for that.
const calm = (page) => page.addStyleTag({ content: "html{scroll-behavior:auto !important}" });

async function calmCss(ctx) {
  await ctx.route(/design-system\.css/, async (route) => {
    const r = await route.fetch();
    await route.fulfill({ response: r, body: `${await r.text()}\nhtml{scroll-behavior:auto !important}` });
  });
}

async function round2Checks(browser) {
  const info = [];
  for (const loc of LOCALES) {
    const W = WORDS[loc];
    for (const width of WIDTHS) {
      for (const T of R2) {
        const tag = `${loc} ${width} ${T.kind}`;
        const base = `${BASE}${prefix(loc)}${T.path}`;
        const wide = !NARROW(width);

        // No choice: page name as H1, every choice visible at every width, no phone action, no section bar.
        let page = await newPage(browser, width);
        await page.goto(base, { waitUntil: "networkidle" });
        const total = await page.locator(".fides-explore__choice").count();
        const visible = await page.locator(".fides-explore__choice:visible").count();
        check(`${tag} no choice: H1 is "${T.page[loc]}"`, norm(await page.locator("h1").innerText()) === T.page[loc] && (await page.locator("h1").count()) === 1, norm(await page.locator("h1").allInnerTexts().then((a) => a.join("|"))));
        check(`${tag} no choice: all ${total} choices visible, no Change action, no section bar`, total > 0 && visible === total && (await page.locator("[data-fides-explore-change]").count()) === 0 && (await page.locator("[data-fides-explore-sections]").count()) === 0, `${visible}/${total}`);
        await page.context().close();

        // Direct link: the chosen name is the H1 and the document title.
        page = await newPage(browser, width);
        await page.goto(`${base}?${T.param}=${T.slug}`, { waitUntil: "networkidle" });
        await calm(page);
        check(`${tag} direct link: H1 is the chosen name "${T.name[loc]}", one H1, in the document title`, norm((await page.locator("h1").allInnerTexts()).join("|")) === T.name[loc] && (await page.title()).includes(T.name[loc].replace("&", "&")) , `${(await page.locator("h1").allInnerTexts()).join("|")} / ${await page.title()}`);
        const change = page.locator("[data-fides-explore-change]").first();
        const changeLabel = W.change[T.kind];
        if (wide) {
          check(`${tag} desktop: all choices stay visible, no Change action`, (await page.locator(".fides-explore__choice:visible").count()) === total && !(await change.isVisible()));
        } else {
          check(`${tag} phone: the list is folded, the Change action "${changeLabel}" sits by the name`, (await page.locator(".fides-explore__choices").isHidden()) && (await change.isVisible()) && norm(await change.innerText()) === changeLabel, norm(await change.innerText()));
          const h1Box = await page.locator("h1").boundingBox();
          const chBox = await change.boundingBox();
          check(`${tag} phone: the action is compact (one line, at most 44px tall) and close to the name`, chBox.height <= 48 && Math.abs(chBox.y - h1Box.y) < 120, JSON.stringify([h1Box, chBox]));
        }
        check(`${tag}: no horizontal overflow`, await noOverflow(page));

        // Editorial order: recognisable examples first, catalog cards with the shared badge style.
        const titles = await page.$$eval("#explore-use-cases .fides-ds-card__title", (e) => e.map((x) => x.textContent.replace(/\s+/g, " ").replace(/→/, "").trim()));
        check(`${tag} order: first card ${T.first[0]}, second ${T.first[1]}`, T.first[0].test(titles[0]) && T.first[1].test(titles[1]), titles.slice(0, 3).join(" | "));
        info.push(`${tag}: ${titles.join(" || ")}`);
        const badge = await page.$eval("#explore-use-cases .fides-ds-card__status", (e) => { const c = getComputedStyle(e); return [c.backgroundColor, c.borderTopColor, c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.color]; });
        const ov = await page.context().newPage();
        await ov.goto(`${BASE}${prefix(loc)}overview/?${T.param}=${T.slug}`, { waitUntil: "networkidle" });
        const ovBadge = await ov.$eval(".fides-uc-pilot__list .fides-ds-card__status", (e) => { const c = getComputedStyle(e); return [c.backgroundColor, c.borderTopColor, c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.color]; });
        check(`${tag} badge: same style as the status badge of the catalog cards`, JSON.stringify(badge) === JSON.stringify(ovBadge), `${JSON.stringify(badge)} vs ${JSON.stringify(ovBadge)}`);
        await ov.close();

        // Relations: one explanation, short summaries, details keep names and links.
        const sums = await page.$$eval(".fides-explore__from > summary", (e) => e.map((x) => x.textContent.replace(/\s+/g, " ").trim()));
        const okSum = sums.every((t) => t === W.related1 || [2, 3, 4].some((n) => t === W.relatedN(n)));
        check(`${tag} relations: ${sums.length} summaries are "${W.related1}" or "N ${loc === "EN" ? "related use cases" : "gerelateerde usecases"}"`, sums.length > 0 && okSum, [...new Set(sums)].join("|"));
        const noteTxt = norm(await page.locator("[data-fides-explore-relations-note]").innerText());
        check(`${tag} relations: said once that credentials, organisations and wallets belong to the shown use cases`, (await page.locator("[data-fides-explore-relations-note]").count()) === 1 && noteTxt.length > 30, noteTxt);
        const linkRows = await page.$$eval('.fides-explore__row[data-detail="yes"] .fides-explore__row-name', (rows) => rows.map((r) => r.querySelector("a") && r.querySelector("a").textContent.includes("→") && r.querySelector("a span[aria-hidden]") ? 1 : 0));
        const plainRows = await page.$$eval('.fides-explore__row[data-detail="no"] .fides-explore__row-name', (rows) => rows.map((r) => (r.querySelector("a") ? 1 : 0) + (r.textContent.includes("→") ? 1 : 0)));
        check(`${tag} relations: linked names end in an arrow (not colour only), unlinked names are plain text`, linkRows.every((x) => x === 1) && plainRows.every((x) => x === 0), `${linkRows.length}/${plainRows.length}`);
        const orgNames = await page.$$eval('[data-relation="organizations"] .fides-explore__row-name', (e) => e.map((x) => x.textContent.replace(/→/, "").replace(/\s+/g, " ").trim().toLowerCase()));
        const logos = await page.locator('[data-relation="organizations"] .fides-explore__logo').count();
        check(`${tag} relations: each organisation once (${orgNames.length}) with its logo box (${logos})`, new Set(orgNames).size === orgNames.length && logos === orgNames.length);
        const det = page.locator(".fides-explore__from").first();
        await det.locator("summary").click();
        const rel = det.locator("a").first();
        check(`${tag} relations: opening shows the related use case name as a link`, (await rel.isVisible()) && /^#explore-example-\d$/.test((await rel.getAttribute("href")) || ""));
        const targetSel = await rel.getAttribute("href");
        await rel.click();
        await page.waitForFunction((sel) => { const t = document.querySelector(sel); const n = document.querySelector("[data-fides-explore-sections]"); return t && n && t.getBoundingClientRect().top >= n.getBoundingClientRect().bottom - 1; }, targetSel, { timeout: 5000 }).catch(() => {});
        const rect = await page.evaluate((sel) => ({ t: document.querySelector(sel).getBoundingClientRect().top, b: document.querySelector("[data-fides-explore-sections]").getBoundingClientRect().bottom }), targetSel);
        check(`${tag} relations: the related example card is reached and is not under the section bar`, rect.t >= rect.b - 1, JSON.stringify(rect));
        await page.evaluate(() => window.scrollTo(0, 0));

        // Section bar: same component as the use case detail page.
        const bar = page.locator("[data-fides-explore-sections]");
        const sticky = await bar.evaluate((e) => ({ pos: getComputedStyle(e).position, h: Math.round(e.getBoundingClientRect().height), summary: Math.round(e.querySelector("summary").getBoundingClientRect().height), open: e.open }));
        check(`${tag} bar: sticky, shared "On this page" component`, sticky.pos === "sticky" && (await bar.getAttribute("data-fides-ds-section-nav-ready")) === "1" && (await bar.locator("nav").getAttribute("aria-label")) === W.onPage, JSON.stringify(sticky));
        const labels = await bar.locator("li a").evaluateAll((a) => a.map((x) => x.getAttribute("href")));
        if (wide) {
          check(`${tag} bar: desktop shows the tabs open (no summary)`, sticky.open && !(await bar.locator("summary").isVisible()) && labels.length >= 3, JSON.stringify(sticky));
        } else {
          check(`${tag} bar: phone folds the list behind one compact row (${sticky.summary}px)`, !sticky.open && (await bar.locator("summary").isVisible()) && sticky.summary <= 52 && (await bar.locator("li a:visible").count()) === 0, JSON.stringify(sticky));
        }
        // Pinned: scroll to the last section; the bar must sit on the top edge.
        const lastId = labels[labels.length - 1].slice(1);
        const lastTop = await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top + window.scrollY, lastId);
        await page.evaluate((y) => window.scrollTo(0, y), lastTop);
        await page.waitForFunction(() => Math.abs(window.scrollY) > 0);
        const pinned = await bar.evaluate((e) => Math.round(e.getBoundingClientRect().top));
        check(`${tag} bar: ${wide ? "desktop" : "phone"} bar is pinned at the top while reading the last section`, wide ? pinned === 0 : true, `top=${pinned}`);
        info.push(`${tag}: bar ${wide ? "tabs" : "folded"}, height ${sticky.h}px, top while scrolled = ${pinned}px (${pinned === 0 ? "pinned" : "not pinned"})`);
        // Anchors: every link lands below the bar; the current section is marked.
        if (!wide) await bar.locator("summary").click();
        let anchorsOk = true;
        let currentOk = true;
        let detail = "";
        for (const href of labels) {
          if (!wide && !(await bar.evaluate((e) => e.open))) await bar.locator("summary").click();
          const link = bar.locator(`li a[href="${href}"]`);
          await link.click();
          await page.waitForFunction((h) => { const t = document.querySelector(h); const n = document.querySelector("[data-fides-explore-sections]"); const r = t.getBoundingClientRect(); return r.top >= n.getBoundingClientRect().bottom - 1 && (r.top < n.getBoundingClientRect().bottom + 160 || window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2); }, href, { timeout: 5000 }).catch(() => {});
          const m = await page.evaluate((h) => { const t = document.querySelector(h); const n = document.querySelector("[data-fides-explore-sections]"); const cur = n.querySelector('a[aria-current="location"]'); return { gap: Math.round(t.getBoundingClientRect().top - n.getBoundingClientRect().bottom), end: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2, current: cur ? cur.getAttribute("href") : "", hash: location.hash }; }, href);
          if (m.gap < -1) anchorsOk = false;
          if (m.gap >= 160 && !m.end) anchorsOk = false; // near the end of the page a section cannot reach the bar; that is fine
          if (m.current !== href) currentOk = false;
          detail += `${href}:${m.gap}/${m.current} `;
        }
        check(`${tag} bar: every section link lands below the bar (scroll margin)`, anchorsOk, detail);
        check(`${tag} bar: the active section is marked (aria-current) after choosing it`, currentOk, detail);
        if (!wide) check(`${tag} bar: phone list closes after choosing a section`, !(await bar.evaluate((e) => e.open)));
        await page.evaluate(() => window.scrollTo(0, 0));

        // Keyboard: Tab from the heading reaches the Change action (phone) with a visible focus ring; Enter opens the list.
        await page.locator("h1").focus();
        if (!wide) {
          await page.keyboard.press("Tab");
          const onChange = await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-fides-explore-change"));
          const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0; });
          check(`${tag} keyboard: Tab from the heading reaches "${changeLabel}" with a visible focus ring`, onChange && ring);
          await page.keyboard.press("Enter");
          const opened = await page.evaluate(() => ({ open: !document.querySelector("[data-fides-explore-choices]").matches('[hidden]') && getComputedStyle(document.querySelector("[data-fides-explore-choices]")).display !== "none", exp: document.querySelector("[data-fides-explore-change]").getAttribute("aria-expanded"), focus: document.activeElement.getAttribute("data-choice") }));
          check(`${tag} keyboard: Enter opens the list (aria-expanded=true), focus on the chosen item`, opened.open && opened.exp === "true" && opened.focus === T.slug, JSON.stringify(opened));
          // Choose the other one from the open list, back restores.
          await page.locator(`.fides-explore__choice[data-choice="${T.other}"]`).click();
          await page.waitForFunction((s) => document.querySelector(`.fides-explore__choice[data-choice="${s}"][aria-current]`), T.other);
          const h1b = norm(await page.locator("h1").innerText());
          check(`${tag} switching: H1 follows the choice (${h1b}), the list folds again, focus on the H1, URL keeps ?${T.param}=`, h1b !== T.name[loc] && (await page.locator(".fides-explore__choices").isHidden()) && (await page.evaluate(() => document.activeElement.id)) === "fides-explore-title" && page.url().includes(`${T.param}=${T.other}`), h1b);
        } else {
          await page.locator(`.fides-explore__choice[data-choice="${T.other}"]`).click();
          await page.waitForFunction((s) => document.querySelector(`.fides-explore__choice[data-choice="${s}"][aria-current]`), T.other);
          const h1b = norm(await page.locator("h1").innerText());
          check(`${tag} switching: H1 follows the choice (${h1b}), focus on the H1, URL keeps ?${T.param}=`, h1b !== T.name[loc] && (await page.evaluate(() => document.activeElement.id)) === "fides-explore-title" && page.url().includes(`${T.param}=${T.other}`), h1b);
        }
        // The new result has a working section bar (re-initialised after the swap).
        check(`${tag} switching: the section bar of the new result is initialised`, (await page.locator("[data-fides-explore-sections]").getAttribute("data-fides-ds-section-nav-ready")) === "1" && (await page.locator('[data-fides-explore-sections] a[aria-current="location"]').count()) === 1);
        await page.goBack();
        await page.waitForFunction((s) => document.querySelector(`.fides-explore__choice[data-choice="${s}"][aria-current]`), T.slug);
        // TranslatePress' own DOM observer may touch a swapped-in heading for a moment on /nl/; wait for the text, then compare.
        await page.waitForFunction(() => (document.querySelector("h1") || {}).textContent.trim() !== "", null, { timeout: 5000 }).catch(() => {});
        check(`${tag} back: H1 is "${T.name[loc]}" again`, norm(await page.locator("h1").innerText()) === T.name[loc]);
        // Back to the no-choice state keeps working too.
        await page.context().close();

        // Without JavaScript: the Change link opens the folded list through its #anchor, a choice is a normal link.
        const nojs = await newPage(browser, width, false);
        await calmCss(nojs.context()); // addStyleTag needs scripts, so the no-JS page gets the rule through the stylesheet response
        await nojs.goto(`${base}?${T.param}=${T.slug}`, { waitUntil: "load" });
        check(`${tag} no JS: server-rendered H1 "${T.name[loc]}" and the section bar links`, norm(await nojs.locator("h1").innerText()) === T.name[loc] && (await nojs.locator("[data-fides-explore-sections] a").count()) >= 3);
        if (!wide) {
          check(`${tag} no JS: list folded; Change link shows it (#anchor target)`, await nojs.locator(".fides-explore__choices").isHidden());
          await nojs.locator("[data-fides-explore-change]").first().click();
          check(`${tag} no JS: the list is visible after the Change link`, await nojs.locator(".fides-explore__choices").isVisible());
        }
        await nojs.locator(`.fides-explore__choice[data-choice="${T.other}"]`).click();
        await nojs.waitForLoadState("load");
        check(`${tag} no JS: choosing loads the other choice`, nojs.url().includes(`${T.param}=${T.other}`) && norm(await nojs.locator("h1").innerText()) !== T.name[loc]);
        await nojs.context().close();
      }
    }
  }
  console.log("\n" + info.map((l) => `info - ${l}`).join("\n"));
}

// ---------------------------------------------------------------------------------------------------------------------
// Repair round 3 (2026-11-15): section anchors, Back / Forward, listener clean-up, mobile picker, status message
// ---------------------------------------------------------------------------------------------------------------------
// Final scroll position: resolves once scrollY did not change for 10 frames (no timers).
const settled = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        let last = -1;
        let same = 0;
        const frame = () => {
          if (window.scrollY === last) same += 1;
          else {
            same = 0;
            last = window.scrollY;
          }
          if (same >= 10) resolve(window.scrollY);
          else requestAnimationFrame(frame);
        };
        frame();
      }),
  );
// history.back() / forward() resolved after popstate (or hashchange) and two frames.
const historyStep = (page, dir) =>
  page.evaluate(
    (d) =>
      new Promise((resolve) => {
        const done = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
        window.addEventListener("popstate", done, { once: true });
        window.history[d]();
      }),
    dir,
  );
// The section is where the reader wants it: its top is in the upper part of the viewport (below the sticky bar), or the page cannot scroll further.
const sectionState = (page, id) =>
  page.evaluate((anchor) => {
    const el = document.getElementById(anchor);
    const top = el ? el.getBoundingClientRect().top : NaN;
    const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    const heading = document.querySelector(".fides-explore__title");
    return { top, y: window.scrollY, atEnd, h1Focus: document.activeElement === heading, hash: window.location.hash, inView: !!el && ((top >= -2 && top <= 300) || (atEnd && top > -2 && top < window.innerHeight)) };
  }, id);
async function openSectionBar(page) {
  await page.evaluate(() => {
    const nav = document.querySelector("[data-fides-ds-section-nav]");
    if (nav && !nav.open) nav.querySelector("summary").click();
  });
}
const LISTENER_PROBE = () => {
  const live = { scroll: new Set(), resize: new Set(), hashchange: new Set(), popstate: new Set(), mediaquery: new Set() };
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  const bucket = (target, type) => (target === window && live[type] ? live[type] : typeof MediaQueryList !== "undefined" && target instanceof MediaQueryList && type === "change" ? live.mediaquery : null);
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    const set = bucket(this, type);
    if (set && listener) set.add(listener);
    return add.call(this, type, listener, options);
  };
  EventTarget.prototype.removeEventListener = function (type, listener, options) {
    const set = bucket(this, type);
    if (set && listener) set.delete(listener);
    return remove.call(this, type, listener, options);
  };
  window.__liveListeners = () => Object.fromEntries(Object.entries(live).map(([key, set]) => [key, set.size]));
};

async function round3Checks(browser) {
  const info = [];
  for (const loc of LOCALES) {
    const W = WORDS[loc];
    for (const width of WIDTHS) {
      for (const T of R2) {
        const tag = `${loc} ${width} ${T.kind}`;
        const url = (slug) => `${BASE}${prefix(loc)}${T.path}?${T.param}=${slug}`;
        const wide = !NARROW(width);

        // 1. Section anchors: every link of the section bar leaves the reader at that section (final scroll position).
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
        await ctx.addCookies(COOKIES);
        await calmCss(ctx);
        const page = await ctx.newPage();
        await page.goto(url(T.slug), { waitUntil: "networkidle" });
        const ids = await page.$$eval("[data-fides-ds-section-nav] a[href^='#']", (as) => as.filter((a) => !a.closest("li").hidden).map((a) => a.getAttribute("href").slice(1)));
        check(`${tag}: section bar offers at least 3 links`, ids.length >= 3, ids.join(","));
        await page.evaluate(() => { document.querySelector("[data-fides-explore-result]").__mark = "kept"; });
        const posted = [];
        for (const id of ids) {
          await openSectionBar(page);
          await page.locator(`[data-fides-ds-section-nav] a[href="#${id}"]`).click();
          await settled(page);
          const st = await sectionState(page, id);
          posted.push(st.y);
          info.push(`${tag} click #${id}: scrollY ${Math.round(st.y)}, section top ${Math.round(st.top)}${st.atEnd ? " (page end)" : ""}`);
          check(`${tag}: click "#${id}" keeps the reader at the section (final scroll)`, st.inView && st.y > 0 && !st.h1Focus && st.hash === `#${id}`, JSON.stringify(st));
        }
        check(`${tag}: the result region was not swapped by anchor clicks`, (await page.evaluate(() => document.querySelector("[data-fides-explore-result]").__mark)) === "kept");
        check(`${tag}: current section is marked after the last click`, (await page.locator("[data-fides-ds-section-nav] a[aria-current='location']").count()) === 1);

        // Back and Forward between the anchors.
        const last = ids.length - 1;
        await historyStep(page, "back");
        await settled(page);
        let st = await sectionState(page, ids[last - 1]);
        check(`${tag}: Back goes to "#${ids[last - 1]}" and stays there`, st.inView && !st.h1Focus && st.hash === `#${ids[last - 1]}`, JSON.stringify(st));
        await historyStep(page, "back");
        await settled(page);
        st = await sectionState(page, ids[last - 2]);
        check(`${tag}: Back again goes to "#${ids[last - 2]}"`, st.inView && !st.h1Focus && st.hash === `#${ids[last - 2]}`, JSON.stringify(st));
        await historyStep(page, "forward");
        await settled(page);
        st = await sectionState(page, ids[last - 1]);
        check(`${tag}: Forward returns to "#${ids[last - 1]}"`, st.inView && !st.h1Focus && st.hash === `#${ids[last - 1]}`, JSON.stringify(st));
        await historyStep(page, "forward");
        await settled(page);
        st = await sectionState(page, ids[last]);
        check(`${tag}: Forward returns to "#${ids[last]}"`, st.inView && !st.h1Focus && st.hash === `#${ids[last]}`, JSON.stringify(st));
        check(`${tag}: Back / Forward between anchors did not swap the result region`, (await page.evaluate(() => document.querySelector("[data-fides-explore-result]").__mark)) === "kept");

        // 2. Switching keeps working with an anchor in the history: switch, Back returns to the anchored section, Forward to the other choice.
        const nameBefore = norm(await page.locator("h1").innerText());
        await openPicker(page, width);
        await page.locator(`.fides-explore__choice[data-choice="${T.other}"]`).click();
        await page.waitForFunction((slug) => document.querySelector("[data-fides-explore]").getAttribute("data-selected") === slug, T.other);
        // Wait for the settled state: heading and status region both filled (TranslatePress may touch the region on /nl/).
        await page.waitForFunction(() => document.querySelector("h1").innerText.trim() !== "" && (document.getElementById("fides-explore-live") || {}).textContent);
        const nameOther = norm(await page.locator("h1").innerText());
        check(`${tag}: switching to ${T.other} changes heading and address`, nameOther !== nameBefore && page.url().includes(`${T.param}=${T.other}`) && !page.url().includes("#"), `${nameBefore} -> ${nameOther} ${page.url()}`);
        // 4. Status message of the live region, in the page language.
        const live = norm(await page.locator("#fides-explore-live").textContent());
        const expectedLive = loc === "NL" ? `${nameOther} geselecteerd` : `${nameOther} selected`;
        check(`${tag}: status message after switching is "${expectedLive}"`, live === expectedLive, live);
        check(`${tag}: status message is a polite status region`, (await page.locator("#fides-explore-live[role='status'][aria-live='polite']").count()) === 1);
        await historyStep(page, "back");
        await page.waitForFunction((slug) => document.querySelector("[data-fides-explore]").getAttribute("data-selected") === slug && document.querySelector("h1").innerText.trim() !== "", T.slug);
        await settled(page);
        st = await sectionState(page, ids[last]);
        check(`${tag}: Back after switching returns to ${T.slug} at "#${ids[last]}" (section in view; the heading may hold focus)`, norm(await page.locator("h1").innerText()) === nameBefore && st.inView && st.hash === `#${ids[last]}`, JSON.stringify(st));
        const liveBack = norm(await page.locator("#fides-explore-live").textContent());
        check(`${tag}: status message after Back names the restored choice`, liveBack === (loc === "NL" ? `${nameBefore} geselecteerd` : `${nameBefore} selected`), liveBack);
        await historyStep(page, "forward");
        await page.waitForFunction((slug) => document.querySelector("[data-fides-explore]").getAttribute("data-selected") === slug && document.querySelector("h1").innerText.trim() !== "", T.other);
        check(`${tag}: Forward returns to ${T.other}`, norm(await page.locator("h1").innerText()) === nameOther && page.url().includes(`${T.param}=${T.other}`));
        await ctx.close();

        // Direct open with an anchor in the address: the section is reached and kept.
        const direct = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
        await direct.addCookies(COOKIES);
        await calmCss(direct);
        const dp = await direct.newPage();
        await dp.goto(`${url(T.slug)}#${ids[last - 1]}`, { waitUntil: "networkidle" });
        await settled(dp);
        st = await sectionState(dp, ids[last - 1]);
        check(`${tag}: opening the address with #${ids[last - 1]} lands on that section`, st.inView && st.y > 0 && !st.h1Focus, JSON.stringify(st));
        await direct.close();

        // 3. Listeners: repeated switching must not pile up window / media-query listeners (instrumented addEventListener).
        const lctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
        await lctx.addCookies(COOKIES);
        if (process.env.TILES_JS_OVERRIDE) {
          // Negative control: serve another design-system.js (for example the 1.13.57 copy) to show the test catches the leak.
          await lctx.route(/design-system\.js/, (route) => route.fulfill({ contentType: "application/javascript", body: fs.readFileSync(process.env.TILES_JS_OVERRIDE, "utf8") }));
        }
        await lctx.addInitScript(LISTENER_PROBE);
        const lp = await lctx.newPage();
        await lp.goto(url(T.slug), { waitUntil: "networkidle" });
        const base = await lp.evaluate(() => window.__liveListeners());
        const N = 8;
        for (let i = 1; i <= N; i += 1) {
          const slug = i % 2 ? T.other : T.slug;
          await openPicker(lp, width);
          await lp.locator(`.fides-explore__choice[data-choice="${slug}"]`).click();
          await lp.waitForFunction((value) => document.querySelector("[data-fides-explore]").getAttribute("data-selected") === value, slug);
        }
        const after = await lp.evaluate(() => window.__liveListeners());
        check(`${tag}: ${N} switches add no listeners (before ${JSON.stringify(base)}, after ${JSON.stringify(after)})`, Object.keys(base).every((key) => after[key] <= base[key]), JSON.stringify({ base, after }));
        check(`${tag}: after ${N} switches exactly one section bar is on the page and one scroll measuring listener per bar is live`, (await lp.locator("[data-fides-ds-section-nav]").count()) === 1 && after.scroll <= base.scroll);
        // Scroll handler calls: one scroll event after the switches must reach one section bar handler only.
        const calls = await lp.evaluate(() => {
          let frames = 0;
          const originalRaf = window.requestAnimationFrame;
          window.requestAnimationFrame = function (cb) { frames += 1; return originalRaf.call(window, cb); };
          window.dispatchEvent(new Event("scroll"));
          window.requestAnimationFrame = originalRaf;
          return frames;
        });
        check(`${tag}: one scroll event schedules one section measuring frame after ${N} switches`, calls <= 1, String(calls));
        info.push(`${tag} listeners before ${JSON.stringify(base)} after ${N} switches ${JSON.stringify(after)}; frames per scroll event ${calls}`);
        await lctx.close();

        // 5. Mobile picker: open with #fides-explore-choices; list visibility and aria-expanded agree, and it can be closed and opened again.
        const pctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
        await pctx.addCookies(COOKIES);
        await calmCss(pctx);
        const pp = await pctx.newPage();
        await pp.goto(`${url(T.slug)}#fides-explore-choices`, { waitUntil: "networkidle" });
        const pickerState = async () => ({ visible: await pp.locator(".fides-explore__choices").isVisible(), expanded: await pp.locator("[data-fides-explore-change]").first().getAttribute("aria-expanded") });
        let ps = await pickerState();
        if (wide) {
          check(`${tag}: wide: the picker is visible with #fides-explore-choices`, ps.visible);
        } else {
          check(`${tag}: #fides-explore-choices opens the picker and aria-expanded is true`, ps.visible && ps.expanded === "true", JSON.stringify(ps));
          await pp.locator("[data-fides-explore-change]").first().click();
          ps = await pickerState();
          check(`${tag}: the Change action closes the picker (hidden, aria-expanded false)`, !ps.visible && ps.expanded === "false", JSON.stringify(ps));
          await pp.locator("[data-fides-explore-change]").first().click();
          ps = await pickerState();
          check(`${tag}: the Change action opens it again (visible, aria-expanded true)`, ps.visible && ps.expanded === "true", JSON.stringify(ps));
          await pp.locator("[data-fides-explore-change]").first().click();
          ps = await pickerState();
          check(`${tag}: and closes it once more`, !ps.visible && ps.expanded === "false", JSON.stringify(ps));
          // Choosing from an opened picker still works and leaves it folded.
          await pp.locator("[data-fides-explore-change]").first().click();
          await pp.locator(`.fides-explore__choice[data-choice="${T.other}"]`).click();
          await pp.waitForFunction((slug) => document.querySelector("[data-fides-explore]").getAttribute("data-selected") === slug, T.other);
          ps = await pickerState();
          check(`${tag}: after choosing the picker is folded and aria-expanded is false`, !ps.visible && ps.expanded === "false", JSON.stringify(ps));
        }
        await pctx.close();

        // Without JavaScript: the anchor opens the picker (CSS :target); without the anchor it is folded below 1100px.
        const njs = await newPage(browser, width, false);
        await njs.goto(`${url(T.slug)}#fides-explore-choices`, { waitUntil: "load" });
        check(`${tag}: no JS: #fides-explore-choices shows the picker`, await njs.locator(".fides-explore__choices").isVisible());
        await njs.goto(url(T.slug), { waitUntil: "load" });
        check(`${tag}: no JS: without the anchor the picker is ${wide ? "visible" : "folded"}`, (await njs.locator(".fides-explore__choices").isVisible()) === wide);
        await njs.context().close();
      }
    }
  }
  console.log("\n" + info.map((l) => `info - ${l}`).join("\n"));
}

// ---------------------------------------------------------------------------------------------------------------------
// Round 4 (2026-11-15): "More from the catalog" (ONLY_ROUND4=1; env EMPTY_FIXTURE=1 with tests/run-explore-themes-sectors-empty.sh)
// ---------------------------------------------------------------------------------------------------------------------
const BLOCK_FILE = path.join(__dirname, "output", "explore-catalog-block.json");
const R4_TARGETS = [
  { kind: "sector", param: "sector", path: "sectors/", slug: "education", name: { EN: "Education", NL: "Onderwijs" } },
  { kind: "theme", param: "theme", path: "themes/", slug: "business_authority", name: { EN: "Business & Mandates", NL: "Bedrijven en mandaten" }, catalogTheme: "Organizational identity" }, // the credential catalog names its own theme in the filter pill
  { kind: "sector", param: "sector", path: "sectors/", slug: "agriculture", name: { EN: "Agriculture", NL: "Landbouw" } }, // low-data: only credential types
];
const R4_WORDS = {
  EN: { h2: "More from the catalog", titles: { credentials: "Credential types", organizations: "Organisations", issuers: "Issuers", rps: "Relying parties" }, direct: "Classified directly", derived: "Derived from related records", all: { credentials: "View all credential types", organizations: "View all organisations", issuers: "View all issuers", rps: "View all relying parties" }, showing: /^Showing \d+ of \d+\.$/, also: "Also linked to a use case above:" },
  NL: { h2: "Meer uit de catalogus", titles: { credentials: "Credentialtypen", organizations: "Organisaties", issuers: "Uitgevers", rps: "Vertrouwende partijen" }, direct: "Rechtstreeks ingedeeld", derived: "Afgeleid van gerelateerde records", all: { credentials: "Bekijk alle credentialtypen", organizations: "Bekijk alle organisaties", issuers: "Bekijk alle uitgevers", rps: "Bekijk alle vertrouwende partijen" }, showing: /^Toont \d+ van \d+\.$/, also: "Ook gekoppeld aan een usecase hierboven:" },
};
const PARAM_OF = { credentials: null, organizations: "sector" };

async function round4Checks(browser) {
  if (!fs.existsSync(BLOCK_FILE)) {
    check("block file exists (run ONLY_ROUND4=1 explore-themes-sectors-behaviour.php first)", false, BLOCK_FILE);
    return;
  }
  const expected = JSON.parse(fs.readFileSync(BLOCK_FILE, "utf8"));
  const fixture = process.env.EMPTY_FIXTURE === "1";
  const info = [];
  for (const loc of LOCALES) {
    const W = R4_WORDS[loc];
    for (const width of WIDTHS) {
      for (const T of R4_TARGETS) {
        const tag = `r4 ${loc} ${width} ${T.slug}${fixture ? " (no use cases)" : ""}`;
        const exp = expected[`${T.kind}:${T.slug}`];
        const url = `${BASE}${prefix(loc)}${T.path}?${T.param}=${T.slug}${fixture ? "&fides_explore_fixture=empty" : ""}`;
        const page = await newPage(browser, width);
        await page.goto(url, { waitUntil: "networkidle" });
        const block = page.locator("#explore-catalog");
        check(`${tag}: block present`, (await block.count()) === 1);
        const parts = await page.$$eval("[data-catalog-type]", (els) => els.map((el) => ({
          type: el.dataset.catalogType, basis: el.dataset.basis, total: Number(el.dataset.total), shown: Number(el.dataset.shown), hasLink: el.dataset.hasLink === "yes",
          cards: el.querySelectorAll(".fides-ds-card").length, ids: Array.from(el.querySelectorAll("[data-record-id]")).map((n) => n.dataset.recordId),
          h3: (el.querySelector("h3") || {}).textContent, chip: (el.querySelector(".fides-explore__basis") || {}).textContent,
          basisText: (el.querySelector(".fides-explore__basis-text") || {}).textContent, link: el.querySelector("[data-fides-explore-all]") ? { href: el.querySelector("[data-fides-explore-all]").getAttribute("href"), text: el.querySelector("[data-fides-explore-all]").textContent.replace(/\s+/g, " ").trim() } : null,
          foot: (el.querySelector(".fides-explore__catalog-foot") || {}).textContent, also: el.querySelectorAll("[data-fides-explore-also]").length, anchors: Array.from(el.querySelectorAll("[data-fides-explore-also] a")).map((a) => a.getAttribute("href")),
        })));
        check(`${tag}: parts equal the data (${exp.types.map((t) => t.type).join(", ")})`, JSON.stringify(parts.map((p) => p.type)) === JSON.stringify(exp.types.map((t) => t.type)), parts.map((p) => p.type).join(","));
        check(`${tag}: heading "${W.h2}", wallets never offered`, ((await block.locator("h2").first().textContent()) || "").trim() === W.h2 && !parts.some((p) => p.type === "wallets"));
        for (const part of parts) {
          const e = exp.types.find((t) => t.type === part.type) || {};
          const pt = `${tag}/${part.type}`;
          check(`${pt}: ${part.cards} cards = min(4, ${part.total}), none empty`, part.cards === Math.min(4, part.total) && part.cards >= 1 && part.cards === part.shown);
          check(`${pt}: heading and basis label are ${loc}`, (part.h3 || "").trim() === W.titles[part.type] && (part.chip || "").trim() === (part.basis === "direct" ? W.direct : W.derived), `${part.h3}/${part.chip}`);
          check(`${pt}: basis (${part.basis}) matches the data and a sentence says what it is based on`, part.basis === e.basis && (part.basisText || "").trim().length > 25 && (part.basisText || "").includes(T.name[loc]), part.basisText);
          check(`${pt}: unique record ids`, new Set(part.ids).size === part.ids.length);
          if (part.hasLink) {
            const countOk = part.type === "organizations" ? !/\(\d+\)/.test(part.link.text) : part.link.text.includes(`(${part.total})`);
            check(`${pt}: link "${W.all[part.type]}"${part.type === "organizations" ? " without a number" : ` with (${part.total})`}`, part.link.text.startsWith(W.all[part.type]) && countOk, part.link.text);
            check(`${pt}: link stays on the same language site`, loc === "EN" || part.link.href.includes("/nl/"), part.link.href);
          } else {
            check(`${pt}: no link, the count line says "Showing N of M"`, part.link === null && W.showing.test((part.foot || "").trim()), part.foot);
          }
          check(`${pt}: "also linked" notes point to an example card on this page`, (await Promise.all(part.anchors.map((a) => page.locator(a).count()))).every((n) => n === 1) || fixture);
        }
        check(`${tag}: no horizontal overflow`, await noOverflow(page));
        if (loc === "NL") {
          const english = await block.evaluate((el) => Array.from(el.querySelectorAll("h2,h3,.fides-explore__basis,.fides-explore__basis-text,.fides-explore__catalog-foot,.fides-explore__relations-note")).map((n) => n.textContent.replace(/\s+/g, " ").trim()).filter((t) => /\b(View all|Showing|Classified|Derived|Records the catalogs|Credential types|Relying parties|Issuers have)\b/.test(t)));
          check(`${tag}: interface text is Dutch`, english.length === 0, english.join(" | "));
          const lang = await block.locator(".fides-explore__catalog-card").first().getAttribute("lang");
          check(`${tag}: catalog card content is marked as English`, lang === "en");
        }
        if (!fixture) {
          const dedupe = parts.reduce((n, p) => n + p.also, 0);
          check(`${tag}: ${dedupe} record(s) marked as also linked, as the data says (${exp.also})`, dedupe === exp.also, `${dedupe}`);
        } else {
          check(`${tag}: no use cases but the classified records stay (state "empty" + block)`, (await page.locator("[data-fides-explore-state=empty]").count()) === 1 && parts.length > 0);
        }
        info.push(`${tag}: ${parts.map((p) => `${p.type} ${p.cards}/${p.total}${p.hasLink ? " link" : ""}`).join(", ")}`);

        // Follow every link to the catalog and back (EN and NL, 1440 and 390).
        for (const part of parts.filter((p) => p.hasLink)) {
          await page.goto(url, { waitUntil: "networkidle" });
          const before = page.url();
          await page.locator(`[data-fides-explore-all="${part.type}"]`).click();
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(600);
          const dest = await page.evaluate(() => {
            const body = document.body.innerText.replace(/\s+/g, " ");
            const m = body.match(/(\d+)\s+(?:of|van)\s+\d+\s+[\p{L} ]+?(?=[ .]|$)|(\d+)\s+(?:credential types?|credentialtypen|organi[sz]ations?|organisaties|issuers?|uitgevers|relying parties|vertrouwende partijen)/iu);
            return { pills: Array.from(new Set(Array.from(document.querySelectorAll("[class*=pill]")).map((e) => e.textContent.replace(/\s+/g, " ").trim()))).filter(Boolean), count: m ? Number(m[1] || m[2]) : null, url: location.pathname + location.search };
          });
          const pt = `${tag}/${part.type}`;
          const label = part.type === "credentials" || part.type === "organizations" ? (T.catalogTheme || T.name[loc]) : null;
          const pillOk = label ? dest.pills.some((p) => p.includes(label) || p.includes(T.name.EN)) : dest.pills.some((p) => /×|remove|verwijder/i.test(p));
          if (part.type === "credentials" && T.catalogTheme) check(`${pt}: the basis sentence names the catalog theme "${T.catalogTheme}" that the filter pill shows`, (part.basisText || "").includes(T.catalogTheme), part.basisText);
          check(`${pt}: catalog opens with the choice as a visible filter (${dest.pills.length} filter pill(s))`, pillOk, dest.pills.slice(0, 2).join(" | "));
          if (part.type !== "organizations" && loc === "EN") check(`${pt}: the catalog lists exactly ${part.total}`, dest.count === part.total, `${dest.count}`);
          info.push(`${pt}: destination ${dest.url.slice(0, 70)} shows ${dest.count}, ${dest.pills.length} filter pill(s)`);
          await page.goBack({ waitUntil: "networkidle" });
          const back = await page.evaluate(() => ({ url: location.href, active: (document.querySelector(".fides-explore__choice[aria-current]") || {}).dataset?.choice, block: !!document.querySelector("#explore-catalog") }));
          check(`${pt}: Back returns to the ${T.kind} page with the choice and the block`, back.url === before && back.active === T.slug && back.block, JSON.stringify(back));
        }
        await page.context().close();
      }
    }
  }
  // The block disappears completely without any record (fixture: emptyall) and the use cases state stays honest.
  if (process.env.EMPTY_FIXTURE === "1") {
    for (const loc of LOCALES) {
      const page = await newPage(browser, 1440);
      await page.goto(`${BASE}${prefix(loc)}sectors/?sector=education&fides_explore_fixture=emptyall`, { waitUntil: "networkidle" });
      check(`r4 ${loc}: neither use cases nor records: no block, no empty part, the empty message stays`, (await page.locator("#explore-catalog, [data-catalog-type]").count()) === 0 && (await page.locator("[data-fides-explore-state=empty]").count()) === 1);
      await page.context().close();
    }
  }
  console.log("\n" + info.map((l) => `info - ${l}`).join("\n"));
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  const only4 = process.env.ONLY_ROUND4 === "1";
  const only3 = process.env.ONLY_ROUND3 === "1";
  if (only4) {
    await round4Checks(browser);
    await browser.close();
    console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
    process.exit(failures ? 1 : 0);
  }
  if (process.env.ONLY_REPAIR !== "1" && process.env.ONLY_ROUND2 !== "1" && !only3) for (const loc of LOCALES) {
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
        await openPicker(page, width);
        await page.locator(`.fides-explore__choice[data-choice="${other}"]`).click();
        await page.waitForFunction((s) => document.querySelector(`.fides-explore__choice[data-choice="${s}"][aria-current]`), other);
        check(`${tag}: click switches in place, URL updated, focus on the result heading`, page.url().includes(`${K.param}=${other}`) && (await page.evaluate(() => document.activeElement && document.activeElement.id)) === "fides-explore-title", page.url());
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
        check(`${tag}: Enter chooses and moves focus to the result heading`, (await page.evaluate(() => document.activeElement && document.activeElement.id)) === "fides-explore-title");
        await openPicker(page, width);
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
        await calmCss(nojs.context());
        await nojs.goto(url(sample), { waitUntil: "load" });
        const hrefs = await nojs.$$eval(".fides-explore__choice", (as) => as.map((a) => a.getAttribute("href")));
        check(`${tag}: no JS: choices are real links and the overview is server rendered`, hrefs.length === K.slugs.length && hrefs.every((h) => h.includes(`${K.param}=`)) && (await nojs.locator(".fides-explore__cards li").count()) > 0);
        if (NARROW(width)) await nojs.locator("[data-fides-explore-change]").first().click(); // opens the folded list through the #anchor target
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
  if (process.env.ONLY_ROUND2 !== "1" && process.env.ONLY_MAIN !== "1" && !only3) await repairChecks(browser);
  if (process.env.ONLY_MAIN !== "1" && !only3) await round2Checks(browser);
  if (only3 || (process.env.ONLY_MAIN !== "1" && process.env.ONLY_REPAIR !== "1" && process.env.ONLY_ROUND2 !== "1")) await round3Checks(browser);
  if (process.env.ONLY_MAIN !== "1" && process.env.ONLY_REPAIR !== "1" && process.env.ONLY_ROUND2 !== "1" && !only3) await round4Checks(browser);
  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
})();
