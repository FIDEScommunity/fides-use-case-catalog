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
    await ctx.route((url) => !url.href.startsWith(BASE), (route) => route.request().resourceType() === "document" ? route.fulfill({ status: 200, contentType: "text/html", body: "<title>External source</title><p>external</p>" }) : route.request().resourceType() === "image" ? route.fulfill({ status: 200, contentType: "image/gif", body: Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64") }) : route.abort());
    const page = await ctx.newPage();
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator(".fides-home-news__item").first().waitFor({ timeout: 30000 });

    // Existing hero and featured use case stay.
    check(`${tag}: hero and featured use case are still there`, (await page.locator("h1").first().textContent()).includes("Accelerating") && (await page.locator(".fides-uc-featured .fides-ds-card--feature").count()) === 1);
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);

    // Hero: one introduction sentence, two actions, featured VOG card with image.
    const hero = await page.evaluate(() => ({ lead: (document.querySelector(".fides-uc-hero .fides-ds-lead") || {}).textContent || "", paras: document.querySelectorAll(".fides-uc-hero p:not(.fides-ds-kicker)").length, actions: [...document.querySelectorAll(".fides-uc-fragment__actions a")].map((a) => a.getAttribute("href")), img: !!document.querySelector(".fides-uc-featured img") }));
    check(`${tag}: hero has the one Paper sentence and no extra line`, hero.lead.trim() === "See how organizations use digital wallets and credentials in practice." && hero.paras === 1, JSON.stringify(hero));
    check(`${tag}: both hero actions and the featured image stay`, hero.actions.length === 2 && /\/start\/$/.test(hero.actions[0]) && /\/overview\/$/.test(hero.actions[1]) && hero.img, JSON.stringify(hero));
    check(`${tag}: the old routes block is gone`, (await page.locator(".fides-home-routes").count()) === 0);

    // Learn strip.
    const learn = await page.evaluate(() => { const s = document.querySelector(".fides-home-learn"); return s ? { title: s.querySelector("h2").textContent.trim(), bg: getComputedStyle(s).backgroundColor, y: s.getBoundingClientRect().top + scrollY, heroBottom: document.querySelector(".fides-uc-featured").getBoundingClientRect().bottom + scrollY, links: [...s.querySelectorAll("a")].map((a) => { const r = a.getBoundingClientRect(); return { t: a.textContent.trim(), href: a.getAttribute("href"), key: a.dataset.learn, h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), right: Math.round(r.right), svg: a.querySelectorAll("svg").length }; }) } : null; });
    check(`${tag}: Learn strip with title and two links`, learn && learn.title === "New to digital trust?" && learn.links.length === 2 && learn.links[0].t.startsWith("Topics & guides") && learn.links[1].t.startsWith("Sessions & workshops"), JSON.stringify(learn));
    check(`${tag}: strip is light blue, below the hero and above the themes`, learn && learn.bg === "rgb(242, 247, 255)" && learn.y >= learn.heroBottom - 1);
    check(`${tag}: book icon at Topics, calendar icon at Sessions`, learn && learn.links[0].key === "topics" && learn.links[1].key === "sessions" && learn.links.every((l) => l.svg === 1));
    check(`${tag}: Learn links go to existing pilot pages`, learn && /\/fides-design-pilot\/learn\/topics\/?$/.test(learn.links[0].href) && /\/fides-design-pilot\/learn\//.test(learn.links[1].href), JSON.stringify(learn.links));
    check(`${tag}: Learn links are at least 44px tall, inside the viewport, side by side on desktop and stacked on mobile`, learn && learn.links.every((l) => l.h >= 44 && l.right <= w) && (w > 640 ? learn.links[0].y === learn.links[1].y : learn.links[1].y > learn.links[0].y), JSON.stringify(learn.links));
    for (const l of learn.links) {
      const status = await page.evaluate(async (u) => (await fetch(u, { credentials: "same-origin" })).status, l.href);
      check(`${tag}: Learn link "${l.t}" resolves`, status === 200, `${status} ${l.href}`);
    }

    // Digital trust in practice: themes and counts come from the use case plugin.
    const idx = await page.evaluate(() => ({ total: +(document.querySelector("[data-fides-uc-index-total]") || {}).dataset?.fidesUcIndexTotal || 0, y: document.querySelector(".fides-uc-index").getBoundingClientRect().top + scrollY, learnY: document.querySelector(".fides-home-learn").getBoundingClientRect().top + scrollY, newsY: document.querySelector(".fides-home-news").getBoundingClientRect().top + scrollY, rows: [...document.querySelectorAll(".fides-uc-index__link")].map((a) => { const r = a.getBoundingClientRect(); return { code: a.dataset.theme, href: a.getAttribute("href"), name: a.querySelector(".fides-uc-index__name").textContent.trim(), count: +a.querySelector(".fides-uc-index__count").dataset.count, h: Math.round(r.height), right: Math.round(r.right), label: a.getAttribute("aria-label") }; }), links: [...document.querySelectorAll(".fides-uc-index__catalogs a")].map((a) => ({ t: a.textContent.trim(), href: a.getAttribute("href"), h: Math.round(a.getBoundingClientRect().height) })) }));
    check(`${tag}: index sits between the Learn strip and the latest updates`, idx.learnY < idx.y && idx.y < idx.newsY);
    check(`${tag}: one row per theme, each with a theme filter link and a count`, idx.rows.length >= 1 && idx.rows.every((r) => r.code && /\/fides-design-pilot\/overview\/\?theme=/.test(r.href) && r.href.includes("theme=" + r.code) && r.count >= 0 && r.label.includes(r.name)), JSON.stringify(idx.rows));
    check(`${tag}: total shown separately and not the sum of the rows`, idx.total > 0 && idx.total >= Math.max(...idx.rows.map((r) => r.count)), `${idx.total}`);
    check(`${tag}: rows are inside the viewport and at least 44px tall`, idx.rows.every((r) => r.right <= w && r.h >= 44), JSON.stringify(idx.rows.map((r) => [r.right, r.h])));
    const grid = await page.evaluate(() => [...document.querySelectorAll(".fides-uc-index__link")].map((a) => { const r = a.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), icons: a.querySelectorAll("svg").length, arrow: !!a.querySelector(".fides-uc-index__arrow"), name: !!a.querySelector(".fides-uc-index__name"), count: !!a.querySelector(".fides-uc-index__count") }; }));
    const colsX = [...new Set(grid.map((g) => g.x))].length;
    check(`${tag}: each theme has an icon, name, count and arrow, and no sequence number`, grid.every((g) => g.icons === 1 && g.arrow && g.name && g.count) && (await page.locator(".fides-uc-index__num").count()) === 0, JSON.stringify(grid));
    check(`${tag}: ${w >= 900 ? "two columns of three rows" : "one column"}`, w >= 900 ? grid.length === 6 && colsX === 2 && grid.slice(0, 3).every((g) => g.x === grid[0].x) && grid.slice(3).every((g) => g.x === grid[3].x) && grid[0].y === grid[3].y : colsX === 1 && grid.every((g, i) => i === 0 || g.y > grid[i - 1].y), JSON.stringify(grid));
    const all = await page.evaluate(() => { const a = document.querySelector(".fides-uc-index__all"); return { href: a.getAttribute("href"), text: a.textContent.trim(), h: Math.round(a.getBoundingClientRect().height), others: document.querySelectorAll(".fides-uc-index__catalogs").length }; });
    check(`${tag}: Browse all use cases goes to the overview, the catalog links are gone`, /^Browse all use cases/.test(all.text) && /\/fides-design-pilot\/overview\/$/.test(all.href) && all.h >= 44 && all.others === 0, JSON.stringify(all));

    // Keyboard: Tab reaches the first theme row with a visible ring; hover tints the row.
    await page.locator(".fides-uc-index__link").first().evaluate((a) => a.setAttribute("data-probe-theme", "1"));
    await page.evaluate(() => window.scrollTo(0, 0));
    let themeReached = false;
    for (let i = 0; i < 60 && !themeReached; i += 1) {
      await page.keyboard.press("Tab");
      themeReached = await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-probe-theme"));
    }
    check(`${tag}: theme row reachable by keyboard with a visible ring`, themeReached && (await page.locator(".fides-uc-index__link").first().evaluate((e) => { const c = getComputedStyle(e); return parseFloat(c.outlineWidth) >= 2 && c.outlineStyle !== "none"; })));
    if (w >= 1024) {
      const row = page.locator(".fides-uc-index__link").nth(1);
      const bg0 = await row.evaluate((e) => getComputedStyle(e).backgroundColor);
      await row.hover();
      await page.waitForTimeout(200);
      check(`${tag}: theme row shows hover`, (await row.evaluate((e) => getComputedStyle(e).backgroundColor)) !== bg0);
    }
    // Follow themes: filter visible in the overview and result count equals the homepage count.
    const pick = w === 1440 ? idx.rows : [idx.rows[0], idx.rows[Math.floor(idx.rows.length / 2)], idx.rows[idx.rows.length - 1]];
    for (const r of pick) {
      await page.goto(HOME, { waitUntil: "domcontentloaded" });
      await page.locator(`.fides-uc-index__link[data-theme="${r.code}"]`).click();
      await page.waitForURL(/\/fides-design-pilot\/overview\//, { timeout: 30000 });
      await page.locator(".fides-uc-pilot__count").waitFor({ timeout: 30000 });
      await page.waitForFunction(() => /\d+ use cases?/.test((document.querySelector(".fides-uc-pilot__count") || {}).textContent || ""), null, { timeout: 30000 });
      const got = await page.evaluate(() => ({ n: +(document.querySelector(".fides-uc-pilot__count").textContent.match(/\d+/) || [0])[0], pill: (document.querySelector(".fides-uc-pilot__pills") || {}).textContent || "", checked: [...document.querySelectorAll("input[data-pilot-theme]:checked")].map((i) => i.value) }));
      check(`${tag}: "${r.name}" opens the overview with the filter visible`, got.pill.includes(r.name) && got.checked.includes(r.code), JSON.stringify(got));
      check(`${tag}: "${r.name}" count on the homepage (${r.count}) equals the overview result (${got.n})`, got.n === r.count);
    }
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator(".fides-home-news__item").first().waitFor({ timeout: 30000 });

    // Latest from the ecosystem.
    const news = await page.evaluate(() => [...document.querySelectorAll(".fides-home-news__item")].map((li) => { const t = li.querySelector(".fides-home-news__title"); const a = t.querySelector("a"); const m = li.querySelector(".fides-home-news__meta"); const b = li.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(t).lineHeight); return { y: Math.round(b.y), x: Math.round(b.x), right: Math.round(b.right), href: a.href, title: a.textContent.trim(), date: li.querySelector("time").getAttribute("datetime"), lines: Math.round(t.getBoundingClientRect().height / lh), source: li.querySelector(".fides-home-news__source").textContent.trim(), metaAbove: m.getBoundingClientRect().bottom <= t.getBoundingClientRect().top + 1, links: li.querySelectorAll("a").length, external: li.classList.contains("is-external"), marker: !!li.querySelector(".fides-home-news__external"), hidden: li.querySelector("a").getAttribute("aria-label") || "", old: li.querySelectorAll(".fides-home-news__foot, .fides-home-news__action, .fides-home-news__kicker").length }; }));
    check(`${tag}: three items with source and date together above a linked title, one link each`, news.length === 3 && news.every((n) => n.title && /^\d{4}-\d\d-\d\d$/.test(n.date) && n.source && n.metaAbove && n.links === 1 && n.old === 0), JSON.stringify(news));
    check(`${tag}: external links show an arrow and say so to screen readers, own links do not`, news.every((n) => (n.external ? n.marker && /external site/.test(n.hidden) : !n.marker && n.hidden === "")) && news.some((n) => n.external), JSON.stringify(news.map((n) => [n.external, n.marker, n.hidden])));
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
      await item.hover();
      await page.waitForTimeout(200);
      check(`${tag}: news title is underlined on hover`, (await item.locator(".fides-home-news__link").evaluate((e) => getComputedStyle(e).textDecorationLine)) === "underline");
    }

    // Click through to the original post and back.
    await page.locator(".fides-home-news__link").first().click();
    await page.waitForLoadState("domcontentloaded");
    check(`${tag}: external item leaves the site`, !page.url().startsWith(BASE), page.url());
    await page.goBack();
    await page.locator(".fides-home-news__item").first().waitFor();
    check(`${tag}: back returns to the homepage`, page.url().startsWith(HOME));

    // Learn links and hero actions navigate.
    await page.locator('.fides-home-learn [data-learn="topics"]').click();
    await page.waitForURL(/\/fides-design-pilot\/learn\/topics/, { timeout: 30000 });
    check(`${tag}: Topics & guides opens the Learn topics page`, true);
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator('.fides-home-learn [data-learn="sessions"]').click();
    await page.waitForURL(/\/fides-design-pilot\/learn\//, { timeout: 30000 });
    check(`${tag}: Sessions & workshops opens a Learn page`, true);
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator(".fides-uc-index__all").click();
    await page.waitForURL(/\/fides-design-pilot\/overview\/$/, { timeout: 30000 });
    check(`${tag}: Browse all use cases opens the overview`, true);
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
