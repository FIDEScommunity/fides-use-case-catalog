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
