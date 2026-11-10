/**
 * Checks of the WPForms request form test page on a review site (for example the shielded staging site).
 *
 * DEFAULT: read-only. Every request is a GET; the script aborts any other request, so it cannot send the form.
 * SENDING is off. It runs only when BOTH are set (see learn/request-form/STAGING-PLUS-TRIAL.md, step 3):
 *   STAGING_SEND=1                       send one test request in English and one in Dutch
 *   STAGING_MAIL_BLOCK_CONFIRMED=yes     you checked on the server that wp_mail is blocked (pre_wp_mail returns false)
 * A send stores a WPForms entry on Plus. Delete the entries afterwards (permanently).
 *
 * Environment:
 *   REVIEW_URL            base URL of the review site including its path, no trailing slash   (required)
 *   REVIEW_USER / REVIEW_PASS   HTTP basic auth for a shielded site (optional; never printed)
 *   TEST_PATH             test page path below REVIEW_URL            (default /request-wpforms-test/)
 *   OLD_REQUEST_PATH      existing training request page             (default /learn/sessions/request/)
 *   OLD_SERVICES_PATH     existing services enquiry page             (default /services/enquiry/)
 *   TRAINING_PATH         training page whose date links are checked (default /learn/sessions/eudi-business-wallets-in-practice/)
 *   TRAINING / DATE_KEY   offering slug and date key used for the prefill (defaults: the pilot training and 14 January 2027)
 *   NL_URL_BASE           base of the Dutch pages     (default REVIEW_URL + /nl, the TranslatePress layout of a site below a path)
 *   EXPECT_WPFORMS_VERSION  version expected in the asset URLs      (default 1.10.2.1)
 *   CHROME_PATH, PLAYWRIGHT_MODULE   system Chrome and the Playwright module
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const REVIEW = (process.env.REVIEW_URL || "").replace(/\/+$/, "");
if (!REVIEW) {
  console.error("Set REVIEW_URL (for example https://<review-host>/design-review).");
  process.exit(2);
}
const TEST_PATH = process.env.TEST_PATH || "/request-wpforms-test/";
const OLD_REQUEST = process.env.OLD_REQUEST_PATH || "/learn/sessions/request/";
const OLD_SERVICES = process.env.OLD_SERVICES_PATH || "/services/enquiry/";
const TRAINING_PATH = process.env.TRAINING_PATH || "/learn/sessions/eudi-business-wallets-in-practice/";
const TRAINING = process.env.TRAINING || "eudi-business-wallets-in-practice";
const DATE_KEY = process.env.DATE_KEY || "thursday-14-january-2027";
const EXPECT_VERSION = process.env.EXPECT_WPFORMS_VERSION || "1.10.2.1";
const SEND = process.env.STAGING_SEND === "1" && process.env.STAGING_MAIL_BLOCK_CONFIRMED === "yes";
const NL_BASE = (process.env.NL_URL_BASE || `${REVIEW}/nl`).replace(/\/+$/, "");
const host = new URL(REVIEW).host;
const mount = new URL(REVIEW).pathname.replace(/\/+$/, "");

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail !== undefined && !ok ? ` (${detail})` : ""}`);
};
const info = (text) => console.log(`info - ${text}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sel = (id, n) => `#wpforms-${id}-field_${n}`;

(async () => {
  if (process.env.STAGING_SEND === "1" && !SEND) {
    console.log("not ok - STAGING_SEND=1 needs STAGING_MAIL_BLOCK_CONFIRMED=yes as well; nothing is sent");
    process.exit(2);
  }
  info(`site ${host}${mount}; mode ${SEND ? "SEND (stores test entries, mail must be blocked)" : "read-only (GET only)"}`);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const newPage = async (width) => {
    const ctx = await browser.newContext({
      viewport: { width, height: width <= 400 ? 800 : 900 },
      httpCredentials: process.env.REVIEW_USER ? { username: process.env.REVIEW_USER, password: process.env.REVIEW_PASS || "" } : undefined,
    });
    // Read-only guard: only GET (and HEAD) pass. In SEND mode the form's own AJAX post is allowed as well.
    await ctx.route("**/*", (route) => {
      const req = route.request();
      const method = req.method();
      const ajax = SEND && method === "POST" && /admin-ajax\.php/.test(req.url()) && new URL(req.url()).host === host;
      return method === "GET" || method === "HEAD" || ajax ? route.continue() : route.abort();
    });
    const page = await ctx.newPage();
    page.pageErrors = [];
    page.on("pageerror", (e) => page.pageErrors.push(e.message));
    return page;
  };
  const open = async (page, path, base = REVIEW) => {
    const res = await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
    const deny = page.locator(".cmplz-btn.cmplz-deny:visible").first();
    if (await deny.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) await deny.click();
    return res;
  };

  // ---- Existing routes stay as they are
  {
    const page = await newPage(1440);
    for (const [label, path] of [["training request page", OLD_REQUEST], ["services enquiry page", OLD_SERVICES]]) {
      const res = await open(page, path);
      if (!res || res.status() === 404) {
        info(`${label}: ${path} not found on this site (set OLD_REQUEST_PATH / OLD_SERVICES_PATH); skipped`);
        continue;
      }
      check(`${label} still loads and is the existing form (no WPForms form)`, res.status() === 200 && (await page.locator("form.wpforms-form").count()) === 0 && (await page.locator("form[data-fides-learn-request]").count()) === 1, String(res.status()));
    }
    const res = await open(page, TRAINING_PATH);
    if (res && res.status() === 200) {
      const hrefs = await page.$$eval('a[href*="offering="]', (as) => as.map((a) => a.getAttribute("href")));
      check("date links on the training page still point to the existing request page, not to the test page", hrefs.length > 0 && hrefs.every((h) => !/request-wpforms/.test(h)), hrefs.slice(0, 2).join("|"));
    } else {
      info(`training page ${TRAINING_PATH} not found; date link check skipped`);
    }
  }

  // ---- The test page, English and Dutch, desktop and mobile
  const langs = [["en", REVIEW], ["nl", NL_BASE]];
  for (const w of [1440, 390]) {
    for (const [lang, base] of langs) {
      const L = (s) => `${w}px ${lang.toUpperCase()}: ${s}`;
      const page = await newPage(w);
      const res = await open(page, `${TEST_PATH}?offering=${TRAINING}&session=${DATE_KEY}`, base);
      check(L("test page loads (200)"), !!res && res.status() === 200, res ? String(res.status()) : "no response");
      if (!res || res.status() !== 200) continue;
      const finalPath = new URL(page.url()).pathname;
      check(L("no doubled path segment"), !/\/([^/]+)\/\1\//.test(finalPath), finalPath);
      check(L("the WPForms form is on the page, once"), (await page.locator("form.wpforms-form").count()) === 1);
      check(L("the page is not indexable"), /noindex/.test((await page.locator('meta[name="robots"]').first().getAttribute("content").catch(() => "")) || ""));
      const id = await page.getAttribute("form.wpforms-form", "data-formid");
      check(L("offering and date are preselected from the link"), (await page.locator(sel(id, 2)).inputValue()) === TRAINING && (await page.locator(sel(id, 3)).inputValue()) === `${TRAINING}:${DATE_KEY}`);
      const dateCount = await page.locator(`${sel(id, 3)} option`).count();
      check(L("the date list has the dates of the training plus a placeholder and 'not sure'"), dateCount >= 5, String(dateCount));
      // The hidden language field is a Plus field type; Lite does not render it and the language then comes from TranslatePress.
      const langField = page.locator('input[name="wpforms[fields][9]"]');
      if (await langField.count()) check(L("the hidden language field says " + lang), (await langField.inputValue()) === lang);
      else info(L("no hidden language field on the page (Lite); the language comes from TranslatePress"));
      const text = await page.locator("form.wpforms-form").innerText();
      const labels = lang === "en" ? [/Name/, /Email/, /Offering/, /Preferred date/] : [/Naam/, /E-mail/, /Aanbod/, /Voorkeursdatum/];
      check(L("labels are in the right language"), labels.every((r) => r.test(text)), text.slice(0, 100));
      check(L("no checkbox and no consent box"), (await page.locator("form.wpforms-form input[type=checkbox]").count()) === 0);
      const privacy = await page.locator(".fides-request-privacy").first().innerText();
      check(L("privacy text has purpose and retention placeholder"), lang === "en" ? /only to respond to this request/.test(privacy) && /\[retention period to be decided\]/.test(privacy) : /alleen om op deze aanvraag te reageren/.test(privacy) && /\[bewaartermijn nog te bepalen\]/.test(privacy), privacy.slice(0, 120));
      const links = await page.$$eval(".fides-request-privacy a", (as) => as.map((a) => a.href));
      check(L("privacy text links to a privacy page"), links.length === 1 && /^https?:/.test(links[0]), links.join("|"));
      info(L(`privacy link goes to ${links[0] ? new URL(links[0]).host : "none"} (the site shell sends destinations without a page here to the live site)`));
      check(L("no horizontal overflow"), !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
      check(L("no page errors"), page.pageErrors.length === 0, page.pageErrors.join("|"));
      if (w === 1440 && lang === "en") {
        const html = await page.content();
        const vers = Array.from(new Set((html.match(/plugins\/(wpforms(?:-lite)?)\/[^"']*?\?ver=([\d.]+)/g) || []).map((m) => m.replace(/.*plugins\/(wpforms(?:-lite)?)\/.*\?ver=/, "$1 ")))).slice(0, 4);
        info(`WPForms asset versions seen: ${vers.join(", ") || "none"} ("wpforms" = paid plugin code, "wpforms-lite" = Lite)`);
        check(`WPForms assets come from the paid plugin folder at version ${EXPECT_VERSION}`, vers.some((v) => v === `wpforms ${EXPECT_VERSION}`), vers.join(", "));
      }
      await page.context().close();
    }
  }

  // ---- Unknown link values are ignored
  {
    const page = await newPage(1440);
    await open(page, `${TEST_PATH}?offering=bogus&session=nope`);
    const id = await page.getAttribute("form.wpforms-form", "data-formid");
    check("unknown offering and date in the link are ignored", (await page.locator(sel(id, 2)).inputValue()) === "none");
  }

  // ---- Sending (off by default)
  if (SEND) {
    for (const [lang, base] of langs) {
      const page = await newPage(1440);
      await open(page, `${TEST_PATH}?offering=${TRAINING}&session=${DATE_KEY}`, base);
      const id = await page.getAttribute("form.wpforms-form", "data-formid");
      const stamp = Date.now();
      await page.fill(sel(id, 4), `Staging Test ${lang.toUpperCase()}`);
      await page.fill(sel(id, 5), `staging-test-${lang}-${stamp}@example.invalid`);
      await page.fill(sel(id, 7), `Test request ${stamp}. Delete this entry.`);
      await sleep(3400);
      const posted = page.waitForResponse((r) => /admin-ajax\.php/.test(r.url()) && r.request().method() === "POST", { timeout: 20000 }).catch(() => null);
      await page.locator("button.wpforms-submit").click();
      await posted;
      await sleep(1000);
      const conf = await page.locator(".wpforms-confirmation-container, .wpforms-confirmation-container-full").innerText().catch(() => "");
      const err = conf ? "" : await page.locator(".wpforms-error-container, .wpforms-error-alert, em.wpforms-error").allInnerTexts().then((t) => t.join(" | ")).catch(() => "");
      info(`${lang.toUpperCase()} result: ${(conf || err || "nothing visible").replace(/\s+/g, " ").slice(0, 300)}`);
      // With mail blocked, a Plus site that stores entries must say "saved" (and not that a mail was sent); Lite must show the error.
      check(`${lang.toUpperCase()}: the answer claims no mail that cannot have been sent`, !/sent a confirmation to your email|een bevestiging naar uw e-mailadres gestuurd/.test(conf), conf.slice(0, 160));
      check(`${lang.toUpperCase()}: Plus stored the entry ("saved" text) or the form shows the honest error`, /is saved|is opgeslagen/.test(conf) || /could not be sent right now|kon nu niet worden verstuurd/.test(err), (conf || err).slice(0, 160));
      await page.context().close();
    }
    info("Now delete the test entries permanently (WPForms » Entries) and run the checklist's step 8.");
  } else {
    info("sending skipped (STAGING_SEND is off)");
  }

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
