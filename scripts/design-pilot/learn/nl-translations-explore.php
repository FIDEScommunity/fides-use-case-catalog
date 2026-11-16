<?php
/**
 * Dutch (nl_NL) texts for Explore by theme / sector (TranslatePress dictionary + gettext table), written by hand.
 *
 * Run with WP-CLI: wp eval-file learn/nl-translations-explore.php apply|status
 *  - apply:  fills rows that have no translation yet (status 0 / empty). A row an editor already translated (status 2 with
 *            text) is never touched. LOCAL pilot only.
 *  - status: lists rows still untranslated and strings without a row (open the pages under /nl/ first).
 * Matching is case-sensitive (BINARY); ampersands use the stored form (&amp;, &#038;).
 *
 * Shared labels that other pages also use (sector names, bundle titles, "Themes", "Sectors", "Wallets", "Organisations") are
 * filled here too because they were untranslated (status 0); they are listed in learn/nl-translation-changes-explore-themes-sectors.md
 * for editorial review. "Explore" itself is NOT translated here (site-wide navigation term, editors decide).
 */
$mode  = isset($args[0]) ? $args[0] : 'status';
if (! in_array(strtolower((string) wp_parse_url((string) get_option('home'), PHP_URL_HOST)), array('localhost', '127.0.0.1'), true) && $mode === 'apply') {
    fwrite(STDERR, "apply runs on the local pilot only.\n");
    exit(1);
}
$table = $GLOBALS['wpdb']->prefix . 'trp_dictionary_en_us_nl_nl';
$gtable = $GLOBALS['wpdb']->prefix . 'trp_gettext_nl_nl';

