/**
 * About FIDES (Paper 27.1): content, order, links from menu and footer, CTA
 * destinations, hover and keyboard focus, overflow. Remote hosts are stubbed.
 * Run: node about-checks.cjs (PLAYWRIGHT_MODULE, PILOT_URL, WIDTHS).
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const ABOUT = `${BASE}/fides-design-pilot/about-fides/`;
const WIDTHS = (process.env.WIDTHS || "1440,390,320").split(",").map(Number);
const SHOTS = path.join(__dirname, "..", "screens");
fs.mkdirSync(SHOTS, { recursive: true });
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d && !ok ? ` (${d})` : ""}`); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

(async () => {
  const browser = await chromium.launch();
  for (const w of WIDTHS) {
    const tag = `${w}px`;
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
    await ctx.route((url) => !url.href.startsWith(BASE), (route) => route.request().resourceType() === "document" ? route.fulfill({ status: 200, contentType: "text/html", body: "<title>External page</title><p>external</p>" }) : route.request().resourceType() === "image" ? route.fulfill({ status: 200, contentType: "image/gif", body: GIF }) : route.abort());
    const page = await ctx.newPage();
    await page.goto(ABOUT, { waitUntil: "domcontentloaded" });
    await page.locator(".fides-about__title").waitFor({ timeout: 30000 });

    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);

    // Text from Paper 27.1.
    const t = await page.evaluate(() => {
      const q = (s) => (document.querySelector(s) || {}).textContent?.trim();
      return { h1s: document.querySelectorAll("h1").length, h1: q("h1"), intro: q(".fides-about__intro"), labsKicker: q(".fides-about__labs .fides-about__kicker"), labsTitle: q(".fides-about__labs-title"), labsText: q(".fides-about__labs .fides-about__text"), h2s: [...document.querySelectorAll(".fides-about h2")].map((h) => h.textContent.trim()), items: [...document.querySelectorAll(".fides-about__item-title")].map((h) => h.textContent.trim()) };
    });
    check(`${tag}: one H1 with the Paper heading and intro`, t.h1s === 1 && t.h1 === "An independent platform for wallets and verifiable credentials" && t.intro === "We help organizations understand the technology, find suitable solutions, and prepare for implementation.", JSON.stringify(t));
    check(`${tag}: FIDES Labs BV block names who builds and runs the platform`, t.labsKicker === "Who runs FIDES" && t.labsTitle === "Built and operated by FIDES Labs" && t.labsText.startsWith("FIDES Labs BV is an independent Dutch company."), JSON.stringify(t));
    check(`${tag}: section headings and item titles`, JSON.stringify(t.h2s) === JSON.stringify(["Built and operated by FIDES Labs", "Explore the platform", "How FIDES Labs can help"]) && JSON.stringify(t.items) === JSON.stringify(["Learn", "Explorer", "Workshops", "Assessments and advice", "Project coordination", "Independent by design", "Take part"]), JSON.stringify(t));
    check(`${tag}: partner role is stated once, under Project coordination, with no closing repeat`, (await page.locator(".fides-about__band").innerText()).match(/specialist partners/gi).length === 1 && (await page.locator(".fides-about__note").count()) === 0);
    {
      const h = await page.evaluate(() => { const e = document.querySelector(".fides-about__title"); const i = document.querySelector(".fides-about__intro"); const lh = parseFloat(getComputedStyle(e).lineHeight); return { lines: Math.round(e.getBoundingClientRect().height / lh), first: e.textContent.trim().split(" ")[0], introTop: Math.round(i.getBoundingClientRect().top), size: getComputedStyle(e).fontSize }; });
      if (w <= 390) check(`${tag}: title is compact (at most four lines) and the intro starts above the fold`, h.lines <= 4 && h.introTop < 450, JSON.stringify(h));
    }

    // Order and stacking.
    const g = await page.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), b: Math.round(b.bottom + scrollY) }; };
      const cols = (sel) => [...document.querySelectorAll(sel)].map((e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width) }; });
      return { pos: r(".fides-about__positioning"), labs: r(".fides-about__labs"), platform: cols(".fides-about__platform .fides-about__item"), band: cols(".fides-about__band .fides-about__item"), closing: cols(".fides-about__closing .fides-about__item"), bandBg: getComputedStyle(document.querySelector(".fides-about__band")).backgroundColor, sections: [...document.querySelectorAll(".fides-about > section")].map((s) => Math.round(s.getBoundingClientRect().top + scrollY)) };
    });
    check(`${tag}: positioning comes before the FIDES Labs block`, w >= 1024 ? g.pos.x < g.labs.x && Math.abs(g.pos.y - g.labs.y) < 120 : g.labs.y >= g.pos.b - 1, JSON.stringify([g.pos, g.labs]));
    const stacked = (cols) => cols.every((c, i) => i === 0 || c.y > cols[i - 1].y);
    const sideBySide = (cols) => cols.every((c) => c.y === cols[0].y);
    check(`${tag}: columns ${w >= 768 ? "sit side by side" : "stack in reading order"}`, w >= 768 ? sideBySide(g.platform) && sideBySide(g.band) && sideBySide(g.closing) : stacked(g.platform) && stacked(g.band) && stacked(g.closing), JSON.stringify(g));
    check(`${tag}: blue band is the brand blue and sections follow Paper order`, g.bandBg === "rgb(8, 72, 163)" && g.sections.every((y, i) => i === 0 || y > g.sections[i - 1]), g.bandBg);

    // Links: label, destination, size.
    const links = await page.evaluate(() => [...document.querySelectorAll(".fides-about__link")].map((a) => { const b = a.getBoundingClientRect(); return { t: a.textContent.trim(), href: a.getAttribute("href"), h: Math.round(b.height), right: Math.round(b.right), band: !!a.closest(".fides-about__band"), td: getComputedStyle(a).textDecorationLine, color: getComputedStyle(a).color }; }));
    const want = [
      ["Browse topics and guides→", /\/fides-design-pilot\/learn\/topics\/$/],
      ["Explore use cases→", /\/fides-design-pilot\/overview\/$/],
      ["Explore sessions and workshops→", /\/fides-design-pilot\/learn\/sessions\/$/],
      ["Discuss your project→", /\/about-fides\/contact\/$/],
      ["Read the FIDES Manifesto→", /\/manifesto\/$/],
      ["Submit a use case→", /\/use-case-form\/$/],
      ["Manage your organization's listing→", /\/organizations-update\/$/],
      ["Explore FIDES Plans→", /\/plans\/$/],
    ];
    check(`${tag}: eight CTAs with the Paper labels and expected destinations`, links.length === 8 && want.every(([label, re], i) => links[i].t === label && re.test(links[i].href)), JSON.stringify(links));
    check(`${tag}: no underline by default, white on blue and blue on white`, links.every((l) => l.td === "none" && l.color === (l.band ? "rgb(255, 255, 255)" : "rgb(8, 72, 163)")), JSON.stringify(links));
    check(`${tag}: CTAs are at least 44px tall and inside the screen`, links.every((l) => l.h >= 44 && l.right <= w), JSON.stringify(links));
    for (const l of links) {
      if (l.href.startsWith(BASE)) {
        const status = await page.evaluate(async (u) => (await fetch(u, { credentials: "same-origin" })).status, l.href);
        check(`${tag}: CTA "${l.t}" resolves on the pilot`, status === 200, `${status} ${l.href}`);
      } else {
        check(`${tag}: CTA "${l.t}" points at the live site (no pilot page exists)`, l.href.startsWith("https://fides.community/"), l.href);
      }
    }

    // Hover and keyboard focus on every CTA.
    for (let i = 0; i < links.length; i += 1) {
      const a = page.locator(".fides-about__link").nth(i);
      await a.scrollIntoViewIfNeeded();
      let hov = null;
      for (let n = 0; n < 8; n += 1) {
        await page.mouse.move(2, 2);
        await a.hover();
        hov = await a.evaluate((e) => ({ td: getComputedStyle(e).textDecorationLine, color: getComputedStyle(e).color, child: [...e.children].map((c) => getComputedStyle(c).color) }));
        if (hov.td.includes("underline")) break;
        await page.waitForTimeout(150);
      }
      const expect = links[i].band ? "rgb(255, 255, 255)" : "rgb(8, 72, 163)";
      check(`${tag}: hover "${links[i].t}" underlines and keeps the colour`, hov.td.includes("underline") && hov.color === expect && hov.child.every((c) => c === expect), JSON.stringify(hov));
    }
    await page.mouse.move(2, 2);
    // Tab through the page from the top: every CTA is reachable, in DOM order, with a visible ring.
    await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); });
    const seen = [];
    for (let n = 0; n < 60 && seen.length < 8; n += 1) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(700); // smooth scrolling settles
      const f = await page.evaluate(() => { const e = document.activeElement; if (!e || !e.classList.contains("fides-about__link")) return null; const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); return { t: e.textContent.trim(), ow: cs.outlineWidth, os: cs.outlineStyle, oc: cs.outlineColor, oo: cs.outlineOffset, band: !!e.closest(".fides-about__band"), inView: b.top >= 0 && b.bottom <= innerHeight && e.contains(document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)) }; });
      if (f) { seen.push(f); if (seen.length === 3) { await page.screenshot({ path: path.join(SHOTS, `about-focus-${w}.png`) }); } }
    }
    check(`${tag}: keyboard reaches all eight CTAs in order, each scrolled into view`, seen.length === 8 && seen.map((s) => s.t).join("|") === links.map((l) => l.t).join("|") && seen.every((s) => s.inView), JSON.stringify(seen));
    check(`${tag}: focus ring is 3px, white on blue and blue on white`, seen.length === 8 && seen.every((s) => s.os === "solid" && s.ow === "3px" && s.oc === (s.band ? "rgb(255, 255, 255)" : "rgb(8, 72, 163)")), JSON.stringify(seen));

    // Menu and footer: About FIDES points here and is marked as current; Manifesto/Contact stay.
    if (w < 1024) {
      const burger = page.locator(".fides-ds-menu-toggle, [data-fides-ds-menu-toggle], button[aria-controls*='menu']").first();
      if (await burger.count()) { await burger.click().catch(() => {}); }
    }
    const nav = await page.evaluate(() => [...document.querySelectorAll(".fides-ds-site-nav__link, .fides-ds-menu__link, .fides-ds-site-footer__link")].filter((a) => a.textContent.trim() === "About FIDES").map((a) => ({ cls: a.className, href: a.getAttribute("href"), cur: a.getAttribute("aria-current") })));
    const here = new URL(ABOUT).pathname;
    check(`${tag}: header, mobile menu and footer About links point at the pilot page`, nav.length === 3 && nav.every((n) => new URL(n.href, BASE).pathname === here && n.cur === "page"), JSON.stringify(nav));

    // Navigate from another pilot page through the footer and the header menu (desktop) to this page.
    await page.goto(`${BASE}/fides-design-pilot/updates/`, { waitUntil: "domcontentloaded" });
    await page.locator(".fides-ds-site-footer__link", { hasText: "About FIDES" }).first().click();
    await page.waitForURL("**/about-fides/**");
    check(`${tag}: footer About FIDES opens the page`, new URL(page.url()).pathname === here && (await page.locator("h1").first().textContent()).includes("independent platform"));
    if (w >= 1024) {
      await page.goto(`${BASE}/fides-design-pilot/updates/`, { waitUntil: "domcontentloaded" });
      await page.locator(".fides-ds-site-nav__link", { hasText: "About FIDES" }).first().click();
      await page.waitForURL("**/about-fides/**");
      check(`${tag}: header About FIDES opens the page`, new URL(page.url()).pathname === here);
    } else {
      await page.goto(`${BASE}/fides-design-pilot/updates/`, { waitUntil: "domcontentloaded" });
      const href = await page.evaluate(() => [...document.querySelectorAll(".fides-ds-menu__link")].find((a) => a.textContent.trim() === "About FIDES")?.getAttribute("href"));
      check(`${tag}: mobile menu About FIDES targets the page`, href && new URL(href, BASE).pathname === here, String(href));
    }

    // Screenshots.
    await page.goto(ABOUT, { waitUntil: "load" });
    await page.mouse.move(2, 2);
    await page.screenshot({ path: path.join(SHOTS, `about-${w}.png`), fullPage: true });
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `${failures} about checks failed` : "all about checks passed");
  process.exit(failures ? 1 : 0);
})();
