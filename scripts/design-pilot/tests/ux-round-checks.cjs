/**
 * UX round: featured use case block, business wallet Learn strip, Receive
 * practice card and next steps, keyboard focus and hover, no overflow, and
 * the hidden Services item. Run: node ux-round-checks.cjs (PLAYWRIGHT_MODULE, PILOT_URL).
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,1100,768,390,320").split(",").map(Number);
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d && !ok ? ` (${d})` : ""}`); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const ring = (loc) => loc.evaluate((e) => { const s = getComputedStyle(e); return parseFloat(s.outlineWidth) >= 2 && s.outlineStyle !== "none"; });

(async () => {
  const browser = await chromium.launch();
  for (const w of WIDTHS) {
    const tag = `${w}px`;
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
    const page = await ctx.newPage();

    // Homepage featured block.
    await page.goto(`${BASE}/fides-design-pilot/homepage-fragment/`, { waitUntil: "domcontentloaded" });
    const feat = page.locator(".fides-uc-featured .fides-ds-card--feature").first();
    await feat.waitFor({ timeout: 30000 });
    await feat.scrollIntoViewIfNeeded();
    await page.waitForFunction((sel) => { const i = document.querySelector(sel); return i && i.complete && i.naturalWidth > 0; }, ".fides-uc-featured img", { timeout: 30000 }).catch(() => {});
    const f = await feat.evaluate((e) => ({
      img: !!e.querySelector("img") && e.querySelector("img").complete && e.querySelector("img").naturalWidth > 0,
      title: (e.querySelector(".fides-ds-card__title") || {}).textContent || "",
      meta: (e.querySelector(".fides-ds-card__meta") || {}).textContent || "",
      action: !!e.querySelector("a"),
      years: ((e.querySelector(".fides-ds-card__meta") || {}).textContent || "").match(/2026/g)?.length || 0,
    }));
    check(`${tag}: featured block has image, title, status and action`, f.img && f.title.trim() && f.meta.trim() && f.action, JSON.stringify(f));
    check(`${tag}: award shown once with a name`, !/Winner|Finalist/.test(f.meta) || (/ · .+/.test(f.meta) && f.years <= 1), f.meta);
    check(`${tag}: featured: no horizontal overflow`, (await overflow(page)) <= 0);
    // Keyboard: Tab until the card link has focus; the card shows the ring.
    await feat.locator("a").first().evaluate((a) => a.setAttribute("data-ux-probe", "1"));
    await page.evaluate(() => window.scrollTo(0, 0));
    let reached = false;
    for (let i = 0; i < 80 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-ux-probe"));
    }
    check(`${tag}: featured card reachable by keyboard with a visible ring`, reached && (await ring(feat)), String(reached));

    // Business wallet strip.
    await page.goto(`${BASE}/fides-design-pilot/business-wallets/`, { waitUntil: "domcontentloaded" });
    const strip = page.locator(".fides-ds-editorial-link--strip");
    await strip.first().waitFor({ timeout: 60000 });
    const search = page.locator('input[placeholder^="Search business"]').first();
    const sb = await search.boundingBox();
    const tb = await strip.first().boundingBox();
    check(`${tag}: Learn strip above the search field`, tb && sb && tb.y + tb.height <= sb.y);
    check(`${tag}: Learn strip: one strip, no card`, (await strip.count()) === 1 && (await page.locator(".fides-ds-editorial-link--card").count()) === 0);
    const cross = page.locator(".fides-wallet-pilot__cross a");
    const cb = await cross.first().boundingBox();
    check(`${tag}: cross reference "Personal wallets" sits between the strip and the search`, (await cross.count()) === 1 && /Personal wallets/.test(await cross.first().textContent()) && cb && cb.y >= tb.y + tb.height && cb.y < sb.y);
    check(`${tag}: personal wallets reference is separate from the strip`, (await strip.locator("a", { hasText: "personal" }).count()) === 0);
    if (w >= 1100) check(`${tag}: search field in first screen`, sb && sb.y + sb.height < 520, String(sb && sb.y));
    const sl = strip.locator("a").first();
    await sl.focus();
    check(`${tag}: strip link focus ring`, await ring(sl));
    check(`${tag}: wallets: no horizontal overflow`, (await overflow(page)) <= 0);

    // Receive.
    await page.goto(`${BASE}/fides-design-pilot/start/receive/`, { waitUntil: "domcontentloaded" });
    const rec = page.locator(".fides-learn-practice .fides-learn-record").first();
    await rec.waitFor({ timeout: 30000 });
    await rec.scrollIntoViewIfNeeded();
    await page.waitForFunction((sel) => { const i = document.querySelector(sel); return i && i.complete && i.naturalWidth > 0; }, ".fides-learn-practice img", { timeout: 30000 }).catch(() => {});
    const img = rec.locator("img.fides-learn-record__image");
    const ib = await img.boundingBox();
    const hb = await rec.locator("h2").boundingBox();
    check(`${tag}: VOG image present and loaded`, (await img.count()) === 1 && (await img.evaluate((i) => i.complete && i.naturalWidth > 0)));
    if (w < 600) check(`${tag}: image above the text on mobile`, ib && hb && ib.y + ib.height <= hb.y);
    else check(`${tag}: image beside the text on wide screens`, ib && hb && ib.x + ib.width <= hb.x + 1);
    const next = page.locator(".fides-learn-next a");
    check(`${tag}: two next steps (explanation, workshop)`, (await next.count()) === 2 && /explanation/i.test(await next.nth(0).textContent()) && /Workshop/i.test(await next.nth(1).textContent()));
    await next.nth(1).focus();
    check(`${tag}: next step focus ring`, await ring(next.nth(1)));
    const nb = await next.nth(1).boundingBox();
    check(`${tag}: next step target at least 44px`, nb && nb.height >= 44, String(nb && nb.height));
    check(`${tag}: receive: no horizontal overflow`, (await overflow(page)) <= 0);

    // Services stays hidden.
    check(`${tag}: Services is not in the page`, (await page.locator("header a", { hasText: /^Services$/ }).count()) === 0);
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `# fail ${failures}` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
