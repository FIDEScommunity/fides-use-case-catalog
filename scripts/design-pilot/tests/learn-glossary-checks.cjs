/**
 * Targeted checks for the revised glossary terms (Credential, Credential Type, vct, Mandate):
 * Learn term dialogs, terms boxes, and the glossary page (deep link and alias search).
 * The glossary page script fetches GitHub first; the check serves the local glossary copy for that
 * request, so no network is used and the page shows the local data.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/learn-glossary-checks.cjs
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const T = "/fides-design-pilot/learn/topics";
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
async function termDialog(page, label, tag, title, includes) {
  const term = page.locator(".fides-learn-article__body .fides-ds-term", { hasText: label }).first();
  await term.click();
  const dialog = page.locator("dialog[open], [role=dialog]:visible").first();
  await dialog.waitFor({ state: "visible", timeout: 3000 });
  const text = await dialog.innerText();
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
    await termDialog(page, /^Credential \(definition\)$/, tag, "Credential", ["Information about a subject", "does not identify a technical format"]);
    await termDialog(page, /^credential type \(definition\)$/i, tag, "Credential Type", ["kind of credential", "attestation type"]);
    await termDialog(page, "vct", tag, "vct", ["In SD-JWT VC, the identifier of a credential type", "ALIASES"]);
    check(`${tag}: no horizontal overflow`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);

    tag = `business wallets @${width}`;
    r = await open(page, `${T}/for-businesses/business-wallets-where-to-start/`);
    check(`${tag}: page answers 200`, r.status() === 200);
    await termDialog(page, /^mandates \(definition\)$/i, tag, "Mandate", ["proposed European Business Wallet"]);

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

    // Glossary page, local data served for the GitHub request.
    tag = `glossary page @${width}`;
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.route(/raw\.githubusercontent\.com\/.*glossary-aggregated\.json/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: fs.readFileSync(GLOSSARY_FILE) }));
    r = await open(page, "/glossary/?term=verifiable-credential-type");
    check(`${tag}: page answers 200`, r.status() === 200);
    await page.waitForSelector("[data-term-id]", { timeout: 8000 });
    check(`${tag}: lists the local data (term count)`, (await page.locator("[data-term-id]").count()) === data.terms.length, String(await page.locator("[data-term-id]").count()));
    const item = page.locator('li.fides-glossary__item[data-term-id="verifiable-credential-type"]');
    await page.waitForTimeout(500);
    const toggle = item.locator("button.fides-glossary__toggle");
    const panel = page.locator("#" + (await toggle.getAttribute("aria-controls")));
    const itemText = ((await item.textContent()) || "") + " " + ((await panel.textContent()) || "");
    check(`${tag}: ?term=verifiable-credential-type opens the term with the new name`, (await item.getAttribute("class")).includes("is-open") && (await toggle.getAttribute("aria-expanded")) === "true" && itemText.includes("Credential Type Identifier (vct)"), itemText);
    check(`${tag}: the open term shows the revised definition and aliases`, itemText.includes("In SD-JWT VC, the identifier of a credential type") && itemText.includes("VCT"), itemText);
    for (const q of ["VCT", "Credential Type"]) {
      const search = page.locator('input[placeholder="Search by term or abbreviation"]');
      await search.fill(q);
      await page.waitForTimeout(400);
      const names = await page.locator("[data-term-id]:visible").allInnerTexts();
      check(`${tag}: search "${q}" finds ${q === "VCT" ? "the vct term" : "Credential Type"}`, names.some((n) => (q === "VCT" ? /Credential Type Identifier/ : /^Credential Type$/).test(n.trim())), names.slice(0, 8).join(" | "));
    }
    check(`${tag}: no horizontal overflow`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
    check(`${tag}: no script errors`, errors.length === 0, errors.join(" | "));
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
