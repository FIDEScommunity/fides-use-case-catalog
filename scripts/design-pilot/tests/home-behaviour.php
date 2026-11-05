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
$check(preg_match('#fides-home-news__source"><span class="fides-home-news__part">Alpha Labs[^<]*<span aria-hidden="true"> ·</span></span> </span><time class="fides-home-news__part" datetime="2026-10-20">20 Oct 2026</time>#', $html) === 1, 'organization and date together in one line above the title');
$check(preg_match('#fides-home-news__meta.*?fides-home-news__title#s', $html) === 1 && strpos($html, 'fides-home-news__kicker') === false && strpos($html, 'fides-home-news__foot') === false && strpos($html, 'fides-home-news__action') === false, 'no separate action row');
$check(strpos($html, 'fides-home-news__source"><span class="fides-home-news__part">FIDES<span aria-hidden="true"> ·</span></span>') !== false, 'own post source is FIDES');
$check(strpos($html, 'via press.example') !== false || strpos($html, 'fides-home-news__part">Alpha Labs') !== false, 'source line names the organization');
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
$check(strpos($themes_html, 'Digital trust in practice') !== false && strpos($themes_html, '>As AI makes it easier to create and share information, it matters more that we can verify where it comes from.</p>') !== false && strpos($themes_html, 'Explore use cases by theme') === false, 'index heading and subline');
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

// ---- Readiness block (Paper 25.16, editorial timeline). Content comes from option fides_ds_home_readiness over defaults.
$ready_saved = get_option('fides_ds_home_readiness', null);
delete_option('fides_ds_home_readiness');
$ready = Fides_DS_Home::readiness();
$check(substr_count($ready, 'data-readiness=') === 2, 'readiness block has two action rows');
$check(strpos($ready, 'EUDI Wallet: what is changing?') !== false && strpos($ready, 'European Digital Identity Wallet (EUDI Wallet)') !== false, 'readiness block shows the heading and an introduction that spells out the wallet');
$check(substr_count($ready, 'fides-home-readiness__point') === 2 && strpos($ready, 'End 2026') !== false && strpos($ready, 'Wallet availability') !== false && strpos($ready, 'End 2027') !== false && strpos($ready, 'Wallet acceptance') !== false, 'default timeline has the two EUDI milestones');
$check(strpos($ready, 'Certain private service providers must accept EUDI Wallets for online identification when requested by users.') !== false && preg_match('/<p class="fides-home-readiness__intro">[^<.]*(\([^)]*\))?[^<.]*\.<\/p>/', $ready) === 1, 'acceptance wording is the agreed text and the intro is one sentence');
$check(stripos($ready, 'countdown') === false && stripos($ready, 'days left') === false, 'readiness block has no countdown');
$check(strpos($ready, 'fides-home-readiness__source-link') === false && strpos($ready, 'Source:') === false, 'the block shows no source lines');
$srcs = do_shortcode('[fides_home_readiness_sources]');
$check(strpos($srcs, 'https://commission.europa.eu/') !== false && strpos($srcs, 'https://eur-lex.europa.eu/') !== false && strpos($srcs, 'End 2026') !== false && strpos($srcs, 'Regulation 910/2014, Art. 5f') !== false, 'sources stay in the editorial data and the Learn shortcode lists them');
$check(substr_count($ready, 'data-link-pending=') === 2 && strpos($ready, 'fides-home-readiness__business-link') === false && strpos($ready, 'fides-home-readiness__explain-link') === false && substr_count($ready, '(link coming soon)') === 2 && strpos(wp_strip_all_tags($ready), 'obligations and exceptions') !== false && strpos(wp_strip_all_tags($ready), 'explore European Business Wallets') !== false, 'without fitting Learn content both links are temporary placeholders without destination');
$check(stripos(implode(' ', array_map(function ($p) { return $p['title'] . ' ' . $p['text']; }, Fides_DS_Home::readiness_config()['points'])), 'business wallet') === false, 'EUDI milestones are not presented as business wallet deadlines');
$ready_links = Fides_DS_Home::readiness_links();
$check(count($ready_links) === 2 && $ready_links[0]['key'] === 'sessions' && strpos($ready_links[0]['url'], 'wallet-readiness-workshop') !== false && $ready_links[1]['key'] === 'topics', 'actions go to the existing workshop offering and the topics overview');

