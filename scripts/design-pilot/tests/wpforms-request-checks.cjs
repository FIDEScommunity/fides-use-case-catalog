/**
 * Browser checks for the WPForms request form prototype. Run through run-wpforms-request-checks.sh, which
 * switches the routing option, loads the mail capture and calls this file once per PHASE:
 *   PHASE=off  routing switch off (default): existing links and pages unchanged, the WPForms page still opens directly
 *   PHASE=on   routing switch on: full form checks (context, controls, validation, NL, send, failure, mail, throttle)
 * Mail goes to tests/output/wpforms-mail.jsonl only (never sent); the mode file switches capture/fail.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.PILOT_URL || "http://localhost:10088";
const PILOT = process.env.PILOT_PATH || "/fides-design-pilot";
const PHASE = process.env.PHASE || "on";
const WIDTHS = (process.env.WIDTHS || "1440,390,320").split(",").map(Number);
const OUT = path.join(__dirname, "output");
const MAIL = path.join(OUT, "wpforms-mail.jsonl");
const MODE = path.join(OUT, "wpforms-mail-mode");
const PAGE = `${PILOT}/learn/sessions/request-wpforms/`;
const TRAINING = "eudi-business-wallets-in-practice";
const DATE_KEY = "thursday-14-january-2027";
// WPForms modern markup prints field errors as <em>, older markup as <label>.
const ERR = "em.wpforms-error, label.wpforms-error";
const CONF = ".wpforms-confirmation-container, .wpforms-confirmation-container-full";
const FIDES_PLACEHOLDER = "request@example.invalid";

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${detail})` : ""}`);
}
function info(text) {
  console.log(`info - ${text}`);
}
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

function lum(rgb) {
  const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const parse = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

/** Ticks the consent box; the layout can shift while the error messages disappear, so retry until it is checked. */
async function consent(page, id) {
  const box = page.locator(`${sel(id, 8)}_1`);
  for (let i = 0; i < 4 && !(await box.isChecked()); i++) {
    await box.focus();
    await page.keyboard.press("Space");
    await sleep(120);
  }
}

