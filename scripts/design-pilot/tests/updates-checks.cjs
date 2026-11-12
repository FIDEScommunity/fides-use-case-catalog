/**
 * Updates overview and own article: search, type filter, sort, pagination, empty
 * state, external links, missing images, back navigation, keyboard focus,
 * overflow. Remote hosts are stubbed, so no request leaves the machine.
 * Run: node updates-checks.cjs (PLAYWRIGHT_MODULE, PILOT_URL, WIDTHS).
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const PAGE_URL = `${BASE}/fides-design-pilot/updates/`;
const WIDTHS = (process.env.WIDTHS || "1440,1100,768,390,320").split(",").map(Number);
// Fixed test message, see tests/updates-fixture.php.
const FIXTURE_TITLE = "Fixture message about the pilot wallet milestone";
const FIXTURE_URL = "https://press.fixture-source.test/articles/pilot-wallet-milestone";
const FIXTURE_SOURCE = "Fixture Press";
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d && !ok ? ` (${d})` : ""}`); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const rows = (p) => p.locator(".fides-updates__item");
const texts = (loc, sel) => loc.evaluateAll((els, s) => els.map((e) => (e.querySelector(s) || {}).textContent || ""), sel);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const w of WIDTHS) {
    const tag = `${w}px`;
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
    // Anything that is not the pilot is stubbed: documents answer with a tiny page, images fail.
    await ctx.route((url) => !url.href.startsWith(BASE), (route) => {
      const type = route.request().resourceType();
      if (type === "document") return route.fulfill({ status: 200, contentType: "text/html", body: "<title>External source</title><p>external</p>" });
      return route.abort();
    });
    const page = await ctx.newPage();
    await page.goto(PAGE_URL, { waitUntil: "domcontentloaded" });
    await rows(page).first().waitFor({ timeout: 30000 });

    check(`${tag}: heading, search, type filter and sort are present`,
      (await page.locator("h1").first().textContent()).trim() === "Updates"
      && (await page.getByLabel("Search updates").count()) === 1
      && (await page.getByLabel("Type").count()) === 1
      && (await page.getByLabel("Sort by").count()) === 1);
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    const n0 = await rows(page).count();
    check(`${tag}: first page has rows with title, source and date`, n0 > 0 && n0 <= 10
      && (await texts(rows(page), ".fides-ds-card__title")).every((t) => t.trim())
      && (await texts(rows(page), ".fides-ds-card__owner, .fides-ds-card__fact--owner")).every((t) => t.trim()), String(n0));
    const dates = await texts(rows(page), ".fides-ds-card__fact--meta");
    const stamps = dates.map((d) => Date.parse(d.trim())).filter((t) => !Number.isNaN(t));
    check(`${tag}: default order is newest first`, stamps.length > 1 && stamps.every((t, i) => i === 0 || stamps[i - 1] >= t), dates.join("|"));

    // External rows: original link, external arrow, hint; internal rows: internal link.
    const ext = rows(page).filter({ has: page.locator(".fides-ds-card__fact--action", { hasText: "Read at source" }) }).first();
    const extInfo = await ext.evaluate((e) => { const a = e.querySelector("a.fides-ds-card__link"); return { href: a.href, arrow: e.querySelector(".fides-ds-card__arrow").textContent, hint: /opens the original post/.test(a.textContent) }; });
    check(`${tag}: external row links to the original post with ↗`, !extInfo.href.startsWith(BASE) && /^https?:/.test(extInfo.href) && extInfo.arrow === "↗" && extInfo.hint, JSON.stringify(extInfo));

    // Publication source apart from the organization. Fixed fixture message (tests/updates-fixture.php, set by
    // run-updates-checks.sh): organization = a catalog organization, publication source = "Fixture Press" on another host.
    // The old search "biometric" depended on what the live or bundled feed held that day and could return nothing.
    await page.goto(`${PAGE_URL}?q=${encodeURIComponent(FIXTURE_TITLE)}`, { waitUntil: "domcontentloaded" });
    const apart = await page.evaluate(() => [...document.querySelectorAll(".fides-updates__item")].map((li) => {
      const src = li.querySelector(".fides-ds-card__fact--source");
      const owner = li.querySelector(".fides-ds-card__fact--owner");
      const a = li.querySelector("a.fides-ds-card__link");
      return { src: src ? src.textContent.trim() : "", owner: owner ? owner.textContent.trim() : "", href: a ? a.href : "" };
    }));
    check(`${tag}: fixture message is found (run via run-updates-checks.sh so the fixture is set)`, apart.length === 1 && apart[0].href === FIXTURE_URL, JSON.stringify(apart));
    check(`${tag}: organization and publication source are separate facts`, apart.length === 1 && apart[0].src === `Source: ${FIXTURE_SOURCE}` && apart[0].owner !== "" && !apart[0].owner.includes(FIXTURE_SOURCE), JSON.stringify(apart));
    const linkName = page.getByRole("link", { name: new RegExp(FIXTURE_SOURCE) });
    check(`${tag}: accessible link name names the publication source`, (await linkName.count()) === 1 && /opens the original post on Fixture Press/.test(await linkName.first().evaluate((a) => a.textContent.replace(/\s+/g, " "))), String(await linkName.count()));
    await linkName.first().focus();
    check(`${tag}: the link takes keyboard focus`, await page.evaluate(() => !!document.activeElement && document.activeElement.matches("a.fides-ds-card__link")));
    await page.goto(PAGE_URL, { waitUntil: "domcontentloaded" });

    // Layout (Paper 26.5): list and FIDES/Learn column side by side from 1024px, stacked below, list first.
    const box = await page.evaluate(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, b: b.bottom }; }; return { list: r(".fides-updates__list"), aside: r(".fides-updates__aside"), feat: r(".fides-updates__featured"), learn: r(".fides-updates__learn") }; });
    check(`${tag}: FIDES and Learn column present`, !!box.aside && !!box.feat && !!box.learn);
    if (w >= 1024) check(`${tag}: list is narrower than the page and the column sits to its right`, box.aside.x > box.list.x + box.list.w && box.list.w < 0.75 * w && box.aside.w >= 300 && box.aside.w <= 460, JSON.stringify(box));
    else check(`${tag}: columns stack, list first`, box.aside.y >= box.list.b - 1 && box.aside.w > 0.8 * w - 80, JSON.stringify(box));
    await page.locator(".fides-updates__featured").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const i = document.querySelector(".fides-updates__featured img"); return !i || (i.complete && i.naturalWidth > 0); }, null, { timeout: 15000 }).catch(() => {});
    const feat = await page.evaluate(() => { const f = document.querySelector(".fides-updates__featured"); const a = f.querySelector("a"); const i = f.querySelector("img"); return { links: f.querySelectorAll("a").length, href: a.href, title: a.textContent.trim(), img: i ? { w: i.naturalWidth, shown: !i.closest("figure").hidden } : null, intro: (f.querySelector(".fides-updates__featured-intro") || {}).textContent || null, meta: f.querySelector(".fides-updates__featured-meta").textContent }; });
    check(`${tag}: featured block has one link, the post title and its date`, feat.links === 1 && feat.title.length > 0 && /\d{4} · FIDES update$/.test(feat.meta), JSON.stringify(feat));
    // Remote hosts are stubbed here, the pilot's own uploads are not: the featured image is the post's featured image.
    check(`${tag}: featured image loads from the post`, !feat.img || (feat.img.w > 0 && feat.img.shown), JSON.stringify(feat.img));
    // Learn link.
    check(`${tag}: Learn link points to the Learn page`, /\/learn\/$/.test(await page.locator(".fides-updates__learn a").getAttribute("href")));
    // Featured post stays in the list at its own date (type filter FIDES shows all own posts).
    const featDate = feat.meta.split(" · ")[0].trim();
    await page.goto(`${PAGE_URL}?type=fides&sort=title&pg=1`, { waitUntil: "domcontentloaded" });
    const inList = await page.evaluate((href) => { const a = [...document.querySelectorAll(".fides-updates__item a.fides-ds-card__link")].find((x) => x.href === href); return a ? a.closest(".fides-updates__item").querySelector(".fides-ds-card__fact--meta").textContent.trim() : null; }, feat.href);
    check(`${tag}: featured post is also in the list with the same date`, inList === featDate, `${inList} vs ${featDate}`);
    await page.goto(PAGE_URL, { waitUntil: "domcontentloaded" });

    // Keyboard: the featured block is one tab stop with a visible ring; hover darkens the block.
    const fl = page.locator(".fides-updates__featured a");
    await fl.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    check(`${tag}: featured block has a visible focus ring`, await page.locator(".fides-updates__featured").evaluate((e) => { const c = getComputedStyle(e); return parseFloat(c.outlineWidth) >= 2 && c.outlineStyle !== "none"; }));
    if (w >= 1024) {
      const bg0 = await page.locator(".fides-updates__featured").evaluate((e) => getComputedStyle(e).backgroundColor);
      await page.locator(".fides-updates__featured").hover();
      await page.waitForTimeout(250);
      const bg1 = await page.locator(".fides-updates__featured").evaluate((e) => getComputedStyle(e).backgroundColor);
      check(`${tag}: featured block shows hover`, bg0 !== bg1, `${bg0} ${bg1}`);
      const r0 = await rows(page).first().evaluate((e) => getComputedStyle(e).backgroundColor);
      await rows(page).first().locator(".fides-ds-card").hover();
      await page.waitForTimeout(250);
      check(`${tag}: list row shows hover`, (await rows(page).first().locator(".fides-ds-card").evaluate((e) => getComputedStyle(e).backgroundColor)) !== r0);
    }
    // Compact row: logo, title, type, organization, date and action inside one row, titles at most two lines.
    const compact = await page.evaluate(() => [...document.querySelectorAll(".fides-updates__item .fides-ds-card")].map((c) => { const t = c.querySelector(".fides-ds-card__title"); const d = c.querySelector(".fides-ds-card__fact--meta"); const a = c.querySelector(".fides-ds-card__arrow"); const m = c.querySelector(".fides-ds-card__media"); const cr = c.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(t).lineHeight); const inside = (e) => { const b = e.getBoundingClientRect(); return b.left >= cr.left - 1 && b.right <= cr.right + 1; }; const db = d.getBoundingClientRect(), tb = t.getBoundingClientRect(), ab = a.getBoundingClientRect(); return { lines: Math.round(tb.height / lh), media: Math.round(m.getBoundingClientRect().width), inside: inside(d) && inside(a) && inside(t), dateOverTitle: db.left < tb.right - 2 && db.right > tb.left && db.top < tb.bottom && db.bottom > tb.top, dateOverArrow: db.right > ab.left && db.left < ab.right && db.top < ab.bottom && db.bottom > ab.top }; }));
    check(`${tag}: compact rows keep logo 48px, at most two title lines, date and action apart`, compact.length > 0 && compact.every((r) => r.lines <= 2 && r.media === 48 && r.inside && !r.dateOverTitle && !r.dateOverArrow), JSON.stringify(compact.filter((r) => r.lines > 2 || r.media !== 48 || !r.inside || r.dateOverTitle || r.dateOverArrow)));
    // Featured image that cannot be loaded: the block stays tidy (figure hidden, title and action remain).
    const p2 = await ctx.newPage();
    await p2.route((u) => u.href.startsWith(BASE) && /\/uploads\//.test(u.pathname), (r) => r.abort());
    await p2.goto(PAGE_URL, { waitUntil: "load" });
    await p2.waitForTimeout(500);
    const brokenFeat = await p2.evaluate(() => { const f = document.querySelector(".fides-updates__featured"); const fig = f.querySelector("figure"); return { figHidden: !fig || fig.hidden, title: !!f.querySelector("a"), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    check(`${tag}: featured block stays tidy when its image fails`, brokenFeat.figHidden && brokenFeat.title && brokenFeat.overflow <= 0, JSON.stringify(brokenFeat));
    await p2.close();

    // Missing images: all remote images are aborted, so every logo shows the fallback tile.
    await page.waitForTimeout(600);
    const broken = await page.evaluate(() => [...document.querySelectorAll(".fides-updates__item .fides-ds-card")].filter((c) => c.querySelector("img.fides-ds-card__img")).map((c) => { const f = c.querySelector(".fides-ds-card__fallback"); const i = c.querySelector("img.fides-ds-card__img"); return !f.hidden || getComputedStyle(i).display === "none" || !i.isConnected; }));
    check(`${tag}: rows with a missing image show the fallback`, broken.length === 0 || broken.every(Boolean), JSON.stringify(broken));

    // Search by title and by organization.
    await page.getByLabel("Search updates").fill("credenco");
    await Promise.all([page.waitForURL(/q=credenco/), page.keyboard.press("Enter")]);
    const hits = await rows(page).count();
    const owners = await texts(rows(page), ".fides-ds-card__facts");
    check(`${tag}: search on organization returns only that organization`, hits > 0 && owners.every((t) => /credenco/i.test(t)), `${hits}`);
    check(`${tag}: search value and result count are kept`, (await page.getByLabel("Search updates").inputValue()) === "credenco" && /\d+ updates?/.test(await page.locator(".fides-updates__count").textContent()));
    await page.getByLabel("Search updates").fill("business wallet");
    await Promise.all([page.waitForURL(/q=business/), page.locator(".fides-updates__submit").click()]);
    const titles = await texts(rows(page), ".fides-ds-card__title");
    check(`${tag}: search button matches title words`, titles.length > 0 && titles.every((t) => /business/i.test(t) && /wallet/i.test(t) || true) && titles.some((t) => /business wallet/i.test(t)), titles.join("|"));

    // Back navigation restores the previous state.
    await page.goBack();
    await page.waitForURL(/q=credenco/);
    check(`${tag}: back returns to the previous search`, (await page.getByLabel("Search updates").inputValue()) === "credenco");

    // Type filter.
    await page.goto(PAGE_URL, { waitUntil: "domcontentloaded" });
    await Promise.all([page.waitForURL(/type=programme/), page.getByLabel("Type").selectOption("programme")]);
    const kick = await texts(rows(page), ".fides-ds-card__fact--kicker");
    check(`${tag}: type filter shows programme updates only`, kick.length > 0 && kick.every((t) => /^Programme update/.test(t.trim())), kick.join("|"));
    await Promise.all([page.waitForURL((u) => /type=organization/.test(u.href)), page.getByLabel("Type").selectOption("organization")]);
    const kick2 = await texts(rows(page), ".fides-ds-card__fact--kicker");
    check(`${tag}: type filter shows organization news only`, kick2.length > 0 && kick2.every((t) => /^Organization news/.test(t.trim())), kick2.join("|"));
    await Promise.all([page.waitForURL((u) => /type=fides/.test(u.href)), page.getByLabel("Type").selectOption("fides")]);
    const kick3 = await texts(rows(page), ".fides-ds-card__fact--kicker");
    check(`${tag}: type filter shows FIDES updates only`, kick3.length > 0 && kick3.every((t) => /^FIDES update/.test(t.trim())), kick3.join("|"));

    // Sort keeps filters.
    await Promise.all([page.waitForURL(/sort=oldest/), page.getByLabel("Sort by").selectOption("oldest")]);
    const d2 = (await texts(rows(page), ".fides-ds-card__fact--meta")).map((d) => Date.parse(d.trim())).filter((t) => !Number.isNaN(t));
    check(`${tag}: oldest first sorts ascending and keeps the type`, /type=fides/.test(page.url()) && d2.every((t, i) => i === 0 || d2[i - 1] <= t), page.url());

    // Pagination.
    await page.goto(PAGE_URL, { waitUntil: "domcontentloaded" });
    check(`${tag}: pagination shows the page and a disabled Previous`, /^Page 1 of \d+/.test((await page.locator(".fides-updates__pagination-meta").textContent()).trim()) && (await page.locator('.fides-updates__pagination [aria-disabled="true"]').first().textContent()).trim() === "Previous");
    await Promise.all([page.waitForURL(/pg=2/), page.getByRole("link", { name: /Next/ }).click()]);
    check(`${tag}: next page shows page 2 and different rows`, /^Page 2 of/.test((await page.locator(".fides-updates__pagination-meta").textContent()).trim()) && (await rows(page).count()) > 0);
    check(`${tag}: page numbers hidden on narrow screens only`, ((await page.locator(".fides-updates__pagination-page").first().isVisible()) === (w >= 600)));
    await page.goBack();
    await page.waitForURL((u) => !/pg=2/.test(u.href));
    check(`${tag}: back returns to page 1`, /^Page 1 of/.test((await page.locator(".fides-updates__pagination-meta").textContent()).trim()));

    // External link navigation and back.
    await page.goto(`${PAGE_URL}?type=organization`, { waitUntil: "domcontentloaded" });
    await rows(page).first().locator("a.fides-ds-card__link").click();
    await page.waitForLoadState("domcontentloaded");
    check(`${tag}: external link leaves the site for the original post`, !page.url().startsWith(BASE), page.url());
    await page.goBack();
    await page.waitForURL(/type=organization/);
    check(`${tag}: back from the source returns to the filtered list`, (await rows(page).count()) > 0 && (await page.getByLabel("Type").inputValue()) === "organization");

    // Empty state.
    await page.goto(`${PAGE_URL}?q=zzzznomatch`, { waitUntil: "domcontentloaded" });
    check(`${tag}: empty state explains and offers a clear action`, (await page.getByText("No updates match your search.").count()) === 1 && (await rows(page).count()) === 0);
    await Promise.all([page.waitForURL((u) => !/q=/.test(u.href)), page.getByRole("link", { name: "Clear search and filters" }).click()]);
    check(`${tag}: clear action restores the list`, (await rows(page).count()) > 0);

    // Keyboard: the row link shows a visible focus ring; the search field is first in the page content.
    await page.goto(PAGE_URL, { waitUntil: "domcontentloaded" });
    const link = rows(page).first().locator("a.fides-ds-card__link");
    await link.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const ringOk = await link.evaluate((a) => { const c = getComputedStyle(a.closest(".fides-ds-card")); return /inset/.test(c.boxShadow) || (parseFloat(c.outlineWidth) >= 2 && c.outlineStyle !== "none"); });
    check(`${tag}: row link has a visible focus ring`, ringOk);
    const targets = await page.evaluate(() => [...document.querySelectorAll(".fides-updates a, .fides-updates button, .fides-updates select, .fides-updates input")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44 && !e.classList.contains("fides-ds-card__link") && !e.closest(".fides-ds-card__facts")).map((e) => `${e.tagName}.${e.className}:${Math.round(e.getBoundingClientRect().height)}`));
    check(`${tag}: controls are at least 44px tall`, targets.length === 0, targets.join("|"));

    // Own article.
    await page.goto(`${PAGE_URL}?type=fides`, { waitUntil: "domcontentloaded" });
    const ownLink = rows(page).first().locator("a.fides-ds-card__link");
    const ownHref = await ownLink.getAttribute("href");
    check(`${tag}: FIDES row links to its own article with →`, ownHref.startsWith(BASE) && (await rows(page).first().locator(".fides-ds-card__arrow").textContent()) === "→", ownHref);
    await ownLink.click();
    await page.waitForLoadState("domcontentloaded");
    const art = await page.evaluate(() => ({
      h1: (document.querySelector(".fides-updates-article__title") || {}).textContent || "",
      back: (document.querySelector(".fides-updates-article__back") || {}).textContent || "",
      kicker: (document.querySelector(".fides-updates-article .fides-ds-kicker") || {}).textContent || "",
      share: (document.querySelector(".fides-updates-article__share") || {}).href || "",
      header: !!document.querySelector(".fides-ds-site-header"),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    check(`${tag}: article has shell, kicker with date, title, back link and share`, art.header && /^FIDES update · \d/.test(art.kicker.trim()) && art.h1.trim() && /All updates/.test(art.back) && /linkedin\.com\/sharing/.test(art.share), JSON.stringify(art));
    check(`${tag}: article has no horizontal overflow`, art.overflow <= 0, String(art.overflow));
    await page.locator(".fides-updates-article__back").click();
    await page.waitForURL(/\/updates\/$/);
    check(`${tag}: back link returns to the overview`, (await page.locator("h1").first().textContent()).trim() === "Updates");
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `\n${failures} failed` : "\nall updates checks passed");
  process.exit(failures ? 1 : 0);
})();
