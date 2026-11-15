/**
 * Targeted checks for the Learn article template (Paper 24.21 desktop, 24.22 mobile), 14 November 2026.
 *
 * Detailed pass (EN and NL, 1440 and 390 px): the example article "How credentials connect issuers, wallets and services"
 * and the article with the most sources and the longest source titles ("The EUDI Wallet and national implementation":
 * seven sources, labels up to 119 characters). Per page: section order in the DOM and on screen, one DOM (no duplicate
 * sections, ids or tab stops), contents jumps (focus on the heading, aria-current, scroll offset), keyboard order and
 * the collapsible contents on mobile, heading hierarchy, no overflow, practice band under the article, links under /nl/.
 * Sample pass: every Learn article from learn/manifest.json (EN and NL, both widths) gets the structural checks and the
 * "at most 3 Learn more + 2 catalogs" rule (country articles: up to 3 catalog links; two articles may show a fourth
 * Learn link, see FOUR_LEARN_LINKS). Every filter link on country and Technology articles is checked for results in
 * tests/learn-filter-links-checks.cjs. Articles whose selection
 * needs an editorial decision are listed in learn/continue-learning-pending.json; the list is informational (reported,
 * never failing) and may only name existing articles.
 *
 * Run (pilot running):
 *   CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' PLAYWRIGHT_MODULE=... node tests/learn-article-template-checks.cjs
 *   WIDTHS=1440,390 LANGS=en,nl SAMPLE=0 (skip the sample pass) SCREENS=1 (screenshots of the two detailed articles)
 * Subset (a full run takes about ten minutes: 37 articles x 2 widths x 2 languages, a Tab walk and every contents link on the
 * two detailed articles, and fixture pages created through WP-CLI): ARTICLES=the-issuer,the-relying-party (last path segment or
 * full path, comma separated) runs only those articles, DETAILED=0 skips the two detailed articles, FIXTURES=0 skips the
 * fixture pages. A subset of 7 articles at one width and one language takes a few seconds.
 * Nothing is submitted; the page only reads.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const ORIGIN = process.env.PILOT_ORIGIN || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const LANGS = (process.env.LANGS || "en,nl").split(",");
const SAMPLE = process.env.SAMPLE !== "0";
const SCREENS = process.env.SCREENS === "1";
const OUT = path.join(__dirname, "output", "template");
const ROOT = path.join(__dirname, "..", "learn");

const DETAILED = [
  "topics/the-big-picture/how-credentials-connect",
  "topics/for-governments/the-eudi-wallet-and-national-implementation",
];
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8")).pages;
const SUBSET = process.env.ARTICLES ? process.env.ARTICLES.split(",").map((x) => x.trim()).filter(Boolean) : null;
const RUN_DETAILED = process.env.DETAILED !== "0";
const ARTICLES = manifest.filter((p) => p.kind === "article" && p.content).map((p) => p.path).filter((p) => !SUBSET || SUBSET.some((x) => p === x || p.endsWith("/" + x)));
const PENDING = JSON.parse(fs.readFileSync(path.join(ROOT, "continue-learning-pending.json"), "utf8"));
// Documented exceptions to the 3 Learn more guideline: a fourth link the client asked for explicitly.
const FOUR_LEARN_LINKS = ["for-businesses/issuing-credentials-for-wallets", "the-big-picture/trust-and-interoperability"];
const slugOf = (p) => p.split("/").slice(1).join("/");

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${!ok && detail !== undefined ? ` (${String(detail).slice(0, 300)})` : ""}`);
};
const note = (text) => console.log(`  # ${text}`);

const urlFor = (lang, p) => `${ORIGIN}${lang === "nl" ? "/nl" : ""}/fides-design-pilot/learn/${p}/`;

async function open(page, lang, p) {
  await page.goto(urlFor(lang, p), { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1200 }).then(() => true, () => false)) await deny.click();
  if (lang === "nl") await page.waitForLoadState("networkidle").catch(() => {});
}

/** One snapshot of the article layout: structure, geometry, counts. Runs in the page. */
function snapshot() {
  /** Computed styles of the template blocks, measured in the page (compared with the Paper values in paperChecks). */
  function paperStyles(article, parts) {
    const px = (v) => parseFloat(v);
    const st = (el, pseudo) => (el ? getComputedStyle(el, pseudo || null) : null);
    const font = (el) => (el ? { size: st(el).fontSize, line: st(el).lineHeight, weight: st(el).fontWeight, color: st(el).color } : null);
    const effBg = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const c = getComputedStyle(e).backgroundColor;
        if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
      }
      return "rgb(255, 255, 255)";
    };
    const box = (el) => (el ? { bg: st(el).backgroundColor, effBg: effBg(el), bl: st(el).borderLeftWidth, blStyle: st(el).borderLeftStyle, blColor: st(el).borderLeftColor, bt: st(el).borderTopWidth, btStyle: st(el).borderTopStyle, btColor: st(el).borderTopColor, bb: st(el).borderBottomWidth, bbColor: st(el).borderBottomColor, br: st(el).borderRightWidth, pt: st(el).paddingTop, pl: st(el).paddingLeft, pb: st(el).paddingBottom, ml: st(el).marginLeft, w: el.getBoundingClientRect().width } : null);
    const cols = st(article).gridTemplateColumns.split(" ").map(px);
    const lineBefore = st(article, "::before");
    const lis = parts.toc ? [...parts.toc.querySelectorAll("li")] : [];
    const firstLink = (sel) => parts[sel] && parts[sel].querySelector("li a");
    return {
      cols,
      colGap: px(st(article).columnGap) || 0,
      articleLeft: article.getBoundingClientRect().left,
      line: { content: lineBefore.content, bl: lineBefore.borderLeftWidth, blStyle: lineBefore.borderLeftStyle, blColor: lineBefore.borderLeftColor, h: px(lineBefore.height), col: lineBefore.gridColumnStart },
      toc: parts.toc ? { box: box(parts.toc), summary: font(parts.toc.querySelector("summary")), a: font(lis[0] && lis[0].querySelector("a")), aMinH: lis[0] ? st(lis[0].querySelector("a")).minHeight : null } : null,
      tocNums: lis.map((li) => { const b = st(li, "::before"); const a = li.querySelector("a"); return { content: b.content, w: px(b.width), size: b.fontSize, line: b.lineHeight, weight: b.fontWeight, color: b.color, flexBasis: b.flexBasis, aOffset: Math.round((a.getBoundingClientRect().left - li.getBoundingClientRect().left) * 10) / 10, aLeft: Math.round(a.getBoundingClientRect().left), visible: li.getBoundingClientRect().width > 0 }; }),
      terms: parts.terms ? { box: box(parts.terms), h2: font(parts.terms.querySelector("h2")), dt: font(parts.terms.querySelector("dt")), dd: font(parts.terms.querySelector("dd")) } : null,
      continue: parts.continue ? { box: box(parts.continue), h2: font(parts.continue.querySelector("h2")), h3: font(parts.continue.querySelector("h3")), a: font(firstLink("continue")), aWeight: st(firstLink("continue")).fontWeight, rowGap: st(parts.continue).rowGap } : null,
      sources: parts.sources ? { box: box(parts.sources), h2: font(parts.sources.querySelector("h2")), a: font(firstLink("sources") || parts.sources.querySelector("a")) } : null,
    };
  }
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height, right: r.right, bottom: r.bottom + scrollY };
  };
  const article = document.querySelector(".fides-learn-article");
  const q = (sel) => document.querySelectorAll(sel).length;
  const parts = {
    toc: article && article.querySelector(":scope > .fides-learn-toc"),
    body: article && article.querySelector(":scope > .fides-learn-article__body"),
    terms: article && article.querySelector(":scope > .fides-learn-terms-box"),
    continue: article && article.querySelector(":scope > .fides-learn-continue"),
    sources: article && article.querySelector(":scope > .fides-learn-sources"),
  };
  const domOrder = article ? [...article.children].map((c) => ["fides-learn-toc", "fides-learn-article__body", "fides-learn-terms-box", "fides-learn-continue", "fides-learn-sources"].find((k) => c.classList.contains(k)) || "other") : [];
  const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  const groups = [...document.querySelectorAll(".fides-learn-continue__group")].map((g) => ({
    label: (g.querySelector("h3") || {}).textContent || "",
    links: [...g.querySelectorAll("li a")].map((a) => ({ text: a.textContent.trim(), href: a.href, path: new URL(a.href).pathname })),
    empty: g.querySelectorAll("li").length === 0,
  }));
  const headings = [...document.querySelectorAll("main h1, main h2, main h3, main h4")].filter((h) => !h.closest("[data-fides-ssr]")).map((h) => Number(h.tagName[1]));
  const jumps = headings.filter((lvl, i) => i > 0 && lvl - headings[i - 1] > 1).length + (headings[0] === 1 ? 0 : 1);
  const clipped = [...document.querySelectorAll(".fides-learn-continue a, .fides-learn-sources a, .fides-learn-terms-box dt, .fides-learn-terms-box dd, .fides-learn-toc a")]
    .filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== "inline").map((e) => e.textContent.trim().slice(0, 40));
  const band = document.querySelector(".fides-learn-band");
  const summary = parts.toc && parts.toc.querySelector("summary");
  return {
    hasArticle: !!article,
    domOrder,
    rects: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, rect(v)])),
    article: rect(article),
    band: rect(band),
    bandInside: !!(band && article && article.contains(band)),
    counts: {
      article: q(".fides-learn-article"), toc: q(".fides-learn-toc"), terms: q(".fides-learn-terms-box"), continue: q(".fides-learn-continue"),
      sources: q(".fides-learn-sources"), band: q(".fides-learn-band"), continueH2: [...document.querySelectorAll("h2")].filter((h) => h.id === "continue-learning").length,
    },
    dupIds,
    groups,
    jumps,
    clipped,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    footerTop: (document.querySelector(".fides-ds-site-footer") ? rect(document.querySelector(".fides-ds-site-footer")).y : null),
    tocOpen: parts.toc ? parts.toc.open : null,
    summaryTabindex: summary ? summary.getAttribute("tabindex") : null,
    asideSticky: ["toc", "terms", "continue", "sources"].some((k) => parts[k] && ["sticky", "fixed"].includes(getComputedStyle(parts[k]).position)),
    tocLinks: parts.toc ? [...parts.toc.querySelectorAll("a")].map((a) => a.getAttribute("href")) : [],
    oldIds: { continue: !!document.getElementById("continue-learning"), terms: !!document.getElementById("fides-learn-terms-title"), sources: !!document.getElementById("fides-learn-sources-title") },
    asideLinks: [...document.querySelectorAll(".fides-learn-continue a, .fides-learn-terms-box a, .fides-learn-sources a")].map((a) => a.href),
    lang: document.documentElement.lang,
    scrollbar: innerWidth - document.documentElement.clientWidth,
    paper: paperStyles(article, parts),
  };
}

