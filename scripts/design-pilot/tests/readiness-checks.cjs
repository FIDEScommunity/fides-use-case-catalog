/**
 * Homepage readiness block (editorial timeline variant of Paper 25.16 / 25.17): heading, intro,
 * up to three milestones, business link, layout, wrapping, click targets, hover, keyboard focus
 * and destinations at one width per run.
 * Run: node readiness-checks.cjs (PLAYWRIGHT_MODULE, PILOT_URL, WIDTHS, SHOTS=dir).
 * Default expects the seeded homepage: two EUDI milestones and no business link (no existing
 * European Business Wallet content). FULL=1 expects the option fides_ds_home_readiness to hold
 * three milestones and a business link to the existing For businesses page (set by run-readiness.sh).
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const path = require("path");
const fs = require("fs");
const BASE = process.env.PILOT_URL || "http://localhost:10088";
const HOME = `${BASE}/fides-design-pilot/homepage-fragment/`;
const FULL = process.env.FULL === "1";
const WIDTHS = (process.env.WIDTHS || "1440,1100,768,390,320").split(",").map(Number);
const SHOTS = process.env.SHOTS || "";
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d && !ok ? ` (${d})` : ""}`); };

const MODULE = ".fides-home-readiness";
const measure = (page) => page.evaluate((sel) => {
  const m = document.querySelector(sel);
  if (!m) return null;
  const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top + scrollY, w: b.width, h: b.height, r: b.right, b: b.bottom + scrollY, cx: b.left + b.width / 2, cy: b.top + scrollY + b.height / 2 }; };
  const cs = (el, p) => getComputedStyle(el)[p];
  const lead = m.querySelector(".fides-home-readiness__lead");
  const action = m.querySelector(".fides-home-readiness__action");
  const hero = document.querySelector("h1");
  const index = document.querySelector(".fides-uc-index");
  const points = [...m.querySelectorAll(".fides-home-readiness__point")].map((li) => {
    const after = getComputedStyle(li, "::after");
    return { box: r(li), dot: r(li.querySelector(".fides-home-readiness__dot")), dotBg: cs(li.querySelector(".fides-home-readiness__dot"), "backgroundColor"), when: li.querySelector(".fides-home-readiness__when").textContent.trim(), title: li.querySelector("h3").textContent.trim(), text: li.querySelector(".fides-home-readiness__text").textContent.trim(), textBox: r(li.querySelector(".fides-home-readiness__text")), textMax: cs(li.querySelector(".fides-home-readiness__text"), "maxWidth"),
      src: (() => { const a = li.querySelector(".fides-home-readiness__source-link"); return a ? { href: a.getAttribute("href"), text: a.textContent.replace(/\s+/g, " ").trim(), label: a.getAttribute("aria-label"), box: r(a), size: cs(a, "fontSize") } : null; })(), whenCss: [cs(li.querySelector(".fides-home-readiness__when"), "fontSize"), cs(li.querySelector(".fides-home-readiness__when"), "fontWeight")], titleCss: [cs(li.querySelector("h3"), "fontSize"), cs(li.querySelector("h3"), "fontWeight")],
      line: after.content === "none" ? null : { bg: after.backgroundColor, w: parseFloat(after.width), h: parseFloat(after.height), left: parseFloat(after.left), top: parseFloat(after.top) } };
  });
  const rows = [...m.querySelectorAll(".fides-home-readiness__list a")].map((a) => ({
    key: a.dataset.readiness, href: a.getAttribute("href"), text: a.textContent.replace(/\s+/g, " ").trim(), box: r(a), icon: r(a.querySelector(".fides-home-readiness__icon")),
    paths: a.querySelector("svg") ? a.querySelector("svg").innerHTML.replace(/\s+/g, " ").slice(0, 40) : "", colour: cs(a, "color"), weight: cs(a, "fontWeight"), size: cs(a, "fontSize"),
  }));
    const biz = m.querySelector(".fides-home-readiness__business-link");
    const expl = m.querySelector(".fides-home-readiness__explain-link");
  const headingEl = m.querySelector(".fides-home-readiness__heading");
  const introEl = m.querySelector(".fides-home-readiness__intro");
  const aTitle = action.querySelector("h2");
  const aText = action.querySelector(".fides-home-readiness__text");
  return {
    bg: cs(m, "backgroundColor"), box: r(m), lead: r(lead), action: r(action), points,
    ol: r(m.querySelector("ol")), olDir: cs(m.querySelector("ol"), "flexDirection"),
    aTitle: { t: aTitle.textContent.trim(), size: cs(aTitle, "fontSize"), weight: cs(aTitle, "fontWeight"), box: r(aTitle) }, aText: { t: aText.textContent.trim(), box: r(aText), max: cs(aText, "maxWidth") },
    actionBorder: { left: cs(action, "borderLeftWidth"), leftColour: cs(action, "borderLeftColor"), top: cs(action, "borderTopWidth"), topColour: cs(action, "borderTopColor") },
    sources: m.querySelectorAll(".fides-home-readiness__source-link").length,
    headingBox: { t: headingEl.textContent.trim(), tag: headingEl.tagName, size: cs(headingEl, "fontSize"), weight: cs(headingEl, "fontWeight"), box: r(headingEl) },
    intro: introEl ? { t: introEl.textContent.trim(), box: r(introEl), size: cs(introEl, "fontSize"), lh: cs(introEl, "lineHeight"), max: cs(introEl, "maxWidth") } : null,
    expl: expl ? { href: expl.getAttribute("href"), text: expl.textContent.replace(/\s+/g, " ").trim(), box: r(expl), size: cs(expl, "fontSize"), weight: cs(expl, "fontWeight") } : null,
    biz: biz ? { href: biz.getAttribute("href"), text: biz.textContent.replace(/\s+/g, " ").trim(), box: r(biz), size: cs(biz, "fontSize"), weight: cs(biz, "fontWeight"), colour: cs(biz, "color"), lines: Math.round(r(biz).h / 22) } : null,
    text: m.textContent, rows, old: document.querySelectorAll(".fides-home-learn").length, cards: m.querySelectorAll(".fides-ds-card, [class*='card']").length,
    heroBottom: hero ? hero.getBoundingClientRect().bottom + scrollY : 0, indexTop: index ? index.getBoundingClientRect().top + scrollY : 1e9,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rights: [...m.querySelectorAll(".fides-home-readiness__point, .fides-home-readiness__text, h2, h3")].map((el) => r(el).r),
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

    // Heading, introduction and milestones.
    const pts = m.points;
    const first = pts[0], last = pts[pts.length - 1];
    check(`${tag}: heading "EUDI Wallet: what is changing?" is a visible h2 above the timeline`, m.headingBox.t === "EUDI Wallet: what is changing?" && m.headingBox.tag === "H2" && m.headingBox.size === "24px" && m.headingBox.weight === "700" && m.headingBox.box.b <= first.dot.y + 1, JSON.stringify(m.headingBox));
    check(`${tag}: intro is one sentence, spells out European Digital Identity Wallet and uses the full width of the left column (no max-width, 15px/23px)`, m.intro && /European Digital Identity Wallet \(EUDI Wallet\)/.test(m.intro.t) && (m.intro.t.match(/[.!?](\s|$)/g) || []).length === 1 && m.intro.t.length < 220 && m.intro.box.w >= m.lead.w - 1 && m.intro.lh === "23px" && m.intro.size === "15px" && m.intro.max === "none" && m.intro.box.y >= m.headingBox.box.b - 1 && m.intro.box.b <= first.dot.y + 1, JSON.stringify(m.intro));
    check(`${tag}: ${FULL ? "three" : "two"} milestones in order`, pts.length === (FULL ? 3 : 2) && first.when === "End 2026" && first.title === "Wallet availability" && pts[1].when === "End 2027" && pts[1].title === "Wallet acceptance", JSON.stringify(pts.map((p) => [p.when, p.title])));
    check(`${tag}: availability concerns Member States, acceptance only certain private services that must use strong online authentication, on user request`, first.text === "EU Member States are required to provide at least one EUDI Wallet." && /^Certain private service providers must accept EUDI Wallets for online identification when requested by users\.$/.test(pts[1].text) && !/all organi[sz]ations|every organi[sz]ation|countdown|days left|business wallet/i.test(pts.map((p) => p.text).join(" ")), JSON.stringify(pts.map((p) => p.text)));
    check(`${tag}: milestone texts are short (under 120 characters), width bounded to 46ch`, pts.every((p) => p.text.length < 120 && p.textBox.w <= 46 * 9.5 + 1), JSON.stringify(pts.map((p) => [p.text.length, p.textBox.w])));
    const lines = pts.map((p) => Math.round(p.textBox.h / 23));
    if (!FULL && (w >= 1440 || (w >= 641 && w < 900))) check(`${tag}: milestone explanations take at most three lines (the first at most two)`, lines.every((n) => n <= 3) && lines[0] <= 2, JSON.stringify(lines));
    else console.log(`info - ${tag}: milestone explanation lines ${JSON.stringify(lines)}`);
    check(`${tag}: type of the milestones (label 13 semibold, title 20 bold)`, pts.every((p) => p.whenCss[0] === "13px" && p.whenCss[1] === "600" && p.titleCss[0] === "20px" && p.titleCss[1] === "700"), JSON.stringify(pts.map((p) => [p.whenCss, p.titleCss])));
    check(`${tag}: no countdown and no extra cards`, m.cards === 0 && !/countdown|days left/i.test(m.text), "");
    check(`${tag}: no visible source lines in the block`, m.sources === 0 && m.points.every((p) => p.src === null) && !/Source:/.test(m.text), String(m.sources));
    check(`${tag}: right part keeps the workshop text`, m.aTitle.t === "What does this mean for your organisation?" && m.aTitle.size === "20px" && m.aTitle.weight === "700" && m.aText.t === "Work through the impact on your services and agree the next steps with your team.", JSON.stringify([m.aTitle.t, m.aText.t]));
    if (FULL) {
      check(`${tag}: business link is separate, below the timeline and not part of a milestone`, m.biz && m.biz.text === "For organisations: explore European Business Wallets →" && m.biz.box.y >= Math.max(...pts.map((p) => p.box.b)) - 1 && m.biz.box.h >= 44 && m.biz.size === "15px" && m.biz.weight === "600" && m.biz.colour === "rgb(8, 72, 163)", JSON.stringify(m.biz));
      check(`${tag}: business link stays inside the left column and the screen (${m.biz ? m.biz.lines : "?"} line(s))`, m.biz && m.biz.box.r <= m.lead.r + 1 && m.biz.box.r <= w - 19 && m.overflow <= 0, JSON.stringify(m.biz && m.biz.box));
      check(`${tag}: the EUDI explanation link comes first, above the separate business link, 44px tall`, m.expl && m.expl.text === "Understand the EUDI obligations and exceptions →" && m.expl.box.y >= Math.max(...pts.map((p) => p.box.b)) - 1 && m.expl.box.b <= m.biz.box.y + 1 && m.expl.box.h >= 44 && m.expl.size === "15px" && m.expl.weight === "600", JSON.stringify(m.expl));
    } else {
      check(`${tag}: without fitting Learn content (EUDI obligations, European Business Wallets) neither link is shown`, m.expl === null);
      check(`${tag}: without existing European Business Wallet content the business link is not shown`, m.biz === null);
    }

    // Timeline geometry: a thin line joins the dots, horizontal from 641px and vertical below.
    const joined = pts.slice(0, -1).every((p) => p.line && p.line.bg === "rgb(143, 168, 198)" && (w >= 641 ? Math.abs(p.line.h - 1) < 0.01 && p.line.w > 60 : Math.abs(p.line.w - 1) < 0.01 && p.line.h > 20));
    check(`${tag}: 1px lines in the section divider colour join the dots, none after the last`, joined && !last.line, JSON.stringify(pts.map((p) => p.line)));
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i], p2 = pts[i + 1], line = p1.line;
      if (w >= 641) {
        const reach = p1.box.x + line.left + line.w; // line end in page coordinates
        check(`${tag}: milestone ${i + 1} to ${i + 2}: dots on one line, side by side, line centred on the dots and ending just before the next dot`, Math.abs(p1.dot.cy - p2.dot.cy) < 0.5 && p2.box.x > p1.box.r - 1 && p1.dotBg === "rgb(8, 72, 163)" && Math.abs(reach - (p2.dot.x - 8)) <= 1.5 && Math.abs(p1.box.y + line.top + 0.5 - p1.dot.cy) <= 1, JSON.stringify([p1.dot.cy, p2.dot.cy, reach, p2.dot.x]));
      } else {
        const lineX = p1.box.x + line.left + 0.5;
        check(`${tag}: milestone ${i + 1} to ${i + 2}: stacked, dots on one vertical lane, line through the dot centres`, Math.abs(p1.dot.cx - p2.dot.cx) < 0.5 && p2.box.y >= p1.box.b - 1 && Math.abs(lineX - p1.dot.cx) <= 1 && p1.box.y + line.top >= p1.dot.b - 1 && p1.box.y + line.top + line.h <= p2.dot.cy + 8, JSON.stringify([lineX, p1.dot.cx, p1.box.y + line.top, p2.dot.cy]));
      }
    }
    check(`${tag}: timeline direction is ${w >= 641 ? "row" : "column"}`, m.olDir === (w >= 641 ? "row" : "column"), m.olDir);
    check(`${tag}: no word is cut off and nothing leaves the screen`, m.rights.every((x) => x <= w - 19) && m.rows.every((r) => r.box.r <= w - 19), JSON.stringify(m.rights));

    // Layout: about 60/40 from 900px, stacked with a divider below.
    if (w >= 900) {
      const share = m.lead.w / (m.lead.w + m.action.w);
      check(`${tag}: about 60/40, timeline left and workshop part right with a 1px divider`, share > 0.57 && share < 0.63 && m.action.x >= m.lead.r - 1 && Math.abs(m.action.y - m.lead.y) <= 1 && m.actionBorder.left === "1px" && m.actionBorder.leftColour === "rgb(143, 168, 198)" && m.actionBorder.top === "0px", JSON.stringify([share, m.action, m.lead, m.actionBorder]));
      check(`${tag}: right text is bounded`, m.aText.box.w <= 44 * 9.5 + 1, `${m.aText.box.w}`);
    } else {
      check(`${tag}: timeline first, then the workshop block with a 1px divider and 20px between`, m.action.y >= m.lead.b - 1 && m.actionBorder.top === "1px" && m.actionBorder.topColour === "rgb(143, 168, 198)" && m.actionBorder.left === "0px" && Math.abs(m.action.y - m.lead.b - 20) <= 2, JSON.stringify([m.action.y, m.lead.b, m.actionBorder]));
    }
    const cap = FULL ? (w >= 900 ? 520 : w >= 641 ? 700 : 1100) : (w >= 900 ? 360 : w >= 641 ? 600 : 900);
    check(`${tag}: block is compact (under ${cap}px high)`, m.box.h < cap, `${m.box.h}`);

    // Action rows.
    check(`${tag}: two rows, Readiness Workshop then Topics & guides, with the arrow`, m.rows.length === 2 && m.rows[0].text === "Readiness Workshop →" && m.rows[1].text === "Topics & guides →" && m.rows[0].key === "sessions" && m.rows[1].key === "topics", JSON.stringify(m.rows.map((r) => r.text)));
    check(`${tag}: calendar icon at the workshop, book icon at topics (icons of 25.15)`, m.rows[0].paths.startsWith('<rect x="3" y="5" width="18" height="16"') && m.rows[1].paths.startsWith('<path d="M3 5c4-2 6-1 9 1'), JSON.stringify(m.rows.map((r) => r.paths)));
    check(`${tag}: rows are directly under each other, no extra gap`, Math.abs(m.rows[1].box.y - m.rows[0].box.b) <= 0.5, `${m.rows[0].box.b} ${m.rows[1].box.y}`);
    check(`${tag}: each row is at least 44px tall and the icon slot is 38px`, m.rows.every((r) => r.box.h >= 44 && Math.abs(r.icon.w - 38) <= 0.5 && Math.abs(r.icon.h - 38) <= 0.5), JSON.stringify(m.rows.map((r) => [r.box.h, r.icon.w])));
    check(`${tag}: link style of 25.15 (15px semibold, link blue)`, m.rows.every((r) => r.size === "15px" && r.weight === "600" && r.colour === "rgb(8, 72, 163)"), JSON.stringify(m.rows.map((r) => [r.size, r.weight, r.colour])));
    check(`${tag}: icons share one vertical lane`, Math.abs(m.rows[0].icon.x - m.rows[1].icon.x) <= 0.5);

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
    await page.waitForTimeout(1500); // let the smooth scroll to the probe finish
    const order = [];
    const tabs = (FULL ? 2 : 0) + 2;
    for (let i = 0; i < tabs; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(1000);
      await page.evaluate(() => new Promise((res) => { let last = -1, n = 0; const t = setInterval(() => { n = scrollY === last ? n + 1 : 0; last = scrollY; if (n >= 3) { clearInterval(t); res(); } }, 100); }));
      order.push(await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); const b = a.getBoundingClientRect(); return { cls: a.className, text: a.textContent.replace(/\s+/g, " ").trim().slice(0, 30), ring: cs.outlineStyle + " " + cs.outlineWidth, ringColour: cs.outlineColor, visible: b.bottom > 0 && b.top < innerHeight, top: Math.round(b.top), bottom: Math.round(b.bottom), vh: innerHeight, inside: !!a.closest(".fides-home-readiness") }; }));
    }
    const expected = [...(FULL ? [/explain-link/, /business-link/] : []), /Readiness Workshop/, /Topics & guides/];
    check(`${tag}: Tab goes ${FULL ? "explanation link, business link, " : ""}Readiness Workshop, Topics & guides`, order.every((o, i) => o.inside && (i < (FULL ? 2 : 0) ? expected[i].test(o.cls) : expected[i].test(o.text))), JSON.stringify(order.map((o) => o.text)));
    check(`${tag}: every focused control shows a 3px solid ring and is reachable in the viewport`, order.every((o) => o.ring === "solid 3px" && o.visible), JSON.stringify(order.map((o) => [o.ring, o.visible, o.top, o.bottom, o.vh])));
    await page.evaluate(() => document.getElementById("probe-before").remove());

    // A real click on the workshop row, then Back.
    await page.locator(`${MODULE} .fides-home-readiness__list a`).first().click();
    await page.waitForURL(/wallet-readiness-workshop/, { timeout: 20000 }).catch(() => {});
    check(`${tag}: click on Readiness Workshop opens the workshop page`, /wallet-readiness-workshop/.test(page.url()) && (await page.locator("h1").first().textContent()).trim().length > 0, page.url());
    await page.goBack({ waitUntil: "domcontentloaded" });
    check(`${tag}: Back returns to the homepage with the module`, (await page.locator(MODULE).count()) === 1);

    // Business link: resolve, hover, focus.
    if (FULL) {
      const status = await page.evaluate(async (u) => (await fetch(u, { credentials: "same-origin" })).status, m.biz.href);
      check(`${tag}: business link resolves (${m.biz.href})`, status === 200, `${status}`);
      const bl = page.locator(`${MODULE} .fides-home-readiness__business-link`);
      await bl.scrollIntoViewIfNeeded();
      const before = await bl.boundingBox();
      await bl.hover();
      check(`${tag}: business link underlines on hover without moving`, (await bl.evaluate((a) => getComputedStyle(a.querySelector(".fides-home-readiness__label")).textDecorationLine)) === "underline" && Math.abs((await bl.boundingBox()).y - before.y) < 0.5);
      await page.mouse.move(0, 0);
      check(`${tag}: the arrow never wraps alone`, await bl.evaluate((a) => { const n = a.querySelector(".fides-home-readiness__nowrap"); return n.getClientRects().length === 1 || n.getBoundingClientRect().height < 30; }));
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
