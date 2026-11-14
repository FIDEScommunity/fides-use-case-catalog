/**
 * Filter links on the country and Technology articles (14 November 2026).
 *
 * Every link with a catalog filter (?country=, ?format=, ?issuance=, ?presentation=, ?cert=, ?role=) in the text or in
 * "Continue learning" of a country article (topics/around-the-world/*) or a Technology article (topics/technology/*)
 * is opened on the pilot catalog (EN, and NL below /nl/): the result count must be greater than 0 and the filter chip
 * must be visible and must name the filter value. A filter that returns no results is therefore never a follow-up step.
 * The list of links is read from the rendered Learn page, so a link an editor adds or changes in WordPress is covered
 * on the next run; when a filter becomes empty because the data changes, this test fails and the editor removes or
 * replaces the link (editorial rule in learn/README.md; there is no automatic hiding).
 *
 * Also checked: the country articles keep exactly the three country filters (use cases, organisations, personal
 * wallets) for their own country code, and the Dutch page keeps every link under /nl/.
 *
 * Run (pilot running):
 *   CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' PLAYWRIGHT_MODULE=... node tests/learn-filter-links-checks.cjs
 *   WIDTHS=1440,390 LANGS=en,nl ONLY=india,canada (comma list of article slugs)
 * Nothing is submitted; the pages only read.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const ORIGIN = process.env.PILOT_ORIGIN || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const LANGS = (process.env.LANGS || "en,nl").split(",");
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
const P = "/fides-design-pilot";
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "learn", "manifest.json"), "utf8")).pages;
const ARTICLES = manifest
  .filter((p) => p.kind === "article" && p.content && /^topics\/(around-the-world|technology)\//.test(p.path))
  .map((p) => p.path)
  .filter((p) => !ONLY.length || ONLY.includes(p.split("/").pop()));

const COUNTRY_OF = { india: "IN", canada: "CA", "united-states": "US", honduras: "HN", ethiopia: "ET", "the-netherlands": "NL", germany: "DE" };
// Chip text per filter value, English and Dutch. A new filter value needs an entry here (the test fails otherwise).
const CHIP = {
  "country=IN": /India/i, "country=CA": /Canada/i, "country=US": /United States|Verenigde Staten/i, "country=HN": /Honduras/i,
  "country=ET": /Ethiopia|Ethiopië/i, "country=NL": /Netherlands|Nederland/i, "country=DE": /Germany|Duitsland/i,
  "format=sd_jwt_vc": /SD-JWT VC/i, "format=mdoc": /mDoc/i,
  "issuance=OpenID4VCI": /OpenID4VCI/i, "presentation=OpenID4VP": /OpenID4VP/i,
  "cert=qtsp": /QTSP/i, "role=eidas_trust_service_provider": /Trust Service Provider|vertrouwensdienst/i,
};
const FILTER_PARAM = /[?&](country|format|issuance|presentation|cert|role)=([^&#]+)/;

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${!ok && detail !== undefined ? ` (${String(detail).slice(0, 240)})` : ""}`);
};

async function dismiss(page) {
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1000 }).then(() => true, () => false)) await deny.click();
}

/** Filter links of one Learn page: [{ href (path+search), where }] */
async function filterLinks(page, lang, slug) {
  await page.goto(`${ORIGIN}${lang === "nl" ? "/nl" : ""}${P}/learn/topics/${slug}/`, { waitUntil: "domcontentloaded" });
  await dismiss(page);
  if (lang === "nl") await page.waitForLoadState("networkidle").catch(() => {});
  return page.evaluate(() => [...document.querySelectorAll(".fides-learn-article__body a[href], .fides-learn-continue a[href]")].map((a) => ({
    href: a.getAttribute("href"), where: a.closest(".fides-learn-continue") ? "continue" : "text", label: a.textContent.replace(/\s+/g, " ").trim(),
  })));
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  const byLang = {};
  const probeCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const probe = await probeCtx.newPage();
  for (const lang of LANGS) {
    byLang[lang] = {};
    for (const p of ARTICLES) {
      const slug = p.replace(/^topics\//, "");
      const links = (await filterLinks(probe, lang, slug)).filter((l) => FILTER_PARAM.test(l.href));
      byLang[lang][slug] = links;
      const pre = lang === "nl" ? `/nl${P}` : P;
      const bad = links.filter((l) => !l.href.startsWith(`${pre}/`) && !l.href.startsWith(`${ORIGIN}${pre}/`));
      check(`${slug} ${lang}: ${links.length} filter link(s), all under ${pre}/`, bad.length === 0, bad.map((l) => l.href).join(" "));
      const cc = COUNTRY_OF[slug.split("/").pop()];
      if (cc && slug.startsWith("around-the-world/")) {
        const want = ["overview", "organizations", "personal-wallets"].map((k) => `${pre}/${k}/?country=${cc}`);
        const got = links.filter((l) => l.where === "continue").map((l) => l.href.replace(ORIGIN, ""));
        check(`${slug} ${lang}: Continue learning keeps the three country filters for ${cc}`, want.every((w) => got.includes(w)) && got.length === 3, got.join(" "));
      }
      if (slug.startsWith("technology/")) console.log(`  # ${slug} ${lang}: ${links.map((l) => `${l.where}:${l.href.replace(ORIGIN, "").replace(pre, "")}`).join(" ") || "no filter links"}`);
    }
  }
  await probeCtx.close();

  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.route("**/*", (r) => (["GET", "HEAD"].includes(r.request().method()) ? r.continue() : r.abort()));
    const seen = new Map();
    for (const lang of LANGS) {
      for (const [slug, links] of Object.entries(byLang[lang])) {
        for (const l of links) {
          const href = l.href.replace(ORIGIN, "");
          const key = `${lang} ${href}`;
          if (!seen.has(key)) seen.set(key, { lang, href, from: [] });
          seen.get(key).from.push(`${slug.split("/").pop()}(${l.where})`);
        }
      }
    }
    for (const { lang, href, from } of seen.values()) {
      const tag = `${lang} ${href.replace(`/nl${P}`, "").replace(P, "")} @${width}`;
      const val = FILTER_PARAM.exec(href);
      const key = `${val[1]}=${decodeURIComponent(val[2])}`;
      await page.goto(`${ORIGIN}${href}`, { waitUntil: "domcontentloaded" });
      await dismiss(page);
      const ready = await page.waitForSelector("[data-pilot-count]", { timeout: 45000 }).then(() => true, () => false);
      await page.waitForFunction(() => !document.querySelector("[data-pilot-ssr]"), null, { timeout: 45000 }).catch(() => {});
      const count = ready ? (await page.locator("[data-pilot-count]").first().innerText()).trim() : "";
      const n = parseInt(count, 10);
      const pills = ready ? await page.locator(".fides-uc-pilot__pills").first().innerText().catch(() => "") : "";
      const chipVisible = ready && (await page.locator(".fides-uc-pilot__pills").first().isVisible().catch(() => false));
      console.log(`  # ${tag}: "${count}", chip "${pills.replace(/\s+/g, " ").trim().slice(0, 60)}" (from ${from.join(", ")})`);
      check(`${tag}: more than 0 results`, n > 0, count || "no count");
      check(`${tag}: filter chip visible and names ${key}`, chipVisible && !!CHIP[key] && CHIP[key].test(pills), `${pills.trim()} | map:${!!CHIP[key]}`);
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
})();
