/**
 * Visitor checks for the glossary page (Paper 29.1 overview, 29.3 definition
 * under the row): shared shell and Learn bar, three/two/one columns, alphabetical
 * and visual order, search (alias, empty, clear), letter filter, inline
 * definition, deeplink, keyboard, hover, focus, resize and overflow at 1440,
 * 1100, 768, 390 and 320. Run through run-glossary-checks.sh.
 */
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const GLOSSARY = process.env.GLOSSARY_PATH || "/glossary/";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const WIDTHS = (process.env.WIDTHS || "1440,1100,768,390,320").split(",").map(Number);
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DOM_READY = { waitUntil: "domcontentloaded" };

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

const columnsFor = (width) => (width >= 1100 ? 3 : width >= 600 ? 2 : 1);

async function open(page, query = "") {
  await page.goto(`${BASE}${GLOSSARY}${query}`, DOM_READY);
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 2500 }).then(() => true, () => false)) await deny.click();
  await page.waitForSelector("[data-glossary-ready]", { state: "attached", timeout: 20000 });
  await page.mouse.move(0, 0);
}

/** Same sources as the page, read independently of its code. */
async function sourceTerms(page) {
  return page.evaluate(async () => {
    for (const url of window.fidesDsGlossary.sources) {
      try {
        const res = await fetch(url, { credentials: "omit" });
        if (!res.ok) continue;
        const data = await res.json();
        if (data && Array.isArray(data.terms) && data.terms.length) return data.terms;
      } catch (e) {
        /* next source */
      }
    }
    return [];
  });
}

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
const rowsOf = (page) => page.locator(".fides-glossary__item");
const countText = async (page) => (await page.locator(".fides-glossary__count").innerText()).trim();

