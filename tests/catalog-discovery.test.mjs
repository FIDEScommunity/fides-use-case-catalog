import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const testsDir = dirname(fileURLToPath(import.meta.url));
const repo = dirname(testsDir);
const plugin = join(repo, "wordpress-plugin/fides-use-case-catalog");
const js = readFileSync(join(plugin, "assets/usecase-catalog.js"), "utf8");
const css = readFileSync(join(plugin, "assets/style.css"), "utf8");
const php = readFileSync(join(plugin, "fides-use-case-catalog.php"), "utf8");
const ssr = readFileSync(join(plugin, "includes/class-fides-use-case-catalog-ssr.php"), "utf8");

test("listing paginates 24 items and keeps the page in the URL", () => {
  assert.match(js, /const LISTING_PAGE_SIZE = 24;/);
  assert.match(js, /const LISTING_PAGE_PARAM = "catalog_page";/);
  assert.match(js, /visibleSlice\(filtered\)/);
  assert.match(js, /data-fides-use-case-pagination/);
  assert.match(js, /history\.pushState/);
  assert.match(ssr, /const MAX_LISTING_ITEMS = 24;/);
});

test("recommended is the default persisted sort and rotates daily", () => {
  assert.match(js, /const SORT_STORAGE_KEY = "fides-use-case-sort-v2";/);
  assert.match(js, /: "recommended"/);
  assert.match(js, />Explore<\/option>/);
  assert.match(js, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/);
  assert.match(js, /winners: 2/);
  assert.match(js, /finalists: 4/);
  assert.match(js, /production: 12/);
  assert.match(js, /other: 6/);
  assert.match(js, /buildRecommendedOrder\(list, deferWithoutVisual\)/);
  assert.match(js, /localStorage\.setItem\(SORT_STORAGE_KEY/);
});

test("recommended page one defers cards without visual media", () => {
  assert.match(js, /function buildRecommendedOrder\(items, deferWithoutVisual\)/);
  assert.match(js, /items\.filter\(\(item\) => Boolean\(deriveCardImage\(item\)\)\)/);
  assert.match(js, /items\.filter\(\(item\) => !deriveCardImage\(item\)\)/);
  assert.match(js, /getActiveFilterCount\(\) === 0 && !filters\.search/);
  assert.match(js, /ordered\.recommendedFirstPageSize = firstPage\.length/);
  assert.match(js, /function paginationBounds\(items, page\)/);
});

test("awards are loaded from the central registry and exposed in listing UI", () => {
  assert.match(php, /'awardProgramKeys' => array\('gdt-2026', 'fides-community-2026'\)/);
  assert.match(js, /loadAwardRecognitions\(\)/);
  assert.match(js, /awardRecognitionsByUseCaseId/);
  assert.match(js, /renderListingAwardBadge/);
  assert.match(js, /awardRecognition: false/);
  assert.match(js, /"Award winners"/);
  assert.match(js, /"All finalists"/);
});

test("mobile award badge follows the card title without compressing it", () => {
  assert.match(js, /fides-use-case-hero-title[\s\S]*fides-use-case-award-placement/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.fides-use-case-award-placement\s*\{[\s\S]*position: static/);
  assert.match(css, /\.fides-use-case-hero-badges--like-only\s*\{[\s\S]*position: absolute/);
});

test("narrow mobile modal gives the title a full-width row above award metadata", () => {
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*grid-template-areas:\s*"logo actions"\s*"title title"\s*"meta meta"/);
  assert.match(js, /fides-modal-title[\s\S]*fides-modal-provider--usecase/);
});
