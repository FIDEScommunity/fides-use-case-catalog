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
