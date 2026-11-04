/**
 * Spotlight link states on the blue band with the active theme styles:
 * default, hover and keyboard focus of the names, both "View all" links,
 * "Read the use case" and the head link; hover and focus of the theme index.
 * Writes screenshots to screens/spotlight-states/.
 * Run: node spotlight-states.cjs (PLAYWRIGHT_MODULE, PILOT_URL, WIDTHS).
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const HOME = `${BASE}/fides-design-pilot/homepage-fragment/`;
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const OUT = path.join(__dirname, "..", "screens", "spotlight-states");
fs.mkdirSync(OUT, { recursive: true });
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d && !ok ? ` (${d})` : ""}`); };

const read = (loc) => loc.evaluate((e) => {
  const c = getComputedStyle(e);
  const kids = [...e.querySelectorAll("*")].map((k) => getComputedStyle(k).color);
  return { color: c.color, deco: c.textDecorationLine, thick: parseFloat(c.textDecorationThickness) || 0, kids, outW: parseFloat(c.outlineWidth), outS: c.outlineStyle, outC: c.outlineColor, outO: parseFloat(c.outlineOffset), bg: c.backgroundColor, arrow: !!e.querySelector(".fides-uc-spot__arrow"), mt: parseFloat(c.marginTop) };
});

(async () => {
  const browser = await chromium.launch();
  for (const w of WIDTHS) {
    const tag = `${w}px`;
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addCookies([{ name: "cmplz_banner-status", value: "dismissed", url: BASE }]);
    await ctx.route((url) => !url.href.startsWith(BASE), (route) => (route.request().resourceType() === "image" ? route.continue() : route.abort()));
    const page = await ctx.newPage();
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator(".fides-uc-spot").waitFor({ timeout: 30000 });
    const spot = page.locator(".fides-uc-spot");
    const links = [
      ["name-org", spot.locator(".fides-uc-spot__group").nth(0).locator(".fides-uc-spot__names a").first(), false],
      ["name-wallet", spot.locator(".fides-uc-spot__group").nth(1).locator(".fides-uc-spot__names a").first(), false],
      ["viewall-orgs", spot.locator(".fides-uc-spot__all").nth(0), true],
      ["viewall-wallets", spot.locator(".fides-uc-spot__all").nth(1), true],
      ["read", spot.locator(".fides-uc-spot__text > a"), true],
      ["head", spot.locator(".fides-uc-spot__link--head"), true],
    ];
    for (const [name, loc, arrowLink] of links) {
      await loc.scrollIntoViewIfNeeded();
      await page.mouse.move(2, 2);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.waitForTimeout(200);
      const d = await read(loc);
      await spot.screenshot({ path: path.join(OUT, `${name}-${w}-default.png`) });
      let h = null;
      for (let i = 0; i < 8; i += 1) {
        await page.mouse.move(2, 2);
        await loc.hover();
        await page.waitForTimeout(250);
        h = await read(loc);
        if (h.deco === "underline") break;
      }
      await spot.screenshot({ path: path.join(OUT, `${name}-${w}-hover.png`) });
      await page.mouse.move(2, 2);
      await loc.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await page.waitForTimeout(250);
      const isFocused = await loc.evaluate((e) => e === document.activeElement);
      const f = await read(loc);
      await spot.screenshot({ path: path.join(OUT, `${name}-${w}-focus.png`) });
      const white = (x) => x.color === "rgb(255, 255, 255)" && x.kids.every((k) => k === "rgb(255, 255, 255)");
      check(`${tag}: ${name} default: white text and arrow`, white(d), JSON.stringify(d));
      check(`${tag}: ${name} hover: text and arrow stay white and the link is underlined`, white(h) && h.deco === "underline" && h.thick >= 1, JSON.stringify(h));
      check(`${tag}: ${name} focus: reached by keyboard, white text, clear ring (>= 3px, offset >= 3px)`, isFocused && white(f) && f.outS === "solid" && f.outW >= 3 && f.outC === "rgb(255, 255, 255)" && f.outO >= 3, JSON.stringify(f));
      if (arrowLink) {
        check(`${tag}: ${name} has an arrow and is underlined on hover and focus`, d.arrow && h.deco === "underline" && f.deco === "underline", JSON.stringify([d.arrow, d.deco, h.deco, f.deco]));
      } else {
        check(`${tag}: ${name} stays underlined in every state`, d.deco === "underline" && h.deco === "underline" && f.deco === "underline");
      }
    }
    // "View all" reads as a separate follow-up step: space above and below the names, arrow after the text.
    const gap = await spot.locator(".fides-uc-spot__group").nth(0).evaluate((g) => { const last = g.querySelector(".fides-uc-spot__names li:last-child a").getBoundingClientRect(); const all = g.querySelector(".fides-uc-spot__all"); const r = all.getBoundingClientRect(); const names = g.querySelectorAll(".fides-uc-spot__names a"); return { gap: Math.round(r.top - last.bottom), margin: parseFloat(getComputedStyle(all).marginTop), arrowAfter: all.querySelector(".fides-uc-spot__arrow").getBoundingClientRect().left >= all.firstChild.parentElement.getBoundingClientRect().left, namesDeco: getComputedStyle(names[0]).textDecorationLine, allDeco: getComputedStyle(all).textDecorationLine }; });
    check(`${tag}: View all has space above it and shows no underline until hover or focus`, gap.margin >= 8 && gap.gap >= 8 && gap.allDeco === "none" && gap.namesDeco === "underline", JSON.stringify(gap));

    // Digital trust in practice: hover and focus of a theme row.
    const row = page.locator(".fides-uc-index__link").first();
    await row.scrollIntoViewIfNeeded();
    const idx = page.locator(".fides-uc-index");
    await page.waitForTimeout(3300);
    await page.mouse.move(2, 2);
    const rd = await read(row);
    let rh = null;
    for (let i = 0; i < 8; i += 1) {
      await page.mouse.move(2, 2);
      await row.hover();
      await page.waitForTimeout(250);
      rh = await read(row);
      if (rh.bg === "rgb(242, 247, 255)") break;
    }
    await idx.screenshot({ path: path.join(OUT, `themes-${w}-hover.png`) });
    await page.mouse.move(2, 2);
    await row.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(250);
    const rf = await read(row);
    await idx.screenshot({ path: path.join(OUT, `themes-${w}-focus.png`) });
    check(`${tag}: theme row hover: soft blue tint with blue text and arrow, all readable`, rh.bg === "rgb(242, 247, 255)" && rh.color === "rgb(8, 72, 163)" && rh.kids.every((k) => k === "rgb(8, 72, 163)" || k === "rgb(74, 74, 74)"), JSON.stringify(rh));
    check(`${tag}: theme row default is dark text without tint`, rd.bg === "rgba(0, 0, 0, 0)" && rd.color === "rgb(14, 14, 14)", JSON.stringify(rd));
    check(`${tag}: theme row focus: ring of at least 3px`, rf.outS === "solid" && rf.outW >= 3, JSON.stringify(rf));
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `\n${failures} failed` : "\nall spotlight state checks passed");
  process.exit(failures ? 1 : 0);
})();
