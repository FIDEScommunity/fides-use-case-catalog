/**
 * Shared More filters pattern (Paper 20.45) on every pilot overview:
 * credentials, personal and business wallets, organizations and use cases.
 *
 * Desktop and tablet with an inline bar: white panel with a 2px top line,
 * 20/26 title, close button of at least 44px, no total in the head; lists
 * side by side (at most 300px); checkbox groups below them; a closed
 * Technical filters row of at least 56px with the chevron at the far end
 * (none for organizations); Enter toggles it; Escape closes the panel and
 * returns focus; a selection stays visible as a pill once the panel closes.
 * Compact widths: the same groups stacked inside the Filters dialog, only
 * the dialog body scrolls, Escape closes it and focus returns to Filters.
 *
 * Run through run-more-filters-checks.sh.
 */
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const CATALOGS = [
  { key: "credentials", url: "/fides-design-pilot/credentials/", groups: ["Listing"], technical: true },
  { key: "personal-wallets", url: "/fides-design-pilot/personal-wallets/", groups: ["Listing"], technical: true },
  { key: "business-wallets", url: "/fides-design-pilot/business-wallets/", groups: ["Listing"], technical: true },
  { key: "organizations", url: "/fides-design-pilot/organizations/", groups: ["Listing"], technical: false },
  { key: "use-cases", url: "/fides-design-pilot/overview/", groups: ["Awards"], technical: true },
];
const WIDTHS = (process.env.MORE_WIDTHS || "1440,1280,1100,1024,768,390,320").split(",").map(Number);

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