async function overview(page, width, data) {
  const tag = `overview @${width}`;
  await open(page);
  const s = await page.evaluate(() => ({
    headers: document.querySelectorAll(".fides-ds-site-header").length,
    footers: document.querySelectorAll(".fides-ds-site-footer").length,
    themeChrome: Boolean(document.querySelector("#header.ct-header, .ct-footer")),
    bars: document.querySelectorAll(".fides-learn-bar").length,
    h1s: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()),
    modalLib: Boolean(document.querySelector(".fides-modal-overlay, .fides-catalog-modal")),
    rows: document.querySelectorAll(".fides-glossary__item").length,
    panels: document.querySelectorAll(".fides-glossary__panel").length,
  }));
  check(`${tag}: one shared header and footer, no theme chrome`, s.headers === 1 && s.footers === 1 && !s.themeChrome, JSON.stringify(s));
  check(`${tag}: one Learn bar`, s.bars === 1);
  check(`${tag}: single H1 Glossary`, s.h1s.length === 1 && s.h1s[0] === "Glossary", s.h1s.join("|"));
  check(`${tag}: no horizontal overflow`, !(await overflow(page)));
  check(`${tag}: row count equals the data (${data.length})`, s.rows === data.length, `${s.rows}`);
  check(`${tag}: no plugin modal and no panel on load`, !s.modalLib && s.panels === 0);
  check(`${tag}: count line comes from the data`, (await countText(page)) === `${data.length} terms`, await countText(page));
  if (width >= 900) {
    const current = (await page.locator(".fides-learn-bar__nav a[aria-current=page]").innerText()).trim();
    check(`${tag}: Glossary is the active Learn tab`, current === "Glossary", current);
  } else {
    const current = (await page.locator(".fides-learn-bar__toggle span").last().innerText()).trim();
    check(`${tag}: compact Learn menu shows Glossary`, current === "Glossary", current);
  }
  if (width >= 600) {
    const crumb = (await page.locator(".fides-learn__crumbs").innerText()).replace(/\s+/g, " ").trim();
    check(`${tag}: breadcrumb Learn / Glossary`, crumb === "Learn Glossary", crumb);
  }
  const learnHref = await page.locator(".fides-learn-bar__title").getAttribute("href");
  check(`${tag}: Learn title links to the Learn overview, not to the glossary`, !/glossary/.test(learnHref || "") && /learn/.test(learnHref || ""), learnHref);

  // Columns in the first section.
  const cols = await page.evaluate(() => {
    const items = [...document.querySelector(".fides-glossary__list").children].filter((li) => li.classList.contains("fides-glossary__item"));
    return new Set(items.map((li) => Math.round(li.getBoundingClientRect().left))).size;
  });
  check(`${tag}: ${columnsFor(width)} column(s)`, cols === columnsFor(width), `${cols}`);

  // Alphabetical DOM order equals the visual (row by row) order.
  const order = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll(".fides-glossary__list").forEach((ul) => {
      const items = [...ul.children].filter((li) => li.classList.contains("fides-glossary__item"));
      const dom = items.map((li) => li.querySelector(".fides-glossary__name").textContent);
      const rects = items.map((li, i) => ({ i, t: Math.round(li.getBoundingClientRect().top), l: Math.round(li.getBoundingClientRect().left) }));
      const visual = rects.sort((a, b) => a.t - b.t || a.l - b.l).map((r) => dom[r.i]);
      out.push({ same: dom.join("|") === visual.join("|"), dom });
    });
    const names = out.flatMap((o) => o.dom);
    const sorted = [...names].sort(new Intl.Collator("en", { sensitivity: "base", numeric: true }).compare);
    return { visualMatches: out.every((o) => o.same), alphabetical: names.join("|") === sorted.join("|") };
  });
  check(`${tag}: DOM order is alphabetical and equals the visible order`, order.visualMatches && order.alphabetical, JSON.stringify(order));

  // Letter bar: available letters are buttons, others plain text.
  const letters = await page.evaluate(() => ({
    buttons: [...document.querySelectorAll(".fides-glossary__letter-list button")].map((b) => b.getAttribute("data-letter")),
    inactive: [...document.querySelectorAll(".fides-glossary__letter.is-unavailable")].map((s) => s.textContent),
    pressed: [...document.querySelectorAll(".fides-glossary__letter-list button[aria-pressed=true]")].map((b) => b.getAttribute("data-letter")),
    small: [...document.querySelectorAll(".fides-glossary__letter-list button")].filter((b) => b.getBoundingClientRect().height < 40).length,
  }));
  const present = [...new Set(data.map((t) => (t.name.trim()[0] || "").toUpperCase()))];
  check(`${tag}: a button for every letter with terms, All first`, letters.buttons[0] === "" && present.every((l) => letters.buttons.includes(l)), JSON.stringify(letters.buttons));
  check(`${tag}: letters without terms are not actions`, letters.inactive.length > 0 && letters.inactive.every((l) => !letters.buttons.includes(l)), JSON.stringify(letters.inactive));
  check(`${tag}: All is the active filter`, letters.pressed.join("|") === "");
  check(`${tag}: letter buttons are at least 40px high${width < 1100 ? " (44px on touch widths)" : ""}`, letters.small === 0);
  const minTouch = width < 1100 ? 44 : 40;
  const smallLetters = await page.evaluate((min) => [...document.querySelectorAll(".fides-glossary__letter-list button")].filter((b) => b.getBoundingClientRect().height < min - 0.5).length, minTouch);
  check(`${tag}: letter target size >= ${minTouch}px`, smallLetters === 0, `${smallLetters}`);
  await page.screenshot({ path: path.join(OUT, `glossary-overview-${width}.png`) });
}

async function longTerms(page, width) {
  const tag = `long terms @${width}`;
  await open(page);
  const bad = await page.evaluate(() =>
    [...document.querySelectorAll(".fides-glossary__item")]
      .filter((li) => li.scrollWidth > li.clientWidth + 1 || li.querySelector(".fides-glossary__name").scrollWidth > li.clientWidth + 1)
      .map((li) => li.textContent.trim().slice(0, 40))
  );
  check(`${tag}: no row overflows its cell`, bad.length === 0, JSON.stringify(bad));
}

