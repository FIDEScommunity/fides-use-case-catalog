/**
 * Browser checks for the Services section: overview, readiness assessment and the enquiry route
 * (desktop, tablet, mobile, 320 px). Run through run-services-checks.sh.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const PILOT = process.env.PILOT_PATH || "/fides-design-pilot";
const SERVICES = `${PILOT}/services`;
const WIDTHS = (process.env.WIDTHS || "1440,1024,768,390,320").split(",").map(Number);
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}
async function go(page, url) {
  await page.goto(url.startsWith("http") ? url : `${BASE}${url}`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 2000 }).then(() => true, () => false)) await deny.click();
  await page.mouse.move(0, 0);
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  for (const width of WIDTHS) {
    const L = (w) => `${w}@${width}`;
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 700 });
    const page = await ctx.newPage();
    const posts = [];
    page.on("request", (r) => { if (r.method() !== "GET") posts.push(r.url()); });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    // ---- Overview
    await go(page, `${SERVICES}/`);
    const text = await page.locator("main").innerText();
    check(`${L("overview")}: one H1, shell header, no Learn bar, no overflow`, (await page.locator("h1").count()) === 1 && (await page.locator(".fides-ds-site-header").count()) === 1 && (await page.locator("[data-fides-learn-bar]").count()) === 0 && !(await overflow(page)));
    check(`${L("overview")}: Services is the current main navigation item`, await page.evaluate(() => [...document.querySelectorAll(".fides-ds-site-nav__link")].some((a) => a.textContent.trim() === "Services" && a.hasAttribute("aria-current"))) || width < 1000);
    const titles = await page.locator(".fides-learn-service .fides-ds-card__title").evaluateAll((els) => els.map((e) => [...e.querySelector("a").childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim()));
    check(`${L("overview")}: four services in order`, titles.join("|") === "Wallet readiness assessment|Use case and business case|Independent advice and selection|Project and ecosystem coordination", titles.join("|"));
    check(`${L("overview")}: no prices or price indications`, !/€|\bprice\b|\bfee\b|excluding VAT/i.test(text));
    const links = await page.locator(".fides-learn-service a.fides-ds-card__link").evaluateAll((a) => a.map((x) => x.href));
    check(`${L("overview")}: assessment goes to its page, the others to Contact`, /\/services\/wallet-readiness-assessment\/$/.test(links[0]) && links.slice(1).every((h) => /\/about-fides\/contact\/$/.test(h)), links.join("|"));
    check(`${L("overview")}: hero action and training link`, /\/about-fides\/contact\/$/.test(await page.locator(".fides-learn__actions a").first().evaluate((a) => a.href)) && (await page.locator('a[href$="/learn/sessions/"]').count()) >= 1);
    // Row pattern: hover fill, arrow and focus match the shared catalog row card.
    const row = page.locator(".fides-learn-service").first();
    const before = await row.evaluate((e) => getComputedStyle(e).backgroundColor);
    await row.hover();
    const after = await row.evaluate((e) => getComputedStyle(e).backgroundColor);
    const arrow = await row.locator(".fides-ds-card__arrow").evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }));
    check(`${L("overview")}: hover fills the row and the arrow, arrow is a 44px target`, before !== after && arrow.bg !== "rgb(242, 247, 255)" && arrow.w >= 44 && arrow.h >= 44, JSON.stringify({ before, after, arrow }));
    await page.mouse.move(0, 0);
    await row.locator("a.fides-ds-card__link").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const focus = await row.evaluate((e) => getComputedStyle(e).boxShadow);
    check(`${L("overview")}: keyboard focus is drawn on the row`, focus !== "none", focus);
    await page.screenshot({ path: `${process.env.SCREENS_DIR || "/tmp"}/services-${width}.png`, fullPage: true });

    // ---- Overview → assessment
    await page.locator(".fides-learn-service a.fides-ds-card__link").first().click();
    await page.waitForURL(/wallet-readiness-assessment/);
    check(`${L("assessment")}: one H1, no overflow, no JavaScript errors`, (await page.locator("h1").count()) === 1 && (await page.locator("h1").innerText()) === "Prepare your service for digital wallets." && !(await overflow(page)) && errors.length === 0, errors.join("|"));
    const crumbs = await page.locator(".fides-learn__crumbs li").allInnerTexts();
    check(`${L("assessment")}: breadcrumb Home / Services / assessment`, crumbs.join("/") === "Home/Services/Wallet readiness assessment", crumbs.join("/"));
    const a = await page.locator("main").innerText();
    check(`${L("assessment")}: covers, how it works, comparison, no price, no fixed duration, no promised report`, /The assessment can cover/.test(a) && /How it works/.test(a) && /Workshop or assessment\?/.test(a) && /agreed with you before the assessment starts/.test(a) && !/€|\bprice\b|\bfee\b|\bweeks?\b|\bdays?\b|written report|final report|roadmap/i.test(a));
    const details = await page.locator(".fides-learn-details dl > div").count();
    check(`${L("assessment")}: details box with four rows`, details === 4, String(details));
    if (width >= 900) {
      const g = await page.evaluate(() => { const b = document.querySelector(".fides-learn-offering__body").getBoundingClientRect(); const d = document.querySelector(".fides-learn-details").getBoundingClientRect(); const m = document.querySelector(".fides-learn-offering__body").getBoundingClientRect(); return { sideBySide: d.left >= b.right - 1 && Math.abs(d.top - b.top) < 40, bodyWidth: Math.round(m.width) }; });
      check(`${L("assessment")}: details box sits beside the text, line length limited`, g.sideBySide && g.bodyWidth <= 760, JSON.stringify(g));
    }
    const markers = await page.locator(".fides-learn-offering__body ul li").first().evaluate((li) => getComputedStyle(li).display + "/" + getComputedStyle(li.parentElement).listStyleType + "/" + getComputedStyle(li, "::marker").content);
    check(`${L("assessment")}: bullets stay visible`, !/none/.test(markers.split("/")[1]), markers);
    const hrefs = await page.locator("main a").evaluateAll((a) => a.map((x) => x.getAttribute("href")));
    check(`${L("assessment")}: links to enquiry with context, workshop and use cases`, hrefs.some((h) => /services\/enquiry\/\?offering=wallet-readiness-assessment$/.test(h)) && hrefs.some((h) => /learn\/sessions\/wallet-readiness-workshop\/$/.test(h)) && hrefs.some((h) => /\/overview\/$/.test(h)), hrefs.join("|"));
    // Links resolve (local ones).
    const local = [...new Set(hrefs.filter((h) => h && h.startsWith(BASE)))];
    let dead = [];
    for (const h of local) { const r = await page.request.get(h); if (r.status() >= 400) dead.push(h + " " + r.status()); }
    check(`${L("assessment")}: no dead local links`, dead.length === 0, dead.join("|"));
    // Focus on the primary action.
    await page.locator(".fides-learn__actions a").first().focus();
    const fo = await page.locator(".fides-learn__actions a").first().evaluate((e) => { const s = getComputedStyle(e); return s.outlineStyle + "/" + s.outlineWidth + "/" + s.boxShadow; });
    check(`${L("assessment")}: primary action shows focus`, !/^none\/0px\/none$/.test(fo), fo);
    const hs = await page.locator(".fides-learn__actions a").first().evaluate((e) => Math.round(e.getBoundingClientRect().height));
    check(`${L("assessment")}: primary action is at least 44px high`, hs >= 44, String(hs));

    // ---- Assessment → workshop → back
    await page.locator('.fides-learn-offering__lower a[href$="/wallet-readiness-workshop/"]').click();
    await page.waitForURL(/learn\/sessions\/wallet-readiness-workshop/);
    check(`${L("workshop")}: loads and links on to the assessment`, (await page.locator('a[href$="/services/wallet-readiness-assessment/"]').count()) >= 1 && !(await overflow(page)));
    await page.goBack();
    check(`${L("workshop")}: Back returns to the assessment`, /wallet-readiness-assessment/.test(page.url()));

    // ---- Assessment → use cases
    await go(page, `${SERVICES}/wallet-readiness-assessment/`);
    await page.locator('.fides-learn-offering__lower a[href$="/overview/"]').click();
    await page.waitForURL(/\/overview\//);
    await page.waitForSelector("h1", { timeout: 15000 });
    await page.waitForLoadState("load");
    check(`${L("usecases")}: use case overview opens`, (await page.locator("h1").count()) >= 1 && !(await overflow(page)));

    // ---- Assessment → enquiry (context) and back
    await go(page, `${SERVICES}/wallet-readiness-assessment/`);
    await page.locator(".fides-learn__actions a").first().click();
    await page.waitForURL(/services\/enquiry\//);
    const selected = await page.locator("#fides-learn-offering").inputValue();
    const ctx1 = await page.locator("[data-fides-learn-context-label]").innerText();
    const back = await page.locator("[data-fides-learn-back]").getAttribute("href");
    check(`${L("enquiry")}: assessment preselected, context and back link`, selected === "wallet-readiness-assessment" && ctx1 === "Services · Wallet readiness assessment" && /wallet-readiness-assessment\/$/.test(back), `${selected}|${ctx1}|${back}`);
    const options = await page.locator("#fides-learn-offering option").allInnerTexts();
    check(`${L("enquiry")}: only service contexts, no webinar interest, no dates`, options.join("|") === "No specific offering|Wallet readiness assessment" && (await page.locator("[data-fides-learn-date-field]").count()) === 0, options.join("|"));
    check(`${L("enquiry")}: no price or fee in the next steps`, !/€|\bprice\b|\bfee\b/i.test(await page.locator("main").innerText()));
    check(`${L("enquiry")}: local notice present, no overflow`, /Nothing you enter here is sent or stored/.test(await page.locator(".fides-learn-pilot-note").first().innerText()) && !(await overflow(page)));
    await page.locator("[data-fides-learn-remove-context]").click();
    check(`${L("enquiry")}: removing context resets label, back link and URL`, (await page.locator("[data-fides-learn-context-label]").innerText()) === "Services · no specific offering" && (await page.locator("[data-fides-learn-back-label]").innerText()) === "Back to Services" && !new URL(page.url()).searchParams.has("offering"));
    await page.selectOption("#fides-learn-offering", "wallet-readiness-assessment");
    await page.fill("#fides-learn-name", "Test Person");
    await page.fill("#fides-learn-email", "test@example.org");
    await page.fill("#fides-learn-org", "Test Org");
    await page.fill("#fides-learn-question", "A test question");
    await page.locator("[data-fides-learn-submit]").click();
    const res = page.locator("[data-fides-learn-result]");
    check(`${L("enquiry")}: submits locally, nothing posted`, (await res.isVisible()) && /Wallet readiness assessment/.test(await res.innerText()) && posts.length === 0, await res.innerText().catch(() => ""));
    await page.locator("[data-fides-learn-edit]").click();
    await page.locator("[data-fides-learn-back]").click();
    await page.waitForURL(/wallet-readiness-assessment\/$/);
    check(`${L("enquiry")}: back returns to the assessment`, true);
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `FAILED: ${failures}` : "All Services checks passed.");
  process.exit(failures ? 1 : 0);
})();
