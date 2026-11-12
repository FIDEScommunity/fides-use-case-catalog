<?php
/**
 * Behaviour tests for the shared page header (Fides_DS_Page_Header): breadcrumb markup, real-destination rule,
 * H1 role classes, the Updates/Awards block normaliser and the wallet-detail breadcrumb that ends with the record.
 *
 * Run: scripts/design-pilot/run-tests.sh
 */

if (! defined('ABSPATH')) {
    exit(1);
}

$results = array('pass' => 0, 'fail' => array());
$check = static function (bool $ok, string $message) use (&$results): void {
    if ($ok) {
        $results['pass']++;
    } else {
        $results['fail'][] = $message;
    }
};

$check(class_exists('Fides_DS_Page_Header'), 'Fides_DS_Page_Header is loaded');

// Roles: unknown values fall back to the standard role.
$check(Fides_DS_Page_Header::title_class('compact') === 'fides-ph__title fides-ph__title--compact', 'compact role class');
$check(Fides_DS_Page_Header::title_class('standard') === 'fides-ph__title fides-ph__title--standard', 'standard role class');
$check(Fides_DS_Page_Header::title_class('other') === 'fides-ph__title fides-ph__title--standard', 'unknown role falls back to standard');

// Breadcrumb: parents link, the current page does not and carries aria-current="page"; accessible name present.
$html = Fides_DS_Page_Header::crumbs(array(
    array('label' => 'Learn', 'url' => 'https://example.test/learn/'),
    array('label' => 'Training & workshops', 'url' => ''),
), 'fides-learn__crumbs');
$check(strpos($html, 'aria-label="Breadcrumb"') !== false, 'breadcrumb has an accessible name');
$check(strpos($html, 'class="fides-ph__crumbs fides-learn__crumbs"') !== false, 'breadcrumb keeps the legacy hook class');
$check(strpos($html, '<a href="https://example.test/learn/">Learn</a>') !== false, 'parent is a link');
$check(strpos($html, '<span aria-current="page">Training &amp; workshops</span>') !== false, 'current page is a non-clickable span with aria-current');
$check(substr_count($html, '<a ') === 1, 'only the parent is clickable');
$check(strpos($html, '/</') === false && strpos($html, '> / <') === false, 'the slash separator is not in the markup (CSS only)');

// A parent without a destination is left out; a single remaining step carries no hierarchy.
$only = Fides_DS_Page_Header::crumbs(array(array('label' => 'Ecosystem', 'url' => ''), array('label' => 'Global Digital Trust Awards', 'url' => '')));
$check($only === '', 'a parent without a destination is dropped and a lone current page renders no breadcrumb');
$three = Fides_DS_Page_Header::crumbs(array(
    array('label' => 'Ecosystem Explorer', 'url' => home_url('/explorer/')),
    array('label' => 'Personal wallets', 'url' => 'https://example.test/wallets/'),
    array('label' => 'MATTR Go | Hold', 'url' => ''),
));
$check(substr_count($three, '<li>') === 3 && substr_count($three, 'aria-current="page"') === 1, 'three-step trail ends with exactly one current page');
$check(strpos($three, 'MATTR Go | Hold') !== false, 'record name is the last step');

// Destinations: a missing page on this site is not a destination; off-site and home are.
$check(Fides_DS_Page_Header::destination('') === '', 'empty destination stays empty');
$check(Fides_DS_Page_Header::destination(home_url('/this-page-does-not-exist-xyz/')) === '', 'unknown local path is not a destination');
$check(Fides_DS_Page_Header::destination('https://fides.community/plans/') === 'https://fides.community/plans/', 'off-site destination is kept');
$check(Fides_DS_Page_Header::destination(home_url('/')) === home_url('/'), 'home is a destination');

// Updates block normaliser (page created before the shared classes existed).
global $wp_query;
$legacy_updates = '<div class="wp-block-group fides-ds fides-ds-page is-layout-flow wp-block-group-is-layout-flow" style="padding-top:48px;padding-bottom:0px">'
    . '<p class="fides-ds-kicker wp-block-paragraph">FIDES · Knowledge &amp; ecosystem</p>'
    . '<h1 class="wp-block-heading fides-ds-heading-1 fides-ds-heading-1--catalog">Updates</h1>'
    . '<p class="fides-ds-lead wp-block-paragraph">Follow developments.</p></div>'
    . '<div class="wp-block-group fides-ds fides-ds-page is-layout-flow wp-block-group-is-layout-flow" style="padding-top:32px">[list]</div>';
