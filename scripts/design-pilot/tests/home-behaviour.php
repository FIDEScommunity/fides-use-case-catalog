<?php
/**
 * Behaviour tests for the homepage blocks (routes, latest updates).
 * Data comes from the same collector as the Updates page; fixtures are
 * injected through filters and nothing is written.
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

// ---- Routes
$html = Fides_DS_Home::routes();
$check(substr_count($html, 'fides-home-routes__item') === 2, 'two routes while the third has no destination');
$check(strpos($html, 'fides-home-routes__list--2') !== false, 'two-column modifier');
$check(strpos($html, 'Where would you like to start?') !== false, 'routes heading');
$check(strpos($html, home_url('/fides-design-pilot/start/')) !== false, 'starting point route links to the pilot start page');
$check(strpos($html, home_url('/fides-design-pilot/overview/')) !== false, 'use case route links to the pilot overview');
$check(strpos($html, 'Find integration help') === false && strpos($html, 'Connect your organization') === false, 'route without an existing destination is hidden');
$check(substr_count($html, '<a ') === 2 && substr_count($html, 'fides-home-routes__action') === 2, 'every visible route is a link');
foreach (array('includes/class-fides-ds-home.php', 'assets/home.css') as $rel) {
    $src = (string) file_get_contents(dirname(dirname(dirname(__DIR__))) . '/../fides-community-tools-tiles/' . $rel);
    $check($src !== '' && stripos($src, 'localhost') === false && stripos($src, '10088') === false, 'no hard-coded local host in ' . $rel);
}

add_filter('fides_site_shell_url', static function ($url, $path) {
    return $path === '/ecosystem-explorer/get-help-choosing/' ? home_url('/help-here/') : $url;
}, 20, 2);
$mapped = Fides_DS_Home::routes();
$check(strpos($mapped, 'href="' . home_url('/help-here/') . '"') !== false && strpos($mapped, 'Find integration help') !== false, 'a site that maps the destination gets the route');
$check(substr_count($mapped, 'fides-home-routes__item') === 3 && strpos($mapped, 'fides-home-routes__list--3') !== false, 'three routes once all destinations exist');

// ---- Latest from the ecosystem
$own = array(
    array('id' => 'post:1', 'group' => 'fides', 'title' => 'FIDES <b>news</b> item', 'timestamp' => strtotime('2026-10-23 12:00:00 UTC'), 'url' => home_url('/fides-article/'), 'external' => false, 'source_name' => 'FIDES', 'publisher' => '', 'publisher_apart' => false, 'org_id' => '', 'image_url' => '', 'programme' => '', 'intro' => ''),
);
$feed = array('organizations' => array(
    'org:alpha' => array('items' => array(
        array('title' => 'Alpha ships a new wallet release with a very long title that keeps going and going to check wrapping and clamping behaviour', 'url' => 'https://alpha.example/news/1', 'publishedAt' => '2026-10-20', 'sourceLabel' => 'alpha.example'),
        array('title' => 'Press about Alpha', 'url' => 'https://press.example/alpha', 'publishedAt' => '2026-10-10', 'sourceLabel' => 'press.example'),
        array('title' => 'Older Alpha note', 'url' => 'https://alpha.example/news/0', 'publishedAt' => '2026-09-01', 'sourceLabel' => 'alpha.example'),
    )),
));
add_filter('fides_updates_feed', static function () use (&$feed) { return $feed; });
add_filter('fides_updates_organizations', static function () {
    return array('org:alpha' => array('name' => 'Alpha Labs', 'logo' => '', 'website' => 'https://alpha.example'));
});
add_filter('fides_updates_own_items', static function () use (&$own) { return $own; });

$html = Fides_DS_Home::updates();
$check(substr_count($html, 'fides-home-news__item') === 3, 'default shows three items (got ' . substr_count($html, 'fides-home-news__item') . ')');
$check(strpos($html, 'Latest from the ecosystem') !== false, 'heading');
$check(strpos($html, 'href="' . Fides_DS_Updates::listing_url() . '"') !== false || strpos($html, 'All updates') !== false, 'link to the full overview');
$positions = array(strpos($html, 'FIDES &lt;b&gt;news'), strpos($html, 'Alpha ships'), strpos($html, 'Press about Alpha'));
$check($positions[0] !== false && $positions[0] < $positions[1] && $positions[1] < $positions[2], 'newest first, from the same collector as Updates');
$check(strpos($html, 'Older Alpha note') === false, 'limit is respected');
$check(strpos($html, '<b>news</b>') === false, 'titles are escaped');
$check(strpos($html, 'href="https://alpha.example/news/1"') !== false, 'external post links to the original publication');
$check(strpos($html, 'href="' . home_url('/fides-article/') . '"') !== false, 'own post links to the FIDES article');
$check(preg_match('#fides-home-news__source">Alpha Labs[^<]*</span><span aria-hidden="true"> · </span><time datetime="2026-10-20">20 Oct 2026</time>#', $html) === 1, 'organization and date together in one line above the title');
$check(preg_match('#fides-home-news__meta.*?fides-home-news__title#s', $html) === 1 && strpos($html, 'fides-home-news__kicker') === false && strpos($html, 'fides-home-news__foot') === false && strpos($html, 'fides-home-news__action') === false, 'no separate action row');
$check(strpos($html, 'fides-home-news__source">FIDES</span>') !== false, 'own post source is FIDES');
$check(strpos($html, 'via press.example') !== false || strpos($html, 'fides-home-news__source">Alpha Labs') !== false, 'source line names the organization');
$check(strpos($html, 'aria-label="Alpha ships') !== false && strpos($html, '(external site: ') !== false && substr_count($html, 'fides-home-news__external') === 2, 'external links are marked visibly and for screen readers');
$check(preg_match('#<h3 class="fides-home-news__title"><a class="fides-home-news__link" href="' . preg_quote(home_url('/fides-article/'), '#') . '">FIDES &lt;b&gt;news&lt;/b&gt; item</a></h3>#', $html) === 1, 'own title is the link and has no external marker');
$check(strpos($html, '23 Oct 2026') !== false && strpos($html, 'datetime="2026-10-23"') !== false, 'date shown and machine readable');
$check(substr_count($html, '<a ') === 4, 'one link per item plus the overview link');

$check(substr_count(Fides_DS_Home::updates(array('limit' => '2')), 'fides-home-news__item') === 2, 'limit attribute');
add_filter('fides_home_updates_limit', static function () { return 1; });
$check(substr_count(Fides_DS_Home::updates(), 'fides-home-news__item') === 1, 'limit filter');
remove_all_filters('fides_home_updates_limit');

// Empty and failed states.
$own  = array();
$feed = array('organizations' => array());
$html = Fides_DS_Home::updates();
$check(strpos($html, 'There are no updates to show right now.') !== false && strpos($html, 'fides-home-news__list') === false, 'empty state');
$check(strpos($html, 'Latest from the ecosystem') !== false && strpos($html, 'All updates') !== false, 'heading and overview link stay in the empty state');
remove_all_filters('fides_updates_feed');
add_filter('fides_updates_feed', '__return_false');
$own  = array(array_merge(array('id' => 'post:2', 'group' => 'fides', 'title' => 'Only own', 'timestamp' => strtotime('2026-10-01 12:00:00 UTC'), 'url' => home_url('/o/'), 'external' => false, 'source_name' => 'FIDES', 'publisher' => '', 'publisher_apart' => false, 'org_id' => '', 'image_url' => '', 'programme' => '', 'intro' => '')));
$html = Fides_DS_Home::updates();
$check(substr_count($html, 'fides-home-news__item') === 1 && strpos($html, 'Only own') !== false, 'failed feed still shows own posts');
$own = array(array_merge($own[0], array('title' => '')));

// ---- Digital trust in practice (use case plugin, layout="index")
$themes_html = do_shortcode('[fides_use_case_discovery layout="index"]');
$cfg   = Fides_Use_Case_Discovery_Shortcode::theme_config();
$check(substr_count($themes_html, 'fides-uc-index__row') === count($cfg['bundles']) && count($cfg['bundles']) > 0, 'one row per existing theme bundle');
$check(strpos($themes_html, 'Digital trust in practice') !== false && strpos($themes_html, 'Explore use cases by theme') !== false, 'index heading and subline');
$check(strpos($themes_html, 'fides-uc-index__num') === false && substr_count($themes_html, '<svg') === count($cfg['bundles']), 'no sequence numbers, one line icon per theme');
$check(strpos($themes_html, 'Browse all use cases') !== false && strpos($themes_html, 'fides-uc-index__catalogs') === false && strpos($themes_html, 'Personal wallets') === false, 'Browse all use cases replaces the catalog links');
foreach ($cfg['bundles'] as $b) {
    $check(strpos($themes_html, 'theme=' . $b['code']) !== false && strpos($themes_html, home_url('/fides-design-pilot/overview/')) !== false, 'row links to the overview with theme filter ' . $b['code']);
}
$fixture = array(
    array('id' => 'a', 'themes' => array('person_identity', 'payments')),
    array('id' => 'b', 'themes' => array('person_identity')),
    array('id' => 'c', 'themes' => array('dataspaces', 'trade_documents')),
);
add_filter('fides_use_case_discovery_items', static function () use ($fixture) { return $fixture; });
$themes_html = do_shortcode('[fides_use_case_discovery layout="index"]');
$check(strpos($themes_html, 'data-fides-uc-index-total="3"') !== false, 'total counts use cases, not theme memberships');
$check(preg_match('#data-theme="identity_access".*?data-count="2"#s', $themes_html) === 1, 'identity count from the fixture');
$check(preg_match('#data-theme="products_trade_supply_chains".*?data-count="1"#s', $themes_html) === 1, 'a use case in two themes of one bundle counts once');
$check(preg_match_all('#data-count="(\d+)"#', $themes_html, $m) && array_sum($m[1]) - 3 === 4 && array_sum($m[1]) - 3 > 3, 'theme rows (4) add up to more than the total (3) because a use case can sit in several themes');
remove_all_filters('fides_use_case_discovery_items');
add_filter('fides_use_case_discovery_items', '__return_empty_array');
$themes_html = do_shortcode('[fides_use_case_discovery layout="index"]');
$check(strpos($themes_html, 'not available right now') !== false && strpos($themes_html, 'fides-uc-index__row') === false && strpos($themes_html, 'data-fides-uc-index-total') === false, 'unavailable data: clean state without counts or rows');
$check(strpos($themes_html, 'Browse all use cases') !== false && strpos($themes_html, 'Digital trust in practice') !== false, 'unavailable data keeps heading and a link to the overview');
remove_all_filters('fides_use_case_discovery_items');
$src = (string) file_get_contents(dirname(dirname(dirname(__DIR__))) . '/wordpress-plugin/fides-use-case-catalog/includes/class-fides-use-case-discovery-shortcode.php');
$check(strpos($src, 'localhost') === false && strpos($src, '10088') === false, 'no hard-coded local host in the discovery shortcode');

// ---- Counter markup: real values in the page, animated figure hidden from assistive technology
remove_all_filters('fides_use_case_discovery_items');
$idx = do_shortcode('[fides_use_case_discovery layout="index"]');
$check(preg_match_all('#fides-ct-count[^>]*aria-hidden="true"[^>]*data-count="(\d+)"[^>]*>(\d+)</span>#', $idx, $m) && count($m[1]) === count($cfg['bundles']) + 1 && $m[1] === $m[2], 'every counted figure shows its real value in the markup');
$check(strpos($idx, 'data-count-duration="3000"') !== false && preg_match('#fides-ds-visually-hidden">\d+</span> use cases#', $idx) === 1, '3 s run, final total stays readable');
$check(preg_match_all('#aria-label="[^"]+, \d+ use cases?"#', $idx) === count($cfg['bundles']), 'each theme link keeps its final count in its accessible name');

// ---- Spotlight (Bosch demo use case)
$bosch = 'end-to-end-digital-business-workflows-transforming-kyb-kyc-kys-via-eu-business-wallet-F665Dh';
$spot  = do_shortcode('[fides_use_case_spotlight id="' . $bosch . '" detail_url="/fides-design-pilot/use-case/"]');
$item  = Fides_Use_Case_Design::find($bosch);
$base  = home_url('/fides-design-pilot/use-case/?usecase=' . $bosch);
$check(strpos($spot, 'One use case. A connected ecosystem.') !== false && strpos($spot, 'Demo use case') !== false && strpos($spot, 'Not in production') !== false, 'spotlight heading, demo label and catalog status');
$check(strpos($spot, '>' . esc_html($item['title']) . '</h3>') !== false, 'title comes from the catalog record');
$check(strpos($spot, 'fides-uc-spot__intro') === false && strpos($spot, 'fides-uc-spot__preview') !== false, 'no separate editorial intro, a preview instead');
$pv = Fides_Use_Case_Spotlight::preview($item);
$check($pv !== '' && mb_strlen($pv) <= 201 && stripos($pv, 'use case:') !== 0 && strpos($item['summary'], preg_replace('/…$/u', '', $pv)) !== false, 'preview is a short, unmodified start of the catalog description');
$check(mb_substr($pv, -1) === '…' && strpos($spot, esc_html($pv)) !== false && strpos($spot, 'Read the use case') !== false, 'the cut preview ends with an ellipsis, with "Read the use case"');
$check(Fides_Use_Case_Spotlight::preview(array('summary' => 'One short line.')) === 'One short line.' && Fides_Use_Case_Spotlight::preview(array('summary' => "Use Case: First.\nMore.")) === 'First…', 'no ellipsis for a complete description, one for a continued one');
$check(strpos($spot, esc_url($base)) !== false && strpos($spot, 'fides-uc-spot__link--head') === false && strpos($spot, 'Explore the catalog') === false, 'one link to the use case page and no second catalog link');
$check(strpos($spot, 'src="' . esc_url(Fides_Use_Case_Design::image_url($item)) . '"') !== false, 'image comes from the catalog record');
$check(strpos($spot, 'fides-uc-spot__names') === false && strpos($spot, 'View all') === false && strpos($spot, '<li><a class="fides-uc-spot__relation"') !== false, 'compact relation links instead of name lists and View all');
$links = Fides_Use_Case_Spotlight::relation_links($item, '/u/');
$totals = array();
foreach ($links as $l) { $totals[$l['key']] = $l['total']; }
$check($totals === array('organizations' => 7, 'businessWallets' => 4, 'personalWallets' => 5, 'credentials' => 15, 'issuers' => 13, 'rps' => 17), 'one link per explicitly linked type with the totals the use case page lists');
$check(strpos($spot, '>Organizations</span> <data class="fides-uc-spot__count" value="7">7</data>') !== false && strpos($spot, '>Business wallets</span> <data class="fides-uc-spot__count" value="4">4</data>') !== false && strpos($spot, '>Relying parties</span> <data class="fides-uc-spot__count" value="17">17</data>') !== false, 'labels carry the counts');
$check(strpos($spot, esc_url($base . '#organisations')) !== false && strpos($spot, esc_url($base . '#ecosystem-businesswallets')) !== false && strpos($spot, esc_url($base . '#ecosystem-personalwallets')) !== false && strpos($spot, esc_url($base . '#ecosystem-credentials')) !== false && strpos($spot, esc_url($base . '#ecosystem-issuers')) !== false && strpos($spot, esc_url($base . '#ecosystem-rps')) !== false, 'each link points to its section');
$detail = do_shortcode('[fides_use_case_detail id="' . $bosch . '"]');
$ok = true;
foreach (array('organisations' => 7, 'ecosystem-businesswallets' => 4, 'ecosystem-personalwallets' => 5, 'ecosystem-credentials' => 15, 'ecosystem-issuers' => 13, 'ecosystem-rps' => 17) as $anchor => $n) {
    $ok = $ok && strpos($detail, 'id="' . $anchor . '"') !== false;
    $ok = $ok && (preg_match('#id="' . $anchor . '-title"[^>]*>[^<]*<span class="[^"]*count">' . $n . '<#', $detail) === 1 || preg_match('#id="' . $anchor . '-title"[^>]*>[^<]*<span class="[^"]*count">' . $n . '<#', str_replace("\n", '', $detail)) === 1);
}
$check($ok, 'the use case page has every target section with the same count');
$check(strpos(do_shortcode('[fides_use_case_spotlight id="does-not-exist"]'), 'fides-uc-spot__title') === false, 'unknown use case renders no block');
$noorg = $item; $noorg['links']['organizations'] = array(); $noorg['links']['rps'] = array();
$k = array_column(Fides_Use_Case_Spotlight::relation_links($noorg, '/u/'), 'key');
$check(! in_array('organizations', $k, true) && ! in_array('rps', $k, true) && $k[0] === 'businessWallets', 'empty types are left out');
$check(Fides_Use_Case_Spotlight::relation_links(array('id' => 'x', 'links' => array()), '/u/') === array(), 'no links, no relation row');
$check(strpos((string) file_get_contents(dirname(dirname(dirname(__DIR__))) . '/wordpress-plugin/fides-use-case-catalog/includes/class-fides-use-case-spotlight.php'), 'localhost') === false, 'no hard-coded local host in the spotlight');


echo 'home behaviour: ' . $results['pass'] . ' passed, ' . count($results['fail']) . " failed\n";
foreach ($results['fail'] as $message) {
    echo '  FAIL: ' . $message . "\n";
}
exit(count($results['fail']) ? 1 : 0);
