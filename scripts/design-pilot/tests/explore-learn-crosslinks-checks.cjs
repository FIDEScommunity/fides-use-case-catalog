/**
 * Targeted browser checks for the Explore <-> Learn cross links, English and Dutch (/nl/), at 1440 and 390 px.
 *  - Personal wallets: the Learn strip (same component as Business wallets), one link, no duplicate target, search and the
 *    first result stay above the fold, keyboard focus ring.
 *  - Credential types and detail: the Credentials & attestations dialog opens, closes with Escape, gives focus back, and
 *    contains the Learn link; the detail has the formats pointer inside Formats & identifiers, not above the record.
 *  - Use cases overview: the two intro words link to Learn articles (not fides.community) and keep the language route.
 *  - Organizations: the roles line, and the QTSP line only while a QTSP certification filter is active.
 *  - Learn: issuer, relying party and UNTP use case cards; filter links show their chip and more than 0 results.
 *  - No horizontal overflow anywhere.
 * Nothing is submitted. Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/explore-learn-crosslinks-checks.cjs
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const HEIGHT = { 1440: 900, 390: 844 };
const P = "/fides-design-pilot";
const LEARN = `${P}/learn/topics`;
let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${String(detail).slice(0, 240)})` : ""}`);
};
const path = (href) => { try { const u = new URL(href, BASE); return u.pathname + u.search; } catch (e) { return String(href); } };

async function open(page, url, ready = "[data-pilot-count]") {
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1200 }).then(() => true, () => false)) await deny.click();
  if (ready) await page.waitForSelector(ready, { timeout: 45000 });
  await page.waitForFunction(() => !document.querySelector("[data-pilot-ssr]"), null, { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(300);
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Tab until the element matching the selector has focus; returns the computed focus ring. */
async function tabTo(page, selector, max = 60) {
  await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); });
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press("Tab");
    const hit = await page.evaluate((sel) => {
      const el = document.activeElement;
      if (!el || !el.matches(sel)) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { outlineStyle: cs.outlineStyle, outlineWidth: parseFloat(cs.outlineWidth), visible: r.width > 0 && r.height > 0 };
    }, selector);
    if (hit) return { found: true, tabs: i + 1, ...hit };
  }
  return { found: false };
}
const ringVisible = (r) => r.found && r.visible && r.outlineStyle !== "none" && r.outlineWidth >= 2;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: HEIGHT[width] || 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const vh = HEIGHT[width] || 900;

    for (const lang of ["en", "nl"]) {
      const pre = lang === "nl" ? "/nl" : "";
      const tag = `${lang} @${width}`;

      // 1. Personal wallets: strip, no duplicate target, above the fold, focus ring.
      await open(page, `${pre}${P}/personal-wallets/`);
      const strip = page.locator('[data-fides-editorial-link="wallet-overview"]');
      check(`personal wallets ${tag}: Learn strip present`, (await strip.count()) === 1);
      const stripHref = await strip.locator("a").first().getAttribute("href").catch(() => "");
      check(`personal wallets ${tag}: strip links to Choosing and managing a wallet on the ${lang} route`, path(stripHref).startsWith(`${pre}${LEARN}/for-you/choosing-and-managing-a-wallet/`), stripHref);
      const same = await page.locator(`a[href*="choosing-and-managing-a-wallet"]`).count();
      check(`personal wallets ${tag}: the target is linked once`, same === 1, same);
      const geo = await page.evaluate(() => {
        const s = document.querySelector(".fides-uc-pilot__search-input");
        const first = document.querySelector(".fides-uc-pilot__list .fides-ds-card--row a, .fides-uc-pilot__list a");
        const r = s && s.getBoundingClientRect();
        const f = first && first.getBoundingClientRect();
        return { searchBottom: r ? Math.round(r.bottom) : -1, firstTop: f ? Math.round(f.top) : -1, firstBottom: f ? Math.round(f.bottom) : -1 };
      });
      console.log(`# personal wallets ${tag}: search bottom ${geo.searchBottom}px, first result top ${geo.firstTop}px (viewport ${vh}px)`);
      check(`personal wallets ${tag}: search visible above the fold`, geo.searchBottom > 0 && geo.searchBottom < vh, JSON.stringify(geo));
      check(`personal wallets ${tag}: first result starts above the fold`, geo.firstTop > 0 && geo.firstTop < vh - 60, JSON.stringify(geo));
      check(`personal wallets ${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
      const ring = await tabTo(page, '[data-fides-editorial-link="wallet-overview"] a');
      check(`personal wallets ${tag}: Tab reaches the strip link with a visible focus ring`, ringVisible(ring), JSON.stringify(ring));
      const order = await page.evaluate(() => {
        const a = document.querySelector('[data-fides-editorial-link="wallet-overview"] a');
        const search = document.querySelector(".fides-uc-pilot__search-input");
        return a && search ? !!(a.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
      });
      check(`personal wallets ${tag}: the strip comes before the search in Tab order`, order);
      // Business wallets keep their own strip.
      await open(page, `${pre}${P}/business-wallets/`);
      check(`business wallets ${tag}: existing strip still points to Business wallets: where to start`, (await page.locator('a[href*="business-wallets-where-to-start"]').count()) === 1);
      check(`business wallets ${tag}: no horizontal overflow`, (await overflow(page)) <= 0);

      // 2. Credential types overview and detail.
      await open(page, `${pre}${P}/credentials/`);
      const explain = page.locator("button[data-fides-ds-term]").first();
      check(`credentials ${tag}: explanation button present`, (await explain.count()) === 1);
      const t0 = Date.now();
      await explain.click();
      const dialog = page.locator("dialog[open]").first();
      check(`credentials ${tag}: dialog opens`, await dialog.waitFor({ timeout: 8000 }).then(() => true, () => false));
      check(`credentials ${tag}: dialog opens within 1 s`, Date.now() - t0 < 1000, Date.now() - t0);
      const dHref = await dialog.locator('a[data-fides-learn-link="credential-explain"]').first().getAttribute("href").catch(() => "");
      check(`credentials ${tag}: dialog links to What is a credential? on the ${lang} route`, path(dHref).startsWith(`${pre}${LEARN}/the-big-picture/what-is-a-credential/`), dHref);
      check(`credentials ${tag}: no second explanation above the list (one button)`, (await page.locator("button[data-fides-ds-term]").count()) <= 2);
      await page.waitForTimeout(400);
      const dRing = await tabTo(page, 'dialog[open] a[data-fides-learn-link="credential-explain"]', 12);
      check(`credentials ${tag}: dialog link reachable by Tab with a focus ring`, ringVisible(dRing), JSON.stringify(dRing));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
      check(`credentials ${tag}: Escape closes the dialog`, (await page.locator("dialog[open]").count()) === 0);
      check(`credentials ${tag}: focus returns to the button`, await page.evaluate(() => /Credentials & attestations/.test((document.activeElement || {}).textContent || "")));
      check(`credentials ${tag}: no horizontal overflow`, (await overflow(page)) <= 0);

      await open(page, `${pre}${P}/credential/?credential=cred:eduwallet:open-badge`, "#formats");
      const detailBtn = page.locator(".fides-credential-details__terms button[data-fides-ds-term]");
      check(`credential detail ${tag}: Explain button present`, (await detailBtn.count()) === 1);
      await detailBtn.click();
      check(`credential detail ${tag}: dialog opens`, await page.locator("dialog[open]").first().waitFor({ timeout: 8000 }).then(() => true, () => false));
      check(`credential detail ${tag}: dialog has the Learn link`, (await page.locator('dialog[open] a[data-fides-learn-link="credential-explain"]').count()) === 1);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
      const formats = page.locator('#formats [data-fides-editorial-link="credential-formats"] a');
      check(`credential detail ${tag}: formats pointer inside Formats & identifiers`, (await formats.count()) === 1);
      const fHref = await formats.first().getAttribute("href").catch(() => "");
      check(`credential detail ${tag}: formats pointer targets Credential formats and interoperability (${lang} route)`, path(fHref).startsWith(`${pre}${LEARN}/technology/credential-formats-and-interoperability/`), fHref);
      const fPos = await page.evaluate(() => {
        const line = document.querySelector('#formats [data-fides-editorial-link="credential-formats"]');
        const rows = document.querySelector("#formats .fides-credential-ids");
        return line && rows ? !!(rows.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
      });
      check(`credential detail ${tag}: the pointer sits after the record rows`, fPos);
      check(`credential detail ${tag}: no horizontal overflow`, (await overflow(page)) <= 0);

      // 3. Use case overview intro.
      await open(page, `${pre}${P}/overview/`);
      const intro = await page.evaluate(() => [...document.querySelectorAll(".fides-uc-pilot__lead a")].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href") })));
      const dw = intro.find((a) => /^digital wallets$|^digitale wallets$/i.test(a.text)) || intro[0];
      const vc = intro.find((a) => /verifiable credentials|verifieerbare/i.test(a.text)) || intro[1];
      check(`use cases ${tag}: two intro links`, intro.length === 2, JSON.stringify(intro));
      check(`use cases ${tag}: first link goes to What is a digital wallet? (${lang} route)`, !!dw && path(dw.href).startsWith(`${pre}${LEARN}/the-big-picture/what-is-a-digital-wallet/`), JSON.stringify(dw));
      check(`use cases ${tag}: second link goes to What is a credential? (${lang} route)`, !!vc && path(vc.href).startsWith(`${pre}${LEARN}/the-big-picture/what-is-a-credential/`), JSON.stringify(vc));
      check(`use cases ${tag}: no intro link goes to fides.community`, intro.every((a) => !/fides\.community/.test(a.href || "")));
      check(`use cases ${tag}: no horizontal overflow`, (await overflow(page)) <= 0);

      // 4. Organizations.
      await open(page, `${pre}${P}/organizations/`);
      const roles = page.locator('[data-fides-editorial-link="organization-overview:roles"]');
      check(`organizations ${tag}: roles line present once`, (await roles.count()) === 1);
      const rHref = await roles.locator("a").first().getAttribute("href").catch(() => "");
      check(`organizations ${tag}: roles line links to Ecosystem roles (${lang} route)`, path(rHref).startsWith(`${pre}${LEARN}/ecosystem-roles/`) && !/trust-service/.test(rHref), rHref);
      check(`organizations ${tag}: no QTSP line without a QTSP filter`, (await page.locator('[data-fides-editorial-link="organization-overview:qtsp"]').count()) === 0);
      const rRing = await tabTo(page, '[data-fides-editorial-link="organization-overview:roles"] a');
      check(`organizations ${tag}: roles link has a visible focus ring`, ringVisible(rRing), JSON.stringify(rRing));
      check(`organizations ${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
      await open(page, `${pre}${P}/organizations/?cert=qtsp`);
      const q = page.locator('[data-fides-editorial-link="organization-overview:qtsp"]');
      check(`organizations ?cert=qtsp ${tag}: QTSP line present`, (await q.count()) === 1);
      const qText = await q.innerText().catch(() => "");
      if (lang === "en") check(`organizations ?cert=qtsp ${tag}: wording separates imported certification from self-described roles`, /imported/i.test(qText) && /describe for themselves/i.test(qText), qText);
      const qHref = await q.locator("a").first().getAttribute("href").catch(() => "");
      check(`organizations ?cert=qtsp ${tag}: QTSP line links to Trust service providers and trust frameworks (${lang} route)`, path(qHref).startsWith(`${pre}${LEARN}/ecosystem-roles/trust-service-providers-and-trust-frameworks/`), qHref);
      check(`organizations ?cert=qtsp ${tag}: the QTSP chip is shown`, /QTSP/i.test(await page.locator(".fides-uc-pilot__pills").first().innerText().catch(() => "")));
      check(`organizations ?cert=qtsp ${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
      // Removing the filter removes the line again.
      await page.locator("[data-pilot-clear-filters]").first().click().catch(() => {});
      await page.waitForTimeout(400);
      check(`organizations ${tag}: the QTSP line disappears when the filter is cleared`, (await page.locator('[data-fides-editorial-link="organization-overview:qtsp"]').count()) === 0);
    }

    // 5. Learn: cards and filter links (English and Dutch route).
    const cards = [
      { page: "ecosystem-roles/the-issuer", match: /Interac/, label: "issuer" },
      { page: "ecosystem-roles/the-relying-party", match: /Nijmegen/, label: "relying party" },
      { page: "around-the-world/un-transparency-protocol", match: /Reeco/, label: "UNTP" },
    ];
    for (const lang of ["en", "nl"]) {
      const pre = lang === "nl" ? "/nl" : "";
      for (const c of cards) {
        const tag = `${c.label} ${lang} @${width}`;
        await open(page, `${pre}${LEARN}/${c.page}/`, "h1");
        const card = page.locator("[data-fides-learn-record]");
        check(`learn ${tag}: one practice card`, (await card.count()) === 1);
        const text = await card.innerText().catch(() => "");
        check(`learn ${tag}: card names the organisation from the record`, c.match.test(text), text.slice(0, 120));
        const href = await card.locator("a").first().getAttribute("href").catch(() => "");
        check(`learn ${tag}: card link opens the use case detail (${lang} route)`, path(href).startsWith(`${pre}${P}/use-case/?usecase=`), href);
        const r = await page.request.get(new URL(href, BASE).href);
        check(`learn ${tag}: the use case page answers 200`, r.status() === 200, r.status());
        const cRing = await tabTo(page, "[data-fides-learn-record] a", 80);
        check(`learn ${tag}: card link has a visible focus ring`, ringVisible(cRing), JSON.stringify(cRing));
        check(`learn ${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
      }
    }

    // 6. Filter links used by Technology and Around the world: chip and count > 0 on the catalog.
    // `unlinked`: Continue learning is limited to two catalog links, so the page keeps the SD-JWT VC credential filter only
    // (editorial decision pending, learn/continue-learning-selection.md). The filter itself is still checked on the catalog.
    const filters = [
      { from: "technology/credential-formats-and-interoperability", href: "/credentials/?format=sd_jwt_vc", chip: /Format: SD-JWT VC/i },
      { from: "technology/credential-formats-and-interoperability", href: "/credentials/?format=mdoc", chip: /Format: ISO mDoc/i, unlinked: true },
      { from: "technology/credential-formats-and-interoperability", href: "/personal-wallets/?format=sd_jwt_vc", chip: /VC format: SD-JWT VC/i, unlinked: true },
      { from: "technology/how-do-wallets-and-services-exchange-information", href: "/personal-wallets/?issuance=OpenID4VCI", chip: /Issuance protocol: OpenID4VCI/i },
      { from: "technology/how-do-wallets-and-services-exchange-information", href: "/personal-wallets/?presentation=OpenID4VP", chip: /Presentation protocol: OpenID4VP/i, unlinked: true },
      { from: "around-the-world/the-netherlands", href: "/overview/?country=NL", chip: /Country: Netherlands/i },
      { from: "around-the-world/the-netherlands", href: "/organizations/?country=NL", chip: /Country: Netherlands/i },
      { from: "around-the-world/the-netherlands", href: "/personal-wallets/?country=NL", chip: /Country: Netherlands/i },
      { from: "around-the-world/germany", href: "/overview/?country=DE", chip: /Country: Germany/i },
      { from: "around-the-world/germany", href: "/organizations/?country=DE", chip: /Country: Germany/i },
      { from: "around-the-world/germany", href: "/personal-wallets/?country=DE", chip: /Country: Germany/i },
    ];
    for (const f of filters) {
      const tag = `${f.href} @${width}`;
      // The link exists on the Learn page (English and Dutch route), and the catalog shows chip and results.
      for (const lang of f.unlinked ? [] : ["en", "nl"]) {
        const pre = lang === "nl" ? "/nl" : "";
        await open(page, `${pre}${LEARN}/${f.from}/`, "h1");
        const hrefs = await page.locator(":is(.fides-learn-article__body, .fides-learn-continue) a[href], main a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
        check(`filter link ${tag}: present on the ${lang} Learn page ${f.from}`, hrefs.some((h) => path(h) === `${pre}${P}${f.href}`), hrefs.filter((h) => /\?(format|issuance|presentation|country)=/.test(h)).join(" "));
      }
      await open(page, `${P}${f.href}`);
      const count = (await page.locator("[data-pilot-count]").first().innerText()).trim();
      const n = parseInt(count, 10);
      const pills = await page.locator(".fides-uc-pilot__pills").first().innerText().catch(() => "");
      console.log(`# ${tag}: "${count}", chip "${pills.replace(/\s+/g, " ").trim().slice(0, 70)}"`);
      check(`filter link ${tag}: shows its chip`, f.chip.test(pills), pills);
      check(`filter link ${tag}: more than 0 results`, n > 0, count);
      check(`filter link ${tag}: no horizontal overflow`, (await overflow(page)) <= 0);
    }

    check(`page errors @${width}`, errors.length === 0, errors.join(" | "));
    await context.close();
  }
  await browser.close();
  console.log(failures ? `${failures} failure(s)` : "all checks passed");
  process.exit(failures ? 1 : 0);
})();
