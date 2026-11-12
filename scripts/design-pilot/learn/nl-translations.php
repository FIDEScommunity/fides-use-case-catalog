<?php
/**
 * Dutch (nl_NL) texts for the Services pages, the enquiry form and the Training & workshops blocks that
 * point to Services, written by hand. They go into the TranslatePress dictionary (wp_trp_dictionary_en_us_nl_nl).
 *
 * Run with WP-CLI: wp eval-file learn/nl-translations.php apply|status|correct   (correct = local terminology corrections, see below)
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
    'Workshop language'                       => 'Voertaal',
    'Dutch. English available on request.'    => 'Nederlands. Op verzoek ook in het Engels.',
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
    // Site shell: skip link, header menu, search and footer (labels and screen-reader texts). Proper names and product terms stay English.
    'Skip to content' => 'Naar de inhoud',
    'New to wallets?' => 'Nieuw met wallets?',
    'Start with what your organization wants to achieve.' => 'Begin bij wat uw organisatie wil bereiken.',
    'Find your starting point' => 'Vind uw startpunt',
    'Discover' => 'Ontdekken',
    'Use cases' => 'Usecases',
    'Organizations' => 'Organisaties',
    'Global map' => 'Wereldkaart',
    'Themes, sectors & countries' => 'Thema’s, sectoren en landen',
    'Learn & connect' => 'Leren en verbinden',
    'Topics & guides' => 'Onderwerpen en gidsen',
    'Browse catalogs' => 'Catalogi bekijken',
    'Personal wallets' => 'Persoonlijke wallets',
    // Wallet record: back actions (the "Back to results" text is rendered hidden by Fides_DS_Detail_Top and swapped in by design-system.js)
    'Back to results' => 'Terug naar resultaten',
    'All personal wallets' => 'Alle persoonlijke wallets',
    'All business wallets' => 'Alle zakelijke wallets',
    'Credential types' => 'Credentialtypen',
    'Issuers' => 'Uitgevers',
    'Ecosystem' => 'Ecosysteem',
    'Meet & participate' => 'Ontmoeten en meedoen',
    'Events & materials' => 'Evenementen en materialen',
    'Community tracks' => 'Community-tracks',
    'Contribute' => 'Bijdragen',
    'Submit a use case' => 'Een usecase indienen',
    'List your organization' => 'Uw organisatie vermelden',
    'Update a listing' => 'Een vermelding bijwerken',
    'Plans' => 'Abonnementen',
    'Tools & API' => 'Tools en API',
    'Ask & learn' => 'Vragen en leren',
    'Use FIDES with AI' => 'FIDES gebruiken met AI',
    'Data & integration' => 'Data en integratie',
    'Build & test' => 'Bouwen en testen',
    'Interop profiles' => 'Interoperabiliteitsprofielen',
    'About FIDES' => 'Over FIDES',
    'Search FIDES' => 'Zoeken in FIDES',
    'Close' => 'Sluiten',
    'FIDES menu' => 'FIDES-menu',
    'Wallets & credential types' => 'Wallets en credentialtypen',
    'Other destinations' => 'Andere bestemmingen',
    'Learn menu:' => 'Learn-menu:',
    'Terms' => 'Voorwaarden',
    'News' => 'Nieuws',
    'Sign in' => 'Inloggen',
    'Local design pilot · not published' => 'Lokale designpilot · niet gepubliceerd',
    'Main' => 'Hoofdnavigatie',
    'Breadcrumb' => 'Kruimelpad',
    'Footer' => 'Voettekst',
    // Visually hidden suffixes of the card links (screen readers)
    '(View training)' => '(Bekijk de training)',
    '(View introduction session)' => '(Bekijk de introductiesessie)',
    '(View workshop)' => '(Bekijk de workshop)',
    '(Register interest)' => '(Interesse doorgeven)',
    // Start page (/start/)
    'Start with what you want to achieve.' => 'Begin bij wat u wilt bereiken.',
    'Understand how wallets, digital credentials and organizations work together. Then find your next step.' => 'Begrijp hoe wallets, digitale credentials en organisaties samenwerken. Zoek daarna uw volgende stap.',
    'What brings you here?' => 'Waarom bent u hier?',
    'Let people present proof to your service.' => 'Laat mensen bewijs tonen aan uw dienst.',
    'Give people digital proof they can reuse.' => 'Geef mensen digitaal bewijs dat zij kunnen hergebruiken.',
    'Issue digital credentials' => 'Digitale credentials uitgeven',
    'Understand what this means for us' => 'Begrijp wat dit voor ons betekent',
    // TranslatePress stores the typographic apostrophe as an entity in this original.
    'Start with your organization&#8217;s process and questions.' => 'Begin bij het proces en de vragen van uw organisatie.',
    'Already know your way?' => 'Weet u de weg al?',
    'Go straight to the catalogs.' => 'Ga direct naar de catalogi.',
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
    // Learn articles: sentence openers that used to be the lone fragments "A", "An" and "The". The article is now part of
    // the term, link or bold text, so each opener is one string with its own article (de/het/een is decided per phrase).
    'A wallet'                                => 'Een wallet',
    'The EUDI Wallet'                         => 'De EUDI Wallet',
    'The European Digital Identity Wallet'    => 'De European Digital Identity Wallet',
    'A verifiable credential'                 => 'Een verifieerbaar credential',
    'An attribute'                            => 'Een attribuut',
    'A schema'                                => 'Een schema',
    'A format'                                => 'Een formaat',
    'A credential format'                     => 'Een credentialformaat',
    'A protocol'                              => 'Een protocol',
    'A rulebook'                              => 'Een afsprakenstelsel',
    'A trust registry'                        => 'Een vertrouwensregister',
    'An issuer'                               => 'Een issuer',
    'The issuer'                              => 'De issuer',
    'The holder'                              => 'De houder',
    'The relying party'                       => 'De ontvangende partij',
    'The wallet provider'                     => 'De walletaanbieder',
    // Ecosystem roles (overview and five articles) and For governments (overview and four articles), entered 12-13 Nov 2026 (local pilot).
    // Sources: the edited document (D), the roles proposals (P), the for-governments proposal rows (P) and a few agent additions (A) / mechanical labels (M);
    // per row see learn/nl-translation-changes-roles-governments-2026-11-12.md. The lone article "A" before the verifier term is part of the term now ("A verifier").
    'A wallet interaction involves several parties. One provides information, another holds it, and a service requests and checks it. Providers and trust services may support the process.' => 'Bij een wallet-interactie zijn meerdere partijen betrokken. De ene partij verstrekt gegevens, een andere bewaart ze en een dienst vraagt ze op en controleert ze. Aanbieders en vertrouwensdiensten kunnen het proces ondersteunen.',
    'Who does what when information moves through a wallet?' => 'Wie doet wat wanneer gegevens via een wallet worden gedeeld?',
    'A role describes what a party does in one interaction, not what kind of organisation it is. Start with the roles, then follow them through an example.' => 'Een rol beschrijft wat een partij in één uitwisseling doet, niet wat voor soort organisatie het is. Begin met de rollen en volg ze daarna in een voorbeeld.',
    'One example' => 'Een voorbeeld',
    'A training provider confirms that you completed a course. You keep that confirmation in a wallet. When you apply for a role, the employer asks to see it and checks it. The wallet software comes from a wallet provider, and agreements or registers can help the employer decide which issuers to recognise.' => 'Een opleider bevestigt dat u een cursus hebt afgerond. U bewaart die bevestiging in een wallet. Wanneer u solliciteert naar een functie, vraagt de werkgever om de bevestiging te zien en controleert die. De wallet is software van een walletaanbieder, en afspraken of registers kunnen de werkgever helpen te bepalen welke uitgevers (issuers) hij erkent.',
    'follows it step by step.' => 'werkt het stap voor stap uit.',
    'The roles at a glance' => 'De rollen in één oogopslag',
    'Start with the first article.' => 'Begin met het eerste artikel.',
    'Receives information, keeps it in a wallet and chooses what to share.' => 'Ontvangt gegevens, bewaart ze in een wallet en kiest wat wordt gedeeld.',
    'Provides a credential and is responsible for what it confirms.' => 'Verstrekt een credential en is verantwoordelijk voor wat het bevestigt.',
    'Asks for information for a purpose and decides what to do with the result.' => 'Vraagt gegevens op voor een doel en beslist wat er met het resultaat gebeurt.',
    'Wallet providers and other service providers' => 'Walletaanbieders en andere dienstverleners',
    'Supply software and services that can support an interaction. Responsibilities differ per setup.' => 'Leveren software en diensten die een uitwisseling kunnen ondersteunen. De verantwoordelijkheden verschillen per inrichting.',
    'Trust service providers and trust frameworks' => 'Vertrouwensdienstverleners en trust frameworks',
    'Agreements, registers and services that help parties decide what to recognise.' => 'Afspraken, registers en diensten die partijen helpen te bepalen wat zij erkennen.',
    'Roles can overlap' => 'Rollen kunnen samenvallen',
    'One organisation can take more than one role. It may issue credentials in one service and receive them in another. A wallet provider is not automatically the issuer of a credential, and the party that receives information is not in every context the same as the software that checks it.' => 'Een organisatie kan meer dan één rol vervullen. Ze kan in de ene dienst credentials uitgeven en in een andere ontvangen. Een walletaanbieder is niet automatisch de uitgever van een credential, en de partij die gegevens ontvangt is niet in elke context dezelfde als de software die ze controleert.',
    'The EUDI Wallet and the European Business Wallet each have their own purpose and legal framework, so their roles should not be treated as the same.' => 'De EUDI Wallet en de European Business Wallet hebben elk een eigen doel en juridisch kader, dus hun rollen mogen niet worden gelijkgesteld.',
    'compares them.' => 'vergelijkt ze.',
    'Look up the parties behind the roles: browse' => 'Zoek de partijen achter de rollen op: bekijk',
    'personal wallets' => 'persoonlijke wallets',
    'organisations' => 'organisaties',
    'A holder receives a credential and can present information from it to another party. The holder may be a person using a personal wallet or an organisation using a wallet in a business process.' => 'Een houder (holder) ontvangt een credential en kan gegevens daaruit tonen aan een andere partij. De houder kan een persoon zijn die een persoonlijke wallet gebruikt, of een organisatie die een wallet gebruikt in een bedrijfsproces.',
    'Explainer · Ecosystem roles' => 'Uitleg · Rollen in het ecosysteem',
    'From receiving to sharing' => 'Van ontvangen tot delen',
    'Choosing what to share' => 'Kiezen wat u deelt',
    'Acting for an organisation' => 'Handelen namens een organisatie',
    'An education provider issues a digital qualification to a student. The student receives it in a wallet. Later, an employer asks for evidence of that qualification. The student can use the wallet to respond to the request.' => 'Een onderwijsinstelling geeft een student een digitale kwalificatie uit. De student ontvangt die in een wallet. Later vraagt een werkgever om bewijs van die kwalificatie. De student kan de wallet gebruiken om op het verzoek te reageren.',
    'The credential contains information about a subject. In this example, the student is both the' => 'Het credential bevat gegevens over een persoon, organisatie of ander onderwerp (subject). In dit voorbeeld is de student zowel de',
    'and the subject. That relationship can differ in other situations. An organisation, for example, may hold a credential containing information about the organisation itself.' => 'als degene over wie de gegevens gaan. Dat kan in andere situaties anders zijn. Een organisatie kan bijvoorbeeld een credential bezitten met gegevens over zichzelf.',
    'A wallet can show what information a service asks for. Depending on the wallet, credential and interaction, the holder may be able to share only the requested information. The holder should be able to understand who is requesting it and why before deciding whether to proceed.' => 'Een wallet kan laten zien welke gegevens een dienst vraagt. Afhankelijk van de wallet, het credential en de uitwisseling kan de houder mogelijk alleen de gevraagde gegevens delen. De houder moet kunnen begrijpen wie de gegevens vraagt en waarom, voordat die besluit ze te delen.',
    'If a credential expires, is withdrawn or contains incorrect information, the holder may need to contact its' => 'Als een credential verloopt, wordt ingetrokken of onjuiste gegevens bevat, moet de houder mogelijk contact opnemen met de',
    'issuer' => 'uitgever (issuer)',
    'or obtain a new credential. The available steps depend on the credential and the service that issued it.' => 'of een nieuw credential aanvragen. Welke stappen mogelijk zijn, hangt af van het credential en de dienst die het heeft uitgegeven.',
    'A person may use a wallet in a business process. The information presented might identify the person, the organisation, or both. Whether the person is authorised to act for the organisation is a separate question. A' => 'Een persoon kan een wallet gebruiken in een bedrijfsproces. De getoonde gegevens kunnen de persoon identificeren, de organisatie, of beide. Of de persoon bevoegd is namens de organisatie te handelen, is een aparte vraag. Een',
    'mandate' => 'mandaat',
    'or another form of evidence may be relevant to that decision.' => 'of een ander bewijs kan voor die beslissing relevant zijn.',
    'The examples are illustrative. Content last checked: 12 November 2026. Legal and technical requirements can change; check the applicable rules for a specific use.' => 'De voorbeelden dienen ter illustratie. Inhoud voor het laatst gecontroleerd op 12 november 2026. Juridische en technische eisen kunnen veranderen. Controleer welke regels voor uw situatie gelden.',
    'An issuer provides a credential containing information about a person, organisation or another subject. A school can issue a qualification, for example, or an organisation can issue evidence that a person holds a particular role.' => 'Een uitgever (issuer) verstrekt een credential met gegevens over een persoon, organisatie of ander onderwerp. Een school kan bijvoorbeeld een kwalificatie uitgeven, of een organisatie kan bewijs uitgeven dat iemand een bepaalde rol heeft.',
    'From information to a credential' => 'Van gegevens naar een credential',
    'After issuance' => 'Na uitgifte',
    'One organisation, different roles' => 'Eén organisatie, verschillende rollen',
    'Before issuing a credential, an issuer needs a way to establish the information it contains. The source may be its own records or information from another organisation. The issuer also needs to determine who should receive the credential and how it will reach their wallet.' => 'Voordat een uitgever een credential uitgeeft, moet de uitgever de gegevens daarin kunnen vaststellen. De bron kan de eigen administratie zijn of informatie van een andere organisatie. De uitgever bepaalt ook wie het credential ontvangt en hoe het in de wallet van de ontvanger terechtkomt.',
    'A digital signature or other proof can help a recipient check the credential and identify its issuer. It does not, by itself, establish that every statement in the credential is correct or suitable for a particular decision.' => 'Een digitale handtekening of ander bewijs kan een ontvanger helpen het credential te controleren en de uitgever te herkennen. Het stelt op zichzelf niet vast dat elke bewering in het credential juist of geschikt is voor een bepaalde beslissing.',
    'Information can change. A qualification may remain valid, while a role or authorisation may end. An issuer therefore needs to consider how recipients can check status, when a credential should be replaced and how errors can be corrected. The options depend on the credential and the arrangements used.' => 'Gegevens kunnen veranderen. Een kwalificatie kan geldig blijven, terwijl een rol of bevoegdheid kan eindigen. Een uitgever moet daarom nadenken over hoe ontvangers de status kunnen controleren, wanneer een credential vervangen moet worden en hoe fouten kunnen worden hersteld. De mogelijkheden hangen af van het credential en de gebruikte afspraken.',
    'An organisation that issues credentials may also receive and check credentials issued by others. The role describes what it does in a particular interaction.' => 'Een organisatie die credentials uitgeeft, kan ook credentials van anderen ontvangen en controleren. De rol beschrijft wat de organisatie in een bepaalde uitwisseling doet.',
    'A relying party is an organisation or service that requests and uses information from a wallet. An employer checking a qualification is one example. The organisation needs to decide what information it needs and what it will use it for.' => 'Een vertrouwende partij (relying party) is een organisatie of dienst die gegevens uit een wallet opvraagt en gebruikt. Een werkgever die een kwalificatie controleert, is een voorbeeld. De organisatie moet bepalen welke gegevens ze nodig heeft en waarvoor ze die gebruikt.',
    'Making a request' => 'Een verzoek doen',
    'Checking the information' => 'De gegevens controleren',
    'Relying party and verifier' => 'Vertrouwende partij en verifier',
    'A request should be connected to a specific service or process. A service checking eligibility for a role, for example, may need to know whether a person has a qualification. It should consider which information is necessary for that decision.' => 'Een verzoek hoort bij een specifieke dienst of een specifiek proces. Een organisatie die controleert of iemand in aanmerking komt voor een functie, moet bijvoorbeeld weten of die persoon een bepaalde kwalificatie heeft. De organisatie gaat na welke gegevens daarvoor nodig zijn.',
    'The wallet user can respond to the request using information available in their wallet. The interaction depends on the wallet, the credential and the service involved.' => 'De walletgebruiker kan op het verzoek reageren met gegevens uit de eigen wallet. De uitwisseling hangt af van de wallet, het credential en de betrokken dienst.',
    'The receiving service may need to check who issued the credential, whether the proof is valid and whether status information is available. The checks depend on the credential and the rules applicable to the process.' => 'De ontvangende dienst moet mogelijk controleren wie het credential heeft uitgegeven, of het bewijs geldig is en of statusinformatie beschikbaar is. De controles hangen af van het credential en de regels die voor het proces gelden.',
    'A technical check helps establish whether the credential and its proof meet particular requirements. The organisation still has to decide whether the information is sufficient for its purpose. A valid qualification, for instance, does not automatically establish that it meets every requirement for a job.' => 'Een technische controle helpt vaststellen of het credential en het bijbehorende bewijs aan bepaalde eisen voldoen. De organisatie moet nog steeds beslissen of de gegevens voor haar doel voldoende zijn. Een geldige kwalificatie betekent bijvoorbeeld niet automatisch dat aan alle eisen voor een functie is voldaan.',
    'A verifier' => 'Een verifier',
    'performs technical checks. A relying party uses the information in its process. Depending on the arrangement, the same organisation can perform both roles or use a provider for verification.' => 'voert technische controles uit. Een vertrouwende partij gebruikt de gegevens in haar proces. Afhankelijk van de afspraken kan dezelfde organisatie beide rollen vervullen of een aanbieder inschakelen voor de verificatie.',
    'A wallet provider makes a wallet available to people or organisations. The wallet helps its users receive, manage and present information. Other providers may supply software or services to the organisations that issue or check that information.' => 'Een walletaanbieder stelt een wallet beschikbaar aan mensen of organisaties. Met de wallet kunnen gebruikers gegevens ontvangen, beheren en delen. Andere aanbieders kunnen software of diensten leveren aan organisaties die deze gegevens uitgeven of controleren.',
    'What does a wallet provider do?' => 'Wat doet een walletaanbieder?',
    'How does a wallet connect to other parties?' => 'Hoe maakt een wallet verbinding met andere partijen?',
    'Other providers in the interaction' => 'Andere aanbieders in de uitwisseling',
    'Choosing a wallet or provider' => 'Een wallet of aanbieder kiezen',
    'A wallet provider offers a wallet and the services needed to use it. Depending on the product and its operating model, that can include onboarding users, maintaining the software, providing support and helping users manage access to their wallet.' => 'Een walletaanbieder biedt een wallet aan en de diensten die nodig zijn om die te gebruiken. Afhankelijk van het product en het bedrijfsmodel kan dat onder meer gaan om het aanmelden van gebruikers, onderhoud van de software, ondersteuning en hulp bij het beheren van toegang tot de wallet.',
    'A personal wallet is intended for an individual. A business wallet can support an organisation in managing and exchanging information in a business process. Products differ in their intended users, functions and the credentials they support.' => 'Een persoonlijke wallet is bedoeld voor een individu. Een business wallet kan een organisatie ondersteunen bij het beheren en uitwisselen van gegevens in een bedrijfsproces. Producten verschillen in beoogde gebruikers, functies en ondersteunde credentials.',
    'An issuer needs a way to provide a credential to the wallet. A relying party needs a way to request and receive information from it. The wallet, issuer and receiving service need compatible ways of communicating, as well as agreements about the interaction.' => 'Een uitgever (issuer) heeft een manier nodig om een credential aan de wallet te geven. Een vertrouwende partij (relying party) heeft een manier nodig om er gegevens uit op te vragen en te ontvangen. De wallet, de uitgever en de ontvangende dienst hebben compatibele manieren van communiceren nodig, en afspraken over de uitwisseling.',
    'A wallet provider may build its own software or work with other suppliers. The organisation providing the wallet, the developer and the organisation responsible for operating it are not necessarily the same.' => 'Een walletaanbieder kan eigen software bouwen of met andere leveranciers samenwerken. De organisatie die de wallet aanbiedt, de ontwikkelaar en de organisatie die verantwoordelijk is voor de exploitatie zijn niet per se dezelfde.',
    'An issuer or relying party can use a technology provider to connect its systems. A provider may supply issuing software, verification tools or integration services. Which tasks it performs depends on the agreement with its customer and the design of the service.' => 'Een uitgever of vertrouwende partij kan een technologieaanbieder inschakelen om de eigen systemen te koppelen. Een aanbieder kan uitgiftesoftware, verificatietools of integratiediensten leveren. Welke taken de aanbieder uitvoert, hangt af van de afspraak met de klant en de opzet van de dienst.',
    'Start with the process and the people or organisations involved. Consider what information needs to be exchanged, which devices or systems are used, how access is managed and what support is available. Check the relevant formats, protocols and arrangements for the intended interaction with the provider.' => 'Begin bij het proces en de betrokken mensen of organisaties. Bekijk welke gegevens moeten worden uitgewisseld, welke apparaten of systemen worden gebruikt, hoe toegang wordt beheerd en welke ondersteuning er is. Controleer met de aanbieder de relevante formaten, protocollen en afspraken voor de beoogde uitwisseling.',
    'The FIDES catalogs help you discover wallets and their reported features. Check current product information and whether it meets the requirements of your use case with the provider.' => 'De FIDES-catalogi helpen u wallets en de gemelde functies te vinden. Controleer met de aanbieder de actuele productinformatie en of die aan de eisen van uw usecase voldoet.',
    'Browse organisations' => 'Bekijk organisaties',
    'Digital interactions often involve several organisations. A trust service provider can provide services that help parties establish or check aspects of a digital interaction. A trust framework sets out agreements and rules for participants in a particular ecosystem.' => 'Bij digitale uitwisselingen zijn vaak meerdere organisaties betrokken. Een vertrouwensdienstverlener kan diensten leveren waarmee partijen aspecten van een digitale uitwisseling vaststellen of controleren. Een trust framework (afsprakenstelsel) legt afspraken en regels vast voor deelnemers in een bepaald ecosysteem.',
    'What is a trust service?' => 'Wat is een vertrouwensdienst?',
    'What does qualified mean?' => 'Wat betekent gekwalificeerd?',
    'What is a trust framework?' => 'Wat is een trust framework?',
    'Finding providers' => 'Aanbieders vinden',
    'Examples include services for electronic signatures, electronic seals and timestamps. A service can help establish who signed or sealed information, or when a particular action took place. What a check establishes depends on the service and the context in which it is used.' => 'Voorbeelden zijn diensten voor elektronische handtekeningen, elektronische zegels en tijdstempels. Een dienst kan helpen vaststellen wie gegevens heeft ondertekend of verzegeld, of wanneer een bepaalde handeling plaatsvond. Wat een controle vaststelt, hangt af van de dienst en de context waarin die wordt gebruikt.',
    'An organisation may use trust services alongside wallet or credential software. A trust service provider can also perform another role in an interaction, depending on the service it offers.' => 'Een organisatie kan vertrouwensdiensten naast wallet- of credentialsoftware gebruiken. Een vertrouwensdienstverlener kan ook een andere rol in een uitwisseling vervullen, afhankelijk van de dienst die wordt aangeboden.',
    'Under the EU eIDAS framework, some trust services and their providers have qualified status. The qualification applies to specific services, so it is important to check both the provider and the service. National trusted lists record qualified providers and their qualified services.' => 'Binnen het Europese eIDAS-kader hebben sommige vertrouwensdiensten en hun aanbieders de status gekwalificeerd. De kwalificatie geldt voor specifieke diensten, dus het is belangrijk zowel de aanbieder als de dienst te controleren. Nationale vertrouwenslijsten (trusted lists) bevatten de gekwalificeerde aanbieders en hun gekwalificeerde diensten.',
    'A FIDES catalog entry can help you find a provider. For an authoritative check of qualified status, consult the applicable national trusted list through the European Commission’s trusted-list resources. Check the relevant service and its status at the relevant time.' => 'Een vermelding in een FIDES-catalogus kan u helpen een aanbieder te vinden. Raadpleeg voor een gezaghebbende controle van de gekwalificeerde status de toepasselijke nationale vertrouwenslijst via de bronnen van de Europese Commissie. Controleer de betreffende dienst en de status op het relevante moment.',
    'A trust framework describes agreements and rules that participants use in an ecosystem. It may address who can participate, how parties identify each other, which technical specifications they use and how responsibilities are divided.' => 'Een trust framework beschrijft afspraken en regels die deelnemers in een ecosysteem hanteren. Het kan gaan over wie mag deelnemen, hoe partijen elkaar identificeren, welke technische specificaties ze gebruiken en hoe verantwoordelijkheden zijn verdeeld.',
    'A trust framework and a trust service are related concepts. A framework may refer to services that participants use, while a trust service performs a particular function within an interaction.' => 'Een trust framework en een vertrouwensdienst hangen samen. Een framework kan verwijzen naar diensten die deelnemers gebruiken, terwijl een vertrouwensdienst een bepaalde functie vervult binnen een uitwisseling.',
    'The FIDES organisation catalog includes an eIDAS trust service provider role and a QTSP certification filter. The role filter lists organisations that describe themselves as trust service providers. The QTSP filter lists organisations that appear as qualified in the EU trusted list. The two lists overlap only in part, so they show different numbers. Where available, the organisation pages give information about their services. Check the underlying source and current status before relying on a qualification.' => 'In de FIDES-organisatiecatalogus vindt u organisaties die zichzelf als vertrouwensdienstverlener beschrijven. Met het filter QTSP (eIDAS) vindt u organisaties die volgens de geïmporteerde EU-vertrouwenslijst als gekwalificeerd zijn opgenomen. De twee lijsten overlappen slechts gedeeltelijk, dus ze tonen verschillende aantallen. Waar beschikbaar, geven de organisatiepagina’s informatie over hun diensten. Controleer voor de actuele status de officiële vertrouwenslijst en de specifieke dienst.',
    'European Commission — EU trusted lists' => 'Europese Commissie — EU-vertrouwenslijsten (trusted lists)',
    'Browse organisations — filter for' => 'Bekijk organisaties — filter op',
    'Explore organisations with' => 'Verken organisaties met',
    'certification' => 'certificering',
    'Public organisations meet wallets from two sides: they hold information people need to prove, and they run services that need to receive it. Start with the question closest to yours.' => 'Overheidsorganisaties komen op twee manieren met wallets in aanraking. Ze beheren gegevens die mensen moeten kunnen aantonen en bieden diensten aan die gegevens ontvangen. Begin bij de vraag die voor uw organisatie relevant is.',
    'Start with a question' => 'Start met een vraag',
    'Four articles' => 'Vier artikelen',
    'Digital wallets and public services' => 'Digitale wallets en publieke dienstverlening',
    'Where could a wallet fit in the ways people already prove things to public services?' => 'Waar kan een wallet passen bij de manieren waarop mensen nu gegevens aan publieke diensten tonen?',
    'Issuing public information to wallets' => 'Publieke gegevens uitgeven aan wallets',
    'Which information could a public body issue, and what needs to be settled first?' => 'Welke gegevens kan een overheidsorganisatie uitgeven en wat moet zij eerst regelen?',
    'Accepting information from wallets in public services' => 'Gegevens uit wallets accepteren in publieke diensten',
    'The EUDI Wallet and national implementation' => 'De EUDI Wallet en nationale uitwerking',
    'What is set at European level, and what is decided nationally?' => 'Wat ligt Europees vast en wat wordt nationaal bepaald?',
    'A Dutch example, still in development' => 'Een Nederlands voorbeeld in ontwikkeling',
    'Explainer · For governments' => 'Uitleg · Voor overheden',
    'People regularly have to show public services information that a public body holds. Where could a wallet fit next to the ways they already do that?' => 'Mensen moeten regelmatig gegevens die een overheidsorganisatie beheert aantonen bij publieke diensten. Waar past een wallet naast de manieren die ze nu al gebruiken?',
    'Which question are you asking?' => 'Met welke vraag begint u?',
    'Two sides of the same interaction' => 'Twee kanten van dezelfde uitwisseling',
    'Wallets are one route among several' => 'Wallets zijn één van de mogelijkheden',
    'What can differ between countries?' => 'Wat verschilt per land?',
    'A Dutch example' => 'Een Nederlands voorbeeld',
    'An example from the catalog' => 'Een voorbeeld uit de catalogus',
    'People regularly have to show a public authority, or another organisation, information that a public body holds. Examples are where someone lives, whether they hold a permit or licence, or a qualification awarded by a public institution. Services in different countries ask for this in different ways: with documents, forms, uploads or a separate log-in.' => 'Mensen moeten regelmatig gegevens tonen die een overheidsorganisatie beheert. Denk aan een adres, een vergunning of een diploma van een openbare onderwijsinstelling. De manieren waarop zij dat doen verschillen per land en dienst. Soms gebruiken zij documenten, formulieren, uploads of een aparte inlogmethode.',
    'A digital wallet can offer another way for that information to travel. A public body issues it, the person keeps it in a wallet and a service asks for what it needs. This article lists questions that public organisations can ask before deciding where wallets fit. For the basics, see' => 'Een digitale wallet kan een extra manier bieden om die gegevens te delen. Een organisatie geeft de gegevens uit, iemand ontvangt ze in een wallet en een dienst vraagt op wat nodig is. Hieronder staan vragen die publieke organisaties kunnen helpen bepalen waar een wallet past. Lees voor de basis',
    'The starting point is rarely the wallet. It is usually a service or a piece of information. Questions that come up in different countries include:' => 'Vaak begint de vraag bij een dienst of bij gegevens die mensen nodig hebben. Bijvoorbeeld:',
    'Which information do people regularly have to prove, and which public body is responsible for it?' => 'Welke gegevens moeten mensen regelmatig aantonen en welke organisatie is ervoor verantwoordelijk?',
    'Which services ask for the same information again and again?' => 'Welke diensten vragen dezelfde informatie herhaaldelijk op?',
    'Can the responsible body confirm that information in a form a wallet can hold?' => 'Kan de verantwoordelijke organisatie die gegevens verstrekken in een vorm die een wallet ondersteunt?',
    'Does the service need a full record, or only one fact from it?' => 'Heeft de dienst een volledig document nodig of alleen een bepaald gegeven?',
    'What happens for people who have no wallet, or who prefer another route?' => 'Wat gebeurt er als iemand geen wallet heeft of een andere route wil gebruiken?',
    'These questions can show where a wallet could add a route next to existing ones. They can also show where it would not.' => 'Deze vragen helpen bepalen waar een wallet een aanvulling kan zijn op bestaande mogelijkheden.',
    'A public body can take more than one role. As an' => 'Een overheidsorganisatie kan verschillende rollen vervullen. Als',
    'it provides a credential, for example about a permit. As a' => 'verstrekt zij bijvoorbeeld een credential over een vergunning. Als',
    'it can receive credentials from people, for example when someone applies for a service. The two sides raise different questions, covered in' => '(relying party) kan zij credentials van mensen ontvangen bij een aanvraag. Lees verder bij',
    '. The roles themselves are explained in' => '. De rollen zelf worden uitgelegd in',
    'Public information is also exchanged without a wallet. Public bodies can exchange data with each other through registers and agreed interfaces. For cross-border procedures, the European Once-Only Technical System (OOTS) is described as letting a person ask authorities in one Member State to send evidence to a public service in another. Wallets, registers and cross-border exchange can exist side by side, with different parties and rules for each.' => 'Overheidsorganisaties wisselen ook gegevens uit via registers en afgesproken koppelingen. Voor grensoverschrijdende procedures kunnen burgers via het Europese Once-Only Technical System (OOTS) bewijsstukken tussen overheidsorganisaties laten uitwisselen. Bij elke route horen eigen afspraken en betrokken partijen.',
    'Several things are decided nationally or by sector: which bodies may issue which credentials, which wallets are available, how organisations are onboarded, which registers are used and when services accept wallets. Do not assume that arrangements described for one country apply in another.' => 'Landen en sectoren maken onder meer keuzes over bevoegde uitgevers, beschikbare wallets, aansluiting van organisaties en gebruikte registers. Controleer daarom welke afspraken in uw land gelden.',
    'One use case in the catalog looks at government-to-business services in the Netherlands.' => 'Een usecase in de catalogus beschrijft digitale dienstverlening van de overheid aan bedrijven in Nederland.',
    'Which public information could people hold in a wallet? Start with the responsible body, the source of the information and what the credential should confirm.' => 'Welke publieke gegevens zouden mensen in een wallet kunnen bewaren? Begin bij de verantwoordelijke organisatie, de bron van de gegevens en wat het credential moet bevestigen.',
    'Questions to start with' => 'Vragen om mee te beginnen',
    'The register stays where it is' => 'Het register blijft bij de verantwoordelijke organisatie',
    'Public bodies and the EUDI Wallet' => 'Publieke organisaties en de EUDI Wallet',
    'Public bodies hold information that people often need to prove: where they live, whether they hold a licence or permit, or what a register says about a company. Issuing a credential from that information is one way to let people carry it to the services that ask for it. Public organisations in different countries ask similar questions before they start.' => 'Overheidsorganisaties beheren gegevens die mensen moeten kunnen aantonen, zoals een adres, een vergunning of informatie uit een register. Een credential kan een manier zijn om zulke gegevens te verstrekken, zodat iemand ze vanuit een wallet kan delen met een dienst die erom vraagt.',
    'Which information is the body responsible for, and is it an' => 'Voor welke gegevens is uw organisatie verantwoordelijk en is zij een',
    'authentic source' => 'authentieke bron',
    'for that information?' => 'voor die gegevens?',
    'Which credential should confirm it, and for which services?' => 'Wat moet het credential bevestigen en welke diensten kunnen het gebruiken?',
    'Who may receive it, and how does the person get it into their wallet?' => 'Wie mag het ontvangen en hoe komt het in de wallet terecht?',
    'How is the information kept current, and what happens when it changes?' => 'Hoe blijven gegevens actueel en wat gebeurt er als ze veranderen?',
    'Where is the credential described, so that receiving services can understand it?' => 'Waar kunnen ontvangende diensten vinden wat het credential inhoudt?',
    'Information in a register or case system remains with the body that is responsible for it. A credential is a way to provide a statement from that source in a form a person can hold and share. It does not replace the register. The issuer remains responsible for what the credential confirms, including how errors are corrected and what happens when the underlying information changes.' => 'Een credential kan een verklaring uit een register of zaaksysteem bevatten. Het vervangt dat register niet. De uitgever blijft verantwoordelijk voor wat het credential bevestigt en moet bijvoorbeeld bepalen hoe fouten worden hersteld en wat er gebeurt als de gegevens veranderen.',
    'The general questions for issuers are in' => 'Lees meer over algemene vragen voor uitgevers bij',
    '. A credential type, which describes a kind of credential, can help receiving parties find out what information is defined.' => '. Een credentialtype beschrijft om wat voor credential het gaat en welke gegevens daarbij horen.',
    'In the European digital identity framework, attestations can be issued in more than one way.' => 'Binnen het Europese kader voor digitale identiteit kunnen verschillende partijen attestaties uitgeven.',
    'A public sector body attestation' => 'Een publieke attestatie',
    'is issued by, or on behalf of, a public sector body that is responsible for an authentic source.' => 'wordt uitgegeven door of namens een overheidsorganisatie die verantwoordelijk is voor een authentieke bron.',
    'A qualified attestation' => 'Een gekwalificeerde attestatie',
    'is issued by a' => 'wordt uitgegeven door een',
    'qualified trust service provider' => 'gekwalificeerde vertrouwensdienstverlener',
    '. Which route applies depends on the information, the national arrangements and the applicable rules. See' => '. Welke route van toepassing is, hangt af van de gegevens, de nationale inrichting en de geldende regels. Zie',
    'for the framework and' => 'voor het kader en',
    'for the providers.' => 'voor de aanbieders.',
    'The Dutch GBO draft design describes both routes for the wallet. In the first, a public body issues the attestation itself and may use a shared facility for the technical side of issuing. In the second, a qualified trust service provider issues a qualified attestation, and the draft describes two separate services it can use at the source through an authentic source interface:' => 'Het Nederlandse GBO-ontwerp beschrijft twee mogelijkheden voor het walletkanaal. In de eerste geeft een publieke organisatie zelf de attestatie uit en kan zij daarbij een gedeelde technische voorziening gebruiken. In de tweede geeft een gekwalificeerde vertrouwensdienstverlener een gekwalificeerde attestatie uit en beschrijft het ontwerp twee afzonderlijke diensten die zij daarbij via een interface voor authentieke bronnen bij de bron kan gebruiken:',
    'the provider checks attribute values it has been given against the source before issuing.' => 'de aanbieder controleert aangeleverde attributen bij de bron voordat de attestatie wordt uitgegeven.',
    'the provider fetches the attributes from the source, on behalf of the public body, and qualifies them. The draft calls this service optional.' => 'de aanbieder haalt de attributen namens de bronhouder op en kwalificeert ze. Het ontwerp noemt deze dienst optioneel.',
    'The issuing facility is described as still to be realised, so this is a plan and not a service that is available today.' => 'Het ontwerp markeert de uitgiftevoorziening voor de EUDI Wallet als nog te realiseren. Het beschrijft een plan en geen voorziening die nu beschikbaar is.',
    'Countries differ in which bodies may issue, which wallets are available, how issuers are onboarded and which agreements describe credentials. A listing in a FIDES catalog does not settle whether an organisation is allowed to issue. Check the rules and the responsible body in your own country.' => 'Landen verschillen onder meer in welke organisaties mogen uitgeven, hoe zij worden aangesloten en welke afspraken gelden voor credentials. Controleer de regels en de verantwoordelijke organisatie in uw land. Een vermelding in een FIDES-catalogus geeft op zichzelf geen uitsluitsel over de bevoegdheid om uit te geven.',
    'One use case in the catalog describes several authorities issuing into one wallet in Honduras, as reported by the organisation that submitted it.' => 'Een usecase in de catalogus beschrijft hoe verschillende overheidsinstanties in Honduras gegevens uitgeven aan één wallet. De informatie is afkomstig van de organisatie die de usecase heeft ingediend.',
    'Ask for what the service needs' => 'Vraag alleen wat nodig is',
    'Checking is not deciding' => 'Controleren en beslissen',
    'What does Article 5f say about accepting wallets?' => 'Wat zegt artikel 5f over het accepteren van wallets?',
    'Public services ask people for information all the time: identity, address, income, a qualification. Services in different countries rely on forms, uploads, registers or log-in providers. A wallet can add another way to receive information. The service still needs to decide what it needs, what it will accept and what it does with the answer.' => 'Publieke diensten vragen mensen regelmatig om gegevens, zoals hun identiteit, adres, inkomen of een diploma. Een wallet kan een extra manier bieden om die gegevens te ontvangen. De dienst bepaalt nog steeds welke gegevens nodig zijn, wat zij accepteert en wat zij met de uitkomst doet.',
    'Which decision does the service make, and which information is necessary for it?' => 'Welke beslissing neemt de dienst en welke gegevens zijn daarvoor nodig?',
    'Is the information needed to identify a person, to confirm an attribute or to show a right or condition?' => 'Zijn de gegevens bedoeld om iemand te identificeren, een kenmerk te bevestigen of een recht aan te tonen?',
    'Which issuers does the service accept, and how does it learn about them?' => 'Welke uitgevers accepteert de dienst en hoe vindt zij informatie over hen?',
    'What does the service do when a person has no wallet, or when information cannot be verified?' => 'Wat gebeurt er als iemand geen wallet heeft of gegevens niet kunnen worden gecontroleerd?',
    'Which legal basis and data protection rules apply to what the service asks for?' => 'Welke grondslag en privacyregels gelden voor de gegevens die de dienst vraagt?',
    'A request can name specific attributes instead of asking for a full record, where the wallet and the credential support that. This is often called' => 'Als de wallet en het credential dat ondersteunen, kan een dienst om specifieke gegevens vragen in plaats van om een volledig document. Dit heet',
    '. It can help a service receive less information, which also leaves less to protect and explain. Whether a service may ask for particular information is a question for the applicable rules, not for the technology.' => '. Welke gegevens een dienst mag opvragen, hangt af van de toepasselijke regels.',
    'A technical check can show who issued a credential, whether it was altered and whether it is still valid. It does not show that the information is sufficient for the decision the service has to make. That assessment stays with the service, together with what happens when a check fails. See' => 'Een technische controle kan helpen vaststellen wie een credential heeft uitgegeven, of het is gewijzigd en wat de status is, voor zover die controle beschikbaar is. De dienst moet vervolgens beoordelen of de gegevens voldoende zijn voor de beslissing. Lees verder bij',
    'Article 5f of' => 'Artikel 5f van',
    'Regulation (EU) 2024/1183' => 'Verordening (EU) 2024/1183',
    ', which amends the eIDAS Regulation, is titled “Cross-border reliance on European Digital Identity Wallets”. For public services, paragraph 1 provides that where Member States require electronic identification and authentication to access an online service provided by a public sector body, they shall also accept European Digital Identity Wallets that are provided in accordance with the Regulation. Read in its own words, this means:' => ', waarmee de eIDAS-verordening wordt gewijzigd, heeft als titel “Grensoverschrijdende afhankelijkheid van Europese digitale-identiteitswallets”. Voor publieke diensten bepaalt lid 1 het volgende. Als een lidstaat elektronische identificatie en authenticatie vereist voor toegang tot een onlinedienst van een overheidsinstantie, moet die lidstaat ook EUDI Wallets accepteren die aan de verordening voldoen. In gewone woorden betekent dit:',
    'The Regulation also contains rules for certain private parties and for very large online platforms. Their conditions are set out in' => 'De verordening bevat ook regels voor bepaalde private partijen en zeer grote online platforms. De voorwaarden staan in',
    'Article 5f of Regulation (EU) 2024/1183' => 'artikel 5f van Verordening (EU) 2024/1183',
    '; read them there, as some depend on implementing acts and on the type of service.' => '; lees ze daar, want sommige hangen af van uitvoeringshandelingen en van het soort dienst.',
    'One use case in the catalog describes a municipality acting as a relying party for attribute-based login.' => 'Een usecase in de catalogus beschrijft een gemeente die optreedt als vertrouwende partij bij inloggen met attributen.',
    'What does a public service need to receive and check? Start with the decision the service makes, the information it needs and what happens when a wallet is not used.' => 'Wat moet een publieke dienst ontvangen en controleren? Begin bij de beslissing die de dienst neemt, de gegevens die daarvoor nodig zijn en wat er gebeurt als geen wallet wordt gebruikt.',
    'What is set at European level, and what is decided nationally? A starting point for public organisations that want to see where national arrangements come in.' => 'Wat ligt op Europees niveau vast en wat wordt nationaal bepaald? Een startpunt voor overheidsorganisaties die willen zien waar nationale afspraken een rol spelen.',
    'What is set at European level?' => 'Wat ligt op Europees niveau vast?',
    'What is decided nationally?' => 'Wat wordt nationaal bepaald?',
    'Questions to ask in your own country' => 'Vragen voor uw eigen land',
    'Keep national information current' => 'Houd nationale informatie actueel',
    'Public organisations in the EU work with a European framework and with national choices at the same time. Questions that come up include: what does the regulation set, what does my country decide, which wallets will be available and when, and what are other countries doing?' => 'Publieke organisaties in de EU hebben te maken met een Europees kader én met nationale keuzes. Wat ligt Europees vast? Wat bepaalt een land zelf? En waar vindt u de actuele inrichting?',
    ', also called eIDAS 2, sets common requirements for the' => ', ook bekend als eIDAS 2, bevat gemeenschappelijke eisen voor de',
    '. Member States are responsible for making at least one wallet available under that framework, and the European Commission has said this should happen by the end of 2026. Technical specifications are developed at European level, for example in the Architecture and Reference Framework. Article 5f of the Regulation also sets rules on accepting wallets; for public services it is summarised in' => '. Lidstaten zijn verantwoordelijk voor het beschikbaar stellen van ten minste één wallet binnen dat kader. De Europese Commissie noemt eind 2026 als moment waarop lidstaten een wallet beschikbaar moeten hebben. De technische uitwerking vindt onder meer plaats in het Architecture and Reference Framework. Artikel 5f van de verordening bevat ook regels over het accepteren van wallets; voor publieke diensten staat een samenvatting in',
    '. See' => '. Lees verder bij',
    'for an overview.' => 'voor een overzicht.',
    'National implementation is still developing. Countries decide, within the framework, how wallets are provided, how issuers and relying parties are onboarded, which registers and agreements are used, which credentials exist and which services accept them. National pages, such as the German EUDI ecosystem pages or the Dutch EDI-Stelsel, show how one country approaches this. They are not a uniform EU procedure.' => 'Binnen het Europese kader maken landen keuzes over onder meer de beschikbaarstelling van wallets, de aansluiting van uitgevers en vertrouwende partijen en het gebruik van registers en afspraken. Ook de uitwerking per dienst en credential kan verschillen. De Duitse EUDI-informatie en het Nederlandse EDI-stelsel laten zien hoe afzonderlijke landen dit aanpakken.',
    'Which body provides or recognises wallets, and when do they become available?' => 'Welke organisatie stelt wallets beschikbaar of erkent ze, en wanneer?',
    'How does a public body become an issuer, and how does a service become a relying party?' => 'Hoe sluit een publieke uitgever of vertrouwende partij aan?',
    'Which registers or agreements list the parties that others can recognise?' => 'Welke registers of afspraken helpen partijen elkaar te herkennen?',
    'Which rules apply to a service that has to accept wallets, if any?' => 'Welke acceptatieregels gelden voor de betreffende dienst?',
    'Who maintains the national documentation, and how current is it?' => 'Wie onderhoudt de nationale documentatie en wanneer is die bijgewerkt?',
    'The draft describes the three routes as having their own parties, legal bases and protocols, so common source access does not mean that all data travels the same way:' => 'Het ontwerp beschrijft dat elke route eigen partijen, grondslagen en protocollen heeft. Een gemeenschappelijke bronontsluiting betekent dus niet dat alle gegevens op dezelfde manier worden gedeeld:',
    'a person receives an attestation from a public body or a qualified trust service provider and can later show it to a service. The draft describes showing it as taking place outside GBO. The two issuing routes are described in' => 'een persoon ontvangt een attestatie van een publieke organisatie of een gekwalificeerde vertrouwensdienstverlener en kan die later aan een dienst tonen. Volgens het ontwerp vindt het tonen buiten GBO plaats. De twee uitgifteroutes worden beschreven in',
    'Version and status' => 'Versie en status',
    'The public GBO documentation consulted on 12 November 2026 describes the global design as in development and not final. Its review overview lists the design as being processed for adoption. The pages consulted do not state that the design has been adopted, and a newer version than 0.9.5 was not listed there. Use the current documentation for the legal status and the current arrangements.' => 'De openbare GBO-documentatie die op 12 november 2026 is geraadpleegd, beschrijft het globaal ontwerp als in ontwikkeling en niet definitief. Volgens het beoordelingsoverzicht wordt het ontwerp verwerkt met het oog op vaststelling. In de geraadpleegde pagina’s staat niet dat het ontwerp is vastgesteld en er wordt geen nieuwere versie dan 0.9.5 genoemd. Raadpleeg de actuele documentatie voor de juridische status en de huidige inrichting.',
    'The Dutch example is based on the Globaal Ontwerp (global design) of Gemeenschappelijke Bronontsluiting (GBO), version 0.9.5 (September 2026), a draft design submitted for adoption. Its arrangements are still in development and national arrangements can differ.' => 'Het Nederlandse voorbeeld is gebaseerd op het Globaal Ontwerp van Gemeenschappelijke Bronontsluiting (GBO), versie 0.9.5 (september 2026), een conceptontwerp dat ter vaststelling is aangeboden. De inrichting is nog in ontwikkeling en nationale uitwerkingen kunnen verschillen.',
    'National pages change, and a description that is accurate today can be out of date within months. When you use a national page, note its owner and the date you consulted it. The pages cited here were checked on 12 November 2026.' => 'Nationale documentatie kan veranderen. Controleer wie de informatie beheert en wanneer deze voor het laatst is bijgewerkt.',
    'Previous' => 'Vorige',
    'Next' => 'Volgende',
    'Series' => 'Serie',
);

/**
 * LOCAL ONLY. The lone fragments "A", "An" and "The" must not carry a global translation: TranslatePress would turn
 * every standalone "The" into "De" (also before het-words) and "A"/"An" into "Een". The Learn articles no longer produce
 * these fragments (see learn/README.md). `apply` empties these three rows (translated = '', status 0) in the local pilot
 * only; it refuses to run on any other site. The transfer tool neither exports nor imports them.
 */
