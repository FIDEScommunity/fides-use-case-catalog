import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const root = dirname(fileURLToPath(import.meta.url));
const repo = dirname(root);
const plugin = join(repo, "wordpress-plugin/fides-use-case-catalog");
const require = createRequire(import.meta.url);
const FidesUseCaseId = require(join(plugin, "assets/use-case-id.js"));

const MIXED_IDS = [
  "trusted-service-assistant-IyxXZl",
  "samsung-sds-integrated-digital-wallet-b5dcHk",
  "end-to-end-digital-business-workflows-F665Dh",
  "altme-demo"
];

test("JS helper accepts mixed-case catalog ids", () => {
  for (const id of MIXED_IDS) {
    assert.equal(FidesUseCaseId.isValidId(id), true, id);
  }
  assert.equal(FidesUseCaseId.isValidId(""), false);
  assert.equal(FidesUseCaseId.isValidId("../x"), false);
  assert.equal(FidesUseCaseId.isValidId("has space"), false);
  assert.equal(FidesUseCaseId.isValidId("-leading"), false);
});

test("update form uses the shared id helper instead of a lowercase-only regex", () => {
  const form = readFileSync(join(plugin, "assets/usecase-form.js"), "utf8");
  assert.match(form, /FidesUseCaseId\.isValidId/);
  assert.doesNotMatch(form, /\/\^\[a-z0-9\]\[a-z0-9\._-\]\*\$\/(?!i)/);
});

test("PHP REST route uses the case-sensitive id pattern constant", () => {
  const php = readFileSync(join(plugin, "fides-use-case-catalog.php"), "utf8");
  assert.match(php, /FIDES_USE_CASE_ID_ROUTE_PATTERN/);
  assert.doesNotMatch(
    php,
    /\/submissions\/\(\?P<use_case_id>\[a-z0-9\]/
  );
  const sanitize = readFileSync(join(plugin, "includes/use-case-id.php"), "utf8");
  assert.doesNotMatch(sanitize, /strtolower\s*\(/);
});

test("PHP share redirect only matches exact listing paths", () => {
  const php = readFileSync(join(plugin, "fides-use-case-catalog.php"), "utf8");
  assert.match(php, /fides_use_case_catalog_is_listing_request_path/);
  const result = spawnSync("php", [join(repo, "tests/php/run.php")], {
    encoding: "utf8"
  });
  if (result.status !== 0) {
    assert.fail(result.stdout + result.stderr);
  }
});

test("SSR VideoObject uses the shared helper instead of a partial object", () => {
  const ssr = readFileSync(join(plugin, "includes/class-fides-use-case-catalog-ssr.php"), "utf8");
  assert.match(ssr, /fides_use_case_catalog_video_object_for_jsonld/);
  assert.doesNotMatch(ssr, /'contentUrl'\s*=>\s*\(string\)\s*\$video\['url'\]/);
});
