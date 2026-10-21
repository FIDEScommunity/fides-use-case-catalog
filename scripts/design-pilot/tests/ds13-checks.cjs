/**
 * DS1.3 behaviour checks shared by the use-case, organization and wallet pilots.
 *
 * Modal layers: the glossary dialog and the compact Filters dialogs keep the
 * page where it was (also when the wheel is used over the backdrop or past
 * the end of the content), scroll their own content to both ends, keep the
 * title and Close reachable within the window, and restore position and focus
 * on Escape, Cancel and Back. Normal scrolling works again afterwards.
 * Also at low windows and at 200% / 400% zoom (smaller CSS viewport, higher
 * device pixel ratio).
 * Accordion headings: title and count read as one group, a 44px row with the
 * chevron on the right, aria-expanded / aria-controls in sync, keyboard use.
 * Section navigation: one current link (aria-current="location") that follows
 * a chosen link, scrolling and anchor / Back navigation.
 * Wallet header actions: below identity and logo at full content width on
 * phones, 44px targets, side by side when they fit, no overflow.
 *
 * Run through run-ds13-checks.sh.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const OUT = process.env.SCREENS_DIR || path.join(process.cwd(), "screens");
const DETAILS = {
  "use case": `${BASE}/fides-design-pilot/use-case/?usecase=end-to-end-digital-business-workflows-transforming-kyb-kyc-kys-via-eu-business-wallet-F665Dh`,
  organization: `${BASE}/fides-design-pilot/organization/?org=org:credenco`,
  "business wallet": `${BASE}/fides-design-pilot/wallet/?wallet=credenco-business-wallet`,
  "personal wallet": `${BASE}/fides-design-pilot/wallet/?wallet=credenco-wallet`,
};
const GLOSSARY = {
  "business wallet": `${BASE}/fides-design-pilot/wallet/?wallet=sphereon-business-wallet`,
  "personal wallet": `${BASE}/fides-design-pilot/wallet/?wallet=credenco-wallet`,
};
const OVERVIEWS = {
  "use cases": `${BASE}/fides-design-pilot/overview/`,
  organizations: `${BASE}/fides-design-pilot/organizations/`,
  "business wallets": `${BASE}/fides-design-pilot/business-wallets/`,
  "personal wallets": `${BASE}/fides-design-pilot/personal-wallets/`,
};
/* [label, CSS width, CSS height, device pixel ratio]: 200% and 400% zoom of a 1280 x 900 window. */
const MODAL_VIEWPORTS = [
  ["1440", 1440, 900, 1],
  ["1440 low", 1440, 500, 1],
  ["1280", 1280, 800, 1],
  ["768", 768, 1024, 2],
  ["390", 390, 844, 3],
  ["320 low", 320, 480, 2],
  ["zoom 200%", 640, 450, 2],
  ["zoom 400%", 320, 225, 4],
];

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

