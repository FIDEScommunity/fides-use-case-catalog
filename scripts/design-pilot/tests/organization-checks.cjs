/**
 * Organization overview and detail browser checks (organization pilot brief v1).
 *
 * Server render: first page, count and pager without JavaScript, page and
 * sort from the URL, the script keeping the server rows (no shift, typed text
 * and focus kept), a stored sort preference, and failed catalog data.
 * Overview: rows (120 × 75 contain logo, name placeholder, role chips, facts
 * line, arrow), search only on submit, popover filters with URL state, pager
 * on its own row, zero results, Back restoring filters, page, scroll and focus,
 * old ?org= links opening the pilot detail; mobile logo next to the name,
 * Add link hidden, Filters dialog.
 * Detail: columns 792/520 with a 32 px gap, overview text <= 720 px, linked use
 * cases alphabetical with one visible row on phones, relations labelled per
 * kind, news band background, gallery contract, empty groups hidden, minimal
 * profiles, 44 px targets and no horizontal overflow at 1440/768/390/320.
 *
 * Run through run-organization-checks.sh.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const OVERVIEW = `${BASE}/fides-design-pilot/organizations/`;
const DETAIL = `${BASE}/fides-design-pilot/organization/?org=`;
const RECORDS = (process.env.ORG_IDS || [
  "org:credenco",
  "org:fides",
  "org:3g-soluciones-movilidad",
  "org:addtowallet",
  "org:sphereon",
  "org:adpriva",
  "org:sda-dms-zartkoruen-mukodo-reszvenytarsasag",
].join(",")).split(",");
const WIDTHS = (process.env.DETAIL_WIDTHS || "1440,768,390,320").split(",").map(Number);

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

function smallTargets(page) {
  return page.evaluate(() => {
    const min = innerWidth >= 1100 && matchMedia("(pointer: fine)").matches ? 40 : 44;
    return [...document.querySelectorAll(".fides-ds-shell__main :is(input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, button, summary, [role=button], a.fides-ds-action-link, a.fides-ds-button)")]
      .filter((el) => el.offsetParent !== null && !el.closest("[hidden], .fides-ds-visually-hidden"))
      .map((el) => ({ el, box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && box.height > 0 && box.height < min - 0.5)
      .map(({ el, box }) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} "${(el.textContent || "").trim().slice(0, 30)}" ${Math.round(box.height)}px`);
  });
}

function overflowX(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/** Rows rendered by the script (the server-rendered first state is replaced on mount). */
async function waitForRows(page) {
  await page.waitForSelector("#fides-org-catalog-root .fides-uc-pilot__count", { timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector("#fides-org-catalog-root [data-pilot-ssr]"), null, { timeout: 30000 });
}

function firstRowBox(page) {
  return page.evaluate(() => {
    const row = document.querySelector(".fides-uc-pilot__list .fides-ds-card--row");
    if (!row) return null;
    const box = row.getBoundingClientRect();
    return { y: Math.round(box.top + scrollY), h: Math.round(box.height), title: row.querySelector(".fides-ds-card__title")?.textContent.trim() || "" };
  });
}

/** Server-rendered first page: without JavaScript, hand-over to the script, and the fallbacks. */
async function overviewServerRender(browser) {
  const noJs = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const plain = await noJs.newPage();
  await open(plain, OVERVIEW);
  const html = await plain.evaluate(() => {
    const root = document.querySelector("#fides-org-catalog-root");
    const visible = (el) => !!el && el.getClientRects().length > 0;
    const rows = [...root.querySelectorAll(".fides-uc-pilot__list > li")];
    const next = root.querySelector(".fides-catalog-pagination__next");
    return {
      rows: rows.length,
      rowsVisible: rows.length > 0 && rows.every(visible),
      count: root.querySelector("[data-pilot-count]")?.textContent.trim() || "",
      pagerMeta: root.querySelector(".fides-catalog-pagination__meta")?.textContent.trim() || "",
      next: next ? next.getAttribute("href") : "",
      title: root.querySelector("h1")?.textContent.trim() || "",
      href: root.querySelector(".fides-ds-card__link")?.getAttribute("href") || "",
      spinner: visible(root.querySelector(".fides-loading, [data-pilot-loading]")),
    };
  });
  await plain.screenshot({ path: path.join(OUT, "overview-ssr-nojs-1440.png") });
  check("ssr: 48 visible rows without JavaScript", html.rows === 48 && html.rowsVisible, `${html.rows} ${html.rowsVisible}`);
  check("ssr: count and pager without JavaScript", /^\d+ organizations$/.test(html.count) && /^Page 1 of \d+$/.test(html.pagerMeta), `${html.count} ${html.pagerMeta}`);
  check("ssr: Next is a real page link", /[?&]catalog_page=2\b/.test(html.next), html.next);
  check("ssr: title and row link to pilot detail", html.title === "Organizations" && html.href.includes("/fides-design-pilot/organization/?org=org%3A"), `${html.title} ${html.href}`);
  check("ssr: no loading state", !html.spinner);
  await open(plain, `${OVERVIEW}?catalog_page=2&sort=name`);
  const page2 = await plain.evaluate(() => ({
    meta: document.querySelector(".fides-catalog-pagination__meta")?.textContent.trim() || "",
    sort: document.querySelector("#fides-sort-select")?.value || "",
    current: document.querySelector(".fides-catalog-pagination [aria-current=page]")?.textContent.trim() || "",
  }));
  check("ssr: page and sort from the URL", /^Page 2 of/.test(page2.meta) && page2.sort === "name" && page2.current === "2", JSON.stringify(page2));
  await noJs.close();

  // Slow catalog data: the server page is usable at once, typed text and focus survive the hand-over.
  const context = await newContext(browser, 1440);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      window.__ssrList = document.querySelector("[data-pilot-ssr-results]");
    });
  });
  await page.route(/aggregated/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.continue();
  });
  await open(page, OVERVIEW);
  await page.waitForSelector("[data-pilot-ssr] .fides-ds-card--row");
  const before = await firstRowBox(page);
  await page.locator("#fides-search-input").click();
  await page.keyboard.type("cred");
  await waitForRows(page);
  await page.waitForLoadState("load");
  const after = await firstRowBox(page);
  const handover = await page.evaluate(() => ({
    kept: !!window.__ssrList && document.querySelector(".fides-results > .fides-uc-pilot__list") === window.__ssrList,
    value: document.querySelector("#fides-search-input")?.value || "",
    focus: document.activeElement && document.activeElement.id,
    url: location.search,
    options: document.querySelectorAll("#fides-org-pilot-options-role input[type=checkbox]").length,
  }));
  check("ssr: no script errors during hand-over", errors.length === 0, errors.join(" | "));
  check("ssr: server rows kept by the script", handover.kept);
  check("ssr: first row does not move on hand-over", before && after && before.y === after.y && before.h === after.h && before.title === after.title, `${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  check("ssr: typed search text and focus kept", handover.value === "cred" && handover.focus === "fides-search-input" && !/q=/.test(handover.url), JSON.stringify(handover));
  check("ssr: filter options filled after hand-over", handover.options > 0, String(handover.options));
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => /q=cred/.test(location.search));
  check("ssr: search works after hand-over", /q=cred/.test(page.url()), page.url());
  await context.close();

  // A stored sort preference differs from the server order: the script re-renders the rows.
  const sorted = await newContext(browser, 1440);
  const sortedPage = await sorted.newPage();
  await sortedPage.addInitScript(() => {
    try { localStorage.setItem("fides-org-sort-v2", "name"); } catch { /* ignore */ }
  });
  await open(sortedPage, OVERVIEW);
  await waitForRows(sortedPage);
  const byName = await sortedPage.evaluate(() => {
    const titles = [...document.querySelectorAll(".fides-uc-pilot__list .fides-ds-card__title")].slice(0, 5).map((el) => el.textContent.trim());
    return { sort: document.querySelector("#fides-sort-select").value, titles };
  });
  const expected = byName.titles.slice().sort((a, b) => a.localeCompare(b));
  check("ssr: stored sort preference still applies", byName.sort === "name" && JSON.stringify(expected) === JSON.stringify(byName.titles), JSON.stringify(byName));
  await sorted.close();

  // Catalog data unavailable in the browser: the server page stays, with a notice.
  const offline = await newContext(browser, 1440);
  const offlinePage = await offline.newPage();
  await offlinePage.route(/aggregated/, (route) => route.abort());
  await open(offlinePage, OVERVIEW);
  await offlinePage.waitForSelector("[data-pilot-data-error]", { timeout: 30000 });
  const kept = await offlinePage.evaluate(() => ({
    rows: document.querySelectorAll(".fides-uc-pilot__list > li").length,
    alert: document.querySelector("[data-pilot-data-error]")?.getAttribute("role") || "",
  }));
  await offlinePage.screenshot({ path: path.join(OUT, "overview-ssr-offline-1440.png") });
  check("ssr: rows stay when catalog data fails", kept.rows === 48 && kept.alert === "alert", JSON.stringify(kept));
  await offline.close();
}

async function overviewDesktop(browser) {
  const context = await newContext(browser, 1440);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await open(page, OVERVIEW);
  await waitForRows(page);
  await page.waitForLoadState("load");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "overview-1440.png") });

  const first = await page.evaluate(() => {
    const row = document.querySelector(".fides-uc-pilot__list .fides-ds-card--row");
    const media = row.querySelector(".fides-ds-card__media").getBoundingClientRect();
    const img = row.querySelector(".fides-ds-card__img");
    const title = row.querySelector(".fides-ds-card__title");
    const summary = row.querySelector(".fides-ds-card__summary");
    const style = getComputedStyle(title);
    const summaryStyle = summary ? getComputedStyle(summary) : null;
    return {
      media: [Math.round(media.width), Math.round(media.height)],
      fit: img ? getComputedStyle(img).objectFit : "none",
      title: [style.fontSize, style.lineHeight],
      summary: summaryStyle ? [summaryStyle.fontSize, summaryStyle.lineHeight] : null,
      tags: row.querySelectorAll(".fides-ds-card__tags .fides-ds-tag").length,
      facts: row.querySelector(".fides-ds-card__facts")?.textContent.trim() || "",
      arrow: (() => { const a = row.querySelector(".fides-ds-card__arrow"); if (!a) return null; const b = a.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; })(),
      href: row.querySelector(".fides-ds-card__link")?.getAttribute("href") || "",
    };
  });
  check("overview: no script errors", errors.length === 0, errors.join(" | "));
  check("overview: logo slot 120 x 75", first.media[0] === 120 && first.media[1] === 75, first.media.join("x"));
  check("overview: logo object-fit contain", first.fit === "contain" || first.fit === "none", first.fit);
  check("overview: name 20/26", first.title[0] === "20px" && first.title[1] === "26px", first.title.join("/"));
  check("overview: description 16/24", first.summary && first.summary[0] === "16px" && first.summary[1] === "24px", JSON.stringify(first.summary));
  check("overview: role chips present", first.tags > 0, String(first.tags));
  check("overview: facts line country · use cases · updated", /use case/.test(first.facts) && /Updated \d{1,2} [A-Z][a-z]{2} \d{4}/.test(first.facts), first.facts);
  check("overview: 44 x 44 arrow", first.arrow && first.arrow[0] === 44 && first.arrow[1] === 44, JSON.stringify(first.arrow));
  check("overview: row links to pilot detail", first.href.includes("/fides-design-pilot/organization/?org=org%3A"), first.href);

  const placeholder = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".fides-uc-pilot__list .fides-ds-card--row")];
    const row = rows.find((r) => !r.querySelector(".fides-ds-card__img"));
    if (!row) return null;
    const fallback = row.querySelector(".fides-ds-card__fallback");
    return { visible: fallback && !fallback.hidden && fallback.offsetParent !== null, text: fallback ? fallback.textContent.trim() : "", name: row.querySelector(".fides-ds-card__title").textContent.trim() };
  });
  check("overview: name placeholder without logo", !placeholder || (placeholder.visible && placeholder.name.startsWith(placeholder.text)), JSON.stringify(placeholder));

  const counts = await page.evaluate(() => ({
    count: document.querySelectorAll("[data-pilot-count]").length,
    countText: document.querySelector("[data-pilot-count]").textContent.trim(),
    pager: !!document.querySelector("[data-pilot-pagination-slot] .fides-catalog-pagination"),
    pagerMeta: document.querySelector(".fides-catalog-pagination__meta")?.textContent.trim() || "",
    add: (() => { const a = document.querySelector(".fides-uc-pilot__add"); return a ? getComputedStyle(a).display !== "none" : false; })(),
    rows: document.querySelectorAll(".fides-uc-pilot__list > li").length,
  }));
  check("overview: one result count", counts.count === 1 && /^\d+ organizations$/.test(counts.countText), counts.countText);
  check("overview: pager on its own row", counts.pager && /^Page 1 of \d+$/.test(counts.pagerMeta), counts.pagerMeta);
  check("overview: 48 rows on page 1", counts.rows === 48, String(counts.rows));
  check("overview: Add organization visible on desktop", counts.add);

  // Search runs only on submit.
  const before = counts.countText;
  await page.fill("#fides-search-input", "credenco");
  await page.waitForTimeout(500);
  const typed = await page.textContent("[data-pilot-count]");
  check("overview: typing does not search", typed.trim() === before, typed);
  await page.press("#fides-search-input", "Enter");
  await page.waitForFunction(() => document.querySelector("[data-pilot-count]").textContent.trim() !== "", null, { timeout: 5000 });
  await page.waitForTimeout(200);
  const searched = (await page.textContent("[data-pilot-count]")).trim();
  check("overview: Enter searches", searched !== before && /q=credenco/.test(page.url()), `${searched} ${page.url()}`);
  await page.click("#fides-search-clear");
  await page.waitForTimeout(200);

  // Role popover: choice keeps it open and updates the URL.
  await page.click(".fides-uc-pilot__popover:nth-of-type(1) .fides-ds-popover__toggle");
  await page.click(".fides-uc-pilot__popover:nth-of-type(1) input[value='issuer']");
  await page.waitForTimeout(200);
  const roleState = await page.evaluate(() => ({
    open: document.querySelector(".fides-uc-pilot__popover").classList.contains("is-open"),
    url: location.search,
    count: document.querySelector("[data-pilot-count]").textContent.trim(),
    pills: document.querySelectorAll(".fides-uc-pilot__pill").length,
  }));
  check("overview: role popover stays open after choice", roleState.open);
  check("overview: role filter in URL and pill", /role=issuer/.test(roleState.url) && roleState.pills === 1, `${roleState.url} ${roleState.pills}`);
  await page.keyboard.press("Escape");

  // More filters: certification with sub-options.
  const moreToggle = await page.$("[data-pilot-more-toggle]");
  if (moreToggle) {
    await moreToggle.click();
    const certPopover = await page.$("#fides-org-pilot-more .fides-ds-popover");
    check("overview: More filters has certification", !!certPopover);
    if (certPopover) {
      await page.click("#fides-org-pilot-more .fides-ds-popover__toggle");
      const subs = await page.$$eval("#fides-org-pilot-more .fides-org-pilot__option--sub", (els) => els.length);
      check("overview: certification sub-options listed", subs > 0, String(subs));
      await page.keyboard.press("Escape");
    }
    await page.keyboard.press("Escape");
  }

  // Go to page 2, scroll to row 10, open the detail, come Back.
  await page.click("[data-pilot-clear-filters]");
  await page.waitForTimeout(200);
  await page.selectOption("#fides-sort-select", "name");
  await page.waitForTimeout(200);
  await page.click(".fides-catalog-pagination__next");
  await page.waitForTimeout(400);
  check("overview: page 2 in URL with sort", /catalog_page=2/.test(page.url()) && /sort=name/.test(page.url()), page.url());
  const target = page.locator(".fides-uc-pilot__list > li").nth(9).locator(".fides-ds-card__link");
  await target.scrollIntoViewIfNeeded();
  const targetId = await page.locator(".fides-uc-pilot__list > li").nth(9).locator("[data-org-id]").getAttribute("data-org-id");
  const scrollBefore = await page.evaluate(() => scrollY);
  const urlBefore = page.url();
  await target.focus();
  await page.keyboard.press("Enter");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector(".fides-org-detail");
  const backLabel = (await page.textContent("[data-fides-ds-back-label]")).trim();
  const backHref = await page.getAttribute("[data-fides-ds-back]", "href");
  check("detail: Back to results label from overview", backLabel === "Back to results", backLabel);
  check("detail: Back link keeps page and sort", /catalog_page=2/.test(backHref) && /sort=name/.test(backHref), backHref);
  await page.goBack();
  await waitForRows(page);
  await page.waitForTimeout(500);
  const restored = await page.evaluate((id) => ({
    url: location.href,
    scrollY: scrollY,
    focus: document.activeElement && document.activeElement.closest(`[data-org-id="${CSS.escape(id)}"]`) ? true : false,
    sort: document.querySelector("#fides-sort-select").value,
  }), targetId);
  check("overview: Back restores page and sort", restored.url === urlBefore && restored.sort === "name", `${restored.url} ${restored.sort}`);
  check("overview: Back restores scroll", Math.abs(restored.scrollY - scrollBefore) < 120, `${restored.scrollY} vs ${scrollBefore}`);
  check("overview: Back restores focus on the row link", restored.focus);

  // Zero results.
  await open(page, `${OVERVIEW}?q=zzzz-no-such-organization`);
  await waitForRows(page);
  const empty = await page.evaluate(() => ({
    title: document.querySelector(".fides-uc-pilot__empty .fides-uc-pilot__state-title")?.textContent.trim() || "",
    clear: !!document.querySelector("[data-pilot-clear-search]"),
    pager: !!document.querySelector(".fides-catalog-pagination"),
  }));
  check("overview: zero results state with Clear search", empty.title === "No matching organizations" && empty.clear && !empty.pager, JSON.stringify(empty));

  // Old modal deep link opens the pilot detail.
  await open(page, `${OVERVIEW}?org=org:credenco`);
  await page.waitForSelector(".fides-org-detail", { timeout: 15000 }).catch(() => {});
  check("overview: ?org= opens pilot detail", page.url().includes("/fides-design-pilot/organization/?org=org%3Acredenco"), page.url());

  check("overview: 1440 no horizontal overflow", (await overflowX(page)) <= 0);
  await context.close();
}

async function overviewMobile(browser, width) {
  const context = await newContext(browser, width, 800);
  const page = await context.newPage();
  await open(page, OVERVIEW);
  await waitForRows(page);
  await page.waitForLoadState("load");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, `overview-${width}.png`) });
  const layout = await page.evaluate(() => {
    const row = document.querySelector(".fides-uc-pilot__list .fides-ds-card--row");
    const media = row.querySelector(".fides-ds-card__media").getBoundingClientRect();
    const title = row.querySelector(".fides-ds-card__title").getBoundingClientRect();
    const add = document.querySelector(".fides-uc-pilot__add");
    return {
      mediaVisible: media.width > 0,
      besideTitle: media.right <= title.left + 1 && Math.abs(media.top - title.top) < 40,
      addHidden: !add || getComputedStyle(add).display === "none",
    };
  });
  check(`overview ${width}: logo next to the name`, layout.mediaVisible && layout.besideTitle, JSON.stringify(layout));
  check(`overview ${width}: Add link hidden`, layout.addHidden);
  check(`overview ${width}: no horizontal overflow`, (await overflowX(page)) <= 0);
  const small = await smallTargets(page);
  check(`overview ${width}: 44 px targets`, small.length === 0, small.slice(0, 5).join("; "));

  // Filters dialog: Cancel discards, Apply commits.
  await page.click("[data-pilot-open]");
  const dialog = await page.$("#fides-org-pilot-filter-panel[role=dialog]");
  check(`overview ${width}: Filters dialog opens`, !!dialog);
  if (dialog) {
    await page.click("#fides-org-pilot-filter-panel .fides-uc-pilot__popover:nth-of-type(1) .fides-ds-popover__toggle");
    await page.click("#fides-org-pilot-filter-panel .fides-uc-pilot__popover:nth-of-type(1) input[type=checkbox] >> nth=0");
    await page.click("#fides-org-pilot-filter-panel .fides-uc-pilot__panel-actions [data-pilot-cancel]");
    check(`overview ${width}: Cancel discards`, !/role=/.test(page.url()), page.url());
    await page.click("[data-pilot-open]");
    await page.click("#fides-org-pilot-filter-panel .fides-uc-pilot__popover:nth-of-type(1) .fides-ds-popover__toggle");
    await page.click("#fides-org-pilot-filter-panel .fides-uc-pilot__popover:nth-of-type(1) input[type=checkbox] >> nth=0");
    await page.click("[data-pilot-apply]");
    await page.waitForTimeout(200);
    check(`overview ${width}: Apply commits`, /role=/.test(page.url()), page.url());
  }
  await context.close();
}

async function detail(browser, width, id) {
  const context = await newContext(browser, width, 900);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await open(page, DETAIL + encodeURIComponent(id));
  await page.waitForSelector(".fides-org-detail");
  await page.waitForLoadState("load");
  await page.waitForTimeout(300);
  const slug = id.replace(/^org:/, "");
  await page.screenshot({ path: path.join(OUT, `detail-${slug}-${width}.png`), fullPage: true });
  const info = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const box = (el) => (el ? el.getBoundingClientRect() : null);
    const main = q(".fides-org-detail__main");
    const aside = q(".fides-org-detail__aside");
    const prose = q(".fides-org-detail__overview .fides-ds-prose");
    const h1 = q(".fides-org-detail__title");
    const news = q(".fides-org-detail__news");
    const useCaseTitles = [...document.querySelectorAll(".fides-org-detail__use-cases .fides-ds-card__title")].map((el) => el.textContent.trim());
    const visibleUseCases = [...document.querySelectorAll(".fides-org-detail__use-cases .fides-ds-card--row")].filter((el) => el.offsetParent !== null).length;
    const gallery = q(".fides-org-detail__media [data-fides-ds-gallery]");
    const emptyPanels = [...document.querySelectorAll(".fides-org-detail section")].filter((s) => s.textContent.trim() === "").length;
    return {
      mainW: box(main) ? Math.round(box(main).width) : 0,
      asideW: box(aside) ? Math.round(box(aside).width) : 0,
      gap: box(main) && box(aside) ? Math.round(box(aside).left - box(main).right) : null,
      proseW: prose ? Math.round(box(prose).width) : 0,
      h1: h1 ? [getComputedStyle(h1).fontSize, getComputedStyle(h1).lineHeight] : null,
      newsBg: news ? getComputedStyle(news).backgroundColor : "",
      useCaseTitles,
      visibleUseCases,
      gallery: gallery ? {
        first: gallery.querySelector("img, video, iframe")?.tagName || "",
        strip: !!gallery.querySelector(".fides-ds-gallery__thumbs, .fides-ds-gallery__strip"),
        items: gallery.querySelectorAll(".fides-ds-gallery__thumb").length,
        autoplay: [...gallery.querySelectorAll("video")].some((v) => v.autoplay),
      } : null,
      hasMedia: !!q(".fides-org-detail__media"),
      relationsHeads: [...document.querySelectorAll(".fides-org-detail__relations h3")].map((el) => el.textContent.replace(/\s+/g, " ").trim()),
      emptyPanels,
      update: q("#update .fides-ds-button, #update a")?.textContent.trim() || "",
    };
  });
  const tag = `detail ${id} @${width}`;
  check(`${tag}: no script errors`, errors.length === 0, errors.join(" | "));
  check(`${tag}: no horizontal overflow`, (await overflowX(page)) <= 0);
  const small = await smallTargets(page);
  check(`${tag}: 44 px targets`, small.length === 0, small.slice(0, 5).join("; "));
  check(`${tag}: no empty sections`, info.emptyPanels === 0, String(info.emptyPanels));
  check(`${tag}: update action present`, info.update !== "", info.update);
  if (width === 1440) {
    check(`${tag}: columns 792/520, gap 32`, Math.abs(info.mainW - 792) <= 2 && Math.abs(info.asideW - 520) <= 2 && info.gap === 32, `${info.mainW}/${info.asideW}/${info.gap}`);
    check(`${tag}: name 36/42`, info.h1 && info.h1[0] === "36px" && info.h1[1] === "42px", JSON.stringify(info.h1));
    if (info.proseW) check(`${tag}: overview text <= 720`, info.proseW <= 720, String(info.proseW));
  }
  if (width <= 390) {
    check(`${tag}: name 30/34`, info.h1 && info.h1[0] === "30px" && info.h1[1] === "34px", JSON.stringify(info.h1));
    if (info.useCaseTitles.length > 1) check(`${tag}: one use case row visible`, info.visibleUseCases === 1, String(info.visibleUseCases));
  }
  if (info.useCaseTitles.length > 1) {
    const sorted = info.useCaseTitles.slice().sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
    check(`${tag}: use cases alphabetical`, JSON.stringify(sorted) === JSON.stringify(info.useCaseTitles), info.useCaseTitles.join(" | "));
  }
  if (info.newsBg) check(`${tag}: news band #F1F6FF`, info.newsBg === "rgb(241, 246, 255)", info.newsBg);
  if (info.gallery) {
    check(`${tag}: gallery starts with an image`, info.gallery.first === "IMG", info.gallery.first);
    check(`${tag}: gallery no autoplay`, !info.gallery.autoplay);
  }
  await context.close();
  return info;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    await overviewServerRender(browser);
    await overviewDesktop(browser);
    for (const width of [390, 320]) await overviewMobile(browser, width);
    for (const width of WIDTHS) {
      for (const id of RECORDS) await detail(browser, width, id);
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed; screenshots in ${OUT}`);
  process.exitCode = failed.length ? 1 : 0;
})();
