/**
 * Filters dialog and active filter pills on every pilot overview
 * (credentials, personal and business wallets, organizations, use cases).
 *
 * Resize is not a cancel: a draft choice made in the dialog at 390px stays
 * pending through 390 → 1440 → 390 → 1440 (dialog, scroll lock and focus trap
 * kept) until Apply (URL and pill) or Cancel / Escape (draft discarded). After
 * closing, focus lands on a visible Filters button or, when the layout no
 * longer shows it, on More filters — never on the page body. Normal close at
 * 390 without resize. Removable pills are at least 44px at 1100 and 1440 with
 * a mouse and with touch and at 320/390, while ordinary controls stay 40px only
 * at 1100+ with a fine pointer. The bottom of a long dialog does not chain the
 * wheel to the page.
 *
 * Pills are the removable filter pills only. The empty-state "Remove ..." recovery
 * button carries the same data attribute but is an ordinary 40px desktop control.
 *
 * Run through run-filter-dialog-checks.sh.
 */
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const CATALOGS = [
  { key: "credentials", url: "/fides-design-pilot/credentials/" },
  { key: "personal-wallets", url: "/fides-design-pilot/personal-wallets/" },
  { key: "business-wallets", url: "/fides-design-pilot/business-wallets/" },
  { key: "organizations", url: "/fides-design-pilot/organizations/" },
  { key: "use-cases", url: "/fides-design-pilot/overview/" },
];
const PANEL = ".fides-uc-pilot__filter-panel";
const DRAFT = `${PANEL} .fides-uc-pilot__more-field input[type='checkbox']`;

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

