const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const PAGES = (process.env.PAGES || "/fides-design-pilot/learn/sessions/wallet-introduction/").split(",");
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  for (const u of PAGES) {
    await p.goto(BASE + u, { waitUntil: "load" });
    const r = await p.evaluate(() => [...document.querySelectorAll("main ul, .entry-content ul, article ul, .fides-learn ul")].filter((u) => !u.closest("header, footer, nav, .fides-ds-menu")).map((u) => { const c = getComputedStyle(u); return { cls: u.className.slice(0, 60), parent: u.parentElement.className.slice(0, 40), lst: c.listStyleType, pad: c.paddingLeft, items: u.children.length, lstLi: u.children[0] ? getComputedStyle(u.children[0]).listStyleType + "/" + getComputedStyle(u.children[0]).display : "" }; }));
    console.log(u); r.forEach((x) => console.log("  ", JSON.stringify(x)));
  }
  await b.close();
})();
