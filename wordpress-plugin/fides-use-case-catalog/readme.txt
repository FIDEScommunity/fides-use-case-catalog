=== FIDES Use Case Catalog ===
Contributors: fideslabs
Requires at least: 5.0
Tested up to: 6.7
Stable tag: 0.13.1
License: Apache-2.0
License URI: https://www.apache.org/licenses/LICENSE-2.0

Use case catalog renderer and WordPress submission flow.

Homepage discovery:

`[fides_use_case_discovery]`

Renders dynamic use-case, country, organization and production counts; six
theme links into the filtered Use Case Explorer; and a compact explanation of
how use cases connect the other FIDES catalogs. Ask FIDES remains a separate
shortcode.

== Changelog ==

= 0.13.1 =
* Explain in the review screen that canonical themes feed the six visitor-friendly homepage bundles and preserve flexible future grouping.

= 0.13.0 =
* Let reviewers assign one or more canonical themes in the submission review screen, require themes before publication, and publish them with each use case.
* Seed existing WordPress records from the legacy theme map and prefer item-level themes in discovery and catalog filtering.

= 0.12.3 =
* Add an information popup to the Theme filter explaining the classification and each of the six theme bundles.

= 0.12.2 =
* Open Sector and collapse Theme by default; reverse those defaults when entering through a theme deeplink.

= 0.12.1 =
* Keep the single-choice theme filter as radio options and collapse the Sector filter by default.

= 0.12.0 =
* Move theme selection into the filter sidebar as a single-choice filter with all six themes, live counts, URL synchronization, and an “All themes” option.

= 0.11.10 =
* Vertically center the ampersand between the complete Personal Wallets and Business Wallets items.

= 0.11.9 =
* Use plural wallet labels and visually group Personal Wallets and Business Wallets with an ampersand.

= 0.11.8 =
* Vertically center the organization-role separator against the ecosystem icons.

= 0.11.7 =
* Replace the organization-role separator glyph with a taller line aligned to the ecosystem icons.

= 0.11.6 =
* Position organizations as actors behind ecosystem roles: separate them from the issuer-to-relying-party flow with a divider on desktop and a context row on mobile.

= 0.11.5 =
* Point the discovery link directly to `/ecosystem-explorer/` instead of the explanatory topic page.

= 0.11.4 =
* Keep the Ecosystem Explorer link in the FIDES accent color on hover and keyboard focus.

= 0.11.3 =
* Shorten the KPI heading to “At a glance” and link the ecosystem explanation to the full Ecosystem Explorer.

= 0.11.2 =
* Add a matching “Use cases at a glance” heading above the KPI column.

= 0.11.1 =
* Preserve the ecosystem-flow arrows on mobile with a compact snake layout: left-to-right, down, then right-to-left.

= 0.11.0 =
* Compact the ecosystem explanation on narrow screens into a three-column, two-row layout.

= 0.10.9 =
* Keep all four KPIs in one compact row on narrow screens and remove unused responsive grid rows.

= 0.10.8 =
* Hide theme icons from 1100px downward to prevent narrow cards from becoming unnecessarily tall.

= 0.10.7 =
* Hide theme icons on narrower screens and align the KPI column precisely with the top of the theme cards.

= 0.10.6 =
* Align KPI and theme-grid heights, apply FIDES colors to the KPIs, constrain the section width, and normalize link and ecosystem-flow alignment.

= 0.10.5 =
* Use a compact desktop overview with four stacked KPIs beside the two-by-three theme grid.

= 0.10.4 =
* Keep the overarching use-case label fully inside its frame.

= 0.10.3 =
* Remove interaction from the overarching use-case label and name both wallet links directly instead of using a floating group label.

= 0.10.2 =
* Visualize the real-world use case as a compact overarching layer around the left-to-right ecosystem flow, with personal and business wallets grouped as one step.

= 0.10.1 =
* Make the homepage discovery KPIs more compact and enlarge the theme icons.
* Present a use case as the collection of its ecosystem components and link every component to its catalog using the established FIDES icons.

= 0.10.0 =
* Add `[fides_use_case_discovery]` for the homepage with dynamic KPIs, six canonical theme bundles, filtered Explorer links, and an ecosystem relationship explainer.
* Keep the editorial use-case-to-theme mapping in one versioned JSON file and expose the same mapping to the catalog UI for `?theme=` deeplinks.

= 0.9.6 =
* Submission review notices use Settings → FIDES Catalog SEO → Submission notify emails (comma-separated To + CC) when fides-community-tools-tiles ≥ 1.9.12 is present; empty option still falls back to admin_email. Filter fides_use_case_catalog_admin_notification_email still accepts a single address or a comma-separated list.

= 0.9.5 =
* Admin submissions list: default to Pending review (received + approved), with filters for Received / Approved / Published / All statuses, lean column queries, and pagination (50 per page) — same pattern as Catalog Submissions.
* Hide Approve / Publish action buttons when the submission already has that status.

= 0.9.4 =
* Submission form: character counters on Description and How it works (same pattern as organization catalog).
* Sync shared FidesCatalogUI stylesheet from canonical source.
* Linkcheck notify: secret REST route `POST /linkcheck-notify` emails submitters about broken links (contact emails stay in the WordPress DB; never exported to GitHub).

= 0.9.3 =
* Fix KPI strip layout: add `display: grid` on `.fides-kpi-row` so stats stay in a row without relying on credential-catalog CSS loaded site-wide.

= 0.9.2 =
* Default catalog / detail path is `/ecosystem-explorer/use-cases/` (was `/use-cases/`), matching production.

= 0.9.1 =
* Mobile filters: keep the drawer open when expanding groups or selecting options; keep body scroll lock in sync via shared FidesCatalogUI mobile filters controller.

= 0.9.0 =
* GitHub sync: publish/save now commits the full export to data/wp-export/use-case.json via the GitHub Contents API (requires fides-community-tools-tiles >= 1.8.24) instead of a repository_dispatch payload, removing the ~65 KB dispatch cap that silently blocked large use-case exports. Crawl workflow triggers on that commit and reads the file locally (no HTTP pull, no WAF).
* GitHub sync failures (push sync disabled, missing PAT, export too large) now surface as an admin notice and error_log entry instead of failing silently.

= 0.8.10 =
* Card hero titles: clamp to 3 lines with slightly smaller type on narrow viewports; hide card summaries on mobile so long titles stay inside the 16:9 media frame.

= 0.8.9 =
* Media aspect ratio standardized to 16:9 across form preview, catalog cards, detail modal, and admin thumbs (was mixed 16:7 / fixed heights).

= 0.8.8 =
* Modal media gallery: support YouTube Shorts URLs (and embed/youtu.be) using the same video ID parser as wallet/org catalogs.

= 0.8.7 =
* Use case detail modal: restore subtle Last updated footer; dates use the browser locale.

= 0.8.6 =
* Ecosystem model modal section: add Explain link to the FIDES Ecosystem Explorer (same as RP catalog).

= 0.8.5 =
* Mobile detail modal: uniform floating card shape and title size (aligned with other FIDES catalogs).
* Modal header meta (sector · country) on one line with full-width layout under action buttons on narrow viewports.
* Plugin header and `FIDES_USE_CASE_CATALOG_VERSION` constant aligned (fixes prior 0.8.4 / 0.8.8 mismatch).
