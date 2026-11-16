# Learn-proef op de bestaande site

Lokale proef met vijf Learn-pagina’s. De designpilot blijft op de blauwe site-shell. Niets hiervan gaat naar staging of productie.

De proef draait op de lokale kopie `http://utrecht-demo.local`. Het actieve thema daar is `blocksy-child` (ouder Blocksy). `FIDES-child` staat geïnstalleerd en is niet geactiveerd. WPML is op deze kopie niet geïnstalleerd; er is geen taalwissel aangezet.

## Pagina’s

| Pad | Paginatype |
| --- | --- |
| `/learn/` | overzicht |
| `/learn/topics/` | Topics |
| `/learn/topics/the-big-picture/` | sectie |
| `/learn/topics/the-big-picture/what-is-a-digital-wallet/` | artikel |
| `/learn/topics/the-big-picture/how-credentials-connect/` | artikel |

Dezelfde template `fides-learn` en dezelfde opgeslagen inhoud. De weergave is een site-instelling:

- `shell` is de standaard in de plugin. De designpilot gebruikt die en is niet gewijzigd (dry-run: 58 pagina’s `unchanged`, live pagina toont de site-shell).
- `theme` staat alleen aan door `mu-plugins/fides-learn-trial.php`. Dat bestand zit niet op de designpilot.

Wisselen op de proefkopie: `wp option update fides_learn_trial_chrome shell` en terug met `wp option delete fides_learn_trial_chrome` (de standaard van het mu-plugin is `theme`).

## Versies

| Onderdeel | Voor | Proef |
| --- | --- | --- |
| Tiles | 1.13.32 | 1.13.60 |
| Glossaryplugin | 1.1.15 | 1.1.15 |
| Catalogusplugins | ongewijzigd | ongewijzigd |
| Thema | blocksy-child | blocksy-child |

1.13.60 is 1.13.59 plus de chrome-instelling. Zonder filter of constante blijft de shell staan en worden cataloguspaden niet herschreven.

### Tiles 1.13.32 tegenover 1.13.59, buiten Learn

Bestanden die op elk verzoek meeliften:

- `class-fides-catalog-source.php` en `class-fides-catalog-detail-seo.php`: een oud catalogus-id wordt alleen doorgestuurd als de geladen data een `legacyIds`-lijst heeft. Een gewone overzichtspagina zonder item-id verandert daardoor niet.
- `lib/fides-catalog-ui/fides-catalog-ui.css`: alleen de sluitknop van de melding dat catalogusdata verouderd is (groter aanraakvlak). De melding zelf verschijnt alleen als de catalogusbron te laat antwoordt.
- De nieuwe design-system-classes registreren shortcodes en templates. Ze schrijven geen header op pagina’s zonder die template. De nieuwe glossarypagina staat uit tot een site haar aanzet.

Na het vervangen van 1.13.32 door 1.13.60, en vóór de seed, waren homepage, glossary, use cases, walletcatalogus, credentialcatalogus, organizations, issuers en business wallets byte-voor-byte gelijk aan ervoor (na het weghalen van `?ver=`). Na de seed ook, doordat de proefpagina’s uit de automatische paginalijst in de header blijven.

## Installeren op een lokale kopie

1. Bewaar de map `wp-content/plugins/fides-community-tools-tiles`. Op deze kopie staat die kopie in `pilot-backup/learn-trial-utrecht-tiles-1.13.32`.
2. Zet tiles 1.13.60 uit de worktree `fides-community-tools-tiles` ervoor in de plaats. Maak geen symlink naar de designpilot.
3. Kopieer `learn-trial/mu-plugins/fides-learn-trial.php` naar `wp-content/mu-plugins/`. Pas de cataloguskaart daarin aan als de site andere paden heeft. Op een site met de fides.community-paden:

   | Opgeslagen pad | Bestemming |
   | --- | --- |
   | `/personal-wallets/` | `/ecosystem-explorer/personal-wallets/` |
   | `/business-wallets/` | `/ecosystem-explorer/organizational-wallets/` |
   | `/credentials/` | `/ecosystem-explorer/credential-catalog/` |
   | `/overview/` en `/use-case/` | `/ecosystem-explorer/use-cases/` |
   | `/issuers/` | `/ecosystem-explorer/issuer-catalog/` |
   | `/relying-parties/` | `/ecosystem-explorer/relying-party-catalog/` |
   | `/organizations/` | `/organizations/` |
   | glossary in de Leerbalk | `/community-tools/glossary/` |

4. Dry-run, daarna toepassen. Het script weigert de designpilot, `fides.community`, `www.fides.community` en `staging.fides.community`.

```bash
bash learn-trial/seed-trial.sh
LEARN_APPLY=1 bash learn-trial/seed-trial.sh
```

`LEARN_IDS` is de vijf paden. `LEARN_FORCE` blijft leeg. Editorial links worden niet geschreven. Een tweede run meldt de vijf pagina’s als `unchanged`.

