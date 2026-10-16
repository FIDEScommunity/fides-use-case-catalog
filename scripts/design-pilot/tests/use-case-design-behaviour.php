<?php
/**
 * Behaviour tests for the design-pilot use-case classes (detail page,
 * homepage feature, shared card mapping). Runs inside WordPress with fixed
 * fixtures; nothing is written to the database.
 *
 * Run: scripts/design-pilot/run-tests.sh
 */

if (! defined('ABSPATH')) {
    exit(1);
}

require_once ABSPATH . 'wp-admin/includes/template.php';

const UC_ALPHA = 'pilot-test-alpha-AAAAAA';
const UC_BETA  = 'pilot-test-beta-BBBBBB';
const UC_GONE  = 'pilot-test-gone-ZZZZZZ';
const DETAIL_BASE = 'http://localhost/pilot/detail/';

$results = array('pass' => 0, 'fail' => array());

$check = static function (bool $ok, string $message) use (&$results): void {
    if ($ok) {
        $results['pass']++;
    } else {
        $results['fail'][] = $message;
    }
};

$fixture_items = array(
    array(
        'id'                   => UC_ALPHA,
        'title'                => 'Alpha use case',
        'organizationName'     => 'Org Alpha',
        'sector'               => 'digital',
        'country'              => 'NL',
        'themes'               => array('identity'),
        'productionDeployment' => 'yes',
        'updatedAt'            => '2026-09-21T10:00:00Z',
        'summary'              => 'Alpha summary.',
        'links'                => array(
            'credentials' => array(
                array('refId' => 'cred:alias:one', 'labelRaw' => 'Alias credential', 'source' => 'catalog'),
                array('refId' => null, 'labelRaw' => 'Seal credential', 'url' => 'urn:test:seal:1', 'source' => 'manual'),
                array('refId' => null, 'labelRaw' => '', 'url' => 'urn:test:bare:2', 'source' => 'manual'),
                array('refId' => null, 'labelRaw' => 'Web credential', 'url' => 'https://example.org/credential', 'source' => 'manual'),
            ),
            // Issuer 2 is listed twice (as in some source data) and must count once.
            'issuers'     => array_map(
                static function (int $n): array {
                    return array('refId' => null, 'labelRaw' => 'Issuer ' . $n, 'source' => 'manual');
                },
                array(1, 2, 2, 3, 4, 5, 6, 7, 8)
            ),
            'organizations' => array(
                array('refId' => null, 'labelRaw' => 'Issuer 1', 'source' => 'manual'),
            ),
        ),
    ),
    array(
        'id'                   => UC_BETA,
        'title'                => 'Beta use case',
        'organizationName'     => 'Org Beta',
        'sector'               => 'digital',
        'country'              => 'BE',
        'themes'               => array('identity'),
        'productionDeployment' => 'no',
        'updatedAt'            => '2026-08-01T10:00:00Z',
        'summary'              => 'Beta summary.',
    ),
);

$fixture_credentials = array(
    array(
        'id'       => 'cred:canonical:one',
        'aliasIds' => array('cred:alias:one'),
        'formats'  => array(array('credentialId' => 'cred:format:one')),
    ),
);

$selection = array('primary' => UC_ALPHA, 'fallback' => UC_BETA);

add_filter('fides_use_case_design_items', static function () use ($fixture_items) {
    return $fixture_items;
}, PHP_INT_MAX);
add_filter('fides_use_case_design_credentials', static function () use ($fixture_credentials) {
    return $fixture_credentials;
}, PHP_INT_MAX);
add_filter('pre_option_' . Fides_Use_Case_Featured::OPTION, static function () use (&$selection) {
    return $selection;
}, PHP_INT_MAX);
add_filter('rest_pre_dispatch', static function ($result, $server, WP_REST_Request $request) {
    $route = $request->get_route();
    if ($route === '/fides-catalog/v1/awards/gdt-2026') {
        return new WP_REST_Response(array(
            'ok'         => true,
            'program'    => 'gdt-2026',
            'label'      => 'Test Awards 2026',
            'url'        => 'https://example.org/awards/',
            'year'       => 2026,
            'categories' => array(
                array('key' => 'impact', 'label' => 'Impact', 'finalists' => array(
                    array('type' => 'usecase', 'id' => UC_ALPHA, 'place' => null),
                    array('type' => 'usecase', 'id' => UC_BETA, 'place' => 1),
                    array('type' => 'wallet', 'id' => UC_ALPHA, 'place' => 1),
                )),
            ),
        ), 200);
    }
    if (strpos($route, '/fides-catalog/v1/awards/') === 0) {
        return new WP_REST_Response(array('ok' => false), 200);
    }
    if ($route === '/fides-catalog/v1/ratings/batch') {
        $likes = array(UC_ALPHA => 3, UC_BETA => 0);
        $out   = array();
        foreach (explode(',', (string) $request->get_param('ids')) as $id) {
            $out[$id] = array('likes' => $likes[$id] ?? 0, 'count' => 0, 'my_like' => null);
        }
        return new WP_REST_Response(array('ok' => true, 'results' => $out), 200);
    }
    return $result;
}, 10, 3);

