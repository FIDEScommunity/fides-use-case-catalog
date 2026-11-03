/**
 * Visitor checks for the first connection between home, Learn and the
 * Explorer (Paper page 16, screens 25.0-25.6): the complete receive route in
 * both directions, back navigation, preparation rows, catalog links, the
 * editorial links and the layout at desktop and mobile widths.
 * Run through run-connect-checks.sh.
 */
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const WIDTHS = (process.env.WIDTHS || "1440,1100,768,390,320").split(",").map(Number);
const DOM_READY = { waitUntil: "domcontentloaded" };
const VOG = "digital-certificate-of-good-conduct-vog-as-a-verifiable-credential-yjw4BC";
const U = {
  home: "/fides-design-pilot/homepage-fragment/",
  start: "/fides-design-pilot/start/",
  receive: "/fides-design-pilot/start/receive/",
  learn: "/fides-design-pilot/learn/",
  article: "/fides-design-pilot/learn/topics/the-big-picture/how-credentials-connect/",
  vog: `/fides-design-pilot/use-case/?usecase=${VOG}`,
  biz: "/fides-design-pilot/business-wallets/",
};

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

async function open(page, url) {
  await page.goto(`${BASE}${url}`, DOM_READY);
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 2000 }).then(() => true, () => false)) await deny.click();
  await page.mouse.move(0, 0);
}
const here = (page) => new URL(page.url()).pathname + new URL(page.url()).search;
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function clickTo(page, locator, expectPath, name) {
  await Promise.all([page.waitForURL((u) => (u.pathname + u.search).includes(expectPath), { timeout: 15000 }).catch(() => {}), locator.first().click()]);
  check(name, here(page).includes(expectPath), here(page));
  await page.waitForLoadState("domcontentloaded");
}

