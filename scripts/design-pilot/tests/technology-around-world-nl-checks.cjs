/**
 * Targeted Dutch (and English) checks for Learn > Technology and Around the world at 1440 and 390 px (local pilot only, nothing is submitted).
 * Per route (the eight pages of the series): 200, lang nl, Dutch H1 and breadcrumb, one expected Dutch sentence, no "je/jij/jouw"
 * (formal "u" only), no untranslated English sentence in the body (source lists excluded), no horizontal overflow.
 * Topics: Dutch topic names on the cards ("Technologie", "Internationaal"), navigation title versus H1 of the international overview,
 * links of the overview rows, link from "The EUDI Wallet and national implementation" to the international overview (link text equals
 * the real page title, at most four "Learn more" links), "What is a digital wallet?" has at most four "Learn more" links (EN and NL),
 * the QTSP filter link of "Trust frameworks and registries" (EN and NL) opens the organisation catalog with results.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/technology-around-world-nl-checks.cjs   (WIDTHS=1440,390 by default)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const LEARN = "/fides-design-pilot/learn";
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${String(detail).slice(0, 260)})` : ""}`);
}
const squash = (s) => String(s || "").replace(/\s+/g, " ").trim();
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// path below the Learn root, Dutch H1, Dutch breadcrumb tail, a Dutch sentence that must be present.
const ROUTES = [
  { path: "topics/technology/", h1: "Technologie", crumb: "Technologie", has: /Bij interacties met wallets komen gegevens, software en afspraken/ },
  { path: "topics/technology/how-do-wallets-and-services-exchange-information/", h1: "Hoe wisselen wallets en diensten informatie uit?", has: /Een wallet kan informatie van een uitgever \(issuer\) ontvangen/ },
  { path: "topics/technology/credential-formats-and-interoperability/", h1: "Credentialformaten en interoperabiliteit", has: /Een credentialformaat legt vast hoe informatie/ },
  { path: "topics/technology/trust-frameworks-and-registries/", h1: "Trust frameworks en registers", has: /Een trust framework \(afsprakenstelsel\) legt afspraken en regels vast/ },
  { path: "topics/around-the-world/", h1: "Digitaal vertrouwen wereldwijd", crumb: "Internationaal", has: /Landen en internationale initiatieven ontwikkelen verschillende manieren/ },
  { path: "topics/around-the-world/the-netherlands/", h1: "Nederland — digitale identiteit en publieke gegevens", has: /Programma EDI-Stelsel NL werkt aan de implementatie/ },
  { path: "topics/around-the-world/germany/", h1: "Duitsland — het EUDI Wallet-ecosysteem", has: /d-you/ },
  { path: "topics/around-the-world/un-transparency-protocol/", h1: "UN Transparency Protocol", has: /In UNTP wordt het digitale productpaspoort uitgegeven door de verzender van goederen/ },
];
const INFORMAL = /\b(je|jij|jouw|jou|jouwe|jezelf|jullie)\b/i;
// Words that mark an untranslated English sentence (names such as "Work in Progress" sit in quotes and carry none of these).
const ENGLISH = /\b(the|your|with|this|that|you|are|will|from|which|should)\b/;

async function open(page, url) {
  const r = await page.goto(BASE + url, { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => {});
  return r;
}
async function qtsp(page, tag, prefix) {
  await open(page, `${prefix}${LEARN}/topics/technology/trust-frameworks-and-registries/`);
  const link = page.locator(':is(.fides-learn-article__body, .fides-learn-continue) a[href*="cert=qtsp"]').first();
  const href = await link.getAttribute("href");
  const text = squash(await link.innerText());
  check(`${tag}: QTSP link points at ${prefix}/fides-design-pilot/organizations/?cert=qtsp`, href === `${prefix}/fides-design-pilot/organizations/?cert=qtsp`, href);
  await link.click();
  await page.waitForURL("**cert=qtsp**", { timeout: 10000 }).catch(() => {});
  await page.waitForSelector("#fides-org-catalog-root .fides-uc-pilot__count", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const chip = squash(await page.locator("#fides-org-catalog-root .fides-uc-pilot__pill").first().innerText().catch(() => ""));
  const count = squash(await page.locator("[data-pilot-count]").first().textContent().catch(() => ""));
  const rows = await page.locator("#fides-org-catalog-root a[href*='?org='], #fides-org-catalog-root [data-org-id], #fides-org-catalog-root .fides-uc-pilot__row").count();
  check(`${tag}: URL ${new URL(page.url()).pathname}${new URL(page.url()).search}; link text "${text}"; chip "${chip}"; count "${count}"`, /QTSP \(eIDAS\)/.test(chip) && parseInt(count, 10) > 0 && rows > 0, `${chip} | ${count} | rows ${rows}`);
  check(`${tag}: QTSP page has no horizontal overflow`, (await overflow(page)) <= 0, await overflow(page));
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource|Content Security Policy|the server responded/.test(m.text()) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    // Safety: nothing is submitted (every non-GET request except the read-only TranslatePress lookup is aborted).
    let blocked = 0;
    await page.route("**/*", (route) => {
      const body = route.request().postData() || "";
      if (route.request().method() !== "GET" && route.request().method() !== "HEAD" && !/action=trp_get_translations/.test(body)) { blocked += 1; return route.abort(); }
      return route.continue();
    });

    // 1. The eight routes in Dutch.
    for (const r of ROUTES) {
      const tag = `/nl/${r.path} @${width}`;
      const res = await open(page, `/nl${LEARN}/${r.path}`);
      check(`${tag}: answers 200`, res.status() === 200);
      check(`${tag}: lang nl`, /^nl/i.test(await page.locator("html").getAttribute("lang")));
      const h1s = (await page.locator("h1").allInnerTexts()).map(squash);
      check(`${tag}: one H1 "${r.h1}"`, h1s.length === 1 && h1s[0] === r.h1, h1s.join("|"));
      const crumbs = squash(await page.locator("nav[aria-label=Breadcrumb], nav[aria-label=Kruimelpad], nav.fides-learn-breadcrumb").first().textContent().catch(() => ""));
      const tail = r.crumb || r.h1;
      check(`${tag}: breadcrumb ends with the Dutch title "${tail}"`, crumbs.endsWith(tail), crumbs);
      if (/topics\/around-the-world\//.test(r.path) && r.path !== "topics/around-the-world/") check(`${tag}: breadcrumb names the topic "Internationaal"`, /Internationaal/.test(crumbs), crumbs);
      if (/topics\/technology\/./.test(r.path)) check(`${tag}: breadcrumb names the topic "Technologie"`, /Technologie/.test(crumbs), crumbs);
      const body = await page.evaluate(() => {
        const root = document.querySelector(".fides-learn-article__body, .fides-learn__content, main") || document.body;
        const clone = root.cloneNode(true);
        clone.querySelectorAll(".fides-learn-sources, [class*=sources], script, style, noscript").forEach((e) => e.remove());
        return { text: clone.innerText, blocks: [...clone.querySelectorAll("p, li")].map((e) => e.innerText.replace(/\s+/g, " ").trim()).filter(Boolean) };
      });
      const text = squash(body.text);
      check(`${tag}: Dutch text present`, r.has.test(text), text.slice(0, 120));
      check(`${tag}: formal "u" only (no je/jij/jouw)`, !INFORMAL.test(text), (text.match(INFORMAL) || []).join(","));
      const english = body.blocks.filter((b) => ENGLISH.test(b.toLowerCase().replace(/d-you/g, "")) && !/^(Credentialformaten|Hoe wisselen)/.test(b)).slice(0, 3);
      check(`${tag}: no untranslated English sentences`, english.length === 0, english.join(" || "));
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0, await overflow(page));
    }

    // 2. Topics cards and the navigation title versus the H1.
    let tag = `/nl/topics @${width}`;
    await open(page, `/nl${LEARN}/topics/`);
    const cards = await page.locator(".fides-learn-rows a").evaluateAll((as) => as.map((a) => ({ t: a.textContent.trim(), h: new URL(a.href).pathname })));
    const tech = cards.find((c) => c.h === `/nl${LEARN}/topics/technology/`);
    const world = cards.find((c) => c.h === `/nl${LEARN}/topics/around-the-world/`);
    check(`${tag}: Topics card "Technologie" links to the Dutch overview`, !!tech && tech.t === "Technologie", JSON.stringify(cards.map((c) => c.t)));
    check(`${tag}: Topics card "Internationaal" links to the Dutch overview`, !!world && world.t === "Internationaal", JSON.stringify(cards.map((c) => c.t)));
    check(`${tag}: no old Dutch names ("Wereldwijd", "Rond de wereld") on the Topics page`, !/Wereldwijd|Rond de wereld/.test(squash(await page.locator("main").innerText())));
    await page.locator(`.fides-learn-rows a[href$="/topics/around-the-world/"]`).first().click();
    await page.waitForLoadState("load");
    const h1w = squash(await page.locator("h1").first().innerText());
    check(`${tag}: card "Internationaal" opens the overview with H1 "Digitaal vertrouwen wereldwijd" (navigation title and H1 differ)`, h1w === "Digitaal vertrouwen wereldwijd" && /\/nl\/fides-design-pilot\/learn\/topics\/around-the-world\/$/.test(page.url()), `${h1w} ${page.url()}`);
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    // Overview rows keep /nl/ and use the real (Dutch) page titles.
    const rowLinks = await page.locator(".fides-learn__content a, .fides-learn-rows a").evaluateAll((as) => as.map((a) => ({ t: a.textContent.trim(), h: new URL(a.href).pathname })).filter((x) => /\/topics\//.test(x.h)));
    check(`${tag}: international rows keep /nl/ and name Nederland, Duitsland and UN Transparency Protocol`, ["Nederland — digitale identiteit en publieke gegevens", "Duitsland — het EUDI Wallet-ecosysteem", "UN Transparency Protocol"].every((t) => rowLinks.some((x) => x.t === t && x.h.startsWith("/nl/"))), JSON.stringify(rowLinks.map((x) => x.t)));
    // Overview page (Learn home) names the topic list consistently.
    await open(page, `/nl${LEARN}/`);
    const home = squash(await page.locator("main").innerText());
    check(`/nl/learn @${width}: topic list uses "Technologie · Internationaal"`, /Technologie · Internationaal/.test(home) && !/Wereldwijd/.test(home), home.slice(0, 200));

    // 3. For governments: link to the international overview with the real page title, at most four Learn more links.
    for (const [lang, prefix, title] of [["en", "", "Around the world"], ["nl", "/nl", "Internationaal"]]) {
      tag = `/${lang}/the-eudi-wallet-and-national-implementation @${width}`;
      await open(page, `${prefix}${LEARN}/topics/for-governments/the-eudi-wallet-and-national-implementation/`);
      const items = await page.locator(":is(.fides-learn-article__body, .fides-learn-continue) h3:has-text('Learn more'), :is(.fides-learn-article__body, .fides-learn-continue) h3:has-text('Meer uitleg')").first().evaluate((h) => { let ul = h.nextElementSibling; while (ul && ul.tagName !== "UL") ul = ul.nextElementSibling; return [...ul.querySelectorAll("li a")].map((a) => ({ t: a.textContent.trim(), h: new URL(a.href).pathname })); });
      check(`${tag}: Learn more has at most four links (${items.length})`, items.length > 0 && items.length <= 4, items.length);
      // Since the 3 + 2 selection (13 November 2026, learn/continue-learning-selection.md) this article links to the concrete
      // country example (The Netherlands) instead of the Around the world hub; the hub stays reachable from the Learn overview and
      // "Digital wallets and public services". The link must carry the real page title (`title`, the hub name, is only used when the hub is linked).
      const hub = items.find((x) => x.h === `${prefix}${LEARN}/topics/around-the-world/`);
      const w = hub || items.find((x) => x.h === `${prefix}${LEARN}/topics/around-the-world/the-netherlands/`);
      check(`${tag}: Learn more links to a country example or the international overview`, !!w && (hub ? w.t === title : /Netherlands|Nederland/.test(w.t)), JSON.stringify(items));
      if (w) {
        await page.locator(`:is(.fides-learn-article__body, .fides-learn-continue) a[href="${w.h}"]`).first().click();
        await page.waitForLoadState("load");
        const crumb = squash(await page.locator("nav[aria-label=Breadcrumb], nav[aria-label=Kruimelpad], nav.fides-learn-breadcrumb").first().textContent().catch(() => ""));
        check(`${tag}: link text equals the title of the page it opens (breadcrumb "${crumb.slice(-30)}")`, crumb.endsWith(w.t), crumb);
      }
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
      // What is a digital wallet?: at most four Learn more links, includes the new Technology article.
      tag = `/${lang}/what-is-a-digital-wallet @${width}`;
      await open(page, `${prefix}${LEARN}/topics/the-big-picture/what-is-a-digital-wallet/`);
      const wl = await page.locator(":is(.fides-learn-article__body, .fides-learn-continue) h3:has-text('Learn more'), :is(.fides-learn-article__body, .fides-learn-continue) h3:has-text('Meer uitleg')").first().evaluate((h) => { let ul = h.nextElementSibling; while (ul && ul.tagName !== "UL") ul = ul.nextElementSibling; return [...ul.querySelectorAll("li a")].map((a) => ({ t: a.textContent.trim(), h: new URL(a.href).pathname })); });
      check(`${tag}: Learn more has at most four links (${wl.length})`, wl.length > 0 && wl.length <= 4, wl.length);
      check(`${tag}: Learn more points at the Technology article on exchange`, wl.some((x) => x.h === `${prefix}${LEARN}/topics/technology/how-do-wallets-and-services-exchange-information/`), JSON.stringify(wl));
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }

    // 4. QTSP filter link (English and Dutch).
    await qtsp(page, `/en QTSP link @${width}`, "");
    await qtsp(page, `/nl QTSP link @${width}`, "/nl");

    check(`@${width}: nothing submitted (blocked non-GET requests: ${blocked})`, true);
    check(`@${width}: no console errors`, errors.length === 0, errors.join(" | "));
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
