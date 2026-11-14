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
- Use cases: Use Case catalogue items matching the bundle/sector (production first, then newest); at most 4 cards, the link "See all matching use cases" opens `overview/?theme=|?sector=` (the existing filters).
- Credential types, organisations and wallets: only the explicit `links.*` of the shown use cases (`Fides_Use_Case_Detail_Page::relation_groups()`); each row says which of the shown examples it comes from. No counts of their own, nothing inferred. A group without data is omitted.
- No use cases: message "The catalog has no published use case here yet." plus a link to all use cases; the choices stay.
- Tests: `tests/explore-themes-sectors-behaviour.php` (`pilot_wp eval-file`, per choice counts, relation traceability, empty data) and `tests/explore-themes-sectors-checks.cjs` (browser).

## Dutch
`learn/nl-translations-explore.php apply|status` (fills only untranslated rows; human rows are kept). Count sentences are gettext strings of `fides-use-case-catalog`. Open the `/nl/` pages first so rows exist. Strings only shown in the empty state ("No examples yet", "Browse all use cases", the empty message) get a row only when that state is rendered under `/nl/`.

## Versions
Tiles 1.13.56 (menu items). Use-case plugin: readme "Unreleased (design pilot)", no version bump.