$nl = array(
    // Menu and page frame
    'Themes'                      => 'Thema’s',
    'Sectors'                     => 'Sectoren',
    'Explore / Themes'            => 'Explore / Thema’s',
    'Explore / Sectors'           => 'Explore / Sectoren',
    'Explore by theme'            => 'Ontdek per thema',
    'Explore by sector'           => 'Ontdek per sector',
    'Choose a theme to explore use cases, credential types and organisations across sectors.' => 'Kies een thema om usecases, credentialtypen en organisaties uit verschillende sectoren te verkennen.',
    'Choose a sector to see how digital trust is used, with examples and related organisations.' => 'Kies een sector om te zien hoe digitaal vertrouwen wordt gebruikt, met voorbeelden en gerelateerde organisaties.',
    'Choose a theme'              => 'Kies een thema',
    'Choose a sector'             => 'Kies een sector',
    '(selected)'                  => '(geselecteerd)',
    'Choose a theme to get started'  => 'Kies een thema om te beginnen',
    'Choose a sector to get started' => 'Kies een sector om te beginnen',
    'You’ll see an introduction, use cases and related credential types and organisations here.' => 'Hier ziet u een inleiding, usecases en bijbehorende credentialtypen en organisaties.',
    'Choose another theme'        => 'Kies een ander thema',
    'Choose another sector'       => 'Kies een andere sector',
    // Overview
    'Organisations'               => 'Organisaties',
    'Wallets'                     => 'Wallets',
    'Selected use cases'          => 'Geselecteerde usecases',
    'See all matching use cases'  => 'Bekijk alle passende usecases',
    'Personal wallet'             => 'Persoonlijke wallet',
    'Business wallet'             => 'Business wallet',
    'No examples yet'             => 'Nog geen voorbeelden',
    // Repair round 2026-11-14: status, catalog language, detail versus listing only
    'In production'               => 'In productie',
    'Not in production'           => 'Niet in productie',
    'Listing only'                => 'Alleen vermeld',
    'Catalog content is shown in English.' => 'Catalogusinhoud wordt in het Engels getoond.',
    'Names with an arrow open a page in this catalog. “Listing only” means an example names it, but the catalog has no page for it.' => 'Namen met een pijl openen een pagina in deze catalogus. “Alleen vermeld” betekent dat een voorbeeld de naam noemt, maar de catalogus er geen pagina voor heeft.',
    'Browse all use cases'        => 'Bekijk alle usecases',
    // Repair round 2026-11-14 (b): chosen name as heading, phone action
    'Change sector'               => 'Sector wijzigen',
    'Change theme'                => 'Thema wijzigen',
    // Theme titles and sector names
    'Identity &amp; Access'                => 'Identiteit en toegang',
    'Business &amp; Mandates'              => 'Bedrijven en mandaten',
    'Payments &amp; Commerce'              => 'Betalen en handel',
    'Work &amp; Qualifications'            => 'Werk en kwalificaties',
    'Products, Trade &amp; Supply Chains'  => 'Producten, handel en toeleveringsketens',
    'Government &amp; Compliance'          => 'Overheid en naleving',
    'Agriculture'    => 'Landbouw',
    'Construction'   => 'Bouw',
    'Digital'        => 'Digitaal',
    'Education'      => 'Onderwijs',
    'Energy'         => 'Energie',
    'Finance'        => 'Financiën',
    'Food'           => 'Voeding',
    'Healthcare'     => 'Gezondheidszorg',
    'Manufacturing'  => 'Industrie',
    'Mobility'       => 'Mobiliteit',
    'Public Sector'  => 'Publieke sector',
    'Retail'         => 'Retail',
    'Supply Chain'   => 'Toeleveringsketen',
    'Trade'          => 'Handel',
    // Introductions (theme bundles)
    'Many services need to know who they are dealing with, or whether someone may use them. These examples cover personal identity, onboarding and secure access, and show how wallets and credentials can be used to share only what is needed.' => 'Veel diensten willen weten met wie ze te maken hebben, of of iemand ze mag gebruiken. Deze voorbeelden gaan over persoonlijke identiteit, onboarding en veilige toegang, en laten zien hoe wallets en credentials kunnen worden gebruikt om alleen te delen wat nodig is.',
    'When someone opens a company bank account, submits a tender or signs for a supplier, the other party checks which organisation is involved and what that person is authorised to do. Wallets and credentials can help exchange evidence for both checks.' => 'Wanneer iemand een zakelijke bankrekening opent, een inschrijving indient of tekent voor een leverancier, controleert de andere partij welke organisatie erbij betrokken is en waartoe die persoon bevoegd is. Wallets en credentials kunnen helpen bij het uitwisselen van bewijs voor beide controles.',
    'Payments and commerce depend on knowing who is paying, who is being paid and what each party is entitled to do. These examples show how wallets and credentials can support trusted payments and other financial interactions.' => 'Betalen en handel hangen ervan af dat duidelijk is wie betaalt, wie wordt betaald en waartoe elke partij gerechtigd is. Deze voorbeelden laten zien hoe wallets en credentials betrouwbare betalingen en andere financiële transacties kunnen ondersteunen.',
    'Employers, schools and professional bodies often need to check diplomas, skills and professional status. These examples show how education, skills and professional evidence can be issued to a wallet and shared when it is needed.' => 'Werkgevers, scholen en beroepsorganisaties moeten vaak diploma’s, vaardigheden en beroepsstatus controleren. Deze voorbeelden laten zien hoe bewijs van onderwijs, vaardigheden en beroep aan een wallet kan worden uitgegeven en gedeeld wanneer dat nodig is.',
    'Products, shipments and trade documents pass through many organisations. These examples cover trade documents, digital product passports and trusted data sharing along the chain.' => 'Producten, zendingen en handelsdocumenten gaan langs veel organisaties. Deze voorbeelden gaan over handelsdocumenten, digitale productpaspoorten en betrouwbaar delen van gegevens langs de keten.',
    'Public services and regulators ask for evidence of identity, entitlement or compliance. These examples show what is exchanged between people, businesses and public bodies, and who checks it.' => 'Publieke diensten en toezichthouders vragen om bewijs van identiteit, recht op een voorziening of naleving. Deze voorbeelden laten zien wat er wordt uitgewisseld tussen mensen, bedrijven en overheden, en wie het controleert.',
    // Introductions (sectors)
    'Farms, producers and inspectors may need to show who produced something and under which rules. The examples show what information is exchanged and who checks it.' => 'Boerderijen, producenten en inspecteurs moeten mogelijk laten zien wie iets heeft geproduceerd en onder welke regels. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    'Construction projects involve many parties that may need to show identity, qualifications or permits. The examples show what information is exchanged and who checks it.' => 'Bij bouwprojecten zijn veel partijen betrokken die mogelijk identiteit, kwalificaties of vergunningen moeten aantonen. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    'Digital services and platforms may need to verify who is using them and what a person or organisation is entitled to do. The examples show what information is exchanged and who checks it.' => 'Digitale diensten en platforms moeten mogelijk nagaan wie ze gebruikt en waartoe een persoon of organisatie gerechtigd is. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    'Schools, universities and employers may need to verify enrolment, diplomas or other qualifications. The examples show what information is exchanged and who checks it.' => 'Scholen, universiteiten en werkgevers moeten mogelijk inschrijving, diploma’s of andere kwalificaties controleren. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    'Energy companies and other market participants may need to confirm who is involved and what they are authorised to do. The examples show what information is exchanged and who checks it.' => 'Energiebedrijven en andere marktpartijen moeten mogelijk bevestigen wie erbij betrokken is en waartoe ze bevoegd zijn. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    'Banks and other financial services may need to verify the identity of a person or company and what that person is authorised to do. The examples show what information is exchanged and who checks it.' => 'Banken en andere financiële dienstverleners moeten mogelijk de identiteit van een persoon of bedrijf controleren en waartoe die persoon bevoegd is. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    'Food producers, processors and retailers may need to show where products come from and how they were handled. The examples show what information is exchanged and who checks it.' => 'Voedselproducenten, verwerkers en winkels moeten mogelijk laten zien waar producten vandaan komen en hoe ze zijn behandeld. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    'Healthcare organisations may need to verify a clinician’s identity, check entitlement to care or confirm which organisation sent a report. The examples show what information is exchanged and who checks it.' => 'Zorgorganisaties moeten mogelijk de identiteit van een zorgverlener controleren, nagaan of iemand recht heeft op zorg of bevestigen welke organisatie een rapportage heeft verstuurd. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    'Manufacturers may need to share verified information about products, suppliers and compliance with their partners. The examples show what information is exchanged and who checks it.' => 'Fabrikanten moeten mogelijk geverifieerde informatie over producten, leveranciers en naleving met hun partners delen. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    'Travel and transport services may need to verify identity, driving entitlements or tickets. The examples show what information is exchanged and who checks it.' => 'Reis- en vervoersdiensten moeten mogelijk identiteit, rijbevoegdheid of tickets controleren. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    'Public bodies may need to verify identity or entitlement, and people may need to prove facts to public services. The examples show what information is exchanged and who checks it.' => 'Overheden moeten mogelijk identiteit of recht op een voorziening controleren, en mensen moeten mogelijk feiten aantonen bij publieke diensten. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    'Retailers and their customers may need to check information such as age or identity at the moment of sale. The examples show what information is exchanged and who checks it.' => 'Winkels en hun klanten moeten bij een verkoop mogelijk informatie controleren, zoals leeftijd of identiteit. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    'Supply chains involve many organisations that may need to share verified information about goods and who handled them. The examples show what information is exchanged and who checks it.' => 'In toeleveringsketens zijn veel organisaties betrokken die mogelijk geverifieerde informatie over goederen en over wie ze heeft behandeld moeten delen. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    'Trade between companies, also across borders, may need verified information about the parties and the documents involved. The examples show what information is exchanged and who checks it.' => 'Handel tussen bedrijven, ook over grenzen heen, vraagt mogelijk om geverifieerde informatie over de partijen en de documenten. De voorbeelden laten zien welke informatie wordt uitgewisseld en wie die controleert.',
    // Round 4 (2026-11-15): "More from the catalog"
    'More from the catalog'       => 'Meer uit de catalogus',
    // Round 6 (2026-11-16): simplified Themes and Sectors
    'Explore the catalogs'        => 'Verken de catalogi',
    'How are these selected?'     => 'Hoe is deze selectie gemaakt?',
    'Related credentials, organizations and wallets' => 'Gerelateerde credentials, organisaties en wallets',
    'Credential types'            => 'Credentialtypen',
    'Issuers'                     => 'Uitgevers',
    'Relying parties'             => 'Vertrouwende partijen',
    'Classified directly'         => 'Rechtstreeks ingedeeld',
    'Derived from related records' => 'Afgeleid van gerelateerde records',
    'View all credential types'   => 'Bekijk alle credentialtypen',
    'View all organisations'      => 'Bekijk alle organisaties',
    'View all issuers'            => 'Bekijk alle uitgevers',
    'View all relying parties'    => 'Bekijk alle vertrouwende partijen',
    // Learn links (the target page titles already have Dutch rows; "Learn" stays "Learn" in Dutch like the menu and the Learn bar)
    'Sharing information from a wallet · Learn →'                                  => 'Informatie delen vanuit een wallet · Learn →',
    'How can someone act for an organisation? · Learn →'                          => 'Hoe kan iemand namens een organisatie handelen? · Learn →',
    'Digital wallets and public services · Learn →'                                => 'Digitale wallets en publieke dienstverlening · Learn →',
    'What should a service check when receiving a credential? · Learn →'          => 'Wat moet een dienst controleren bij ontvangst van een credential? · Learn →',
);

