/**
 * Targeted Dutch terminology checks (TranslatePress /nl/) on the local pilot, see learn/nl-terminology.md.
 * Per page: the route answers 200, "relying party" is "vertrouwende partij" (never "ontvangende partij"), the sentences that
 * carry the agreed terms are printed with their rendered Dutch text, no horizontal overflow, no console errors.
 * Also: role diagram, role overview sentences, and Training & workshops -> offering -> request form (shown, never submitted:
 * every non-GET request is aborted and counted).
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/nl-terminology-checks.cjs   (WIDTHS=1440,390 by default)
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
// path below the pilot root, and phrases (regex) that must occur in a paragraph, list item or heading of that page
const PAGES = [
  ["learn/topics/the-big-picture/how-credentials-connect", [/^Houder \+ wallet/, /^Vertrouwende partij/, /^De uitgever \(issuer\)/]],
  ["learn/topics/the-big-picture/european-digital-identity-wallet", [/^De vertrouwende partij/, /^De houder/, /^De walletaanbieder/]],
  ["learn/topics/the-big-picture/formats-and-protocols", [/vertrouwende partij/]],
  ["learn/topics/the-big-picture/trust-and-interoperability", []],
  ["learn/topics/the-big-picture/what-is-a-credential", [/vertrouwende partij/]],
  ["learn/topics/the-big-picture/what-is-a-digital-wallet", []],
  ["learn/sessions/wallet-introduction", [/^In de workshop werkt uw team/, /Wallet Readiness Workshop/]],
  ["learn/topics/for-businesses/issuing-credentials-for-wallets", [/vertrouwende partij/, /^Wat moeten ontvangers en vertrouwende partijen weten\?$/, /^De wallethouder moet begrijpen wat hij ontvangt/]],
  ["learn/topics/for-businesses/accepting-information-from-a-wallet", [/\(relying party\) genoemd/, /Wat doet een vertrouwende partij\?/, /registratie als vertrouwende partij/]],
  ["learn/topics/for-businesses/business-wallets-where-to-start", [/vertrouwende partij|vertegenwoordiger/]],
  ["learn/sessions/wallet-readiness-workshop", [/Mogelijke rollen voor uw organisatie: uitgever \(issuer\), vertrouwende partij/]],
  ["learn/topics", [/vertrouwende partijen/, /Organisatiegegevens, mandaten, business wallets en gegevensuitwisseling\./]],
  ["learn/topics/for-businesses", []],
  ["learn/sessions/eudi-business-wallets-in-practice", [/vertrouwende partijen/]],
  ["start/receive", [/vertrouwende partij \(relying party\)/]],
];
// Pages where the first prose mention of the issuer must read "uitgever (issuer)" (second round of terminology rules)
const FIRST_ISSUER = new Set(["how-credentials-connect", "what-is-a-credential", "what-is-a-digital-wallet", "formats-and-protocols", "trust-and-interoperability", "accepting-information-from-a-wallet", "business-wallets-where-to-start", "issuing-credentials-for-wallets", "wallet-readiness-workshop", "eudi-business-wallets-in-practice", "receive"]);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function open(page, path) {
  const r = await page.goto(`${NL}/${path}`.replace(/\/+$/, "/"), { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1200 }).then(() => true, () => false)) await deny.click();
  await page.waitForLoadState("networkidle").catch(() => {});
  return r;
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    let blocked = 0;
    const kinds = new Set();
    const seen = {};
    page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource|Content Security Policy|the server responded/.test(m.text()) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.route("**/*", (route) => {
      const req = route.request();
      if (req.method() === "GET" || req.method() === "HEAD" || /action=trp_get_translations/.test(req.postData() || "")) return route.continue();
      blocked += 1; kinds.add(`${req.method()} ${req.url().replace(ORIGIN, "").slice(0, 60)}`);
      return route.abort();
    });
    for (const [path, phrases] of PAGES) {
      const tag = `/nl/${path} @${width}`;
      const r = await open(page, path);
      check(`${tag}: answers 200`, r.status() === 200);
      const data = await page.evaluate(() => {
        const skip = "#cmplz-cookiebanner-container, .cmplz-cookiebanner, .fides-assistant, [data-fides-ssr], script, style";
        const blocks = [...document.querySelectorAll("main p, main li, main h1, main h2, main h3, main a, main button")].filter((e) => !e.closest(skip)).map((e) => e.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
        const proseBlocks = [...document.querySelectorAll("main p, main li")].filter((e) => !e.closest(skip)).map((e) => e.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
        return { blocks, proseBlocks, text: document.querySelector("main") ? document.querySelector("main").innerText : "" };
      });
      check(`${tag}: no "ontvangende partij" (relying party is "vertrouwende partij")`, !/ontvangende partij/i.test(data.text), (data.text.match(/.{40}ontvangende partij.{20}/i) || [""])[0]);
      for (const p of phrases) {
        const hit = data.blocks.find((b) => p.test(b));
        check(`${tag}: ${p}`, !!hit, "not found");
        if (hit) console.log(`#   ${path.split("/").pop()}: ${hit.slice(0, 110)}`);
      }
      // issuer rules: first prose mention "uitgever (issuer)", no "De issuer"/"Een issuer"/"issuers"/"issuer-rol" in running Dutch
      const key = path.split("/").pop();
      // prose = paragraphs and list items longer than 45 characters (skips table-of-contents entries and labels); the "(definitie)" popup label and the title of the linked article do not count as a mention
      const prose = data.proseBlocks.map((b) => b.replace(/ ?\(definitie\)/g, "").replace(/Hoe credentials uitgevers, wallets en diensten verbinden/g, "")).filter((b) => b.length > 45);
      const firstIssuer = prose.find((b) => /\buitgevers?\b/i.test(b));
      if (FIRST_ISSUER.has(key)) {
        check(`${tag}: first prose mention reads "uitgever(s) (issuer(s))"`, !!firstIssuer && /uitgevers? \(issuers?\)/i.test(firstIssuer), firstIssuer || "no mention");
        if (firstIssuer) console.log(`#   first issuer mention on ${key}: ${firstIssuer.slice(0, 120)}`);
      }
      const later = prose.slice(prose.indexOf(firstIssuer) + 1).filter((b) => /\(issuers?\)/i.test(b));
      if (later.length) console.log(`#   note: "(issuer)" repeated after the first mention on ${key}: ${later.length}x, e.g. ${later[0].slice(0, 90)}`);
      const stripped = data.text.replace(/\(issuers?\)/gi, "").replace(/Issuer Catalog|Credential Issuer/g, "");
      check(`${tag}: no "De issuer"/"Een issuer"/"issuers"/"issuer-rol" in running text`, !/\b(?:[Dd]e|[Ee]en) issuer\b|\bissuers\b|issuer-rol/.test(stripped), (stripped.match(/.{30}(?:\b(?:[Dd]e|[Ee]en) issuer\b|\bissuers\b|issuer-rol).{20}/) || [""])[0]);
      check(`${tag}: no "De walletgebruiker moet begrijpen"`, !/De walletgebruiker moet begrijpen/.test(data.text));
      for (const b of data.blocks) { if (/^Mandate( \(definitie\))?$/.test(b)) seen.mandateChip = true; if (/^Mandaat( \(definitie\))?$/.test(b)) seen.mandaatChip = true; if (/Organisatiegegevens, mandaten,/.test(b)) seen.cardMandaten = true; }
      const org = data.blocks.filter((b) => /ontvangende organisatie|ontvangende dienst/i.test(b));
      if (org.length) console.log(`#   ontvangende organisatie/dienst (general sense) on ${path.split("/").pop()}: ${org.length}x, e.g. ${org[0].slice(0, 90)}`);
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }
    check(`@${width}: "Mandate" chip stays English (never "Mandaat")`, !seen.mandaatChip, "chip translated");
    console.log(`#   Mandate chip seen: ${!!seen.mandateChip}; card "Organisatiegegevens, mandaten, ..." seen: ${!!seen.cardMandaten}`);
    check(`@${width}: "Mandate" chip seen in English`, !!seen.mandateChip, "chip not found");
    check(`@${width}: card text uses "mandaten"`, !!seen.cardMandaten, "card not found");
    // Training & workshops -> offering -> request (form shown, not submitted)
    await open(page, "learn/sessions");
    const offer = page.locator("a[href*='/learn/sessions/eudi-business-wallets-in-practice']").first();
    check(`sessions @${width}: offering card present (name stays English)`, (await offer.count()) > 0);
    await offer.click();
    await page.waitForLoadState("domcontentloaded");
    check(`offering @${width}: stays on /nl/`, /\/nl\/fides-design-pilot\/learn\/sessions\/eudi/.test(page.url()), page.url());
    const title = (await page.locator("main h1").first().innerText().catch(() => "")).trim();
    check(`offering @${width}: name stays "EUDI & Business Wallets in Practice"`, /EUDI & Business Wallets in Practice/.test(title), title);
    const request = page.locator("a[href*='/request']").filter({ hasText: /interesse|aanvra/i }).first();
    check(`offering @${width}: Dutch request link`, (await request.count()) > 0);
    await request.click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle").catch(() => {});
    const form = page.locator("form").filter({ has: page.locator("input[type=email], input[name*=mail]") }).first();
    await form.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    check(`request @${width}: form is shown on /nl/`, /\/nl\//.test(page.url()) && (await form.isVisible().catch(() => false)), page.url());
    console.log(`#   request form labels: ${(await form.locator("label").allInnerTexts()).map((s) => s.trim()).filter(Boolean).slice(0, 5).join(" | ")}`);
    check(`request @${width}: no horizontal overflow`, (await overflow(page)) <= 0);
    const submits = [...kinds].filter((k) => /wpforms|fides_request|enquiry|submit|request/i.test(k));
    console.log(`# aborted non-GET requests: ${blocked}`);
    check(`@${width}: nothing was submitted`, submits.length === 0, submits.join("; "));
    check(`@${width}: no console errors`, errors.length === 0, errors.join(" | "));
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