async function inline(page, width, data) {
  const tag = `definition @${width}`;
  await open(page);
  const term = data.find((t) => t.name === "Attestation" && t.description && t.aliases && t.aliases.length && t.url) || data.find((t) => t.description && t.aliases && t.aliases.length && t.url);
  const row = page.locator(`.fides-glossary__item[data-term-id="${term.id}"]`);
  const button = row.locator(".fides-glossary__toggle");
  check(`${tag}: toggle starts collapsed with aria-controls`, (await button.getAttribute("aria-expanded")) === "false" && Boolean(await button.getAttribute("aria-controls")));
  await button.scrollIntoViewIfNeeded();
  await button.click();
  const panel = page.locator(".fides-glossary__panel");
  check(`${tag}: one panel opens`, (await panel.count()) === 1 && (await button.getAttribute("aria-expanded")) === "true");
  const controls = await button.getAttribute("aria-controls");
  check(`${tag}: aria-controls points at the region, which is named by the term`, (await page.locator(`#${controls}[role=region]`).count()) === 1 && (await page.locator(`#${controls}`).getAttribute("aria-labelledby")) === (await button.getAttribute("id")));
  const geo = await page.evaluate((id) => {
    const li = document.querySelector(`.fides-glossary__item[data-term-id="${CSS.escape(id)}"]`);
    const ul = li.parentNode;
    const panel = ul.querySelector(".fides-glossary__panel");
    const lr = li.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    const ur = ul.getBoundingClientRect();
    const rowItems = [...ul.children].filter((c) => c.classList.contains("fides-glossary__item") && Math.abs(c.getBoundingClientRect().top - lr.top) < 2);
    const rowBottom = Math.max(...rowItems.map((c) => c.getBoundingClientRect().bottom));
    const after = [...ul.children].filter((c) => c.classList.contains("fides-glossary__item") && c.getBoundingClientRect().top >= pr.bottom - 1);
    const sameRowAfterPanel = rowItems.some((c) => c.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_PRECEDING);
    return { fullWidth: Math.abs(pr.width - ur.width) < 2 && Math.abs(pr.left - ur.left) < 2, gap: Math.round(pr.top - rowBottom), rowSize: rowItems.length, sameRowAfterPanel, nextIsPanel: Boolean(li.parentNode.querySelector(".fides-glossary__panel")), after: after.length };
  }, term.id);
  check(`${tag}: panel spans the full list width`, geo.fullWidth, JSON.stringify(geo));
  check(`${tag}: panel sits directly under the row (${geo.rowSize} per row)`, geo.gap >= 0 && geo.gap <= 2 && !geo.sameRowAfterPanel, JSON.stringify(geo));
  const text = await panel.innerText();
  check(`${tag}: description, aliases and source are shown`, text.includes(term.description.slice(0, 40)) && text.includes("Also known as") && text.includes(term.aliases[0]) && /Source:/.test(text), text.slice(0, 120));
  check(`${tag}: source link opens in a new tab with a hint`, (await panel.locator("a[target=_blank]").getAttribute("rel")) === "noopener" && /opens in a new tab/.test(text));
  check(`${tag}: no "Link to this term" action in the open term`, (await panel.locator("[data-glossary-permalink], .fides-glossary__permalink, .fides-glossary__copied").count()) === 0 && !/Link to this term/i.test(text));
  check(`${tag}: URL holds the term while open`, page.url().includes("term="));
  check(`${tag}: no horizontal overflow while open`, !(await overflow(page)));
  await page.screenshot({ path: path.join(OUT, `glossary-open-${width}.png`) });

  // Escape closes and returns focus to the term.
  await button.focus();
  await page.keyboard.press("Escape");
  check(`${tag}: Escape closes and keeps focus on the term`, (await panel.count()) === 0 && (await button.getAttribute("aria-expanded")) === "false" && (await page.evaluate(() => document.activeElement.classList.contains("fides-glossary__toggle"))));
  check(`${tag}: URL no longer holds the term`, !page.url().includes("term="));
  // Escape from inside the panel.
  await button.click();
  await panel.locator("a").first().focus();
  await page.keyboard.press("Escape");
  check(`${tag}: Escape inside the panel returns focus to the term`, (await panel.count()) === 0 && (await page.evaluate((id) => document.activeElement === document.querySelector(`.fides-glossary__item[data-term-id="${CSS.escape(id)}"] .fides-glossary__toggle`), term.id)));
  // Click again toggles closed.
  await button.click();
  await button.click();
  check(`${tag}: second click collapses`, (await panel.count()) === 0);
  // Opening another term moves the single panel.
  const other = data.find((t) => t.id !== term.id && t.description);
  await button.click();
  await page.locator(`.fides-glossary__item[data-term-id="${other.id}"] .fides-glossary__toggle`).click();
  check(`${tag}: opening another term closes the first`, (await panel.count()) === 1 && (await button.getAttribute("aria-expanded")) === "false");
  await page.locator(`.fides-glossary__item[data-term-id="${other.id}"] .fides-glossary__toggle`).click();
}

