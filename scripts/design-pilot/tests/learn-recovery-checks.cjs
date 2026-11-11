/**
 * Targeted checks for the Learn recovery round: Topics entry points, The big picture order, trimmed follow-up lists,
 * the European Business Wallet popup (cautious wording from glossary 1.12.2) and the four related terms on the glossary page.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/learn-recovery-checks.cjs
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const T = "/fides-design-pilot/learn/topics";
const ORDER = ["what-is-a-digital-wallet", "what-is-a-credential", "how-credentials-connect", "european-digital-identity-wallet", "eudi-wallet-and-european-business-wallet", "formats-and-protocols", "trust-and-interoperability"];
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${String(detail).slice(0, 220)})` : ""}`);
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function open(page, url) {
  const r = await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
  return r;
}
async function links(page, tag) {
  const hrefs = await page.locator(".fides-learn-rows a[href], .fides-learn-article__body a[href], .fides-learn-band a[href]").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
  check(`${tag}: no local host typed into links`, hrefs.every((h) => !/localhost|127\.0\.0\.1/.test(h || "")));
  const bad = [];
  for (const h of hrefs.filter((h) => h && h.startsWith("/"))) { const r = await page.request.get(`${BASE}${h}`); if (r.status() !== 200) bad.push(`${h} ${r.status()}`); }
  check(`${tag}: internal links answer 200`, bad.length === 0, bad.join(", "));
  return hrefs;
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    let tag = `topics @${width}`;
    let r = await open(page, `${T}/`);
    check(`${tag}: answers 200`, r.status() === 200);
    const hrefs = await links(page, tag);
    for (const slug of ORDER.filter((s) => ["what-is-a-digital-wallet", "what-is-a-credential", "how-credentials-connect", "formats-and-protocols", "trust-and-interoperability"].includes(s))) check(`${tag}: links to ${slug}`, hrefs.some((h) => h.includes(`/${slug}/`)));
    const titles = await page.locator(".fides-learn-rows__title").allInnerTexts();
    check(`${tag}: rows without a landing page stay plain text (no dead link)`, titles.some((t) => /Technology/.test(t)) && !hrefs.some((h) => /\/topics\/(technology|ecosystem-roles|wallets-credentials)\//.test(h || "")));
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);

    tag = `big picture @${width}`;
    r = await open(page, `${T}/the-big-picture/`);
    check(`${tag}: answers 200`, r.status() === 200);
    const hub = await page.locator(".fides-learn-rows a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    const slugs = hub.map((h) => h.split("/").filter(Boolean).pop());
    check(`${tag}: general explanation comes before European and technical depth`, JSON.stringify(slugs) === JSON.stringify(ORDER), slugs.join(","));
    await links(page, tag);
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);

    for (const [slug, parent] of [["what-is-a-digital-wallet", "the-big-picture"], ["formats-and-protocols", "the-big-picture"]]) {
      tag = `${slug} @${width}`;
      r = await open(page, `${T}/${parent}/${slug}/`);
      check(`${tag}: answers 200`, r.status() === 200);
      const learn = await page.locator(".fides-learn-article__body h3:has-text('Learn more') + ul li").count();
      check(`${tag}: Learn more is short (${learn} items)`, learn > 0 && learn <= 4, String(learn));
      await links(page, tag);
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }

    tag = `EBW popup @${width}`;
    await open(page, `${T}/the-big-picture/what-is-a-digital-wallet/`);
    const term = page.locator(".fides-learn-article__body .fides-ds-term").filter({ hasText: /European Business Wallet/ }).first();
    await term.scrollIntoViewIfNeeded();
    await term.click();
    const dialog = page.locator("dialog[open], [role=dialog]:visible").first();
    await dialog.waitFor({ state: "visible", timeout: 3000 });
    const text = (await dialog.innerText()).replace(/\s+/g, " ");
    check(`${tag}: describes a Commission proposal`, /proposed/.test(text) && /has not been adopted/.test(text), text.slice(0, 200));
    check(`${tag}: does not state "full legal effect" as fact`, !/full legal effect/i.test(text));
    await page.keyboard.press("Escape");
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    // The four related terms (glossary 1.12.2) on the glossary page: the EBW link is presented as part of the proposal.
    for (const [id, re] of [["european-unique-identifier", /Union-wide unique identifier/], ["qualified-electronic-registered-delivery-service", /qualified trust service/], ["eu-company-certificate", /digital certificate attesting company information/], ["single-digital-gateway", /EU initiative requiring key public services/]]) {
      tag = `glossary ${id} @${width}`;
      await open(page, `/glossary/?term=${id}`);
      await page.locator(`.fides-glossary__item[data-term-id="${id}"]`).first().waitFor({ state: "attached", timeout: 5000 });
      await page.waitForTimeout(600);
      // The deep link opens the definition (detail view); read the visible text of the page body.
      const t = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      const at = t.search(re);
      const seg = at >= 0 ? t.slice(at, at + 520) : "";
      check(`${tag}: keeps the general definition`, at >= 0, t.slice(0, 160));
      check(`${tag}: presents the EBW link as the Commission proposal`, /proposal for European Business Wallets (would|is intended)/.test(seg), seg);
      check(`${tag}: no 28th regime wording`, !/28th/i.test(seg));
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }
    check(`@${width}: no console errors`, errors.length === 0, errors.join(" | "));
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
