=== FIDES Use Case Catalog ===
Contributors: fideslabs
Requires at least: 5.0
Tested up to: 6.7
Stable tag: 0.20.39
License: Apache-2.0
License URI: https://www.apache.org/licenses/LICENSE-2.0

Use case catalog renderer and WordPress submission flow.

Homepage discovery:

`[fides_use_case_discovery]`

Renders dynamic use-case, country, organization and production counts; six
theme links into the filtered Use Case Explorer; and a compact explanation of
how use cases connect the other FIDES catalogs.

== Changelog ==

= 0.20.39 =
* Truncate long organisation names in the modal “Organisations involved” chips so they stay inside the viewport.
* Sync shared modal UI library (tiles ≥ 1.13.18): Use cases accordion scroll arrows overlay the cards on narrow screens.

= 0.20.38 =
* Sync shared modal UI library (tiles ≥ 1.13.17): Use cases accordion scrolls when more than two cases are linked.

= 0.20.37 =
* Keep the detail modal within the viewport when a use case has many videos or a YouTube embed (Honduras-style media carousel).

= 0.20.36 =
* Sync shared modal UI library (tiles ≥ 1.13.15): Use cases accordion two-column layout on narrow screens.

= 0.20.35 =
* Complete VideoObject JSON-LD (thumbnailUrl, description, uploadDate, embedUrl) so Google Search Console no longer flags missing video fields. Omit the node when a thumbnail cannot be derived.

= 0.20.34 =
* Keep modal media at a compact 240 px height and show complete use-case images without cropping.

= 0.20.33 =
* Keep `?usecase=` on the update form: the share redirect now only runs on catalog listing URLs, so Suggest an update stays on `/update-use-case/`. Accept mixed-case use-case ids in the update form and REST lookup.

= 0.20.32 =
* Compress the branded Open Graph fallback (JPEG ~59 KB instead of a 645 KB PNG).

= 0.20.31 =
* Share cards use the use-case image when present (branded OG image is the fallback). Requires fides-community-tools-tiles ≥ 1.13.6 so LinkedIn oEmbed also returns the item title instead of “Use Cases”.

= 0.20.30 =
* Share and SEO URLs are now `/use-case/{id}/` (unique path, no `?usecase=`). LinkedIn crawlers were ignoring the query string and showing the listing title “Use Cases”. Old `?usecase=` links still open the modal. Requires fides-community-tools-tiles ≥ 1.13.5. Flush permalinks once after update.

= 0.20.29 =
* Activate the use-case modal share button: LinkedIn + Copy link popover on desktop, native share on mobile, canonical `?usecase=` URLs, Matomo `share_use_case`, and a branded Open Graph fallback image.

= 0.20.28 =
* Sync shared catalog UI: use-case cards in catalog modals.
* Accept canonical taxonomy `theme=` query values (e.g. `payments`) from Ecosystem Explorer tiles and map them onto the matching discovery bundle.

= 0.20.27 =
* Count the Involved organisations KPI from unique `links.organizations`
  (catalog links and free-text names), not unique submitting organizations.

= 0.20.26 =
* Matomo funnel: use-case modal opens send Modal Open with use_case_id; organisation
  chips pass from=usecase:{id} and normalised Organisation Click names.

= 0.20.25 =
* Wire Matomo click tracking for Use Case Discovery (themes + view all).

= 0.20.24 =
* Tighten top padding in Organisations involved panel to match the bottom.

= 0.20.23 =
* Organisation chip hover matches ecosystem model (border ring, no lift).

= 0.20.22 =
* Fix organisation chips: light readable pills on the fides/light modal theme.

= 0.20.21 =
* Organisations involved block more visible: tinted panel, stronger catalog chips.

= 0.20.20 =
* Use case modal: clearer Organisations involved block with catalog chips (→)
  first, non-catalog orgs last; Matomo Organisation Click funnel event.

= 0.20.19 =
* Official listing badge requires explicit catalogTier Pro; curated Community
  can keep full fields via catalogListingDepth (tiles ≥ 1.10.0).

= 0.20.18 =
* After sign-in, Back from the logged-in page reloads a stale guest catalog
  snapshot so the like star sees the session (needs tiles ≥ 1.9.23).

= 0.20.17 =
* After magic-link sign-in, Back reloads a cached logged-out catalog page so
  the like star sees the new session.

= 0.20.16 =
* Keep the ecosystem explanation above the catalog flow at every viewport
  width.