async function keyboard(page, data) {
  const tag = "keyboard";
  await open(page);
  const first = page.locator(".fides-glossary__toggle").first();
  await first.focus();
  await page.keyboard.press("Enter");
  check(`${tag}: Enter opens`, (await first.getAttribute("aria-expanded")) === "true");
  await page.keyboard.press("Space");
  check(`${tag}: Space closes`, (await first.getAttribute("aria-expanded")) === "false");
  await page.keyboard.press("Tab");
  const next = await page.evaluate(() => document.activeElement.querySelector?.(".fides-glossary__name")?.textContent || document.activeElement.textContent.trim());
  const second = await page.locator(".fides-glossary__name").nth(1).innerText();
  check(`${tag}: Tab follows the alphabetical order`, next.trim() === second.trim(), next);
  const ring = await page.evaluate(() => {
    const c = document.activeElement.closest(".fides-glossary__card");
    const s = getComputedStyle(c);
    return s.boxShadow !== "none" || s.outlineStyle !== "none";
  });
  check(`${tag}: focused row shows a ring`, ring);
}

async function hover(page) {
  await open(page);
  const card = page.locator(".fides-glossary__card").nth(3);
  const before = await card.evaluate((c) => getComputedStyle(c).backgroundColor);
  await card.hover();
  const after = await card.evaluate((c) => getComputedStyle(c).backgroundColor);
  check("hover: row background changes", before !== after, `${before} -> ${after}`);
  await page.mouse.move(0, 0);
}

async function search(page, width, data) {
  const tag = `search @${width}`;
  await open(page);
  const input = page.locator("#fides-glossary-search");
  const aliasTerm = data.find((t) => t.aliases && t.aliases.some((a) => !t.name.toLowerCase().includes(a.toLowerCase()) && a.length > 3));
  const alias = aliasTerm.aliases.find((a) => !aliasTerm.name.toLowerCase().includes(a.toLowerCase()) && a.length > 3);
  await input.fill(alias);
  const names = await page.locator(".fides-glossary__name").allInnerTexts();
  check(`${tag}: search finds a term by alias`, names.includes(aliasTerm.name), `${alias} -> ${names.slice(0, 4).join("|")}`);
  check(`${tag}: alias hit shows why it matched`, (await page.locator(".fides-glossary__alias").count()) > 0);
  check(`${tag}: count states the query`, new RegExp(`match “${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}”`).test(await countText(page)), await countText(page));
  const nameTerm = data.find((t) => t.name.length > 6 && !/[^\w\s]/.test(t.name));
  await input.fill(nameTerm.name.toUpperCase());
  check(`${tag}: search by name ignores case`, (await page.locator(".fides-glossary__name").allInnerTexts()).includes(nameTerm.name));
  await input.fill("");
  check(`${tag}: emptying the field restores every term`, (await rowsOf(page).count()) === data.length);

  // Empty state and clearing.
  await input.fill("zzzzqqqq");
  check(`${tag}: empty state names the query`, /No terms match “zzzzqqqq”/.test(await page.locator(".fides-glossary__empty").innerText()));
  check(`${tag}: count says 0 terms`, /^0 terms match/.test(await countText(page)), await countText(page));
  check(`${tag}: letters offer no action when nothing matches`, (await page.locator(".fides-glossary__letter-list button").count()) === 1);
  check(`${tag}: no horizontal overflow in the empty state`, !(await overflow(page)));
  await page.screenshot({ path: path.join(OUT, `glossary-empty-${width}.png`) });
  await page.locator("[data-glossary-empty-clear]").click();
  check(`${tag}: Clear search restores the list and focuses the field`, (await rowsOf(page).count()) === data.length && (await input.inputValue()) === "" && (await page.evaluate(() => document.activeElement.id)) === "fides-glossary-search");
  await input.fill("wallet");
  check(`${tag}: the clear control appears with a query`, await page.locator("[data-glossary-clear]").isVisible());
  const small = await page.locator("[data-glossary-clear]").evaluate((b) => b.getBoundingClientRect().height);
  check(`${tag}: clear control is at least 44px`, small >= 44, `${small}`);
  await page.locator("[data-glossary-clear]").click();
  check(`${tag}: the clear control empties the query`, (await input.inputValue()) === "" && (await rowsOf(page).count()) === data.length);
  await input.fill("wallet");
  await input.press("Escape");
  check(`${tag}: Escape clears the query`, (await input.inputValue()) === "");
  await input.fill("zz");
  await page.locator("[data-glossary-clear-bar]").click();
  check(`${tag}: Clear search in the results bar works`, (await input.inputValue()) === "");
  // Submit button.
  await input.fill("wal");
  await page.locator(".fides-glossary__submit").click();
  check(`${tag}: Search button keeps the filtered list`, (await rowsOf(page).count()) < data.length && (await rowsOf(page).count()) > 0);
}

