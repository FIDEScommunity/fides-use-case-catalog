# Dutch changes: Explore Themes and Sectors repair round (14 November 2026)

Source: `learn/nl-translations-explore.php` (TranslatePress dictionary and gettext rows). Terminology: `learn/nl-terminology.md`. Only rows that still held the old machine/earlier text were corrected; human rows were not overwritten.

## Corrected rows (old -> new)

| English | Old | New | Why |
|---|---|---|---|
| Business & Mandates | Bedrijven en machtigingen | Bedrijven en mandaten | "mandate" is "mandaat" in the terminology; "machtiging" is not used |
| Explore by theme | Verken per thema | Ontdek per thema | Same verb as the sibling "Ontdek per land" |
| Explore by sector | Verken per sector | Ontdek per sector | Same |
| four Learn link rows ("… · Learn →") | "… · Leren →" | "… · Learn →" | "Learn" is the section name and stays English |

The Learn link rows are the four texts: Sharing information from a wallet; How can someone act for an organisation?; Digital wallets and public services; What should a service check when receiving a credential?

Menu: "Learn", "Explore" and "Business wallets" stay English; "Thema's" and "Sectoren" are Dutch.
"Business wallet" gets an explicit row (stays "Business wallet"); this row is shared with two Learn pages, where the visible text does not change.

## New rows

Dictionary: In production -> In productie; Not in production -> Niet in productie; Listing only -> Alleen vermeld; Catalog content is shown in English. -> Catalogusinhoud wordt in het Engels getoond.; the legend sentence under the cards.
Gettext (`fides-use-case-catalog`): the new relation headings and count sentences, and "In the example shown" -> "In het getoonde voorbeeld". Obsolete heading rows and the old single-example sentence are no longer used.

## Not translated on purpose
Catalog content (titles, summaries, owners, organisation, wallet and credential names) stays English and is marked `lang="en"`.

## Export
`learn/nl-translations-transfer.php export` rewrote `nl-translations.json` (1461 entries, +3: Business wallet, Sectors, Themes). `status`: add 0, differs 0, stale 0, gettext add 0.