async function newContext(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addCookies(
    Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" })
      .map(([name, value]) => ({ name: `cmplz_${name}`, value, url: BASE }))
  );
  return context;
}

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/** Geometry and styles of the More filters content inside `scopeSelector`. */
function readMore(page, scopeSelector) {
  return page.evaluate((scopeSel) => {
    const scope = document.querySelector(scopeSel);
    const more = scope.querySelector(".fides-uc-pilot__more");
    const vis = (el) => !!(el && el.offsetParent !== null);
    const rect = (el) => el.getBoundingClientRect();
    const grid = more.querySelector(".fides-uc-pilot__more-grid");
    const lists = [...grid.querySelectorAll(":scope > [data-fides-ds-popover]")].filter(vis);
    const groups = [...grid.querySelectorAll(":scope > .fides-uc-pilot__more-field")].filter(vis);
    const tech = more.querySelector("[data-pilot-tech-toggle]");
    const techIcon = tech && tech.querySelector(".fides-uc-pilot__technical-icon");
    const title = more.querySelector(".fides-uc-pilot__more-title");
    const head = more.querySelector(".fides-uc-pilot__more-head");
    const close = more.querySelector("[data-pilot-more-close]");
    const style = getComputedStyle(more);
    const listsBottom = lists.length ? Math.max(...lists.map((el) => rect(el).bottom)) : rect(grid).top;
    const options = groups.flatMap((g) => [...g.querySelectorAll("label.fides-ds-option")]).filter(vis).map((label) => {
      const input = label.querySelector("input");
      return { height: Math.round(rect(label).height), box: input ? Math.round(rect(input).width) : 0 };
    });
    return {
      id: more.id,
      lists: lists.map((el) => ({ top: Math.round(rect(el).top), left: Math.round(rect(el).left), width: Math.round(rect(el).width) })),
      groups: groups.map((g) => ({ label: ((g.querySelector(".fides-uc-pilot__more-label") || {}).textContent || "").trim(), top: Math.round(rect(g).top), width: Math.round(rect(g).width) })),
      groupsBelowLists: groups.every((g) => rect(g).top >= listsBottom - 1),
      options,
      tech: tech ? {
        expanded: tech.getAttribute("aria-expanded"),
        controls: tech.getAttribute("aria-controls"),
        height: Math.round(rect(tech).height),
        width: Math.round(rect(tech).width),
        gridWidth: Math.round(rect(grid).width),
        chevronGap: Math.round(rect(tech).right - rect(techIcon).right),
        title: [getComputedStyle(tech.querySelector(".fides-uc-pilot__technical-title")).fontSize, getComputedStyle(tech.querySelector(".fides-uc-pilot__technical-title")).fontWeight].join("/"),
        summary: ((tech.querySelector(".fides-uc-pilot__technical-names") || {}).textContent || "").trim(),
        below: rect(tech).top >= Math.max(listsBottom, ...groups.map((g) => rect(g).bottom)) - 1,
        gridHidden: !!(document.getElementById(tech.getAttribute("aria-controls")) || {}).hidden,
      } : null,
      title: title ? [getComputedStyle(title).fontSize, getComputedStyle(title).lineHeight, getComputedStyle(title).fontWeight].join("/") : null,
      headText: head ? head.textContent.replace(/\s+/g, " ").trim() : "",
      close: vis(close) ? Math.round(rect(close).width) : 0,
      border: style.borderTopWidth,
      background: style.backgroundColor,
      shadow: style.boxShadow,
      wide: scope.scrollWidth - scope.clientWidth,
    };
  }, scopeSelector);
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const catalog of CATALOGS) {
    for (const width of WIDTHS) {
      const context = await newContext(browser, width);
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(`${catalog.key} ${width}: ${e.message}`));
      await open(page, BASE + catalog.url);
      await page.waitForSelector(".fides-uc-pilot__controls", { timeout: 30000 });
      await page.waitForFunction(() => document.querySelectorAll(".fides-ds-card").length > 0, null, { timeout: 30000 }).catch(() => {});
      // Some overviews render again once late data (likes, usage, accounts) arrives.
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(300);
      const tag = `${catalog.key} ${width}`;
      const compact = await page.isVisible("[data-pilot-open]");
      const minTarget = width >= 1100 ? 40 : 44;

      if (!compact) {
        const toggle = page.locator("[data-pilot-more-toggle]");
        check(`${tag}: More filters closed by default`, (await toggle.getAttribute("aria-expanded")) === "false" && !(await page.isVisible(".fides-uc-pilot__more")));
        await toggle.click();
        await page.waitForTimeout(200);
        const m = await readMore(page, ".fides-uc-pilot__controls");
        check(`${tag}: toggle expanded and controls the panel`, (await toggle.getAttribute("aria-expanded")) === "true" && (await toggle.getAttribute("aria-controls")) === m.id);
        check(`${tag}: white panel, 2px top line, no shadow`, m.border === "2px" && m.background === "rgb(255, 255, 255)" && m.shadow === "none", `${m.border} ${m.background} ${m.shadow}`);
        check(`${tag}: title 20/26 semibold, no total in the head`, m.title === "20px/26px/600" && m.headText === "More filters", `${m.title} "${m.headText}"`);
        check(`${tag}: close button at least 44px`, m.close >= 44, String(m.close));
        check(`${tag}: lists side by side, at most 300px`, m.lists.length >= 1 && m.lists.every((l) => l.width <= 300) && (m.lists.length < 2 || m.lists[1].top === m.lists[0].top || width < 1024), JSON.stringify(m.lists));
        check(`${tag}: checkbox group ${catalog.groups.join("/")} below the lists`, m.groups.map((g) => g.label).join(",") === catalog.groups.join(",") && m.groupsBelowLists, JSON.stringify(m.groups));
        check(`${tag}: options with an 18px checkbox and a ${minTarget}px+ label`, m.options.length > 0 && m.options.every((o) => o.box === 18 && o.height >= minTarget), JSON.stringify(m.options));
        if (catalog.technical) {
          const t = m.tech;
          check(`${tag}: Technical filters row closed with a field summary`, t && t.expanded === "false" && t.gridHidden && t.summary.length > 0, JSON.stringify(t));
          check(`${tag}: Technical filters row full width, 56px+, 16px semibold title, chevron at the end`, t && t.height >= 56 && Math.abs(t.width - t.gridWidth) <= 1 && t.chevronGap <= 2 && t.title === "16px/600" && t.below, JSON.stringify(t));
          await page.locator("[data-pilot-tech-toggle]").focus();
          await page.keyboard.press("Enter");
          await page.waitForTimeout(200);
          const opened = await page.evaluate(() => {
            const tech = document.querySelector("[data-pilot-tech-toggle]");
            const grid = document.getElementById(tech.getAttribute("aria-controls"));
            const lists = [...grid.querySelectorAll("[data-fides-ds-popover]")].map((el) => Math.round(el.getBoundingClientRect().width));
            return { expanded: tech.getAttribute("aria-expanded"), visible: grid.offsetParent !== null, lists, focused: document.activeElement === tech, line: getComputedStyle(grid).borderTopWidth };
          });
          check(`${tag}: Enter opens the technical lists below a line`, opened.expanded === "true" && opened.visible && opened.lists.length > 0 && opened.lists.every((w) => w <= 300) && opened.focused && opened.line === "1px", JSON.stringify(opened));
          check(`${tag}: no overflow with the technical lists open`, (await overflow(page)) <= 0, String(await overflow(page)));
          if (width === 1440 || width === 1024) await page.locator(".fides-uc-pilot__controls").screenshot({ path: path.join(OUT, `more-${catalog.key}-${width}-technical.png`) });
          await page.keyboard.press("Enter");
          await page.waitForTimeout(150);
          check(`${tag}: Enter closes the technical lists again`, (await page.getAttribute("[data-pilot-tech-toggle]", "aria-expanded")) === "false");
        } else {
          check(`${tag}: no Technical filters row`, !m.tech);
        }
        check(`${tag}: no overflow with More filters open`, (await overflow(page)) <= 0 && m.wide <= 0, `${await overflow(page)} ${m.wide}`);
        if (width === 1440 || width === 1024) await page.locator(".fides-uc-pilot__controls").screenshot({ path: path.join(OUT, `more-${catalog.key}-${width}.png`) });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
        check(`${tag}: Escape closes More filters and returns focus`, (await toggle.getAttribute("aria-expanded")) === "false" && (await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-pilot-more-toggle"))));

        // A selection in a checkbox group stays visible as a pill once the panel is closed.
        const pillsBefore = await page.locator("[data-pilot-remove-group]").count();
        await toggle.click();
        await page.waitForTimeout(200);
        const option = page.locator(".fides-uc-pilot__more .fides-uc-pilot__more-field input[type='checkbox']").first();
        await option.check();
        await page.waitForTimeout(500);
        if ((await page.locator("[data-pilot-more-toggle]").getAttribute("aria-expanded")) === "true") await page.locator("[data-pilot-more-toggle]").click();
        await page.waitForTimeout(200);
        const closed = await page.evaluate(() => ({
          pills: [...document.querySelectorAll("[data-pilot-remove-group]")].filter((el) => el.offsetParent !== null).length,
          checked: !!document.querySelector(".fides-uc-pilot__more .fides-uc-pilot__more-field input[type='checkbox']:checked"),
          badge: (document.querySelector("[data-pilot-more-badge]") || {}).textContent || "",
        }));
        check(`${tag}: selection kept and shown as a pill with More filters closed`, closed.checked && closed.pills === pillsBefore + 1 && Number(closed.badge) >= 1, JSON.stringify(closed));
      } else {
        const filters = page.locator("[data-pilot-open]");
        await filters.click();
        await page.waitForTimeout(300);
        const panelSel = ".fides-uc-pilot__filter-panel.is-open";
        const m = await readMore(page, panelSel);
        check(`${tag}: dialog shows the More filters groups`, m.groups.map((g) => g.label).join(",") === catalog.groups.join(",") && m.lists.length >= 1, JSON.stringify(m.groups));
        check(`${tag}: stacked lists, no nested close`, new Set(m.lists.map((l) => l.left)).size === 1 && m.close === 0, JSON.stringify(m.lists));
        check(`${tag}: option labels at least 44px`, m.options.length > 0 && m.options.every((o) => o.height >= 44 && o.box === 18), JSON.stringify(m.options));
        if (catalog.technical) {
          check(`${tag}: Technical filters row 56px+ and closed`, m.tech && m.tech.height >= 56 && m.tech.expanded === "false", JSON.stringify(m.tech));
          await page.click(`${panelSel} [data-pilot-tech-toggle]`);
          await page.waitForTimeout(150);
          check(`${tag}: Technical filters open inside the dialog`, (await page.getAttribute(`${panelSel} [data-pilot-tech-toggle]`, "aria-expanded")) === "true");
        } else {
          check(`${tag}: no Technical filters row`, !m.tech);
        }
        const scroll = await page.evaluate(async (sel) => {
          const panel = document.querySelector(sel);
          const before = window.scrollY;
          panel.scrollTop = panel.scrollHeight;
          await new Promise((r) => setTimeout(r, 100));
          return { page: window.scrollY - before, panel: panel.scrollTop, scrollable: panel.scrollHeight > panel.clientHeight, wide: panel.scrollWidth - panel.clientWidth };
        }, panelSel);
        check(`${tag}: only the dialog body scrolls, no sideways overflow`, scroll.page === 0 && (!scroll.scrollable || scroll.panel > 0) && scroll.wide <= 0, JSON.stringify(scroll));
        if (width === 390) await page.screenshot({ path: path.join(OUT, `more-${catalog.key}-${width}-dialog.png`) });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(250);
        check(`${tag}: Escape closes the dialog and returns focus to Filters`, !(await page.isVisible(panelSel)) && (await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-pilot-open"))));
        check(`${tag}: no overflow`, (await overflow(page)) <= 0);
      }
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
