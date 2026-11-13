/**
 * Report (never fails): lists every sentence that tests/nl-route-checks.cjs counts as "untranslated English" on the given Dutch routes,
 * with the nearest element context so the sentence can be classified (glossary definition, catalogue title, other).
 * It uses the same filter as the route check (text longer than 30 characters containing the, your, with, this, that, you, are, will, from, which, should).
 * Run: NL_PATHS=learn/topics/around-the-world/india,... PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/nl-english-remains-report.cjs   (WIDTH=1440)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const ORIGIN = process.env.PILOT_ORIGIN || "http://localhost:10088";
const NL = `${ORIGIN}/nl/fides-design-pilot`;
const WIDTH = Number(process.env.WIDTH || 1440);
const ENGLISH_WORDS = /\b(the|your|with|this|that|you|are|will|from|which|should)\b/;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: WIDTH, height: 900 } })).newPage();
  await page.route("**/*", (route) => (["GET", "HEAD"].includes(route.request().method()) || /action=trp_get_translations/.test(route.request().postData() || "") ? route.continue() : route.abort()));
  for (const path of (process.env.NL_PATHS || "").split(",").filter(Boolean)) {
    await page.goto(`${NL}/${path}/`, { waitUntil: "domcontentloaded" });
    const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
    if (await deny.waitFor({ state: "visible", timeout: 1200 }).then(() => true, () => false)) await deny.click();
    await page.waitForLoadState("networkidle").catch(() => {});
    const found = await page.evaluate((src) => {
      const re = new RegExp(src);
      const skip = "#cmplz-cookiebanner-container, .cmplz-cookiebanner, .cmplz-manage-consent, .fides-assistant, .fides-learn-sources, [data-fides-ssr], script, style, noscript";
      const out = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const t = n.nodeValue.replace(/\s+/g, " ").trim();
        const el = n.parentElement;
        if (!t || t.length <= 30 || !el || el.closest(skip)) continue;
        if (!re.test(t.toLowerCase().replace(/d-you/g, ""))) continue;
        if (/^(Digital Certificate of Good Conduct|EUDI & Business Wallets in Practice)/.test(t)) continue;
        const chain = [];
        for (let e = el, i = 0; e && i < 5 && e !== document.body; e = e.parentElement, i++) chain.push(e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : ""));
        out.push({ text: t, ctx: chain.join(" < ") });
      }
      return out;
    }, ENGLISH_WORDS.source);
    const seen = new Set();
    console.log(`## ${path}: ${found.filter((f) => !seen.has(f.text) && seen.add(f.text)).length} sentence(s)`);
    seen.clear();
    for (const f of found) { if (seen.has(f.text)) continue; seen.add(f.text); console.log(`- [${f.ctx}] ${f.text}`); }
  }
  await browser.close();
})();
