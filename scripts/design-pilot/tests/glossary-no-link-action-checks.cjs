/**
 * Glossary page: the "Link to this term" action is gone from open terms, the address bar still carries ?term=<id>.
 * Behaviour kept from before (glossary.js syncUrl uses history.replaceState only, no pushState, no popstate handler):
 *   opening and switching set ?term=<id>, closing removes the parameter, a reload or a deeplink reopens the term,
 *   a legacy id opens the current term and rewrites the address, Back leaves the page (no extra history entry).
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/glossary-no-link-action-checks.cjs   (env: PILOT_URL, WIDTHS)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const PAGES = { EN: "/glossary/", NL: "/nl/glossary/" };
const LEGACY = ["sd-jwt-vc-2", "sd-jwt-vc"];
const ACTION = /link to this term|link naar (deze|dit)|link copied|link gekopieerd|gekopieerd|permalink/i;

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

async function ready(page) {
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
  await page.waitForSelector("[data-glossary-ready]", { state: "attached", timeout: 20000 });
}
const termParam = (page) => new URL(page.url()).searchParams.get("term");
const openId = (page) => page.evaluate(() => { const i = document.querySelector(".fides-glossary__item.is-open"); return i ? i.getAttribute("data-term-id") : null; });

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  for (const [loc, path] of Object.entries(PAGES)) {
    for (const width of WIDTHS) {
      const tag = `${loc} @${width}`;
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.route("**/*", (r) => (new URL(r.request().url()).host === new URL(BASE).host ? r.continue() : r.abort()));

      // History setup for the Back check: an earlier page, then the glossary.
      await page.goto(`${BASE}/overview/`, { waitUntil: "domcontentloaded" });
      const before = page.url();
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await ready(page);
      const ids = await page.locator(".fides-glossary__item").evaluateAll((els) => els.slice(0, 2).map((e) => e.getAttribute("data-term-id")));
      const [a, b] = ids;
      const toggle = (id) => page.locator(`.fides-glossary__item[data-term-id="${id}"] .fides-glossary__toggle`);

      // (a) open: no action anywhere in the open term.
      await toggle(a).click();
      const panel = page.locator(".fides-glossary__panel");
      await panel.waitFor();
      const info = await panel.evaluate((p) => {
        const attrs = [...p.querySelectorAll("*")].flatMap((e) => [e.getAttribute("aria-label") || "", e.getAttribute("title") || "", e.className && e.className.baseVal === undefined ? String(e.className) : ""]);
        const kids = [...p.querySelectorAll(".fides-glossary__definition > *")];
        const empty = kids.filter((k) => k.textContent.trim() === "" && !k.querySelector("img,svg"));
        const ids = [...p.querySelectorAll("[id]")].map((e) => e.id);
        const refs = [...p.querySelectorAll("[aria-controls],[aria-describedby],[aria-labelledby]")].flatMap((e) => ["aria-controls", "aria-describedby", "aria-labelledby"].map((n) => e.getAttribute(n)).filter(Boolean));
        const dangling = refs.filter((r) => !document.getElementById(r));
        const d = p.querySelector(".fides-glossary__definition");
        const last = kids[kids.length - 1];
        return { text: p.innerText, attrs: attrs.join(" "), empty: empty.length, dangling: dangling.length, status: p.querySelectorAll('[role="status"]').length,
          tail: Math.round(d.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom), title: p.querySelector("h3").textContent.trim(), hasText: !!p.querySelector(".fides-glossary__definition-text"),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      check(`${tag}: open term shows no "Link to this term" action (text, aria-label, title, class)`, !ACTION.test(info.text) && !ACTION.test(info.attrs), info.text.slice(0, 80));
      check(`${tag}: no leftover live region, no empty child, no dangling aria reference`, info.status === 0 && info.empty === 0 && info.dangling === 0, JSON.stringify(info));
      check(`${tag}: definition and title still shown, no empty gap below (tail ${info.tail}px)`, info.title.length > 0 && info.hasText && info.tail <= 40, JSON.stringify(info));
      check(`${tag}: no horizontal overflow`, info.overflow <= 0, String(info.overflow));

      // (b) address bar.
      check(`${tag}: address bar shows ?term=${a} after opening`, termParam(page) === a, page.url());
      // switch
      await toggle(b).click();
      await page.waitForFunction((id) => document.querySelector(".fides-glossary__item.is-open")?.getAttribute("data-term-id") === id, b);
      check(`${tag}: switching term updates the address (${b})`, termParam(page) === b && (await openId(page)) === b, page.url());
      // (c) reload
      await page.reload({ waitUntil: "domcontentloaded" });
      await ready(page);
      check(`${tag}: reload reopens the same term`, (await openId(page)) === b && termParam(page) === b, `${await openId(page)} ${page.url()}`);
      check(`${tag}: reloaded term panel is visible`, await page.locator(".fides-glossary__panel").isVisible());
      // close
      await toggle(b).click();
      check(`${tag}: closing removes ?term and the panel`, termParam(page) === null && (await page.locator(".fides-glossary__panel").count()) === 0, page.url());
      // (d) history: replaceState only, so Back leaves the glossary, Forward comes back to the last address
      await toggle(a).click();
      const entries = await page.evaluate(() => history.length);
      await page.goBack({ waitUntil: "domcontentloaded" });
      check(`${tag}: Back leaves the glossary page as before (no extra history entry)`, page.url() === before, page.url());
      await page.goForward({ waitUntil: "domcontentloaded" });
      await ready(page);
      check(`${tag}: Forward restores the page with the same term open, address and panel consistent`, (await openId(page)) === a && termParam(page) === a && (await page.locator(".fides-glossary__panel").count()) === 1, `${await openId(page)} ${page.url()}`);
      check(`${tag}: history length unchanged by opening (${entries})`, entries <= 3, String(entries));
      // (e) legacy id
      await page.goto(`${BASE}${path}?term=${LEGACY[0]}`, { waitUntil: "domcontentloaded" });
      await ready(page);
      await page.waitForSelector(".fides-glossary__item.is-open", { timeout: 5000 }).catch(() => {});
      check(`${tag}: legacy ?term=${LEGACY[0]} opens ${LEGACY[1]} and rewrites the address`, (await openId(page)) === LEGACY[1] && termParam(page) === LEGACY[1], `${await openId(page)} ${page.url()}`);
      // (f)
      check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));
      await context.close();
    }
  }
  await browser.close();
  console.log(failures ? `${failures} check(s) failed` : "all checks passed");
  process.exit(failures ? 1 : 0);
}
main();
