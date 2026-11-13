/**
 * Visitor checks for the FIDES Learn pilot (Paper page 16) at desktop, tablet
 * and mobile widths: shell reuse, Learn bar, navigation between pages, local
 * contents menu, glossary dialog, long text, touch targets and the protection
 * against horizontal overflow. Run through run-learn-checks.sh.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const LEARN = process.env.LEARN_PATH || "/fides-design-pilot/learn";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const WIDTHS = (process.env.WIDTHS || "1440,1100,768,390,320").split(",").map(Number);
const DOM_READY = { waitUntil: "domcontentloaded" };

const PAGES = {
  overview: { url: `${LEARN}/`, h1: /Make sense of digital trust/, tab: "Overview", crumb: "Learn / Overview" },
  topics: { url: `${LEARN}/topics/`, h1: /Choose what you want to understand/, tab: "Topics", crumb: "Learn / Topics" },
  big: { url: `${LEARN}/topics/the-big-picture/`, h1: /The big picture/, tab: "Topics", crumb: "Learn / Topics / The big picture" },
  biz: { url: `${LEARN}/topics/for-businesses/`, h1: /For businesses/, tab: "Topics", crumb: "Learn / Topics / For businesses" },
  art1: { url: `${LEARN}/topics/the-big-picture/how-credentials-connect/`, h1: /How credentials connect issuers, wallets and services/, tab: "Topics", crumb: "Learn / Topics / The big picture / How credentials connect issuers, wallets and services" },
  art2: { url: `${LEARN}/topics/for-businesses/business-wallets-where-to-start/`, h1: /Business wallets: where to start/, tab: "Topics", crumb: "Learn / Topics / For businesses / Business wallets: where to start" },
};

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

async function open(page, key) {
  await page.goto(`${BASE}${PAGES[key].url}`, DOM_READY);
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 2500 }).then(() => true, () => false)) await deny.click();
  await page.mouse.move(0, 0);
}

async function baseline(page, key, width) {
  const spec = PAGES[key];
  const label = `${key} @${width}`;
  const s = await page.evaluate(() => ({
    headers: document.querySelectorAll(".fides-ds-site-header").length,
    footers: document.querySelectorAll(".fides-ds-site-footer").length,
    themeChrome: Boolean(document.querySelector("#header.ct-header, .ct-footer")),
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    h1s: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()),
    bars: document.querySelectorAll(".fides-learn-bar").length,
    robots: document.querySelector('meta[name="robots"]')?.content || "",
    text: document.body.innerText,
  }));
  check(`${label}: one shared header and footer, no theme chrome`, s.headers === 1 && s.footers === 1 && !s.themeChrome, JSON.stringify({ h: s.headers, f: s.footers, t: s.themeChrome }));
  check(`${label}: one Learn bar`, s.bars === 1);
  check(`${label}: single H1 with the expected title`, s.h1s.length === 1 && spec.h1.test(s.h1s[0]), s.h1s.join("|"));
  check(`${label}: no horizontal overflow`, !s.overflow);
  check(`${label}: noindex on the pilot`, /noindex/.test(s.robots), s.robots);
  check(`${label}: no price information`, !/€|\bEUR\b|\bprijs|\bpricing\b|\bprice\b/i.test(s.text));
  check(`${label}: no design notes leaked`, !/VOORSTEL|ONTWERPVOORSTEL|Cursor-implementatie/.test(s.text));
  if (width >= 600) {
    const crumb = (await page.locator(".fides-learn__crumbs").innerText()).replace(/\s*\n\s*/g, " ");
    // Separators are CSS-generated, so the text is the labels joined by spaces.
    check(`${label}: breadcrumb`, crumb.replace(/\s+/g, " ").trim() === spec.crumb.replace(/ \/ /g, " "), crumb);
  } else if (key !== "overview" && key !== "topics") {
    // Shared page header: the breadcrumb stays on phones (direct parent and current page); the extra back link is gone.
    const shown = await page.locator(".fides-ph__crumbs li").evaluateAll((lis) => lis.filter((li) => li.offsetParent !== null).length);
    check(`${label}: mobile breadcrumb keeps parent and current page, no extra back link`, shown === 2 && !(await page.locator(".fides-learn__back").isVisible()), String(shown));
  }
  // Active tab.
  if (width >= 900) {
    const current = await page.locator(".fides-learn-bar__nav a[aria-current=page]").innerText();
    check(`${label}: active Learn tab is ${spec.tab}`, current.trim() === spec.tab, current);
  } else {
    const current = (await page.locator(".fides-learn-bar__toggle span").last().innerText()).trim();
    check(`${label}: compact menu shows ${spec.tab}`, current === spec.tab, current);
  }
}

