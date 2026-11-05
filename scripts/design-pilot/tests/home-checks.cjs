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
const heights = {};
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
    check(`${tag}: hero has the one Paper sentence and no extra line`, hero.lead.trim() === "FIDES helps organizations understand and use digital wallets and credentials through real-world examples, practical guides, catalogs and expert guidance." && hero.paras === 1, JSON.stringify(hero));
    check(`${tag}: both hero actions and the featured image stay`, hero.actions.length === 2 && /\/start\/$/.test(hero.actions[0]) && /\/overview\/$/.test(hero.actions[1]) && hero.img, JSON.stringify(hero));
    check(`${tag}: the old routes block is gone`, (await page.locator(".fides-home-routes").count()) === 0);

    // Readiness module (Paper 25.16): the full layout, copy and link checks live in readiness-checks.cjs; here only its place on the page.
    const learn = await page.evaluate(() => { const s = document.querySelector(".fides-home-readiness"); return s ? { rows: s.querySelectorAll(".fides-home-readiness__list a").length, old: document.querySelectorAll(".fides-home-learn").length } : null; });
    check(`${tag}: readiness module with two action rows replaces the Learn strip`, learn && learn.rows === 2 && learn.old === 0, JSON.stringify(learn));

    // Digital trust in practice: themes and counts come from the use case plugin.
    const idx = await page.evaluate(() => ({ total: +(document.querySelector("[data-fides-uc-index-total]") || {}).dataset?.fidesUcIndexTotal || 0, y: document.querySelector(".fides-uc-index").getBoundingClientRect().top + scrollY, learnY: document.querySelector(".fides-home-readiness").getBoundingClientRect().top + scrollY, newsY: document.querySelector(".fides-home-news").getBoundingClientRect().top + scrollY, spotY: document.querySelector(".fides-uc-spot").getBoundingClientRect().top + scrollY, learnBottom: document.querySelector(".fides-home-readiness").getBoundingClientRect().bottom + scrollY, titleY: document.querySelector(".fides-uc-index__title").getBoundingClientRect().top + scrollY, rows: [...document.querySelectorAll(".fides-uc-index__link")].map((a) => { const r = a.getBoundingClientRect(); return { code: a.dataset.theme, href: a.getAttribute("href"), name: a.querySelector(".fides-uc-index__name").textContent.trim(), count: +a.querySelector(".fides-uc-index__count").dataset.count, h: Math.round(r.height), right: Math.round(r.right), label: a.getAttribute("aria-label") }; }), links: [...document.querySelectorAll(".fides-uc-index__catalogs a")].map((a) => ({ t: a.textContent.trim(), href: a.getAttribute("href"), h: Math.round(a.getBoundingClientRect().height) })) }));
    check(`${tag}: order is readiness, themes, spotlight, latest updates`, idx.learnY < idx.y && idx.y < idx.spotY && idx.spotY < idx.newsY);
    check(`${tag}: ${w >= 900 ? "48-64px" : "at most 40px"} between the readiness block and the themes heading`, w >= 900 ? idx.titleY - idx.learnBottom >= 48 && idx.titleY - idx.learnBottom <= 64 : idx.titleY - idx.learnBottom <= 40, String(idx.titleY - idx.learnBottom));
    check(`${tag}: one row per theme, each with a theme filter link and a count`, idx.rows.length >= 1 && idx.rows.every((r) => r.code && /\/fides-design-pilot\/overview\/\?theme=/.test(r.href) && r.href.includes("theme=" + r.code) && r.count >= 0 && r.label.includes(r.name)), JSON.stringify(idx.rows));
    {
      const sub = await page.evaluate(() => { const l = document.querySelector(".fides-uc-index__lead"); const t = document.querySelector(".fides-uc-index__total"); const lr = l.getBoundingClientRect(); const tr = t.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(l).lineHeight); return { text: l.textContent.trim(), lines: Math.round(lr.height / lh), lr: Math.round(lr.right), ll: Math.round(lr.left), lt: Math.round(lr.top), tl: Math.round(tr.left), tr: Math.round(tr.right), tt: Math.round(tr.top), tlines: Math.round(tr.height / parseFloat(getComputedStyle(t).lineHeight)), hero: (document.querySelector(".fides-uc-hero .fides-ds-lead") || {}).textContent }; });
      check(`${tag}: theme sentence is the new text and the hero intro is unchanged`, sub.text === "As AI makes it easier to create and share information, it matters more that we can verify where it comes from." && sub.hero.trim() === "FIDES helps organizations understand and use digital wallets and credentials through real-world examples, practical guides, catalogs and expert guidance.", JSON.stringify(sub));
      check(`${tag}: ${w >= 900 ? "the sentence wraps in its own column left of the total, both on the same row" : "the sentence wraps and the total sits beside it or below, never overlapping"}`, w >= 900 ? sub.lr < sub.tl && Math.abs(sub.lt - sub.tt) <= 4 && sub.lines <= 2 : (sub.tt > sub.lt ? sub.tl >= sub.ll - 1 : sub.lr < sub.tl), JSON.stringify(sub));
      if (w >= 1100) check(`${tag}: the sentence fits on one line next to the total`, sub.lines === 1, JSON.stringify(sub));
      check(`${tag}: the total stays on one line and everything stays inside the screen`, sub.tlines === 1 && sub.tr <= w && sub.lr <= w, JSON.stringify(sub));
    }
    check(`${tag}: total shown separately and not the sum of the rows`, idx.total > 0 && idx.total >= Math.max(...idx.rows.map((r) => r.count)), `${idx.total}`);
    check(`${tag}: rows are inside the viewport and at least 44px tall`, idx.rows.every((r) => r.right <= w && r.h >= 44), JSON.stringify(idx.rows.map((r) => [r.right, r.h])));
    const grid = await page.evaluate(() => [...document.querySelectorAll(".fides-uc-index__link")].map((a) => { const r = a.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), icons: a.querySelectorAll("svg").length, arrow: !!a.querySelector(".fides-uc-index__arrow"), name: !!a.querySelector(".fides-uc-index__name"), count: !!a.querySelector(".fides-uc-index__count") }; }));
    const colsX = [...new Set(grid.map((g) => g.x))].length;
    check(`${tag}: each theme has an icon, name, count and arrow, and no sequence number`, grid.every((g) => g.icons === 1 && g.arrow && g.name && g.count) && (await page.locator(".fides-uc-index__num").count()) === 0, JSON.stringify(grid));
    check(`${tag}: ${w >= 900 ? "two columns of three rows" : "one column"}`, w >= 900 ? grid.length === 6 && colsX === 2 && grid.slice(0, 3).every((g) => g.x === grid[0].x) && grid.slice(3).every((g) => g.x === grid[3].x) && grid[0].y === grid[3].y : colsX === 1 && grid.every((g, i) => i === 0 || g.y > grid[i - 1].y), JSON.stringify(grid));
    const cols = await page.evaluate(() => [...document.querySelectorAll(".fides-uc-index__link")].map((a) => { const c = a.querySelector(".fides-uc-index__count").getBoundingClientRect(); const ar = a.querySelector(".fides-uc-index__arrow").getBoundingClientRect(); const n = a.querySelector(".fides-uc-index__name").getBoundingClientRect(); return { cr: Math.round(c.right), ax: Math.round(ar.left), nr: Math.round(n.right), cl: Math.round(c.left), cy: Math.round(c.top + c.height / 2), ay: Math.round(ar.top + ar.height / 2), row: Math.round(a.getBoundingClientRect().left) }; }));
    if (w < 900) check(`${tag}: counts sit in a fixed position next to the arrow and names can wrap`, cols.every((c) => c.cr === cols[0].cr && c.ax === cols[0].ax && c.nr <= c.cl && Math.abs(c.cy - c.ay) <= 12), JSON.stringify(cols));
    const tails = await page.evaluate(() => [...document.querySelectorAll(".fides-home-news__tail")].map((t) => ({ oneLine: t.getBoundingClientRect().height < 1.6 * parseFloat(getComputedStyle(t).lineHeight), arrowSameLine: Math.abs(t.querySelector(".fides-home-news__external").getBoundingClientRect().top - t.getBoundingClientRect().top) < 8, words: t.textContent.replace(/\u00a0/, " ").trim().split(/\s+/).length })));
    check(`${tag}: the external arrow stays with the last word of the title`, tails.length > 0 && tails.every((t) => t.oneLine && t.arrowSameLine && t.words === 2), JSON.stringify(tails));
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
      let tinted = false;
      for (let i = 0; i < 8 && !tinted; i += 1) {
        await page.mouse.move(2, 2);
        await row.hover();
        await page.waitForTimeout(150);
        tinted = (await row.evaluate((e) => getComputedStyle(e).backgroundColor)) !== bg0;
      }
      check(`${tag}: theme row shows hover`, tinted);
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

    {
      const meta = await page.evaluate(() => [...document.querySelectorAll(".fides-home-news__meta")].map((m) => { const box = m.getBoundingClientRect(); const parts = [...m.querySelectorAll(".fides-home-news__part")].map((p) => { const r = p.getBoundingClientRect(); return { rects: p.getClientRects().length, right: Math.round(r.right), left: Math.round(r.left), top: Math.round(r.top), text: p.textContent.trim() }; }); const lh = parseFloat(getComputedStyle(m).lineHeight); return { lines: Math.round(box.height / lh), parts, right: Math.round(box.right) }; }));
      check(`${tag}: source lines wrap between parts, never inside a part that fits, and stay inside the screen`, meta.every((m) => m.parts.every((p) => p.rects === 1 && p.right <= w) && m.right <= w), JSON.stringify(meta));
      check(`${tag}: no separator starts a line`, meta.every((m) => m.parts.every((p, i) => i === 0 || p.top >= m.parts[i - 1].top) && m.parts.every((p, i) => !/^·/.test(p.text))), JSON.stringify(meta));
      const tails = await page.evaluate(() => [...document.querySelectorAll(".fides-home-news__tail")].map((t) => { const b = t.getBoundingClientRect(); const ar = t.querySelector(".fides-home-news__external").getBoundingClientRect(); const lh = parseFloat(getComputedStyle(t).lineHeight); return { oneLine: b.height <= lh * 1.3, sameLine: ar.top >= b.top - 2 && ar.bottom <= b.bottom + 2, word: t.firstChild.textContent }; }));
      check(`${tag}: the external arrow stays with the last word of the title`, tails.length >= 1 && tails.every((t) => t.oneLine && t.sameLine), JSON.stringify(tails));
    }

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
      await item.scrollIntoViewIfNeeded();
      let underlined = false;
      for (let i = 0; i < 8 && !underlined; i += 1) {
        await page.mouse.move(2, 2);
        await item.hover();
        await page.waitForTimeout(150);
        underlined = (await item.locator(".fides-home-news__link").evaluate((e) => getComputedStyle(e).textDecorationLine)) === "underline";
      }
      check(`${tag}: news title is underlined on hover`, underlined);
    }

    // Click through to the original post and back.
    await page.locator(".fides-home-news__link").first().click();
    await page.waitForLoadState("domcontentloaded");
    check(`${tag}: external item leaves the site`, !page.url().startsWith(BASE), page.url());
    await page.goBack();
    await page.locator(".fides-home-news__item").first().waitFor();
    check(`${tag}: back returns to the homepage`, page.url().startsWith(HOME));

    // Spotlight: Bosch demo use case with its explicit relations.
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator(".fides-uc-spot").waitFor();
    const spot = await page.evaluate(() => {
      const s = document.querySelector(".fides-uc-spot");
      const r = (e) => e.getBoundingClientRect();
      const rel = [...s.querySelectorAll(".fides-uc-spot__relation")].map((a) => ({ key: a.dataset.relation, text: a.textContent.replace(/\s+/g, " ").replace(/\s*→$/, "").trim(), count: +a.querySelector(".fides-uc-spot__count").textContent, href: a.getAttribute("href"), h: Math.round(r(a).height), x: Math.round(r(a).x), y: Math.round(r(a).y), right: Math.round(r(a).right), arrow: !!a.querySelector(".fides-uc-spot__arrow[aria-hidden=true]") }));
      const main = [...s.querySelectorAll(".fides-uc-spot__case > .fides-uc-spot__text > a")].map((a) => ({ t: a.textContent.trim(), href: a.getAttribute("href"), h: Math.round(r(a).height) }));
      const img = s.querySelector(".fides-uc-spot__media img");
      const box = s.querySelector(".fides-uc-spot__media");
      const title = s.querySelector(".fides-uc-spot__case-title");
      return {
        bg: getComputedStyle(s).backgroundColor, y: r(s).top + scrollY, height: Math.round(r(s).height), indexBottom: r(document.querySelector(".fides-uc-index")).bottom + scrollY, newsTop: r(document.querySelector(".fides-home-news")).top + scrollY, spotBottom: r(s).bottom + scrollY, footerTop: (document.querySelector("footer") || document.body).getBoundingClientRect().top + scrollY, newsBottom: r(document.querySelector(".fides-home-news")).bottom + scrollY,
        kicker: s.querySelector(".fides-uc-spot__kicker").textContent.trim(), title: title.textContent.trim(), titleLines: Math.round(r(title).height / parseFloat(getComputedStyle(title).lineHeight)), titleRight: Math.round(r(title).right),
        preview: (s.querySelector(".fides-uc-spot__preview") || {}).textContent || "", intro: !!s.querySelector(".fides-uc-spot__intro"),
        img: img ? img.src : "", fit: img ? getComputedStyle(img).objectFit : "", imgW: img ? Math.round(r(img).width) : 0, imgH: img ? Math.round(r(img).height) : 0, boxW: box ? Math.round(r(box).width) : 0, boxX: box ? Math.round(r(box).x) : 0, boxRight: box ? Math.round(r(box).right) : 0, textX: Math.round(r(s.querySelector(".fides-uc-spot__text")).x),
        relTitle: (s.querySelector(".fides-uc-spot__relations-title") || {}).textContent || "", relFont: rel[0] ? getComputedStyle(s.querySelector(".fides-uc-spot__relation")).fontWeight + "/" + getComputedStyle(s.querySelector(".fides-uc-spot__relation")).fontSize : "", read: (() => { const a = s.querySelector(".fides-uc-spot__text > a"); const c = getComputedStyle(a); return { bg: c.backgroundColor, color: c.color, weight: c.fontWeight, size: c.fontSize, y: Math.round(r(a).y), bottom: Math.round(r(a).bottom) }; })(), titleY: Math.round(r(title).y), mediaY: box ? Math.round(r(box).y) : 0, relY: s.querySelector(".fides-uc-spot__relations") ? Math.round(r(s.querySelector(".fides-uc-spot__relations")).y) : 0, rel, lists: s.querySelectorAll(".fides-uc-spot__names, .fides-uc-spot__all").length, main, heads: s.querySelectorAll(".fides-uc-spot__link--head").length, scrollW: document.documentElement.scrollWidth,
      };
    });
    check(`${tag}: blue spotlight (unchanged colour) sits directly below the themes, the latest updates below it and before the footer`, spot.bg === "rgb(8, 72, 163)" && Math.abs(spot.y - spot.indexBottom) < 4 && Math.abs(spot.newsTop - spot.spotBottom) < 4 && spot.newsBottom <= spot.footerTop + 1, JSON.stringify([spot.bg, spot.y, spot.indexBottom, spot.newsTop, spot.spotBottom, spot.newsBottom, spot.footerTop]));
    check(`${tag}: spotlight shows title, status, image and preview of the catalog record, no separate intro`, /^Demo use case/.test(spot.kicker) && /Not in production/.test(spot.kicker) && /End-to-End Digital Business Workflows/.test(spot.title) && /^https?:/.test(spot.img) && spot.preview.length > 40 && spot.preview.length <= 201 && !/^use case:/i.test(spot.preview) && !spot.intro, JSON.stringify([spot.kicker, spot.title, spot.img, spot.preview]));
    check(`${tag}: the preview ends with an ellipsis because the description continues`, /…$/.test(spot.preview), spot.preview);
    check(`${tag}: ${w < 900 ? "on mobile the title, preview and Read the use case come before the diagram" : "on desktop the diagram stands left of the text"}`, w < 900 ? spot.titleY < spot.mediaY && spot.read.bottom <= spot.mediaY + 1 && spot.mediaY < spot.relY : spot.boxX < spot.textX, JSON.stringify([spot.titleY, spot.read, spot.mediaY, spot.relY]));
    check(`${tag}: the main action outweighs the relation links (filled white button, bold, larger) under the label "Connected to this use case"`, spot.read.bg === "rgb(255, 255, 255)" && spot.read.color === "rgb(8, 72, 163)" && +spot.read.weight >= 700 && parseFloat(spot.read.size) > parseFloat(spot.relFont.split("/")[1]) && +spot.relFont.split("/")[0] <= 400 && spot.relTitle.trim() === "Connected to this use case", JSON.stringify([spot.read, spot.relFont, spot.relTitle]));
    check(`${tag}: the block has no second "Explore the catalog" link`, spot.heads === 0);
    check(`${tag}: the image is shown whole, not cropped`, spot.fit === "contain" && Math.abs(spot.imgW / spot.imgH - 16 / 9) < 0.05, JSON.stringify([spot.fit, spot.imgW, spot.imgH]));
    check(`${tag}: ${w >= 900 ? "diagram next to the text" : "small preview above the text"}`, w >= 900 ? spot.boxRight <= spot.textX && spot.boxX < spot.textX : spot.boxW <= 240 && spot.boxW > 0, JSON.stringify([spot.boxX, spot.boxRight, spot.textX, spot.boxW]));
    const EXPECT = [["organizations", "Organizations", 7, "organisations"], ["businessWallets", "Business wallets", 4, "ecosystem-businesswallets"], ["personalWallets", "Personal wallets", 5, "ecosystem-personalwallets"], ["credentials", "Credential types", 15, "ecosystem-credentials"], ["issuers", "Issuers", 13, "ecosystem-issuers"], ["rps", "Relying parties", 17, "ecosystem-rps"]];
    check(`${tag}: one compact link with count and arrow per linked type, no name lists`, spot.lists === 0 && JSON.stringify(spot.rel.map((l) => [l.key, l.text, l.count])) === JSON.stringify(EXPECT.map(([k, label, n]) => [k, `${label} ${n}`, n])) && spot.rel.every((l) => l.arrow), JSON.stringify(spot.rel));
    check(`${tag}: relation links are at least 44px tall and inside the viewport`, spot.rel.every((l) => l.h >= 44 && l.right <= w) && spot.main.every((m) => m.h >= 44), JSON.stringify([spot.rel, spot.main]));
    if (w < 640) check(`${tag}: relation links sit in two compact columns`, new Set(spot.rel.map((l) => l.x)).size === 2 && Math.abs(spot.rel[1].y - spot.rel[0].y) <= 6 && spot.rel[2].y > spot.rel[0].y, JSON.stringify(spot.rel.map((l) => [l.x, l.y])));
    else check(`${tag}: relation links sit in a row that may wrap`, spot.rel[1].y === spot.rel[0].y && spot.rel[1].x > spot.rel[0].x, JSON.stringify(spot.rel.map((l) => [l.x, l.y])));
    check(`${tag}: no horizontal overflow with the spotlight`, spot.scrollW <= w && (await overflow(page)) <= 0, String(spot.scrollW));
    if (w <= 390) check(`${tag}: the long title wraps inside the block`, spot.titleRight <= w && spot.titleLines >= 2, JSON.stringify([spot.titleLines, spot.titleRight]));
    heights[w] = spot.height;
    const UC = /\/fides-design-pilot\/use-case\/\?usecase=end-to-end-digital-business-workflows-transforming-kyb-kyc-kys-via-eu-business-wallet-F665Dh/;
    check(`${tag}: links go to the use case page and the right sections`, spot.main.some((m) => UC.test(m.href) && /Read the use case/.test(m.t)) && EXPECT.every(([, , , anchor], i) => UC.test(spot.rel[i].href) && spot.rel[i].href.endsWith("#" + anchor)), JSON.stringify([spot.rel.map((l) => l.href), spot.main]));
    for (const [i, [, label, n, anchor]] of EXPECT.entries()) {
      await page.goto(spot.rel[i].href, { waitUntil: "domcontentloaded" });
      await page.locator("h1").first().waitFor({ timeout: 30000 });
      const info = await page.evaluate((id) => { const e = document.getElementById(id); if (!e) return null; const t = e.querySelector("[id$='-title']"); return { h1: document.querySelector("h1").textContent.trim(), rows: e.querySelectorAll(".fides-uc-relations__item").length, count: +((t && t.querySelector("[class*='count']") || {}).textContent || 0), hash: location.hash }; }, anchor);
      check(`${tag}: "${label} ${n}" opens the use case page on its section with the same count`, !!info && /End-to-End Digital Business Workflows/.test(info.h1) && info.hash === "#" + anchor && info.count === n && info.rows === n, JSON.stringify(info));
    }
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator(".fides-uc-spot").waitFor();
    await page.goto(spot.main.find((m) => /usecase=/.test(m.href)).href, { waitUntil: "domcontentloaded" });
    await page.locator("h1").first().waitFor({ timeout: 30000 });
    check(`${tag}: Read the use case opens the use case page`, /End-to-End Digital Business Workflows/.test(await page.locator("h1").first().textContent()));
    // Keyboard focus on the spotlight links: Tab through the block and check a visible white ring.
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator(".fides-uc-spot").waitFor();
    await page.locator(".fides-uc-spot__relation").first().focus();
    check(`${tag}: spotlight link shows a visible focus ring`, await page.evaluate(() => { const c = getComputedStyle(document.activeElement); return parseFloat(c.outlineWidth) >= 2 && c.outlineStyle !== "none"; }));

    // Counter: same values as the markup, short run, reduced motion and no JavaScript show the real values at once.
    const counts = async (pg) => pg.evaluate(() => [...document.querySelectorAll(".fides-uc-index .fides-ct-count")].map((e) => ({ shown: e.textContent.trim().replace(/\s/g, ""), target: e.dataset.count, w: Math.round(e.getBoundingClientRect().width), hidden: e.getAttribute("aria-hidden") })));
    const rowsPos = async (pg) => pg.evaluate(() => [...document.querySelectorAll(".fides-uc-index__link")].map((a) => { const r = a.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)].join(","); }).join("|"));
    {
      const rm = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
      await rm.addCookies(await ctx.cookies());
      const rp = await rm.newPage();
      await rp.goto(HOME, { waitUntil: "domcontentloaded" });
      await rp.locator(".fides-uc-index").scrollIntoViewIfNeeded();
      await rp.waitForTimeout(200);
      const c = await counts(rp);
      check(`${tag}: reduced motion shows the real values immediately`, c.length === 7 && c.every((x) => x.shown === x.target), JSON.stringify(c));
      await rm.close();
      const nj = await browser.newContext({ viewport: { width: w, height: 900 }, javaScriptEnabled: false });
      const np = await nj.newPage();
      await np.goto(HOME, { waitUntil: "domcontentloaded" });
      const c2 = await counts(np);
      check(`${tag}: without JavaScript the real values are in the page`, c2.length === 7 && c2.every((x) => x.shown === x.target && +x.target >= 0), JSON.stringify(c2));
      await nj.close();
    }
    {
      const mo = await browser.newContext({ viewport: { width: w, height: 900 } });
      await mo.addCookies(await ctx.cookies());
      const mp = await mo.newPage();
      await mp.goto(HOME, { waitUntil: "domcontentloaded" });
      await mp.locator(".fides-uc-index").waitFor();
      const before = await rowsPos(mp);
      const total = +(await mp.locator("[data-fides-uc-index-total]").getAttribute("data-fides-uc-index-total"));
      let mid = null;
      let posDuring = null;
      const seen = [];
      const t0 = Date.now();
      await mp.evaluate(() => document.querySelector(".fides-uc-index").scrollIntoView({ block: "center" }));
      for (let i = 0; i < 40; i += 1) {
        await mp.waitForTimeout(100);
        const c = await counts(mp);
        seen.push([Date.now() - t0, +c[0].shown]);
        if (i === 6) posDuring = await rowsPos(mp);
        if (mid === null && c.some((x) => +x.shown < +x.target)) mid = c;
      }
      // The markup holds the real values until the run starts; time the run from its first lower value.
      const startIdx = Math.max(0, seen.findIndex(([, v]) => v < total));
      const run = seen.slice(startIdx).map(([t, v]) => [t - seen[startIdx][0] + 100, v]);
      const at = (ms) => (run.find(([t]) => t >= ms) || [0, 0])[1];
      const doneAt = (run.find(([, v]) => v === total) || [0])[0];
      const firstHalf = at(1500) - at(0), secondHalf = total - at(1500);
      check(`${tag}: the total counts up over about 3 seconds (done at ${doneAt} ms)`, doneAt >= 2500 && doneAt <= 3700 && at(1000) < total && at(2000) < total, JSON.stringify(seen.filter((_, i) => i % 4 === 0)));
      check(`${tag}: the count slows down gradually and never runs backwards`, run.every(([, v], i) => i === 0 || v >= run[i - 1][1]) && at(1000) >= total * 0.5 && firstHalf > secondHalf, JSON.stringify([at(1000), at(1500), at(2000), total]));
      const end = await counts(mp);
      const after = await rowsPos(mp);
      check(`${tag}: the counter runs once when the block comes into view`, mid !== null, JSON.stringify(seen));
      check(`${tag}: the counter ends on the catalog values (total ${total})`, end.length === 7 && end.every((x) => x.shown === x.target) && +end[0].target === total, JSON.stringify(end));
      check(`${tag}: rows keep their place while counting`, posDuring === after && before.split("|").length === after.split("|").length, `${posDuring} / ${after}`);
      check(`${tag}: animated figures are hidden from assistive technology, the final value stays readable`, end.every((x) => x.hidden === "true") && (await mp.locator(".fides-uc-index__total .fides-ds-visually-hidden").textContent()).trim() === String(total) && (await mp.locator(".fides-uc-index__link").first().getAttribute("aria-label")).includes(end[1].target), "");
      await mp.evaluate(() => scrollTo(0, 0));
      await mp.waitForTimeout(300);
      await mp.evaluate(() => document.querySelector(".fides-uc-index").scrollIntoView({ block: "center" }));
      await mp.waitForTimeout(500);
      const again = await counts(mp);
      check(`${tag}: the counter does not run a second time`, again.every((x) => x.shown === x.target), JSON.stringify(again));
      await mo.close();
    }
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator(".fides-home-news__item").first().waitFor({ timeout: 30000 });

    // Learn links and hero actions navigate.
    await page.locator('.fides-home-readiness [data-readiness="topics"]').click();
    await page.waitForURL(/\/fides-design-pilot\/learn\/topics/, { timeout: 30000 });
    check(`${tag}: Topics & guides opens the Learn topics page`, true);
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator('.fides-home-readiness [data-readiness="sessions"]').click();
    await page.waitForURL(/\/fides-design-pilot\/learn\/sessions\/wallet-readiness-workshop/, { timeout: 30000 });
    check(`${tag}: Readiness Workshop opens the workshop page`, true);
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
  console.log(`spotlight block heights: ${JSON.stringify(heights)}`);
  console.log(failures ? `\n${failures} failed` : "\nall home checks passed");
  process.exit(failures ? 1 : 0);
})();