function structure(tag, s, width, lang, strictCounts, pendingKey) {
  const desktop = width >= 900;
  check(`${tag}: one article layout, one of each section, one band at most`, s.hasArticle && s.counts.article === 1 && s.counts.toc <= 1 && s.counts.terms <= 1 && s.counts.continue <= 1 && s.counts.sources <= 1 && s.counts.band <= 1 && s.counts.continueH2 <= 1, JSON.stringify(s.counts));
  const wanted = ["fides-learn-toc", "fides-learn-article__body", "fides-learn-terms-box", "fides-learn-continue", "fides-learn-sources"].filter((k) => s.domOrder.includes(k));
  check(`${tag}: DOM order is contents, text, terms, continue learning, sources`, s.domOrder.join(",") === wanted.join(",") && s.domOrder.indexOf("fides-learn-article__body") === (s.domOrder[0] === "fides-learn-toc" ? 1 : 0), s.domOrder.join(","));
  check(`${tag}: no duplicate ids on the page`, s.dupIds.length === 0, s.dupIds.join(","));
  check(`${tag}: practice band sits under the article, not in the side column`, !s.counts.band || (!s.bandInside && s.band.y >= s.article.bottom - 1 && s.band.x < 80), JSON.stringify({ band: s.band, art: s.article && s.article.bottom, inside: s.bandInside }));
  check(`${tag}: no horizontal overflow, no clipped link text`, !s.overflow && s.clipped.length === 0, `${s.overflow} ${s.clipped.join("|")}`);
  check(`${tag}: heading levels never skip a level`, s.jumps === 0, s.jumps);
  check(`${tag}: not sticky (Paper shows a static column)`, !s.asideSticky);
  check(`${tag}: no empty groups, no empty column`, s.groups.every((g) => !g.empty && g.links.length > 0 && g.label.trim() !== "") && (!desktop || ["terms", "continue", "sources"].some((k) => s.rects[k]) || s.rects.toc), JSON.stringify(s.groups.filter((g) => g.empty)));
  check(`${tag}: old anchors kept (#continue-learning, terms and sources ids)`, (!s.rects.continue || s.oldIds.continue) && (!s.rects.terms || s.oldIds.terms) && (!s.rects.sources || s.oldIds.sources), JSON.stringify(s.oldIds));
  const lm = (s.groups.find((g) => /^(Learn more|Meer uitleg)$/i.test(g.label.trim())) || { links: [] }).links.length;
  const cat = s.groups.length ? s.groups.filter((g) => !/^(Learn more|Meer uitleg)$/i.test(g.label.trim())).reduce((n, g) => n + g.links.length, 0) : 0;
  // Country articles show three country filters instead of two generic catalog links (editorial exception, see
  // learn/continue-learning-selection.md); the third link must be a ?country= filter.
  const isCountry = pendingKey && /^around-the-world\//.test(pendingKey) && pendingKey !== "around-the-world/un-transparency-protocol";
  const catLinks = s.groups.filter((g) => !/^(Learn more|Meer uitleg)$/i.test(g.label.trim())).flatMap((g) => g.links);
  const countryOnly = cat <= 2 || catLinks.every((l) => /[?&]country=/.test(l.href));
  // Guideline 3 + 2; the client asked explicitly for one extra Learn link on two articles (learn/continue-learning-selection.md).
  const maxLearn = pendingKey && FOUR_LEARN_LINKS.includes(pendingKey) ? 4 : 3;
  const over = lm > maxLearn || cat > (isCountry ? 3 : 2);
  check(`${tag}: at most ${maxLearn} Learn more and ${isCountry ? 3 : 2} catalog links (${lm}+${cat})`, !over && countryOnly, `${lm}+${cat}`);
  if (pendingKey && Object.prototype.hasOwnProperty.call(PENDING, pendingKey)) note(`editorial decision open: ${pendingKey} (${lm}+${cat})`);
  if (lang === "nl") {
    const bad = s.asideLinks.filter((h) => new URL(h).origin === ORIGIN && /\/fides-design-pilot\//.test(h) && !/\/nl\/fides-design-pilot\//.test(h) && !/\/wp-content\//.test(h));
    check(`${tag}: continue, terms and source links stay under /nl/`, bad.length === 0, bad.join(", "));
    check(`${tag}: lang nl`, /^nl/.test(s.lang));
  }
  const r = s.rects;
  if (desktop) {
    const side = ["toc", "terms", "continue", "sources"].filter((k) => r[k]);
    check(`${tag}: side column right of the text, same width, sections stacked in order`, side.every((k, i) => r[k].x >= r.body.x + Math.min(r.body.w, 720) - 1 && Math.abs(r[k].w - r[side[0]].w) < 1 && (i === 0 || r[k].y >= r[side[i - 1]].bottom - 1)), JSON.stringify(side.map((k) => [k, Math.round(r[k].x), Math.round(r[k].y), Math.round(r[k].w)])));
    if (width === 1440 && side.length) check(`${tag}: right column ends at the article edge, at least 64px from the text (Paper 24.25)`, Math.abs(r[side[0]].right - s.article.right) <= 1 && r[side[0]].x - (r.body.x + r.body.w) >= 64 + 24, `${r[side[0]].right} gap ${r[side[0]].x - (r.body.x + r.body.w)}`);
    check(`${tag}: side column ends above the footer`, s.footerTop === null || r[side[side.length - 1]].bottom <= s.footerTop, `${r[side[side.length - 1]].bottom} vs ${s.footerTop}`);
    check(`${tag}: contents is a static list on desktop (open, summary out of the tab order)`, s.tocOpen !== false && (!r.toc || s.summaryTabindex === "-1"), `${s.tocOpen} ${s.summaryTabindex}`);
  } else {
    const seq = ["toc", "body", "terms", "continue", "sources"].filter((k) => r[k]);
    check(`${tag}: mobile order on screen = DOM order (contents, text, terms, continue, sources, band)`, seq.every((k, i) => i === 0 || r[k].y >= r[seq[i - 1]].y + 20) && (!s.band || s.band.y >= r[seq[seq.length - 1]].bottom - 1), JSON.stringify(seq.map((k) => [k, Math.round(r[k].y)])));
    check(`${tag}: sections use the full width`, seq.every((k) => r[k].w >= innerWidthOf(width) - 48 - 1), JSON.stringify(seq.map((k) => [k, Math.round(r[k].w)])));
    check(`${tag}: contents bar is collapsed at first and its summary is focusable`, !r.toc || (s.tocOpen === false && s.summaryTabindex === null), `${s.tocOpen} ${s.summaryTabindex}`);
  }
  paperChecks(tag, s, width);
}

// Paper values (24.25 desktop, 24.24 mobile), as computed styles. Colours are the design tokens: ink #0E0E0E, body #2A2A2A,
// muted #4A4A4A, line #E4E4E4, detail divider #C8CDD3, link #0848A3, brand #0A6EF3, soft (surface-info) #F2F7FF.
const RGB = { ink: "rgb(14, 14, 14)", body: "rgb(42, 42, 42)", muted: "rgb(74, 74, 74)", line: "rgb(228, 228, 228)", divider: "rgb(200, 205, 211)", link: "rgb(8, 72, 163)", brand: "rgb(10, 110, 243)", soft: "rgb(242, 247, 255)", white: "rgb(255, 255, 255)" };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function paperChecks(tag, s, width) {
  const desktop = width >= 900;
  const P = s.paper;
  const f = (o, size, line, weight) => !!o && o.size === size && o.line === line && (weight === undefined || String(o.weight) === String(weight));
  // Right column line (desktop) or none (mobile).
  if (desktop && s.rects.body && ["toc", "terms", "continue", "sources"].some((k) => s.rects[k])) {
    const side = ["toc", "terms", "continue", "sources"].filter((k) => s.rects[k]);
    const first = s.rects[side[0]];
    const last = s.rects[side[side.length - 1]];
    const lineX = P.articleLeft + P.cols[0] + P.colGap;
    check(`${tag}: right column has a thin vertical line (1px, detail divider colour) along the whole column`, P.line.content !== "none" && P.line.bl === "1px" && P.line.blStyle === "solid" && P.line.blColor === RGB.divider && P.line.col === "2" && P.line.h >= last.bottom - first.y - 2 && P.line.h <= last.bottom - first.y + 2, JSON.stringify(P.line) + ` need ${Math.round(last.bottom - first.y)}`);
    check(`${tag}: 24px inner space between the line and the column content`, side.every((k) => Math.abs(s.rects[k].x - (lineX + 1 + 24)) <= 1.5 || Math.abs(s.rects[k].x - (lineX + 24)) <= 1.5), JSON.stringify(side.map((k) => [k, Math.round(s.rects[k].x - lineX)])));
    check(`${tag}: blocks in the right column are 20px apart`, side.every((k, i) => i === 0 || Math.abs(s.rects[k].y - s.rects[side[i - 1]].bottom - 20) <= 1), JSON.stringify(side.map((k) => [k, Math.round(s.rects[k].y), Math.round(s.rects[k].bottom)])));
    if (width === 1440) check(`${tag}: right column track is 384px with a 64px gap to the text`, Math.abs(P.cols[1] - 384) <= 1 && P.colGap === 64, JSON.stringify([P.cols, P.colGap]));
  } else if (!desktop) {
    check(`${tag}: no vertical line along the column on mobile`, P.line.content === "none" || P.line.content === "normal", JSON.stringify(P.line));
    if (s.rects.continue) {
      const prevKey = ["sources", "continue"].includes("x") ? null : ["terms", "body", "toc"].find((k) => s.rects[k]);
      check(`${tag}: Continue learning sits 49px under the previous block (24px gap, 1px line, 24px space; Paper 24.24 wrapper)`, Math.abs(s.rects.continue.y - s.rects[prevKey].bottom - 49) <= 1, `${Math.round(s.rects.continue.y - s.rects[prevKey].bottom)}`);
      if (s.rects.sources) check(`${tag}: sources sit 24px under Continue learning, then 24px of space under their line`, Math.abs(s.rects.sources.y - s.rects.continue.bottom - 24) <= 1 && P.sources.box.pt === "24px", `${Math.round(s.rects.sources.y - s.rects.continue.bottom)}`);
    }
    check(`${tag}: no block has a vertical line except the boxed contents and the 3px blue line of Continue learning`, ["terms", "sources"].every((k) => !P[k] || (P[k].box.bl === "0px" && P[k].box.br === "0px")), JSON.stringify(["terms", "sources"].map((k) => P[k] && [k, P[k].box.bl, P[k].box.br])));
  }
  // Numbering in a fixed column.
  if (P.toc) {
    const n = P.tocNums;
    check(`${tag}: contents numbered by a counter (${n.length} entries) in a fixed 24px column, labels aligned`, n.length >= 3 && n.every((x, i) => /^counter\(fides-learn-toc\)/.test(x.content) && x.w === 24 && x.size === "14px" && x.line === "22px" && String(x.weight) === "600" && x.color === RGB.muted && x.aOffset === 32) && new Set(n.map((x) => x.aLeft)).size === 1, JSON.stringify(n.slice(0, 2)));
    check(`${tag}: contents heading and entries (Paper ${desktop ? "18/24 and 15/22, row 32px" : "19/25 and 15/22, row 44px"})`, f(P.toc.summary, desktop ? "18px" : "19px", desktop ? "24px" : "25px", 700) && f(P.toc.a, "15px", "22px", 500) && P.toc.a.color === RGB.link && P.toc.aMinH === (desktop ? "32px" : "44px"), JSON.stringify([P.toc.summary, P.toc.a, P.toc.aMinH]));
    if (desktop) check(`${tag}: contents has no box on desktop (white, no border)`, P.toc.box.effBg === RGB.white && P.toc.box.bt === "0px" && P.toc.box.bl === "0px", JSON.stringify(P.toc.box));
    else check(`${tag}: mobile contents is a white box with a 1px line and 16px side padding`, P.toc.box.effBg === RGB.white && P.toc.box.bt === "1px" && P.toc.box.btColor === RGB.line && P.toc.box.bl === "1px" && P.toc.box.pl === "16px", JSON.stringify(P.toc.box));
  }
  if (P.terms) {
    check(`${tag}: terms on white with a quiet 1px divider above, heading ${desktop ? "20/26" : "26/32"}, terms 16/24`, P.terms.box.effBg === RGB.white && P.terms.box.bt === "1px" && P.terms.box.btColor === RGB.line && P.terms.box.pt === "16px" && f(P.terms.h2, desktop ? "20px" : "26px", desktop ? "26px" : "32px", 700) && f(P.terms.dt, "16px", "24px") && f(P.terms.dd, "16px", "24px") && P.terms.dd.color === RGB.body, JSON.stringify(P.terms));
  }
  if (P.continue) {
    const c = P.continue;
    check(`${tag}: Continue learning is a light blue panel (#F2F7FF) with a 3px blue line on the left, padding ${desktop ? 18 : 16}px`, c.box.bg === RGB.soft && c.box.bl === "3px" && c.box.blStyle === "solid" && c.box.blColor === RGB.brand && c.box.pl === (desktop ? "18px" : "16px") && c.box.pt === (desktop ? "18px" : "16px"), JSON.stringify(c.box));
    check(`${tag}: Continue learning type (heading ${desktop ? "18/26" : "21/26"} bold, labels 14/21 600 muted, links ${desktop ? 15 : 16}/24 500)`, f(c.h2, desktop ? "18px" : "21px", "26px", 700) && f(c.h3, "14px", "21px", 600) && c.h3.color === RGB.muted && f(c.a, desktop ? "15px" : "16px", "24px", 500) && c.a.color === RGB.link, JSON.stringify(c));
  }
  if (P.sources) {
    check(`${tag}: sources on white with a quiet 1px divider above, heading ${desktop ? "18/24" : "20/26"}, links ${desktop ? "14/21" : "15/22"}`, P.sources.box.effBg === RGB.white && P.sources.box.bt === "1px" && P.sources.box.btColor === RGB.line && P.sources.box.pt === (desktop ? "16px" : "24px") && f(P.sources.h2, desktop ? "18px" : "20px", desktop ? "24px" : "26px", 700) && f(P.sources.a, desktop ? "14px" : "15px", desktop ? "21px" : "22px") && P.sources.a.color === RGB.link, JSON.stringify(P.sources));
  }
}

/** Mobile: after the contents is opened the same numbering is shown. */
async function mobileTocNumbers(page, tag) {
  const has = await page.locator(".fides-learn-toc summary").count();
  if (!has) return;
  await page.evaluate(() => (document.querySelector(".fides-learn-toc").open = false));
  const closed = await page.evaluate(() => [...document.querySelectorAll(".fides-learn-toc li a")].every((a) => !a.checkVisibility()));
  await page.locator(".fides-learn-toc summary").click();
  const nums = await page.evaluate(() => [...document.querySelectorAll(".fides-learn-toc li")].map((li) => ({ c: getComputedStyle(li, "::before").content, vis: li.checkVisibility(), x: Math.round(li.querySelector("a").getBoundingClientRect().left) })));
  check(`${tag}: closed contents hides the list, opened contents shows the same numbering in one column`, closed && nums.length >= 3 && nums.every((n) => n.vis && /^counter\(fides-learn-toc\)/.test(n.c)) && new Set(nums.map((n) => n.x)).size === 1, JSON.stringify([closed, nums.slice(0, 2)]));
  await page.evaluate(() => (document.querySelector(".fides-learn-toc").open = false));
}

const innerWidthOf = (w) => w;

/** Tab through the article from the headline and report the regions in the order they receive focus. */
async function tabWalk(page, tag, expectRegions) {
  await page.evaluate(() => {
    const h1 = document.querySelector("main h1");
    h1.setAttribute("tabindex", "-1");
    h1.focus();
  });
  const seen = [];
  let afterSources = 0;
  for (let i = 0; i < 160; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const region = ["fides-learn-toc", "fides-learn-article__body", "fides-learn-terms-box", "fides-learn-continue", "fides-learn-sources", "fides-learn-series", "fides-learn-band"].find((c) => el.closest("." + c)) || "other";
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none") || cs.textDecorationLine.includes("underline");
      return { region, key: `${el.tagName}|${el.id}|${el.getAttribute("href") || ""}|${el.textContent.trim().slice(0, 30)}|${Math.round(r.x)}|${Math.round(r.y + scrollY)}`, visible: r.width > 0 && r.height > 0, ring, text: el.textContent.trim().slice(0, 30) };
    });
    if (!info) break;
    seen.push(info);
    if (info.region === "fides-learn-sources" || info.region === "fides-learn-series" || info.region === "fides-learn-band") afterSources += 1;
    if (info.region === "fides-learn-band" || (info.region === "other" && afterSources)) break;
  }
  const order = ["fides-learn-toc", "fides-learn-article__body", "fides-learn-terms-box", "fides-learn-continue", "fides-learn-sources"];
  const idx = seen.filter((x) => order.includes(x.region)).map((x) => order.indexOf(x.region));
  check(`${tag}: Tab visits contents, text, terms, continue learning, sources in that order`, idx.every((v, i) => i === 0 || v >= idx[i - 1]), seen.map((x) => x.region.replace("fides-learn-", "")).join(">"));
  const regions = new Set(seen.map((x) => x.region));
  check(`${tag}: every present section is reachable by keyboard`, expectRegions.every((r) => regions.has(r)), [...regions].join(","));
  const keys = seen.map((x) => x.key);
  check(`${tag}: no element receives focus twice (no duplicate tab stops)`, keys.length === new Set(keys).size, keys.filter((k, i) => keys.indexOf(k) !== i).join(" | "));
  check(`${tag}: every focused element is visible and shows a focus indication`, seen.every((x) => x.visible && x.ring), JSON.stringify(seen.filter((x) => !x.visible || !x.ring).map((x) => x.text)));
}

