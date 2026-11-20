/**
 * Targeted checks for the three practice-question articles in Learn > Topics > For businesses (1440 and 390 px):
 * How can someone act for an organisation?, How can an organisation prepare a wallet use case?, What should a service
 * check when receiving a credential? Per page: 200, English, one H1, breadcrumb Learn / Topics / For businesses / title
 * with clickable parents, sources (Organisation · Title, external, new tab), internal links answer 200, external links
 * are not broken (403/429 and network trouble are warnings), no unavailable destinations, no horizontal overflow,
 * visible focus, no console errors. Also: the For businesses overview rows, and one back link per existing article.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/practice-questions-checks.cjs   (WIDTHS=1440,390 by default)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const L = "/fides-design-pilot/learn";
const G = `${L}/topics/for-businesses/`;
const W3C = ["W3C", "Verifiable Credentials Data Model 2.0", "https://www.w3.org/TR/vc-data-model-2.0/"];
const REG = ["Regulation (EU) 2024/1183 (EUR-Lex)", "", "https://eur-lex.europa.eu/eli/reg/2024/1183/oj"];
const SD = ["European Commission", "Selective disclosure of attributes in the EUDI Wallet", "https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/949256476/What%2Bis%2Bselective%2Bdisclosure%2Bof%2Battributes"];
const PAGES = [
  { slug: "how-can-someone-act-for-an-organisation", title: "How can someone act for an organisation?", intro: /^A person may need to act for an organisation when signing an agreement, accessing a service or sharing information\./,
    sources: [REG, W3C,
      ["Directive (EU) 2025/25 (EUR-Lex)", "", "https://eur-lex.europa.eu/eli/dir/2025/25/oj"],
      ["European Commission", "Proposal for a Regulation on European Business Wallets (COM(2025) 838)", "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025PC0838"],
      ["European Commission", "European Business Wallets", "https://digital-strategy.ec.europa.eu/en/policies/business-wallets"],
      ["Council of the EU", "European business wallets: Council adopts negotiating position", "https://www.consilium.europa.eu/en/press/press-releases/2026/06/09/european-business-wallets-council-adopts-negotiating-position/"],
      ["European Parliament", "Legislative procedure file 2025/0358(COD)", "https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0358(COD)"],
      ["EU Digital Identity Wallet", "Architecture and Reference Framework", "https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework"]],
    headings: ["Identity and authority are different questions", "Identity, authority and mandate", "Where can evidence of authority come from?", "What do European sources say today?", "Questions to ask", "Continue learning"],
    links: ["business-wallets-where-to-start", "accepting-information-from-a-wallet", "european-business-wallet", "business-wallets"], terms: 1, learnMore: 3, cta: false },
  { slug: "how-can-an-organisation-prepare-a-wallet-use-case", title: "How can an organisation prepare a wallet use case?", intro: /^Before choosing a product, describe one concrete exchange/,
    sources: [W3C, REG, ["FIDES", "Verifiable Credentials", "https://fides.community/topics/verifiable-credentials/"]],
    headings: ["Describe one exchange", "Who is involved?", "Which information is exchanged, and where does it come from?", "How does the receiving service check it?", "What happens if something goes wrong?", "Agree the practical arrangements", "Plan the first test", "Continue learning"],
    links: ["issuing-credentials-for-wallets", "accepting-information-from-a-wallet", "business-wallets-where-to-start", "/overview/"], terms: 0, learnMore: 3, cta: true },
  { slug: "what-should-a-service-check-when-receiving-a-credential", title: "What should a service check when receiving a credential?", intro: /^When a service receives information from a wallet, a technical check can help establish whether it can rely on the credential\./,
    sources: [W3C, REG, SD],
    headings: ["Check the credential", "Decide whether the information is enough", "Make the request clear", "Continue learning"],
    links: ["accepting-information-from-a-wallet", "the-relying-party", "trust-and-interoperability", "/credentials/"], terms: 1, learnMore: 3, cta: false },
];
// Continue learning is limited to three Learn links: "Business wallets: where to start" and "Issuing credentials for wallets"
// no longer link to the practice articles (learn/continue-learning-selection.md); the For businesses hub and the accepting article do.
const BACKLINKS = [
  ["topics/for-businesses/", ["how-can-an-organisation-prepare-a-wallet-use-case", "what-should-a-service-check-when-receiving-a-credential", "how-can-someone-act-for-an-organisation"]],
  ["topics/for-businesses/accepting-information-from-a-wallet/", ["what-should-a-service-check-when-receiving-a-credential"]],
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



(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));

    for (const a of PAGES) {
      errors.length = 0;
      const tag = `${a.slug.slice(0, 28)} @${width}`;
      const r = await open(page, `${G}${a.slug}/`);
      check(`${tag}: answers 200`, r && r.status() === 200);
      check(`${tag}: English page`, /^en/i.test(await page.evaluate(() => document.documentElement.lang)));
      const h1s = await page.locator("h1").allInnerTexts();
      check(`${tag}: one H1 "${a.title}"`, h1s.length === 1 && h1s[0].trim() === a.title, h1s.join("|"));
      const crumbs = squash(await page.locator("nav[aria-label=Breadcrumb]").first().textContent().catch(() => ""));
      check(`${tag}: breadcrumb Learn / Topics / For businesses / title`, crumbs === `Learn Topics For businesses ${a.title}` || crumbs === `LearnTopicsFor businesses${a.title}`, crumbs);
      const crumbLinks = await page.locator("nav[aria-label=Breadcrumb] a").evaluateAll((as) => as.map((x) => new URL(x.href).pathname.replace(/\/$/, "")));
      check(`${tag}: breadcrumb parents are clickable (Learn, Topics, For businesses)`, crumbLinks.join(",") === [L, `${L}/topics`, `${L}/topics/for-businesses`].join(","), crumbLinks.join(","));
      const bodyAll = squash(await page.locator("main").innerText());
      check(`${tag}: eyebrow "Explainer · For businesses"`, /Explainer\s*·\s*For businesses/i.test(bodyAll));
      const intro = squash(await page.locator(".fides-learn__intro").first().innerText().catch(() => ""));
      check(`${tag}: intro text`, a.intro.test(intro), intro);
      const heads = (await page.locator(":is(.fides-learn-article__body, .fides-learn-continue) h2").allInnerTexts()).map(squash);
      for (const h of a.headings) check(`${tag}: section "${h}"`, heads.includes(h), heads.join("|"));
      check(`${tag}: glossary term chips (${a.terms})`, (await page.locator(":is(.fides-learn-article__body, .fides-learn-continue) button.fides-ds-term").count()) === a.terms);
      const learnMore = await page.evaluate(() => { const h = [...document.querySelectorAll(":is(.fides-learn-article__body, .fides-learn-continue) h3")].find((x) => x.textContent.trim() === "Learn more"); const ul = h && h.nextElementSibling; return ul ? ul.querySelectorAll("li").length : 0; });
      check(`${tag}: "Learn more" has ${a.learnMore} links`, learnMore === a.learnMore, learnMore);
      const groups = await page.locator(":is(.fides-learn-article__body, .fides-learn-continue) h3").allInnerTexts();
      check(`${tag}: groups "Learn more" and "Explore in the catalogs"`, ["Learn more", "Explore in the catalogs"].every((g) => groups.includes(g)), groups.join("|"));
      const seriesPrev = await page.locator("nav.fides-learn-series a[rel=prev]").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
      const seriesNext = await page.locator("nav.fides-learn-series a[rel=next]").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
      const series = {
        "how-can-an-organisation-prepare-a-wallet-use-case": ["business-wallets-where-to-start", "accepting-information-from-a-wallet"],
        "what-should-a-service-check-when-receiving-a-credential": ["requesting-data-from-an-eudi-wallet", "how-can-someone-act-for-an-organisation"],
        "how-can-someone-act-for-an-organisation": ["what-should-a-service-check-when-receiving-a-credential", "issuing-credentials-for-wallets"],
      }[a.slug];
      check(`${tag}: series previous and next`, seriesPrev.length === 1 && seriesNext.length === 1 && seriesPrev[0].endsWith(`/${series[0]}/`) && seriesNext[0].endsWith(`/${series[1]}/`), seriesPrev.concat(seriesNext).join(" "));
      if (a.cta) check(`${tag}: call to action links to the Readiness Workshop`, (await page.locator("main a[href*='/sessions/wallet-readiness-workshop/']").count()) >= 1); // one call to action: Continue learning no longer repeats it

      const src = await page.locator(".fides-learn-sources__link").evaluateAll((as) => as.map((x) => ({ href: x.getAttribute("href"), name: x.querySelector(".fides-learn-sources__name")?.textContent.trim(), text: x.textContent.replace(/\s+/g, " ").trim(), target: x.target })));
      check(`${tag}: ${a.sources.length} sources listed`, src.length === a.sources.length, JSON.stringify(src.map((s) => s.href)));
      for (const [name, title, href] of a.sources) {
        const hit = src.find((s) => s.href === href);
        check(`${tag}: source "${name} ${title.slice(0, 40)}"`, !!hit && hit.text.includes(name) && hit.text.includes(title) && hit.target === "_blank", JSON.stringify(hit));
      }

      const hrefs = norm(await page.locator(":is(.fides-learn-article__body, .fides-learn-continue) a[href]").evaluateAll((as) => as.map((x) => x.getAttribute("href"))));
      check(`${tag}: no local host in the content links`, hrefs.every((h) => !/localhost|127\.0\.0\.1/.test(h)));
      check(`${tag}: no link to an unavailable destination (issuer catalog, relying party websites, interop profiles or matrix)`, hrefs.every((h) => !UNAVAILABLE.test(h)), hrefs.filter((h) => UNAVAILABLE.test(h)).join(","));
      for (const l of a.links) check(`${tag}: links to ${l}`, hrefs.some((h) => h.includes(l)), hrefs.join(" "));
      await linksOk(page, tag, hrefs, src.map((s) => s.href));

      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0, await overflow(page));
      await focusOk(page, tag, [page.locator(":is(.fides-learn-article__body, .fides-learn-continue) ul a").first(), page.locator(".fides-learn-sources__link").first()]);
      check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));
    }

    // For businesses overview: a linked row per article, no unlinked placeholder for representation.
    {
      errors.length = 0;
      const tag = `for-businesses overview @${width}`;
      const r = await open(page, G);
      check(`${tag}: answers 200`, r && r.status() === 200);
      const rows = await page.locator(".fides-learn__content ul.fides-learn-rows > li > a").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
      for (const a of PAGES) check(`${tag}: row links to ${a.slug}`, rows.includes(`${G}${a.slug}/`), rows.join(","));
      for (const s of ["business-wallets-where-to-start", "european-business-wallet", "accepting-information-from-a-wallet", "issuing-credentials-for-wallets"]) check(`${tag}: existing row ${s} is unchanged`, rows.includes(`${G}${s}/`));
      const unlinked = await page.locator(".fides-learn__content ul.fides-learn-rows > li > strong").allInnerTexts();
      check(`${tag}: "Company identity and representation" is no longer an unlinked placeholder`, !unlinked.some((t) => /Company identity and representation/.test(t)), unlinked.join("|"));
      const first = page.locator(".fides-learn__content ul.fides-learn-rows > li > a", { hasText: "How can someone act for an organisation?" }).first();
      await focusOk(page, tag, [first]);
      await first.click();
      await page.waitForLoadState("domcontentloaded");
      check(`${tag}: row click opens the article`, new URL(page.url()).pathname === `${G}how-can-someone-act-for-an-organisation/`, page.url());
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
      check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));
    }

    // One back link per existing article.
    for (const [from, tos] of BACKLINKS.slice(1)) {
      const tag = `back link ${from.replace("topics/for-businesses/", "")} @${width}`;
      const r = await open(page, `${L}/${from}`);
      check(`${tag}: page answers 200`, r && r.status() === 200);
      const hs = norm(await page.locator(".fides-learn__content a[href], :is(.fides-learn-article__body, .fides-learn-continue) a[href]").evaluateAll((as) => as.map((x) => x.getAttribute("href"))));
      for (const to of tos) check(`${tag}: links to ${to}`, hs.filter((h) => h === `${G}${to}/`).length === 1, hs.filter((h) => h.includes(to)).join(","));
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }
    // Business wallets: where to start points to the practice article and keeps the role and choice focus.
    {
      const tag = `where-to-start focus @${width}`;
      await open(page, `${G}business-wallets-where-to-start/`);
      const hs = norm(await page.locator(":is(.fides-learn-article__body, .fides-learn-continue) a[href]").evaluateAll((as) => as.map((x) => x.getAttribute("href"))));
      check(`${tag}: links to the preparation article`, hs.some((h) => h === `${G}how-can-an-organisation-prepare-a-wallet-use-case/`), hs.join(" "));
      const heads = (await page.locator(":is(.fides-learn-article__body, .fides-learn-continue) h2").allInnerTexts()).map(squash);
      for (const h of ["Start with one transaction", "Choose your role", "Compare wallets and providers", "Separate identity from authority", "How does the European Business Wallet fit?", "Prepare a small first step"]) check(`${tag}: section "${h}"`, heads.includes(h), heads.join("|"));
      check(`${tag}: use case card is still present`, (await page.locator(":is(.fides-learn-article__body, .fides-learn-continue) a", { hasText: "Explore the use case" }).count()) >= 1);
    }
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
