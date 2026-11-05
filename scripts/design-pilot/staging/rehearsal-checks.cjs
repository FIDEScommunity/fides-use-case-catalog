/**
 * Browser checks for the design pilot under a route base other than the local one (staging: /design-review/).
 * Run by rehearse-staging.sh against the rehearsal site; also usable on a real staging site that Codex has set up
 * (read-only: only GET requests).
 *
 *   PILOT_URL=https://staging.fides.community PILOT_BASE=design-review PLAYWRIGHT_MODULE=... node rehearsal-checks.cjs
 *
 * Remote images and catalog data are NOT stubbed here: catalogs read GitHub as on staging. Set OFFLINE=1 to abort
 * every remote request (the server-rendered content must still show).
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = (process.env.PILOT_URL || "http://localhost:10089").replace(/\/$/, "");
const SEG = (process.env.PILOT_BASE || "design-review").replace(/^\/|\/$/g, "");
const ROOT = `/${SEG}/`;
const OFFLINE = process.env.OFFLINE === "1";
const LOCAL_PILOT = "fides-design-pilot";
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d && !ok ? ` (${d})` : ""}`); };

// path under the base, a text the page must show, expected template marker
const PAGES = [
  ["", "FIDES design pilot"],
  ["overview/", "Use cases"],
  ["use-case/", ""],
  ["homepage-fragment/", "Accelerating"],
  ["organizations/", "Organizations"],
  ["organization/", ""],
  ["personal-wallets/", "Personal wallets"],
  ["business-wallets/", "Business wallets"],
  ["wallet/", ""],
  ["credentials/", "Credential"],
  ["credential/", ""],
  ["about-fides/", "FIDES"],
  ["manifesto/", "The FIDES Manifesto"],
  ["updates/", "Updates"],
  ["learn/", "Learn"],
  ["learn/topics/", ""],
  ["start/", ""],
  ["learn/sessions/", ""],
  ["learn/sessions/request/", ""],
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const host = new URL(BASE).hostname;
  await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
  if (OFFLINE) await ctx.route((url) => !url.href.startsWith(BASE), (route) => route.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));

  // robots.txt keeps search engines out of the base.
  const robots = await (await ctx.request.get(`${BASE}/robots.txt`)).text();
  check(`robots.txt disallows ${ROOT}`, new RegExp(`Disallow:\\s*${ROOT.replace(/\//g, "\\/")}`).test(robots), robots.slice(0, 200));

  const seen = [];
  for (const [rel, text] of PAGES) {
    const url = `${BASE}${ROOT}${rel}`;
    const res = await page.goto(url, { waitUntil: "domcontentloaded" });
    const status = res ? res.status() : 0;
    check(`${ROOT}${rel}: HTTP 200`, status === 200, String(status));
    if (status !== 200) continue;
    await page.waitForTimeout(400);
    const info = await page.evaluate((LOCAL) => {
      const hrefs = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
      const robotsMeta = (document.querySelector("meta[name=robots]") || {}).content || "";
      const forms = document.querySelectorAll("main form, .fides-ds form").length;
      return {
        h1: ((document.querySelector("h1") || {}).textContent || "").trim(),
        title: document.title,
        robots: robotsMeta,
        badLocal: hrefs.filter((h) => h.includes(LOCAL) || /:10088/.test(h)),
        text: document.body.innerText.slice(0, 20000),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        canonical: (document.querySelector("link[rel=canonical]") || {}).href || "",
        badge: /Design review/.test(document.body.innerText),
        hrefs,
      };
    }, LOCAL_PILOT);
    seen.push({ rel, info });
    check(`${ROOT}${rel}: has a heading`, info.h1.length > 0, info.title);
    if (text) check(`${ROOT}${rel}: shows "${text}"`, info.text.includes(text) || info.h1.includes(text), info.h1);
    check(`${ROOT}${rel}: noindex, nofollow`, /noindex/.test(info.robots) && /nofollow/.test(info.robots), info.robots);
    check(`${ROOT}${rel}: no link to the local pilot route or port`, info.badLocal.length === 0, info.badLocal.slice(0, 3).join(" "));
    check(`${ROOT}${rel}: no horizontal overflow at 1440`, info.overflow <= 0, String(info.overflow));
  }
  check("pilot pages show the Design review badge", seen.every((s) => s.info.badge || s.info.h1 === ""), seen.filter((s) => !s.info.badge).map((s) => s.rel).join());

  // Shell navigation stays inside the base and the footer maps to the pilot pages.
  const home = await page.goto(`${BASE}${ROOT}overview/`, { waitUntil: "domcontentloaded" });
  const nav = await page.evaluate(() => [...document.querySelectorAll(".fides-ds-site-header a, .fides-ds-site-footer a")].map((a) => ({ t: a.textContent.trim(), h: a.getAttribute("href") })));
  const inBase = (t) => nav.filter((n) => n.t === t).map((n) => n.h);
  const pathOf = (h) => { try { return new URL(h, BASE).pathname; } catch (e) { return h; } };
  check("footer Manifesto link goes to the pilot Manifesto page", inBase("Manifesto").some((h) => pathOf(h) === `${ROOT}manifesto/`), JSON.stringify(inBase("Manifesto")));
  check("header About FIDES link goes to the pilot About page", inBase("About FIDES").some((h) => pathOf(h) === `${ROOT}about-fides/`), JSON.stringify(inBase("About FIDES")));
  check("header Updates link goes to the pilot Updates page", inBase("Updates").some((h) => pathOf(h) === `${ROOT}updates/`), JSON.stringify(inBase("Updates")));
  const logo = await page.evaluate(() => { const a = document.querySelector(".fides-ds-site-header__brand"); return a ? a.getAttribute("href") : null; });
  check("logo goes to the pilot homepage fragment", logo && pathOf(logo) === `${ROOT}homepage-fragment/`, String(logo));

  // Detail routes: overview rows and the Manifesto tiles link below the base.
  await page.goto(`${BASE}${ROOT}overview/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".fides-ds-card, .fides-uc-row, [data-fides-ssr]", { timeout: 30000 }).catch(() => {});
  const detailLinks = await page.evaluate((r) => [...document.querySelectorAll("a[href*='?usecase=']")].map((a) => a.getAttribute("href")).slice(0, 5), ROOT);
  check("use case rows link to the pilot detail route", detailLinks.length > 0 && detailLinks.every((h) => pathOf(h).startsWith(`${ROOT}use-case/`)), JSON.stringify(detailLinks.slice(0, 2)));
  await page.goto(`${BASE}${ROOT}manifesto/`, { waitUntil: "domcontentloaded" });
  const man = await page.evaluate(() => ({
    tiles: document.querySelectorAll(".fides-manifesto__tile").length,
    hrefs: [...document.querySelectorAll("a.fides-manifesto__tile-body")].map((a) => a.getAttribute("href")),
    sign: [...document.querySelectorAll(".fides-manifesto__button")].map((a) => a.getAttribute("href")),
    form: document.querySelectorAll(".fides-manifesto form, .fides-manifesto input").length,
    note: document.body.innerText.includes("The existing form"),
  }));
  check("Manifesto lists supporters from the catalog", man.tiles > 0, String(man.tiles));
  check("supporter tiles open organization profiles below the base", man.hrefs.length > 0 && man.hrefs.every((h) => pathOf(h).startsWith(`${ROOT}organization/`)), JSON.stringify(man.hrefs.slice(0, 2)));
  check("Manifesto sign route is the existing form (no copy on the pilot page)", man.sign.length === 2 && man.sign.every((h) => /#ratify-the-fides-manifesto-today$/.test(h)) && man.form === 0, JSON.stringify(man.sign));
  check("Manifesto page has no visitor note about the form", !man.note);

  // Sessions enquiry stays a preview: submitting posts nothing.
  const posts = [];
  page.on("request", (r) => { if (r.method() !== "GET" && r.method() !== "HEAD") posts.push(`${r.method()} ${r.url()}`); });
  const reqRes = await page.goto(`${BASE}${ROOT}learn/sessions/request/`, { waitUntil: "domcontentloaded" });
  if (reqRes && reqRes.status() === 200) {
    const submit = page.locator("form button[type=submit], form input[type=submit]").first();
    if (await submit.count()) { await submit.click().catch(() => {}); await page.waitForTimeout(600); }
  }
  check("the sessions enquiry sends no request (local preview)", posts.length === 0, posts.join(" | "));

  // Mobile overflow for the heaviest pages.
  for (const w of [390, 320]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const rel of ["overview/", "manifesto/", "about-fides/", "learn/"]) {
      await page.goto(`${BASE}${ROOT}${rel}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${ROOT}${rel} at ${w}px: no horizontal overflow`, o <= 0, String(o));
    }
  }
  check("no JavaScript page errors", errors.length === 0, errors.slice(0, 2).join(" | "));

  await browser.close();
  console.log(failures ? `${failures} rehearsal checks failed` : "all rehearsal checks passed");
  process.exit(failures ? 1 : 0);
})();
