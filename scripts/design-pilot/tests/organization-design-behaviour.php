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
const ORG_MANY  = 'org:pilot-test-many';

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
        'catalogUrl'  => 'community-catalogs/media-org/organization-catalog.json',
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
    array(
        'id'             => ORG_MANY,
        'name'           => 'Many Relations Org With A Very Long Organization Name For Narrow Screens',
        'catalogTier'    => 'Community',
        'ecosystemRoles' => array(
            'issuers'         => array(array('id' => 'issuer:many:1', 'displayName' => 'Only issuer')),
            'credentialTypes' => array_map(static function ($n) {
                return array('id' => "credential:many:{$n}", 'displayName' => "Credential {$n}");
            }, range(1, 12)),
            'relyingParties'  => array_map(static function ($n) {
                return array('id' => "rp:many:{$n}", 'displayName' => "Relying party {$n}");
            }, range(1, 3)),
            'businessWallets' => array_map(static function ($n) {
                return array('id' => "wallet:many:{$n}", 'displayName' => "Business wallet {$n}");
            }, range(1, 4)),
        ),
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
        ORG_MEDIA => array('items' => array(
            array('title' => 'Release one', 'url' => 'https://media.example.org/r1', 'sourceLabel' => 'media.example.org'),
            array('title' => 'Press one', 'url' => 'https://press.example.net/p1', 'sourceLabel' => 'press.example.net'),
        )),
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

// Shared top row: back, breadcrumb to the catalog, one share action.
$top = preg_match('~<div class="fides-ds-detail-top">.*?</div>~s', $html, $m) ? $m[0] : '';
$check(strpos($top, 'data-fides-ds-back="org"') !== false && strpos($top, 'data-fides-ds-back-id="' . ORG_FULL . '"') !== false, 'top row keeps the Back restore attributes');
$check(strpos($top, '>Organizations</a></li></ol>') !== false && strpos($top, 'aria-current') === false && strpos($top, 'Full Org') === false, 'breadcrumb ends at the catalog, without the record name');
$check(substr_count($html, 'share-offsite') === 1 && strpos($top, 'share-offsite/?url=' . rawurlencode(Fides_Organization_Design::detail_url(ORG_FULL, (string) get_permalink()))) !== false, 'one LinkedIn share action, in the top row, for the record URL');
$check(strpos($html, 'data-fides-ds-copy') === false && strpos($html, 'Copy link') === false, 'no Copy link');

// Identity header: text first, logo after; Official is a profile status.
$hero = preg_match('~<header class="fides-org-detail__hero[^"]*">.*?</header>~s', $html, $m) ? $m[0] : '';
$check(strpos($hero, 'fides-org-detail__logo') === false && strpos($hero, 'fides-org-detail__hero--no-logo') !== false, 'no logo slot without a logo');
$check(strpos($hero, 'fides-org-detail__badge--official') !== false || ! Fides_Organization_Design::tier_ui_enabled(), 'Official listing badge with its icon');
$check(strpos($hero, 'class="fides-org-detail__manifesto"') !== false && strpos($hero, 'Manifesto supporter') !== false, 'Manifesto supporter is a secondary link');
$check(strpos($hero, 'fides-org-detail__sep') === false, 'meta row has no dot separators');

$eco = $section($html, 'ecosystem');
$check(preg_match('~id="ecosystem-title"[^>]*>Ecosystem <span class="fides-org-eco__total">3</span>~', $eco) === 1, 'relations panel is called Ecosystem with its total');
$check(strpos($eco, 'id="ecosystem-issuers"') !== false && strpos($eco, 'id="ecosystem-personalwallets"') !== false, 'issuers and wallets keep separate groups');
$check(strpos($eco, 'ecosystem-credentialtypes') === false, 'empty relation groups are hidden');
$first  = strpos($eco, 'Second issuer');
$second = strpos($eco, 'First issuer');
$check($first !== false && $second !== false && $first < $second, 'relations keep their source order');
$check(strpos($eco, 'Issuers <span aria-hidden="true">·</span> 2') !== false, 'group label carries its count');
$check(strpos($html, 'id="relations"') === false, 'old relations anchor is gone');

$news = $section($html, 'news');
$check(substr_count($news, 'class="fides-org-news__item"') === 5, 'news shows at most five items with a valid link');
$check(strpos($news, 'No link') === false, 'news without an http(s) link is dropped');
$check(strpos($news, 'News from full.example.org') !== false, 'one news source is named once in the intro');
$check(strpos($news, 'fides-org-news__meta') === false, 'one news source is not repeated per article');

$media = $section($html, 'media');
$check($media !== '' && strpos($media, '<img') !== false, 'one image renders the gallery');
$check(strpos($media, 'fides-ds-gallery__thumb') === false, 'one media item has no selector strip');

$check(substr_count($html, 'mailto:hello@full.example.org') === 1, 'contact email is offered once');
$update = $section($html, 'update');
$check(strpos($update, 'mailto:hello@full.example.org') !== false && strpos($update, 'id="contact"') !== false, 'contact sits in the profile closing');
$check(strpos($update, '>Profile information</h2>') !== false && strpos($update, 'Profile updated <time datetime="2026-07-12">') !== false, 'closing is Profile information with the date');
$check(strpos($update, 'Help keep this profile current') === false, 'no large update call');
$check(strpos($update, 'Visit Full Org') === false, 'closing contact does not add the website visit');
$check(strpos($update, 'Catalog data on GitHub') === false, 'no GitHub link without a catalog record path');
$check(strpos($html, 'id="sources-title"') === false && strpos($html, 'Catalog record on GitHub') === false, 'no separate Sources section');
$check(strpos($html, 'id="links-title">Links<') !== false, 'side column keeps the website, without a second contact panel');
$media_at = strpos($html, 'id="media"');
$aside_at = strpos($html, 'fides-org-detail__aside');
$check($media_at !== false && $aside_at !== false && $media_at > $aside_at, 'media band sits outside the main column');
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

// Permissions: an Official listing offers guests no update or sign-in call.
$guest_pro = $html;
$check(strpos($guest_pro, 'Sign in to suggest an update') === false || ! Fides_Organization_Design::tier_ui_enabled(), 'guest on an Official listing gets no sign-in update call');
$check(strpos($guest_pro, 'Update profile') === false && strpos($guest_pro, 'Suggest an update') === false, 'guest on an Official listing gets no update action, also not in the section navigation');
$check(strpos($section($guest_pro, 'update'), 'class="fides-ds-button"') !== false, 'without an update action Contact is the main button');

// Media order: images first.
$html  = $render(ORG_MEDIA);
$media = $section($html, 'media');
$img   = strpos($media, '<img');
$vid   = strpos($media, 'youtube');
$check($img !== false && $vid !== false && $img < $vid, 'gallery starts with images, then videos');
$check(strpos($media, 'autoplay=1') === false && strpos($media, ' autoplay') === false, 'videos do not autoplay');
$check(strpos($section($html, 'update'), '>Contact') === false && strpos($html, 'id="contact"') === false, 'no contact action or anchor without email or a meeting link');
$news = $section($html, 'news');
$check(strpos($news, 'fides-org-news__source') === false, 'mixed news sources are not summarised in the intro');
$check(substr_count($news, 'class="fides-org-news__meta"') === 2 && strpos($news, 'press.example.net') !== false, 'mixed news sources stay per article');
$check(strpos($section($html, 'update'), 'Catalog data on GitHub') !== false, 'catalog record path gives a subordinate GitHub link in the closing');

// Relation limits: 0 (none), 1, 3, 4 and many per group; the script hides beyond three.
$html = $render(ORG_MANY);
$eco  = $section($html, 'ecosystem');
foreach (array('issuers' => 1, 'credentialtypes' => 12, 'relyingparties' => 3, 'businesswallets' => 4) as $key => $count) {
    $list = preg_match('~<ul class="fides-org-eco__list" id="ecosystem-' . $key . '-list"[^>]*>(.*?)</ul>~s', $eco, $m) ? $m : array('', '');
    $check(substr_count($list[1], '<li>') === $count, "{$key}: all {$count} relations are in the markup");
    $check(strpos($list[0], 'data-fides-ds-show-all="3" data-fides-ds-show-all-wide') !== false, "{$key}: limit of three on every width");
}
$check(substr_count($eco, 'class="fides-org-eco__row" href=') === 20, 'every linked relation is one full-row link');
$check(substr_count($eco, 'class="fides-org-eco__arrow"') === 20, 'every row link has the arrow column');
$check(strpos($eco, 'ecosystem-personalwallets') === false, 'a group without relations is left out');
$check(strpos(Fides_Use_Case_Design::render_card(array('id' => 'x', 'title' => 'x'), 'row'), 'show-all-wide') === false, 'use-case components keep the narrow-only show-all contract');

// Community listing: guests may sign in, because signing in grants the form there.
$check(strpos($html, 'Sign in to suggest an update') !== false, 'guest on a Community listing gets the sign-in route');
$check(strpos($html, 'Update profile') === false, 'guest on a Community listing has no direct update action');

// Minimal profile.
$html = $render(ORG_MIN);
foreach (array('use-cases', 'media', 'news', 'ecosystem', 'contact', 'certifications', 'identifiers', 'recognitions') as $id) {
    $check(strpos($html, 'id="' . $id . '"') === false, "minimal profile hides {$id}");
}
$check(strpos($html, 'id="update"') !== false, 'minimal profile keeps the profile closing');
$check(strpos($html, 'Profile updated') === false, 'no update date without data');
$check(strpos($html, 'fides-org-detail__logo') === false, 'minimal profile has no logo slot');

// News switched off on the record.
$html = $render(ORG_QUIET);
$check(strpos($html, 'id="news"') === false, 'listingNewsEnabled false hides news');

// Signed in without rights on the Official listing: no update call; Community stays open.
$members = get_users(array('role' => 'subscriber', 'number' => 5, 'fields' => 'ID'));
foreach ($members as $member) {
    wp_set_current_user((int) $member);
    if (in_array(ORG_FULL, array_map('strval', (array) (Fides_Organization_Design::edit_access()['ownedOrgIds'] ?? array())), true)) {
        continue;
    }
    $html = $render(ORG_FULL);
    $check(Fides_Organization_Design::update_url(Fides_Organization_Design::find(ORG_FULL)) === '' || ! Fides_Organization_Design::tier_ui_enabled(), 'member without rights is denied the Official update form by the access rule');
    $check(strpos($html, 'Update profile') === false && strpos($html, 'Sign in to suggest an update') === false, 'member without rights sees no update call on an Official listing');
    $html = $render(ORG_MANY);
    $check(strpos($html, 'Update profile') !== false && strpos($html, 'Sign in to suggest an update') === false, 'member gets Update profile on a Community listing');
    break;
}
wp_set_current_user(0);

// A signed-in administrator keeps the existing edit route.
$admins = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ID'));
if ($admins) {
    wp_set_current_user((int) $admins[0]);
    $html   = $render(ORG_FULL);
    $update = $section($html, 'update');
    $check(strpos($update, 'Update profile') !== false && strpos($html, 'Sign in to suggest an update') === false, 'administrator gets Update profile without sign-in');
    $check(strpos($update, 'class="fides-org-closing__link" href="mailto:') !== false, 'with an update action Contact becomes a text link');
    $check(preg_match('~fides-uc-detail__sections-update"><a href="[^"#]+"~', $html) === 1, 'section navigation links to the update form for an authorised user');
    wp_set_current_user(0);
}

// Server-rendered overview (first state before the script takes over).
$overview = static function (array $get): string {
    Fides_Organization_Design::flush_cache();
    if (class_exists('Fides_Use_Case_Design')) {
        Fides_Use_Case_Design::flush_cache();
    }
    $_GET = $get;
    return Fides_Organization_Overview::render(array('title' => 'Organizations', 'detail_url' => '/pilot/organization/'));
};
$html   = $overview(array());
$titles = preg_match_all('~class="fides-ds-card__link" href="[^"]*">([^<]+)<~', $html, $m) ? $m[1] : array();
$many_name = 'Many Relations Org With A Very Long Organization Name For Narrow Screens';
$check(count($titles) === 5 && strpos($html, 'data-pilot-ssr-results') !== false, 'overview renders every row on the server');
$check(($titles[0] ?? '') === 'Full Org', 'default sort puts the most linked use cases first');
$check(array_slice($titles, 1) === array($many_name, 'Media Org', 'Minimal Org', 'Quiet Org'), 'equal use-case counts sort by name: ' . implode(', ', $titles));
$check(strpos($html, '>5 organizations</h2>') !== false, 'server count matches the rows');
$check(strpos($html, 'href="/pilot/organization/?org=org%3Apilot-test-full"') !== false, 'row links to the detail page like the script');
$check(strpos($html, 'Netherlands · 2 use cases · Updated 12 Jul 2026') !== false, 'facts line: country, use cases, updated');
$check(strpos($html, 'fides-catalog-pagination') === false, 'no pager for one page');
$html   = $overview(array('sort' => 'name'));
$titles = preg_match_all('~class="fides-ds-card__link" href="[^"]*">([^<]+)<~', $html, $m) ? $m[1] : array();
$check($titles === array('Full Org', $many_name, 'Media Org', 'Minimal Org', 'Quiet Org') && strpos($html, '<option value="name" selected>') !== false, 'sort from the URL');
$check($overview(array('q' => 'wallet')) === '', 'a search in the URL keeps the client-side path');
$check($overview(array('role' => 'issuer')) === '', 'a filter in the URL keeps the client-side path');
$check(Fides_Organization_Overview::logo_url(array('logoUri' => 'https://www.pec.it/logo.png', 'website' => 'https://www.pec.it/')) === 'https://www.google.com/s2/favicons?domain=www.pec.it&sz=128', 'blocked logo hosts use the favicon like the script');
$_GET = array();

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
