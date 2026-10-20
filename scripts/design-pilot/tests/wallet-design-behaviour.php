<?php
/**
 * Behaviour tests for the wallet pilot detail page with fixed fixtures:
 * shared personal/business template, full vs limited fields, features,
 * technical placement, glossary, eIDAS, edge cases and the access matrix
 * (guest / signed in without rights / owner / administrator, tier UI on and
 * off). Nothing is written to the database.
 *
 * Run: scripts/design-pilot/run-tests.sh
 */

if (! defined('ABSPATH')) {
    exit(1);
}

const W_BIZ_PRO   = 'pilot-test-business-pro';
const W_PERS_FULL = 'pilot-test-personal-full';
const W_PERS_COMM = 'pilot-test-personal-community';
const W_BIZ_COMM  = 'pilot-test-business-community';
const W_LINKED    = 'pilot-test-business-linked-pro';
const W_EDGE      = 'pilot-test-edge';
const ORG_PRO     = 'org:pilot-wallet-pro';
const ORG_COMM    = 'org:pilot-wallet-community';
const ORG_LINKED  = 'org:pilot-wallet-linked';

$results = array('pass' => 0, 'fail' => array());

$check = static function (bool $ok, string $message) use (&$results): void {
    if ($ok) {
        $results['pass']++;
    } else {
        $results['fail'][] = $message;
    }
};

$long = str_repeat('A very long wallet description sentence that keeps going to test wrapping and the read-more control. ', 30);

$wallets = array(
    array(
        'id'                => W_BIZ_PRO,
        'name'              => 'Pro Business Wallet',
        'type'              => 'organizational',
        'status'            => 'production',
        'catalogTier'       => 'Pro',
        'orgId'             => ORG_PRO,
        'provider'          => array('name' => 'Pro Provider', 'country' => 'NL', 'contact' => array('email' => 'sales@pro.example.org')),
        'description'       => "First paragraph.\n\nSecond paragraph.",
        'capabilities'      => array('verifier', 'holder'),
        'platforms'         => array('Web'),
        'features'          => array('One', 'Two', 'Three', 'Four'),
        'website'           => 'https://pro.example.org/',
        'documentation'     => 'https://docs.pro.example.org/',
        'vcFormat'          => array('sd_jwt_vc', 'made_up_format'),
        'issuanceProtocols' => array('OpenID4VCI'),
        'supportedIdentifiers' => array('did:web'),
        'eidasTrustServices' => array('Q_CERT_ESEAL'),
        'updatedAt'         => '2026-09-09T10:00:00Z',
        'firstSeenAt'       => '2026-01-06T10:00:00Z',
        'catalogUrl'        => 'https://github.com/FIDEScommunity/fides-wallet-catalog/blob/main/community-catalogs/pro/wallet-catalog.json',
    ),
    array(
        'id'             => W_PERS_FULL,
        'name'           => 'Full Personal Wallet',
        'type'           => 'personal',
        'status'         => 'beta',
        'catalogListingDepth' => 'full',
        'orgId'          => ORG_COMM,
        'provider'       => array('name' => 'Community Provider', 'country' => 'BE'),
        'description'    => 'A personal wallet.',
        'platforms'      => array('iOS', 'Android'),
        'appStoreLinks'  => array('iOS' => 'https://apps.apple.com/app/id1', 'android' => 'https://play.google.com/store/apps/details?id=x'),
        'features'       => array('Only feature'),
        'certifications' => array('Plain certificate'),
        'pricing'        => 'Free for individuals.',
        'openSource'     => true,
        'license'        => 'Apache-2.0',
    ),
    array(
        'id'            => W_PERS_COMM,
        'name'          => 'Community Personal Wallet',
        'type'          => 'personal',
        'catalogTier'   => 'Community',
        'orgId'         => ORG_COMM,
        'provider'      => array('name' => 'Community Provider'),
        'description'   => 'Limited listing.',
        'appStoreLinks' => array('iOS' => 'https://apps.apple.com/app/id2'),
        'features'      => array('Hidden for community listings'),
        'website'       => 'https://community.example.org/',
    ),
    array(
        'id'          => W_BIZ_COMM,
        'name'        => 'Community Business Wallet',
        'type'        => 'organizational',
        'catalogTier' => 'Community',
        'orgId'       => ORG_COMM,
        'provider'    => array('name' => 'Community Provider'),
        'website'     => 'https://community-biz.example.org/',
        'openSource'  => false,
    ),
    array(
        'id'       => W_LINKED,
        'name'     => 'Linked Pro Wallet',
        'type'     => 'organizational',
        'provider' => array('name' => 'Linked Provider', 'orgId' => ORG_LINKED),
        'openSource' => true,
        'vcFormat'   => array('sd_jwt_vc'),
    ),
    array(
        'id'          => W_EDGE,
        'name'        => 'Edge Wallet With An Exceptionally Long Name That Must Wrap On Narrow Screens Without Overflow',
        'type'        => 'personal',
        'catalogTier' => 'Pro',
        'orgId'       => ORG_PRO,
        'provider'    => array('name' => 'Pro Provider'),
        'logo'        => 'https://broken.invalid/logo.png',
        'license'     => 'MIT',
        'description' => $long,
        'features'    => array(),
    ),
);

