<?php
/**
 * Throwaway fixture pages for the Continue learning split (used by tests/learn-article-template-checks.cjs).
 *
 * FIDES_FIXTURE_ACTION=create  creates one temporary Learn article per structure and prints one JSON line with the
 *                              slugs and the expected result per fixture;
 * FIDES_FIXTURE_ACTION=delete  removes every page created by this script (meta _fides_learn_split_fixture).
 * Pages are drafts of the local pilot only (published so the page renders, removed again after the check).
 * Run: pilot_wp eval-file tests/learn-continue-fixtures.php (with the environment variable set).
 */

if (! defined('ABSPATH')) {
    exit(1);
}

$action = (string) getenv('FIDES_FIXTURE_ACTION');
$ids    = get_posts(array('post_type' => 'page', 'post_status' => 'any', 'numberposts' => -1, 'meta_key' => '_fides_learn_split_fixture', 'fields' => 'ids'));
foreach ($ids as $id) {
    wp_delete_post((int) $id, true);
}
if ($action !== 'create') {
    echo wp_json_encode(array('deleted' => count($ids))) . "\n";
    return;
}

kses_remove_filters();
$parent = get_page_by_path('fides-design-pilot/learn', OBJECT, 'page');
if (! $parent) {
    fwrite(STDERR, "Learn page not found\n");
    exit(1);
}

$h = static function (string $text, int $level = 2): string {
    return '<!-- wp:heading' . ($level === 2 ? '' : ' {"level":' . $level . '}') . ' --><h' . $level . ' class="wp-block-heading">' . $text . '</h' . $level . '><!-- /wp:heading -->';
};
$p = static function (string $text, string $class = ''): string {
    return '<!-- wp:paragraph' . ($class ? ' {"className":"' . $class . '"}' : '') . ' --><p' . ($class ? ' class="' . $class . '"' : '') . '>' . $text . '</p><!-- /wp:paragraph -->';
};
$list = static function (array $links): string {
    $out = '<!-- wp:list --><ul class="wp-block-list">';
    foreach ($links as $label => $url) {
        $out .= '<!-- wp:list-item --><li>' . ($url === '' ? $label : '<a href="' . $url . '">' . $label . '</a>') . '</li><!-- /wp:list-item -->';
    }
    return $out . '</ul><!-- /wp:list -->';
};
$group = static function (string $inner): string {
    return '<!-- wp:group --><div class="wp-block-group">' . $inner . '</div><!-- /wp:group -->';
};

$learn_more = $h('Learn more', 3) . $list(array('Fixture article one' => '{{learn}}/topics/the-big-picture/what-is-a-digital-wallet/', 'Fixture article two' => '{{learn}}/topics/the-big-picture/what-is-a-credential/'));
$explore    = $h('Explore in the catalogs', 3) . $list(array('Fixture catalog link' => '{{pilot}}/credentials/'));
$empty_lm   = $h('Learn more', 3) . $list(array('' => ''));
// A spacer after each section keeps the page long enough for the contents jumps to reach their scroll offset.
$spacer     = '<!-- wp:spacer {"height":"700px"} --><div style="height:700px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->';
$sections   = $h('Fixture section one') . $p('Text of the first fixture section.') . $spacer . $h('Fixture section two') . $p('Text of the second fixture section.') . $spacer . $h('Fixture section three') . $p('Text of the third fixture section.') . $spacer;
$cl         = $h('Continue learning');
$note       = $p('Content last checked: 13 November 2026.', 'fides-learn-note');
$after      = $p('SENTINEL paragraph after the follow-up links.');

$fixtures = array(
    'flat'      => array('content' => $sections . $cl . $learn_more . $explore . $note, 'expect' => array('groups' => 2, 'sentinel' => false, 'wrappers' => 0)),
    'group'     => array('content' => $sections . $group($cl . $group($learn_more) . $group($explore)) . $note, 'expect' => array('groups' => 2, 'sentinel' => false, 'wrappers' => 0)),
    'nested'    => array('content' => $sections . $group($p('Paragraph that stays in the outer group.') . $group($cl . $learn_more . $group($group($explore)))) . $note, 'expect' => array('groups' => 2, 'sentinel' => false, 'wrappers' => 1, 'stay' => 'Paragraph that stays in the outer group.')),
    'emptygroup' => array('content' => $sections . $cl . $group($empty_lm) . $explore . $note, 'expect' => array('groups' => 1, 'sentinel' => false, 'wrappers' => 0, 'absent' => 'Learn more')),
    'emptyall'  => array('content' => $sections . $cl . $group($empty_lm) . $note, 'expect' => array('groups' => 0, 'sentinel' => false, 'wrappers' => 0, 'absent' => 'Continue learning', 'noSection' => true)),
    'after'     => array('content' => $sections . $cl . $learn_more . $explore . $after . $note, 'expect' => array('groups' => 2, 'sentinel' => true, 'wrappers' => 0)),
    'aftergroup' => array('content' => $sections . $group($cl . $learn_more . $after) . $note, 'expect' => array('groups' => 1, 'sentinel' => true, 'wrappers' => 1)),
    'learnmore' => array('content' => $sections . $cl . $learn_more . $note, 'expect' => array('groups' => 1, 'sentinel' => false, 'wrappers' => 0)),
    'explore'   => array('content' => $sections . $cl . $explore . $note, 'expect' => array('groups' => 1, 'sentinel' => false, 'wrappers' => 0)),
    'missing'   => array('content' => $sections . $note, 'expect' => array('groups' => 0, 'sentinel' => false, 'wrappers' => 0, 'noSection' => true)),
);

$out = array();
foreach ($fixtures as $name => $fixture) {
    $slug = 'learn-split-fixture-' . $name;
    $id   = wp_insert_post(array(
        'post_type'    => 'page',
        'post_status'  => 'publish',
        'post_title'   => 'Split fixture ' . $name,
        'post_name'    => $slug,
        'post_parent'  => $parent->ID,
        'post_excerpt' => 'Temporary fixture for the Continue learning split.',
        'post_content' => str_replace(array('{{learn}}', '{{pilot}}'), array(untrailingslashit(get_permalink($parent->ID)), untrailingslashit(home_url('/fides-design-pilot/pilot')) ), $fixture['content']),
    ), true);
    if (is_wp_error($id)) {
        fwrite(STDERR, $id->get_error_message() . "\n");
        exit(1);
    }
    update_post_meta($id, '_wp_page_template', Fides_DS_Learn::TEMPLATE);
    update_post_meta($id, '_fides_learn_kind', 'article');
    update_post_meta($id, '_fides_learn_split_fixture', '1');
    $out[ $name ] = array('path' => 'learn/' . $slug, 'expect' => $fixture['expect']);
}
echo wp_json_encode($out) . "\n";
