# Learn op de bestaande site

**Credential en Credential Type ontbreken in de huidige Learn-glossary.** Learn leest alleen de bundel van glossary 1.1.15 (335 termen). Die twee termen staan wel in de gepubliceerde glossary 1.12.2. Deze proef wijzigt de glossary niet. De woorden blijven platte tekst, zonder popup.

**De trainings- en workshopknoppen wijzen in de themaweergave naar `/about-fides/contact/`.** De tekst hangt van de pagina af: “Contact us about this training”, “Contact us about this introduction session”, “Contact us about this workshop” of “Contact us about this partnership”. De knop neemt geen training en geen datum mee. De opgeslagen aanvraaglink blijft in de pagina voor de design-shell. See the services overview en View readiness assessment blijven verborgen.

**Training & workshops vraagt “Where would you like to attend?”.** Het veld is een dropdown met een neerwaarts pijltje. Eronder staat “Currently, scheduled training is available in the Netherlands.” The Netherlands is standaard en toont het bestaande aanbod. Een ander land verbergt dat lokale aanbod en toont “No scheduled trainings in {land} yet”, met “Contact us” naar `/about-fides/contact/`. Bij Other is de landnaam “your country”. Training partnerships blijft bij elke keuze zichtbaar. De design-shell houdt de opgeslagen intro en het volledige aanbod.

Volledige Learn-route in de themaweergave: de header en footer van het actieve thema, Engelse inhoud, geen taalwissel. Dezelfde pagina’s blijven later bruikbaar in de design-shell. De designpilot zelf blijft op die shell.

Dit pakket is bedoeld voor de bestaande site, eerst de lokale kopie `http://utrecht-demo.local` en daarna `https://staging.fides.community`. Het weigert `fides.community`, `www.fides.community` en elke site waarvan het pad `/design-review` of `/fides-design-pilot` is. Er is niets op staging of productie geïnstalleerd. Er is niets gepusht.

## Wat er mee gaat

51 Learn-pagina’s: het overzicht, Topics, alle secties en artikelen, en Training & workshops met de vier aanbiedingen. De URL-structuur is die van de pilot, met basis `/learn/`.

Niet aangemaakt:

| Route | Reden |
| --- | --- |
| `/learn/sessions/request/` | Previewformulier. Het verstuurt niets en mag niet als aanvraag live staan. |
| `/start/` en `/start/receive/` | Explorer-start, geen Learn-pagina. |
| `/services/` en `/services/wallet-readiness-assessment/` | Diensten, inclusief een tweede previewformulier. |
| Editorial links op cataloguskaarten | Die optie wijzigt bestaande cataloguspagina’s. Die blijven onaangeroerd. |

`LEARN_FORCE` wordt geweigerd. Een pagina die een redacteur heeft gewijzigd, of een bestaande pagina zonder seedmarkering, wordt overgeslagen.

## Weergave

De template blijft `fides-learn`. De standaard in de plugin is de design-shell. Het mu-plugin zet de themaweergave alleen aan op `utrecht-demo.local` en `staging.fides.community`. Op andere hosts, inclusief productie en de designpilot, laat het de shell en de opgeslagen paden staan.

Wisselen, alleen op die twee hosts: `wp option update fides_learn_trial_chrome shell` en terug met `wp option delete fides_learn_trial_chrome`.

## Versies

| Onderdeel | Bestaande site | Dit pakket |
| --- | --- | --- |
| Tiles | 1.13.32 | 1.13.64 |
| Glossaryplugin | 1.1.15 | 1.1.15 |
| Catalogusplugins | ongewijzigd | ongewijzigd |
| WPML | op staging actief, hier niet aanwezig | niet gewijzigd, niet geactiveerd |

