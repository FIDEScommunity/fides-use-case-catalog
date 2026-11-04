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


const WHITE = "rgb(255, 255, 255)";
const BLUE = "rgb(8, 72, 163)";
// Everything a relation link paints, for the link and its parts, in the current state.
const snap = (loc) => loc.evaluate((e) => {
  const origin = e.getBoundingClientRect(); const part = (x) => { const c = getComputedStyle(x); const b = x.getBoundingClientRect(); return { color: c.color, deco: c.textDecorationLine, decoColor: c.textDecorationColor, bg: c.backgroundColor, border: [c.borderTopColor, c.borderTopWidth].join(" "), outline: `${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor} ${c.outlineOffset}`, shadow: c.boxShadow, filter: c.filter, opacity: c.opacity, rect: [b.x - origin.x, b.y - origin.y, b.width, b.height].map((n) => Math.round(n * 10) / 10).join(",") }; };
  return { link: part(e), name: part(e.querySelector(".fides-uc-spot__name")), count: part(e.querySelector(".fides-uc-spot__count")), arrow: part(e.querySelector(".fides-uc-spot__arrow")) };
});
const paintsBlue = (s) => Object.values(s).some((p) => [p.color, p.decoColor, p.bg, p.border, p.outline, p.shadow].some((v) => String(v).includes(BLUE)));

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
    const keys = ["organizations", "businessWallets", "personalWallets", "credentials", "issuers", "rps"];
    const links = [
      ...keys.map((k) => [`relation-${k}`, spot.locator(`.fides-uc-spot__relation[data-relation="${k}"]`)]),
      ["read", spot.locator(".fides-uc-spot__text > a")],
    ];
    for (const [name, loc] of links) {
      await loc.scrollIntoViewIfNeeded();
      if (name.startsWith("relation-")) {
        await page.mouse.move(2, 2);
        await page.evaluate(() => document.activeElement && document.activeElement.blur());
        await page.waitForTimeout(250);
        const d = await snap(loc);
        await spot.screenshot({ path: path.join(OUT, `${name}-${w}-default.png`) });
        let h = null;
        for (let i = 0; i < 8; i += 1) {
          await page.mouse.move(2, 2);
          await loc.hover();
          await page.waitForTimeout(250);
          h = await snap(loc);
          if (h.name.deco.startsWith("underline")) break;
        }
        await spot.screenshot({ path: path.join(OUT, `${name}-${w}-hover.png`) });
        await page.mouse.down();
        await page.waitForTimeout(150);
        const a = await snap(loc);
        await page.mouse.move(2, 2);
        await page.mouse.up();
        await page.mouse.move(2, 2);
        await loc.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        await page.waitForTimeout(250);
        const isFocused = await loc.evaluate((e) => e === document.activeElement && e.matches(":focus-visible"));
        const f = await snap(loc);
        await spot.screenshot({ path: path.join(OUT, `${name}-${w}-focus.png`) });
        const allWhite = (x) => x.link.color === WHITE && x.name.color === WHITE && x.count.color === WHITE && x.arrow.color === WHITE;
        const rects = (x) => [x.name.rect, x.count.rect, x.arrow.rect].join("|");
        check(`${tag}: ${name} default: white name, count and arrow, no underline anywhere`, allWhite(d) && Object.values(d).every((p) => p.deco === "none"), JSON.stringify(d));
        check(`${tag}: ${name} hover: everything stays white, only the name is underlined`, allWhite(h) && h.name.deco === "underline" && h.name.decoColor === WHITE && h.link.deco === "none" && h.count.deco === "none" && h.arrow.deco === "none", JSON.stringify(h));
        check(`${tag}: ${name} pressed: still white, no blue`, allWhite(a) && !paintsBlue(a), JSON.stringify(a));
        check(`${tag}: ${name} keyboard focus: only the name is underlined, white focus ring of 3px with offset`, isFocused && allWhite(f) && f.name.deco === "underline" && f.link.deco === "none" && f.count.deco === "none" && f.arrow.deco === "none" && /^solid 3px rgb\(255, 255, 255\) (4|5)px$/.test(f.link.outline), JSON.stringify(f));
        check(`${tag}: ${name} no blue hover colour from the theme in any state (text, underline, background, border, outline, shadow)`, !paintsBlue(d) && !paintsBlue(h) && !paintsBlue(a) && !paintsBlue(f) && h.link.bg === "rgba(0, 0, 0, 0)" && h.link.opacity === "1", JSON.stringify([h.link.bg, h.link.opacity]));
        check(`${tag}: ${name} name, count and arrow stay in place on hover and focus (positions relative to the link)`, rects(d) === rects(h) && rects(d) === rects(f) && rects(d) === rects(a), JSON.stringify([rects(d), rects(h), rects(f)]));
        continue;
      }
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
      check(`${tag}: ${name} has an arrow, no underline by default, underline on hover and focus`, d.arrow && d.deco === "none" && h.deco === "underline" && f.deco === "underline", JSON.stringify([d.arrow, d.deco, h.deco, f.deco]));
    }
    // Compact row: no name lists, no View all.
    check(`${tag}: the relation row has no name lists or View all links`, (await spot.locator(".fides-uc-spot__names, .fides-uc-spot__all").count()) === 0);

    // Digital trust in practice: hover and focus of a theme row.
    const row = page.locator(".fides-uc-index__link").first();
    await row.scrollIntoViewIfNeeded();
    const idx = page.locator(".fides-uc-index");
    await page.waitForTimeout(3300);
    const geo = () => row.evaluate((e) => { const r = (x) => { const b = x.getBoundingClientRect(); return [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.width * 10) / 10, Math.round(b.height * 10) / 10].join(","); }; const ic = e.querySelector(".fides-uc-index__icon"); const cs = getComputedStyle(ic); return { row: r(e), icon: r(ic), name: r(e.querySelector(".fides-uc-index__name")), count: r(e.querySelector(".fides-uc-index__count")), arrow: r(e.querySelector(".fides-uc-index__arrow")), iconBg: cs.backgroundColor, iconShadow: cs.boxShadow, iconBorder: cs.borderTopWidth, nameDeco: getComputedStyle(e.querySelector(".fides-uc-index__name")).textDecorationLine }; });
    await page.mouse.move(2, 2);
    const rd = await read(row);
    const gd = await geo();
    let rh = null;
    for (let i = 0; i < 8; i += 1) {
      await page.mouse.move(2, 2);
      await row.hover();
      await page.waitForTimeout(300);
      rh = await read(row);
      if (rh.bg !== "rgba(0, 0, 0, 0)") break;
    }
    const gh = await geo();
    await idx.screenshot({ path: path.join(OUT, `themes-${w}-hover.png`) });
    await page.mouse.move(2, 2);
    await row.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);
    const rf = await read(row);
    const gf = await geo();
    await idx.screenshot({ path: path.join(OUT, `themes-${w}-focus.png`) });
    check(`${tag}: theme row default is dark text without tint`, rd.bg === "rgba(0, 0, 0, 0)" && rd.color === "rgb(14, 14, 14)" && gd.nameDeco === "none", JSON.stringify([rd, gd.nameDeco]));
    check(`${tag}: theme row hover is light blue with blue text and an underlined name`, rh.bg === "rgb(227, 237, 251)" && rh.color === "rgb(8, 72, 163)" && gh.nameDeco === "underline", JSON.stringify([rh.bg, rh.color, gh.nameDeco]));
    check(`${tag}: the icon keeps its own tile on hover: unchanged, no white tile and no frame, distinct from the row`, gh.iconBg === gd.iconBg && gh.iconBg === "rgb(242, 247, 255)" && gh.iconBg !== rh.bg && gh.iconShadow === "none" && gh.iconBorder === "0px", JSON.stringify([gd.iconBg, gh.iconBg, gh.iconShadow, gh.iconBorder, rh.bg]));
    check(`${tag}: icon, name, count and arrow stay in place on hover and focus`, gd.icon === gh.icon && gd.name === gh.name && gd.count === gh.count && gd.arrow === gh.arrow && gd.row === gh.row && gd.icon === gf.icon && gd.arrow === gf.arrow && gd.name === gf.name, JSON.stringify([gd, gh, gf]));
    check(`${tag}: theme row focus: ring of at least 3px, underlined name, same tile`, rf.outS === "solid" && rf.outW >= 3 && gf.nameDeco === "underline" && gf.iconBg === gd.iconBg, JSON.stringify([rf, gf.nameDeco, gf.iconBg]));
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `\n${failures} failed` : "\nall spotlight state checks passed");
  process.exit(failures ? 1 : 0);
})();
