/**
 * Targeted checks for glossary 1.12.0: the eIDAS duplicates (QEAA, QERDS, QESeal and the other trust-service terms),
 * the merged pairs (SD-JWT-VC, ISO 18013-5/-7, VCDM 2.0, mDL/mDoc), hidden "Other", and legacy ids (old ?term= ids).
 * Data level: one glossary term per concept, abbreviation and full name both find it, every key the catalog popups
 * look up still resolves. Browser level (pilot glossary page, no replaced requests): search results, old and new
 * ?term= deep links, vct, and the real popup renderer (FidesCatalogUI.openVocabularyModal) fed from vocabulary.json
 * the way a catalog [i] button does. Pilot catalogs fetch vocabulary.json from GitHub main, so the popup is fed
 * from the local source file instead of the network.
 * Run: PLAYWRIGHT_MODULE=... CHROME_PATH=... node tests/glossary-duplicates-checks.cjs
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const ROOT = path.resolve(__dirname, "../../../..");
const GLOSSARY_FILE = process.env.GLOSSARY_FILE || path.join(ROOT, "wordpress/wp-content/plugins/fides-vocabulary-glossary/data/glossary-aggregated.json");
const VOCAB_FILE = process.env.VOCAB_FILE || "/Users/victorvanderhulst/Projects/interop-profiles/data/vocabulary.json";
// Keys the shipped catalog code passes to the popup (tiles WALLET_OPTION_TO_VOCAB eidasTrustService + organization-catalog).
const MERGED = { "sd-jwt-vc": ["SD-JWT-VC", ["sd_jwt_vc", "SD-JWT VC"]], "iso-18013-5": ["ISO 18013-5", ["iso18013_5"]], "iso-18013-7": ["ISO 18013-7", ["iso18013_7", "ISO mDL remote"]], "vcdm-2-0": ["VCDM 2.0", ["vcdm20", "vcdm_2_0"]], "mdl-mdoc": ["mDL/mDoc", ["mdoc", "mDoc"]] };
const LEGACY = { "sd-jwt-vc-2": "sd-jwt-vc", "iso18013-5": "iso-18013-5", "iso18013-7": "iso-18013-7", vcdm20: "vcdm-2-0", mdoc: "mdl-mdoc", qeaa: "qualified-electronic-attestation-of-attributes", qerds: "qualified-electronic-registered-delivery-service" };
const POPUP_KEYS = ["QESig", "QESeal", "QTimestamp", "QERDS", "QWAC", "QEArch", "QVal", "QPres", "QPresSeal", "QPresSig", "QValSeal", "QValSig", "QRemSeal", "QRemSig", "QEAA", "other", "Other", "sd_jwt_vc", "iso18013_5", "iso18013_7", "vcdm20", "mdoc"];
let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${String(detail).slice(0, 200)})` : ""}`);
}
const norm = (s) => String(s).toLowerCase();
const matches = (t, q) => [t.name, t.key, t.description, ...(t.aliases || [])].join(" ").toLowerCase().includes(norm(q));
(async () => {
  const data = JSON.parse(fs.readFileSync(GLOSSARY_FILE, "utf8"));
  const vocab = JSON.parse(fs.readFileSync(VOCAB_FILE, "utf8")).terms;
  const byId = Object.fromEntries(data.terms.map((t) => [t.id, t]));
  check("data: qeaa and qerds are not listed separately", !byId.qeaa && !byId.qerds);
  check("data: QEAA and QERDS are aliases of the long terms", byId["qualified-electronic-attestation-of-attributes"].aliases.includes("QEAA") && byId["qualified-electronic-registered-delivery-service"].aliases.includes("QERDS") && byId["qualified-electronic-registered-delivery-service"].aliases.includes("Q_ERDS"));
  check("data: QESeal certificate and Qualified Electronic Seal are different terms with different labels", byId.qeseal && byId["qualified-electronic-seal"] && !byId["qualified-electronic-seal"].aliases.includes("QESeal") && byId.qeseal.aliases.includes("QESeal"));
  for (const k of POPUP_KEYS.concat(["eidasTrustServices"])) check(`popup compat: vocabulary key ${k} still has a description`, vocab[k] && vocab[k].description);
  check("data: 344 terms (glossary 1.12.0)", data.terms.length === 344, String(data.terms.length));
  check("data: Other is hidden (ids other and other-2 are not listed, keys stay for popups)", !byId.other && !byId["other-2"] && vocab.other && vocab.Other);
  for (const [old, now] of Object.entries(LEGACY)) check(`data: legacy id ${old} maps to ${now}`, !byId[old] && byId[now] && byId[now].legacyIds.includes(old));
  for (const [id, [name, labels]] of Object.entries(MERGED)) check(`data: ${id} is one term named ${name} reachable by ${labels.join(", ")} (alias or key)`, byId[id] && byId[id].name === name && labels.every((l) => byId[id].aliases.includes(l) || byId[id].key === l));
  const seen = new Map();
  let dup = [];
  for (const t of data.terms) for (const l of new Set([t.name, t.key, ...t.aliases].map(norm))) { if (seen.has(l) && !["fides"].includes(l)) dup.push(l); seen.set(l, t.id); }
  check("data: no new label resolves to two terms", dup.length === 0, dup.join(", "));
  check("data: all 16 eIDAS short terms except the 2 duplicates are listed with a source URL", ["eidastrustservices", "qearch", "qeseal", "qesig", "qpres", "qpressig", "qpresseal", "qremseal", "qremsig", "qtimestamp", "qval", "qvalseal", "qvalsig", "qwac"].every((id) => byId[id] && byId[id].url));

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  for (const width of WIDTHS) {
    const tag = `glossary @${width}`;
    const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const github = [];
    page.on("request", (r) => { if (/raw\.githubusercontent\.com/.test(r.url())) github.push(r.url()); });
    const open = async (url) => {
      const r = await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
      const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
      if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
      return r;
    };
    let r = await open("/glossary/");
    check(`${tag}: page answers 200`, r.status() === 200);
    await page.waitForSelector("[data-term-id]", { timeout: 8000 });
    check(`${tag}: lists ${data.terms.length} terms`, (await page.locator("[data-term-id]").count()) === data.terms.length);
    const search = page.locator('input[placeholder="Search by term or abbreviation"]');
    const visibleIds = async () => page.locator("[data-term-id]:visible").evaluateAll((els) => els.map((e) => e.getAttribute("data-term-id")));
    const expectOne = { QEAA: "qualified-electronic-attestation-of-attributes", "Qualified Electronic Attestation of Attributes": "qualified-electronic-attestation-of-attributes", QERDS: "qualified-electronic-registered-delivery-service", Q_ERDS: "qualified-electronic-registered-delivery-service", "Qualified Electronic Registered Delivery Service": "qualified-electronic-registered-delivery-service", QESeal: "qeseal", "Qualified Electronic Seal Certificate": "qeseal", QSeal: "qualified-electronic-seal", QESig: "qesig", "Qualified Electronic Signature Certificate": "qesig", QWAC: "qwac" };
    for (const [q, id] of Object.entries(expectOne)) {
      await search.fill(q);
      await page.waitForTimeout(350);
      const ids = await visibleIds();
      const expected = data.terms.filter((t) => matches(t, q)).map((t) => t.id);
      check(`${tag}: search "${q}" shows ${id} once, and nothing the data would not match`, ids.includes(id) && ids.filter((i) => i === id).length === 1 && ids.every((i) => expected.includes(i)), ids.join(","));
    }
    for (const q of ["QEAA", "QERDS"]) { await search.fill(q); await page.waitForTimeout(300); const names = (await page.locator("[data-term-id]:visible").allInnerTexts()).map((n) => n.trim()).filter((n) => /^Q(EAA|ERDS)$/i.test(n)); check(`${tag}: no separate "${q}" card`, names.length === 0, names.join(",")); }
    for (const [id, [name, labels]] of Object.entries(MERGED)) for (const q of [name, ...labels]) {
      await search.fill(q);
      await page.waitForTimeout(300);
      const names = (await page.locator("[data-term-id]:visible .fides-glossary__name").allInnerTexts()).map((n) => n.trim());
      check(`${tag}: search "${q}" shows ${name} once and no separate duplicate`, names.filter((n) => n === name).length === 1 && !names.some((n) => ["sd_jwt_vc", "iso18013_5", "iso18013_7", "vcdm20", "mdoc"].includes(n)), names.join("|"));
    }
    for (const q of ["Other"]) { await search.fill(q); await page.waitForTimeout(300); const names = (await page.locator("[data-term-id]:visible .fides-glossary__name").allInnerTexts()).map((n) => n.trim()); check(`${tag}: search "${q}" lists no card named Other`, !names.includes("Other"), names.join("|")); }
    await search.fill("");
    for (const [old, now] of Object.entries(LEGACY)) {
      await open(`/glossary/?term=${old}`);
      await page.waitForSelector(`li.fides-glossary__item[data-term-id="${now}"].is-open`, { timeout: 8000 }).then(() => check(`${tag}: old id ?term=${old} opens ${now}`, true), () => check(`${tag}: old id ?term=${old} opens ${now}`, false));
      check(`${tag}: old id ?term=${old} rewrites the address to ${now}`, new URL(page.url()).searchParams.get("term") === now, page.url());
    }
    for (const id of ["other", "other-2"]) {
      await open(`/glossary/?term=${id}`);
      await page.waitForSelector("[data-term-id]", { timeout: 8000 });
      check(`${tag}: hidden id ?term=${id} opens nothing and the page works`, (await page.locator("li.fides-glossary__item.is-open").count()) === 0 && (await page.locator("[data-term-id]").count()) === data.terms.length);
    }
    for (const id of ["qualified-electronic-attestation-of-attributes", "qualified-electronic-registered-delivery-service", "qeseal", "qesig", "verifiable-credential-type"]) {
      await open(`/glossary/?term=${id}`);
      await page.waitForSelector(`li.fides-glossary__item[data-term-id="${id}"].is-open`, { timeout: 8000 }).then(() => check(`${tag}: deep link ?term=${id} opens`, true), () => check(`${tag}: deep link ?term=${id} opens`, false));
    }
    // Popup renderer fed from vocabulary.json like a catalog [i] button (classic wallet catalog page loads FidesCatalogUI).
    await open("/wallet-catalog/");
    await page.waitForFunction(() => window.FidesCatalogUI && window.FidesCatalogUI.openVocabularyModal, null, { timeout: 15000 });
    for (const key of ["QEAA", "QERDS", "QESeal", "QESig"]) {
      const e = vocab[key];
      await page.evaluate(([k, entry]) => window.FidesCatalogUI.openVocabularyModal({ id: k, name: k, description: entry.description, url: entry.url || "", aliases: entry.aliases || [] }, { nested: true, showShare: false }), [key, e]);
      const dlg = page.locator(".fides-modal--vocabulary").last();
      await dlg.waitFor({ state: "visible", timeout: 3000 });
      const text = await dlg.innerText();
      check(`${tag}: popup for ${key} shows its definition`, text.includes(e.description.slice(0, 40)), text);
      if (key === "QEAA" || key === "QERDS") {
        const longText = data.terms.find((t) => t.aliases.includes(key)).description;
        check(`${tag}: popup for ${key} shows the same definition as the glossary term`, text.replace(/\s+/g, " ").includes(longText));
      }
      check(`${tag}: popup ${key} fits the viewport`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
      await page.keyboard.press("Escape");
      await dlg.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
    }
    check(`${tag}: no script errors`, errors.length === 0, errors.join(" | "));
  }
  await browser.close();
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
})();
