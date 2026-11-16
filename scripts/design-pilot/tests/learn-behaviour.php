<?php
/**
 * Behaviour tests for the FIDES Learn template (tiles): vocabulary lookup,
 * contents ids, Learn bar model, series previous/next and seed markers.
 * Creates temporary pages and removes them again. Run: scripts/design-pilot/run-tests.sh
 */

if (! defined('ABSPATH')) {
    exit(1);
}

$results = array('pass' => 0, 'fail' => array());
$check   = static function (bool $ok, string $message) use (&$results): void {
    if ($ok) {
        $results['pass']++;
    } else {
        $results['fail'][] = $message;
    }
};

$check(class_exists('Fides_DS_Learn'), 'Fides_DS_Learn is loaded');
$check(isset(apply_filters('theme_page_templates', array())[ Fides_DS_Learn::TEMPLATE ]), 'Learn page template is registered');

// Vocabulary: definitions come from the glossary data, never from the template.
$issuer = Fides_DS_Learn::find_term('Issuer');
$check(is_array($issuer) && $issuer['key'] === 'issuer' && trim($issuer['description']) !== '', 'term lookup finds Issuer in the vocabulary');
$check((Fides_DS_Learn::find_term('business wallet')['name'] ?? '') === 'Organizational Wallet', 'term lookup matches an alias case-insensitively');
// A made-up name: "Credential" is a real glossary term since 1.12.0, so it cannot serve as the undefined example.
$check(Fides_DS_Learn::find_term('Unlisted Test Term') === null, 'a term without vocabulary entry is not invented');
$check(Fides_DS_Learn::find_term('Credential') !== null, 'Credential has a vocabulary entry (glossary 1.12.0 and later)');
Fides_DS_Learn::$missing = array();
$check(do_shortcode('[fides_learn_term term="Unlisted Test Term"]credential[/fides_learn_term]') === 'credential' && Fides_DS_Learn::$missing === array('Unlisted Test Term'), 'undefined term renders plain text and is reported');
$check(strpos(do_shortcode('[fides_learn_term term="Issuer"]issuer[/fides_learn_term]'), 'data-fides-ds-term') !== false, 'defined term renders the shared glossary button');
$check(strpos(do_shortcode('[fides_learn_terms terms="Verifiable credential=Verifiable Credential|Issuer"]'), '>Verifiable credential<') !== false, 'Label=Term shows the label with the vocabulary definition');
Fides_DS_Glossary::reset();

// Contents ids: stable, unique, existing ids kept.
$prepared = Fides_DS_Learn::prepare_body('<h2>What is checked?</h2><p>a</p><h2>What is checked?</h2><h2 id="own">Own id</h2>');
$check(array_column($prepared['toc'], 'id') === array('what-is-checked', 'what-is-checked-2', 'own'), 'contents ids are unique and keep editor ids');
$check(strpos($prepared['html'], '<h2 id="what-is-checked">') !== false, 'headings receive their id');

// Seeded pages (when the pilot has been seeded).
$seeded = get_posts(array('post_type' => 'page', 'post_status' => 'any', 'numberposts' => 20, 'meta_key' => '_fides_learn_seed', 'fields' => 'ids'));
$check(count($seeded) >= 12, 'twelve Learn seed pages exist (run create-learn-pages.sh)');
foreach ($seeded as $id) {
    $check(get_page_template_slug($id) === Fides_DS_Learn::TEMPLATE, "seed page {$id} uses the Learn template");
    $check((string) get_post_meta($id, '_fides_learn_seed_hash', true) !== '', "seed page {$id} stores a seed hash");
    // Training & workshops pages (sessions, offerings, enquiry) state approved prices; every other seed page stays price-free.
    if (! in_array((string) get_post_meta($id, '_fides_learn_kind', true), array('sessions', 'offering', 'request'), true)) {
        $check(! preg_match('/€|\bprice\b|pricing/i', (string) get_post_field('post_content', $id) . get_post_field('post_excerpt', $id)), "seed page {$id} has no price text");
    }
}

