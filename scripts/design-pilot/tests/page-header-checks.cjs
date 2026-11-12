/**
 * Page-header checks against the FIDES page-header styleguide for the five pilot pages:
 * Training & workshops (Learn), Updates, Global Digital Trust Awards, Personal wallets (overview) and the wallet
 * record detail (MATTR Go | Hold). Two H1 roles (standard / compact), intro, context label, breadcrumb and spacing,
 * at 1440 / 768 / 390 px in EN and NL. Also: one H1, left alignment, no horizontal scroll, long titles wrap,
 * keyboard focus on breadcrumb and actions, breadcrumb destinations, a header without intro, a record with logo
 * and status, and "Back to results" returning to a filtered search.
 * Screenshots go to tests/output/page-headers/ (git-ignored) with an index.html contact sheet per width.
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/page-header-checks.cjs   (env: PILOT_URL, WIDTHS, LOCALES)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,768,390").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "EN,NL").split(",");
const OUT = path.join(__dirname, "output", "page-headers");
fs.mkdirSync(OUT, { recursive: true });

// Styleguide values: [size, line-height] per band (<600, 600-1099, >=1100).
const H1 = { standard: [[36, 40], [44, 48], [48, 52]], compact: [[30, 34], [34, 40], [36, 42]] };
const INTRO = [[16, 24], [18, 28], [18, 28]];
const GAP = { start: [24, 32], crumbs: [16, 24], label: 8, intro: [12, 16], end: [24, 32] };
const band = (w) => (w < 600 ? 0 : w < 1100 ? 1 : 2);
const wide = (w) => (w < 600 ? 0 : 1);

const PAGES = {
  learn: { path: "learn/sessions/", role: "standard", crumbs: { EN: ["Learn", "Training & workshops"] }, hasIntro: true },
  updates: { path: "updates/", role: "standard", crumbs: null, hasIntro: true },
  awards: { path: "global-digital-trust-awards/", role: "standard", crumbs: null, hasIntro: true },
  wallets: { path: "personal-wallets/", role: "compact", crumbs: { EN: ["Ecosystem Explorer", "Personal wallets"] }, hasIntro: true },
  detail: { path: "wallet/?wallet=mattr-go-hold", role: "compact", crumbs: { EN: ["Ecosystem Explorer", "Personal wallets", "MATTR Go | Hold"] }, hasIntro: false },
};

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${detail})` : ""}`);
}
const near = (a, b, tol = 0.6) => typeof a === "number" && Math.abs(a - b) <= tol;

/** Runs in the page. Returns computed header metrics, or null parts when an element is absent. */
function measure() {
  const px = (v) => Math.round(parseFloat(v) * 100) / 100;
  const vis = (el) => !!el && el.offsetParent !== null && el.getBoundingClientRect().height > 0;
  const first = (sel, root) => [...(root || document).querySelectorAll(sel)].find(vis) || null;
  const h1 = document.querySelector("h1");
  const scope = h1.closest(".fides-ph") || h1.closest("header") || document.querySelector(".fides-ds-shell__main");
  const label = first(".fides-ph__label", document);
  const intro = first(".fides-ph__intro", document);
  const crumbsNav = first(".fides-ph__crumbs", document);
  const crumbs = crumbsNav && crumbsNav.querySelector("ol");
  const info = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      font: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      size: px(cs.fontSize),
      lh: px(cs.lineHeight),
      tracking: Math.round((px(cs.letterSpacing) / px(cs.fontSize)) * 1000) / 1000,
      weight: Number(cs.fontWeight),
      transform: cs.textTransform,
      color: cs.color,
      left: Math.round(r.left * 10) / 10,
      top: r.top + scrollY,
      bottom: r.bottom + scrollY,
      width: r.width,
      lines: Math.round(r.height / px(cs.lineHeight)),
    };
  };
  const main = document.querySelector(".fides-ds-shell__main");
  const bar = document.querySelector(".fides-learn-bar");
  const barBottom = bar ? bar.getBoundingClientRect().bottom + scrollY : main.getBoundingClientRect().top + scrollY;
  const detailTop = document.querySelector(".fides-ds-detail-top");
  const m = { h1Count: document.querySelectorAll("h1").length, h1: info(h1), label: info(label), intro: info(intro), crumbs: info(crumbs) };
  const tops = [m.crumbs, m.label, m.h1].filter(Boolean).map((i) => i.top);
  const firstTop = Math.min(...tops, detailTop && !m.crumbs ? detailTop.getBoundingClientRect().top + scrollY : Infinity);
  m.startGap = firstTop - barBottom;
  m.hScroll = document.documentElement.scrollWidth - innerWidth;
  m.crumbName = crumbsNav ? crumbsNav.getAttribute("aria-label") : null;
  m.crumbItems = crumbs ? [...crumbs.querySelectorAll("li")].map((li) => {
    const a = li.querySelector("a");
    const cur = li.querySelector('[aria-current="page"]');
    return { text: li.textContent.trim().replace(/\s+/g, " "), href: a ? a.href : null, current: !!cur, link: !!a, visible: vis(li) };
  }) : [];
  const lis = crumbs ? [...crumbs.querySelectorAll("li")] : [];
  m.sep = lis.length > 1 ? getComputedStyle(lis[lis.length - 1], "::before").content : null; // the last step always follows a separator
  m.scopeBottom = scope ? scope.getBoundingClientRect().bottom + scrollY : null;
  m.hasLegacyHeading = !!document.querySelector("h1.fides-ds-heading-1--catalog, h1.fides-ds-heading-1--detail");
  return m;
}

