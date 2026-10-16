/**
 * UX round 16 browser checks, per width:
 * - Forced catalog fallback: GitHub is blocked for this browser context only, so
 *   the overview loads from the same-origin cache and shows the stale-data
 *   notice. Every visible functional control (notice included) must be at least
 *   44 px; the dismiss button 44x44. A self-test shrinks the dismiss button and
 *   expects the same check to fail.
 * - Ecosystem on the detail page: summary vs full section, Ecosystem anchor,
 *   "Show all" by keyboard, internal / external / unlinked records.
 *
 * Run through run-ux16-checks.sh.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const WIDTHS = (process.env.WIDTHS || "1366,1440,1100,1024,768,390,320").split(",").map(Number);
const MANY = "end-to-end-digital-business-workflows-transforming-kyb-kyc-kys-via-eu-business-wallet-F665Dh";
const DETAILS = (process.env.DETAIL_SLUGS || `${MANY},digital-certificate-of-good-conduct-vog-as-a-verifiable-credential-yjw4BC`).split(",");

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

/** Visible functional controls under 44 px; inline text links in prose are exempt. */
function smallTargets(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll(".fides-ds-shell__main :is(input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, button, summary, [role=button], a.fides-ds-action-link, a.fides-ds-button)")]
      .filter((n) => n.getClientRects().length && getComputedStyle(n).visibility !== "hidden")
      .map((n) => {
        const r = n.getBoundingClientRect();
        const square = n.matches(".fides-stale-catalog-notice-dismiss");
        return { el: (n.getAttribute("aria-label") || n.textContent || n.placeholder || n.tagName).trim().replace(/\s+/g, " ").slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), square };
      })
      .filter((c) => c.h < 44 || (c.square && c.w < 44))
  );
}

