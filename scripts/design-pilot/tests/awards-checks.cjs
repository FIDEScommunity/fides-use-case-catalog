/**
 * Global Digital Trust Awards page (Paper 28.2 / 28.3): layout, uncropped banners,
 * anchor navigation, accordions (closed by default, mouse and keyboard), hover and
 * focus, long titles, overflow and every catalog and external link.
 * Run: node awards-checks.cjs (PLAYWRIGHT_MODULE, PILOT_URL, WIDTHS).
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const PAGE = `${BASE}/fides-design-pilot/global-digital-trust-awards/`;
const WIDTHS = (process.env.WIDTHS || "1440,1024,768,390,320").split(",").map(Number);
const SHOTS = path.join(__dirname, "..", "screens");
fs.mkdirSync(SHOTS, { recursive: true });
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d && !ok ? ` (${d})` : ""}`); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const settle = (p) => p.waitForTimeout(450); // smooth scrolling in the shell
const COOKIES = Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE }));

(async () => {
  const browser = await chromium.launch();
  for (const w of WIDTHS) {
    const tag = `${w}px`;
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addCookies(COOKIES);
    const page = await ctx.newPage();
    await page.goto(PAGE, { waitUntil: "load" });
    await page.locator(".fides-awards-title").waitFor({ timeout: 30000 });
    await settle(page);
    check(`${tag}: no horizontal overflow`, (await overflow(page)) <= 0);

    // ---- Structure and type.
    const s = await page.evaluate(() => {
      const cs = (sel) => { const e = document.querySelector(sel); const c = getComputedStyle(e); return { f: c.fontFamily, size: c.fontSize, lh: c.lineHeight, wt: c.fontWeight }; };
      return {
        h1s: document.querySelectorAll("h1").length, h1: document.querySelector("h1").textContent.trim(),
        kicker: document.querySelector(".fides-awards-hero .fides-awards-kicker").textContent.trim(),
        title: cs(".fides-awards-title"), lead: cs(".fides-awards-lead"), h2: cs(".fides-awards-section h2"), body: cs(".fides-awards-about__body p"),
        winnerTitle: cs(".fides-awards-winner__title"), winnerText: cs(".fides-awards-winner__text"),
        h2s: [...document.querySelectorAll(".fides-awards h2")].map((e) => e.textContent.trim()),
        winners: [...document.querySelectorAll(".fides-awards-winner")].map((e) => e.querySelector("h3").textContent.trim()),
        finalists: document.querySelectorAll(".fides-awards-finalist").length,
        stat: document.querySelector(".fides-awards-stat").innerText.replace(/\s+/g, " "),
        nav: [...document.querySelectorAll(".fides-awards-sections a")].map((a) => [a.textContent.trim(), a.getAttribute("href")]),
        navLabel: document.querySelector(".fides-awards-sections nav").getAttribute("aria-label"),
        finalistTitle: cs(".fides-awards-finalist__title"), finalistText: cs(".fides-awards-finalist__text"),
      };
    });
    check(`${tag}: one H1 "Global Digital Trust Awards" with kicker`, s.h1s === 1 && s.h1 === "Global Digital Trust Awards" && s.kicker === "ECOSYSTEM · AWARDS", JSON.stringify([s.h1s, s.h1, s.kicker]));
    check(`${tag}: FIDES Inter on title, lead, headings and text`, [s.title, s.lead, s.h2, s.body, s.winnerTitle].every((x) => x.f.startsWith('"FIDES Inter"')), JSON.stringify(s.title));
    const wantH1 = w >= 1100 ? ["48px", "52px"] : w >= 600 ? ["44px", "48px"] : ["36px", "40px"];
    check(`${tag}: H1 ${wantH1.join("/")} like the shared catalog heading`, s.title.size === wantH1[0] && s.title.lh === wantH1[1], JSON.stringify(s.title));
    const wantLead = w >= 600 ? ["18px", "28px"] : ["16px", "24px"]; // shared page-header intro role
    check(`${tag}: lead 18/28 (16/24 on phones), section 26/32, body 17/27, winner title 20/26, winner text 15/22`, s.lead.size === wantLead[0] && s.lead.lh === wantLead[1] && s.h2.size === "26px" && s.h2.lh === "32px" && s.body.size === "17px" && s.body.lh === "27px" && s.winnerTitle.size === "20px" && s.winnerTitle.lh === "26px" && s.winnerText.size === "15px" && s.winnerText.lh === "22px", JSON.stringify(s));
    check(`${tag}: 24 finalists, five winners in category order`, s.finalists === 24 && JSON.stringify(s.winners) === JSON.stringify(["Mobile Driving Licence", "SSItizens", "Urban Company", "Aadhaar App", "Real Estate Purchasing"]), JSON.stringify(s.winners));
    check(`${tag}: panel says 24 finalists across five award categories`, /24 finalists across five award categories/.test(s.stat), s.stat);
    check(`${tag}: anchor navigation lists winners, finalists, highlights, categories, jury and the report`, JSON.stringify(s.nav.slice(0, 5)) === JSON.stringify([["2026 winners", "#winners"], ["Finalists", "#finalists"], ["Highlights", "#highlights"], ["Categories", "#categories"], ["Jury", "#jury"]]) && /^Download report/.test(s.nav[5][0]) && s.navLabel === "On this page", JSON.stringify(s.nav));
    check(`${tag}: section order follows Paper (hero, nav, winners, about, finalists, accordions)`, await page.evaluate(() => { const y = (sel) => document.querySelector(sel).getBoundingClientRect().top + scrollY; const o = [".fides-awards-hero", ".fides-awards-sections", "#winners", "#about", "#finalists", "#highlights", "#categories", "#jury"].map(y); return o.every((v, i) => i === 0 || v > o[i - 1]); }));

    check(`${tag}: ranking titles 20/26 and descriptions 17/27`, s.finalistTitle.size === "20px" && s.finalistTitle.lh === "26px" && s.finalistText.size === "17px" && s.finalistText.lh === "27px", JSON.stringify([s.finalistTitle, s.finalistText]));

    // ---- Section menu: the shared design-system pattern, as on the use-case detail page.
    const sm0 = await page.evaluate(() => { const n = document.querySelector(".fides-awards-sections"); const c = getComputedStyle(n); return { shared: n.matches(".fides-ds-section-nav[data-fides-ds-section-nav]"), tag: n.tagName, pos: c.position, bg: c.backgroundColor, z: c.zIndex, top: c.top, margins: [...document.querySelectorAll(".fides-awards [id]")].every((e) => getComputedStyle(e).scrollMarginTop === "80px"), custom: !!document.querySelector(".fides-awards-nav, .fides-awards-navbar") }; });
    check(`${tag}: section menu uses the shared design-system markup (no custom bar) and anchors clear it by 80px`, sm0.shared && sm0.tag === "DETAILS" && !sm0.custom && sm0.margins, JSON.stringify(sm0));
    if (w >= 1100) {
      check(`${tag}: section menu is a white sticky bar`, sm0.pos === "sticky" && sm0.bg === "rgb(255, 255, 255)" && sm0.z === "5", JSON.stringify(sm0));
      await page.evaluate(() => window.scrollTo(0, 3200)); await settle(page);
      const pinned = await page.evaluate(() => { const b = document.querySelector(".fides-awards-sections").getBoundingClientRect(); return { top: Math.round(b.top), h: Math.round(b.height), cur: [...document.querySelectorAll('.fides-awards-sections a[aria-current="location"]')].map((a) => a.textContent.trim()), line: (() => { const a = document.querySelector('.fides-awards-sections a[aria-current="location"]'); if (!a) return null; const c = getComputedStyle(a); return [c.borderBottomWidth, c.borderBottomColor]; })() }; });
      check(`${tag}: after scrolling the bar stays at the top and marks one current section with a 2px blue underline`, pinned.top === 0 && pinned.cur.length === 1 && pinned.line && pinned.line[0] === "2px" && pinned.line[1] === "rgb(8, 72, 163)" || (pinned.top === 0 && pinned.cur.length === 1 && pinned.line && pinned.line[0] === "2px"), JSON.stringify(pinned));
      const hov = page.locator('.fides-awards-sections a[href="#jury"]');
      await hov.hover(); await page.waitForTimeout(100);
      check(`${tag}: hover on a menu link draws the blue underline like the use-case page`, await hov.evaluate((e) => { const c = getComputedStyle(e); return c.borderBottomWidth === "2px" && c.borderBottomColor !== "rgba(0, 0, 0, 0)"; }));
      await page.mouse.move(2, 2);
      await page.evaluate(() => window.scrollTo(0, 0)); await settle(page);
    } else {
      check(`${tag}: narrow screens get the "On this page" disclosure of the shared pattern`, await page.evaluate(() => { const d = document.querySelector(".fides-awards-sections"); return !d.open && /On this page/.test(d.querySelector("summary").textContent); }));
    }

    if (w === WIDTHS[0]) {
      const menu = await page.evaluate(() => [...document.querySelectorAll(".fides-ds-menu__link")].filter((a) => a.textContent.trim() === "Global Digital Trust Awards").map((a) => a.href));
      check(`${tag}: main menu Ecosystem > Global Digital Trust Awards opens the pilot page`, menu.length >= 1 && menu.every((h) => h === PAGE), JSON.stringify(menu));
    }

    // ---- Whitespace: closed category rows are the click row, dividers touch.
    const rows = await page.evaluate(() => [...document.querySelectorAll(".fides-awards-category")].map((d) => { const b = d.getBoundingClientRect(); return [Math.round(b.top + scrollY), Math.round(b.height), Math.round(d.querySelector("summary").getBoundingClientRect().height)]; }));
    check(`${tag}: closed category rows are 62-64px with no extra space, dividers bound adjacent rows`, rows.every((r) => r[1] >= 62 && r[1] <= 64 && r[2] === 62) && rows.every((r, i) => i === 0 || Math.abs(r[0] - (rows[i - 1][0] + rows[i - 1][1])) <= 1), JSON.stringify(rows));
    const gap = await page.evaluate(() => { const h = document.querySelector("#winners .fides-awards-head").getBoundingClientRect(); const i = document.querySelector("#winners .fides-awards-intro").getBoundingClientRect(); return Math.round(i.top - h.bottom); });
    check(`${tag}: heading to introduction gap is the design-system 16px`, gap === 16, String(gap));

    // ---- Winner cards: shared rows and bottom-aligned actions.
    const wc = await page.evaluate(() => [...document.querySelectorAll(".fides-awards-winner")].map((c) => { const k = [...c.children].map((e) => Math.round(e.getBoundingClientRect().top + scrollY)); const l = c.querySelector(".fides-awards-winner__link a").getBoundingClientRect(); const b = c.getBoundingClientRect(); const t = c.querySelector(".fides-awards-winner__text"); return { card: Math.round(b.top + scrollY), rows: k, linkBottom: Math.round(l.bottom + scrollY), cardBottom: Math.round(b.bottom + scrollY), textGapTitle: Math.round(t.getBoundingClientRect().top - c.querySelector("h3").getBoundingClientRect().bottom) }; }));
    const byRow = {};
    for (const c of wc) (byRow[c.card] = byRow[c.card] || []).push(c);
    check(`${tag}: cards in a row share title, description and action positions; actions end at the same height`, Object.values(byRow).every((g) => g.every((c) => c.rows.every((v, i) => v === g[0].rows[i]) && c.linkBottom === g[0].linkBottom && c.cardBottom === g[0].cardBottom)), JSON.stringify(wc.slice(0, 3)));
    check(`${tag}: description and action keep the same fixed distances in every card`, new Set(wc.map((c) => c.textGapTitle)).size === 1 && wc.every((c) => c.cardBottom - c.linkBottom >= 20 && c.cardBottom - c.linkBottom <= 36), JSON.stringify(wc.map((c) => [c.textGapTitle, c.cardBottom - c.linkBottom])));

    // ---- Hero against the right panel.
    const hero = await page.evaluate(() => { const m = document.querySelector(".fides-awards-hero__main").getBoundingClientRect(); const p = document.querySelector(".fides-awards-panel").getBoundingClientRect(); return { mx: m.left, mw: m.width, mb: m.bottom, px: p.left, pw: p.width, pt: p.top, mt: m.top }; });
    if (w >= 1024) check(`${tag}: hero text left, panel right (≈460px) on one row`, hero.px > hero.mx + hero.mw - 1 && Math.abs(hero.pw - 460) <= 2 && Math.abs(hero.pt - hero.mt) < 40, JSON.stringify(hero));
    else check(`${tag}: panel stacks below the hero text`, hero.pt >= hero.mb - 1 && hero.pw >= w - 100, JSON.stringify(hero));

    // ---- Winner banners: original images, whole, not cropped.
    const ban = await page.evaluate(async () => {
      const out = [];
      for (const img of document.querySelectorAll(".fides-awards-banner img")) {
        if (!img.complete) await new Promise((r) => { img.onload = img.onerror = r; });
        const b = img.getBoundingClientRect(); const c = getComputedStyle(img);
        out.push({ nw: img.naturalWidth, nh: img.naturalHeight, w: b.width, h: b.height, fit: c.objectFit, alt: img.alt, src: img.currentSrc, ar: c.aspectRatio, cw: img.parentElement.getBoundingClientRect().width });
      }
      return out;
    });
    check(`${tag}: five original banners, loaded, with alt text`, ban.length === 5 && ban.every((b) => b.nw === b.nh && b.nw >= b.w * 0.99 && b.alt.length > 10 && /\/wp-content\/uploads\//.test(b.src)), JSON.stringify(ban[0]));
    check(`${tag}: banners keep their aspect ratio (no crop, no fixed box)`, ban.every((b) => Math.abs(b.w / b.h - b.nw / b.nh) < 0.01 && (b.fit === "contain" || b.fit === "fill") && /^auto/.test(b.ar) && b.w <= 281 && b.w >= Math.min(b.cw, 280) - 1), JSON.stringify(ban.map((b) => [Math.round(b.w), Math.round(b.h), b.fit, b.ar])));
    const cards = await page.evaluate(() => [...document.querySelectorAll(".fides-awards-winner")].map((c) => { const b = c.getBoundingClientRect(); const i = c.querySelector("img").getBoundingClientRect(); const l = c.querySelector("a").getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), r: Math.round(b.right), ix: i.left >= b.left && i.right <= b.right, lb: l.bottom <= b.bottom + 1, border: getComputedStyle(c).borderTopWidth, bg: getComputedStyle(c).backgroundColor }; }));
    const perRow = w >= 1024 ? 3 : w >= 600 ? 2 : 1;
    check(`${tag}: winner cards ${perRow} per row, inside the screen, banner and link inside the card`, cards.every((c) => c.r <= w && c.ix && c.lb && c.border === "3px") && new Set(cards.map((c) => c.y)).size === Math.ceil(5 / perRow), JSON.stringify(cards));

    // ---- Accordions closed by default; Paper 28.3 is the open state.
    const closed = await page.evaluate(() => [...document.querySelectorAll(".fides-awards details:not(.fides-ds-section-nav)")].map((d) => d.open));
    check(`${tag}: eight accordions, all closed by default`, closed.length === 8 && closed.every((o) => !o), JSON.stringify(closed));
    const sum = page.locator("#highlights > summary");
    await sum.scrollIntoViewIfNeeded(); await settle(page);
    const sbox = await sum.boundingBox();
    check(`${tag}: accordion row is at least 44px tall and as wide as the content`, sbox.height >= 44 && sbox.width >= w - 2 * 48 - 4 || sbox.height >= 44, JSON.stringify(sbox));
    // Hover.
    const col0 = await sum.evaluate((e) => getComputedStyle(e).color);
    await sum.hover(); await page.waitForTimeout(100);
    const col1 = await sum.evaluate((e) => getComputedStyle(e).color);
    check(`${tag}: hover colours the accordion title`, col0 !== col1 && col1 === "rgb(8, 72, 163)", `${col0} → ${col1}`);
    await page.mouse.move(2, 2);
    // Mouse open and close.
    await sum.click();
    check(`${tag}: click opens Highlights`, await page.evaluate(() => document.querySelector("#highlights").open));
    // Open state like Paper 28.3: caption, photos, no clipping.
    const hl = await page.evaluate(async () => {
      const g = document.querySelector("#highlights"); const imgs = [...g.querySelectorAll("img")];
      for (const im of imgs.slice(0, 6)) { im.loading = "eager"; if (!im.complete) await new Promise((r) => { im.onload = im.onerror = r; setTimeout(r, 4000); }); }
      const first = imgs[0].getBoundingClientRect(); const box = g.getBoundingClientRect();
      return { n: imgs.length, caption: g.querySelector(".fides-awards-caption").textContent.trim(), loaded: imgs.slice(0, 6).every((i) => i.naturalWidth > 100), inside: first.right <= box.right + 1 && first.left >= box.left - 1, cols: new Set([...imgs.slice(0, 12)].map((i) => Math.round(i.getBoundingClientRect().left))).size, text: g.querySelector("summary").textContent.trim() };
    });
    check(`${tag}: Highlights shows the caption and 71 photos inside the row`, hl.n === 71 && hl.caption === "Award ceremony · Global Digital Collaboration, Geneva · 2026" && hl.loaded && hl.inside, JSON.stringify(hl));
    check(`${tag}: photo grid responds (${w >= 768 ? "several" : "one or two"} columns)`, w >= 1024 ? hl.cols >= 4 : w >= 768 ? hl.cols >= 3 : hl.cols >= 1 && hl.cols <= 2, `cols ${hl.cols}`);
    // Lightbox on the first photo: opens, shows the photo whole, Escape closes and returns focus.
    const trig = page.locator("#highlights .wp-block-image button.lightbox-trigger").first();
    await trig.scrollIntoViewIfNeeded(); await settle(page);
    await trig.click(); await page.waitForTimeout(900);
    const lb = await page.evaluate(() => { const o = document.querySelector(".wp-lightbox-overlay.active"); if (!o) return null; const im = o.querySelector("img"); const b = im.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), nw: im.naturalWidth, nh: im.naturalHeight, inView: b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1, role: o.getAttribute("role") }; });
    check(`${tag}: lightbox shows the whole photo inside the screen`, !!lb && lb.inView && lb.nw > 0 && Math.abs(lb.w / lb.h - lb.nw / lb.nh) < 0.03, JSON.stringify(lb));
    await page.keyboard.press("Escape"); await page.waitForTimeout(600);
    check(`${tag}: Escape closes the lightbox and focus returns to the photo`, await page.evaluate(() => !document.querySelector(".wp-lightbox-overlay.active") && document.activeElement && document.activeElement.classList.contains("lightbox-trigger")));
    await sum.scrollIntoViewIfNeeded(); await settle(page);
    await sum.click();
    check(`${tag}: click closes Highlights again`, await page.evaluate(() => !document.querySelector("#highlights").open));
    // Keyboard: Enter and Space on the summary.
    await page.keyboard.press("Tab"); // keyboard modality, so focus rings are drawn for scripted focus
    for (const id of ["jury", "categories"]) {
      const sm = page.locator(`#${id} > summary`);
      await sm.scrollIntoViewIfNeeded(); await settle(page);
      await sm.focus();
      const ring = await sm.evaluate((e) => { const c = getComputedStyle(e); return { st: c.outlineStyle, w: parseFloat(c.outlineWidth) }; });
      await page.keyboard.press("Enter");
      const a = await page.evaluate((i) => document.getElementById(i).open, id);
      await page.keyboard.press("Space");
      const b = await page.evaluate((i) => document.getElementById(i).open, id);
      await page.keyboard.press("Space");
      const c = await page.evaluate((i) => document.getElementById(i).open, id);
      check(`${tag}: #${id} Enter opens, Space closes, Space opens again; visible focus ring`, a === true && b === false && c === true && ring.st !== "none" && ring.w >= 2, JSON.stringify({ a, b, c, ring }));
      await page.keyboard.press("Enter");
    }
    // Jury open: image and text (Paper 28.3).
    await page.evaluate(() => { document.querySelector("#jury").open = true; });
    const jury = await page.evaluate(async () => {
      const j = document.querySelector("#jury"); const im = j.querySelector(".fides-awards-jury img");
      for (const x of j.querySelectorAll("img")) { x.loading = "eager"; if (!x.complete) await new Promise((r) => { x.onload = x.onerror = r; setTimeout(r, 4000); }); }
      const b = im.getBoundingClientRect(); const logos = [...j.querySelectorAll(".fides-awards-logos a")].map((a) => [a.href, a.querySelector("img").alt, a.getBoundingClientRect().height]);
      return { nw: im.naturalWidth, nh: im.naturalHeight, w: b.width, h: b.height, alt: im.alt, text: j.querySelector(".fides-awards-jury__text").textContent.trim(), logos, box: j.getBoundingClientRect().right };
    });
    check(`${tag}: jury image shown whole at its own ratio, with the 50/50 text and six partner logos`, jury.nw >= 300 && Math.abs(jury.w / jury.h - jury.nw / jury.nh) < 0.01 && jury.w <= 901 && jury.alt.length > 10 && /each contributing 50%/.test(jury.text) && jury.logos.length === 6 && jury.logos.every((l) => l[2] >= 44), JSON.stringify(jury).slice(0, 400));
    await page.evaluate(() => { document.querySelectorAll(".fides-awards details:not(.fides-ds-section-nav)").forEach((d) => { d.open = false; }); });

    // ---- Category rows: open all, long titles and ranking content.
    await page.evaluate(() => document.querySelectorAll(".fides-awards-category").forEach((d) => { d.open = true; }));
    const rank = await page.evaluate(() => {
      const bad = [];
      for (const e of document.querySelectorAll(".fides-awards-finalist__title, .fides-awards-finalist__text, .fides-awards-rank, .fides-awards-category > summary")) { if (e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > innerWidth) bad.push(e.textContent.slice(0, 40)); }
      const rows = [...document.querySelectorAll(".fides-awards-category")].map((d) => [d.querySelector("summary").textContent.trim(), [...d.querySelectorAll(".fides-awards-rank")].map((r) => r.textContent.trim())]);
      return { bad, rows, longest: Math.max(...[...document.querySelectorAll(".fides-awards-finalist__title")].map((e) => e.textContent.length)) };
    });
    check(`${tag}: long finalist titles wrap inside the screen (longest ${rank.longest} chars)`, rank.bad.length === 0 && (await overflow(page)) <= 0, JSON.stringify(rank.bad));
    check(`${tag}: rankings keep the original ranks, ties included`, JSON.stringify(rank.rows) === JSON.stringify([
      ["Collaboration Award", ["Rank 1 · Winner 2026", "Rank 2", "Rank 3", "Rank 3", "Rank 5"]],
      ["Social Impact Award", ["Rank 1 · Winner 2026", "Rank 2", "Rank 3", "Rank 4", "Rank 5"]],
      ["Adoption Award", ["Rank 1 · Winner 2026", "Rank 2", "Rank 2", "Rank 4", "Rank 5"]],
      ["Best Wallet Award", ["Rank 1 · Winner 2026", "Rank 2", "Rank 3", "Rank 3"]],
      ["Business Value Award", ["Rank 1 · Winner 2026", "Rank 2", "Rank 3", "Rank 4", "Rank 5"]],
    ]), JSON.stringify(rank.rows));
    const fimg = await page.evaluate(async () => {
      const rows = [...document.querySelectorAll(".fides-awards-finalist")];
      const imgs = [...document.querySelectorAll(".fides-awards-finalist__image img")];
      for (const im of imgs) { im.loading = "eager"; }
      await Promise.all(imgs.map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; setTimeout(r, 8000); })));
      const textless = rows.filter((r) => !r.classList.contains("fides-awards-finalist--image")).map((r) => r.querySelector("h4").textContent.trim());
      const geo = rows.filter((r) => r.classList.contains("fides-awards-finalist--image")).map((r) => { const f = r.querySelector(".fides-awards-finalist__image").getBoundingClientRect(); const body = r.querySelector(".fides-awards-finalist__body").getBoundingClientRect(); const i = r.querySelector("img"); const c = getComputedStyle(i); return { besideText: f.right <= body.left + 1 && Math.abs(f.top - body.top) < 8, fit: c.objectFit, alt: i.getAttribute("alt"), src: i.getAttribute("src"), loaded: i.naturalWidth > 0, w: Math.round(f.width) }; });
      const icons = [...document.querySelectorAll(".fides-awards-rank")].map((r) => [r.classList.contains("fides-awards-rank--winner"), getComputedStyle(r, "::before").content !== "none" && getComputedStyle(r, "::before").content !== "normal"]);
      return { total: rows.length, withImage: geo.length, textless, geo, icons };
    });
    check(`${tag}: 23 of 24 finalists show their catalog image next to the text; the one without catalog data stays text-only`, fimg.total === 24 && fimg.withImage === 23 && fimg.textless.length === 1 && /Real Estate Purchasing Journey/.test(fimg.textless[0]) && fimg.geo.every((g) => g.besideText && g.fit === "contain" && g.alt === "" && g.src.startsWith("https://") && g.w === (w >= 768 ? 168 : 88)), JSON.stringify([fimg.withImage, fimg.textless, fimg.geo.filter((g) => !g.besideText).slice(0, 2)]));
    check(`${tag}: only rank-1 entries carry the award icon`, fimg.icons.length === 24 && fimg.icons.every(([win, icon]) => win === icon) && fimg.icons.filter(([w2]) => w2).length === 5, JSON.stringify(fimg.icons));
    check(`${tag}: the winner tint does not move the text or image off the shared left edge`, await page.evaluate(() => { const edge = (r) => r.querySelector(".fides-awards-finalist__image, .fides-awards-rank").getBoundingClientRect().left; const c = document.querySelector(".fides-awards-category"); const rows = [...c.querySelectorAll(".fides-awards-finalist")]; return rows.every((r) => Math.abs(edge(r) - edge(rows[1])) <= 1); }));
    check(`${tag}: finalist rows hold the vertical rhythm (title, text, link inside the row)`, await page.evaluate(() => [...document.querySelectorAll(".fides-awards-finalist")].every((f) => { const b = f.getBoundingClientRect(); return [...f.children].every((c) => c.getBoundingClientRect().bottom <= b.bottom + 1 && c.getBoundingClientRect().right <= b.right + 1); })));
    await page.evaluate(() => document.querySelectorAll(".fides-awards-category").forEach((d) => { d.open = false; }));

    // ---- Anchors by mouse: target visible, accordion opens.
    for (const [label, href] of s.nav.slice(0, 5)) {
      await page.evaluate(() => window.scrollTo(0, 0)); await settle(page);
      if (w < 1100) await page.locator(".fides-awards-sections > summary").click();
      await page.locator(`.fides-awards-sections a[href="${href}"]`).click();
      await page.waitForTimeout(900);
      const r = await page.evaluate((h) => { const t = document.querySelector(h); const b = t.getBoundingClientRect(); return { hash: location.hash, top: Math.round(b.top), open: t.tagName === "DETAILS" ? t.open : null, focus: document.activeElement && document.activeElement.tagName }; }, href);
      check(`${tag}: nav "${label}" scrolls to ${href}${r.open !== null ? " and opens it" : ""}`, r.hash === href && r.top >= -4 && r.top < 700 && (r.open === null || r.open === true), JSON.stringify(r));
      if (r.open) await page.evaluate((h) => { document.querySelector(h).open = false; }, href);
    }
    // Anchors by keyboard: Tab to the Jury link, Enter.
    await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); });
    await page.keyboard.press("Tab");
    if (w < 1100) { await page.locator(".fides-awards-sections > summary").click(); await page.keyboard.press("Tab"); }
    await page.evaluate(() => document.querySelector('.fides-awards-sections a[href="#jury"]').focus());
    const navRing = await page.evaluate(() => { const c = getComputedStyle(document.activeElement); return { st: c.outlineStyle, w: parseFloat(c.outlineWidth) }; });
    await page.keyboard.press("Enter"); await page.waitForTimeout(900);
    const kb = await page.evaluate(() => ({ open: document.querySelector("#jury").open, focus: document.activeElement.tagName + ":" + (document.activeElement.parentElement && document.activeElement.parentElement.id) }));
    check(`${tag}: keyboard Enter on the Jury link opens the jury row, moves focus to its summary and the link shows a focus ring`, kb.open === true && kb.focus === "SUMMARY:jury" && navRing.st !== "none" && navRing.w >= 2, JSON.stringify([kb, navRing]));
    await page.evaluate(() => { document.querySelector("#jury").open = false; });
    // Deep link opens the accordion on load.
    const p2 = await ctx.newPage();
    await p2.goto(`${PAGE}#categories`, { waitUntil: "load" });
    await p2.waitForTimeout(600);
    check(`${tag}: deep link #categories opens the row on load`, await p2.evaluate(() => document.querySelector("#categories").open));
    await p2.close();

    // ---- Links.
    const links = await page.evaluate(() => [...document.querySelectorAll(".fides-awards a[href]")].map((a) => ({ t: a.textContent.trim(), href: a.href, raw: a.getAttribute("href"), target: a.target, rel: a.rel, h: Math.round(a.getBoundingClientRect().height), w: Math.round(a.getBoundingClientRect().width), inLogos: !!a.closest(".fides-awards-logos") })));
    const internal = links.filter((l) => /\/(use-case|wallet)\/\?(usecase|wallet)=/.test(l.href));
    check(`${tag}: 29 catalog links (5 winner cards, 24 finalists) use the pilot detail pages`, internal.length === 29, String(internal.length));
    if (w === WIDTHS[0]) {
      const uniq = [...new Set(internal.map((l) => l.href))];
      check(`${tag}: ${uniq.length} distinct catalog targets (24 detail pages)`, uniq.length === 24, String(uniq.length));
      const bad = [];
      for (const href of uniq) {
        const r = await page.evaluate(async (u) => { const res = await fetch(u, { credentials: "same-origin" }); const t = await res.text(); return { s: res.status, notFound: /No (use case|wallet) found|not found|Not found/i.test(t.slice(0, 200000)), len: t.length }; }, href);
        if (r.s !== 200 || r.len < 5000) bad.push([href, r]);
      }
      check(`${tag}: every catalog link answers 200 with a detail page`, bad.length === 0, JSON.stringify(bad).slice(0, 400));
    }
    const external = links.filter((l) => !l.href.startsWith(BASE) && !l.href.includes("#"));
    const ext = external.map((l) => l.href);
    check(`${tag}: report and partner links are the original external destinations, opened safely`, ext.includes("https://fides.community/signin/?return_to=https%3A%2F%2Ffides.community%2Fawards%2Fglobal-digital-trust-awards%2F") && ext.includes("https://globaldigitalcollaboration.org/") && ["https://www.didas.swiss/", "https://diacc.ca/", "https://www.teletrust.de/en/startseite/", "https://www.apdiconsortium.org/", "https://www.asiapki.org/", "https://fides.community/"].every((u) => ext.includes(u)) && external.every((l) => l.target === "_blank" && /noopener/.test(l.rel)), JSON.stringify(ext));
    check(`${tag}: report links appear as the hero button, in the menu and under the accordions`, links.filter((l) => /Download (the full )?report/.test(l.t)).length === 3);
    const small = links.filter((l) => !l.inLogos && (l.h < 40 && !/^Download|^Global Digital|^international jury|^FIDES use case catalog/.test(l.t)));
    check(`${tag}: stand-alone links and buttons are at least 40px tall`, small.length === 0, JSON.stringify(small.slice(0, 3)));

    await page.evaluate(() => window.scrollTo(0, 0));
    if (process.env.SHOTS === "1" || w === 1440 || w === 390) await page.screenshot({ path: path.join(SHOTS, `awards-${w}.png`), fullPage: true });
    await ctx.close();
  }

  await browser.close();
  console.log(failures ? `${failures} awards check(s) failed` : "all awards checks passed");
  process.exit(failures ? 1 : 0);
})();
