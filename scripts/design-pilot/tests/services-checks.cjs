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

/** Services lives under About FIDES: current state, keyboard and touch targets on desktop and in the mobile menu. */
async function checkNavigation(page, L, width, where) {
  const header = await page.evaluate(() => ({
    mainServices: [...document.querySelectorAll(".fides-ds-site-nav__link")].some((a) => a.textContent.trim() === "Services"),
    toggle: (document.querySelector('[aria-controls="fides-ds-panel-about"]') || {}).getAttribute ? document.querySelector('[aria-controls="fides-ds-panel-about"]').getAttribute("aria-current") : null,
  }));
  check(`${L(where)}: Services is not a main item, About FIDES is the current dropdown`, !header.mainServices && header.toggle === "true", JSON.stringify(header));
  if (width >= 1100) {
    const toggle = page.locator('[aria-controls="fides-ds-panel-about"]');
    await toggle.focus();
    await page.keyboard.press("Enter");
    const opened = (await toggle.getAttribute("aria-expanded")) === "true";
    const link = page.locator("#fides-ds-panel-about a", { hasText: /^Services/ });
    const cur = await link.getAttribute("aria-current");
    check(`${L(where)}: About FIDES opens with Enter and lists Services as current`, opened && (cur === "page" || cur === "true"), String(cur));
    await page.keyboard.press("Escape");
    check(`${L(where)}: Escape closes About FIDES and returns focus to its button`, (await toggle.getAttribute("aria-expanded")) === "false" && (await page.evaluate(() => document.activeElement && document.activeElement.getAttribute("aria-controls") === "fides-ds-panel-about")));
    await page.keyboard.press("Space");
    check(`${L(where)}: Space opens About FIDES`, (await toggle.getAttribute("aria-expanded")) === "true");
    await page.keyboard.press("Tab");
    const first = await page.evaluate(() => document.activeElement.textContent.trim());
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const order = await page.evaluate(() => document.activeElement.textContent.trim());
    check(`${L(where)}: Tab walks About, Manifesto and Services inside the panel`, /^About FIDES/.test(first) && /^Services/.test(order), `${first}|${order}`);
    await page.keyboard.press("Escape");
    await toggle.focus();
    await page.keyboard.press("ArrowDown");
    check(`${L(where)}: ArrowDown on the closed button opens the panel`, (await toggle.getAttribute("aria-expanded")) === "true");
    await page.keyboard.press("Escape");
    const targets = await page.evaluate(() => [document.querySelector('[aria-controls="fides-ds-panel-about"]')].map((e) => Math.round(e.getBoundingClientRect().height)));
    check(`${L(where)}: About FIDES button is tall enough`, targets[0] >= 36, String(targets));
  } else {
    const burger = page.locator("[data-fides-ds-menu-open]");
    await burger.focus();
    await page.keyboard.press("Enter");
    await page.locator("#fides-ds-menu").waitFor({ state: "visible" });
    const summary = page.locator("#fides-ds-menu summary", { hasText: "About FIDES" });
    const open = await page.evaluate(() => { const d = [...document.querySelectorAll("#fides-ds-menu details")].find((x) => /About FIDES/.test(x.querySelector("summary").textContent)); return d ? d.open : null; });
    const link = page.locator("#fides-ds-menu details a", { hasText: /^Services$/ });
    const cur = await link.getAttribute("aria-current");
    const sizes = await page.evaluate(() => ["#fides-ds-menu details summary", "#fides-ds-menu details a"].map((s) => { const el = [...document.querySelectorAll(s)].find((x) => x.offsetParent && /About FIDES|^Services$/.test(x.textContent.trim())); return el ? Math.round(el.getBoundingClientRect().height) : 0; }));
    check(`${L(where)}: mobile menu has About FIDES open with Services as current, targets at least 44px`, open === true && (cur === "page" || cur === "true") && sizes.every((h) => h >= 43), JSON.stringify({ open, cur, sizes }));
    await summary.focus();
    await page.keyboard.press("Enter");
    const closed = await page.evaluate(() => { const d = [...document.querySelectorAll("#fides-ds-menu details")].find((x) => /About FIDES/.test(x.querySelector("summary").textContent)); return d.open; });
    await page.keyboard.press("Enter");
    check(`${L(where)}: Enter on the About FIDES summary toggles it`, closed === false);
    check(`${L(where)}: no overflow with the menu open`, !(await overflow(page)));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelector("#fides-ds-menu").hidden, null, { timeout: 3000 }).catch(() => {});
  }
}

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
    await checkNavigation(page, L, width, "overview");
    const h1 = await page.locator("h1").evaluate((e) => { const s = getComputedStyle(e); return `${s.fontSize}/${s.lineHeight}`; });
    const want = width >= 1100 ? "36px/42px" : width >= 600 ? "34px/40px" : "30px/34px";
    check(`${L("overview")}: H1 uses the shared detail-title size (${want})`, h1 === want, h1);
    const hero = await page.evaluate(() => ({ firstRow: Math.round(document.querySelector(".fides-learn-service").getBoundingClientRect().top), vh: innerHeight }));
    check(`${L("overview")}: the first service starts early on the page`, width >= 1100 ? hero.firstRow <= 600 : hero.firstRow <= hero.vh * 0.75, JSON.stringify(hero));
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
    const ah1 = await page.locator("h1").evaluate((e) => { const s = getComputedStyle(e); return `${s.fontSize}/${s.lineHeight}`; });
    check(`${L("assessment")}: H1 is ${want} like Paper 30.3 (not 48/52)`, ah1 === want, ah1);
    if (width >= 1100) await checkNavigation(page, L, width, "assessment");
    const crumbs = await page.locator(".fides-learn__crumbs li").allInnerTexts();
    check(`${L("assessment")}: breadcrumb Home / Services / assessment`, crumbs.join("/") === "Home/Services/Wallet readiness assessment", crumbs.join("/"));
    const a = await page.locator("main").innerText();
    check(`${L("assessment")}: covers, how it works, comparison, no price, no fixed duration, no promised report`, /The assessment can cover/.test(a) && /How it works/.test(a) && /Workshop or assessment\?/.test(a) && /agreed with you before the assessment starts/.test(a) && !/€|\bprice\b|\bfee\b|\bweeks?\b|\bdays?\b|written report|final report|roadmap/i.test(a));
    const details = await page.locator(".fides-learn-details dl > div").count();
    check(`${L("assessment")}: details box with five rows, ending in the availability line`, details === 5 && (await page.locator(".fides-learn-details dl > div").last().innerText()).replace(/\s+/g, " ") === "Availability Primarily available in the Netherlands. Contact us to discuss your requirements and location.", String(details));
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
    const next = await page.locator(".fides-learn-request__aside .fides-learn__content").innerText();
    check(`${L("enquiry")}: "What happens next" says it describes the live process`, /What happens next/.test(next) && /preview\. Once it is live/.test(next) && /We will read your enquiry/.test(next), next.slice(0, 200));
    check(`${L("enquiry")}: JavaScript texts are also in the page as translatable strings`, (await page.locator("[data-fides-learn-strings] li").count()) >= 14 && (await page.locator('[data-fides-learn-strings] li[data-key="back"]').textContent()) === "Back to %s");
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
    // ---- Dutch route: texts, links stay under /nl/, JavaScript texts translate, English fallback is gone for these pages
    if (width === 1440 || width <= 390) {
      await go(page, `/nl${SERVICES}/`);
      const nlText = await page.locator("main").innerText();
      check(`${L("nl")}: overview is Dutch`, /Praktische ondersteuning bij digitale wallets en credentials\./.test(nlText) && /Waarmee kunnen wij u helpen\?/.test(nlText) && !/Practical support for/.test(nlText));
      const nlLinks = await page.locator("main a[href]").evaluateAll((a) => a.map((x) => x.getAttribute("href")).filter((h) => h && !/^(https?:)?\/\/(?!localhost)/.test(h) && !h.startsWith("#")));
      check(`${L("nl")}: internal links stay in the Dutch route`, nlLinks.length >= 3 && nlLinks.every((h) => /^(https?:\/\/localhost:\d+)?\/nl\//.test(h)), nlLinks.join("|"));
      const nlHeader = await page.evaluate(() => ({ about: [...document.querySelectorAll("#fides-ds-panel-about a")].map((a) => a.textContent.trim().replace(/ →$/, "")), cur: document.querySelector('[aria-controls="fides-ds-panel-about"]').getAttribute("aria-current") }));
      check(`${L("nl")}: About FIDES panel keeps Services current and links stay in /nl/`, nlHeader.cur === "true" && nlHeader.about.includes("Diensten"), JSON.stringify(nlHeader));
      check(`${L("nl")}: no overflow`, !(await overflow(page)));
      await go(page, `/nl${SERVICES}/wallet-readiness-assessment/`);
      const nlAssess = await page.locator("main").innerText();
      check(`${L("nl")}: assessment is Dutch, with the availability line`, /Bereid uw dienst voor op digitale wallets\./.test(nlAssess) && /Vooral beschikbaar in Nederland\./.test(nlAssess) && !(await overflow(page)));
      await go(page, `/nl${SERVICES}/enquiry/?offering=wallet-readiness-assessment`);
      const nlCtx = await page.locator("[data-fides-learn-context-label]").innerText();
      const nlBack = await page.locator("[data-fides-learn-back-label]").innerText();
      check(`${L("nl")}: enquiry context and back link are Dutch`, nlCtx === "Diensten · Wallet readiness assessment" && nlBack === "Terug naar Wallet readiness assessment", `${nlCtx}|${nlBack}`);
      await page.locator("[data-fides-learn-remove-context]").click();
      await page.waitForFunction(() => /geen specifiek aanbod/.test(document.querySelector("[data-fides-learn-context-label]").textContent), null, { timeout: 5000 }).catch(() => {});
      check(`${L("nl")}: removing the context gives Dutch texts`, (await page.locator("[data-fides-learn-context-label]").innerText()) === "Diensten · geen specifiek aanbod" && (await page.locator("[data-fides-learn-back-label]").innerText()) === "Terug naar Diensten" && (await page.locator("[data-fides-learn-return-label]").innerText()) === "Terug naar Diensten");
      await page.selectOption("#fides-learn-offering", "wallet-readiness-assessment");
      await page.locator("[data-fides-learn-submit]").click();
      await page.waitForFunction(() => /Welke dienst/.test(document.querySelector("[data-fides-learn-question-label]").textContent), null, { timeout: 5000 }).catch(() => {});
      await page.locator("[data-fides-learn-submit]").click();
      await page.waitForTimeout(300);
      const nlErrors = await page.locator("[data-fides-learn-summary]").innerText();
      check(`${L("nl")}: validation messages are Dutch`, /Controleer uw invoer/.test(nlErrors) && /Vul een waarde in voor Naam\./.test(nlErrors) && /Vul uw e-mailadres in\./.test(nlErrors), nlErrors);
      await page.fill("#fides-learn-name", "Test Persoon");
      await page.fill("#fides-learn-email", "test@example.org");
      await page.fill("#fides-learn-org", "Test Org");
      await page.fill("#fides-learn-question", "Een testvraag");
      await page.locator("[data-fides-learn-submit]").click();
      await page.waitForFunction(() => document.querySelector("[data-fides-learn-result]") && /Aanbod:/.test(document.querySelector("[data-fides-learn-result]").innerText), null, { timeout: 5000 }).catch(() => {});
      const nlRes = await page.locator("[data-fides-learn-result]").innerText();
      check(`${L("nl")}: preview result is Dutch and says nothing was sent`, /Alleen een voorbeeld: er is niets verstuurd/.test(nlRes) && /Aanbod: Wallet readiness assessment/.test(nlRes));
      const nlNext = await page.locator(".fides-learn-request__aside .fides-learn__content").innerText();
      check(`${L("nl")}: "What happens next" is Dutch and refers to after launch`, /Zodra het live staat/.test(nlNext));
      posts.length = 0;
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `FAILED: ${failures}` : "All Services checks passed.");
  process.exit(failures ? 1 : 0);
})();
