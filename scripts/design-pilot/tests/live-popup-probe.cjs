/**
 * READ-ONLY probe of a live wallet catalog page: records data requests and the glossary popup text
 * shown for eIDAS trust service keys (QEAA, QERDS, QESeal). GET only, no login, no forms.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const URL0 = process.env.LIVE_URL || "https://fides.community/ecosystem-explorer/organizational-wallets/";
const WANT = ["QEAA", "QERDS", "QESeal", "QESig"];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const reqs = [];
  page.on("request", (r) => { if (/vocabulary|glossary|aggregated/.test(r.url()) && /json/.test(r.url())) reqs.push(r.method() + " " + r.url()); });
  const out = { at: new Date().toISOString(), url: URL0, popups: {} };
  await page.goto(URL0, { waitUntil: "networkidle" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 2000 }).then(() => true, () => false)) await deny.click();
  await page.waitForTimeout(2500);
  const cards = page.locator(".fides-card, [data-wallet-id], .fides-tile");
  out.cards = await cards.count();
  for (let i = 0; i < Math.min(out.cards, 40) && Object.keys(out.popups).length < WANT.length; i++) {
    await cards.nth(i).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    for (const key of WANT) {
      if (out.popups[key]) continue;
      const btn = page.locator('.fides-kv-glossary-link[data-vocab-key="' + key + '"]').first();
      if (await btn.count()) {
        await btn.evaluate((el) => el.click());
        await page.waitForTimeout(400);
        const txt = await page.locator(".fides-modal--vocabulary").last().innerText();
        out.popups[key] = { wallet: i, text: txt.replace(/\s+/g, " ").slice(0, 400) };
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }
    }
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }
  out.requests = [...new Set(reqs)];
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