/** Wait until the page stopped scrolling (the site uses smooth scrolling); frame based, no timers. */
const settle = (page) => page.evaluate(() => new Promise((resolve) => {
  let last = -1;
  let stable = 0;
  const tick = () => {
    if (scrollY === last) stable += 1;
    else { stable = 0; last = scrollY; }
    if (stable >= 6) resolve();
    else requestAnimationFrame(tick);
  };
  tick();
}));

async function tocBehaviour(page, tag, width, all) {
  const desktop = width >= 900;
  const hrefs = await page.evaluate(() => [...document.querySelectorAll(".fides-learn-toc a")].map((a) => a.getAttribute("href")));
  if (!hrefs.length) return;
  check(`${tag}: every contents link points at one heading on the page`, await page.evaluate((list) => list.every((h) => document.querySelectorAll(`[id="${CSS.escape(h.slice(1))}"]`).length === 1 && document.getElementById(h.slice(1)).tagName === "H2"), hrefs));
  const picks = all ? hrefs : [hrefs[0], hrefs[hrefs.length - 1]];
  for (const href of picks) {
    if (!desktop) {
      const open = await page.evaluate(() => document.querySelector(".fides-learn-toc").open);
      if (!open) await page.locator(".fides-learn-toc summary").click();
    }
    await page.locator(`.fides-learn-toc a[href="${href}"]`).click();
    await settle(page);
    const r = await page.evaluate((h) => {
      const t = document.getElementById(h.slice(1));
      const box = t.getBoundingClientRect();
      const cur = [...document.querySelectorAll('.fides-learn-toc a[aria-current]')].map((a) => a.getAttribute("href"));
      return { focused: document.activeElement === t, top: box.top, atBottom: scrollY + innerHeight >= document.documentElement.scrollHeight - 2, cur, hash: location.hash, open: document.querySelector(".fides-learn-toc").open };
    }, href);
    check(`${tag}: ${href} scrolls to the heading with an offset, focuses it and marks one link`, r.focused && r.top >= -1 && (r.top <= 120 || r.atBottom) && r.cur.length === 1 && r.cur[0] === href && r.hash === href, JSON.stringify(r));
    if (!desktop) check(`${tag}: ${href} closes the mobile contents after the jump`, r.open === false, r.open);
  }
}


