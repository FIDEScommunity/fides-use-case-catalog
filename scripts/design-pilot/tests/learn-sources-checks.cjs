/**
 * Sources list on Learn articles (Paper 24.18, styleguide 25.14), checked at 1440 and 390 in EN and NL.
 * Articles: several sources, the longest source titles (manifest), plus the shared rules for every article.
 * Checks: one line and one link per source with organisation and title, no visible URL, full href kept,
 * list open by default, long titles wrap without truncation, no page overflow, hover and keyboard focus styles,
 * external indicator only for other hosts, no requests to external hosts, no console errors.
 * The own-domain branch is covered by learn-sources-behaviour.php (needs the WordPress render path).
 * Run: CHROME_PATH=... PLAYWRIGHT_MODULE=... node tests/learn-sources-checks.cjs   (env: PILOT_URL, WIDTHS)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const HOST = new URL(BASE).host;
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const T = "learn/topics";
const ARTICLES = {
  "several sources (EUDI Wallet)": `${T}/the-big-picture/european-digital-identity-wallet/`,
  "long title (credentials, 109 chars)": `${T}/the-big-picture/what-is-a-credential/`,
  "longest title (trust, 111 chars)": `${T}/the-big-picture/trust-and-interoperability/`,
};
const LOCALES = { EN: "/fides-design-pilot/", NL: "/nl/fides-design-pilot/" };

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

async function run() {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "learn", "manifest.json"), "utf8"));
  const longest = manifest.pages.flatMap((p) => (p.sources || "").split("\n").map((l) => l.split("|")[0].trim())).sort((a, b) => b.length - a.length)[0];
  check(`manifest: longest source title is covered (${longest.length} chars)`, longest.length >= 100);

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  for (const [loc, prefix] of Object.entries(LOCALES)) {
    for (const [label, rel] of Object.entries(ARTICLES)) {
      for (const width of WIDTHS) {
        const tag = `${loc} ${label} @${width}`;
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await context.newPage();
        const external = [];
        const errors = [];
        await page.route("**/*", (route) => {
          const u = new URL(route.request().url());
          if (/^https?:$/.test(u.protocol) && u.host !== HOST) {
            external.push(u.host);
            return route.abort();
          }
          return route.continue();
        });
        page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
        page.on("pageerror", (e) => errors.push(String(e)));
        const response = await page.goto(`${BASE}${prefix}${rel}`, { waitUntil: "domcontentloaded" });
        const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
        if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
        check(`${tag}: page answers 200`, response && response.status() === 200, String(response && response.status()));

        const info = await page.evaluate(() => {
          const sec = document.querySelector(".fides-learn-sources");
          if (!sec) return null;
          const links = [...sec.querySelectorAll("a")];
          const lineH = 24;
          const vis = (el) => {
            const c = el.cloneNode(true);
            c.querySelectorAll(".fides-ds-visually-hidden").forEach((n) => n.remove());
            return c.textContent.replace(/\s+/g, " ").trim();
          };
          return {
            heading: sec.querySelector("h2").innerText,
            inDetails: !!sec.closest("details"),
            detailsOpen: sec.closest("details") ? sec.closest("details").open : null,
            visible: sec.getBoundingClientRect().height > 0,
            items: [...sec.querySelectorAll("li")].map((li) => ({
              links: li.querySelectorAll("a").length,
              extra: li.children.length,
              // Visible text only: the visually hidden new-tab hint is not part of the visible line.
              liText: vis(li),
              linkText: vis(li.querySelector("a")),
              href: li.querySelector("a").getAttribute("href"),
              target: li.querySelector("a").getAttribute("target"),
              indicator: !!li.querySelector('a [aria-hidden="true"]'),
              aria: li.querySelector("a").getAttribute("aria-label"),
              lines: Math.max(1, Math.round((li.querySelector("a").getBoundingClientRect().height - parseFloat(getComputedStyle(li.querySelector("a")).paddingTop) * 2) / lineH)),
              fs: getComputedStyle(li.querySelector("a")).fontSize,
              lh: getComputedStyle(li.querySelector("a")).lineHeight,
              hasDot: li.querySelector("a").textContent.includes(" · "),
              nameEls: li.querySelectorAll("a strong").length,
              nameText: li.querySelector("a strong") ? li.querySelector("a strong").textContent : "",
              nameWeight: li.querySelector("a strong") ? getComputedStyle(li.querySelector("a strong")).fontWeight : null,
              titleWeight: getComputedStyle(li.querySelector("a")).fontWeight,
              gapBelow: li.nextElementSibling ? Math.round(li.nextElementSibling.getBoundingClientRect().top - li.getBoundingClientRect().bottom) : 0,
              trunc: li.querySelector("a").scrollWidth > li.querySelector("a").clientWidth + 1 || getComputedStyle(li.querySelector("a")).textOverflow === "ellipsis" || getComputedStyle(li.querySelector("a")).overflow === "hidden",
              height: Math.round(li.querySelector("a").getBoundingClientRect().height),
            })),
            visibleUrl: [...sec.querySelectorAll("*")].some((el) => /https?:\/\//i.test(el.childNodes.length === 1 && el.firstChild.nodeType === 3 ? el.textContent : "")) || /https?:\/\//i.test(sec.innerText),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        check(`${tag}: sources section exists with a heading`, !!info && info.heading.length > 0, info && info.heading);
        if (!info) continue;
        check(`${tag}: ${info.items.length} sources, each one link with its organisation/title label`, info.items.length >= 2 && info.items.every((i) => i.links === 1 && i.extra === 1 && i.linkText.length > 3 && i.liText === i.linkText), JSON.stringify(info.items.map((i) => i.liText)));
        check(`${tag}: no visible URL text`, !info.visibleUrl);
        check(`${tag}: href stays complete (https, host and path)`, info.items.every((i) => /^https:\/\/[^/]+\/.+/.test(i.href)), info.items.map((i) => i.href).join(" "));
        check(`${tag}: list is open by default`, info.visible && (!info.inDetails || info.detailsOpen));
        check(`${tag}: long titles wrap, no truncation`, info.items.every((i) => !i.trunc));
        check(`${tag}: no horizontal page overflow`, info.overflow <= 0, String(info.overflow));
        const minH = width < 768 ? 44 : 32;
        check(`${tag}: link height is at least ${minH}px (44px on mobile), no contradicting aria-label`, info.items.every((i) => i.height >= minH && (i.aria === null || i.aria === "")), JSON.stringify(info.items.map((i) => [i.height, i.aria])));
        check(`${tag}: 16px text, 24px line height, no extra gap between sources`, info.items.every((i) => i.fs === "16px" && i.lh === "24px" && i.gapBelow === 0), JSON.stringify(info.items.map((i) => [i.fs, i.lh, i.gapBelow])));
        check(`${tag}: source name is semibold only when the label has one, title stays normal`, info.items.every((i) => (i.hasDot ? i.nameEls === 1 && Number(i.nameWeight) >= 600 && !i.liText.startsWith(" ") && i.liText.startsWith(i.nameText + " · ") : i.nameEls === 0) && Number(i.titleWeight) <= 400), JSON.stringify(info.items.map((i) => [i.nameEls, i.nameWeight, i.titleWeight])));
        if (label.startsWith("long title")) check(`${tag}: a label without a source name exists here and is all normal weight`, info.items.some((i) => !i.hasDot && i.nameEls === 0), JSON.stringify(info.items.map((i) => i.liText)));
        check(`${tag}: external indicator and new tab only for other hosts`, info.items.every((i) => {
          const ext = new URL(i.href, BASE).host !== HOST;
          return i.indicator === ext && (i.target === "_blank") === ext;
        }));

        // Hover and keyboard focus.
        const link = page.locator(".fides-learn-sources a").first();
        await link.scrollIntoViewIfNeeded();
        const before = await link.evaluate((a) => getComputedStyle(a).textDecorationLine);
        await link.hover();
        const hover = await link.evaluate((a) => getComputedStyle(a).textDecorationLine);
        check(`${tag}: hover underlines the link`, before === "none" && hover.includes("underline"), `${before} -> ${hover}`);
        await page.mouse.move(0, 0);
        await page.keyboard.press("Shift");
        await link.focus();
        const focus = await link.evaluate((a) => ({ fv: a.matches(":focus-visible"), w: getComputedStyle(a).outlineWidth, s: getComputedStyle(a).outlineStyle, c: getComputedStyle(a).outlineColor }));
        check(`${tag}: keyboard focus shows a 2px outline`, focus.fv && focus.s === "solid" && parseFloat(focus.w) >= 2, JSON.stringify(focus));

        // The theme requests Google Fonts on every page (pre-existing, aborted here); only other hosts count as a failure.
        const unexpected = external.filter((h) => !/^fonts\.(googleapis|gstatic)\.com$/.test(h));
        check(`${tag}: no requests to external hosts (sources are only href attributes)`, unexpected.length === 0, [...new Set(unexpected)].join(","));
        check(`${tag}: no console errors`, errors.length === 0, errors.join(" | "));
        if (loc === "EN" || label.startsWith("several")) {
          console.log(`  # ${tag}: heading "${info.heading}"; lines per source: ${info.items.map((i) => `${i.lines}x "${i.linkText.slice(0, 48)}${i.linkText.length > 48 ? "…" : ""}"`).join("; ")}`);
        }
        if (loc === "NL") check(`${tag}: heading is translated`, info.heading !== "Sources & further reading", info.heading);
        await context.close();
      }
    }
  }
  await browser.close();
  console.log(failures ? `${failures} check(s) failed` : "all checks passed");
  process.exit(failures ? 1 : 0);
}
run();