async function letters(page, width, data) {
  const tag = `letters @${width}`;
  await open(page);
  const b = data.filter((t) => t.name.trim()[0].toUpperCase() === "B").length;
  await page.locator('.fides-glossary__letter-list button[data-letter="B"]').click();
  check(`${tag}: letter B shows only B terms`, (await rowsOf(page).count()) === b && (await page.locator(".fides-glossary__section").count()) === 1, `${await rowsOf(page).count()} vs ${b}`);
  check(`${tag}: active letter is marked and stated`, (await page.locator('button[data-letter="B"]').getAttribute("aria-pressed")) === "true" && /starting with B/.test(await countText(page)), await countText(page));
  check(`${tag}: focus stays on the letter`, (await page.evaluate(() => document.activeElement.getAttribute("data-letter"))) === "B");
  await page.locator("#fides-glossary-search").fill("wallet");
  // "wallet" has no B terms, so the letter falls back to All and the count says so.
  const stillB = await page.locator("button[data-letter=B][aria-pressed=true]").count();
  const sections = await page.locator(".fides-glossary__section").count();
  check(`${tag}: a letter without matches falls back to All`, stillB === 0 && sections > 1 && !/starting with/.test(await countText(page)), await countText(page));
  await page.locator("#fides-glossary-search").fill("");
  await page.locator('.fides-glossary__letter-list button[data-letter="A"]').click();
  await page.locator("#fides-glossary-search").fill("acc");
  check(`${tag}: letter and query combine`, (await page.locator("button[data-letter=A][aria-pressed=true]").count()) === 1 && /match “acc”, starting with A/.test(await countText(page)), await countText(page));
  await page.locator("#fides-glossary-search").fill("");
  await page.locator('.fides-glossary__letter-list button[data-letter=""]').click();
  check(`${tag}: All restores every term`, (await rowsOf(page).count()) === data.length);
}

async function deeplink(page, width, data) {
  const tag = `deeplink @${width}`;
  const term = data.find((t) => t.id === "attestation" && t.description) || data.find((t) => t.description);
  await open(page, `?term=${encodeURIComponent(term.id)}`);
  const button = page.locator(`.fides-glossary__item[data-term-id="${term.id}"] .fides-glossary__toggle`);
  check(`${tag}: ?term= opens the term inline`, (await button.getAttribute("aria-expanded")) === "true" && (await page.locator(".fides-glossary__panel").count()) === 1);
  check(`${tag}: focus lands on the term`, await button.evaluate((b) => b === document.activeElement));
  const visible = await page.locator(".fides-glossary__panel").evaluate((p) => {
    const r = p.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight + 1;
  });
  check(`${tag}: the definition is scrolled into view`, visible);
  check(`${tag}: no dialog opens`, (await page.locator("dialog[open], .fides-modal-overlay.active").count()) === 0);
  await open(page, "?term=does-not-exist");
  check(`${tag}: an unknown term shows the plain list`, (await page.locator(".fides-glossary__panel").count()) === 0 && (await rowsOf(page).count()) === data.length);
}