Fides_Use_Case_Design::flush_cache();
wp_set_current_user(0);
unset($_GET['usecase']);

// Credential aliases resolve to the canonical credential-catalog id.
$check(Fides_Use_Case_Design::credential_canonical_id('cred:alias:one') === 'cred:canonical:one', 'alias id resolves to canonical id');
$check(Fides_Use_Case_Design::credential_canonical_id('cred:format:one') === 'cred:canonical:one', 'format credentialId resolves to canonical id');
$check(Fides_Use_Case_Design::credential_canonical_id('cred:unknown') === 'cred:unknown', 'unknown credential id passes through');

// Detail page: identifiers, aliases, awards, likes, one consistent route.
$html        = do_shortcode('[fides_use_case_detail id="' . UC_ALPHA . '" detail_url="' . DETAIL_BASE . '" listing_url="http://localhost/pilot/list/"]');
$alpha_url   = Fides_Use_Case_Design::detail_url(UC_ALPHA, DETAIL_BASE);
$beta_url    = Fides_Use_Case_Design::detail_url(UC_BETA, DETAIL_BASE);
$check(strpos($html, '<code class="fides-uc-relations__identifier">urn:test:seal:1</code>') !== false, 'URN shown as code next to its label');
$check(strpos($html, '<span class="fides-uc-relations__label">urn:test:bare:2</span>') !== false, 'URN without label becomes the label text');
$check(preg_match('/href="[^"]*urn:/', $html) === 0, 'URNs are never rendered as links');
$check(strpos($html, 'href="https://example.org/credential"') !== false, 'http(s) relation URL stays a link');
$check(strpos($html, '?credential=cred%3Acanonical%3Aone') !== false, 'credential alias links to the canonical credential record');
$check(strpos($html, 'cred%3Aalias%3Aone') === false, 'alias id is not used in credential links');
$check(strpos($html, 'data-fides-ds-copy="' . esc_attr($alpha_url) . '"') !== false, 'Copy link uses the detail route of the page');
$check(strpos($html, 'href="' . esc_url($beta_url) . '"') !== false, 'related card uses the same detail route');
$check(preg_match('#<h1 class="fides-ds-heading-1 fides-ds-heading-1--detail fides-uc-detail__title"#', $html) === 1, 'detail title uses the detail heading role');

