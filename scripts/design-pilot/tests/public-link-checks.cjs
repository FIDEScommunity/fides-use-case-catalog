/**
 * Read-only checks of the real public destinations behind credential catalog links.
 *
 * Collects the links the local classic modal and pilot detail page build for Age
 * Verification, plus the public wallet fallback (PUBLIC_LINKS, from public-link-urls.php),
 * then opens each on fides.community: final URL after redirects, HTML document, and the
 * selected record (modal title) or filter (visible cards). A local relying-party click
 * without stub checks Back to the pilot page. Nothing is submitted or changed.
 * Separate from run-credential-checks.sh, which stays offline with its labelled stub.
 *
 * Run: scripts/design-pilot/tests/run-public-link-checks.sh
 */
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);

const BASE = (process.env.PILOT_URL || "http://localhost:10088").replace(/\/$/, "");
const OUT = process.env.SCREENS_DIR;
const AV = "cred:eu:age-verification";
const CLASSIC_LISTING = `${BASE}/credential-catalog/`;
const DETAIL = `${BASE}/fides-design-pilot/credential/?credential=${encodeURIComponent(AV)}`;
const PUBLIC = JSON.parse(process.env.PUBLIC_LINKS || "[]");

let pass = 0;
const fail = [];
const rows = [];
function check(name, ok, detail) {
  if (ok) {
    pass++;
    console.log(`ok - ${name}`);
  } else {
    fail.push(name);
    console.log(`not ok - ${name}${detail ? ` (${detail})` : ""}`);
  }
}

async function newContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const consent = { "banner-status": "dismissed", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" };
  const cookies = [];
  for (const url of [BASE, "https://fides.community"]) {
    for (const [name, value] of Object.entries(consent)) cookies.push({ name: `cmplz_${name}`, value, url });
  }
  await context.addCookies(cookies);
  return context;
}