async function open(page, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  } catch (err) {
    console.log(`# retry ${url}: ${err.message.split("\n")[0]}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  }
}

async function newContext(browser, width, height, scale) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale || 1 });
  await context.addCookies(
    Object.entries({ "banner-status": "dismissed", policy_id: "35", functional: "allow", preferences: "deny", statistics: "deny", marketing: "deny" })
      .map(([name, value]) => ({ name: `cmplz_${name}`, value, url: BASE }))
  );
  return context;
}

async function wheel(page, x, y, delta, times) {
  await page.mouse.move(x, y);
  for (let i = 0; i < times; i += 1) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(300);
}

const scrollY = (page) => page.evaluate(() => Math.round(window.scrollY));
// The site uses smooth scrolling, so focus moves can still be animating.
async function settledScrollY(page) {
  let last = await scrollY(page);
  for (let i = 0; i < 20; i += 1) {
    await page.waitForTimeout(100);
    const next = await scrollY(page);
    if (next === last) return next;
    last = next;
  }
  return last;
}
const locked = (page) => page.evaluate(() => document.documentElement.classList.contains("fides-ds-scroll-locked"));

async function glossaryChecks(browser) {
  for (const [kind, url] of Object.entries(GLOSSARY)) {
    for (const [label, width, height, scale] of MODAL_VIEWPORTS) {
      const tag = `glossary ${kind} @${label}`;
      const context = await newContext(browser, width, height, scale);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await open(page, url);
      const toggle = await page.$("#technical .fides-ds-collapsible__toggle");
      if (toggle) await toggle.click();
      const term = page.locator("#technical [data-fides-ds-term]").first();
      if (!(await term.count())) {
        check(`${tag}: technical details offer a glossary term`, false, "no term");
        await context.close();
        continue;
      }
      await term.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy({ top: -Math.round(window.innerHeight / 4), behavior: "instant" }));
      await page.waitForTimeout(150);
      await term.focus();
      const start = await settledScrollY(page);
      await page.keyboard.press("Enter");
      await page.waitForSelector(".fides-ds-dialog[open]");
      await page.evaluate(() => {
        const body = document.querySelector(".fides-ds-dialog__body");
        body.insertAdjacentHTML("beforeend", `<p data-ds13-long>${"A long definition keeps going so the dialog has to scroll within the window. ".repeat(80)}</p><p data-ds13-end>End of definition.</p>`);
      });
      const frame = await page.evaluate(() => {
        const dialog = document.querySelector(".fides-ds-dialog").getBoundingClientRect();
        const close = document.querySelector(".fides-ds-dialog__close").getBoundingClientRect();
        const title = document.querySelector(".fides-ds-dialog__title").getBoundingClientRect();
        return { top: dialog.top, bottom: dialog.bottom, left: dialog.left, right: dialog.right, vw: innerWidth, vh: innerHeight, closeTop: close.top, closeBottom: close.bottom, titleTop: title.top, focus: document.activeElement && document.activeElement.matches("[data-fides-ds-dialog-close]") };
      });
      check(`${tag}: dialog fits the window`, frame.top >= 0 && frame.bottom <= frame.vh + 0.5 && frame.left >= 0 && frame.right <= frame.vw + 0.5, JSON.stringify(frame));
      check(`${tag}: title and Close visible, Close focused`, frame.closeTop >= 0 && frame.closeBottom <= frame.vh && frame.titleTop >= 0 && frame.focus, JSON.stringify(frame));
      await wheel(page, 2, height - 2, 500, 3);
      check(`${tag}: wheel over the backdrop leaves the page`, (await scrollY(page)) === start, `${start} -> ${await scrollY(page)}`);
      const body = await page.evaluate(() => {
        const box = document.querySelector(".fides-ds-dialog__body").getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + Math.min(box.height / 2, 40) };
      });
      await wheel(page, body.x, body.y, 600, 40);
      const end = await page.evaluate(() => {
        const b = document.querySelector(".fides-ds-dialog__body");
        const last = document.querySelector("[data-ds13-end]").getBoundingClientRect();
        return { rest: Math.round(b.scrollHeight - b.clientHeight - b.scrollTop), lastVisible: last.bottom <= b.getBoundingClientRect().bottom + 1 && last.top >= 0, y: Math.round(window.scrollY), closeTop: document.querySelector(".fides-ds-dialog__close").getBoundingClientRect().top };
      });
      check(`${tag}: long content scrolls to its end inside the dialog`, end.rest <= 1 && end.lastVisible, JSON.stringify(end));
      check(`${tag}: scrolling past the end does not move the page`, end.y === start && end.closeTop >= 0, JSON.stringify(end));
      if (label === "320 low" || label === "zoom 400%") {
        await page.screenshot({ path: path.join(OUT, `glossary-${kind.replace(/ /g, "-")}-${label.replace(/[^a-z0-9]+/gi, "-")}.png`) });
      }
      await wheel(page, body.x, body.y, -600, 40);
      const top = await page.evaluate(() => ({ top: document.querySelector(".fides-ds-dialog__body").scrollTop, y: Math.round(window.scrollY) }));
      check(`${tag}: content scrolls back to its start, page unchanged`, top.top === 0 && top.y === start, JSON.stringify(top));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => ({ open: !!document.querySelector(".fides-ds-dialog[open]"), y: Math.round(window.scrollY), focus: !!(document.activeElement && document.activeElement.hasAttribute("data-fides-ds-term")) }));
      check(`${tag}: Escape closes, keeps the position and returns focus to the term`, !after.open && after.y === start && after.focus, JSON.stringify({ start, ...after }));
      check(`${tag}: page lock released`, !(await locked(page)));
      await wheel(page, width / 2, height / 2, 200, 1);
      check(`${tag}: page scrolls normally after closing`, (await scrollY(page)) > start, `${start} -> ${await scrollY(page)}`);
      for (let i = 0; i < 3; i += 1) {
        await term.click();
        await page.waitForSelector(".fides-ds-dialog[open]");
        await page.click(".fides-ds-dialog__close");
        await page.waitForTimeout(80);
      }
      check(`${tag}: repeated open and close leaves no lock`, !(await locked(page)));
      check(`${tag}: no page errors`, errors.length === 0, errors.join(" | "));
      await context.close();
    }
  }
}

async function filterDialogChecks(browser) {
  for (const [kind, url] of Object.entries(OVERVIEWS)) {
    for (const [label, width, height, scale] of [["768", 768, 1024, 2], ["390", 390, 844, 3], ["320 low", 320, 480, 2], ["zoom 400%", 320, 225, 4]]) {
      const tag = `filters ${kind} @${label}`;
      const context = await newContext(browser, width, height, scale);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await open(page, url);
      if (label === "768") {
        await page.waitForSelector(".fides-uc-pilot__filters .fides-ds-popover__toggle", { timeout: 30000 });
        const inline = await page.evaluate(() => ({
          dialogToggle: !!document.querySelector("[data-pilot-open]")?.offsetParent,
          filters: [...document.querySelectorAll(".fides-uc-pilot__filters .fides-ds-popover__toggle")].filter((el) => el.offsetParent).length,
        }));
        check(`${tag}: filters sit inline, no Filters dialog`, !inline.dialogToggle && inline.filters > 0, JSON.stringify(inline));
        await context.close();
        continue;
      }
      await page.waitForSelector("[data-pilot-open]", { timeout: 30000 });
      await page.evaluate(() => {
        const box = document.querySelector("[data-pilot-open]").getBoundingClientRect();
        window.scrollTo({ top: Math.max(0, Math.round(window.scrollY + box.top - 12)), behavior: "instant" });
      });
      await page.waitForTimeout(200);
      const start = await scrollY(page);
      await page.click("[data-pilot-open]");
      await page.waitForSelector(".fides-uc-pilot__filter-panel.is-open");
      await page.evaluate(() => {
        const tech = document.querySelector(".fides-uc-pilot__filter-panel [data-pilot-tech-toggle]");
        if (tech && tech.getAttribute("aria-expanded") !== "true") tech.click();
        const first = document.querySelector(".fides-uc-pilot__filter-panel .fides-ds-popover__toggle");
        if (first) first.click();
      });
      await page.waitForTimeout(150);
      const opened = await page.evaluate(() => {
        const panel = document.querySelector(".fides-uc-pilot__filter-panel.is-open");
        const close = panel.querySelector(".fides-uc-pilot__panel-close").getBoundingClientRect();
        return { y: Math.round(window.scrollY), scrollable: panel.scrollHeight > panel.clientHeight, closeTop: close.top, role: panel.getAttribute("role"), modal: panel.getAttribute("aria-modal") };
      });
      check(`${tag}: dialog opens over the page in place`, opened.y === start && opened.role === "dialog" && opened.modal === "true" && opened.closeTop >= 0, JSON.stringify({ start, ...opened }));
      await wheel(page, width / 2, height / 2, 500, 30);
      const bottom = await page.evaluate(() => {
        const panel = document.querySelector(".fides-uc-pilot__filter-panel.is-open");
        const apply = panel.querySelector("[data-pilot-apply]").getBoundingClientRect();
        const close = panel.querySelector(".fides-uc-pilot__panel-close").getBoundingClientRect();
        return { rest: Math.round(panel.scrollHeight - panel.clientHeight - panel.scrollTop), y: Math.round(window.scrollY), applyBottom: apply.bottom, closeTop: close.top, vh: innerHeight };
      });
      check(`${tag}: filter content scrolls to its end, page stays`, bottom.rest <= 1 && bottom.y === start, JSON.stringify({ start, ...bottom }));
      check(`${tag}: Close and Apply stay reachable`, bottom.closeTop >= 0 && bottom.applyBottom <= bottom.vh + 0.5, JSON.stringify(bottom));
      if (kind === "business wallets" && label !== "390") {
        await page.screenshot({ path: path.join(OUT, `filters-${label.replace(/[^a-z0-9]+/gi, "-")}-end.png`) });
      }
      await wheel(page, width / 2, height / 2, -500, 30);
      const top = await page.evaluate(() => ({ top: document.querySelector(".fides-uc-pilot__filter-panel.is-open").scrollTop, y: Math.round(window.scrollY) }));
      check(`${tag}: filter content scrolls back to its start, page stays`, top.top === 0 && top.y === start, JSON.stringify(top));
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      const closed = await page.evaluate(() => ({ open: !!document.querySelector(".fides-uc-pilot__filter-panel.is-open"), y: Math.round(window.scrollY), focus: !!(document.activeElement && document.activeElement.matches("[data-pilot-open]")) }));
      check(`${tag}: Escape closes in place and returns focus to Filters`, !closed.open && closed.y === start && closed.focus, JSON.stringify({ start, ...closed }));
      check(`${tag}: page lock released after Escape`, !(await locked(page)));
      await page.click("[data-pilot-open]");
      await page.click("[data-pilot-cancel]");
      await page.waitForTimeout(150);
      check(`${tag}: Cancel closes in place`, (await scrollY(page)) === start && !(await locked(page)));
      await wheel(page, width / 2, height / 2, 200, 1);
      check(`${tag}: page scrolls normally after closing`, (await scrollY(page)) !== start, `${start} -> ${await scrollY(page)}`);
      if (label === "390") {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.click("[data-pilot-open]");
        await page.waitForSelector(".fides-uc-pilot__filter-panel.is-open");
        await page.waitForTimeout(200);
        await page.evaluate(() => {
          const group = document.querySelector(".fides-uc-pilot__filter-panel.is-open .fides-ds-popover__toggle");
          if (group.getAttribute("aria-expanded") !== "true") group.click();
        });
        await page.waitForSelector(".fides-uc-pilot__filter-panel.is-open .fides-ds-popover.is-open", { timeout: 5000 }).catch(async () => {
          console.log(`# popover state: ${await page.evaluate(() => JSON.stringify([...document.querySelectorAll(".fides-uc-pilot__filter-panel .fides-ds-popover")].slice(0, 2).map((p) => [p.className, p.querySelector(".fides-ds-popover__toggle").getAttribute("aria-expanded")])))}`);
        });
        await page.locator(".fides-uc-pilot__filter-panel.is-open .fides-ds-popover.is-open :is(input[type=checkbox], input[type=radio]):not([value=''])").first().check();
        await page.click("[data-pilot-apply]");
        await page.waitForTimeout(250);
        await page.click("[data-pilot-open]");
        await page.waitForSelector(".fides-uc-pilot__filter-panel.is-open");
        await page.goBack();
        await page.waitForTimeout(500);
        const back = await page.evaluate(() => ({ open: !!document.querySelector(".fides-uc-pilot__filter-panel.is-open"), locked: document.documentElement.classList.contains("fides-ds-scroll-locked") || document.documentElement.classList.contains("fides-uc-pilot-panel-open") }));
        check(`${tag}: Back with the dialog open closes it and releases the page`, !back.open && !back.locked, JSON.stringify(back));
        await wheel(page, width / 2, height / 2, 200, 1);
        check(`${tag}: page scrolls after Back`, (await scrollY(page)) > 0);
      }
      check(`${tag}: no page errors`, errors.length === 0, errors.join(" | "));
      await context.close();
    }
  }
}

