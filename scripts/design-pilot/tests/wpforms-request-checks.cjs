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
// ONLY=nl (comma list of routes,a11y,ctx,click,en,nl,outcomes) runs a subset while debugging; default is everything.
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
