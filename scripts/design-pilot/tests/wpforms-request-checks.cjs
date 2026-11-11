/**
 * Focused browser checks for the WPForms request form prototype (desktop 1440 and mobile 390).
 * Run through run-wpforms-request-checks.sh, which switches the routing option, loads the mail capture
 * and calls this file once per PHASE:
 *   PHASE=off  routing switch set to 0 (fallback): existing links and pages unchanged, the WPForms page opens directly
 *   PHASE=on   routing switch on (the pilot default): routes, redirects, a11y, one training request from link to confirmation, EN and NL, mail outcomes
 * Mail goes to tests/output/wpforms-mail.jsonl only (never sent); the mode file switches
 * capture / fail / fail-fides / fail-visitor.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const PILOT = process.env.PILOT_PATH || "/fides-design-pilot";
const PHASE = process.env.PHASE || "on";
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const OUT = path.join(__dirname, "output");
const MAIL = path.join(OUT, "wpforms-mail.jsonl");
const MODE = path.join(OUT, "wpforms-mail-mode");
const PAGE = `${PILOT}/learn/sessions/request-wpforms/`;
const TRAINING = "eudi-business-wallets-in-practice";
const DATE_KEY = "thursday-14-january-2027";
const OTHER_DATE_KEY = "thursday-18-march-2027";
const ERR = "em.wpforms-error, label.wpforms-error";
const CONF = ".wpforms-confirmation-container, .wpforms-confirmation-container-full";
const TEAM = "request@example.invalid";
// ONLY=nl (comma list of routes,contacts,service,switch,a11y,ctx,click,en,nl,outcomes) runs a subset while debugging; default is everything.
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const want = (n) => !ONLY || ONLY.includes(n);

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${detail})` : ""}`);
}
const info = (text) => console.log(`info - ${text}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mails = () => (fs.existsSync(MAIL) ? fs.readFileSync(MAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const clearMail = () => fs.writeFileSync(MAIL, "");
const setMode = (m) => fs.writeFileSync(MODE, m);

async function go(page, url) {
  await page.goto(url.startsWith("http") ? url : `${BASE}${url}`, { waitUntil: "domcontentloaded" });
  const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
  if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
  await page.mouse.move(0, 0);
}
async function openForm(page, query = "", nl = false) {
  await go(page, `${nl ? "/nl" : ""}${PAGE}${query}`);
  await page.waitForSelector("form.wpforms-form", { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector("form.wpforms-form[data-fides-request-ready]"), null, { timeout: 8000 }).catch(() => {});
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
const fid = (page) => page.getAttribute("form.wpforms-form", "data-formid");
const sel = (id, n) => `#wpforms-${id}-field_${n}`;

/** A real mouse click (move, down, up with a pause) as a visitor does it; page.click() would hide a layout shift between down and up. */
async function mouseClick(page, selector) {
  const target = page.locator(selector);
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await sleep(150);
  const after = await target.boundingBox();
  await page.mouse.up();
  return after ? Math.round(after.y - box.y) : null; // how far the button moved while the button was held down
}

