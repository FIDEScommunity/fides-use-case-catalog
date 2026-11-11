/**
 * READ-ONLY probe of the live glossary page (GET only, no login, no forms). Records the real network requests
 * and what a visitor sees when searching. Output: JSON on stdout. Run with LIVE_URL to override.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const URL0 = process.env.LIVE_URL || "https://fides.community/community-tools/glossary/";
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const reqs = [];
  page.on("request", (r) => { if (/glossary-aggregated|vocabulary\.json|raw\.githubusercontent|aggregated\.json/.test(r.url())) reqs.push(r.method() + " " + r.url()); });
  const out = { at: new Date().toISOString(), url: URL0 };
  const res = await page.goto(URL0, { waitUntil: "networkidle" });
  out.status = res.status();
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 2000 }).then(() => true, () => false)) await deny.click();
  await page.waitForSelector("[data-term-id]", { timeout: 15000 });
  out.termCount = await page.locator("[data-term-id]").count();
  out.search = {};
  for (const q of ["QEAA", "QERDS", "QESeal", "QESig", "Qualified Electronic Attestation", "vct", "Mandate", "Credential"]) {
    const input = page.locator('input[type="search"][placeholder*="term"], input[placeholder="Search by term or abbreviation"]').first();
    await input.fill(q);
    await page.waitForTimeout(500);
    out.search[q] = (await page.locator("[data-term-id]:visible").allInnerTexts()).map((t) => t.trim());
  }
  
  out.requests = [...new Set(reqs)];
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
