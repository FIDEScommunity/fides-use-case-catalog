/**
 * Keyboard focus ring on Learn source links with long, multi-line titles (EN and NL, 1440 and 390).
 * Real Tab / Shift+Tab (:focus-visible). Measures computed outline, link box vs. clipping ancestors,
 * viewport edges, the next source and contrast against the page background; stores a clipped screenshot
 * per case in tests/output/learn-sources-focus (git-ignored).
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/learn-sources-focus-checks.cjs   (env: PILOT_URL, WIDTHS)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const T = "learn/topics/the-big-picture";
const ARTICLES = { credential: `${T}/what-is-a-credential/`, trust: `${T}/trust-and-interoperability/` };
const LOCALES = { EN: "/fides-design-pilot/", NL: "/nl/fides-design-pilot/" };
const OUT = path.join(__dirname, "output", "learn-sources-focus");
fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

function measure() {
  const a = document.activeElement;
  const cs = getComputedStyle(a);
  const rects = [...a.getClientRects()].map((r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom }));
  const off = parseFloat(cs.outlineOffset);
  const w = parseFloat(cs.outlineWidth);
  const grow = off + w;
  const ring = rects.map((r) => ({ l: r.l - grow, t: r.t - grow, r: r.r + grow, b: r.b + grow }));
  const clippers = [];
  for (let p = a.parentElement; p && p !== document.documentElement; p = p.parentElement) {
    const s = getComputedStyle(p);
    if (/hidden|clip|auto|scroll/.test(s.overflowX + s.overflowY) || s.clipPath !== "none" || s.contain.includes("paint")) {
      const b = p.getBoundingClientRect();
      const bad = ring.some((q) => q.l < b.left - 0.5 || q.r > b.right + 0.5 || q.t < b.top - 0.5 || q.b > b.bottom + 0.5);
      clippers.push({ el: p.className || p.tagName, bad });
    }
  }
  const li = a.closest("li");
  // The ring may reach into the next link's own padding (transparent), but never onto its text: compare with the next text top.
  const nextA = li && li.nextElementSibling ? li.nextElementSibling.querySelector("a") : null;
  const next = nextA ? { top: nextA.getBoundingClientRect().top + parseFloat(getComputedStyle(nextA).paddingTop) } : null;
  const last = ring[ring.length - 1];
  const lineH = parseFloat(cs.lineHeight);
  const bg = (() => {
    for (let p = a; p; p = p.parentElement) {
      const c = getComputedStyle(p).backgroundColor;
      if (c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
    }
    return "rgb(255, 255, 255)";
  })();
  return {
    style: cs.outlineStyle, width: w, offset: off, color: cs.outlineColor, bg, display: cs.display, boxDecorationBreak: cs.boxDecorationBreak,
    fragments: rects.length, lines: Math.round(a.getBoundingClientRect().height / lineH),
    minLeft: Math.min(...ring.map((q) => q.l)), maxRight: Math.max(...ring.map((q) => q.r)), vw: document.documentElement.clientWidth,
    clippers, overlapsNext: next ? last.b > next.top + 0.5 && last.b - next.top > 0 && next.top < last.b : false,
    gapToNext: next ? next.top - last.b : null,
  };
}

function lum([r, g, b]) {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);

async function focusSource(page, back) {
  // Forward through the page with Tab until a source link has focus.
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => !!document.activeElement.closest(".fides-learn-sources"))) break;
  }
  if (back) {
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  for (const [loc, prefix] of Object.entries(LOCALES)) {
    for (const [key, rel] of Object.entries(ARTICLES)) {
      for (const width of WIDTHS) {
        const tag = `${loc} ${key} @${width}`;
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await context.newPage();
        await page.route("**/*", (route) => {
          const u = new URL(route.request().url());
          return /^https?:$/.test(u.protocol) && u.host !== new URL(BASE).host ? route.abort() : route.continue();
        });
        await page.goto(`${BASE}${prefix}${rel}`, { waitUntil: "domcontentloaded" });
        const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
        if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
        await page.mouse.move(0, 0);
        const count = await page.locator(".fides-learn-sources a").count();
        // Tab forward through every source, then Shift+Tab back through all of them.
        const seq = [];
        await page.evaluate(() => window.scrollTo(0, 0));
        await focusSource(page);
        for (let i = 0; i < count; i++) {
          seq.push(["Tab", i]);
        }
        const steps = [];
        for (const [mode, i] of seq) steps.push([mode, i]);
        for (let i = count - 1; i >= 0; i--) steps.push(["Shift+Tab", i]);
        let left = false;
        for (const [mode, step] of steps) {
          if (mode === "Tab" && step > 0) await page.keyboard.press("Tab");
          if (mode === "Shift+Tab") {
            // Leave the list forward once, then walk back with Shift+Tab so every source is reached backwards.
            if (!left) left = true, await page.keyboard.press("Tab");
            await page.keyboard.press("Shift+Tab");
          }
          const idx = await page.evaluate(() => [...document.querySelectorAll(".fides-learn-sources a")].indexOf(document.activeElement));
          const m = await page.evaluate(measure);
          const c = `${tag} (${mode}, source ${idx + 1}/${count}, ${m.lines} line(s), ${m.fragments} fragment(s))`;
          check(`${c}: source link has focus`, idx >= 0);
          check(`${c}: outline 2px solid, offset 2px, brand colour`, m.style === "solid" && m.width === 2 && m.offset === 2 && m.color !== "rgba(0, 0, 0, 0)", JSON.stringify(m));
          check(`${c}: outline not clipped by an ancestor`, m.clippers.every((x) => !x.bad), JSON.stringify(m.clippers));
          check(`${c}: outline inside the viewport (${m.minLeft.toFixed(1)}..${m.maxRight.toFixed(1)} of ${m.vw})`, m.minLeft >= 0 && m.maxRight <= m.vw);
          check(`${c}: outline does not overlap the next source (gap ${m.gapToNext === null ? "n/a" : m.gapToNext.toFixed(1)}px)`, !m.overlapsNext);
          const L1 = lum(rgb(m.color));
          const L2 = lum(rgb(m.bg));
          const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          check(`${c}: outline contrast ${ratio.toFixed(2)}:1 >= 3:1`, ratio >= 3);
          const box = await page.locator(".fides-learn-sources a:focus").boundingBox();
          const pad = 8;
          const sy = await page.evaluate(() => window.scrollY);
          await page.screenshot({
            fullPage: true,
            path: path.join(OUT, `${loc}-${key}-${width}-${mode.replace("+", "")}-${idx + 1}.png`),
            clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y + sy - pad), width: Math.min(width, box.width + 2 * pad), height: box.height + 2 * pad },
          });
        }
        await context.close();
      }
    }
  }
  await browser.close();
  console.log(failures ? `\n${failures} focus check(s) failed.` : "\nAll focus checks passed.");
  process.exit(failures ? 1 : 0);
})();
