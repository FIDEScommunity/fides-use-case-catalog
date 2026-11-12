/**
 * Targeted checks for the five Ecosystem roles articles (topics/ecosystem-roles/<slug>/), 1440 and 390 px.
 * Per page: 200, English, one H1, breadcrumb Learn / Topics / Ecosystem roles / Title with clickable parents,
 * intro from the editorial text, the named sources in the sources list, internal links answer 200, external links
 * are not broken, "Learn more" / "Explore in the catalogs" groups, no unavailable destinations, no local host in the
 * content, back link from the overview and from the existing articles, no horizontal overflow, visible focus,
 * no console errors. The trust page: both organisation links open with the filter chip selected and results (or a
 * stated empty state).
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/ecosystem-roles-articles-checks.cjs   (WIDTHS=1440,390 by default)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const L = "/fides-design-pilot/learn";
const R = `${L}/topics/ecosystem-roles/`;
const W3C = ["W3C", "Verifiable Credentials Data Model 2.0", "https://www.w3.org/TR/vc-data-model-2.0/"];
const SD = ["European Commission", "Selective disclosure of attributes in the EUDI Wallet", "https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/949256476/What%2Bis%2Bselective%2Bdisclosure%2Bof%2Battributes"];
const TL = ["European Commission", "EU trusted lists", "https://digital-strategy.ec.europa.eu/en/policies/eu-trusted-lists"];
const QA = ["European Commission", "Questions and answers on trust services under the European digital identity regulation", "https://digital-strategy.ec.europa.eu/en/faqs/questions-answers-trust-services-under-european-digital-identity-regulation"];
const PAGES = [
  { slug: "the-holder", title: "The holder", intro: /^A holder receives a credential and can present information from it to another party\./, sources: [W3C, SD], headings: ["From receiving to sharing", "Choosing what to share", "Acting for an organisation", "Continue learning"], terms: ["Holder", "Issuer", "Mandate"],
    links: ["how-credentials-connect", "what-is-a-digital-wallet", "what-is-a-credential", "personal-wallets", "business-wallets", "topics/ecosystem-roles/"] },
  { slug: "the-issuer", title: "The issuer", intro: /^An issuer provides a credential containing information about a person/, sources: [W3C], headings: ["From information to a credential", "After issuance", "One organisation, different roles", "Continue learning"], terms: [],
    links: ["issuing-credentials-for-wallets", "what-is-a-credential", "how-credentials-connect", "credentials/", "topics/ecosystem-roles/"] },
  { slug: "the-relying-party", title: "The relying party", intro: /^A relying party is an organisation or service that requests and uses information from a wallet\./, sources: [W3C, SD], headings: ["Making a request", "Checking the information", "Relying party and verifier", "Continue learning"], terms: ["Verifier"],
    links: ["accepting-information-from-a-wallet", "trust-and-interoperability", "formats-and-protocols", "overview/", "topics/ecosystem-roles/"] },
  { slug: "wallet-providers-and-other-service-providers", title: "Wallet providers and other service providers", intro: /^A wallet provider makes a wallet available to people or organisations\./, sources: [], headings: ["What does a wallet provider do?", "How does a wallet connect to other parties?", "Other providers in the interaction", "Choosing a wallet or provider", "Continue learning"], terms: [],
    links: ["what-is-a-digital-wallet", "formats-and-protocols", "business-wallets-where-to-start", "personal-wallets", "business-wallets", "organizations/", "topics/ecosystem-roles/"] },
  { slug: "trust-service-providers-and-trust-frameworks", title: "Trust service providers and trust frameworks", intro: /^Digital interactions often involve several organisations\./, sources: [TL, QA], headings: ["What is a trust service?", "What does qualified mean?", "What is a trust framework?", "Finding providers", "Continue learning"], terms: [],
    links: ["trust-and-interoperability", "how-credentials-connect", "formats-and-protocols", "organizations/?role=eidas_trust_service_provider", "organizations/?cert=qtsp", "credentials/", "topics/ecosystem-roles/"] },
];
const BACK = { "topics/the-big-picture/what-is-a-digital-wallet": "the-holder", "topics/for-businesses/issuing-credentials-for-wallets": "the-issuer", "topics/for-businesses/accepting-information-from-a-wallet": "the-relying-party", "topics/the-big-picture/trust-and-interoperability": "trust-service-providers-and-trust-frameworks" };
const linkCache = new Map(); // one request per URL and run (internal and external)
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${String(detail).slice(0, 240)})` : ""}`);
}
const squash = (s) => String(s).replace(/\s+/g, " ").trim();
async function open(page, url) {
  const response = await page.goto(url.startsWith("http") ? url : `${BASE}${url}`, { waitUntil: "domcontentloaded" });
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
    for (const a of PAGES) {
      const tag = `${a.slug} @${width}`;
      const r = await open(page, `${R}${a.slug}/`);
      check(`${tag}: answers 200`, r && r.status() === 200);
      check(`${tag}: English page`, /^en/i.test(await page.evaluate(() => document.documentElement.lang)));
      const h1s = await page.locator("h1").allInnerTexts();
      check(`${tag}: one H1 "${a.title}"`, h1s.length === 1 && h1s[0].trim() === a.title, h1s.join("|"));
      const crumbs = squash(await page.locator("nav[aria-label=Breadcrumb]").first().textContent().catch(() => ""));
      check(`${tag}: breadcrumb Learn / Topics / Ecosystem roles / title`, crumbs === `Learn Topics Ecosystem roles ${a.title}` || crumbs === `LearnTopicsEcosystem roles${a.title}`, crumbs);
      const crumbLinks = await page.locator("nav[aria-label=Breadcrumb] a").evaluateAll((as) => as.map((x) => new URL(x.href).pathname.replace(/\/$/, "")));
      check(`${tag}: breadcrumb parents are clickable (Learn, Topics, Ecosystem roles)`, crumbLinks.join(",") === [L, `${L}/topics`, `${L}/topics/ecosystem-roles`].join(","), crumbLinks.join(","));
      let lastCrumb = await page.locator("nav[aria-label=Breadcrumb] [aria-current=page]").allInnerTexts();
      check(`${tag}: current breadcrumb is the title and not a link`, lastCrumb.length === 1 && lastCrumb[0].trim() === a.title, lastCrumb.join("|"));
      const intro = squash(await page.locator(".fides-learn__intro").first().innerText().catch(() => ""));
      check(`${tag}: intro text`, a.intro.test(intro), intro);
      check(`${tag}: eyebrow "Explainer · Ecosystem roles"`, (await page.locator(".fides-learn__eyebrow").allTextContents()).some((t) => /Explainer · Ecosystem roles/.test(squash(t))));
      const heads = (await page.locator(".fides-learn__content h2, .fides-learn-article__body h2").allInnerTexts()).map(squash);
      for (const h of a.headings) check(`${tag}: section "${h}"`, heads.includes(h), heads.join("|"));

      // Sources: exactly the named ones, name in bold, external, new tab.
      const src = await page.locator(".fides-learn-sources__link").evaluateAll((as) => as.map((x) => ({ href: x.getAttribute("href"), name: x.querySelector(".fides-learn-sources__name")?.textContent.trim(), text: x.textContent.replace(/\s+/g, " ").trim(), target: x.target })));
      check(`${tag}: ${a.sources.length} source(s) listed`, src.length === a.sources.length, JSON.stringify(src.map((s) => s.href)));
      for (const [name, title, href] of a.sources) {
        const hit = src.find((s) => s.href === href);
        check(`${tag}: source "${name} · ${title.slice(0, 40)}"`, !!hit && hit.name === name && hit.text.includes(title) && hit.target === "_blank", JSON.stringify(hit));
      }
      if (!a.sources.length) check(`${tag}: no sources block`, (await page.locator(".fides-learn-sources").count()) === 0);

      // Glossary terms exist (rendered chips/links) and none is reported missing.
      const terms = await page.locator(".fides-learn__content .fides-ds-term, .fides-learn-article__body .fides-ds-term").allInnerTexts();
      check(`${tag}: ${a.terms.length} glossary term(s) rendered`, terms.length >= a.terms.length, terms.join("|"));

      // Links.
      const hrefs = await page.locator(".fides-learn-article__body a[href]").evaluateAll((as) => as.map((x) => x.getAttribute("href")));
      check(`${tag}: no local host in the content links`, hrefs.every((h) => !/localhost|127\.0\.0\.1/.test(h)));
      check(`${tag}: no link to issuer-catalog or relying-party-websites`, hrefs.every((h) => !/issuer-catalog|relying-party-websites/.test(h)));
      for (const l of a.links) check(`${tag}: links to ${l}`, hrefs.some((h) => h.includes(l)), hrefs.join(" "));
      const groups = await page.locator(".fides-learn-article__body h3").allInnerTexts();
      check(`${tag}: groups "Learn more" and "Explore in the catalogs"`, ["Learn more", "Explore in the catalogs"].every((g) => groups.includes(g)), groups.join("|"));
      const internal = [...new Set(hrefs.filter((h) => h.startsWith("/")))];
      const bad = [];
      for (const h of internal) { if (!linkCache.has(h)) linkCache.set(h, (await page.request.get(`${BASE}${h}`)).status()); if (linkCache.get(h) !== 200) bad.push(`${h} ${linkCache.get(h)}`); }
      check(`${tag}: ${internal.length} internal links answer 200`, internal.length >= 5 && bad.length === 0, bad.join(", "));
      const external = [...new Set([...hrefs, ...src.map((s) => s.href)].filter((h) => /^https?:/.test(h)))];
      for (const h of external) {
        let status = 0;
        if (linkCache.has(h)) status = linkCache.get(h); else { try { status = (await page.request.get(h, { timeout: 10000 })).status(); } catch (e) { status = -1; } linkCache.set(h, status); }
        // Network trouble or bot protection (403/429) is reported, not counted as a broken link.
        if (status === -1 || [401, 403, 405, 429, 999].includes(status)) console.log(`warn - ${tag}: external ${h.slice(0, 80)} answered ${status} (not verifiable from here)`);
        else check(`${tag}: external link ${h.slice(0, 70)} answers < 400`, status > 0 && status < 400, String(status));
      }
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0, await overflow(page));
      // Visible focus on the first link in "Learn more" and on the first source.
      const focusTargets = [page.locator(".fides-learn-article__body ul a").first(), page.locator(".fides-learn-sources__link").first()];
      for (const t of focusTargets) {
        if (!(await t.count())) continue;
        await t.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        const f = await t.evaluate((el) => { const s = getComputedStyle(el); return { active: document.activeElement === el, outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0, shadow: s.boxShadow !== "none" }; });
        check(`${tag}: keyboard focus is visible (${await t.evaluate((el) => el.className || el.tagName)})`, f.active && (f.outline || f.shadow), JSON.stringify(f));
      }
      check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));
    }

    // Trust page: the filtered organisation links open with the filter selected.
    const FILTERS = [
      { url: "?role=eidas_trust_service_provider", chip: "Ecosystem role: eIDAS Trust Service Provider", label: "role" },
      { url: "?cert=qtsp", chip: "Certification: QTSP (eIDAS)", label: "certification" },
      { url: "?role=eidas_trust_service_provider&cert=qtsp", chip: null, label: "both" },
    ];
    for (const f of FILTERS) {
      const tag = `organisation filter ${f.label} @${width}`;
      const r = await open(page, `/fides-design-pilot/organizations/${f.url}`);
      check(`${tag}: answers 200`, r && r.status() === 200);
      await page.waitForFunction(() => /\b\d[\d,]*\s+organi[sz]ations?\b/i.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {});
      const text = squash(await page.locator("body").innerText());
      const chips = [f.chip].filter(Boolean).concat(f.label === "both" ? ["Ecosystem role: eIDAS Trust Service Provider", "Certification: QTSP (eIDAS)"] : []);
      for (const c of chips) check(`${tag}: selected filter "${c}" is shown`, text.includes(c));
      const m = text.match(/\b(\d[\d,]*)\s+organi[sz]ations?\b/i);
      check(`${tag}: results are shown (> 0)`, !!m && Number(m[1].replace(/,/g, "")) > 0, m ? m[0] : "no result count");
      console.log(`info - ${tag}: ${m ? m[0] : "?"}`);
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }

    // Back links from the overview and the existing articles.
    let rr = await open(page, R);
    const rowHrefs = await page.locator(".fides-learn__content ul.fides-learn-rows > li > a").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
    for (const a of PAGES) check(`overview @${width}: row links to ${a.slug}`, rowHrefs.includes(`${R}${a.slug}/`), rowHrefs.join(","));
    check(`overview @${width}: no "Design preview" label and no "not available yet" text`, !/Design preview|not available yet/i.test(await page.locator(".fides-learn__content").innerText()));
    for (const [p, slug] of Object.entries(BACK)) {
      await open(page, `${L}/${p}/`);
      const n = await page.locator(`.fides-learn-article__body a[href$="/topics/ecosystem-roles/${slug}/"]`).count();
      check(`${p.split("/").pop()} @${width}: one link to ${slug}`, n === 1, n);
      check(`${p.split("/").pop()} @${width}: no horizontal overflow`, (await overflow(page)) <= 0);
    }
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
