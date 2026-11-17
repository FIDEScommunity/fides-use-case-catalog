# Learn op de bestaande site

**Learn leest dezelfde gepubliceerde glossary als de glossarypagina.** De bron is de URL die de glossaryplugin al gebruikt, standaard `https://raw.githubusercontent.com/FIDEScommunity/fides-interop-profiles/main/data/glossary-aggregated.json`. Gecontroleerd bij dit pakket: versie 1.12.2, 344 termen, sha256 `355524646ac41171a31c9759c0f2702e1027c88f8e65ac4dc526d7b9238d18a6`. European Business Wallet, Credential en Credential Type zitten in die publicatie. Een geslaagde response blijft 10 minuten in de cache. Lukt de URL niet en is er geen verse cache, dan leest Learn het meebundelde bestand van glossaryplugin 1.1.15. Op deze kopie is dat bestand versie 1.10.1 met 335 termen. Een term die daar ook niet in staat, blijft platte tekst. De glossaryplugin zelf blijft 1.1.15.

**De trainings- en workshopknoppen wijzen in de themaweergave naar `/about-fides/contact/`.** De tekst hangt van de pagina af: “Contact us about this training”, “Contact us about this introduction session”, “Contact us about this workshop” of “Contact us about this partnership”. De knop neemt geen training en geen datum mee. De opgeslagen aanvraaglink blijft in de pagina voor de design-shell. See the services overview en View readiness assessment blijven verborgen.

**Training & workshops vraagt “Where would you like to attend?”.** Het veld is een dropdown met een neerwaarts pijltje, ook in de design-shell. The Netherlands is standaard en toont het bestaande aanbod. Een ander land verbergt dat lokale aanbod en toont “No scheduled trainings in {land} yet”, met “Contact us”. In de themaweergave gaat die link naar `/about-fides/contact/`. In de design-shell gaat die naar de opgeslagen aanvraagpagina, zonder training of datum. Bij Other is de landnaam “your country”. Training partnerships blijft bij elke keuze zichtbaar. De design-shell houdt de opgeslagen intro en de oorspronkelijke aanvraagknoppen.

**De zichtbare blauwe balk op Learn is gelijk aan Awards, en de inhoud blijft wit.** Op Awards is de header 120 px en transparant. De witte inhoud begint na een spacer van 100 px, dus 100 px blauw is zichtbaar. Logo, hoofdmenu en Sign in blijven op de positie die het thema zelf zet. `learn.css` reserveert diezelfde 100 px als een aparte strook in `var(--theme-palette-color-1)`, alleen voor `body.fides-learn-theme` en alleen wanneer de header transparant is. De Learn-pagina houdt zijn witte achtergrond. Tijdens scrollen blijft het krimpen van de header aan het thema; de dichte header dekt de Learn-balk af. Andere pagina’s en de design-shell blijven zoals ze zijn.

**Verwijder `fides-learn-header-fix.php` zodra dit duurzame herstel is geïnstalleerd.** Het bestand staat op staging in `/var/www/html/app/mu-plugins/fides-learn-header-fix.php`. Die tijdelijke regel is niet meer nodig. Blijft hij staan naast deze padding, dan schuift de Learn-balk een tweede keer naar beneden.

Volledige Learn-route in de themaweergave: de header en footer van het actieve thema, Engelse inhoud, geen taalwissel. Dezelfde pagina’s blijven later bruikbaar in de design-shell. De designpilot zelf blijft op die shell.

Dit pakket is bedoeld voor de bestaande site. Eerst een dry-run op `https://staging.fides.community` met `LEARN_TARGET=staging`. Productie (`fides.community` en `www.fides.community`) heeft een eigen dry-run met `LEARN_TARGET=production` en installeert pas met `LEARN_APPLY=1`. `LEARN_TARGET=staging` op productie wordt geweigerd. Een site onder `/design-review` of `/fides-design-pilot`, en een site met `FIDES_DESIGN_PILOT`, wordt geweigerd. `LEARN_FORCE` blijft geweigerd. Er is niets op staging of productie geïnstalleerd. Er is niets gepusht.

## Wat er mee gaat

