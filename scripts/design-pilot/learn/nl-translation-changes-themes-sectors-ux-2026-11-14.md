# Dutch changes: Explore Themes and Sectors UX round (14 November 2026, b)

Source: `learn/nl-translations-explore.php` (TranslatePress dictionary and gettext rows, `apply` fills only untranslated rows). Terminology: `learn/nl-terminology.md` (usecase, credentialtype, wallet; u-form). Human rows were not overwritten (`apply`: kept 79 rows, corrected 0). Catalog content (use case titles, summaries, owner, organisation, wallet and credential names) stays English and is marked `lang="en"`.

## New rows

| English | Dutch | Where | Type |
|---|---|---|---|
| Change sector | Sector wijzigen | action by the chosen name, phones | dictionary |
| Change theme | Thema wijzigen | same, Themes page | dictionary |
| Related use case | Gerelateerde usecase | summary of a relation row (one example) | gettext `fides-use-case-catalog` |
| %d related use cases | %d gerelateerde usecases | same, several examples | gettext |
| These credential types, organisations and wallets belong to the use cases shown above. | Deze credentialtypen, organisaties en wallets horen bij de hierboven getoonde usecases. | the one explanation above the lists | gettext |
| These credential types, organisations and wallets belong to the use case shown above. | Deze credentialtypen, organisaties en wallets horen bij de hierboven getoonde usecase. | same, one example shown (for instance sector Agriculture) | gettext |

The H1 is the chosen name (existing rows: Onderwijs, Bedrijven en mandaten, ...) or the page name without a choice ("Ontdek per sector", "Ontdek per thema"). The relation headings are now the plain, already translated rows "Credentialtypen", "Organisaties" and "Wallets". "On this page" ("Op deze pagina") is an existing row.

## No longer used (rows stay in the database, nothing was deleted)

"In %1$d of these %2$d examples", "In the example shown", "Credential types / Organisations / Wallets in this example / in these %d examples", "Showing %1$d of %2$d. Each is listed once ...", "%d in total. Each is listed once ...", the legend sentence ("Names with an arrow ...") and "Listing only" ("Alleen vermeld"). They are not exported as new rows; remove them in the TranslatePress editor if wanted.

## Not translated on purpose

Catalog content (see above) and the technical names. "Explore" stays as in the menu.

## Export

`learn/nl-translations-transfer.php export` was run: the Explore rows above are not part of its route set (Learn, Services, start/receive), so `nl-translations.json` is unchanged by this round (the one new row the run showed, "Relying parties", belongs to other work and was not committed here). The strings are applied to the local pilot database with `learn/nl-translations-explore.php apply`; they travel to another site through that script, as in the previous Explore rounds.

Document title on `/nl/`: now built from the translated name and page name ("Onderwijs · Ontdek per sector – FIDES Community"), so the browser tab and search result title are Dutch.
