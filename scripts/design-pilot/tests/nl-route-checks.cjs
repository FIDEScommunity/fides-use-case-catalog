/**
 * Dutch route checks (TranslatePress /nl/) on the local pilot: Learn -> Topics -> articles, Training & workshops -> offering -> request
 * (the form is shown, never submitted: every non-GET request is aborted and counted), and the start/receive route.
 * Per page: language, no English interface or screen-reader labels, links keep /nl/ and answer 200, back navigation,
 * no horizontal overflow, no console errors, and at least one Dutch aria-label.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/nl-route-checks.cjs   (WIDTHS=1440,390 by default; NL_PATHS=a,b runs only those routes)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const ORIGIN = process.env.PILOT_ORIGIN || "http://localhost:10088";
const NL = `${ORIGIN}/nl/fides-design-pilot`;
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${String(detail).slice(0, 260)})` : ""}`);
}
// English interface and screen-reader labels that must not appear on a Dutch page (official offering names are not listed).
const ENGLISH_LABELS = /^(Skip to content|Breadcrumb|Footer|Main|Close|Search FIDES|Learn menu:?|FIDES menu|View training|View workshop|View introduction session|Register interest|\(View [a-z ]+\)|\(Register interest\)|Learn more|Read more|View details|Request this training|Sign in|About FIDES|On this page|Terms in this article|Full definition)$/i;
// Sentences that mark untranslated body text. Words that occur in official names ("in", "of", "as") are left out.
const ENGLISH_WORDS = /\b(the|your|with|this|that|you|are|will|from|which|should)\b/;
const ARTICLES = ["what-is-a-digital-wallet", "what-is-a-credential", "how-credentials-connect", "european-digital-identity-wallet", "eudi-wallet-and-european-business-wallet", "formats-and-protocols", "trust-and-interoperability"].map((s) => `learn/topics/the-big-picture/${s}`)
  .concat(["issuing-credentials-for-wallets", "accepting-information-from-a-wallet", "business-wallets-where-to-start", "european-business-wallet"].map((s) => `learn/topics/for-businesses/${s}`));
// Sentence openers that used to be the lone fragments A / An / The: path below the Learn root and the Dutch opener expected at the start of the paragraph or list item.
const ARTICLE_OPENERS = [
  ["what-is-a-digital-wallet", "Een wallet"], ["what-is-a-digital-wallet", "De EUDI Wallet"],
  ["what-is-a-credential", "Een verifieerbaar credential"], ["what-is-a-credential", "Een attribuut"], ["what-is-a-credential", "Een schema"], ["what-is-a-credential", "Een formaat"],
  ["how-credentials-connect", "De uitgever"], ["european-digital-identity-wallet", "De houder"], ["european-digital-identity-wallet", "De uitgever (issuer)"],
  ["european-digital-identity-wallet", "De vertrouwende partij"], ["european-digital-identity-wallet", "De walletaanbieder"],
  ["eudi-wallet-and-european-business-wallet", "De European Digital Identity Wallet"], ["formats-and-protocols", "Een credentialformaat"], ["formats-and-protocols", "Een protocol"],
  ["trust-and-interoperability", "Een afsprakenstelsel"], ["trust-and-interoperability", "Een vertrouwensregister"], ["issuing-credentials-for-wallets", "Een uitgever (issuer)"],
];
// Technology and Around the world (13 November 2026): English until the proposals in learn/nl-translation-changes-technology-around-world.md are entered, so these routes report their untranslated sentences.
const TECH_WORLD = ["technology", "technology/how-do-wallets-and-services-exchange-information", "technology/credential-formats-and-interoperability", "technology/trust-frameworks-and-registries",
  "around-the-world", "around-the-world/the-netherlands", "around-the-world/germany", "around-the-world/un-transparency-protocol"].map((s) => `learn/topics/${s}`);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function open(page, path) {
  const r = await page.goto(`${NL}/${path}`.replace(/\/+$/, "/"), { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1200 }).then(() => true, () => false)) await deny.click();
  await page.waitForLoadState("networkidle").catch(() => {});
  return r;
}
/** Texts of labels and body that are not data from third parties (glossary sources, consent banner, assistant widget). */
async function audit(page, tag) {
  const data = await page.evaluate(() => {
    const skip = "#cmplz-cookiebanner-container, .cmplz-cookiebanner, .cmplz-manage-consent, .fides-assistant, .fides-learn-sources, [data-fides-ssr], script, style, noscript";
    const bad = (el) => el.closest(skip);
    const attrs = [];
    for (const el of document.querySelectorAll("[aria-label],[title],[alt],[placeholder]")) {
      if (bad(el)) continue;
      for (const a of ["aria-label", "title", "alt", "placeholder"]) { const v = el.getAttribute(a); if (v) attrs.push(v.trim()); }
    }
    const texts = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const t = n.nodeValue.replace(/\s+/g, " ").trim();
      if (t && n.parentElement && !bad(n.parentElement)) texts.push(t);
    }
    return { lang: document.documentElement.lang, attrs, texts, arias: [...document.querySelectorAll("[aria-label]")].filter((e) => !bad(e)).map((e) => e.getAttribute("aria-label")) };
  });
  check(`${tag}: html lang is nl`, /^nl/i.test(data.lang), data.lang);
  const badLabels = [...new Set([...data.attrs, ...data.texts].filter((t) => ENGLISH_LABELS.test(t)))];
  check(`${tag}: no English interface or screen-reader labels`, badLabels.length === 0, badLabels.join(" | "));
  const body = [...new Set(data.texts.filter((t) => t.length > 30 && ENGLISH_WORDS.test(t.toLowerCase().replace(/d-you/g, "")) && !/^(Digital Certificate of Good Conduct|EUDI & Business Wallets in Practice)/.test(t)))];
  check(`${tag}: no untranslated English sentences`, body.length === 0, body.slice(0, 3).join(" | "));
  const dutchAria = data.arias.filter((a) => /^(Kruimelpad|Hoofdnavigatie|Voettekst|Sluiten|Menu|Zoeken|Learn)/i.test(a));
  check(`${tag}: has a Dutch screen-reader label (aria-label)`, dutchAria.length > 0, data.arias.join(", "));
}
const linkStatus = new Map(); // every URL is requested once per run
async function links(page, tag) {
  const hrefs = await page.locator("a[href]:not(.fides-ds-lang__link)").evaluateAll((as) => [...new Set(as.map((a) => a.href).filter((h) => h && !h.startsWith("javascript:") && !h.startsWith("mailto:") && !h.startsWith("tel:")))]);
  const internal = hrefs.filter((h) => h.startsWith(ORIGIN)).map((h) => h.split("#")[0]).filter((h, i, a) => h && a.indexOf(h) === i);
  const dropped = internal.filter((h) => /\/fides-design-pilot\/(learn|services|start)(\/|$)/.test(h) && !/\/nl\/fides-design-pilot\//.test(h));
  check(`${tag}: route links keep the Dutch /nl/ prefix`, dropped.length === 0, dropped.slice(0, 3).join(", "));
  const bad = [];
  for (const h of internal) {
    if (!linkStatus.has(h)) linkStatus.set(h, (await page.request.get(h, { maxRedirects: 5 })).status());
    if (linkStatus.get(h) >= 400) bad.push(`${h} ${linkStatus.get(h)}`);
  }
  check(`${tag}: internal links answer 200 (${internal.length})`, bad.length === 0, bad.join(", "));
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    let blocked = 0;
    const blockedKinds = new Set();
    page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource|Content Security Policy|the server responded/.test(m.text()) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    // Safety: nothing may be submitted. Every non-GET request is aborted and counted (except the read-only TranslatePress lookup).
    await page.route("**/*", (route) => { const body = route.request().postData() || ""; if (/action=trp_get_translations/.test(body)) return route.continue(); /* read-only TranslatePress lookup for text inserted by scripts */ if (route.request().method() !== "GET" && route.request().method() !== "HEAD") { blocked += 1; blockedKinds.add(`${route.request().method()} ${new URL(route.request().url()).pathname} ${(route.request().postData() || '').slice(0, 40).replace(/[^\w=&.-]/g, '')}`); return route.abort(); } return route.continue(); });

    // Focused run (NL_PATHS=learn/topics/technology,...): only these routes, nothing else.
    if (process.env.NL_PATHS) {
      for (const path of process.env.NL_PATHS.split(",")) {
        const tag = `/nl/${path} @${width}`;
        const r = await open(page, path);
        check(`${tag}: answers 200`, r.status() === 200);
        await audit(page, tag);
        await links(page, tag);
        check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
      }
      check(`@${width}: no console errors`, errors.length === 0, errors.join(" | "));
      await context.close();
      continue;
    }
    // 1. Learn -> Topics -> articles
    for (const path of ["learn", "learn/topics", "learn/topics/the-big-picture"].concat(ARTICLES, TECH_WORLD)) {
      const tag = `/nl/${path} @${width}`;
      const r = await open(page, path);
      check(`${tag}: answers 200`, r.status() === 200);
      await audit(page, tag);
      await links(page, tag);
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }
    // Sentence openers: the article is part of the term, link or bold text and the whole phrase is one Dutch string.
    for (const [slug, opener] of ARTICLE_OPENERS) {
      const path = (/issuing/.test(slug) ? "learn/topics/for-businesses/" : "learn/topics/the-big-picture/") + slug;
      await open(page, path);
      const hit = await page.evaluate((o) => {
        for (const el of document.querySelectorAll("main p, main li")) {
          const t = el.textContent.replace(/\s+/g, " ").trim();
          if (t.startsWith(o)) return t.slice(0, 80);
        }
        return null;
      }, opener);
      check(`A/An/The opener "${opener}" on ${slug} @${width}`, !!hit, "not found");
      if (hit) console.log(`#   ${slug}: ${hit}`);
    }
    // Outside the route: the English-only test page keeps its lone English fragments (no global A/An/The translation).
    await page.goto(`${ORIGIN}/nl/fides-template-test-eudi-wallet/`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    const lone = await page.evaluate(() => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const found = []; let n;
      while ((n = w.nextNode())) { const t = n.nodeValue.trim(); if (/^(A|An|The|Een|De|Het)$/.test(t) && n.parentElement && !n.parentElement.closest("script,style")) found.push(t); }
      return found;
    });
    check(`outside the route: English test page keeps lone English fragments @${width}`, !lone.some((t) => /^(Een|De|Het)$/.test(t)), lone.join(","));
    console.log(`#   test page lone fragments: ${lone.join(", ") || "(none)"}`);
    // Back navigation: Learn -> Topics -> article -> back
    await open(page, "learn");
    await page.locator("main a[href$='/learn/topics/']:visible").first().click();
    await page.waitForLoadState("domcontentloaded");
    check(`learn -> topics @${width}: stays on /nl/`, /\/nl\/fides-design-pilot\/learn\/topics/.test(page.url()), page.url());
    await page.goBack();
    check(`topics -> back @${width}: returns to the Dutch Learn page`, /\/nl\/fides-design-pilot\/learn\/?$/.test(page.url()), page.url());
    await open(page, "learn/topics/the-big-picture/what-is-a-digital-wallet");
    const crumb = page.locator("nav[aria-label='Kruimelpad'] a[href]").first();
    check(`article @${width}: breadcrumb back link is Dutch and keeps /nl/`, (await crumb.count()) > 0 && /\/nl\//.test((await crumb.getAttribute("href")) || ""));

    // 2. Training & workshops -> offering -> request (form shown, not submitted)
    for (const path of ["learn/sessions", "learn/sessions/eudi-business-wallets-in-practice", "learn/sessions/wallet-introduction", "learn/sessions/wallet-readiness-workshop", "learn/sessions/training-partnerships", "services", "services/wallet-readiness-assessment", "services/enquiry"]) {
      const tag = `/nl/${path} @${width}`;
      const r = await open(page, path);
      check(`${tag}: answers 200`, r.status() === 200);
      await audit(page, tag);
      await links(page, tag);
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }
    await open(page, "learn/sessions");
    const offer = page.locator("a[href*='/learn/sessions/eudi-business-wallets-in-practice']").first();
    check(`sessions @${width}: offering card link present`, (await offer.count()) > 0);
    await offer.click();
    await page.waitForLoadState("domcontentloaded");
    check(`offering @${width}: stays on /nl/`, /\/nl\/fides-design-pilot\/learn\/sessions\/eudi/.test(page.url()), page.url());
    const request = page.locator("a[href*='/request']").filter({ hasText: /interesse|aanvra/i }).first();
    check(`offering @${width}: Dutch request link`, (await request.count()) > 0);
    await request.click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle").catch(() => {});
    const tagReq = `request form @${width}`;
    check(`${tagReq}: URL stays on /nl/`, /\/nl\/fides-design-pilot\/learn\/sessions\/request/.test(page.url()), page.url());
    const form = page.locator("form").filter({ has: page.locator("input[type=email], input[name*=mail]") }).first();
    await form.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    check(`${tagReq}: form is shown`, await form.isVisible().catch(() => false));
    // The WPForms honeypot label (aria-hidden, 1x1 px, random words taken from the other labels and different on every load) is not a user-facing label.
    const labels = (await form.locator("label:not([aria-hidden='true']), button, [type=submit]").allInnerTexts()).join(" | ");
    check(`${tagReq}: field labels and button are Dutch`, /naam|e-mail|organisatie|versturen|verstuur/i.test(labels) && !/\b(Send request|Name|Organisation|Email)\b/.test(labels.replace(/E-mail/gi, "")), labels);
    await audit(page, tagReq);
    check(`${tagReq}: no horizontal overflow`, (await overflow(page)) <= 0);
    await page.goBack();
    check(`offering @${width}: back navigation returns to the offering`, /\/learn\/sessions\/eudi/.test(page.url()), page.url());

    // 3. Start / receive route
    for (const path of ["start", "start/receive"]) {
      const tag = `/nl/${path} @${width}`;
      const r = await open(page, path);
      check(`${tag}: answers 200`, r.status() === 200);
      await audit(page, tag);
      await links(page, tag);
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }
    await open(page, "start");
    await page.locator("main a[href*='/start/receive']:visible").first().click();
    await page.waitForLoadState("domcontentloaded");
    check(`start -> receive @${width}: stays on /nl/`, /\/nl\/fides-design-pilot\/start\/receive/.test(page.url()), page.url());
    await page.goBack();
    check(`receive -> back @${width}: returns to the Dutch start page`, /\/nl\/fides-design-pilot\/start\/?$/.test(page.url()), page.url());

    // Background POSTs (consent, assistant, TranslatePress, analytics) are aborted too; a form submission would show up here as a request to the page itself or admin-ajax with a submit action.
    const submits = [...blockedKinds].filter((k) => /wpforms|fides_request|enquiry|submit|\/learn\/sessions\/request|\/services\/enquiry/i.test(k));
    console.log(`# aborted non-GET requests: ${blocked} (${[...blockedKinds].slice(0, 6).join("; ")})`);
    check(`@${width}: no form was submitted (no aborted request looks like a submission)`, submits.length === 0, submits.join("; "));
    check(`@${width}: no console errors`, errors.length === 0, errors.join(" | "));
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