// Series: previous/next only for two or more pages with the same series slug.
$parent = get_page_by_path('fides-design-pilot');
$make   = static function (string $slug, int $order, string $series) use ($parent): int {
    $id = wp_insert_post(array('post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Series test ' . $slug, 'post_name' => 'learn-series-test-' . $slug, 'post_parent' => $parent ? $parent->ID : 0, 'menu_order' => $order, 'post_content' => '<p>x</p>'));
    update_post_meta($id, '_wp_page_template', Fides_DS_Learn::TEMPLATE);
    update_post_meta($id, '_fides_learn_kind', 'article');
    if ($series !== '') {
        update_post_meta($id, '_fides_learn_series', $series);
    }
    return (int) $id;
};
$created = array();
try {
    $solo = $make('solo', 0, 'solo-series');
    $created[] = $solo;
    $check(Fides_DS_Learn::series_links($solo) === array('prev' => null, 'next' => null), 'a single page with a series slug has no previous/next');
    $a = $make('a', 0, 'test-series');
    $b = $make('b', 1, 'test-series');
    $c = $make('c', 2, 'test-series');
    $none = $make('none', 3, '');
    array_push($created, $a, $b, $c, $none);
    $links = Fides_DS_Learn::series_links($b);
    $check($links['prev'] && (int) $links['prev']->ID === $a && $links['next'] && (int) $links['next']->ID === $c, 'middle page of a real series links previous and next');
    $links = Fides_DS_Learn::series_links($a);
    $check($links['prev'] === null && $links['next'] && (int) $links['next']->ID === $b, 'first page has only next');
    $check(Fides_DS_Learn::series_links($none) === array('prev' => null, 'next' => null), 'a page outside a series has no previous/next');
    $check(strpos(Fides_DS_Learn::render_page($b), 'fides-learn-series') !== false, 'series navigation is rendered for a series page');
    $check(strpos(Fides_DS_Learn::render_page($none), 'fides-learn-series') === false, 'no series navigation without a series');
} finally {
    foreach ($created as $id) {
        wp_delete_post($id, true);
    }
}

// Learn bar model on the seeded tree.
$root = get_page_by_path('fides-design-pilot/learn');
if ($root instanceof WP_Post) {
    $model = Fides_DS_Learn::bar_model($root->ID);
    $check(array_column($model['items'], 'key') === array('overview', 'topics', 'sessions', 'glossary') && $model['active'] === 'overview', 'bar model on the overview');
    $article = get_page_by_path('fides-design-pilot/learn/topics/the-big-picture/how-credentials-connect');
    $check($article instanceof WP_Post && Fides_DS_Learn::bar_model($article->ID)['active'] === 'topics', 'bar model marks Topics for an article');
    $html = Fides_DS_Learn::render_page($article->ID);
    $check(substr_count($html, 'class="fides-learn-bar"') === 1 && strpos($html, 'fides-ds-site-header') === false, 'Learn markup adds one bar and no second site header');
    $check(strpos($html, 'On this page') !== false && strpos($html, 'Terms in this article') !== false, 'article shows contents menu and terms');
    $check(Fides_DS_Learn::series_links($article->ID)['prev'] === null, 'seed articles are not a series');
}

// Explorer entry pages (Paper 25.1, 25.2): shared shell, no Learn bar, catalog links from the navigation.
$start   = get_page_by_path('fides-design-pilot/start', OBJECT, 'page');
$receive = get_page_by_path('fides-design-pilot/start/receive', OBJECT, 'page');
$check($start instanceof WP_Post && $receive instanceof WP_Post, 'start and receive pages exist (run create-learn-pages.sh)');
if ($start && $receive) {
    $html = Fides_DS_Learn::render_page($start->ID);
    $check(strpos($html, 'fides-learn-bar') === false && strpos($html, 'fides-ds-site-header') === false, 'starting point has no Learn bar and no second header');
    $check(substr_count($html, '<h1') === 1 && strpos($html, 'Start with what you want to achieve.') !== false, 'starting point has one H1');
    $check(strpos($html, '/fides-design-pilot/start/receive/') !== false, 'only the receive route is a link');
    $check(substr_count($html, 'fides-learn-rows__title') >= 2 && preg_match('#fides-learn-rows__title">Issue digital credentials#', $html) === 1, 'Issue digital credentials is not a link');
    $check(preg_match('#fides-learn-rows__title">Understand what this means for us#', $html) === 1, 'Understand what this means for us is not a link');
    $check(strpos($html, 'data-fides-learn-catalogs') !== false && strpos($html, '/fides-design-pilot/overview/') !== false && strpos($html, '/fides-design-pilot/credentials/') !== false, 'catalog links follow the navigation mapping');
    $check(strpos($html, 'Intermediaries') === false && strpos($html, 'Trust schemes') === false, 'catalogs without a destination are not listed');
    $rhtml = Fides_DS_Learn::render_page($receive->ID);
    $check(strpos($rhtml, 'fides-learn-bar') === false, 'receive route has no Learn bar');
    $check(strpos($rhtml, '/fides-design-pilot/learn/topics/the-big-picture/how-credentials-connect/') !== false, 'receive route links to the Learn article');
    $check(strpos($rhtml, '/fides-design-pilot/learn/sessions/wallet-readiness-workshop/') !== false, 'receive route links to the Readiness Workshop');
    $check(strpos($rhtml, 'usecase=digital-certificate-of-good-conduct-vog-as-a-verifiable-credential-yjw4BC') !== false, 'receive route links to the VOG use case detail');
}