// Connected ecosystem: role summary in the sidebar, full section before Video & links.
preg_match_all('#<div class="fides-uc-ecosystem-summary__role">\s*<dt>([^<]+)</dt>\s*<dd>(\d+)</dd>#', $html, $roles, PREG_SET_ORDER);
$summary = array();
foreach ($roles as $role) {
    $summary[$role[1]] = (int) $role[2];
}
$check($summary === array('Issuers' => 8, 'Credential types' => 4, 'Organizations' => 1), 'summary lists only roles with records, with their entry counts: ' . wp_json_encode($summary));
$check(strpos($html, 'One party can appear in more than one role.') !== false, 'summary says counts are entries per role, not unique parties');
$check(strpos($html, 'href="#ecosystem">View connected ecosystem') !== false, 'summary links to the full ecosystem section');
$aside_pos     = strpos($html, 'fides-uc-detail__aside');
$summary_pos   = strpos($html, 'fides-uc-ecosystem-summary');
$technical_pos = strpos($html, 'id="technical-details"');
$section_pos   = strpos($html, '<section class="fides-uc-ecosystem" id="ecosystem"');
$check($aside_pos < $summary_pos && ($technical_pos === false || $summary_pos < $technical_pos), 'summary sits in the sidebar before the technical details');
$check($section_pos !== false && $section_pos > strpos($html, 'id="overview"') && substr_count($html, 'id="ecosystem"') === 1, 'one full ecosystem section after the story');
$check(strpos($html, '<li><a href="#ecosystem">Ecosystem</a></li>') !== false, 'page navigation points at the full ecosystem section');
preg_match('#<section class="fides-uc-ecosystem".*?</section>#s', $html, $section);
$section = $section[0] ?? '';
$check(substr_count($section, 'class="fides-uc-relations__item"') === 13, 'full section lists every record (8 issuers, 4 credentials, 1 organization)');
$check(substr_count($section, '<details class="fides-uc-ecosystem__more">') === 1 && strpos($section, 'Show all 8') !== false, 'a long role group gets a Show all disclosure with its count');
$check(preg_match('#Show all 8.*?Issuer 7.*?Issuer 8#s', $section) === 1, 'records beyond the first six stay in the HTML inside the disclosure');
$check(substr_count($section, '>Issuer 2<') === 1, 'an identical record listed twice in one role is shown and counted once');
$check(preg_match('#<span class="fides-uc-relations__label">Issuer 1</span>#', $section) === 1 && substr_count($section, '>Issuer 1<') === 2, 'the same party can be listed under two roles');
$check(strpos($section, 'rel="noopener" target="_blank">Web credential') !== false, 'external relation stays an external link');
$check(strpos($section, '?credential=cred%3Acanonical%3Aone') !== false, 'catalog relation stays an internal catalog link');
$beta_html = do_shortcode('[fides_use_case_detail id="' . UC_BETA . '" detail_url="' . DETAIL_BASE . '"]');
$check(strpos($beta_html, 'fides-uc-ecosystem') === false && strpos($beta_html, 'href="#ecosystem"') === false, 'no ecosystem summary, section or navigation item without relations');
$check(strpos($html, 'fides-uc-detail__award">Finalist 2026<') !== false, 'award badge in header');
$check(strpos($html, 'Finalist 2026, Test Awards 2026 (Impact)') !== false, 'award listed in At a glance');
$check(strpos($html, '>3 likes<') !== false, 'like count in header');
$check(preg_match('#<details class="fides-ds-section-nav[^"]*" data-fides-ds-section-nav>\s*<summary>On this page#', $html) === 1, 'section navigation is a collapsible "On this page" disclosure');
$check(preg_match('#<nav aria-label="On this page">\s*<ul>\s*<li><a href="\#overview">Overview</a>#', $html) === 1, 'section navigation links to the page sections');
$check(preg_match('#<details[^>]*\sopen#', $html) === 0, 'section navigation is collapsed until the script opens it on desktop');

$missing = do_shortcode('[fides_use_case_detail id="' . UC_GONE . '"]');
$check(strpos($missing, 'This use case is not in the current FIDES catalog.') !== false, 'missing record shows the not-in-catalog state');

// ?usecase= selects the record and must be a valid, published id.
$_GET['usecase'] = UC_BETA;
$check(strpos(do_shortcode('[fides_use_case_detail id="' . UC_ALPHA . '" detail_url="' . DETAIL_BASE . '"]'), '>Beta use case</h1>') !== false, '?usecase= overrides the default record');
unset($_GET['usecase']);

// Canonical equals the Copy link URL for the record that is shown.
$post = new WP_Post((object) array(
    'ID'           => 0,
    'post_type'    => 'page',
    'post_content' => '[fides_use_case_detail id="' . UC_ALPHA . '" detail_url="' . DETAIL_BASE . '"]',
));
$check(Fides_Use_Case_Design::filter_canonical_url('http://localhost/original/', $post) === $alpha_url, 'canonical is the default record detail URL');
$_GET['usecase'] = UC_BETA;
$check(Fides_Use_Case_Design::filter_canonical_url('http://localhost/original/', $post) === $beta_url, 'canonical follows ?usecase=');
$_GET['usecase'] = UC_GONE;
$check(Fides_Use_Case_Design::filter_canonical_url('http://localhost/original/', $post) === 'http://localhost/original/', 'canonical unchanged for a record not in the catalog');
unset($_GET['usecase']);
$other = new WP_Post((object) array('ID' => 0, 'post_type' => 'page', 'post_content' => 'No shortcode here.'));
$check(Fides_Use_Case_Design::filter_canonical_url('http://localhost/original/', $other) === 'http://localhost/original/', 'canonical unchanged on other pages');
$check(strpos(Fides_Use_Case_Design::detail_url(UC_ALPHA, '/pilot/detail/'), home_url('/pilot/detail/')) === 0, 'relative detail base becomes absolute');

