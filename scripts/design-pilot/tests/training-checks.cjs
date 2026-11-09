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
    check(`${L("hub")}: three offers, partnerships, no €1,999`, /EUDI & Business Wallets in Practice/.test(hub) && /Wallet Introduction/.test(hub) && /Wallet Readiness Workshop/.test(hub) && /Training partnerships/.test(hub) && !/1[.,]999/.test(hub));

    await go(page, `${LEARN}/sessions/eudi-business-wallets-in-practice/`);
    const t = await page.locator(".fides-learn").innerText();
    check(`${L("training")}: facts box with price, duration, group size`, /€999/.test(t) && /One day/.test(t) && /6.16 participants/.test(t) && (await page.locator(".fides-learn-details").count()) === 1);
    check(`${L("training")}: no venue address, no €1,999`, !/1[.,]999/.test(t) && !/straat|\d{4}\s?[A-Z]{2}\b/.test(t) && /exact venue will be shared/i.test(t));
    const rows = await page.locator("#dates tbody tr").count();
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