$clear_fragments = array('A', 'An', 'The');

/**
 * LOCAL TERMINOLOGY CORRECTIONS (see learn/nl-terminology.md and learn/nl-translation-changes-2026-11-12-b.md).
 * Each entry: English source, the expected CURRENT Dutch, the corrected Dutch. `wp eval-file learn/nl-translations.php correct`
 * rewrites a row only while its current translation still equals the expected old value (so any other translation an editor
 * made is never overwritten) and only on localhost. Repeatable: a second run changes nothing. Staging rows are never changed by
 * this script or by the transfer tool; corrections there are made in the TranslatePress editor from the reviewed change list.
 */
$corrections = array(
    // Correction 1: heading lost "relying parties".
    array('What do recipients and relying parties need to know?',
          'Wat moeten ontvangers weten?',
          'Wat moeten ontvangers en vertrouwende partijen weten?'),
    // Correction 2: first prose mention on both pages that use it (How credentials connect, EUDI Wallet roles list).
    array('The issuer',
          'De issuer',
          'De uitgever (issuer)'),
    // Correction 2: first prose mention on the Issuing page.
    array('An issuer',
          'Een issuer',
          'Een uitgever (issuer)'),
    // Correction 2: first prose mention on What is a credential.
    array('The employer needs to understand what the credential says and check whether it accepts the issuer for that purpose. A successful technical check can help establish that the credential is authentic. The employer still needs to decide whether the qualification meets its requirements.',
          'De werkgever moet begrijpen wat het credential zegt en beoordelen of hij de uitgever voor dat doel accepteert. Een geslaagde technische controle kan helpen vaststellen dat het credential authentiek is. De werkgever beslist nog steeds zelf of de kwalificatie aan de functie-eisen voldoet.',
          'De werkgever moet begrijpen wat het credential zegt en beoordelen of hij de uitgever (issuer) voor dat doel accepteert. Een geslaagde technische controle kan helpen vaststellen dat het credential authentiek is. De werkgever beslist nog steeds zelf of de kwalificatie aan de functie-eisen voldoet.'),
    // Correction 2: first prose mention on What is a digital wallet.
    array('For example, a course provider could issue proof that a person completed a course. The person could receive it in a compatible wallet and later present it to an employer. The employer would decide what it needs to check and whether it accepts the issuer for that purpose.',
          'Een opleider kan bijvoorbeeld een bewijs uitgeven dat iemand een cursus heeft afgerond. Die persoon kan het bewijs ontvangen in een geschikte wallet en later aan een werkgever tonen. De werkgever bepaalt wat moet worden gecontroleerd en of de uitgever voor dat doel wordt geaccepteerd.',
          'Een opleider kan bijvoorbeeld een bewijs uitgeven dat iemand een cursus heeft afgerond. Die persoon kan het bewijs ontvangen in een geschikte wallet en later aan een werkgever tonen. De werkgever bepaalt wat moet worden gecontroleerd en of de uitgever (issuer) voor dat doel wordt geaccepteerd.'),
    // Correction 2: first prose mention on Formats and protocols.
    array('A format does not, on its own, determine whether an issuer is acceptable to a relying party or whether a credential has a particular legal status. For credentials, attestations and credential types, see',
          'Een formaat bepaalt op zichzelf niet of een vertrouwende partij de uitgever accepteert of welke juridische status een credential heeft. Meer over credentials, attestaties en credentialtypen leest u in',
          'Een formaat bepaalt op zichzelf niet of een vertrouwende partij de uitgever (issuer) accepteert of welke juridische status een credential heeft. Meer over credentials, attestaties en credentialtypen leest u in'),
    // Correction 2: first prose mention on Trust and interoperability.
    array('Suppose a supplier presents a digital credential to a customer. The customer’s service may be able to read and check it, but the customer still needs to decide whether the issuer is appropriate and whether the information answers its business question.',
          'Stel dat een leverancier een digitaal credential aan een klant toont. De dienst van de klant kan het mogelijk lezen en controleren, maar de klant moet nog bepalen of de uitgever geschikt is en of de gegevens antwoord geven op de zakelijke vraag.',
          'Stel dat een leverancier een digitaal credential aan een klant toont. De dienst van de klant kan het mogelijk lezen en controleren, maar de klant moet nog bepalen of de uitgever (issuer) geschikt is en of de gegevens antwoord geven op de zakelijke vraag.'),
    // Correction 2: first prose mention on Accepting information from a wallet.
    array('For example, an employer wants to check whether an applicant holds a particular qualification. The employer does not necessarily need the applicant’s full education history. It first needs to determine what must be demonstrated, which issuers it can rely on and what happens if the information cannot be provided.',
          'Een werkgever wil bijvoorbeeld controleren of een sollicitant een bepaalde kwalificatie heeft. Daarvoor is niet noodzakelijk het volledige opleidingsoverzicht nodig. De werkgever moet eerst bepalen wat moet worden aangetoond, welke uitgevers hij vertrouwt en wat er gebeurt als de gegevens niet kunnen worden verstrekt.',
          'Een werkgever wil bijvoorbeeld controleren of een sollicitant een bepaalde kwalificatie heeft. Daarvoor is niet noodzakelijk het volledige opleidingsoverzicht nodig. De werkgever moet eerst bepalen wat moet worden aangetoond, welke uitgevers (issuers) hij vertrouwt en wat er gebeurt als de gegevens niet kunnen worden verstrekt.'),
    // Correction 2: first prose mention on the receive page.
    array('See how an issuer, a wallet and a service work together, or read what to check when you receive information in',
          'Lees hoe een uitgever, een wallet en een dienst samenwerken, of wat u controleert bij',
          'Lees hoe een uitgever (issuer), een wallet en een dienst samenwerken, of wat u controleert bij'),
    // Correction 2: first prose mention on the training page.
    array('The roles of issuers, wallet holders and relying parties.',
          'De rollen van uitgevers, wallethouders en vertrouwende partijen.',
          'De rollen van uitgevers (issuers), wallethouders en vertrouwende partijen.'),
    // Correction 2: first prose mention on Business wallets where to start (intro paragraph; the diagram note stays "uitgever").
    array('A register, certification body or another party may provide information. The supplier may hold or manage a credential, and the customer’s service may receive and check it. These roles are not fixed to particular kinds of organisation. A register is not always the issuer, and an organisation may issue information in one process and receive it in another.',
          'Een register, certificerende instelling of andere partij kan gegevens verstrekken. De leverancier kan een credential bewaren of beheren en de dienst van de klant kan het ontvangen en controleren. Deze rollen liggen niet vast voor bepaalde soorten organisaties. Een register is niet altijd de uitgever en een organisatie kan in het ene proces gegevens uitgeven en in een ander proces ontvangen.',
          'Een register, certificerende instelling of andere partij kan gegevens verstrekken. De leverancier kan een credential bewaren of beheren en de dienst van de klant kan het ontvangen en controleren. Deze rollen liggen niet vast voor bepaalde soorten organisaties. Een register is niet altijd de uitgever (issuer) en een organisatie kan in het ene proces gegevens uitgeven en in een ander proces ontvangen.'),
    // Correction 2: first prose mention on the Wallet Readiness Workshop page.
    array('Possible roles for your organisation: issuer, relying party or wallet user.',
          'Mogelijke rollen voor uw organisatie: uitgever, vertrouwende partij of walletgebruiker.',
          'Mogelijke rollen voor uw organisatie: uitgever (issuer), vertrouwende partij of walletgebruiker.'),
    // Correction 2: running text, later on the page than the first mention (English "issuer" replaced).
    array('Depending on the credential and its supporting infrastructure, checks can establish whether the information was altered, who secured it, and whether it is within its validity period. Status information may also be available. Those technical checks are distinct from deciding whether an issuer is suitable for the claim or whether the evidence meets a service’s requirements.',
          'Afhankelijk van de credential en de onderliggende infrastructuur kan worden gecontroleerd of de informatie is gewijzigd, wie die heeft beveiligd en of de geldigheidsduur nog loopt. Ook kan statusinformatie beschikbaar zijn. Deze technische controles staan los van de vraag of de issuer een geschikte bron is voor de betreffende verklaring en of het bewijs aan de eisen van een dienst voldoet.',
          'Afhankelijk van de credential en de onderliggende infrastructuur kan worden gecontroleerd of de informatie is gewijzigd, wie die heeft beveiligd en of de geldigheidsduur nog loopt. Ook kan statusinformatie beschikbaar zijn. Deze technische controles staan los van de vraag of de uitgever een geschikte bron is voor de betreffende verklaring en of het bewijs aan de eisen van een dienst voldoet.'),
    // Correction 2: running text "issuers" -> "uitgevers".
    array('Browse use cases, then follow the connections to issuers, wallets and services.',
          'Bekijk usecases en volg de koppelingen naar issuers, wallets en diensten.',
          'Bekijk usecases en volg de koppelingen naar uitgevers, wallets en diensten.'),
    // Correction 2: title/link text "issuers" -> "uitgevers" (shared by 12 pages).
    array('How credentials connect issuers, wallets and services',
          'Hoe credentials issuers, wallets en diensten verbinden',
          'Hoe credentials uitgevers, wallets en diensten verbinden'),
    // Correction 2: "issuer-rol" -> "uitgeversrol" (term definition shown on 6 pages).
    array('Can create and issue new credentials to users or businesses (issuer role).',
          'Kan nieuwe credentials aanmaken en uitgeven aan personen of bedrijven (issuer-rol).',
          'Kan nieuwe credentials aanmaken en uitgeven aan personen of bedrijven (uitgeversrol).'),
    // Correction 3: the holder role of the credential model (the person who receives the credential), not a "user".
    array('The wallet holder needs to understand what they are receiving and when they may use it.',
          'De walletgebruiker moet begrijpen wat hij ontvangt en wanneer hij het kan gebruiken.',
          'De wallethouder moet begrijpen wat hij ontvangt en wanneer hij het kan gebruiken.'),
    // Correction 4: "mandates" in the topic card means mandate credentials; "bevoegdheid" stays where authority in general is meant.
    array('Organisation data, mandates, business wallets and data exchange.',
          'Organisatiegegevens, bevoegdheden, business wallets en gegevensuitwisseling.',
          'Organisatiegegevens, mandaten, business wallets en gegevensuitwisseling.'),
    // Correction 5: "selective disclosure" is the capability (concept), not the chosen data.
    array('ISO (18013-5) binary (CBOR) format for mobile documents with strong authentication and selective disclosure. See also Mobile Driving Licence Credential for the mDL use case.',
          'ISO-formaat (18013-5) voor mobiele documenten, met sterke authenticatie en de mogelijkheid om geselecteerde gegevens te delen. Zie ook Mobile Driving Licence Credential voor het mobiele rijbewijs.',
          'ISO-formaat (18013-5) voor mobiele documenten, met sterke authenticatie en selectief gegevens delen. Zie ook Mobile Driving Licence Credential voor het mobiele rijbewijs.'),
    // Correction 5: concept "selective disclosure" -> agreed term.
    array('You may be able to use the same credential with more than one service. What can be reused, and what you need to share, depends on the credential and the service. Selective disclosure can limit the information presented when it is supported; it is not a property of every wallet interaction.',
          'Mogelijk kunt u dezelfde credential bij meerdere diensten gebruiken. Wat u kunt hergebruiken en welke gegevens u moet delen, hangt af van de credential en de dienst. Selectieve verstrekking kan de gedeelde informatie beperken als die mogelijkheid wordt ondersteund; niet elke uitwisseling met een wallet biedt dit.',
          'Mogelijk kunt u dezelfde credential bij meerdere diensten gebruiken. Wat u kunt hergebruiken en welke gegevens u moet delen, hangt af van de credential en de dienst. Selectief gegevens delen kan de gedeelde informatie beperken als die mogelijkheid wordt ondersteund; niet elke uitwisseling met een wallet biedt dit.'),
    // Correction 6: second mention of the offering name on the same page (repetition).
    array('The Wallet Readiness Workshop works through use cases, impact and first priorities with your team.',
          'In de Wallet Readiness Workshop werkt uw team aan usecases, impact en eerste prioriteiten.',
          'In de workshop werkt uw team aan usecases, impact en eerste prioriteiten.'),
);

