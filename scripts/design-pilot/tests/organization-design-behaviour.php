<?php
/**
 * Behaviour tests for the organization pilot detail page with fixed fixtures:
 * linked use cases, relations, news, gallery, empty groups, minimal profiles
 * and the update access rule. Nothing is written to the database.
 *
 * Run: scripts/design-pilot/run-tests.sh
 */

if (! defined('ABSPATH')) {
    exit(1);
}

const ORG_FULL  = 'org:pilot-test-full';
const ORG_MIN   = 'org:pilot-test-min';
const ORG_MEDIA = 'org:pilot-test-media';
const ORG_QUIET = 'org:pilot-test-quiet';

$results = array('pass' => 0, 'fail' => array());

$check = static function (bool $ok, string $message) use (&$results): void {
    if ($ok) {
        $results['pass']++;
    } else {
        $results['fail'][] = $message;
    }
};

$org_items = array(
    array(
        'id'                      => ORG_FULL,
        'name'                    => 'Full Org',
        'legalName'               => 'Full Org B.V.',
        'catalogTier'             => 'Pro',
        'country'                 => 'NL',
        'sectors'                 => array('digital'),
        'description'             => 'Full Org builds wallets.',
        'website'                 => 'https://full.example.org/',
        'fidesManifestoSupporter' => true,
        'updatedAt'               => '2026-07-12T09:00:00Z',
        'contact'                 => array('email' => 'hello@full.example.org'),
        'media'                   => array('images' => array('https://full.example.org/one.png')),
        'ecosystemRoles'          => array(
            'issuers'         => array(
                array('id' => 'issuer:full:b', 'displayName' => 'Second issuer'),
                array('id' => 'issuer:full:a', 'displayName' => 'First issuer'),
            ),
            'personalWallets' => array(array('id' => 'wallet:full', 'displayName' => 'Full Wallet')),
            'credentialTypes' => array(),
        ),
    ),
    array(
        'id'   => ORG_MIN,
        'name' => 'Minimal Org',
    ),
    array(
        'id'          => ORG_MEDIA,
        'name'        => 'Media Org',
        'catalogTier' => 'Pro',
        'media'       => array(
            'videos' => array('https://www.youtube.com/watch?v=3nM_0gPjOTc'),
            'images' => array('https://media.example.org/a.png'),
        ),
    ),
    array(
        'id'                 => ORG_QUIET,
        'name'               => 'Quiet Org',
        'listingNewsEnabled' => false,
    ),
);

$use_case_items = array(
    array(
        'id'    => 'pilot-org-zeta-ZZZZZZ',
        'title' => 'Zeta case',
        'links' => array('organizations' => array(array('refId' => ORG_FULL, 'labelRaw' => 'Full Org'))),
    ),
    array(
        'id'    => 'pilot-org-alpha-AAAAAA',
        'title' => 'alpha case',
        'links' => array('organizations' => array(array('refId' => ORG_FULL, 'labelRaw' => 'Full Org'))),
    ),
    array(
        'id'    => 'pilot-org-other-OOOOOO',
        'title' => 'Other case',
        'links' => array('organizations' => array(array('refId' => 'org:someone-else', 'labelRaw' => 'Else'))),
    ),
);

$news_items = array(array('title' => 'No link', 'url' => 'javascript:alert(1)'));
foreach (range(1, 6) as $n) {
    $news_items[] = array('title' => "News {$n}", 'url' => "https://full.example.org/news/{$n}", 'publishedAt' => sprintf('2026-09-%02d', 30 - $n), 'sourceLabel' => 'full.example.org');
}
$news_payload = array(
    'organizations' => array(
        ORG_FULL  => array('items' => $news_items),
        ORG_QUIET => array('items' => array(array('title' => 'Hidden', 'url' => 'https://quiet.example.org/'))),
    ),
);

add_filter('fides_organization_design_items', static function () use ($org_items) {
    return $org_items;
}, 99);
add_filter('fides_use_case_design_items', static function () use ($use_case_items) {
    return $use_case_items;
}, 99);
add_filter('fides_organization_design_news_payload', static function () use ($news_payload) {
    return $news_payload;
}, 99);

$render = static function (string $id): string {
    Fides_Organization_Design::flush_cache();
    if (class_exists('Fides_Use_Case_Design')) {
        Fides_Use_Case_Design::flush_cache();
    }
    return do_shortcode('[fides_organization_detail id="' . $id . '" listing_url="/pilot/organizations/" use_case_detail_url="/pilot/use-case/"]');
};

$section = static function (string $html, string $id): string {
    if (! preg_match('~<section[^>]*\bid="' . preg_quote($id, '~') . '"[^>]*>.*?</section>~s', $html, $m)) {
        return '';
    }
    return $m[0];
};

wp_set_current_user(0);

// Unknown record.
$html = $render('org:pilot-test-unknown');
$check(strpos($html, 'This organization is not in the current FIDES catalog.') !== false, 'unknown id shows the missing message');

// Invalid ids never reach the page.
$_GET['org'] = 'org:bad id"><script>';
$check(Fides_Organization_Design::requested_id('org:fallback') === 'org:fallback', 'invalid ?org= falls back to the shortcode id');
$_GET['org'] = ORG_FULL;
$check(Fides_Organization_Design::requested_id('org:fallback') === ORG_FULL, 'valid ?org= is used');
unset($_GET['org']);

