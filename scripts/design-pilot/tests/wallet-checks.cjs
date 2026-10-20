/**
 * Wallet overview and detail browser checks (wallet catalog pilot brief).
 *
 * Overviews (personal and business share one template): rows, one result
 * count, search only on submit, popover filters with URL state, popovers
 * inside the viewport, More filters, pager on its own row, zero results,
 * Back restoring filters, scroll and focus, old ?wallet= links, failed
 * catalog data, mobile Filters dialog (Apply / Cancel), Add wallet hidden
 * below 1100 px.
 * Detail: H1 and logo sizes per width, 44 px targets, no horizontal overflow,
 * share without Copy link, features show-all, glossary dialog (Escape, focus
 * return, scroll kept), eIDAS options, mobile reading order, limited profile.
 * Classic listings: shortcode without pilot, modal deep link.
 *
 * Run through run-wallet-checks.sh.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const OVERVIEWS = {
  personal: `${BASE}/fides-design-pilot/personal-wallets/`,
  business: `${BASE}/fides-design-pilot/business-wallets/`,
};
const DETAIL = `${BASE}/fides-design-pilot/wallet/?wallet=`;
const CLASSIC = { personal: `${BASE}/wallet-catalog/`, business: `${BASE}/business-wallets/` };
const RECORDS = (process.env.WALLET_IDS || [
  "credenco-business-wallet",
  "credenco-wallet",
  "sphereon-business-wallet",
  "auth0-platform",
  "sphereon-wallet",
  "aadhaar",
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

function smallTargets(page) {
  return page.evaluate(() => {
    const min = innerWidth >= 1100 && matchMedia("(pointer: fine)").matches ? 40 : 44;
    return [...document.querySelectorAll(".fides-ds-shell__main :is(input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, button, summary, [role=button], a.fides-ds-action-link, a.fides-ds-button, a.fides-wallet-store)")]
      .filter((el) => el.offsetParent !== null && !el.closest("[hidden], .fides-ds-visually-hidden, .fides-ds-prose, .fides-ds-term"))
      .filter((el) => !el.hasAttribute("data-fides-ds-term"))
      .map((el) => ({ el, box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && box.height > 0 && box.height < min - 0.5)
      .map(({ el, box }) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} "${(el.textContent || "").trim().slice(0, 30)}" ${Math.round(box.height)}px`);
  });
}

function overflowX(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function waitForRows(page) {
  await page.waitForSelector("#fides-wallet-catalog-root [data-pilot-count]", { timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector("#fides-wallet-catalog-root [data-pilot-loading]"), null, { timeout: 30000 });
}

async function overviewDesktop(browser, type) {
  const url = OVERVIEWS[type];
  const noun = type === "personal" ? "personal wallets" : "business wallets";
  const context = await newContext(browser, 1440);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await open(page, url);
  await waitForRows(page);
  await page.waitForLoadState("load");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, `overview-${type}-1440.png`) });
  const tag = `overview ${type}`;

  const first = await page.evaluate(() => {
    const root = document.querySelector("#fides-wallet-catalog-root");
    const row = root.querySelector(".fides-uc-pilot__list .fides-ds-card--row");
    const media = row.querySelector(".fides-ds-card__media").getBoundingClientRect();
    const img = row.querySelector(".fides-ds-card__img");
    const title = getComputedStyle(row.querySelector(".fides-ds-card__title"));
    const h1 = root.querySelector("h1");
    const add = root.querySelector(".fides-uc-pilot__add");
    const ask = root.querySelector("#fides-ask-fides-trigger");
    return {
      media: [Math.round(media.width), Math.round(media.height)],
      fit: img ? getComputedStyle(img).objectFit : "none",
      title: [title.fontSize, title.lineHeight],
      h1: h1 ? [getComputedStyle(h1).fontSize, getComputedStyle(h1).lineHeight, h1.textContent.trim()] : null,
      tags: row.querySelectorAll(".fides-ds-card__tags .fides-ds-tag").length,
      facts: row.querySelector(".fides-ds-card__facts")?.textContent.replace(/\s+/g, " ").trim() || "",
      href: row.querySelector(".fides-ds-card__link")?.getAttribute("href") || "",
      counts: root.querySelectorAll("[data-pilot-count]").length,
      countText: root.querySelector("[data-pilot-count]")?.textContent.trim() || "",
      pager: !!root.querySelector("[data-pilot-pagination-slot] .fides-catalog-pagination"),
      add: add ? getComputedStyle(add).display !== "none" : false,
      ask: !!ask,
      cross: [...root.querySelectorAll(".fides-uc-pilot__intro a, header a, a.fides-ds-action-link")].map((a) => a.getAttribute("href") || "").find((href) => /(personal|business)-wallets\/$/.test(href)) || "",
      sort: root.querySelector("#fides-sort-select")?.value || "",
      tiers: !!document.querySelector(".fides-wallet-tiers"),
      contribute: !!document.querySelector(".fides-uc-contribute"),
    };
  });
  check(`${tag}: no script errors`, errors.length === 0, errors.join(" | "));
  check(`${tag}: H1 30/36`, first.h1 && first.h1[0] === "30px" && first.h1[1] === "36px", JSON.stringify(first.h1));
  check(`${tag}: logo slot 120 x 75 contain`, first.media[0] === 120 && first.media[1] === 75 && (first.fit === "contain" || first.fit === "none"), `${first.media.join("x")} ${first.fit}`);
  check(`${tag}: name 20/26`, first.title[0] === "20px" && first.title[1] === "26px", first.title.join("/"));
  check(`${tag}: facts with Updated date`, /Updated \d{1,2} [A-Z][a-z]{2} \d{4}/.test(first.facts), first.facts);
  if (type === "business") check(`${tag}: capability chips`, first.tags > 0, String(first.tags));
  else check(`${tag}: no capability chips on personal rows`, first.tags === 0, String(first.tags));
  check(`${tag}: row links to pilot detail`, first.href.includes("/fides-design-pilot/wallet/?wallet="), first.href);
  check(`${tag}: one result count`, first.counts === 1 && new RegExp(`^\\d+ ${noun}$`).test(first.countText), first.countText);
  check(`${tag}: pager on its own row`, first.pager);
  check(`${tag}: Add wallet visible on desktop`, first.add);
  check(`${tag}: Ask FIDES link`, first.ask);
  check(`${tag}: cross link to the other type`, first.cross.includes(type === "personal" ? "business-wallets" : "personal-wallets"), first.cross);
  check(`${tag}: default sort explore`, first.sort === "explore", first.sort);
  check(`${tag}: tiers strip and contribute band`, first.tiers && first.contribute);

  // Search runs only on submit.
  const before = first.countText;
  await page.fill("#fides-search-input", "sphereon");
  await page.waitForTimeout(500);
  check(`${tag}: typing does not search`, (await page.textContent("[data-pilot-count]")).trim() === before);
  await page.press("#fides-search-input", "Enter");
  await page.waitForFunction((b) => document.querySelector("[data-pilot-count]").textContent.trim() !== b, before, { timeout: 5000 }).catch(() => {});
  const searched = (await page.textContent("[data-pilot-count]")).trim();
  check(`${tag}: Enter searches and writes q`, searched !== before && /q=sphereon/.test(page.url()), `${searched} ${page.url()}`);
  const pagerFew = await page.evaluate(() => !!document.querySelector("[data-pilot-pagination-slot] .fides-catalog-pagination"));
  check(`${tag}: no pager for one page`, !pagerFew);
  await page.click("#fides-search-clear");
  await page.waitForTimeout(200);

  // Zero results.
  await page.fill("#fides-search-input", "zzqqxxnotawallet");
  await page.press("#fides-search-input", "Enter");
  await page.waitForTimeout(300);
  const zero = await page.evaluate(() => ({
    rows: document.querySelectorAll(".fides-uc-pilot__list > li").length,
    text: document.querySelector("#fides-wallet-catalog-root .fides-results")?.textContent.replace(/\s+/g, " ").trim().slice(0, 160) || "",
    clear: !!document.querySelector("[data-pilot-clear-filters], [data-pilot-clear-search]"),
    pager: !!document.querySelector("[data-pilot-pagination-slot] .fides-catalog-pagination"),
  }));
  check(`${tag}: zero results state with a way out`, zero.rows === 0 && zero.clear && !zero.pager && zero.text.length > 0, JSON.stringify(zero));
  await page.click("#fides-search-clear");
  await page.waitForTimeout(200);

  // First popover: a choice keeps it open, updates URL and pill; popover inside the viewport.
  const firstPopover = "#fides-wallet-catalog-root .fides-uc-pilot__filters .fides-uc-pilot__popover >> nth=0";
  await page.click(`${firstPopover} >> .fides-ds-popover__toggle`);
  await page.click(`${firstPopover} >> input[type=checkbox] >> nth=0`);
  await page.waitForTimeout(200);
  const pop = await page.evaluate(() => {
    const popover = document.querySelector("#fides-wallet-catalog-root .fides-uc-pilot__popover");
    const panel = popover.querySelector(".fides-ds-popover__panel");
    const box = panel ? panel.getBoundingClientRect() : null;
    return {
      open: popover.classList.contains("is-open"),
      url: location.search,
      pills: document.querySelectorAll(".fides-uc-pilot__pill").length,
      inside: box ? box.left >= 0 && box.right <= innerWidth : false,
    };
  });
  const param = type === "personal" ? "platform" : "capability";
  check(`${tag}: popover stays open after a choice`, pop.open);
  check(`${tag}: filter in URL (${param}) and one pill`, new RegExp(`${param}=`).test(pop.url) && pop.pills === 1, `${pop.url} ${pop.pills}`);
  check(`${tag}: popover inside the viewport`, pop.inside);
  await page.keyboard.press("Escape");

  // More filters: opens, has options, closes.
  await page.click("[data-pilot-more-toggle]");
  await page.waitForTimeout(200);
  const more = await page.evaluate(() => {
    const panel = document.querySelector("#fides-wallet-pilot-more");
    return { visible: !!panel && !panel.hidden && panel.offsetParent !== null, groups: panel ? panel.querySelectorAll("[data-pilot-group], [data-pilot-flag]").length : 0 };
  });
  check(`${tag}: More filters opens with options`, more.visible && more.groups > 0, JSON.stringify(more));
  await page.keyboard.press("Escape");

  // Back restores filters, scroll and focus.
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(150);
  const link = page.locator(".fides-uc-pilot__list .fides-ds-card__link").nth(2);
  const targetId = await page.locator(".fides-uc-pilot__list .fides-ds-card--row").nth(2).getAttribute("data-wallet-id");
  const urlBefore = page.url();
  await link.focus();
  await page.keyboard.press("Enter");
  await page.waitForSelector(".fides-wallet-detail", { timeout: 30000 });
  const backHref = await page.getAttribute(".fides-ds-detail-top__back a", "href");
  check(`${tag}: detail back link returns to the filtered listing`, backHref && backHref.includes(param + "="), backHref);
  await page.goBack();
  await waitForRows(page);
  await page.waitForTimeout(600);
  const restored = await page.evaluate(() => ({
    url: location.href,
    focus: document.activeElement && document.activeElement.closest(".fides-ds-card--row")?.getAttribute("data-wallet-id"),
    scroll: scrollY,
  }));
  check(`${tag}: Back restores URL state`, restored.url === urlBefore, `${restored.url} vs ${urlBefore}`);
  check(`${tag}: Back restores focus on the row`, restored.focus === targetId, `${restored.focus} vs ${targetId}`);
  check(`${tag}: Back restores scroll`, restored.scroll > 200, String(restored.scroll));
  check(`${tag}: no horizontal overflow`, (await overflowX(page)) <= 0);
  await context.close();
}

async function overviewMobile(browser, type, width) {
  const context = await newContext(browser, width, 800);
  const page = await context.newPage();
  await open(page, OVERVIEWS[type]);
  await waitForRows(page);
  await page.waitForLoadState("load");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, `overview-${type}-${width}.png`) });
  const tag = `overview ${type} @${width}`;
  const layout = await page.evaluate(() => {
    const add = document.querySelector(".fides-uc-pilot__add");
    return { addHidden: !add || getComputedStyle(add).display === "none" };
  });
  check(`${tag}: Add wallet hidden`, layout.addHidden);
  check(`${tag}: no horizontal overflow`, (await overflowX(page)) <= 0);
  const small = await smallTargets(page);
  check(`${tag}: 44 px targets`, small.length === 0, small.slice(0, 5).join("; "));

  await page.click("[data-pilot-open]");
  const dialog = await page.$("#fides-wallet-pilot-filter-panel[role=dialog]");
  check(`${tag}: Filters dialog opens`, !!dialog);
  if (dialog) {
    const first = "#fides-wallet-pilot-filter-panel .fides-uc-pilot__popover >> nth=0";
    await page.click(`${first} >> .fides-ds-popover__toggle`);
    await page.click(`${first} >> input[type=checkbox] >> nth=0`);
    const before = page.url();
    await page.click("#fides-wallet-pilot-filter-panel [data-pilot-cancel] >> nth=0");
    await page.waitForTimeout(200);
    check(`${tag}: Cancel discards`, page.url() === before, page.url());
    await page.click("[data-pilot-open]");
    await page.click(`${first} >> .fides-ds-popover__toggle`);
    await page.click(`${first} >> input[type=checkbox] >> nth=0`);
    await page.click("[data-pilot-apply]");
    await page.waitForTimeout(200);
    check(`${tag}: Apply commits`, page.url() !== before, page.url());
  }
  await context.close();
}

async function overviewFallbacks(browser) {
  const context = await newContext(browser, 1440);
  const page = await context.newPage();
  await page.route(/wallet.*aggregated|aggregated.*wallet|\/wallets?(\.json|\?|$)/, (route) => route.abort());
  await page.route(/aggregated\.json/, (route) => route.abort());
  await open(page, OVERVIEWS.personal);
  const shown = await page.waitForSelector("[data-pilot-data-error]", { timeout: 30000 }).then(() => true).catch(() => false);
  const state = await page.evaluate(() => ({
    role: document.querySelector("[data-pilot-data-error]")?.getAttribute("role") || "",
    text: document.querySelector("[data-pilot-data-error]")?.textContent.trim() || "",
    count: document.querySelector("[data-pilot-count]")?.textContent.trim() || "",
  }));
  await page.screenshot({ path: path.join(OUT, "overview-personal-load-error-1440.png") });
  check("overview: failed load shows an error, not an empty catalog", shown && state.role === "alert" && !/^0 /.test(state.count), JSON.stringify(state));
  await context.close();

  const legacy = await newContext(browser, 1440);
  const legacyPage = await legacy.newPage();
  await open(legacyPage, `${OVERVIEWS.personal}?wallet=credenco-wallet`);
  await legacyPage.waitForSelector(".fides-wallet-detail", { timeout: 30000 }).catch(() => {});
  check("overview: old ?wallet= link opens the pilot detail", /\/fides-design-pilot\/wallet\/\?wallet=credenco-wallet/.test(legacyPage.url()), legacyPage.url());
  await legacy.close();

  const broken = await newContext(browser, 1440);
  const brokenPage = await broken.newPage();
  await brokenPage.route(/\.(png|jpe?g|svg|webp)(\?|$)/, (route) => (route.request().url().includes(BASE) ? route.continue() : route.abort()));
  await open(brokenPage, OVERVIEWS.business);
  await waitForRows(brokenPage);
  await brokenPage.waitForTimeout(1500);
  const logos = await brokenPage.evaluate(() => {
    const rows = [...document.querySelectorAll(".fides-uc-pilot__list .fides-ds-card--row")].slice(0, 6);
    return rows.map((row) => {
      const img = row.querySelector(".fides-ds-card__img");
      const fallback = row.querySelector(".fides-ds-card__fallback");
      return { broken: !img || img.naturalWidth === 0, fallback: !!fallback && !fallback.hidden && fallback.textContent.trim() !== "", imgVisible: !!img && img.offsetParent !== null && getComputedStyle(img).display !== "none" };
    });
  });
  check("overview: broken logos show the name placeholder", logos.every((l) => !l.broken || (l.fallback && !l.imgVisible)), JSON.stringify(logos));
  await broken.close();
}

const MOBILE_ORDER = ["overview", "use-cases", "glance", "pricing", "features", "technical", "eidas", "recognitions", "media", "provider", "listing"];

async function detail(browser, width, id) {
  const context = await newContext(browser, width, 900);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await open(page, DETAIL + encodeURIComponent(id));
  await page.waitForSelector(".fides-wallet-detail");
  await page.waitForLoadState("load");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `detail-${id}-${width}.png`), fullPage: true });
  const info = await page.evaluate((order) => {
    const q = (s) => document.querySelector(s);
    const box = (el) => (el ? el.getBoundingClientRect() : null);
    const h1 = q(".fides-org-detail__title");
    const share = q(".fides-ds-detail-top__share");
    const logo = q(".fides-org-detail__logo");
    const identity = q(".fides-org-detail__identity");
    const section = (key) => (key === "glance" ? q("#glance-title")?.closest("section") : q(`#${key}`));
    const tops = order.map((key) => [key, section(key)]).filter(([, el]) => el && el.offsetParent !== null).map(([key, el]) => [key, Math.round(box(el).top + scrollY)]);
    return {
      h1: h1 ? [getComputedStyle(h1).fontSize, getComputedStyle(h1).lineHeight] : null,
      share: share ? [Math.round(box(share).width), Math.round(box(share).height), (share.getAttribute("aria-label") || share.textContent).trim()] : null,
      copy: !!q(".fides-wallet-detail [data-fides-ds-copy]") || /Copy link/.test(q(".fides-wallet-detail").textContent),
      logo: logo ? { w: Math.round(box(logo).width), h: Math.round(box(logo).height), right: box(logo).left >= box(identity).right - 1 || box(logo).top >= box(identity).bottom - 1 } : null,
      official: !!q(".fides-org-detail__badge--official"),
      signIn: /Sign in to suggest an update/.test(q(".fides-wallet-detail").textContent),
      features: !!q("#features"),
      featureLink: !!q('.fides-uc-detail__sections a[href="#features"]'),
      tops,
      emptySections: [...document.querySelectorAll(".fides-wallet-detail section")].filter((s) => s.textContent.trim() === "").length,
      personal: !!q(".fides-wallet-detail--personal"),
      stores: document.querySelectorAll(".fides-wallet-store").length,
      website: !!q(".fides-wallet-detail__action"),
    };
  }, MOBILE_ORDER);
  const tag = `detail ${id} @${width}`;
  check(`${tag}: no script errors`, errors.length === 0, errors.join(" | "));
  check(`${tag}: no horizontal overflow`, (await overflowX(page)) <= 0);
  const small = await smallTargets(page);
  check(`${tag}: 44 px targets`, small.length === 0, small.slice(0, 5).join("; "));
  check(`${tag}: no empty sections`, info.emptySections === 0, String(info.emptySections));
  check(`${tag}: LinkedIn share, no Copy link`, info.share && /LinkedIn/.test(info.share[2]) && !info.copy, JSON.stringify(info.share));
  check(`${tag}: features block and nav link go together`, info.features === info.featureLink || width < 1100, `${info.features} ${info.featureLink}`);
  if (info.official) check(`${tag}: guest on Official listing: no sign-in call`, !info.signIn);
  const h1 = width >= 1100 ? ["36px", "42px"] : width >= 600 ? ["34px", "40px"] : ["30px", "34px"];
  check(`${tag}: H1 ${h1.join("/")}`, info.h1 && info.h1[0] === h1[0] && info.h1[1] === h1[1], JSON.stringify(info.h1));
  if (info.logo) {
    const size = width < 600 ? [88, 80] : [144, 112];
    check(`${tag}: logo ${size.join(" x ")}`, info.logo.w === size[0] && info.logo.h === size[1], JSON.stringify(info.logo));
  }
  if (width < 600) check(`${tag}: share 44 x 44`, info.share && info.share[0] === 44 && info.share[1] === 44, JSON.stringify(info.share));
  if (width < 1100) {
    const keys = info.tops.slice().sort((a, b) => a[1] - b[1]).map(([key]) => key);
    const expected = MOBILE_ORDER.filter((key) => keys.includes(key));
    check(`${tag}: reading order`, JSON.stringify(keys) === JSON.stringify(expected), keys.join(" > "));
  }
  await context.close();
  return info;
}

async function detailInteractions(browser, width) {
  const context = await newContext(browser, width, 900);
  const page = await context.newPage();
  await open(page, DETAIL + "credenco-business-wallet");
  await page.waitForSelector(".fides-wallet-detail");
  await page.waitForLoadState("load");
  const tag = `detail interactions @${width}`;

  const toggle = page.locator("#features .fides-ds-show-all__toggle");
  if (await toggle.count()) {
    const before = await page.$$eval("#features-list > li", (els) => els.filter((el) => !el.hidden).length);
    await toggle.click();
    const after = await page.$$eval("#features-list > li", (els) => els.filter((el) => !el.hidden).length);
    check(`${tag}: features show 3, Show all expands`, before === 3 && after > 3, `${before} -> ${after}`);
  } else {
    check(`${tag}: features show-all control present`, false, "no toggle");
  }

  const term = page.locator("[data-fides-ds-term]").first();
  await term.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => scrollY);
  await term.click();
  await page.waitForSelector("dialog.fides-ds-dialog[open]");
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, `detail-glossary-${width}.png`) });
  const dlg = await page.evaluate(() => ({
    title: document.querySelector("dialog.fides-ds-dialog .fides-ds-dialog__title")?.textContent.trim() || "",
    body: document.querySelector("dialog.fides-ds-dialog .fides-ds-dialog__body")?.textContent.trim().length || 0,
    focus: document.activeElement && document.activeElement.hasAttribute("data-fides-ds-dialog-close"),
  }));
  check(`${tag}: glossary dialog with title, text and focus on close`, dlg.title && dlg.body > 0 && dlg.focus, JSON.stringify(dlg));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const afterDlg = await page.evaluate(() => ({
    open: !!document.querySelector("dialog.fides-ds-dialog[open]"),
    focus: document.activeElement && document.activeElement.hasAttribute("data-fides-ds-term"),
    scroll: scrollY,
  }));
  check(`${tag}: Escape closes, focus back on the term, scroll kept`, !afterDlg.open && afterDlg.focus && Math.abs(afterDlg.scroll - scrollBefore) < 2, JSON.stringify({ ...afterDlg, scrollBefore }));

  const summary = page.locator("#eidas .fides-wallet-eidas__all > summary");
  await summary.scrollIntoViewIfNeeded();
  await summary.click();
  await page.waitForTimeout(150);
  const eidas = await page.evaluate(() => ({
    open: document.querySelector("#eidas .fides-wallet-eidas__all").open,
    options: document.querySelectorAll("#eidas .fides-wallet-eidas__option").length,
  }));
  await page.locator("#eidas").screenshot({ path: path.join(OUT, `detail-eidas-${width}.png`) });
  check(`${tag}: eIDAS options open`, eidas.open && eidas.options >= 10, JSON.stringify(eidas));
  await context.close();
}

async function classic(browser) {
  for (const [type, url] of Object.entries(CLASSIC)) {
    const context = await newContext(browser, 1440);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    const id = type === "personal" ? "credenco-wallet" : "credenco-business-wallet";
    await open(page, `${url}?wallet=${id}`);
    const modal = await page.waitForFunction(() => {
      const overlay = document.querySelector("#fides-modal-overlay");
      return overlay && getComputedStyle(overlay).display !== "none" && overlay.getClientRects().length > 0 && /Credenco/i.test(overlay.textContent);
    }, null, { timeout: 30000 }).then(() => true).catch(() => false);
    const pilot = await page.evaluate(() => !!document.querySelector(".fides-wallet-pilot"));
    await page.screenshot({ path: path.join(OUT, `classic-${type}-modal-1440.png`) });
    check(`classic ${type}: no pilot markup`, !pilot);
    check(`classic ${type}: ?wallet= deep link opens the modal`, modal);
    check(`classic ${type}: no script errors`, errors.length === 0, errors.join(" | "));
    await context.close();
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const type of ["personal", "business"]) {
      await overviewDesktop(browser, type);
      for (const width of [390, 320]) await overviewMobile(browser, type, width);
    }
    await overviewFallbacks(browser);
    for (const id of RECORDS) {
      for (const width of WIDTHS) await detail(browser, width, id);
    }
    for (const width of [1440, 390]) await detailInteractions(browser, width);
    await classic(browser);
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`# pass ${results.length - failed.length}`);
  console.log(`# fail ${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})();
