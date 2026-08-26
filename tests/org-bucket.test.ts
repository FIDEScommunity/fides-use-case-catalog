import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listingOrgId } from "../src/crawler/orgBucket.ts";
import type { ExportOrganization } from "../src/types/use-case.ts";

const root = dirname(fileURLToPath(import.meta.url));
const repo = dirname(root);

test("PHP org bucket uses the listing org, not organizations[0]", () => {
  const result = spawnSync("php", [join(repo, "tests/php/org-bucket.php")], {
    encoding: "utf8"
  });
  if (result.status !== 0) {
    assert.fail(result.stdout + result.stderr);
  }
});

const hopae: ExportOrganization = {
  orgSlug: "hopae",
  orgId: "org:google",
  orgName: "Hopae",
  useCases: [
    {
      id: "autofill-customer-id-on-trip-com-with-google-wallet-rJkmvE",
      title: "Autofill Customer ID on Trip.com with Google Wallet",
      summary: "…",
      organizationName: "Hopae",
      links: {
        organizations: [
          { refId: "org:google", labelRaw: "Google", source: "catalog" },
          { refId: "org:trip-com", labelRaw: "Trip.com", source: "catalog" },
          { refId: "org:hopae", labelRaw: "Hopae", source: "catalog" }
        ]
      }
    }
  ]
};

test("crawler listingOrgId matches the submitter, not the first partner", () => {
  assert.equal(listingOrgId(hopae), "org:hopae");
});

test("crawler listingOrgId falls back to org:{slug} when the listing org is not linked", () => {
  const first = hopae.useCases[0];
  assert.ok(first);
  const partnersOnly: ExportOrganization = {
    ...hopae,
    useCases: [
      {
        ...first,
        links: {
          organizations: [{ refId: "org:google", labelRaw: "Google", source: "catalog" }]
        }
      }
    ]
  };
  assert.equal(listingOrgId(partnersOnly), "org:hopae");
});