## Terugzetten

1. Verwijder de pagina’s met meta `_fides_learn_seed` (op deze kopie de id’s 1699 tot en met 1703).
2. Verwijder `wp-content/mu-plugins/fides-learn-trial.php`.
3. Verwijder de optie `fides_learn_trial_chrome` als die bestaat.
4. Zet de bewaarde tiles 1.13.32 terug over de pluginmap.
5. `wp rewrite flush`.

Glossary, thema, catalogusplugins en vertaalinstellingen zijn niet gewijzigd.

## Cataloguslinks op deze kopie

In de themamodus wijst de opgeslagen inhoud naar de pagina’s die hier bestaan:

| Opgeslagen pad | Deze kopie |
| --- | --- |
| `/personal-wallets/` | `/wallet-catalog/` |
| `/business-wallets/` | `/business-wallets/` |
| `/credentials/` | `/credential-catalog/` |
| `/overview/` en `/use-case/?usecase=` | `/use-cases/` en `/use-cases/?usecase=` |
| `/issuers/` | `/issuer-catalog/` |
| glossary | `/glossary/` |

In de shellmodus blijven de opgeslagen paden staan (`/personal-wallets/`, `/use-case/?usecase=`). De shellheader wijst naar de designroutes, zoals `/ecosystem-explorer/use-cases/`. Die bestaan op deze kopie niet. De themamodus is de proef; de shellmodus is de controle dat dezelfde pagina’s de designheader kunnen tonen.

Er is hier geen relying-party-cataloguspagina. Deze vijf pagina’s linken daar niet naartoe.

Het begrip Credential heeft in glossary 1.1.15 geen entry. In het artikel blijft het gewone tekst. De andere begrippen openen het bestaande dialoog.

## Ontbrekende Learn-bestemmingen

Deze links blijven in de tekst staan. Ze geven 404 tot de rest van Learn wordt geseed.

- `/learn/sessions/`
- `/learn/sessions/eudi-business-wallets-in-practice/`
- `/learn/sessions/wallet-introduction/`
- `/learn/sessions/wallet-readiness-workshop/`
- `/learn/topics/for-you/`
- `/learn/topics/for-businesses/`
- `/learn/topics/for-governments/`
- `/learn/topics/ecosystem-roles/`
- `/learn/topics/ecosystem-roles/the-holder/`
- `/learn/topics/technology/`
- `/learn/topics/technology/how-do-wallets-and-services-exchange-information/`
- `/learn/topics/around-the-world/`
- `/learn/topics/the-big-picture/what-is-a-credential/`
- `/learn/topics/the-big-picture/formats-and-protocols/`
- `/learn/topics/the-big-picture/trust-and-interoperability/`
- `/learn/topics/the-big-picture/european-digital-identity-wallet/`
- `/learn/topics/the-big-picture/eudi-wallet-and-european-business-wallet/`
- `/learn/topics/for-businesses/accepting-information-from-a-wallet/`
- `/learn/topics/for-businesses/issuing-credentials-for-wallets/`
- `/learn/topics/for-businesses/business-wallets-where-to-start/`
- `/learn/topics/for-businesses/european-business-wallet/`

Het aanvraagformulier is niet geseed.

## Later naar het volledige design

1. Het mu-plugin weghalen, of `fides_learn_trial_chrome` op `shell` zetten. De vijf pagina’s, de template en de opgeslagen tekst blijven.
2. De cataloguskaart vervalt dan. De opgeslagen paden (`/personal-wallets/`, `/use-case/`, …) horen bij de designpagina’s. Die pagina’s moeten bestaan voordat de shell de proefvervanging is.
3. De overige Learn-pagina’s seeden met de gewone seed, dry-run eerst, zonder `LEARN_FORCE`. Pagina’s die een redacteur heeft gewijzigd worden overgeslagen.
4. Daarna elke interne link controleren. De lijst hierboven is de wachtrij.

## Getest op 16 november 2026

- Designpilot: `learn-behaviour.php` 116 geslaagd, 0 gefaald. Volledige Learn-seed dry-run: 58× `unchanged`. `http://localhost:10088/fides-design-pilot/learn/` toont de site-shell en niet de themacontainer.
- Lokale kopie, vóór en na tiles 1.13.60: homepage, glossary, use cases, walletcatalogus, credentialcatalogus, organizations, issuers en business wallets gelijk.
- Themavariant: de vijf pagina’s 200, Blocksy-header (`ct-header`, `main-container`), geen site-shell, geen taalwissel. Begrippoknoppen en bronnen op de twee artikelen. Use-casekaart wijst naar `/use-cases/?usecase=digital-certificate-of-good-conduct-vog-as-a-verifiable-credential-yjw4BC`.
- Dezelfde pagina’s in de shell: site-shell, geen themacontainer, cataloguslinks blijven de opgeslagen pilotpaden, geen taalwissel.
- Tweede seed: vijf pagina’s `unchanged`.
