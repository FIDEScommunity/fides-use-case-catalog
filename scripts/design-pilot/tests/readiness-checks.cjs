/**
 * Homepage readiness module (Paper 25.16 desktop, 25.17 mobile): layout, wrapping,
 * click targets, hover, keyboard focus and links at one width per run.
 * Run: node readiness-checks.cjs (PLAYWRIGHT_MODULE, PILOT_URL, WIDTHS, SHOTS=dir).
 * PREVIEW=<path> additionally checks the "Understand what is changing" action on a
 * scratch page that was given explain_url (the seeded homepage has none on purpose).
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const path = require("path");
const fs = require("fs");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const HOME = `${BASE}/fides-design-pilot/homepage-fragment/`;
const PREVIEW = process.env.PREVIEW ? `${BASE}${process.env.PREVIEW}` : "";
const WIDTHS = (process.env.WIDTHS || "1440,1100,768,390,320").split(",").map(Number);
const SHOTS = process.env.SHOTS || "";
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d && !ok ? ` (${d})` : ""}`); };

const MODULE = ".fides-home-readiness";
const measure = (page) => page.evaluate((sel) => {
  const m = document.querySelector(sel);
  if (!m) return null;
  const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top + scrollY, w: b.width, h: b.height, r: b.right, b: b.bottom + scrollY }; };
  const cs = (el, p) => getComputedStyle(el)[p];
  const lead = m.querySelector(".fides-home-readiness__lead");
  const action = m.querySelector(".fides-home-readiness__action");
  const num = m.querySelector(".fides-home-readiness__number");
  const hero = document.querySelector("h1");
  const index = document.querySelector(".fides-uc-index");
  const lines = (el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
  const rows = [...m.querySelectorAll(".fides-home-readiness__list a")].map((a) => ({
    key: a.dataset.readiness, href: a.getAttribute("href"), text: a.textContent.replace(/\s+/g, " ").trim(), box: r(a), icon: r(a.querySelector(".fides-home-readiness__icon")),
    paths: a.querySelector("svg") ? a.querySelector("svg").innerHTML.replace(/\s+/g, " ").slice(0, 40) : "", colour: cs(a, "color"), weight: cs(a, "fontWeight"), size: cs(a, "fontSize"),
  }));
  const source = m.querySelector(".fides-home-readiness__source-link");
  const explain = m.querySelector(".fides-home-readiness__explain");
  return {
    bg: cs(m, "backgroundColor"), box: r(m), lead: r(lead), action: r(action), year: r(m.querySelector(".fides-home-readiness__year")),
    num: { ...r(num), lines: lines(num), size: cs(num, "fontSize"), weight: cs(num, "fontWeight"), wrap: cs(m.querySelector(".fides-home-readiness__year"), "whiteSpace") },
    end: m.querySelector(".fides-home-readiness__end").textContent.trim(), numText: num.textContent.trim(),
    titles: [...m.querySelectorAll("h2")].map((h) => ({ t: h.textContent.trim(), size: cs(h, "fontSize"), weight: cs(h, "fontWeight"), lh: cs(h, "lineHeight"), box: r(h) })),
    texts: [...m.querySelectorAll(".fides-home-readiness__text")].map((p) => p.textContent.trim()),
    actionBorder: { left: cs(action, "borderLeftWidth"), leftColour: cs(action, "borderLeftColor"), top: cs(action, "borderTopWidth"), topColour: cs(action, "borderTopColor") },
    source: source ? { href: source.getAttribute("href"), text: source.textContent.replace(/\s+/g, " ").trim(), label: source.getAttribute("aria-label"), box: r(source), size: cs(source, "fontSize") } : null,
    explain: explain ? { href: explain.getAttribute("href"), text: explain.textContent.replace(/\s+/g, " ").trim(), box: r(explain), size: cs(explain, "fontSize"), weight: cs(explain, "fontWeight") } : null,
    rows, old: document.querySelectorAll(".fides-home-learn").length,
    heroBottom: hero ? hero.getBoundingClientRect().bottom + scrollY : 0, indexTop: index ? index.getBoundingClientRect().top + scrollY : 1e9,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    leadTexts: [...lead.querySelectorAll(".fides-home-readiness__title,.fides-home-readiness__text,.fides-home-readiness__source")].map((el) => r(el).r),
  };
}, MODULE);

(async () => {
  const browser = await chromium.launch();
  for (const w of WIDTHS) {
    const tag = `${w}px`;
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addCookies(Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" }).map(([n, v]) => ({ name: `cmplz_${n}`, value: v, url: BASE })));
    await ctx.route((url) => !url.href.startsWith(BASE), (route) => (route.request().resourceType() === "document"
      ? route.fulfill({ status: 200, contentType: "text/html", body: "<title>External source</title><p>external</p>" }) : route.abort()));
    const page = await ctx.newPage();
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.locator(MODULE).waitFor({ timeout: 30000 });
    await page.locator(".fides-home-news__item").first().waitFor({ timeout: 30000 }).catch(() => {});
    const m = await measure(page);

    check(`${tag}: the old Learn strip is gone and the module replaces it`, m.old === 0);
    check(`${tag}: hero, theme index and latest updates stay`, (await page.locator("h1").first().textContent()).includes("Accelerating") && (await page.locator(".fides-uc-index").count()) === 1 && (await page.locator(".fides-home-news").count()) === 1);
    check(`${tag}: light blue, below the hero and above the theme index`, m.bg === "rgb(242, 247, 255)" && m.box.y >= m.heroBottom - 1 && m.box.b <= m.indexTop + 1, `${m.bg} ${m.box.y} ${m.heroBottom} ${m.box.b} ${m.indexTop}`);
    check(`${tag}: full width, no horizontal overflow`, Math.abs(m.box.w - w) <= 1 && m.overflow <= 0, `${m.box.w} ${m.overflow}`);

    // Copy, typography and the limited scope.
    check(`${tag}: left copy is the Paper text, no countdown and no general duty`, m.end === "END" && m.numText === "2027" && m.titles[0].t === "EUDI Wallet acceptance"
      && m.texts[0] === "Acceptance requirements will apply to certain private service providers. Does this include your organisation?"
      && !/countdown|days left|must|everyone|all organi[sz]ations/i.test(m.texts.join(" ")), JSON.stringify([m.end, m.numText, m.titles[0].t, m.texts[0]]));
    check(`${tag}: right copy is the Paper text`, m.titles[1].t === "What does this mean for your organisation?" && m.texts[1] === "Work through the impact on your services and agree the next steps with your team.", JSON.stringify([m.titles[1].t, m.texts[1]]));
    check(`${tag}: titles 20/26 bold, year 32px bold on one line`, m.titles.every((t) => t.size === "20px" && t.weight === "700" && t.lh === "26px") && m.num.size === "32px" && m.num.weight === "700" && m.num.lines === 1 && m.num.wrap === "nowrap", JSON.stringify([m.titles.map((t) => [t.size, t.weight, t.lh]), m.num]));
    check(`${tag}: year column is ${w >= 641 ? 104 : 80}px wide and the year fits in it`, Math.abs(m.year.w - (w >= 641 ? 104 : 80)) <= 1 && m.num.r <= m.year.r + 0.5, JSON.stringify([m.year.w, m.num.r, m.year.r]));
    check(`${tag}: source line names the European Commission and opens an external page`, m.source && m.source.text === "Source: European Commission ↗" && /^https:\/\/(digital-strategy|commission)\.ec\.europa\.eu\//.test(m.source.href) && /external site/.test(m.source.label) && m.source.size === "13px", JSON.stringify(m.source));

    // Layout: two columns from 900px, stacked with a divider below.
    if (w >= 900) {
      check(`${tag}: two columns, right column 420px with a 1px divider on its left`, Math.abs(m.action.w - 420) <= 1 && m.action.x > m.lead.r - 1 && Math.abs(m.action.y - m.lead.y) <= 1 && m.actionBorder.left === "1px" && m.actionBorder.leftColour === "rgb(143, 168, 198)" && m.actionBorder.top === "0px", JSON.stringify([m.action, m.lead, m.actionBorder]));
    } else {
      check(`${tag}: stacked, 1px divider above the right part and 20px between the parts`, m.action.y >= m.lead.b - 1 && m.actionBorder.top === "1px" && m.actionBorder.topColour === "rgb(143, 168, 198)" && m.actionBorder.left === "0px" && Math.abs(m.action.y - m.lead.b - 20) <= 2, JSON.stringify([m.action.y, m.lead.b, m.actionBorder]));
    }
    check(`${tag}: nothing leaves the screen and text keeps a gutter`, m.leadTexts.every((x) => x <= w - 19) && m.rows.every((r) => r.box.r <= w - 19) && m.titles.every((t) => t.box.r <= w - 19), JSON.stringify([m.leadTexts, m.rows.map((r) => r.box.r)]));

    // Action rows.
    check(`${tag}: two rows, Readiness Workshop then Topics & guides, with the arrow`, m.rows.length === 2 && m.rows[0].text === "Readiness Workshop →" && m.rows[1].text === "Topics & guides →" && m.rows[0].key === "sessions" && m.rows[1].key === "topics", JSON.stringify(m.rows.map((r) => r.text)));
    check(`${tag}: calendar icon at the workshop, book icon at topics (icons of 25.15)`, m.rows[0].paths.startsWith('<rect x="3" y="5" width="18" height="16"') && m.rows[1].paths.startsWith('<path d="M3 5c4-2 6-1 9 1'), JSON.stringify(m.rows.map((r) => r.paths)));
    check(`${tag}: rows are directly under each other, no extra gap`, Math.abs(m.rows[1].box.y - m.rows[0].box.b) <= 0.5, `${m.rows[0].box.b} ${m.rows[1].box.y}`);
    check(`${tag}: each row is at least 44px tall and the icon slot is 38px`, m.rows.every((r) => r.box.h >= 44 && Math.abs(r.icon.w - 38) <= 0.5 && Math.abs(r.icon.h - 38) <= 0.5), JSON.stringify(m.rows.map((r) => [r.box.h, r.icon.w])));
    check(`${tag}: link style of 25.15 (15px semibold, link blue)`, m.rows.every((r) => r.size === "15px" && r.weight === "600" && r.colour === "rgb(8, 72, 163)"), JSON.stringify(m.rows.map((r) => [r.size, r.weight, r.colour])));
    check(`${tag}: icons share one vertical lane`, Math.abs(m.rows[0].icon.x - m.rows[1].icon.x) <= 0.5);

    // Destination: the explanation action is hidden until a fitting Learn page exists.
    check(`${tag}: "Understand what is changing" is not shown without a fitting Learn page`, m.explain === null);

    // Links resolve.
    for (const row of m.rows) {
      const status = await page.evaluate(async (u) => (await fetch(u, { credentials: "same-origin" })).status, row.href);
      check(`${tag}: "${row.text}" resolves`, status === 200, `${status} ${row.href}`);
    }
    check(`${tag}: workshop goes to the existing Wallet Readiness Workshop page and topics to the topics overview`, /\/learn\/sessions\/wallet-readiness-workshop\/?$/.test(m.rows[0].href) && /\/learn\/topics\/?$/.test(m.rows[1].href), JSON.stringify(m.rows.map((r) => r.href)));

    // Hover: the label is underlined, nothing moves.
    for (const [i, row] of m.rows.entries()) {
      const link = page.locator(`${MODULE} .fides-home-readiness__list a`).nth(i);
      await link.scrollIntoViewIfNeeded();
      const before = await link.boundingBox();
      await link.hover();
      const hover = await link.evaluate((a) => getComputedStyle(a.querySelector(".fides-home-readiness__label")).textDecorationLine);
      const after = await link.boundingBox();
      check(`${tag}: hover underlines "${row.text}" without moving it`, hover === "underline" && Math.abs(before.y - after.y) < 0.5 && Math.abs(before.x - after.x) < 0.5, `${hover}`);
    }
    await page.mouse.move(0, 0);

    // Keyboard: tab order and a visible 3px focus ring on every control in the module.
    await page.evaluate(() => { const m = document.querySelector(".fides-home-readiness"); const t = document.createElement("span"); t.tabIndex = -1; t.id = "probe-before"; m.parentNode.insertBefore(t, m); t.focus(); });
    const order = [];
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("Tab");
      order.push(await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); const b = a.getBoundingClientRect(); return { cls: a.className, text: a.textContent.replace(/\s+/g, " ").trim().slice(0, 30), ring: cs.outlineStyle + " " + cs.outlineWidth, ringColour: cs.outlineColor, visible: b.top >= 0 && b.bottom <= innerHeight, inside: !!a.closest(".fides-home-readiness") }; }));
    }
    check(`${tag}: Tab goes source, Readiness Workshop, Topics & guides`, order[0].inside && /source-link/.test(order[0].cls) && /Readiness Workshop/.test(order[1].text) && /Topics & guides/.test(order[2].text), JSON.stringify(order.map((o) => o.text)));
    check(`${tag}: every focused control shows a 3px solid ring and stays in view`, order.every((o) => o.ring === "solid 3px" && o.visible), JSON.stringify(order.map((o) => [o.ring, o.visible])));
    await page.evaluate(() => document.getElementById("probe-before").remove());

    // A real click on the workshop row, then Back.
    await page.locator(`${MODULE} .fides-home-readiness__list a`).first().click();
    await page.waitForURL(/wallet-readiness-workshop/, { timeout: 20000 }).catch(() => {});
    check(`${tag}: click on Readiness Workshop opens the workshop page`, /wallet-readiness-workshop/.test(page.url()) && (await page.locator("h1").first().textContent()).trim().length > 0, page.url());
    await page.goBack({ waitUntil: "domcontentloaded" });
    check(`${tag}: Back returns to the homepage with the module`, (await page.locator(MODULE).count()) === 1);

    // Optional: the explanation action on a scratch page that was given explain_url.
    if (PREVIEW) {
      const pv = await ctx.newPage();
      await pv.goto(PREVIEW, { waitUntil: "domcontentloaded" });
      await pv.locator(MODULE).waitFor({ timeout: 30000 });
      const p = await measure(pv);
      check(`${tag}: explanation action sits under the source, 44px tall, 15px semibold, link blue`, p.explain && p.explain.text === "Understand what is changing →" && p.explain.box.h >= 44 && p.explain.size === "15px" && p.explain.weight === "600" && p.explain.box.y >= p.source.box.b - 1, JSON.stringify(p.explain));
      check(`${tag}: explanation action stays inside the screen`, p.explain && p.explain.box.r <= w - 19 && p.overflow <= 0, JSON.stringify(p.explain && p.explain.box));
      const l = pv.locator(`${MODULE} .fides-home-readiness__explain`);
      await l.hover();
      check(`${tag}: explanation action underlines on hover`, (await l.evaluate((a) => getComputedStyle(a.querySelector(".fides-home-readiness__label")).textDecorationLine)) === "underline");
      await l.focus();
      check(`${tag}: explanation action shows a focus ring`, (await l.evaluate((a) => getComputedStyle(a).outlineWidth)) === "3px");
      if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await pv.locator(MODULE).screenshot({ path: path.join(SHOTS, `readiness-explain-preview-${w}.png`) }); }
      await pv.close();
    }

    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.goto(HOME, { waitUntil: "domcontentloaded" });
      await page.locator(MODULE).waitFor();
      await page.locator(MODULE).screenshot({ path: path.join(SHOTS, `readiness-module-${w}.png`) });
      await page.screenshot({ path: path.join(SHOTS, `home-top-${w}.png`), clip: { x: 0, y: 0, width: w, height: Math.min(1800, await page.evaluate(() => document.querySelector(".fides-uc-index").getBoundingClientRect().top + scrollY + 120)) }, fullPage: true });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `${failures} readiness checks failed` : "all readiness checks passed");
  process.exit(failures ? 1 : 0);
})();
