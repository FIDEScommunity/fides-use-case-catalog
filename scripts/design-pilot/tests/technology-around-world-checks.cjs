/**
 * Targeted checks for Learn > Topics > Technology and Around the world (two overviews, three Technology articles and three
 * Around the world pages) at 1440 and 390 px. Per page: 200, English, one H1, breadcrumb with clickable parents, intro,
 * sections, sources (Organisation · Title, external, new tab), internal links answer 200, external links are not broken
 * (403/429 and network trouble are warnings), no unavailable destinations, no lone article before a link or term, no
 * "Design preview", last-checked date and responsible source on the country/initiative pages, plans described as plans,
 * no horizontal overflow, visible focus, no console errors. Topics: both rows are links; back links from existing pages;
 * the QTSP filter link of the Trust frameworks article opens the organisation catalog with results.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/technology-around-world-checks.cjs   (WIDTHS=1440,390 by default)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const L = "/fides-design-pilot/learn";
const TECH = `${L}/topics/technology/`;
const WORLD = `${L}/topics/around-the-world/`;
const S = {
  vci: ["OpenID Foundation", "OpenID for Verifiable Credential Issuance 1.0", "https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-final.html"],
  vp: ["OpenID Foundation", "OpenID for Verifiable Presentations 1.0", "https://openid.net/specs/openid-4-verifiable-presentations-1_0-final.html"],
  vcdm: ["W3C", "Verifiable Credentials Data Model 2.0", "https://www.w3.org/TR/vc-data-model-2.0/"],
  sd: ["IETF", "SD-JWT-based Verifiable Digital Credentials (SD-JWT VC), Internet-Draft draft-ietf-oauth-sd-jwt-vc-26", "https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/"],
  iso: ["ISO/IEC", "ISO/IEC 18013-5:2021 Mobile driving licence (mDL) application", "https://www.iso.org/standard/69084.html"],
  tl: ["European Commission", "List of qualified trust service providers in the EU", "https://digital-strategy.ec.europa.eu/en/policies/eu-trusted-lists"],
  arf: ["EU Digital Identity Wallet", "Architecture and Reference Framework, trust model (chapter 6)", "https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/main/06-trust-model.md"],
  edi: ["EDI-Stelsel Nederland", "Achtergrondinformatie Europese Digitale Identiteit (EDI)", "https://edi.pleio.nl/page/view/418945e3-ced5-42e2-aeb6-a799ad2f9bce/achtergrondinformatie-europese-digitale-identiteit-edi"],
  ictu: ["ICTU", "Joint approach to uniform sharing of data (GBO)", "https://www.ictu.nl/projecten/gezamenlijke-aanpak-voor-uniform-delen-van-gegevens/"],
  go: ["ICTU", "Gemeenschappelijke Bronontsluiting, Globaal Ontwerp, version 0.9.5 (September 2026)", "https://ictu.github.io/GBO-GO/latest/"],
  dyou: ["German EUDI Wallet programme", "d-you: Name and Logo of Germany’s EUDI Wallet Unveiled", "https://eudi-wallet.gov.de/en/news/d-you-name-and-logo-of-germany-s-eudi-wallet-unveiled"],
  faq: ["German EUDI Wallet programme", "Frequently asked questions", "https://eudi-wallet.gov.de/en/faq"],
  eco: ["German EUDI Wallet programme", "The EUDI Wallet ecosystem", "https://eudi-wallet.gov.de/en/ecosystem"],
  untp: ["UN/CEFACT", "UNTP Digital Product Passport", "https://untp.unece.org/docs/specification/product-passport/"],
  about: ["UN/CEFACT", "About the UNTP", "https://untp.unece.org/docs/about/"],
};
const HUBS = [
  { key: "technology", path: TECH, h1: "Technology", crumbs: ["Learn", "Topics", "Technology"], intro: /^Wallet interactions bring together information, software and agreements between organisations\./,
    headings: ["Understanding the technology", "Explore in the catalogs"], panel: "Start with the interaction",
    rows: [`${L}/topics/the-big-picture/formats-and-protocols/`, `${TECH}how-do-wallets-and-services-exchange-information/`, `${TECH}credential-formats-and-interoperability/`, `${TECH}trust-frameworks-and-registries/`, `${L}/topics/the-big-picture/trust-and-interoperability/`],
    links: ["credentials/", "personal-wallets/", "business-wallets/", "overview/"] },
  { key: "around-the-world", path: WORLD, h1: "Digital trust around the world", crumbs: ["Learn", "Topics", "Around the world"], intro: /^Countries and international initiatives are developing different ways to use digital identity, wallets and verifiable information\./,
    headings: ["Explore by country", "Explore international initiatives", "Explore in FIDES"], panel: "Check the source and the date",
    rows: [`${WORLD}the-netherlands/`, `${WORLD}germany/`, `${WORLD}india/`, `${WORLD}canada/`, `${WORLD}united-states/`, `${WORLD}honduras/`, `${WORLD}ethiopia/`, `${L}/topics/the-big-picture/european-digital-identity-wallet/`, `${L}/topics/for-governments/the-eudi-wallet-and-national-implementation/`, `${WORLD}un-transparency-protocol/`],
    links: ["overview/", "organizations/", "personal-wallets/", "business-wallets/"] },
];
const PAGES = [
  { group: "technology", parent: "Technology", series: ["how-do-wallets-and-services-exchange-information", "credential-formats-and-interoperability", "trust-frameworks-and-registries"], slug: "how-do-wallets-and-services-exchange-information", title: "How do wallets and services exchange information?",
    eyebrow: /Explainer\s*·\s*Technology/i, intro: /^Follow a credential from issuance to presentation/, sources: [S.vci, S.vp],
    headings: ["Start with an example", "Receiving a credential", "Presenting information", "What should organisations check?", "Continue learning"],
    links: ["formats-and-protocols", "credential-formats-and-interoperability", "accepting-information-from-a-wallet", "how-credentials-connect", "personal-wallets", "business-wallets"], terms: 2, learnMore: 4, note: /Content last checked: 13 November 2026/, must: [/final OpenID Foundation specifications/] },
  { group: "technology", parent: "Technology", slug: "credential-formats-and-interoperability", title: "Credential formats and interoperability",
    eyebrow: /Explainer\s*·\s*Technology/i, intro: /^See what a format describes and what else affects compatibility/, sources: [S.vcdm, S.sd, S.iso],
    headings: ["What does a format describe?", "More than a format", "Comparing products", "Continue learning"],
    links: ["formats-and-protocols", "how-do-wallets-and-services-exchange-information", "trust-and-interoperability", "credentials/", "personal-wallets", "business-wallets"], terms: 4, learnMore: 4, note: /Content last checked: 13 November 2026/, must: [/Internet-Draft/, /version 26/, /ISO\/IEC 18013-5/, /Recommendation \(May 2025\)/] },
  { group: "technology", parent: "Technology", slug: "trust-frameworks-and-registries", title: "Trust frameworks and registries",
    eyebrow: /Explainer\s*·\s*Technology/i, intro: /^How do participants agree on rules/, sources: [S.tl, S.arf, S.vcdm],
    headings: ["What is a trust framework?", "What can a registry provide?", "Trusted lists and qualified trust services", "Questions to ask", "Continue learning"],
    links: ["trust-and-interoperability", "trust-service-providers-and-trust-frameworks", "what-should-a-service-check-when-receiving-a-credential", "cert=qtsp", "credentials/", "eu-trusted-lists"], terms: 2, learnMore: 4, note: /Content last checked: 13 November 2026/, qtsp: true, must: [/Use the official trusted lists for an authoritative check/] },
  { group: "around-the-world", parent: "Around the world", slug: "the-netherlands", title: "The Netherlands — digital identity and public data",
    eyebrow: /Country\s*·\s*Around the world/i, intro: /^How is the Netherlands working on the European Digital Identity Wallet/, sources: [S.edi, S.ictu, S.go],
    headings: ["The Dutch EDI system", "Access to public-source data", "Where the information comes from", "Continue learning"],
    links: ["the-eudi-wallet-and-national-implementation", "issuing-public-information-to-wallets", "overview/", "organizations/"], terms: 3, learnMore: 2, note: /Content last checked: 13 November 2026/, dated: true,
    must: [/Ministry of the Interior and Kingdom Relations/, /version 0\.9\.5 of September 2026/, /These are plans\./, /does not describe the features or availability of any Dutch wallet/], mustNot: [/NL Wallet (is|can|will|lets|allows|supports)/i] },
  { group: "around-the-world", parent: "Around the world", slug: "germany", title: "Germany — the EUDI Wallet ecosystem",
    eyebrow: /Country\s*·\s*Around the world/i, intro: /^What is the German EUDI Wallet programme/, sources: [S.dyou, S.faq, S.eco],
    headings: ["The name and the planned launch", "The ecosystem", "Where the information comes from", "Continue learning"],
    links: ["european-digital-identity-wallet", "the-eudi-wallet-and-national-implementation", "personal-wallets", "overview/"], terms: 1, learnMore: 2, note: /Content last checked: 13 November 2026/, dated: true,
    must: [/9 September 2026/, /15 September 2026/, /2 January 2027/, /This is a plan\./, /early 2027/, /Karsten Wildberger/], mustNot: [/d-you (is|was|has been) (now )?(available|launched)/i] },
  { group: "around-the-world", parent: "Around the world", slug: "un-transparency-protocol", title: "UN Transparency Protocol",
    eyebrow: /Initiative\s*·\s*Around the world/i, intro: /^What is the UN Transparency Protocol/, sources: [S.untp, S.about],
    headings: ["What is the UNTP digital product passport?", "Status", "Where the information comes from", "Continue learning"],
    links: ["what-is-a-credential", "formats-and-protocols", "overview/", "credentials/", "canada/"], terms: 2, learnMore: 3, note: /Content last checked: 13 November 2026/, dated: true,
    must: [/Work in Progress/, /pre-production pilot/, /0\.8\.0/, /does not conflict with national regulations such as the EU digital product passport/] },
];
const BACKLINKS = [
  ["topics/", ["technology/", "around-the-world/"]],
  ["topics/the-big-picture/formats-and-protocols/", ["technology/how-do-wallets-and-services-exchange-information/"]],
  ["topics/the-big-picture/trust-and-interoperability/", ["technology/trust-frameworks-and-registries/"]],
];
const UNAVAILABLE = /issuer-catalog|relying-party-websites|interop-profiles|interop-matrix|\/matrix/;
const linkCache = new Map();
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${String(detail).slice(0, 240)})` : ""}`);
}
const norm = (hs) => hs.map((h) => (h.startsWith(BASE) ? h.slice(BASE.length) : h));
const squash = (s) => String(s).replace(/\s+/g, " ").trim();
async function open(page, url) {
  const response = await page.goto(url.startsWith("http") ? url : `${BASE}${url}`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
  return response;
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function externalStatus(page, h) {
  if (linkCache.has(h)) return linkCache.get(h);
  let status = 0;
  try { status = (await page.request.get(h, { timeout: 12000 })).status(); } catch (e) { status = -1; }
  linkCache.set(h, status);
  return status;
}
async function linksOk(page, tag, hrefs, extra) {
  const internal = [...new Set(hrefs.filter((h) => h.startsWith("/")))];
  const bad = [];
  for (const h of internal) { if (!linkCache.has(h)) linkCache.set(h, (await page.request.get(`${BASE}${h}`)).status()); if (linkCache.get(h) !== 200) bad.push(`${h} ${linkCache.get(h)}`); }
  check(`${tag}: ${internal.length} internal links answer 200`, internal.length >= 3 && bad.length === 0, bad.join(", "));
  const external = [...new Set([...hrefs, ...(extra || [])].filter((h) => /^https?:/.test(h)))];
  for (const h of external) {
    const status = await externalStatus(page, h);
    // Network trouble or bot protection (403/429) is reported, not counted as a broken link.
    if (status === -1 || [401, 403, 405, 429, 999].includes(status)) console.log(`warn - ${tag}: external ${h.slice(0, 80)} answered ${status} (not verifiable from here)`);
    else check(`${tag}: external link ${h.slice(0, 70)} answers < 400`, status > 0 && status < 400, String(status));
  }
}
async function focusOk(page, tag, locators) {
  for (const t of locators) {
    if (!(await t.count())) continue;
    await t.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    // A row link has no outline of its own: the focus ring is the inset shadow of its list item.
    const f = await t.evaluate((el) => { const s = getComputedStyle(el); const li = el.parentElement && el.parentElement.matches("li") && el.parentElement.parentElement.classList.contains("fides-learn-rows") ? getComputedStyle(el.parentElement) : null; return { active: document.activeElement === el, outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0, shadow: s.boxShadow !== "none" || (!!li && li.boxShadow !== "none") }; });
    check(`${tag}: keyboard focus is visible (${await t.evaluate((el) => el.className || el.tagName)})`, f.active && (f.outline || f.shadow), JSON.stringify(f));
  }
}
/** A paragraph or list item must not start with a lone A / An / The directly before a link, term or bold text. */
async function loneArticles(page, scope) {
  return page.evaluate((sel) => {
    const out = [];
    for (const el of document.querySelectorAll(`${sel} p, ${sel} li`)) {
      const first = el.firstChild;
      if (first && first.nodeType === 3 && /^(A|An|The)\s*$/i.test(first.nodeValue.trim()) && first.nextSibling && first.nextSibling.nodeType === 1) out.push(el.textContent.trim().slice(0, 60));
    }
    return out;
  }, scope);
}
async function crumbCheck(page, tag, names, parents) {
  const crumbs = squash(await page.locator("nav[aria-label=Breadcrumb]").first().textContent().catch(() => ""));
  check(`${tag}: breadcrumb ${names.join(" / ")}`, crumbs === names.join(" ") || crumbs === names.join(""), crumbs);
  const crumbLinks = await page.locator("nav[aria-label=Breadcrumb] a").evaluateAll((as) => as.map((x) => new URL(x.href).pathname.replace(/\/$/, "")));
  check(`${tag}: breadcrumb parents are clickable`, crumbLinks.join(",") === parents.join(","), crumbLinks.join(","));
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    // Overviews.
    for (const h of HUBS) {
      const tag = `${h.key} overview @${width}`;
      const r = await open(page, h.path);
      check(`${tag}: answers 200`, r && r.status() === 200);
      check(`${tag}: English page`, /^en/i.test(await page.evaluate(() => document.documentElement.lang)));
      const h1s = await page.locator("h1").allInnerTexts();
      check(`${tag}: one H1 "${h.h1}"`, h1s.length === 1 && h1s[0].trim() === h.h1, h1s.join("|"));
      await crumbCheck(page, tag, h.crumbs, [L, `${L}/topics`]);
      const intro = squash(await page.locator(".fides-learn__intro").first().innerText().catch(() => ""));
      check(`${tag}: intro text`, h.intro.test(intro), intro);
      const heads = (await page.locator(".fides-learn__content h2, .fides-learn__content h3").allInnerTexts()).map(squash);
      for (const x of [...h.headings, h.panel, "Terms you will meet"]) check(`${tag}: section "${x}"`, heads.includes(x), heads.join("|"));
      const text = squash(await page.locator(".fides-learn__content").innerText());
      check(`${tag}: no "Design preview", no "Coming soon", no "not available yet"`, !/Design preview|Coming soon|not available yet/i.test(text));
      check(`${tag}: last checked date 13 November 2026`, /Content last checked: 13 November 2026/.test(text));
      const lone = await loneArticles(page, ".fides-learn__content");
      check(`${tag}: no lone article before a link or term`, lone.length === 0, lone.join(" | "));
      const rowHrefs = await page.locator(".fides-learn__content ul.fides-learn-rows > li > a").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
      check(`${tag}: ${h.rows.length} rows with exactly the expected links, in order`, rowHrefs.join(",") === h.rows.join(","), rowHrefs.join(","));
      const rowTitles = (await page.locator(".fides-learn__content ul.fides-learn-rows > li > a").allInnerTexts()).map(squash);
      check(`${tag}: no row without a link`, (await page.locator(".fides-learn__content ul.fides-learn-rows > li > strong.fides-learn-rows__title").count()) === 0);
      const terms = await page.locator(".fides-learn__content button.fides-ds-term, .fides-learn__content .fides-ds-term").count();
      check(`${tag}: glossary terms are shown in the panel`, terms >= 3, terms);
      const hrefs = norm(await page.locator(".fides-learn__content a[href]").evaluateAll((as) => as.map((x) => x.getAttribute("href"))));
      for (const l of h.links) check(`${tag}: links to ${l}`, hrefs.some((x) => x.includes(l)), hrefs.join(" "));
      check(`${tag}: no local host and no unavailable destination in the links`, hrefs.every((x) => !/localhost|127\.0\.0\.1/.test(x) && !UNAVAILABLE.test(x)));
      await linksOk(page, tag, hrefs);
      // Row titles equal the real page titles of the Learn pages they link to.
      for (let i = 0; i < rowHrefs.length; i += 1) {
        const rr = await page.request.get(`${BASE}${rowHrefs[i]}`);
        const html = await rr.text();
        const m = /<h1[^>]*>([^<]+)<\/h1>/.exec(html);
        const title = m ? m[1].replace(/&amp;/g, "&").replace(/&#8217;/g, "’").trim() : "";
        const crumb = />([^<]+)<\/(?:span|strong|a)>\s*<\/(?:li|nav)>/.exec(html);
        check(`${tag}: row "${rowTitles[i].slice(0, 50)}" matches the page it links to`, title === rowTitles[i] || (crumb && crumb[1].trim() === rowTitles[i]) || html.includes(`>${rowTitles[i].replace(/&/g, "&amp;")}<`), `${title} / ${rowTitles[i]}`);
      }
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0, await overflow(page));
      await focusOk(page, tag, [page.locator(".fides-learn__content ul.fides-learn-rows a").first()]);
      check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));
    }

    // Articles and pages.
    const series = PAGES.filter((p) => p.group === "technology");
    for (const a of PAGES) {
      const base = a.group === "technology" ? TECH : WORLD;
      const tag = `${a.slug} @${width}`;
      const r = await open(page, `${base}${a.slug}/`);
      check(`${tag}: answers 200`, r && r.status() === 200);
      check(`${tag}: English page`, /^en/i.test(await page.evaluate(() => document.documentElement.lang)));
      const h1s = await page.locator("h1").allInnerTexts();
      check(`${tag}: one H1 "${a.title}"`, h1s.length === 1 && h1s[0].trim() === a.title, h1s.join("|"));
      await crumbCheck(page, tag, ["Learn", "Topics", a.parent, a.title], [L, `${L}/topics`, base.replace(/\/$/, "")]);
      const eyebrow = squash(await page.locator(".fides-learn-article__eyebrow, .fides-learn__eyebrow").first().innerText().catch(() => ""));
      check(`${tag}: eyebrow`, a.eyebrow.test(eyebrow || squash(await page.locator("main").innerText())), eyebrow);
      const intro = squash(await page.locator(".fides-learn__intro").first().innerText().catch(() => ""));
      check(`${tag}: intro text`, a.intro.test(intro), intro);
      const heads = (await page.locator(".fides-learn-article__body h2").allInnerTexts()).map(squash);
      for (const x of a.headings) check(`${tag}: section "${x}"`, heads.includes(x), heads.join("|"));
      const body = squash(await page.locator(".fides-learn-article__body").innerText());
      check(`${tag}: last checked date`, a.note.test(body));
      check(`${tag}: no "Design preview", no "Coming soon"`, !/Design preview|Coming soon/i.test(body));
      for (const re of a.must || []) check(`${tag}: text contains ${re}`, re.test(body));
      for (const re of a.mustNot || []) check(`${tag}: text does not contain ${re}`, !re.test(body));
      if (a.dated) {
        check(`${tag}: responsible source and check date (13 November 2026)`, /Responsible source/.test(body) && /checked on 13 November 2026/.test(body));
        check(`${tag}: source labels carry the consulted date`, (await page.locator(".fides-learn-sources__link").allInnerTexts()).every((t) => /13 November 2026/.test(t)));
      }
      const lone = await loneArticles(page, ".fides-learn-article__body");
      check(`${tag}: no lone article before a link or term`, lone.length === 0, lone.join(" | "));
      const chips = await page.locator(".fides-learn-article__body p button.fides-ds-term, .fides-learn-article__body li button.fides-ds-term").count();
      check(`${tag}: glossary term chips in the text (${a.terms})`, chips === a.terms, chips);
      const learnMore = await page.evaluate(() => { const h = [...document.querySelectorAll(".fides-learn-article__body h3")].find((x) => x.textContent.trim() === "Learn more"); const ul = h && h.nextElementSibling; return ul ? ul.querySelectorAll("li").length : 0; });
      check(`${tag}: "Learn more" has ${a.learnMore} links`, learnMore === a.learnMore, learnMore);
      const groups = await page.locator(".fides-learn-article__body h3").allInnerTexts();
      check(`${tag}: groups "Learn more" and "Explore in the catalogs"`, ["Learn more", "Explore in the catalogs"].every((g) => groups.includes(g)), groups.join("|"));

      // Sources: exactly the named ones, name in bold, external, new tab.
      const src = await page.locator(".fides-learn-sources__link").evaluateAll((as) => as.map((x) => ({ href: x.getAttribute("href"), name: x.querySelector(".fides-learn-sources__name")?.textContent.trim(), text: x.textContent.replace(/\s+/g, " ").trim(), target: x.target })));
      check(`${tag}: ${a.sources.length} sources listed`, src.length === a.sources.length, JSON.stringify(src.map((s) => s.href)));
      for (const [name, title, href] of a.sources) {
        const hit = src.find((s) => s.href === href);
        check(`${tag}: source "${name} · ${title.slice(0, 40)}"`, !!hit && hit.name === name && hit.text.includes(title) && hit.target === "_blank", JSON.stringify(hit));
      }

      // Links.
      const hrefs = norm(await page.locator(".fides-learn-article__body a[href]").evaluateAll((as) => as.map((x) => x.getAttribute("href"))));
      check(`${tag}: no local host in the content links`, hrefs.every((x) => !/localhost|127\.0\.0\.1/.test(x)));
      check(`${tag}: no link to an unavailable destination (issuer catalog, relying party websites, interop profiles or matrix)`, hrefs.every((x) => !UNAVAILABLE.test(x)), hrefs.filter((x) => UNAVAILABLE.test(x)).join(","));
      for (const l of a.links) check(`${tag}: links to ${l}`, hrefs.some((x) => x.includes(l)), hrefs.join(" "));
      await linksOk(page, tag, hrefs, src.map((s) => s.href));

      // Series navigation (Technology): Previous / Next in the order of the articles.
      if (a.group === "technology") {
        const i = series.indexOf(a);
        const prev = await page.locator("nav.fides-learn-series a[rel=prev]").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
        const next = await page.locator("nav.fides-learn-series a[rel=next]").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
        check(`${tag}: Previous is ${i ? series[i - 1].slug : "absent"}`, i ? prev.join() === `${TECH}${series[i - 1].slug}/` : prev.length === 0, prev.join());
        check(`${tag}: Next is ${i < series.length - 1 ? series[i + 1].slug : "absent"}`, i < series.length - 1 ? next.join() === `${TECH}${series[i + 1].slug}/` : next.length === 0, next.join());
      }

      // QTSP filter link: opens the organisation catalog and lists organisations.
      if (a.qtsp) {
        const q = hrefs.find((x) => x.includes("cert=qtsp"));
        check(`${tag}: QTSP filter link points at the pilot organisation catalog`, !!q && q.startsWith("/fides-design-pilot/organizations/") && /[?&]cert=qtsp\b/.test(q), q);
        if (q) {
          await page.locator(`.fides-learn-article__body a[href$="cert=qtsp"]`).first().click();
          await page.waitForURL("**cert=qtsp**", { timeout: 10000 }).catch(() => {});
          await page.waitForSelector("#fides-org-catalog-root .fides-uc-pilot__count", { timeout: 30000 }).catch(() => {});
          const countText = (await page.locator("[data-pilot-count]").first().textContent().catch(() => "")) || "";
          const shown = parseInt(countText, 10);
          check(`${tag}: QTSP filter shows results (count "${countText.trim()}" > 0)`, shown > 0, countText);
          const cards = await page.locator("#fides-org-catalog-root [data-org-id], #fides-org-catalog-root .fides-uc-pilot__row, #fides-org-catalog-root a[href*='?org=']").count();
          check(`${tag}: QTSP filter page lists organisations`, cards > 0, cards);
          check(`${tag}: QTSP filter page has no horizontal overflow`, (await overflow(page)) <= 0, await overflow(page));
        }
      }

      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0, await overflow(page));
      await open(page, `${base}${a.slug}/`);
      await focusOk(page, tag, [page.locator(".fides-learn-article__body ul a").first(), page.locator(".fides-learn-sources__link").first()]);
      check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));
    }

    // Topics: both rows are links and open their overview.
    {
      const tag = `topics @${width}`;
      for (const [name, path, h1, desc] of [["Technology", TECH, "Technology", /Formats, protocols, trust frameworks and interoperability/], ["Around the world", WORLD, "Digital trust around the world", /Explore developments across countries and ecosystems/]]) {
        await open(page, `${L}/topics/`);
        const row = page.locator(".fides-learn__content ul.fides-learn-rows > li", { has: page.locator(`> a`, { hasText: new RegExp(`^${name}$`) }) }).first();
        const rowText = squash(await row.innerText().catch(() => ""));
        check(`${tag}: ${name} row has its description and no "Design preview"`, desc.test(rowText) && !/Design preview/i.test(rowText), rowText);
        const link = page.locator(".fides-learn__content ul.fides-learn-rows > li > a", { hasText: new RegExp(`^${name}$`) }).first();
        check(`${tag}: the ${name} row is a link`, (await link.count()) === 1);
        if (await link.count()) {
          check(`${tag}: ${name} link goes to ${path}`, new URL(await link.evaluate((x) => x.href)).pathname === path);
          await link.click();
          await page.waitForLoadState("domcontentloaded");
          check(`${tag}: click on ${name} opens the overview`, new URL(page.url()).pathname === path && (await page.locator("h1").first().innerText()).trim() === h1, page.url());
        }
      }
      await open(page, `${L}/topics/`);
      const others = await page.locator(".fides-learn__content ul.fides-learn-rows > li > a").evaluateAll((as) => as.map((x) => x.textContent.trim()));
      for (const n of ["The big picture", "For you", "For businesses", "For governments", "Ecosystem roles"]) check(`${tag}: existing link "${n}" is unchanged`, others.includes(n), others.join("|"));
      const plain = await page.locator(".fides-learn__content ul.fides-learn-rows > li > strong").allInnerTexts();
      check(`${tag}: the only row without a link is Wallets & credentials`, plain.length === 1 && /Wallets & credentials/.test(plain[0]), plain.join("|"));
      const lone = await loneArticles(page, ".fides-learn__content");
      check(`${tag}: no lone article before a link or term`, lone.length === 0, lone.join(" | "));
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }

    // Back links from existing pages.
    for (const [from, tos] of BACKLINKS) {
      const tag = `back link ${from} @${width}`;
      const r = await open(page, `${L}/${from}`);
      check(`${tag}: page answers 200`, r && r.status() === 200);
      const hs = norm(await page.locator(".fides-learn__content a[href], .fides-learn-article__body a[href]").evaluateAll((as) => as.map((x) => x.getAttribute("href"))));
      for (const to of tos) check(`${tag}: links to ${to}`, hs.some((x) => x === `${L}/topics/${to}`), hs.filter((x) => /technology|around-the-world/.test(x)).join(","));
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