async function newContext(browser, width, height, touch) {
  const context = await browser.newContext({ viewport: { width, height: height || 900 }, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  await context.addCookies(
    Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" })
      .map(([name, value]) => ({ name: `cmplz_${name}`, value, url: BASE }))
  );
  return context;
}

async function load(page, url) {
  try {
    await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (err) {
    console.log(`# retry ${url}: ${err.message.split("\n")[0]}`);
    await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 45000 });
  }
  await page.waitForSelector(".fides-uc-pilot__controls", { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll(".fides-ds-card").length > 0, null, { timeout: 30000 }).catch(() => {});
  // Some overviews render again once late data (likes, usage, accounts) arrives.
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
}

/** Dialog state, the draft checkbox, URL, scroll lock and the focused element. */
function state(page) {
  return page.evaluate(([panelSel, draftSel]) => {
    const panel = document.querySelector(panelSel);
    const r = panel.getBoundingClientRect();
    const draft = document.querySelector(draftSel);
    const el = document.activeElement;
    const visible = !!(el && el !== document.body && el.offsetParent !== null);
    return {
      open: panel.classList.contains("is-open") && panel.getAttribute("role") === "dialog" && panel.getAttribute("aria-modal") === "true",
      covers: getComputedStyle(panel).position === "fixed" && Math.round(r.width) === window.innerWidth && Math.round(r.height) === window.innerHeight,
      draft: !!(draft && draft.checked),
      search: location.search,
      locked: document.documentElement.classList.contains("fides-ds-scroll-locked"),
      focus: el === document.body ? "BODY" : (el.hasAttribute("data-pilot-open") ? "filters" : el.hasAttribute("data-pilot-more-toggle") ? "more" : `${el.tagName}.${el.className}`),
      focusVisible: visible,
      focusInPanel: panel.contains(el),
      pills: [...document.querySelectorAll(".fides-uc-pilot__pill[data-pilot-remove-group]")].filter((p) => p.offsetParent !== null).length,
    };
  }, [PANEL, DRAFT]);
}

async function openDialog(page) {
  await page.click("[data-pilot-open]");
  await page.waitForTimeout(300);
}

async function resize(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(500);
}

/** Tab and Shift+Tab never leave the open dialog. */
async function trapHolds(page) {
  for (let i = 0; i < 30; i += 1) {
    await page.keyboard.press("Tab");
    if (!(await page.evaluate((sel) => document.querySelector(sel).contains(document.activeElement), PANEL))) return `left after ${i + 1} Tab`;
  }
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("Shift+Tab");
    if (!(await page.evaluate((sel) => document.querySelector(sel).contains(document.activeElement), PANEL))) return `left after ${i + 1} Shift+Tab`;
  }
  return "";
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const catalog of CATALOGS.filter((c) => !process.env.PILOT_ONLY || process.env.PILOT_ONLY.split(",").includes(c.key))) {
    const k = catalog.key;

    // Draft through 390 → 1440 → 390 → 1440, then Apply.
    {
      const context = await newContext(browser, 390);
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(`${k} apply: ${e.message}`));
      await load(page, catalog.url);
      const initial = await state(page);
      await openDialog(page);
      await page.locator(DRAFT).first().check();
      await page.waitForTimeout(300);
      let s = await state(page);
      check(`${k} resize/Apply: draft choice pending at 390`, s.open && s.draft && s.search === initial.search && s.locked, JSON.stringify(s));
      await resize(page, 1440);
      s = await state(page);
      check(`${k} resize/Apply: 1440 keeps the dialog, draft, lock and URL`, s.open && s.covers && s.draft && s.locked && s.search === initial.search, JSON.stringify(s));
      const trap = await trapHolds(page);
      check(`${k} resize/Apply: focus trap holds at 1440`, trap === "", trap);
      await page.screenshot({ path: path.join(OUT, `dialog-${k}-1440-open.png`) });
      await resize(page, 390);
      s = await state(page);
      check(`${k} resize/Apply: back at 390 the draft is still pending`, s.open && s.draft && s.locked && s.search === initial.search, JSON.stringify(s));
      await resize(page, 1440);
      await page.click(`${PANEL} [data-pilot-apply]`);
      await page.waitForTimeout(600);
      s = await state(page);
      check(`${k} resize/Apply: Apply commits to the URL and a pill`, !s.open && !s.locked && s.draft && s.search !== initial.search && s.pills === initial.pills + 1, JSON.stringify(s));
      check(`${k} resize/Apply: focus on a visible filter button`, ["filters", "more"].includes(s.focus) && s.focusVisible, s.focus);
      await context.close();
    }

    // Draft through 390 → 1440, then Cancel and (fresh page) Escape.
    for (const how of ["Cancel", "Escape"]) {
      const context = await newContext(browser, 390);
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(`${k} ${how}: ${e.message}`));
      await load(page, catalog.url);
      const initial = await state(page);
      await openDialog(page);
      await page.locator(DRAFT).first().check();
      await page.waitForTimeout(300);
      await resize(page, 1440);
      let s = await state(page);
      check(`${k} resize/${how}: dialog and draft kept at 1440`, s.open && s.draft && s.locked, JSON.stringify(s));
      if (how === "Cancel") await page.click(`${PANEL} .fides-uc-pilot__panel-actions [data-pilot-cancel]`);
      else await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      s = await state(page);
      check(`${k} resize/${how}: draft discarded, URL unchanged, unlocked`, !s.open && !s.draft && !s.locked && s.search === initial.search && s.pills === initial.pills, JSON.stringify(s));
      check(`${k} resize/${how}: focus on a visible filter button, not the body`, ["filters", "more"].includes(s.focus) && s.focusVisible, s.focus);
      await context.close();
    }

    // Normal close at 390 without resize: Cancel, then Apply.
    {
      const context = await newContext(browser, 390);
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(`${k} 390: ${e.message}`));
      await load(page, catalog.url);
      const initial = await state(page);
      await openDialog(page);
      await page.locator(DRAFT).first().check();
      await page.click(`${PANEL} .fides-uc-pilot__panel-actions [data-pilot-cancel]`);
      await page.waitForTimeout(400);
      let s = await state(page);
      check(`${k} 390 Cancel: draft discarded, focus on Filters`, !s.open && !s.draft && s.search === initial.search && s.focus === "filters" && s.focusVisible, JSON.stringify(s));
      await openDialog(page);
      await page.locator(DRAFT).first().check();
      await page.click(`${PANEL} [data-pilot-apply]`);
      await page.waitForTimeout(500);
      s = await state(page);
      check(`${k} 390 Apply: applied, focus on Filters`, !s.open && s.draft && s.search !== initial.search && s.focus === "filters" && s.focusVisible, JSON.stringify(s));
      const pills = await page.$$eval(".fides-uc-pilot__pill[data-pilot-remove-group]", (els) => els.filter((e) => e.offsetParent !== null).map((e) => Math.round(e.getBoundingClientRect().height)));
      check(`${k} 390: removable pills at least 44px`, pills.length > 0 && pills.every((h) => h >= 44), pills.join("/"));
      await context.close();
    }

    // Wheel at the bottom of a long dialog does not scroll the page.
    for (const width of [390, 1440]) {
      const context = await newContext(browser, width < 600 ? width : 390, 640);
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(`${k} wheel ${width}: ${e.message}`));
      await load(page, catalog.url);
      await page.evaluate(() => window.scrollTo(0, 200));
      await openDialog(page);
      if (width >= 600) await page.setViewportSize({ width, height: 640 });
      await page.waitForTimeout(300);
      const tech = page.locator(`${PANEL} [data-pilot-tech-toggle]`);
      if (await tech.count()) await tech.click();
      await page.locator(`${PANEL} [data-fides-ds-popover] .fides-ds-popover__toggle`).first().click();
      await page.waitForTimeout(200);
      const before = await page.evaluate((sel) => {
        const panel = document.querySelector(sel);
        panel.scrollTop = panel.scrollHeight;
        return { y: window.scrollY, scrollable: panel.scrollHeight > panel.clientHeight };
      }, PANEL);
      await page.mouse.move(Math.round(width / 2), 320);
      for (let i = 0; i < 4; i += 1) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(80);
      }
      const after = await page.evaluate((sel) => {
        const panel = document.querySelector(sel);
        return { y: window.scrollY, atBottom: Math.abs(panel.scrollHeight - panel.clientHeight - panel.scrollTop) <= 2, overscroll: getComputedStyle(panel).overscrollBehaviorY };
      }, PANEL);
      check(`${k} wheel ${width}: page stays put at the bottom of the dialog`, before.scrollable && after.atBottom && after.y === before.y && after.overscroll === "contain", JSON.stringify({ before, after }));
      await context.close();
    }

    // Pills at 1100 and 1440 with a mouse and with touch; ordinary controls 40px only with a fine pointer.
    for (const width of [1100, 1440]) {
      for (const touch of [false, true]) {
        const context = await newContext(browser, width, 900, touch);
        const page = await context.newPage();
        page.on("pageerror", (e) => errors.push(`${k} pills ${width}: ${e.message}`));
        await load(page, catalog.url);
        await page.click("[data-pilot-more-toggle]");
        await page.waitForTimeout(200);
        await page.locator(".fides-uc-pilot__more .fides-uc-pilot__more-field input[type='checkbox']").first().check();
        await page.waitForTimeout(500);
        const m = await page.evaluate(() => ({
          fine: matchMedia("(pointer: fine)").matches,
          pills: [...document.querySelectorAll(".fides-uc-pilot__pill[data-pilot-remove-group]")].filter((e) => e.offsetParent !== null).map((e) => Math.round(e.getBoundingClientRect().height)),
          toggle: Math.round(document.querySelector(".fides-uc-pilot__filter-row .fides-ds-popover__toggle").getBoundingClientRect().height),
        }));
        const mode = touch ? "touch" : "mouse";
        check(`${k} pills ${width} ${mode}: pointer is ${touch ? "coarse" : "fine"}`, m.fine === !touch, String(m.fine));
        check(`${k} pills ${width} ${mode}: removable pills at least 44px`, m.pills.length > 0 && m.pills.every((h) => h >= 44), m.pills.join("/"));
        check(`${k} pills ${width} ${mode}: list buttons ${touch ? "44" : "40"}px`, touch ? m.toggle >= 44 : m.toggle === 40, String(m.toggle));
        await context.close();
      }
    }

    // Mobile pills at 320.
    {
      const context = await newContext(browser, 320);
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(`${k} 320: ${e.message}`));
      await load(page, catalog.url);
      await openDialog(page);
      await page.locator(DRAFT).first().check();
      await page.click(`${PANEL} [data-pilot-apply]`);
      await page.waitForTimeout(500);
      const pills = await page.$$eval(".fides-uc-pilot__pill[data-pilot-remove-group]", (els) => els.filter((e) => e.offsetParent !== null).map((e) => Math.round(e.getBoundingClientRect().height)));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`${k} 320: removable pills at least 44px, no overflow`, pills.length > 0 && pills.every((h) => h >= 44) && overflow <= 0, `${pills.join("/")} ${overflow}`);
      await context.close();
    }
  }
  await browser.close();
  check("no page errors", errors.length === 0, errors.join(" | "));
  const failed = results.filter((r) => !r.ok);
  console.log(`# pass ${results.length - failed.length}`);
  console.log(`# fail ${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