/**
 * Theme and plugin gettext strings (table wp_trp_gettext_nl_nl, keyed by domain + original). Only strings the route pages
 * show: the skip link (Blocksy) and the WPForms notice that is shown without JavaScript.
 */
$gettext = array(
    array('blocksy', 'Skip to content', 'Naar de inhoud'),
    array('wpforms-lite', 'Please enable JavaScript in your browser to complete this form.', 'Schakel JavaScript in uw browser in om dit formulier te voltooien.'),
);
$gtable = $GLOBALS['wpdb']->prefix . 'trp_gettext_nl_nl';

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
$g_filled = 0;
foreach ($gettext as $g) {
    $row = $wpdb->get_row($wpdb->prepare("SELECT id, translated FROM $gtable WHERE domain = %s AND BINARY original = %s LIMIT 1", $g[0], $g[1])); // phpcs:ignore
    if ($row && trim((string) $row->translated) === '') {
        if ($mode === 'apply') {
            $wpdb->update($gtable, array('translated' => $g[2], 'status' => 2), array('id' => (int) $row->id));
        }
        $g_filled++;
    }
}
// Empty the lone article fragments, local pilot only (host check; never on staging or production).
$home_host = (string) wp_parse_url((string) get_option('home'), PHP_URL_HOST);
$cleared   = 0;
if ($home_host === 'localhost' || $home_host === '127.0.0.1') {
    foreach ($clear_fragments as $frag) {
        $rows = $wpdb->get_results($wpdb->prepare("SELECT id, translated FROM $table WHERE BINARY original = %s", $frag)); // phpcs:ignore
        foreach ($rows as $row) {
            if ((string) $row->translated !== '') {
                if ($mode === 'apply') {
                    $wpdb->update($table, array('translated' => '', 'status' => 0), array('id' => (int) $row->id));
                }
                $cleared++;
            }
        }
    }
    echo 'lone article fragments ' . ($mode === 'apply' ? 'emptied' : 'still translated') . ": $cleared\n";
} else {
    echo "lone article fragments: skipped (not the local pilot site)\n";
}
// Terminology corrections (local only): rewrite a row only when it still holds the expected old Dutch.
$corr = array('changed' => 0, 'already' => 0, 'kept' => array(), 'missing' => array(), 'manual' => array());
if ($home_host === 'localhost' || $home_host === '127.0.0.1') {
    $decode = static function (string $x): string { return trim((string) preg_replace('/\s+/u', ' ', html_entity_decode($x, ENT_QUOTES | ENT_HTML5, 'UTF-8'))); };
    foreach ($corrections as $c) {
        $variants = array();
        foreach (array($c[0], str_replace('&', '&amp;', $c[0]), str_replace('&', '&#038;', $c[0])) as $v) {
            $variants[ $v ] = true;
            $variants[ preg_replace_callback('/[\x{2018}\x{2019}\x{201C}\x{201D}\x{2013}\x{2014}\x{2026}]/u', static function ($m) { return '&#' . mb_ord($m[0], 'UTF-8') . ';'; }, $v) ] = true;
        }
        $found = false;
        foreach (array_keys($variants) as $v) {
            $rows = $wpdb->get_results($wpdb->prepare("SELECT id, original, translated FROM $table WHERE BINARY original = %s", $v)); // phpcs:ignore
            foreach ($rows as $row) {
                $found = true;
                $cur = (string) $row->translated;
                if ($decode($cur) === $decode($c[2])) {
                    $corr['already']++;
                } elseif ($decode($cur) === $decode($c[1])) {
                    if ($cur !== html_entity_decode($cur, ENT_QUOTES | ENT_HTML5, 'UTF-8')) {
                        $corr['manual'][] = substr($c[0], 0, 70); // stored with entities: change it in the editor
                        continue;
                    }
                    if ($mode === 'correct') {
                        $wpdb->update($table, array('translated' => $c[2], 'status' => 2), array('id' => (int) $row->id));
                    }
                    $corr['changed']++;
                } else {
                    $corr['kept'][] = substr($c[0], 0, 70);
                }
            }
        }
        if (! $found) {
            $corr['missing'][] = substr($c[0], 0, 70);
        }
    }
    echo 'terminology corrections ' . ($mode === 'correct' ? 'applied' : 'pending') . ": {$corr['changed']}, already done: {$corr['already']}, kept (other translation): " . count($corr['kept']) . ', no row: ' . count($corr['missing']) . ', manual: ' . count($corr['manual']) . "\n";
    foreach (array('kept', 'missing', 'manual') as $k) {
        foreach ($corr[ $k ] as $x) {
            echo "  $k: $x\n";
        }
    }
}
echo "gettext strings " . ($mode === 'apply' ? 'filled' : 'untranslated') . ": $g_filled\n";
echo ($mode === 'apply' ? 'filled' : 'untranslated') . ": $filled, already translated (kept): $kept, no dictionary row yet: " . count($absent) . "\n";
foreach ($absent as $en) {
    echo '  - ' . substr($en, 0, 90) . "\n";
}
