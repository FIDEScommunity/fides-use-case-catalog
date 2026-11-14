# Explore by theme and sector (local design pilot only)

Pages: `/fides-design-pilot/themes/` and `/fides-design-pilot/sectors/` (Dutch: `/nl/fides-design-pilot/…`). Menu: Explore > Themes, Explore > Sectors (tiles `class-fides-ds-site-shell.php`, items flagged `proposed`, mapped in the guard mu-plugin).
Countries is not part of this work. Nothing here is in the staging package yet.

## URLs
- `?theme=<bundle code>`: `identity_access`, `business_authority`, `payments_commerce`, `work_qualifications`, `products_trade_supply_chains`, `government_compliance`.
- `?sector=<slug>`: the 14 assignable sectors (`agriculture` … `trade`). "Other" is never offered.
- Heading: H1 = the chosen name ("Education", "Business & Mandates"); without a choice "Explore by sector" / "Explore by theme". The page title carries the name too (translated on `/nl/`).
- Choices: all visible on desktop (from 1100px) and in the state without a choice. Below 1100px, after a choice, the list is folded and a compact action "Change sector" / "Change theme" sits by the name; it is a plain `#fides-explore-choices` link (CSS `:target` opens the list without JavaScript; the script toggles `aria-expanded` and moves focus to the chosen item). The picker stays in the normal page flow (not sticky).
- An unknown slug (or `other`) shows the no-choice state with a notice. Without JavaScript the choices are plain links and the overview is server rendered.

## Editing the introduction and image (WordPress)
Every choice has one page (slug `explore-theme-<slug>` / `explore-sector-<slug>`, child of the pilot parent page, meta `_fides_explore_choice`).
1. Pages > search "explore-" (or the choice name) > edit.
2. Title = heading, content = introduction (plain paragraphs), featured image = picture next to the introduction (optional; no image = no picture).
3. Update. The seed marks the page as edited (`skipped-edited`) and never overwrites it. Never use force.
4. Visiting such a page directly redirects to the choice URL.
Seed: `EXPLORE_DRY_RUN=1 ./create-explore-pages.sh` first, then `./create-explore-pages.sh`. Draft texts: `explore/choices.json` (20 entries, English).

## Data and relations
- Use cases: catalog items matching the bundle/sector, in an **editorial order** first (see below), then production first, then newest; at most 4 cards, the link "See all matching use cases" opens `overview/?theme=|?sector=`. Cards are the shared catalog row card (`Fides_Use_Case_Design::render_card`, variant `row`) with the catalog image (name fallback when there is none, broken images fall back too) and a status badge.
- Editorial order: `wordpress-plugin/fides-use-case-catalog/data/explore-featured-use-cases.json`, key `<kind>:<slug>`, value = use case ids, most recognisable first (filter `fides_explore_choice_featured`). Only ids that are published AND match the choice are used; an unknown id is skipped; the rest of the slots follow the default order. Current entries: Education = VerifyTT (education credential verification), IIIT-Bangalore (academic credentials), Gradus (verify the diploma), EU.ACE micro-credentials; Business & Mandates = Hypersign KYB, Mandator, From Document Trust to Digital Trust, inGo. Other choices have no entry. Add or change a line in that file; no code change.
- Status badge: the shared catalog card badge (same CSS as the use case overview, no local override); only what the record says. `productionDeployment` yes = "In production", no = "Not in production". The data has no pilot/demo/fictional field, so no such label is shown or invented.
- Credential types, organisations and wallets: only the explicit `links.*` of the shown use cases (`Fides_Use_Case_Detail_Page::relation_groups()`); nothing inferred. A group without data is omitted.
- One row per record: the key is the catalog ref id, or the normalised name when a link has no id (a name merges into a ref'd row of the same kind). Each row keeps the list of examples it comes from.
- Related examples: every row has a native `<details>` whose summary is "Related use case" (one example) or "N related use cases"; it holds the example titles as anchor links to `#explore-example-N`. No JavaScript needed. One sentence above the lists says once that the credential types, organisations and wallets belong to the shown use cases; the headings are plain ("Credential types", "Organisations", "Wallets") and there is no sentence about duplicates.
- Organisation roles: chips only from the same use case's links: in the `issuers` link = Issuer, in the `rps` link = Relying Party (matched by ref id or name). Issuer-only or RP-only names are not listed as organisations. Wallet provider roles cannot be derived from the links.
- Detail page or plain name: a row links only when its id exists in the pilot catalog data (`Fides_Organization_Design::items()`, `Fides_Wallet_Design::items()`, `Fides_Credential_Design::items()`; the detail pages render `find()` of the same data); the link is blue and ends in an arrow. Otherwise the row shows the plain name (no label: text versus blue link with an arrow already says it).
- Logos: the catalog logo in a fixed 40x40 box (contain, lazy, `alt=""`); no logo or a broken one shows initials. The box never changes size.
- Headings and counts: the use case section says "Showing N of M use cases in the catalog"; relation sections only say "N more listed in these examples" when the list is cut at 8.
- "On this page": the shared section bar of the use case detail page (`.fides-ds-section-nav`, tiles `initSectionNav`; tiles ≥ 1.13.57 re-initialises it after a choice is swapped in). Sticky at the top from the moment it reaches it, on every width; the current section gets `aria-current="location"`; sections and example cards have `scroll-margin-top` so anchors stay clear of the bar. Below 1100px it is one 48px row ("On this page" + chevron) that opens the list below it and closes after a link. Measured at 390px: the folded bar pins (see the test info lines).
- No featured image: the introduction takes the full width.
- No use cases: message "The catalog has no published use case here yet." plus a link to all use cases.
- Tests: `tests/explore-themes-sectors-behaviour.php` (`pilot_wp eval-file`; counts per choice, editorial order, H1 and phone action, dedupe, detail vs listing, roles, status, NL marks; writes `tests/output/explore-themes-sectors-counts.json`), `tests/explore-themes-sectors-checks.cjs` (browser, 1440 and 390, EN and NL; `ONLY_REPAIR=1` runs only the repair checks, `ONLY_ROUND2=1` only the UX round 2 checks: H1, Change action, order, badges, relations, section bar, keyboard, switching, no JavaScript, for `sectors/?sector=education` and `themes/?theme=business_authority`) and `tests/run-explore-themes-sectors-empty.sh` (installs a temporary mu-plugin fixture that empties the dataset, runs the browser checks with `EMPTY_FIXTURE=1`, removes the fixture).

## Dutch
Catalog content (use case titles, summaries, owners, organisation, wallet and credential names) is English; on `/nl/` it is marked `lang="en"` and `data-no-translation`, with one Dutch line ("Catalog content is shown in English."). No translations are invented. Empty state, invalid-choice notice and no-choice state are Dutch on `/nl/`. Changes to labels: `learn/nl-translation-changes-themes-sectors-repair-2026-11-14.md` and `learn/nl-translation-changes-themes-sectors-ux-2026-11-14.md`.
`learn/nl-translations-explore.php apply|status` (fills only untranslated rows; human rows are kept). Count sentences are gettext strings of `fides-use-case-catalog`. Open the `/nl/` pages first so rows exist. Strings only shown in the empty state ("No examples yet", "Browse all use cases", the empty message) get a row only when that state is rendered under `/nl/`.

## Versions
Tiles 1.13.57 (`FidesDS.initSectionNavs`; 1.13.56 added the menu items). Use-case plugin: readme "Unreleased (design pilot)", no version bump.
