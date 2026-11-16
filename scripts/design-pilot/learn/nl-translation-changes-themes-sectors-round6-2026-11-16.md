# Dutch rows, Themes and Sectors round 6 (16 November 2026)

New interface strings. `learn/nl-translations-explore.php apply` fills empty dictionary and gettext rows and does not overwrite a row a person already translated. The issuer string is in `learn/nl-translations.php` (dictionary). u-form; "uitgever", "vertrouwende partij" and "credential" follow `learn/nl-terminology.md`.

## Dictionary (`fides-use-case-catalog` pages)

| English | Dutch | Where |
|---|---|---|
| Explore the catalogs | Verken de catalogi | section heading and "On this page" |
| How are these selected? | Hoe is deze selectie gemaakt? | closed disclosure under the introduction |
| Related credentials, organizations and wallets | Gerelateerde credentials, organisaties en wallets | summary under each use case card |

## Gettext (`fides-use-case-catalog`)

| English | Dutch |
|---|---|
| Explore records related to this theme or sector across the FIDES catalogs. | Bekijk records die in de FIDES-catalogi aan dit thema of deze sector zijn gekoppeld. |

The sentences that say whether a category is linked directly or through a related record are the round 4 gettext rows (they now sit in the disclosure).

## Dictionary (issuer overview)

| English | Dutch | Where |
|---|---|---|
| What do these mean? | Wat betekenen deze waarden? | summary in the Environment filter |

The Production / Test paragraph is unchanged and already had a row. "Not specified: no environment is recorded." stays the existing `Fides_Issuer_Design::t()` string and is shown only when that value occurs.