/** Gettext format strings (domain fides-use-case-catalog); %-placeholders stay as they are. */
$gettext = array(
    array('fides-use-case-catalog', '“%s” is not a theme we know. Choose one of the options below.', '“%s” is geen thema dat we kennen. Kies een van de opties hieronder.'),
    array('fides-use-case-catalog', '“%s” is not a sector we know. Choose one of the options below.', '“%s” is geen sector die we kennen. Kies een van de opties hieronder.'),
    // Round 3 (2026-11-15): screen reader status message after choosing a theme / sector (aria-live), template with the chosen name
    array('fides-use-case-catalog', '%s selected', '%s geselecteerd'),
    array('fides-use-case-catalog', 'No selection', 'Geen selectie'),
    array('fides-use-case-catalog', 'Showing %1$d of %2$d use cases in the catalog.', '%1$d van de %2$d usecases in de catalogus.'),
    array('fides-use-case-catalog', 'One use case in the catalog.', 'Eén usecase in de catalogus.'),
    array('fides-use-case-catalog', '%d use cases in the catalog.', '%d usecases in de catalogus.'),
    array('fides-use-case-catalog', 'The catalog has no published use case here yet.', 'De catalogus bevat hier nog geen gepubliceerde usecase.'),
    array('fides-use-case-catalog', 'In the example shown', 'In het getoonde voorbeeld'),
    array('fides-use-case-catalog', 'Credential types in this example', 'Credentialtypen in dit voorbeeld'),
    array('fides-use-case-catalog', 'Credential types in these %d examples', 'Credentialtypen in deze %d voorbeelden'),
    array('fides-use-case-catalog', 'Organisations in this example', 'Organisaties in dit voorbeeld'),
    array('fides-use-case-catalog', 'Organisations in these %d examples', 'Organisaties in deze %d voorbeelden'),
    array('fides-use-case-catalog', 'Wallets in this example', 'Wallets in dit voorbeeld'),
    array('fides-use-case-catalog', 'Wallets in these %d examples', 'Wallets in deze %d voorbeelden'),
    array('fides-use-case-catalog', 'Showing %1$d of %2$d. Each is listed once, even when it appears in several examples.', 'Toont %1$d van %2$d. Elk item staat één keer in de lijst, ook als het in meerdere voorbeelden voorkomt.'),
    array('fides-use-case-catalog', '%d in total. Each is listed once, even when it appears in several examples.', '%d in totaal. Elk item staat één keer in de lijst, ook als het in meerdere voorbeelden voorkomt.'),
    array('fides-use-case-catalog', 'In %1$d of these %2$d examples', 'In %1$d van deze %2$d voorbeelden'),
    // Repair round 2026-11-14 (b)
    array('fides-use-case-catalog', 'Related use case', 'Gerelateerde usecase'),
    array('fides-use-case-catalog', '%d related use cases', '%d gerelateerde usecases'),
    array('fides-use-case-catalog', 'These credential types, organisations and wallets belong to the use case shown above.', 'Deze credentialtypen, organisaties en wallets horen bij de hierboven getoonde usecase.'),
    array('fides-use-case-catalog', 'These credential types, organisations and wallets belong to the use cases shown above.', 'Deze credentialtypen, organisaties en wallets horen bij de hierboven getoonde usecases.'),
    array('fides-use-case-catalog', '%d more listed in these examples. Open a use case to see them.', 'Nog %d genoemd in deze voorbeelden. Open een usecase om ze te zien.'),
    // Round 4 (2026-11-15): "More from the catalog" (u-vorm not needed: no direct address; terms follow learn/nl-terminology.md)
    array('fides-use-case-catalog', 'Records the catalogs classify under %s themselves, or reach through a related record. Each part says which.', 'Records die de catalogi zelf onder %s indelen, of die via een gerelateerd record bereikbaar zijn. Elk onderdeel zegt welke.'),
    array('fides-use-case-catalog', 'Credential types classified in the %s sector.', 'Credentialtypen die zijn ingedeeld in de sector %s.'),
    array('fides-use-case-catalog', 'Credential types classified under “%2$s”, the catalog theme behind %1$s.', 'Credentialtypen die zijn ingedeeld bij “%2$s”, het catalogusthema achter %1$s.'),
    array('fides-use-case-catalog', 'Credential types classified under any of these catalog themes, which together make up %1$s: %2$s.', 'Credentialtypen die zijn ingedeeld bij een van deze catalogusthema’s, die samen %1$s vormen: %2$s.'),
    array('fides-use-case-catalog', 'Organisations that list %s as a sector.', 'Organisaties die %s als sector hebben opgegeven.'),
    array('fides-use-case-catalog', 'Relying parties that list %s as a sector.', 'Vertrouwende partijen (relying parties) die %s als sector hebben opgegeven.'),
    array('fides-use-case-catalog', 'Issuers have no sector of their own. These are run by an organisation that lists %s as a sector.', 'Uitgevers (issuers) hebben geen eigen sector. Deze worden beheerd door een organisatie die %s als sector heeft opgegeven.'),
    array('fides-use-case-catalog', 'Issuers have no theme of their own. These issue credential types classified under the theme %s.', 'Uitgevers (issuers) hebben geen eigen thema. Deze geven credentialtypen uit die zijn ingedeeld bij het thema %s.'),
    array('fides-use-case-catalog', 'Relying parties have no theme of their own. These accept credential types classified under the theme %s.', 'Vertrouwende partijen (relying parties) hebben geen eigen thema. Deze accepteren credentialtypen die zijn ingedeeld bij het thema %s.'),
    array('fides-use-case-catalog', 'Also linked to a use case above:', 'Ook gekoppeld aan een usecase hierboven:'),
    array('fides-use-case-catalog', 'Showing %1$d of %2$d.', 'Toont %1$d van %2$d.'),
    // Round 6 (2026-11-16): one introduction above the catalog selection
    array('fides-use-case-catalog', 'Explore records related to this theme or sector across the FIDES catalogs.', 'Bekijk records die in de FIDES-catalogi aan dit thema of deze sector zijn gekoppeld.'),
);

