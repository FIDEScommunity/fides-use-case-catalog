=== FIDES Use Case Catalog ===
Contributors: fideslabs
Requires at least: 5.0
Tested up to: 6.7
Stable tag: 0.9.6
License: Apache-2.0
License URI: https://www.apache.org/licenses/LICENSE-2.0

Use case catalog renderer and WordPress submission flow.

== Changelog ==

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
