/**
 * Homepage routes and "Latest from the ecosystem" (Paper 25.12): layout,
 * links, hover, focus, keyboard, long titles, overflow. Remote hosts are stubbed.
 * Run: node home-checks.cjs (PLAYWRIGHT_MODULE, PILOT_URL, WIDTHS).
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const HOME = `${BASE}/fides-design-pilot/homepage-fragment/`;
const WIDTHS = (process.env.WIDTHS || "1440,1100,768,390,320").split(",").map(Number);
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d && !ok ? ` (${d})` : ""}`); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

(async () => {
  const browser = await chromium.launch();
  for (const w of WIDTHS) {
    const tag = `${w}px`;
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
    await ctx.route((url) => !url.href.startsWith(BASE), (route) => route.request().resourceType() === "document" ? route.fulfill({ status: 200, contentType: "text/html", body: "<title>External source</title><p>external</p>" }) : route.abort());
    const page = await ctx.newPage();
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator(".fides-home-news__item").first().waitFor({ timeout: 30000 });

    // Existing hero and featured use case stay.
    check(`${tag}: hero and featured use case are still there`, (await page.locator("h1").first().textContent()).includes("Accelerating") && (await page.locator(".fides-uc-featured .fides-ds-card--feature").count()) === 1);
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);

    // Routes.
    const routes = await page.evaluate(() => [...document.querySelectorAll(".fides-home-routes__item")].map((li) => { const b = li.getBoundingClientRect(); const a = li.querySelector("a"); return { x: Math.round(b.x), y: Math.round(b.y), h: li.querySelector("h3").textContent.trim(), href: a ? a.getAttribute("href") : null, hh: a ? Math.round(a.getBoundingClientRect().height) : 0 }; }));
    check(`${tag}: three routes in order`, routes.length === 3 && routes[0].h === "Understand the possibilities" && routes[1].h === "See what works in practice" && routes[2].h === "Connect your organization", JSON.stringify(routes));
    check(`${tag}: routes sit in a row from 900px and stack below`, w >= 900 ? routes[0].y === routes[1].y && routes[1].y === routes[2].y && routes[0].x < routes[1].x : routes[1].y > routes[0].y && routes[2].y > routes[1].y, JSON.stringify(routes));
    check(`${tag}: routes 1 and 2 link to the pilot pages, route 3 has no dead link`, /\/fides-design-pilot\/start\/$/.test(routes[0].href || "") && /\/fides-design-pilot\/overview\/$/.test(routes[1].href || "") && routes[2].href === null, JSON.stringify(routes));
    check(`${tag}: route links are at least 44px tall`, routes.slice(0, 2).every((r) => r.hh >= 44), JSON.stringify(routes));

    // Latest from the ecosystem.
    const news = await page.evaluate(() => [...document.querySelectorAll(".fides-home-news__item")].map((li) => { const t = li.querySelector(".fides-home-news__title"); const a = li.querySelector("a"); const b = li.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(t).lineHeight); return { y: Math.round(b.y), x: Math.round(b.x), right: Math.round(b.right), href: a.href, title: a.textContent.trim(), date: li.querySelector("time").getAttribute("datetime"), lines: Math.round(t.getBoundingClientRect().height / lh), source: li.querySelector(".fides-home-news__source").textContent, kicker: li.querySelector(".fides-home-news__kicker").textContent, links: li.querySelectorAll("a").length }; }));
    check(`${tag}: three news items with title, date, kicker and source`, news.length === 3 && news.every((n) => n.title && /^\d{4}-\d\d-\d\d$/.test(n.date) && n.kicker && n.source && n.links === 1), JSON.stringify(news));
    const dates = news.map((n) => n.date);
    check(`${tag}: newest first`, dates.every((d, i) => i === 0 || dates[i - 1] >= d), dates.join(","));
    check(`${tag}: items in a row from 900px and stacked below, inside the viewport`, (w >= 900 ? news[0].y === news[1].y : news[1].y > news[0].y) && news.every((n) => n.right <= w), JSON.stringify(news.map((n) => [n.x, n.y, n.right])));
    check(`${tag}: long titles are clamped to four lines`, news.every((n) => n.lines <= 4), JSON.stringify(news.map((n) => n.lines)));
    check(`${tag}: external items link to the original post`, news.filter((n) => !n.href.startsWith(BASE)).length > 0 && news.every((n) => /^https?:/.test(n.href)));
    check(`${tag}: overview link goes to Updates`, /\/fides-design-pilot\/updates\/$/.test(await page.locator(".fides-home-news__all").getAttribute("href")));
    check(`${tag}: overview link is at least 44px tall`, (await page.locator(".fides-home-news__all").evaluate((e) => e.getBoundingClientRect().height)) >= 44);

    // Keyboard: Tab reaches the first news link with a visible ring.
    await page.locator(".fides-home-news__link").first().evaluate((a) => a.setAttribute("data-probe", "1"));
    await page.evaluate(() => window.scrollTo(0, 0));
    let reached = false;
    for (let i = 0; i < 90 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-probe"));
    }
    const ring = await page.locator(".fides-home-news__item").first().evaluate((e) => { const c = getComputedStyle(e); return parseFloat(c.outlineWidth) >= 2 && c.outlineStyle !== "none"; });
    check(`${tag}: news item reachable by keyboard with a visible ring`, reached && ring, `${reached} ${ring}`);
    if (w >= 1024) {
      const item = page.locator(".fides-home-news__item").nth(1);
      const bg0 = await item.evaluate((e) => getComputedStyle(e).backgroundColor);
      await item.hover();
      await page.waitForTimeout(250);
      check(`${tag}: news item shows hover`, (await item.evaluate((e) => getComputedStyle(e).backgroundColor)) !== bg0);
    }

    // Click through to the original post and back.
    await page.locator(".fides-home-news__link").first().click();
    await page.waitForLoadState("domcontentloaded");
    check(`${tag}: external item leaves the site`, !page.url().startsWith(BASE), page.url());
    await page.goBack();
    await page.locator(".fides-home-news__item").first().waitFor();
    check(`${tag}: back returns to the homepage`, page.url().startsWith(HOME));

    // Routes and overview link navigate.
    await page.locator(".fides-home-routes__action").first().click();
    await page.waitForURL(/\/fides-design-pilot\/start\//, { timeout: 30000 });
    check(`${tag}: starting point route opens the start page`, true);
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator(".fides-home-routes__action").nth(1).click();
    await page.waitForURL(/\/fides-design-pilot\/overview\//, { timeout: 30000 });
    check(`${tag}: use case route opens the overview`, true);
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator(".fides-home-news__all").click();
    await page.waitForURL(/\/fides-design-pilot\/updates\//, { timeout: 30000 });
    check(`${tag}: all updates opens the Updates page`, (await page.locator("h1").first().textContent()).trim() === "Updates");
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `\n${failures} failed` : "\nall home checks passed");
  process.exit(failures ? 1 : 0);
})();
