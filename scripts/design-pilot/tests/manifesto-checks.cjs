/**
 * FIDES Manifesto page (Paper 27.2 / 27.3): principles, supporter gallery,
 * logos (wide, small, broken, missing), links, hover, keyboard focus, long
 * names, overflow. Remote hosts are stubbed; logo images are generated per case.
 * Run: node manifesto-checks.cjs (PLAYWRIGHT_MODULE, PILOT_URL, WIDTHS, REAL_LOGOS=1 lets real logos load for screenshots).
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const PAGE = `${BASE}/fides-design-pilot/manifesto/`;
const WIDTHS = (process.env.WIDTHS || "1440,1024,768,390,320").split(",").map(Number);
const REAL = process.env.REAL_LOGOS === "1";
const SHOTS = path.join(__dirname, "..", "screens");
fs.mkdirSync(SHOTS, { recursive: true });
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d && !ok ? ` (${d})` : ""}`); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
/** A solid-colour PNG with a darker frame, so its edges are visible in screenshots. */
const png = (w, h, [r, g, b]) => {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x += 1) { const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1; const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = edge ? r >> 1 : r; raw[o + 1] = edge ? g >> 1 : g; raw[o + 2] = edge ? b >> 1 : b; }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
const WIDE = png(400, 100, [120, 170, 230]);
const SQUARE = png(128, 128, [240, 170, 90]);
const TINY = png(16, 16, [200, 60, 60]);

