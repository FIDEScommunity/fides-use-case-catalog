<?php
/**
 * Dutch (nl_NL) texts for the Services pages, the enquiry form and the Training & workshops blocks that
 * point to Services, written by hand. They go into the TranslatePress dictionary (wp_trp_dictionary_en_us_nl_nl).
 *
 * Run with WP-CLI: wp eval-file learn/nl-translations.php apply|status
 *  - apply:  fills rows that have no translation yet. A row an editor already translated (status 2) is never
 *            touched. Rows only exist after the English page was opened once under /nl/.
 *  - status: lists strings without a dictionary row (open the page under /nl/ first) and rows still untranslated.
 * Matching is case-sensitive (BINARY): "WORK WITH FIDES" and "Work with FIDES" are separate rows.
 * Ampersands: TranslatePress stores some originals as "&amp;" or "&#038;"; the matching form is used for the translation.
 */
$mode  = isset($args[0]) ? $args[0] : 'status';
$table = $GLOBALS['wpdb']->prefix . 'trp_dictionary_en_us_nl_nl';

$nl = array(
    // Header: About FIDES panel
    'About'                                   => 'Over',
    'Work with FIDES'                         => 'Werken met FIDES',
    'Services'                                => 'Diensten',
    // Services overview
    'WORK WITH FIDES'                         => 'WERKEN MET FIDES',
    'Practical support for digital wallets and credentials.' => 'Praktische ondersteuning bij digitale wallets en credentials.',
    'Work out what digital wallets and credentials mean for your organisation. We combine independent advice with practical examples, market knowledge and experience from across the ecosystem.' => 'Ontdek wat digitale wallets en credentials voor uw organisatie betekenen. Wij combineren onafhankelijk advies met praktijkvoorbeelden, marktkennis en ervaring uit het hele ecosysteem.',
    'Discuss your question'                   => 'Bespreek uw vraag',
    'How can we help?'                        => 'Waarmee kunnen wij u helpen?',
    'Tell us what you want to achieve. We will help you find a suitable next step.' => 'Vertel ons wat u wilt bereiken. Wij helpen u een passende vervolgstap te vinden.',
    '(Explore the assessment)'                => '(Bekijk het assessment)',
    'Explore the assessment'                  => 'Bekijk het assessment',
    'Understand the potential impact on a service or process and identify the decisions and gaps to address.' => 'Inzicht in de mogelijke impact op een dienst of proces, en in de besluiten en aandachtspunten die daarbij horen.',
    'Use case and business case'              => 'Usecase en businesscase',
    '(Discuss your use case)'                 => '(Bespreek uw usecase)',
    'Discuss your use case'                   => 'Bespreek uw usecase',
    'Develop an idea into a practical proposal, with the organisations, evidence and decisions it needs.' => 'Werk een idee uit tot een praktisch voorstel, met de organisaties, onderbouwing en besluiten die daarvoor nodig zijn.',
    'Independent advice and selection'        => 'Onafhankelijk advies en selectie',
    '(Discuss your options)'                  => '(Bespreek uw opties)',
    'Discuss your options'                    => 'Bespreek uw opties',
    'Compare credentials, wallets and providers against your requirements.' => 'Vergelijk credentials, wallets en aanbieders met uw eisen.',
    'Project and ecosystem coordination'      => 'Project- en ecosysteemcoördinatie',
    '(Discuss your project)'                  => '(Bespreek uw project)',
    'Discuss your project'                    => 'Bespreek uw project',
    'Bring the right parties together and coordinate the work needed to move a use case forward.' => 'Breng de juiste partijen samen en coördineer het werk dat nodig is om een usecase vooruit te helpen.',
    'Want to learn with your team?'           => 'Wilt u samen met uw team leren?',
    'Start with an open training, an introduction session or a readiness workshop.' => 'Begin met een open training, een introductiesessie of een readiness workshop.',
    'Explore training & workshops'            => 'Bekijk trainingen en workshops',
    // Readiness assessment
    'Wallet readiness assessment'             => 'Wallet readiness assessment',
    'FIDES SERVICES · READINESS'              => 'FIDES-DIENSTEN · READINESS',
    'Prepare your service for digital wallets.' => 'Bereid uw dienst voor op digitale wallets.',
    'Together, we examine what wallet adoption could mean for one of your services or processes, and what your team needs to decide.' => 'Samen onderzoeken wij wat de introductie van wallets kan betekenen voor een van uw diensten of processen, en wat uw team moet beslissen.',
    'Discuss an assessment'                   => 'Bespreek een assessment',
    'Explore the workshop'                    => 'Bekijk de workshop',
    'Explore the workshop →'                  => 'Bekijk de workshop →',
    'What we look at'                         => 'Waar wij naar kijken',
    'We start with your service, the information it needs and the organisations involved. We examine the relevant roles, requirements and open questions.' => 'Wij beginnen bij uw dienst, de informatie die daarvoor nodig is en de betrokken organisaties. Wij bekijken de relevante rollen, eisen en open vragen.',
    'The assessment can cover'                => 'Het assessment kan bestaan uit',
    'Your service, users and required information.' => 'Uw dienst, gebruikers en benodigde informatie.',
    'Roles, relevant requirements and dependencies.' => 'Rollen, relevante eisen en afhankelijkheden.',
    'Options, open questions and possible next steps.' => 'Opties, open vragen en mogelijke vervolgstappen.',
    'The scope and form of the findings are agreed with you before the assessment starts.' => 'De scope en de vorm van de bevindingen spreken wij met u af voordat het assessment begint.',
    'Assessment details'                      => 'Praktische informatie',
    'Organisations preparing a wallet-based service or process' => 'Organisaties die een dienst of proces met wallets voorbereiden',
    'Starting point'                          => 'Startpunt',
    'A service, process or decision'          => 'Een dienst, proces of besluit',
    'Getting started'                         => 'Aan de slag',
    'Contact us to discuss your requirements.' => 'Neem contact met ons op om uw wensen te bespreken.',
    'Independent advice'                      => 'Onafhankelijk advies',
    'We start with your requirements and work with specialists where appropriate.' => 'Wij beginnen bij uw eisen en werken waar nodig samen met specialisten.',
    'Availability'                            => 'Beschikbaarheid',
    'Primarily available in the Netherlands. Contact us to discuss your requirements and location.' => 'Vooral beschikbaar in Nederland. Neem contact met ons op om uw wensen en locatie te bespreken.',
    'How it works'                            => 'Hoe het werkt',
    'Discuss your question.'                  => 'Bespreek uw vraag.',
    'Tell us about the service or process you want to examine. We agree the scope before work starts.' => 'Vertel ons over de dienst of het proces dat u wilt onderzoeken. Wij spreken de scope af voordat het werk begint.',
    'Examine your starting point.'            => 'Onderzoek uw startpunt.',
    'We review the relevant roles, information, requirements and dependencies with your team.' => 'Wij bekijken samen met uw team de relevante rollen, informatie, eisen en afhankelijkheden.',
    'Discuss the findings.'                   => 'Bespreek de bevindingen.',
    'We discuss open questions, decisions and possible next steps. The form of the findings is agreed in advance.' => 'Wij bespreken open vragen, besluiten en mogelijke vervolgstappen. De vorm van de bevindingen spreken wij vooraf af.',
    'Workshop or assessment?'                 => 'Workshop of assessment?',
    'Readiness workshop'                      => 'Readiness workshop',
    'Bring your team together to discuss use cases, impact and first priorities.' => 'Breng uw team samen om usecases, impact en eerste prioriteiten te bespreken.',
    'Readiness assessment'                    => 'Readiness assessment',
    'Examine a defined service or process in more detail and discuss the decisions it raises.' => 'Onderzoek een afgebakende dienst of een afgebakend proces in meer detail en bespreek de besluiten die daaruit volgen.',
    'See wallets in practice'                 => 'Bekijk wallets in de praktijk',
    'Explore use cases and the organisations, wallets and credentials connected to them.' => 'Verken usecases en de organisaties, wallets en credentials die daaraan verbonden zijn.',
    'Browse use cases →'                      => 'Bekijk usecases →',
    'Browse use cases'                        => 'Bekijk usecases',
    'Tell us what you want to assess.'        => 'Vertel ons wat u wilt laten onderzoeken.',
    'Share your question and we can discuss a suitable next step.' => 'Deel uw vraag, dan bespreken wij een passende vervolgstap.',
    // Training & workshops: links to Services, availability, partnerships
    'Architecture assessment'                 => 'Architecture assessment',
    'A closer look at the technical and organisational choices behind a wallet service. It can follow a workshop, and we discuss it case by case. There is nothing to book yet.' => 'Een nadere blik op de technische en organisatorische keuzes achter een wallet-dienst. Het kan volgen op een workshop en wij bespreken het per situatie. Er is nog niets te boeken.',
    'Help to turn a use case into a business case and an implementation plan. It can also follow a workshop, and we discuss it case by case. There is nothing to book yet.' => 'Hulp om van een usecase een businesscase en een implementatieplan te maken. Het kan ook volgen op een workshop en wij bespreken het per situatie. Er is nog niets te boeken.',
    'See the services overview →'             => 'Bekijk het dienstenoverzicht →',
    'Do you run training courses and want to offer one on digital wallets and verifiable credentials? FIDES would like to talk with training providers, including outside the Netherlands. These conversations are at an early stage: there is no partner network or programme to join yet, and nothing is agreed in advance.' => 'Geeft u cursussen en wilt u er een aanbieden over digitale wallets en verifieerbare credentials? FIDES gaat graag in gesprek met opleiders, ook buiten Nederland. Deze gesprekken staan nog aan het begin: er is nog geen partnernetwerk of programma om aan deel te nemen en er is vooraf niets afgesproken.',
    'Are you a training provider who wants to offer a practical course on digital wallets and verifiable credentials? We would like to talk, in the Netherlands or elsewhere.' => 'Bent u een opleider die een praktische cursus over digitale wallets en verifieerbare credentials wil aanbieden? Wij gaan graag in gesprek, in Nederland of daarbuiten.',
    'Discuss a partnership'                   => 'Bespreek een samenwerking',
    'FIDES would like to talk with training providers who want to offer practical courses on digital wallets and verifiable credentials. This includes providers outside the Netherlands. FIDES currently offers its own training and services mostly in the Netherlands.' => 'FIDES gaat graag in gesprek met opleiders die praktische cursussen over digitale wallets en verifieerbare credentials willen aanbieden. Dat geldt ook voor opleiders buiten Nederland. FIDES biedt zijn eigen trainingen en diensten nu vooral in Nederland aan.',
    'These conversations are at an early stage. There is no partner network, programme or booking process to join yet. Tell us what you have in mind and we will discuss whether and how we could work together.' => 'Deze gesprekken staan nog aan het begin. Er is nog geen partnernetwerk, programma of boekingsproces om aan deel te nemen. Vertel ons wat u voor ogen hebt, dan bespreken wij of en hoe wij kunnen samenwerken.',
    'The final price is agreed in a proposal before booking.' => 'De definitieve prijs wordt vóór boeking in een voorstel afgesproken.',
    'Want to look at impact and priorities?'  => 'Wilt u kijken naar impact en prioriteiten?',
    'The Wallet Readiness Workshop works through use cases, impact and first priorities with your team.' => 'In de Wallet Readiness Workshop werkt uw team aan usecases, impact en eerste prioriteiten.',
    'Need more than a first view?'            => 'Hebt u meer nodig dan een eerste beeld?',
    'A closer look at one service or process can follow as a separate step, for example a readiness assessment.' => 'Een nadere blik op één dienst of proces kan volgen als aparte stap, bijvoorbeeld een readiness assessment.',
    'View readiness assessment'               => 'Bekijk het readiness assessment',
    // Enquiry form (shared by Training & workshops and Services)
    'Learn / Session enquiry'                 => 'Learn / Sessieaanvraag',
    'Tell us what you need.'                  => 'Vertel ons wat u nodig hebt.',
    'Choose a training date or tell us about your team. No account is needed, and nothing is booked or paid through this form.' => 'Kies een trainingsdatum of vertel ons over uw team. U hebt geen account nodig en er wordt via dit formulier niets geboekt of betaald.',
    'Back to %s'                              => 'Terug naar %s',
    'Return to %s'                            => 'Terug naar %s',
    'Return to the offering'                  => 'Terug naar het aanbod',
    'no specific offering'                    => 'geen specifiek aanbod',
    'Offering: %s'                            => 'Aanbod: %s',
    'No specific offering chosen.'            => 'Geen specifiek aanbod gekozen.',
    'Enter your email address.'               => 'Vul uw e-mailadres in.',
    'Enter a value for %s.'                   => 'Vul een waarde in voor %s.',
    'Enter an email address like name@organisation.com.' => 'Vul een e-mailadres in zoals naam@organisatie.nl.',
    'Check your entries'                      => 'Controleer uw invoer',
    '(optional)'                              => '(optioneel)',
    'Send enquiry'                            => 'Aanvraag versturen',
    'What should the session help your team understand?' => 'Wat moet de sessie uw team helpen begrijpen?',
    'What should the session help your team understand? *' => 'Wat moet de sessie uw team helpen begrijpen? *',
    'For example: our management team wants to understand wallet roles and what they could mean for our services.' => 'Bijvoorbeeld: ons managementteam wil de rollen rond wallets begrijpen en wat die kunnen betekenen voor onze diensten.',
    'Questions or comments'                   => 'Vragen of opmerkingen',
    'For example: who from your organisation would join, or anything we should know.' => 'Bijvoorbeeld: wie van uw organisatie meedoet, of iets anders dat wij moeten weten.',
    'Send session enquiry'                    => 'Sessieaanvraag versturen',
    'Which service or decision do you want to look at?' => 'Naar welke dienst of welk besluit wilt u kijken?',
    'For example: we want to understand what business wallets could mean for our supplier onboarding service.' => 'Bijvoorbeeld: wij willen begrijpen wat business wallets kunnen betekenen voor onze dienst voor het onboarden van leveranciers.',
    'Send workshop enquiry'                   => 'Workshopaanvraag versturen',
    'What would you like to discuss?'         => 'Wat wilt u bespreken?',
    'What would you like to discuss? *'       => 'Wat wilt u bespreken? *',
    'For example: our organisation offers courses on digital identity and wants to add a course on wallets.' => 'Bijvoorbeeld: onze organisatie biedt cursussen over digitale identiteit aan en wil er een over wallets aan toevoegen.',
    'Send partnership enquiry'                => 'Samenwerkingsaanvraag versturen',
    'Which topics would you like to hear about?' => 'Over welke onderwerpen wilt u meer horen?',
    'For example: business wallets and digital representation.' => 'Bijvoorbeeld: business wallets en digitale vertegenwoordiging.',
    'Local pilot view.'                       => 'Lokale pilotweergave.',
    'Nothing you enter here is sent or stored. No email is sent, nothing is booked and nothing is paid. The form only checks your entries and shows what would happen next.' => 'Wat u hier invult, wordt niet verstuurd of opgeslagen. Er wordt geen e-mail verzonden, er wordt niets geboekt en er wordt niets betaald. Het formulier controleert alleen uw invoer en laat zien wat er hierna zou gebeuren.',
    'JavaScript is needed for this preview form.' => 'Voor dit voorbeeldformulier is JavaScript nodig.',
    'Fields marked * are required.'           => 'Velden met een * zijn verplicht.',
    'Offering'                                => 'Aanbod',
    'No specific offering'                    => 'Geen specifiek aanbod',
    'Interest in a webinar or roundtable'     => 'Interesse in een webinar of rondetafelgesprek',
    'Name *'                                  => 'Naam *',
    'Email *'                                 => 'E-mailadres *',
    'Organisation *'                          => 'Organisatie *',
    'Preferred date *'                        => 'Voorkeursdatum *',
    'Choose a date'                           => 'Kies een datum',
    'Thursday 10 December 2026 · Utrecht'     => 'Donderdag 10 december 2026 · Utrecht',
    'Thursday 14 January 2027 · Utrecht'      => 'Donderdag 14 januari 2027 · Utrecht',
    'Thursday 4 February 2027 · Utrecht'      => 'Donderdag 4 februari 2027 · Utrecht',
    'Thursday 18 March 2027 · Utrecht'        => 'Donderdag 18 maart 2027 · Utrecht',
    'Not sure yet, keep me informed'          => 'Nog niet zeker, houd mij op de hoogte',
    'Preferred timing or format (optional)'   => 'Voorkeur voor timing of vorm (optioneel)',
    'Add a preference or leave this open'     => 'Voeg een voorkeur toe of laat dit open',
    'As soon as possible'                     => 'Zo snel mogelijk',
    'Within the next quarter'                 => 'Binnen het komende kwartaal',
    'Later this year'                         => 'Later dit jaar',
    'In person'                               => 'Op locatie',
    'We use your name, email address, organisation and message only to respond to this request. We keep them for [retention period to be decided]. Read our' => 'Wij gebruiken uw naam, e-mailadres, organisatie en bericht alleen om op deze aanvraag te reageren. Wij bewaren deze gegevens gedurende [bewaartermijn nog te bepalen]. Lees ons',
    'Privacy Policy'                          => 'privacybeleid',
    '. Please leave out sensitive personal data and confidential project documents.' => '. Laat gevoelige persoonsgegevens en vertrouwelijke projectdocumenten weg.',
    'This is a request for contact, not a paid order.' => 'Dit is een verzoek om contact, geen betaalde bestelling.',
    'Preview only: nothing was sent'          => 'Alleen een voorbeeld: er is niets verstuurd',
    'Your entries passed the checks. This pilot has no mail, storage or booking, so no request exists. In a live version the request would go to the FIDES Labs team; the offering, scope and fee would be agreed before any booking.' => 'Uw invoer voldoet aan de controles. In deze pilot is geen e-mail, opslag of boeking, dus er bestaat geen aanvraag. In een live versie zou de aanvraag naar het FIDES Labs-team gaan; aanbod, scope en kosten worden vóór een boeking afgesproken.',
    'Edit your request'                       => 'Uw aanvraag aanpassen',
    'What happens next'                       => 'Wat er daarna gebeurt',
    'We read your enquiry and reply by email.' => 'Wij lezen uw aanvraag en reageren per e-mail.',
    'If it fits, we discuss the content with you.' => 'Past het, dan bespreken wij de inhoud met u.',
    'We send a proposal with scope and price. You decide after that.' => 'Wij sturen een voorstel met scope en prijs. Daarna beslist u.',
    'Your starting point'                     => 'Uw startpunt',
    'Remove this context'                     => 'Verwijder deze context',
    'You can change the topic without starting over.' => 'U kunt het onderwerp wijzigen zonder opnieuw te beginnen.',
    'Still exploring?'                        => 'Nog aan het verkennen?',
    'Your name'                               => 'Uw naam',
    'you@organisation.com'                    => 'u@organisatie.nl',
    'Organisation name'                       => 'Naam van de organisatie',
    // Enquiry: Services
    'Services / Enquiry'                      => 'Diensten / Aanvraag',
    'Tell us what you want to discuss.'       => 'Vertel ons wat u wilt bespreken.',
    'Share your question. No account is needed, and nothing is booked or paid through this form.' => 'Deel uw vraag. U hebt geen account nodig en er wordt via dit formulier niets geboekt of betaald.',
    'Which service, process or decision do you want to assess?' => 'Welke dienst, welk proces of welk besluit wilt u laten onderzoeken?',
    'Which service, process or decision do you want to assess? *' => 'Welke dienst, welk proces of welk besluit wilt u laten onderzoeken? *',
    'For example: we are preparing a credential-based onboarding service and want to know which decisions are open.' => 'Bijvoorbeeld: wij bereiden een onboardingdienst met credentials voor en willen weten welke besluiten nog openstaan.',
    'Send assessment enquiry'                 => 'Assessmentaanvraag versturen',
    'Your entries passed the checks. This pilot has no mail, storage or booking, so no request exists. In a live version the request would go to the FIDES Labs team, who would discuss your question and agree the scope with you before any work starts.' => 'Uw invoer voldoet aan de controles. In deze pilot is geen e-mail, opslag of boeking, dus er bestaat geen aanvraag. In een live versie zou de aanvraag naar het FIDES Labs-team gaan, dat uw vraag zou bespreken en de scope met u zou afspreken voordat er werk begint.',
    'This form is a preview. Once it is live, this is what will happen:' => 'Dit formulier is een voorbeeld. Zodra het live staat, gebeurt het volgende:',
    'We will read your enquiry and reply by email.' => 'Wij lezen uw aanvraag en reageren per e-mail.',
    'We will discuss your question and what would help.' => 'Wij bespreken uw vraag en wat u zou helpen.',
    'If it fits, we will agree the scope with you before any work starts.' => 'Past het, dan spreken wij de scope met u af voordat er werk begint.',
    'Services · Wallet readiness assessment'  => 'Diensten · Wallet readiness assessment',
    'Services · no specific offering'         => 'Diensten · geen specifiek aanbod',
    'Back to Services'                        => 'Terug naar Diensten',
    'Tell us about your question or project.' => 'Vertel ons over uw vraag of project.',
    'Describe the service you are interested in, or the question or project you want to discuss. No account is needed, and nothing is booked or paid through this form.' => 'Beschrijf de dienst waarin u geïnteresseerd bent, of de vraag of het project dat u wilt bespreken. U hebt geen account nodig en er wordt via dit formulier niets geboekt of betaald.',
    'This is an enquiry, not a booking or a payment.' => 'Dit is een vraag, geen boeking en geen betaling.',
    'Tell us what you want to discuss. We reply by email and agree the scope and fee with you before any work starts.' => 'Vertel ons wat u wilt bespreken. Wij reageren per e-mail en spreken de reikwijdte en kosten met u af voordat er werk begint.',
    'Choose the service your enquiry is about, or leave it open.' => 'Kies de dienst waar uw vraag over gaat, of laat dit open.',
    'Your question or project'                => 'Uw vraag of project',
    'General service question'                => 'Algemene vraag over diensten',
    'Describe what you want to discuss. Please leave out sensitive personal data and confidential documents.' => 'Beschrijf wat u wilt bespreken. Laat gevoelige persoonsgegevens en vertrouwelijke documenten weg.',
    'Back to Training & workshops'            => 'Terug naar Training & workshops',
    'Back to EUDI & Business Wallets in Practice' => 'Terug naar EUDI & Business Wallets in Practice',
    'Back to Wallet Readiness Workshop'       => 'Terug naar Wallet Readiness Workshop',
    'Back to Training partnerships'           => 'Terug naar Samenwerken aan trainingen',
    'Return to Services'                      => 'Terug naar Diensten',
    'Back to Wallet readiness assessment'     => 'Terug naar Wallet readiness assessment',
    'Back to Wallet Introduction'             => 'Terug naar Wallet Introduction',
    'For example: we are preparing a service that could use digital wallets.' => 'Bijvoorbeeld: wij bereiden een dienst voor die digitale wallets kan gebruiken.',
    // WPForms request form (page /learn/sessions/request-wpforms/). TranslatePress reaches the form HTML; the mail texts,
    // the confirmation and the script validation messages are Dutch in Fides_DS_Request_Form because TranslatePress does not.
    'Learn / Request'                         => 'Leren / Aanvraag',
    'Tell us what you need.'                  => 'Vertel ons wat u nodig hebt.',
    'This is a request, not a booking or a payment.' => 'Dit is een aanvraag, geen boeking en geen betaling.',
    'Tell us what you are interested in. We reply by email and agree the content, dates and fee with you before anything is booked.' => 'Vertel ons waar u interesse in hebt. Wij reageren per e-mail en spreken de inhoud, data en kosten met u af voordat er iets wordt geboekt.',
    'Offering'                                => 'Aanbod',
    'Choose what your request is about, or leave it open.' => 'Kies waar uw aanvraag over gaat, of laat dit open.',
    'Preferred date'                          => 'Voorkeursdatum',
    'Choose a date'                           => 'Kies een datum',
    'Name'                                    => 'Naam',
    'Email'                                   => 'E-mail',
    'We use this address to reply and to send a confirmation.' => 'Wij gebruiken dit adres om te antwoorden en een bevestiging te sturen.',
    'Organisation (optional)'                 => 'Organisatie (optioneel)',
    'Your question or message'                => 'Uw vraag of bericht',
    'Please leave out sensitive personal data and confidential documents.' => 'Laat gevoelige persoonsgegevens en vertrouwelijke documenten weg.',
    'Send request'                            => 'Aanvraag versturen',
    'We read your request and reply by email.' => 'Wij lezen uw aanvraag en reageren per e-mail.',
);

