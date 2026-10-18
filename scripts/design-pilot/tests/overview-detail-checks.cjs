/**
 * Overview and detail browser checks (brief 2026-10-18).
 *
 * Overview, desktop: row card, search on Enter, popover keeps open on choice,
 * Escape order (list, then More filters), technical OR/AND, Clear filters keeps
 * the search, URL state with Back, "Back to results" from a detail page.
 * Overview, mobile: Filters dialog focus, Cancel discards, Apply commits.
 * Detail, per width and record: desktop 800/64/480 columns, mobile reading
 * order, ecosystem accordions (<=3 open), technical details closed, Show all
 * organisations, Read full / Show less without losing position, anchors
 * opening hidden content, media gallery selection and in-place play, invalid
 * source links without destination, no related or promo block, 44 px targets
 * and no horizontal overflow.
 *
 * Run through run-overview-detail-checks.sh.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const OVERVIEW = `${BASE}/fides-design-pilot/overview/`;
const DETAIL = `${BASE}/fides-design-pilot/use-case/?usecase=`;
const RECORDS = (process.env.DETAIL_SLUGS || [
  "end-to-end-digital-business-workflows-transforming-kyb-kyc-kys-via-eu-business-wallet-F665Dh",
  "open-bank-account-Ejx887",
  "tax-splitter-real-time-vat-collection-with-verifiable-organisational-identity-ZQey1U",
].join(",")).split(",");
const DETAIL_WIDTHS = (process.env.DETAIL_WIDTHS || "1440,768,390,320").split(",").map(Number);

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

/* 44 px, or 40 px with a mouse from 1100 px (compact desktop). */
function smallTargets(page) {
  return page.evaluate(() => {
    const min = innerWidth >= 1100 && matchMedia("(pointer: fine)").matches ? 40 : 44;
    return [...document.querySelectorAll(".fides-ds-shell__main :is(input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, button, summary, [role=button], a.fides-ds-action-link, a.fides-ds-button)")]
      .filter((n) => n.getClientRects().length && getComputedStyle(n).visibility !== "hidden")
      .map((n) => {
        const r = n.getBoundingClientRect();
        return { el: (n.getAttribute("aria-label") || n.textContent || n.tagName).trim().replace(/\s+/g, " ").slice(0, 40), h: Math.round(r.height) };
      })
      .filter((c) => c.h < min);
  });
}

const count = (page) => page.locator("[data-pilot-count]").first().textContent().then((t) => Number((t.match(/\d+/) || [NaN])[0]));
const param = (page, key) => new URL(page.url()).searchParams.get(key);

