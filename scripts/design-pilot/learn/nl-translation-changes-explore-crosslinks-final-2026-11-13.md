# Dutch for the Explore <-> Learn cross links: entered texts (13 November 2026)

Status: entered on the local pilot through `learn/nl-translations.php` (`apply`, then `correct` for two rows) and exported with
`learn/nl-translations-transfer.php export` into `learn/nl-translations.json`. Source of the proposals:
`learn/nl-translation-changes-explore-crosslinks.md`. Staging and production are untouched.

Rules applied: formal "u" (the strings contain no direct address except "leest u in" and "waar u op let"), terminology of
`learn/nl-terminology.md` (uitgever, vertrouwende partij, houder; "EUDI Wallet" and "wallet" unchanged), no existing human
translation overwritten: every row below was empty (status 0) before; two of them were rewritten once by `correct` because they
still held my own first version (see "Second pass"). Matching used the CURRENT full English strings from the TranslatePress
dictionary (`wp_trp_dictionary_en_us_nl_nl`), not the wording of the proposal file.

## Deviations from the proposal (old proposal -> entered)

| English (current dictionary string) | Old proposal | Entered | Why |
|---|---|---|---|
| Explore credential types that report | Bekijk credential types die **SD-JWT VC** / **ISO mDoc** vermelden | Bekijk credentialtypen met vermelding van | The English link is `prefix + <strong>value</strong>` with no text after the bold part, so a Dutch verb after the value ("... vermelden") cannot be placed. "met vermelding van" works in front of the value. "credentialtypen" is the form of the existing human row "Bekijk credentialtypen". |
| Explore personal wallets that report | Bekijk persoonlijke wallets die ... vermelden | Bekijk persoonlijke wallets met vermelding van | Same reason. |
| for issuance / for presentation | "... vermelden voor uitgifte / presentatie" | voor uitgifte / voor presentatie | These are the fragments behind the bold value (OpenID4VCI / OpenID4VP); they now read "Bekijk persoonlijke wallets met vermelding van **OpenID4VCI** voor uitgifte". |
| Explore use cases from the / from (Germany, the Netherlands) | Bekijk use cases uit **Duitsland** / **Nederland** | Bekijk usecases uit | The article "the" sits in the fragment, so Dutch has no article ("uit Nederland"). Existing human rows write "usecase" as one word ("Bekijk usecases", "Bekijk de VOG-usecase"), so the proposal's "use case" was changed to "usecase" everywhere. |
| Explore organisations in the / in | Bekijk organisaties in **...** | Bekijk organisaties in | As proposed (without the article). |
| Explore personal wallets from the / from | Bekijk persoonlijke wallets uit **...** | Bekijk persoonlijke wallets uit | As proposed (without the article). |
| Germany / Netherlands (the bold country words) | not in the proposal | Duitsland / Nederland | Needed so that the link reads Dutch. These two rows are shared (the words also appear in other places on the site); both empty before, now translated for the whole site on `/nl/`. Review if a chip or list should keep the English country name. |
| Formats are one way to compare credential types. | Formaten zijn één manier om credential types te vergelijken. | Formaten zijn één manier om credentialtypen met elkaar te vergelijken. | "credentialtypen" (existing term), "met elkaar" reads more natural. |
| Organizations describe their own roles. | Organisaties beschrijven zelf welke rollen zij hebben. | unchanged | Natural Dutch, no change needed. |
| Ecosystem roles explained | Ecosysteemrollen uitgelegd | Rollen in het ecosysteem uitgelegd | The article title is "Rollen in het ecosysteem" (existing human row); the label now matches it. |
| An issuer in practice | Een uitgever in de praktijk | unchanged | Heading; the "uitgever (issuer)" explanation belongs to the first prose mention. |
| This use case shows an organisation that issues a credential to a person, ... | Deze use case laat zien hoe een organisatie een credential uitgeeft aan een persoon, die het in een app bewaart en later met andere organisaties kan delen. | Deze usecase laat zien hoe een organisatie een credential uitgeeft aan een persoon. De persoon bewaart het credential in een app en kan het later delen met andere organisaties. | Two sentences avoid the unclear "die het"; "het credential" as in the existing rows. |
| A relying party in practice | Een vertrouwende partij in de praktijk | unchanged | |
| This use case shows a municipality acting as a relying party: ... | ... zij vraagt een persoon om specifieke attributen te delen om in te loggen op een gemeentelijk account. | Deze usecase laat zien hoe een gemeente optreedt als vertrouwende partij: zij vraagt een persoon specifieke attributen te delen, zodat die kan inloggen bij een gemeentelijk account. | Avoids "om ... om". |
| UNTP in a use case | UNTP in een use case | UNTP in een usecase | "usecase". |
| This use case describes a textile product passport ... | ... een paspoort voor een textielproduct dat als verifiable credential ... wordt uitgegeven. | Deze usecase beschrijft een digitaal productpaspoort voor textiel dat wordt uitgegeven als verifieerbaar credential op basis van UNTP. | Existing UNTP rows use "digitaal productpaspoort" and "verifieerbaar credential". |
| Explore the Interac use case | Bekijk de use case van Interac | Bekijk de Interac-usecase | Same pattern as the existing "Bekijk de VOG-usecase" / "Bekijk de KYB-usecase". |
| Explore the Nijmegen use case | Bekijk de use case van Nijmegen | Bekijk de Nijmegen-usecase | Idem. |
| Explore the Reeco use case | Bekijk de use case van Reeco | Bekijk de Reeco-usecase | Idem. |
| For more on the role of the holder, see | (not in the proposal; new sentence on What is a digital wallet?, see below) | Meer over de rol van de houder leest u in | The sentence is followed by the link "De houder". |
| The catalog lists Interac as the organisation. The catalog marks this use case as in production, as reported by the organisation. | stays English | De catalogus noemt Interac als betrokken organisatie. Volgens opgave van de organisatie is deze usecase in productie. | The proposal left card sentences as in the record, but this sentence is generated by the catalog (not record text) and has siblings with human Dutch (TECH5, Gemeente Nijmegen); same wording. |
| The catalog lists Reeco as the organisation. The catalog does not mark this use case as in production. | stays English | De catalogus noemt Reeco als betrokken organisatie. Volgens de catalogus is deze usecase niet in productie. | Same pattern as the Hovi row. |