$use_case = static function (string $id, string $title, array $personal, array $business): array {
    return array(
        'id'               => $id,
        'title'            => $title,
        'organizationName' => 'Pro Provider',
        'links'            => array(
            'personalWallets' => array_map(static function ($ref) {
                return array('refId' => $ref);
            }, $personal),
            'businessWallets' => array_map(static function ($ref) {
                return array('refId' => $ref);
            }, $business),
        ),
    );
};
$use_case_items = array(
    $use_case('uc-b', 'Bravo use case', array(), array(W_BIZ_PRO)),
    $use_case('uc-a', 'Alpha use case', array(W_PERS_FULL), array(W_BIZ_PRO)),
    $use_case('uc-c', 'Charlie use case', array(), array(W_BIZ_PRO)),
);

$vocabulary = array(
    'sd_jwt_vc'    => array('description' => 'Selective disclosure JWT credential.'),
    'Q_CERT_ESEAL' => array('description' => 'Qualified electronic seal certificate.'),
);

add_filter('fides_wallet_design_items', static function () use ($wallets) {
    return $wallets;
});
add_filter('fides_use_case_design_items', static function () use ($use_case_items) {
    return $use_case_items;
});
add_filter('fides_wallet_design_vocabulary', static function () use ($vocabulary) {
    return $vocabulary;
});
add_filter('fides_organization_design_news_payload', static function () {
    return array('items' => array());
});
$tier_on = static function () {
    return true;
};
add_filter('fides_catalog_tier_ui_force_enable', $tier_on);

$access = new ReflectionProperty('Fides_Organization_Design', 'access');
$access->setAccessible(true);

$flush = static function () {
    Fides_Wallet_Design::flush_cache();
    Fides_Organization_Design::flush_cache();
    if (class_exists('Fides_Use_Case_Design')) {
        Fides_Use_Case_Design::flush_cache();
    }
};

$render = static function (string $id, ?array $edit = null) use ($flush, $access): string {
    $flush();
    if ($edit !== null) {
        $access->setValue(null, $edit);
    }
    $_GET = array();
    return Fides_Wallet_Detail_Page::shortcode(array(
        'id'                   => $id,
        'personal_listing_url' => '/pilot/personal/',
        'business_listing_url' => '/pilot/business/',
        'use_case_detail_url'  => '/pilot/use-case/',
    ));
};

$section = static function (string $html, string $id): string {
    $start = strpos($html, 'id="' . $id . '"');
    if ($start === false) {
        return '';
    }
    $end = strpos($html, '</section>', $start);
    return substr($html, $start, $end === false ? null : $end - $start);
};

wp_set_current_user(0);

// One template for both types.
$biz  = $render(W_BIZ_PRO);
$pers = $render(W_PERS_FULL);
$check(strpos($biz, 'fides-wallet-detail fides-wallet-detail--business') !== false, 'business uses the shared detail template');
$check(strpos($pers, 'fides-wallet-detail fides-wallet-detail--personal') !== false, 'personal uses the shared detail template');
$check(strpos($biz, 'All business wallets') !== false && strpos($biz, 'href="' . esc_url(home_url('/pilot/business/')) . '"') !== false, 'business back link goes to the business listing');
$check(strpos($pers, 'All personal wallets') !== false && strpos($pers, 'href="' . esc_url(home_url('/pilot/personal/')) . '"') !== false, 'personal back link goes to the personal listing');
$check(strpos($biz, 'data-fides-ds-back="wallet"') !== false && strpos($biz, 'data-fides-ds-back-id="' . W_BIZ_PRO . '"') !== false, 'back link carries the return context');
$check(strpos($biz, 'Copy link') === false, 'no Copy link');

