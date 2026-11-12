/**
 * Targeted checks for the Learn overview "Ecosystem roles" (topics/ecosystem-roles/).
 * Page: 200, English, one H1, breadcrumb Learn / Topics / Ecosystem roles, Topics current in the Learn bar, the six
 * role rows (all six are links to existing pages, no "Design preview"/"In preparation" label, no "for now" paragraph), glossary
 * terms open by keyboard, every internal link answers 200, no unavailable destinations, no local host in the content,
 * no horizontal overflow, visible focus, no console errors.
 * Links: the Topics row links to the overview; the five existing articles link back to it.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/ecosystem-roles-checks.cjs   (WIDTHS=1440,390 by default)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const L = "/fides-design-pilot/learn";
const PAGE = `${L}/topics/ecosystem-roles/`;
const BACKLINKS = [
  "topics/the-big-picture/how-credentials-connect",
  "topics/the-big-picture/trust-and-interoperability",
  "topics/the-big-picture/what-is-a-digital-wallet",
  "topics/for-businesses/issuing-credentials-for-wallets",
  "topics/for-businesses/accepting-information-from-a-wallet",
];
const ROLES = ["How credentials connect issuers, wallets and services", "The holder", "The issuer", "The relying party", "Wallet providers and other service providers", "Trust service providers and trust frameworks"];
const ROLE_SLUGS = ["the-holder", "the-issuer", "the-relying-party", "wallet-providers-and-other-service-providers", "trust-service-providers-and-trust-frameworks"];
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${String(detail).slice(0, 220)})` : ""}`);
}
const squash = (s) => String(s).replace(/\s+/g, " ").trim();
async function open(page, url) {
  const response = await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
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
    let tag = `overview @${width}`;
    const r = await open(page, PAGE);
    check(`${tag}: answers 200`, r && r.status() === 200);
    check(`${tag}: English page`, /^en/i.test(await page.evaluate(() => document.documentElement.lang)));
    const h1s = await page.locator("h1").allInnerTexts();
    check(`${tag}: one H1 "Ecosystem roles"`, h1s.length === 1 && h1s[0].trim() === "Ecosystem roles", h1s.join("|"));
    const crumbs = squash(await page.locator("nav[aria-label=Breadcrumb]").first().textContent().catch(() => ""));
    check(`${tag}: breadcrumb Learn / Topics / Ecosystem roles`, /^Learn\s*Topics\s*Ecosystem roles$/.test(crumbs), crumbs);
    const crumbLinks = await page.locator("nav[aria-label=Breadcrumb] a").evaluateAll((as) => as.map((a) => new URL(a.href).pathname));
    check(`${tag}: breadcrumb links go to Learn and Topics`, crumbLinks.length === 2 && crumbLinks[0].replace(/\/$/, "") === L && crumbLinks[1].replace(/\/$/, "") === `${L}/topics`, crumbLinks.join(","));
    const intro = squash(await page.locator(".fides-ph__intro, .fides-ph__lead, .fides-ph p").first().innerText().catch(() => ""));
    check(`${tag}: intro from the editorial outline`, /^A wallet interaction involves several parties\. One provides information, another holds it, and a service requests and checks it\./.test(intro), intro);
    const current = await page.locator(".fides-learn-bar__nav [aria-current]").allInnerTexts();
    check(`${tag}: Topics is current in the Learn bar`, current.some((t) => /Topics/.test(t)), current.join("|"));

    const content = page.locator(".fides-learn__content");
    const headings = (await content.locator("h2").allInnerTexts()).map(squash);
    for (const h of ["One example", "The roles at a glance", "Roles can overlap", "Explore in the catalogs"]) check(`${tag}: section "${h}"`, headings.includes(h), headings.join("|"));
    check(`${tag}: example flow lists issuer, holder + wallet, relying party`, /Issuer.*Training provider.*Holder \+ wallet.*Recipient.*Relying party.*Employer/.test(squash(await content.locator("ol.fides-learn-flow").innerText())));
    const rows = await content.locator("ul.fides-learn-rows > li").evaluateAll((lis) => lis.map((li) => ({ text: li.innerText.replace(/\s+/g, " ").trim(), titleIsLink: !!li.querySelector(":scope > a") })));
    check(`${tag}: six role rows in order`, rows.length === 6 && ROLES.every((n, i) => rows[i].text.startsWith(n)), rows.map((x) => x.text.slice(0, 30)).join("|"));
    check(`${tag}: every row title is a link`, rows.length === 6 && rows.every((x) => x.titleIsLink));
    const rowHrefs = await content.locator("ul.fides-learn-rows > li > a").evaluateAll((as) => as.map((a) => new URL(a.href).pathname));
    check(`${tag}: the five role rows link to the role articles in order`, ROLE_SLUGS.every((slug, i) => rowHrefs[i + 1] === `${PAGE}${slug}/`), rowHrefs.join(","));
    const bodyText = await content.innerText();
    check(`${tag}: no "Design preview" or "In preparation" label and no "not available yet" paragraph`, !/Design preview|In preparation|not available yet|for now\./i.test(bodyText) && (await content.locator(".fides-learn-rows li").evaluateAll((lis) => lis.every((li) => getComputedStyle(li, "::after").content === "none" || !/Design preview|In preparation/.test(getComputedStyle(li, "::after").content)))));
    const rowHeights = await content.locator("ul.fides-learn-rows > li").evaluateAll((lis) => lis.map((li) => li.getBoundingClientRect().height));
    check(`${tag}: rows are at least 44px high`, rowHeights.every((h) => h >= 44), rowHeights.join(","));
    const aside = squash(await content.locator(".fides-learn-panel__aside").innerText());
    check(`${tag}: terms box shows the four terms`, ["Holder", "Issuer", "Relying Party", "Wallet Provider"].every((t) => aside.includes(t)), aside);

    // Glossary term opens with the keyboard and closes with Escape; focus returns.
    const term = content.locator(".fides-ds-term").first();
    if (await term.count()) {
      await term.focus();
      await page.keyboard.press("Enter");
      const dialog = page.locator("dialog[open], [role=dialog]:visible").first();
      const shown = await dialog.waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false);
      check(`${tag}: a glossary term opens by keyboard`, shown);
      if (shown) {
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
        check(`${tag}: Escape closes it and returns focus to the term`, await term.evaluate((el) => el === document.activeElement || el.contains(document.activeElement)));
      }
    } else check(`${tag}: glossary terms are rendered`, false);

    // Links: all internal answer 200, nothing local typed in, no destination that only exists on the full site.
    const hrefs = await page.locator(".fides-learn__content a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    check(`${tag}: no local host in the content links`, hrefs.every((h) => !/localhost|127\.0\.0\.1/.test(h)));
    check(`${tag}: no link to issuer-catalog or relying-party-websites`, hrefs.every((h) => !/issuer-catalog|relying-party-websites/.test(h)));
    const internal = [...new Set(hrefs.filter((h) => h.startsWith("/")))];
    const bad = [];
    for (const h of internal) { const x = await page.request.get(`${BASE}${h}`); if (x.status() !== 200) bad.push(`${h} ${x.status()}`); }
    check(`${tag}: ${internal.length} internal links answer 200`, internal.length >= 10 && bad.length === 0, bad.join(", "));
    for (const dest of ["how-credentials-connect", ...ROLE_SLUGS, "eudi-wallet-and-european-business-wallet", "credentials", "personal-wallets", "business-wallets", "organizations", "overview"]) {
      check(`${tag}: links to ${dest}`, internal.some((h) => h.includes(`/${dest}/`)));
    }

    // Focus and overflow.
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    const first = content.locator("ul.fides-learn-rows > li > a").first();
    await first.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const focus = await first.evaluate((el) => { const s = getComputedStyle(el); const li = getComputedStyle(el.parentElement); return { active: document.activeElement === el, outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0, row: li.boxShadow !== "none" || li.outlineStyle !== "none" }; });
    check(`${tag}: keyboard focus on the first row is visible`, focus.active && (focus.outline || focus.row), JSON.stringify(focus));
    check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));

    // Topics page: the Ecosystem roles row is a link to the overview; unwritten topics stay unlinked.
    tag = `topics @${width}`;
    const rt = await open(page, `${L}/topics/`);
    check(`${tag}: answers 200`, rt && rt.status() === 200);
    const link = page.locator(`.fides-learn__content a[href$="/topics/ecosystem-roles/"]`);
    check(`${tag}: Ecosystem roles links to the overview`, (await link.count()) === 1 && squash(await link.first().innerText()) === "Ecosystem roles");
    await link.first().click();
    await page.waitForURL(`**${PAGE}`, { timeout: 8000 }).catch(() => {});
    check(`${tag}: the link opens the overview`, page.url().endsWith(PAGE));
    await open(page, `${L}/topics/`);
    for (const t of ["For you", "Around the world"]) check(`${tag}: "${t}" stays unlinked`, (await page.locator(`.fides-learn__content li > a`).filter({ hasText: new RegExp(`^${t}$`) }).count()) === 0);
    // "For governments" has its own overview now (checked in tests/for-governments-checks.cjs).
    check(`${tag}: "For governments" links to its overview`, (await page.locator(`.fides-learn__content li > a[href$="/topics/for-governments/"]`).count()) === 1);
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);

    // Existing articles link back.
    for (const p of BACKLINKS) {
      const rr = await open(page, `${L}/${p}/`);
      tag = `${p.split("/").pop()} @${width}`;
      check(`${tag}: answers 200`, rr && rr.status() === 200);
      check(`${tag}: links back to Ecosystem roles`, (await page.locator(`.fides-learn__content a[href$="/topics/ecosystem-roles/"]`).count()) === 1);
      check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