/** Interactive controls in the Learn furniture meet the target size. */
async function targets(page, key, width) {
  const min = width >= 1100 ? 40 : 44;
  const small = await page.evaluate(([minSize, vw]) => {
    const sel = [
      ".fides-learn-bar__nav a",
      ".fides-learn-bar__title",
      ".fides-learn-bar__toggle",
      ".fides-learn-bar__ask",
      ".fides-learn-toc summary",
      ".fides-learn-toc a",
      ".fides-learn .wp-block-button__link",
      ".fides-learn-sources a",
      ".fides-learn__back",
    ].join(",");
    return [...document.querySelectorAll(sel)]
      .filter((el) => !(vw >= 900 && el.matches(".fides-learn-toc summary"))) // static heading on desktop, not a control (tabindex -1)
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
      })
      .map((el) => ({ n: (el.className || el.tagName) + ":" + (el.textContent || "").trim().slice(0, 24), h: Math.round(el.getBoundingClientRect().height) }))
      // Sources rows are deliberately compact (32px) from 768px up; below that they keep the 44px touch target.
      .filter((x) => x.h < (/fides-learn-sources/.test(x.n) || x.n.startsWith("fides-learn-sources") ? (vw >= 768 ? 32 : minSize) : minSize));
  }, [min, width]);
  check(`${key} @${width}: Learn controls are at least ${min}px high`, small.length === 0, JSON.stringify(small));
}

async function desktopBar(page, width) {
  const labels = await page.locator(".fides-learn-bar__nav a").allInnerTexts();
  check(`bar @${width}: Overview, Topics, Training & workshops, Glossary`, labels.join("|") === "Overview|Topics|Training & workshops|Glossary", labels.join("|"));
  const visibleToggle = await page.locator(".fides-learn-bar__toggle").isVisible();
  check(`bar @${width}: horizontal tabs, no compact toggle`, !visibleToggle);
  const ask = page.locator("[data-fides-learn-ask]");
  check(`bar @${width}: Ask FIDES is offered when the assistant plugin is active`, (await ask.count()) === 1 && (await ask.isVisible()));
}

async function mobileMenu(page, width) {
  const toggle = page.locator("[data-fides-learn-toggle]");
  const nav = page.locator("#fides-learn-menu");
  check(`menu @${width}: compact menu starts closed`, (await toggle.getAttribute("aria-expanded")) === "false" && !(await nav.isVisible()));
  await toggle.click();
  check(`menu @${width}: toggle opens the Learn menu`, (await toggle.getAttribute("aria-expanded")) === "true" && (await nav.isVisible()));
  await page.keyboard.press("Escape");
  check(`menu @${width}: Escape closes the menu and returns focus`, !(await nav.isVisible()) && (await toggle.evaluate((el) => el === document.activeElement)));
  await toggle.click();
  const items = await nav.locator("a").allInnerTexts();
  check(`menu @${width}: all four destinations present`, items.join("|") === "Overview|Topics|Training & workshops|Glossary", items.join("|"));
  await page.mouse.click(width - 5, 700);
  check(`menu @${width}: click outside closes the menu`, !(await nav.isVisible()));
}

