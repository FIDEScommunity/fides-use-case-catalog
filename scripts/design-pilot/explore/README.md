# Explore by theme and sector (local design pilot only)

Pages: `/fides-design-pilot/themes/` and `/fides-design-pilot/sectors/` (Dutch: `/nl/fides-design-pilot/…`). Menu: Explore > Themes, Explore > Sectors (tiles `class-fides-ds-site-shell.php`, items flagged `proposed`, mapped in the guard mu-plugin).
Countries is not part of this work. Nothing here is in the staging package yet.

## URLs
- `?theme=<bundle code>`: `identity_access`, `business_authority`, `payments_commerce`, `work_qualifications`, `products_trade_supply_chains`, `government_compliance`.
- `?sector=<slug>`: the 14 assignable sectors (`agriculture` … `trade`). "Other" is never offered.
- An unknown slug (or `other`) shows the no-choice state with a notice. Without JavaScript the choices are plain links and the overview is server rendered.

## Editing the introduction and image (WordPress)
Every choice has one page (slug `explore-theme-<slug>` / `explore-sector-<slug>`, child of the pilot parent page, meta `_fides_explore_choice`).
1. Pages > search "explore-" (or the choice name) > edit.
2. Title = heading, content = introduction (plain paragraphs), featured image = picture next to the introduction (optional; no image = no picture).
3. Update. The seed marks the page as edited (`skipped-edited`) and never overwrites it. Never use force.
4. Visiting such a page directly redirects to the choice URL.
Seed: `EXPLORE_DRY_RUN=1 ./create-explore-pages.sh` first, then `./create-explore-pages.sh`. Draft texts: `explore/choices.json` (20 entries, English).

## Data and relations
- Use cases: catalog items matching the bundle/sector (production first, then newest); at most 4 cards, the link "See all matching use cases" opens `overview/?theme=|?sector=`. Cards are the shared catalog row card (`Fides_Use_Case_Design::render_card`, variant `row`) with the catalog image (name fallback when there is none, broken images fall back too) and a status badge.
- Status badge: only what the record says. `productionDeployment` yes = "In production", no = "Not in production". The data has no pilot/demo/fictional field, so no such label is shown or invented.
- Credential types, organisations and wallets: only the explicit `links.*` of the shown use cases (`Fides_Use_Case_Detail_Page::relation_groups()`); nothing inferred. A group without data is omitted.
- One row per record: the key is the catalog ref id, or the normalised name when a link has no id (a name merges into a ref'd row of the same kind). Each row keeps the list of examples it comes from.
- Long titles: a native `<details>` ("In N of these M examples") holds the example titles as anchor links to `#explore-example-N`. No JavaScript needed; one example shows "In the example shown".
- Organisation roles: chips only from the same use case's links: in the `issuers` link = Issuer, in the `rps` link = Relying Party (matched by ref id or name). Issuer-only or RP-only names are not listed as organisations. Wallet provider roles cannot be derived from the links.
- Detail page or "Listing only": a row links only when its id exists in the pilot catalog data (`Fides_Organization_Design::items()`, `Fides_Wallet_Design::items()`, `Fides_Credential_Design::items()`; the detail pages render `find()` of the same data). Otherwise the row shows the name and a "Listing only" badge, without a link.
- Logos: the catalog logo in a fixed 40x40 box (contain, lazy, `alt=""`); no logo or a broken one shows initials. The box never changes size.
- Headings and counts: headings say exactly what is shown ("Organisations in these examples"), count sentences say "N of M" use cases shown and how many rows are listed; a total is only called total when it is.
- No featured image: the introduction takes the full width.
- No use cases: message "The catalog has no published use case here yet." plus a link to all use cases.
- Tests: `tests/explore-themes-sectors-behaviour.php` (`pilot_wp eval-file`; counts per choice, dedupe, detail vs listing, roles, status, NL marks; writes `tests/output/explore-themes-sectors-counts.json`), `tests/explore-themes-sectors-checks.cjs` (browser, 1440 and 390, EN and NL; `ONLY_REPAIR=1` runs only the repair checks) and `tests/run-explore-themes-sectors-empty.sh` (installs a temporary mu-plugin fixture that empties the dataset, runs the browser checks with `EMPTY_FIXTURE=1`, removes the fixture).

## Dutch
Catalog content (use case titles, summaries, owners, organisation, wallet and credential names) is English; on `/nl/` it is marked `lang="en"` and `data-no-translation`, with one Dutch line ("Catalog content is shown in English."). No translations are invented. Empty state, invalid-choice notice and no-choice state are Dutch on `/nl/`. Changes to labels: `learn/nl-translation-changes-themes-sectors-repair-2026-11-14.md`.
`learn/nl-translations-explore.php apply|status` (fills only untranslated rows; human rows are kept). Count sentences are gettext strings of `fides-use-case-catalog`. Open the `/nl/` pages first so rows exist. Strings only shown in the empty state ("No examples yet", "Browse all use cases", the empty message) get a row only when that state is rendered under `/nl/`.

## Versions
Tiles 1.13.56 (menu items). Use-case plugin: readme "Unreleased (design pilot)", no version bump.
