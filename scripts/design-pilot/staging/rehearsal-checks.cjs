/**
 * Browser checks for the design pilot under a route base other than the local one (staging: /design-review/).
 * PILOT_LAYOUT=standalone (default here): the site is its own WordPress install and home_url() ends in /design-review;
 * the pilot pages are at the site root (/design-review/overview/). PILOT_LAYOUT=subpath: pages below another site's root.
 * Run by rehearse-staging.sh against the rehearsal site; also usable on a real staging site that Codex has set up
 * (read-only: only GET requests).
 *
 *   PILOT_URL=https://staging.fides.community PILOT_BASE=design-review PLAYWRIGHT_MODULE=... node rehearsal-checks.cjs
 *
 * Remote images and catalog data are NOT stubbed here: catalogs read GitHub as on staging. Set OFFLINE=1 to abort
 * every remote request (the server-rendered content must still show).
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
if (!process.env.PILOT_URL) {
  console.error("Set PILOT_URL to the site origin to check (no default: the package carries no fixed addresses).");
  process.exit(2);
}
const BASE = process.env.PILOT_URL.replace(/\/$/, "");
const SEG = (process.env.PILOT_BASE || "design-review").replace(/^\/|\/$/g, "");
const ROOT = `/${SEG}/`;
const STANDALONE = (process.env.PILOT_LAYOUT || "standalone") === "standalone";
const OFFLINE = process.env.OFFLINE === "1";
const LOCAL_PILOT = "fides-design-pilot";
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d && !ok ? ` (${d})` : ""}`); };

// path under the base, a text the page must show, expected template marker
const PAGES = [
  ...(STANDALONE ? [["", "Accelerating"], ["pilot-pages/", "FIDES design pilot"]] : [["", "FIDES design pilot"]]),
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
  ...(STANDALONE ? [["use-case-form/", ""], ["organizations-submit/", ""], ["organizations-update/", ""], ["wallet-submit/", ""], ["credential-submit/", ""], ["wallets-update/", ""], ["credentials-update/", ""], ["glossary/", ""]] : []),
];
const FORM_PAGES = ["use-case-form/", "organizations-submit/", "organizations-update/", "wallet-submit/", "credential-submit/", "wallets-update/", "credentials-update/"];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const host = new URL(BASE).hostname;
  await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
  if (OFFLINE) await ctx.route((url) => !url.href.startsWith(BASE), (route) => route.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  const writes = [];
  page.on("request", (r) => { if (r.method() !== "GET" && r.method() !== "HEAD") writes.push(`${r.method()} ${r.url()}`); });

  // robots.txt keeps search engines out of the base.
  // WordPress does not serve robots.txt for a site below a path (the file belongs to the domain root), so a standalone
  // site relies on the noindex meta tag and the X-Robots-Tag header checked per page below.
  if (!STANDALONE) {
    const robots = await (await ctx.request.get(`${BASE}/robots.txt`)).text();
    check(`robots.txt disallows ${ROOT}`, new RegExp(`Disallow:\\s*${ROOT.replace(/\//g, "\\/")}`).test(robots), robots.slice(0, 200));
  }

  const seen = [];
  for (const [rel, text] of PAGES) {
    const url = `${BASE}${ROOT}${rel}`;
    const res = await page.goto(url, { waitUntil: "domcontentloaded" });
    const status = res ? res.status() : 0;
    check(`${ROOT}${rel}: HTTP 200`, status === 200, String(status));
    if (STANDALONE && res) check(`${ROOT}${rel}: X-Robots-Tag noindex header`, /noindex/.test(res.headers()["x-robots-tag"] || ""), String(res.headers()["x-robots-tag"]));
    if (status !== 200) continue;
    // Catalog pages render after their data arrives (GitHub on a non-local host), so wait for the heading.
    await page.waitForSelector("h1", { timeout: 20000 }).catch(() => {});
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
    // Form pages show a sign-in notice (no heading) until the visitor is signed in; they are checked signed in below.
    if (!(STANDALONE && FORM_PAGES.includes(rel))) check(`${ROOT}${rel}: has a heading`, info.h1.length > 0 || rel === "glossary/", info.title);
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
  check(STANDALONE ? "logo goes to the homepage of the site" : "logo goes to the pilot homepage fragment", logo && pathOf(logo) === (STANDALONE ? ROOT : `${ROOT}homepage-fragment/`), String(logo));

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
  // Link audit: every internal link stays below the base, none repeats it, and each one answers.
  const internal = new Map();
  const offenders = [];
  for (const s of seen) {
    for (const h of s.info.hrefs) {
      if (!h || h.startsWith("#") || /^(mailto|tel|javascript):/i.test(h)) continue;
      let u; try { u = new URL(h, `${BASE}${ROOT}${s.rel}`); } catch (e) { continue; }
      if (u.origin !== BASE) continue;
      const inside = u.pathname === ROOT.slice(0, -1) || u.pathname.startsWith(ROOT);
      if (!inside || /\/design-review\/design-review/.test(u.pathname)) offenders.push(`${ROOT}${s.rel} -> ${h}`);
      internal.set(u.pathname + u.search, `${ROOT}${s.rel}`);
    }
  }
  check(`internal links of ${seen.length} pages all stay below ${ROOT} without a doubled path (${internal.size} distinct)`, offenders.length === 0, offenders.slice(0, 5).join(" | "));
  const dead = [];
  for (const [p, from] of internal) {
    const r = await ctx.request.get(`${BASE}${p}`, { maxRedirects: 5 }).catch(() => null);
    if (!r || r.status() !== 200) dead.push(`${p} (${r ? r.status() : "no answer"}) from ${from}`);
  }
  check(`every internal link answers 200 (${internal.size} requests)`, dead.length === 0, dead.slice(0, 6).join(" | "));

  // No address outside the base in the HTML or its inline configuration (root-relative paths, absolute URLs on this origin).
  const strayIn = (html0) => {
    const html = html0.replace(/\\\//g, "/");
    const outside = (p) => !p.startsWith(ROOT) && p !== ROOT.slice(0, -1);
    const rootRel = [...html.matchAll(/(?:href|src|action)=["']\/(?!\/)([^"']*)/g)].map((m) => `/${m[1]}`).filter(outside);
    const origin = [...html.matchAll(new RegExp(`${BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\/[^"'\\s<>)\\\\]*)?`, "g"))].map((m) => m[1] || "/").filter(outside);
    const doubled = /design-review\/design-review/.test(html) || /fides-design-pilot/.test(html) || /:10088/.test(html);
    return { list: [...rootRel, ...origin], doubled };
  };
  const strays = [];
  for (const [rel] of PAGES) {
    const r = strayIn(await (await ctx.request.get(`${BASE}${ROOT}${rel}`)).text());
    if (r.list.length || r.doubled) strays.push(`${rel || "/"}: ${r.list.slice(0, 2).join(",")}${r.doubled ? " doubled/local" : ""}`);
  }
  check("no root-relative or absolute address outside the base in any page's HTML", strays.length === 0, strays.slice(0, 5).join(" | "));

  // Forms are login-gated plugin forms on this site. A reviewer account (made by the rehearsal, never printed) signs in on
  // this site and every form page must then show its fields. Nothing is submitted.
  if (STANDALONE && process.env.REHEARSAL_USER) {
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p2 = await ctx2.newPage();
    const w2 = [];
    p2.on("request", (r) => { if (r.method() !== "GET" && r.method() !== "HEAD" && !/\/wp-login\.php/.test(r.url())) w2.push(`${r.method()} ${r.url()}`); });
    // Signed out, the form page offers a sign-in link that stays on this site.
    await p2.goto(`${BASE}${ROOT}use-case-form/`, { waitUntil: "domcontentloaded" });
    const signin = await p2.evaluate(() => [...document.querySelectorAll("main a, .fides-form a, a")].filter((a) => /sign in/i.test(a.textContent)).map((a) => a.getAttribute("href")));
    check("signed out, the form page offers a sign-in link on this site", signin.length > 0 && signin.every((h) => pathOf(h).startsWith(ROOT)), JSON.stringify(signin.slice(0, 2)));
    await p2.goto(`${BASE}${ROOT}wp-login.php`, { waitUntil: "domcontentloaded" });
    await p2.fill("#user_login", process.env.REHEARSAL_USER);
    await p2.fill("#user_pass", process.env.REHEARSAL_PASS || "");
    await Promise.all([p2.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}), p2.click("#wp-submit")]);
    await p2.waitForURL((u) => !/wp-login\.php/.test(u.pathname), { timeout: 15000 }).catch(() => {});
    const cookies = await ctx2.cookies();
    const loginErr = (await p2.locator("#login_error").allTextContents()).join(" ").replace(/\s+/g, " ").slice(0, 120);
    check(`the reviewer signs in on ${ROOT}wp-login.php`, cookies.some((c) => /^wordpress_logged_in_/.test(c.name)), `${new URL(p2.url()).pathname} ${loginErr}`);
    check("after sign-in the visitor stays below the base", new URL(p2.url()).pathname.startsWith(ROOT), new URL(p2.url()).pathname);
    // The consent cookies go in after sign-in: with them present the stock login form does not submit.
    await ctx2.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
    for (const rel of FORM_PAGES) {
      const res = await p2.goto(`${BASE}${ROOT}${rel}`, { waitUntil: "domcontentloaded" });
      await p2.waitForSelector("form input, form select, form textarea", { timeout: 15000 }).catch(() => {});
      const f = await p2.evaluate(() => ({
        fields: document.querySelectorAll("form input:not([type=hidden]), form select, form textarea").length,
        text: document.body.innerText.slice(0, 300).replace(/\s+/g, " "),
        actions: [...document.querySelectorAll("form[action]")].map((x) => x.getAttribute("action")),
        html: document.documentElement.outerHTML,
      }));
      check(`${ROOT}${rel}: signed in, the form shows its fields`, res && res.status() === 200 && f.fields > 0, `${f.fields} fields; ${f.text.slice(0, 120)}`);
      const r = strayIn(f.html);
      check(`${ROOT}${rel}: form page and its endpoints stay below the base`, r.list.length === 0 && !r.doubled && f.actions.every((a) => !a || a === "" || a.startsWith("#") || new URL(a, BASE).pathname.startsWith(ROOT)), `${r.list.slice(0, 3).join(",")} ${f.actions.join(",")}`);
    }
    check("no write request other than the sign-in during the form checks", w2.length === 0, w2.slice(0, 3).join(" | "));
    await ctx2.close();
  }

  // Detail pages: the first detail link of each listing opens a populated detail view below the base.
  const detailKinds = [["overview/", /use-case\/\?/], ["organizations/", /organization\/\?/], ["personal-wallets/", /wallet\/\?/], ["credentials/", /credential\/\?/]];
  for (const [listing, re] of detailKinds) {
    await page.goto(`${BASE}${ROOT}${listing}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("a[href*='?']", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(600);
    const href = await page.evaluate((src) => { const r = new RegExp(src); const a = [...document.querySelectorAll("a[href]")].find((x) => r.test(x.getAttribute("href"))); return a ? a.getAttribute("href") : null; }, re.source);
    if (!href) { check(`${ROOT}${listing}: has a detail link`, false, "none found"); continue; }
    const res = await page.goto(new URL(href, `${BASE}${ROOT}${listing}`).href, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1", { timeout: 30000 }).catch(() => {});
    const d = await page.evaluate(() => ({ h1: ((document.querySelector("h1") || {}).textContent || "").trim(), back: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")) }));
    check(`${ROOT}${listing}: detail ${pathOf(href)} opens with a heading`, res && res.status() === 200 && d.h1.length > 0, `${res && res.status()} ${d.h1}`);
    const offenders = d.back.filter((h) => { if (!h || h.startsWith("#")) return false; try { const u = new URL(h, BASE); return u.origin === BASE && !u.pathname.startsWith(ROOT); } catch (e) { return false; } });
    check(`${ROOT}${listing}: detail page links stay below the base`, offenders.length === 0, offenders.slice(0, 3).join(" , "));
  }

  check("no write request (POST/PUT/DELETE) during the whole browser run", writes.length === 0, writes.slice(0, 3).join(" | "));
  check("no JavaScript page errors", errors.length === 0, errors.slice(0, 2).join(" | "));

  await browser.close();
  console.log(failures ? `${failures} rehearsal checks failed` : "all rehearsal checks passed");
  process.exit(failures ? 1 : 0);
})();