// Practice card: record named by the editor, image from the record, hidden when it cannot be shown.
$vog  = 'digital-certificate-of-good-conduct-vog-as-a-verifiable-credential-yjw4BC';
$card = do_shortcode('[fides_learn_record type="usecase" id="' . $vog . '" url="/fides-design-pilot/use-case/" title="Practice" label="Explore"]');
$check(strpos($card, 'data-fides-learn-record="usecase:' . $vog . '"') !== false && strpos($card, 'usecase=' . $vog) !== false, 'record card links to the named use case');
$check(strpos($card, '<img class="fides-learn-record__image" src="https://') !== false, 'record card uses the image of the existing record');
$check(do_shortcode('[fides_learn_record type="usecase" id="no-such-record" url="/fides-design-pilot/use-case/"]') === '', 'record card is hidden for an unknown record');
$check(do_shortcode('[fides_learn_record type="wallet" id="x" url="/x/"]') === '' && do_shortcode('[fides_learn_record type="usecase" id="' . $vog . '"]') === '', 'record card is hidden for an unsupported type or a missing detail page');

// Editorial links: only explicit entries, and only while the target page is published.
$check(Fides_DS_Editorial_Links::render('usecase:' . $vog) !== '', 'VOG detail has an editorial link');
$check(Fides_DS_Editorial_Links::render('usecase:some-other-record') === '' && Fides_DS_Editorial_Links::render('') === '', 'a record without an entry shows no module');
$entry = Fides_DS_Editorial_Links::entry('usecase:' . $vog);
$check(is_array($entry) && ($entry['target'] ?? '') !== '' && strpos((string) ($entry['target'] ?? ''), '/learn/topics/the-big-picture/how-credentials-connect/') !== false, 'VOG link targets the issuer, wallet and service article');
$ghost = static function ($entry, $context) {
    return $context === 'test:ghost' ? array('title' => 'T', 'label' => 'L', 'target' => '/fides-design-pilot/learn/no-such-page/') : $entry;
};
add_filter('fides_ds_editorial_link_entry', $ghost, 10, 2);
$check(Fides_DS_Editorial_Links::render('test:ghost') === '', 'a link to a page that does not exist is not rendered');
remove_filter('fides_ds_editorial_link_entry', $ghost, 10);
$html = Fides_DS_Editorial_Links::render('wallet-overview:organizational');
$check(strpos($html, 'fides-ds-editorial-link--card') !== false && strpos($html, 'business-wallets-where-to-start') !== false, 'business wallet overview card links to the existing article');
$check(Fides_DS_Editorial_Links::target_url('javascript:alert(1)') === '' && Fides_DS_Editorial_Links::target_url('relative/page') === '', 'only site paths and http(s) URLs are accepted as targets');
$check(do_shortcode('[fides_editorial_link context="credential-overview"]') === '', 'credential overview has no link until an editor chooses one');

// Overview process band and article practice card come from the seeded content.
$overview = get_page_by_path('fides-design-pilot/learn', OBJECT, 'page');
$check($overview && strpos((string) $overview->post_content, 'fides-learn-process') !== false && strpos((string) $overview->post_content, 'how-credentials-connect') !== false, 'Learn overview has the process band linking to the article');

Fides_DS_Glossary::reset();

