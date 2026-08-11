# FIDES Use Case Catalog

Developed and maintained by FIDES Labs BV.

**Repository:** [github.com/FIDEScommunity/fides-use-case-catalog](https://github.com/FIDEScommunity/fides-use-case-catalog)

Real-world verifiable-credential use cases, submitted through WordPress, published
per organization, and aggregated for the wider FIDES ecosystem. It follows the same
architecture as the other FIDES catalogs (wallet, issuer, credential, organization,
relying party): a git-versioned `data/aggregated.json` is the published source of
truth, consumed by the WordPress catalog UI, SSR/SEO layer, sitemap and catalog map.

## Data ownership model

The **GitHub-hosted `data/aggregated.json` is the source of truth** for published
use cases — not the WordPress database. Organizations can amend their own use cases
through a pull request against their per-organization source file. The WordPress
submission database is only the intake and moderation workspace.

```text
                 submit (form)                export REST              crawler (sync)
  Contributor ───────────────▶ WordPress DB ───────────────▶ community-catalogs/<org>/
                                  │  (moderation: received →        use-case-catalog.json
                                  │   approved → published)                  │
                                  │                                          │ aggregate + validate
   Organization ─── pull request ─┼──────────────────────────────────────────▼
                                  │                                   data/aggregated.json
                                  ▼                                    (GitHub, source of truth)
                          admin "Refresh from GitHub"                         │
                          (pull latest into local copy)                       │ fetch (cached, fail-safe)
                                                                              ▼
                                              WordPress catalog UI · SSR/SEO · sitemap · catalog map
```

- **Submission** → use cases enter via the WordPress form into the DB (`received`).
- **Moderation** → an admin moves a submission through `approved` → `published`.
- **Export** → the REST `/export` endpoint groups published use cases per organization.
- **Crawl/sync** → the crawler pulls `/export`, materializes one
  `community-catalogs/<org>/use-case-catalog.json` per organization (git-versioned
  backup + cross-catalog source), validates them, and aggregates everything into
  `data/aggregated.json`. A GitHub Action runs this daily and on push.
- **Pull request** → organizations can edit their per-organization source file directly;
  the crawler folds those edits into `aggregated.json`.
- **Consumption** → the WordPress catalog UI reads `aggregated.json` from GitHub raw
  (with the same-origin REST `/catalog` as a fallback for local/empty/unreachable
  situations). SSR, the sitemap and the catalog map read from the same source via the
  shared catalog core.
- **Admin refresh** → when a moderator opens a *published* use case, the admin screen
  pulls the latest committed version from GitHub and, if it differs, prefills the form
  with it; a "Refresh from GitHub" button overwrites the local copy on demand.

## Project structure

```text
fides-use-case-catalog/
├── schemas/
│   └── use-case-catalog.schema.json   # per-organization source-file schema
├── data/
│   └── aggregated.json                # published source of truth (generated)
├── community-catalogs/
│   └── <org-slug>/use-case-catalog.json   # per-organization source files (generated/PR)
├── src/
│   ├── types/use-case.ts              # crawler type definitions
│   └── crawler/index.ts               # sync + validate + aggregate pipeline
├── .github/workflows/
│   ├── crawl.yml                      # pull export → crawl → commit
│   ├── validate.yml                   # schema-validate source files on PR/push
│   └── check-links.yml                # weekly broken-link check + WP notify
├── scripts/
│   ├── check-links.ts                 # HEAD→GET linkcheck with retries
│   └── notify-broken-links.ts         # POST report to WordPress (no emails in payload)
└── wordpress-plugin/
    └── fides-use-case-catalog/        # submission form, catalog UI, SSR, admin
```

## Crawler

```bash
npm install
npm run crawl     # read community-catalogs/**, validate, write data/aggregated.json
npm run sync      # also pull the WordPress /export endpoint first (needs env)
npm run validate  # ajv-validate the per-organization source files
npm run check-links           # check URLs in data/aggregated.json
npm run notify-broken-links   # POST report to WP (needs URL+secret; or LINKCHECK_DRY_RUN=1)
```

The crawler pulls from WordPress when `USE_CASE_EXPORT_URL` is set (or `USE_CASE_SYNC=1`):

```bash
USE_CASE_EXPORT_URL="https://www.fides.community/wp-json/fides-use-case/v1/export" npm run crawl
```

It writes `data/aggregated.json` and a bundled copy inside the WordPress plugin
(`wordpress-plugin/fides-use-case-catalog/data/aggregated.json`).

## GitHub Actions

### Crawl

`.github/workflows/crawl.yml` runs on push to the export / per-organization source
files (and can be triggered manually). To enable a recovery HTTP pull, set the
repository variable:

- `USE_CASE_EXPORT_URL` → e.g. `https://www.fides.community/wp-json/fides-use-case/v1/export`

Without it the job still re-aggregates whatever is already committed.

### Check links

`.github/workflows/check-links.yml` runs every Monday (and on `workflow_dispatch`).
It:

1. Checks unique HTTP(S) URLs from `data/aggregated.json` (moreInfo, images, videos, linked entities).
2. Uploads a report artifact and updates/creates the open GitHub issue **Broken links report** (organization names + URLs only — **no email addresses**).
3. POSTs the report to WordPress `POST /wp-json/fides-use-case/v1/linkcheck-notify`. WordPress looks up each submitter’s `contact_email` in the DB and sends mail with FIDES in CC via `wp_mail`.

**GDPR:** submitter emails never appear in git, `aggregated.json`, GitHub issues, or CI artifacts. They stay in the WordPress database.

False-positive mitigations: HEAD with GET fallback, up to 3 retries on transient
errors, browser-like User-Agent, `Range: bytes=0-0` on GET, treating HTTP
401/403 as reachable (many CDNs/WAFs block bots), and treating persistent
429/503 after retries as soft-OK (temporary outage / throttle).

To enable submitter notify from Actions:

| Where | Name | Purpose |
| --- | --- | --- |
| GitHub **variable** | `LINKCHECK_NOTIFY_URL` | e.g. `https://fides.community/wp-json/fides-use-case/v1/linkcheck-notify` |
| GitHub **secret** | `LINKCHECK_NOTIFY_SECRET` | Shared secret (must match WordPress) |
| WordPress | `FIDES_USE_CASE_LINKCHECK_NOTIFY_SECRET` in `wp-config.php` **or** option `fides_use_case_catalog_linkcheck_notify_secret` | Same secret |

CC defaults to `catalog@fides.community` (filter: `fides_use_case_catalog_linkcheck_cc_email`).

Without the URL/secret, linkcheck + the GitHub issue still run; notify is skipped.

## WordPress plugin

The plugin under `wordpress-plugin/fides-use-case-catalog/`:

- renders the submission form and the catalog (list + grid + detail modal);
- exposes REST routes under `fides-use-case/v1` (`/catalog`, `/export`, `/submissions`, `/linkcheck-notify`, …);
- server-side renders detail pages for SEO (`Fides_Catalog_SSR_Renderer` subclass),
  contributes to the shared sitemap, and enriches schema.org JSON-LD;
- sends email notifications on submission, publication, and (secret) linkcheck;
- lets moderators refresh a published use case from the GitHub source.

It depends on `fides-community-tools-tiles ≥ 1.6.2` for the shared catalog core
(registry, source, SSR base class, sitemap, REST).

The GitHub aggregated URL is overridable through the
`fides_use_case_catalog_aggregated_url` filter.
