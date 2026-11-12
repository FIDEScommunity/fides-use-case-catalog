/**
 * Data check for the organisation filters used by the trust-service-providers article:
 * role=eidas_trust_service_provider (ecosystemRoleCodes) versus cert=qtsp (certifications[].code).
 * Reads the pilot's aggregate (read-only), mirrors the plugin matching (exact code equality) and prints counts,
 * the intersection, a spread sample and the "not matching" controls. Writes tests/output/org-qtsp-filter-expected.json
 * for the browser check. No network, no writes outside tests/output.
 * Run: node tests/org-qtsp-filter-data-check.cjs
 */
const fs = require("fs");
const path = require("path");
const PILOT = process.env.PILOT_ROOT || "/Users/victorvanderhulst/Projects/fides-design-pilot";
const FILE = process.env.AGGREGATE || path.join(PILOT, "organization-catalog/wordpress-plugin/fides-organization-catalog/data/aggregated.json"); // AGGREGATE: optional path to the live aggregate the page actually loads
const orgs = JSON.parse(fs.readFileSync(FILE, "utf8")).organizations;
const roleCodes = (o) => (Array.isArray(o.ecosystemRoleCodes) ? o.ecosystemRoleCodes.map(String) : []);
const certCodes = (o) => (Array.isArray(o.certifications) ? o.certifications.map((c) => c && c.code).filter(Boolean) : []);
const isRole = (o) => roleCodes(o).includes("eidas_trust_service_provider");
const isQtsp = (o) => certCodes(o).includes("qtsp");
const role = orgs.filter(isRole), qtsp = orgs.filter(isQtsp);
const both = orgs.filter((o) => isRole(o) && isQtsp(o)), either = orgs.filter((o) => isRole(o) || isQtsp(o));
const loose = orgs.filter((o) => JSON.stringify(o.certifications || []).toLowerCase().includes("qtsp"));
const slug = (o) => o.id.replace(/^org:/, "");
let failures = 0;
const check = (n, ok, d) => { if (!ok) failures += 1; console.log(`${ok ? "ok" : "not ok"} - ${n}${d ? ` (${d})` : ""}`); };
console.log(`organisations ${orgs.length}; role ${role.length}; qtsp ${qtsp.length}; both ${both.length}; role only ${role.length - both.length}; qtsp only ${qtsp.length - both.length}; either ${either.length}`);
console.log("role:", role.map((o) => `${slug(o)}[${certCodes(o).join(",")}]`).join(" "));
console.log("qtsp orgs that also have another role code:", qtsp.filter((o) => roleCodes(o).length).length, "| without any role code:", qtsp.filter((o) => !roleCodes(o).length).length);
const rolesAmongQtsp = {}; qtsp.forEach((o) => roleCodes(o).forEach((r) => { rolesAmongQtsp[r] = (rolesAmongQtsp[r] || 0) + 1; }));
console.log("role codes among QTSP orgs:", JSON.stringify(rolesAmongQtsp));
check("exact match equals substring match (no stray 'qtsp' strings)", loose.length === qtsp.length, `${loose.length} vs ${qtsp.length}`);
check("every QTSP org has evidence or trust services", qtsp.every((o) => o.certifications.some((c) => c.code === "qtsp" && (c.evidence || c.details))), qtsp.filter((o) => !o.certifications.some((c) => c.code === "qtsp" && (c.evidence || c.details))).map(slug).join(","));
const countries = {}; qtsp.forEach((o) => { countries[o.country || "-"] = (countries[o.country || "-"] || 0) + 1; });
console.log("QTSP by country:", JSON.stringify(countries));
const sorted = [...qtsp].sort((a, b) => a.name.localeCompare(b.name));
const pick = [0, 1, 25, 60, 100, 140, 180, 220, 260, sorted.length - 1].filter((i) => sorted[i]).map((i) => sorted[i]);
console.log("sample IN:");
for (const o of pick) console.log(`  ${slug(o)} | ${o.country} | roles [${roleCodes(o).join(",")}] | certs [${certCodes(o).join(",")}] | services ${((o.certifications.find((c) => c.code === "qtsp").details || {}).trustServices || []).length}`);
const neg = [
  ...orgs.filter((o) => isRole(o) && !isQtsp(o)).slice(0, 3),
  ...orgs.filter((o) => certCodes(o).length && !isQtsp(o)).slice(0, 3),
  ...orgs.filter((o) => roleCodes(o).includes("issuer") && !isQtsp(o)).slice(0, 2),
  ...orgs.filter((o) => !certCodes(o).length && !roleCodes(o).length).slice(0, 2),
];
console.log("sample OUT (cert=qtsp):");
for (const o of neg) console.log(`  ${slug(o)} | roles [${roleCodes(o).join(",")}] | certs [${certCodes(o).join(",")}] | in qtsp filter: ${isQtsp(o)}`);
check("controls are all outside the QTSP filter", neg.every((o) => !isQtsp(o)));
fs.mkdirSync(path.join(__dirname, "output"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "output/org-qtsp-filter-expected.json"), JSON.stringify({ role: role.map((o) => o.id), qtsp: qtsp.map((o) => o.id), both: both.map((o) => o.id), neg: neg.map((o) => o.id) }));
process.exit(failures ? 1 : 0);
