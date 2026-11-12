/**
 * Diagnostic probe: lists the glossary term chips (.fides-ds-term) on the given Learn pages and opens each by keyboard.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/termchip-probe.cjs <path> [<path> ...]   (WIDTHS=1440,390)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    for (const p of process.argv.slice(2)) {
      await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" });
      const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
      if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
      const chips = await page.locator(".fides-ds-term").evaluateAll((els) => els.map((e) => ({ tag: e.tagName, text: e.textContent.trim().slice(0, 50), aria: e.getAttribute("aria-label"), term: e.getAttribute("data-fides-ds-term") })));
      console.log(`## ${p} @${width}: ${chips.length} chips`);
      for (const c of chips) console.log(JSON.stringify(c));
      const plain = await page.locator(".fides-learn__content, .fides-learn-article__body").first().evaluate((el) => el.innerText.length);
      let i = 0;
      for (const c of await page.locator(".fides-ds-term").all()) {
        if (!(await c.isVisible())) { console.log(`  chip ${i++}: hidden`); continue; }
        await c.scrollIntoViewIfNeeded();
        await c.focus();
        await page.keyboard.press("Enter");
        const dlg = page.locator("dialog[open], [role=dialog]:visible").first();
        const ok = await dlg.waitFor({ state: "visible", timeout: 2500 }).then(() => true, () => false);
        const txt = ok ? (await dlg.innerText()).replace(/\s+/g, " ").slice(0, 110) : "";
        console.log(`  chip ${i++} "${(await c.innerText()).trim().slice(0, 30)}": ${ok ? "opens: " + txt : "NO POPUP"}`);
        if (ok) { await page.keyboard.press("Escape"); await dlg.waitFor({ state: "hidden", timeout: 2000 }).catch(() => {}); }
      }
    }
    await ctx.close();
  }
  await browser.close();
})();