// Chrome stays on the design shell unless a site opts into the theme header.
$check(Fides_DS_Learn::chrome() === 'shell', 'Learn chrome defaults to the design shell');
$theme_chrome = static function (): string {
    return 'theme';
};
add_filter('fides_ds_learn_chrome', $theme_chrome);
$check(Fides_DS_Learn::chrome() === 'theme', 'the chrome filter can select the theme header');
$catalog_map = static function (): array {
    return array('/personal-wallets/' => '/wallet-catalog/', '/use-case/' => '/use-cases/');
};
add_filter('fides_ds_learn_catalog_bases', $catalog_map);
$mapped = Fides_DS_Learn::map_catalog_url('/use-case/?usecase=vog', array('/use-case/' => '/use-cases/', '/personal-wallets/' => '/wallet-catalog/'));
$check($mapped === '/use-cases/?usecase=vog', 'a catalog path keeps its query string');
$absolute = Fides_DS_Learn::map_catalog_url(home_url('/use-case/?usecase=vog'), array('/use-case/' => '/use-cases/'));
$check(strpos($absolute, '/use-cases/?usecase=vog') !== false && strpos($absolute, '/use-case/?') === false, 'a same-site absolute catalog URL is rewritten');
$check(Fides_DS_Learn::map_catalog_url('https://fides.community/topics/personal-wallets/', array('/personal-wallets/' => '/wallet-catalog/')) === 'https://fides.community/topics/personal-wallets/', 'another host is not rewritten');
$check(Fides_DS_Learn::map_catalog_url('/fides-design-pilot/personal-wallets/', array('/personal-wallets/' => '/wallet-catalog/')) === '/fides-design-pilot/personal-wallets/', 'a pilot-prefixed path is not rewritten by a root map');
$rewritten = Fides_DS_Learn::rewrite_catalog_html('<a href="/personal-wallets/">Browse</a>');
$check(strpos($rewritten, 'href="http://') !== false || strpos($rewritten, '/wallet-catalog/') !== false, 'theme chrome rewrites a mapped catalog link');
remove_filter('fides_ds_learn_catalog_bases', $catalog_map);
remove_filter('fides_ds_learn_chrome', $theme_chrome);
$check(Fides_DS_Learn::chrome() === 'shell', 'removing the filter returns the design shell');
$check(Fides_DS_Learn::rewrite_catalog_html('<a href="/personal-wallets/">Browse</a>') === '<a href="/personal-wallets/">Browse</a>', 'shell chrome leaves stored catalog links unchanged');

// A theme site hides missing destinations and unsupported catalog filters only when it asks for that.
$stored = '<a class="fides-ds-button" href="/learn/sessions/request/?offering=wallet-readiness-workshop">Discuss a workshop <span aria-hidden="true">→</span></a>'
    . '<a class="fides-ds-button fides-ds-button--secondary" href="/learn/topics/">Explore the knowledge topics <span aria-hidden="true">→</span></a>'
    . '<p>see <a href="/start/receive/">Receive information from wallets</a>.</p>'
    . '<p><a href="/services/">See the services overview →</a></p>'
    . '<li><a href="/organizations/?country=NL">Explore organisations in the <strong>Netherlands</strong></a></li>'
    . '<li><a href="/use-cases/?country=NL">Explore use cases from the <strong>Netherlands</strong></a></li>'
    . '<li><a href="/organizations/?role=eidas_trust_service_provider">Browse organisations — filter for <strong>eIDAS Trust Service Provider</strong></a></li>'
    . '<a href="/use-cases/?usecase=vog">Explore the VOG use case</a>'
    . '<p>For the two formats named above, the catalogs show what is reported: credential types that report <a href="/credential-catalog/?format=sd_jwt_vc">SD-JWT VC</a> or <a href="/credential-catalog/?format=mdoc">mdoc</a>, and personal wallets that report <a href="/wallet-catalog/?format=sd_jwt_vc">SD-JWT VC</a>.</p>'
    . '<p>To see which wallets report OpenID4VCI for issuance, explore the <a href="/wallet-catalog/?issuance=OpenID4VCI">personal wallets</a> or the <a href="/business-wallets/?issuance=OpenID4VCI">business wallets</a> in the catalogs.</p>';
