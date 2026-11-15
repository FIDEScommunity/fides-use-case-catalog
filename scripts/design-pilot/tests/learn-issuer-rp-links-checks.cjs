/**
 * The seven Learn articles with a link to the issuer or relying party catalog (commit 9aed33b, see
 * learn/continue-learning-selection.md, "Issuers and relying parties round"). No browser; runs in a few seconds.
 *
 * Source (learn/content/*.html + learn/manifest.json, no pilot needed):
 *  - each article exists in the manifest, has at most 3 "Learn more" links and at most 2 catalog links;
 *  - the expected catalog link ({{pilot}}/issuers/ "Browse issuers" or {{pilot}}/relying-parties/ "Browse relying parties") is there once.
 * Rendered (pilot running, GET only; skip with RENDER=0):
 *  - EN: the link is in the "Explore in the catalogs" group, label as in the source, href below /fides-design-pilot/ and not /nl/;
 *  - NL: label "Bekijk uitgevers" / "Bekijk vertrouwende partijen", href below /nl/fides-design-pilot/, no English catalog label left;
 *  - the target page answers 200 on both routes; at most 3 Learn more + 2 catalog links stay true after rendering.
 *
 * Run: node tests/learn-issuer-rp-links-checks.cjs   (env: PILOT_URL, RENDER=0 for the source part only)
 */
const fs = require("node:fs");
const path = require("node:path");

const ORIGIN = process.env.PILOT_URL || "http://localhost:10088";
const RENDER = process.env.RENDER !== "0";
const ROOT = path.join(__dirname, "..", "learn");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8")).pages;

const ISSUERS = { token: "{{pilot}}/issuers/", en: "Browse issuers", nl: "Bekijk uitgevers", route: "/fides-design-pilot/issuers/" };
const RPS = { token: "{{pilot}}/relying-parties/", en: "Browse relying parties", nl: "Bekijk vertrouwende partijen", route: "/fides-design-pilot/relying-parties/" };
const ARTICLES = [
  { path: "topics/ecosystem-roles/the-issuer", link: ISSUERS },
  { path: "topics/ecosystem-roles/the-relying-party", link: RPS },
  { path: "topics/for-businesses/issuing-credentials-for-wallets", link: ISSUERS },
  { path: "topics/for-businesses/accepting-information-from-a-wallet", link: RPS },
  { path: "topics/for-businesses/what-should-a-service-check-when-receiving-a-credential", link: RPS },
  { path: "topics/for-governments/issuing-public-information-to-wallets", link: ISSUERS },
  { path: "topics/for-governments/accepting-information-from-wallets-in-public-services", link: RPS },
];

