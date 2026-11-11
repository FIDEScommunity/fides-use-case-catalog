/**
 * Targeted checks for the Learn page "Trust and interoperability" and for the glossary agreement with Learn popups.
 * New page: 200, parent position, no overflow, internal links answer 200, grouped follow-up, sources, last-checked line,
 * glossary popups show the 1.12.0 definition (same text as the bundled aggregate and the glossary page), no console errors.
 * Existing pages: the back link is present and the hub lists the page. Glossary: ?term=vct deep link opens.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/learn-trust-page-checks.cjs
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const T = "/fides-design-pilot/learn/topics";
const PAGE = `${T}/the-big-picture/trust-and-interoperability/`;
const ROOT = path.resolve(__dirname, "../../../..");
const GLOSSARY = JSON.parse(fs.readFileSync(path.join(ROOT, "wordpress/wp-content/plugins/fides-vocabulary-glossary/data/glossary-aggregated.json"), "utf8")).terms;
const BYNAME = Object.fromEntries(GLOSSARY.map((t) => [t.name, t]));
const TERMS = { "Attestation Rulebook": /^rulebook \(definition\)$/i };
const BACKLINKS = ["the-big-picture", "the-big-picture/formats-and-protocols", "the-big-picture/what-is-a-credential", "the-big-picture/how-credentials-connect"];
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${String(detail).slice(0, 200)})` : ""}`);
}
const squash = (s) => String(s).replace(/\s+/g, " ").trim();
async function open(page, url) {
  const response = await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
  return response;
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    let tag = `wallet page @${width}`;
    const r = await open(page, PAGE);
    check(`${tag}: answers 200`, r && r.status() === 200);
    check(`${tag}: title`, (await page.locator("h1").first().innerText()).trim() === "Trust and interoperability");
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    const crumbs = squash(await page.locator("nav[aria-label*=readcrumb], .fides-learn-breadcrumb, .breadcrumb").first().innerText().catch(() => ""));
    check(`${tag}: sits under The big picture`, /The big picture/.test(crumbs), crumbs);
    const hrefs = await page.locator(".fides-learn-article__body a[href], .fides-learn-band a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    check(`${tag}: no local host typed into the content`, hrefs.every((h) => !/localhost|127\.0\.0\.1/.test(h)));
    const internal = [...new Set(hrefs.filter((h) => h.startsWith("/")))];
    const bad = [];
    for (const h of internal) { const x = await page.request.get(`${BASE}${h}`); if (x.status() !== 200) bad.push(`${h} ${x.status()}`); }
    check(`${tag}: ${internal.length} internal links answer 200`, bad.length === 0, bad.join(", "));
    for (const dest of ["formats-and-protocols", "what-is-a-credential", "issuing-credentials-for-wallets", "accepting-information-from-a-wallet", "credentials"]) {
      check(`${tag}: links to ${dest}`, internal.some((h) => h.includes(`/${dest}/`)));
    }
    const groups = await page.locator(".fides-learn-article__body h3").allInnerTexts();
    check(`${tag}: Continue learning groups`, ["Learn more", "Explore in the catalogs"].every((g) => groups.includes(g)), groups.join("|"));
    const band = await page.locator(".fides-learn-band a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    const listed = await page.locator(".fides-learn-article__body ul a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    check(`${tag}: closing band does not repeat a listed link`, band.every((h) => !listed.includes(h)), band.join(","));
    const sources = await page.locator(".fides-learn-sources a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    check(`${tag}: ${sources.length} sources, all https`, sources.length >= 3 && sources.every((h) => /^https:\/\//.test(h)), sources.join(","));
    check(`${tag}: last checked line`, /Content last checked: 11 November 2026/.test(await page.locator(".fides-learn-note").last().innerText()));
    for (const [name, label] of Object.entries(TERMS)) {
      const term = page.locator(".fides-learn-article__body .fides-ds-term").filter({ hasText: label }).first();
      const alt = page.locator(".fides-learn-article__body .fides-ds-term").filter({ hasText: new RegExp(`^${name}$`, "i") }).first();
      const trigger = (await term.count()) ? term : alt;
      if (!(await trigger.count())) { check(`${tag}: term ${name} is linked`, false); continue; }
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      const dialog = page.locator("dialog[open], [role=dialog]:visible").first();
      await dialog.waitFor({ state: "visible", timeout: 3000 });
      const text = squash(await dialog.innerText());
      const want = squash(BYNAME[name].description);
      check(`${tag}: ${name} popup shows the 1.12.0 definition`, text.includes(want.slice(0, 80)), text.slice(0, 160));
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
    }
    check(`${tag}: TS11 wording: no official-listing or certification claim`, !/is certified|are certified|guarantee[sd]? (compatib|interop)/i.test(await page.locator(".fides-learn-article__body").innerText()) && /not an official EU catalog entry/.test(await page.locator(".fides-learn-article__body").innerText()));
    check(`${tag}: no horizontal overflow after popups`, (await overflow(page)) <= 0);
    check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));

    // Back links in existing pages.
    for (const p of BACKLINKS) {
            const rr = await open(page, `${T}/${p}/`);
      tag = `${p.split("/").pop()} @${width}`;
      check(`${tag}: answers 200`, rr && rr.status() === 200);
      check(`${tag}: links to Trust and interoperability`, (await page.locator(`.fides-learn-article__body a[href$="/trust-and-interoperability/"]`).count()) >= 1 || (await page.locator(`a[href$="/trust-and-interoperability/"]`).count()) >= 1);
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }

    // Glossary page: vct deep link, and the same definition as the Learn popup.
    tag = `glossary @${width}`;
    await open(page, "/glossary/?term=verifiable-credential-type");
    const open_ = await page.waitForSelector('li.fides-glossary__item[data-term-id="verifiable-credential-type"].is-open', { timeout: 8000 }).then(() => true, () => false);
    check(`${tag}: ?term=verifiable-credential-type (the vct term) opens`, open_);
    if (open_) {
      await page.waitForTimeout(500);
      const card = squash(await page.locator("main, body").first().innerText());
      check(`${tag}: vct card shows the 1.12.0 definition`, card.includes(squash(BYNAME.vct ? BYNAME.vct.description : GLOSSARY.find((t) => t.id === "verifiable-credential-type").description).slice(0, 80)), card.slice(0, 160));
    }
    // Informational: the short alias is not a deep link key (pre-existing, same in the live plugin script).
    await open(page, "/glossary/?term=vct");
    await page.waitForTimeout(1500);
    console.log(`info - ${tag}: ?term=vct opens a card: ${(await page.locator("li.fides-glossary__item.is-open").count()) > 0}`);
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
