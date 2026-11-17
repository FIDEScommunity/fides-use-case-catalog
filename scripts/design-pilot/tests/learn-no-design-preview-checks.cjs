/**
 * "Design preview" must not appear anywhere in Learn (text or generated label), EN and NL.
 *  - Every manifest page at 1440 px: the visible text and the ::after content of every row title carry no "Design preview"
 *    (nor its Dutch label "Ontwerpvoorbeeld").
 *  - Topics at 1440 and 390 px: the "Wallets & credentials" title links to its overview: no label, its two deepening links
 *    are present, and the row is not taller than the other text rows by more than one extra text line.
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/learn-no-design-preview-checks.cjs   (env: PILOT_URL, LOCALES, ALL_WIDTH)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const manifest = require("../learn/manifest.json").pages;

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const LOCALES = (process.env.LOCALES || "EN,NL").split(",");
const ALL_WIDTH = Number(process.env.ALL_WIDTH || 1440);
const ROUTES = manifest.map((p) => (p.tree === "start" ? `start/${p.path}` : p.tree === "services" ? `services/${p.path}` : `learn/${p.path}`.replace(/\/$/, "")));
const LABEL = /Design preview|Ontwerpvoorbeeld/i;

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${String(detail).slice(0, 240)})` : ""}`);
}

async function open(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (err) {
    console.log(`# retry ${url}: ${err.message.split("\n")[0]}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  }
  await page.waitForLoadState("networkidle").catch(() => {});
}

const scan = (page) => page.evaluate(() => {
  const text = document.querySelector("main") ? document.querySelector("main").innerText : document.body.innerText;
  const pseudo = [...document.querySelectorAll(".fides-learn-rows__title, .fides-learn-planned-tag, .fides-learn-planned em")]
    .map((el) => getComputedStyle(el, "::after").content)
    .filter((c) => c && c !== "none" && c !== "normal");
  return { text, pseudo };
});

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const mk = async (width) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
    return { ctx, page: await ctx.newPage() };
  };
  for (const loc of LOCALES) {
    const root = `${BASE}${loc === "NL" ? "/nl" : ""}/fides-design-pilot`;
    const { ctx, page } = await mk(ALL_WIDTH);
    const hits = [];
    for (const route of ROUTES) {
      await open(page, `${root}/${route}/`);
      const s = await scan(page);
      if (LABEL.test(s.text) || s.pseudo.some((c) => LABEL.test(c))) hits.push(`${route}: ${(s.text.match(/.{0,40}(Design preview|Ontwerpvoorbeeld).{0,20}/i) || s.pseudo)[0]}`);
    }
    check(`${loc} @${ALL_WIDTH}: no "Design preview" on ${ROUTES.length} manifest pages`, hits.length === 0, hits.join(" || "));
    await ctx.close();

    for (const width of [1440, 390]) {
      const t = await mk(width);
      await open(t.page, `${root}/learn/topics/`);
      const row = await t.page.evaluate(() => {
        const li = [...document.querySelectorAll(".fides-learn-rows > li")].find((n) => /Wallets (&|en) credentials/.test(n.querySelector(".fides-learn-rows__title")?.textContent || ""));
        if (!li) return null;
        const after = getComputedStyle(li.querySelector(".fides-learn-rows__title"), "::after");
        const others = [...document.querySelectorAll(".fides-learn-rows > li")].filter((n) => n !== li).map((n) => Math.round(n.getBoundingClientRect().height));
        return {
          label: after.content,
          links: [...li.querySelectorAll(".fides-learn-rows__text a")].map((a) => a.getAttribute("href")),
          height: Math.round(li.getBoundingClientRect().height),
          maxOther: Math.max(...others),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      check(`${loc} Topics @${width}: Wallets & credentials row found`, !!row);
      if (row) {
        check(`${loc} Topics @${width}: the row has no label`, row.label === "none" || row.label === "normal" || row.label === '""', row.label);
        check(`${loc} Topics @${width}: both deepening links stay (${row.links.length})`, row.links.length === 2 && row.links.every((h) => /what-is-a-(digital-wallet|credential)/.test(h)), row.links.join(" "));
        check(`${loc} Topics @${width}: row height ${row.height}px is compact (other rows up to ${row.maxOther}px)`, row.height <= row.maxOther + 30, `${row.height} vs ${row.maxOther}`);
        check(`${loc} Topics @${width}: no horizontal overflow`, row.overflow <= 0, row.overflow);
      }
      await t.ctx.close();
    }
  }
  await browser.close();
  console.log(failures ? `\n${failures} failed` : "\nall ok");
  process.exit(failures ? 1 : 0);
})();