async function history(page, width, data) {
  const tag = `history @${width}`;
  const term = data.find((t) => t.description);
  await page.goto(`${BASE}/fides-design-pilot/learn/`, DOM_READY);
  await page.locator(width >= 900 ? ".fides-learn-bar__nav a[href*=glossary]" : ".fides-learn-bar__toggle").first().click().catch(() => {});
  if (width < 900) await page.locator(".fides-learn-bar__nav a[href*=glossary]").click();
  await page.waitForSelector("[data-glossary-ready]", { state: "attached", timeout: 20000 });
  check(`${tag}: the Learn bar opens the glossary`, /\/glossary\//.test(page.url()));
  await page.locator(`.fides-glossary__item[data-term-id="${term.id}"] .fides-glossary__toggle`).click();
  await page.goBack();
  check(`${tag}: Back returns to Learn, not to a half state`, /\/learn\/$/.test(page.url()), page.url());
  await page.goForward();
  await page.waitForSelector("[data-glossary-ready]", { state: "attached", timeout: 20000 });
  check(`${tag}: Forward restores the open term from the URL`, (await page.locator(".fides-glossary__panel").count()) === 1 && page.url().includes("term="));
  const back = page.locator(".fides-learn__crumbs a").first();
  if (width >= 600) {
    await back.click();
    check(`${tag}: breadcrumb Learn leads to the Learn overview`, /\/learn\/$/.test(page.url()), page.url());
  }
}

async function noScript(browser, data) {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}${GLOSSARY}`, DOM_READY);
  const info = await page.evaluate(() => ({ links: document.querySelectorAll(".fides-ssr-listing--vocabulary a").length, visible: getComputedStyle(document.querySelector("[data-fides-ssr]") || document.body).display }));
  check("without JavaScript the plugin listing stays available", info.links > 100, JSON.stringify(info));
  await context.close();
}

async function resize(page, data) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  const term = data.find((t) => t.name === "Attestation") || data[10];
  const button = page.locator(`.fides-glossary__item[data-term-id="${term.id}"] .fides-glossary__toggle`);
  await button.click();
  for (const width of [1100, 768, 390, 320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    const geo = await page.evaluate((id) => {
      const li = document.querySelector(`.fides-glossary__item[data-term-id="${CSS.escape(id)}"]`);
      const panel = li.parentNode.querySelector(".fides-glossary__panel");
      const lr = li.getBoundingClientRect();
      const rowItems = [...li.parentNode.children].filter((c) => c.classList.contains("fides-glossary__item") && Math.abs(c.getBoundingClientRect().top - lr.top) < 2);
      const rowBottom = Math.max(...rowItems.map((c) => c.getBoundingClientRect().bottom));
      return { panels: li.parentNode.querySelectorAll(".fides-glossary__panel").length, gap: Math.round(panel.getBoundingClientRect().top - rowBottom), open: li.querySelector("button").getAttribute("aria-expanded") };
    }, term.id);
    check(`resize to ${width}: the open term stays open directly under its row`, geo.panels === 1 && geo.open === "true" && geo.gap >= 0 && geo.gap <= 2, JSON.stringify(geo));
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME });
  const errors = [];
  try {
    const probe = await browser.newPage();
    await open(probe);
    const data = await sourceTerms(probe);
    await probe.close();
    check("glossary data loads from the existing sources", data.length > 100, `${data.length}`);
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 600 });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(`${width}: ${e.message}`));
      page.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text()) && errors.push(`${width}: ${m.text()}`));
      await overview(page, width, data);
      await longTerms(page, width);
      await inline(page, width, data);
      await search(page, width, data);
      await letters(page, width, data);
      await deeplink(page, width, data);
      await history(page, width, data);
      if (width === 1440) {
        await keyboard(page, data);
        await hover(page);
        await resize(page, data);
      }
      await context.close();
    }
    await noScript(browser, data);
    check("no script errors", errors.length === 0, errors.join(" | "));
  } finally {
    await browser.close();
  }
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