async function accordionChecks(browser) {
  for (const width of [768, 390, 320]) {
    const context = await newContext(browser, width, 844, 2);
    const page = await context.newPage();
    for (const [kind, url] of Object.entries(DETAILS)) {
      const tag = `accordion ${kind} @${width}`;
      await open(page, url);
      const rows = await page.evaluate(() => [...document.querySelectorAll(".fides-ds-collapsible__toggle")].map((toggle) => {
        const box = toggle.getBoundingClientRect();
        const label = toggle.querySelector(".fides-ds-collapsible__label");
        const count = label && label.querySelector(':scope > [class*="__count"], :scope > [class*="__total"]');
        const chevron = toggle.querySelector(".fides-ds-collapsible__chevron").getBoundingClientRect();
        let gap = null;
        let sameLine = null;
        if (count) {
          const range = document.createRange();
          range.setStartBefore(label.firstChild);
          range.setEndBefore(count);
          const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
          const lastTop = rects[rects.length - 1].top;
          const titleRight = Math.max(...rects.filter((rect) => Math.abs(rect.top - lastTop) < 4).map((rect) => rect.right));
          const countBox = count.getBoundingClientRect();
          sameLine = countBox.top < rects[rects.length - 1].bottom;
          gap = sameLine ? Math.round(countBox.left - titleRight) : null;
        }
        const body = document.getElementById(toggle.getAttribute("aria-controls") || "");
        return {
          text: toggle.textContent.trim().replace(/\s+/g, " "),
          height: Math.round(box.height),
          right: Math.round(box.right - chevron.right),
          gap,
          sameLine,
          count: count ? `${getComputedStyle(count).fontSize}/${getComputedStyle(count).lineHeight}/${getComputedStyle(count).fontWeight}` : null,
          controls: !!body,
          expanded: toggle.getAttribute("aria-expanded"),
          hidden: body ? body.hidden : null,
          overflow: toggle.scrollWidth - toggle.clientWidth,
        };
      }));
      check(`${tag}: accordions present`, rows.length > 0, "none");
      const bad = rows.filter((row) => row.height < 44 || !row.controls || (row.expanded === "true") === row.hidden || row.overflow > 0 || row.right > 1);
      check(`${tag}: 44px rows, chevron on the right, aria-controls and state in sync`, bad.length === 0, JSON.stringify(bad));
      const counts = rows.filter((row) => row.count);
      const looseCounts = counts.filter((row) => row.sameLine ? Math.abs(row.gap - 8) > 1 : false);
      check(`${tag}: count follows its title at 8px`, counts.length > 0 && looseCounts.length === 0, JSON.stringify(looseCounts.length ? looseCounts : counts));
      check(`${tag}: count 14/22 regular`, counts.every((row) => row.count === "14px/22px/400"), JSON.stringify(counts.map((row) => row.count)));
      const toggle = page.locator(".fides-ds-collapsible__toggle").first();
      await toggle.focus();
      const before = await toggle.getAttribute("aria-expanded");
      const outline = await toggle.evaluate((el) => getComputedStyle(el).outlineStyle);
      await page.keyboard.press("Enter");
      const after = await toggle.getAttribute("aria-expanded");
      await page.keyboard.press("Space");
      const again = await toggle.getAttribute("aria-expanded");
      check(`${tag}: Enter and Space toggle with a visible focus ring`, before !== after && after !== again && outline !== "none", JSON.stringify({ before, after, again, outline }));
      if (width === 320) {
        const heads = await page.$$(".fides-ds-collapsible__toggle");
        for (let i = 0; i < heads.length; i += 1) {
          if ((await heads[i].textContent()).match(/\d/)) {
            await heads[i].scrollIntoViewIfNeeded();
            await heads[i].screenshot({ path: path.join(OUT, `accordion-${kind.replace(/ /g, "-")}-${width}-${i}.png`) });
          }
        }
      }
    }
    await context.close();
  }
}

