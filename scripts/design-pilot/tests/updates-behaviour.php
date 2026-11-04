<?php
/**
 * Behaviour tests for the Updates overview (collection, programme mapping,
 * search, type filter, sort, pages, empty and failed feed, article intro rule).
 * Fixtures are injected through filters; the two temporary posts are removed
 * again at the end.
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

$feed = array(
    'organizations' => array(
        'org:alpha' => array('items' => array(
            array('title' => 'Alpha ships Wallet 2', 'url' => 'https://alpha.example/news/wallet-2', 'publishedAt' => '2026-10-20', 'sourceLabel' => 'alpha.example'),
            array('title' => 'Café opening notes', 'url' => 'https://alpha.example/news/cafe', 'publishedAt' => '2026-10-01', 'sourceLabel' => 'alpha.example'),
            array('title' => 'Duplicate', 'url' => 'https://alpha.example/news/wallet-2', 'publishedAt' => '2026-10-19', 'sourceLabel' => 'alpha.example'),
            array('title' => 'Anchor only', 'url' => '#row-3', 'publishedAt' => '2026-10-02', 'sourceLabel' => 'alpha.example'),
            array('title' => '', 'url' => 'https://alpha.example/news/empty', 'publishedAt' => '2026-10-02'),
            array('title' => 'Bad date', 'url' => 'https://alpha.example/news/bad', 'publishedAt' => 'soon'),
            array('title' => 'Blog on a subdomain', 'url' => 'https://blog.alpha.example/post', 'publishedAt' => '2026-09-30', 'sourceLabel' => 'blog.alpha.example'),
            array('title' => 'Alpha release v1', 'url' => 'https://github.com/alpha/app/releases/tag/v1', 'publishedAt' => '2026-09-29', 'sourceLabel' => 'GitHub', 'sourceKind' => 'github_release'),
            array('title' => 'Script link', 'url' => 'javascript:alert(1)', 'publishedAt' => '2026-10-02'),
        )),
        // The programme link comes from the setting, not from the post title.
        'org:beta'  => array(
            array('title' => 'EUDI wallet programme: new release', 'url' => 'https://www.beta.example/news/a', 'publishedAt' => '2026-10-15', 'sourceLabel' => 'beta.example'),
            array('title' => 'Press coverage of Beta and the EUDI wallet programme', 'url' => 'https://news.example/beta-eudi', 'publishedAt' => '2026-10-14', 'sourceLabel' => 'news.example'),
            array('title' => 'Beta code release', 'url' => 'https://github.com/beta/app/releases/tag/v2', 'publishedAt' => '2026-10-13', 'sourceLabel' => 'GitHub', 'sourceKind' => 'github_release'),
        ),
        'org:gamma' => array(
            array('title' => 'Programme news from Gamma', 'url' => 'https://gamma.example/a', 'publishedAt' => '2026-09-15', 'sourceLabel' => 'gamma.example'),
        ),
    ),
);
$orgs = array(
    'org:alpha' => array('name' => 'Alpha Labs', 'logo' => 'https://alpha.example/logo.png', 'website' => 'https://www.alpha.example/'),
    'org:beta'  => array('name' => 'Beta Foundation', 'logo' => '', 'website' => 'https://beta.example'),
);
$settings = array('programmes' => array('org:beta' => array('label' => 'EUDI Wallet', 'hosts' => array('beta.example')), 'org:gamma' => 'Gamma programme'), 'hidden_urls' => array('https://gamma.example/a'), 'listing_path' => '/updates/', 'article_template' => true);

$feed_filter = static function () use (&$feed) { return $feed; };
add_filter('fides_updates_feed', $feed_filter);
add_filter('fides_updates_organizations', static function () use ($orgs) { return $orgs; });
add_filter('pre_option_' . Fides_DS_Updates::OPTION, static function () use (&$settings) { return $settings; });
add_filter('fides_updates_per_page', static function () { return 3; });

$ext = Fides_DS_Updates::external_items();
$by_url = array();
foreach ($ext['items'] as $item) {
    $by_url[$item['url']] = $item;
}
$check($ext['external_ok'] === true, 'external feed is reported as available');
$check(count($ext['items']) === 7, 'invalid, duplicate, anchor and hidden entries are dropped (got ' . count($ext['items']) . ')');
$check(isset($by_url['https://alpha.example/news/wallet-2']) && $by_url['https://alpha.example/news/wallet-2']['title'] === 'Alpha ships Wallet 2', 'first of duplicate URLs wins');
$check(! isset($by_url['https://gamma.example/a']), 'hidden URL is left out');
$check($by_url['https://alpha.example/news/wallet-2']['group'] === 'organization', 'unmapped organization post is organization news');
$check($by_url['https://www.beta.example/news/a']['group'] === 'programme' && $by_url['https://www.beta.example/news/a']['programme'] === 'EUDI Wallet', 'mapped organization post is a programme update');
$check($by_url['https://alpha.example/news/wallet-2']['external'] === true, 'external flag set');
$check($by_url['https://alpha.example/news/wallet-2']['source_name'] === 'Alpha Labs', 'organization name used as source');
$check($by_url['https://alpha.example/news/wallet-2']['image_url'] === 'https://alpha.example/logo.png', 'organization logo used as image');
$check($by_url['https://www.beta.example/news/a']['image_url'] === '', 'missing logo stays empty (fallback tile)');
$check(Fides_DS_Updates::collect()['items'] !== null, 'collect returns items');

// Programme label limited to the programme's own host: other posts of the same organization stay organization news.
$check($by_url['https://news.example/beta-eudi']['group'] === 'organization' && $by_url['https://news.example/beta-eudi']['programme'] === '', 'third-party article about a programme organization gets no programme label, even if its title names the programme');
$check($by_url['https://github.com/beta/app/releases/tag/v2']['group'] === 'organization', 'release on another host of a mapped organization is organization news');
$check($by_url['https://www.beta.example/news/a']['group'] === 'programme', 'post on the programme host (www ignored) is a programme update');

// Publication source apart from the organization.
$news = $by_url['https://news.example/beta-eudi'];
$check($news['publisher_apart'] === true && $news['publisher'] === 'news.example' && $news['source_name'] === 'Beta Foundation', 'different publisher is kept apart from the organization');
$check($by_url['https://alpha.example/news/wallet-2']['publisher_apart'] === false, 'post on the organization site shows no extra source');
$check($by_url['https://blog.alpha.example/post']['publisher_apart'] === false, 'subdomain of the organization site is the same site');
$check($by_url['https://github.com/alpha/app/releases/tag/v1']['publisher_apart'] === true && $by_url['https://github.com/alpha/app/releases/tag/v1']['publisher'] === 'GitHub', 'GitHub release is shown with GitHub as source');
$check($by_url['https://www.beta.example/news/a']['publisher_apart'] === false, 'organization own site (www) shows no extra source');

// Programme only through the setting: the title mentions "programme" and "EUDI" but alpha is not mapped.
$check($by_url['https://alpha.example/news/wallet-2']['programme'] === '', 'no programme derived from text');

// Own posts: manual excerpt only.
$with    = wp_insert_post(array('post_title' => 'Pilot test own with excerpt', 'post_content' => 'Body text one. Body text two.', 'post_excerpt' => 'Manual intro.', 'post_status' => 'publish', 'post_date' => '2026-10-10 10:00:00'));
$without = wp_insert_post(array('post_title' => 'Pilot test own without excerpt', 'post_content' => 'Body text one. Body text two.', 'post_status' => 'publish', 'post_date' => '2026-10-11 10:00:00'));
$draft   = wp_insert_post(array('post_title' => 'Pilot test own draft', 'post_content' => 'x', 'post_status' => 'draft'));
try {
    $own = array();
    foreach (Fides_DS_Updates::own_items() as $item) {
        $own[$item['id']] = $item;
    }
    $check(isset($own['post:' . $with]) && $own['post:' . $with]['intro'] === 'Manual intro.', 'manual excerpt is the intro');
    $check(isset($own['post:' . $without]) && $own['post:' . $without]['intro'] === '', 'no automatic excerpt as intro');
    $check(! isset($own['post:' . $draft]), 'draft posts are not listed');
    $check($own['post:' . $with]['group'] === 'fides' && $own['post:' . $with]['external'] === false, 'own post is a FIDES update, internal');
    $check($own['post:' . $with]['url'] === get_permalink($with), 'own post links to its permalink');

    $all = Fides_DS_Updates::collect();
    $q   = Fides_DS_Updates::query($all['items'], array());
    $check($q['per_page'] ?? true, 'query ok');
    $check($q['total'] === count($all['items']), 'no filter keeps every item');
    $check(count($q['items']) === 3 && $q['pages'] === (int) ceil($q['total'] / 3), 'paginates by the per-page filter');
    $dates = array_column($q['items'], 'timestamp');
    $sorted = $dates;
    rsort($sorted);
    $check($dates === $sorted, 'newest first by default');
    $old = Fides_DS_Updates::query($all['items'], array('sort' => 'oldest', 'per_page' => 100));
    $check(end($old['items'])['timestamp'] >= $old['items'][0]['timestamp'], 'oldest first sorts ascending');
    $title = Fides_DS_Updates::query($all['items'], array('sort' => 'title', 'per_page' => 100));
    $titles = array_map(static function ($i) { return strtolower(remove_accents($i['title'])); }, $title['items']);
    $sorted = $titles;
    sort($sorted);
    $check($titles === $sorted, 'title sort is alphabetical');

    // Type filter.
    foreach (array('fides', 'organization', 'programme') as $type) {
        $r = Fides_DS_Updates::query($all['items'], array('type' => $type, 'per_page' => 100));
        $ok = $r['total'] > 0;
        foreach ($r['items'] as $item) {
            $ok = $ok && $item['group'] === $type;
        }
        $check($ok, 'type filter ' . $type);
    }
    $check(Fides_DS_Updates::query($all['items'], array('type' => 'bogus'))['type'] === '', 'unknown type is ignored');

    // Search: title, organization, programme label; accents and case ignored; terms are ANDed.
    $s = static function ($q) use ($all) { return Fides_DS_Updates::query($all['items'], array('q' => $q, 'per_page' => 100)); };
    $check($s('wallet 2')['total'] === 1, 'search matches title words');
    $check($s('ALPHA labs')['total'] === 4, 'search matches organization name, case-insensitive (got ' . $s('ALPHA labs')['total'] . ')');
    $check($s('cafe')['total'] === 1 && $s('café')['total'] === 1, 'search ignores accents');
    $check($s('eudi wallet')['total'] >= 1, 'search matches programme label set by an editor');
    $check($s('alpha nonexistentword')['total'] === 0, 'all search terms must match');
    $check($s('pilot test own without')['total'] === 1, 'search finds own posts by title');
    $check($s('Manual intro')['total'] === 0, 'search does not read the intro or body');
    $check($s('FIDES')['total'] >= 2, 'search matches the source name FIDES');

    // Page clamping.
    $far = Fides_DS_Updates::query($all['items'], array('pg' => 999));
    $check($far['page'] === $far['pages'], 'page beyond the end is clamped');
    $check(Fides_DS_Updates::query($all['items'], array('pg' => 0))['page'] === 1, 'page below one is clamped');

    // Rendering.
    $_GET = array('type' => 'programme');
    $html = Fides_DS_Updates::shortcode();
    $check(strpos($html, 'Read at source ↗') !== false && strpos($html, 'rel="noopener') === false, 'external rows show the source action');
    $check(strpos($html, '↗</span></a>') !== false, 'external rows use the external arrow');
    $check(strpos($html, 'Programme update · EUDI Wallet') !== false, 'programme label shown in the type line');
    $check(strpos($html, 'selected=\'selected\'') !== false || strpos($html, 'selected="selected"') !== false, 'selected type is kept in the form');
    $_GET = array('q' => 'zzzznomatch');
    $html = Fides_DS_Updates::shortcode();
    $check(strpos($html, 'No updates match your search.') !== false && strpos($html, 'Clear search and filters') !== false, 'empty search result has a message and a clear action');
    $check(strpos($html, 'fides-updates__pagination') === false, 'no pagination without results');
    $_GET = array('q' => '<script>alert(1)</script>');
    $html = Fides_DS_Updates::shortcode();
    $check(strpos($html, '<script>alert(1)') === false, 'search text is escaped');
    $_GET = array();
    $html = Fides_DS_Updates::shortcode();
    $check(strpos($html, 'Page 1 of') !== false && strpos($html, 'Next →') !== false, 'pagination shows page and next');
    $check(substr_count($html, 'class="fides-updates__item"') === 3, 'one page of rows (got ' . substr_count($html, 'class="fides-updates__item"') . ')');

    // Source fact and accessible link text for an external publication source.
    $_GET = array('q' => 'press coverage');
    $html = Fides_DS_Updates::shortcode();
    $check(strpos($html, 'fides-ds-card__fact--source">Source: news.example<') !== false, 'row shows the publication source apart from the organization');
    $check(strpos($html, 'fides-ds-card__fact--owner">Beta Foundation<') !== false, 'row keeps the organization as owner');
    $check(strpos($html, '(opens the original post on news.example)') !== false, 'link name says where the post is published');
    $check(strpos($html, 'Read at source ↗</li>') !== false && strpos($html, 'aria-hidden="true">Read at source') !== false, 'visual action hint is hidden from assistive technology');
    $_GET = array('q' => 'news.example');
    $check(Fides_DS_Updates::query($all['items'], array('q' => 'news.example'))['total'] === 1, 'search finds a shown publication source');
    $_GET = array('q' => 'alpha release');
    $html = Fides_DS_Updates::shortcode();
    $check(strpos($html, '(opens the original post on GitHub)') !== false && strpos($html, 'Source: GitHub') !== false, 'GitHub release link names GitHub');
    $_GET = array('q' => 'wallet 2');
    $html = Fides_DS_Updates::shortcode();
    $check(strpos($html, 'fides-ds-card__fact--source') === false && strpos($html, '(opens the original post on alpha.example)') !== false, 'own-site post has no source fact and names its site in the link');
    $_GET = array();

    // Feed origin is exposed so a bundled copy is recognisable.
    $html = Fides_DS_Updates::shortcode();
    $check(strpos($html, 'data-feed-origin="filter"') !== false, 'feed origin is exposed on the wrapper');

    // Failed feed: own posts still show, with a notice.
    $feed = null;
    remove_filter('fides_updates_feed', $feed_filter);
    add_filter('fides_updates_feed', '__return_false');
    $failed = Fides_DS_Updates::collect();
    $check($failed['external_ok'] === false, 'failed feed is reported');
    $check(count($failed['items']) > 0 && count(array_filter($failed['items'], static function ($i) { return $i['external']; })) === 0, 'own posts remain when the feed fails');
    $html = Fides_DS_Updates::shortcode();
    $check(strpos($html, 'could not be loaded') !== false, 'failed feed shows a notice');
    remove_filter('fides_updates_feed', '__return_false');
    add_filter('fides_updates_feed', static function () { return array('organizations' => array()); });
    $check(Fides_DS_Updates::external_items()['external_ok'] === true, 'empty feed is not an error');

    // Bundled copy: origin and generation date are passed through.
    remove_all_filters('fides_updates_feed');
    add_filter('fides_updates_feed', static function () { return array('origin' => 'bundled', 'generatedAt' => '2026-10-12T06:21:18Z', 'organizations' => array()); });
    $bundled = Fides_DS_Updates::external_items();
    $check($bundled['feed_origin'] === 'bundled' && $bundled['feed_generated_at'] === '2026-10-12T06:21:18Z', 'bundled origin and generation date are reported');
    $check(strpos(Fides_DS_Updates::shortcode(), 'data-feed-origin="bundled" data-feed-generated="2026-10-12T06:21:18Z"') !== false, 'bundled copy is marked on the wrapper');

    // Related links.
    update_post_meta($with, Fides_DS_Updates::RELATED_META, "Relying parties | /relying-parties/\nBad | javascript:alert(1)\nExternal | https://example.org/x\nNo url");
    $links = Fides_DS_Updates::related_links($with);
    $check(count($links) === 2 && $links[0]['url'] === home_url('/relying-parties/') && $links[1]['url'] === 'https://example.org/x', 'related links keep only site paths and https URLs');
    $check(Fides_DS_Updates::related_links($without) === array(), 'no related links without editor input');
    $check(Fides_DS_Updates::sanitize_settings(array('programmes_text' => "org:x | X\nbad line", 'hidden_text' => "https://a.example/p\njavascript:x", 'listing_path' => '/news/'))['programmes'] === array('org:x' => 'X'), 'settings parse programme lines');
    $prog = Fides_DS_Updates::sanitize_settings(array('programmes_text' => "org:a | A | www.A.example, b.example\norg:b | B\norg:c | C | not a host!"))['programmes'];
    $check($prog['org:a'] === array('label' => 'A', 'hosts' => array('a.example', 'b.example')) && $prog['org:b'] === 'B', 'settings parse optional programme hosts');
    $check(! isset($prog['org:c']), 'unreadable host text drops the line instead of labelling all posts');
    $check(Fides_DS_Updates::sanitize_settings(array('hidden_text' => "https://a.example/p\njavascript:x"))['hidden_urls'] === array('https://a.example/p'), 'settings keep valid hidden URLs only');
} finally {
    wp_delete_post($with, true);
    wp_delete_post($without, true);
    wp_delete_post($draft, true);
}

echo 'updates behaviour: ' . $results['pass'] . ' passed, ' . count($results['fail']) . " failed\n";
foreach ($results['fail'] as $message) {
    echo '  FAIL: ' . $message . "\n";
}
exit(count($results['fail']) ? 1 : 0);