// Documented exception (learn/continue-learning-selection.md, round 14 November 2026): a fourth Learn link the client asked for.
const FOUR_LEARN_LINKS = ["topics/for-businesses/issuing-credentials-for-wallets"];
const maxLearn = (p) => (FOUR_LEARN_LINKS.includes(p) ? 4 : 3);

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${!ok && detail !== undefined ? ` (${String(detail).slice(0, 300)})` : ""}`);
};
const anchors = (html) => [...html.matchAll(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], text: m[2].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() }));

/** Links of the two groups of the Continue learning section: [learnMore, catalogs]. */
function groupsOf(html, startMarker, groupMarker) {
  const i = html.indexOf(startMarker);
  if (i < 0) return null;
  const part = html.slice(i);
  const end = part.search(/<section class="fides-learn-sources"|<p class="fides-learn-note"/);
  const section = end > 0 ? part.slice(0, end) : part;
  const chunks = section.split(groupMarker).slice(1);
  return chunks.map((c) => anchors(c));
}

(async () => {
  for (const a of ARTICLES) {
    const page = manifest.find((p) => p.path === a.path);
    check(`${a.path}: is in the manifest as an article with a content file`, !!page && page.kind === "article" && !!page.content, JSON.stringify(page && page.content));
    if (!page) continue;
    const src = fs.readFileSync(path.join(ROOT, "content", page.content), "utf8");
    const tail = src.slice(src.indexOf('<h2 class="wp-block-heading">Continue learning</h2>'));
    const [learnPart, catalogPart] = tail.split(/<h3 class="wp-block-heading">Explore in the catalogs<\/h3>/);
    const learn = anchors(learnPart || "");
    const cats = anchors(catalogPart || "").filter((x) => x.href.startsWith("{{pilot}}"));
    check(`${a.path}: source has ${learn.length} Learn more link(s), at most ${maxLearn(a.path)}`, learn.length >= 1 && learn.length <= maxLearn(a.path), learn.length);
    check(`${a.path}: source has ${cats.length} catalog link(s), at most 2`, cats.length >= 1 && cats.length <= 2, cats.length);
    const hits = cats.filter((x) => x.href === a.link.token);
    check(`${a.path}: source has one "${a.link.en}" -> ${a.link.token}`, hits.length === 1 && hits[0].text === a.link.en, JSON.stringify(cats));
    check(`${a.path}: the source link is not duplicated in Learn more`, !learn.some((x) => x.href === a.link.token));
  }
  if (!RENDER) {
    console.log(failures ? `\n${failures} failed` : "\nall ok (source only)");
    process.exit(failures ? 1 : 0);
  }

  const get = async (url) => { const r = await fetch(url, { redirect: "manual" }); return { status: r.status, body: r.status === 200 ? await r.text() : "" }; };
  const targets = {};
  for (const lang of ["en", "nl"]) {
    for (const a of ARTICLES) {
      const url = `${ORIGIN}${lang === "nl" ? "/nl" : ""}/fides-design-pilot/learn/${a.path}/`;
      const r = await get(url);
      check(`${lang.toUpperCase()} ${a.path}: page answers 200`, r.status === 200, r.status);
      if (r.status !== 200) continue;
      const groups = groupsOf(r.body, '<section class="fides-learn-continue"', '<div class="fides-learn-continue__group">');
      check(`${lang.toUpperCase()} ${a.path}: Continue learning has a Learn more and a catalog group`, !!groups && groups.length === 2, groups && groups.length);
      if (!groups || groups.length !== 2) continue;
      const [more, cats] = groups;
      check(`${lang.toUpperCase()} ${a.path}: ${more.length} Learn more (max ${maxLearn(a.path)}) + ${cats.length} catalog links (max 2)`, more.length >= 1 && more.length <= maxLearn(a.path) && cats.length >= 1 && cats.length <= 2, `${more.length}+${cats.length}`);
      const want = lang === "nl" ? a.link.nl : a.link.en;
      const hit = cats.filter((x) => x.text === want);
      const expectedHref = (lang === "nl" ? "/nl" : "") + a.link.route;
      check(`${lang.toUpperCase()} ${a.path}: catalog group has "${want}" -> ${expectedHref}`, hit.length === 1 && hit[0].href === expectedHref, JSON.stringify(cats));
      if (lang === "nl") {
        const english = cats.filter((x) => /^(Browse|Explore)\b/.test(x.text));
        check(`NL ${a.path}: no English catalog label left`, english.length === 0, english.map((x) => x.text).join(" | "));
        const noPrefix = [...more, ...cats].filter((x) => x.href.startsWith("/fides-design-pilot/"));
        check(`NL ${a.path}: every Continue learning link keeps /nl/`, noPrefix.length === 0, noPrefix.map((x) => x.href).join(" | "));
      }
      if (hit[0]) targets[hit[0].href] = true;
    }
  }
  for (const href of Object.keys(targets)) {
    const r = await get(ORIGIN + href);
    check(`target ${href} answers 200`, r.status === 200, r.status);
  }
  console.log(failures ? `\n${failures} failed` : "\nall ok");
  process.exit(failures ? 1 : 0);
})();
