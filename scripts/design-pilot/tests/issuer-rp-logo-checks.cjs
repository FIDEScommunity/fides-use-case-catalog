/**
 * Logo fallbacks of the issuer and relying party pilot (GET only).
 * For the records with known logo problems (France Identité issuers: the logo is a wide phone screenshot; Swiss E-ID:
 * the logo URL does not load in the pilot) it reports what the browser shows on the overview and the record at 1440 and 390 px:
 * the image state, its natural size and whether the name fallback replaced a broken image. A record passes when no
 * broken image is visible. Source problems are reported with "#" lines (they need the catalog owner, see
 * issuer-catalog/docs/OWNER-MESSAGE-LOGO-SOURCES.md).
 *
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/issuer-rp-logo-checks.cjs   (env: PILOT_URL, WIDTHS)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const RECORDS = [
  { kind: "issuers", q: "France Identité Playground", id: "issuer:france:playground:test", detail: "issuer/?issuer=" },
  { kind: "issuers", q: "France Titres", id: "issuer:france:custom-issuer:test", detail: "issuer/?issuer=" },
  { kind: "issuers", q: "Swiss E-ID", id: "issuer:swiyu:beta-id:test", detail: "issuer/?issuer=" },
  { kind: "relying-parties", q: "Maenada", id: "blokverse-maenada-playground", detail: "relying-party/?rp=" },
];
let failures = 0;
const check = (name, ok, detail) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${detail})` : ""}`); };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
    await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
    const page = await ctx.newPage();
    for (const r of RECORDS) {
      const tag = `${r.id} @${w}`;
      const probe = () => page.evaluate(() => [...document.querySelectorAll(".fides-ds-card img, .fides-ds-detail img, .fides-ds-logo img, img[class*=logo], img[class*=img]")].filter((i) => i.offsetParent !== null && !/FIDES_LOGO/.test(i.getAttribute("src") || "")).map((i) => ({ src: i.getAttribute("src"), ok: i.complete && i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight, box: `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`, fit: getComputedStyle(i).objectFit })));
      await page.goto(`${BASE}/fides-design-pilot/${r.kind}/?q=${encodeURIComponent(r.q)}`, { waitUntil: "load" });
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      const list = await probe();
      const broken = list.filter((i) => !i.ok);
      console.log(`# ${tag} overview images: ${JSON.stringify(list.slice(0, 2))}`);
      check(`${tag}: no broken image visible on the overview`, broken.length === 0, JSON.stringify(broken));
      await page.goto(`${BASE}/fides-design-pilot/${r.detail}${encodeURIComponent(r.id)}`, { waitUntil: "load" });
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      const det = await probe();
      console.log(`# ${tag} record images: ${JSON.stringify(det.slice(0, 2))}`);
      check(`${tag}: no broken image visible on the record`, det.filter((i) => !i.ok).length === 0, JSON.stringify(det.filter((i) => !i.ok)));
      const tooWide = [...list, ...det].filter((i) => i.ok && i.w / Math.max(i.h, 1) > 1.6);
      if (tooWide.length) console.log(`# ${tag}: source logo is not square-ish (${tooWide.map((i) => `${i.w}x${i.h}`).join(", ")}); shown as ${tooWide[0].box}, object-fit ${tooWide[0].fit}`);
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `\n${failures} failed` : "\nall ok");
  process.exit(failures ? 1 : 0);
})();