async function route(page, width) {
  // Overview -> Topics -> section -> article, using page controls only.
  await open(page, "overview");
  await baseline(page, "overview", width);
  await targets(page, "overview", width);
  const heroBox = await page.locator(".fides-learn__hero").boundingBox();
  const cardBox = await page.locator(".fides-learn-card--brand").boundingBox();
  if (width >= 900) {
    check(`overview @${width}: "New here" card sits beside the hero`, cardBox.x > heroBox.x + heroBox.width - 40 && cardBox.y < heroBox.y + heroBox.height, JSON.stringify({ heroBox, cardBox }));
    await desktopBar(page, width);
  } else {
    check(`overview @${width}: "New here" card stacks below the hero`, cardBox.y >= heroBox.y + heroBox.height - 1);
    await mobileMenu(page, width);
  }
  const narrow = await page.evaluate(() => [...document.querySelectorAll(".fides-learn-rows__text")].filter((el) => el.getBoundingClientRect().width < Math.min(200, innerWidth - 100)).length);
  check(`overview @${width}: row text keeps a readable width`, narrow === 0, String(narrow));
  await page.screenshot({ path: path.join(OUT, `overview-${width}.png`), fullPage: true });

  const planned = await page.evaluate(() => [...document.querySelectorAll(".fides-learn-rows > li")].filter((li) => !li.querySelector(":scope > a")).map((li) => ({
    link: Boolean(li.querySelector("a")),
    tag: getComputedStyle(li.querySelector(".fides-learn-rows__title"), "::after").content,
  })));
  // 13 November 2026: For you and For governments exist as pages, so no overview row is design-only any more and no
  // "Design preview" label is shown (see tests/learn-no-design-preview-checks.cjs).
  check(`overview @${width}: every row is a link and no row carries a "Design preview" label`, planned.every((p) => p.link || !/Design preview/.test(p.tag)) && planned.length === 0, JSON.stringify(planned));
  check(`overview @${width}: no request form or search field is pretended`, (await page.locator(".fides-learn form, .fides-learn input[type=search], .fides-learn input[type=text]").count()) === 0);

  await page.getByRole("link", { name: /^Explore topics/ }).click();
  await page.waitForURL(/\/learn\/topics\/$/);
  await baseline(page, "topics", width);
  await targets(page, "topics", width);
  const rowCount = await page.locator(".fides-learn-rows > li").count();
  const counterReset = await page.locator(".fides-learn-rows").evaluate((ul) => getComputedStyle(ul).counterReset);
  check(`topics @${width}: eight topics numbered from 00`, rowCount === 8 && /learn-row -1/.test(counterReset), `${rowCount} ${counterReset}`);
  await page.screenshot({ path: path.join(OUT, `topics-${width}.png`), fullPage: true });

  // The whole row is the click target: click away from the title text.
  const row = page.locator(".fides-learn-rows > li", { hasText: "The big picture" }).first();
  const box = await row.boundingBox();
  await page.mouse.click(box.x + box.width - 60, box.y + box.height / 2);
  await page.waitForURL(/\/the-big-picture\/$/);
  await baseline(page, "big", width);
  await targets(page, "big", width);
  const termsLine = await page.locator(".fides-learn-panel__aside").innerText();
  check(`big picture @${width}: terms you will meet and glossary route`, /Issuer/.test(termsLine) && /Relying Party/.test(termsLine) && (await page.getByRole("link", { name: /Open the glossary/ }).getAttribute("href")) === "/glossary/");
  await page.screenshot({ path: path.join(OUT, `section-${width}.png`), fullPage: true });

  await page.getByRole("link", { name: /How credentials connect/ }).first().click();
  await page.waitForURL(/how-credentials-connect\/$/);
  await baseline(page, "art1", width);
  await targets(page, "art1", width);
}

