/**
 * Full walkthrough with real clicks, EN and NL, 1440 and 390 px (GET navigation only, nothing is submitted):
 *   Learn Topics -> Technology (topic page) -> article "Credential formats and interoperability"
 *   -> filtered catalog (credential types that report SD-JWT VC, link in the article) -> record card
 *   -> record page -> "Back to results" -> the same filtered catalog with its results.
 * Every step must stay on the language route (NL: /nl/) with the matching <html lang>.
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/final-walkthrough-checks.cjs   (env: PILOT_URL, WIDTHS, LOCALES)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "EN,NL").split(",");
const BACK = { EN: "Back to results", NL: "Terug naar resultaten" };
const CARD = ".fides-uc-pilot__list .fides-ds-card--row, .fides-uc-pilot__list .fides-ds-card";

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${String(detail).slice(0, 240)})` : ""}`);
}
const onRoute = (url, loc) => (loc === "NL" ? new URL(url, BASE).pathname.startsWith("/nl/") : !new URL(url, BASE).pathname.startsWith("/nl/"));
const langOk = (lang, loc) => (loc === "NL" ? lang.startsWith("nl") : lang.startsWith("en"));
const norm = (u) => { const x = new URL(u, BASE); return `${x.pathname}?${[...x.searchParams.entries()].filter(([k]) => k !== "trp-form-language").map(([k, v]) => `${k}=${v}`).sort().join("&")}`; };

async function settle(page) {
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
}

/** Real click on a link that is inside the main content; scrolls it into view first. */
async function clickLink(page, selector, label) {
  const loc = page.locator(`main ${selector}, .entry-content ${selector}, #main ${selector}`).first();
  await loc.waitFor({ state: "attached", timeout: 15000 });
  await loc.scrollIntoViewIfNeeded();
  await Promise.all([page.waitForURL((u) => u.toString() !== page.url(), { timeout: 30000 }).catch(() => {}), loc.click()]);
  await settle(page);
  return label;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const width of WIDTHS) {
    for (const loc of LOCALES) {
      const tag = `${loc} @${width}`;
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
      const page = await ctx.newPage();
      const sent = [];
      page.on("request", (r) => { if (!["GET", "HEAD", "OPTIONS"].includes(r.method()) && r.url().startsWith(BASE) && !/trp-ajax\.php/.test(r.url())) sent.push(`${r.method()} ${r.url()}`); });
      const root = `${BASE}${loc === "NL" ? "/nl" : ""}/fides-design-pilot`;
      const step = async (name, fn) => { try { await fn(); } catch (err) { check(`${tag}: ${name}`, false, err.message.split("\n")[0]); throw err; } };
      try {
        // 1. Topics
        await step("open Topics", async () => {
          await page.goto(`${root}/learn/topics/`, { waitUntil: "load", timeout: 60000 });
          await settle(page);
          check(`${tag}: Topics opens with the right lang (${await page.evaluate(() => document.documentElement.lang)})`, langOk(await page.evaluate(() => document.documentElement.lang), loc));
        });
        // 2. Technology topic page, by clicking the Topics row
        await step("click Technology", async () => {
          await clickLink(page, 'a[href*="/topics/technology/"]:not([href*="/technology/credential"]):not([href*="/technology/how"]):not([href*="/technology/trust"])', "Technology");
          check(`${tag}: Technology topic page on the language route`, onRoute(page.url(), loc) && /\/topics\/technology\/?$/.test(new URL(page.url()).pathname), page.url());
        });
        // 3. Article
        await step("click article", async () => {
          await clickLink(page, 'a[href*="/technology/credential-formats-and-interoperability/"]', "article");
          check(`${tag}: article opens on the language route`, onRoute(page.url(), loc) && /credential-formats-and-interoperability/.test(page.url()), page.url());
          const lang = await page.evaluate(() => document.documentElement.lang);
          check(`${tag}: article lang (${lang})`, langOk(lang, loc));
        });
        // 4. Filtered catalog from the article
        let filteredUrl = "";
        await step("click filtered catalog link", async () => {
          await clickLink(page, 'a[href*="/credentials/?format=sd_jwt_vc"]', "filtered catalog");
          filteredUrl = page.url();
          check(`${tag}: filtered catalog keeps the language route and the filter`, onRoute(filteredUrl, loc) && /format=sd_jwt_vc/.test(filteredUrl), filteredUrl);
          await page.waitForSelector(CARD, { timeout: 30000 });
          await page.waitForFunction(() => { const c = document.querySelector("[data-pilot-count]"); return c && /\d/.test(c.textContent); }, null, { timeout: 30000 }).catch(() => {});
          check(`${tag}: filtered results are shown (${await page.locator(CARD).count()} cards)`, (await page.locator(CARD).count()) > 0);
        });
        // 5. Record card -> record page
        let opened = false;
        await step("open a record card", async () => {
          for (let i = 0; i < Math.min(5, await page.locator(CARD).count()) && !opened; i += 1) {
            await page.locator(CARD).nth(i).locator(".fides-ds-card__link").first().click();
            await page.waitForSelector(".fides-ds-detail-top__back a, .fides-ds-detail-top, .fides-uc-detail__missing", { timeout: 30000 });
            if (await page.locator(".fides-uc-detail__missing").count()) {
              console.log(`# note ${tag}: card ${i + 1} is not in the server catalog (data drift); trying the next card`);
              await page.goBack();
              await page.waitForSelector(CARD, { timeout: 30000 });
            } else opened = true;
          }
          check(`${tag}: a record page opened`, opened);
        });
        if (opened) {
          const lang = await page.evaluate(() => document.documentElement.lang);
          check(`${tag}: record page on the language route with lang ${lang}`, onRoute(page.url(), loc) && langOk(lang, loc) && /\/credential\/\?credential=/.test(page.url()), page.url());
          await page.waitForFunction((l) => ((document.querySelector(".fides-ds-detail-top__back a") || {}).textContent || "").includes(l), BACK[loc], { timeout: 8000 }).catch(() => {});
          const back = await page.evaluate(() => { const a = document.querySelector(".fides-ds-detail-top__back a"); return a ? { href: a.getAttribute("href"), label: a.textContent.replace(/\s+/g, " ").replace(/^←\s*/, "").trim() } : null; });
          check(`${tag}: back action reads "${BACK[loc]}"`, back && back.label === BACK[loc], JSON.stringify(back));
          check(`${tag}: back link returns to the filtered results on the language route`, back && onRoute(back.href, loc) && norm(back.href) === norm(filteredUrl), back && `${back.href} vs ${filteredUrl}`);
          // 6. Back to results
          await page.locator(".fides-ds-detail-top__back a").first().click();
          await page.waitForSelector(CARD, { timeout: 30000 });
          check(`${tag}: after Back the filtered catalog is shown again`, norm(page.url()) === norm(filteredUrl), page.url());
          check(`${tag}: results are visible again`, (await page.locator(CARD).count()) > 0);
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        check(`${tag}: no horizontal overflow at the end`, overflow <= 0, overflow);
      } catch (err) {
        console.log(`# walkthrough aborted at ${tag}: ${err.message.split("\n")[0]}`);
      }
      check(`${tag}: nothing was submitted`, sent.length === 0, sent.join("; "));
      await ctx.close();
    }
  }
  await browser.close();
  console.log(failures ? `\n${failures} failed` : "\nall ok");
  process.exit(failures ? 1 : 0);
})();
