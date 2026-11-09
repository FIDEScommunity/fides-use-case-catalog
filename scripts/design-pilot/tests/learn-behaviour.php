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
$check(Fides_DS_Learn::find_term('Credential') === null, 'a term without vocabulary entry is not invented');
Fides_DS_Learn::$missing = array();
$check(do_shortcode('[fides_learn_term term="Credential"]credential[/fides_learn_term]') === 'credential' && Fides_DS_Learn::$missing === array('Credential'), 'undefined term renders plain text and is reported');
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

foreach ($results['fail'] as $message) {
    echo "not ok - {$message}\n";
}
printf("# pass %d\n# fail %d\n", $results['pass'], count($results['fail']));
if ($results['fail']) {
    exit(1);
}