// Editor content: saved through the settings sanitizer, then rendered.
$saved = Fides_DS_Home::sanitize_readiness(array(
    'heading' => '  Custom <b>heading</b> ', 'intro' => "Short intro.\n<script>x</script>",
    'points' => array(
        array('when' => 'Status: draft', 'title' => 'One', 'text' => 'First.', 'source_label' => 'Source one', 'source_url' => 'https://example.org/a'),
        array('when' => '', 'title' => '', 'text' => 'No title, left out.'),
        array('when' => 'End 2030', 'title' => 'Two', 'text' => 'Second.', 'source_url' => 'javascript:alert(1)'),
        array('when' => 'x', 'title' => 'Three', 'text' => 'Third.'),
        array('when' => 'x', 'title' => 'Four', 'text' => 'Over the limit.'),
    ),
    'business_label' => 'For organisations: explore European Business Wallets', 'business_target' => '/fides-design-pilot/learn/topics/for-businesses/', 'explain_label' => 'Understand the EUDI obligations and exceptions', 'explain_target' => '/fides-design-pilot/learn/topics/',
));
$check(count($saved['points']) === 3 && $saved['points'][1]['title'] === 'Two' && $saved['points'][2]['title'] === 'Three', 'sanitizer keeps at most three milestones and drops those without a title');
$check($saved['points'][1]['source_url'] === '' && $saved['points'][0]['source_url'] === 'https://example.org/a', 'sanitizer refuses a non-http source URL');
$check(strpos($saved['intro'], '<script') === false && strpos($saved['heading'], '<b>') === false, 'sanitizer strips markup from heading and intro');
update_option('fides_ds_home_readiness', $saved);
$custom = Fides_DS_Home::readiness();
$check(strpos($custom, 'Custom heading') !== false && strpos($custom, 'Status: draft') !== false && substr_count($custom, 'fides-home-readiness__point') === 3 && strpos($custom, 'Source one') === false && substr_count(do_shortcode('[fides_home_readiness_sources]'), '<li>') === 1, 'saved content replaces the defaults; the sources list only has milestones with a valid source');
$check(strpos($custom, 'fides-home-readiness__business-link') !== false && strpos($custom, 'href="' . home_url('/fides-design-pilot/learn/topics/for-businesses/') . '"') !== false && strpos(wp_strip_all_tags($custom), 'explore European Business Wallets') !== false && strpos($custom, 'fides-home-readiness__explain-link') !== false && strpos(wp_strip_all_tags($custom), 'obligations and exceptions') !== false, 'explanation and business link show for an existing published page');
update_option('fides_ds_home_readiness', array_merge($saved, array('business_target' => '/no-such-page-here/')));
$check(($t = Fides_DS_Home::readiness()) && strpos($t, 'fides-home-readiness__business-link') === false && strpos($t, 'data-link-pending="business"') !== false, 'a target page that does not exist leaves the business link as a placeholder');
update_option('fides_ds_home_readiness', array_merge($saved, array('business_target' => 'https://example.org/ebw', 'points' => array())));
$ext = Fides_DS_Home::readiness();
$check(strpos($ext, 'href="https://example.org/ebw"') !== false && strpos($ext, 'fides-home-readiness__timeline') === false, 'external https target works; an emptied milestone list shows no timeline');
update_option('fides_ds_home_readiness', array_merge($saved, array('heading' => '')));
$check(strpos(Fides_DS_Home::readiness(), 'EUDI Wallet: what is changing?') !== false, 'an empty heading falls back to the default');
add_filter('fides_home_readiness_links', '__return_empty_array');
$none = Fides_DS_Home::readiness();
$check(strpos($none, 'fides-home-readiness__list') === false && strpos($none, 'What does this mean for your organisation?') !== false, 'rows without a destination are left out, the text stays');
remove_filter('fides_home_readiness_links', '__return_empty_array');
if ($ready_saved === null) {
    delete_option('fides_ds_home_readiness');
} else {
    update_option('fides_ds_home_readiness', $ready_saved);
}

echo 'home behaviour: ' . $results['pass'] . ' passed, ' . count($results['fail']) . " failed\n";
foreach ($results['fail'] as $message) {
    echo '  FAIL: ' . $message . "\n";
}
exit(count($results['fail']) ? 1 : 0);
