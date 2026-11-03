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
$check(count($seeded) >= 6, 'six Learn seed pages exist (run create-learn-pages.sh)');
foreach ($seeded as $id) {
    $check(get_page_template_slug($id) === Fides_DS_Learn::TEMPLATE, "seed page {$id} uses the Learn template");
    $check((string) get_post_meta($id, '_fides_learn_seed_hash', true) !== '', "seed page {$id} stores a seed hash");
    $check(! preg_match('/€|\bprice\b|pricing/i', (string) get_post_field('post_content', $id) . get_post_field('post_excerpt', $id)), "seed page {$id} has no price text");
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
Fides_DS_Glossary::reset();

foreach ($results['fail'] as $message) {
    echo "not ok - {$message}\n";
}
printf("# pass %d\n# fail %d\n", $results['pass'], count($results['fail']));
if ($results['fail']) {
    exit(1);
}
