/**
 * Homepage readiness module (timeline variant of Paper 25.16 / 25.17): layout, wrapping,
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
  const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top + scrollY, w: b.width, h: b.height, r: b.right, b: b.bottom + scrollY, cx: b.left + b.width / 2, cy: b.top + scrollY + b.height / 2 }; };
  const cs = (el, p) => getComputedStyle(el)[p];
  const lead = m.querySelector(".fides-home-readiness__lead");
  const action = m.querySelector(".fides-home-readiness__action");
  const hero = document.querySelector("h1");
  const index = document.querySelector(".fides-uc-index");
  const points = [...m.querySelectorAll(".fides-home-readiness__point")].map((li) => {
    const after = getComputedStyle(li, "::after");
    return { box: r(li), dot: r(li.querySelector(".fides-home-readiness__dot")), dotBg: cs(li.querySelector(".fides-home-readiness__dot"), "backgroundColor"), when: li.querySelector(".fides-home-readiness__when").textContent.trim(), title: li.querySelector("h3").textContent.trim(), text: li.querySelector(".fides-home-readiness__text").textContent.trim(), textBox: r(li.querySelector(".fides-home-readiness__text")), textMax: cs(li.querySelector(".fides-home-readiness__text"), "maxWidth"), whenCss: [cs(li.querySelector(".fides-home-readiness__when"), "fontSize"), cs(li.querySelector(".fides-home-readiness__when"), "fontWeight")], titleCss: [cs(li.querySelector("h3"), "fontSize"), cs(li.querySelector("h3"), "fontWeight")],
      line: after.content === "none" ? null : { bg: after.backgroundColor, w: parseFloat(after.width), h: parseFloat(after.height), left: parseFloat(after.left), top: parseFloat(after.top) } };
  });
  const rows = [...m.querySelectorAll(".fides-home-readiness__list a")].map((a) => ({
    key: a.dataset.readiness, href: a.getAttribute("href"), text: a.textContent.replace(/\s+/g, " ").trim(), box: r(a), icon: r(a.querySelector(".fides-home-readiness__icon")),
    paths: a.querySelector("svg") ? a.querySelector("svg").innerHTML.replace(/\s+/g, " ").slice(0, 40) : "", colour: cs(a, "color"), weight: cs(a, "fontWeight"), size: cs(a, "fontSize"),
  }));
  const source = m.querySelector(".fides-home-readiness__source-link");
  const explain = m.querySelector(".fides-home-readiness__explain");
  const aTitle = action.querySelector("h2");
  const aText = action.querySelector(".fides-home-readiness__text");
  return {
    bg: cs(m, "backgroundColor"), box: r(m), lead: r(lead), action: r(action), points, heading: (m.querySelector("#fides-home-readiness-title") || {}).textContent,
    ol: r(m.querySelector("ol")), olDir: cs(m.querySelector("ol"), "flexDirection"),
    aTitle: { t: aTitle.textContent.trim(), size: cs(aTitle, "fontSize"), weight: cs(aTitle, "fontWeight"), box: r(aTitle) }, aText: { t: aText.textContent.trim(), box: r(aText), max: cs(aText, "maxWidth") },
    actionBorder: { left: cs(action, "borderLeftWidth"), leftColour: cs(action, "borderLeftColor"), top: cs(action, "borderTopWidth"), topColour: cs(action, "borderTopColor") },
    source: source ? { href: source.getAttribute("href"), text: source.textContent.replace(/\s+/g, " ").trim(), label: source.getAttribute("aria-label"), box: r(source), size: cs(source, "fontSize") } : null,
    sources: m.querySelectorAll(".fides-home-readiness__source-link").length,
    explain: explain ? { href: explain.getAttribute("href"), text: explain.textContent.replace(/\s+/g, " ").trim(), box: r(explain), size: cs(explain, "fontSize"), weight: cs(explain, "fontWeight") } : null,
    rows, old: document.querySelectorAll(".fides-home-learn").length, cards: m.querySelectorAll(".fides-ds-card, [class*='card']").length,
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

    // Timeline copy, wording and the limited scope.
    const [p1, p2] = m.points;
    check(`${tag}: timeline has two points, End 2026 wallet availability and End 2027 wallet acceptance`, m.points.length === 2 && p1.when === "End 2026" && p1.title === "Wallet availability" && p2.when === "End 2027" && p2.title === "Wallet acceptance", JSON.stringify(m.points.map((p) => [p.when, p.title])));
    check(`${tag}: availability is a duty of EU Member States, acceptance concerns certain private service providers only`, /Member States/.test(p1.text) && /certain private service providers/.test(p2.text) && /strong user authentication/.test(p2.text) && !/all organi[sz]ations|every organi[sz]ation|must accept|countdown|days left/i.test(m.points.map((p) => p.text).join(" ")), JSON.stringify(m.points.map((p) => p.text)));
    check(`${tag}: points are short (under 160 characters) and text width is bounded`, m.points.every((p) => p.text.length < 160 && p.textBox.w <= 40 * 9.5 + 1), JSON.stringify(m.points.map((p) => [p.text.length, p.textBox.w])));
    check(`${tag}: type of the points (label 13 semibold, title 20 bold)`, m.points.every((p) => p.whenCss[0] === "13px" && p.whenCss[1] === "600" && p.titleCss[0] === "20px" && p.titleCss[1] === "700"), JSON.stringify(m.points.map((p) => [p.whenCss, p.titleCss])));
    check(`${tag}: no countdown, no extra cards, one visible source link`, m.cards === 0 && m.sources === 1 && !/countdown|days/i.test(m.heading || ""), JSON.stringify([m.cards, m.sources]));
    check(`${tag}: source line names the regulation and opens an official external page`, m.source && /^Source: EU Regulation 910\/2014, Art\. 5a & 5f ↗$/.test(m.source.text) && /^https:\/\/eur-lex\.europa\.eu\//.test(m.source.href) && /external site/.test(m.source.label) && m.source.size === "13px", JSON.stringify(m.source));
    check(`${tag}: right part keeps the workshop text`, m.aTitle.t === "What does this mean for your organisation?" && m.aTitle.size === "20px" && m.aTitle.weight === "700" && m.aText.t === "Work through the impact on your services and agree the next steps with your team.", JSON.stringify([m.aTitle.t, m.aText.t]));

    // Timeline geometry: a thin line joins the dots, horizontal from 641px and vertical below.
    const line = p1.line;
    check(`${tag}: a 1px line in the section divider colour joins the two dots`, line && line.bg === "rgb(143, 168, 198)" && !p2.line && (w >= 641 ? Math.abs(line.h - 1) < 0.01 && line.w > 100 : Math.abs(line.w - 1) < 0.01 && line.h > 20), JSON.stringify(line));
    if (w >= 641) {
      check(`${tag}: horizontal timeline, dots on one line, points side by side`, m.olDir === "row" && Math.abs(p1.dot.cy - p2.dot.cy) < 0.5 && p2.box.x > p1.box.r - 1 && p1.dotBg === "rgb(8, 72, 163)", JSON.stringify([m.olDir, p1.dot.cy, p2.dot.cy]));
      const reach = p1.box.x + line.left + line.w; // line end in page coordinates
      check(`${tag}: line runs from the first dot to just before the second dot, centred on the dots`, Math.abs(reach - (p2.dot.x - 8)) <= 1.5 && Math.abs(p1.box.y + line.top + 0.5 - p1.dot.cy) <= 1, JSON.stringify([reach, p2.dot.x, p1.box.y + line.top, p1.dot.cy]));
    } else {
      check(`${tag}: vertical timeline, dots on one vertical lane, points stacked`, m.olDir === "column" && Math.abs(p1.dot.cx - p2.dot.cx) < 0.5 && p2.box.y >= p1.box.b - 1, JSON.stringify([m.olDir, p1.dot.cx, p2.dot.cx]));
      const lineX = p1.box.x + line.left + 0.5;
      check(`${tag}: line runs through the centre of the dots from the first to the second`, Math.abs(lineX - p1.dot.cx) <= 1 && p1.box.y + line.top >= p1.dot.b - 1 && p1.box.y + line.top + line.h <= p2.dot.cy + 8, JSON.stringify([lineX, p1.dot.cx, p1.box.y + line.top, p2.dot.cy]));
    }
    check(`${tag}: no word is cut off and nothing leaves the screen`, m.rights.every((x) => x <= w - 19) && m.rows.every((r) => r.box.r <= w - 19), JSON.stringify(m.rights));

    // Layout: about 60/40 from 900px, stacked with a divider below.
    if (w >= 900) {
      const share = m.lead.w / (m.lead.w + m.action.w);
      check(`${tag}: about 60/40, timeline left and workshop part right with a 1px divider`, share > 0.57 && share < 0.63 && m.action.x >= m.lead.r - 1 && Math.abs(m.action.y - m.lead.y) <= 1 && m.actionBorder.left === "1px" && m.actionBorder.leftColour === "rgb(143, 168, 198)" && m.actionBorder.top === "0px", JSON.stringify([share, m.action, m.lead, m.actionBorder]));
      check(`${tag}: right text is bounded`, m.aText.box.w <= 44 * 9.5 + 1, `${m.aText.box.w}`);
    } else {
      check(`${tag}: timeline first, then the workshop block with a 1px divider and 20px between`, m.action.y >= m.lead.b - 1 && m.actionBorder.top === "1px" && m.actionBorder.topColour === "rgb(143, 168, 198)" && m.actionBorder.left === "0px" && Math.abs(m.action.y - m.lead.b - 20) <= 2, JSON.stringify([m.action.y, m.lead.b, m.actionBorder]));
    }
    check(`${tag}: module is compact (under ${w >= 900 ? 280 : w >= 641 ? 520 : 700}px high)`, m.box.h < (w >= 900 ? 280 : w >= 641 ? 520 : 700), `${m.box.h}`);

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
      check(`${tag}: explanation action sits below the timeline beside the source, 44px tall, 15px semibold, link blue`, p.explain && p.explain.text === "Understand what is changing →" && p.explain.box.h >= 44 && p.explain.size === "15px" && p.explain.weight === "600" && p.explain.box.y >= p.points[1].box.b - 1 && p.source.box.y >= p.points[1].box.b - 1, JSON.stringify(p.explain));
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