async function fillAndSend(page, id, data, { wait = 3400, expect = "any" } = {}) {
  if (data.name !== undefined) await page.fill(sel(id, 4), data.name);
  if (data.email !== undefined) await page.fill(sel(id, 5), data.email);
  if (data.org !== undefined) await page.fill(sel(id, 6), data.org);
  if (data.msg !== undefined) await page.fill(sel(id, 7), data.msg);
  if (data.consent !== false) await consent(page, id);
  await sleep(wait); // the form has a minimum fill time as an anti-spam measure
  const posted = page.waitForResponse((r) => /admin-ajax\.php/.test(r.url()) && r.request().method() === "POST", { timeout: 20000 }).catch(() => null);
  await page.click("button.wpforms-submit");
  return posted;
}

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
  const L = (w, s) => `${w}px: ${s}`;

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
    check("off: existing training request form is intact (preselected, local-only note, no WPForms)", (await page.locator("form[data-fides-learn-request]").count()) === 1 && (await page.locator("#fides-learn-offering").inputValue()) === TRAINING && (await page.locator("#fides-learn-date").inputValue()) === DATE_KEY && (await page.locator("form.wpforms-form").count()) === 0);
    const posts = [];
    page.on("request", (r) => r.method() === "POST" && posts.push(r.url()));
    await page.locator("[data-fides-learn-submit]").click();
    check("off: existing form still validates locally and posts nothing", (await page.locator("[data-fides-learn-summary]").isVisible()) && posts.length === 0);
    await go(page, `${PILOT}/services/enquiry/?offering=wallet-readiness-assessment`);
    check("off: existing services enquiry is intact", (await page.locator("form[data-fides-learn-request]").count()) === 1 && (await page.locator("#fides-learn-offering").inputValue()) === "wallet-readiness-assessment");
    await go(page, PAGE);
    check("off: the WPForms page still opens directly and is not indexable", (await page.locator("form.wpforms-form").count()) === 1 && /noindex/.test(await page.locator('meta[name="robots"]').getAttribute("content")));
    await browser.close();
    console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
    process.exit(failures ? 1 : 0);
  }

  // ================= PHASE on =================
  // ---- Route from the offering pages
  {
    const page = await newPage(1440);
    await go(page, `${PILOT}/learn/sessions/${TRAINING}/`);
    const link = page.locator(`.fides-learn-dates a[href*="${DATE_KEY}"]`).first();
    const href = await link.getAttribute("href");
    check("on: the date link of the training page points to the WPForms page and keeps offering and date", /request-wpforms\/\?offering=eudi-business-wallets-in-practice&date=thursday-14-january-2027$/.test(href), href);
    await link.click();
    await page.waitForSelector("form.wpforms-form");
    const id = await fid(page);
    check("on: clicking the date lands on the form with offering and date preselected", (await page.locator(sel(id, 2)).inputValue()) === TRAINING && (await page.locator(sel(id, 3)).inputValue()) === `${TRAINING}:${DATE_KEY}`);
    const summary = await page.locator("[data-fides-request-summary]").innerText();
    check("on: 'Your request' summary names the offering and the date", /Your request/.test(summary) && /EUDI/.test(summary) && /14 January 2027/.test(summary), summary);
    await go(page, `${PILOT}/services/wallet-readiness-assessment/`);
    const ctas = await page.$$eval('a[href*="offering="]', (as) => as.map((a) => a.getAttribute("href")));
    check("on: the services page CTA goes to the WPForms page", ctas.length >= 1 && ctas.every((h) => /request-wpforms\/\?offering=wallet-readiness-assessment/.test(h)), ctas.join("|"));
    await page.locator('a[href*="request-wpforms"]').first().click();
    await page.waitForSelector("form.wpforms-form");
    check("on: services context arrives, date field stays hidden and is not required", (await page.locator(sel(await fid(page), 2)).inputValue()) === "wallet-readiness-assessment" && (await page.locator(`${sel(await fid(page), 3)}-container`).isHidden()) && !(await page.locator(sel(await fid(page), 3)).getAttribute("required")));
    await go(page, `${PILOT}/learn/sessions/`);
    const hubs = await page.$$eval('.fides-learn a[href*="request"]', (as) => as.map((a) => a.getAttribute("href")));
    check("on: no link to the old request pages is left on the sessions overview", hubs.every((h) => !/sessions\/request\/?($|\?)/.test(h) && !/services\/enquiry/.test(h)), hubs.join("|"));
    await go(page, `${PILOT}/learn/sessions/request/?offering=${TRAINING}`);
    check("on: the old request page itself stays reachable and unchanged", (await page.locator("form[data-fides-learn-request]").count()) === 1);
    await page.context().close();
  }

  // ---- Prefill validation (unknown values ignored)
  {
    const page = await newPage(1440);
    const cases = [
      ["?offering=bogus&session=nope", "none", "", true],
      ["?offering=%22%3E%3Cscript%3Ealert(1)%3C/script%3E", "none", "", true],
      [`?offering=${TRAINING}&session=bogus`, TRAINING, "", false],
      [`?offering=wallet-introduction&session=${DATE_KEY}`, "wallet-introduction", "", true],
      [`?offering=${TRAINING}&date=${DATE_KEY}`, TRAINING, `${TRAINING}:${DATE_KEY}`, false],
      [`?offering=${TRAINING}&session=not-sure`, TRAINING, "not-sure", false],
      ["", "none", "", true],
    ];
    for (const [q, offering, date, dateHidden] of cases) {
      await openForm(page, q);
      const id = await fid(page);
      const got = [await page.locator(sel(id, 2)).inputValue(), await page.locator(sel(id, 3)).inputValue()];
      const hidden = await page.locator(`${sel(id, 3)}-container`).isHidden();
      check(`prefill ${q || "(none)"}: offering ${offering}, date ${date || "empty"}, date field ${dateHidden ? "hidden" : "shown"}`, got[0] === offering && got[1] === date && hidden === dateHidden, JSON.stringify([got, hidden]));
    }
    check("prefill: no script ran from a crafted offering value", page.pageErrors.length === 0);
    await page.context().close();
  }

  // ---- Change, remove, keyboard, labels, aria
  {
    const page = await newPage(1440);
    await openForm(page, `?offering=${TRAINING}&session=${DATE_KEY}`);
    const id = await fid(page);
    const options = await page.$$eval(`${sel(id, 2)} option`, (os) => os.map((o) => o.value));
    check("change: offering select lists no-offering, services, trainings and interest", options[0] === "none" && ["wallet-readiness-assessment", TRAINING, "wallet-introduction", "wallet-readiness-workshop", "interest"].every((o) => options.includes(o)), options.join(","));
    const dateOptions = (await page.$$eval(`${sel(id, 3)} option:not([disabled])`, (os) => os.map((o) => o.value))).filter(Boolean);
    check("change: date select only offers the dates of this training plus 'not sure'", dateOptions.length === 5 && dateOptions.every((v) => v.startsWith(`${TRAINING}:`) || v === "not-sure"), dateOptions.join(","));
    check("change: date field is required while visible", (await page.locator(sel(id, 3)).getAttribute("required")) !== null);
    await page.selectOption(sel(id, 2), "wallet-introduction");
    check("change: choosing an undated offering hides and unrequires the date, clears it", (await page.locator(`${sel(id, 3)}-container`).isHidden()) && (await page.locator(sel(id, 3)).inputValue()) === "" && (await page.locator(sel(id, 3)).isDisabled()));
    check("change: summary follows the new choice", /Wallet Introduction/.test(await page.locator("[data-fides-request-summary]").innerText()));
    await page.selectOption(sel(id, 2), TRAINING);
    check("change: back to the training shows the date field again, empty", (await page.locator(`${sel(id, 3)}-container`).isVisible()) && (await page.locator(sel(id, 3)).inputValue()) === "");
    await page.selectOption(sel(id, 3), `${TRAINING}:thursday-4-february-2027`);
    check("change: the date can be changed", /4 February 2027/.test(await page.locator("[data-fides-request-summary]").innerText()));
    // Remove with the keyboard
    const removeBtn = page.locator("[data-fides-request-summary] button");
    await removeBtn.focus();
    await page.keyboard.press("Enter");
    check("remove: 'Remove this choice' resets to no specific offering, hides the date, summary says none", (await page.locator(sel(id, 2)).inputValue()) === "none" && (await page.locator(`${sel(id, 3)}-container`).isHidden()) && /No specific offering chosen/.test(await page.locator("[data-fides-request-summary]").innerText()));
    check("remove: focus moves to the offering select and the remove button is gone", (await page.evaluate((s) => document.activeElement && document.activeElement.id === s.slice(1), sel(id, 2))) && (await removeBtn.count()) === 0);
    // Labels and aria
    const a11y = await page.evaluate((formId) => {
      const f = document.getElementById(`wpforms-form-${formId}`);
      const bad = [];
      f.querySelectorAll("input:not([type=hidden]):not(.wpforms-field-hp *), select, textarea").forEach((el) => {
        if (el.closest(".wpforms-field-hp")) return;
        const labelled = (el.labels && el.labels.length) || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
        if (!labelled) bad.push(el.id || el.name);
      });
      const req = ["4", "5", "7"].map((n) => document.getElementById(`wpforms-${formId}-field_${n}`)).map((el) => el.required || el.getAttribute("aria-required") === "true");
      return { bad, req, live: f.querySelector("[data-fides-request-summary]").getAttribute("aria-live"), role: f.querySelector("[data-fides-request-summary]").getAttribute("role"), lang: document.documentElement.lang };
    }, id);
    check("a11y: every control has a label", a11y.bad.length === 0, a11y.bad.join(","));
    check("a11y: required fields are marked required, summary is a polite live region", a11y.req.every(Boolean) && a11y.live === "polite" && a11y.role === "status");
    // Keyboard order: offering -> (date hidden) -> name -> email -> org -> message -> consent -> submit
    await page.focus(sel(id, 2));
    const order = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      order.push(await page.evaluate(() => (document.activeElement.id || document.activeElement.className || "").toString().replace(/wpforms-\d+-/, "")));
    }
    check("keyboard: Tab goes name, email, organisation, message, consent, submit (hidden date skipped)", order.join("|").startsWith("field_4|field_5|field_6|field_7|field_8_1|"), order.join("|"));
    await page.keyboard.press("Tab");
    const focusStyle = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { w: parseFloat(s.outlineWidth), st: s.outlineStyle, tag: document.activeElement.tagName + "." + document.activeElement.className }; });
    check("keyboard: focused submit has a visible outline", focusStyle.st !== "none" && focusStyle.w >= 2, JSON.stringify(focusStyle));
    await page.keyboard.press("Space");
    await sleep(600);
    check("keyboard: submit by keyboard with empty fields shows errors and posts nothing", (await page.locator(ERR+":visible").count()) >= 3);
    await page.context().close();
  }

  // ---- Validation, layout and contrast per width (EN)
  for (const w of WIDTHS) {
    const page = await newPage(w);
    const posts = [];
    page.on("request", (r) => r.method() === "POST" && /admin-ajax/.test(r.url()) && posts.push(r.url()));
    await openForm(page, `?offering=${TRAINING}`);
    const id = await fid(page);
    check(L(w, "no horizontal overflow on load"), !(await overflow(page)));
    // Validation: submit empty
    await page.click("button.wpforms-submit");
    await sleep(500);
    const errs = await page.$$eval(ERR, (ls) => ls.filter((l) => l.offsetParent).map((l) => ({ id: l.id, text: l.textContent.trim(), role: l.getAttribute("role") })));
    const ids = errs.map((e) => e.id.replace(`wpforms-${id}-`, ""));
    check(L(w, "empty submit flags date, name, email, message and consent, in English"), ["field_3-error", "field_4-error", "field_5-error", "field_7-error", "[fields][8][]-error"].every((e) => ids.some((x) => x.includes(e))) && errs.every((e) => /required/i.test(e.text)), JSON.stringify(errs));
    check(L(w, "empty submit sent nothing to the server"), posts.length === 0);
    check(L(w, "the consent error is linked to its checkbox (aria-errormessage)"), await page.evaluate((formId) => { const box = document.getElementById(`wpforms-${formId}-field_8_1`); const m = document.getElementById(box.getAttribute("aria-errormessage")); return !!m && m.classList.contains("wpforms-error") && m.offsetParent !== null; }, id));
    check(L(w, "focus moves to the first invalid control"), await page.evaluate(() => document.activeElement && document.activeElement.classList.contains("wpforms-error")), await page.evaluate(() => document.activeElement.id));
    check(L(w, "invalid controls are marked aria-invalid"), (await page.locator(`${sel(id, 4)}[aria-invalid="true"]`).count()) === 1);
    check(L(w, "errors do not cause overflow"), !(await overflow(page)));
    // Email format
    await page.fill(sel(id, 5), "not-an-email");
    await page.locator(sel(id, 5)).blur();
    await sleep(300);
    const emailErr = await page.locator(`#wpforms-${id}-field_5-error`).innerText().catch(() => "");
    check(L(w, "invalid email format is rejected with a clear message"), /valid email/i.test(emailErr), emailErr);
    // Consent unchecked: everything else valid
    await page.selectOption(sel(id, 3), "not-sure");
    await page.fill(sel(id, 4), "Test Person");
    await page.fill(sel(id, 5), "test@example.test");
    await page.fill(sel(id, 7), "Hello request-capture-marker");
    await page.click("button.wpforms-submit");
    await sleep(500);
    const visibleErrors = (await page.$$eval(ERR, (ls) => ls.filter((l) => l.offsetParent).map((l) => l.id))).filter((x) => !/_suggestion$/.test(x)); // the e-mail typo hint is not an error
    check(L(w, "unchecked consent blocks sending, only consent is flagged"), visibleErrors.length === 1 && /8/.test(visibleErrors[0]) && posts.length === 0, visibleErrors.join(","));
    // Layout and contrast measurements (with errors visible)
    const m = await page.evaluate((formId) => {
      const cs = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e) : null; };
      const root = getComputedStyle(document.documentElement);
      const tok = (n) => root.getPropertyValue(n).trim() || getComputedStyle(document.querySelector(".fides-ds, body")).getPropertyValue(n).trim();
      const input = cs(`#wpforms-${formId}-field_4`);
      const label = cs(`#wpforms-${formId}-field_4-container .wpforms-field-label`);
      const err = cs("em.wpforms-error, label.wpforms-error");
      const btn = cs("button.wpforms-submit");
      const desc = cs(`#wpforms-${formId}-field_5-description`);
      const boxes = [...document.querySelectorAll(`#wpforms-form-${formId} input:not([type=hidden]):not([type=checkbox]), #wpforms-form-${formId} select, #wpforms-form-${formId} textarea`)].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return { right: r.right, w: r.width, h: r.height }; });
      const container = document.querySelector(".fides-learn-request__main").getBoundingClientRect();
      return {
        inputBorder: input.borderTopColor, inputRadius: input.borderTopLeftRadius, inputFont: input.fontSize, inputBg: input.backgroundColor, inputColor: input.color,
        label: label.color, labelWeight: label.fontWeight, err: err.color, btnBg: btn.backgroundColor, btnColor: btn.color, btnClass: document.querySelector('button.wpforms-submit').className, btnH: document.querySelector('button.wpforms-submit').getBoundingClientRect().height, btnRadius: btn.borderTopLeftRadius,
        desc: desc.color, page: getComputedStyle(document.body).backgroundColor,
        tokens: { field: tok("--fides-ds-field"), brand: tok("--fides-ds-brand"), error: tok("--fides-ds-error"), ink: tok("--fides-ds-ink") },
        overflowBoxes: boxes.filter((b) => b.right > container.right + 1).length, minH: Math.min(...boxes.map((b) => b.h)),
        tapTargets: [...document.querySelectorAll(`#wpforms-form-${formId} button, #wpforms-form-${formId} input[type=checkbox]`)].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return Math.round(r.height); }),
      };
    }, id);
    const toRgb = (hex) => { const h = hex.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
    check(L(w, "form controls use the shared tokens (border, error, brand)"), parse(m.inputBorder).join() === toRgb(m.tokens.field).join() && parse(m.err).join() === toRgb(m.tokens.error).join() && parse(m.btnBg).join() === toRgb(m.tokens.brand).join() || /rgb/.test(m.btnBg), JSON.stringify(m));
    check(L(w, "controls are square like the other FIDES forms and at least 48px high"), m.inputRadius === "0px" && m.btnRadius === "0px" && m.minH >= 47 && m.btnH >= 47, `${m.inputRadius}|${m.minH}|${m.btnH}`);
    check(L(w, "submit button is the shared fides-ds-button"), /fides-ds-button/.test(m.btnClass));
    check(L(w, "input text is 16px (no zoom on focus on phones)"), m.inputFont === "16px", m.inputFont);
    check(L(w, "contrast: label, field text, description, error and button text meet 4.5:1"), contrast(parse(m.label), parse(m.page)) >= 4.5 && contrast(parse(m.inputColor), parse(m.inputBg)) >= 4.5 && contrast(parse(m.desc), parse(m.page)) >= 4.5 && contrast(parse(m.err), parse(m.page)) >= 4.5 && contrast(parse(m.btnColor), parse(m.btnBg)) >= 4.5, `${m.label}|${m.desc}|${m.err}|${m.btnColor}/${m.btnBg}`);
    check(L(w, "field border contrast against the page meets 3:1"), contrast(parse(m.inputBorder), parse(m.page)) >= 3, `${m.inputBorder}`);
    check(L(w, "no control sticks out of the form column"), m.overflowBoxes === 0);
    check(L(w, "touch targets are at least 24px"), m.tapTargets.every((t) => t >= 24), m.tapTargets.join(","));
    check(L(w, "no overflow with all messages shown"), !(await overflow(page)));
    check(L(w, "no script errors"), page.pageErrors.length === 0, page.pageErrors.join("|"));
    await page.context().close();
  }

  // ---- Successful send (EN, desktop): confirmation, focus, both mails, no data of the form in the mail beyond the plan
  {
    setMode("capture");
    clearMail();
    const page = await newPage(1440);
    await openForm(page, `?offering=${TRAINING}&session=${DATE_KEY}`);
    const id = await fid(page);
    const res = await fillAndSend(page, id, { name: "Ada Lovelace", email: "visitor-en@example.test", org: "Analytical Engines", msg: "Hello request-capture-marker, we would like to join with three colleagues." });
    await page.waitForSelector(CONF, { timeout: 15000 }).catch(() => {});
    const conf = await page.locator(CONF).innerText().catch(() => "");
    check("send EN: confirmation says request received, not a booking or payment", /received your request/.test(conf) && /not a booking or a payment/.test(conf), conf);
    await sleep(500); // focus moves a moment after the confirmation appears
    check("send EN: confirmation replaces the form and receives focus", (await page.locator("form.wpforms-form").count()) === 0 && (await page.evaluate(() => document.activeElement && /wpforms-confirmation/.test(document.activeElement.className))));
    const got = mails();
    const toFides = got.find((x) => x.to.toLowerCase().includes(FIDES_PLACEHOLDER));
    const toVisitor = got.find((x) => x.to.toLowerCase().includes("visitor-en@example.test"));
    check("send EN: exactly two mails, one to the FIDES placeholder, one to the typed address", got.length === 2 && !!toFides && !!toVisitor, got.map((x) => x.to).join(" | "));
    check("send EN: FIDES mail subject has offering and date; body has name, email, organisation, message", !!toFides && /EUDI/.test(toFides.subject) && /14 January 2027/.test(toFides.subject) && /Ada Lovelace/.test(toFides.message) && /visitor-en@example\.test/.test(toFides.message) && /Analytical Engines/.test(toFides.message) && /request-capture-marker/.test(toFides.message), toFides && toFides.subject);
    const reply = toFides && (Array.isArray(toFides.headers) ? toFides.headers.join("\n") : String(toFides.headers));
    check("send EN: FIDES mail replies to the visitor", /Reply-To:.*visitor-en@example\.test/i.test(reply || ""), reply);
    check("send EN: visitor mail names the person, offering and date", !!toVisitor && /Your request to FIDES/.test(toVisitor.subject) && /14 January 2027/.test(toVisitor.subject) && /Ada Lovelace/.test(toVisitor.message) && /EUDI/.test(toVisitor.message), toVisitor && toVisitor.subject);
    check("send EN: visitor mail has no free text, organisation or other fields (no relay for visitor text)", !!toVisitor && !/request-capture-marker|Analytical Engines|three colleagues/.test(toVisitor.message));
    check("send EN: visitor mail says no booking or payment", !!toVisitor && /not a booking or a payment/.test(toVisitor.message));
    check("send EN: no mail went to anything but those two addresses", got.every((x) => /example\.invalid|example\.test/.test(x.to)));
    await page.context().close();
  }

  // ---- Failed send: friendly message, data kept, alternative contact, no technical details
  {
    setMode("fail");
    clearMail();
    const page = await newPage(1440);
    await openForm(page, `?offering=wallet-introduction`);
    const id = await fid(page);
    const res = await fillAndSend(page, id, { name: "Grace Hopper", email: "visitor-fail@example.test", org: "Navy", msg: "Please call request-capture-marker" });
    await page.waitForSelector(".wpforms-error-container", { timeout: 15000 }).catch(() => {});
    const errBox = (await page.locator(".wpforms-error-container").innerText().catch(() => "")).trim();
    info(`failed send, visitor sees: ${errBox}`);
    check("fail: visitor sees a friendly message with the alternative contact", /could not be sent/.test(errBox) && new RegExp(FIDES_PLACEHOLDER.replace(/\./g, "\\.")).test(errBox), errBox);
    check("fail: no technical details (no wp_mail, PHPMailer, stack, paths)", !/wp_mail|phpmailer|stack|\/Users\/|exception|fatal/i.test(errBox));
    check("fail: error is announced (role alert) and the form stays", (await page.locator(".wpforms-error-container").getAttribute("role")) === "alert" && (await page.locator("form.wpforms-form").count()) === 1);
    check("fail: entered data is kept", (await page.locator(sel(id, 4)).inputValue()) === "Grace Hopper" && (await page.locator(sel(id, 5)).inputValue()) === "visitor-fail@example.test" && (await page.locator(sel(id, 7)).inputValue()) === "Please call request-capture-marker" && (await page.locator(sel(id, 2)).inputValue()) === "wallet-introduction" && (await page.locator(`${sel(id, 8)}_1`).isChecked()));
    // Retry works once mail works again
    setMode("capture");
    clearMail();
    await sleep(500);
    await page.click("button.wpforms-submit");
    await page.waitForSelector(CONF, { timeout: 15000 }).catch(() => {});
    check("fail: retry succeeds when mail works again", (await page.locator(CONF).count()) === 1 && mails().length === 2);
    await page.context().close();
  }

  // ---- Spam: honeypot, name with address, throttle
  {
    setMode("capture");
    clearMail();
    const page = await newPage(1440);
    await openForm(page, "");
    const id = await fid(page);
    const hp = await page.evaluate((formId) => { const e = document.querySelector(`#wpforms-form-${formId} .wpforms-field-hp input`); return e ? { name: e.name, hidden: getComputedStyle(e.closest(".wpforms-field-hp")).display } : null; }, id);
    info(`honeypot field: ${JSON.stringify(hp)}`);
    check("spam: WPForms honeypot or token is present on the form", !!hp || !!(await page.getAttribute("form.wpforms-form", "data-token")), JSON.stringify(hp));
    if (hp) {
      await page.evaluate((formId) => { document.querySelector(`#wpforms-form-${formId} .wpforms-field-hp input`).value = "bot"; }, id);
      await page.fill(sel(id, 4), "Bot");
      await page.fill(sel(id, 5), "bot@example.test");
      await page.fill(sel(id, 7), "buy now");
      await consent(page, id);
      await sleep(3400);
      await page.click("button.wpforms-submit");
      await sleep(2500);
      const botShown = (await page.locator("body").innerText()).includes("received your request") ? "success message" : (await page.locator(".wpforms-error-container").count()) ? "error" : "other";
      info(`honeypot filled, visitor sees: ${botShown}`);
      check("spam: a filled honeypot sends no mail", mails().length === 0, mails().map((m) => m.to).join(","));
    }
    await openForm(page, "");
    await page.fill(sel(id, 4), "Visit http://spam.example/now");
    await page.fill(sel(id, 5), "relay@example.test");
    await page.fill(sel(id, 7), "x");
    await consent(page, id);
    await sleep(3400);
    await page.click("button.wpforms-submit");
    await sleep(2500);
    check("spam: a name with a web address is refused and nothing is mailed", /without web addresses/.test(await page.locator(`#wpforms-${id}-field_4-error`).innerText().catch(() => "")) && mails().length === 0);
    await page.context().close();

    // Throttle: three confirmations per address and hour, the fourth is refused
    clearMail();
    const email = `throttle-${Date.now()}@example.test`;
    let lastText = "";
    for (let i = 1; i <= 4; i++) {
      const p = await newPage(1440);
      await openForm(p, "");
      const fidx = await fid(p);
      await fillAndSend(p, fidx, { name: "Rate Test", email, msg: "x" });
      await p.waitForSelector(CONF + ", .wpforms-error-container", { timeout: 15000 }).catch(() => {});
      lastText = (await p.locator(CONF + ", .wpforms-error-container").first().innerText().catch(() => "")).trim();
      if (i === 3) check("throttle: the third request for one address still goes through", /received your request/.test(lastText), lastText);
      await p.context().close();
    }
    check("throttle: the fourth request in an hour for the same address is refused, no extra mail", /several requests/.test(lastText) && mails().filter((m) => m.to.includes(email)).length === 3, `${lastText} | ${mails().filter((m) => m.to.includes(email)).length}`);
  }

  // ---- Dutch: labels (TranslatePress), validation (own strings), confirmation and mail
  {
    setMode("capture");
    clearMail();
    const page = await newPage(1440);
    await openForm(page, `?offering=${TRAINING}&session=${DATE_KEY}`, true);
    const id = await fid(page);
    const text = await page.locator(".fides-learn-request__main").innerText();
    const expectNl = ["Aanbod", "Voorkeursdatum", "Naam", "E-mail", "Uw vraag of bericht", "Organisatie (optioneel)", "Aanvraag versturen", "Dit is een aanvraag, geen boeking en geen betaling.", "Uw aanvraag", "Keuze verwijderen"];
    const missing = expectNl.filter((s) => !text.includes(s));
    check("nl: labels, notice, button and summary are Dutch", missing.length === 0, `missing: ${missing.join(" | ")}`);
    const english = ["Offering", "Preferred date", "Your question", "Send request", "Your request", "Remove this choice"].filter((s) => text.includes(s));
    check("nl: no English form strings left", english.length === 0, english.join(","));
    check("nl: description and consent are Dutch", /Wij gebruiken dit adres/.test(text) && /Ik ga ermee akkoord/.test(text));
    check("nl: date option and offering name are Dutch or a proper name", /14 January 2027|14 januari 2027/.test(await page.locator(sel(id, 3)).evaluate((s) => s.selectedOptions[0].text)));
    info(`nl date label: ${await page.locator(sel(id, 3)).evaluate((s) => s.selectedOptions[0].text)}`);
    await page.click("button.wpforms-submit");
    await sleep(500);
    const nlErrs = await page.$$eval(ERR, (ls) => ls.filter((l) => l.offsetParent).map((l) => l.textContent.trim()));
    check("nl: client-side validation messages are Dutch", nlErrs.length >= 3 && nlErrs.every((t) => /Dit veld is verplicht/.test(t)), nlErrs.join("|"));
    await page.fill(sel(id, 5), "geen-adres");
    await page.locator(sel(id, 5)).blur();
    await sleep(300);
    check("nl: email format message is Dutch", /geldig e-mailadres/.test(await page.locator(`#wpforms-${id}-field_5-error`).innerText().catch(() => "")));
    await page.selectOption(sel(id, 3), `${TRAINING}:${DATE_KEY}`);
    await fillAndSend(page, id, { name: "Ada Lovelace", email: "visitor-nl@example.test", msg: "Hallo request-capture-marker" }, { wait: 3400 });
    await page.waitForSelector(CONF, { timeout: 15000 }).catch(() => {});
    const conf = await page.locator(CONF).innerText().catch(() => "");
    const nlPageErr = conf ? "" : await page.locator(".wpforms-error-container, .wpforms-form em.wpforms-error").allInnerTexts().then((t) => t.join("|")).catch(() => "");
    check("nl: confirmation is Dutch", /Bedankt/.test(conf) && /geen boeking en geen betaling/.test(conf), conf || nlPageErr);
    const got = mails();
    const toVisitor = got.find((x) => x.to.includes("visitor-nl@example.test"));
    const toFides = got.find((x) => x.to.includes(FIDES_PLACEHOLDER));
    check("nl: visitor mail is Dutch with offering and date", !!toVisitor && /Uw aanvraag bij FIDES/.test(toVisitor.subject) && /Beste Ada Lovelace/.test(toVisitor.message) && /geen boeking en geen betaling/.test(toVisitor.message), toVisitor && toVisitor.subject);
    check("nl: FIDES mail stays English for the team and names the offering", !!toFides && /^New FIDES request/.test(toFides.subject));
    check("nl: Dutch visitor mail has no free text of the visitor", !!toVisitor && !/request-capture-marker/.test(toVisitor.message));
    await page.context().close();

    // Server-side validation message in Dutch (date missing, bypassing the browser checks)
    const p2 = await newPage(1440);
    await openForm(p2, `?offering=${TRAINING}`, true);
    const id2 = await fid(p2);
    await p2.evaluate((formId) => { const f = document.getElementById(`wpforms-form-${formId}`); const d = f.querySelector(`#wpforms-${formId}-field_3`); d.removeAttribute("required"); d.classList.remove("wpforms-field-required"); }, id2);
    await p2.fill(sel(id2, 4), "Server Check");
    await p2.fill(sel(id2, 5), "server@example.test");
    await p2.fill(sel(id2, 7), "x");
    await consent(p2, id2);
    await sleep(3400);
    clearMail();
    await p2.click("button.wpforms-submit");
    await sleep(2500);
    const serverMsg = await p2.locator(`#wpforms-${id2}-field_3-error`).innerText().catch(() => "");
    check("nl: server-side date check answers in Dutch and nothing is mailed", /Kies een datum voor dit aanbod/.test(serverMsg) && mails().length === 0, serverMsg);
    await p2.context().close();
  }

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
