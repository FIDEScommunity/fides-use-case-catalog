/**
 * Targeted checks for the five added "Around the world" country pages (India, Canada, United States, Honduras, Ethiopia)
 * at 1440 and 390 px. Per page: 200, English, one H1, breadcrumb with clickable parents, eyebrow, intro, sections, sources
 * (Organisation · Title, external, new tab), responsible source and check date, editorially chosen use case cards (the
 * record is named explicitly, title/organisation/status wording, image, deep link `?usecase=`), no production claim for
 * FaydaPass or the Neoflow customs test beyond the careful wording, "Learn more" has at most 4 links, internal links answer
 * 200, external links are not broken (403/429 and network trouble are warnings), no lone article before a link or term,
 * no "Design preview", no horizontal overflow, visible keyboard focus on the new links and cards, no console errors.
 * Overview: seven country rows in order, rows match the page titles. Credential formats page: the added United States link.
 * Filter links: the country links show their chip and more than 0 results on the pilot catalogs.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/around-world-countries-checks.cjs   (WIDTHS=1440,390 by default)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const P = "/fides-design-pilot";
const L = `${P}/learn`;
const WORLD = `${L}/topics/around-the-world/`;
const UC = {
  swiggy: "delivery-agent-and-customer-identity-verification-using-the-aadhaar-app-p0mDau",
  neoflow: "neoflow-digital-energy-passport-for-cross-border-crude-oil-clearance-RZDhoP",
  tsa: "secure-domestic-travel-tsa-mobile-drivers-license-at-airport-checkpoints-IyxXZl",
  california: "the-california-mdl-and-its-growing-use-and-ecosystem-of-stakeholders-YWJK3u",
  bien: "honduras-billetera-electronica-nacional-bien-4-gob-authorities-issuing-into-one-citizen-controlled-wallet-YVNSXc",
  fayda: "faydapass-rP7gpJ",
};
const IN_PROD = "marks this use case as in production, as reported by the organisation";
const PAGES = [
  { slug: "india", title: "India — Aadhaar and digital identity", intro: /^What is Aadhaar, and how does it relate to identity checks in services\?/, cc: "IN", country: "India", the: "",
    sources: [["UIDAI", "Aadhaar Handbook for Residents", "https://www.uidai.gov.in/images/LR_Aadhaar_Handbook_2026.pdf"], ["UIDAI", "Clarification on Aadhaar and date of birth", "https://uidai.gov.in/images/clarifications_regarding_date_of_birth.pdf"], ["UIDAI", "Aadhaar App: frequently asked questions", "https://uidai.gov.in/en/aadhaar-app-faq"]],
    headings: ["From an identity system to services", "See it in practice", "Where the information comes from", "Continue learning"],
    learn: ["how-credentials-connect", "what-is-a-digital-wallet"], cats: ["overview/", "personal-wallets/"], terms: 0, learnMore: 2,
    cards: [{ id: UC.swiggy, title: "Swiggy: Delivery Agent and Customer Identity Verification", status: `The catalog lists Unique Identification Authority of India as the organisation. The catalog ${IN_PROD}.`, label: "Explore the Swiggy use case" }],
    must: [/Unique Identification Authority of India \(UIDAI\)/, /not of citizenship or domicile/, /not in itself a proof of date of birth/, /do not confirm how this platform uses the Aadhaar App/, /Responsible source: UIDAI/],
    mustNot: [/Aadhaar (is|are) (mandatory|required) for/i] },
  { slug: "canada", title: "Canada — digital credentials and public services", intro: /^How are public bodies in Canada working on digital credentials\?/, cc: "CA", country: "Canada", the: "",
    sources: [["Government of Canada", "Trusted access to digital services", "https://www.canada.ca/en/government/system/digital-government/digital-government-innovations/digital-credentials.html"], ["Government of British Columbia", "BC Wallet", "https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet"], ["Government of British Columbia", "Digital trust: Legal Professional credential governance", "https://developer.gov.bc.ca/docs/default/component/digital-trust/governance/justice/legal-professional/governance/"], ["U.S. Customs and Border Protection", "Notice of a National Customs Automation Program test", "https://www.govinfo.gov/content/pkg/FR-2026-06-02/html/2026-10979.htm"]],
    headings: ["Federal services", "An example from British Columbia", "From national services to cross-border trade", "Where the information comes from", "Continue learning"],
    learn: ["what-is-a-credential", "business-wallets-where-to-start"], cats: ["overview/", "organizations/"], terms: 0, learnMore: 2,
    cards: [{ id: UC.neoflow, title: "Neoflow Digital Energy Passport for Cross-Border Crude Oil Clearance", status: `The catalog lists Neoflow (Mavennet Inc.) as the organisation and ${IN_PROD}. CBP describes the related customs programme as a one-year test.`, label: "Explore the Neoflow use case" }],
    must: [/These are plans\./, /Lawyer Credential/, /15 January 2025/, /26 October 2026/, /BC Services Card app/, /2 June 2026/, /one year, subject to extension, modification or early termination/],
    mustNot: [/barrels|bbl|45-90 days|25%|tariff/i] },
  { slug: "united-states", title: "United States — mobile driving licences", intro: /^What are mobile driving licences in the United States, and what affects where they are accepted\?/, cc: "US", country: "United States", the: "the ",
    sources: [["NIST", "Tap for ID", "https://www.nist.gov/blogs/taking-measure/tap-id-your-next-drivers-license-might-also-live-your-phone"], ["Transportation Security Administration", "Participating States and Eligible Digital IDs", "https://www.tsa.gov/digital-id/participating-states"], ["California DMV", "California mDL", "https://www.dmv.ca.gov/portal/california-mdl/"]],
    headings: ["A licence on a phone", "See it in practice", "Where the information comes from", "Continue learning"],
    learn: ["what-is-a-digital-wallet", "credential-formats-and-interoperability"], cats: ["overview/", "personal-wallets/"], terms: 1, learnMore: 2,
    cards: [
      { id: UC.tsa, title: "USA Secure Domestic Travel: TSA Mobile Driver's License at Airport Checkpoints", status: `The catalog lists Transportation Security Administration (TSA) as the organisation. The catalog ${IN_PROD}.`, label: "Explore the TSA use case" },
      { id: UC.california, title: "The California mDL and Its Growing Use and Ecosystem of Stakeholders", status: `The catalog lists California DMV as the organisation. The catalog ${IN_PROD}.`, label: "Explore the California use case" }],
    must: [/they do not establish availability across all states or airports/, /1 January 2027/, /4 May 2027/, /physical ID/, /17 December 2025/, /age-restricted retail purchases/],
    mustNot: [/\b(2|two) million\b|271 airports|45,800|6\.83/i] },
  { slug: "honduras", title: "Honduras — Billetera Electrónica Nacional", intro: /^What is BIEN, the national electronic wallet of Honduras\?/, cc: "HN", country: "Honduras", the: "",
    sources: [["DIGER", "Billetera Electrónica Nacional BIEN", "https://diger.gob.hn/identidad-digital"], ["DIGER", "Preguntas frecuentes", "https://www.diger.gob.hn/identidad-digital/preguntas-frecuentes"]],
    headings: ["Public credentials in one wallet", "See it in practice", "Where the information comes from", "Continue learning"],
    learn: ["issuing-public-information-to-wallets", "how-credentials-connect"], cats: ["overview/", "organizations/"], terms: 0, learnMore: 2,
    cards: [{ id: UC.bien, title: "Honduras: Billetera Electronica Nacional (BIEN) - 4 gob authorities issuing into one citizen-controlled wallet", status: `The catalog lists TECH5 as the organisation. The catalog ${IN_PROD}.`, label: "Explore the BIEN use case" }],
    must: [/DIGER, the government body responsible/, /will be added later/, /differs in places from DIGER/, /official pages are in Spanish/, /no statement about the legal acceptance/],
    mustNot: [/legal(ly)? (valid|equivalen)/i, /Resolution No/i] },
  { slug: "ethiopia", title: "Ethiopia — Fayda digital identity", intro: /^What is Fayda, and what does the programme say about FaydaPass\?/, cc: "ET", country: "Ethiopia", the: "",
    sources: [["Fayda National ID", "About", "https://www.id.gov.et/about"], ["Fayda National ID", "Authentication", "https://www.id.gov.et/authentication"], ["Fayda National ID", "Credentials", "https://id.gov.et/credentials"], ["National ID Program, Ethiopia", "FaydaPass (Google Play listing)", "https://play.google.com/store/apps/details?id=et.fayda.nidfaydaApp"]],
    headings: ["Credentials and verification", "FaydaPass and its status", "Where the information comes from", "Continue learning"],
    learn: ["what-is-a-digital-wallet", "how-credentials-connect"], cats: ["overview/", "organizations/"], terms: 0, learnMore: 2,
    cards: [{ id: UC.fayda, title: "Faydapass", status: `The catalog lists National ID Program as the organisation and ${IN_PROD}. The programme’s authentication page describes the FaydaPass wallet as work in progress, so check the programme for what is in use.`, label: "Explore the FaydaPass use case" }],
    must: [/working on FaydaPass/, /does not describe the wallet as available/, /does not describe the wallet’s status consistently/, /does not state which credentials the wallet issues or which institutions use it/, /Check the programme for current status/],
    mustNot: [/FaydaPass (is|has been) (now )?(live|launched|in production|available)/i, /(Ministry|Coopbank|Visa)/] },
];
const OVERVIEW_ROWS = [`${WORLD}the-netherlands/`, `${WORLD}germany/`, ...["india", "canada", "united-states", "honduras", "ethiopia"].map((s) => `${WORLD}${s}/`), `${L}/topics/the-big-picture/european-digital-identity-wallet/`, `${L}/topics/for-governments/the-eudi-wallet-and-national-implementation/`, `${WORLD}un-transparency-protocol/`];
const UNAVAILABLE = /issuer-catalog|relying-party-websites|interop-profiles|interop-matrix|\/matrix/;
const linkCache = new Map();
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${String(detail).slice(0, 300)})` : ""}`);
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
  try { status = (await page.request.get(h, { timeout: 15000 })).status(); } catch (e) { status = -1; }
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
    // Network trouble or bot protection (403/429, Cloudflare challenge) is reported, not counted as a broken link.
    if (status === -1 || [401, 403, 405, 429, 503, 999].includes(status)) console.log(`warn - ${tag}: external ${h.slice(0, 80)} answered ${status} (not verifiable from here)`);
    else check(`${tag}: external link ${h.slice(0, 70)} answers < 400`, status > 0 && status < 400, String(status));
  }
}
/** Focus the element, move away and back, and check it is the active element with a visible ring. */
async function focusOk(page, tag, locator, what) {
  if (!(await locator.count())) { check(`${tag}: ${what} exists for the focus check`, false); return; }
  await locator.first().focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const f = await locator.first().evaluate((el) => {
    const s = getComputedStyle(el);
    const li = el.parentElement && el.parentElement.matches("li") && el.parentElement.parentElement.classList.contains("fides-learn-rows") ? getComputedStyle(el.parentElement) : null;
    return { active: document.activeElement === el, outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0, shadow: s.boxShadow !== "none" || (!!li && li.boxShadow !== "none") };
  });
  check(`${tag}: keyboard focus is visible on ${what}`, f.active && (f.outline || f.shadow), JSON.stringify(f));
}
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

    // Overview: seven country rows, then the existing rows.
    {
      const tag = `overview @${width}`;
      const r = await open(page, WORLD);
      check(`${tag}: answers 200`, r && r.status() === 200);
      const rowHrefs = await page.locator(".fides-learn__content ul.fides-learn-rows > li > a").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
      check(`${tag}: ${OVERVIEW_ROWS.length} rows, countries first, in order`, rowHrefs.join(",") === OVERVIEW_ROWS.join(","), rowHrefs.join(","));
      const rowTitles = (await page.locator(".fides-learn__content ul.fides-learn-rows > li > a").allInnerTexts()).map(squash);
      for (const pg of PAGES) check(`${tag}: row "${pg.title}"`, rowTitles.includes(pg.title), rowTitles.join("|"));
      check(`${tag}: no row without a link and no "Design preview"`, (await page.locator(".fides-learn__content ul.fides-learn-rows > li > strong.fides-learn-rows__title").count()) === 0 && !/Design preview/i.test(await page.locator(".fides-learn__content").innerText()));
      const lone = await loneArticles(page, ".fides-learn__content");
      check(`${tag}: no lone article before a link or term`, lone.length === 0, lone.join(" | "));
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0, await overflow(page));
      await focusOk(page, tag, page.locator(`.fides-learn__content ul.fides-learn-rows a[href$="/india/"]`), "the India row link");
      await focusOk(page, tag, page.locator(`.fides-learn__content ul.fides-learn-rows a[href$="/ethiopia/"]`), "the Ethiopia row link");
    }

    // Credential formats: the added United States link, still at most four Learn more links.
    {
      const tag = `credential formats @${width}`;
      await open(page, `${L}/topics/technology/credential-formats-and-interoperability/`);
      const lm = await page.evaluate(() => { const h = [...document.querySelectorAll(".fides-learn-article__body h3")].find((x) => x.textContent.trim() === "Learn more"); const ul = h && h.nextElementSibling; return ul ? [...ul.querySelectorAll("a")].map((a) => new URL(a.href).pathname) : []; });
      check(`${tag}: "Learn more" has 4 links including the United States page`, lm.length === 4 && lm.includes(`${WORLD}united-states/`), lm.join(","));
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }

    for (const a of PAGES) {
      const tag = `${a.slug} @${width}`;
      const r = await open(page, `${WORLD}${a.slug}/`);
      check(`${tag}: answers 200`, r && r.status() === 200);
      check(`${tag}: English page`, /^en/i.test(await page.evaluate(() => document.documentElement.lang)));
      const h1s = await page.locator("h1").allInnerTexts();
      check(`${tag}: one H1 "${a.title}"`, h1s.length === 1 && h1s[0].trim() === a.title, h1s.join("|"));
      await crumbCheck(page, tag, ["Learn", "Topics", "Around the world", a.title], [L, `${L}/topics`, WORLD.replace(/\/$/, "")]);
      const eyebrow = squash(await page.locator(".fides-learn-article__eyebrow, .fides-learn__eyebrow").first().innerText().catch(() => ""));
      check(`${tag}: eyebrow "Country · Around the world"`, /Country\s*·\s*Around the world/i.test(eyebrow || squash(await page.locator("main").innerText())), eyebrow);
      const intro = squash(await page.locator(".fides-learn__intro").first().innerText().catch(() => ""));
      check(`${tag}: intro text`, a.intro.test(intro), intro);
      const heads = (await page.locator(".fides-learn-article__body h2").allInnerTexts()).map(squash);
      for (const x of a.headings) check(`${tag}: section "${x}"`, heads.includes(x), heads.join("|"));
      const body = squash(await page.locator(".fides-learn-article__body").innerText());
      check(`${tag}: last checked date`, /Content last checked: 13 November 2026/.test(body));
      check(`${tag}: responsible source and check date (13 November 2026)`, /Responsible sources?:/.test(body) && /checked on 13 November 2026/.test(body));
      check(`${tag}: no "Design preview", no "Coming soon", no placeholder`, !/Design preview|Coming soon/i.test(body));
      for (const re of a.must) check(`${tag}: text contains ${re}`, re.test(body));
      for (const re of a.mustNot) check(`${tag}: text does not contain ${re}`, !re.test(body));
      const lone = await loneArticles(page, ".fides-learn-article__body");
      check(`${tag}: no lone article before a link or term`, lone.length === 0, lone.join(" | "));
      const chips = await page.locator(".fides-learn-article__body p button.fides-ds-term, .fides-learn-article__body li button.fides-ds-term").count();
      check(`${tag}: glossary term chips in the text (${a.terms})`, chips === a.terms, chips);
      const lm = await page.evaluate(() => { const h = [...document.querySelectorAll(".fides-learn-article__body h3")].find((x) => x.textContent.trim() === "Learn more"); const ul = h && h.nextElementSibling; return ul ? ul.querySelectorAll("li").length : 0; });
      check(`${tag}: "Learn more" has ${a.learnMore} links (at most 4)`, lm === a.learnMore && lm <= 4, lm);
      const groups = await page.locator(".fides-learn-article__body h3").allInnerTexts();
      check(`${tag}: groups "Learn more" and "Explore in the catalogs"`, ["Learn more", "Explore in the catalogs"].every((g) => groups.includes(g)), groups.join("|"));

      // Sources: exactly the named ones, organisation in bold, external, new tab, consulted date.
      const src = await page.locator(".fides-learn-sources__link").evaluateAll((as) => as.map((x) => ({ href: x.getAttribute("href"), name: x.querySelector(".fides-learn-sources__name")?.textContent.trim(), text: x.textContent.replace(/\s+/g, " ").trim(), target: x.target })));
      check(`${tag}: ${a.sources.length} sources listed`, src.length === a.sources.length, JSON.stringify(src.map((s) => s.href)));
      for (const [name, title, href] of a.sources) {
        const hit = src.find((s) => s.href === href);
        check(`${tag}: source "${name} · ${title.slice(0, 40)}"`, !!hit && hit.name === name && hit.text.includes(title) && hit.target === "_blank", JSON.stringify(hit));
      }
      check(`${tag}: source labels carry the consulted date`, src.every((s) => /consulted 13 November 2026/.test(s.text)));

      // Cards: the chosen records, with the careful status wording.
      const cards = page.locator(".fides-learn-record");
      check(`${tag}: ${a.cards.length} use case card(s)`, (await cards.count()) === a.cards.length, await cards.count());
      for (const c of a.cards) {
        const card = page.locator(`.fides-learn-record[data-fides-learn-record="usecase:${c.id}"]`);
        check(`${tag}: card for ${c.id.slice(0, 30)}… exists`, (await card.count()) === 1);
        if (!(await card.count())) continue;
        const text = squash(await card.innerText());
        check(`${tag}: card title from the record`, text.includes(c.title), text.slice(0, 120));
        check(`${tag}: card status wording`, text.includes(c.status), text);
        check(`${tag}: card has the kicker "See it in practice" and the link label`, text.toLowerCase().includes("see it in practice") && text.includes(c.label), text);
        check(`${tag}: card has an image from the record`, (await card.locator("img.fides-learn-record__image").count()) === 1);
        const href = await card.locator("a.fides-ds-action-link").getAttribute("href");
        check(`${tag}: card link goes to the pilot use case page with ?usecase=`, href.startsWith(`${P}/use-case/?usecase=${encodeURIComponent(c.id)}`) || href.includes(`/use-case/?usecase=${c.id}`), href);
      }
      check(`${tag}: no editor notice (every record exists and is published)`, (await page.locator(".fides-learn-record-notice").count()) === 0);

      // Links.
      const hrefs = norm(await page.locator(".fides-learn-article__body a[href]").evaluateAll((as) => as.map((x) => x.getAttribute("href"))));
      check(`${tag}: no local host in the content links`, hrefs.every((x) => !/localhost|127\.0\.0\.1/.test(x)));
      check(`${tag}: no link to an unavailable destination`, hrefs.every((x) => !UNAVAILABLE.test(x)), hrefs.filter((x) => UNAVAILABLE.test(x)).join(","));
      for (const l of [...a.learn, ...a.cats]) check(`${tag}: links to ${l}`, hrefs.some((x) => x.includes(l)), hrefs.join(" "));
      for (const k of ["overview", "organizations", "personal-wallets"]) check(`${tag}: country filter link ${k}/?country=${a.cc}`, hrefs.includes(`${P}/${k}/?country=${a.cc}`), hrefs.filter((x) => /country=/.test(x)).join(" "));
      await linksOk(page, tag, hrefs, src.map((s) => s.href));
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0, await overflow(page));

      // Keyboard: first body link of the list, the first card link and the first source link.
      await open(page, `${WORLD}${a.slug}/`);
      await focusOk(page, tag, page.locator(".fides-learn-article__body ul a").first(), "the first list link");
      await focusOk(page, tag, page.locator(".fides-learn-record a.fides-ds-action-link").first(), "the first card link");
      await focusOk(page, tag, page.locator(".fides-learn-sources__link").first(), "the first source link");
      check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));
    }

    // Filter links: chip and count > 0 on the pilot catalogs.
    for (const a of PAGES) {
      for (const k of ["overview", "organizations", "personal-wallets"]) {
        const tag = `/${k}/?country=${a.cc} @${width}`;
        await open(page, `${P}/${k}/?country=${a.cc}`);
        await page.waitForSelector("[data-pilot-count]", { timeout: 30000 }).catch(() => {});
        const count = ((await page.locator("[data-pilot-count]").first().innerText().catch(() => "")) || "").trim();
        const n = parseInt(count, 10);
        const pills = await page.locator(".fides-uc-pilot__pills").first().innerText().catch(() => "");
        console.log(`# ${tag}: "${count}", chip "${squash(pills).slice(0, 70)}"`);
        check(`filter link ${tag}: shows its chip "Country: ${a.country}"`, new RegExp(`Country: ${a.country}`, "i").test(pills), pills);
        check(`filter link ${tag}: more than 0 results`, n > 0, count);
        check(`filter link ${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
      }
    }
    check(`console errors @${width}`, errors.length === 0, errors.join(" | "));
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
