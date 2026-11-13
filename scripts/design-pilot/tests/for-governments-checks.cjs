/**
 * Targeted checks for Learn > Topics > For governments: the overview (topics/for-governments/) and its four
 * articles, at 1440 and 390 px. Per page: 200, English, one H1, breadcrumb Learn / Topics / For governments / title
 * with clickable parents, intro, named sections, sources (with the consulted GBO version and date), internal links
 * answer 200, external links are not broken (403/429 and network trouble are warnings), no unavailable destinations,
 * no local host in the content, series navigation (Previous/Next), no horizontal overflow, visible focus, no console
 * errors. Topics: the "For governments" row is a link and opens the overview. Use case cards open an existing use case.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/for-governments-checks.cjs   (WIDTHS=1440,390 by default)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const L = "/fides-design-pilot/learn";
const G = `${L}/topics/for-governments/`;
const STATUS = /version 0\.9\.5 \(September 2026\), a draft design submitted for adoption/;
const GBO_GO = ["ICTU", "Gemeenschappelijke Bronontsluiting, Globaal Ontwerp, version 0.9.5 (September 2026), consulted 12 November 2026", "https://ictu.github.io/GBO-GO/latest/"];
const GBO_DOC = ["ICTU", "Gemeenschappelijke Bronontsluiting: documentation and review status, consulted 12 November 2026", "https://ictu.github.io/GBO/latest/"];
const ICTU = ["ICTU", "Joint approach to uniform sharing of data (GBO), consulted 12 November 2026", "https://www.ictu.nl/projecten/gezamenlijke-aanpak-voor-uniform-delen-van-gegevens/"];
const DO = ["Digitale Overheid", "Gemeenschappelijke Bronontsluiting (GBO), consulted 12 November 2026", "https://www.digitaleoverheid.nl/overzicht-van-alle-onderwerpen/data/gemeenschappelijke-bronontsluiting-gbo/"];
const EC = ["European Commission", "EUDI Regulation", "https://digital-strategy.ec.europa.eu/en/policies/eudi-regulation"];
const EUR = ["Regulation (EU) 2024/1183 (EUR-Lex)", null, "https://eur-lex.europa.eu/eli/reg/2024/1183/oj"];
const EUR5F = ["European Union", "Regulation (EU) 2024/1183 (eIDAS 2), Article 5f", "https://eur-lex.europa.eu/eli/reg/2024/1183/oj"];
const A4 = "the-eudi-wallet-and-national-implementation/#a-dutch-example";
const DE = ["German EUDI Wallet programme", "The EUDI Wallet ecosystem", "https://eudi-wallet.gov.de/en/ecosystem"];
const NLEDI = ["EDI-Stelsel Nederland", "Background on European digital identity", "https://edi.pleio.nl/page/view/418945e3-ced5-42e2-aeb6-a799ad2f9bce/achtergrondinformatie-europese-digitale-identiteit-edi"];
const PAGES = [
  { slug: "digital-wallets-and-public-services", title: "Digital wallets and public services", intro: /^People regularly have to show public services information that a public body holds\./, sources: [ICTU, GBO_GO], status: false, dutchMax: 90,
    headings: ["Which question are you asking?", "Two sides of the same interaction", "Wallets are one route among several", "What can differ between countries?", "A Dutch example", "Continue learning"],
    links: ["what-is-a-digital-wallet", "topics/ecosystem-roles/", "issuing-public-information-to-wallets", "accepting-information-from-wallets-in-public-services", "personal-wallets", "overview/"], card: "smart-government-applications-powered-by-digital-wallets-HCB5DD" },
  { slug: "issuing-public-information-to-wallets", title: "Issuing public information to wallets", intro: /^Which public information could people hold in a wallet\?/, sources: [GBO_GO, EC, EUR], status: false, dutchMax: 230, qtsp: true,
    headings: ["Questions to start with", "The register stays where it is", "Public bodies and the EUDI Wallet", "A Dutch example", "What can differ between countries?", "Continue learning"],
    links: ["issuing-credentials-for-wallets", "ecosystem-roles/the-issuer", "european-digital-identity-wallet", "trust-service-providers-and-trust-frameworks", "credentials/", "organizations/"], card: "honduras-billetera-electronica-nacional-bien-4-gob-authorities-issuing-into-one-citizen-controlled-wallet-YVNSXc" },
  { slug: "accepting-information-from-wallets-in-public-services", title: "Accepting information from wallets in public services", intro: /^What does a public service need to receive and check\?/, sources: [EUR5F, GBO_GO], status: false, dutchMax: 90, fiveF: true,
    headings: ["Questions to start with", "Ask for what the service needs", "Checking is not deciding", "What does Article 5f say about accepting wallets?", "A Dutch example", "Continue learning"],
    links: ["accepting-information-from-a-wallet", "ecosystem-roles/the-relying-party", "the-eudi-wallet-and-national-implementation", "issuing-public-information-to-wallets", "business-wallets"], card: "nijmegen-attribute-based-municipal-login" },
  { slug: "the-eudi-wallet-and-national-implementation", title: "The EUDI Wallet and national implementation", intro: /^What is set at European level, and what is decided nationally\?/, sources: [EC, EUR5F, DE, NLEDI, GBO_GO, GBO_DOC, ICTU], status: true, five: true,
    headings: ["What is set at European level?", "What is decided nationally?", "Questions to ask in your own country", "A Dutch example", "Keep national information current", "Continue learning"],
    links: ["european-digital-identity-wallet", "around-the-world/", "around-the-world/the-netherlands", "accepting-information-from-wallets-in-public-services", "personal-wallets", "organizations/"], card: null },
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
  try { status = (await page.request.get(h, { timeout: 10000 })).status(); } catch (e) { status = -1; }
  linkCache.set(h, status);
  return status;
}
async function linksOk(page, tag, hrefs, extra) {
  const internal = [...new Set(hrefs.filter((h) => h.startsWith("/")))];
  const bad = [];
  for (const h of internal) { if (!linkCache.has(h)) linkCache.set(h, (await page.request.get(`${BASE}${h}`)).status()); if (linkCache.get(h) !== 200) bad.push(`${h} ${linkCache.get(h)}`); }
  check(`${tag}: ${internal.length} internal links answer 200`, internal.length >= 4 && bad.length === 0, bad.join(", "));
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

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    // Overview.
    {
      const tag = `overview @${width}`;
      const r = await open(page, G);
      check(`${tag}: answers 200`, r && r.status() === 200);
      check(`${tag}: English page`, /^en/i.test(await page.evaluate(() => document.documentElement.lang)));
      const h1s = await page.locator("h1").allInnerTexts();
      check(`${tag}: one H1 "For governments"`, h1s.length === 1 && h1s[0].trim() === "For governments", h1s.join("|"));
      const crumbs = squash(await page.locator("nav[aria-label=Breadcrumb]").first().textContent().catch(() => ""));
      check(`${tag}: breadcrumb Learn / Topics / For governments`, crumbs === "Learn Topics For governments" || crumbs === "LearnTopicsFor governments", crumbs);
      const crumbLinks = await page.locator("nav[aria-label=Breadcrumb] a").evaluateAll((as) => as.map((x) => new URL(x.href).pathname.replace(/\/$/, "")));
      check(`${tag}: breadcrumb parents are clickable (Learn, Topics)`, crumbLinks.join(",") === [L, `${L}/topics`].join(","), crumbLinks.join(","));
      const intro = squash(await page.locator(".fides-learn__intro").first().innerText().catch(() => ""));
      check(`${tag}: intro text`, /^Public organisations meet wallets from two sides: they hold information people need to prove/.test(intro), intro);
      const heads = (await page.locator(".fides-learn__content h2").allInnerTexts()).map(squash);
      for (const h of ["Start with a question", "Four articles", "A Dutch example, still in development", "Explore in the catalogs"]) check(`${tag}: section "${h}"`, heads.includes(h), heads.join("|"));
      const text = squash(await page.locator(".fides-learn__content").innerText());
      check(`${tag}: one short intro: the manifest lead is not repeated in the body`, !/Public organisations meet wallets from two sides/.test(text) && !/How can public organisations work with wallets\?/.test(text), text.slice(0, 160));
      check(`${tag}: glossary terms panel kept (four terms, glossary link)`, (await page.locator(".fides-learn-panel__aside button.fides-ds-term").count()) === 4 && (await page.locator(".fides-learn-panel__aside a[href$='/glossary/']").count()) === 1 && (await page.locator(".fides-learn-panel__aside h3").allInnerTexts()).map(squash).includes("Terms you will meet"));
      check(`${tag}: four article rows`, (await page.locator(".fides-learn__content ul.fides-learn-rows > li").count()) === 4);
      check(`${tag}: short Dutch-example section links to article 4 and carries no version or status text`, (await page.locator(`.fides-learn__content a[href$='${A4}']`).count()) === 1 && !STATUS.test(text) && !/0\.9\.5/.test(text) && /still in development/.test(text));
      const dutch = await page.evaluate(() => { const h = [...document.querySelectorAll(".fides-learn__content h2")].find((x) => /Dutch example/.test(x.textContent)); let n = h && h.closest(".wp-block-heading, h2"); const out = []; for (let e = h && h.nextElementSibling; e && e.tagName !== "H2"; e = e.nextElementSibling) out.push(e.textContent); return out.join(" ").split(/\s+/).filter(Boolean).length; });
      check(`${tag}: Dutch-example section is short (${dutch} words)`, dutch > 0 && dutch <= 60, dutch);
      check(`${tag}: no "Design preview" and no "not available yet"`, !/Design preview|not available yet/i.test(text));
      const rowHrefs = await page.locator(".fides-learn__content ul.fides-learn-rows > li > a").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
      for (const a of PAGES) check(`${tag}: row links to ${a.slug}`, rowHrefs.includes(`${G}${a.slug}/`), rowHrefs.join(","));
      const hrefs = norm(await page.locator(".fides-learn__content a[href]").evaluateAll((as) => as.map((x) => x.getAttribute("href"))));
      check(`${tag}: no local host and no unavailable destination in the links`, hrefs.every((h) => !/localhost|127\.0\.0\.1/.test(h) && !UNAVAILABLE.test(h)));
      await linksOk(page, tag, hrefs);
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0, await overflow(page));
      await focusOk(page, tag, [page.locator(".fides-learn__content ul.fides-learn-rows a").first()]);
      check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));
    }

    // Articles.
    for (let i = 0; i < PAGES.length; i += 1) {
      const a = PAGES[i];
      const tag = `${a.slug} @${width}`;
      const r = await open(page, `${G}${a.slug}/`);
      check(`${tag}: answers 200`, r && r.status() === 200);
      check(`${tag}: English page`, /^en/i.test(await page.evaluate(() => document.documentElement.lang)));
      const h1s = await page.locator("h1").allInnerTexts();
      check(`${tag}: one H1 "${a.title}"`, h1s.length === 1 && h1s[0].trim() === a.title, h1s.join("|"));
      const crumbs = squash(await page.locator("nav[aria-label=Breadcrumb]").first().textContent().catch(() => ""));
      check(`${tag}: breadcrumb Learn / Topics / For governments / title`, crumbs === `Learn Topics For governments ${a.title}` || crumbs === `LearnTopicsFor governments${a.title}`, crumbs);
      const crumbLinks = await page.locator("nav[aria-label=Breadcrumb] a").evaluateAll((as) => as.map((x) => new URL(x.href).pathname.replace(/\/$/, "")));
      check(`${tag}: breadcrumb parents are clickable (Learn, Topics, For governments)`, crumbLinks.join(",") === [L, `${L}/topics`, `${L}/topics/for-governments`].join(","), crumbLinks.join(","));
      const lastCrumb = await page.locator("nav[aria-label=Breadcrumb] [aria-current=page]").allInnerTexts();
      check(`${tag}: current breadcrumb is the title and not a link`, lastCrumb.length === 1 && lastCrumb[0].trim() === a.title, lastCrumb.join("|"));
      const intro = squash(await page.locator(".fides-learn__intro").first().innerText().catch(() => ""));
      check(`${tag}: intro text`, a.intro.test(intro), intro);
      check(`${tag}: eyebrow "Explainer · For governments"`, (await page.locator(".fides-learn__eyebrow").allTextContents()).some((t) => /Explainer · For governments/.test(squash(t))));
      const heads = (await page.locator(".fides-learn-article__body h2").allInnerTexts()).map(squash);
      for (const h of a.headings) check(`${tag}: section "${h}"`, heads.includes(h), heads.join("|"));
      const body = squash(await page.locator(".fides-learn-article__body").innerText());
      check(`${tag}: ${a.status ? "states" : "does not repeat"} the GBO version and draft-for-adoption status`, a.status ? STATUS.test(body) && /0\.9\.5/.test(body) : !STATUS.test(body) && !/Version and status/.test(body), body.slice(0, 100));
      if (!a.status) {
        const toA4 = norm(await page.locator(".fides-learn-article__body a[href]").evaluateAll((as) => as.map((x) => x.getAttribute("href")))).filter((h) => h.endsWith(A4));
        check(`${tag}: one link to the Dutch example on article 4 (anchor)`, toA4.length === 1, toA4.join(","));
        const words = await page.evaluate(() => { const h = [...document.querySelectorAll(".fides-learn-article__body h2")].find((x) => x.textContent.trim() === "A Dutch example"); let n = 0; for (let e = h && h.nextElementSibling; e && e.tagName !== "H2"; e = e.nextElementSibling) { if (e.classList.contains("fides-learn-usecase") || e.querySelector(".fides-learn-usecase")) break; n += e.textContent.split(/\s+/).filter(Boolean).length; } return n; });
        check(`${tag}: Dutch example is short (${words} words, max ${a.dutchMax})`, words > 0 && words <= a.dutchMax, words);
      } else {
        check(`${tag}: article 4 has the anchored Dutch example, version and status`, (await page.locator("#a-dutch-example").count()) === 1 && /Version and status/.test(body));
      }
      if (a.qtsp) {
        const strong = (await page.locator(".fides-learn-article__body li strong").allInnerTexts()).map(squash);
        check(`${tag}: QTSP route separates verify from retrieve`, strong.includes("Verify:") && strong.includes("Retrieve:") && /optional/.test(body) && /checks? attribute values it has been given/.test(body), strong.join("|"));
      }
      if (a.fiveF) {
        const eur = await page.locator(".fides-learn-article__body a[href='https://eur-lex.europa.eu/eli/reg/2024/1183/oj']").count();
        check(`${tag}: Article 5f passage links to EUR-Lex and states the conditions`, eur >= 1 && /Article 5f of Regulation \(EU\) 2024\/1183/.test(body) && /paragraph 1 provides that where Member States require electronic identification and authentication to access an online service provided by a public sector body, they shall also accept/.test(body) && /also contains rules for certain private parties and for very large online platforms/.test(body) && /not legal advice/.test(body), body.slice(0, 80));
        const five = squash(await page.locator(".fides-learn-article__body h2:has-text('Article 5f') ~ p").first().innerText().catch(() => "")) + " " + body.slice(body.indexOf("Article 5f"), body.indexOf("This is a summary"));
        check(`${tag}: no deadline or exact date in the 5f passage (paragraphs 2 and 3 only point to EUR-Lex)`, !/36 months|\b(19|20)\d\d\b/.test(body.slice(body.indexOf("What does Article 5f"), body.indexOf("This is a summary")).replace(/2024\/1183/g, "")), five.slice(0, 200));
        check(`${tag}: paragraph 1 keeps "also accept" for public sector bodies`, /public sector body, they shall also accept European Digital Identity Wallets that are provided in accordance with the Regulation/.test(body));
        check(`${tag}: 5f wording is neutral (no "must" claims beyond the text, no "only wallets")`, /does not say that a service may accept only wallets/.test(body) && !/\byou must\b/i.test(body));
      }
      if (a.five) check(`${tag}: mentions Article 5f and points to article 3`, /Article 5f of the Regulation also sets rules on accepting wallets/.test(body) && (await page.locator(".fides-learn-article__body a[href*='accepting-information-from-wallets-in-public-services']").count()) >= 1);
      check(`${tag}: says the arrangements are still in development`, /still in development|still to be realised|still developing/.test(body));
      check(`${tag}: content last checked 12 November 2026`, /Content last checked: 12 November 2026/.test(body));

      // Sources: exactly the named ones, name in bold, external, new tab; the GBO source names the version and date.
      const src = await page.locator(".fides-learn-sources__link").evaluateAll((as) => as.map((x) => ({ href: x.getAttribute("href"), name: x.querySelector(".fides-learn-sources__name")?.textContent.trim(), text: x.textContent.replace(/\s+/g, " ").trim(), target: x.target })));
      check(`${tag}: ${a.sources.length} sources listed`, src.length === a.sources.length, JSON.stringify(src.map((s) => s.href)));
      check(`${tag}: no duplicate source URLs`, new Set(src.map((s) => s.href)).size === src.length, JSON.stringify(src.map((s) => s.href)));
      for (const [name, title, href] of a.sources) {
        const hit = src.find((s) => s.href === href);
        check(`${tag}: source "${name}${title ? " · " + title.slice(0, 40) : ""}"`, !!hit && (title ? hit.name === name && hit.text.includes(title) : hit.text.includes(name)) && hit.target === "_blank", JSON.stringify(hit));
      }
      const learnMore = await page.evaluate(() => { const h = [...document.querySelectorAll(".fides-learn-article__body h3")].find((x) => x.textContent.trim() === "Learn more"); const ul = h && h.nextElementSibling; return ul ? ul.querySelectorAll("li").length : 0; });
      check(`${tag}: "Learn more" has 3-4 links (${learnMore})`, learnMore >= 3 && learnMore <= 4, learnMore);
      const go = src.find((s) => s.href === GBO_GO[2]);
      check(`${tag}: GBO source states version 0.9.5, September 2026 and the consulted date`, !!go && /version 0\.9\.5 \(September 2026\)/.test(go.text) && /consulted 12 November 2026/.test(go.text), go && go.text);

      // Links.
      const hrefs = norm(await page.locator(".fides-learn-article__body a[href]").evaluateAll((as) => as.map((x) => x.getAttribute("href"))));
      check(`${tag}: no local host in the content links`, hrefs.every((h) => !/localhost|127\.0\.0\.1/.test(h)));
      check(`${tag}: no link to an unavailable destination (issuer catalog, relying party websites, interop profiles or matrix)`, hrefs.every((h) => !UNAVAILABLE.test(h)), hrefs.filter((h) => UNAVAILABLE.test(h)).join(","));
      for (const l of a.links) check(`${tag}: links to ${l}`, hrefs.some((h) => h.includes(l)), hrefs.join(" "));
      const groups = await page.locator(".fides-learn-article__body h3").allInnerTexts();
      check(`${tag}: groups "Learn more" and "Explore in the catalogs"`, ["Learn more", "Explore in the catalogs"].every((g) => groups.includes(g)), groups.join("|"));
      check(`${tag}: links back to the For governments overview`, hrefs.some((h) => h.replace(/\/$/, "") === `${L}/topics/for-governments`) || (await page.locator("nav[aria-label=Breadcrumb] a[href$='/topics/for-governments/']").count()) === 1);
      await linksOk(page, tag, hrefs, src.map((s) => s.href));

      // Use case card: a card (or none for the last article) that opens an existing use case.
      const cardLinks = norm(await page.locator(".fides-learn-article__body a[href*='/use-case/?usecase=']").evaluateAll((as) => as.map((x) => x.getAttribute("href"))));
      if (a.card) {
        check(`${tag}: use case card for ${a.card.slice(0, 40)}`, cardLinks.some((h) => h.includes(`usecase=${a.card}`)), cardLinks.join(","));
        const bodyCard = await page.locator(".fides-learn-article__body").innerHTML();
        check(`${tag}: no editor notice in the card`, !/Editor notice/i.test(bodyCard));
      } else check(`${tag}: no use case card`, cardLinks.length === 0, cardLinks.join(","));

      // Series navigation: Previous / Next in the order of the articles.
      const prev = await page.locator("nav.fides-learn-series a[rel=prev]").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
      const next = await page.locator("nav.fides-learn-series a[rel=next]").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
      check(`${tag}: Previous is ${i ? PAGES[i - 1].slug : "absent"}`, i ? prev.join() === `${G}${PAGES[i - 1].slug}/` : prev.length === 0, prev.join());
      check(`${tag}: Next is ${i < PAGES.length - 1 ? PAGES[i + 1].slug : "absent"}`, i < PAGES.length - 1 ? next.join() === `${G}${PAGES[i + 1].slug}/` : next.length === 0, next.join());

      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0, await overflow(page));
      await focusOk(page, tag, [page.locator(".fides-learn-article__body ul a").first(), page.locator(".fides-learn-sources__link").first()]);
      check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));
    }

    // Topics: the For governments row is a link and opens the overview.
    {
      const tag = `topics @${width}`;
      await open(page, `${L}/topics/`);
      const rowText = squash(await page.locator(".fides-learn__content ul.fides-learn-rows > li", { hasText: "For governments" }).first().innerText());
      check(`${tag}: For governments row has a description and no "Design preview"`, /Public services/.test(rowText) && !/Design preview/i.test(rowText), rowText);
      const others = await page.locator(".fides-learn__content ul.fides-learn-rows > li > a").evaluateAll((as) => as.map((x) => x.textContent.trim()));
      for (const n of ["The big picture", "For businesses", "Ecosystem roles"]) check(`${tag}: existing link "${n}" is unchanged`, others.includes(n), others.join("|"));
      const link = page.locator(".fides-learn__content ul.fides-learn-rows > li > a", { hasText: "For governments" }).first();
      check(`${tag}: the For governments row is a link`, (await link.count()) === 1);
      if (await link.count()) {
        check(`${tag}: link goes to topics/for-governments/`, new URL(await link.evaluate((x) => x.href)).pathname === G);
        await link.click();
        await page.waitForLoadState("domcontentloaded");
        check(`${tag}: click opens the overview`, new URL(page.url()).pathname === G && (await page.locator("h1").first().innerText()).trim() === "For governments", page.url());
      }
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
