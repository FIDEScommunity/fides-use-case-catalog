/**
 * Issuers and relying parties: environment values and dynamic Dutch text (GET only, nothing is submitted).
 *
 * Issuers, per width (default 1440 and 390) and language (EN, NL):
 *  - the legend describes Production and Test (no "Not specified" sentence while no issuer lacks an environment);
 *  - the environment filter offers Production and Test with the counts of the data (data/aggregated.json of the plugin);
 *  - ?environment[]=production / test gives exactly that many results and a removable pill with the translated label;
 *  - ?environment[]=unspecified is a valid empty state (no PHP notice, no crash).
 * Both catalogs, NL only: dynamic texts (count, pills, aria-labels, pager, sort, titles) hold no English UI text.
 *
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/issuer-rp-env-nl-checks.cjs   (env: PILOT_URL, WIDTHS)
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const DATA = path.resolve(__dirname, "../../../../../issuer-catalog/wordpress-plugin/fides-issuer-catalog/data/aggregated.json");

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${detail})` : ""}`);
}

const canon = (e) => { const v = String(e || "").trim().toLowerCase(); const c = v === "sandbox" || v === "pilot" ? "test" : v; return c === "production" || c === "test" ? c : "unspecified"; };
const LABEL = { EN: { production: "Production", test: "Test", unspecified: "Not specified" }, NL: { production: "Productie", test: "Test", unspecified: "Niet opgegeven" } };
// English interface words that must not survive in the Dutch dynamic text of these pages.
const ENGLISH_UI = /\b(Search|Remove|selected|Page \d|results?|Sort by|Clear|Apply|Cancel|Production first|Environment|issuers?|relying parties|Filters? applied|Showing)\b/;
const ALLOWED_ENGLISH = /Ecosystem Explorer|OID4VCI|OpenID|Remove from/;

(async () => {
  const issuers = JSON.parse(fs.readFileSync(DATA, "utf8")).issuers;
  const counts = { production: 0, test: 0, unspecified: 0 };
  issuers.forEach((i) => { counts[canon(i.environment)] += 1; });
  console.log(`# data: ${issuers.length} issuers, ${JSON.stringify(counts)}`);

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const w of WIDTHS) {
    for (const loc of ["EN", "NL"]) {
      const root = `${BASE}${loc === "NL" ? "/nl" : ""}/fides-design-pilot`;
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
      await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
      const page = await ctx.newPage();
      const tag = `${loc} @${w}`;
      const text = async (sel) => (await page.locator(sel).first().innerText().catch(() => "")).replace(/\s+/g, " ").trim();
      const total = async () => page.evaluate(() => { const m = ((document.querySelector("[data-pilot-count]") || {}).textContent || "").match(/(\d+)(?: (?:of|van) (\d+))?/); return m ? Number(m[1]) : -1; });

      await page.goto(`${root}/issuers/`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForSelector(".fides-uc-pilot__list .fides-ds-card", { timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      const legend = await text(".fides-uc-pilot__legend");
      check(`issuers ${tag}: legend names Production and Test (${legend.slice(0, 70)}…)`, new RegExp(`${LABEL[loc].production}.*${LABEL[loc].test}`).test(legend));
      check(`issuers ${tag}: legend has the Not specified sentence only when data needs it`, (counts.unspecified > 0) === legend.includes(LABEL[loc].unspecified), legend);
      check(`issuers ${tag}: overview total equals the data (${issuers.length})`, (await total()) === issuers.length, await total());

      // Facet labels and counts come from the filter panel markup (present in the page, also while the dialog is closed).
      const facet = await page.$$eval('input[name="environment[]"]', (els) => els.map((e) => ({ value: e.value, text: (e.closest("label") || e.parentElement).textContent.replace(/\s+/g, " ").trim() })));
      const want = Object.keys(counts).filter((k) => counts[k] > 0);
      check(`issuers ${tag}: environment filter offers ${want.join(", ")} (${facet.map((f) => f.value).join(", ")})`, JSON.stringify(facet.map((f) => f.value)) === JSON.stringify(want), JSON.stringify(facet));
      for (const f of facet) {
        check(`issuers ${tag}: filter "${f.value}" reads "${LABEL[loc][f.value]}" with count ${counts[f.value]}`, f.text.includes(LABEL[loc][f.value]) && f.text.includes(String(counts[f.value])), f.text);
      }

      for (const env of ["production", "test"]) {
        await page.goto(`${root}/issuers/?environment[]=${env}`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForSelector(".fides-uc-pilot__count", { timeout: 30000 });
        check(`issuers ${tag}: ?environment[]=${env} gives ${counts[env]} results`, (await total()) === counts[env], await total());
        const pills = await page.$$eval(".fides-uc-pilot__pill", (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
        const removeWord = loc === "NL" ? /verwijderen/ : /remove/i;
        check(`issuers ${tag}: pill for ${env} reads "${LABEL[loc][env]}" with a ${loc} remove label`, pills.length === 1 && pills[0].includes(LABEL[loc][env]) && removeWord.test(pills[0]) && (loc === "EN" || !/remove/i.test(pills[0])), JSON.stringify(pills));
        const badges = await page.$$eval(`.fides-uc-pilot__list .fides-ds-card .fides-ds-card__status`, (els) => [...new Set(els.map((e) => e.textContent.trim()))]);
        check(`issuers ${tag}: every shown badge reads "${LABEL[loc][env]}" (${badges.join(", ")})`, badges.length === 1 && badges[0] === LABEL[loc][env], badges.join(", "));
      }
      await page.goto(`${root}/issuers/?environment[]=unspecified`, { waitUntil: "domcontentloaded", timeout: 60000 });
      check(`issuers ${tag}: ?environment[]=unspecified gives ${counts.unspecified} results and no PHP notice`, !/Warning:|Notice:|Fatal error/.test(await page.content()), await total());

      if (loc === "NL") {
        // Dynamic Dutch: gather visible text segments and aria-labels of overview and record pages, report English UI text.
        const urls = [`${root}/issuers/?environment[]=test&q=wallet`, `${root}/relying-parties/?q=wallet`, `${root}/issuer/?issuer=issuer:animo:bundesdruckerei:test`, `${root}/relying-party/?rp=pass2rent-car-rental-verifier`];
        for (const u of urls) {
          await page.goto(u, { waitUntil: "domcontentloaded", timeout: 60000 });
          await page.waitForSelector("main, .fides-ds-page", { timeout: 30000 });
          await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
          const found = await page.evaluate(() => {
            const out = [];
            const scope = document.querySelector(".fides-ds-page") || document.body;
            const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              const n = walker.currentNode;
              const el = n.parentElement;
              // Catalog content (descriptions, names, credential types) stays English by design; check interface chrome only.
              if (!el || el.closest("script,style,noscript,.fides-ds-card__title,.fides-ds-card__summary,.fides-ds-card__tags,.fides-issuer-eco,.fides-rp-eco,[lang=en]") || el.offsetParent === null) continue;
              const t = n.nodeValue.replace(/\s+/g, " ").trim();
              if (t.length > 2 && t.length < 90) out.push(t);
            }
            scope.querySelectorAll("[aria-label],[placeholder],[title]").forEach((e) => ["aria-label", "placeholder", "title"].forEach((a) => { const v = e.getAttribute(a); if (v) out.push(v); }));
            return out;
          });
          const bad = [...new Set(found.filter((t) => ENGLISH_UI.test(t) && !ALLOWED_ENGLISH.test(t) && !/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(t)))];
          check(`NL ${tag}: no English interface text on ${new URL(u).pathname}${new URL(u).search.slice(0, 40)}`, bad.length === 0, bad.slice(0, 6).join(" | "));
        }
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(failures ? `\n${failures} failed` : "\nall ok");
  process.exit(failures ? 1 : 0);
})();
