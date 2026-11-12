/**
 * Targeted checks (EN and NL, 1440 and 390 px, local pilot): the Wallet Readiness Workshop details box has the language row in
 * the right place, and the request forms (training and service request) no longer show the "Local pilot view" notice while
 * the form and its fields stay. Forms are shown, never submitted: every non-GET request is aborted and counted.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/workshop-language-checks.cjs
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const ORIGIN = process.env.PILOT_ORIGIN || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${String(detail).slice(0, 260)})` : ""}`);
}
const LANGS = {
  en: { base: `${ORIGIN}/fides-design-pilot`, label: "Workshop language", value: "Dutch. English available on request.", html: "en", order: ["For", "Format", "Workshop language", "Price", "Availability"] },
  nl: { base: `${ORIGIN}/nl/fides-design-pilot`, label: "Voertaal", value: "Nederlands. Op verzoek ook in het Engels.", html: "nl", order: ["Voor", "Opzet", "Voertaal", "Prijs", "Beschikbaarheid"] },
};
const NOTICE = /Local pilot view|Lokale pilotweergave|Nothing you enter here is sent or stored|Wat u hier invult, wordt niet verstuurd/;
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function open(page, url) {
  const r = await page.goto(url, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1200 }).then(() => true, () => false)) await deny.click();
  await page.waitForLoadState("networkidle").catch(() => {});
  return r;
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    let blocked = 0;
    page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource|Content Security Policy|the server responded/.test(m.text()) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.route("**/*", (route) => {
      const req = route.request();
      if (req.method() === "GET" || req.method() === "HEAD" || /action=trp_get_translations/.test(req.postData() || "")) return route.continue();
      blocked += 1;
      return route.abort();
    });
    for (const [lang, cfg] of Object.entries(LANGS)) {
      const tag = `${lang} @${width}`;
      const r = await open(page, `${cfg.base}/learn/sessions/wallet-readiness-workshop/`);
      check(`${tag}: workshop page answers 200`, r.status() === 200);
      check(`${tag}: <html lang> is ${cfg.html}`, (await page.locator("html").getAttribute("lang")).toLowerCase().startsWith(cfg.html));
      const rows = await page.$$eval(".fides-learn-details dl > div", (els) => els.map((e) => [e.querySelector("dt").innerText.trim(), e.querySelector("dd").innerText.trim()]));
      console.log(`#   ${tag} details: ${rows.map((x) => x.join(" · ")).join(" | ")}`);
      const hit = rows.find((x) => x[0] === cfg.label);
      check(`${tag}: row "${cfg.label} · ${cfg.value}" is shown exactly`, !!hit && hit[1] === cfg.value, JSON.stringify(rows));
      check(`${tag}: the row sits between the existing rows in order ${cfg.order.join(" > ")}`, rows.map((x) => x[0]).join("|") === cfg.order.join("|"), rows.map((x) => x[0]).join("|"));
      check(`${tag}: no horizontal overflow on the workshop page`, (await overflow(page)) <= 0);
      const box = await page.locator(".fides-learn-details").boundingBox();
      check(`${tag}: details box inside the viewport`, !!box && box.x >= 0 && box.x + box.width <= width + 1, JSON.stringify(box));
      for (const path of ["learn/sessions/request/?offering=wallet-readiness-workshop", "services/enquiry/"]) {
        await open(page, `${cfg.base}/${path}`);
        const text = await page.locator("main").innerText();
        check(`${tag} ${path.split("?")[0]}: no "Local pilot view" notice`, !NOTICE.test(text), (text.match(NOTICE) || [""])[0]);
        const form = page.locator("form").filter({ has: page.locator("input[type=email], input[name*=mail]") }).first();
        check(`${tag} ${path.split("?")[0]}: form and fields visible`, (await form.isVisible().catch(() => false)) && (await form.locator("input, textarea, select").count()) >= 3);
        check(`${tag} ${path.split("?")[0]}: no horizontal overflow`, (await overflow(page)) <= 0);
      }
    }
    console.log(`# aborted non-GET requests: ${blocked}`);
    check(`@${width}: no console errors`, errors.length === 0, errors.join(" | "));
    await context.close();
  }
  await browser.close();
  console.log(failures ? `# ${failures} failed` : "# all passed");
  process.exit(failures ? 1 : 0);
})();