// Header: status, Official badge, date, actions.
$check(strpos($biz, '>Production</span>') !== false && strpos($biz, 'Official listing') !== false && strpos($biz, 'Updated <time') !== false, 'business header: status, Official listing, updated date');
$check(strpos($biz, 'Visit wallet website') !== false && strpos($biz, 'Read documentation') !== false, 'business full listing has website and documentation actions');
$check(strpos($biz, 'data-sales-track="wallet-link"') !== false && strpos($biz, 'data-link-type="product"') !== false, 'outbound links keep the sales tracking contract');
$check(strpos($pers, 'fides-wallet-store--ios') !== false && strpos($pers, 'fides-wallet-store--android') !== false, 'personal full listing has App Store and Google Play');
$check(strpos($pers, 'Community listing') !== false || strpos($pers, 'Official listing') === false, 'curated-full without Pro tier is not shown as Official');

// Features: four items with show-all, none on the edge record.
$features = $section($biz, 'features');
$check(substr_count($features, 'fides-wallet-features__item') === 4 && strpos($features, 'data-fides-ds-show-all="3"') !== false, 'four features with the shared show-all control');
$check(strpos($biz, 'href="#features"') !== false, 'section nav links to features');
$edge = $render(W_EDGE);
$check(strpos($edge, 'id="features"') === false && strpos($edge, 'href="#features"') === false, 'no features: block and section link disappear');
$check(substr_count($section($pers, 'features'), 'fides-wallet-features__item') === 1, 'one feature renders as one item');

// Use cases and technical placement.
$uc = $section($biz, 'use-cases');
$check(strpos($uc, 'Use cases <span class="fides-uc-detail__count">3</span>') !== false, 'business wallet lists its three linked use cases');
$check(strpos($biz, 'Alpha use case') < strpos($biz, 'Bravo use case') && strpos($biz, 'Bravo use case') < strpos($biz, 'Charlie use case'), 'linked use cases sorted by title');
$check(strpos($biz, 'More linked use cases') !== false, 'extra use cases behind the shared collapsible');
$check(strpos($biz, 'fides-wallet-detail__technical--main') === false, 'with use cases technical details stay in the side column');
$comm_biz = $render(W_BIZ_COMM);
$check(strpos($comm_biz, 'id="use-cases"') === false, 'no use cases: no use-case block');
$check(strpos($edge, 'id="technical"') === false, 'no technical data: technical block hidden');
$tech_main = $render(W_PERS_FULL);
$check(strpos($tech_main, 'id="use-cases"') !== false, 'personal full wallet has one linked use case');

// Glossary: defined values are terms, unknown values plain text.
$tech = $section($biz, 'technical');
$check(strpos($tech, 'data-fides-ds-term=') !== false, 'vocabulary value opens the glossary');
$check(strpos($tech, 'made_up_format') !== false && strpos($tech, '>made_up_format</button>') === false, 'unknown vocabulary value stays plain text');
$check(strpos($biz, '<template id="fides-ds-term-') !== false, 'glossary definitions are output once at the end');

// eIDAS.
$eidas = $section($biz, 'eidas');
$check(strpos($eidas, 'fides-wallet-eidas__selected') !== false && strpos($eidas, 'QESeal') !== false, 'selected eIDAS service listed');
$check(strpos($eidas, 'View all service options') !== false && substr_count($eidas, 'fides-wallet-eidas__option') >= 10, 'all options behind a disclosure');
$check(strpos($section($pers, 'eidas'), 'None listed') !== false, 'no eIDAS selection says None listed');
$check(strpos($section($pers, 'eidas'), 'Q_CERT_ESEAL') === false, 'personal wallets only list personal eIDAS options');