// Homepage feature: primary, fallback, nothing.
$resolved = Fides_Use_Case_Featured::resolve();
$check($resolved['used'] === UC_ALPHA && $resolved['skipped'] === array(), 'configured primary is used');
$selection = array('primary' => UC_GONE, 'fallback' => UC_BETA);
$resolved  = Fides_Use_Case_Featured::resolve();
$check($resolved['used'] === UC_BETA && $resolved['skipped'] === array(UC_GONE), 'missing primary falls back and is reported as skipped');
$check(Fides_Use_Case_Featured::resolve(UC_ALPHA)['used'] === UC_ALPHA, 'shortcode id overrides the setting');
$feature = do_shortcode('[fides_use_case_featured detail_url="' . DETAIL_BASE . '"]');
$check(strpos($feature, 'data-fides-featured-source="' . UC_BETA . '"') !== false, 'featured shortcode renders the fallback');
$check(strpos($feature, 'fides-ds-card__meta">Winner 2026<') !== false, 'featured card shows the award');
$check(strpos($feature, 'href="' . esc_url($beta_url) . '"') !== false, 'featured card links to the detail route');
$selection = array('primary' => UC_GONE, 'fallback' => '');
$check(do_shortcode('[fides_use_case_featured]') === '', 'no published selection renders nothing for visitors');
$admins = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ID'));
if ($admins) {
    wp_set_current_user((int) $admins[0]);
    $check(strpos(do_shortcode('[fides_use_case_featured]'), '<!-- fides_use_case_featured:') === 0, 'no published selection leaves an HTML comment for admins');
    wp_set_current_user(0);
}

// Settings sanitize: malformed ids are cleared, unknown ids are kept with a warning.
$codes = static function (): array {
    return wp_list_pluck(get_settings_errors(Fides_Use_Case_Featured::OPTION), 'type', 'code');
};
$GLOBALS['wp_settings_errors'] = array();
$clean = Fides_Use_Case_Featured::sanitize(array('primary' => 'not a valid id!', 'fallback' => UC_BETA));
$check($clean === array('primary' => '', 'fallback' => UC_BETA), 'malformed id is cleared');
$check(($codes()['invalid-primary'] ?? '') === 'error', 'malformed id reports an error');
$GLOBALS['wp_settings_errors'] = array();
$clean = Fides_Use_Case_Featured::sanitize(array('primary' => UC_GONE, 'fallback' => UC_BETA));
$check($clean['primary'] === UC_GONE, 'well-formed id not in the catalog is kept');
$check(($codes()['missing-primary'] ?? '') === 'warning', 'id not in the catalog reports a warning');
$GLOBALS['wp_settings_errors'] = array();
Fides_Use_Case_Featured::sanitize(array('primary' => UC_ALPHA, 'fallback' => UC_BETA));
$check($codes() === array(), 'published ids save without messages');
$GLOBALS['wp_settings_errors'] = array();

// Card meta mirrors pilotEngagementMeta() in the listing.
$check(Fides_Use_Case_Design::card_props($fixture_items[0], 'row')['meta'] === 'Updated 21 Sep 2026 · Finalist 2026 · 3 likes', 'row meta: date, award, likes');
$check(Fides_Use_Case_Design::card_props($fixture_items[1], 'row')['meta'] === 'Updated 1 Aug 2026 · Winner 2026', 'row meta without likes');

Fides_Use_Case_Design::flush_cache();

foreach ($results['fail'] as $message) {
    echo "not ok - {$message}\n";
}
printf("# pass %d\n# fail %d\n", $results['pass'], count($results['fail']));
if ($results['fail']) {
    exit(1);
}