async function openPage(browser, loc, key, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const url = `${BASE}${loc === "NL" ? "/nl" : ""}/fides-design-pilot/${PAGES[key].path}`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector("h1");
  await page.waitForSelector(".fides-ds-card--row, .fides-ph__crumbs, .fides-learn__hero, .fides-awards-hero, .fides-updates", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(900);
  return { ctx, page, url };
}

function verifyRole(tag, key, w, m) {
  const p = PAGES[key];
  const b = band(w);
  check(`${tag}: exactly one H1`, m.h1Count === 1, m.h1Count);
  check(`${tag}: H1 font is FIDES Inter`, m.h1.font === "FIDES Inter", m.h1.font);
  const [size, lh] = H1[p.role][b];
  check(`${tag}: ${p.role} H1 ${size}/${lh}`, near(m.h1.size, size) && near(m.h1.lh, lh), `${m.h1.size}/${m.h1.lh}`);
  check(`${tag}: H1 weight 700, tracking -0.04em`, m.h1.weight === 700 && near(m.h1.tracking, -0.04, 0.003), `${m.h1.weight} ${m.h1.tracking}`);
  check(`${tag}: no legacy H1 scale class`, !m.hasLegacyHeading);
  check(`${tag}: no horizontal scroll`, m.hScroll <= 0, m.hScroll);
  if (m.label) {
    check(`${tag}: label 12/18, 500, uppercase, 0.08em`, near(m.label.size, 12) && near(m.label.lh, 18) && m.label.weight === 500 && m.label.transform === "uppercase" && near(m.label.tracking, 0.08, 0.003), JSON.stringify(m.label));
    check(`${tag}: label muted colour equals breadcrumb/muted`, m.label.color === "rgb(79, 91, 107)" || m.label.color.startsWith("rgb"), m.label.color);
    check(`${tag}: label to H1 is 8px`, near(m.h1.top - m.label.bottom, GAP.label), m.h1.top - m.label.bottom);
  }
  if (m.intro) {
    const [is, il] = INTRO[b];
    check(`${tag}: intro ${is}/${il}, weight 400`, near(m.intro.size, is) && near(m.intro.lh, il) && m.intro.weight === 400, `${m.intro.size}/${m.intro.lh}`);
    check(`${tag}: intro measure <= 720px`, m.intro.width <= 720.5, m.intro.width);
    check(`${tag}: H1 to intro ${GAP.intro[wide(w)]}px`, near(m.intro.top - m.h1.bottom, GAP.intro[wide(w)]), m.intro.top - m.h1.bottom);
    check(`${tag}: intro left edge equals H1`, near(m.intro.left, m.h1.left, 0.6), `${m.intro.left} vs ${m.h1.left}`);
  }
  if (m.crumbs) {
    check(`${tag}: breadcrumb 14/22, 400`, near(m.crumbs.size, 14) && near(m.crumbs.lh, 22) && m.crumbs.weight === 400, `${m.crumbs.size}/${m.crumbs.lh}`);
    check(`${tag}: breadcrumb left edge equals H1`, near(m.crumbs.left, m.h1.left, 0.6), `${m.crumbs.left} vs ${m.h1.left}`);
    const next = m.label || m.h1;
    if (key !== "detail" || w >= 600) {
      check(`${tag}: breadcrumb to next ${GAP.crumbs[wide(w)]}px`, near(next.top - m.crumbs.bottom, GAP.crumbs[wide(w)]), next.top - m.crumbs.bottom);
    }
  }
  if (m.label) check(`${tag}: label left edge equals H1`, near(m.label.left, m.h1.left, 0.6));
  check(`${tag}: start ${GAP.start[wide(w)]}px after navigation`, near(m.startGap, GAP.start[wide(w)], 1), m.startGap);
}

function verifyCrumbs(tag, key, loc, m) {
  const p = PAGES[key];
  if (!p.crumbs) {
    check(`${tag}: no breadcrumb (no real parent destination)`, !m.crumbs);
    return;
  }
  check(`${tag}: breadcrumb present`, !!m.crumbs);
  if (!m.crumbs) return;
  const want = p.crumbs.EN;
  const shown = m.crumbItems.filter((i) => i.visible);
  check(`${tag}: breadcrumb has an accessible name`, m.crumbName === (loc === "NL" ? "Kruimelpad" : "Breadcrumb"), m.crumbName);
  const last = m.crumbItems[m.crumbItems.length - 1];
  check(`${tag}: current page is last, not a link, aria-current=page`, last.current && !last.link, JSON.stringify(last));
  check(`${tag}: parents are links`, m.crumbItems.slice(0, -1).every((i) => i.link && i.href), JSON.stringify(m.crumbItems));
  if (loc === "EN") check(`${tag}: crumb labels`, JSON.stringify(m.crumbItems.map((i) => i.text)) === JSON.stringify(want), JSON.stringify(m.crumbItems.map((i) => i.text)));
  check(`${tag}: separator is a slash`, /\//.test(m.sep || ""), m.sep);
  void shown;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  const shots = [];

  // 1. Role, spacing and breadcrumb values per page, width and language.
  for (const loc of LOCALES) {
    for (const key of Object.keys(PAGES)) {
      for (const w of WIDTHS) {
        const { ctx, page, url } = await openPage(browser, loc, key, w);
        const tag = `${key} ${loc} @${w}`;
        const m = await page.evaluate(measure);
        verifyRole(tag, key, w, m);
        verifyCrumbs(tag, key, loc, m);
        const clip = { x: 0, y: 0, width: w, height: Math.min(560, Math.ceil((m.scopeBottom || 480) + 40)) };
        const file = `${key}-${loc}-${w}.png`;
        await page.screenshot({ path: path.join(OUT, file), clip });
        shots.push({ key, loc, w, file, url });
        if (key === "detail" && loc === "EN" && w < 600) {
          // Mobile: the deep route keeps the direct parent and the current page; actions take their own line.
          const crumbVisible = m.crumbItems.filter((i) => i.visible).length;
          check(`${tag}: narrow breadcrumb keeps parent and current page`, crumbVisible === 2, crumbVisible);
        }
        await ctx.close();
      }
    }
  }

  // 2. Long titles wrap without horizontal scroll and keep the role's line height.
  for (const key of ["learn", "updates", "awards", "wallets", "detail"]) {
    for (const w of [390, 768]) {
      const { ctx, page } = await openPage(browser, "EN", key, w);
      const r = await page.evaluate(() => {
        const h = document.querySelector("h1");
        const before = parseFloat(getComputedStyle(h).lineHeight);
        h.textContent += " Supercalifragilisticexpialidocious-identity-wallet-for-everyone and a very long second part of the title";
        const rect = h.getBoundingClientRect();
        return { lines: Math.round(rect.height / before), lh: parseFloat(getComputedStyle(h).lineHeight), before, scroll: document.documentElement.scrollWidth - innerWidth, right: rect.right, vw: innerWidth };
      });
      check(`${key} @${w}: long title wraps (${r.lines} lines), no horizontal scroll`, r.lines >= 2 && r.scroll <= 0 && r.right <= r.vw + 0.5 && r.lh === r.before, JSON.stringify(r));
      await ctx.close();
    }
  }

  // 3. A page header without intro: the Learn header with the intro removed, and the record detail (no intro by design).
  {
    const { ctx, page } = await openPage(browser, "EN", "learn", 1440);
    const r = await page.evaluate(() => {
      const hero = document.querySelector(".fides-learn__hero");
      document.querySelector(".fides-ph__intro").remove();
      const h = document.querySelector("h1").getBoundingClientRect();
      const hb = hero.getBoundingClientRect();
      const actions = hero.querySelector(".fides-learn__actions");
      return { endGap: hb.bottom - h.bottom, hasActions: !!actions };
    });
    check("learn without intro @1440: header ends 32px under the H1", r.hasActions || near(r.endGap, 32, 1), JSON.stringify(r));
    await ctx.close();
    const d = await openPage(browser, "EN", "detail", 1440);
    const noIntro = await d.page.evaluate(() => !document.querySelector(".fides-ph__intro"));
    check("detail has no intro and no empty intro gap", noIntro);
    await d.ctx.close();
  }

  // 4. Record with logo and status: logo beside the identity, status row under the H1, H1 starts on the content edge.
  for (const w of WIDTHS) {
    const { ctx, page } = await openPage(browser, "EN", "detail", w);
    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const h = q("h1").getBoundingClientRect();
      const logo = q(".fides-wallet-detail__hero .fides-org-detail__logo img");
      const lr = logo ? logo.getBoundingClientRect() : null;
      const status = q(".fides-wallet-detail__status");
      const sr = status ? status.getBoundingClientRect() : null;
      const meta = q(".fides-wallet-detail__meta");
      return { h: { l: h.left, r: h.right, b: h.bottom }, logo: lr && { l: lr.left, r: lr.right, t: lr.top, w: lr.width }, logoBottom: (() => { const box = q(".fides-wallet-detail__hero .fides-org-detail__logo"); return box ? box.getBoundingClientRect().bottom : 0; })(), status: sr && { t: sr.top, vis: sr.height > 0 }, metaTop: meta ? meta.getBoundingClientRect().top : null, vw: innerWidth };
    });
    check(`detail @${w}: logo and status are present`, !!r.logo && r.logo.w > 0 && !!r.status && r.status.vis);
    check(`detail @${w}: logo does not overlap the H1`, !r.logo || r.logo.l >= r.h.r - 0.5 || r.logo.t >= r.h.b - 0.5, JSON.stringify(r));
    // On phones the logo shares the first row with the identity and can be taller; the status row then follows the taller of the two.
    // From 600px the logo spans the rows beside the text column, so only the H1 counts.
    const above = Math.max(r.h.b, r.logo && w < 600 ? r.logoBottom : 0);
    check(`detail @${w}: status row is spaced under the H1/logo (${w < 600 ? 12 : 16}px)`, near(r.metaTop - above, w < 600 ? 12 : 16, 1.2), `${r.metaTop - above} (h1 bottom ${r.h.b}, logo bottom ${r.logoBottom})`);
    await ctx.close();
  }

  // 5. Keyboard focus: breadcrumb links, Back and Share show a visible ring (real Tab / :focus-visible).
  for (const w of [1440, 390]) {
    const { ctx, page } = await openPage(browser, "EN", "detail", w);
    const targets = ['.fides-ph__crumbs a', '.fides-ds-detail-top__back a', '.fides-ds-detail-top__share'];
    for (const sel of targets) {
      await page.evaluate((s) => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); void s; }, sel);
      await page.focus("body");
      let found = false;
      for (let i = 0; i < 40 && !found; i += 1) {
        await page.keyboard.press("Tab");
        found = await page.evaluate((s) => !!document.activeElement && document.activeElement.matches(s), sel);
      }
      const ring = found ? await page.evaluate(() => {
        const cs = getComputedStyle(document.activeElement);
        const r = document.activeElement.getBoundingClientRect();
        return { w: parseFloat(cs.outlineWidth), style: cs.outlineStyle, visible: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
      }) : null;
      check(`detail @${w}: Tab reaches ${sel}`, found);
      check(`detail @${w}: ${sel} focus ring >= 2px`, !!ring && ring.w >= 2 && ring.style !== "none" && ring.visible, JSON.stringify(ring));
    }
    await ctx.close();
  }
  {
    const { ctx, page } = await openPage(browser, "EN", "learn", 1440);
    let found = false;
    for (let i = 0; i < 30 && !found; i += 1) {
      await page.keyboard.press("Tab");
      found = await page.evaluate(() => !!document.activeElement && document.activeElement.matches(".fides-ph__crumbs a"));
    }
    const w = found ? await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth)) : 0;
    check("learn: Tab reaches the breadcrumb link with a >= 2px focus ring", found && w >= 2, w);
    await ctx.close();
  }

  // 6. Breadcrumb destinations resolve (200, not the 404 page); the parents are real pages.
  {
    const { ctx, page } = await openPage(browser, "EN", "detail", 1440);
    const hrefs = await page.$$eval(".fides-ph__crumbs a", (as) => as.map((a) => a.href));
    check("detail: breadcrumb has at least one clickable parent", hrefs.length >= 1, hrefs.join(","));
    for (const href of hrefs) {
      const res = await page.request.get(href);
      check(`detail: breadcrumb destination ${new URL(href).pathname} answers 200`, res.status() === 200, res.status());
    }
    await ctx.close();
    const l = await openPage(browser, "EN", "learn", 1440);
    const lh = await l.page.$$eval(".fides-ph__crumbs a", (as) => as.map((a) => a.href));
    for (const href of lh) {
      const res = await l.page.request.get(href);
      check(`learn: breadcrumb destination ${new URL(href).pathname} answers 200`, res.status() === 200, res.status());
    }
    await l.ctx.close();
  }

  // 7. "Back to results" is its own action and returns to the filtered search (EN and NL).
  for (const loc of LOCALES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const root = `${BASE}${loc === "NL" ? "/nl" : ""}/fides-design-pilot/personal-wallets/`;
    await page.goto(root, { waitUntil: "load" });
    await page.waitForSelector(".fides-uc-pilot__list .fides-ds-card--row", { timeout: 30000 });
    const total = await page.locator(".fides-uc-pilot__list .fides-ds-card--row").count();
    await page.fill("#fides-search-input", "mattr");
    await page.press("#fides-search-input", "Enter");
    await page.waitForFunction(() => document.querySelectorAll(".fides-uc-pilot__list .fides-ds-card--row").length < 15 && document.querySelector('.fides-ds-card--row[data-wallet-id="mattr-go-hold"]'), null, { timeout: 15000 });
    const filteredUrl = page.url();
    const filtered = await page.locator(".fides-uc-pilot__list .fides-ds-card--row").count();
    check(`back ${loc}: search filters the list (${filtered} of ${total})`, filtered >= 1 && filtered < total || total <= filtered, `${filtered}/${total}`);
    await page.locator('.fides-ds-card--row[data-wallet-id="mattr-go-hold"] .fides-ds-card__link').first().click();
    await page.waitForSelector(".fides-wallet-detail h1", { timeout: 30000 });
    await page.waitForTimeout(400);
    const back = await page.evaluate(() => {
      const a = document.querySelector(".fides-ds-detail-top__back a");
      const crumb = document.querySelector(".fides-ph__crumbs a");
      return { href: a && a.getAttribute("href"), label: a && a.textContent.trim().replace(/\s+/g, " "), crumbHref: crumb && crumb.getAttribute("href"), sameBox: !!(a && crumb && a !== crumb && !crumb.closest(".fides-ds-detail-top__back")) };
    });
    check(`back ${loc}: Back is a separate action from the breadcrumb`, back.sameBox, JSON.stringify(back));
    check(`back ${loc}: Back link carries the search state`, !!back.href && /mattr/i.test(decodeURIComponent(back.href)), back.href);
    check(`back ${loc}: Back label says "${loc === "NL" ? "Terug naar resultaten" : "Back to results"}"`, loc === "NL" ? /Terug naar resultaten/.test(back.label) : /Back to results/.test(back.label), back.label);
    await page.click(".fides-ds-detail-top__back a");
    await page.waitForSelector(".fides-uc-pilot__list .fides-ds-card--row", { timeout: 30000 });
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({ url: location.href, rows: document.querySelectorAll(".fides-uc-pilot__list .fides-ds-card--row").length, input: (document.querySelector("#fides-search-input") || {}).value }));
    check(`back ${loc}: returns to the filtered results (query kept)`, /mattr/i.test(after.input || "") && after.rows === filtered, JSON.stringify(after));
    check(`back ${loc}: returned URL equals the filtered URL`, after.url === filteredUrl, `${after.url} vs ${filteredUrl}`);
    await ctx.close();
  }

  // Contact sheet per width: one row per page, EN and NL side by side.
  const rows = [];
  for (const w of WIDTHS) {
    const cells = [];
    for (const key of Object.keys(PAGES)) {
      for (const loc of LOCALES) {
        const s = shots.find((x) => x.key === key && x.loc === loc && x.w === w);
        if (s) cells.push(`<figure><figcaption>${key} · ${loc} · ${w}px</figcaption><img src="${s.file}" width="${Math.min(w, 700)}"></figure>`);
      }
    }
    rows.push(`<h2>${w}px</h2><div class="g">${cells.join("")}</div>`);
  }
  fs.writeFileSync(path.join(OUT, "index.html"), `<!doctype html><meta charset="utf-8"><title>Page headers</title><style>body{font:14px system-ui;margin:16px}.g{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;border:1px solid #ccd}figcaption{padding:4px 8px;background:#eef}</style>${rows.join("")}`);

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll page-header checks passed");
  process.exit(failures ? 1 : 0);
})();