/**
 * Corrections of rows this script (or its first version) filled: old Dutch => new Dutch. A row is only rewritten while it still
 * holds exactly the expected old Dutch, so a text an editor changed in the meantime is never touched. Source, old and new text:
 * learn/nl-translation-changes-themes-sectors-repair-2026-11-14.md.
 */
$corrections = array(
    array('Business &amp; Mandates', 'Bedrijven en machtigingen', 'Bedrijven en mandaten'),
    array('Explore by theme', 'Verken per thema', 'Ontdek per thema'),
    array('Explore by sector', 'Verken per sector', 'Ontdek per sector'),
    array('Business wallet', 'Zakelijke wallet', 'Business wallet'),
    array('Sharing information from a wallet · Learn →', 'Informatie delen vanuit een wallet · Leren →', 'Informatie delen vanuit een wallet · Learn →'),
    array('How can someone act for an organisation? · Learn →', 'Hoe kan iemand namens een organisatie handelen? · Leren →', 'Hoe kan iemand namens een organisatie handelen? · Learn →'),
    array('Digital wallets and public services · Learn →', 'Digitale wallets en publieke dienstverlening · Leren →', 'Digitale wallets en publieke dienstverlening · Learn →'),
    array('What should a service check when receiving a credential? · Learn →', 'Wat moet een dienst controleren bij ontvangst van een credential? · Leren →', 'Wat moet een dienst controleren bij ontvangst van een credential? · Learn →'),
);

