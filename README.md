# FIDES Use Case Catalog

Developed and maintained by FIDES Labs BV.

**Repository:** [github.com/FIDEScommunity/fides-use-case-catalog](https://github.com/FIDEScommunity/fides-use-case-catalog)

This repository contains the use-case catalog foundation for FIDES Community Awards.
It follows the same architecture pattern as other FIDES catalogs:

- machine-readable `data/aggregated.json`
- public read-only API under `api/public/*`
- WordPress plugin under `wordpress-plugin/fides-use-case-catalog/`

## MVP scope

- WordPress-first submission and review flow
- Optional catalog linking to wallets, issuers, credentials, organizations, and relying parties
- Single feed for all events, with event-specific themes
- Optional YouTube/Vimeo video URLs

## Project structure

```text
fides-use-case-catalog/
├── schemas/
│   └── use-case-catalog.schema.json
├── data/
│   └── aggregated.json
├── src/
│   ├── types/usecase.ts
│   └── crawler/index.ts
├── api/public/
│   ├── usecase.ts
│   ├── usecase/[id].ts
│   └── api-docs.ts
├── public/
│   ├── index.html
│   └── swagger.html
└── wordpress-plugin/
    └── fides-use-case-catalog/
```

## Scripts

- `npm install` - requires Node `24.x` (enforced by preinstall check)
- `npm run crawl` - build `data/aggregated.json` from an external source URL
- `npm run validate` - validate `data/aggregated.json` against schema
- `npm run build` - TypeScript check/build for `src/`
- `npm run sync-plugin-local` - sync `wordpress-plugin/fides-use-case-catalog/` to Local (`utrecht-demo`)

## Notes

- The WordPress plugin now includes:
  - submission shortcode `[fides_use_case_form]`
  - catalog shortcode `[fides_use_case_catalog]`
  - REST routes for `themes`, `lookups`, `submissions`, and `catalog` export
  - admin review page in `Tools -> Use Case Submissions`
  - simplified workflow statuses: `received -> approved -> published`
  - admin detail edit form before approval/publishing
  - optional admin-managed `Card image URL` to enrich catalog cards
- The API currently reads from `data/aggregated.json` and supports basic search/filter/pagination.
- Local sync defaults can be overridden with:
  - `USE_CASE_PLUGIN_SRC`
  - `USE_CASE_PLUGIN_DEST`

## WordPress form usage

- Default form (uses first configured event):
  - `[fides_use_case_form]`
- Pin the form to a specific event key:
  - `[fides_use_case_form event_key="fides-awards-2026-event-a"]`

Theme configuration is defined in `fides_use_case_catalog_events()` and can be overridden with the `fides_use_case_catalog_events` filter.
