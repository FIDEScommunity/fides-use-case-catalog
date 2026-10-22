/**
 * DS1.4 browser checks (detail finishing, compact media, profile closings),
 * shared across use cases, organizations and both wallet catalogs:
 * - Sections: context column 24px padding, first section without a rule, later
 *   main sections 2px #8FA8C6 with 24px to the heading, side headings 20/26;
 *   white main column sections 1px #C8CDD3 with 24px on every width (modules
 *   and narrow-screen accordions keep their own frame); Wallet details title.
 * - Media: band padding 32 (desktop) / 24 (narrow), stage at most
 *   min(360px, 50svh) / min(240px, 40svh), gap 12, thumbnails 112 x 76; every
 *   image (square award, portrait screenshots) drawn whole inside the stage,
 *   the image box itself bounded; caption actions 44px; a long caption grows
 *   the band without overflow; video only after Play.
 * - Closings: per catalog and listing tier, the DS1.4 title, no general
 *   sign-in call on Official listings, the claim call on Community
 *   organisations, the guest sign-in route on Community wallets (Auth0
 *   Platform), GitHub last; 44px targets below 1100px.
 *
 * Run through run-ds14-checks.sh.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const SIZES = (process.env.SIZES || "1280x727,1440x900,1024x768,768x1024,390x844,320x700").split(",").map((s) => s.split("x").map(Number));
const P = `${BASE}/fides-design-pilot`;

const PAGES = {
  uc: { url: `${P}/use-case/?usecase=end-to-end-digital-business-workflows-transforming-kyb-kyc-kys-via-eu-business-wallet-F665Dh`, kind: "usecase", closing: "#update", title: "Help keep this use case current." },
  org: { url: `${P}/organization/?org=org:credenco`, kind: "official", closing: "#update", title: "Help keep this profile current." },
  orgrec: { url: `${P}/organization/?org=org:airship`, kind: "claim", closing: "#update", title: "Is this your organisation?" },
  orgsparse: { url: `${P}/organization/?org=org:sda-dms-zartkoruen-mukodo-reszvenytarsasag`, kind: "claim", closing: "#update", title: "Is this your organisation?" },
  biz: { url: `${P}/wallet/?wallet=credenco-business-wallet`, kind: "official", closing: "#listing", title: "Help keep this wallet current.", square: true },
  pers: { url: `${P}/wallet/?wallet=credenco-wallet`, kind: "official", closing: "#listing", title: "Help keep this wallet current.", portrait: true },
  sph: { url: `${P}/wallet/?wallet=sphereon-business-wallet`, kind: "official", closing: "#listing", title: "Help keep this wallet current.", contact: true },
  auth0: { url: `${P}/wallet/?wallet=auth0-platform`, kind: "community", closing: "#listing", title: "Help keep this wallet current." },
};

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${typeof detail === "string" ? detail : JSON.stringify(detail)})` : ""}`);
}

async function open(page, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  } catch (err) {
    console.log(`# retry ${url}: ${err.message.split("\n")[0]}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  }
}

async function newContext(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addCookies(
    Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" })
      .map(([name, value]) => ({ name: `cmplz_${name}`, value, url: BASE }))
  );
  return context;
}

const SECTION = "rgb(143, 168, 198)";
const DETAIL = "rgb(200, 205, 211)";

async function sections(page, key, w) {
  const r = await page.evaluate(() => {
    const ctx = document.querySelector(".fides-ds-context");
    const main = document.querySelector(".fides-ds-main");
    const cs = (el) => getComputedStyle(el);
    const kids = (root) => [...root.children].filter((c) => c.getClientRects().length);
    return {
      ctx: ctx && {
        pad: cs(ctx).padding, bg: cs(ctx).backgroundColor,
        kids: kids(ctx).map((c) => ({ id: c.id || c.className.split(" ")[0], bt: cs(c).borderTopWidth + " " + cs(c).borderTopColor, pt: cs(c).paddingTop, rowBorders: [...c.querySelectorAll(".fides-ds-facts__row, .fides-uc-detail__org")].map((r) => cs(r).borderTopWidth).filter((b) => parseFloat(b) > 1) })),
        titles: [...ctx.querySelectorAll(".fides-ds-panel__title, .fides-uc-detail__aside-title, h2")].filter((t) => t.getClientRects().length).map((t) => ({ t: t.textContent.trim().slice(0, 30), f: cs(t).fontSize + "/" + cs(t).lineHeight })),
      },
      main: main && kids(main).map((c) => ({ id: c.id || c.className.split(" ")[0], module: c.classList.contains("fides-ds-module"), accordion: c.classList.contains("is-collapsible"), bt: cs(c).borderTopWidth + " " + cs(c).borderTopColor, pt: cs(c).paddingTop })),
      glance: (document.getElementById("glance-title") || {}).textContent || null,
      atAGlance: document.body.textContent.includes("At a glance"),
    };
  });
  if (["biz", "pers", "sph", "auth0"].includes(key)) {
    check(`${key}@${w}: core facts titled Wallet details, no At a glance`, r.glance === "Wallet details" && !r.atAGlance, r.glance);
  }
  const [mainFirst, ...mainRest] = r.main || [];
  check(`${key}@${w}: first main section without a rule`, !mainFirst || mainFirst.bt.startsWith("0px"), mainFirst);
  const badMain = mainRest.filter((k) => !k.module && !k.accordion && (k.bt !== `1px ${DETAIL}` || k.pt !== "24px"));
  check(`${key}@${w}: white main sections 1px #C8CDD3 + 24px on every width`, badMain.length === 0, badMain);
  if (w < 1100 && ["uc", "org", "biz", "pers"].includes(key)) {
    check(`${key}@${w}: narrow screens keep a rule between main sections`, mainRest.some((k) => k.bt === `1px ${DETAIL}`), r.main);
  }
  if (w < 1100 || !r.ctx) return;
  check(`${key}@${w}: context column #F2F7FF with 24px padding`, r.ctx.pad === "24px" && r.ctx.bg === "rgb(242, 247, 255)", r.ctx);
  const [first, ...rest] = r.ctx.kids;
  check(`${key}@${w}: first context section without a rule`, first && first.bt.startsWith("0px") && first.pt === "0px", first);
  const badCtx = rest.filter((k) => k.bt !== `2px ${SECTION}` || k.pt !== "24px");
  check(`${key}@${w}: later context sections 2px #8FA8C6 + 24px`, rest.length === 0 || badCtx.length === 0, badCtx);
  check(`${key}@${w}: context data rows stay light (no rule above 1px)`, r.ctx.kids.every((k) => k.rowBorders.length === 0), r.ctx.kids.filter((k) => k.rowBorders.length));
  const badTitles = r.ctx.titles.filter((t) => t.f !== "20px/26px");
  check(`${key}@${w}: side headings 20/26`, badTitles.length === 0, badTitles);
}

async function media(page, key, w, h, cfg) {
  if (!(await page.locator("#media .fides-ds-gallery").count())) return;
  const thumbs = await page.$$(".fides-ds-gallery__thumb");
  const desk = w >= 1100;
  const narrow = w < 600;
  const cap = Math.min(narrow ? 240 : 360, (narrow ? 0.4 : 0.5) * h);
  const frames = [];
  for (let i = 0; i < Math.max(1, thumbs.length); i++) {
    if (thumbs[i]) {
      await thumbs[i].click();
      await page.waitForTimeout(250);
    }
    await page.evaluate(() => {
      const img = document.querySelector(".fides-ds-gallery__frame > img");
      return img && !img.complete ? new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 4000); }) : null;
    });
    frames.push(await page.evaluate(() => {
      const band = document.getElementById("media");
      const f = document.querySelector(".fides-ds-gallery__frame");
      const img = f.querySelector(":scope > img");
      const fr = f.getBoundingClientRect();
      const ir = img && img.getBoundingClientRect();
      let drawn = null;
      if (img && img.naturalWidth) {
        const s = Math.min(ir.width / img.naturalWidth, ir.height / img.naturalHeight);
        drawn = { w: img.naturalWidth * s, h: img.naturalHeight * s, nat: img.naturalWidth / img.naturalHeight, fit: getComputedStyle(img).objectFit };
      }
      return {
        video: f.classList.contains("fides-ds-gallery__frame--video"), iframe: !!f.querySelector("iframe"),
        pad: getComputedStyle(band).paddingTop + "/" + getComputedStyle(band).paddingBottom,
        frame: { w: fr.width, h: fr.height }, img: ir && { w: ir.width, h: ir.height, top: ir.top - fr.top, left: ir.left - fr.left }, drawn,
        gap: getComputedStyle(document.querySelector(".fides-ds-gallery")).rowGap,
        capLinks: [...document.querySelectorAll(".fides-ds-gallery__caption a")].map((a) => Math.round(a.getBoundingClientRect().height)),
      };
    }));
  }
  const s = frames[0];
  check(`${key}@${w}: media band padding ${desk ? 32 : 24}px`, s.pad === (desk ? "32px/32px" : "24px/24px"), s.pad);
  check(`${key}@${w}: gallery gap 12px`, s.gap === "12px", s.gap);
  check(`${key}@${w}: stage at most ${Math.round(cap)}px high`, frames.every((f) => f.frame.h <= cap + 1), frames.map((f) => Math.round(f.frame.h)));
  check(`${key}@${w}: stage uses the column width`, frames.every((f) => f.frame.w >= Math.min(800, document_width_guess(w)) - 2), frames.map((f) => Math.round(f.frame.w)));
  const images = frames.filter((f) => f.drawn && !f.video);
  const clipped = images.filter((f) => f.img.w > f.frame.w + 1 || f.img.h > f.frame.h + 1 || f.img.top < -1 || f.img.left < -1 || f.drawn.fit !== "contain");
  check(`${key}@${w}: image box bounded by the stage, contain`, clipped.length === 0, clipped);
  if (cfg.square) {
    const sq = images.find((f) => Math.abs(f.drawn.nat - 1) < 0.02);
    check(`${key}@${w}: square award image shown whole (${sq && Math.round(sq.drawn.w)}x${sq && Math.round(sq.drawn.h)})`, sq && sq.drawn.h <= sq.frame.h + 1 && sq.drawn.w <= sq.frame.w + 1 && Math.abs(sq.drawn.w - sq.drawn.h) < 2, sq);
  }
  if (cfg.portrait) {
    const pt = images.filter((f) => f.drawn.nat < 0.8);
    check(`${key}@${w}: portrait screenshots shown whole`, pt.length > 0 && pt.every((f) => f.drawn.h <= f.frame.h + 1), pt.map((f) => f.drawn));
  }
  check(`${key}@${w}: no video iframe before Play`, frames.every((f) => !f.iframe));
  check(`${key}@${w}: caption actions at least 44px`, frames.every((f) => f.capLinks.every((x) => x >= 44)), frames.map((f) => f.capLinks));
  if (thumbs.length) {
    const t = await page.evaluate(() => [...document.querySelectorAll(".fides-ds-gallery__thumb")].map((n) => { const r = n.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }));
    check(`${key}@${w}: thumbnails 112 x 76`, t.every((x) => x === "112x76"), t);
    const strip = await page.evaluate(() => { const s = document.querySelector(".fides-ds-gallery__strip"); return { ox: getComputedStyle(s).overflowX, sw: s.scrollWidth, cw: s.clientWidth }; });
    check(`${key}@${w}: thumbnail strip scrolls sideways instead of overflowing`, strip.ox === "auto", strip);
    await thumbs[0].click();
  }
  // Long caption: the band grows, the stage keeps its limit, nothing overflows.
  const long = await page.evaluate(() => {
    const band = document.getElementById("media");
    const before = band.getBoundingClientRect().height;
    const span = document.querySelector(".fides-ds-gallery__caption > span");
    span.textContent = "A deliberately long caption to test wrapping: " + "Credenco Business Wallet award ceremony, FIDES Community Awards 2026, ".repeat(4) + "Supercalifragilisticexpialidociousunbrokenwordwithoutanyspaces";
    const after = band.getBoundingClientRect().height;
    const f = document.querySelector(".fides-ds-gallery__frame").getBoundingClientRect();
    const a = document.querySelector(".fides-ds-gallery__caption a");
    return { before, after, frameH: f.height, link: a ? Math.round(a.getBoundingClientRect().height) : 44, overflow: document.documentElement.scrollWidth > innerWidth, capOverflow: [...document.querySelectorAll(".fides-ds-gallery__caption")].some((c) => c.scrollWidth > c.clientWidth + 1) };
  });
  check(`${key}@${w}: long caption grows the band without overflow`, long.after > long.before && !long.overflow && !long.capOverflow && long.link >= 44 && long.frameH <= cap + 1, long);
}

function document_width_guess(w) {
  if (w >= 1100) return 800;
  return w - 2 * (w < 600 ? 20 : 32);
}

async function closing(page, key, w, cfg) {
  const r = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const links = [...el.querySelectorAll("a")].map((a) => ({ t: a.textContent.trim().replace(/\s+/g, " "), h: Math.round(a.getBoundingClientRect().height), btn: a.classList.contains("fides-ds-button") }));
    return { title: el.querySelector("h2").textContent.trim(), font: getComputedStyle(el.querySelector("h2")).fontSize, bt: cs.borderTopWidth + " " + cs.borderTopColor, bg: cs.backgroundColor, text: el.textContent.replace(/\s+/g, " "), links, cls: el.className };
  }, cfg.closing);
  check(`${key}@${w}: closing present`, !!r);
  if (!r) return;
  check(`${key}@${w}: closing title "${cfg.title}"`, r.title === cfg.title, r.title);
  const small = r.links.filter((l) => l.h < (w >= 1100 ? 40 : 44));
  check(`${key}@${w}: closing targets large enough`, small.length === 0, small);
  const gh = r.links.findIndex((l) => /GitHub/.test(l.t));
  check(`${key}@${w}: GitHub is the last, non-button link`, gh === -1 || (gh === r.links.length - 1 && !r.links[gh].btn), r.links);
  if (cfg.kind === "usecase") {
    check(`${key}@${w}: use-case closing 1px #C8CDD3 rule, title 20px`, r.bt === `1px ${DETAIL}` && r.font === "20px", r);
    return;
  }
  check(`${key}@${w}: closing on #F2F7FF`, r.bg === "rgb(242, 247, 255)", r.bg);
  if (cfg.kind === "official") {
    check(`${key}@${w}: Official closing has 1px #C8CDD3 rule`, r.bt === `1px ${DETAIL}`, r.bt);
    check(`${key}@${w}: Official closing: no general sign-in call`, !/Sign in to suggest an update/.test(r.text), r.text);
    check(`${key}@${w}: Official guest: manager-only sign-in`, /Authorised profile managers can sign in to make updates\./.test(r.text) && r.links.some((l) => l.t.startsWith("Profile managers: sign in")), r.links);
    check(`${key}@${w}: Official closing names who manages the record`, /Official listing · managed by the (organisation|wallet provider)\./.test(r.text), r.text);
    if (cfg.contact) check(`${key}@${w}: public contact stays available`, r.links.some((l) => /^Contact/.test(l.t)), r.links);
  } else if (cfg.kind === "community") {
    check(`${key}@${w}: Community wallet badge`, await page.locator(".fides-org-detail__badge--official").count() === 0 && /Community listing/.test(await page.locator(".fides-wallet-detail").textContent()));
    check(`${key}@${w}: Community closing has 1px #C8CDD3 rule, no claim block`, r.bt === `1px ${DETAIL}` && !/fides-org-closing--claim/.test(r.cls), r);
    check(`${key}@${w}: Community closing names public sources`, /Community listing · catalog data from public sources\./.test(r.text), r.text);
    const signIn = r.links.find((l) => l.t.startsWith("Sign in to suggest an update"));
    check(`${key}@${w}: Community guest keeps Sign in to suggest an update`, signIn && !signIn.btn && /Suggest a correction using the existing update form\./.test(r.text), r.links);
    check(`${key}@${w}: Community closing has no manager-only sign-in or update action`, !r.links.some((l) => /Profile managers|Update profile|^Suggest an update/.test(l.t)), r.links);
  } else if (cfg.kind === "claim") {
    check(`${key}@${w}: Community claim block with 3px brand rule`, /fides-org-closing--claim/.test(r.cls) && r.bt === "3px rgb(10, 110, 243)", r);
    check(`${key}@${w}: claim title ${w >= 768 ? 24 : 20}px`, r.font === (w >= 768 ? "24px" : "20px"), r.font);
    const claim = r.links.find((l) => l.t.startsWith("Manage your Official Listing"));
    check(`${key}@${w}: Manage your Official Listing is the main button (44px)`, claim && claim.btn && claim.h >= 44, claim);
    const href = await page.getAttribute(`${cfg.closing} .fides-org-closing__claim a`, "href");
    check(`${key}@${w}: claim keeps the Plans route with org id and intent`, /[?&]org=org(%3A|%253A|:)/.test(href || "") && /intent=official-profile/.test(href || ""), href);
    const idx = r.links.findIndex((l) => /suggest an update/i.test(l.t));
    check(`${key}@${w}: suggesting an update stays secondary`, idx === -1 || (!r.links[idx].btn && idx > r.links.indexOf(claim)), r.links);
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [w, h] of SIZES) {
    const context = await newContext(browser, w, h);
    const page = await context.newPage();
    for (const [key, cfg] of Object.entries(PAGES)) {
      await open(page, cfg.url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      check(`${key}@${w}: no horizontal overflow`, !overflow);
      await sections(page, key, w);
      await media(page, key, w, h, cfg);
      await closing(page, key, w, cfg);
      if (w < 1100) {
        const rows = await page.evaluate(() => [...document.querySelectorAll(".is-collapsible[data-fides-ds-collapsible] > .fides-ds-collapsible__toggle, .is-collapsible[data-fides-ds-collapsible] .fides-ds-collapsible__toggle")].filter((t) => t.getClientRects().length).map((t) => Math.round(t.getBoundingClientRect().height)));
        check(`${key}@${w}: accordion rows at least 56px`, rows.every((x) => x >= 56), rows);
      }
      if ([1280, 390, 320].includes(w)) {
        const c = page.locator(cfg.closing);
        if (await c.count()) await c.first().screenshot({ path: path.join(OUT, `${key}-${w}-closing.png`) });
        const m = page.locator("#media");
        if (await m.count()) {
          await page.locator(".fides-ds-gallery__thumb").first().click().catch(() => {});
          await m.screenshot({ path: path.join(OUT, `${key}-${w}-media.png`) });
        }
      }
    }
    await context.close();
  }
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`# pass ${results.length - failed.length}`);
  console.log(`# fail ${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})();
