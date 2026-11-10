/**
 * GET checks for doubled paths in header/footer links, EN and NL (TranslatePress), standalone or pilot layout.
 * Plain HTTP GET only (no browser, nothing is submitted).
 *
 * Env: SITE_URL  home URL of the pilot, no trailing slash. Standalone rehearsal: http://localhost:10089/design-review
 *                (the default); local pilot layout: http://localhost:10088 with LAYOUT=pilot.
 *      LAYOUT    standalone (default) | pilot (pages below /fides-design-pilot/)
 *      LIVE_ORIGIN  default https://fides.community
 *      RESOLVE_IP   optional: connect to this IP while keeping the Host of SITE_URL (curl --resolve style)
 *
 * Run: scripts/design-pilot/tests/run-nl-links-checks.sh
 */
const http = require("http");
const https = require("https");

const SITE = (process.env.SITE_URL || "http://localhost:10089/design-review").replace(/\/$/, "");
const LAYOUT = process.env.LAYOUT || "standalone";
const LIVE = (process.env.LIVE_ORIGIN || "https://fides.community").replace(/\/$/, "");
const RESOLVE_IP = process.env.RESOLVE_IP || "";
const ORIGIN = new URL(SITE).origin;
const HOME_PATH = new URL(SITE).pathname.replace(/\/$/, "");
const PILOT_PREFIX = LAYOUT === "pilot" ? "/fides-design-pilot" : "";
const DOUBLED = /\/design-review\/(?:nl\/)?design-review\/|\/fides-design-pilot\/(?:nl\/)?fides-design-pilot\/|\/nl\/(?:[^?#]*\/)?nl\/|\/design-review\/design-review\//;

let pass = 0;
const fail = [];
function check(name, ok, detail) {
  if (ok) {
    pass++;
    console.log(`ok - ${name}`);
  } else {
    fail.push(name);
    console.log(`not ok - ${name}${detail ? ` (${detail})` : ""}`);
  }
}

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === "https:" ? https : http;
    const options = { method: "GET", headers: { "User-Agent": "nl-links-checks" } };
    if (RESOLVE_IP && u.origin === ORIGIN) {
      options.host = RESOLVE_IP;
      options.headers.Host = u.host;
    }
    lib
      .get(url, options, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, location: res.headers.location || "", body }));
      })
      .on("error", reject);
  });
}

/** href values of <a> elements inside the first <header …> and <footer …> blocks of the page. */
function shellLinks(html) {
  const out = { header: [], footer: [] };
  for (const part of ["header", "footer"]) {
    const m = html.match(new RegExp(`<${part}[\\s>][\\s\\S]*?</${part}>`, "i"));
    if (!m) continue;
    for (const a of m[0].matchAll(/<a\b[^>]*?\shref="([^"]*)"/gi)) out[part].push(a[1].replace(/&amp;/g, "&").replace(/&#038;/g, "&"));
  }
  return out;
}