1.13.64 toont het landveld als een dropdown met een neerwaarts pijltje en de zin “Currently, scheduled training is available in the Netherlands.” 1.13.63 zet op de trainingspagina de landkeuze uit Paper 24.28 en 24.27, alleen wanneer het mu-plugin `fides_ds_learn_country_picker` vult. 1.13.62 laat de themaweergave een trainings- of workshopknop naar `/about-fides/contact/` zetten wanneer het mu-plugin `fides_ds_learn_contact_buttons` vult. Zonder die filters, en in de design-shell, blijft de opgeslagen aanvraagknop en de opgeslagen intro staan. 1.13.61 verbergt ontbrekende bestemmingen en vervangt catalogusquery’s die deze site niet toepast, alleen als het mu-plugin die filters vult.

Buiten Learn verandert een gewone cataloguspagina daardoor niet, behalve een grotere sluitknop op de melding dat catalogusdata verouderd is, en een doorverwijzing van een oud item-id alleen als de data `legacyIds` bevat. De nieuwe glossarypagina blijft uit.

Op de lokale kopie waren homepage, glossary, use cases, walletcatalogus, credentialcatalogus, organizations, issuers, business wallets en relying-party websites na deze uitbreiding gelijk aan ervoor. De designpilot-seed meldt 58 pagina’s `unchanged`. `http://localhost:10088/fides-design-pilot/learn/` toont de site-shell.

## Cataloguspaden

Het mu-plugin herschrijft de opgeslagen pilotpaden alleen in de themaweergave.

Lokaal, gecontroleerd op deze kopie:

| Opgeslagen pad | Bestemming |
| --- | --- |
| `/personal-wallets/` | `/wallet-catalog/` |
| `/business-wallets/` | `/business-wallets/` |
| `/credentials/` | `/credential-catalog/` |
| `/overview/` en `/use-case/` | `/use-cases/` |
| `/issuers/` | `/issuer-catalog/` |
| `/relying-parties/` | `/relying-party-websites/` |
| `/organizations/` | `/organizations/` |
| glossary in de leerbalk | `/glossary/` |

Voor `staging.fides.community` gebruikt hetzelfde bestand de paden van de live site. Die paden geven op `https://fides.community` een 200. Staging zelf antwoordde met 401 en is niet geopend.

| Opgeslagen pad | Bestemming |
| --- | --- |
| `/personal-wallets/` | `/ecosystem-explorer/personal-wallets/` |
| `/business-wallets/` | `/ecosystem-explorer/organizational-wallets/` |
| `/credentials/` | `/ecosystem-explorer/credential-catalog/` |
| `/overview/` en `/use-case/` | `/ecosystem-explorer/use-cases/` |
| `/issuers/` | `/ecosystem-explorer/issuer-catalog/` |
| `/relying-parties/` | `/ecosystem-explorer/relying-party-catalog/` |
| `/organizations/` | `/organizations/` |
| glossary | `/community-tools/glossary/` |

## Filters, kaarten en glossary

Een filter telt alleen mee als de selectie én de resultaten kloppen. Dat is nagekeken in de catalogusscripts van deze kopie, dezelfde versies als de live site:

| Catalogus | Leest uit de URL |
| --- | --- |
| Personal en business wallets | `country`, `profile`, `wallets`, `wallet` |
| Organizations | `country`, `sector`, `org` |
| Use cases | `theme`, `usecase` |
| Credential types | `credential`, `credentials`, `sector`, `theme` |
| Issuers | `issuer`, `issuers`, `country`, `sector`, `theme` |
| Relying parties | `rp`, `rps`, `country`, `sector`, `profile`, `theme` |

`format`, `issuance`, `presentation`, `role` en `cert` leest geen van deze catalogi. `country` op use cases ook niet.

In de themaweergave blijft een link staan als de catalogus die query toepast. Dat zijn `?country=` op wallets en organizations, en `?usecase=` op een voorbeeldkaart. De VOG-kaart opent nog steeds die case.

Een query die de catalogus niet toepast wordt een link naar de catalogus zonder die query. Het label wordt algemeen: “Browse personal wallets”, “Browse business wallets”, “Browse credential types”, “Browse use cases” of “Browse organisations”. De zin die een format of protocol als al geselecteerd beschreef, wordt dezelfde algemene verwijzing. De opgeslagen pilotlink blijft in de pagina staan en komt terug in de design-shell.

