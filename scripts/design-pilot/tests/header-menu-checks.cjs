/**
 * Targeted shared-header keyboard checks (Services round): Enter and ArrowDown open the
 * dropdown menus (About FIDES and every other menu button), Escape closes and returns focus,
 * Services is reachable under About FIDES and is the current item on the Services page.
 * Env: WIDTHS (default "1440,390"), PILOT_URL, PILOT_PATH, CHROME_PATH, PLAYWRIGHT_MODULE.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const PILOT = process.env.PILOT_PATH || "/fides-design-pilot";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}
async function go(page, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 2000 }).then(() => true, () => false)) await deny.click();
  await page.mouse.move(0, 0);
}
const expanded = (loc) => loc.getAttribute("aria-expanded");
const focusedControls = (page) => page.evaluate(() => (document.activeElement && document.activeElement.getAttribute("aria-controls")) || "");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  for (const width of WIDTHS) {
    const L = (w) => `${w}@${width}`;
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 700 });
    const page = await ctx.newPage();
    for (const route of [`${PILOT}/services/`, `${PILOT}/about-fides/`]) {
      await go(page, route);
      const isServices = route.endsWith("/services/");
      const tag = isServices ? "services" : "about";
      if (width >= 1100) {
        const ids = await page.locator(".fides-ds-site-nav__toggle").evaluateAll((els) => els.map((e) => e.getAttribute("aria-controls")));
        check(`${L(tag)}: header has About FIDES and at least one other menu button`, ids.includes("fides-ds-panel-about") && ids.length >= 2, ids.join("|"));
        for (const id of ids) {
          const t = page.locator(`[aria-controls="${id}"]`);
          for (const key of ["Enter", "ArrowDown"]) {
            await t.focus();
            await page.keyboard.press(key);
            const open = (await expanded(t)) === "true" && (await page.locator(`#${id}`).isVisible());
            const onlyOne = (await page.locator('.fides-ds-site-nav__toggle[aria-expanded="true"]').count()) === 1;
            check(`${L(tag)}: ${key} opens ${id}`, open && onlyOne);
            await page.keyboard.press("Escape");
            check(`${L(tag)}: Escape closes ${id} and focus returns to its button`, (await expanded(t)) === "false" && (await focusedControls(page)) === id);
          }
          // ArrowDown on an already open menu must not close or reopen it.
          await t.focus();
          await page.keyboard.press("Enter");
          await page.keyboard.press("ArrowDown");
          check(`${L(tag)}: ArrowDown on an open ${id} keeps it open`, (await expanded(t)) === "true");
          await page.keyboard.press("Escape");
        }
        const about = page.locator('[aria-controls="fides-ds-panel-about"]');
        await about.focus();
        await page.keyboard.press("ArrowDown");
        const labels = await page.locator("#fides-ds-panel-about a").evaluateAll((a) => a.map((x) => x.textContent.trim().replace(/ →$/, "")));
        let reached = false;
        for (let i = 0; i < labels.length + 2 && !reached; i += 1) {
          await page.keyboard.press("Tab");
          reached = await page.evaluate(() => /^Services/.test((document.activeElement.textContent || "").trim()));
        }
        const cur = await page.locator("#fides-ds-panel-about a", { hasText: /^Services/ }).getAttribute("aria-current");
        const toggleCur = await about.getAttribute("aria-current");
        check(`${L(tag)}: Services is reachable with Tab under About FIDES`, reached, labels.join("|"));
        check(`${L(tag)}: active state ${isServices ? "current on Services and About FIDES" : "About FIDES current, Services not current on the About page"}`, isServices ? (cur === "page" || cur === "true") && toggleCur === "true" : !cur && toggleCur === "true", `${cur}|${toggleCur}`);
        await page.keyboard.press("Escape");
        check(`${L(tag)}: Escape from inside the panel returns focus to About FIDES`, (await focusedControls(page)) === "fides-ds-panel-about");
      } else if (isServices) {
        const burger = page.locator("[data-fides-ds-menu-open]");
        for (const key of ["Enter", "Space"]) {
          await burger.focus();
          await page.keyboard.press(key);
          await page.locator("#fides-ds-menu").waitFor({ state: "visible" });
          check(`${L(tag)}: ${key} opens the mobile menu`, (await expanded(burger)) === "true");
          await page.keyboard.press("Escape");
          await page.waitForFunction(() => document.querySelector("#fides-ds-menu").hidden, null, { timeout: 3000 }).catch(() => {});
          check(`${L(tag)}: Escape closes the mobile menu and focus returns to the menu button`, (await expanded(burger)) === "false" && (await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-fides-ds-menu-open"))));
        }
        // Other menus in the mobile menu are native details groups: Enter toggles, Services reachable.
        await burger.focus();
        await page.keyboard.press("Enter");
        const groups = await page.locator("#fides-ds-menu details > summary").allInnerTexts();
        check(`${L(tag)}: mobile menu lists About FIDES and another group`, groups.some((g) => /About FIDES/.test(g)) && groups.length >= 2, groups.join("|"));
        const sums = page.locator("#fides-ds-menu details > summary");
        for (let i = 0; i < (await sums.count()); i += 1) {
          const s = sums.nth(i);
          const was = await s.evaluate((e) => e.parentElement.open);
          await s.focus();
          await page.keyboard.press("Enter");
          const now = await s.evaluate((e) => e.parentElement.open);
          check(`${L(tag)}: Enter toggles mobile group ${i + 1}`, was !== now);
          await page.keyboard.press("Enter");
        }
        const aboutOpen = await page.evaluate(() => { const d = [...document.querySelectorAll("#fides-ds-menu details")].find((x) => /About FIDES/.test(x.querySelector("summary").textContent)); if (d) d.open = true; return !!d; });
        const link = page.locator("#fides-ds-menu details a", { hasText: /^Services$/ });
        await link.focus();
        check(`${L(tag)}: Services link under About FIDES takes keyboard focus and is current`, aboutOpen && (await page.evaluate(() => /^Services$/.test(document.activeElement.textContent.trim()))) && ["page", "true"].includes(await link.getAttribute("aria-current")));
        await page.keyboard.press("Escape");
        check(`${L(tag)}: Escape from a menu link closes the menu and returns focus`, (await expanded(burger)) === "false" && (await page.evaluate(() => document.activeElement.hasAttribute("data-fides-ds-menu-open"))));
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `FAILED: ${failures}` : "All header menu checks passed.");
  process.exit(failures ? 1 : 0);
})();