52 Learn-pagina’s: het overzicht, Topics, alle secties en artikelen, en Training & workshops met de vier aanbiedingen. Nieuw in dit pakket is het overzicht `/learn/topics/wallets-and-credentials/`. De titel op Topics verwijst daarnaartoe. De URL-structuur is die van de pilot, met basis `/learn/`.

Niet aangemaakt:

| Route | Reden |
| --- | --- |
| `/learn/sessions/request/` | Previewformulier. Het verstuurt niets en mag niet als aanvraag live staan. |
| `/start/` en `/start/receive/` | Explorer-start, geen Learn-pagina. |
| `/services/` en `/services/wallet-readiness-assessment/` | Diensten, inclusief een tweede previewformulier. |
| Editorial links op cataloguskaarten | Die optie wijzigt bestaande cataloguspagina’s. Die blijven onaangeroerd. |

`LEARN_FORCE` wordt geweigerd. Een pagina die een redacteur heeft gewijzigd, of een bestaande pagina zonder seedmarkering, wordt overgeslagen.

## Weergave

De template blijft `fides-learn`. De standaard in de plugin is de design-shell. Het mu-plugin zet de themaweergave aan op `utrecht-demo.local`, `staging.fides.community`, `fides.community` en `www.fides.community`. Het bestand kopiëren is die schakelaar. Op de designpilot en op elke andere host laat het de shell en de opgeslagen paden staan. Productie gebruikt dezelfde cataloguspaden als staging: `/ecosystem-explorer/…`, `/organizations/`, `/community-tools/glossary/` en `/about-fides/contact/`. Er staat geen staging- of lokaal adres in de metadata. De canonical wordt niet opgeslagen. Op staging wijst het mu-plugin de canonical van een Learn-pagina naar `https://fides.community` plus het pad, en zet `noindex, nofollow`. Op productie blijven de indexering en de canonical de bestaande site-instelling en de permalink.

Wisselen, op de lokale kopie, staging en productie: `wp option update fides_learn_trial_chrome shell` en terug met `wp option delete fides_learn_trial_chrome`.

## Versies

| Onderdeel | Bestaande site | Dit pakket |
| --- | --- | --- |
| Tiles | staging 1.13.32; productie 1.13.33 | 1.13.68 |
| Glossaryplugin | 1.1.15 | 1.1.15 |
| Catalogusplugins | ongewijzigd | ongewijzigd |
| WPML | op staging actief, hier niet aanwezig | niet gewijzigd, niet geactiveerd |

1.13.68 laat Learn de gepubliceerde glossary lezen. 1.13.67 houdt de Learn-inhoud wit; de blauwe strook blijft 100 px. 1.13.66 maakte die strook, maar de `background`-verkorting zette de witte paginagrond op transparant, zodat de blauwe bodykleur door de inhoud scheen. 1.13.65 toont de landkeuze ook in de design-shell. De zin onder het veld is weg. Op Learn in de themaweergave neemt de themaheader zijn eigen hoogte in boven de Learn-balk, in de bestaande themakleur. 1.13.64 toont het landveld als een dropdown met een neerwaarts pijltje. 1.13.63 zet op de trainingspagina de landkeuze uit Paper 24.28 en 24.27, alleen wanneer het mu-plugin `fides_ds_learn_country_picker` vult. 1.13.62 laat de themaweergave een trainings- of workshopknop naar `/about-fides/contact/` zetten wanneer het mu-plugin `fides_ds_learn_contact_buttons` vult. Zonder die filters, en in de design-shell, blijft de opgeslagen aanvraagknop en de opgeslagen intro staan. 1.13.61 verbergt ontbrekende bestemmingen en vervangt catalogusquery’s die deze site niet toepast, alleen als het mu-plugin die filters vult.

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

Learn en de glossarypagina gebruiken dezelfde URL. Die staat in `glossary-pin.json`: versie 1.12.2, 344 termen, commit-onafhankelijk gecontroleerd op de inhoud van `main`. De glossaryplugin blijft 1.1.15 en de glossarypagina blijft zoals hij is. Is de URL tijdelijk niet bereikbaar en is de cache leeg, dan toont Learn de definities uit de bundel. European Business Wallet, Credential en Credential Type staan niet in de bundel van 1.1.15, dus die drie blijven dan platte tekst. Staat er nog een verse cache, dan blijven de laatst gepubliceerde definities 10 minuten zichtbaar. De designpilot blijft zijn eigen lokale glossary gebruiken.

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