/** The language switcher links (data-fides-ds-lang-link): [{href, hreflang}]. */
function switcherLinks(html) {
  const links = [];
  for (const a of html.matchAll(/<a\b[^>]*data-fides-ds-lang-link[^>]*>/gi)) {
    const href = (a[0].match(/\shref="([^"]*)"/) || [])[1] || "";
    const lang = (a[0].match(/\shreflang="([^"]*)"/) || [])[1] || "";
    links.push({ href: href.replace(/&amp;/g, "&").replace(/&#038;/g, "&"), lang });
  }
  return links;
}

function classify(href) {
  if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) return "skip";
  const abs = new URL(href, SITE + "/").href;
  if (abs.startsWith(LIVE + "/") || abs === LIVE) return "live";
  if (new URL(abs).origin !== ORIGIN) return "external";
  const p = new URL(abs).pathname;
  if (/\/wp-(login|admin|content|includes|json)/.test(p)) return "system";
  return "internal";
}

(async () => {
  // Pages: home, a deep Learn page, a page with a query string and an anchor.
  const pages = [
    { path: LAYOUT === "pilot" ? "/homepage-fragment/" : "/", label: "home" },
    { path: "/learn/", label: "learn" },
    { path: "/learn/topics/", label: "deep page" },
    { path: "/services/enquiry/?offering=wallet-readiness-assessment#form", label: "query string and anchor" },
  ];
  const nlBase = `${SITE}/nl`;

  for (const lang of ["en", "nl"]) {
    const base = lang === "nl" ? nlBase : SITE;
    const internalSeen = new Set();
    for (const page of pages) {
      // In the pilot layout the pages live below /fides-design-pilot/ and TranslatePress puts /nl/ before the site path.
      const target = LAYOUT === "pilot" ? `${ORIGIN}${lang === "nl" ? "/nl" : ""}${HOME_PATH}${PILOT_PREFIX}${page.path}` : `${base}${page.path}`;
      const res = await get(target.replace(/#.*$/, ""));
      check(`${lang.toUpperCase()} ${page.label}: ${target} answers 200`, res.status === 200, `HTTP ${res.status} ${res.location}`);
      if (res.status !== 200) continue;
      const { header, footer } = shellLinks(res.body);
      check(`${lang.toUpperCase()} ${page.label}: header and footer have links`, header.length > 5 && footer.length > 3, `${header.length}/${footer.length}`);
      const all = [...header.map((h) => ["header", h]), ...footer.map((h) => ["footer", h])];
      const expectedPrefix = LAYOUT === "pilot" ? `${ORIGIN}${lang === "nl" ? "/nl" : ""}${HOME_PATH}/` : `${base}/`;
      const bad = [];
      const wrongLang = [];
      const liveBad = [];
      for (const [where, href] of all) {
        const kind = classify(href);
        if (kind === "skip") continue;
        const abs = new URL(href, SITE + "/").href;
        if (DOUBLED.test(abs)) bad.push(`${where}: ${href}`);
        if (kind === "live" && (/\/nl\//.test(abs) || /design-review|fides-design-pilot/.test(abs))) liveBad.push(`${where}: ${href}`);
        if (kind === "internal") {
          internalSeen.add(abs);
          // The language switcher may point at the other language; everything else must stay in this one.
          if (!abs.startsWith(expectedPrefix) && !isSwitcher(res.body, href)) wrongLang.push(`${where}: ${href}`);
        }
      }
      check(`${lang.toUpperCase()} ${page.label}: no doubled path in any header/footer link`, bad.length === 0, bad.slice(0, 3).join(" | "));
      check(`${lang.toUpperCase()} ${page.label}: internal links stay in ${lang.toUpperCase()} (${expectedPrefix}…)`, wrongLang.length === 0, wrongLang.slice(0, 3).join(" | "));
      check(`${lang.toUpperCase()} ${page.label}: live-site links are absolute, outside /nl/ and not rewritten`, liveBad.length === 0, liveBad.slice(0, 3).join(" | "));

      // Logo / home link: first link of the header that is not a skip link.
      const brand = (res.body.match(/<a\b[^>]*class="fides-ds-site-header__brand"[^>]*>/i) || [""])[0];
      const brandHref = (brand.match(/\shref="([^"]*)"/) || [])[1] || "";
      const homeUrl = LAYOUT === "pilot" ? `${ORIGIN}${lang === "nl" ? "/nl" : ""}${HOME_PATH}/` : `${base}/`;
      if (LAYOUT !== "pilot") check(`${lang.toUpperCase()} ${page.label}: logo links to ${homeUrl}`, brandHref === homeUrl, brandHref);

      // Language switcher: same page in the other language, query string kept.
      const sw = switcherLinks(res.body);
      const other = sw.find((l) => l.lang === (lang === "nl" ? "en" : "nl"));
      const wantPath = page.path.replace(/#.*$/, "");
      const wantQuery = wantPath.includes("?") ? wantPath.slice(wantPath.indexOf("?")) : "";
      const wantBare = wantPath.replace(/\?.*$/, "");
      const otherBase = LAYOUT === "pilot" ? `${ORIGIN}${lang === "nl" ? "" : "/nl"}${HOME_PATH}${PILOT_PREFIX}` : `${lang === "nl" ? SITE : nlBase}`;
      check(
        `${lang.toUpperCase()} ${page.label}: switcher goes to the same page in ${lang === "nl" ? "EN" : "NL"}`,
        !!other && other.href.replace(/#.*$/, "") === `${otherBase}${wantBare}${wantQuery}`,
        other ? other.href : "no link"
      );
      check(`${lang.toUpperCase()} ${page.label}: switcher URLs have no doubled path`, sw.every((l) => !DOUBLED.test(l.href)), sw.map((l) => l.href).join(" "));
    }
    // Every distinct internal header/footer destination answers (GET, no redirect loop to a doubled path).
    const dead = [];
    for (const url of [...internalSeen].filter((u) => !/wp-login/.test(u))) {
      const res = await get(url.replace(/#.*$/, ""));
      if (res.status >= 400 || (res.status >= 300 && DOUBLED.test(res.location))) dead.push(`${res.status} ${url}`);
    }
    check(`${lang.toUpperCase()}: all ${internalSeen.size} internal header/footer destinations answer without error`, dead.length === 0, dead.slice(0, 5).join(" | "));
  }

  console.log(`\n# nl-links-checks pass ${pass} fail ${fail.length}`);
  if (fail.length) console.log(`failed: ${fail.join("; ")}`);
  process.exit(fail.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});

/** True when the href belongs to a language switcher link of the page. */
function isSwitcher(html, href) {
  return switcherLinks(html).some((l) => l.href === href);
}