= 0.20.15 =
* Give the ecosystem connection block more desktop separation from the theme
  grid (spacing, accent edge, soft gradient) so it reads like the mobile layout.

= 0.20.14 =
* Spell out the discovery KPI as Involved organisations.

= 0.20.13 =
* Store submission summary and How it works as plain text so ampersands are not
  double-escaped as &amp; in the catalog modal.

= 0.20.12 =
* Place the At a glance KPIs above the theme grid on all screen sizes.

= 0.20.11 =
* Rename the Business & Authority theme to Business & Mandates and label the
  discovery KPI as Involved orgs.

= 0.20.10 =
* After GitHub fails, use a 12-hour browser cache and the WP last-known-good aggregated feed before the bundled plugin snapshot.

= 0.20.9 =
* Show a dismissible notice when GitHub catalog data is unreachable and the plugin snapshot is used.

= 0.20.8 =
* Vertically center mobile timeline numbers beside their corresponding rows.

= 0.20.7 =
* Remove the ampersand between personal and business wallets in the mobile
  ecosystem timeline.

= 0.20.6 =
* Replace the compact mobile ecosystem diagram with a readable, numbered
  vertical timeline that remains visually distinct from the theme cards.

= 0.20.5 =
* Improve mobile discovery readability with single-column theme cards and
  larger KPI labels, descriptions, counts, and links. Desktop styling is unchanged.

= 0.20.4 =
* Preserve the original submitter contact email when publishing an update
  proposal; only fall back to the updater’s email if the published row has none.
* Clarify in the admin form that Contact email is editable for corrections.

= 0.20.3 =
* Tools → Use Case Submissions list: show submitter email as a column.

= 0.20.2 =
* Tools → Use Case Submissions: show unique submitter contact emails for the
  current list filter in a copyable, Outlook-friendly (semicolon-separated)
  field so moderators need not open each submission.

= 0.16.2 =
* Remove WordPress theme margin from the modal accordion stack when related
  suggestions are disabled.

= 0.16.1 =
* Remove the extra modal footer spacing when related use case suggestions are
  disabled.

= 0.16.0 =
* Add a WordPress setting to enable or disable related use case suggestions in
  the modal.

= 0.15.3 =
* Keep the country next to the sector in the use-case modal header on smaller
  screens.

= 0.15.2 =
* Rename the modal recommendation section to “You may also be interested in”.

= 0.15.1 =
* Separate similar use cases with a light-grey panel and show two compact
  columns on mobile.

= 0.15.0 =
* Add three similar use cases at the bottom of the modal, ranked by shared
  visitor theme, credential, wallet, organisation and sector.

= 0.14.12 =
* Keep the discovery “View all” link blue across WordPress themes and align the
  theme cards with the KPI column.

= 0.14.11 =
* Add spacing between modal theme buttons and a dynamic “View all use cases”
  link beside the discovery theme heading.

= 0.14.10 =
* Keep Submitted by directly after Sector, render modal themes as filter
  buttons, and prefill themes for new and existing update proposals.

= 0.14.9 =
* Link the submitting organization to its catalog entry when a matching
  organization reference is available, and show visitor-facing themes in use
  case details.

= 0.14.8 =
* Reduce excess vertical space inside two-column theme cards on narrow screens.

= 0.14.7 =
* Invert the Ask FIDES button on hover to a white surface with FIDES-blue text.

= 0.14.6 =
* Compact narrow-screen discovery with two-by-two KPIs, two-column theme cards,
  a shorter Production label, and a right-aligned Credentials flow step.

= 0.14.5 =
* Use a use-case-specific placeholder when the listing opens Ask FIDES.

= 0.14.4 =
* Use the FIDES accent blue for the Ask FIDES button and simplify the separator
  label from “…or” to “or”.

= 0.14.3 =
* Place “…or” outside the Ask FIDES control and use a filled compact button so
  the action no longer resembles a text input.

= 0.14.2 =
* Give the Ask FIDES listing action a compact bordered button treatment while
  preserving the homepage wordmark styling.

= 0.14.1 =
* Match the homepage Ask FIDES wordmark in the listing action with black text
  and bold emphasis on “FIDES”.

= 0.14.0 =
* Added an “…or Ask FIDES” action beside the listing search field when the
  FIDES Assistant plugin is active.
* Reuses a launcher-free assistant instance and prefills the chat composer with
  the current catalog search without submitting it automatically.

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