`WP_PATH` mag de map zijn waarin `wp-config.php` staat. Op de FIDES-multisite staat de core in `public_html/wp/` en `wp-config.php` één map hoger, in `public_html/`. Zet `WP_PATH` dan op `public_html/wp`. Plugins staan in `public_html/app/plugins/` en mu-plugins in `public_html/app/mu-plugins/`.

1. Bewaar de huidige tilesmap. Op productie staat tiles 1.13.33, alleen actief op de hoofdsite, niet netwerkbreed.
2. Controleer `shasum -a 256 -c SHA256SUMS` in de pakketmap.
3. Pak `plugins/fides-community-tools-tiles-1.13.68.zip` uit naar `public_html/app/plugins/fides-community-tools-tiles`. Geen symlink. Activeer de plugin op de hoofdsite, niet netwerkbreed.
4. Kopieer `mu-plugins/fides-learn-trial.php` naar `public_html/app/mu-plugins/`. Niet naar de designpilot en niet naar `/design-review`. Zodra tiles 1.13.68 staat, verwijder `/var/www/html/app/mu-plugins/fides-learn-header-fix.php` als dat bestand er nog is. Wijzig het hoofdmenu niet, op staging noch op productie.
5. Laat glossary op 1.1.15. Wijzig geen WPML-instelling en activeer geen taalwissel.
6. Dry-run. Daarna pas toepassen.

Controleer eerst de checksums in de pakketmap (`shasum -a 256 -c SHA256SUMS`). Pak daarna `plugins/fides-community-tools-tiles-1.13.68.zip` uit in `wp-content/plugins/` als een gewone map, geen symlink. Kopieer `mu-plugins/fides-learn-trial.php` naar `wp-content/mu-plugins/`. Verwijder daarna `/var/www/html/app/mu-plugins/fides-learn-header-fix.php` als dat bestand er nog is. Het stagingmenu niet aanpassen. SEO-titels en beschrijvingen staan in `seed/learn-trial/seo-control.md`. Het seed schrijft die naar de bestaande Yoast-velden en laat een afwijkende, niet-lege redacteurwaarde staan.

## Stagingmenu

Het menu op staging is handmatig gezet. Dit pakket wijzigt het niet en mag het niet overschrijven. Dit is de vastlegging voor de latere productiestap:

- Learn staat als eerste, met dit submenu:
  - Overview
  - Topics
  - Training & workshops
  - Glossary
- Organizations staat onder Ecosystem Explorer, direct boven Issuers.

Dry-run, vanaf de uitgepakte pakketmap. Op staging weigert het script tot `LEARN_TARGET=staging` gezet is:

```bash
WP_PATH=/pad/naar/wordpress bash seed/learn-trial/seed-trial.sh
WP_PATH=/pad/naar/wordpress LEARN_TARGET=staging bash seed/learn-trial/seed-trial.sh
```

Toepassen, alleen nadat de dry-run klopt:

```bash
WP_PATH=/pad/naar/wordpress LEARN_TARGET=staging LEARN_APPLY=1 bash seed/learn-trial/seed-trial.sh
```

`fides.community` en `www.fides.community` worden geweigerd tot `LEARN_TARGET=production` gezet is. Ook dan is het een dry-run, tot `LEARN_APPLY=1`. `LEARN_TARGET=staging` op die hosts wordt geweigerd. Een site onder `/design-review` of `/fides-design-pilot` wordt ook geweigerd, net als een site waarin `FIDES_DESIGN_PILOT` aan staat.

Productie is een multisite. `https://fides.community/` is site ID 1. Het script zet zelf `--url=https://fides.community/` en weigert een andere site, ook als `LEARN_TARGET=production` gezet is. De algemene pilot-seed blijft productie weigeren; alleen deze 52 Learn-routes mogen daarop. Het hoofdmenu wordt niet gewijzigd.

