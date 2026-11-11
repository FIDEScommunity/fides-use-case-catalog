/**
 * Targeted checks for the revised glossary terms (Credential, Credential Type, vct, Mandate):
 * Learn term dialogs, terms lists, and the glossary page (deep link, search, same definitions as Learn).
 * No request is replaced by a test file. The glossary page runs its real loading logic; the review site
 * points it at the bundled data (config mu-plugin). Two failure paths are exercised with route.abort:
 * GitHub unreachable (no request should be made at all) and a failing first source (real fallback to the second).
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/learn-glossary-checks.cjs
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const T = "/fides-design-pilot/learn/topics";
const learnTexts = {};
const GLOSSARY_FILE = process.env.GLOSSARY_FILE || path.resolve(__dirname, "../../../../wordpress/wp-content/plugins/fides-vocabulary-glossary/data/glossary-aggregated.json");
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${String(detail).slice(0, 200)})` : ""}`);
}
async function open(page, url) {
  const response = await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
  return response;
}
async function termDialog(page, label, tag, title, includes, id) {
  const term = page.locator(".fides-learn-article__body .fides-ds-term", { hasText: label }).first();
  await term.click();
  const dialog = page.locator("dialog[open], [role=dialog]:visible").first();
  await dialog.waitFor({ state: "visible", timeout: 3000 });
  const text = await dialog.innerText();
  if (id) learnTexts[id] = text;
  check(`${tag}: "${label}" opens the ${title} definition`, includes.every((i) => text.toUpperCase().includes(i.toUpperCase())), text);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
}
(async () => {
  const data = JSON.parse(fs.readFileSync(GLOSSARY_FILE, "utf8"));
  const vct = data.terms.find((t) => t.id === "verifiable-credential-type");
  check("data: vct keeps its id and the aliases vct and VCT", vct && vct.aliases.includes("vct") && vct.aliases.includes("VCT") && vct.key === "Verifiable Credential Type");
  check("data: Credential and Credential Type exist, vct is not a general definition", data.terms.some((t) => t.id === "credential") && data.terms.some((t) => t.id === "credential-type") && /^In SD-JWT VC/.test(vct.description));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    let tag = `credential @${width}`;
    let r = await open(page, `${T}/the-big-picture/what-is-a-credential/`);
    check(`${tag}: page answers 200`, r.status() === 200);
    await termDialog(page, /^Credential \(definition\)$/, tag, "Credential", ["Information about a subject", "does not identify a technical format"], "credential");
    await termDialog(page, /^credential type \(definition\)$/i, tag, "Credential Type", ["kind of credential", "attestation type"], "credential-type");
    await termDialog(page, "vct", tag, "vct", ["In SD-JWT VC, the identifier of a credential type", "ALIASES"], "verifiable-credential-type");
    check(`${tag}: no horizontal overflow`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);

    tag = `business wallets @${width}`;
    r = await open(page, `${T}/for-businesses/business-wallets-where-to-start/`);
    check(`${tag}: page answers 200`, r.status() === 200);
    await termDialog(page, /^mandates \(definition\)$/i, tag, "Mandate", ["proposed European Business Wallet"], "mandate");

    for (const [name, url, expect] of [["for businesses", `${T}/for-businesses/`, "Mandate"], ["big picture", `${T}/the-big-picture/`, "Credential"]]) {
      tag = `${name} @${width}`;
      r = await open(page, url);
      check(`${tag}: page answers 200`, r.status() === 200);
      const chip = page.locator(".fides-learn-terms .fides-ds-term", { hasText: expect }).first();
      check(`${tag}: terms list contains ${expect}`, (await chip.count()) === 1);
      await chip.click();
      const box = page.locator("dialog[open], [role=dialog]:visible").first();
      await box.waitFor({ state: "visible", timeout: 3000 });
      const boxText = await box.innerText();
      check(`${tag}: ${expect} chip opens a definition`, /DESCRIPTION/i.test(boxText) && boxText.length > 120, boxText);
      await page.keyboard.press("Escape");
      await box.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
      check(`${tag}: no horizontal overflow`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
    }

    // Glossary page: the real loading logic, no replaced requests.
    tag = `glossary page @${width}`;
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const github = [];
    page.on("request", (req) => { if (/raw\.githubusercontent\.com/.test(req.url())) github.push(req.url()); });
    r = await open(page, "/glossary/?term=verifiable-credential-type");
    check(`${tag}: page answers 200`, r.status() === 200);
    await page.waitForSelector("[data-term-id]", { timeout: 8000 });
    check(`${tag}: lists the bundled data (term count)`, (await page.locator("[data-term-id]").count()) === data.terms.length, String(await page.locator("[data-term-id]").count()));
    check(`${tag}: no request to GitHub (the review site reads the bundled data)`, github.length === 0, github.join(", "));
    const readOpen = async (id) => {
      const item = page.locator(`li.fides-glossary__item[data-term-id="${id}"]`);
      const toggle = item.locator("button.fides-glossary__toggle");
      if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
      const panel = page.locator("#" + (await toggle.getAttribute("aria-controls")));
      await panel.waitFor({ state: "visible", timeout: 3000 });
      return { item, toggle, text: ((await item.textContent()) || "") + " " + ((await panel.textContent()) || "") };
    };
    const first = await readOpen("verifiable-credential-type");
    check(`${tag}: ?term=verifiable-credential-type opens the term with the new name`, (await first.item.getAttribute("class")).includes("is-open") && first.text.includes("Credential Type Identifier (vct)"), first.text);
    // Same definitions as the Learn dialogs (both come from the same bundled data).
    for (const id of ["credential", "credential-type", "verifiable-credential-type", "mandate"]) {
      const want = data.terms.find((t) => t.id === id).description;
      const got = await readOpen(id);
      check(`${tag}: glossary page shows the definition of ${id}`, got.text.replace(/\s+/g, " ").includes(want), got.text);
      check(`${tag}: ${id} is the same text Learn shows`, learnTexts[id] && learnTexts[id].replace(/\s+/g, " ").includes(want), learnTexts[id]);
    }
    for (const q of ["VCT", "vct", "Verifiable Credential Type", "Credential Type", "Credential"]) {
      const search = page.locator('input[placeholder="Search by term or abbreviation"]');
      await search.fill(q);
      await page.waitForTimeout(400);
      const names = (await page.locator("[data-term-id]:visible").allInnerTexts()).map((n) => n.trim());
      const want = q.toLowerCase().includes("vct") || q === "Verifiable Credential Type" ? /Credential Type Identifier/ : q === "Credential Type" ? /^Credential Type$/ : /^Credential$/;
      check(`${tag}: search "${q}" finds ${want}`, names.some((n) => want.test(n)), names.slice(0, 8).join(" | "));
    }
    for (const id of ["credential", "credential-type"]) {
      await open(page, `/glossary/?term=${id}`);
      await page.waitForSelector(`li.fides-glossary__item[data-term-id="${id}"].is-open`, { timeout: 8000 }).then(() => check(`${tag}: deep link ?term=${id} opens the term`, true), () => check(`${tag}: deep link ?term=${id} opens the term`, false));
    }
    check(`${tag}: no horizontal overflow`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
    check(`${tag}: no script errors`, errors.length === 0, errors.join(" | "));

    // Failure path 1: GitHub unreachable. Every GitHub request is refused; the page must still show the bundled data.
    let aborted = 0;
    await page.route(/raw\.githubusercontent\.com\//, (route) => { aborted += 1; return route.abort("connectionrefused"); });
    await open(page, "/glossary/?term=verifiable-credential-type");
    await page.waitForSelector("[data-term-id]", { timeout: 8000 });
    check(`${tag}: GitHub unreachable: bundled data still listed`, (await page.locator("[data-term-id]").count()) === data.terms.length);
    check(`${tag}: GitHub unreachable: the page does not depend on GitHub (requests refused: ${aborted})`, aborted === 0);
    await page.unroute(/raw\.githubusercontent\.com\//);

    // Failure path 2: the first data source fails (real fallback to the second source, the bundled file with ?v=).
    let failedFirst = 0;
    await page.route(/glossary-aggregated\.json(?!\?v=)/, (route) => { failedFirst += 1; return route.abort("connectionrefused"); });
    await open(page, "/glossary/?term=verifiable-credential-type");
    await page.waitForSelector("[data-term-id]", { timeout: 8000 });
    check(`${tag}: first source refused, fallback source used (${failedFirst} refused)`, failedFirst >= 1 && (await page.locator("[data-term-id]").count()) === data.terms.length, String(failedFirst));
    check(`${tag}: no script errors after the failure paths`, errors.length === 0, errors.join(" | "));
    await page.unroute(/glossary-aggregated\.json(?!\?v=)/);
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
