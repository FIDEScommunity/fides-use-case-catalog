/**
 * Route checks for Learn > Training & workshops > offering > enquiry preview.
 * Covers context, back navigation, validation, the local result and the
 * guarantee that nothing is posted. Run through run-sessions-checks.sh.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const LEARN = process.env.LEARN_PATH || "/fides-design-pilot/learn";
const WIDTHS = (process.env.WIDTHS || "1440,1100,768,390,320").split(",").map(Number);
const DOM_READY = { waitUntil: "domcontentloaded" };
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}
async function go(page, url) {
  await page.goto(`${BASE}${url}`, DOM_READY);
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 2000 }).then(() => true, () => false)) await deny.click();
  await page.mouse.move(0, 0);
}
async function layout(page, label) {
  const s = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    h1s: document.querySelectorAll("h1").length,
    headers: document.querySelectorAll(".fides-ds-site-header").length,
    small: [...document.querySelectorAll(".fides-learn a, .fides-learn button, .fides-learn select, .fides-learn input")].filter((e) => {
      const r = e.getBoundingClientRect();
      const st = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && !e.closest(".fides-learn__content p, .fides-learn__content li, .fides-learn-form__privacy, .fides-learn__crumbs, .fides-learn-rows, .fides-learn-note") && r.height < 40 && !e.classList.contains("fides-learn__back");
    }).map((e) => e.textContent.trim().slice(0, 30)),
    text: document.body.innerText,
  }));
  check(`${label}: single H1 and shared header, no overflow`, s.h1s === 1 && s.headers === 1 && !s.overflow, JSON.stringify(s));
  check(`${label}: no design notes and no unapproved price`, !/VOORSTEL|Cursor-implementatie|1[.,]999/i.test(s.text));
  check(`${label}: controls are at least 40px high`, s.small.length === 0, s.small.join("|"));
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 700 });
    const page = await ctx.newPage();
    const posts = [];
    page.on("request", (r) => { if (r.method() !== "GET") posts.push(`${r.method()} ${r.url()}`); });
    const L = (w) => `${w}@${width}`;

    // Learn -> Training & workshops via the Learn bar or mobile menu.
    await go(page, `${LEARN}/`);
    await layout(page, L("overview"));
    const offerLinks = await page.locator('.fides-learn-rows a[href*="/sessions/"]').evaluateAll((a) => a.map((x) => x.getAttribute("href")));
    check(`${L("overview")}: both offerings link to their pages`, offerLinks.some((h) => h.includes("wallet-introduction")) && offerLinks.some((h) => h.includes("wallet-readiness-workshop")), offerLinks.join("|"));
    await page.locator('.fides-learn a:has-text("Training & workshops")').first().click();
    await page.waitForURL(/\/sessions\/$/);
    check(`${L("sessions")}: reached from the overview`, true);
    await layout(page, L("sessions"));
    const body = await page.locator("main, .fides-learn").first().innerText();
    check(`${L("sessions")}: webinars are in preparation without dates or booking`, /Webinars & roundtables/i.test(body) && !/\b(20\d\d)\b/.test(body.replace(/FIDES Labs.*/s, "")) && /expression of interest, not a booking/i.test(body));
    check(`${L("sessions")}: follow-up steps are labelled previews, not links`, (await page.locator('.fides-learn a[href*="assessment"], .fides-learn a[href*="business-case"]').count()) === 0 && /Architecture Assessment/.test(body) && /Use Case & Business Case Development/.test(body));
    check(`${L("sessions")}: Training tab is active`, (await page.locator(".fides-learn-bar [aria-current]").first().innerText()).match(/Training/) !== null);

    // Offering detail.
    for (const [slug, label, ask] of [["wallet-introduction", "Wallet Introduction", /Discuss an introduction session/], ["wallet-readiness-workshop", "Wallet Readiness Workshop", /Discuss a workshop/]]) {
      await go(page, `${LEARN}/sessions/`);
      await page.locator(`.fides-learn a[href$="/sessions/${slug}/"]`).first().click();
      await page.waitForURL(new RegExp(`${slug}/$`));
      await layout(page, L(slug));
      const t = await page.locator(".fides-learn").innerText();
      check(`${L(slug)}: shows audience/format, practical details and request action`, /For\b/.test(t) && /Format/.test(t) && /Indicative price/.test(t) && (await page.locator(".fides-learn-details").count()) === 1 && ask.test(t));
      await page.locator(`.fides-learn__actions a:has-text("Discuss")`).first().click();
      await page.waitForURL(/\/sessions\/request\/\?offering=/);
      const sel = await page.locator("#fides-learn-offering").inputValue();
      check(`${L(slug)}: enquiry keeps the chosen offering`, sel === slug && (await page.locator("[data-fides-learn-context-label]").innerText()).includes(label));
      await layout(page, L(`${slug} enquiry`));
      check(`${L(slug)}: back link returns to the offering`, new URL(await page.locator("[data-fides-learn-back]").evaluate((a) => a.href)).pathname.endsWith(`/sessions/${slug}/`));
      await page.locator("[data-fides-learn-back]").click();
      await page.waitForURL(new RegExp(`${slug}/$`));
      check(`${L(slug)}: back to offering works`, true);
      await page.goBack();
      await page.waitForURL(/\/request\//);
      check(`${L(slug)}: browser back returns to the enquiry with context`, new URL(page.url()).searchParams.get("offering") === slug);
    }

    // Enquiry behaviour.
    await go(page, `${LEARN}/sessions/request/?offering=wallet-readiness-workshop`);
    check(`${L("enquiry")}: noindex and no Learn bar`, /noindex/.test(await page.locator('meta[name="robots"]').getAttribute("content")) && (await page.locator(".fides-learn-bar").count()) === 0);
    check(`${L("enquiry")}: pilot notice says nothing is sent`, /Nothing you enter here is sent or stored/.test(await page.locator(".fides-learn-pilot-note").innerText()));
    const q1 = await page.locator("[data-fides-learn-question-label]").innerText();
    await page.selectOption("#fides-learn-offering", "wallet-introduction");
    const q2 = await page.locator("[data-fides-learn-question-label]").innerText();
    check(`${L("enquiry")}: switching the offering changes question and URL`, q1 !== q2 && new URL(page.url()).searchParams.get("offering") === "wallet-introduction" && /Wallet Introduction/.test(await page.locator("[data-fides-learn-back-label]").innerText()));
    await page.locator("[data-fides-learn-submit]").click();
    check(`${L("enquiry")}: empty submit shows summary and inline errors`, (await page.locator("[data-fides-learn-summary]").isVisible()) && (await page.locator(".fides-learn-form__error").count()) === 4 && (await page.locator('#fides-learn-name[aria-invalid="true"]').count()) === 1);
    await page.fill("#fides-learn-name", "Test Person");
    await page.fill("#fides-learn-email", "not-an-email");
    await page.fill("#fides-learn-org", "Test Org");
    await page.fill("#fides-learn-question", "A question");
    await page.locator("[data-fides-learn-submit]").click();
    check(`${L("enquiry")}: invalid email is reported`, /email address like/.test(await page.locator("#fides-learn-email-error").innerText()));
    await page.fill("#fides-learn-email", "test@example.org");
    await page.locator("[data-fides-learn-submit]").click();
    const res = page.locator("[data-fides-learn-result]");
    check(`${L("enquiry")}: valid submit shows a local result that echoes no personal data`, (await res.isVisible()) && /nothing was sent/i.test(await res.innerText()) && !/test@example\.org|Test Person/.test(await res.innerText()) && /Wallet Introduction/.test(await res.innerText()));
    await page.locator("[data-fides-learn-edit]").click();
    check(`${L("enquiry")}: edit returns to the form with entries kept`, (await page.locator("#fides-learn-request-form").isVisible()) && (await page.inputValue("#fides-learn-name")) === "Test Person");
    await page.locator("[data-fides-learn-remove-context]").click();
    check(`${L("enquiry")}: removing context clears the offering`, (await page.locator("#fides-learn-offering").inputValue()) === "" && !new URL(page.url()).searchParams.has("offering"));
    check(`${L("enquiry")}: nothing was posted`, posts.length === 0, posts.join("|"));
    await go(page, `${LEARN}/sessions/request/?offering=bogus`);
    check(`${L("enquiry")}: unknown offering falls back to no context`, (await page.locator("#fides-learn-offering").inputValue()) === "");
    await go(page, `${LEARN}/sessions/request/?offering=interest`);
    check(`${L("enquiry")}: interest context for webinars`, /Register interest/.test(await page.locator("[data-fides-learn-submit]").innerText()));

    // Existing pages keep working.
    for (const u of ["/", "/topics/", "/topics/for-businesses/", "/topics/the-big-picture/how-credentials-connect/"]) {
      await go(page, `${LEARN}${u}`);
      check(`${L("existing " + u)}: loads with one H1, no overflow`, (await page.locator("h1").count()) === 1 && !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
    }
    await go(page, `${LEARN}/topics/for-businesses/`);
    check(`${L("for-businesses")}: workshop button leads to the offering`, (await page.locator('.fides-learn a[href$="/sessions/wallet-readiness-workshop/"]').count()) > 0);
    await go(page, `${LEARN}/topics/`);
    check(`${L("topics")}: sessions button leads to the sessions page`, (await page.locator('.fides-learn-band a[href$="/sessions/"]').count()) > 0);
    check(`${L("no unlabelled preview left for built pages")}`, !/Training & workshops\s*Design preview/.test(await page.locator(".fides-learn").innerText()));
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `FAILED: ${failures}` : "All Sessions checks passed.");
  process.exit(failures ? 1 : 0);
})();