async function fillAndSend(page, id, data, wait = 3400) {
  if (data.name !== undefined) await page.fill(sel(id, 4), data.name);
  if (data.email !== undefined) await page.fill(sel(id, 5), data.email);
  if (data.org !== undefined) await page.fill(sel(id, 6), data.org);
  if (data.msg !== undefined) await page.fill(sel(id, 7), data.msg);
  await sleep(wait); // minimum fill time of the anti-spam measure
  const posted = page.waitForResponse((r) => /admin-ajax\.php/.test(r.url()) && r.request().method() === "POST", { timeout: 20000 }).catch(() => null);
  await mouseClick(page, "button.wpforms-submit");
  await posted;
  await sleep(600);
}
const confText = (page) => page.locator(CONF).innerText().catch(() => "");
const headerError = (page) => page.locator(".wpforms-error-container, .wpforms-error-alert").first().innerText().catch(() => "");
/** Visible error texts, for failure details. */
const whyNot = (page) => page.$$eval(`${ERR}, .wpforms-error-container, .wpforms-error-alert`, (ls) => ls.filter((l) => l.offsetParent).map((l) => l.textContent.trim())).then((t) => t.join("|"));
/** Mail body as plain text (WPForms sends HTML mail). */
const plain = (html) => String(html).replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&#0?39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const newPage = async (width) => {
    const ctx = await browser.newContext({ viewport: { width, height: width <= 400 ? 800 : 900 } });
    const page = await ctx.newPage();
    page.pageErrors = [];
    page.on("pageerror", (e) => page.pageErrors.push(e.message));
    return page;
  };

  // ================= PHASE off: the existing flow stays as it is =================
  if (PHASE === "off") {
    const page = await newPage(1440);
    await go(page, `${PILOT}/learn/sessions/${TRAINING}/`);
    const hrefs = await page.$$eval('a[href*="offering="]', (as) => as.map((a) => a.getAttribute("href")));
    check("off: date links on the training page still go to the existing request page", hrefs.length >= 4 && hrefs.every((h) => /learn\/sessions\/request\/\?offering=/.test(h) && !/request-wpforms/.test(h)), hrefs.slice(0, 2).join("|"));
    await go(page, `${PILOT}/services/wallet-readiness-assessment/`);
    const sh = await page.$$eval('a[href*="enquiry"]', (as) => as.map((a) => a.getAttribute("href")));
    check("off: services CTA still goes to /services/enquiry/", sh.length >= 1 && sh.every((h) => /services\/enquiry\//.test(h)), sh.join("|"));
    await go(page, `${PILOT}/learn/sessions/request/?offering=${TRAINING}&date=${DATE_KEY}`);
    check("off: existing training request form is intact (preselected, no WPForms)", (await page.locator("form[data-fides-learn-request]").count()) === 1 && (await page.locator("#fides-learn-offering").inputValue()) === TRAINING && (await page.locator("form.wpforms-form").count()) === 0);
    await go(page, PAGE);
    check("off: the WPForms page opens directly and is not indexable", (await page.locator("form.wpforms-form").count()) === 1 && /noindex/.test(await page.locator('meta[name="robots"]').getAttribute("content")));
    await browser.close();
    console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
    process.exit(failures ? 1 : 0);
  }

  // ================= PHASE on =================
  setMode("capture");

  // ---- Route and form at both widths: context visible and changeable, no consent box, privacy text
  for (const w of want("ctx") ? WIDTHS : []) {
    const L = (s) => `${w}px: ${s}`;
    const page = await newPage(w);
    await go(page, `${PILOT}/learn/sessions/${TRAINING}/`);
    const href = await page.locator(`.fides-learn-dates a[href*="${DATE_KEY}"]`).first().getAttribute("href");
    check(L("the date link of the training points to the WPForms page with offering and date"), /request-wpforms\/\?offering=eudi-business-wallets-in-practice&date=thursday-14-january-2027$/.test(href), href);
    await page.locator(`.fides-learn-dates a[href*="${DATE_KEY}"]`).first().click();
    await page.waitForSelector("form.wpforms-form");
    const id = await fid(page);
    check(L("offering and date are preselected"), (await page.locator(sel(id, 2)).inputValue()) === TRAINING && (await page.locator(sel(id, 3)).inputValue()) === `${TRAINING}:${DATE_KEY}`);
    const summary = await page.locator("[data-fides-request-summary]").innerText();
    check(L("the summary names offering and date"), /Your request/.test(summary) && /EUDI/.test(summary) && /14 January 2027/.test(summary), summary);
    await page.selectOption(sel(id, 3), `${TRAINING}:${OTHER_DATE_KEY}`);
    check(L("the date can be changed and the summary follows"), /18 March 2027/.test(await page.locator("[data-fides-request-summary]").innerText()));
    check(L("no checkbox and no required consent on the form"), (await page.locator("form.wpforms-form input[type=checkbox]").count()) === 0);
    const privacy = await page.locator(".fides-request-privacy").first().innerText();
    check(L("privacy text names the purpose, a retention placeholder and a privacy link"), /only to respond to this request/.test(privacy) && /\[retention period to be decided\]/.test(privacy) && (await page.locator(".fides-request-privacy a").count()) === 1, privacy);
    check(L("the notice says this is no booking or payment"), /not a booking or a payment/.test(await page.locator(".fides-request-notice").innerText()));
    await page.click("button.wpforms-submit");
    await sleep(500);
    const errs = await page.$$eval(ERR, (ls) => ls.filter((l) => l.offsetParent).map((l) => l.id));
    check(L("empty submit flags name, email and message only"), ["field_4-error", "field_5-error", "field_7-error"].every((e) => errs.some((x) => x.includes(e))) && errs.length === 3, errs.join("|"));
    await page.click("[data-fides-request-summary] button").catch(() => {});
    const afterRemove = await page.locator(sel(id, 2)).inputValue();
    check(L("the choice can be removed (no specific offering, date hidden)"), afterRemove === "none" && (await page.locator(`${sel(id, 3)}-container`).isHidden()), afterRemove);
    check(L("no horizontal overflow"), !(await overflow(page)));
    await openForm(page, `?offering=bogus&session=nope`);
    check(L("unknown link values are ignored"), (await page.locator(sel(await fid(page), 2)).inputValue()) === "none");
    check(L("no page errors"), page.pageErrors.length === 0, page.pageErrors.join("|"));
  }

  // ---- Routes: old URLs and links lead to the WPForms page, EN and NL, query string kept, legacy bypass works
  if (want("routes")) {
    const page = await newPage(1440);
    const hop = async (path) => {
      await go(page, path);
      return page.url().replace(BASE, "");
    };
    for (const nl of [false, true]) {
      const p = nl ? "/nl" : "";
      const tag = nl ? "NL" : "EN";
      const training = await hop(`${p}${PILOT}/learn/sessions/request/?offering=${TRAINING}&session=${DATE_KEY}`);
      check(`${tag}: old training request URL redirects to the WPForms page and keeps the query`, training === `${p}${PAGE}?offering=${TRAINING}&session=${DATE_KEY}`, training);
      const services = await hop(`${p}${PILOT}/services/enquiry/?offering=wallet-readiness-assessment`);
      check(`${tag}: old services enquiry URL redirects with its query`, services === `${p}${PAGE}?offering=wallet-readiness-assessment`, services);
      const plainUrl = await hop(`${p}${PILOT}/services/enquiry/`);
      check(`${tag}: old services enquiry URL without query redirects`, plainUrl === `${p}${PAGE}`, plainUrl);
      await go(page, `${p}${PILOT}/learn/sessions/`);
      const sessionsLinks = await page.$$eval('a[href*="offering="]', (as) => as.map((a) => a.getAttribute("href")));
      check(`${tag}: the sessions overview CTAs point to the WPForms page`, sessionsLinks.length >= 2 && sessionsLinks.every((h) => /request-wpforms\/\?offering=/.test(h)), sessionsLinks.join("|"));
      for (const [path, what] of [[`/learn/sessions/${TRAINING}/`, "training"], ["/learn/sessions/wallet-readiness-workshop/", "workshop"], ["/learn/sessions/training-partnerships/", "partnerships"], ["/services/wallet-readiness-assessment/", "assessment"]]) {
        await go(page, `${p}${PILOT}${path}`);
        const hs = await page.$$eval('main a[href*="request"], main a[href*="enquiry"]', (as) => as.map((a) => a.getAttribute("href")).filter((h) => !h.startsWith("#")));
        check(`${tag}: ${what} page has request links and all lead to the WPForms page`, hs.length >= 1 && hs.every((h) => /request-wpforms\//.test(h)), hs.join("|"));
      }
      for (const [offering, mustSay] of [["wallet-readiness-assessment", nl ? /Terug naar/ : /Back to Wallet readiness assessment/], ["", nl ? /Terug naar Training/ : /Back to Training/]]) {
        await openForm(page, offering ? `?offering=${offering}` : "", nl);
        const back = await page.locator(".fides-learn__back").first().innerText();
        check(`${tag}: back link on the form page${offering ? " follows the offering" : " goes to the section"}`, mustSay.test(back), back);
      }
    }
    await go(page, `${PILOT}/learn/sessions/request/?offering=${TRAINING}&fides_legacy_form=1`);
    check("legacy bypass: ?fides_legacy_form=1 shows the old form, no WPForms", (await page.locator("form[data-fides-learn-request]").count()) === 1 && (await page.locator("form.wpforms-form").count()) === 0 && page.url().includes("/request/"));
    await go(page, `${PILOT}/learn/sessions/${TRAINING}/?fides_legacy_form=1`);
    const oldLinks = await page.$$eval('a[href*="offering="]', (as) => as.map((a) => a.getAttribute("href")));
    check("legacy bypass: links on an offering page keep pointing to the old request page", oldLinks.length >= 1 && oldLinks.every((h) => /sessions\/request\/\?offering=/.test(h)), oldLinks.join("|"));
    check("routes: no page errors", page.pageErrors.length === 0, page.pageErrors.join("|"));
  }

  // ---- Contact routes: every CTA that asks for a service, training or workshop, its real destination (EN and NL), context kept
  if (want("contacts")) {
    const page = await newPage(1440);
    const SERVICE_H1 = /Tell us about your question or project|Vertel ons over uw vraag of project/;
    const TRAINING_H1 = /Tell us what you need|Vertel ons wat u nodig hebt/;
    const SVC = "use-case-and-business-case";
    // [page, link selector, expected query, offering select value, date select value or null, context, back-link path]
    const cta = [
      ["/services/", 'a[href*="context=service"]', "context=service", "general-service-question", null, "service", "/services/"],
      ["/services/", `a[href*="offering=${SVC}"]`, `offering=${SVC}`, SVC, null, "service", "/services/"],
      ["/services/", 'a[href*="offering=independent-advice-and-selection"]', "offering=independent-advice-and-selection", "independent-advice-and-selection", null, "service", "/services/"],
      ["/services/", 'a[href*="offering=project-and-ecosystem-coordination"]', "offering=project-and-ecosystem-coordination", "project-and-ecosystem-coordination", null, "service", "/services/"],
      ["/services/wallet-readiness-assessment/", 'a[href*="offering=wallet-readiness-assessment"]', "offering=wallet-readiness-assessment", "wallet-readiness-assessment", null, "service", "/services/wallet-readiness-assessment/"],
      ["/learn/sessions/", 'a[href*="offering=training-partnerships"]', "offering=training-partnerships", "training-partnerships", null, "training", "/learn/sessions/training-partnerships/"],
      ["/learn/sessions/", 'a[href*="offering=interest"]', "offering=interest", "interest", null, "training", "/learn/sessions/"],
      [`/learn/sessions/${TRAINING}/`, `a[href*="date=${DATE_KEY}"]`, `date=${DATE_KEY}`, TRAINING, `${TRAINING}:${DATE_KEY}`, "training", `/learn/sessions/${TRAINING}/`],
      [`/learn/sessions/${TRAINING}/`, `main a[href*="offering=${TRAINING}"]:not([href*="date="])`, `offering=${TRAINING}`, TRAINING, null, "training", `/learn/sessions/${TRAINING}/`],
      ["/learn/sessions/wallet-readiness-workshop/", 'main a[href*="offering=wallet-readiness-workshop"]', "offering=wallet-readiness-workshop", "wallet-readiness-workshop", null, "training", "/learn/sessions/wallet-readiness-workshop/"],
      ["/learn/sessions/wallet-introduction/", 'main a[href*="offering=wallet-introduction"]', "offering=wallet-introduction", "wallet-introduction", null, "training", "/learn/sessions/wallet-introduction/"],
      ["/learn/sessions/training-partnerships/", 'main a[href*="offering=training-partnerships"]', "offering=training-partnerships", "training-partnerships", null, "training", "/learn/sessions/training-partnerships/"],
      ["/about-fides/", 'a[href*="context=service"]', "context=service", "general-service-question", null, "service", "/services/"],
    ];
    for (const nl of [false, true]) {
      const p = nl ? "/nl" : "";
      const tag = nl ? "NL" : "EN";
      for (const [from, selector, query, offering, date, context, backPath] of cta) {
        await go(page, `${p}${PILOT}${from}`);
        const link = page.locator(selector).first();
        const text = ((await link.innerText().catch(() => "")) || "").replace(/\s+/g, " ").trim();
        const href = await link.getAttribute("href").catch(() => null);
        if (!href) { check(`${tag} ${from}: CTA ${selector} exists`, false); continue; }
        const abs = new URL(href, BASE);
        const direct = await page.request.get(abs.toString(), { maxRedirects: 0 });
        info(`${tag} ${from} | "${text}" -> ${abs.pathname}${abs.search} (HTTP ${direct.status()})`);
        check(`${tag} ${from}: "${text}" goes straight to the WPForms page with ${query} (no redirect hop)`, direct.status() === 200 && abs.pathname === `${p}${PAGE}` && abs.search.includes(query) && (nl ? abs.pathname.startsWith("/nl/") : !abs.pathname.startsWith("/nl/")), `${direct.status()} ${abs.pathname}${abs.search}`);
        await link.click();
        await page.waitForSelector("form.wpforms-form", { timeout: 15000 });
        const id = await fid(page);
        check(`${tag} ${from}: the offering is preselected as ${offering}${date ? " with the date" : ""}`, (await page.locator(sel(id, 2)).inputValue()) === offering && (!date || (await page.locator(sel(id, 3)).inputValue()) === date), await page.locator(sel(id, 2)).inputValue());
        const h1 = await page.locator("h1").first().innerText();
        check(`${tag} ${from}: heading fits the ${context} context`, (context === "service" ? SERVICE_H1 : TRAINING_H1).test(h1), h1);
        const back = page.locator(".fides-learn__back").first();
        const backHref = new URL(await back.getAttribute("href"), BASE).pathname;
        check(`${tag} ${from}: back link returns to ${backPath} in the same language`, backHref === `${p}${PILOT}${backPath}`, `${backHref} | ${await back.innerText()}`);
        if (nl) check(`NL ${from}: the page stays Dutch`, /Naam/.test(await page.locator("form.wpforms-form").innerText()));
      }
    }

    // Unknown or hostile context: the form works without preselection and never echoes the raw input.
    for (const nl of [false, true]) {
      const p = nl ? "/nl" : "";
      for (const q of [`?offering=%3Cscript%3Ealert(1)%3C/script%3E`, `?offering=nope&session=bogus&context=evil`, `?context=%22%3E%3Cimg%20src%3Dx%3E`, `?offering=${SVC}&session=%3Cb%3Ebold`, `?offering=${TRAINING}&session=nope`]) {
        const res = await page.request.get(`${BASE}${p}${PAGE}${q}`);
        const body = await res.text();
        // The URL itself may appear escaped in link attributes (language switcher, sign-in return); markup from it must never be live.
        check(`${nl ? "NL" : "EN"} invalid ${q}: HTTP 200 and no live markup from the input`, res.status() === 200 && !/<script>alert\(1\)|<img src=x|<b>bold/.test(body), `${res.status()}`);
        await go(page, `${p}${PAGE}${q}`);
        await page.waitForSelector("form.wpforms-form");
        const id = await fid(page);
        const visible = await page.locator("main").innerText();
        check(`${nl ? "NL" : "EN"} invalid ${q}: the visible page does not repeat the input`, !/alert\(1\)|nope|bogus|evil|bold/.test(visible), visible.match(/alert\(1\)|nope|bogus|evil|bold/) + "");
        const want_value = q.includes(SVC) ? SVC : q.includes(TRAINING) ? TRAINING : "none";
        check(`${nl ? "NL" : "EN"} invalid ${q}: form works, selection is ${want_value}, no script errors`, (await page.locator(sel(id, 2)).inputValue()) === want_value && page.pageErrors.length === 0, page.pageErrors.join("|"));
      }
    }

    // General Contact links (header, footer, other): reported, not changed. Organisation profile contact actions are not part of these pages.
    const generic = new Map();
    for (const nl of [false, true]) {
      for (const from of ["/", "/about-fides/", "/services/", "/learn/", "/learn/sessions/", "/manifesto/", "/start/", "/updates/"]) {
        await go(page, `${nl ? "/nl" : ""}${PILOT}${from}`);
        const links = await page.$$eval("header a, footer a, nav a", (as) => as.filter((a) => /contact/i.test(a.getAttribute("href") || "") || /^contact$/i.test(a.textContent.trim())).map((a) => a.href));
        for (const h of links) generic.set(`${nl ? "NL" : "EN"} ${h}`, (generic.get(`${nl ? "NL" : "EN"} ${h}`) || []).concat(from));
      }
    }
    for (const [k, pages] of generic) info(`general Contact link ${k} on ${pages.length} pages (${[...new Set(pages)].slice(0, 3).join(", ")}...)`);
    await go(page, `${PILOT}/`);
    const home = await page.$$eval("main a", (as) => as.map((a) => a.textContent.trim().replace(/\s+/g, " ") + " -> " + a.getAttribute("href")).filter((t) => /contact|enquir|request|discuss|talk|project|workshop|training|service/i.test(t)));
    info(`homepage CTAs about contact, training or services: ${home.length ? home.join(" ; ") : "none"}`);
    check("contact routes: no page errors", page.pageErrors.length === 0, page.pageErrors.join("|"));
  }

  // ---- Service enquiry: wording per context, mail subjects, confirmation (EN, NL; desktop and mobile)
  for (const w of want("service") ? WIDTHS : []) {
    const L = (s) => `${w}px: ${s}`;
    const runs = [
      { nl: false, q: "?offering=use-case-and-business-case", subject: /^New FIDES service enquiry: Use case and business case/, visitor: /^Your enquiry to FIDES: Use case and business case/, body: /We received your enquiry: Use case and business case/, conf: /received your enquiry and sent a confirmation/ },
      { nl: true, q: "?offering=use-case-and-business-case", subject: /^New FIDES service enquiry: /, visitor: /^Uw vraag aan FIDES: /, body: /Wij hebben uw vraag ontvangen: /, conf: /uw vraag ontvangen en een bevestiging/ },
    ];
    if (w === WIDTHS[0]) {
      runs.push(
        { nl: false, q: "?context=service", subject: /^New FIDES service enquiry: General service question/, visitor: /^Your enquiry to FIDES: General service question/, body: /We received your enquiry: General service question/, conf: /received your enquiry/ },
        { nl: false, q: "?offering=wallet-readiness-assessment", subject: /^New FIDES service enquiry: Wallet readiness assessment/, visitor: /^Your enquiry to FIDES: Wallet readiness assessment/, body: /We received your enquiry: Wallet readiness assessment/, conf: /received your enquiry/ },
        { nl: false, q: "", subject: /^New FIDES request: General question/, visitor: /^Your request to FIDES: General question/, body: /We received your request: General question/, conf: /received your request and sent a confirmation/ },
        { nl: true, q: "?context=service", subject: /^New FIDES service enquiry: Algemene vraag over diensten/, visitor: /^Uw vraag aan FIDES: Algemene vraag over diensten/, body: /Wij hebben uw vraag ontvangen: Algemene vraag over diensten/, conf: /uw vraag ontvangen/ },
      );
    }
    for (const r of runs) {
      const tag = `${L(r.nl ? "NL" : "EN")} ${r.q || "(no context)"}`;
      const page = await newPage(w);
      clearMail();
      setMode("capture");
      await openForm(page, r.q, r.nl);
      const id = await fid(page);
      if (r.q.includes("offering=")) check(`${tag}: no date field for a service, offering visible`, await page.locator(`${sel(id, 3)}-container`).isHidden() && (await page.locator(sel(id, 2)).inputValue()) !== "none");
      await page.click("button.wpforms-submit");
      await sleep(500);
      const errs = await page.$$eval(ERR, (ls) => ls.filter((l) => l.offsetParent).map((l) => l.textContent.trim()));
      check(`${tag}: empty submit flags name, email and message${r.nl ? " in Dutch" : ""}`, errs.length === 3 && (!r.nl || errs.every((t) => /Dit veld is verplicht/.test(t))), errs.join("|"));
      const email = `svc-${w}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`;
      await fillAndSend(page, id, { name: "Service Tester", email, msg: "Service request-capture-marker" });
      const conf = await confText(page);
      check(`${tag}: confirmation fits the context`, r.conf.test(conf) && (r.nl ? /geen boeking en geen betaling/.test(conf) : /not a booking or a payment/.test(conf)), conf || (await whyNot(page)));
      const sent = mails();
      const team = sent.find((m) => m.to === TEAM);
      const visitor = sent.find((m) => m.to === email);
      check(`${tag}: FIDES notification subject names the context`, team && r.subject.test(team.subject), team && team.subject);
      check(`${tag}: visitor mail subject and text fit the context`, visitor && r.visitor.test(visitor.subject) && r.body.test(plain(visitor.message)), visitor && `${visitor.subject} | ${plain(visitor.message).slice(0, 90)}`);
      check(`${tag}: no horizontal overflow and no script errors`, !(await overflow(page)) && page.pageErrors.length === 0, page.pageErrors.join("|"));
      await page.context().close();
    }
  }

  // ---- Context follows the live choice: wording, date field and back link while switching, and the submission agrees with it
  for (const w of want("switch") ? WIDTHS : []) {
    for (const nl of w === WIDTHS[0] ? [false, true] : [false]) {
      const tag = `${w}px ${nl ? "NL" : "EN"}`;
      const T = nl
        ? { service: /Vertel ons over uw vraag of project/, training: /Vertel ons wat u nodig hebt/, svcEyebrow: /Diensten/, trEyebrow: /Leren/, svcLabel: /Uw vraag of project/, trLabel: /Uw vraag of bericht/, svcLead: /Dit is een vraag/, trLead: /Dit is een aanvraag/, backSvc: /Terug naar Diensten/, backTr: /Terug naar Training/, confSvc: /uw vraag ontvangen/, confTr: /uw aanvraag ontvangen/, subjSvc: /^Nieuwe FIDES-dienstvraag|^New FIDES service enquiry/, visSvc: /^Uw vraag aan FIDES/, visTr: /^Uw aanvraag bij FIDES/ }
        : { service: /Tell us about your question or project/, training: /Tell us what you need/, svcEyebrow: /Services \/ Enquiry/, trEyebrow: /Learn \/ Request/, svcLabel: /Your question or project/, trLabel: /Your question or message/, svcLead: /This is an enquiry/, trLead: /This is a request/, backSvc: /Back to Services/, backTr: /Back to Training/, confSvc: /received your enquiry/, confTr: /received your request/, subjSvc: /^New FIDES service enquiry/, visSvc: /^Your enquiry to FIDES/, visTr: /^Your request to FIDES/ };
      // TranslatePress finishes its own pass over changed links and text a moment later in Dutch; wait for that before reading.
      const state = async (page, id) => { if (nl) await sleep(300); return stateNow(page, id); };
      const stateNow = (page, id) => page.evaluate((fid_) => {
        const t = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, " ").trim() : ""; };
        const back = document.querySelector(".fides-learn__back");
        const date = document.getElementById(`wpforms-${fid_}-field_3`);
        return {
          eyebrow: t('[data-fides-ctx="eyebrow"]'), h1: t('[data-fides-ctx="headline"]'), intro: t('[data-fides-ctx="intro"]'), lead: t('[data-fides-ctx="notice_lead"]'),
          label: t(`#wpforms-${fid_}-field_7-container .wpforms-field-label`), desc: t(`#wpforms-${fid_}-field_2-container .wpforms-field-description`),
          backText: back ? back.textContent.replace(/\s+/g, " ").trim() : "", backHref: back ? back.getAttribute("href") : "",
          dateHidden: document.getElementById(`wpforms-${fid_}-field_3-container`).hidden, dateValue: date.value, active: document.activeElement && document.activeElement.id, ctx: document.getElementById(`wpforms-form-${fid_}`).getAttribute("data-fides-context"),
          summary: t("[data-fides-request-summary]"),
        };
      }, id);
      const page = await newPage(w);
      await openForm(page, "?offering=wallet-introduction", nl);
      const id = await fid(page);
      let st = await state(page, id);
      check(`${tag}: start as training: training wording, label and back link`, T.training.test(st.h1) && T.trEyebrow.test(st.eyebrow) && T.trLabel.test(st.label) && T.trLead.test(st.lead) && T.backTr.test(st.backText) === false && /Wallet Introduction|Training/.test(st.backText), JSON.stringify(st));
      await page.focus(sel(id, 2));
      await page.selectOption(sel(id, 2), "use-case-and-business-case");
      st = await state(page, id);
      check(`${tag}: switching to a service updates heading, eyebrow, intro, notice, labels and back link`, T.service.test(st.h1) && T.svcEyebrow.test(st.eyebrow) && T.svcLabel.test(st.label) && T.svcLead.test(st.lead) && T.backSvc.test(st.backText) && /\/services\/$/.test(st.backHref) && st.ctx === "service" && st.intro.length > 20, JSON.stringify(st));
      check(`${tag}: focus stays on the offering field and the summary names the choice`, st.active === `wpforms-${id}-field_2` && /Use case|Usecase/.test(st.summary), `${st.active} | ${st.summary}`);
      check(`${tag}: a service has no date field`, st.dateHidden && st.dateValue === "");
      await page.selectOption(sel(id, 2), TRAINING);
      st = await state(page, id);
      check(`${tag}: switching to a dated training brings back the training wording and the date field`, T.training.test(st.h1) && T.trLabel.test(st.label) && !st.dateHidden && st.ctx === "training" && /\/learn\/sessions\//.test(st.backHref), JSON.stringify(st));
      await page.selectOption(sel(id, 3), `${TRAINING}:${DATE_KEY}`);
      await page.selectOption(sel(id, 2), "independent-advice-and-selection");
      st = await state(page, id);
      check(`${tag}: a date of the previous training is cleared when a service is chosen`, st.dateHidden && st.dateValue === "" && T.service.test(st.h1), JSON.stringify(st));
      await page.selectOption(sel(id, 2), "wallet-readiness-workshop");
      check(`${tag}: the workshop date list only holds its own dates`, await page.$$eval(`${sel(id, 3)} option:not([disabled])`, (os) => os.every((o) => o.value === "" || o.value === "not-sure" || o.value.startsWith("wallet-readiness-workshop:"))));
      await page.selectOption(sel(id, 2), "general-service-question");
      st = await state(page, id);
      check(`${tag}: the general service question is a service context`, T.service.test(st.h1) && st.ctx === "service");
      await page.selectOption(sel(id, 2), "none");
      st = await state(page, id);
      check(`${tag}: no specific offering is a general question with the general wording`, T.training.test(st.h1) && T.trLabel.test(st.label) && st.ctx === "general" && st.dateHidden, JSON.stringify(st));
      // Keyboard: arrow keys on the focused select change the context without moving focus.
      await page.focus(sel(id, 2));
      await page.keyboard.type(nl ? "Algemene vraag" : "General service"); // type-ahead on the focused select, as a keyboard user would
      await sleep(300);
      st = await state(page, id);
      check(`${tag}: arrow keys on the offering select reach a service, the wording follows and focus stays`, st.ctx === "service" && T.service.test(st.h1) && st.active === `wpforms-${id}-field_2`, JSON.stringify(st));
      // Remove the choice with the button in the summary.
      await page.click("[data-fides-request-summary] button");
      st = await state(page, id);
      check(`${tag}: "remove this choice" returns to the general wording`, st.ctx === "general" && T.training.test(st.h1) && (await page.locator(sel(id, 2)).inputValue()) === "none" && st.active === `wpforms-${id}-field_2`, JSON.stringify(st));
      check(`${tag}: no script errors and no overflow while switching`, page.pageErrors.length === 0 && !(await overflow(page)), page.pageErrors.join("|"));
      await page.context().close();

      // Submission agrees with the live choice, not with the entry link.
      const sends = [
        { name: "service entry, switched to a dated training", q: "?offering=use-case-and-business-case", pick: [TRAINING, `${TRAINING}:${DATE_KEY}`], conf: T.confTr, subj: /^New FIDES request: EUDI/, vis: T.visTr },
        { name: "training entry, switched to a service", q: `?offering=${TRAINING}&session=${DATE_KEY}`, pick: ["independent-advice-and-selection"], conf: T.confSvc, subj: /^New FIDES service enquiry: /, vis: T.visSvc },
        { name: "service entry, choice removed", q: "?offering=use-case-and-business-case", pick: ["none"], conf: T.confTr, subj: /^New FIDES request: General question/, vis: T.visTr },
        { name: "training entry, switched to the general service question", q: "?offering=wallet-introduction", pick: ["general-service-question"], conf: T.confSvc, subj: /^New FIDES service enquiry: General service question/, vis: T.visSvc },
      ];
      for (const r of nl ? sends.slice(0, 2) : sends) {
        const p2 = await newPage(w);
        clearMail();
        setMode("capture");
        await openForm(p2, r.q, nl);
        const id2 = await fid(p2);
        await p2.selectOption(sel(id2, 2), r.pick[0]);
        if (r.pick[1]) await p2.selectOption(sel(id2, 3), r.pick[1]);
        const email = `sw-${w}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`;
        await fillAndSend(p2, id2, { name: "Switch Tester", email, msg: "Switch request-capture-marker" });
        const conf = await confText(p2);
        const sent = mails();
        const team = sent.find((m) => m.to === TEAM);
        const vis = sent.find((m) => m.to === email);
        check(`${tag} ${r.name}: confirmation, FIDES subject and visitor mail all follow the submitted choice`, r.conf.test(conf) && team && r.subj.test(team.subject) && vis && r.vis.test(vis.subject), `${conf || (await whyNot(p2))} | ${team && team.subject} | ${vis && vis.subject}`);
        await p2.context().close();
      }
    }
  }

  // ---- Keyboard and aria after a validation error (desktop and mobile)
  for (const w of want("a11y") ? WIDTHS : []) {
    const L = (s) => `${w}px: ${s}`;
    const page = await newPage(w);
    await openForm(page, `?offering=${TRAINING}&session=${DATE_KEY}`);
    const id = await fid(page);
    await page.focus(sel(id, 4));
    await page.keyboard.press("Enter"); // Enter in a text field submits the form
    await sleep(700);
    const state = await page.evaluate((fid_) => {
      const a = document.activeElement;
      const invalid = [...document.querySelectorAll("form.wpforms-form [aria-invalid=true]")].map((e) => e.id);
      const first = document.querySelector("form.wpforms-form [aria-invalid=true]");
      const describedBy = first ? first.getAttribute("aria-errormessage") || first.getAttribute("aria-describedby") || "" : "";
      const errEl = describedBy.split(" ").map((i) => document.getElementById(i)).find((e) => e && /error/.test(e.className));
      return { activeId: a && a.id, firstInvalid: first && first.id, invalid, errText: errEl ? errEl.textContent.trim() : "", errVisible: errEl ? !!errEl.offsetParent : false, role: errEl ? errEl.getAttribute("role") : null };
    }, id);
    check(L("Enter in a text field submits and flags the empty fields with aria-invalid"), state.invalid.length === 3, state.invalid.join("|"));
    check(L("focus is on the first invalid field after submitting"), state.activeId === state.firstInvalid && state.firstInvalid === `wpforms-${id}-field_4`, `${state.activeId} / ${state.firstInvalid}`);
    check(L("the first invalid field is tied to a visible error message"), state.errVisible && state.errText.length > 0, JSON.stringify(state));
    await page.keyboard.type("Key Board");
    await page.keyboard.press("Tab");
    check(L("Tab from the name field moves on to the email field"), (await page.evaluate(() => document.activeElement.id)) === `wpforms-${id}-field_5`);
    await page.keyboard.type(`key-${w}-${Date.now()}@example.com`);
    await page.keyboard.press("Tab");
    check(L("Tab order continues to the optional organisation, then the message"), (await page.evaluate(() => document.activeElement.id)) === `wpforms-${id}-field_6`);
    await page.keyboard.press("Tab");
    check(L("then the message field"), (await page.evaluate(() => document.activeElement.id)) === `wpforms-${id}-field_7`);
    await page.keyboard.type("Keyboard request-capture-marker");
    await page.keyboard.press("Tab");
    check(L("Tab leaves the message field for the privacy link"), (await page.evaluate(() => document.activeElement.tagName + ":" + (document.activeElement.getAttribute("href") || ""))).startsWith("A:"));
    await page.keyboard.press("Tab");
    const onSubmit = await page.evaluate(() => document.activeElement.className);
    check(L("the next Tab reaches the Send button"), /wpforms-submit/.test(onSubmit), onSubmit);
    clearMail();
    setMode("capture");
    await sleep(3400); // the WPForms anti-spam check wants a few seconds on the page
    await page.keyboard.press("Enter");
    await sleep(1500);
    check(L("Enter on the Send button after the error sends the request"), /received your request/.test(await confText(page)), await whyNot(page));
    check(L("keyboard run has no page errors"), page.pageErrors.length === 0, page.pageErrors.join("|"));
  }

  // ---- Submit by mouse after a validation error: the form must not shift between mouse down and up
  for (const w of want("click") ? WIDTHS : []) {
    const page = await newPage(w);
    clearMail();
    setMode("capture");
    await openForm(page, `?offering=${TRAINING}&session=${DATE_KEY}`);
    const id = await fid(page);
    await mouseClick(page, "button.wpforms-submit"); // empty: errors for name, email and message
    await sleep(500);
    const before = (await page.$$eval(ERR, (ls) => ls.filter((l) => l.offsetParent).length));
    await page.fill(sel(id, 4), "Click Test");
    await page.fill(sel(id, 5), `click-${w}-${Date.now()}@example.com`);
    await page.fill(sel(id, 7), "Mouse request-capture-marker"); // the message field keeps focus, its error is still shown
    await sleep(3400);
    const posted = page.waitForResponse((r) => /admin-ajax\.php/.test(r.url()) && r.request().method() === "POST", { timeout: 8000 }).then(() => true, () => false);
    const moved = await mouseClick(page, "button.wpforms-submit");
    info(`${w}px: the Send button moved ${moved}px between mouse down and up`);
    check(`${w}px: a real mouse click on Send right after a validation error submits the form (${before} errors were shown)`, await posted);
    await sleep(800);
    check(`${w}px: the click led to a confirmation`, /received your request/.test(await confText(page)), await whyNot(page));
  }

  // ---- One training request, English, desktop and mobile. Name with an apostrophe, hyphen and diacritic.
  for (const w of want("en") ? WIDTHS : []) {
    const page = await newPage(w);
    clearMail();
    setMode("capture");
    await openForm(page, `?offering=${TRAINING}&session=${DATE_KEY}`);
    const id = await fid(page);
    const email = `en-${w}-${Date.now()}@example.test`;
    await fillAndSend(page, id, { name: "Zoë O'Neil-Smith", email, org: "Example Org", msg: "Hello request-capture-marker" });
    const conf = await confText(page);
    check(`${w}px EN: confirmation says received and sent, and that this is no booking`, /received your request and sent a confirmation/.test(conf) && /not a booking or a payment/.test(conf), conf || (await whyNot(page)));
    const sent = mails();
    const team = sent.find((m) => m.to === TEAM);
    const visitor = sent.find((m) => m.to === email);
    check(`${w}px EN: FIDES notification and visitor mail were captured, none sent`, !!team && !!visitor && sent.length === 2, sent.map((m) => m.to).join("|"));
    check(`${w}px EN: both subjects carry offering and date`, team && visitor && [team.subject, visitor.subject].every((s) => /EUDI/.test(s) && /Thursday 14 January 2027/.test(s)), `${team && team.subject} | ${visitor && visitor.subject}`);
    check(`${w}px EN: visitor mail greets the name as typed and repeats no message text`, visitor && /Dear Zoë O'Neil-Smith,/.test(plain(visitor.message)) && !/request-capture-marker/.test(visitor.message), visitor && plain(visitor.message).slice(0, 60));
    check(`${w}px EN: the FIDES mail has the visitor's message`, team && /request-capture-marker/.test(team.message));
    check(`${w}px EN: the form is replaced by the confirmation`, (await page.locator("form.wpforms-form").count()) === 0);
  }

  // ---- Dutch route: labels, validation, confirmation, mail (desktop and mobile)
  for (const w of want("nl") ? WIDTHS : []) {
    const page = await newPage(w);
    clearMail();
    await openForm(page, `?offering=${TRAINING}&session=${DATE_KEY}`, true);
    const id = await fid(page);
    const text = await page.locator("form.wpforms-form").innerText();
    check(`${w}px NL: labels, notice and privacy text are Dutch`, /Naam/.test(text) && /E-mail/.test(text) && /\[bewaartermijn nog te bepalen\]/.test(await page.locator(".fides-request-privacy").first().innerText()) && !/Disable|Your request:/.test(text), text.slice(0, 120));
    check(`${w}px NL: the summary is Dutch`, /Uw aanvraag/.test(await page.locator("[data-fides-request-summary]").innerText()));
    await page.click("button.wpforms-submit");
    await sleep(500);
    const nlErrs = await page.$$eval(ERR, (ls) => ls.filter((l) => l.offsetParent).map((l) => l.textContent.trim()));
    check(`${w}px NL: validation messages are Dutch`, nlErrs.length === 3 && nlErrs.every((t) => /Dit veld is verplicht/.test(t)), nlErrs.join("|"));
    // example.com: WPForms suggests example.net for example.test once the field was validated before.
    const email = `nl-${w}-${Date.now()}@example.com`;
    await fillAndSend(page, id, { name: "李雷", email, msg: "Hallo request-capture-marker" });
    const conf = await confText(page);
    check(`${w}px NL: confirmation is Dutch`, /Bedankt/.test(conf) && /geen boeking en geen betaling/.test(conf), conf || (await whyNot(page)));
    const visitor = mails().find((m) => m.to === email);
    check(`${w}px NL: visitor mail is Dutch with offering and date, name in non-Latin script is kept`, visitor && /Beste 李雷,/.test(plain(visitor.message)) && /^Uw aanvraag bij FIDES/.test(visitor.subject) && /donderdag 14 januari 2027/i.test(visitor.subject), visitor && visitor.subject);
  }

  // ---- Outcomes (desktop): FIDES mail fails, visitor mail fails, both fail, name that looks like a link, throttle
  if (want("outcomes")) {
    const w = 1440;
    const page = await newPage(w);
    const run = async (mode, name, email) => {
      clearMail();
      setMode(mode);
      await openForm(page, `?offering=${TRAINING}&session=${DATE_KEY}`);
      const id = await fid(page);
      await fillAndSend(page, id, { name, email, msg: "Outcome request-capture-marker" });
      return id;
    };

    let id = await run("fail-fides", "Ada Lovelace", `fail-fides-${Date.now()}@example.test`);
    let header = await headerError(page);
    check("FIDES mail fails: visitor sees an honest error with an alternative contact, no confirmation", /could not be sent right now/.test(header) && header.includes(TEAM) && (await page.locator(CONF).count()) === 0, header);
    check("FIDES mail fails: the entered data stays in the form", (await page.locator(sel(id, 4)).inputValue()) === "Ada Lovelace" && /Outcome/.test(await page.locator(sel(id, 7)).inputValue()));
    check("FIDES mail fails: the error promises no follow-up", !/we will reply|we received/i.test(header), header);

    await run("fail-visitor", "Ada Lovelace", `fail-visitor-${Date.now()}@example.test`);
    let conf = await confText(page);
    check("visitor mail fails: confirmation says received but that no confirmation mail could be sent", /received your request/.test(conf) && /could not send a confirmation/.test(conf) && !/sent a confirmation to your email/.test(conf), conf || (await whyNot(page)));
    check("visitor mail fails: the FIDES notification was still sent", mails().some((m) => m.to === TEAM && m.ok));

    await run("fail", "Ada Lovelace", `fail-both-${Date.now()}@example.test`);
    header = await headerError(page);
    check("both mails fail: error, no confirmation", /could not be sent right now/.test(header) && (await page.locator(CONF).count()) === 0, header);

    const linkEmail = `link-${Date.now()}@example.test`;
    await run("capture", "visit www.spam.example now", linkEmail);
    conf = await confText(page);
    const visitor = mails().find((m) => m.to === linkEmail);
    check("a name that looks like a link is not blocked, the visitor mail does not repeat it", /received your request/.test(conf) && visitor && /Hello,/.test(plain(visitor.message)) && !/spam\.example/.test(visitor.message), conf || (await whyNot(page)));

    // Throttle: three confirmation mails per address and hour, the fourth is refused without extra mail
    const tEmail = `throttle-${Date.now()}@example.test`;
    let last = "";
    for (let i = 1; i <= 4; i++) {
      await run("capture", "Throttle Test", tEmail);
      last = (await confText(page)) || (await headerError(page));
    }
    check("throttle: the fourth request in an hour for one address is refused and sends no mail", /several requests/.test(last) && mails().length === 0, `${last} / ${mails().length}`);
  }

  setMode("capture");
  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
