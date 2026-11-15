# Issuers and relying parties: destinations (local and staging)

Status 15 November 2026. Local only; nothing was changed on staging and nothing was submitted.

## Local pilot (http://localhost:10088)

| Element | EN destination | NL destination | Checked |
|---|---|---|---|
| Breadcrumb "Ecosystem Explorer" | `/explorer/` | `/nl/explorer/` | HTTP 200 both. The guard filter `fides_site_shell_url` in `fides-design-pilot-guard.php` maps the live path `/ecosystem-explorer/` to the local explorer page `/explorer/`. |
| Breadcrumb "Issuers" / "Relying parties" | `/fides-design-pilot/issuers/`, `/relying-parties/` | same under `/nl/` | 200 |
| Add issuer | `/issuers-submit/` | `/nl/issuers-submit/` | 200 (sign-in gate or form; not submitted) |
| Update issuer | `/issuers-update/` | `/nl/issuers-update/` | 200 |
| Add relying party | `/relying-parties-submit/` | `/nl/relying-parties-submit/` | 200 |
| Update relying party | `/relying-parties-update/` | `/nl/relying-parties-update/` | 200 |
| View organization (record) | `/fides-design-pilot/organization/?org=...` | same under `/nl/` | keeps `/nl/` |

The add buttons come from the shortcode attribute `add_url="{{site}}/issuers-submit/"` (and `relying-parties-submit`) in `create-pages.php`. The update buttons use the matching `-update/` pages. Those form pages are existing pages of the site, not pilot pages; `create-pages.sh` does not create them.

## Staging

- **Explorer breadcrumb:** the live path is `/ecosystem-explorer/`. The package has no explorer page of its own (see `HANDOVER.md`, navigation table), so the guard filter is what decides the target. On staging, keep the filter consistent with the page that exists: if staging has `/ecosystem-explorer/`, remove the local mapping to `/explorer/`; otherwise the breadcrumb falls back to `https://fides.community/ecosystem-explorer/`. Check this once after the package is installed.
- **Add and update:** `{{site}}` expands to the staging site. The pages `/issuers-submit/`, `/issuers-update/`, `/relying-parties-submit/` and `/relying-parties-update/` must exist on staging (they are WPForms pages of the full site). If one is missing, the button leads to a 404; create or map the page before the seed.
- **Catalog pages:** `/fides-design-pilot/issuers/` and `/relying-parties/` come from `create-pages.sh`. The Learn links "Browse issuers" and "Browse relying parties" (`{{pilot}}/issuers/`, `{{pilot}}/relying-parties/`) are only valid where these pages exist. Run the Learn seed with `LEARN_DRY_RUN=1` first, read `skipped-edited` and `skipped-unmarked`, never `LEARN_FORCE`. A page edited by hand on staging is skipped: add the catalog link by hand (list in `learn/continue-learning-selection.md`, "Issuers and relying parties round").

## Cross-links between catalogs (checked locally, EN and NL, 1440 and 390 px)

- Issuer record -> credential type (`/credential/?credential=`) -> back to the issuer record (browser Back and the page link).
- Relying party record -> credential type -> relying party list or record.
- Credential type -> issuers and relying parties that use it (`tests/run-issuer-rp-checks.sh`, section "route").
- All links keep the `/nl/` prefix on the Dutch route.

## Follow-up check for the next staging package (15 November 2026, afternoon)

Derived from the repository only (`fides-design-pilot-guard.php`, `staging/fides-design-review-config.php`, `staging/preflight.php`, `staging/HANDOVER.md`, `create-pages.php`) and GET requests to the local pilot. Nothing on staging was touched, nothing was submitted.

### What the package must provide