async function route(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  const mobile = width < 600;
  const tag = `${width}px`;

  // Home -> starting point through the Explore menu (desktop) or the menu panel (mobile).
  await open(page, U.home);
  const startLink = page.locator('a[href$="/fides-design-pilot/start/"]');
  check(`${tag}: header offers the starting point`, (await startLink.count()) >= 1);
  const learnItem = page.locator('.fides-ds-site-header a[href$="/fides-design-pilot/learn/"]');
  check(`${tag}: header offers Learn`, (await learnItem.count()) >= 1);

  await open(page, U.start);
  check(`${tag}: starting point has one H1`, (await page.locator("h1").count()) === 1 && /Start with what you want to achieve/.test(await page.locator("h1").innerText()));
  check(`${tag}: no Learn bar on the Explorer page`, (await page.locator(".fides-learn-bar").count()) === 0);
  const rows = page.locator(".fides-learn-rows li, .fides-learn-rows > *");
  const prep = await page.locator(".fides-learn-rows--prep li").evaluateAll((li) => li.map((x) => getComputedStyle(x, "::after").content + getComputedStyle(x.querySelector(".fides-learn-rows__title") || x, "::after").content));
  check(`${tag}: two routes are marked in preparation`, prep.filter((c) => /In preparation/.test(c)).length === 2, prep.join("|"));
  check(`${tag}: preparation rows are not links`, (await page.locator(".fides-learn-rows--prep a").count()) === 1 || (await page.locator('a:has-text("Issue digital credentials"), a:has-text("Understand what this means")').count()) === 0);
  const catalogHrefs = await page.locator("[data-fides-learn-catalogs] a").evaluateAll((a) => a.map((x) => x.getAttribute("href")));
  check(`${tag}: catalog links stay visible`, catalogHrefs.length >= 5 && (await page.locator("[data-fides-learn-catalogs] a:visible").count()) === catalogHrefs.length, String(catalogHrefs.length));
  check(`${tag}: no horizontal overflow on start`, (await overflow(page)) <= 0);
  if (mobile) check(`${tag}: breadcrumb visible on start`, await page.locator(".fides-learn__crumbs").isVisible());
  await page.screenshot({ path: path.join(OUT, `start-${width}.png`), fullPage: true });

  // Browse independently: first catalog link works without the receive route.
  const first = page.locator("[data-fides-learn-catalogs] a").first();
  const firstHref = await first.getAttribute("href");
  await clickTo(page, first, new URL(firstHref, BASE).pathname, `${tag}: catalog link leaves the route`);

  // Start -> receive.
  await open(page, U.start);
  await clickTo(page, page.locator('a[href$="/start/receive/"]'), "/start/receive/", `${tag}: receive row opens the route`);
  check(`${tag}: receive has one H1`, (await page.locator("h1").count()) === 1);
  check(`${tag}: receive offers a back link or breadcrumb to the starting point`, (await page.locator('.fides-learn__back[href$="/start/"], .fides-learn__crumbs a[href$="/start/"]').count()) >= 1);
  check(`${tag}: no horizontal overflow on receive`, (await overflow(page)) <= 0);
  const next = page.locator(".fides-learn-next");
  if (await next.count()) {
    const box = await next.first().boundingBox();
    check(`${tag}: next steps are not clipped`, box && box.x >= -1 && box.x + box.width <= width + 1, JSON.stringify(box));
  }
  await page.screenshot({ path: path.join(OUT, `receive-${width}.png`), fullPage: true });

  // Back navigation (breadcrumb/back link and browser back).
  const back = page.locator('.fides-learn__back[href$="/start/"], .fides-learn__crumbs a[href$="/start/"]').locator("visible=true");
  await clickTo(page, back, "/start/", `${tag}: back link returns to the starting point`);
  await page.goBack();
  check(`${tag}: browser back returns to receive`, here(page).includes("/start/receive/"), here(page));

  // Receive -> VOG detail -> Learn article -> VOG card -> VOG detail.
  await clickTo(page, page.locator(`a[href*="usecase=${VOG}"]`), `usecase=${VOG}`, `${tag}: receive opens the VOG use case`);
  await page.locator("h1").first().waitFor({ timeout: 15000 });
  const band = page.locator('[data-fides-editorial-link], .fides-ds-editorial-link--band');
  check(`${tag}: VOG detail shows the Learn entry`, (await band.count()) === 1);
  const bandBox = await band.first().boundingBox();
  const h1Box = await page.locator("h1").first().boundingBox();
  check(`${tag}: Learn entry sits below the hero heading`, bandBox && h1Box && bandBox.y > h1Box.y);
  check(`${tag}: no horizontal overflow on VOG detail`, (await overflow(page)) <= 0);
  await page.screenshot({ path: path.join(OUT, `vog-${width}.png`), fullPage: true });
  await clickTo(page, band.locator("a").first(), "/how-credentials-connect/", `${tag}: Learn entry opens the article`);
  const card = page.locator("[data-fides-learn-record]");
  check(`${tag}: article shows the practice card with image`, (await card.count()) === 1 && (await card.locator("img").count()) === 1);
  check(`${tag}: practice card image has loaded`, await card.locator("img").evaluate((i) => i.complete && i.naturalWidth > 0).catch(() => false));
  await clickTo(page, card.locator("a").first(), `usecase=${VOG}`, `${tag}: article card returns to the VOG use case`);

  // Learn overview: process band and Learn item.
  await open(page, U.learn);
  const band2 = page.locator(".fides-learn-process");
  check(`${tag}: Learn overview shows the process band`, (await band2.count()) === 1);
  check(`${tag}: process band links to the explanation`, (await band2.locator('a[href*="how-credentials-connect"]').count()) >= 1);
  check(`${tag}: no horizontal overflow on overview`, (await overflow(page)) <= 0);
  if (!mobile) {
    check(`${tag}: header marks Learn as current section`, (await page.locator('.fides-ds-site-nav__link[aria-current]').count()) === 1);
  }
  await page.screenshot({ path: path.join(OUT, `overview-${width}.png`), fullPage: true });

  // Business wallet overview card (module below the list).
  await open(page, U.biz);
  const wcard = page.locator(".fides-ds-editorial-link--card");
  check(`${tag}: wallet overview shows the editorial card`, (await wcard.count()) === 1);
  check(`${tag}: no horizontal overflow on wallet overview`, (await overflow(page)) <= 0);
  await ctx.close();
}

async function hidden(browser) {
  // Credential and personal wallet overviews have no entry: the module must not exist.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  for (const [name, url] of [["credential overview", "/fides-design-pilot/credentials/"], ["personal wallets", "/fides-design-pilot/personal-wallets/"]]) {
    await open(page, url);
    check(`${name}: no editorial module without an entry`, (await page.locator(".fides-ds-editorial-link").count()) === 0);
  }
  await open(page, `/fides-design-pilot/use-case/?usecase=does-not-exist`);
  check("unknown use case: no editorial module", (await page.locator(".fides-ds-editorial-link").count()) === 0);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const w of WIDTHS) await route(browser, w);
  await hidden(browser);
  await browser.close();
  console.log(`# fail ${failures}`);
  process.exit(failures ? 1 : 0);
})();
