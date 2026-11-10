/**
 * Audit: lists visible texts, aria-labels, titles, placeholders and hrefs on the Dutch Services
 * routes so English leftovers and links leaving /nl/ can be reviewed. Read-only; prints a report.
 * Env: WIDTHS (default "1440,390"), PILOT_URL, CHROME_PATH, PLAYWRIGHT_MODULE.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const P = "/nl/fides-design-pilot/services";
const ROUTES = [`${P}/`, `${P}/wallet-readiness-assessment/`, `${P}/enquiry/`, `${P}/enquiry/?offering=wallet-readiness-assessment`];
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const collect = () => {
  const out = { texts: [], attrs: [], hrefs: [] };
  const vis = (e) => { const s = getComputedStyle(e); return s.display !== "none" && s.visibility !== "hidden" && (e.offsetParent !== null || s.position === "fixed"); };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.replace(/\s+/g, " ").trim();
    const el = n.parentElement;
    if (t && el && !/^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) && !el.closest(".cmplz-cookiebanner,#cmplz-cookiebanner-container") && vis(el)) out.texts.push(t);
  }
  document.querySelectorAll("[aria-label],[title],[placeholder],[alt]").forEach((e) => {
    if (e.closest(".cmplz-cookiebanner")) return;
    ["aria-label", "title", "placeholder", "alt"].forEach((a) => { if (e.hasAttribute(a) && e.getAttribute(a).trim()) out.attrs.push(`${a}=${e.getAttribute(a).trim()} <${e.tagName.toLowerCase()}${e.className ? "." + String(e.className).split(" ")[0] : ""}>`); });
  });
  document.querySelectorAll("a[href]").forEach((a) => { if (!a.closest(".cmplz-cookiebanner")) out.hrefs.push(`${a.textContent.replace(/\s+/g, " ").trim().slice(0, 50)} -> ${a.getAttribute("href")}`); });
  return out;
};
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  for (const width of WIDTHS) {
    for (const route of ROUTES) {
      const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
      await page.goto(BASE + route, { waitUntil: "load" });
      const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
      if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
      const run = async (label) => {
        // Open the mobile menu so its texts are part of the audit.
        const r = await page.evaluate(collect);
        console.log(`\n=== ${width} ${route} ${label}`);
        console.log("TEXTS:\n" + [...new Set(r.texts)].join("\n"));
        console.log("ATTRS:\n" + [...new Set(r.attrs)].join("\n"));
        console.log("HREFS:\n" + [...new Set(r.hrefs)].join("\n"));
      };
      if (width < 1100) await page.evaluate(() => { const m = document.querySelector("#fides-ds-menu"); if (m) { m.hidden = false; m.querySelectorAll("details").forEach((d) => (d.open = true)); } });
      await run("initial");
      if (/enquiry/.test(route)) {
        await page.locator("[data-fides-learn-submit]").click();
        await page.waitForTimeout(300);
        await run("after empty submit (validation)");
        if (await page.locator("[data-fides-learn-remove-context]").isVisible().catch(() => false)) { await page.locator("[data-fides-learn-remove-context]").click(); await page.waitForTimeout(300); await run("after removing context"); }
      }
      await page.close();
    }
  }
  await browser.close();
})();