async function sectionNavChecks(browser) {
  for (const width of [1440, 1280, 768, 390]) {
    const context = await newContext(browser, width, 900, 1);
    const page = await context.newPage();
    for (const [kind, url] of Object.entries(DETAILS)) {
      const tag = `section nav ${kind} @${width}`;
      const errors = [];
      const onError = (err) => errors.push(err.message);
      page.on("pageerror", onError);
      await open(page, url);
      const current = () => page.evaluate(() => [...document.querySelectorAll("[data-fides-ds-section-nav] a[aria-current]")].map((a) => `${a.getAttribute("href")}|${a.getAttribute("aria-current")}`));
      const links = await page.$$eval("[data-fides-ds-section-nav] a[href^='#']", (as) => as.filter((a) => !a.closest("[hidden]")).map((a) => ({ href: a.getAttribute("href"), target: !!document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1))) })));
      check(`${tag}: every section link has a target`, links.length > 1 && links.every((link) => link.target), JSON.stringify(links));
      const first = await current();
      check(`${tag}: first section is current on load`, first.length === 1 && first[0] === `${links[0].href}|location`, JSON.stringify(first));
      const pick = links[Math.min(2, links.length - 1)].href;
      if (width < 1100) await page.click("[data-fides-ds-section-nav] > summary");
      await page.click(`[data-fides-ds-section-nav] a[href='${pick}']`);
      await page.waitForTimeout(1400);
      const chosen = await current();
      const landed = await page.evaluate((href) => Math.round(document.getElementById(decodeURIComponent(href.slice(1))).getBoundingClientRect().top), pick);
      check(`${tag}: chosen link becomes current and its section is in view`, chosen.length === 1 && chosen[0] === `${pick}|location` && landed >= 0 && landed < 200, JSON.stringify({ chosen, landed }));
      if (width < 1100) check(`${tag}: On this page closes after choosing`, !(await page.$eval("[data-fides-ds-section-nav]", (nav) => nav.open)));
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(300);
      check(`${tag}: back at the top the first section is current`, (await current())[0] === `${links[0].href}|location`, JSON.stringify(await current()));
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      await page.waitForTimeout(300);
      const end = await current();
      check(`${tag}: scrolling moves the current section`, end.length === 1 && end[0] !== `${links[0].href}|location`, JSON.stringify(end));
      const last = links[links.length - 1].href;
      await page.evaluate((href) => { window.location.hash = href; }, last);
      await page.waitForTimeout(1200);
      check(`${tag}: anchor navigation marks its section`, (await current())[0] === `${last}|location`, JSON.stringify(await current()));
      await page.goBack();
      await page.waitForTimeout(1200);
      const back = await page.evaluate(() => window.location.hash);
      check(`${tag}: Back marks the section it returns to`, (await current())[0] === `${back}|location`, JSON.stringify({ back, current: await current() }));
      if (width === 1440 && kind === "business wallet") {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.click("[data-fides-ds-section-nav] a[href='#use-cases']");
        await page.waitForTimeout(1200);
        await (await page.$("[data-fides-ds-section-nav]")).screenshot({ path: path.join(OUT, "section-nav-current-1440.png") });
      }
      check(`${tag}: no page errors`, errors.length === 0, errors.join(" | "));
      page.off("pageerror", onError);
    }
    await context.close();
  }
}