Glossary, niet gewijzigd in deze ronde. Learn leest alleen het meebundelde bestand `data/glossary-aggregated.json`. Op deze kopie is dat de bundel van plugin 1.1.15: 335 termen, zonder **Credential** en zonder **Credential Type**. Wel aanwezig is **Verifiable Credential Type**. De gepubliceerde glossary op GitHub `main` (`glossary-aggregated.json`, versie 1.12.2, 344 termen) heeft beide termen wel, met id `credential` en `credential-type`. De glossarypagina zelf haalt GitHub eerst op en valt daarna terug op de bundel, dus de pagina kan de termen al tonen terwijl een Learn-artikel ze als platte tekst laat staan.

Oplossing, later: de bundel van de glossaryplugin gelijk trekken met de gepubliceerde 1.12.2, of Learn dezelfde bron laten lezen als de glossarypagina. Geen nieuwe definitie schrijven. De designpilot gebruikt al een lokale kopie van die 344 termen; die blijft daar.

## Trainingen en contact

De trainingspagina’s blijven staan: overzicht, EUDI & Business Wallets in Practice, Wallet Introduction, Wallet Readiness Workshop en Training partnerships. Er staat geen formulier op die pagina’s, en er is geen formulier toegevoegd dat niets verstuurt.

De bestemming is `/about-fides/contact/`, het pad van de gepubliceerde contactpagina. Op `http://utrecht-demo.local` geeft dat pad 404: de pagina staat niet in deze kopie, en formulier 298 hangt nergens. De knoppen krijgen dat pad toch, zodat staging dezelfde route gebruikt. Het formulier is hier niet verstuurd. Op staging controleert iemand het formulier zelf.

In de themaweergave wordt een knop naar `/learn/sessions/request/` zo:

| Pagina | Zichtbare tekst | Bestemming |
| --- | --- | --- |
| EUDI & Business Wallets in Practice | Contact us about this training | `/about-fides/contact/` |
| Trainingsoverzicht, webinars | Contact us about this training | `/about-fides/contact/` |
| Wallet Introduction | Contact us about this introduction session | `/about-fides/contact/` |
| Wallet Readiness Workshop | Contact us about this workshop | `/about-fides/contact/` |
| Training partnerships | Contact us about this partnership | `/about-fides/contact/` |

De query `offering` en `date` gaat niet mee. Een afsluiting die om een registratie of een datum vraagt, toont in de themaweergave dezelfde contacttekst en de zin “Send a message. This does not register you and it does not reserve a date.”

Op het overzicht staat in de themaweergave de intro “Explore training and workshops on digital wallets and credentials, for individuals and teams.” Daaronder de landkeuze, standaard The Netherlands. België, Duitsland, Frankrijk, Luxemburg, Ierland, Spanje, Italië en Other blijven de keuzes. Bij The Netherlands blijven de drie aanbiedingen, Webinars & roundtables, Architecture assessment, Use case and business case en Training partnerships staan. Bij een ander land verdwijnt dat lokale aanbod. In de plaats komt “No scheduled trainings in Germany yet” (of de gekozen landnaam) en “Interested in a session in Germany? Contact us to discuss the options.” De link “Contact us” gaat naar `/about-fides/contact/`. Bij Other luidt de melding “your country”. Training partnerships blijft daaronder staan en vervangt die melding niet. De vier datums op de EUDI-pagina blijven links naar `/about-fides/contact/`, zonder datum in de URL.

Deze knoppen blijven verborgen, omdat die pagina’s niet in deze proef zitten:

- `/services/` en `/services/wallet-readiness-assessment/` (See the services overview, View readiness assessment)
- `/start/receive/` (de gewone link “Receive information from wallets” blijft als tekst staan, zonder link)

Een knop naar een bestaande Learn-pagina, zoals Explore the knowledge topics, blijft. De opgeslagen aanvraaglink blijft in de pagina. In de design-shell staan Register your interest, Discuss a workshop en de andere aanvraagknoppen weer op `/learn/sessions/request/`.