// Pricing, license, recognitions.
$check(strpos($section($biz, 'pricing'), 'No pricing information provided.') !== false, 'business without pricing says so');
$check(strpos($section($pers, 'pricing'), 'Free for individuals.') !== false, 'personal full pricing is shown');
$glance = static function (string $html): string {
    $start = strpos($html, 'aria-labelledby="glance-title"');
    return $start === false ? '' : substr($html, $start, strpos($html, '</section>', $start) - $start);
};
$check(strpos($glance($pers), '<dt>License</dt><dd>Open Source (Apache') !== false, 'open-source license in At a glance');
$check(strpos($glance($biz), '<dt>License</dt>') === false, 'no license data: no license row (not Proprietary)');
$check(strpos($glance($render(W_BIZ_COMM)), '<dt>License</dt><dd>Proprietary</dd>') !== false, 'openSource false: Proprietary');
$check(strpos($glance($render(W_LINKED)), '<dt>License</dt><dd>Open Source</dd>') !== false, 'openSource true without license: Open Source');
$check(strpos($glance($render(W_EDGE)), '<dt>License</dt><dd>MIT</dd>') !== false, 'explicit license without openSource: the license');
$tech_section = $section($biz, 'technical');
$check(strpos($biz, 'id="technical" aria-labelledby="technical-title" data-fides-ds-collapsible="closed"') !== false && strpos($biz, 'data-fides-ds-collapsible-body id="technical-body"') !== false, 'technical details use the shared narrow-screen accordion');
$check(strpos($biz, 'id="eidas" aria-labelledby="eidas-title" data-fides-ds-collapsible="closed"') !== false && strpos($biz, 'data-fides-ds-collapsible-body id="eidas-body"') !== false, 'eIDAS uses the shared narrow-screen accordion');
$linked_html = $render(W_LINKED);
$check(strpos($linked_html, 'fides-wallet-detail__technical--main" id="technical" aria-labelledby="technical-title" data-fides-ds-collapsible="closed"') !== false, 'technical in the main column (no use cases) keeps the accordion');
$check(strpos($glance($biz), '<dt>Status</dt><dd>Production</dd>') !== false, 'status in At a glance');
$check(strpos($section($pers, 'pricing'), 'License') === false, 'license not repeated under pricing');
$check(strpos($biz, 'fill="#34A853"') === false && strpos($pers, 'fill="#34A853"') !== false, 'Google Play button uses the Play mark');
$recog = $section($pers, 'recognitions');
$check(strpos($recog, 'Plain certificate') !== false && strpos($recog, '<a ') === false, 'certificate without URL is plain text');

// Limited (Community) listings.
$comm = $render(W_PERS_COMM);
$check(strpos($comm, 'Community listing') !== false, 'community listing badge');
$check(strpos($comm, 'id="features"') === false, 'community listing hides features');
$check(strpos($comm, 'fides-wallet-store') === false, 'community listing has no store buttons');
$check(strpos($comm, 'community.example.org') === false, 'community listing hides the website');
$check(strpos($comm_biz, 'Visit wallet website') === false, 'community business listing has no website action');

// Edge record: long name, long text, broken logo.
$check(strpos($edge, 'data-fides-ds-readmore="8"') !== false, 'long overview uses read-more');
$check(strpos($edge, 'broken.invalid/logo.png') !== false, 'logo rendered; a load error removes the box client-side');
$check(strpos($comm_biz, 'fides-ds-card__img') === false, 'no logo: no placeholder slot');

// Missing wallet.
$missing = $render('pilot-test-does-not-exist');
$check(strpos($missing, 'This wallet is not in the current FIDES catalog.') !== false, 'unknown id shows the missing state');

// Access: guests.
$guest = array('isLoggedIn' => false, 'isAdmin' => false, 'ownedOrgIds' => array(), 'proOrgIds' => array(), 'fullOrgIds' => array());
$html  = $render(W_BIZ_PRO, $guest);
$check(strpos($html, 'Sign in to suggest an update') === false && strpos($html, 'Suggest an update') === false, 'guest on an Official listing: no update or sign-in call');
$html = $render(W_PERS_COMM, $guest);
$check(strpos($html, 'Sign in to suggest an update') !== false, 'guest on a Community listing gets the sign-in call');
$html = $render(W_LINKED, $guest + array());
$check(strpos($html, 'Sign in to suggest an update') !== false, 'linked listing without tier is Community for a guest without Pro ids');
$html = $render(W_LINKED, array_merge($guest, array('proOrgIds' => array(ORG_LINKED))));
$check(strpos($html, 'Sign in to suggest an update') === false, 'linked Pro account (proOrgIds) suppresses the guest sign-in call');