async function walletActionChecks(browser) {
  const widths = {};
  for (const width of [390, 320]) {
    const context = await newContext(browser, width, 900, 2);
    const page = await context.newPage();
    for (const id of ["credenco-wallet", "credenco-business-wallet", "sphereon-wallet"]) {
      const tag = `wallet actions ${id} @${width}`;
      await open(page, `${BASE}/fides-design-pilot/wallet/?wallet=${id}`);
      const m = await page.evaluate(() => {
        const hero = document.querySelector(".fides-wallet-detail__hero");
        const identity = hero.querySelector(".fides-org-detail__identity").getBoundingClientRect();
        const logo = hero.querySelector(".fides-org-detail__logo");
        const actions = hero.querySelector(".fides-wallet-detail__actions");
        const box = actions ? actions.getBoundingClientRect() : null;
        const items = actions ? [...actions.children].map((el) => {
          const rect = el.getBoundingClientRect();
          return { w: Math.round(rect.width), h: Math.round(rect.height), top: Math.round(rect.top), right: rect.right, store: el.classList.contains("fides-wallet-store"), radius: getComputedStyle(el).borderRadius, text: el.textContent.trim().slice(0, 20) };
        }) : [];
        return {
          heroWidth: Math.round(hero.getBoundingClientRect().width),
          heroRight: hero.getBoundingClientRect().right,
          actionsWidth: box ? Math.round(box.width) : 0,
          belowIdentity: box ? box.top >= identity.bottom : null,
          belowLogo: box && logo ? box.top >= logo.getBoundingClientRect().bottom - 1 : true,
          empty: !!actions && actions.children.length === 0,
          items,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      check(`${tag}: actions below identity and logo at full content width`, m.items.length > 0 && m.belowIdentity && m.belowLogo && m.actionsWidth === m.heroWidth, JSON.stringify(m));
      check(`${tag}: no empty action row, no overflow`, !m.empty && m.overflow <= 0 && m.items.every((item) => item.right <= m.heroRight + 0.5), JSON.stringify(m));
      check(`${tag}: action targets at least 44px`, m.items.every((item) => item.h >= 44), JSON.stringify(m.items));
      const stores = m.items.filter((item) => item.store);
      if (stores.length) check(`${tag}: store buttons keep their 8px radius`, stores.every((item) => item.radius === "8px"), JSON.stringify(stores));
      widths[`${id}@${width}`] = m.items.map((item) => item.w);
      if (width === 390 && stores.length === 2) check(`${tag}: two store buttons side by side when they fit`, stores[0].top === stores[1].top, JSON.stringify(stores));
      await (await page.$(".fides-wallet-detail__hero")).screenshot({ path: path.join(OUT, `wallet-hero-${id}-${width}.png`) });
    }
    await context.close();
  }
  for (const id of ["credenco-wallet", "credenco-business-wallet", "sphereon-wallet"]) {
    check(`wallet actions ${id}: wrapping at 320 keeps the button size`, JSON.stringify(widths[`${id}@390`]) === JSON.stringify(widths[`${id}@320`]), JSON.stringify(widths));
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    await glossaryChecks(browser);
    await filterDialogChecks(browser);
    await accordionChecks(browser);
    await sectionNavChecks(browser);
    await walletActionChecks(browser);
  } finally {
    await browser.close();
  }
  const failed = results.filter((result) => !result.ok);
  console.log(`# pass ${results.length - failed.length}`);
  console.log(`# fail ${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})();
