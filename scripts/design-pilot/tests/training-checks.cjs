/**
 * Checks for the open training page (facts, dates, date-aware enquiry preview).
 * Run through run-training-checks.sh. Screenshots go to SCREENS_DIR.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const LEARN = process.env.LEARN_PATH || "/fides-design-pilot/learn";
const SHOTS = process.env.SCREENS_DIR || "/tmp";
const WIDTHS = (process.env.WIDTHS || "1440,1024,768,390,320").split(",").map(Number);
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}
async function go(page, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 2000 }).then(() => true, () => false)) await deny.click();
  await page.mouse.move(0, 0);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  for (const width of WIDTHS) {
    const L = (w) => `${w}@${width}`;
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 700 });
    const page = await ctx.newPage();
    const posts = [];
    page.on("request", (r) => { if (r.method() !== "GET") posts.push(r.url()); });

    await go(page, `${LEARN}/sessions/`);
    const hub = await page.locator(".fides-learn").innerText();
    check(`${L("hub")}: partnerships, next steps, no €1,999 or €3,950, no design notes, no jargon`, /Training partnerships/.test(hub) && !/1[.,]999|3[.,]950|Design preview|not built yet|scoped proposal|roadmap/i.test(hub));
    const cards = await page.locator(".fides-learn-offer").evaluateAll((els) => els.map((e) => ({
      title: [...e.querySelector("h2 a").childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim(),
      kicker: e.querySelector(".fides-ds-card__fact--format").textContent.trim(),
      line: [".fides-ds-card__fact--for", ".fides-ds-card__fact--price"].map((q) => e.querySelector(q).textContent.trim()).join(" · "),
      action: e.querySelector(".fides-ds-card__link .fides-ds-visually-hidden").textContent.replace(/[()]/g, "").trim(),
      href: e.querySelector(".fides-ds-card__link").getAttribute("href"),
      box: ["h2", ".fides-ds-card__facts", ".fides-ds-card__arrow"].map((s) => { const r = e.querySelector(s).getBoundingClientRect(); return [Math.round(r.left - e.getBoundingClientRect().left), Math.round(r.width)]; }),
      font: getComputedStyle(e.querySelector(".fides-ds-card__link")).fontSize,
    })));
    check(`${L("hub")}: three offer cards in order`, cards.map((c) => c.title).join("|") === "EUDI & Business Wallets in Practice|Wallet Introduction|Wallet Readiness Workshop", cards.map((c) => c.title).join("|"));
    check(`${L("hub")}: card facts show audience, format and price basis`, cards.length === 3 && /one-day/i.test(cards[0].kicker) && cards[0].line === "Individual participants · €999 per participant, excluding VAT" && cards[1].line === "Your own team · From €1,495 per session, excluding VAT" && cards[2].line === "Your own team · From €3,750 per workshop, excluding VAT", JSON.stringify(cards.map((c) => [c.kicker, c.line])));
    check(`${L("hub")}: card actions are labelled and consistent`, cards.map((c) => c.action).join("|") === "View training|View introduction session|View workshop" && new Set(cards.map((c) => c.font)).size === 1, cards.map((c) => c.action).join("|"));
    if (width >= 900) check(`${L("hub")}: title, facts and action sit in the same columns`, new Set(cards.map((c) => c.box.map((b) => b.join(":")).join("/"))).size === 1, JSON.stringify(cards.map((c) => c.box)));
    // Prices are written once: each card repeats the price row of its own offering page.
    for (const c of cards) {
      await go(page, c.href.replace(BASE, ""));
      const detail = await page.locator(".fides-learn-details dl > div").evaluateAll((d) => Object.fromEntries(d.map((x) => [x.querySelector("dt").textContent.trim(), x.querySelector("dd").textContent.trim()])));
      check(`${L(c.title)}: detail page shows the same For, Format and Price as the card`, c.kicker === detail.Format && c.line === `${detail.For} · ${detail.Price}`, JSON.stringify(detail));
      const body = await page.locator(".fides-learn").innerText();
      check(`${L(c.title)}: no invented duration, group size or inclusions for inhouse offers, no €3,950`, !/3[.,]950/.test(body) && (c.title.startsWith("EUDI") || (!/Duration|Group size|included|includes/i.test(await page.locator(".fides-learn-details").innerText()))));
      if (!c.title.startsWith("EUDI")) check(`${L(c.title)}: final price sentence`, (await page.locator(".fides-learn-details__note").innerText()) === "The final price is agreed in a proposal before booking.");
      if (c.title.includes("Workshop")) check(`${L(c.title)}: no promise of a full assessment, roadmap or written report`, !/roadmap|written report|full assessment|final report/i.test(body) && !/Design preview|not built yet/i.test(body));
    }
    await go(page, `${LEARN}/sessions/`);

    await go(page, `${LEARN}/sessions/eudi-business-wallets-in-practice/`);
    const t = await page.locator(".fides-learn").innerText();
    check(`${L("training")}: facts box with price, duration, group size`, /€999/.test(t) && /One day/.test(t) && /6.16 participants/.test(t) && (await page.locator(".fides-learn-details").count()) === 1);
    check(`${L("training")}: no venue address, no €1,999`, !/1[.,]999/.test(t) && !/straat|\d{4}\s?[A-Z]{2}\b/.test(t) && /exact venue will be shared/i.test(t));
    const rows = await page.locator("#dates .fides-ds-card--row").count();
    check(`${L("training")}: four date rows`, rows === 4, String(rows));
    const hrefs = await page.locator("#dates a").evaluateAll((a) => a.map((x) => x.getAttribute("href")));
    check(`${L("training")}: date links carry offering and date`, hrefs.length === 4 && hrefs.every((h) => /offering=eudi-business-wallets-in-practice&date=/.test(h)), hrefs.join("|"));
    check(`${L("training")}: no horizontal overflow`, !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
    await page.screenshot({ path: `${SHOTS}/training-${width}.png`, fullPage: true });

    await page.locator("#dates a").nth(1).click();
    await page.waitForURL(/request\/\?/);
    check(`${L("form")}: offering and date prefilled`, (await page.locator("#fides-learn-offering").inputValue()) === "eudi-business-wallets-in-practice" && /14-january/.test(await page.locator("#fides-learn-date").inputValue()), await page.locator("#fides-learn-date").inputValue());
    check(`${L("form")}: date field visible, timing hidden`, (await page.locator("[data-fides-learn-date-field]").isVisible()) && !(await page.locator("[data-fides-learn-timing-field]").isVisible()));
    check(`${L("form")}: question is optional`, !(await page.locator("#fides-learn-question").evaluate((e) => e.required)));
    await page.screenshot({ path: `${SHOTS}/training-form-${width}.png`, fullPage: true });
    await page.fill("#fides-learn-name", "Test Person");
    await page.fill("#fides-learn-email", "test@example.org");
    await page.fill("#fides-learn-org", "Test Org");
    await page.locator("[data-fides-learn-submit]").click();
    const res = page.locator("[data-fides-learn-result]");
    check(`${L("form")}: submits locally with the date, nothing posted`, (await res.isVisible()) && /14 January 2027/.test(await res.innerText()) && posts.length === 0, await res.innerText().catch(() => ""));
    await page.locator("[data-fides-learn-edit]").click();
    await page.selectOption("#fides-learn-offering", "wallet-introduction");
    check(`${L("form")}: other offering hides date, shows timing`, !(await page.locator("[data-fides-learn-date-field]").isVisible()) && (await page.locator("[data-fides-learn-timing-field]").isVisible()) && (await page.locator("#fides-learn-question").evaluate((e) => e.required)));

    for (const u of ["wallet-introduction/", "wallet-readiness-workshop/", "training-partnerships/"]) {
      await go(page, `${LEARN}/sessions/${u}`);
      const bad = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      check(`${L(u)}: loads, one H1, no overflow`, (await page.locator("h1").count()) === 1 && !bad);
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `FAILED: ${failures}` : "All Training checks passed.");
  process.exit(failures ? 1 : 0);
})();
