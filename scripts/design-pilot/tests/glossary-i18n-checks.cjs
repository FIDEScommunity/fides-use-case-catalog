/**
 * Dutch (TranslatePress) checks for the glossary interface. Needs the temporary nl_NL test translation from
 * glossary-i18n-data.php, so run it through run-glossary-i18n-checks.sh. Glossary data stays English.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

async function open(page, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 2500 }).then(() => true, () => false)) await deny.click();
  await page.waitForSelector("[data-glossary-ready]", { state: "attached", timeout: 20000 });
}

const text = async (page, selector) => (await page.locator(selector).first().textContent()).replace(/\s+/g, " ").trim();
const count = (page) => text(page, ".fides-glossary__count");

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await open(page, "/nl/glossary/");
  const data = await page.evaluate(async () => {
    for (const url of window.fidesDsGlossary.sources) {
      try {
        const res = await fetch(url, { credentials: "omit" });
        const json = res.ok ? await res.json() : null;
        if (json && Array.isArray(json.terms) && json.terms.length) return json.terms;
      } catch (e) {
        /* next */
      }
    }
    return [];
  });
  check("data loads", data.length > 0);

  const nodes = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-glossary-strings] [data-s]")].map((n) => [n.dataset.s, n.textContent.trim()])));
  check("server delivers Dutch string nodes (TranslatePress found them)", nodes.countMany === "{n} termen" && nodes.searchLabel === "Zoek in de woordenlijst", JSON.stringify(nodes).slice(0, 200));
  check("placeholders survive in the translations", nodes.countQuery.includes("{count}") && nodes.countQuery.includes("{query}") && nodes.alias.includes("{alias}"), nodes.countQuery);

  check("search label", (await text(page, ".fides-glossary__form label")) === "Zoek in de woordenlijst");
  check("placeholder", (await page.getAttribute("#fides-glossary-search", "placeholder")) === "Zoek op term of afkorting");
  check("submit button", (await text(page, ".fides-glossary__submit")) === "Zoeken");
  check("letters label", (await text(page, ".fides-glossary__letters-label")) === "Blader op letter");
  check("heading and hint", (await text(page, ".fides-glossary__bar-title")) === "Termen in de woordenlijst" && (await text(page, ".fides-glossary__hint")) === "Kies een term om de definitie te lezen");
  check("count is plural Dutch", /^\d+ termen$/.test(await count(page)), await count(page));
  check("section note", (await text(page, ".fides-glossary__section-note")).startsWith("Termen die beginnen met"));
  const letterNames = await page.evaluate(() => [...document.querySelectorAll(".fides-glossary__letter-list button")].slice(0, 2).map((b) => b.textContent.replace(/\s+/g, " ").trim()));
  check("All and letter buttons carry Dutch hidden text", /^Alle termen \(\d+\)$/.test(letterNames[0]) && /^Termen die beginnen met [A-Z#] \(\d+\)$/.test(letterNames[1]), JSON.stringify(letterNames));

  // Query and letter combinations, singular and plural.
  const input = page.locator("#fides-glossary-search");
  await input.fill("a");
  await input.fill("ac");
  await input.fill("acc"); // several updates in a row: a dynamic translator must not blank the result
  check("count with query", /^\d+ term(en)? passend bij “acc”$/.test(await count(page)), await count(page));
  await page.locator('.fides-glossary__letter-list button[data-letter="A"]').click();
  check("count with query and letter", /^\d+ term(en)? passend bij “acc”, beginnend met A$/.test(await count(page)), await count(page));
  await input.fill("");
  await page.locator('.fides-glossary__letter-list button[data-letter="A"]').click();
  check("count with letter only", /^\d+ term(en)? beginnend met A$/.test(await count(page)), await count(page));
  await page.locator('.fides-glossary__letter-list button[data-letter=""]').click();

  let single = "";
  for (const term of data.slice(0, 40)) {
    await input.fill(term.name);
    if (/^1 term passend bij/.test(await count(page))) {
      single = term.name;
      break;
    }
  }
  check("singular form (1 term, no -en)", single !== "", "no single-hit query found");

  await input.fill("zzzzqqqq");
  check("empty state title", (await text(page, ".fides-glossary__empty-title")) === "Geen termen gevonden voor “zzzzqqqq”.");
  check("empty state help and clear", (await text(page, ".fides-glossary__empty p:nth-of-type(2)")).startsWith("Controleer de spelling") && (await text(page, "[data-glossary-empty-clear]")) === "Zoekopdracht wissen");
  await input.fill("");

  // Alias-only hit.
  const aliasTerm = data.find((t) => Array.isArray(t.aliases) && t.aliases.some((a) => a && !String(t.name).toLowerCase().includes(String(a).toLowerCase()) && !data.some((o) => o !== t && String(o.name).toLowerCase().includes(String(a).toLowerCase()))));
  if (aliasTerm) {
    const alias = aliasTerm.aliases.find((a) => a && !String(aliasTerm.name).toLowerCase().includes(String(a).toLowerCase()));
    await input.fill(alias);
    const note = await text(page, ".fides-glossary__alias");
    check("alias-only hit uses the translated pattern", note.startsWith("Ook bekend als "), note);
    await input.fill("");
  }

  // Open a term that has aliases and a source: panel strings Dutch, glossary data English.
  const full = data.find((t) => Array.isArray(t.aliases) && t.aliases.length && t.url && t.description);
  if (full) {
    await page.goto(`${BASE}/nl/glossary/?term=${encodeURIComponent(full.id)}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-glossary-ready]", { state: "attached", timeout: 20000 });
    const panel = await page.evaluate(() => {
      const p = document.querySelector(".fides-glossary__definition");
      return p ? { text: p.innerText.replace(/\s+/g, " "), title: p.querySelector("h3").textContent.trim(), body: p.querySelector(".fides-glossary__definition-text").textContent.trim(), permalink: p.querySelector("[data-glossary-permalink]").textContent.trim() } : null;
    });
    check("panel opens from the Dutch deeplink", Boolean(panel));
    if (panel) {
      check("panel labels are Dutch", panel.permalink === "Link naar deze term" && panel.text.includes("Ook bekend als:") && panel.text.includes("Bron:") && panel.text.includes("(opent in een nieuw tabblad)"), panel.text.slice(0, 200));
      check("term name and definition stay English source data", panel.title === String(full.name).trim() && panel.body === String(full.description).trim());
    }
  }

  // English page is untouched.
  await open(page, "/glossary/");
  check("English page keeps English strings", (await text(page, ".fides-glossary__form label")) === "Search glossary terms" && /^\d+ terms$/.test(await count(page)), await count(page));
  check("no script errors", errors.length === 0, errors.join("|"));

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
