/**
 * Targeted checks: inline links must not enlarge the line height of their paragraph.
 * Receive page ("Understand how it works") in EN and NL at 1440 and 390, plus an inline link in a
 * Learn article, plus a scan of other start/Learn pages for inline links with a grown line box.
 * Run: node receive-inline-link-checks.cjs (env: PILOT_URL, WIDTHS, CHROME_PATH, PLAYWRIGHT_MODULE).
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const PAGES = {
  en: "/fides-design-pilot/start/receive/",
  nl: "/nl/fides-design-pilot/start/receive/",
};
const LEARN = {
  en: "/fides-design-pilot/learn/topics/the-big-picture/what-is-a-credential/",
  nl: "/nl/fides-design-pilot/learn/topics/the-big-picture/what-is-a-credential/",
};
const SCAN = [
  "/fides-design-pilot/start/receive/",
  "/fides-design-pilot/start/",
  "/fides-design-pilot/learn/topics/for-businesses/business-wallets-where-to-start/",
  "/fides-design-pilot/learn/",
  "/fides-design-pilot/learn/topics/the-big-picture/what-is-a-credential/",
  "/fides-design-pilot/learn/topics/the-big-picture/european-digital-identity-wallet/",
  "/fides-design-pilot/learn/topics/for-businesses/european-business-wallet/",
];

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${detail})` : ""}`);
}

async function open(page, url) {
  const response = await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
  await page.waitForLoadState("load");
  return response;
}

// Measures a paragraph that holds an inline link plus text: computed type and rendered line boxes.
const MEASURE = () => {
  const link = [...document.querySelectorAll(".fides-learn-next p a, .fides-learn__content p a")].find((a) => {
    const p = a.closest("p");
    return p && p.textContent.trim() !== a.textContent.trim() && a.closest(".fides-learn-next");
  });
  if (!link) return null;
  return describe(link);

  function describe(a) {
    const p = a.closest("p");
    const group = p.parentElement;
    const type = (e) => {
      const s = getComputedStyle(e);
      return { fs: s.fontSize, lh: s.lineHeight, fw: s.fontWeight, color: s.color };
    };
    const neighbour = [...group.querySelectorAll("h2 ~ p, p")].find((q) => q !== p && !q.querySelector("a") && q.textContent.trim());
    const lh = parseFloat(getComputedStyle(p).lineHeight);
    const rects = [...a.getClientRects()].map((r) => Math.round(r.height));
    const range = document.createRange();
    range.selectNodeContents(p);
    const lineTops = new Set([...range.getClientRects()].map((r) => Math.round(r.top / 2)));
    const lines = Math.round(p.getBoundingClientRect().height / lh);
    return {
      href: a.getAttribute("href"),
      link: type(a),
      para: type(p),
      neighbour: neighbour ? type(neighbour) : null,
      paraHeight: p.getBoundingClientRect().height,
      lh,
      lines,
      lineTops: lineTops.size,
      display: getComputedStyle(a).display,
      minHeight: getComputedStyle(a).minHeight,
    };
  }
};

async function receive(browser, lang, width) {
  const tag = `receive ${lang} @${width}`;
  const errors = [];
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const response = await open(page, PAGES[lang]);
  check(`${tag}: page answers 200`, response && response.status() === 200, String(response && response.status()));
  const m = await page.evaluate(MEASURE);
  check(`${tag}: paragraph with inline link found`, !!m);
  if (m) {
    console.log(`# ${tag}: lh ${m.para.lh}, fs ${m.para.fs}, block height ${m.paraHeight}px, ${m.lines} lines, link display ${m.display}, min-height ${m.minHeight}`);
    check(`${tag}: link inherits font-size and line-height from paragraph`, m.link.fs === m.para.fs && m.link.lh === m.para.lh && m.link.fw === m.para.fw, JSON.stringify(m.link));
    check(`${tag}: paragraph type equals neighbouring text`, !m.neighbour || (m.neighbour.fs === m.para.fs && m.neighbour.lh === m.para.lh && m.neighbour.fw === m.para.fw && m.neighbour.color === m.para.color), JSON.stringify([m.neighbour, m.para]));
    check(`${tag}: paragraph height = N x line-height (+/-1px)`, Math.abs(m.paraHeight - m.lines * m.lh) <= 1 && m.lines >= 1, `${m.paraHeight} vs ${m.lines}x${m.lh}`);
    check(`${tag}: link is not inline-flex/min-height`, m.display === "inline" && m.minHeight === "0px" || m.minHeight === "auto", `${m.display}/${m.minHeight}`);
  }
  // Same text without the link as a reference paragraph.
  const ref = await page.evaluate(() => {
    const a = [...document.querySelectorAll(".fides-learn-next p a")].find((x) => x.closest("p").textContent.trim() !== x.textContent.trim());
    if (!a) return null;
    const p = a.closest("p");
    const clone = p.cloneNode(false);
    clone.textContent = p.textContent;
    p.after(clone);
    const h = { withLink: p.getBoundingClientRect().height, plain: clone.getBoundingClientRect().height };
    clone.remove();
    return h;
  });
  check(`${tag}: height equals the same text without link`, ref && Math.abs(ref.withLink - ref.plain) <= 1, JSON.stringify(ref));

  // Link works and destination answers 200.
  const link = page.locator(".fides-learn-next p a").first();
  const href = await link.getAttribute("href");
  const dest = await context.request.get(new URL(href, BASE).toString());
  check(`${tag}: inline link href answers 200`, dest.status() === 200, `${href} ${dest.status()}`);
  const target = page.locator(".fides-learn-next p a", { hasText: /\w/ }).first();
  await target.click();
  await page.waitForLoadState("domcontentloaded");
  check(`${tag}: click navigates to destination`, new URL(page.url()).pathname === new URL(href, BASE).pathname, page.url());

  // Keyboard focus is visible and not clipped.
  await open(page, PAGES[lang]);
  const focus = await page.evaluate(() => {
    const a = [...document.querySelectorAll(".fides-learn-next p a")].find((x) => x.closest("p").textContent.trim() !== x.textContent.trim());
    a.focus({ focusVisible: true });
    const s = getComputedStyle(a);
    const box = a.getBoundingClientRect();
    let clipped = false;
    const ow = parseFloat(s.outlineWidth) || 0;
    for (let n = a.parentElement; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n);
      if (/hidden|clip/.test(o.overflowX + o.overflowY)) {
        const r = n.getBoundingClientRect();
        if (box.top - ow < r.top || box.bottom + ow > r.bottom || box.left - ow < r.left || box.right + ow > r.right) clipped = true;
      }
    }
    return { matches: a.matches(":focus-visible"), outline: s.outlineStyle !== "none" && ow > 0, shadow: s.boxShadow !== "none", clipped };
  });
  check(`${tag}: link shows keyboard focus (outline or shadow)`, focus.matches && (focus.outline || focus.shadow), JSON.stringify(focus));
  check(`${tag}: focus ring not clipped by overflow`, !focus.clipped);
  const tab = await page.evaluate(() => {
    const a = [...document.querySelectorAll(".fides-learn-next p a")].find((x) => x.closest("p").textContent.trim() !== x.textContent.trim());
    return Math.round(a.getBoundingClientRect().height);
  });
  console.log(`# ${tag}: link box height ${tab}px (click/focus area)`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag}: no horizontal overflow`, overflow <= 0, String(overflow));
  check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));
  await context.close();
}

// A second inline link in a Learn article keeps a normal line box.
async function learnLink(browser, lang, width) {
  const tag = `learn ${lang} @${width}`;
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  await open(page, LEARN[lang]);
  const r = await page.evaluate(() => {
    const a = [...document.querySelectorAll(".fides-learn__content p a")].find((x) => x.closest("p").textContent.trim() !== x.textContent.trim());
    if (!a) return null;
    const p = a.closest("p");
    const lh = parseFloat(getComputedStyle(p).lineHeight);
    return { h: p.getBoundingClientRect().height, lh, rects: [...a.getClientRects()].map((x) => x.height), min: getComputedStyle(a).minHeight };
  });
  check(`${tag}: article paragraph with inline link found`, !!r);
  if (r) {
    check(`${tag}: link line boxes <= line-height`, r.rects.every((h) => h <= r.lh + 1) && Math.abs(r.h / r.lh - Math.round(r.h / r.lh)) < 0.05, JSON.stringify(r));
  }
  await context.close();
}

// Scan: any inline link in running text whose own box exceeds the line height of its parent.
async function scan(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  for (const url of SCAN) {
    const res = await open(page, url);
    if (!res || res.status() !== 200) {
      console.log(`# scan @${width} ${url}: status ${res && res.status()} (skipped)`);
      continue;
    }
    const bad = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll("p a, li a, dd a").forEach((a) => {
        const host = a.closest("p, li, dd");
        if (!host) return;
        const hostText = host.textContent.trim();
        if (hostText === a.textContent.trim()) return; // link-only block: a standalone action
        const lh = parseFloat(getComputedStyle(host).lineHeight);
        if (!lh) return;
        const s = getComputedStyle(a);
        // Block links are whole-card links; only inline-level boxes can inflate a text line.
        const grown = /^inline-(flex|block|grid)$/.test(s.display) && [...a.getClientRects()].some((r) => r.height > lh + 1);
        if (grown || (s.display === "inline-flex" && parseFloat(s.minHeight) > lh)) {
          out.push(`${a.textContent.trim().slice(0, 40)} [${s.display}, min-h ${s.minHeight}, ${host.className || host.tagName}]`);
        }
      });
      return out;
    });
    check(`scan @${width} ${url}: no inline link enlarges its line`, bad.length === 0, bad.join("; "));
  }
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const width of WIDTHS) {
    for (const lang of ["en", "nl"]) {
      await receive(browser, lang, width);
      await learnLink(browser, lang, width);
    }
    await scan(browser, width);
  }
  await browser.close();
  console.log(failures ? `${failures} check(s) failed` : "all checks passed");
  process.exit(failures ? 1 : 0);
})();