// Full profile.
$html = $render(ORG_FULL);
$check(strpos($html, '>Full Org</h1>') !== false, 'name is the page heading');
$check(strpos($html, 'Official listing') !== false || ! Fides_Organization_Design::tier_ui_enabled(), 'Pro listing shows the Official listing chip when the tier UI is on');
$check(strpos($html, 'Profile updated <time datetime="2026-07-12">12 Jul 2026</time>') !== false, 'header shows the profile update date');
$uc    = $section($html, 'use-cases');
$alpha = strpos($uc, 'alpha case');
$zeta  = strpos($uc, 'Zeta case');
$check($alpha !== false && $zeta !== false && $alpha < $zeta, 'linked use cases are alphabetical, case-insensitive');
$check(strpos($uc, 'Other case') === false, 'use cases of other organizations are not linked');
$check(strpos($uc, 'fides-org-use-cases__more') !== false && strpos($uc, 'More linked use cases') !== false, 'further use cases sit behind a disclosure');
$check(Fides_Organization_Design::use_case_count(ORG_FULL) === 2, 'overview count matches the detail list');

$relations = $section($html, 'relations');
$title     = preg_match('~id="relations-title"[^>]*>([^<]*)~', $relations, $t) ? trim($t[1]) : '';
$check($title === 'Wallet &amp; issuers', 'relations title names the kinds: ' . $title);
$check(strpos($relations, 'id="relations-issuers"') !== false && strpos($relations, 'id="relations-personalwallets"') !== false, 'issuers and wallets keep separate labels');
$check(strpos($relations, 'relations-credentialtypes') === false, 'empty relation groups are hidden');
$check(strpos($relations, 'First issuer') !== false && strpos($relations, 'Second issuer') !== false, 'every relation is listed');

$news = $section($html, 'news');
$check(substr_count($news, 'class="fides-org-news__item"') === 5, 'news shows at most five items with a valid link');
$check(strpos($news, 'No link') === false, 'news without an http(s) link is dropped');
$check(strpos($news, 'News from full.example.org') !== false, 'news names its source');

$media = $section($html, 'media');
$check($media !== '' && strpos($media, '<img') !== false, 'one image renders the gallery');
$check(strpos($media, 'fides-ds-gallery__thumb') === false, 'one media item has no selector strip');

$check(strpos($html, 'mailto:hello@full.example.org') !== false, 'contact email is offered');
$check($section($html, 'certifications') === '' && $section($html, 'identifiers') === '', 'certifications and identifiers are hidden when empty');
$check(strpos($html, 'Legal name') !== false, 'legal name is shown when it differs from the name');

if (preg_match('~<nav aria-label="On this page">(.*?)</nav>~s', $html, $nav)) {
    preg_match_all('~href="#([a-z-]+)"~', $nav[1], $anchors);
    $missing = array_filter($anchors[1], static function ($anchor) use ($html) {
        return strpos($html, 'id="' . $anchor . '"') === false;
    });
    $check(! $missing, 'every section link has a target: ' . implode(', ', $missing));
} else {
    $check(false, 'section navigation is present');
}

$check(strpos($html, 'Sign in to suggest an update') !== false, 'guests are sent to sign in before suggesting an update');

// Media order: images first.
$html  = $render(ORG_MEDIA);
$media = $section($html, 'media');
$img   = strpos($media, '<img');
$vid   = strpos($media, 'youtube');
$check($img !== false && $vid !== false && $img < $vid, 'gallery starts with images, then videos');
$check(strpos($media, 'autoplay=1') === false && strpos($media, ' autoplay') === false, 'videos do not autoplay');

// Minimal profile.
$html = $render(ORG_MIN);
foreach (array('use-cases', 'media', 'news', 'relations', 'contact', 'certifications', 'identifiers', 'recognitions') as $id) {
    $check(strpos($html, 'id="' . $id . '"') === false, "minimal profile hides {$id}");
}
$check(strpos($html, 'id="update"') !== false, 'minimal profile keeps the update bar');
$check(strpos($html, 'Profile updated') === false, 'no update date without data');

// News switched off on the record.
$html = $render(ORG_QUIET);
$check(strpos($html, 'id="news"') === false, 'listingNewsEnabled false hides news');

// A signed-in administrator keeps the existing edit route.
$admins = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ID'));
if ($admins) {
    wp_set_current_user((int) $admins[0]);
    $html = $render(ORG_FULL);
    $check(strpos($html, 'Suggest an update') !== false && strpos($html, 'Sign in to suggest an update') === false, 'administrator gets Suggest an update without sign-in');
    wp_set_current_user(0);
}

Fides_Organization_Design::flush_cache();
if (class_exists('Fides_Use_Case_Design')) {
    Fides_Use_Case_Design::flush_cache();
}

foreach ($results['fail'] as $message) {
    echo "not ok - {$message}\n";
}
printf("# pass %d\n# fail %d\n", $results['pass'], count($results['fail']));
if ($results['fail']) {
    exit(1);
}
