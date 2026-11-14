/**
 * Explore by theme / sector: targeted browser checks (EN and NL, 1440 and 390, plus JavaScript disabled).
 *
 *  - choice and URL (?theme= / ?sector=), the chosen item is marked with aria-current, result shown on the same page;
 *  - switching, Back/Forward, direct open, refresh;
 *  - keyboard: Tab reaches the choices, Enter and Space choose, focus moves to the result heading, a visible focus ring;
 *  - mobile: no horizontal overflow;
 *  - invalid slug and "other": no-choice state with a notice;
 *  - no JavaScript: choices are links, the overview is server rendered;
 *  - per choice: use cases are listed and "See all matching use cases" opens the filtered catalogue with the same count;
 *    every shown organisation / credential / wallet links to a detail page (relations are traced in the PHP test);
 *  - NL: all links stay on /nl/.
 * Nothing is submitted: GET navigation only.
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/explore-themes-sectors-checks.cjs   (env: PILOT_URL, WIDTHS, LOCALES, SAMPLE=all)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "EN,NL").split(",");
const THEMES = ["identity_access", "business_authority", "payments_commerce", "work_qualifications", "products_trade_supply_chains", "government_compliance"];
const SECTORS = ["agriculture", "construction", "digital", "education", "energy", "finance", "food", "healthcare", "manufacturing", "mobility", "public_sector", "retail", "supply_chain", "trade"];
const KINDS = [
  { kind: "theme", param: "theme", path: "themes/", slugs: THEMES, sample: ["business_authority", "identity_access"] },
  { kind: "sector", param: "sector", path: "sectors/", slugs: SECTORS, sample: ["healthcare", "agriculture"] },
];

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${detail})` : ""}`);
}
const prefix = (loc) => (loc === "NL" ? "/nl" : "") + "/fides-design-pilot/";
const COOKIES = Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE }));

async function newPage(browser, width, js = true) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", javaScriptEnabled: js });
  await ctx.addCookies(COOKIES);
  return ctx.newPage();
}
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const current = (p) => p.evaluate(() => Array.from(document.querySelectorAll(".fides-explore__choice[aria-current]")).map((a) => a.getAttribute("data-choice")));
const state = (p) => p.evaluate(() => (document.querySelector("[data-fides-explore-result] [data-fides-explore-state]") || {}).dataset?.fidesExploreState || "");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  for (const loc of LOCALES) {
    for (const width of WIDTHS) {
      for (const K of KINDS) {
        const tag = `${loc} ${width} ${K.kind}`;
        const url = (slug) => `${BASE}${prefix(loc)}${K.path}${slug ? `?${K.param}=${slug}` : ""}`;
        const page = await newPage(browser, width);
        await page.goto(url(), { waitUntil: "networkidle" });
        const total = await page.locator(".fides-explore__choice").count();
        check(`${tag}: no-choice state with ${K.slugs.length} visible choices, no dropdown`, total === K.slugs.length && (await state(page)) === "none" && (await page.locator("select").count()) === 0, `${total}/${await state(page)}`);
        check(`${tag}: "Other" is never offered`, (await page.locator(".fides-explore__choice", { hasText: /^\s*(Other|Overig)\b/ }).count()) === 0);
        check(`${tag}: no horizontal overflow (none)`, await noOverflow(page));

        // Direct open + refresh
        const sample = K.sample[0];
        await page.goto(url(sample), { waitUntil: "networkidle" });
        check(`${tag}: direct open marks exactly the chosen item (aria-current)`, JSON.stringify(await current(page)) === JSON.stringify([sample]), JSON.stringify(await current(page)));
        check(`${tag}: chosen state shows use cases and no horizontal overflow`, (await state(page)) === "selected" && (await page.locator(".fides-explore__cards li").count()) > 0 && (await noOverflow(page)));
        await page.reload({ waitUntil: "networkidle" });
        check(`${tag}: refresh keeps the choice`, JSON.stringify(await current(page)) === JSON.stringify([sample]));

        // Switch by click, then Back / Forward
        const other = K.sample[1];
        await page.locator(`.fides-explore__choice[data-choice="${other}"]`).click();
        await page.waitForFunction((s) => document.querySelector(`.fides-explore__choice[data-choice="${s}"][aria-current]`), other);
        check(`${tag}: click switches in place, URL updated, focus on the result heading`, page.url().includes(`${K.param}=${other}`) && (await page.evaluate(() => document.activeElement && document.activeElement.id)) === "fides-explore-selected-title", page.url());
        await page.goBack();
        await page.waitForFunction((s) => document.querySelector(`.fides-explore__choice[data-choice="${s}"][aria-current]`), sample);
        check(`${tag}: Back restores the previous choice`, JSON.stringify(await current(page)) === JSON.stringify([sample]));
        await page.goForward();
        await page.waitForFunction((s) => document.querySelector(`.fides-explore__choice[data-choice="${s}"][aria-current]`), other);
        check(`${tag}: Forward restores the next choice`, JSON.stringify(await current(page)) === JSON.stringify([other]));

        // Keyboard
        await page.goto(url(), { waitUntil: "networkidle" });
        const first = page.locator(".fides-explore__choice").first();
        await first.focus();
        const ring = await first.evaluate((el) => { const s = getComputedStyle(el); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 || s.boxShadow !== "none"; });
        check(`${tag}: focus ring visible on a choice`, ring);
        await page.keyboard.press("Tab");
        const second = await page.evaluate(() => document.activeElement.getAttribute("data-choice"));
        const expected = await page.locator(".fides-explore__choice").nth(1).getAttribute("data-choice");
        check(`${tag}: Tab moves through the choices in order`, second === expected, second);
        await page.keyboard.press("Enter");
        await page.waitForFunction(() => document.querySelector(".fides-explore__choice[aria-current]"));
        check(`${tag}: Enter chooses and moves focus to the result heading`, (await page.evaluate(() => document.activeElement && document.activeElement.id)) === "fides-explore-selected-title");
        await page.locator(".fides-explore__choice").nth(2).focus();
        await page.keyboard.press("Space");
        await page.waitForFunction((i) => document.querySelectorAll(".fides-explore__choice")[i].hasAttribute("aria-current"), 2);
        check(`${tag}: Space chooses`, (await current(page)).length === 1);

        // Invalid slug and "other"
        for (const bad of ["nonsense", "other"]) {
          await page.goto(url(bad), { waitUntil: "networkidle" });
          check(`${tag}: invalid "${bad}" falls back to no-choice with a notice`, (await state(page)) === "none" && (await page.locator(".fides-explore__notice, [role=status], .fides-explore__invalid").count()) > 0 && (await current(page)).length === 0);
        }
        await page.context().close();

        // No JavaScript
        const nojs = await newPage(browser, width, false);
        await nojs.goto(url(sample), { waitUntil: "load" });
        const hrefs = await nojs.$$eval(".fides-explore__choice", (as) => as.map((a) => a.getAttribute("href")));
        check(`${tag}: no JS: choices are real links and the overview is server rendered`, hrefs.length === K.slugs.length && hrefs.every((h) => h.includes(`${K.param}=`)) && (await nojs.locator(".fides-explore__cards li").count()) > 0);
        await nojs.locator(`.fides-explore__choice[data-choice="${other}"]`).click();
        await nojs.waitForLoadState("load");
        check(`${tag}: no JS: clicking a choice loads the chosen overview`, JSON.stringify(await current(nojs)) === JSON.stringify([other]));
        await nojs.context().close();

        // Per choice: data and catalogue links (all choices on 1440; a sample otherwise)
        if (width === WIDTHS[0] || process.env.SAMPLE === "all") {
          const p = await newPage(browser, width);
          for (const slug of K.slugs) {
            await p.goto(url(slug), { waitUntil: "domcontentloaded" });
            const cards = await p.locator(".fides-explore__cards li").count();
            const all = p.locator(".fides-explore__use-cases a.fides-ds-action-link, #explore-use-cases a.fides-ds-action-link").last();
            const href = (await all.count()) ? await all.getAttribute("href") : "";
            const links = await p.$$eval("#explore-use-cases a, #explore-credentials a, #explore-organisations a, #explore-wallets a", (as) => as.map((a) => a.getAttribute("href") || ""));
            const wrongLang = loc === "NL" ? links.filter((h) => h.startsWith("/") && !h.startsWith("/nl/") && !h.startsWith("#")) : [];
            const countText = (await p.locator(".fides-explore__count").first().textContent()) || "";
            const n = /^(One|Eén)/.test(countText.trim()) ? 1 : Math.max(...(countText.match(/\d+/g) || [0]).map(Number)); // EN "Showing 4 of 25" / NL "4 van de 25": the largest number is the total
            if (K.sample.includes(slug)) {
              // The filtered catalogue (first page, 24 per page) must hold exactly the stated number of use cases.
              await p.goto(href, { waitUntil: "networkidle" });
              const listed = await p.locator(".fides-uc-pilot__list .fides-ds-card").count();
              check(`${tag}/${slug}: "See all matching use cases" opens the filtered catalogue with ${n} use case(s)`, listed === Math.min(n, 24), `${listed} listed, ${n} stated`);
              await p.goto(url(slug), { waitUntil: "domcontentloaded" });
            }
            check(`${tag}/${slug}: yields data (${cards} use case cards), catalogue link present, no empty hrefs${loc === "NL" ? ", stays on /nl/" : ""}`, cards > 0 && href.includes("overview") && links.every((h) => h) && wrongLang.length === 0, `${cards} ${href} ${wrongLang.slice(0, 2)}`);
          }
          await p.context().close();
        }
      }
    }
  }
  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
})();
