/**
 * Targeted checks for the Dutch repair round of 13 November 2026 (see learn/nl-translation-changes-repair-round-2026-11-13.md),
 * on the local pilot at 1440 and 390 px. Nothing is submitted (every non-GET request is aborted).
 *  - role chips are Dutch (Houder, Vertrouwende partij, Walletaanbieder, Authentieke bron) on the pages that show them;
 *  - GBO labels "Controleren (verify):" / "Ophalen (retrieve):" and the Article 45e paragraph;
 *  - the For you article "Informatie delen vanuit een wallet": H1, breadcrumb, links to it;
 *  - the three route strings that used to fail nl-route-checks (credential check title, role question, EBW status);
 *  - practice-question titles, overview teasers and CTA: u-form, no "je/jij/jouw/jullie" in the Dutch text;
 *  - the proposal file for the practice-question articles has no "je/jij/jouw/jullie" either (u-form).
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/nl-repair-round-checks.cjs   (WIDTHS=1440,390 by default)
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const ORIGIN = process.env.PILOT_ORIGIN || "http://localhost:10088";
const NL = `${ORIGIN}/nl/fides-design-pilot/learn/topics`;
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${String(detail).slice(0, 300)})` : ""}`);
}
const JE = /\b(je|jij|jouw|jou|jullie)\b/i;
const SKIP = "#cmplz-cookiebanner-container, .cmplz-cookiebanner, .fides-assistant, .fides-learn-sources, [data-fides-ssr], script, style, noscript";
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function open(page, p) {
  const r = await page.goto(`${NL}/${p}/`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1200 }).then(() => true, () => false)) await deny.click();
  await page.waitForLoadState("networkidle").catch(() => {});
  return r;
}
async function read(page) {
  return page.evaluate((skip) => {
    const main = document.querySelector("main") || document.body;
    const texts = [];
    const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const t = n.nodeValue.replace(/\s+/g, " ").trim();
      if (t && n.parentElement && !n.parentElement.closest(skip)) texts.push(t);
    }
    const crumbs = [...document.querySelectorAll("nav[aria-label='Kruimelpad'] li, nav[aria-label='Kruimelpad'] a, nav[aria-label='Kruimelpad'] span")].map((e) => e.textContent.replace(/\s+/g, " ").trim());
    return { texts, flat: main.innerText.replace(/\s+/g, " "), h1: [...main.querySelectorAll("h1")].map((e) => e.textContent.replace(/\s+/g, " ").trim()), crumbs, title: document.title, links: [...main.querySelectorAll("a")].map((a) => a.textContent.replace(/\s+/g, " ").trim()) };
  }, SKIP);
}

// 1. The proposal file is in u-form (static check, once).
const proposals = fs.readFileSync(path.join(__dirname, "..", "learn", "nl-translation-changes-practice-questions.md"), "utf8");
const dutchLines = proposals.split("\n").filter((l) => !/^\s*$/.test(l));
const jeLines = dutchLines.filter((l) => JE.test(l));
check("proposal file practice questions: no je/jij/jouw/jullie", jeLines.length === 0, jeLines.slice(0, 2).join(" | "));
const rows = require(path.join(__dirname, "..", "learn", "nl-translations.json")).entries || [];
const jeRows = rows.filter((e) => JE.test(e.translation || ""));
check("transfer file: no je/jij/jouw/jullie in any exported Dutch row", jeRows.length === 0, jeRows.slice(0, 2).map((e) => e.translation).join(" | "));

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource|Content Security Policy|the server responded/.test(m.text()) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.route("**/*", (route) => {
      const req = route.request();
      if (req.method() === "GET" || req.method() === "HEAD" || /action=trp_get_translations/.test(req.postData() || "")) return route.continue();
      return route.abort();
    });
    const tag = (p) => `/nl/.../${p} @${width}`;

    // Role chips
    let d = await (async () => { await open(page, "ecosystem-roles"); return read(page); })();
    for (const chip of ["Houder", "Vertrouwende partij", "Walletaanbieder"]) check(`${tag("ecosystem-roles")}: chip "${chip}" shown`, d.texts.includes(chip), "missing");
    check(`${tag("ecosystem-roles")}: no English role chip`, !d.texts.some((t) => /^(Holder|Relying Party|Wallet Provider)$/.test(t)), d.texts.filter((t) => /^(Holder|Relying Party|Wallet Provider)$/.test(t)).join(","));
    await open(page, "for-governments");
    d = await read(page);
    for (const chip of ["Vertrouwende partij", "Authentieke bron"]) check(`${tag("for-governments")}: chip "${chip}" shown`, d.texts.includes(chip), "missing");
    check(`${tag("for-governments")}: no English role chip`, !d.texts.some((t) => /^(Relying Party|Authentic Source)$/.test(t)));
    check(`${tag("for-governments")}: no horizontal overflow`, (await overflow(page)) <= 0);
    check(`${tag("for-governments")}: GBO intro and catalog fragment (editorial text)`, d.flat.includes("In deze artikelen gebruiken we het Nederlandse programma Gemeenschappelijke Bronontsluiting (GBO) als voorbeeld. Het ontwerp is nog in ontwikkeling. Andere landen kunnen dit anders inrichten.") && d.flat.includes("Bekijk wie credentials uitgeeft en gebruikt:"), "missing");

    // GBO labels and Article 45e paragraph
    await open(page, "for-governments/issuing-public-information-to-wallets");
    d = await read(page);
    check(`${tag("issuing-public-information-to-wallets")}: labels "Controleren (verify):" and "Ophalen (retrieve):"`, d.texts.includes("Controleren (verify):") && d.texts.includes("Ophalen (retrieve):"), d.texts.filter((t) => /verify|retrieve/i.test(t)).join(" | "));
    check(`${tag("issuing-public-information-to-wallets")}: Article 45e text keeps the conditions (Member States, user request, Annex VI, authentic sources, applicable law)`, /verplichting voor lidstaten/.test(d.flat) && /op verzoek van de gebruiker/.test(d.flat) && /bijlage VI/.test(d.flat) && /publieke sector/.test(d.flat) && /toepasselijke recht/.test(d.flat) && /artikel 45e van de gewijzigde eIDAS-verordening/.test(d.flat), "missing");
    check(`${tag("issuing-public-information-to-wallets")}: no English "Verify:"/"Retrieve:" label`, !d.texts.some((t) => /^(Verify|Retrieve):$/.test(t)));
    check(`${tag("issuing-public-information-to-wallets")}: Kamer-style card sentence for TECH5 (production status)`, d.flat.includes("De catalogus noemt TECH5 als betrokken organisatie. Volgens opgave van de organisatie is deze usecase in productie."), "missing");

    await open(page, "for-governments/digital-wallets-and-public-services");
    d = await read(page);
    check(`${tag("digital-wallets-and-public-services")}: card without production status`, d.flat.includes("De catalogus noemt de Kamer van Koophandel als betrokken organisatie. De catalogus vermeldt deze usecase niet als in productie."), "missing");

    await open(page, "for-governments/accepting-information-from-wallets-in-public-services");
    d = await read(page);
    check(`${tag("accepting-information-from-wallets-in-public-services")}: Article 5f points 2 and 5, GBO paragraph, card`, d.flat.includes("In lid 1 staat dat lidstaten de wallets ook moeten accepteren. Het lid bepaalt niet dat een dienst uitsluitend wallets mag accepteren.") && d.flat.includes("Lid 1 schrijft niet voor welke attributen of credentials een dienst moet opvragen") && d.flat.includes("Een dienst kan gegevens dus ook op andere manieren dan via een wallet ontvangen.") && d.flat.includes("De catalogus noemt Gemeente Nijmegen als betrokken organisatie."), "missing");

    await open(page, "for-governments/the-eudi-wallet-and-national-implementation");
    d = await read(page);
    check(`${tag("the-eudi-wallet-and-national-implementation")}: OOTS and DvTP fragments`, d.flat.includes("en de betrokkene dat volgens het ontwerp kan bekijken en ermee kan instemmen voordat het wordt verstuurd.") && d.flat.includes("Volgens het ontwerp ontvangt de private dienstverlener een pseudoniem dat specifiek voor die partij is, en geen burgerservicenummer."), "missing");

    // For you article title and links to it
    const FY = "Informatie delen vanuit een wallet";
    const r = await open(page, "for-you/sharing-information-from-a-wallet");
    check(`${tag("for-you/sharing-information-from-a-wallet")}: answers 200`, r.status() === 200);
    d = await read(page);
    check(`${tag("for-you/sharing-information-from-a-wallet")}: H1 is "${FY}"`, d.h1[0] === FY, d.h1.join("|"));
    check(`${tag("for-you/sharing-information-from-a-wallet")}: breadcrumb ends in the Dutch title`, d.crumbs.some((c) => c.includes(FY)), d.crumbs.join(" | "));
    // Note: the HTML <title> is English on every /nl/ page of the pilot (TranslatePress does not translate it here); not part of this round.
    check(`${tag("for-you/sharing-information-from-a-wallet")}: no horizontal overflow`, (await overflow(page)) <= 0);
    for (const p of ["for-you", "ecosystem-roles/the-holder"]) {
      await open(page, p);
      d = await read(page);
      check(`${tag(p)}: link/teaser title is "${FY}"`, d.links.includes(FY) || d.texts.includes(FY), "missing");
      check(`${tag(p)}: no English "Sharing information from a wallet"`, !d.texts.includes("Sharing information from a wallet"));
    }

    // The three route strings
    await open(page, "for-businesses/business-wallets-where-to-start");
    d = await read(page);
    check(`${tag("business-wallets-where-to-start")}: role question paragraph`, d.flat.includes("Welke rol speelt uw organisatie daarin?") && !d.flat.includes("Which role does your organisation play in it?"), "missing");
    check(`${tag("business-wallets-where-to-start")}: no je-form`, !JE.test(d.flat), (d.flat.match(JE) || [""])[0]);
    await open(page, "for-businesses/european-business-wallet");
    d = await read(page);
    check(`${tag("european-business-wallet")}: status paragraph (Council 9 June 2026, Parliament October 2026)`, d.flat.includes("De Raad stelde zijn onderhandelingspositie vast op 9 juni 2026 en het Europees Parlement besloot in oktober 2026 onderhandelingen met de Raad te openen.") && d.flat.includes("Uit het voorstel zelf volgt geen verplichting voor organisaties."), "missing");
    await open(page, "for-businesses/accepting-information-from-a-wallet");
    d = await read(page);
    check(`${tag("accepting-information-from-a-wallet")}: link title "Wat moet een dienst controleren bij ontvangst van een credential?"`, d.links.includes("Wat moet een dienst controleren bij ontvangst van een credential?"), d.links.filter((l) => /credential/i.test(l)).join(" | "));

    // Practice questions: titles, teasers, CTA in u-form
    await open(page, "for-businesses");
    d = await read(page);
    for (const t of ["Hoe kan een organisatie een wallet-toepassing voorbereiden?", "Wat moet een dienst controleren bij ontvangst van een credential?", "Hoe kan iemand namens een organisatie handelen?", "Kies één interactie en leg de informatie en afspraken vast.", "Controleer de credential en beslis daarna of de informatie volstaat."]) {
      check(`${tag("for-businesses")}: "${t.slice(0, 60)}"`, d.texts.includes(t), "missing");
    }
    check(`${tag("for-businesses")}: no je-form`, !JE.test(d.flat), (d.flat.match(JE) || [""])[0]);
    check(`${tag("for-businesses")}: no horizontal overflow`, (await overflow(page)) <= 0);
    for (const p of ["for-businesses/how-can-someone-act-for-an-organisation", "for-businesses/how-can-an-organisation-prepare-a-wallet-use-case", "for-businesses/what-should-a-service-check-when-receiving-a-credential"]) {
      const resp = await open(page, p);
      d = await read(page);
      check(`${tag(p)}: answers 200`, resp.status() === 200);
      check(`${tag(p)}: Dutch H1 (${d.h1.join(" / ")})`, d.h1.length === 1 && /^(Hoe kan|Wat moet)/.test(d.h1[0]), d.h1.join("|"));
      check(`${tag(p)}: no je-form in the Dutch text`, !JE.test(d.flat), (d.flat.match(JE) || [""])[0]);
      check(`${tag(p)}: no horizontal overflow`, (await overflow(page)) <= 0);
    }
    await open(page, "for-businesses/how-can-an-organisation-prepare-a-wallet-use-case");
    d = await read(page);
    check(`${tag("how-can-an-organisation-prepare-a-wallet-use-case")}: CTA in u-form`, d.flat.includes("Kijk naar uw eigen uitwisseling") && d.flat.includes("Werk één uitwisseling met uw team uit in de Wallet Readiness Workshop."), "missing");

    check(`@${width}: no console errors`, errors.length === 0, errors.join(" | "));
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
