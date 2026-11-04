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
$check(substr_count($html, 'fides-home-routes__item') === 3, 'three routes');
$check(strpos($html, 'Where would you like to start?') !== false, 'routes heading');
$check(strpos($html, home_url('/fides-design-pilot/start/')) !== false, 'starting point route links to the pilot start page');
$check(strpos($html, home_url('/fides-design-pilot/overview/')) !== false, 'use case route links to the pilot overview');
$check(strpos($html, 'Find integration help') === false && strpos($html, 'Connect your organization') !== false, 'route without an existing destination has no action (no dead link)');
$check(substr_count($html, '<a ') === 2, 'only routes with a destination are links');
foreach (array('includes/class-fides-ds-home.php', 'assets/home.css') as $rel) {
    $src = (string) file_get_contents(dirname(dirname(dirname(__DIR__))) . '/../fides-community-tools-tiles/' . $rel);
    $check($src !== '' && stripos($src, 'localhost') === false && stripos($src, '10088') === false, 'no hard-coded local host in ' . $rel);
}

add_filter('fides_site_shell_url', static function ($url, $path) {
    return $path === '/ecosystem-explorer/get-help-choosing/' ? home_url('/help-here/') : $url;
}, 20, 2);
$mapped = Fides_DS_Home::routes();
$check(strpos($mapped, 'href="' . home_url('/help-here/') . '"') !== false && strpos($mapped, 'Find integration help') !== false, 'a site that maps the destination gets the action');

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
$check(strpos($html, 'Organization news · Alpha Labs') !== false, 'organization shown in the kicker');
$check(strpos($html, 'fides-home-news__source">press.example<') !== false && strpos($html, 'Organization news · Alpha Labs') !== false, 'publication source apart from the organization when they differ');
$check(strpos($html, 'fides-home-news__source">alpha.example<') !== false, 'publication source shown for the organization\'s own site');
$check(strpos($html, 'fides-home-news__source">FIDES<') !== false, 'own post source is FIDES');
$check(strpos($html, '(opens the original post on press.example)') !== false, 'link name says where the original post is published');
$check(strpos($html, 'Read at source ↗') !== false && strpos($html, 'Read the update →') !== false, 'action hints per kind');
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

echo 'home behaviour: ' . $results['pass'] . ' passed, ' . count($results['fail']) . " failed\n";
foreach ($results['fail'] as $message) {
    echo '  FAIL: ' . $message . "\n";
}
exit(count($results['fail']) ? 1 : 0);