// Access: signed in.
$members = get_users(array('role' => 'subscriber', 'number' => 1, 'fields' => 'ID'));
$admins  = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ID'));
if ($members) {
    wp_set_current_user((int) $members[0]);
    $member = array('isLoggedIn' => true, 'isAdmin' => false, 'ownedOrgIds' => array(), 'proOrgIds' => array(), 'fullOrgIds' => array());
    $html   = $render(W_BIZ_PRO, $member);
    $check(strpos($html, 'Suggest an update') === false && strpos($html, 'Sign in to suggest an update') === false, 'member without rights: no update call on an Official listing');
    $html = $render(W_PERS_COMM, $member);
    $check(strpos($html, 'Suggest an update') !== false && strpos($html, 'Sign in to suggest an update') === false, 'member gets Suggest an update on a Community listing');
    $check(strpos($html, 'wallet=' . W_PERS_COMM) !== false, 'update link carries the wallet id');
    $html = $render(W_BIZ_PRO, array_merge($member, array('ownedOrgIds' => array(ORG_PRO))));
    $check(strpos($html, 'Suggest an update') !== false, 'owner of the Pro organization gets Suggest an update');
    $html = $render(W_LINKED, array_merge($member, array('proOrgIds' => array(ORG_LINKED))));
    $check(strpos($html, 'Suggest an update') === false, 'member without ownership is denied a linked Pro listing');
    $html = $render(W_BIZ_COMM, array_merge($member, array('fullOrgIds' => array(ORG_COMM))));
    $check(strpos($html, 'Visit wallet website') !== false, 'fullOrgIds unlock full fields on a Community listing');
} else {
    $check(false, 'no subscriber user for the signed-in checks');
}
if ($admins) {
    wp_set_current_user((int) $admins[0]);
    $html = $render(W_BIZ_PRO, array('isLoggedIn' => true, 'isAdmin' => true, 'ownedOrgIds' => array(), 'proOrgIds' => array(), 'fullOrgIds' => array()));
    $check(strpos($html, 'Suggest an update') !== false, 'administrator gets Suggest an update on an Official listing');
    $check(preg_match('~fides-uc-detail__sections-update"><a href="[^"#]+"~', $html) === 1, 'section nav links to the update form for an authorised user');
}
wp_set_current_user(0);

// Tier UI off: every field public, no listing badges, signed-in users may update.
remove_filter('fides_catalog_tier_ui_force_enable', $tier_on);
$tier_off = static function () {
    return false;
};
add_filter('fides_catalog_tier_ui_force_enable', $tier_off);
$html = $render(W_PERS_COMM, $guest);
$check(strpos($html, 'Community listing') === false && strpos($html, 'Official listing') === false, 'tier UI off: no listing badges');
$check(strpos($html, 'id="features"') !== false && strpos($html, 'fides-wallet-store--ios') !== false, 'tier UI off: full fields for every listing');
remove_filter('fides_catalog_tier_ui_force_enable', $tier_off);

// Sign-in return URL keeps the whole detail URL, including the origin.
$saved_server = array($_SERVER['HTTP_HOST'] ?? null, $_SERVER['REQUEST_URI'] ?? null);
$_SERVER['HTTP_HOST']   = 'pilot.example';
$_SERVER['REQUEST_URI'] = '/wallet/?wallet=credenco-wallet&from=usecase%3Aalpha';
$oid4vp = static function () {
    return array('loginUrl' => 'https://pilot.example/signin/');
};
add_filter('pre_option_universal_openid4vp_options', $oid4vp);
$login = Fides_Wallet_Catalog_Submission_Forms::form_login_url();
remove_filter('pre_option_universal_openid4vp_options', $oid4vp);
parse_str((string) wp_parse_url($login, PHP_URL_QUERY), $login_query);
$check(array_keys($login_query) === array('return_to')
    && ($login_query['return_to'] ?? '') === 'http://pilot.example/wallet/?wallet=credenco-wallet&from=usecase%3Aalpha',
    'sign-in return_to wraps the full wallet URL: ' . $login);
list($_SERVER['HTTP_HOST'], $_SERVER['REQUEST_URI']) = $saved_server;
$_GET = array();

$flush();

foreach ($results['fail'] as $message) {
    echo "not ok - {$message}\n";
}
printf("# pass %d\n# fail %d\n", $results['pass'], count($results['fail']));
if ($results['fail']) {
    exit(1);
}