/** The forms TranslatePress may have stored an original in. */
$forms = array(
    'plain' => static function (string $s): string { return $s; },
    'amp'   => static function (string $s): string { return str_replace('&', '&amp;', $s); },
    'num'   => static function (string $s): string { return str_replace('&', '&#038;', $s); },
);

global $wpdb;
$filled = 0;
$kept   = 0;
$absent = array();
foreach ($nl as $en => $dutch) {
    $found = false;
    $seen = array();
    foreach ($forms as $form) {
        if (isset($seen[ $form($en) ])) {
            continue; // the three forms are the same text when the string has no ampersand
        }
        $seen[ $form($en) ] = true;
        $row = $wpdb->get_row($wpdb->prepare("SELECT id, translated, status FROM $table WHERE BINARY original = %s LIMIT 1", $form($en))); // phpcs:ignore
        if (! $row) {
            continue;
        }
        $found = true;
        if ((int) $row->status === 2 && (string) $row->translated !== '') {
            $kept++;
            continue;
        }
        if ($mode === 'apply') {
            $wpdb->update($table, array('translated' => $form($dutch), 'status' => 2), array('id' => (int) $row->id));
        }
        $filled++;
    }
    if (! $found) {
        $absent[] = $en;
    }
}
echo ($mode === 'apply' ? 'filled' : 'untranslated') . ": $filled, already translated (kept): $kept, no dictionary row yet: " . count($absent) . "\n";
foreach ($absent as $en) {
    echo '  - ' . substr($en, 0, 90) . "\n";
}