$check(Fides_DS_Learn::adjust_trial_links($stored) === $stored, 'shell chrome keeps request buttons and filtered catalog links');
add_filter('fides_ds_learn_chrome', $theme_chrome);
$check(Fides_DS_Learn::adjust_trial_links($stored) === $stored, 'theme chrome without a site list keeps the stored links');
$contact = static function (): array {
    return array(
        'from'    => '/learn/sessions/request/',
        'url'     => '/about-fides/contact/',
        'default' => 'Contact us about this training',
        'labels'  => array(
            'wallet-readiness-workshop'         => 'Contact us about this workshop',
            'eudi-business-wallets-in-practice' => 'Contact us about this training',
        ),
    );
};
add_filter('fides_ds_learn_contact_buttons', $contact);
$contacted = Fides_DS_Learn::adjust_trial_links($stored . '<section class="fides-learn-closing"><h2>Register your interest</h2><p>Choose a date and leave your details. This is an expression of interest, not a booking or payment.</p><a class="fides-ds-button" href="/learn/sessions/request/?offering=eudi-business-wallets-in-practice&amp;date=thursday-10-december-2026">Register your interest <span aria-hidden="true">→</span></a></section>');
$check(strpos($contacted, 'href="/about-fides/contact/"') !== false && strpos($contacted, 'Contact us about this workshop') !== false, 'a workshop button opens the contact page');
$check(strpos($contacted, 'sessions/request') === false && strpos($contacted, 'offering=') === false && strpos($contacted, 'date=') === false, 'the contact button drops the enquiry, the offering and the date');
$check(strpos($contacted, 'Explore the knowledge topics') !== false, 'the topics button stays beside the contact button');
$check(strpos($contacted, 'Register your interest') === false && strpos($contacted, 'Choose a date') === false && strpos($contacted, 'does not register you') !== false && substr_count($contacted, 'Contact us about this training') === 2, 'the closing block no longer asks for a registration or a date');
remove_filter('fides_ds_learn_chrome', $theme_chrome);
$check(Fides_DS_Learn::adjust_trial_links($stored) === $stored, 'shell chrome ignores the contact button filter');
add_filter('fides_ds_learn_chrome', $theme_chrome);
remove_filter('fides_ds_learn_contact_buttons', $contact);
$unavailable = static function (): array {
    return array('/learn/sessions/request/', '/services/', '/start/receive/');
};
$supported = static function (): array {
    return array(
        '/wallet-catalog/'     => array('keys' => array('country', 'profile', 'wallets', 'wallet'), 'label' => 'Browse personal wallets'),
        '/business-wallets/'   => array('keys' => array('country', 'profile', 'wallets', 'wallet'), 'label' => 'Browse business wallets'),
        '/credential-catalog/' => array('keys' => array('credential', 'credentials', 'sector', 'theme'), 'label' => 'Browse credential types'),
        '/use-cases/'          => array('keys' => array('theme', 'usecase'), 'label' => 'Browse use cases'),
        '/organizations/'      => array('keys' => array('country', 'sector', 'org'), 'label' => 'Browse organisations'),
    );
};
add_filter('fides_ds_learn_unavailable_paths', $unavailable);
add_filter('fides_ds_learn_supported_filters', $supported);
$adjusted = Fides_DS_Learn::adjust_trial_links($stored);
$check(strpos($adjusted, '/learn/sessions/request/') === false && strpos($adjusted, 'Discuss a workshop') === false, 'a request button is removed');
$check(strpos($adjusted, 'Explore the knowledge topics') !== false, 'a button to an existing Learn page stays');
$check(strpos($adjusted, 'href="/start/receive/"') === false && strpos($adjusted, 'Receive information from wallets') !== false, 'a prose link to a missing page becomes text');
$check(strpos($adjusted, '/services/') === false && strpos($adjusted, 'See the services overview') === false, 'a services call to action is removed');
$check(strpos($adjusted, '/organizations/?country=NL') !== false && strpos($adjusted, 'Netherlands') !== false, 'a country link the organisation catalog applies stays');
$check(strpos($adjusted, 'usecase=vog') !== false, 'a use-case card link stays');
$check(strpos($adjusted, '?country=NL">Explore use cases') === false && strpos($adjusted, 'Browse use cases') !== false, 'a use-case country link becomes an unfiltered catalog link');
$check(strpos($adjusted, 'role=') === false && strpos($adjusted, 'eIDAS Trust Service Provider') === false && substr_count($adjusted, 'Browse organisations') === 1, 'an organisation role link no longer claims a role filter');
$check(strpos($adjusted, 'format=') === false && strpos($adjusted, 'that report') === false && strpos($adjusted, 'SD-JWT') === false && strpos($adjusted, 'Browse credential types') !== false && strpos($adjusted, 'Browse personal wallets') !== false, 'a format sentence no longer says the catalog is filtered');
$check(strpos($adjusted, 'issuance=') === false && strpos($adjusted, 'To see which') === false && strpos($adjusted, 'Browse business wallets') !== false, 'a protocol sentence no longer says the wallets are filtered');
remove_filter('fides_ds_learn_supported_filters', $supported);
remove_filter('fides_ds_learn_unavailable_paths', $unavailable);
remove_filter('fides_ds_learn_chrome', $theme_chrome);
$check(Fides_DS_Learn::adjust_trial_links($stored) === $stored, 'the design shell keeps the original links after the filters are removed');

