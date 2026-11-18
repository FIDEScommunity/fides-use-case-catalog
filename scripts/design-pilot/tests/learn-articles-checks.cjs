/**
 * Targeted visitor checks for the four Learn articles about the EUDI Wallet, the European
 * Business Wallet, their comparison and credentials/attestations.
 * Source links keep percent-encoding, glossary dialog focus, grouped follow-up routes,
 * every internal link answers 200, long links and no horizontal overflow, keyboard focus.
 * Run through run-learn-articles-checks.sh (env: PILOT_URL, WIDTHS, CHROME_PATH, PLAYWRIGHT_MODULE).
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const T = "/fides-design-pilot/learn/topics";
const ARTICLES = {
  eudi: `${T}/the-big-picture/european-digital-identity-wallet/`,
  ebw: `${T}/for-businesses/european-business-wallet/`,
  compare: `${T}/the-big-picture/eudi-wallet-and-european-business-wallet/`,
  credential: `${T}/the-big-picture/what-is-a-credential/`,
};
const KYB = "business-wallet-based-kyb-financial-onboarding-Rzqouv";

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

async function open(page, url) {
  const response = await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
  return response;
}

async function article(browser, key, width) {
  const tag = `${key} @${width}`;
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const response = await open(page, ARTICLES[key]);
  check(`${tag}: page answers 200`, response && response.status() === 200, String(response && response.status()));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag}: no horizontal overflow`, overflow <= 0, String(overflow));

  // Links: token based (no host in the href), every internal target answers 200.
  const hrefs = await page.locator(":is(.fides-learn-article__body, .fides-learn-continue) a[href]:not(.fides-learn-record a), .fides-learn-band a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check(`${tag}: no local host typed into the content`, hrefs.every((h) => !/localhost|127\.0\.0\.1/.test(h)));
  const internal = [...new Set(hrefs.filter((h) => h.startsWith("/")))];
  const bad = [];
  for (const href of internal) {
    const r = await page.request.get(`${BASE}${href}`);
    if (r.status() !== 200) bad.push(`${href} ${r.status()}`);
  }
  check(`${tag}: ${internal.length} internal links answer 200`, bad.length === 0, bad.join(", "));

  // Continue learning is grouped.
  const groups = await page.locator(":is(.fides-learn-article__body, .fides-learn-continue) h3").allInnerTexts();
  check(`${tag}: Continue learning has "Learn more" and "Explore in the catalogs"`, ["Learn more", "Explore in the catalogs"].every((g) => groups.includes(g)), groups.join("|"));

  // No duplicate destination between the list and the closing band.
  const band = await page.locator(".fides-learn-band a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  const listed = await page.locator(":is(.fides-learn-article__body, .fides-learn-continue) ul a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check(`${tag}: closing band does not repeat a listed link`, band.every((h) => !listed.includes(h)), band.join(","));

  // Sources: href keeps percent-encoding and long URLs do not break the layout.
  const sources = await page.locator(".fides-learn-sources a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check(`${tag}: sources are https links`, sources.length >= 3 && sources.every((h) => /^https:\/\//.test(h)), sources.join(","));
  if (key === "credential") {
    check(`${tag}: EUR-Lex source points at the stable ELI address`, sources.includes("https://eur-lex.europa.eu/eli/reg/2024/1183/oj"), sources.join(","));
  }
  if (key === "ebw") {
    check(`${tag}: parentheses in the Parliament source URL survive`, sources.some((h) => h.includes("reference=2025/0358(COD)")), sources.join(","));
  }
  const srcWrap = await page.locator(".fides-learn-sources a").evaluateAll((els) => els.every((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== "ellipsis"));
  check(`${tag}: long source titles wrap and are not truncated`, srcWrap);
  check(`${tag}: no visible source URL`, (await page.locator(".fides-learn-sources__url").count()) === 0);
  if (key === "compare") {
    const body = await page.locator(".fides-learn-article__body").innerText();
    check(`${tag}: comparison omits the dated proposal note`, !/Content last checked:|The status of the European Business Wallet proposal can change\./.test(body));
  } else {
    const checked = await page.locator(".fides-learn-note").last().innerText();
    check(`${tag}: content last checked line is present`, /Content last checked: 1[12] November 2026/.test(checked), checked);
  }

  // Terms box: whole sentences only; glossary dialog returns focus to its trigger (pages that use terms).
  const term = page.locator(".fides-learn-article__body .fides-ds-term").first();
  if (await term.count()) {
    const defs = await page.locator(".fides-learn-terms-box dd").allInnerTexts();
    check(`${tag}: term definitions are not cut with an ellipsis`, defs.length > 0 && defs.every((d) => !/(…|\.\.\.)\s*$/.test(d)), defs.join("|").slice(0, 200));
    await term.scrollIntoViewIfNeeded();
    await term.click();
    const dialog = page.locator("dialog[open], [role=dialog]:visible").first();
    await dialog.waitFor({ state: "visible", timeout: 3000 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    check(`${tag}: Escape closes the glossary dialog and returns focus to the term`, (await dialog.isHidden()) && (await term.evaluate((el) => el === document.activeElement)));
  }

  // Keyboard focus is visible on an article link.
  const link = page.locator(":is(.fides-learn-article__body, .fides-learn-continue) ul a").first();
  await link.scrollIntoViewIfNeeded();
  await page.keyboard.press("Tab");
  await link.focus();
  const focus = await link.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { active: el === document.activeElement, outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0, shadow: cs.boxShadow !== "none" };
  });
  check(`${tag}: keyboard focus on a link is visible`, focus.active && (focus.outline || focus.shadow), JSON.stringify(focus));

  if (key === "ebw") {
    check(`${tag}: the example use case card links to the catalog record`, (await page.locator(`a[href*="usecase=${KYB}"]`).count()) >= 1);
    const cardText = await page.locator(".fides-learn-record").first().innerText();
    check(`${tag}: use case status is stated without claiming production`, /does not mark this use case as in production/.test(cardText), cardText.slice(0, 200));
    const r = await page.request.get(`${BASE}/fides-design-pilot/use-case/?usecase=${KYB}`);
    check(`${tag}: use case detail answers 200`, r.status() === 200);
    check(`${tag}: general use case overview stays linked`, internal.includes("/fides-design-pilot/overview/"));
    const cta = await page.locator(".fides-learn-band").innerText();
    check(`${tag}: closing band says Browse, not Compare`, /Browse business wallets/.test(cta) && !/Compare business wallets/.test(cta), cta.slice(0, 120));
  }
  if (key === "credential") {
    check(`${tag}: credential, credential type and the vct identifier each open their own definition`, (await page.locator(".fides-learn-article__body .fides-ds-term", { hasText: "vct" }).count()) === 1 && (await page.locator(".fides-learn-article__body .fides-ds-term", { hasText: /^credential type/i }).count()) === 1 && (await page.locator(".fides-learn-article__body .fides-ds-term", { hasText: /^credential \(/i }).count()) === 1);
    const body = await page.locator(".fides-learn-article__body").innerText();
    check(`${tag}: the catalog disclaimer appears once`, (body.match(/does not confirm that a credential is qualified/g) || []).length === 1);
  }
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    for (const key of Object.keys(ARTICLES)) await article(browser, key, width);
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
