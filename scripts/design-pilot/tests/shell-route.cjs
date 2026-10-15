/**
 * Visitor route through the pilot site shell, at desktop, tablet and mobile:
 * homepage fragment -> overview -> detail -> back to overview.
 *
 * Uses an existing Playwright install and the system Chrome (no new repo
 * dependency). Run through run-shell-route.sh; screenshots go to SCREENS_DIR.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const WIDTHS = (process.env.WIDTHS || "1440,1024,768,390,320").split(",").map(Number);
const WIDE = 1100;

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

async function pageState(page) {
  return page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    themeHeader: Boolean(document.querySelector("#header.ct-header, .ct-footer")),
    shellHeader: Boolean(document.querySelector(".fides-ds-site-header")),
    shellFooter: Boolean(document.querySelector(".fides-ds-site-footer")),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    mainLeft: Math.round(document.querySelector("#fides-ds-main").getBoundingClientRect().left),
    errors: window.__pilotErrors || [],
  }));
}

async function shellChecks(page, label, width) {
  const s = await pageState(page);
  check(`${label} @${width}: shell header and footer, no theme header`, s.shellHeader && s.shellFooter && !s.themeHeader, JSON.stringify(s));
  check(`${label} @${width}: white page without outer margin`, s.bodyBg === "rgb(255, 255, 255)" && s.mainLeft === 0, `${s.bodyBg} left=${s.mainLeft}`);
  check(`${label} @${width}: no horizontal overflow`, !s.overflow);
}

async function navigateToOverview(page, width) {
  if (width >= WIDE) {
    const explore = page.getByRole("button", { name: "Explore" });
    await explore.click();
    const panel = page.locator("#fides-ds-panel-explore");
    check(`desktop @${width}: Explore opens its panel`, await panel.isVisible());
    await page.keyboard.press("Escape");
    check(`desktop @${width}: Escape closes the panel and returns focus`, !(await panel.isVisible()) && (await explore.evaluate((el) => el === document.activeElement)));
    await page.getByRole("button", { name: "Community" }).click();
    await explore.click();
    const open = await page.locator(".fides-ds-site-nav__panel:not([hidden])").count();
    check(`desktop @${width}: one panel at a time`, open === 1, `open=${open}`);
    await page.mouse.click(5, 600);
    check(`desktop @${width}: click outside closes`, (await page.locator(".fides-ds-site-nav__panel:not([hidden])").count()) === 0);
    await explore.click();
    await page.screenshot({ path: path.join(OUT, `nav-explore-${width}.png`) });
    await page.getByRole("button", { name: "Tools & API" }).click();
    await page.screenshot({ path: path.join(OUT, `nav-tools-${width}.png`) });
    await page.getByRole("button", { name: "Community" }).click();
    await page.screenshot({ path: path.join(OUT, `nav-community-${width}.png`) });
    await explore.click();
    await page.locator("#fides-ds-panel-explore").getByRole("link", { name: /^Use cases/ }).click();
  } else {
    const menuButton = page.getByRole("button", { name: "Menu" });
    await menuButton.click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    check(`menu @${width}: Menu opens the dialog`, await dialog.isVisible());
    check(`menu @${width}: focus moves into the dialog`, await page.evaluate(() => document.getElementById("fides-ds-menu").contains(document.activeElement)));
    check(`menu @${width}: page behind does not scroll`, await page.evaluate(() => getComputedStyle(document.body).overflow === "hidden"));
    await page.screenshot({ path: path.join(OUT, `menu-${width}.png`) });
    await page.keyboard.press("Escape");
    check(`menu @${width}: Escape closes and returns focus`, !(await dialog.isVisible()) && (await menuButton.evaluate((el) => el === document.activeElement)));
    await menuButton.click();
    await dialog.getByText("Community").first().click();
    check(`menu @${width}: Community group expands`, await dialog.getByRole("link", { name: "Community Awards" }).isVisible());
    await dialog.getByRole("link", { name: "Use cases", exact: true }).click();
  }
  await page.waitForURL(/\/fides-design-pilot\/overview\/?$/);
  check(`route @${width}: navigation reaches the pilot overview`, true);
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      // Locally Complianz writes its consent cookie on path ":10088/", so a choice never sticks; preset it.
      await context.addCookies(
        Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" })
          .map(([name, value]) => ({ name: `cmplz_${name}`, value, url: BASE }))
      );
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.goto(`${BASE}/fides-design-pilot/homepage-fragment/`);
      // The existing consent banner overlays every page; answer it first, as a visitor would.
      const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
      if (await deny.waitFor({ state: "visible", timeout: 4000 }).then(() => true, () => false)) await deny.click();
      await page.mouse.move(0, 0);
      await shellChecks(page, "homepage fragment", width);
      await page.screenshot({ path: path.join(OUT, `fragment-${width}.png`), fullPage: true });
      const featuredHref = await page.locator(".fides-uc-featured a.fides-ds-card__link").first().getAttribute("href");
      check(`fragment @${width}: featured card links to the pilot detail`, /\/fides-design-pilot\/use-case\/\?usecase=/.test(featuredHref || ""), featuredHref);

      await navigateToOverview(page, width);
      await page.locator(".fides-ds-card--row a.fides-ds-card__link").first().waitFor();
      await shellChecks(page, "overview", width);
      const band = await page.evaluate(() => {
        const el = document.querySelector(".fides-uc-contribute");
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: Math.round(r.left), width: Math.round(r.width), bg: getComputedStyle(el).backgroundColor, button: Boolean(el.querySelector("a.fides-ds-button")) };
      });
      check(`overview @${width}: contribute band spans the page`, band && band.left === 0 && band.width === width && band.bg === "rgb(14, 14, 14)" && band.button, JSON.stringify(band));
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.screenshot({ path: path.join(OUT, `overview-${width}.png`), fullPage: true });
      await page.screenshot({ path: path.join(OUT, `overview-top-${width}.png`) });
      await page.locator(".fides-uc-contribute").scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.screenshot({ path: path.join(OUT, `overview-bottom-${width}.png`) });
      await page.evaluate(() => window.scrollTo(0, 0));

      const first = page.locator(".fides-ds-card--row a.fides-ds-card__link").first();
      const title = (await first.textContent()).trim();
      await first.click();
      await page.waitForURL(/\/fides-design-pilot\/use-case\/\?usecase=/);
      check(`route @${width}: overview row opens the pilot detail`, (await page.locator("h1").first().textContent()).trim() === title, title);
      await shellChecks(page, "detail", width);

      const nav = page.locator("details.fides-uc-detail__sections");
      const summary = nav.locator("summary");
      if (width >= WIDE) {
        check(`detail @${width}: section tabs are visible`, (await nav.evaluate((el) => el.open)) && !(await summary.isVisible()) && (await nav.getByRole("link").first().isVisible()));
      } else {
        const box = await summary.boundingBox();
        check(`detail @${width}: section navigation collapsed to "On this page"`, !(await nav.evaluate((el) => el.open)) && (await summary.isVisible()) && box && box.height >= 44, JSON.stringify(box));
        const navBox = await nav.boundingBox();
        check(`detail @${width}: collapsed bar spans the viewport`, navBox && Math.round(navBox.x) === 0 && Math.round(navBox.width) === width, JSON.stringify(navBox));
        await summary.click();
        const link = nav.getByRole("link").nth(1);
        check(`detail @${width}: "On this page" opens the section list`, await link.isVisible());
        const hash = (await link.getAttribute("href")) || "";
        await link.click();
        check(`detail @${width}: choosing a section collapses the list and jumps`, !(await nav.evaluate((el) => el.open)) && page.url().endsWith(hash), page.url());
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      await page.screenshot({ path: path.join(OUT, `detail-${width}.png`), fullPage: true });
      await nav.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -200));
      await page.screenshot({ path: path.join(OUT, `detail-sections-${width}.png`) });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(OUT, `detail-top-${width}.png`) });

      await page.getByRole("link", { name: "← All use cases" }).click();
      await page.waitForURL(/\/fides-design-pilot\/overview\/?$/);
      check(`route @${width}: back link returns to the overview`, true);
      // History is overview -> detail (-> #section) -> overview; step back past the detail entries.
      await page.goBack({ waitUntil: "commit" });
      for (let i = 0; i < 3 && /usecase=/.test(page.url()); i++) {
        await page.goBack({ waitUntil: "commit" });
        await page.waitForTimeout(300);
      }
      check(`route @${width}: browser back from detail returns to the overview`, /\/fides-design-pilot\/overview\/?$/.test(page.url()), page.url());

      check(`@${width}: no JavaScript page errors`, pageErrors.length === 0, pageErrors.join(" | "));
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.ok).length;
  fs.writeFileSync(path.join(OUT, "shell-route-report.json"), JSON.stringify(results, null, 2));
  console.log(`# pass ${results.length - failed}\n# fail ${failed}`);
  if (failed) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