async function overviewDesktop(browser) {
  const context = await newContext(browser, 1440, 900);
  const page = await context.newPage();
  await open(page, OVERVIEW);
  await page.locator(".fides-ds-card--row").first().waitFor({ timeout: 20000 });
  const total = await count(page);
  check("overview: catalog count is shown without a temporary 0", total > 0, String(total));

  const card = await page.evaluate(() => {
    const row = document.querySelector(".fides-ds-card--row");
    const media = row.querySelector(".fides-ds-card__media");
    const summary = row.querySelector(".fides-ds-card__summary");
    const title = row.querySelector(".fides-ds-card__title, h2, h3");
    return {
      links: row.querySelectorAll("a.fides-ds-card__link").length,
      arrowInLink: Boolean(row.querySelector("a.fides-ds-card__link .fides-ds-card__arrow")),
      media: media ? [Math.round(media.getBoundingClientRect().width), Math.round(media.getBoundingClientRect().height)] : null,
      clamp: summary ? getComputedStyle(summary).webkitLineClamp : "",
      title: title ? [getComputedStyle(title).fontSize, getComputedStyle(title).lineHeight, getComputedStyle(title).fontWeight] : null,
    };
  });
  check("overview: title and arrow are one link", card.links === 1 && card.arrowInLink, JSON.stringify(card));
  check("overview: compact media box is 120x75", !card.media || (card.media[0] === 120 && card.media[1] === 75), JSON.stringify(card.media));
  check("overview: summary clamps to 2 lines; compact title 20/26 bold", card.clamp === "2" && card.title && card.title[0] === "20px" && card.title[1] === "26px" && Number(card.title[2]) >= 700, JSON.stringify(card));

  await page.fill("#fides-search-input", "wallet");
  await page.press("#fides-search-input", "Enter");
  await page.waitForFunction(() => new URL(location.href).searchParams.get("q") === "wallet");
  const searched = await count(page);
  check("overview: Enter runs the search and writes q to the URL", searched > 0 && searched <= total, `${searched}/${total}`);

  const country = page.locator('[data-fides-ds-popover][data-pilot-keys="country"]');
  await country.locator(".fides-ds-popover__toggle").click();
  await country.locator('input[type="checkbox"]').first().check();
  await page.waitForTimeout(200);
  const stillOpen = await page.locator('[data-fides-ds-popover][data-pilot-keys="country"] .fides-ds-popover__toggle').getAttribute("aria-expanded");
  check("overview: choosing an option keeps the list open", stillOpen === "true", stillOpen);
  check("overview: filter goes to the URL and keeps the search", Boolean(param(page, "country")) && param(page, "q") === "wallet", page.url());
  await page.keyboard.press("Escape");
  const focusOnToggle = await page.evaluate(() => document.activeElement && document.activeElement.matches('[data-pilot-keys="country"] .fides-ds-popover__toggle'));
  check("overview: Escape closes the list and returns focus to its toggle", focusOnToggle && (await page.locator('[data-pilot-keys="country"] .fides-ds-popover__toggle').getAttribute("aria-expanded")) === "false");

  await page.locator("[data-pilot-more-toggle]").click();
  const more = await page.evaluate(() => ({
    expanded: document.querySelector("[data-pilot-more-toggle]").getAttribute("aria-expanded"),
    visible: !document.getElementById("fides-uc-pilot-more").hidden,
    repeated: document.querySelector("[data-pilot-count]").classList.contains("is-repeated"),
    technical: document.querySelector("[data-pilot-tech-toggle]") && document.querySelector("[data-pilot-tech-toggle]").getAttribute("aria-expanded"),
    modal: document.getElementById("fides-uc-pilot-more").getAttribute("aria-modal"),
  }));
  check("overview: More filters opens in flow, not modal, count not repeated", more.expanded === "true" && more.visible && more.repeated && more.modal !== "true", JSON.stringify(more));
  check("overview: Technical filters start closed", more.technical === "false", JSON.stringify(more));
  await page.locator("[data-pilot-tech-toggle]").click();

  await page.locator("#fides-clear").click();
  await page.waitForTimeout(200);
  check("overview: Clear filters keeps the search", !param(page, "country") && param(page, "q") === "wallet", page.url());
  await page.fill("#fides-search-input", "");
  await page.press("#fides-search-input", "Enter");
  await page.waitForFunction(() => !new URL(location.href).searchParams.get("q"));
  if ((await page.locator("[data-pilot-more-toggle]").getAttribute("aria-expanded")) !== "true") await page.locator("[data-pilot-more-toggle]").click();
  if ((await page.locator("[data-pilot-tech-toggle]").getAttribute("aria-expanded")) !== "true") await page.locator("[data-pilot-tech-toggle]").click();

  const format = page.locator('[data-fides-ds-popover][data-pilot-keys="vcFormats"]');
  await format.locator(".fides-ds-popover__toggle").click();
  const boxes = format.locator('input[type="checkbox"]');
  await boxes.nth(0).check();
  await page.waitForTimeout(150);
  const one = await count(page);
  await boxes.nth(1).check();
  await page.waitForTimeout(150);
  const either = await count(page);
  check("overview: options within one group combine with OR", either >= one, `${one} -> ${either}`);
  await page.keyboard.press("Escape");
  const mode = page.locator('[data-fides-ds-popover][data-pilot-keys="interactionModes"]');
  await mode.locator(".fides-ds-popover__toggle").click();
  await mode.locator('input[type="checkbox"]').first().check();
  await page.waitForTimeout(150);
  const both = await count(page);
  check("overview: groups combine with AND", both <= either, `${either} -> ${both}`);
  await page.keyboard.press("Escape");
  const listClosedMoreOpen = await page.evaluate(() => !document.querySelector("[data-fides-ds-popover].is-open") && !document.getElementById("fides-uc-pilot-more").hidden);
  await page.keyboard.press("Escape");
  const moreClosed = await page.evaluate(() => document.getElementById("fides-uc-pilot-more").hidden);
  check("overview: Escape closes the list first, then More filters", listClosedMoreOpen && moreClosed, `${listClosedMoreOpen} ${moreClosed}`);
  const badge = (await page.locator("[data-pilot-more-badge]").textContent().catch(() => "")).trim();
  check("overview: More filters label counts panel selections", /3/.test(badge), badge);

  const filteredUrl = page.url();
  await page.locator("#fides-clear").click();
  await page.waitForTimeout(200);
  await page.goBack();
  await page.waitForTimeout(400);
  check("overview: Back restores the previous filter state", page.url() === filteredUrl && (await count(page)) === both, page.url());

  await page.locator("#fides-clear").click();
  await page.fill("#fides-search-input", "bank");
  await page.press("#fides-search-input", "Enter");
  await page.waitForFunction(() => new URL(location.href).searchParams.get("q") === "bank");
  const listUrl = page.url();
  const link = page.locator(".fides-ds-card--row a.fides-ds-card__link").first();
  const href = await link.getAttribute("href");
  await link.click();
  await page.waitForURL((u) => u.href.includes("usecase="));
  await page.waitForTimeout(300);
  const back = await page.evaluate(() => {
    const a = document.querySelector("[data-fides-ds-back]");
    return { text: a.textContent.trim(), href: a.getAttribute("href") };
  });
  check("detail: Back to results points at the overview state", /Back to results/.test(back.text) && back.href.includes("q=bank"), JSON.stringify(back));
  await page.goBack();
  await page.locator(".fides-ds-card--row").first().waitFor();
  await page.waitForTimeout(500);
  const restored = await page.evaluate((h) => ({
    url: location.href,
    focus: document.activeElement && document.activeElement.getAttribute("href") === h,
    search: document.getElementById("fides-search-input").value,
  }), href);
  check("overview: browser Back restores search, URL and focus on the opened link", restored.url === listUrl && restored.search === "bank" && restored.focus, JSON.stringify(restored));
  await context.close();

  const direct = await newContext(browser, 1440, 900);
  const p2 = await direct.newPage();
  await open(p2, DETAIL + RECORDS[1]);
  const plain = await p2.evaluate(() => document.querySelector("[data-fides-ds-back]").textContent.trim());
  check("detail: a direct URL gets a normal overview link", /All use cases/.test(plain), plain);
  await direct.close();
}

