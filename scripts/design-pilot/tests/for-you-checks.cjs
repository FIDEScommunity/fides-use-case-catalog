/**
 * Targeted checks for Learn > Topics > For you: the overview (topics/for-you/) and its three articles, at 1440 and
 * 390 px. Per page: 200, English, one H1, breadcrumb Learn / Topics / For you / title with clickable parents, sources
 * (Organisation · Title, external, new tab), internal links answer 200, external links are not broken (403/429 and
 * network trouble are warnings), no unavailable destinations, series navigation (Previous/Next), no horizontal
 * overflow, visible focus, no console errors. Topics: the "For you" row is a link; back links from existing pages.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/for-you-checks.cjs   (WIDTHS=1440,390 by default)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const L = "/fides-design-pilot/learn";
const G = `${L}/topics/for-you/`;
const W3C = ["W3C", "Verifiable Credentials Data Model 2.0", "https://www.w3.org/TR/vc-data-model-2.0/"];
const SD = ["European Commission", "Selective disclosure of attributes in the EUDI Wallet", "https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/949256476/What%2Bis%2Bselective%2Bdisclosure%2Bof%2Battributes"];
const EW = ["European Commission", "European Digital Identity Wallet", "https://digital-strategy.ec.europa.eu/en/factpages/european-digital-identity-wallet"];
const PAGES = [
  { slug: "receiving-information-in-a-wallet", title: "Receiving information in a wallet", intro: /^How does information get into a wallet, and who provides it\?/, sources: [W3C],
    headings: ["An example", "Before you add something", "What happens if information changes?", "Continue learning"],
    links: ["sharing-information-from-a-wallet", "what-is-a-credential", "how-credentials-connect", "personal-wallets"], terms: 1, learnMore: 4 },
  { slug: "sharing-information-from-a-wallet", title: "Sharing information from a wallet", intro: /^What should you look at when a service asks you to share information\?/, sources: [W3C, SD, EW],
    headings: ["Check the request", "What can you choose to share?", "What happens afterwards?", "Continue learning"],
    links: ["receiving-information-in-a-wallet", "the-holder", "the-relying-party", "european-digital-identity-wallet", "personal-wallets"], terms: 1, learnMore: 4 },
  { slug: "choosing-and-managing-a-wallet", title: "Choosing and managing a wallet", intro: /^What can you check when choosing a wallet, and where can you find help\?/, sources: [EW],
    headings: ["Questions to ask", "If your device is lost or replaced", "Compare available wallets", "Continue learning"],
    links: ["what-is-a-digital-wallet", "european-digital-identity-wallet", "personal-wallets"], terms: 0, learnMore: 2 },
];
const BACKLINKS = [
  ["topics/", "for-you/"],
  ["topics/the-big-picture/what-is-a-digital-wallet/", "for-you/choosing-and-managing-a-wallet/"],
  ["topics/the-big-picture/what-is-a-credential/", "for-you/receiving-information-in-a-wallet/"],
  ["topics/ecosystem-roles/the-holder/", "for-you/sharing-information-from-a-wallet/"],
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
    page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    // Overview.
    {
      const tag = `overview @${width}`;
      const r = await open(page, G);
      check(`${tag}: answers 200`, r && r.status() === 200);
      check(`${tag}: English page`, /^en/i.test(await page.evaluate(() => document.documentElement.lang)));
      const h1s = await page.locator("h1").allInnerTexts();
      check(`${tag}: one H1 "For you"`, h1s.length === 1 && h1s[0].trim() === "For you", h1s.join("|"));
      const crumbs = squash(await page.locator("nav[aria-label=Breadcrumb]").first().textContent().catch(() => ""));
      check(`${tag}: breadcrumb Learn / Topics / For you`, crumbs === "Learn Topics For you" || crumbs === "LearnTopicsFor you", crumbs);
      const crumbLinks = await page.locator("nav[aria-label=Breadcrumb] a").evaluateAll((as) => as.map((x) => new URL(x.href).pathname.replace(/\/$/, "")));
      check(`${tag}: breadcrumb parents are clickable (Learn, Topics)`, crumbLinks.join(",") === [L, `${L}/topics`].join(","), crumbLinks.join(","));
      const intro = squash(await page.locator(".fides-learn__intro").first().innerText().catch(() => ""));
      check(`${tag}: intro text`, /^A digital wallet can help you receive and share information, such as a qualification or proof of a particular entitlement\./.test(intro), intro);
      const heads = (await page.locator(".fides-learn__content h2").allInnerTexts()).map(squash);
      for (const h of ["Start with a question", "Explore further"]) check(`${tag}: section "${h}"`, heads.includes(h), heads.join("|"));
      const text = squash(await page.locator(".fides-learn__content").innerText());
      check(`${tag}: no "Design preview" and no "not available yet"`, !/Design preview|not available yet/i.test(text));
      const rowHrefs = await page.locator(".fides-learn__content ul.fides-learn-rows > li > a").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
      check(`${tag}: four question rows`, rowHrefs.length === 4, rowHrefs.join(","));
      for (const a of PAGES) check(`${tag}: row links to ${a.slug}`, rowHrefs.includes(`${G}${a.slug}/`), rowHrefs.join(","));
      check(`${tag}: row links to the existing European Digital Identity Wallet article`, rowHrefs.includes(`${L}/topics/the-big-picture/european-digital-identity-wallet/`));
      const hrefs = norm(await page.locator(".fides-learn__content a[href]").evaluateAll((as) => as.map((x) => x.getAttribute("href"))));
      for (const l of ["what-is-a-digital-wallet", "what-is-a-credential", "personal-wallets"]) check(`${tag}: Explore further links to ${l}`, hrefs.some((h) => h.includes(l)), hrefs.join(" "));
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
      check(`${tag}: breadcrumb Learn / Topics / For you / title`, crumbs === `Learn Topics For you ${a.title}` || crumbs === `LearnTopicsFor you${a.title}`, crumbs);
      const crumbLinks = await page.locator("nav[aria-label=Breadcrumb] a").evaluateAll((as) => as.map((x) => new URL(x.href).pathname.replace(/\/$/, "")));
      check(`${tag}: breadcrumb parents are clickable (Learn, Topics, For you)`, crumbLinks.join(",") === [L, `${L}/topics`, `${L}/topics/for-you`].join(","), crumbLinks.join(","));
      const eyebrow = squash(await page.locator(".fides-learn-article__eyebrow, .fides-learn__eyebrow").first().innerText().catch(() => ""));
      check(`${tag}: eyebrow "Explainer · For you"`, /Explainer\s*·\s*For you/i.test(eyebrow || squash(await page.locator("main").innerText())), eyebrow);
      const intro = squash(await page.locator(".fides-learn__intro").first().innerText().catch(() => ""));
      check(`${tag}: intro text`, a.intro.test(intro), intro);
      const heads = (await page.locator(".fides-learn-article__body h2").allInnerTexts()).map(squash);
      for (const h of a.headings) check(`${tag}: section "${h}"`, heads.includes(h), heads.join("|"));
      const body = squash(await page.locator(".fides-learn-article__body").innerText());
      check(`${tag}: illustrative note and last checked date`, /The examples are illustrative\./.test(body) && /Content last checked: 12 November 2026/.test(body));
      check(`${tag}: glossary term chips (${a.terms})`, (await page.locator(".fides-learn-article__body button.fides-ds-term").count()) === a.terms);
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
      check(`${tag}: no local host in the content links`, hrefs.every((h) => !/localhost|127\.0\.0\.1/.test(h)));
      check(`${tag}: no link to an unavailable destination (issuer catalog, relying party websites, interop profiles or matrix)`, hrefs.every((h) => !UNAVAILABLE.test(h)), hrefs.filter((h) => UNAVAILABLE.test(h)).join(","));
      for (const l of a.links) check(`${tag}: links to ${l}`, hrefs.some((h) => h.includes(l)), hrefs.join(" "));
      await linksOk(page, tag, hrefs, src.map((s) => s.href));

      // Series navigation: Previous / Next in the order of the articles.
      const prev = await page.locator("nav.fides-learn-series a[rel=prev]").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
      const next = await page.locator("nav.fides-learn-series a[rel=next]").evaluateAll((as) => as.map((x) => new URL(x.href).pathname));
      check(`${tag}: Previous is ${i ? PAGES[i - 1].slug : "absent"}`, i ? prev.join() === `${G}${PAGES[i - 1].slug}/` : prev.length === 0, prev.join());
      check(`${tag}: Next is ${i < PAGES.length - 1 ? PAGES[i + 1].slug : "absent"}`, i < PAGES.length - 1 ? next.join() === `${G}${PAGES[i + 1].slug}/` : next.length === 0, next.join());

      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0, await overflow(page));
      await focusOk(page, tag, [page.locator(".fides-learn-article__body ul a").first(), page.locator(".fides-learn-sources__link").first()]);
      check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));
    }

    // Topics: the For you row is a link and opens the overview.
    {
      const tag = `topics @${width}`;
      await open(page, `${L}/topics/`);
      const rowText = squash(await page.locator(".fides-learn__content ul.fides-learn-rows > li", { hasText: "For you" }).first().innerText());
      check(`${tag}: For you row has its description and no "Design preview"`, /Using wallets as an individual/.test(rowText) && !/Design preview/i.test(rowText), rowText);
      const others = await page.locator(".fides-learn__content ul.fides-learn-rows > li > a").evaluateAll((as) => as.map((x) => x.textContent.trim()));
      for (const n of ["The big picture", "For businesses", "For governments", "Ecosystem roles"]) check(`${tag}: existing link "${n}" is unchanged`, others.includes(n), others.join("|"));
      const link = page.locator(".fides-learn__content ul.fides-learn-rows > li > a", { hasText: "For you" }).first();
      check(`${tag}: the For you row is a link`, (await link.count()) === 1);
      if (await link.count()) {
        check(`${tag}: link goes to topics/for-you/`, new URL(await link.evaluate((x) => x.href)).pathname === G);
        await link.click();
        await page.waitForLoadState("domcontentloaded");
        check(`${tag}: click opens the overview`, new URL(page.url()).pathname === G && (await page.locator("h1").first().innerText()).trim() === "For you", page.url());
      }
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }

    // Back links from existing pages.
    for (const [from, to] of BACKLINKS) {
      const tag = `back link ${from} @${width}`;
      const r = await open(page, `${L}/${from}`);
      check(`${tag}: page answers 200`, r && r.status() === 200);
      const hs = norm(await page.locator(".fides-learn__content a[href], .fides-learn-article__body a[href]").evaluateAll((as) => as.map((x) => x.getAttribute("href"))));
      check(`${tag}: links to ${to}`, hs.some((h) => h === `${L}/topics/${to}`), hs.filter((h) => h.includes("for-you")).join(","));
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
