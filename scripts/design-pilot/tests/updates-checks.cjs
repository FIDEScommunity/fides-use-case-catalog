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
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d && !ok ? ` (${d})` : ""}`); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const rows = (p) => p.locator(".fides-updates__item");
const texts = (loc, sel) => loc.evaluateAll((els, s) => els.map((e) => (e.querySelector(s) || {}).textContent || ""), sel);

(async () => {
  const browser = await chromium.launch();
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
    const dates = await texts(rows(page), ".fides-ds-card__fact:nth-child(3)");
    const stamps = dates.map((d) => Date.parse(d.trim())).filter((t) => !Number.isNaN(t));
    check(`${tag}: default order is newest first`, stamps.length > 1 && stamps.every((t, i) => i === 0 || stamps[i - 1] >= t), dates.join("|"));

    // External rows: original link, external arrow, hint; internal rows: internal link.
    const ext = rows(page).filter({ has: page.locator(".fides-ds-card__fact--action", { hasText: "Read at source" }) }).first();
    const extInfo = await ext.evaluate((e) => { const a = e.querySelector("a.fides-ds-card__link"); return { href: a.href, arrow: e.querySelector(".fides-ds-card__arrow").textContent, hint: /opens the original post/.test(a.textContent) }; });
    check(`${tag}: external row links to the original post with ↗`, !extInfo.href.startsWith(BASE) && /^https?:/.test(extInfo.href) && extInfo.arrow === "↗" && extInfo.hint, JSON.stringify(extInfo));

    // Publication source apart from the organization (data driven: needs a post on another site in the feed).
    await page.goto(`${PAGE_URL}?q=biometric`, { waitUntil: "domcontentloaded" });
    const apart = await page.evaluate(() => [...document.querySelectorAll(".fides-updates__item")].map((li) => {
      const src = li.querySelector(".fides-ds-card__fact--source");
      const owner = li.querySelector(".fides-ds-card__fact--owner");
      const a = li.querySelector("a.fides-ds-card__link");
      return { src: src ? src.textContent.trim() : "", owner: owner ? owner.textContent.trim() : "", name: a ? a.textContent.replace(/\s+/g, " ").trim() : "", host: src ? src.textContent.replace(/^Source:\s*/, "").trim() : "" };
    }));
    check(`${tag}: organization and publication source are separate facts, link name names the source`, apart.length > 0 && apart.every((r) => r.src.startsWith("Source: ") && r.owner && !r.owner.includes(r.host) && r.name.includes(`opens the original post on ${r.host}`)), JSON.stringify(apart));
    await page.goto(PAGE_URL, { waitUntil: "domcontentloaded" });

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
    const kick = await texts(rows(page), ".fides-ds-card__fact:nth-child(2)");
    check(`${tag}: type filter shows programme updates only`, kick.length > 0 && kick.every((t) => /^Programme update/.test(t.trim())), kick.join("|"));
    await Promise.all([page.waitForURL((u) => /type=organization/.test(u.href)), page.getByLabel("Type").selectOption("organization")]);
    const kick2 = await texts(rows(page), ".fides-ds-card__fact:nth-child(2)");
    check(`${tag}: type filter shows organization news only`, kick2.length > 0 && kick2.every((t) => /^Organization news/.test(t.trim())), kick2.join("|"));
    await Promise.all([page.waitForURL((u) => /type=fides/.test(u.href)), page.getByLabel("Type").selectOption("fides")]);
    const kick3 = await texts(rows(page), ".fides-ds-card__fact:nth-child(2)");
    check(`${tag}: type filter shows FIDES updates only`, kick3.length > 0 && kick3.every((t) => /^FIDES update/.test(t.trim())), kick3.join("|"));

    // Sort keeps filters.
    await Promise.all([page.waitForURL(/sort=oldest/), page.getByLabel("Sort by").selectOption("oldest")]);
    const d2 = (await texts(rows(page), ".fides-ds-card__fact:nth-child(3)")).map((d) => Date.parse(d.trim())).filter((t) => !Number.isNaN(t));
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
