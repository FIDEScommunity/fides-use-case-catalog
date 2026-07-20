=== FIDES Use Case Catalog ===
Contributors: fideslabs
Requires at least: 5.0
Tested up to: 6.7
Stable tag: 0.9.0
License: Apache-2.0
License URI: https://www.apache.org/licenses/LICENSE-2.0

Use case catalog renderer and WordPress submission flow.

== Changelog ==

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
