/**
 * Targeted visitor checks for the live use case cards on two Learn articles
 * (European Business Wallet, Business wallets: where to start).
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/learn-usecase-cards-checks.cjs
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const T = "/fides-design-pilot/learn/topics/for-businesses";
const VOG = "digital-certificate-of-good-conduct-vog-as-a-verifiable-credential-yjw4BC";
const PAGES = [
  { key: "ebw", url: `${T}/european-business-wallet/`, id: "business-wallet-based-kyb-financial-onboarding-Rzqouv", org: "Hovi", title: "Business Wallet-Based KYB & Financial Onboarding" },
  { key: "start", url: `${T}/business-wallets-where-to-start/`, id: "end-to-end-digital-business-workflows-transforming-kyb-kyc-kys-via-eu-business-wallet-F665Dh", org: "Robert Bosch GmbH", title: "End-to-End Digital Business Workflows: Transforming KYB-KYC-KYS via EU Business Wallet" },
  { key: "how", url: "/fides-design-pilot/learn/topics/the-big-picture/how-credentials-connect/", id: VOG, org: "Credenco", title: "Digital Certificate of Good Conduct (VOG) as a Verifiable Credential", status: "marks this use case as in production", kicker: "See it in practice", editorial: true },
  { key: "receive", url: "/fides-design-pilot/start/receive/", id: VOG, org: "Credenco", title: "Digital Certificate of Good Conduct (VOG) as a Verifiable Credential", status: "marks this use case as in production", kicker: "", heading: "H2" },
];
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    for (const p of PAGES) {
      const tag = `${p.key} @${width}`;
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const response = await page.goto(`${BASE}${p.url}`, { waitUntil: "domcontentloaded" });
      const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
      if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
      check(`${tag}: page answers 200`, response && response.status() === 200);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: no horizontal overflow`, overflow <= 0, String(overflow));
      const card = page.locator(`.fides-learn-record[data-fides-learn-record="usecase:${p.id}"]`);
      check(`${tag}: exactly one card for the chosen record`, (await card.count()) === 1);
      const text = await card.innerText();
      check(`${tag}: title from the record`, text.includes(p.title), text.slice(0, 120));
      check(`${tag}: organisation and careful status from the record`, text.includes(`The catalog lists ${p.org} as the organisation.`) && text.includes(p.status || "does not mark this use case as in production"), text);
      check(`${tag}: card has an image from the record`, (await card.locator("img.fides-learn-record__image").count()) === 1);
      check(`${tag}: no manual-text leftovers`, !/A Certificate of Good Conduct in a wallet/.test(text));
      if (p.kicker !== undefined) check(`${tag}: kicker ${p.kicker ? "shown" : "absent"}`, p.kicker ? text.toLowerCase().includes(p.kicker.toLowerCase()) : (await card.locator(".fides-learn-record__kicker").count()) === 0);
      if (p.heading) check(`${tag}: card heading level`, (await card.locator(p.heading.toLowerCase()).count()) === 1);
      const link = card.locator("a.fides-ds-action-link");
      await link.focus();
      const focus = await link.evaluate((a) => ({ active: document.activeElement === a, outline: getComputedStyle(a).outlineStyle + " " + getComputedStyle(a).outlineWidth, shadow: getComputedStyle(a).boxShadow }));
      check(`${tag}: card link takes keyboard focus`, focus.active);
      const box = await card.boundingBox();
      check(`${tag}: card fits the viewport`, box && box.x >= 0 && box.x + box.width <= width + 1, JSON.stringify(box));
      const href = await card.locator("a.fides-ds-action-link").getAttribute("href");
      const r = await page.request.get(href.startsWith("/") ? `${BASE}${href}` : href);
      check(`${tag}: card link answers 200`, r.status() === 200 && href.includes(encodeURIComponent(p.id)), `${href} ${r.status()}`);
      check(`${tag}: no editor notice for visitors`, (await page.locator(".fides-learn-record-notice").count()) === 0);
      const hrefs = await page.locator(".fides-learn-article__body a[href]:not(.fides-learn-record a), .fides-learn-band a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
      const bad = [];
      for (const h of [...new Set(hrefs.filter((x) => x.startsWith("/")))]) {
        const res = await page.request.get(`${BASE}${h}`);
        if (res.status() !== 200) bad.push(`${h} ${res.status()}`);
      }
      check(`${tag}: internal links answer 200`, bad.length === 0, bad.join(", "));
      check(`${tag}: no link to issuer or relying party overviews`, hrefs.every((h) => !/issuer-catalog|relying-part|\/issuers\/|\/rp\//.test(h)));
      if (p.key === "start") {
        check(`${tag}: "mandates" is plain text (no glossary popup)`, (await page.locator(".fides-learn-article__body .fides-ds-term", { hasText: /^mandates$/i }).count()) === 0);
      }
      await context.close();
    }
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
