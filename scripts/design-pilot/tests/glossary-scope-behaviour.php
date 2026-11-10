<?php
/**
 * Scope of the new glossary page (Fides_DS_Glossary_Page): off by default, on only for the seeded pilot page
 * (pilot mu-plugin filter) or for a page with the custom field. Creates two temporary pages and always removes
 * them. Runs inside the pilot WordPress.
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

$content = '<!-- wp:shortcode -->[fides_vocabulary_glossary]<!-- /wp:shortcode -->';
$made    = array();
$make    = static function (string $slug, string $body) use (&$made): int {
    $id = (int) wp_insert_post(array('post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Scope test ' . $slug, 'post_name' => $slug, 'post_content' => $body));
    $made[] = $id;
    return $id;
};
$fetch = static function (int $id, string $extra = ''): string {
    $res = wp_remote_get(home_url('/?page_id=' . $id . $extra), array('timeout' => 30, 'redirection' => 3));
    return is_wp_error($res) ? '' : (string) wp_remote_retrieve_body($res);
};

try {
    $classic = $make('glossary-scope-classic', $content);
    $meta    = $make('glossary-scope-meta', $content);
    $plain   = $make('glossary-scope-plain', '<p>No shortcode</p>');
    update_post_meta($meta, Fides_DS_Glossary_Page::META, '1');
    update_post_meta($plain, Fides_DS_Glossary_Page::META, '1');
    $seeded = get_page_by_path('glossary');

    $check(! Fides_DS_Glossary_Page::is_glossary_page($classic), 'a page with the shortcode is classic by default');
    $check(Fides_DS_Glossary_Page::is_glossary_page($meta), 'the custom field switches one page on');
    $check(! Fides_DS_Glossary_Page::is_glossary_page($plain), 'the custom field alone is not enough without the shortcode');
    $check($seeded instanceof WP_Post && Fides_DS_Glossary_Page::is_glossary_page((int) $seeded->ID), 'the seeded pilot glossary page is switched on by the pilot');

    $off = $fetch($classic);
    $check(strpos($off, 'fides-vocabulary-glossary-root') !== false, 'classic page still renders the plugin glossary root');
    $check(strpos($off, 'data-glossary-strings') === false && strpos($off, 'fides-glossary-page') === false, 'classic page has none of the new glossary markup');
    $check(strpos($off, 'tools-tiles/assets/glossary.js') === false && strpos($off, 'fides-vocabulary-glossary/assets/vocabulary-glossary.js') !== false, 'classic page loads the plugin script, not glossary.js');
    $check(strpos($fetch($classic, '&term=anything'), 'fides-vocabulary-glossary-root') !== false, 'classic page keeps working with a ?term= link');

    $on = $fetch($meta);
    $check(strpos($on, 'data-glossary-strings') !== false && strpos($on, 'tools-tiles/assets/glossary.js') !== false, 'switched-on page renders the new glossary');
    $check(strpos($on, 'fides-vocabulary-glossary/assets/vocabulary-glossary.js') === false, 'switched-on page drops the plugin script');
} finally {
    foreach ($made as $id) {
        wp_delete_post($id, true);
    }
}

foreach ($results['fail'] as $message) {
    echo "not ok - {$message}\n";
}
printf("# pass %d\n# fail %d\n", $results['pass'], count($results['fail']));
if ($results['fail']) {
    exit(1);
}
