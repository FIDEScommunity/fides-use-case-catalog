const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const fs = require("fs");
const BASE = "http://localhost:10088/fides-design-pilot/";
const COOKIES = Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: "http://localhost:10088" }));
const urls = process.env.URLFILE ? fs.readFileSync(process.env.URLFILE, "utf8").split("\n").filter(Boolean) : process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(COOKIES);
  for (const u of urls) {
    const p = await ctx.newPage();
    await p.goto(BASE + u, { waitUntil: "networkidle" }).catch(() => {});
    await p.waitForTimeout(1000);
    const r = await p.evaluate(() => {
      const body = document.body.innerText.replace(/\s+/g, " ");
      const cnt = (body.match(/\b\d+\s+(of\s+\d+\s+)?(issuers?|relying parties|credential types?|credentials?|organi[sz]ations?|wallets?|results?)\b/gi) || []).slice(0, 3);
      const cards = document.querySelectorAll(".fides-ds-card").length;
      const pills = [...new Set([...document.querySelectorAll("[class*=pill]")].map((e) => e.textContent.replace(/\s+/g, " ").trim()).filter(Boolean))].slice(0, 6);
      return { cnt, cards, pills, search: location.search.slice(0, 80) };
    });
    console.log(u.slice(0, 70), JSON.stringify(r));
    await p.close();
  }
  await b.close();
})();