async function article(page, width) {
  await open(page, "art1");
  // Local contents menu.
  const toc = page.locator(".fides-learn-toc");
  const summary = toc.locator("summary");
  const links = (await toc.locator("a").allTextContents()).map((t) => t.trim());
  // Since tiles 1.13.54 "Continue learning" lives in the side column (Paper 24.21) and is not a contents entry: six sections.
  check(`article @${width}: contents menu lists the six sections`, links.length === 6 && links[0] === "Follow the information" && links[3] === "The receiving service checks it", links.join("|"));
  if (width >= 900) {
    check(`article @${width}: contents menu open beside the text`, (await toc.evaluate((el) => el.open)) && (await toc.boundingBox()).x > (await page.locator(".fides-learn-article__body").boundingBox()).x + 600);
  } else {
    check(`article @${width}: contents menu is compact and closed on small screens`, !(await toc.evaluate((el) => el.open)));
    await summary.click();
    check(`article @${width}: summary opens the contents menu`, await toc.evaluate((el) => el.open));
  }
  await toc.getByRole("link", { name: "The roles can differ" }).click();
  await page.waitForTimeout(900);
  const target = await page.evaluate(() => {
    const el = document.getElementById("the-roles-can-differ");
    return { hash: location.hash, top: Math.round(el.getBoundingClientRect().top) };
  });
  check(`article @${width}: contents link jumps to its section`, target.hash === "#the-roles-can-differ" && target.top >= 0 && target.top < 400, JSON.stringify(target));

  // Role flow.
  const flow = await page.locator(".fides-learn-flow li").allInnerTexts();
  check(`article @${width}: role flow Issuer, Holder + wallet, Relying party`, flow.length === 3 && /Issuer/.test(flow[0]) && /Holder \+ wallet/.test(flow[1]) && /Relying party/.test(flow[2]), flow.join("|"));
  // No series pagination on a single article.
  check(`article @${width}: no previous/next without a real series`, (await page.locator(".fides-learn-series").count()) === 0);
  // Glossary dialog from the existing mechanism.
  const term = page.locator(".fides-learn-article__body .fides-ds-term", { hasText: "issuer" }).first();
  await term.scrollIntoViewIfNeeded();
  await term.click();
  const dialog = page.locator("dialog[open], [role=dialog]:visible").first();
  await dialog.waitFor({ state: "visible", timeout: 3000 });
  const dialogText = await dialog.innerText();
  check(`article @${width}: term opens the glossary definition`, /description/i.test(dialogText) && /issue/i.test(dialogText), dialogText.slice(0, 80));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  check(`article @${width}: Escape closes the dialog and returns focus to the term`, (await dialog.isHidden()) && (await term.evaluate((el) => el === document.activeElement)));
  const box = await page.locator(".fides-learn-terms-box").innerText();
  check(`article @${width}: "Terms in this article" derives from the vocabulary`, /issuer/i.test(box) && /holder/i.test(box) && /relying party/i.test(box), box.slice(0, 120));
  const sources = await page.locator(".fides-learn-sources a").evaluateAll((as) => as.map((a) => [a.href, a.target, a.rel]));
  check(`article @${width}: sources open in a new tab with rel`, sources.length === 3 && sources.every((s) => s[1] === "_blank" && /noopener/.test(s[2])), JSON.stringify(sources));
  const cta = await page.getByRole("link", { name: /Explore use cases/ }).getAttribute("href");
  check(`article @${width}: closing band routes to the pilot use cases`, cta === "/fides-design-pilot/overview/", cta);
  // Order on small screens: contents menu, text, terms, sources.
  const order = await page.evaluate(() => ["fides-learn-toc", "fides-learn-article__body", "fides-learn-terms-box", "fides-learn-sources"].map((c) => Math.round(document.querySelector("." + c).getBoundingClientRect().top + scrollY)));
  if (width < 900) check(`article @${width}: stacked order contents, text, terms, sources`, order[0] < order[1] && order[1] < order[2] && order[2] < order[3], order.join(","));
  await page.screenshot({ path: path.join(OUT, `article-${width}.png`), fullPage: true });

  // Long text: a long title and an unbreakable URL must not break the layout.
  await page.evaluate(() => {
    document.querySelector(".fides-learn__hero h1").textContent += " " + "Supercalifragilistic".repeat(6);
    document.querySelector(".fides-learn-sources__link").firstChild.textContent += " https://example.org/" + "very-long-path-segment/".repeat(12);
    document.querySelector(".fides-learn-article__body p").textContent += " " + "https://example.org/" + "x".repeat(140);
  });
  check(`article @${width}: long title, source title and text do not overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

  await open(page, "art2");
  await baseline(page, "art2", width);
  await targets(page, "art2", width);
  const box2 = await page.locator(".fides-learn-terms-box").innerText();
  check(`article 2 @${width}: terms from the vocabulary only (Business wallet, Representation, Mandate)`, /business wallet/i.test(box2) && /mandate/i.test(box2) && /representation/i.test(box2) && !/^credential$/im.test(box2), box2.slice(0, 160));
  check(`article 2 @${width}: undefined term "credential" stays plain text`, (await page.locator(".fides-ds-term", { hasText: /^credential/i }).count()) === 0);
  const flow2 = await page.locator(".fides-learn-flow li").allInnerTexts();
  check(`article 2 @${width}: role flow with receiving service`, flow2.length === 3 && /Receiving service/.test(flow2[2]));
  const designCta = await page.locator(".fides-learn-band").innerText();
  check(`article 2 @${width}: band routes to business wallets`, (await page.getByRole("link", { name: /Browse business wallets/ }).getAttribute("href")) === "/fides-design-pilot/business-wallets/");
  await page.screenshot({ path: path.join(OUT, `article2-${width}.png`), fullPage: true });

  await open(page, "biz");
  await baseline(page, "biz", width);
  await targets(page, "biz", width);
  check(`business section @${width}: workshop step is a real link to the offering page`, (await page.locator('.fides-learn__content a[href$="/sessions/wallet-readiness-workshop/"]').count()) === 1);
  await page.screenshot({ path: path.join(OUT, `section-biz-${width}.png`), fullPage: true });
}

async function targets200(context) {
  for (const p of ["/fides-design-pilot/overview/", "/fides-design-pilot/business-wallets/", "/fides-design-pilot/credentials/", "/glossary/"]) {
    const res = await context.request.get(`${BASE}${p}`);
    check(`route to existing page ${p} responds`, res.status() === 200, String(res.status()));
  }
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: width >= 1100 ? 900 : 844 } });
      await context.addCookies(
        Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" })
          .map(([name, value]) => ({ name: `cmplz_${name}`, value, url: BASE }))
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await route(page, width);
      await article(page, width);
      check(`@${width}: no JavaScript errors on the Learn route`, errors.length === 0, errors.join(" | "));
      if (width === WIDTHS[0]) await targets200(context);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(failures === 0 ? "\nAll Learn checks passed." : `\n${failures} Learn check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
