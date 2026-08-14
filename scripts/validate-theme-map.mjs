import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const aggregatePath = path.join(root, "data", "aggregated.json");
const mapPath = path.join(
  root,
  "wordpress-plugin",
  "fides-use-case-catalog",
  "data",
  "use-case-theme-map.json",
);

const aggregate = JSON.parse(fs.readFileSync(aggregatePath, "utf8"));
const config = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const items = Array.isArray(aggregate.useCases) ? aggregate.useCases : [];
const bundles = Array.isArray(config.bundles) ? config.bundles : [];
const assignments =
  config.assignments && typeof config.assignments === "object"
    ? config.assignments
    : {};

const allowedThemes = new Set([
  "person_identity",
  "organizational_identity",
  "payments",
  "compliance_reporting",
  "trade_documents",
  "education",
  "digital_product_passports",
  "dataspaces",
  "agentic_ai",
]);
const publishedIds = new Set(items.map((item) => item.id).filter(Boolean));
const mappedIds = new Set(Object.keys(assignments));
const errors = [];

function themesFor(item) {
  const embedded = Array.isArray(item?.themes) ? item.themes : [];
  return embedded.length > 0 ? embedded : (assignments[item?.id] || []);
}

for (const item of items) {
  const themes = themesFor(item);
  if (themes.length === 0) errors.push(`Published use case has no themes: ${item.id}`);
  for (const theme of themes) {
    if (!allowedThemes.has(theme)) errors.push(`Unknown theme "${theme}" on ${item.id}`);
  }
}
for (const id of mappedIds) {
  if (!publishedIds.has(id)) errors.push(`Theme mapping points to a missing use case: ${id}`);
  const themes = Array.isArray(assignments[id]) ? assignments[id] : [];
  if (themes.length === 0) errors.push(`Use case has no canonical themes: ${id}`);
  for (const theme of themes) {
    if (!allowedThemes.has(theme)) errors.push(`Unknown theme "${theme}" on ${id}`);
  }
}

const bundleCodes = new Set();
for (const bundle of bundles) {
  if (!bundle || !bundle.code) {
    errors.push("Homepage bundle is missing a code");
    continue;
  }
  if (bundleCodes.has(bundle.code)) errors.push(`Duplicate homepage bundle: ${bundle.code}`);
  bundleCodes.add(bundle.code);
  const themeCodes = Array.isArray(bundle.themeCodes) ? bundle.themeCodes : [];
  if (themeCodes.length === 0) errors.push(`Homepage bundle has no canonical themes: ${bundle.code}`);
  for (const theme of themeCodes) {
    if (!allowedThemes.has(theme)) errors.push(`Unknown theme "${theme}" in bundle ${bundle.code}`);
  }
}

const uncovered = items.filter((item) => {
  const themes = themesFor(item);
  return !bundles.some((bundle) =>
    (bundle.themeCodes || []).some((theme) => themes.includes(theme)),
  );
});
if (uncovered.length > 0) {
  errors.push(
    `Use cases not reachable through a homepage bundle: ${uncovered
      .map((item) => item.id)
      .join(", ")}`,
  );
}

if (errors.length > 0) {
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const counts = Object.fromEntries(
  bundles.map((bundle) => [
    bundle.code,
    items.filter((item) =>
      (bundle.themeCodes || []).some((theme) =>
        themesFor(item).includes(theme),
      ),
    ).length,
  ]),
);

console.log(
  `Theme map valid: ${items.length} use cases, ${bundles.length} homepage bundles.`,
);
console.log(counts);
