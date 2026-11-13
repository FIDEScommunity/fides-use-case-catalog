/**
 * Targeted checks for the Learn article template (Paper 24.21 desktop, 24.22 mobile), 14 November 2026.
 *
 * Detailed pass (EN and NL, 1440 and 390 px): the example article "How credentials connect issuers, wallets and services"
 * and the article with the most sources and the longest source titles ("The EUDI Wallet and national implementation":
 * seven sources, labels up to 119 characters). Per page: section order in the DOM and on screen, one DOM (no duplicate
 * sections, ids or tab stops), contents jumps (focus on the heading, aria-current, scroll offset), keyboard order and
 * the collapsible contents on mobile, heading hierarchy, no overflow, practice band under the article, links under /nl/.
 * Sample pass: every Learn article from learn/manifest.json (EN and NL, both widths) gets the structural checks and the
 * "at most 3 Learn more + 2 catalogs" rule. Articles that still need an editorial selection are listed in
 * learn/continue-learning-pending.json; they are reported as pending and do not fail, an article that exceeds the rule
 * without being listed (or is listed without exceeding it) fails.
 *
 * Run (pilot running):
 *   CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' PLAYWRIGHT_MODULE=... node tests/learn-article-template-checks.cjs
 *   WIDTHS=1440,390 LANGS=en,nl SAMPLE=0 (skip the sample pass) SCREENS=1 (screenshots of the two detailed articles)
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
const ARTICLES = manifest.filter((p) => p.kind === "article" && p.content).map((p) => p.path);
const PENDING = JSON.parse(fs.readFileSync(path.join(ROOT, "continue-learning-pending.json"), "utf8"));
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
  const over = lm > 3 || cat > 2;
  if (strictCounts) check(`${tag}: at most 3 Learn more and 2 catalog links (${lm}+${cat})`, !over, `${lm}+${cat}`);
  else if (pendingKey) {
    const listed = Object.prototype.hasOwnProperty.call(PENDING, pendingKey);
    if (over) check(`${tag}: ${lm}+${cat} links, listed for editorial selection`, listed, `${lm}+${cat} and not in continue-learning-pending.json`);
    else check(`${tag}: within 3+2 (${lm}+${cat}) and not listed as pending`, !listed, "listed as pending but within the guideline");
    if (over && listed) note(`pending: ${pendingKey} has ${lm}+${cat}`);
  }
  if (lang === "nl") {
    const bad = s.asideLinks.filter((h) => new URL(h).origin === ORIGIN && /\/fides-design-pilot\//.test(h) && !/\/nl\/fides-design-pilot\//.test(h) && !/\/wp-content\//.test(h));
    check(`${tag}: continue, terms and source links stay under /nl/`, bad.length === 0, bad.join(", "));
    check(`${tag}: lang nl`, /^nl/.test(s.lang));
  }
  const r = s.rects;
  if (desktop) {
    const side = ["toc", "terms", "continue", "sources"].filter((k) => r[k]);
    check(`${tag}: side column right of the text, same width, sections stacked in order`, side.every((k, i) => r[k].x >= r.body.x + Math.min(r.body.w, 720) - 1 && Math.abs(r[k].w - r[side[0]].w) < 1 && (i === 0 || r[k].y >= r[side[i - 1]].bottom - 1)), JSON.stringify(side.map((k) => [k, Math.round(r[k].x), Math.round(r[k].y), Math.round(r[k].w)])));
    if (width === 1440 && side.length) check(`${tag}: side column is 384px wide at the right edge, at least 64px from the text (Paper 24.21)`, Math.abs(r[side[0]].w - 384) <= 1 && Math.abs(r[side[0]].right - s.article.right) <= 1 && r[side[0]].x - (r.body.x + r.body.w) >= 64, `${r[side[0]].w} gap ${r[side[0]].x - (r.body.x + r.body.w)}`);
    check(`${tag}: side column is one continuous panel (no gaps between blocks)`, side.every((k, i) => i === 0 || Math.abs(r[k].y - r[side[i - 1]].bottom) <= 1), JSON.stringify(side.map((k) => [k, Math.round(r[k].y), Math.round(r[k].bottom)])));
    check(`${tag}: side column ends above the footer`, s.footerTop === null || r[side[side.length - 1]].bottom <= s.footerTop, `${r[side[side.length - 1]].bottom} vs ${s.footerTop}`);
    check(`${tag}: contents is a static list on desktop (open, summary out of the tab order)`, s.tocOpen !== false && (!r.toc || s.summaryTabindex === "-1"), `${s.tocOpen} ${s.summaryTabindex}`);
  } else {
    const seq = ["toc", "body", "terms", "continue", "sources"].filter((k) => r[k]);
    check(`${tag}: mobile order on screen = DOM order (contents, text, terms, continue, sources, band)`, seq.every((k, i) => i === 0 || r[k].y >= r[seq[i - 1]].y + 20) && (!s.band || s.band.y >= r[seq[seq.length - 1]].bottom - 1), JSON.stringify(seq.map((k) => [k, Math.round(r[k].y)])));
    check(`${tag}: sections use the full width`, seq.every((k) => r[k].w >= innerWidthOf(width) - 48 - 1), JSON.stringify(seq.map((k) => [k, Math.round(r[k].w)])));
    check(`${tag}: contents bar is collapsed at first and its summary is focusable`, !r.toc || (s.tocOpen === false && s.summaryTabindex === null), `${s.tocOpen} ${s.summaryTabindex}`);
  }
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

  for (const width of WIDTHS) {
    for (const lang of LANGS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      await page.route("**/*", (r) => (["GET", "HEAD"].includes(r.request().method()) || /action=trp_get_translations/.test(r.request().postData() || "") ? r.continue() : r.abort()));
      for (const p of DETAILED) {
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
        if (SCREENS && lang === "en") await page.screenshot({ path: path.join(OUT, `${slugOf(p).split("/").pop()}-${width}.png`), fullPage: true });
      }
      if (SAMPLE) {
        for (const p of ARTICLES) {
          if (DETAILED.includes(p)) continue;
          const tag = `${slugOf(p)} ${lang} @${width}`;
          await open(page, lang, p);
          const s = await page.evaluate(snapshot);
          structure(tag, s, width, lang, false, slugOf(p));
          await tocBehaviour(page, tag, width, false);
        }
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
})();