/** The PHP built-in server occasionally stalls on one worker; retry a navigation once. */
async function open(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (err) {
    console.log(`# retry ${url}: ${err.message.split("\n")[0]}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  }
}

async function newContext(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: width === 1366 ? 768 : 900 } });
  await context.addCookies(
    Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" })
      .map(([name, value]) => ({ name: `cmplz_${name}`, value, url: BASE }))
  );
  return context;
}

async function fallbackChecks(browser, width) {
  const context = await newContext(browser, width);
  await context.route("https://raw.githubusercontent.com/**", (route) => route.abort("connectionrefused"));
  const page = await context.newPage();
  await open(page, `${BASE}/fides-design-pilot/overview/`);
  const notice = page.locator("[data-fides-stale-catalog-notice]");
  await page.locator(".fides-ds-card--row").first().waitFor({ timeout: 20000 });
  const shown = await notice.waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false);
  const source = await page.locator("[data-catalog-source]").first().getAttribute("data-catalog-source").catch(() => null);
  check(`fallback @${width}: GitHub blocked -> fallback data with a visible notice`, shown && source && source !== "github", `shown=${shown} source=${source}`);
  if (!shown) return context.close();

  const box = await notice.locator(".fides-stale-catalog-notice-dismiss").boundingBox();
  check(`fallback @${width}: dismiss button is at least 44x44`, box && box.width >= 44 && box.height >= 44, JSON.stringify(box));
  const small = await smallTargets(page);
  check(`fallback @${width}: no functional target under 44 px while the notice is visible`, small.length === 0, JSON.stringify(small));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  check(`fallback @${width}: no horizontal overflow with the notice`, !overflow);
  await page.screenshot({ path: path.join(OUT, `fallback-${width}.png`) });

  // Self-test: the previous 20 px button must make the same check fail.
  await page.addStyleTag({ content: ".fides-stale-catalog-notice-dismiss{min-width:0!important;min-height:0!important;width:20px!important;height:20px!important;margin:0!important}" });
  const caught = await smallTargets(page);
  check(`fallback @${width}: self-test - a 20 px dismiss button is reported`, caught.some((c) => c.square), JSON.stringify(caught));
  await page.evaluate(() => document.querySelectorAll("style").forEach((s) => s.textContent.includes("width:20px!important") && s.remove()));

  await notice.locator(".fides-stale-catalog-notice-dismiss").focus();
  await page.keyboard.press("Enter");
  check(`fallback @${width}: Enter on dismiss removes the notice`, (await notice.count()) === 0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".fides-ds-card--row").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
  check(`fallback @${width}: the dismissed notice stays away in this session`, (await notice.count()) === 0);
  await context.close();
}

async function ecosystemChecks(browser, width, slug) {
  const context = await newContext(browser, width);
  const page = await context.newPage();
  const tag = `ecosystem @${width} ${slug.slice(0, 24)}`;
  await open(page, `${BASE}/fides-design-pilot/use-case/?usecase=${slug}`);
  const section = page.locator("#ecosystem");
  await section.waitFor();
  const s = await page.evaluate(() => {
    const sec = document.getElementById("ecosystem");
    const summary = document.querySelector(".fides-uc-ecosystem-summary");
    const tech = [...document.querySelectorAll(".fides-uc-detail__panel")].find((p) => !p.classList.contains("fides-uc-ecosystem-summary"));
    const video = [...document.querySelectorAll("section, h2")].find((n) => /video/i.test(n.id || n.textContent || ""));
    const groups = [...sec.querySelectorAll(".fides-uc-ecosystem__group")];
    const lefts = new Set(groups.map((g) => Math.round(g.getBoundingClientRect().left)));
    return {
      summaryRows: [...summary.querySelectorAll(".fides-uc-ecosystem-summary__role")].map((r) => [r.querySelector("dt").textContent.trim(), Number(r.querySelector("dd").textContent)]),
      groups: groups.map((g) => [g.querySelector(".fides-uc-ecosystem__role").firstChild.textContent.trim(), g.querySelectorAll(".fides-uc-relations__item").length]),
      columns: lefts.size,
      summaryBeforeTech: tech ? Boolean(summary.compareDocumentPosition(tech) & Node.DOCUMENT_POSITION_FOLLOWING) : true,
      beforeVideo: video ? Boolean(sec.compareDocumentPosition(video) & Node.DOCUMENT_POSITION_FOLLOWING) : true,
      navLink: Boolean(document.querySelector('.fides-uc-detail__sections a[href="#ecosystem"]')),
      external: [...sec.querySelectorAll("a.fides-uc-relations__name")].filter((a) => new URL(a.href).origin !== location.origin).map((a) => a.target === "_blank" && /noopener/.test(a.rel)),
      internal: [...sec.querySelectorAll("a.fides-uc-relations__name")].filter((a) => new URL(a.href).origin === location.origin).length,
      unlinked: sec.querySelectorAll("span.fides-uc-relations__label").length,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  check(`${tag}: summary rows equal the full section per role, none empty`, JSON.stringify(s.summaryRows) === JSON.stringify(s.groups) && s.groups.every(([, n]) => n > 0), JSON.stringify(s));
  check(`${tag}: summary before technical details, section before Video & links`, s.summaryBeforeTech && s.beforeVideo, JSON.stringify(s));
  check(`${tag}: page navigation links to #ecosystem`, s.navLink);
  check(`${tag}: ${width >= 900 ? "two columns" : "one column"}`, width >= 900 ? s.columns === Math.min(2, s.groups.length) : s.columns === 1, String(s.columns));
  check(`${tag}: external records open in a new tab with noopener`, s.external.every(Boolean), JSON.stringify(s.external));
  check(`${tag}: no horizontal overflow`, !s.overflow);
  console.log(`# ${tag}: internal=${s.internal} external=${s.external.length} unlinked=${s.unlinked} groups=${JSON.stringify(s.groups)}`);

  const more = section.locator("details.fides-uc-ecosystem__more").first();
  if (await more.count()) {
    const sum = more.locator("summary");
    const label = (await sum.textContent()).replace(/\s+/g, " ").trim();
    const hiddenBefore = await more.locator(".fides-uc-relations__item").first().isVisible();
    const sumBox = await sum.boundingBox();
    await sum.focus();
    await page.keyboard.press("Enter");
    const opened = await more.evaluate((el) => el.open);
    const shownAfter = await more.locator(".fides-uc-relations__item").first().isVisible();
    check(`${tag}: "${label.slice(0, 30)}" opens by keyboard and reveals the rest`, !hiddenBefore && opened && shownAfter && /Show all \d+/.test(label), label);
    check(`${tag}: Show all target is at least 44 px`, sumBox && sumBox.height >= 44, JSON.stringify(sumBox));
    await page.keyboard.press("Enter");
    check(`${tag}: Enter again collapses the group`, !(await more.evaluate((el) => el.open)));
  }
  const small = await smallTargets(page);
  check(`${tag}: no functional target under 44 px`, small.length === 0, JSON.stringify(small));

  await page.locator(".fides-uc-ecosystem-summary__link").click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `ecosystem-${width}-${slug.slice(0, 12)}.png`) });
  const top = await section.evaluate((el) => Math.round(el.getBoundingClientRect().top));
  check(`${tag}: summary link scrolls the section into view`, top >= 0 && top < 200, String(top));
  await context.close();
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    for (const width of WIDTHS) {
      await fallbackChecks(browser, width);
      for (const slug of DETAILS) await ecosystemChecks(browser, width, slug);
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`# pass ${results.length - failed}\n# fail ${failed}`);
  if (failed) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