function idsOf(href, param) {
  const value = new URL(href).searchParams.get(param);
  return value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

/** Open a public link and check where it really ends up. */
async function verify(context, link) {
  const page = await context.newPage();
  const tag = `${link.label}`;
  let response = null;
  try {
    response = await page.goto(link.href, { waitUntil: "domcontentloaded", timeout: 60000 });
  } catch (error) {
    check(`${tag}: loads`, false, String(error.message || error).slice(0, 160));
    await page.close();
    return;
  }
  const finalUrl = page.url();
  const type = (response && response.headers()["content-type"]) || "";
  const status = response ? response.status() : 0;
  const host = link.host || "fides.community";
  check(`${tag}: ends on ${host} HTML (${status})`, status === 200 && /^text\/html/.test(type) && new URL(finalUrl).hostname === host && !/\/app\/uploads\//.test(finalUrl), `${status} ${type} ${finalUrl}`);

  const attr = { rp: "data-rp-id", issuer: "data-issuer-id", wallet: "data-wallet-id" }[link.kind];
  let outcome = "";
  if (link.ids.length === 1 && link.name) {
    const title = await page
      .waitForFunction(() => {
        const t = document.querySelector(".fides-modal-overlay .fides-modal-title");
        return t && t.offsetParent !== null ? t.textContent.replace(/\s+/g, " ").trim() : "";
      }, null, { timeout: 30000 })
      .then((h) => h.jsonValue())
      .catch(() => "");
    const docTitle = await page.title();
    check(`${tag}: opens the ${link.name} record`, title.includes(link.name), `modal "${title}" · title "${docTitle}" · ${finalUrl}`);
    outcome = title ? `record "${title}"` : "no record";
  } else {
    await page.waitForFunction((a) => document.querySelectorAll(`[${a}]`).length > 0, attr, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const shown = await page.evaluate((a) => [...new Set([...document.querySelectorAll(`[${a}]`)].filter((n) => n.offsetParent !== null).map((n) => n.getAttribute(a)))], attr);
    const expected = new Set(link.ids);
    const stray = shown.filter((id) => !expected.has(id));
    const missing = link.ids.filter((id) => !shown.includes(id));
    const param = new URL(link.href).searchParams.has("rps") ? "rps" : new URL(link.href).searchParams.has("issuers") ? "issuers" : "wallets";
    const kept = idsOf(finalUrl, param);
    check(`${tag}: filter keeps all ${link.ids.length} ids in the final URL`, kept.length === link.ids.length && link.ids.every((id) => kept.includes(id)), finalUrl);
    check(`${tag}: shows only the filtered records`, shown.length > 0 && stray.length === 0, `stray ${stray.join(",")}`);
    check(`${tag}: shows every filtered record`, missing.length === 0, `missing ${missing.join(",")} (shown ${shown.length})`);
    outcome = `filter ${shown.length}/${link.ids.length}${missing.length ? `, missing ${missing.join(", ")}` : ""}`;
  }
  if (OUT) await page.screenshot({ path: path.join(OUT, `public-${link.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`) });
  rows.push(`${link.href} -> ${finalUrl} | ${status} ${type.split(";")[0]} | ${outcome}`);
  await page.close();
}

/**
 * Links that the local classic modal builds (relying parties, issuers; wallets stay local).
 * The modal is opened from the listing: the classic ?credential= deep link still shows 0/0
 * relations (known, parked), which says nothing about the link targets.
 */
async function classicLinks(context) {
  const page = await context.newPage();
  await page.goto(CLASSIC_LISTING, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#fides-search-input", { timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.fill("#fides-search-input", "Age Verification");
  await page.waitForTimeout(1000);
  await page.locator(`[data-credential-id="${AV}"]`).first().click();
  await page.waitForSelector(".fides-modal-overlay--credential .fides-modal-title", { timeout: 30000 });
  await page.waitForSelector(".fides-modal-overlay--credential a[href*='?rp=']", { state: "attached", timeout: 30000 });
  const links = await page.evaluate(() => [...document.querySelectorAll(".fides-modal-overlay--credential a[href]")].map((a) => ({ href: a.href, text: a.textContent.replace(/\s+/g, " ").trim() })));
  const local = await page.evaluate(() => {
    const box = document.querySelector(".fides-eco-wallet-box--link");
    return box ? box.href : "";
  });
  await page.close();
  const pick = (re) => links.find((l) => re.test(l.href));
  const rpOne = pick(/[?&]rp=/);
  const rpMany = pick(/[?&]rps=/);
  const issuerMany = pick(/[?&]issuers=/);
  check("classic modal: relying-party links use the ecosystem-explorer catalog", links.filter((l) => /[?&]rps?=/.test(l.href)).every((l) => l.href.startsWith("https://fides.community/ecosystem-explorer/relying-party-catalog/?")), links.filter((l) => /[?&]rps?=/.test(l.href)).map((l) => l.href).join(" "));
  check("classic modal: wallet box stays on the local wallet route", local.startsWith(BASE) && /[?&]wallets=/.test(local), local);
  const out = [];
  if (rpOne) out.push({ label: "classic modal · one relying party", href: rpOne.href, kind: "rp", ids: idsOf(rpOne.href, "rp"), name: rpOne.text });
  if (rpMany) out.push({ label: "classic modal · relying parties filter", href: rpMany.href, kind: "rp", ids: idsOf(rpMany.href, "rps") });
  if (issuerMany) out.push({ label: "classic modal · issuers filter", href: issuerMany.href, kind: "issuer", ids: idsOf(issuerMany.href, "issuers") });
  check("classic modal: found one-RP, RP filter and issuer filter links", out.length === 3, out.map((l) => l.label).join(", "));
  if (local) out.push({ label: "classic modal · local wallets filter", href: local, kind: "wallet", ids: idsOf(local, "wallets"), host: new URL(BASE).hostname });
  return out;
}

/** Real relying-party click from the pilot detail (no stub), then Back. */
async function realClickAndBack(context) {
  const page = await context.newPage();
  await page.goto(DETAIL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#eco-rps-list .fides-credential-eco__row");
  const row = page.locator("#eco-rps-list .fides-credential-eco__row").first();
  const name = ((await row.locator(".fides-credential-eco__name").textContent()) || "").trim();
  await row.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => Math.round(scrollY));
  await row.click();
  await page.waitForURL(/fides\.community\/ecosystem-explorer\/relying-party-catalog\/\?rp=/, { timeout: 60000 });
  const title = await page
    .waitForFunction(() => {
      const t = document.querySelector(".fides-modal-overlay .fides-modal-title");
      return t && t.offsetParent !== null ? t.textContent.trim() : "";
    }, null, { timeout: 30000 })
    .then((h) => h.jsonValue())
    .catch(() => "");
  check(`pilot detail: real click opens ${name} on fides.community`, !!title && (title.includes(name) || name.includes(title)), `${page.url()} "${title}"`);
  await page.goBack();
  await page.waitForSelector(".fides-credential-detail");
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => Math.round(scrollY));
  check("pilot detail: Back returns to the local page", page.url() === DETAIL, page.url());
  check("pilot detail: Back restores the scroll position", Math.abs(after - before) <= 40, `${before} -> ${after}`);
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  const context = await newContext(browser);
  try {
    const links = [...(await classicLinks(context)), ...PUBLIC];
    check("public wallet fallback links were generated", PUBLIC.some((l) => l.kind === "wallet"));
    for (const link of links) await verify(context, link);
    await realClickAndBack(context);
  } finally {
    await browser.close();
  }
  console.log("\n# generated URL -> final destination | response | record/filter");
  rows.forEach((row) => console.log(`# ${row}`));
  console.log(`# pass ${pass}\n# fail ${fail.length}`);
  process.exit(fail.length ? 1 : 0);
})();
