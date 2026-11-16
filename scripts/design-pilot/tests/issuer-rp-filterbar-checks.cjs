/**
 * Issuer and relying party design pilot: the filter bar (shared More filters pattern, Paper 20.45).
 *
 * Per catalog, width (default 1440 and 390) and language (EN, NL; NL must keep /nl/):
 *  - structure: desktop shows search + the primary lists (issuers: Environment, Country; relying parties: Readiness, Country)
 *    and a More filters button, the other lists stay hidden; compact shows the Filters button and a dialog with every list;
 *  - every available filter list is still offered (primary, More filters, Technical filters);
 *  - More filters (desktop): opens and closes (button, close, Escape) with focus back on the button; Technical filters row
 *    is closed by default and opens on its own button;
 *  - several choices at once (a primary list and a More list): on the desktop bar each choice applies at once (no Apply button),
 *    the URL carries both, one removable chip per choice, the More badge counts the More choices, a chip removes only
 *    its own choice, Back returns to the previous filtered view;
 *  - Filters dialog (compact): Cancel discards draft choices and returns focus to the Filters button; Escape closes; Tab stays inside;
 *  - direct filtered links (theme, sector, technical format, including ?theme= and ?sector=): chip, badge, checked box, the Technical row opens for a technical choice;
 *  - labels: a long name or value wraps inside the field (it is not cut off); fields in the same row stay the same height; the full text stays in the button title and the chip;
 *  - the phone dialog ends with Cancel and Apply filters, with no result count in the button;
 *  - relying parties: no readiness paragraph above the results; the explanation sits in the Readiness list and, while a readiness
 *    filter is active, as a short note under the chips (operational status stays a separate field);
 *  - NL: the new labels are Dutch.
 * Nothing is submitted: GET navigation only.
 *
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/issuer-rp-filterbar-checks.cjs   (env: PILOT_URL, WIDTHS, LOCALES, KINDS)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,768,390").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "EN,NL").split(",");
const ONLY = process.env.KINDS ? process.env.KINDS.split(",") : null;

const KINDS = [
  {
    key: "issuers", path: "issuers/", prefix: "issuer",
    primary: ["environment", "country"], more: ["sector", "theme", "credential"], technical: ["format"],
    pickPrimary: "country", pickMore: "theme",
  },
  {
    key: "relying-parties", path: "relying-parties/", prefix: "rp",
    primary: ["readiness", "country"], more: ["interaction", "sector", "theme", "credential", "wallet"], technical: ["format"],
    pickPrimary: "country", pickMore: "theme",
  },
].filter((k) => !ONLY || ONLY.includes(k.key));

const TEXT = {
  EN: { more: "More filters", technical: "Technical filters", closeMore: "Close more filters", filters: "Filters" },
  NL: { more: "Meer filters", technical: "Technische filters", closeMore: "Meer filters sluiten", filters: "Filters" },
};
const CARD = ".fides-uc-pilot__list .fides-ds-card";

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
  page.on("request", (r) => { if (!["GET", "HEAD", "OPTIONS"].includes(r.method()) && r.url().startsWith(BASE) && !/trp-ajax\.php/.test(r.url())) sent.push(`${r.method()} ${r.url()}`); });
  return { ctx, page, sent };
}

const rootFor = (loc) => `${BASE}${loc === "NL" ? "/nl" : ""}/fides-design-pilot`;
const onRoute = (url, loc) => (loc === "NL" ? new URL(url, BASE).pathname.startsWith("/nl/") : !new URL(url, BASE).pathname.startsWith("/nl/"));
const norm = (u) => { const x = new URL(u, BASE); const p = [...x.searchParams.entries()].filter(([k]) => k !== "trp-form-language").map(([k, v]) => `${k}=${v}`).sort().join("&"); return `${x.pathname}?${p}`; };
// Chips remove a choice through a link that writes the remaining values as name[0]=; both spellings count as the same list.
const keyIn = (url, name) => [...new URL(url, BASE).searchParams.keys()].some((k) => k === name || k.startsWith(`${name.replace("[]", "")}[`));
const hasParam = (page, name) => page.waitForFunction(([n, src]) => [...new URL(location.href).searchParams.keys()].some((k) => k === n || k.startsWith(n.replace("[]", "") + "[")), [name, ""], { timeout: 20000 });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const countOf = (page) => page.evaluate(() => { const m = (document.querySelector("[data-pilot-count]") || {}).textContent || ""; const n = m.match(/(\d+)(?: (?:of|van) (\d+))?/); return n ? Number(n[1]) : -1; });

async function openList(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(CARD, { timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".fides-uc-pilot__count", { timeout: 30000 });
}

const compactOf = (w) => w < 600;
const optionsOf = (page, group) => page.$$eval(`input[name="${group}[]"]`, (els) => els.map((e) => ({ value: e.value, label: (e.parentElement.querySelector(".fides-ds-option__label") || {}).textContent || "" })));
const popoverOf = (page, group) => page.locator(`input[name="${group}[]"]`).first().locator("xpath=ancestor::*[@data-fides-ds-popover][1]");
const activeIs = (page, selector) => page.evaluate((s) => { const el = document.querySelector(s); return !!el && document.activeElement === el; }, selector);

/** Label, separator and value stay inside the field. A value that does not fit wraps; it is not clipped. */
async function fieldFit(toggle) {
  return toggle.evaluate((el) => {
    const label = el.querySelector(".fides-ds-popover__label");
    const value = el.querySelector(".fides-ds-popover__value");
    if (!label || !value) return null;
    const lr = label.getBoundingClientRect();
    const vr = value.getBoundingClientRect();
    const br = el.getBoundingClientRect();
    const after = getComputedStyle(label, "::after").content || "";
    const overflows = (node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1;
    const line = parseFloat(getComputedStyle(value).lineHeight) || 20;
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;font:inherit";
    probe.textContent = (value.textContent || "").trim();
    el.appendChild(probe);
    const valueNeedsWrap = probe.getBoundingClientRect().width > vr.width + 1;
    probe.remove();
    return {
      sameRow: vr.top < lr.bottom - 1 && lr.top < vr.bottom - 1,
      dot: after.includes("·"),
      clipped: overflows(label) || overflows(value),
      wrapped: vr.height > line * 1.6,
      valueNeedsWrap,
      inside: lr.left >= br.left - 1 && Math.ceil(lr.right) <= br.right + 1 && Math.ceil(vr.right) <= br.right + 1 && vr.bottom <= br.bottom + 1,
    };
  });
}

function readable(fit) {
  return !!(fit && fit.dot && !fit.clipped && fit.inside && (fit.sameRow || fit.wrapped) && (!fit.valueNeedsWrap || fit.wrapped));
}

async function sameRowHeight(page) {
  return page.evaluate(() => {
    const items = [...document.querySelectorAll(".fides-uc-pilot__more-grid > .fides-uc-pilot__popover, .fides-uc-pilot__filter-row > .fides-uc-pilot__popover, .fides-uc-pilot__filter-row > .fides-uc-pilot__more-toggle, .fides-uc-pilot__technical-grid > .fides-uc-pilot__popover")].filter((el) => el.offsetParent);
    const groups = [];
    items.forEach((el) => {
      const top = el.getBoundingClientRect().top;
      let row = groups.find((g) => Math.abs(g.top - top) < 8);
      if (!row) {
        row = { top, heights: [] };
        groups.push(row);
      }
      row.heights.push(Math.round(el.getBoundingClientRect().height));
    });
    return groups.length > 0 && groups.every((g) => g.heights.every((h) => Math.abs(h - g.heights[0]) <= 1));
  });
}

/** Open the list of a group (More filters first when it lives there and is closed) and tick one option. */
async function pick(page, kind, w, group, index) {
  const tag = (s) => `[data-${kind.prefix}-pilot-${s}]`;
  const popover = popoverOf(page, group);
  if (!(await popover.isVisible())) {
    if (kind.technical.includes(group)) {
      if (!(await page.locator(`#fides-${kind.prefix}-pilot-more`).isVisible())) await page.locator(tag("more-toggle")).click();
      if (!(await popover.isVisible())) await page.locator(tag("tech-toggle")).click();
    } else if (!compactOf(w)) {
      await page.locator(tag("more-toggle")).click();
    }
  }
  // Close an option list that is still open first: in the dialog the lists are in-flow, so closing it on focus loss would move the target.
  if (await page.locator("[data-fides-ds-popover].is-open").count()) await page.keyboard.press("Escape");
  await popover.locator(".fides-ds-popover__toggle").click();
  const box = page.locator(`input[name="${group}[]"]`).nth(index);
  const label = ((await box.locator("xpath=following-sibling::*[contains(@class,'fides-ds-option__label')]").textContent()) || "").trim();
  if (compactOf(w)) {
    await box.check();
    // Close the option list (in-flow in the dialog) so the next list does not shift under the pointer.
    await page.keyboard.press("Escape");
    return label;
  }
  await Promise.all([
    page.waitForURL((url) => keyIn(url.href, `${group}[]`), { timeout: 20000 }),
    box.check(),
  ]);
  await page.waitForSelector(".fides-uc-pilot__count", { timeout: 20000 });
  return label;
}

async function openDialog(page, kind) {
  await page.locator(`[data-${kind.prefix}-pilot-open]`).click();
  await page.waitForSelector(`[data-${kind.prefix}-pilot-panel].is-open`, { timeout: 10000 });
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  let allSent = [];
  for (const w of WIDTHS) {
    const compact = compactOf(w);
    for (const loc of LOCALES) {
      const root = rootFor(loc);
      const T = TEXT[loc];
      for (const kind of KINDS) {
        const tag = `${kind.key} ${loc} @${w}`;
        const sel = (s) => `[data-${kind.prefix}-pilot-${s}]`;
        const { ctx, page, sent } = await newPage(browser, w);
        const listUrl = `${root}/${kind.path}`;
        await openList(page, listUrl);
        const total = await countOf(page);
        const all = [...kind.primary, ...kind.more, ...kind.technical];

        // 1. Structure.
        check(`${tag}: overview has no horizontal overflow`, await noOverflow(page));
        const present = {};
        for (const g of all) present[g] = await page.locator(`input[name="${g}[]"]`).count();
        const missing = all.filter((g) => !present[g]);
        check(`${tag}: every filter list is still offered (${all.join(", ")})`, missing.length === 0, `missing ${missing.join(",")}`);
        const moreSection = page.locator(`#fides-${kind.prefix}-pilot-more`);
        if (!compact) {
          for (const g of kind.primary) check(`${tag}: primary list "${g}" is visible in the bar`, await popoverOf(page, g).isVisible());
          for (const g of [...kind.more, ...kind.technical]) check(`${tag}: list "${g}" is not in the bar`, !(await popoverOf(page, g).isVisible()));
          check(`${tag}: the Filters dialog button is hidden on desktop`, !(await page.locator(sel("open")).isVisible()));
          const moreToggle = page.locator(sel("more-toggle"));
          check(`${tag}: the More filters button is visible and closed (${T.more})`, (await moreToggle.isVisible()) && (await moreToggle.getAttribute("aria-expanded")) === "false" && (await moreToggle.textContent()).includes(T.more), await moreToggle.textContent());
          check(`${tag}: the search field and Search button are visible`, (await page.locator("#fides-search-input").isVisible()) && (await page.locator(".fides-uc-pilot__search-submit").isVisible()));
          check(`${tag}: Apply is hidden while nothing changed`, !(await page.locator(`${sel("panel")} .fides-uc-pilot__panel-actions`).isVisible()));
          const english = loc === "NL" ? (await moreToggle.textContent()).includes("More filters") : false;
          check(`${tag}: the More filters label is not English`, !english);
        } else {
          check(`${tag}: the Filters button is visible and the dialog closed`, (await page.locator(sel("open")).isVisible()) && !(await page.locator(`${sel("panel")}.is-open`).count()));
          check(`${tag}: the More filters button is not used on a phone (the dialog lists everything)`, !(await page.locator(sel("more-toggle")).isVisible()));
        }

        // 2. More filters and Technical filters (desktop).
        if (!compact) {
          const moreToggle = page.locator(sel("more-toggle"));
          await moreToggle.click();
          check(`${tag}: More filters opens (aria-expanded, panel visible)`, (await moreToggle.getAttribute("aria-expanded")) === "true" && (await moreSection.isVisible()));
          const chrome = await moreSection.evaluate((el) => {
            const s = getComputedStyle(el);
            return {
              bg: s.backgroundColor,
              top: s.borderTopWidth,
              topColor: s.borderTopColor,
              title: !!(el.querySelector(".fides-uc-pilot__more-title") && el.querySelector(".fides-uc-pilot__more-title").offsetParent),
              close: !!(el.querySelector(".fides-uc-pilot__more-close") && el.querySelector(".fides-uc-pilot__more-close").offsetParent),
            };
          });
          const white = /rgb\(255,\s*255,\s*255\)/.test(chrome.bg);
          check(`${tag}: More filters is a white panel with a 2px top line, title and close`, white && chrome.top === "2px" && chrome.topColor !== chrome.bg && chrome.title && chrome.close, JSON.stringify(chrome));
          const primaryLine = await fieldFit(popoverOf(page, kind.primary[0]).locator(".fides-ds-popover__toggle"));
          const moreLine = await fieldFit(popoverOf(page, kind.more[0]).locator(".fides-ds-popover__toggle"));
          check(`${tag}: the bar and More filters keep label and value fully visible`, readable(primaryLine) && readable(moreLine), JSON.stringify({ primaryLine, moreLine }));
          check(`${tag}: fields in the same row are the same height`, await sameRowHeight(page));
          for (const g of kind.more) check(`${tag}: More filters shows "${g}"`, await popoverOf(page, g).isVisible());
          const techGrid = page.locator(`#fides-${kind.prefix}-pilot-technical`);
          const techToggle = page.locator(sel("tech-toggle"));
          check(`${tag}: Technical filters is closed by default (${T.technical})`, (await techToggle.isVisible()) && !(await techGrid.isVisible()) && (await techToggle.textContent()).includes(T.technical), await techToggle.textContent());
          await techToggle.click();
          check(`${tag}: Technical filters opens on its own button`, (await techToggle.getAttribute("aria-expanded")) === "true" && (await techGrid.isVisible()));
          await techToggle.click();
          check(`${tag}: Technical filters closes again`, !(await techGrid.isVisible()));
          await page.locator(sel("more-close")).click();
          check(`${tag}: the close button closes More filters and focus returns to the More filters button`, !(await moreSection.isVisible()) && (await activeIs(page, sel("more-toggle"))));
          await moreToggle.focus();
          await page.keyboard.press("Enter");
          check(`${tag}: Enter on the More filters button opens it`, await moreSection.isVisible());
          await page.keyboard.press("Escape");
          check(`${tag}: Escape closes More filters and focus stays on its button`, !(await moreSection.isVisible()) && (await activeIs(page, sel("more-toggle"))));
          // Keyboard order: search field -> Search -> primary lists -> More filters.
          await page.locator("#fides-search-input").focus();
          let reached = false;
          for (let i = 0; i < 8 && !reached; i += 1) {
            await page.keyboard.press("Tab");
            reached = await activeIs(page, sel("more-toggle"));
          }
          check(`${tag}: Tab reaches the More filters button from the search field`, reached);
          // An open option list closes first on Escape, then the panel.
          await moreToggle.click();
          await popoverOf(page, kind.more[0]).locator(".fides-ds-popover__toggle").click();
          await page.keyboard.press("Escape");
          check(`${tag}: Escape closes an open option list first, More filters stays open`, (await moreSection.isVisible()) && !(await page.locator("[data-fides-ds-popover].is-open").count()));
          await page.keyboard.press("Escape");
          check(`${tag}: a second Escape closes More filters`, !(await moreSection.isVisible()));
        } else {
          await openDialog(page, kind);
          const names = [];
          for (const g of [...kind.primary, ...kind.more]) if (await popoverOf(page, g).isVisible()) names.push(g);
          check(`${tag}: the dialog lists every general filter (${names.length} of ${kind.primary.length + kind.more.length})`, names.length === kind.primary.length + kind.more.length);
          const dialogLine = await fieldFit(popoverOf(page, kind.primary[0]).locator(".fides-ds-popover__toggle"));
          check(`${tag}: the dialog field keeps label and value fully visible`, readable(dialogLine), JSON.stringify(dialogLine));
          check(`${tag}: dialog fields in the same row are the same height`, await sameRowHeight(page));
          const applyLabel = ((await page.locator(`${sel("panel")} button[type=submit]`).textContent()) || "").replace(/\s+/g, " ").trim();
          const cancelLabel = ((await page.locator(`${sel("panel")} .fides-ds-button--secondary`).first().textContent()) || "").replace(/\s+/g, " ").trim();
          const expectedApply = loc === "NL" ? "Filters toepassen" : "Apply filters";
          const expectedCancel = loc === "NL" ? "Annuleren" : "Cancel";
          check(`${tag}: the dialog ends with Cancel and Apply filters, without a result count`, cancelLabel === expectedCancel && applyLabel === expectedApply && !/\d/.test(applyLabel), `${cancelLabel} | ${applyLabel}`);
          check(`${tag}: the dialog shows the More filters heading (${T.more})`, ((await page.locator(`#fides-${kind.prefix}-pilot-more-title`).textContent()) || "").includes(T.more));
          check(`${tag}: the dialog is focus-trapped (role=dialog, close button focused)`, (await page.locator(`${sel("panel")}`).getAttribute("role")) === "dialog" && (await page.evaluate(() => document.activeElement && document.activeElement.className.includes("panel-close"))));
          // Tab stays inside: Shift+Tab from the first control wraps to Apply.
          await page.keyboard.press("Shift+Tab");
          check(`${tag}: Shift+Tab from the first control wraps inside the dialog`, await page.evaluate(() => !!document.activeElement.closest(".fides-uc-pilot__filter-panel.is-open") && /Apply|toepassen/i.test(document.activeElement.textContent || "")));
          await page.locator(sel("tech-toggle")).click();
          check(`${tag}: the dialog's Technical filters row opens and lists ${kind.technical.join(", ")}`, await popoverOf(page, kind.technical[0]).isVisible());
          await page.locator(sel("tech-toggle")).click();
          await page.keyboard.press("Escape");
          check(`${tag}: Escape closes the dialog and focus returns to the Filters button`, !(await page.locator(`${sel("panel")}.is-open`).count()) && (await activeIs(page, sel("open"))));
          // Cancel discards draft choices.
          await openDialog(page, kind);
          await pick(page, kind, w, kind.pickPrimary, 0);
          await page.locator(`${sel("panel")} .fides-ds-button--secondary${sel("close")}`).click();
          check(`${tag}: Cancel closes the dialog, discards the draft and returns focus to the Filters button`, !(await page.locator(`${sel("panel")}.is-open`).count()) && (await page.locator(`input[name="${kind.pickPrimary}[]"]:checked`).count()) === 0 && (await activeIs(page, sel("open"))));
        }

        // 3. Several choices at once: a primary list and a More list. Desktop applies each one; the dialog waits for Apply filters.
        const baseUrl = page.url();
        if (compact) await openDialog(page, kind);
        const primaryLabel = await pick(page, kind, w, kind.pickPrimary, 0);
        if (!compact) {
          check(`${tag}: a primary choice applies at once and Apply stays hidden`, keyIn(page.url(), `${kind.pickPrimary}[]`) && !(await page.locator(`${sel("panel")} .fides-uc-pilot__panel-actions`).isVisible()) && (await page.locator(".fides-uc-pilot__pill").count()) === 1, page.url());
        }
        const moreOptions = await optionsOf(page, kind.pickMore);
        const moreLabel = await pick(page, kind, w, kind.pickMore, 0);
        if (compact) {
          await page.locator(`${sel("form")} .fides-uc-pilot__panel-actions button[type=submit]`).click();
          await hasParam(page, `${kind.pickMore}[]`);
        }
        await page.waitForSelector(".fides-uc-pilot__count", { timeout: 20000 });
        const bothUrl = page.url();
        check(`${tag}: the URL carries both choices and keeps the language route`, keyIn(bothUrl, `${kind.pickPrimary}[]`) && keyIn(bothUrl, `${kind.pickMore}[]`) && onRoute(bothUrl, loc), bothUrl);
        const filtered = await countOf(page);
        check(`${tag}: several choices narrow the results (${filtered} of ${total})`, filtered >= 0 && filtered < total, filtered);
        const chips = await page.$$eval(".fides-uc-pilot__pills .fides-uc-pilot__pill", (as) => as.map((a) => a.textContent.replace(/\s+/g, " ").trim()));
        check(`${tag}: one removable chip per choice, naming the list and the value`, chips.length === 2 && chips.some((c) => c.includes(primaryLabel)) && chips.some((c) => c.includes(moreLabel)), JSON.stringify(chips));
        const moreToggleAfter = compact ? null : page.locator(sel("more-toggle"));
        if (!compact) {
          check(`${tag}: after Apply the More filters badge shows 1 and the button is highlighted`, (await page.locator(sel("more-badge")).textContent()).trim() === "1" && (await moreToggleAfter.getAttribute("class")).includes("has-active"));
        } else {
          check(`${tag}: after Apply the Filters button counts the choices`, ((await page.locator(".fides-uc-pilot__filters-toggle .fides-filter-count").textContent()) || "").trim() === "2");
        }
        // A chip removes only its own choice; Back returns to the view with both.
        await page.locator(".fides-uc-pilot__pill").filter({ hasText: moreLabel }).first().click();
        await page.waitForFunction((n) => ![...new URL(location.href).searchParams.keys()].some((k) => k.startsWith(n)), kind.pickMore, { timeout: 20000 });
        check(`${tag}: removing a chip keeps the other choice`, keyIn(page.url(), `${kind.pickPrimary}[]`) && !keyIn(page.url(), `${kind.pickMore}[]`), page.url());
        await page.goBack({ waitUntil: "domcontentloaded" });
        await page.waitForSelector(".fides-uc-pilot__count", { timeout: 20000 });
        check(`${tag}: Back returns to the view with both choices (chips and boxes)`, norm(page.url()) === norm(bothUrl) && (await page.locator(".fides-uc-pilot__pill").count()) === 2 && (await page.locator(`input[name="${kind.pickMore}[]"]:checked`).count()) === 1, page.url());
        // Clear: the empty-state / base route removes everything.
        await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
        check(`${tag}: the plain overview shows no chips`, (await page.locator(".fides-uc-pilot__pill").count()) === 0);

        // 4. Direct filtered links.
        const themeValue = moreOptions[0].value;
        const longest = moreOptions.slice().sort((a, b) => b.label.length - a.label.length)[0];
        const links = [[kind.pickMore, themeValue]];
        if (present.sector) { const sector = (await optionsOf(page, "sector"))[0]; if (sector) links.push(["sector", sector.value]); }
        const techOptions = await optionsOf(page, kind.technical[0]);
        for (const [group, value] of links) {
          await openList(page, `${listUrl}?${encodeURIComponent(group + "[]")}=${encodeURIComponent(value)}`);
          const c = await countOf(page);
          const pillCount = await page.locator(".fides-uc-pilot__pill").count();
          check(`${tag}: direct link ?${group}[]= filters (${c} of ${total}), one chip, box checked`, c >= 0 && c <= total && pillCount === 1 && (await page.locator(`input[name="${group}[]"]:checked`).count()) === 1, `${c}/${pillCount}`);
          if (!compact) check(`${tag}: direct link ?${group}[]= marks the More filters button`, (await page.locator(sel("more-toggle")).getAttribute("class")).includes("has-active") && (await page.locator(sel("more-badge")).textContent()).trim() === "1");
        }
        // A technical choice opens the Technical row when More filters is opened.
        await openList(page, `${listUrl}?${encodeURIComponent(kind.technical[0] + "[]")}=${encodeURIComponent(techOptions[0].value)}`);
        if (!compact) {
          check(`${tag}: a technical choice counts on the More filters button`, (await page.locator(sel("more-badge")).textContent()).trim() === "1");
          await page.locator(sel("more-toggle")).click();
          check(`${tag}: a technical choice opens the Technical filters row`, await page.locator(`#fides-${kind.prefix}-pilot-technical`).isVisible() && (await page.locator(sel("tech-toggle")).getAttribute("aria-expanded")) === "true");
        } else {
          await openDialog(page, kind);
          check(`${tag}: a technical choice shows the Technical filters row open in the dialog`, await page.locator(`#fides-${kind.prefix}-pilot-technical`).isVisible());
        }
        const sharedLinks = kind.key === "issuers"
          ? [["theme", "business_authority"], ["sector", "education"]]
          : [["sector", "public_sector"]];
        for (const [group, value] of sharedLinks) {
          await openList(page, `${listUrl}?${group}=${encodeURIComponent(value)}`);
          const marked = await page.locator(`input[name="${group}[]"][value="${value}"]`).isChecked().catch(() => false);
          check(`${tag}: direct link ?${group}=${value} keeps a chip and a checked box`, new URL(page.url()).searchParams.get(group) === value && (await page.locator(".fides-uc-pilot__pill").count()) === 1 && marked, page.url());
        }

        // 5. Labels: the full list name and chosen value stay readable.
        await openList(page, `${listUrl}?${encodeURIComponent(kind.pickMore + "[]")}=${encodeURIComponent(longest.value)}`);
        if (compact) await openDialog(page, kind); else await page.locator(sel("more-toggle")).click();
        const toggle = popoverOf(page, kind.pickMore).locator(".fides-ds-popover__toggle");
        const chosenLine = await fieldFit(toggle);
        check(`${tag}: a long chosen value stays fully visible inside the field (${longest.label.trim()})`, readable(chosenLine), JSON.stringify(chosenLine));
        check(`${tag}: fields in that row stay the same height`, await sameRowHeight(page));
        const title = (await toggle.getAttribute("title")) || "";
        check(`${tag}: the list button title names list and value`, title.includes(longest.label.trim()) && title.includes(":"), title);
        const chipText = ((await page.locator(".fides-uc-pilot__pill").first().textContent()) || "").replace(/\s+/g, " ");
        const listName = ((await toggle.locator(".fides-ds-popover__label").textContent()) || "").trim();
        check(`${tag}: the chip names the list ("${listName}") and the full value`, chipText.includes(listName) && chipText.includes(longest.label.trim()), chipText);
        check(`${tag}: no horizontal overflow with the filter open`, await noOverflow(page));

        if (kind.key === "issuers") {
          await openList(page, listUrl);
          check(`${tag}: no environment paragraph above the results`, (await page.locator(".fides-uc-pilot__legend").count()) === 0);
          const help = page.locator("#fides-issuer-environment-legend");
          const summary = ((await help.locator("summary").textContent()) || "").replace(/\s+/g, " ").trim();
          check(`${tag}: Environment explains itself as "${loc === "NL" ? "Wat betekenen deze waarden?" : "What do these mean?"}"`, summary === (loc === "NL" ? "Wat betekenen deze waarden?" : "What do these mean?"), summary);
          const helpText = ((await help.locator("p").textContent()) || "").replace(/\s+/g, " ").trim();
          check(`${tag}: Production is live and Test is every other issuer`, loc === "NL" ? /Productie betekent dat een uitgever live is/.test(helpText) && /Test geldt/.test(helpText) : /Production marks an issuer that is live/.test(helpText) && /Test marks every other issuer/.test(helpText), helpText.slice(0, 80));
          const envLabels = (await optionsOf(page, "environment")).map((o) => o.label);
          const unspecified = loc === "NL" ? "Niet opgegeven" : "Not specified";
          check(`${tag}: "Not specified" is explained only when that value is offered`, envLabels.includes(unspecified) === /Not specified|Niet opgegeven/.test(helpText), envLabels.join(","));
        }

        // 6. Relying parties: the readiness explanation sits with the filter.
        if (kind.key === "relying-parties") {
          await openList(page, listUrl);
          check(`${tag}: no readiness paragraph above the results`, (await page.locator(".fides-uc-pilot__legend").count()) === 0);
          const hint = ((await popoverOf(page, "readiness").locator(".fides-uc-pilot__option-hint").textContent().catch(() => "")) || "").trim();
          check(`${tag}: the Readiness list explains readiness (${hint.slice(0, 60)})`, loc === "NL" ? /Gereedheid laat zien/.test(hint) && /operationele status/.test(hint) : /Readiness shows how far/.test(hint) && /operational status/.test(hint), hint);
          const readiness = (await optionsOf(page, "readiness"))[0];
          await openList(page, `${listUrl}?${encodeURIComponent("readiness[]")}=${encodeURIComponent(readiness.value)}`);
          const note = ((await page.locator('[data-filter-note="readiness"]').textContent().catch(() => "")) || "").trim();
          check(`${tag}: an active readiness chip gets a short note that keeps status separate`, loc === "NL" ? /operationele status/.test(note) && /apart veld/.test(note) : /operational status/.test(note) && /separate field/.test(note), note.slice(0, 80));
        }

        // 7. NL: the new labels are Dutch (hidden controls included).
        if (loc === "NL") {
          await openList(page, listUrl);
          const closeLabel = (await page.locator(sel("more-close")).getAttribute("aria-label")) || "";
          const techText = ((await page.locator(sel("tech-toggle")).textContent()) || "");
          check(`${tag}: Close more filters, Technical filters and More filters are Dutch`, closeLabel === T.closeMore && techText.includes(T.technical) && !/More filters|Technical filters/.test(await page.locator(`${sel("panel")}`).innerText().catch(() => "")) , `${closeLabel} | ${techText}`);
        }

        check(`${tag}: nothing was submitted (GET only)`, sent.length === 0, sent.slice(0, 2).join(" "));
        allSent = allSent.concat(sent);
        await ctx.close();
      }
    }
  }
  await browser.close();
  console.log(failures === 0 ? "\nAll filter bar checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