async function overviewMobile(browser, width) {
  const context = await newContext(browser, width, 844);
  const page = await context.newPage();
  await open(page, OVERVIEW);
  await page.locator(".fides-ds-card--row").first().waitFor({ timeout: 20000 });
  const tag = `overview @${width}`;
  const toggle = page.locator("[data-pilot-open]");
  await toggle.click();
  const opened = await page.evaluate(() => {
    const panel = document.getElementById("fides-uc-pilot-filter-panel");
    return { role: panel.getAttribute("role"), modal: panel.getAttribute("aria-modal"), focus: document.activeElement && document.activeElement.matches(".fides-uc-pilot__panel-close, [data-pilot-cancel]") };
  });
  check(`${tag}: Filters opens a dialog with focus on the close button`, opened.role === "dialog" && opened.focus, JSON.stringify(opened));
  const before = page.url();
  const country = page.locator('[data-fides-ds-popover][data-pilot-keys="country"]');
  await country.locator(".fides-ds-popover__toggle").click();
  const widths = await country.evaluate((n) => [n.querySelector(".fides-ds-popover__toggle"), n.querySelector(".fides-ds-popover__panel")].map((el) => Math.round(el.getBoundingClientRect().width)));
  check(`${tag}: option list in the dialog is as wide as its toggle`, widths[0] === widths[1], JSON.stringify(widths));
  await country.locator('input[type="checkbox"]').first().check();
  await page.locator(".fides-uc-pilot__panel-actions [data-pilot-cancel]").click();
  await page.waitForTimeout(200);
  const afterCancel = await page.evaluate(() => ({ checked: document.querySelectorAll('[data-pilot-keys="country"] input:checked').length, focus: document.activeElement && document.activeElement.hasAttribute("data-pilot-open") }));
  check(`${tag}: Cancel discards temporary choices and returns focus`, page.url() === before && afterCancel.checked === 0 && afterCancel.focus, JSON.stringify(afterCancel));
  await toggle.click();
  await country.locator(".fides-ds-popover__toggle").click();
  await country.locator('input[type="checkbox"]').first().check();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check(`${tag}: Escape discards as well`, page.url() === before && !(await page.locator("#fides-uc-pilot-filter-panel[role=dialog]").count()));
  await toggle.click();
  await country.locator(".fides-ds-popover__toggle").click();
  await country.locator('input[type="checkbox"]').first().check();
  await page.locator("[data-pilot-apply]").click();
  await page.waitForTimeout(300);
  check(`${tag}: Apply filters commits to the URL and returns focus`, Boolean(param(page, "country")) && (await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-pilot-open"))), page.url());
  check(`${tag}: no horizontal overflow`, !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  const small = await smallTargets(page);
  check(`${tag}: no functional target under 44 px`, small.length === 0, JSON.stringify(small));
  await context.close();
}

async function detailChecks(browser, width, slug) {
  const context = await newContext(browser, width, width >= 1100 ? 900 : 844);
  const page = await context.newPage();
  const tag = `detail @${width} ${slug.slice(0, 20)}`;
  await open(page, DETAIL + slug);
  await page.locator(".fides-uc-detail__hero").waitFor();
  await page.waitForTimeout(300);
  const wide = width >= 1100;
  const s = await page.evaluate(() => {
    const box = (sel) => { const n = document.querySelector(sel); if (!n || !n.getClientRects().length) return null; const r = n.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), left: Math.round(r.left), width: Math.round(r.width) }; };
    const eco = document.querySelector(".fides-uc-ecosystem");
    const groups = [...document.querySelectorAll(".fides-uc-ecosystem__group")].map((g) => ({
      n: g.querySelectorAll(".fides-uc-relations__item").length,
      expanded: g.querySelector(".fides-ds-collapsible__toggle") ? g.querySelector(".fides-ds-collapsible__toggle").getAttribute("aria-expanded") : null,
    }));
    return {
      main: box(".fides-uc-detail__main"), aside: box(".fides-uc-detail__aside"),
      order: ["#overview", "#user-journey", "#organisations", "#ecosystem", "#technical-details", ".fides-uc-detail__tags", "#media", "#update"].map((sel) => [sel, box(sel)]).filter(([, b]) => b).map(([sel, b]) => [sel, b.top]),
      summaryVisible: Boolean(box(".fides-uc-ecosystem-summary")),
      groups, compact: eco ? eco.classList.contains("fides-uc-ecosystem--compact") : null,
      technical: document.querySelector("#technical-details .fides-ds-collapsible__toggle") ? document.querySelector("#technical-details .fides-ds-collapsible__toggle").getAttribute("aria-expanded") : null,
      orgs: document.querySelectorAll("#organisations-list > li").length,
      orgsVisible: [...document.querySelectorAll("#organisations-list > li")].filter((n) => n.getClientRects().length).length,
      related: Boolean(document.querySelector(".fides-uc-detail__related, .fides-uc-detail__contribute")),
      topics: [...document.querySelectorAll("h2")].some((h) => /^Topics$/i.test(h.textContent.trim())),
      badHref: [...document.querySelectorAll(".fides-uc-detail a[href]")].filter((a) => /^https?:\/\/[^/]*(%20|\s)/i.test(a.getAttribute("href"))).length,
      heroOrg: Boolean(document.querySelector(".fides-uc-detail__hero .fides-uc-detail__owner")),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  if (wide) {
    check(`${tag}: 800 / 64 / 480 columns`, s.main && s.aside && s.main.width === 800 && s.aside.width === 480 && s.aside.left - (s.main.left + s.main.width) === 64, JSON.stringify([s.main, s.aside]));
    check(`${tag}: ecosystem summary in the side column, no accordions`, s.summaryVisible && s.groups.every((g) => g.expanded === null) && s.technical === null, JSON.stringify(s.groups));
    check(`${tag}: all organisations visible`, s.orgsVisible === s.orgs);
  } else {
    const tops = s.order.map(([, top]) => top);
    check(`${tag}: mobile reading order`, tops.every((t, i) => i === 0 || t > tops[i - 1]), JSON.stringify(s.order));
    check(`${tag}: groups with <=3 start open, longer ones closed`, s.groups.every((g) => g.expanded === (g.n <= 3 ? "true" : "false")), JSON.stringify(s.groups));
    check(`${tag}: technical details start closed`, s.technical === null || s.technical === "false", String(s.technical));
    check(`${tag}: at most 3 organisations before Show all`, s.orgs <= 3 ? s.orgsVisible === s.orgs : s.orgsVisible === 3, `${s.orgsVisible}/${s.orgs}`);
    check(`${tag}: ecosystem summary card hidden`, !s.summaryVisible);
  }
  check(`${tag}: ecosystem variant follows the <=3 rule`, s.compact === null || s.compact === s.groups.every((g) => g.n <= 3), JSON.stringify(s.groups));
  check(`${tag}: no related use cases or contribute promo; no Topics heading; no organisation in hero`, !s.related && !s.topics && !s.heroOrg);
  check(`${tag}: invalid source links get no destination`, s.badHref === 0, String(s.badHref));
  check(`${tag}: no horizontal overflow`, !s.overflow);
  const small = await smallTargets(page);
  check(`${tag}: no functional target under 44 px`, small.length === 0, JSON.stringify(small));

  if (!wide) {
    const closed = await page.$('.fides-uc-ecosystem__group .fides-ds-collapsible__toggle[aria-expanded="false"]');
    if (closed) {
      await closed.focus();
      await page.keyboard.press("Enter");
      const body = await closed.evaluate((b) => !document.getElementById(b.getAttribute("aria-controls")).hidden && b.getAttribute("aria-expanded") === "true");
      check(`${tag}: accordion opens by keyboard`, body);
    }
    const showAll = page.locator(".fides-ds-show-all__toggle");
    if (await showAll.count()) {
      await showAll.click();
      const all = await page.evaluate(() => [...document.querySelectorAll("#organisations-list > li")].every((n) => n.getClientRects().length));
      check(`${tag}: Show all reveals every organisation`, all && (await showAll.getAttribute("aria-expanded")) === "true");
    }
    const read = page.locator(".fides-ds-readmore__toggle").first();
    if (await read.count()) {
      const label = (await read.textContent()).trim();
      const full = await read.evaluate((b) => document.getElementById(b.getAttribute("aria-controls")).textContent.length);
      await read.click();
      const expanded = await read.getAttribute("aria-expanded");
      await read.scrollIntoViewIfNeeded();
      const before = await read.evaluate((b) => b.getBoundingClientRect().top);
      await read.click();
      await page.waitForTimeout(100);
      const after = await read.evaluate((b) => b.getBoundingClientRect().top);
      check(`${tag}: "${label}" expands; full text stays in the DOM`, /^Read full/.test(label) && expanded === "true" && full > 200, `${label} ${expanded}`);
      check(`${tag}: Show less keeps the toggle in place`, Math.abs(after - before) < 2, `${before} -> ${after}`);
    }
    if (await page.locator("#technical-details .fides-ds-collapsible__toggle").count()) {
      await page.evaluate(() => { const d = document.querySelector("[data-fides-ds-section-nav]"); if (d) d.open = true; });
      await page.locator('.fides-uc-detail__sections a[href="#technical-details"]').click();
      await page.waitForTimeout(200);
      check(`${tag}: anchor link opens the collapsed technical details`, (await page.locator("#technical-details .fides-ds-collapsible__toggle").getAttribute("aria-expanded")) === "true");
    }
  }

  const thumbs = page.locator(".fides-ds-gallery__thumb");
  const lonePlay = page.locator("#media button[data-fides-ds-gallery-play][data-embed]");
  if ((await thumbs.count()) === 0 && (await lonePlay.count())) {
    await lonePlay.click();
    check(`${tag}: a single video plays in place`, (await page.locator("#media .fides-ds-gallery__frame iframe").count()) === 1);
  }
  if ((await thumbs.count()) > 1) {
    await thumbs.nth(1).click();
    const current = await thumbs.nth(1).getAttribute("aria-current");
    check(`${tag}: gallery selects in the same stage`, current === "true" && page.url().includes("usecase="));
    const video = page.locator('.fides-ds-gallery__thumb[data-kind="video"]').first();
    if ((await video.count()) && (await video.getAttribute("data-embed"))) {
      await video.click();
      await page.locator("[data-fides-ds-gallery-play]").click();
      check(`${tag}: video plays in place`, (await page.locator(".fides-ds-gallery__frame iframe").count()) === 1);
    }
  }
  await page.screenshot({ path: path.join(OUT, `detail-${width}-${slug.slice(0, 12)}.png`), fullPage: true });
  await context.close();
}

/* Production deployment is a multi-select list: both values survive the URL, history and the mobile dialog. */
async function statusChecks(browser) {
  const context = await newContext(browser, 1440, 900);
  const page = await context.newPage();
  await open(page, OVERVIEW);
  await page.locator(".fides-ds-card--row").first().waitFor({ timeout: 20000 });
  const values = await page.$$eval('[data-pilot-keys="productionDeployment"] input[type="checkbox"]', (inputs) => inputs.map((i) => i.value));
  check("status: Production deployment is a multi-select list in More filters", values.length >= 2 && (await page.locator('#fides-uc-pilot-more [data-pilot-keys="productionDeployment"] .fides-ds-popover__toggle').count()) === 1 && (await page.locator("select[data-pilot-status], #fides-uc-pilot-status").count()) === 0, JSON.stringify(values));
  const both = values.slice(0, 2);
  const state = () => page.evaluate(() => ({
    checked: [...document.querySelectorAll('[data-pilot-keys="productionDeployment"] input:checked')].map((i) => i.value),
    summary: document.querySelector('[data-pilot-keys="productionDeployment"] .fides-ds-popover__toggle').textContent.replace(/\s+/g, " ").trim(),
    pills: document.querySelectorAll('.fides-uc-pilot__pill[data-pilot-remove-group="productionDeployment"]').length,
    status: new URL(location.href).searchParams.get("status"),
  }));
  await open(page, `${OVERVIEW}?status=${both.map(encodeURIComponent).join(",")}`);
  await page.locator(".fides-ds-card--row").first().waitFor({ timeout: 20000 });
  const fromUrl = await state();
  check("status: a URL with two values shows both selected, not All statuses", fromUrl.checked.length === 2 && !/All statuses/.test(fromUrl.summary) && fromUrl.pills === 2, JSON.stringify(fromUrl));
  const withBoth = await count(page);
  await page.locator(`.fides-uc-pilot__pill[data-pilot-remove-group="productionDeployment"][data-pilot-remove-value="${both[1]}"]`).click();
  await page.waitForTimeout(250);
  const one = await state();
  check("status: removing one value keeps the other in the URL", one.status === both[0] && one.checked.length === 1, JSON.stringify(one));
  await page.goBack();
  await page.waitForTimeout(400);
  const back = await state();
  check("status: Back restores both values and the count", back.checked.length === 2 && back.status === both.join(",") && (await count(page)) === withBoth, JSON.stringify(back));
  await page.goForward();
  await page.waitForTimeout(400);
  check("status: Forward returns to one value", (await state()).checked.length === 1);
  await context.close();

  const mobile = await newContext(browser, 390, 844);
  const m = await mobile.newPage();
  await open(m, `${OVERVIEW}?status=${both.map(encodeURIComponent).join(",")}`);
  await m.locator(".fides-ds-card--row").first().waitFor({ timeout: 20000 });
  const mState = () => m.evaluate(() => ({
    checked: [...document.querySelectorAll('[data-pilot-keys="productionDeployment"] input:checked')].map((i) => i.value),
    status: new URL(location.href).searchParams.get("status"),
  }));
  await m.locator("[data-pilot-open]").click();
  const inDialog = await mState();
  check("status @390: the Filters dialog shows both values selected", inDialog.checked.length === 2, JSON.stringify(inDialog));
  const pop = m.locator('[data-fides-ds-popover][data-pilot-keys="productionDeployment"]');
  if ((await pop.locator(".fides-ds-popover__toggle").getAttribute("aria-expanded")) !== "true") await pop.locator(".fides-ds-popover__toggle").click();
  await pop.locator(`input[value="${both[1]}"]`).uncheck();
  await m.locator(".fides-uc-pilot__panel-actions [data-pilot-cancel]").click();
  await m.waitForTimeout(250);
  const cancelled = await mState();
  check("status @390: Cancel keeps both values", cancelled.checked.length === 2 && cancelled.status === both.join(","), JSON.stringify(cancelled));
  await m.locator("[data-pilot-open]").click();
  if ((await pop.locator(".fides-ds-popover__toggle").getAttribute("aria-expanded")) !== "true") await pop.locator(".fides-ds-popover__toggle").click();
  await pop.locator(`input[value="${both[1]}"]`).uncheck();
  await m.locator("[data-pilot-apply]").click();
  await m.waitForTimeout(300);
  const applied = await mState();
  check("status @390: Apply commits one value", applied.status === both[0] && applied.checked.length === 1, JSON.stringify(applied));
  await m.goBack();
  await m.waitForTimeout(400);
  check("status @390: Back restores both values", (await mState()).checked.length === 2);
  await mobile.close();
}

/* The preview is whole blocks: shown blocks are complete, later blocks are hidden for everyone. */
function readmoreState(page) {
  return page.evaluate(() => [...document.querySelectorAll("[data-fides-ds-readmore]")].map((root) => {
    const body = root.querySelector(".fides-ds-readmore__body");
    const toggle = root.querySelector(".fides-ds-readmore__toggle");
    const blocks = [...body.querySelectorAll("p, li")];
    const shown = blocks.filter((n) => n.getClientRects().length);
    const hidden = blocks.filter((n) => !n.getClientRects().length);
    const bodyRect = body.getBoundingClientRect();
    const focusableHidden = [...body.querySelectorAll("a[href], button, input, select, textarea, [tabindex]")].filter((n) => !n.getClientRects().length && n.closest("[hidden]") === null).length;
    return {
      id: body.id,
      expanded: toggle ? toggle.getAttribute("aria-expanded") : null,
      blocks: blocks.length,
      shown: shown.length,
      firstWhole: blocks.length > 0 && shown[0] === blocks[0],
      prefix: shown.every((n, i) => n === blocks[i]),
      unclipped: body.scrollHeight <= body.clientHeight + 1 && !body.style.maxHeight && shown.every((n) => n.getBoundingClientRect().bottom <= bodyRect.bottom + 1),
      hiddenOut: hidden.every((n) => n.closest("[hidden]") !== null),
      focusableHidden,
    };
  }));
}

async function readmoreChecks(browser) {
  for (const width of [390, 320]) {
    for (const slug of RECORDS) {
      const context = await newContext(browser, width, 844);
      const page = await context.newPage();
      const tag = `preview @${width} ${slug.slice(0, 20)}`;
      await open(page, DETAIL + slug);
      await page.locator(".fides-uc-detail__hero").waitFor();
      await page.waitForTimeout(300);
      const boxes = await readmoreState(page);
      for (const b of boxes) {
        if (b.expanded === null) {
          check(`${tag} ${b.id}: short text stays whole without a button`, b.shown === b.blocks, JSON.stringify(b));
          continue;
        }
        check(`${tag} ${b.id}: preview ends on a whole block (${b.shown}/${b.blocks})`, b.expanded === "false" && b.firstWhole && b.prefix && b.unclipped && b.shown < b.blocks, JSON.stringify(b));
        check(`${tag} ${b.id}: collapsed blocks are hidden from the accessibility tree and focus`, b.hiddenOut && b.focusableHidden === 0, JSON.stringify(b));
      }
      const toggles = page.locator(".fides-ds-readmore__toggle");
      if ((await toggles.count()) >= 2) {
        await toggles.nth(0).click();
        const after = await readmoreState(page);
        const [first, second] = after.filter((b) => b.expanded !== null);
        check(`${tag}: overview and journey expand independently`, first.expanded === "true" && first.shown === first.blocks && second.expanded === "false" && second.shown < second.blocks, JSON.stringify([first, second]));
        await toggles.nth(0).click();
        const focus = await toggles.nth(0).evaluate((b) => b === document.activeElement && b.getAttribute("aria-expanded") === "false");
        check(`${tag}: Show less keeps keyboard focus on the toggle`, focus);
      }
      await context.close();
    }
  }
  const noJs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const page = await noJs.newPage();
  await open(page, DETAIL + RECORDS[0]);
  const plain = await page.evaluate(() => [...document.querySelectorAll("[data-fides-ds-readmore] .fides-ds-readmore__body")].map((body) => ({
    hidden: body.querySelectorAll("[hidden]").length,
    toggle: body.parentElement.querySelectorAll(".fides-ds-readmore__toggle").length,
  })));
  check("preview without JS: the full text is shown, no toggle", plain.length > 0 && plain.every((b) => b.hidden === 0 && b.toggle === 0), JSON.stringify(plain));
  await noJs.close();
}

/* Hero at 1440: compact title 36/42, text column 792 and image column 520. */
async function heroChecks(browser) {
  const context = await newContext(browser, 1440, 900);
  const page = await context.newPage();
  for (const slug of RECORDS) {
    await open(page, DETAIL + slug);
    await page.locator(".fides-uc-detail__hero").waitFor();
    const h = await page.evaluate(() => {
      const hero = document.querySelector(".fides-uc-detail__hero");
      const cols = getComputedStyle(hero).gridTemplateColumns.split(" ").map((v) => Math.round(parseFloat(v)));
      const title = getComputedStyle(document.querySelector(".fides-uc-detail__title"));
      return { cols, size: title.fontSize, leading: title.lineHeight, media: hero.classList.contains("fides-uc-detail__hero--no-media") ? null : true };
    });
    check(`hero @1440 ${slug.slice(0, 20)}: title 36/42`, h.size === "36px" && h.leading === "42px", JSON.stringify(h));
    check(`hero @1440 ${slug.slice(0, 20)}: columns 792 / 520`, h.media === null || (h.cols[0] === 792 && h.cols[1] === 520), JSON.stringify(h.cols));
    const poster = page.locator("a.fides-uc-detail__media--video[data-fides-ds-play]");
    if (await poster.count()) {
      const name = (await poster.textContent()).trim();
      await poster.click();
      await page.waitForTimeout(400);
      check(`hero @1440 ${slug.slice(0, 20)}: a video poster in the hero plays the video in the media section`, /^Play video:/.test(name) && (await page.locator("#media .fides-ds-gallery__frame iframe").count()) === 1, name);
    }
  }
  await context.close();
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    await overviewDesktop(browser);
    for (const width of [390, 320]) await overviewMobile(browser, width);
    await statusChecks(browser);
    await readmoreChecks(browser);
    await heroChecks(browser);
    for (const width of DETAIL_WIDTHS) for (const slug of RECORDS) await detailChecks(browser, width, slug);
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`# pass ${results.length - failed}\n# fail ${failed}`);
  if (failed) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