De dubbele slash naar Ecosystem roles in “Digital wallets and public services” is in de bron hersteld naar `/learn/topics/ecosystem-roles/`.

## Installeren

De scripts gebruiken de `wp` van de server en `WP_PATH`. Ze lezen geen checkoutpad, geen Local-PHP en geen `env.sh`. Zet `wp` op `PATH`, of geef `WP_CLI` (en `WP_PHP` als dat een phar is).

1. Bewaar de huidige tilesmap. Op de lokale kopie is 1.13.32 bewaard buiten git.
2. Controleer `shasum -a 256 -c SHA256SUMS` in de pakketmap.
3. Pak `plugins/fides-community-tools-tiles-1.13.64.zip` uit naar `wp-content/plugins/fides-community-tools-tiles`. Geen symlink.
4. Kopieer `mu-plugins/fides-learn-trial.php` naar `wp-content/mu-plugins/`. Niet naar de designpilot en niet naar `/design-review`.
5. Laat glossary op 1.1.15. Wijzig geen WPML-instelling en activeer geen taalwissel.
6. Dry-run. Daarna pas toepassen.

Controleer eerst de checksums in de pakketmap (`shasum -a 256 -c SHA256SUMS`). Pak daarna `plugins/fides-community-tools-tiles-1.13.64.zip` uit in `wp-content/plugins/` als een gewone map, geen symlink. Kopieer `mu-plugins/fides-learn-trial.php` naar `wp-content/mu-plugins/`.

Dry-run, vanaf de uitgepakte pakketmap. Op staging weigert het script tot `LEARN_TARGET=staging` gezet is:

```bash
WP_PATH=/pad/naar/wordpress bash seed/learn-trial/seed-trial.sh
WP_PATH=/pad/naar/wordpress LEARN_TARGET=staging bash seed/learn-trial/seed-trial.sh
```

Toepassen, alleen nadat de dry-run klopt:

```bash
WP_PATH=/pad/naar/wordpress LEARN_TARGET=staging LEARN_APPLY=1 bash seed/learn-trial/seed-trial.sh
```

`fides.community` en `www.fides.community` worden geweigerd, ook met `LEARN_TARGET=staging`. Een site onder `/design-review` of `/fides-design-pilot` wordt ook geweigerd, net als een site waarin `FIDES_DESIGN_PILOT` aan staat.

De dry-run op deze kopie, vóór het aanmaken: 5 `unchanged`, 46 `would-created`, 6 pagina’s buiten de set, geen `skipped-edited` en geen `skipped-unmarked`. Na het aanmaken: 46 `created`, 5 `unchanged`.

Het rapport staat in `seed/learn-trial/reports/` in de pakketmap (of in `LEARN_REPORT_DIR` als die gezet is). Een apply schrijft daarnaast `installs/<host>-<tijdstip>.tsv`. Elke regel daarin is een pagina die déze run heeft aangemaakt: pagina-ID, route, seedmarker `_fides_learn_seed`, installatiemarker `_fides_learn_trial_install` en de hash van de pagina op dat moment. `created-routes.txt` is alleen een routelijst en is geen grond om pagina’s te verwijderen.

Op deze kopie hoort het bestand van de eerdere apply bij de 46 pagina’s die toen nieuw waren. De vijf pagina’s van de eerste proef stonden er al en staan niet in dat bestand: `learn`, `learn/topics`, `learn/topics/the-big-picture`, `learn/topics/the-big-picture/what-is-a-digital-wallet`, `learn/topics/the-big-picture/how-credentials-connect`.

Op staging eerst de dry-run lezen. Een `skipped-edited` of `skipped-unmarked` pagina niet forceren. Die komt ook niet in het installatiebestand. WPML-instellingen blijven zoals ze zijn. Nieuwe pagina’s niet aan een taal koppelen via een WPML-wijziging; controleer in de editor dat ze Engels zijn voordat de route opengaat.

## Terugzetten

Gebruik het installatiebestand van díe installatie. Eerst dry-run:

```bash
WP_PATH=/pad/naar/wordpress LEARN_LEDGER=/pad/naar/installs/host-tijdstip.tsv bash seed/learn-trial/rollback-trial.sh
```

Op staging hetzelfde, met `WP_PATH` en `LEARN_TARGET=staging`. Het script weigert `fides.community`, `www.fides.community` en de designpilot.

Een pagina wordt alleen verwijderd als het ID, de route, `_fides_learn_seed`, `_fides_learn_trial_install` én de hash nog gelijk zijn aan de regel. Een pagina die er al was, blijft staan en verschijnt als `kept-existing`. Een pagina die na de installatie is bewerkt, blijft staan en verschijnt als `kept-edited`. Een ID dat niet meer bij deze marker hoort, blijft staan als `kept-marker` of `kept-missing`.

Pas daarna, als de dry-run klopt:

```bash
WP_PATH=/pad/naar/wordpress LEARN_TARGET=staging LEARN_LEDGER=/pad/naar/installs/host-tijdstip.tsv LEARN_ROLLBACK=1 bash seed/learn-trial/rollback-trial.sh
```

Daarna het mu-plugin weghalen, de optie `fides_learn_trial_chrome` verwijderen als die bestaat, tiles 1.13.32 terugzetten en `wp rewrite flush`.

Glossary, thema, catalogusplugins en vertaalinstellingen zijn niet gewijzigd.

## Later naar de design-shell

Het mu-plugin weghalen, of de chrome-optie op `shell` zetten. Dezelfde pagina’s gebruiken dan de design-shell, de opgeslagen pilotpaden, de aanvraagknoppen en de gefilterde cataloguslinks. Die paden verwachten de design-catalogi en de diensten- en startroute. Die route daarna seeden, met een dry-run en zonder `LEARN_FORCE`.

## Gecontroleerd op 16 november 2026

- 51 Learn-pagina’s geven 200, met themaheader en zonder site-shell en zonder taalwissel.
- In de Learn-inhoud van die 51 pagina’s staat geen link meer naar `/learn/sessions/request/`, `/services/`, `/start/receive/`, en geen `format`, `issuance`, `presentation`, `role` of `cert` in een cataloguslink. 86 interne links uit die inhoud geven geen 404.
- `?country=` blijft staan op wallets en organizations. `?usecase=` blijft staan op voorbeeldkaarten. Een landlink naar use cases is “Browse use cases” zonder `country`.
- Wallet Readiness Workshop toont “Contact us about this workshop” naar `/about-fides/contact/`, naast “Explore the knowledge topics”. De details blijven een kolom van 320 px. “View readiness assessment” blijft weg.
- EUDI & Business Wallets in Practice toont “Contact us about this training” naar `/about-fides/contact/`. De vier datums linken naar hetzelfde pad, zonder datum in de URL. Op utrecht-demo.local geeft dat pad 404; het formulier is niet verstuurd. Op staging is dit het pad van de bestaande contactpagina.
- Training & workshops opent op The Netherlands met het bestaande aanbod. Germany en Other verbergen dat aanbod, tonen “No scheduled trainings in Germany yet” of “No scheduled trainings in your country yet”, en houden Training partnerships zichtbaar. “Contact us” gaat naar `/about-fides/contact/`. De designpilot houdt “Join an open training in Utrecht” en heeft geen landkeuze.
- De dubbele slash is weg. De pagina “Digital wallets and public services” is de enige die deze apply heeft bijgewerkt. Dry-run daarvoor: 50 unchanged, 1 would-updated.
- Terugzet-dry-run op `installs/utrecht-demo.local-20261116-161037.tsv`: 46 would-delete, 5 kept-existing (de eerdere proefpagina’s). Er is niets verwijderd.
- De designpilot op `http://localhost:10088/fides-design-pilot/learn/` houdt de site-shell. Het format-artikel houdt `format=sd_jwt_vc`. De workshop houdt “Discuss a workshop” en de aanvraaglink. Die seed is niet gedraaid.
- Glossary is niet gewijzigd. Credential en Credential Type blijven platte tekst in Learn.