// ---------- Fixture pages for the Continue learning split (group block, empty group, paragraph after the links, ...) ----------
const { execFileSync } = require("node:child_process");
const FIXTURES = process.env.FIXTURES !== "0" && !SUBSET;
const here = path.join(__dirname, "..");
function fixtureAction(action) {
  const out = execFileSync("bash", ["-c", 'source "$0/env.sh" && FIDES_FIXTURE_ACTION=' + action + ' pilot_wp eval-file "$0/tests/learn-continue-fixtures.php"', here], { encoding: "utf8", env: process.env });
  const line = out.trim().split("\n").filter(Boolean).pop();
  return JSON.parse(line);
}

async function fixtureChecks(page, tag, lang, name, expect) {
  const s = await page.evaluate(() => {
    const body = document.querySelector(".fides-learn-article__body");
    const cont = document.querySelector(".fides-learn-continue");
    const wrappers = body ? [...body.querySelectorAll(".wp-block-group")] : [];
    const seq = body ? [...body.querySelectorAll("h2, p")].map((e) => e.textContent.trim()) : [];
    return {
      hasBody: !!body,
      continueCount: document.querySelectorAll(".fides-learn-continue").length,
      continueH2: document.querySelectorAll("h2#continue-learning").length + [...document.querySelectorAll(".fides-learn-article__body h2")].filter((h) => /^(Continue learning|Verder leren)$/.test(h.textContent.trim())).length,
      groups: document.querySelectorAll(".fides-learn-continue__group").length,
      bodyLists: body ? body.querySelectorAll("ul, ol").length : -1,
      bodyContinue: body ? body.querySelectorAll(".fides-learn-continue, [data-fides-learn-continue]").length : -1,
      bodyH3: body ? [...body.querySelectorAll("h3")].map((h) => h.textContent.trim()) : [],
      wrappers: wrappers.length,
      emptyWrappers: wrappers.filter((w) => w.textContent.trim() === "").length,
      seq,
      sentinelInContinue: !!(cont && /SENTINEL/.test(cont.textContent)),
      article: document.querySelector(".fides-learn-article") ? document.querySelector(".fides-learn-article").textContent : "",
      ids: (() => { const ids = [...document.querySelectorAll("[id]")].map((e) => e.id); return ids.filter((id, i) => ids.indexOf(id) !== i); })(),
      toc: [...document.querySelectorAll(".fides-learn-toc a")].map((a) => a.getAttribute("href")),
      headIds: body ? [...body.querySelectorAll("h2")].map((h) => h.id) : [],
      links: [...document.querySelectorAll(".fides-learn-continue a")].map((a) => a.href),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      anchor: !!document.getElementById("continue-learning"),
    };
  });
  const t = `${tag} [${name}]`;
  check(`${t}: Continue learning is lifted once with ${expect.groups} group(s), none left in the text`, s.hasBody && s.continueCount === (expect.groups ? 1 : 0) && s.continueH2 === (expect.groups ? 1 : 0) && s.groups === expect.groups && s.bodyContinue === 0 && !s.bodyH3.some((x) => /^(Learn more|Explore in the catalogs)$/.test(x)), JSON.stringify({ c: s.continueCount, h2: s.continueH2, g: s.groups, h3: s.bodyH3 }));
  check(`${t}: no lists or links from the section remain in the text (no duplication)`, s.bodyLists === 0, s.bodyLists);
  const sentinelInBody = s.seq.some((x) => /SENTINEL/.test(x));
  check(`${t}: a plain paragraph after the follow-up links ${expect.sentinel ? "stays" : "is not present"} in the text, never in the side column`, sentinelInBody === expect.sentinel && !s.sentinelInContinue, JSON.stringify({ body: sentinelInBody, side: s.sentinelInContinue }));
  const want = ["Fixture section one", "Text of the first fixture section.", "Fixture section two", "Text of the second fixture section.", "Fixture section three", "Text of the third fixture section."].concat(expect.stay ? [expect.stay] : [], expect.sentinel ? ["SENTINEL paragraph after the follow-up links."] : [], ["Content last checked: 13 November 2026."]);
  check(`${t}: remaining text keeps its original order`, eq(s.seq, want), JSON.stringify(s.seq));
  check(`${t}: wrapper groups left in the text: ${expect.wrappers}, none empty`, s.wrappers === expect.wrappers && s.emptyWrappers === 0, JSON.stringify([s.wrappers, s.emptyWrappers]));
  if (expect.absent) check(`${t}: "${expect.absent}" does not appear in the article (no empty heading)`, !s.article.includes(expect.absent), expect.absent);
  check(`${t}: contents lists the three text sections only, ids and anchors intact, no duplicate ids`, eq(s.toc, ["#fixture-section-one", "#fixture-section-two", "#fixture-section-three"]) && eq(s.headIds, ["fixture-section-one", "fixture-section-two", "fixture-section-three"]) && s.ids.length === 0, JSON.stringify([s.toc, s.ids]));
  check(`${t}: old anchor #continue-learning ${expect.groups ? "exists once" : "is absent"}`, s.anchor === (expect.groups > 0), String(s.anchor));
  check(`${t}: no horizontal overflow`, !s.overflow);
  if (lang === "nl" && s.links.length) {
    const bad = s.links.filter((h) => new URL(h).origin === ORIGIN && /\/fides-design-pilot\//.test(h) && !/\/nl\/fides-design-pilot\//.test(h));
    check(`${t}: links in Continue learning stay under /nl/`, bad.length === 0, bad.join(", "));
  }
}

async function toggleBehaviour(page, tag, width) {
  const has = await page.locator(".fides-learn-toc summary").count();
  if (!has) return;
  const summary = page.locator(".fides-learn-toc summary");
  if (width < 900) {
    await page.evaluate(() => (document.querySelector(".fides-learn-toc").open = false));
    await summary.focus();
    await page.keyboard.press("Enter");
    check(`${tag}: Enter opens the collapsed contents`, await page.evaluate(() => document.querySelector(".fides-learn-toc").open));
    await page.keyboard.press("Space");
    check(`${tag}: Space closes it again`, !(await page.evaluate(() => document.querySelector(".fides-learn-toc").open)));
    check(`${tag}: summary exposes its state (open/closed through details)`, (await page.evaluate(() => document.querySelector(".fides-learn-toc").tagName)) === "DETAILS");
  } else {
    await page.evaluate(() => document.querySelector(".fides-learn-toc summary").focus());
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    check(`${tag}: Enter and Space do not collapse the desktop contents`, await page.evaluate(() => document.querySelector(".fides-learn-toc").open));
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  // Static checks on the manifest and the seed content (no page needed).
  const staleKeys = Object.keys(PENDING).filter((k) => !ARTICLES.some((p) => slugOf(p) === k));
  check("pending list only names existing articles", staleKeys.length === 0, staleKeys.join(","));
  check("every article keeps its editable Continue learning section (H2 plus at least one H3 group with a list)", ARTICLES.every((p) => {
    const f = manifest.find((m) => m.path === p).content;
    const c = fs.readFileSync(path.join(ROOT, "content", f), "utf8");
    const tail = c.slice(c.indexOf('<h2 class="wp-block-heading">Continue learning</h2>'));
    return tail.length > 0 && /<h3[^>]*>[^<]+<\/h3>/.test(tail) && /<ul[^>]*>/.test(tail);
  }), "missing section");

  let fixtures = {};
  if (FIXTURES) {
    fixtures = fixtureAction("create");
    note(`fixture pages created: ${Object.keys(fixtures).join(", ")} (removed at the end)`);
    // A run that is stopped (Ctrl+C, kill) skips the finally block below and would leave the fixture pages in the pilot.
    for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { try { fixtureAction("delete"); } finally { process.exit(130); } });
  }
  try {
  for (const width of WIDTHS) {
    for (const lang of LANGS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      await page.route("**/*", (r) => (["GET", "HEAD"].includes(r.request().method()) || /action=trp_get_translations/.test(r.request().postData() || "") ? r.continue() : r.abort()));
      for (const p of RUN_DETAILED && !SUBSET ? DETAILED : []) {
        const tag = `${slugOf(p)} ${lang} @${width}`;
        await open(page, lang, p);
        const s = await page.evaluate(snapshot);
        structure(tag, s, width, lang, p === DETAILED[0], slugOf(p));
        const regions = ["toc", "body", "terms", "continue", "sources"].filter((k) => s.rects[k]).map((k) => ({ toc: "fides-learn-toc", body: "fides-learn-article__body", terms: "fides-learn-terms-box", continue: "fides-learn-continue", sources: "fides-learn-sources" }[k]));
        const sourceLinks = await page.evaluate(() => [...document.querySelectorAll(".fides-learn-sources a")].map((a) => ({ text: a.textContent.replace(/\s+/g, " ").trim(), lines: Math.round(a.getBoundingClientRect().height / parseFloat(getComputedStyle(a).lineHeight)), name: !!a.querySelector(".fides-learn-sources__name") })));
        check(`${tag}: all sources kept, compact "Organisation · Title" lines`, sourceLinks.length >= (p.endsWith("how-credentials-connect") ? 3 : 7) && sourceLinks.every((x) => / · /.test(x.text) || !x.name), JSON.stringify(sourceLinks.map((x) => x.text)));
        if (p.endsWith("national-implementation")) note(`${tag}: ${sourceLinks.length} sources, longest ${Math.max(...sourceLinks.map((x) => x.text.length))} characters, lines per source ${sourceLinks.map((x) => x.lines).join("/")}`);
        await tabWalk(page, tag, regions);
        await toggleBehaviour(page, tag, width);
        await tocBehaviour(page, tag, width, true);
        if (width < 900) await mobileTocNumbers(page, tag);
        if (SCREENS && lang === "en") await page.screenshot({ path: path.join(OUT, `${slugOf(p).split("/").pop()}-${width}.png`), fullPage: true });
      }
      if (SAMPLE) {
        for (const p of ARTICLES) {
          if (!SUBSET && DETAILED.includes(p)) continue;
          const tag = `${slugOf(p)} ${lang} @${width}`;
          await open(page, lang, p);
          const s = await page.evaluate(snapshot);
          structure(tag, s, width, lang, false, slugOf(p));
          await tocBehaviour(page, tag, width, false);
        }
      }
      for (const [name, fx] of Object.entries(fixtures)) {
        const tag = `fixture ${lang} @${width}`;
        await open(page, lang, fx.path.split("/")[1]);
        await fixtureChecks(page, tag, lang, name, fx.expect);
        if (name === "group" || name === "nested" || name === "after") {
          const sn = await page.evaluate(snapshot);
          check(`${tag} [${name}]: structure holds (one DOM, order, no overflow)`, sn.counts.article === 1 && sn.counts.continue === 1 && !sn.overflow && sn.dupIds.length === 0 && sn.domOrder.join(",") === "fides-learn-toc,fides-learn-article__body,fides-learn-continue", JSON.stringify([sn.counts, sn.domOrder]));
          await tocBehaviour(page, `${tag} [${name}]`, width, true);
          paperChecks(`${tag} [${name}]`, sn, width);
        }
      }
      await ctx.close();
    }
  }
  } finally {
    if (FIXTURES) note(`fixture pages removed: ${JSON.stringify(fixtureAction("delete"))}`);
  }
  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
})();