$forms = array(
    'plain' => static function (string $s): string { return $s; },
    'amp'   => static function (string $s): string { return str_replace('&', '&amp;', $s); },
    'num'   => static function (string $s): string { return str_replace('&', '&#038;', $s); },
);

global $wpdb;
$corrected = 0;
$corrected_ids = array();
foreach ($corrections as $c) {
    foreach ($forms as $form) {
        foreach (array($c[0], html_entity_decode($c[0], ENT_QUOTES)) as $variant) {
            $row = $wpdb->get_row($wpdb->prepare("SELECT id, translated FROM $table WHERE BINARY original = %s LIMIT 1", $form($variant))); // phpcs:ignore
            if ($row && ! isset($corrected_ids[ (int) $row->id ]) && (string) $row->translated === $form(html_entity_decode($c[1], ENT_QUOTES))) {
                $corrected_ids[ (int) $row->id ] = true;
                if ($mode === 'apply') {
                    $wpdb->update($table, array('translated' => $form(html_entity_decode($c[2], ENT_QUOTES)), 'status' => 2), array('id' => (int) $row->id));
                }
                $corrected++;
            }
        }
    }
}
echo ($mode === 'apply' ? 'corrected' : 'to correct') . ": $corrected\n";
$filled = 0;
$kept   = 0;
$absent = array();
foreach ($nl as $en => $dutch) {
    $found = false;
    $seen  = array();
    $plain_en = html_entity_decode($en, ENT_QUOTES);
    foreach ($forms as $form) {
        foreach (array($en, $plain_en) as $variant) {
            if (isset($seen[ $form($variant) ])) {
                continue;
            }
            $seen[ $form($variant) ] = true;
            $row = $wpdb->get_row($wpdb->prepare("SELECT id, translated, status FROM $table WHERE BINARY original = %s LIMIT 1", $form($variant))); // phpcs:ignore
            if (! $row) {
                continue;
            }
            $found = true;
            if ((int) $row->status === 2 && (string) $row->translated !== '') {
                $kept++;
                continue;
            }
            if ($mode === 'apply') {
                $wpdb->update($table, array('translated' => $form(html_entity_decode($dutch, ENT_QUOTES)), 'status' => 2), array('id' => (int) $row->id));
            }
            $filled++;
        }
    }
    if (! $found) {
        $absent[] = $en;
    }
}
$g_filled = 0;
$g_absent = array();
foreach ($gettext as $g) {
    $row = $wpdb->get_row($wpdb->prepare("SELECT id, translated FROM $gtable WHERE domain = %s AND BINARY original = %s LIMIT 1", $g[0], $g[1])); // phpcs:ignore
    if (! $row) {
        $g_absent[] = $g[1];
        continue;
    }
    if (trim((string) $row->translated) === '') {
        if ($mode === 'apply') {
            $wpdb->update($gtable, array('translated' => $g[2], 'status' => 2), array('id' => (int) $row->id));
        }
        $g_filled++;
    }
}
echo ($mode === 'apply' ? 'filled' : 'untranslated') . ": $filled, already translated (kept): $kept, no dictionary row yet: " . count($absent) . "\n";
foreach ($absent as $en) {
    echo '  - ' . substr($en, 0, 90) . "\n";
}
echo 'gettext ' . ($mode === 'apply' ? 'filled' : 'untranslated') . ": $g_filled, no gettext row yet: " . count($g_absent) . "\n";
foreach ($g_absent as $en) {
    echo '  - ' . $en . "\n";
}
