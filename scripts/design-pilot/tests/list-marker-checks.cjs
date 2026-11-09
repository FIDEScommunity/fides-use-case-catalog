/**
 * Editorial lists (wp-block-list without a fides- class) must show bullets or numbers.
 * The design-system reset removes list markers for navigation and card lists only.
 * Run through run-list-marker-checks.sh.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const PAGES = (process.env.PAGES || [
  "/fides-design-pilot/learn/sessions/",
  "/fides-design-pilot/learn/sessions/wallet-introduction/",
  "/fides-design-pilot/learn/sessions/wallet-readiness-workshop/",
  "/fides-design-pilot/learn/sessions/eudi-business-wallets-in-practice/",
  "/fides-design-pilot/learn/sessions/request/",
].join(",")).split(",");
let failures = 0;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  for (const width of [1280, 390]) {
    const page = await (await b.newContext({ viewport: { width, height: 900 } })).newPage();
    for (const u of PAGES) {
      await page.goto(BASE + u, { waitUntil: "load" });
      const lists = await page.evaluate(() => [...document.querySelectorAll("ul.wp-block-list, ol.wp-block-list, .fides-learn-request__aside ol")].filter((l) => !/fides-learn-rows|fides-ds-/.test(l.className)).map((l) => {
        const li = l.querySelector(":scope > li");
        return { type: getComputedStyle(l).listStyleType, marker: getComputedStyle(li, "::marker").content, pos: getComputedStyle(l).listStylePosition, left: l.getBoundingClientRect().left, liLeft: li.getBoundingClientRect().left };
      }));
      const bad = lists.filter((x) => x.type === "none" || x.marker === "none" || x.liLeft <= x.left + 8);
      const ok = lists.length > 0 && bad.length === 0;
      if (!ok) failures += 1;
      console.log(`${ok ? "ok" : "not ok"} - ${u}@${width}: ${lists.length} editorial list(s) show markers${ok ? "" : " " + JSON.stringify(bad)}`);
    }
  }
  await b.close();
  console.log(failures ? `FAILED: ${failures}` : "All list marker checks passed.");
  process.exit(failures ? 1 : 0);
})();