Left as in the record (outside this round): use case titles, organisation lines, record texts and the glossary definitions that
appear in the cards and popups.

## New sentence on What is a digital wallet? (task "the-holder")

The page now has one running-text link to The holder: "For more on the role of the holder, see <a>The holder</a>." (new paragraph after the paragraph
that introduces the holder). Dutch: "Meer over de rol van de houder leest u in" + link "De houder" (existing human row).

## Not entered: strip and line strings without a dictionary row

The strip and line components are rendered by JavaScript. For three strings TranslatePress has no dictionary row, also after opening
the `/nl/` pages in a browser (the dynamic request sends them, but no row is stored), and `nl-translations.php` only fills existing rows
(never inserts). Prepared in `nl-translations.php` (they will be filled by `apply` as soon as the rows exist):

| English | Dutch (ready) |
|---|---|
| Choosing a wallet? (title of the strip on Personal wallets) | Een wallet kiezen? |
| Learn what to look for and how to manage it. | Lees waar u op let en hoe u een wallet beheert. |
| QTSP certification is imported from trusted list data. It is separate from the roles organizations describe for themselves. | QTSP-certificering is overgenomen uit de gegevens van vertrouwenslijsten (trusted lists). Dit staat los van de rollen die organisaties zelf beschrijven. |

To create the rows: open the three pages once in the TranslatePress editor (`/nl/fides-design-pilot/personal-wallets/?trp-edit-translation=true`
and `.../organizations/?cert=qtsp&trp-edit-translation=true`), then run `apply` and `export`. Until then these three texts are English on `/nl/`
(the same gap as the Business wallets strip, "New to business wallets?"). Labels that equal an article title and the
strip titles "What is a credential?" and "What is a digital wallet?" already show human Dutch.

## Second pass

Two rows were first entered with "credential types" and then corrected to "credentialtypen" with `nl-translations.php correct`
(`$corrections`: only a row that still holds the expected old text is rewritten; a second run changes nothing).

## Export

`nl-translations.json`: 1315 -> 1339 entries (24 new sources), `status`: add 0, same 1340, differs 0, pending 0, stale 0, new 0.
The route lists of the five country pages that another agent builds (Canada, United States, Honduras, India, Ethiopia) were removed
from the exported file again, so this commit contains only the cross link rows; the next export after those pages are committed
will add them.

Checks: `tests/nl-translations-transfer-behaviour.php` and `tests/nl-translations-transfer-standalone.php` pass; `tests/nl-route-checks.cjs`
on the touched routes only reports record and glossary text (use case titles, glossary definitions); `tests/nl-terminology-checks.cjs` passes.
