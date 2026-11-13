/**
 * Targeted Dutch checks for "Receiving information in a wallet" and "What should a service check when receiving a credential?" (13 November 2026).
 * Per route and width: article body and lead have no English paragraphs, no je/jij/jouw/jou/jouwe, links keep /nl/, expected Dutch openers are present.
 * Glossary definitions (.fides-learn-terms-box) are out of scope and ignored here.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/nl-two-articles-checks.cjs   (WIDTHS=1440,390)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const ORIGIN = process.env.PILOT_ORIGIN || "http://localhost:10088";
const NL = `${ORIGIN}/nl/fides-design-pilot`;
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const ROUTES = {
  "learn/topics/for-you/receiving-information-in-a-wallet": ["Een school, overheidsinstantie", "Voordat u iets toevoegt", "Stel dat u een cursus", "De organisatie die de informatie verstrekt, heet uitgever (issuer) (definitie)."],
  "learn/topics/for-businesses/what-should-a-service-check-when-receiving-a-credential": ["Controleer het credential", "Beslis of de informatie voldoende is", "Maak het verzoek duidelijk", "De basiscontroles staan in Gegevens uit een wallet ontvangen", "als statusgegevens (definitie) aanwezig zijn", "zie Hoe kan iemand namens een organisatie handelen?."],
};
const ENGLISH = /\b(the|your|with|this|that|you|are|will|from|which|should)\b/;
const INFORMAL = /\b(je|jij|jouw|jou|jouwe)\b/i;
let failures = 0;
const check = (name, ok, d) => { if (!ok) failures++; console.log(`${ok ? "ok" : "not ok"} - ${name}${!ok && d ? ` (${String(d).slice(0, 240)})` : ""}`); };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
    await page.route("**/*", (r) => (["GET", "HEAD"].includes(r.request().method()) || /action=trp_get_translations/.test(r.request().postData() || "") ? r.continue() : r.abort()));
    for (const [path, expected] of Object.entries(ROUTES)) {
      const tag = `${path.split("/").pop()} @${width}`;
      await page.goto(`${NL}/${path}/`, { waitUntil: "domcontentloaded" });
      const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
      if (await deny.waitFor({ state: "visible", timeout: 1200 }).then(() => true, () => false)) await deny.click();
      await page.waitForLoadState("networkidle").catch(() => {});
      const d = await page.evaluate(() => {
        const main = document.querySelector("main");
        const blocks = [...main.querySelectorAll("p, li, h1, h2, h3, dt")].filter((e) => !e.closest(".fides-learn-terms-box, .fides-learn-sources, [data-fides-ssr]")).map((e) => e.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
        const hrefs = [...main.querySelectorAll("a[href]")].map((a) => a.href).filter((h) => /\/fides-design-pilot\/(learn|services|start|personal-wallets|credentials)(\/|$)/.test(h));
        return { blocks, hrefs, lang: document.documentElement.lang };
      });
      check(`${tag}: lang nl`, /^nl/.test(d.lang));
      check(`${tag}: no English paragraphs in body or lead`, !d.blocks.some((t) => t.length > 30 && ENGLISH.test(t.toLowerCase())), d.blocks.filter((t) => t.length > 30 && ENGLISH.test(t.toLowerCase())).join(" | "));
      check(`${tag}: no je/jij/jouw`, !d.blocks.some((t) => INFORMAL.test(t)), d.blocks.filter((t) => INFORMAL.test(t)).join(" | "));
      check(`${tag}: internal route links keep /nl/`, d.hrefs.length > 0 && d.hrefs.every((h) => /\/nl\/fides-design-pilot\//.test(h)), d.hrefs.filter((h) => !/\/nl\//.test(h)).join(", "));
      const all = d.blocks.join(" ");
      for (const e of expected) check(`${tag}: contains "${e.slice(0, 50)}"`, all.includes(e), "missing");
    }
    await page.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
