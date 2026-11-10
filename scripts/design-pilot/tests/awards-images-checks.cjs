/**
 * Browser check of the two awards pages (EN and NL) on the standalone rehearsal: every image loads (no broken image,
 * naturalWidth > 0), no image request leaves the site, no failed request, no horizontal overflow, no doubled
 * /design-review/ or /nl/ path in the shell links. Desktop 1440 and mobile 390 (320 with WIDTHS).
 *
 * Env: SITE_URL (default http://localhost:10089/design-review), WIDTHS (default 1440,390), CHROME_PATH, PLAYWRIGHT_MODULE,
 *      RESOLVE_HOST=1 maps the host of SITE_URL to 127.0.0.1 (not needed for localhost).
 * Run: scripts/design-pilot/tests/run-awards-images-checks.sh
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const SITE = (process.env.SITE_URL || "http://localhost:10089/design-review").replace(/\/$/, "");
const ORIGIN = new URL(SITE).origin;
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const PAGES = ["global-digital-trust-awards", "fides-community-awards"];
const DOUBLED = /\/design-review\/(?:nl\/)?design-review\/|\/nl\/(?:[^?#]*\/)?nl\//;

// The awards images themselves (manifest "source" URLs) must never be requested from the live site: they are bundled.
const AWARDS_SOURCES = new Set(["manifest.json", "community-manifest.json"].flatMap((f) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "awards", f), "utf8")).images.map((i) => i.source)));
// Catalog cards (finalists, winners) show cover and logo images of the catalog data (live site, wallet and organisation sites);
// they are absolute https URLs to their own origin and must stay that way: not rewritten to this site, not under /nl/.
const CATALOG_IMAGE_OK = (src) => /^https:\/\//.test(src) && !/\/design-review\/|\/nl\//.test(src) && !src.startsWith("https://localhost");

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
};
const COOKIES = Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: ORIGIN }));

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  for (const lang of ["en", "nl"]) {
    for (const slug of PAGES) {
      for (const w of WIDTHS) {
        const tag = `${lang.toUpperCase()} ${slug} ${w}px`;
        const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
        await ctx.addCookies(COOKIES);
        const page = await ctx.newPage();
        const failed = [];
        page.on("requestfailed", (r) => failed.push(r.url()));
        page.on("response", (r) => { if (r.status() >= 400 && /\/wp-content\//.test(r.url())) failed.push(`${r.status()} ${r.url()}`); });
        const url = `${SITE}${lang === "nl" ? "/nl" : ""}/${slug}/`;
        const res = await page.goto(url, { waitUntil: "load" });
        check(`${tag}: page answers 200`, res && res.status() === 200, String(res && res.status()));
        // Lazy images: walk down the page so every image is requested.
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
          document.querySelectorAll("img[loading=lazy]").forEach((i) => { i.loading = "eager"; });
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(1500);
        const imgs = await page.evaluate(() => [...document.querySelectorAll("main img, .fides-awards img")].map((i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, alt: i.getAttribute("alt") })));
        const unique = [...new Map(imgs.map((i) => [i.src, i])).values()];
        const local = unique.filter((i) => i.src.startsWith(ORIGIN));
        const external = unique.filter((i) => !i.src.startsWith(ORIGIN) && !i.src.startsWith("data:"));
        check(`${tag}: ${local.length} images of this site (bundled awards images)`, local.length >= 5, String(local.length));
        check(`${tag}: no broken image of this site`, local.every((i) => i.ok), local.filter((i) => !i.ok).slice(0, 3).map((i) => i.src).join(" "));
        check(`${tag}: no awards image is loaded from the live site (they come from the media library)`, external.every((i) => !AWARDS_SOURCES.has(i.src)), external.filter((i) => AWARDS_SOURCES.has(i.src)).slice(0, 2).map((i) => i.src).join(" "));
        check(`${tag}: ${external.length} catalog images stay absolute https links to their origin (not rewritten to this site)`, external.every((i) => CATALOG_IMAGE_OK(i.src)), external.filter((i) => !CATALOG_IMAGE_OK(i.src)).slice(0, 2).map((i) => i.src).join(" "));
        check(`${tag}: no 4xx on this site's uploads`, failed.length === 0, failed.slice(0, 3).join(" "));
        const links = await page.evaluate(() => [...document.querySelectorAll("header a[href], footer a[href]")].map((a) => a.href));
        check(`${tag}: no doubled path in header/footer links (${links.length})`, links.every((h) => !DOUBLED.test(h)), links.filter((h) => DOUBLED.test(h)).slice(0, 2).join(" "));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        check(`${tag}: no horizontal overflow`, overflow <= 0, String(overflow));
        await ctx.close();
      }
    }
  }
  await browser.close();
  console.log(failures ? `\n# awards-images-checks: ${failures} failed` : "\n# awards-images-checks: all passed");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
