/**
 * Read-only probe: H1, intro text, Learn/Explore reference texts and English stop-word share on NL routes outside Learn.
 * Output feeds staging/HANDOVER.md ("Remaining English headings outside Learn"). GET navigation only.
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/nl-outside-learn-probe.cjs   (env: PILOT_URL, WIDTHS)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const ROUTES = ["", "about-fides/", "manifesto/", "global-digital-trust-awards/", "fides-community-awards/", "updates/", "overview/", "credentials/", "organizations/", "personal-wallets/", "business-wallets/", "use-case/?usecase=reusable-kyc", "wallet/?wallet=waltid-business-wallet"];
const EN = /\b(the|and|with|for|your|you|of|to|is|are|in|on|how|what|find|explore|learn|choosing|wallet|results|filters|back)\b/gi;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
    const page = await ctx.newPage();
    for (const r of ROUTES) {
      const url = `${BASE}/nl/fides-design-pilot/${r}`;
      const resp = await page.goto(url, { waitUntil: "load", timeout: 60000 }).catch((e) => ({ status: () => e.message.slice(0, 40) }));
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(500);
      const d = await page.evaluate((reSrc) => {
        const re = new RegExp(reSrc, "gi");
        const main = document.querySelector("main") || document.body;
        const h1 = (main.querySelector("h1") || {}).textContent || "";
        const p = [...main.querySelectorAll("p")].map((x) => x.textContent.trim()).find((t) => t.length > 40) || "";
        const learn = [...main.querySelectorAll("a[href*='/learn/']")].map((a) => a.textContent.trim().replace(/\s+/g, " ")).filter(Boolean).slice(0, 8);
        const labels = [...main.querySelectorAll("label, legend, button, .fides-ds-card__label, [class*='chip'], [class*='badge']")].map((x) => x.textContent.trim().replace(/\s+/g, " ")).filter((t) => t && t.length < 60);
        const share = (t) => ((t.match(re) || []).length / Math.max(1, t.split(/\s+/).length));
        return { lang: document.documentElement.lang, h1, h1En: share(h1) >= 0.5, intro: p.slice(0, 140), introEn: share(p) >= 0.15, learn, labelsEn: [...new Set(labels.filter((t) => share(t) >= 0.5))].slice(0, 15) };
      }, EN.source);
      console.log(`@${width} ${r || "(home)"} [${typeof resp.status === "function" ? resp.status() : "?"}] ${JSON.stringify(d)}`);
    }
    await ctx.close();
  }
  await browser.close();
})();