```bash
WP_PATH=/pad/naar/public_html/wp LEARN_TARGET=production bash seed/learn-trial/seed-trial.sh
WP_PATH=/pad/naar/public_html/wp LEARN_TARGET=production LEARN_APPLY=1 bash seed/learn-trial/seed-trial.sh
```

De productie-dry-run gebruikt `/community-tools/glossary/` in de opgeslagen glossarylinks. Op de lokale kopie blijft dat `/glossary/`.

De dry-run op deze kopie, vóór het aanmaken: 5 `unchanged`, 46 `would-created`, 6 pagina’s buiten de set, geen `skipped-edited` en geen `skipped-unmarked`. Na het aanmaken: 46 `created`, 5 `unchanged`.

Het rapport staat in `seed/learn-trial/reports/` in de pakketmap (of in `LEARN_REPORT_DIR` als die gezet is). Een apply schrijft daarnaast `installs/<host>-<tijdstip>.tsv`. Elke regel daarin is een pagina die déze run heeft aangemaakt: pagina-ID, route, seedmarker `_fides_learn_seed`, installatiemarker `_fides_learn_trial_install` en de hash van de pagina op dat moment. `created-routes.txt` is alleen een routelijst en is geen grond om pagina’s te verwijderen.

Op deze kopie hoort het bestand van de eerdere apply bij de 46 pagina’s die toen nieuw waren. De vijf pagina’s van de eerste proef stonden er al en staan niet in dat bestand: `learn`, `learn/topics`, `learn/topics/the-big-picture`, `learn/topics/the-big-picture/what-is-a-digital-wallet`, `learn/topics/the-big-picture/how-credentials-connect`.

Op staging eerst de dry-run lezen. Een `skipped-edited` of `skipped-unmarked` pagina niet forceren. Die komt ook niet in het installatiebestand. WPML-instellingen blijven zoals ze zijn. Nieuwe pagina’s niet aan een taal koppelen via een WPML-wijziging; controleer in de editor dat ze Engels zijn voordat de route opengaat.

## Terugzetten

Gebruik het installatiebestand van díe installatie. Eerst dry-run:

```bash
WP_PATH=/pad/naar/wordpress LEARN_LEDGER=/pad/naar/installs/host-tijdstip.tsv bash seed/learn-trial/rollback-trial.sh
```

Op staging hetzelfde, met `WP_PATH` en `LEARN_TARGET=staging`. Op productie hetzelfde, met `WP_PATH` naar `public_html/wp` en `LEARN_TARGET=production`. Het script kiest dan de hoofdsite `https://fides.community/` en weigert een andere site. Zonder dat doel weigert het script die hosts. De designpilot wordt altijd geweigerd. `LEARN_FORCE` blijft geweigerd.

Een pagina wordt alleen verwijderd als het ID, de route, `_fides_learn_seed`, `_fides_learn_trial_install` én de hash nog gelijk zijn aan de regel. Die vergelijking gebeurt voor alle regels voordat er iets wordt verwijderd. Daarna gaan de diepste routes eerst, zodat het pad van een onderliggende pagina geldig blijft tot die zelf aan de beurt is. Een pagina die er al was, blijft staan en verschijnt als `kept-existing`. Een pagina die na de installatie is bewerkt, blijft staan en verschijnt als `kept-edited`. Een ID dat niet meer bij deze marker hoort, blijft staan als `kept-marker` of `kept-missing`.

Pas daarna, als de dry-run klopt:

```bash
WP_PATH=/pad/naar/wordpress LEARN_TARGET=staging LEARN_LEDGER=/pad/naar/installs/host-tijdstip.tsv LEARN_ROLLBACK=1 bash seed/learn-trial/rollback-trial.sh
WP_PATH=/pad/naar/public_html/wp LEARN_TARGET=production LEARN_LEDGER=/pad/naar/installs/host-tijdstip.tsv LEARN_ROLLBACK=1 bash seed/learn-trial/rollback-trial.sh
```

Daarna het mu-plugin weghalen, de optie `fides_learn_trial_chrome` verwijderen als die bestaat, op productie tiles 1.13.33 terugzetten (de versie die daar nu actief is) en `wp rewrite flush`.

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