| Destination | Local pilot | Seeded by the package? | Needed on the review site |
|---|---|---|---|
| `/design-review/issuers/`, `/issuer/`, `/relying-parties/`, `/relying-party/` (catalog and record pages) | exist (`create-pages.php`, lines for issuer and RP) | **yes**, by `create-pages.php` (`seed.sh`) | present after the seed; the issuer and relying party plugins must be in the package |
| `/issuers-submit/`, `/issuers-update/`, `/relying-parties-submit/`, `/relying-parties-update/` | exist (existing site pages, 200, sign-in gate when logged out) | **no** | **missing**: the Add and Update buttons use `{{site}}/issuers-submit/` etc. (shortcode `add_url`, `FIDES_ISSUER_CATALOG_DEFAULT_UPDATE_FORM_PATH` = `/issuers-update/`, `FIDES_RP_CATALOG_DEFAULT_UPDATE_FORM_PATH` = `/relying-parties-update/`). On the standalone site they are 404 unless created. |
| Guard mapping `/ecosystem-explorer/` -> `/explorer/` | exists in guard and config; `/explorer/` is a page of the full site | no (`explorer` is only a WARN in `preflight.php`) | the config falls back to `https://fides.community/ecosystem-explorer/` when `/explorer/` does not exist (HANDOVER: "not on this site"); no action. The earlier remark in this file ("remove the local mapping") is not needed: the target is `/explorer/`, not `/ecosystem-explorer/`. Only an unrelated page `/explorer/` on staging would change the target. |
| `/issuer-catalog/`, `/relying-party-websites/` (existing modal listings) | exist locally | no | only a WARN dependency in `preflight.php`; not used by the pilot pages |
| Contribute / Update pages of other catalogs (`organizations-submit/-update`, `use-case-form`, `wallet-submit`, `credential-submit`, `wallets-update`, `credentials-update`) | exist | yes, listed in `$seeded_here` of `preflight.php` | already handled |

### Gaps to fix in the next package (not changed now)

1. **Route map drift.** `fides-design-pilot-guard.php` and `staging/fides-design-review-config.php` differ in four shell paths, which `staging/verify-package.sh` ("route map parity") reports:
   - `/ecosystem-explorer/issuer-catalog/`: guard `{pilot}/issuers/`, config `/issuer-catalog/` (the existing modal listing);
   - `/ecosystem-explorer/relying-party-catalog/`: guard `{pilot}/relying-parties/`, config `/relying-party-websites/`;
   - `/ecosystem-explorer/themes/` and `/ecosystem-explorer/sectors/`: in the guard only (Explore round; owned by the Themes & Sectors work, not changed here).
   HANDOVER section 5 says the shell paths lead to the pilot pages, so the config should follow the guard.
2. **Form pages.** Add `issuers-submit`, `issuers-update`, `relying-parties-submit` and `relying-parties-update` to the seeded or documented destinations: either seed them like `organizations-submit` (with the WPForms shortcodes `Fides_Issuer_Catalog_Submission_Forms` and `Fides_RP_Catalog_Submission_Forms` render, sign-in gate when logged out) or add them to `preflight.php` (`$deps`) as WARN so the missing buttons are noticed before the review. A review site without a login has no use for the forms; then pass `add_url=""` is not possible without changing the seed, so the realistic choice is a seeded page that shows the sign-in gate, or accepting a 404 behind the button and saying so in the HANDOVER.
3. **HANDOVER "Pages seeded" list** (section 4) is out of date: it does not name `issuers`, `issuer`, `relying-parties`, `relying-party` (nor the Explore pages). Update it from the page list of `create-pages.php` when the package is built.
4. **NL on the review site.** The Dutch rows of the two catalogs are now in `learn/nl-translations.json` (groups `issuers` and `relying-parties`; see `learn/nl-translation-changes-issuers-rp-followup-2026-11-15.md`). Import with `nl-translations-transfer.php import-apply` after opening the pages once under `/nl/`; empty rows only.
5. **Page titles of the four form pages** are English on `/nl/` ("Issuer submit", "Issuer update", "Relying parties – submit", "Relying parties – update"); they are site pages and not part of the pilot.

### Checked locally (GET only, EN and NL)

`/issuers-submit/`, `/issuers-update/`, `/relying-parties-submit/`, `/relying-parties-update/` (also with `?issuer=` and `?rp=`), `/explorer/`, `/issuer-catalog/`, `/relying-party-websites/`: all 200 on both routes; the four form pages show the sign-in gate and no form for a logged-out visitor.