$legacy_awards = '<div class="wp-block-group fides-awards"><div class="wp-block-group fides-awards-hero fides-awards-inner is-layout-flow">'
    . '<div class="wp-block-group fides-awards-hero__main"><p class="fides-awards-kicker wp-block-paragraph">ECOSYSTEM · AWARDS</p>'
    . '<h1 class="wp-block-heading fides-ds-heading-1 fides-awards-title">Global Digital Trust Awards</h1>'
    . '<p class="fides-ds-lead fides-awards-lead wp-block-paragraph">Celebrating.</p></div>'
    . '<div class="wp-block-group fides-awards-panel"><p class="fides-awards-kicker wp-block-paragraph">THE FIRST EDITION · 2026</p></div></div></div>';

// The normaliser only runs in the main loop; simulate it.
$fake = static function (string $html) use (&$wp_query): string {
    $post = get_posts(array('post_type' => 'page', 'numberposts' => 1, 'post_status' => 'publish'));
    $GLOBALS['post'] = $post ? $post[0] : null;
    $wp_query = new WP_Query(array('post_type' => 'page', 'p' => $post ? $post[0]->ID : 0));
    $wp_query->the_post();
    $GLOBALS['wp_the_query'] = $wp_query;
    $out = Fides_DS_Page_Header::normalize_block_header($html);
    wp_reset_postdata();
    return $out;
};
$u = $fake($legacy_updates);
$check(strpos($u, 'fides-ph__title fides-ph__title--standard') !== false, 'Updates H1 gets the standard role');
$check(strpos($u, 'fides-ds-heading-1--catalog') === false, 'Updates H1 loses the catalog scale class');
$check(strpos($u, 'fides-ph__label') !== false && strpos($u, 'fides-ph__intro') !== false, 'Updates label and intro get the shared classes');
$check(strpos($u, 'padding-top:48px') === false && strpos($u, 'padding-top:32px') === false, 'Updates inline padding overrides are removed');
$check(strpos($u, 'fides-ds-page fides-ph ') !== false, 'Updates group becomes the page header');
$check($fake($u) === $u, 'normaliser is idempotent');

$a = $fake($legacy_awards);
$check(strpos($a, 'fides-awards-hero fides-awards-inner fides-ph') !== false, 'Awards hero becomes the page header');
$check(strpos($a, 'fides-ph__title fides-ph__title--standard fides-awards-title') !== false, 'Awards H1 gets the standard role');
$check(strpos($a, 'fides-ph__intro fides-awards-lead') !== false, 'Awards intro gets the shared class');
$check(substr_count($a, 'fides-ph__label') === 1, 'only the hero kicker becomes the label, not the panel kicker');

// Wallet detail: breadcrumb ends with the record name; Back stays a separate action.
if (class_exists('Fides_DS_Detail_Top')) {
    $top = Fides_DS_Detail_Top::render(array(
        'back_url'    => 'https://example.test/wallets/',
        'back_label'  => 'All personal wallets',
        'back_attrs'  => array('data-fides-ds-back' => 'wallet', 'data-fides-ds-back-id' => 'x'),
        'crumbs'      => array(array('Personal wallets', 'https://example.test/wallets/'), array('MATTR Go | Hold', '')),
        'share_url'   => 'https://example.test/wallet/?wallet=x',
        'page_header' => true,
    ));
    $check(strpos($top, 'fides-ds-detail-top--header') !== false, 'detail top uses the page-header variant');
    $check(strpos($top, 'aria-current="page"') !== false, 'detail breadcrumb ends with the current record');
    $check(strpos($top, 'data-fides-ds-back="wallet"') !== false && strpos($top, 'fides-ds-detail-top__back') !== false, 'Back to results is a separate action with its return hook');
    $check(strpos($top, '<span hidden data-fides-ds-back-return>Back to results</span>') !== false, 'the return wording is a hidden, translatable text next to the back link');
    $check(strpos(Fides_DS_Detail_Top::render(array('back_url' => 'https://example.test/', 'back_label' => 'Back')), 'data-fides-ds-back-return') === false, 'a plain back link has no return text');
    $check(strpos($top, '<nav class="fides-ph__crumbs fides-ds-detail-top__crumbs"') !== false, 'breadcrumb keeps the legacy detail-top hook class');
    $legacy = Fides_DS_Detail_Top::render(array('back_url' => 'https://example.test/', 'back_label' => 'Back', 'crumbs' => array(array('Explorer', 'https://example.test/'), array('Organizations', 'https://example.test/o/'))));
    $check(strpos($legacy, 'fides-ph__crumbs') === false && strpos($legacy, 'fides-ds-detail-top--header') === false, 'other detail pages keep the legacy breadcrumb until they migrate');
}

echo 'page header behaviour: ' . $results['pass'] . ' passed, ' . count($results['fail']) . " failed\n";
foreach ($results['fail'] as $message) {
    echo '  FAIL: ' . $message . "\n";
}
exit(count($results['fail']) ? 1 : 0);
