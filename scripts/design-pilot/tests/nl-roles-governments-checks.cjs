/**
 * Dutch checks for Learn > Topics > Ecosystem roles (overview + 5 articles) and For governments (overview + 4 articles) on the
 * local pilot, at 1440 and 390 px. Nothing is submitted (every non-GET request is aborted).
 * Per page: HTTP 200, lang nl, exactly one H1, Dutch breadcrumb, route links keep /nl/ and answer 200, no horizontal overflow,
 * no console errors, no English sentences outside the allowed list (sources, glossary data, catalogue data) and outside the list of
 * strings that still wait for an editorial decision (OPEN_ENGLISH, see learn/nl-translation-open-for-governments-roles.md),
 * agreed terminology (learn/nl-terminology.md) and the expected key terms/sentences per page.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/nl-roles-governments-checks.cjs   (WIDTHS=1440,390 by default; DUMP=1 prints the visible text)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const ORIGIN = process.env.PILOT_ORIGIN || "http://localhost:10088";
const NL = `${ORIGIN}/nl/fides-design-pilot/learn/topics`;
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const DUMP = process.env.DUMP === "1";
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${String(detail).slice(0, 300)})` : ""}`);
}

// path below /learn/topics/, expected H1, expected breadcrumb parent, strings that must be on the page.
const PAGES = [
  { path: "ecosystem-roles", h1: "Rollen in het ecosysteem", crumb: ["Rollen in het ecosysteem"], must: ["Wie doet wat wanneer gegevens via een wallet worden gedeeld?", "welke uitgevers (issuers) hij erkent", "Walletaanbieders en andere dienstverleners", "Vertrouwensdienstverleners en trust frameworks", "Rollen kunnen samenvallen", "Zoek de partijen achter de rollen op: bekijk"] },
  { path: "ecosystem-roles/the-holder", h1: "De houder", crumb: ["Rollen in het ecosysteem", "De houder"], must: ["Informatie delen vanuit een wallet", "Een houder (holder) ontvangt een credential", "zowel de houder als degene over wie de gegevens gaan", "contact opnemen met de uitgever (issuer) of een nieuw credential aanvragen", "Een mandaat of een ander bewijs", "voordat die besluit ze te delen", "Juridische en technische eisen kunnen veranderen"] },
  { path: "ecosystem-roles/the-issuer", h1: "De uitgever (issuer)", crumb: ["Rollen in het ecosysteem", "De uitgever"], must: ["Een uitgever (issuer) verstrekt een credential", "moet de uitgever de gegevens daarin kunnen vaststellen", "Eén organisatie, verschillende rollen"] },
  { path: "ecosystem-roles/the-relying-party", h1: "De vertrouwende partij", crumb: ["Rollen in het ecosysteem", "De vertrouwende partij"], must: ["Een vertrouwende partij (relying party) is een organisatie of dienst", "De organisatie gaat na welke gegevens daarvoor nodig zijn", "Een verifier voert technische controles uit"] },
  { path: "ecosystem-roles/wallet-providers-and-other-service-providers", h1: "Walletaanbieders en andere dienstverleners", crumb: ["Rollen in het ecosysteem", "Walletaanbieders en andere dienstverleners"], must: ["Een walletaanbieder stelt een wallet beschikbaar", "Een uitgever (issuer) heeft een manier nodig", "Een vertrouwende partij (relying party) heeft een manier nodig", "gebruikers gegevens ontvangen, beheren en delen"] },
  { path: "ecosystem-roles/trust-service-providers-and-trust-frameworks", h1: "Vertrouwensdienstverleners en trust frameworks", crumb: ["Rollen in het ecosysteem", "Vertrouwensdienstverleners en trust frameworks"], must: ["trust framework (afsprakenstelsel)", "Wat is een vertrouwensdienst?", "Met het filter QTSP (eIDAS) vindt u organisaties", "Controleer voor de actuele status de officiële vertrouwenslijst"] },
  { path: "for-governments", h1: "Voor overheden", crumb: ["Voor overheden"], must: ["De vragen lijken in verschillende landen op elkaar.", "Wat moet een dienst ontvangen en controleren, en wat zegt artikel 5f?", "Lees de context, versie en status", "Zoek op wie nu credentials uitgeeft en gebruikt: bekijk", "Bekijk publieke diensten in de praktijk", "Beschrijvingen van het Nederlandse voorbeeld volgen een gepubliceerd concept", "Overheidsorganisaties komen op twee manieren met wallets in aanraking.", "Digitale wallets en publieke dienstverlening", "Gegevens uit wallets accepteren in publieke diensten", "Een Nederlands voorbeeld in ontwikkeling"] },
  { path: "for-governments/digital-wallets-and-public-services", h1: "Digitale wallets en publieke dienstverlening", crumb: ["Voor overheden", "Digitale wallets en publieke dienstverlening"], must: ["uitgevoerd door ICTU, een gedeelde manier", "Meer over het Nederlandse voorbeeld, de versie en de status", "De catalogus noemt Kamer van Koophandel als organisatie. De catalogus markeert deze usecase niet als in productie.", "Met welke vraag begint u?", "Als uitgever (issuer) verstrekt zij bijvoorbeeld een credential", "vertrouwende partij (relying party) kan zij credentials van mensen ontvangen", "Een voorbeeld uit de catalogus"] },
  { path: "for-governments/issuing-public-information-to-wallets", h1: "Publieke gegevens uitgeven aan wallets", crumb: ["Voor overheden", "Publieke gegevens uitgeven aan wallets"], must: ["artikel 45e van de gewijzigde eIDAS-verordening", "Volgens het ontwerp beslissen de betrokken partijen nog welke route de voorkeur heeft", "De catalogus noemt TECH5 als organisatie.", "Vragen om mee te beginnen", "authentieke bron", "gekwalificeerde vertrouwensdienstverlener", "Een usecase in de catalogus beschrijft hoe verschillende overheidsinstanties in Honduras"] },
  { path: "for-governments/accepting-information-from-wallets-in-public-services", h1: "Gegevens uit wallets accepteren in publieke diensten", crumb: ["Voor overheden", "Gegevens uit wallets accepteren in publieke diensten"], must: ["Het geldt wanneer een lidstaat elektronische identificatie en authenticatie vereist", "Er staat “ook accepteren”.", "Het gaat om wallets die overeenkomstig de verordening worden verstrekt.", "Lid 1 noemt zelf geen datum.", "Het gaat om toegang en authenticatie.", "Dit is een samenvatting van de tekst en geen juridisch advies.", "De voorwaarden staan in artikel 5f van Verordening (EU) 2024/1183", "Het Nederlandse GBO-conceptontwerp beschrijft afzonderlijke routes", "De catalogus noemt Gemeente Nijmegen als organisatie.", "Wat zegt artikel 5f over het accepteren van wallets?", "Als een lidstaat elektronische identificatie en authenticatie vereist voor toegang tot een onlinedienst van een overheidsinstantie, moet die lidstaat ook EUDI Wallets accepteren die aan de verordening voldoen.", "Dit heet selectief gegevens delen", "optreedt als vertrouwende partij"] },
  { path: "for-governments/the-eudi-wallet-and-national-implementation", h1: "De EUDI Wallet en nationale uitwerking", crumb: ["Voor overheden", "De EUDI Wallet en nationale uitwerking"], must: ["die gezaghebbende gegevens beheren (bronhouders)", "bestaande nationale afsprakenstelsels", "Delen op basis van toestemming:", "wordt beschreven als iemand die dit bekijkt", "partijspecifiek pseudoniem", "loopt de ontwikkelfase tot december 2026", "Wat ligt op Europees niveau vast?", "Wat wordt nationaal bepaald?", "Vragen voor uw eigen land", "Versie en status", "versie 0.9.5 (september 2026)"] },
];

// Agreed terminology (learn/nl-terminology.md): must not occur in the Dutch running text of these pages.
const FORBIDDEN = [
  [/\bontvangende partij\b/i, "ontvangende partij (use vertrouwende partij; ontvangende dienst only in the general sense)"],
  [/\btrustframeworks?\b/i, "trustframework(s) (agreed: trust framework(s))"],
  [/\bvertrouwenskaders?\b/i, "vertrouwenskader(s)"],
  [/\b(de|een) issuer\b/i, "de/een issuer (agreed: uitgever (issuer) at the first mention, afterwards uitgever)"],
  [/\bissuer-rol\b/i, "issuer-rol"],
  [/\bGBO-?kader\b/i, "GBO-kader"],
];
// English interface labels that must not appear in the Dutch pages.
const ENGLISH_LABELS = /^(Skip to content|Breadcrumb|Footer|Main|Close|Learn more|Explore in the catalogs|Continue learning|On this page|Terms in this article|Terms you will meet|Open the glossary|Previous|Next|Series|Sources & further reading|\(opens in a new tab\)|Back)$/i;
const ENGLISH_WORDS = /\b(the|your|with|this|that|you|are|will|from|which|should|and|can|may|does|not)\b/;
// Parts of a page that hold third-party or data text and stay English: the source list, glossary definitions (out of scope), consent banner, assistant, catalogue cards.
const SKIP = "#cmplz-cookiebanner-container, .cmplz-cookiebanner, .cmplz-manage-consent, .fides-assistant, .fides-learn-sources, .fides-learn-terms-box, .fides-learn-terms, [data-fides-ssr], script, style, noscript, .fides-glossary-popup, [role=dialog]";
// Strings that still wait for an editorial decision (none now; see learn/nl-translation-open-for-governments-roles.md). Match: the text starts with one of these.
const OPEN_ENGLISH = []; // all earlier open strings are entered (13 Nov 2026, tag C in learn/nl-translation-changes-roles-governments-2026-11-12.md)
// Catalogue data, chips and proper names that stay English on purpose (see learn/nl-remaining-strings-review.md).
const ALLOWED_ENGLISH = [
  /^(Learn|Holder|Relying Party|Wallet Provider|Authentic Source|European Digital Identity Wallet|business wallets|eIDAS Trust Service Provider|QTSP \(eIDAS\)|EUDI Wallet:|OOTS:|Verify:|Retrieve:|Consent-based sharing:)$/,
  /Architecture and Reference Framework/, // Dutch sentence that names the ARF
  /^(Smart Government Applications Powered by Digital Wallets|Honduras: Billetera Electronica Nacional|Municipal login with attribute-based credentials)/,
];

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function open(page, path) {
  const r = await page.goto(`${NL}/${path}/`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1200 }).then(() => true, () => false)) await deny.click();
  await page.waitForLoadState("networkidle").catch(() => {});
  return r;
}
const linkStatus = new Map();
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  const openSeen = new Map(); // open English string -> pages
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    let blocked = 0;
    page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource|Content Security Policy|the server responded/.test(m.text()) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.route("**/*", (route) => {
      const body = route.request().postData() || "";
      if (/action=trp_get_translations/.test(body)) return route.continue(); // read-only TranslatePress lookup
      if (route.request().method() !== "GET" && route.request().method() !== "HEAD") { blocked += 1; return route.abort(); }
      return route.continue();
    });
    for (const p of PAGES) {
      const tag = `/nl/.../${p.path} @${width}`;
      const r = await open(page, p.path);
      check(`${tag}: answers 200`, r.status() === 200);
      const data = await page.evaluate(({ skip }) => {
        const bad = (el) => el.closest(skip);
        const texts = [];
        const main = document.querySelector("main") || document.body;
        const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) {
          const t = n.nodeValue.replace(/\s+/g, " ").trim();
          if (t && n.parentElement && !bad(n.parentElement)) texts.push(t);
        }
        const attrs = [];
        for (const el of main.querySelectorAll("[aria-label],[title],[alt],[placeholder]")) {
          if (bad(el)) continue;
          for (const a of ["aria-label", "title", "alt", "placeholder"]) { const v = el.getAttribute(a); if (v) attrs.push(v.trim()); }
        }
        const h1 = [...main.querySelectorAll("h1")].map((e) => e.textContent.replace(/\s+/g, " ").trim());
        const crumbs = [...document.querySelectorAll("nav[aria-label='Kruimelpad'] li, nav[aria-label='Kruimelpad'] a, nav[aria-label='Kruimelpad'] span")].map((e) => e.textContent.replace(/\s+/g, " ").trim());
        const crumbHrefs = [...document.querySelectorAll("nav[aria-label='Kruimelpad'] a[href]")].map((a) => a.getAttribute("href"));
        return { lang: document.documentElement.lang, texts, attrs, h1, crumbs, crumbHrefs, mainText: main.innerText.replace(/[ \t]+/g, " "), blockCount: main.querySelectorAll("p, li, h2, h3").length };
      }, { skip: SKIP });
      if (DUMP && width === WIDTHS[0]) console.log(`\n===== ${p.path}\n${data.mainText}\n`);
      check(`${tag}: html lang is nl`, /^nl/i.test(data.lang), data.lang);
      check(`${tag}: exactly one H1 (${data.h1.join(" / ")})`, data.h1.length === 1, data.h1.join(" | "));
      check(`${tag}: H1 is "${p.h1}"`, data.h1[0] === p.h1, data.h1[0]);
      const crumbText = data.crumbs.join(" | ");
      check(`${tag}: breadcrumb is Dutch and ends in the page`, p.crumb.every((c) => crumbText.includes(c)) && !/Ecosystem roles|For governments|Topics/.test(crumbText), crumbText);
      check(`${tag}: breadcrumb links keep /nl/`, data.crumbHrefs.length > 0 && data.crumbHrefs.every((h) => /\/nl\//.test(h)), data.crumbHrefs.join(", "));
      // Expected key sentences/terms
      const flat = data.mainText.replace(/\s+/g, " ").replace(/ \(definitie\)/g, ""); // glossary chips add a visually hidden "(definitie)"
      for (const m of p.must) check(`${tag}: contains "${m.slice(0, 70)}"`, flat.includes(m), "missing");
      // Terminology
      for (const [re, why] of FORBIDDEN) check(`${tag}: no ${why}`, !re.test(flat), (flat.match(re) || [""])[0]);
      // Interface labels
      const labels = [...new Set([...data.attrs, ...data.texts].filter((t) => ENGLISH_LABELS.test(t)))];
      check(`${tag}: no English interface labels`, labels.length === 0, labels.join(" | "));
      // Remaining English sentences
      const english = [...new Set(data.texts.filter((t) => t.length > 22 && ENGLISH_WORDS.test(t.toLowerCase()) && !ALLOWED_ENGLISH.some((re) => re.test(t))))];
      const known = english.filter((t) => OPEN_ENGLISH.some((o) => t.startsWith(o)));
      const unknown = english.filter((t) => !known.includes(t));
      for (const k of known) { if (!openSeen.has(k)) openSeen.set(k, new Set()); openSeen.get(k).add(p.path); }
      check(`${tag}: no unexpected English sentences (${known.length} known open)`, unknown.length === 0, unknown.slice(0, 3).join(" | "));
      // Links
      const hrefs = await page.locator("main a[href]").evaluateAll((as) => [...new Set(as.map((a) => a.href).filter((h) => h && !h.startsWith("javascript:") && !h.startsWith("mailto:")))]);
      const internal = hrefs.filter((h) => h.startsWith(ORIGIN)).map((h) => h.split("#")[0]).filter((h, i, a) => h && a.indexOf(h) === i);
      const dropped = internal.filter((h) => /\/fides-design-pilot\/(learn|services|start)(\/|$)/.test(h) && !/\/nl\/fides-design-pilot\//.test(h));
      check(`${tag}: route links keep the Dutch /nl/ prefix (${internal.length} internal)`, dropped.length === 0, dropped.slice(0, 3).join(", "));
      const badLinks = [];
      for (const h of internal) {
        if (!linkStatus.has(h)) linkStatus.set(h, (await page.request.get(h, { maxRedirects: 5 })).status());
        if (linkStatus.get(h) >= 400) badLinks.push(`${h} ${linkStatus.get(h)}`);
      }
      check(`${tag}: internal links answer 200`, badLinks.length === 0, badLinks.join(", "));
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0, await overflow(page));
    }
    check(`@${width}: no console errors`, errors.length === 0, errors.join(" | "));
    console.log(`# @${width}: aborted non-GET requests: ${blocked} (consent, assistant, TranslatePress)`);
    await context.close();
  }
  console.log(`# open English strings (waiting for a decision): ${openSeen.size}`);
  for (const [k, v] of openSeen) console.log(`#   ${k.slice(0, 90)}  [${[...v].map((x) => x.split("/").pop().slice(0, 22)).join(", ")}]`);
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