(async () => {
  const browser = await chromium.launch();
  for (const w of WIDTHS) {
    const tag = `${w}px`;
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
    await ctx.route((url) => !url.href.startsWith(BASE), (route) => {
      const req = route.request();
      const u = req.url();
      if (req.resourceType() === "document") return route.fulfill({ status: 200, contentType: "text/html", body: "<title>External page</title><p>external</p>" });
      if (req.resourceType() !== "image") return route.abort();
      if (REAL) return route.continue();
      if (/domain=idcontrol\.com/.test(u)) return route.fulfill({ status: 200, contentType: "image/png", body: TINY }); // too small to look sharp
      if (/vancouver\.ca/.test(u)) return route.abort(); // broken logo
      if (/google\.com\/s2\/favicons/.test(u)) return route.fulfill({ status: 200, contentType: "image/png", body: SQUARE });
      return route.fulfill({ status: 200, contentType: "image/png", body: WIDE });
    });
    const page = await ctx.newPage();
    await page.goto(PAGE, { waitUntil: "load" });
    await page.locator(".fides-manifesto__tile").first().waitFor({ timeout: 30000 });
    // Lazy logos load while scrolling; walk down once, then back to the top.
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } await new Promise((r) => setTimeout(r, 1500)); window.scrollTo(0, 0); });
    await page.waitForFunction(() => [...document.querySelectorAll(".fides-manifesto__logo")].every((i) => i.naturalWidth >= 32), null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);

    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);

    // Hero.
    const hero = await page.evaluate(() => {
      const q = (s) => (document.querySelector(s) || {}).textContent?.trim();
      const pos = document.querySelector(".fides-manifesto__positioning").getBoundingClientRect();
      const com = document.querySelector(".fides-manifesto__commitment").getBoundingClientRect();
      const t = document.querySelector(".fides-manifesto__title");
      return { h1s: document.querySelectorAll("h1").length, h1: q("h1"), kicker: q(".fides-manifesto__positioning .fides-manifesto__kicker"), sub: q(".fides-manifesto__subtitle"), intro: q(".fides-manifesto__intro"), cTitle: q(".fides-manifesto__commitment-title"), posRight: Math.round(pos.right), comLeft: Math.round(com.left), posBottom: Math.round(pos.bottom + scrollY), comTop: Math.round(com.top + scrollY), lines: Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight)) };
    });
    check(`${tag}: hero text from Paper`, hero.h1s === 1 && hero.h1 === "The FIDES Manifesto" && hero.kicker === "About FIDES" && hero.sub === "Seven principles for a digital world people can trust." && hero.intro.startsWith("The Manifesto sets out a shared, non-binding vision") && hero.cTitle === "Trust takes more than technology.", JSON.stringify(hero));
    check(`${tag}: ${w >= 1024 ? "commitment panel sits beside the hero" : "commitment panel follows the hero text"}`, w >= 1024 ? hero.comLeft >= hero.posRight : hero.comTop >= hero.posBottom - 1, JSON.stringify(hero));
    if (w <= 390) check(`${tag}: title stays within three lines`, hero.lines <= 3, String(hero.lines));

    // Principles: seven, full original texts.
    const pr = await page.evaluate(() => [...document.querySelectorAll(".fides-manifesto__principle")].map((li) => { const n = li.querySelector(".fides-manifesto__number").getBoundingClientRect(); const b = li.querySelector(".fides-manifesto__principle-body").getBoundingClientRect(); return { num: li.querySelector(".fides-manifesto__number").textContent.trim(), title: li.querySelector("h3").textContent.trim(), len: li.querySelector("p").textContent.trim().length, end: li.querySelector("p").textContent.trim().slice(-30), nx: Math.round(n.left), ny: Math.round(n.top), bx: Math.round(b.left), by: Math.round(b.top), right: Math.round(b.right) }; }));
    check(`${tag}: seven numbered principles with the original titles`, pr.length === 7 && pr.map((p) => p.num).join() === "01,02,03,04,05,06,07" && pr[0].title === "must protect people’s rights" && pr[3].title === "requires open standards & interoperability" && pr[6].title === "is ever evolving", JSON.stringify(pr.map((p) => p.title)));
    check(`${tag}: principles carry their full original text, not summaries`, pr.every((p) => p.len > 200) && pr[0].end.endsWith("foster trust.") && pr[5].end.endsWith("including individuals.") && pr[6].end.endsWith("moment in time."), JSON.stringify(pr.map((p) => p.len)));
    check(`${tag}: ${w >= 768 ? "number sits left of its principle" : "number sits above its principle"}`, w >= 768 ? pr.every((p) => p.nx < p.bx) : pr.every((p) => p.by >= p.ny), JSON.stringify(pr[0]));
    check(`${tag}: principles stay inside the screen`, pr.every((p) => p.right <= w));

    // Supporters.
    const sup = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll(".fides-manifesto__tile")];
      return { declared: +document.querySelector(".fides-manifesto__tiles").dataset.fidesManifestoCount, names: tiles.map((t) => t.querySelector(".fides-ds-visually-hidden").textContent.trim()), hrefs: tiles.map((t) => (t.querySelector("a") || {}).href || ""), tiles: tiles.map((t) => { const a = t.querySelector(".fides-manifesto__tile-body"); const b = a.getBoundingClientRect(); const img = a.querySelector("img"); const name = a.querySelector(".fides-manifesto__name"); const vis = (e) => !!e && !e.hidden && getComputedStyle(e).display !== "none"; return { x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right), img: !!img, imgFit: img ? getComputedStyle(img).objectFit : "", imgW: img ? Math.round(img.getBoundingClientRect().width) : 0, imgH: img ? Math.round(img.getBoundingClientRect().height) : 0, nameShown: vis(name), nameText: name ? name.textContent.trim() : "", id: a.dataset.orgId || "" }; }) };
    });
    check(`${tag}: all supporters are in one gallery without paging`, sup.declared > 0 && sup.names.length === sup.declared && (await page.locator("text=/show all|load more|next page/i").count()) === 0, `${sup.names.length}/${sup.declared}`);
    const coll = new Intl.Collator("en");
    check(`${tag}: names are alphabetical`, sup.names.every((n, i) => i === 0 || coll.compare(sup.names[i - 1], n) <= 0), sup.names.join("|"));
    check(`${tag}: every tile links to an organization profile with its id`, sup.hrefs.every((h, i) => /\/fides-design-pilot\/organization\/\?org=org%3A/.test(h) && h.endsWith(encodeURIComponent(sup.tiles[i].id))), sup.hrefs.slice(0, 2).join());
    const cols = new Set(sup.tiles.map((t) => t.x)).size;
    const wantCols = w >= 1024 ? 5 : w >= 768 ? 4 : w >= 560 ? 3 : 2;
    check(`${tag}: ${wantCols} columns`, cols === wantCols, String(cols));
    check(`${tag}: tiles are at least 80px tall and inside the screen`, sup.tiles.every((t) => t.h >= 80 && t.right <= w), JSON.stringify(sup.tiles.filter((t) => t.h < 80 || t.right > w).slice(0, 2)));
    check(`${tag}: each tile shows either a logo or a readable name`, sup.tiles.every((t) => (t.img && !t.nameShown) || (!t.img && t.nameShown && t.nameText.length > 0)), JSON.stringify(sup.tiles.filter((t) => !((t.img && !t.nameShown) || (!t.img && t.nameShown))).slice(0, 2)));
    if (!REAL) {
      const byId = Object.fromEntries(sup.tiles.map((t) => [t.id, t]));
      check(`${tag}: organizations without a logo get a name tile`, ["org:adpriva", "org:hypermine"].every((id) => byId[id] && !byId[id].img && byId[id].nameShown), JSON.stringify([byId["org:adpriva"], byId["org:hypermine"]]));
      check(`${tag}: a broken logo is replaced by the name tile`, byId["org:city-of-vancouver"] && !byId["org:city-of-vancouver"].img && byId["org:city-of-vancouver"].nameText === "City of Vancouver", JSON.stringify(byId["org:city-of-vancouver"]));
      check(`${tag}: a logo too small to look sharp is replaced by the name tile`, byId["org:idcontrol"] && !byId["org:idcontrol"].img && byId["org:idcontrol"].nameText === "ID Control", JSON.stringify(byId["org:idcontrol"]));
      check(`${tag}: wide and square logos keep their proportions inside the tile (contain, within the tile)`, ["org:banqup", "org:2060"].every((id) => byId[id] && byId[id].img && byId[id].imgFit === "contain" && byId[id].imgW <= byId[id].w && byId[id].imgH <= byId[id].h), JSON.stringify([byId["org:banqup"], byId["org:2060"]]));
    }

    if (REAL) {
      // Real logos are for the screenshots; the interaction checks run with stubbed logos.
      await page.waitForTimeout(2500);
      await page.mouse.move(2, 2);
      await page.screenshot({ path: path.join(SHOTS, `manifesto-real-${w}.png`), fullPage: true });
      await page.locator(".fides-manifesto__supporters").screenshot({ path: path.join(SHOTS, `manifesto-real-supporters-${w}.png`) });
      await ctx.close();
      continue;
    }

    // Long names wrap inside the tile.
    const long = await page.evaluate(() => {
      const name = [...document.querySelectorAll(".fides-manifesto__name")].find((n) => !n.hidden);
      const tile = name.closest(".fides-manifesto__tile-body");
      name.textContent = "International Association for Digital Identity and Trusted Credential Interoperability Supercalifragilisticexpialidocious-Foundation";
      const b = tile.getBoundingClientRect();
      return { right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height), sw: document.documentElement.scrollWidth - document.documentElement.clientWidth, over: name.scrollWidth - name.clientWidth };
    });
    check(`${tag}: a very long name wraps inside its tile without overflow`, long.right <= w && long.sw <= 0 && long.over <= 1, JSON.stringify(long));
    await page.reload({ waitUntil: "load" });
    await page.locator(".fides-manifesto__tile").first().waitFor();

    // Actions and destinations.
    const acts = await page.evaluate(() => [...document.querySelectorAll(".fides-manifesto__button, .fides-manifesto__link")].map((a) => { const b = a.getBoundingClientRect(); return { t: a.textContent.trim(), href: a.getAttribute("href"), h: Math.round(b.height), right: Math.round(b.right) }; }));
    check(`${tag}: Support the Manifesto (twice) goes to the existing sign form, Explore the principles to #principles`, acts.length === 3 && acts[0].t.startsWith("Support the Manifesto") && acts[0].href === "https://fides.community/manifesto/#ratify-the-fides-manifesto-today" && acts[1].href === "#principles" && acts[2].href === acts[0].href, JSON.stringify(acts));
    check(`${tag}: actions are at least 44px tall and inside the screen`, acts.every((a) => a.h >= 44 && a.right <= w), JSON.stringify(acts));
    check(`${tag}: no form inside the page content`, (await page.locator(".fides-manifesto form, .fides-manifesto input, .fides-manifesto textarea").count()) === 0);
    await page.locator(".fides-manifesto__link").click();
    await page.waitForTimeout(900);
    const hash = await page.evaluate(() => ({ h: location.hash, top: Math.round(document.getElementById("principles").getBoundingClientRect().top), vh: innerHeight }));
    check(`${tag}: Explore the principles scrolls to the principles`, hash.h === "#principles" && hash.top < hash.vh * 0.5 && hash.top > -50, JSON.stringify(hash));
    await page.evaluate(() => window.scrollTo(0, 0));

    // Hover on buttons, a logo tile and a name tile.
    const hover = async (loc) => { let r = null; for (let n = 0; n < 8; n += 1) { await page.mouse.move(2, 2); await loc.hover(); await page.waitForTimeout(450); r = await loc.evaluate((e) => { const cs = getComputedStyle(e); const nm = e.querySelector(".fides-manifesto__name:not([hidden])"); return { bg: cs.backgroundColor, bc: cs.borderTopColor, color: cs.color, td: nm ? getComputedStyle(nm).textDecorationLine : "" }; }); if ((r.bg !== "rgba(0, 0, 0, 0)" && r.bg !== "rgb(255, 255, 255)") || r.td.includes("underline")) break; await page.waitForTimeout(150); } return r; };
    const tiles = page.locator("a.fides-manifesto__tile-body");
    await tiles.first().scrollIntoViewIfNeeded();
    const hv1 = await hover(tiles.first());
    check(`${tag}: tile hover tints the tile and darkens its edge`, hv1.bg === "rgb(248, 251, 255)" && hv1.bc === "rgb(8, 72, 163)", JSON.stringify(hv1));
    const nameTile = page.locator("a.fides-manifesto__tile-body:has(.fides-manifesto__name:not([hidden]))").first();
    if (await nameTile.count()) {
      await nameTile.scrollIntoViewIfNeeded();
      const hv2 = await hover(nameTile);
      check(`${tag}: name tile hover underlines the name and keeps its colour`, hv2.td.includes("underline") && hv2.bg === "rgb(248, 251, 255)", JSON.stringify(hv2));
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    const btn = page.locator(".fides-manifesto__hero .fides-manifesto__button");
    await btn.evaluate((e) => e.scrollIntoView({ block: "center" }));
    const hb = await hover(btn);
    check(`${tag}: hero button hover darkens and keeps white text`, hb.bg === "rgb(8, 72, 163)" && hb.color === "rgb(255, 255, 255)", JSON.stringify(hb));
    await page.mouse.move(2, 2);
    const cta = page.locator(".fides-manifesto__cta .fides-manifesto__button");
    await cta.scrollIntoViewIfNeeded();
    const hc = await hover(cta);
    check(`${tag}: closing button hover keeps white text on the dark band`, hc.color === "rgb(255, 255, 255)" && hc.bg === "rgb(8, 72, 163)", JSON.stringify(hc));
    await page.mouse.move(2, 2);

    // Keyboard: order and focus rings (fresh load: a clicked anchor moves the focus starting point).
    await page.goto(PAGE, { waitUntil: "load" });
    await page.locator(".fides-manifesto__tile").first().waitFor();
    const order = [];
    for (let n = 0; n < 90; n += 1) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(60);
      const f = await page.evaluate(() => { const e = document.activeElement; if (!e || !e.closest(".fides-manifesto")) return null; const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); const kind = e.classList.contains("fides-manifesto__tile-body") ? "tile" : e.classList.contains("fides-manifesto__link") ? "link" : "button"; return { kind, label: (e.querySelector(".fides-ds-visually-hidden") || e).textContent.trim().slice(0, 24), ow: cs.outlineWidth, os: cs.outlineStyle, oc: cs.outlineColor, cta: !!e.closest(".fides-manifesto__cta"), inView: b.top >= -1 && b.bottom <= innerHeight + 1 }; });
      if (f && !f.inView) { await page.waitForTimeout(700); f.inView = await page.evaluate(() => { const b = document.activeElement.getBoundingClientRect(); return b.top >= -1 && b.bottom <= innerHeight + 1; }); }
      if (f) { order.push(f); if (order.length === 4 && w === WIDTHS[0]) await page.screenshot({ path: path.join(SHOTS, `manifesto-focus-tile-${w}.png`) }); if (f.kind === "button" && f.cta) break; }
    }
    const kinds = order.map((o) => o.kind).join(",");
    check(`${tag}: keyboard order is button, link, every tile, closing button`, order.length === 3 + sup.declared && kinds === ["button", "link", ...Array(sup.declared).fill("tile"), "button"].join(","), `${order.length} ${kinds.slice(0, 80)}`);
    check(`${tag}: focus rings are 3px and solid (white on the dark band)`, order.every((o) => o.os === "solid" && o.ow === "3px" && o.oc === (o.cta ? "rgb(255, 255, 255)" : "rgb(8, 72, 163)")), JSON.stringify(order.find((o) => !(o.os === "solid" && o.ow === "3px"))));
    check(`${tag}: focused items are scrolled into view`, order.every((o) => o.inView), JSON.stringify(order.find((o) => !o.inView)));

    // Tile destination: a logo tile and a name tile open their organization profile.
    for (const id of ["org:credenco", "org:hypermine"]) {
      await page.goto(PAGE, { waitUntil: "load" });
      const link = page.locator(`a.fides-manifesto__tile-body[data-org-id='${id}']`);
      const name = ((await link.locator(".fides-ds-visually-hidden").textContent()) || "").trim();
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await page.waitForURL(/organization\/\?org=/, { timeout: 30000 });
      await page.locator("h1").first().waitFor({ timeout: 30000 });
      const h1 = ((await page.locator("h1").first().textContent()) || "").trim();
      check(`${tag}: tile "${name}" opens its profile`, decodeURIComponent(new URL(page.url()).searchParams.get("org")) === id && h1.toLowerCase().includes(name.toLowerCase().slice(0, 6)), `${page.url()} | ${h1}`);
    }

    // Header and footer links point at the page.
    await page.goto(`${BASE}/fides-design-pilot/updates/`, { waitUntil: "domcontentloaded" });
    const foot = await page.evaluate(() => [...document.querySelectorAll(".fides-ds-site-footer__link")].filter((a) => a.textContent.trim() === "Manifesto").map((a) => a.getAttribute("href")));
    const here = new URL(PAGE).pathname;
    check(`${tag}: footer Manifesto link points at the pilot page`, foot.length === 1 && new URL(foot[0], BASE).pathname === here, JSON.stringify(foot));
    await page.locator(".fides-ds-site-footer__link", { hasText: "Manifesto" }).first().click();
    await page.waitForURL("**/manifesto/**");
    check(`${tag}: footer link opens the Manifesto page`, new URL(page.url()).pathname === here && ((await page.locator("h1").first().textContent()) || "").trim() === "The FIDES Manifesto");
    await page.goto(`${BASE}/fides-design-pilot/about-fides/`, { waitUntil: "domcontentloaded" });
    const abouthref = await page.evaluate(() => [...document.querySelectorAll(".fides-about__link")].find((a) => a.textContent.includes("Manifesto"))?.getAttribute("href"));
    check(`${tag}: About FIDES links to this page`, abouthref && new URL(abouthref, BASE).pathname === here, String(abouthref));
    const menuHref = await page.evaluate(() => [...document.querySelectorAll(".fides-ds-site-nav__link, .fides-ds-menu__link")].filter((a) => /manifesto/i.test(a.textContent)).map((a) => a.getAttribute("href")));
    check(`${tag}: any Manifesto link in the menu points at the page`, menuHref.every((h) => new URL(h, BASE).pathname === here), JSON.stringify(menuHref));

    // Screenshots.
    await page.goto(PAGE, { waitUntil: "load" });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(1500);
    await page.mouse.move(2, 2);
    await page.screenshot({ path: path.join(SHOTS, `manifesto-${REAL ? "real-" : ""}${w}.png`), fullPage: true });
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `${failures} manifesto checks failed` : "all manifesto checks passed");
  process.exit(failures ? 1 : 0);
})();
