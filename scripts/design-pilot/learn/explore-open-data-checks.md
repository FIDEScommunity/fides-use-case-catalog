# Open data checks for Explore (status of 13 November 2026)

Two use case records say `productionDeployment: "yes"` while their own text, or the organisation's own pages, describe a pilot
or a testnet. Neither record was changed: no primary source states the value clearly enough (see "Result of the check").
Both stay open until the record owner confirms.

The schema (`schemas/use-case-catalog.schema.json`) allows `yes`, `no` and an empty value; there is no "pilot" value. The catalog shows
"in production, as reported by the organisation", so the value is the organisation's own statement.

## Record 1: Reusable KYC (Solidus Network)

| Item | Value |
|---|---|
| Record id | `reusable-kyc-on-open-standards-verify-once-present-anywhere-re-collect-nothing-JBaAQX` |
| File | `community-catalogs/solidus-network/use-case-catalog.json` (`"source": "wordpress"`, organisation `org:solidus-network`) |
| Field and value | `useCases[].productionDeployment` = `"yes"`, `status` = `published`, `updatedAt` = 2026-08-21T14:50:01+01:00 |
| Contradicting text | In the record's `summary`: "It runs today on a public testnet. The wallet is in beta. There is no production deployment and no external security audit." The `userJourney` says the credential goes to a wallet "in beta on testnet". |
| Primary sources tried | `https://docs.solidus.network/en` (reachable, "Last updated on October 8, 2026"): "The Solidus testnet is live with 5 validators", the RPC and bridge are "testnet", `wallet.solidus.network` is "live in self-labelled beta"; Verify and Identity are listed as "Live Products". `https://verify.solidus.network/` answers 200 with curl but the fetch tool got HTTP 500. |
| What it confirms | The operator describes a testnet and a beta wallet. It does not state "no production deployment" and it also lists Verify as a live product, so the value `yes` is not clearly refuted by that page, and `no` is not clearly confirmed. The record's own text (written by the submitter) says "no production deployment". |
| What is needed to confirm | A statement from Solidus Network whether any service issues credentials to real users outside the testnet (Verify is listed as live), plus whether the beta wallet counts as production use. |
| Who confirms | The record owner, Solidus Network (the account linked to `org:solidus-network` in the WordPress update form). Contact route: the update form of the record, not mail from here. |

## Record 2: Digital Certificate of Good Conduct (VOG) as a Verifiable Credential (Credenco / Justis)

| Item | Value |
|---|---|
| Record id | `digital-certificate-of-good-conduct-vog-as-a-verifiable-credential-yjw4BC` |
| File | `community-catalogs/credenco/use-case-catalog.json` (`"source": "wordpress"`, organisation `org:credenco`, partner `org:justis`) |
| Field and value | `useCases[].productionDeployment` = `"yes"`, `status` = `published`, `updatedAt` = 2026-08-31T08:07:36+01:00 |
| Contradicting text | In the record's `summary`: "Justis ... has been piloting the VOG as a verifiable credential together with Credenco", "Successfully piloted with sports associations" and "Justis is investigating the scenario's for digital issuance in the near future". |
| Primary source tried | `https://www.credenco.com/case/vog` (the record's `moreInfoUrl`, reachable): "Justis ... is piloting the digital issuance", "a controlled pilot in a production environment", "The pilot ran through autumn 2025, and evaluation and recommendations were completed in early 2026", "a clear path for Justis toward large-scale digital issuance from 2026 onward". `https://www.justis.nl/` answers 200 (no VOG credential statement looked for beyond the home page). |
| What it confirms | A pilot, run "in a production environment", evaluated in early 2026, large-scale issuance still ahead. That is neither a clear "yes" (regular production use) nor a clear "no", because "a pilot in a production environment" can be answered both ways. |
| What is needed to confirm | A decision on what "in production" means for this catalog (a controlled pilot in the live environment, or regular issuance to citizens) and a statement from Justis or Credenco whether the VOG credential is issued today outside the pilot. |
| Who confirms | Credenco (record owner, WordPress update form) together with Justis (Ministry of Justice and Security) as the issuing authority. |

## Result of the check (13 November 2026)

- Reusable KYC: not changed. The organisation's pages describe a testnet and a beta wallet, but also a live Verify service; no page says "no production".
- VOG: not changed. The organisation's page describes a pilot in a production environment; no page clearly says production or not production.
- No file under `community-catalogs/`, `data/aggregated.json` or `data/wp-export/` was edited.

## How to change a record afterwards without a date bump

Both records come from WordPress (`"source": "wordpress"`); the next WordPress sync overwrites the GitHub JSON. So the lasting fix is
made by the owner in the WordPress update form (value "No" or "Yes", saved by the owner), after which the normal sync/crawl brings it to
`community-catalogs/`.

A local change (for testing only, never pushed from here):

1. Edit only `useCases[].productionDeployment` of that record in `community-catalogs/<slug>/use-case-catalog.json` (`"no"` or `"yes"`).
2. Leave `updatedAt` and `publishedAt` as they are. The crawler sorts by `publishedAt || updatedAt`; changing them would reorder the listing and
   show a change date that the owner did not make. (The organisation catalog rule is the same: no `lastUpdated` bump on a cleanup.)
3. Validate with `npm run validate` and rebuild the aggregate with `npm run crawl` (the crawl writes `data/aggregated.json`), then check that the card text
   ("in production, as reported by the organisation" or "does not mark this use case as in production") and the Explore filter follow the value.
4. Update the explanatory text if it still contradicts the value (that text is also WordPress-managed).

The design pilot cards in Learn (VOG articles) read the record live; their Dutch production sentences exist for both values
("... is deze usecase in productie" / "... niet in productie").