$training = get_page_by_path('fides-design-pilot/learn/sessions/eudi-business-wallets-in-practice', OBJECT, 'page');
$overview = get_page_by_path('fides-design-pilot/learn/sessions', OBJECT, 'page');
$country = static function (): array {
    return array(
        'default' => 'NL',
        'options' => array('NL' => 'The Netherlands', 'DE' => 'Germany', 'OTHER' => 'Other'),
    );
};
if ($training) {
    $shell_dates = Fides_DS_Learn::render_page((int) $training->ID);
    $check(strpos($shell_dates, 'date=') !== false && strpos($shell_dates, 'request') !== false, 'shell chrome keeps a date link to the enquiry');
    add_filter('fides_ds_learn_chrome', $theme_chrome);
    add_filter('fides_ds_learn_contact_buttons', $contact);
    $theme_dates = Fides_DS_Learn::render_page((int) $training->ID);
    $check(strpos($theme_dates, 'href="/about-fides/contact/"') !== false && strpos($theme_dates, 'Thursday 10 December 2026') !== false, 'a training date links to the contact page');
    $check(strpos($theme_dates, 'date=') === false && strpos($theme_dates, 'Register interest') === false, 'a training date does not carry a date or a registration label');
    add_filter('fides_ds_learn_country_picker', $country);
    $offering = Fides_DS_Learn::render_page((int) $training->ID);
    $check(strpos($offering, 'fides-learn-country') === false && substr_count($offering, 'Thursday') === 4 && strpos($offering, 'href="/about-fides/contact/"') !== false, 'an offering page keeps its date links and has no country selector');
    remove_filter('fides_ds_learn_country_picker', $country);
    remove_filter('fides_ds_learn_contact_buttons', $contact);
    remove_filter('fides_ds_learn_chrome', $theme_chrome);
}
if ($overview) {
    $shell_overview = Fides_DS_Learn::render_page((int) $overview->ID);
    $check(strpos($shell_overview, 'Join an open training in Utrecht') !== false && strpos($shell_overview, 'fides-learn-country') === false && strpos($shell_overview, 'Currently, scheduled training is available in the Netherlands.') === false, 'shell chrome keeps the stored training intro and has no country selector');
    add_filter('fides_ds_learn_chrome', $theme_chrome);
    add_filter('fides_ds_learn_contact_buttons', $contact);
    add_filter('fides_ds_learn_country_picker', $country);
    $theme_overview = Fides_DS_Learn::render_page((int) $overview->ID);
    $check(strpos($theme_overview, 'Explore training and workshops on digital wallets and credentials, for individuals and teams.') !== false && strpos($theme_overview, 'Join an open training in Utrecht') === false, 'theme chrome uses the training intro from the country frames');
    $check(strpos($theme_overview, 'Where would you like to attend?') !== false && strpos($theme_overview, 'selected') !== false && strpos($theme_overview, '>The Netherlands<') !== false && strpos($theme_overview, 'Currently, scheduled training is available in the Netherlands.') !== false, 'the country selector defaults to the Netherlands and explains where training is scheduled');
    $check(strpos($theme_overview, 'No scheduled trainings in %s yet') !== false && strpos($theme_overview, 'your country') !== false && strpos($theme_overview, '>Contact us <span') !== false && strpos($theme_overview, 'href="/about-fides/contact/"') !== false, 'another country can show the empty-state contact link');
    $empty_at = strpos($theme_overview, 'data-fides-learn-country-empty');
    $partners_at = strpos($theme_overview, 'Training partnerships');
    $check($empty_at !== false && $partners_at !== false && $empty_at < $partners_at && strpos($theme_overview, 'data-fides-learn-region="nl"') !== false && strpos($theme_overview, 'data-fides-learn-region="partners"') !== false, 'the empty state sits above the partnership block and the Netherlands offer stays in the page');
    remove_filter('fides_ds_learn_country_picker', $country);
    remove_filter('fides_ds_learn_contact_buttons', $contact);
    remove_filter('fides_ds_learn_chrome', $theme_chrome);
}

foreach ($results['fail'] as $message) {
    echo "not ok - {$message}\n";
}
printf("# pass %d\n# fail %d\n", $results['pass'], count($results['fail']));
if ($results['fail']) {
    exit(1);
}
