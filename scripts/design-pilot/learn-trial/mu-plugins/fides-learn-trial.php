<?php
/**
 * Plugin Name: FIDES Learn trial
 * Description: Theme header and footer for Learn on the local production copy, staging.fides.community and fides.community. Catalog paths resolve to that site's existing pages. Remove this file to return Learn to the design-shell default. Copying this file is the chrome switch. The seed still dry-runs until LEARN_APPLY=1.
 *
 * Does not change WPML, TranslatePress, or any language switcher. The design shell's own switcher is not used while chrome is "theme".
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Which site this file may change. Empty means: do nothing to chrome or catalog links.
 * Production is explicit: fides.community and www.fides.community use the live catalog paths.
 */
function fides_learn_trial_profile(): string {
    $host = strtolower((string) wp_parse_url(home_url(), PHP_URL_HOST));
    if ($host === 'staging.fides.community') {
        return 'staging';
    }
    if ($host === 'fides.community' || $host === 'www.fides.community') {
        return 'production';
    }
    if ($host === 'utrecht-demo.local') {
        return 'local';
    }
    return '';
}

/** Staging and production share the live site's catalog, glossary and contact paths. */
function fides_learn_trial_live_site(): bool {
    $profile = fides_learn_trial_profile();
    return $profile === 'staging' || $profile === 'production';
}

function fides_learn_trial_is_learn_page(): bool {
    if (! is_singular('page') || ! class_exists('Fides_DS_Learn')) {
        return false;
    }
    return get_page_template_slug() === Fides_DS_Learn::TEMPLATE;
}

/**
 * Keep seeded Learn pages out of an automatic page list so the existing header menu stays as it was.
 *
 * @param mixed $exclude
 * @return int[]
 */
add_filter('wp_list_pages_excludes', static function ($exclude): array {
    $exclude = is_array($exclude) ? $exclude : array();
    $pages   = get_posts(array(
        'post_type'   => 'page',
        'post_status' => 'any',
        'numberposts' => -1,
        'fields'      => 'ids',
        'meta_key'    => '_fides_learn_seed',
    ));
    return array_values(array_unique(array_merge($exclude, array_map('intval', $pages))));
});

add_filter('fides_site_shell_url', static function ($url, $path) {
    if (fides_learn_trial_profile() === 'local' && $path === '/community-tools/glossary/') {
        return home_url('/glossary/');
    }
    return $url;
}, 10, 2);

add_filter('fides_ds_learn_chrome', static function (string $chrome): string {
    if (fides_learn_trial_profile() === '') {
        return $chrome;
    }
    $choice = (string) get_option('fides_learn_trial_chrome', 'theme');
    return $choice === 'shell' ? 'shell' : 'theme';
});

/**
 * Stored pilot paths => pages that exist on this site.
 * Theme mode rewrites at render time. Shell mode leaves the stored paths alone.
 *
 * @param mixed $map
 * @return array<string,string>
 */
add_filter('fides_ds_learn_catalog_bases', static function ($map): array {
    unset($map);
    if (fides_learn_trial_live_site()) {
        return array(
            '/personal-wallets/'  => '/ecosystem-explorer/personal-wallets/',
            '/business-wallets/'  => '/ecosystem-explorer/organizational-wallets/',
            '/credentials/'       => '/ecosystem-explorer/credential-catalog/',
            '/overview/'          => '/ecosystem-explorer/use-cases/',
            '/use-case/'          => '/ecosystem-explorer/use-cases/',
            '/issuers/'           => '/ecosystem-explorer/issuer-catalog/',
            '/relying-parties/'   => '/ecosystem-explorer/relying-party-catalog/',
            '/organizations/'     => '/organizations/',
        );
    }
    if (fides_learn_trial_profile() === 'local') {
        return array(
            '/personal-wallets/' => '/wallet-catalog/',
            '/business-wallets/' => '/business-wallets/',
            '/credentials/'      => '/credential-catalog/',
            '/overview/'         => '/use-cases/',
            '/use-case/'         => '/use-cases/',
            '/issuers/'          => '/issuer-catalog/',
            '/relying-parties/'  => '/relying-party-websites/',
            '/organizations/'    => '/organizations/',
        );
    }
    return array();
});

/**
 * Paths this site does not have. Theme chrome drops buttons to these paths and
 * turns an ordinary link into its text. Shell chrome never calls this.
 *
 * @param mixed $paths
 * @return string[]
 */
add_filter('fides_ds_learn_unavailable_paths', static function ($paths): array {
    if (fides_learn_trial_profile() === '') {
        return is_array($paths) ? $paths : array();
    }
    return array(
        '/services/',
        '/start/receive/',
    );
});

/**
 * Training and workshop buttons open the existing contact page. The stored
 * enquiry link is left in the page for the design shell. No offering and no date
 * is added, so the button does not look like a registration.
 *
 * @param mixed $spec
 * @return array<string,mixed>
 */
add_filter('fides_ds_learn_contact_buttons', static function ($spec): array {
    unset($spec);
    if (fides_learn_trial_profile() === '') {
        return array();
    }
    return array(
        'from'    => '/learn/sessions/request/',
        'url'     => '/about-fides/contact/',
        'default' => 'Contact us about this training',
        'labels'  => array(
            'eudi-business-wallets-in-practice' => 'Contact us about this training',
            'interest'                          => 'Contact us about this training',
            'wallet-introduction'               => 'Contact us about this introduction session',
            'wallet-readiness-workshop'         => 'Contact us about this workshop',
            'training-partnerships'             => 'Contact us about this partnership',
        ),
    );
});

/**
 * Country above the training offer. The Netherlands shows the open sessions.
 * Another country shows an empty state. Training partnerships stays visible.
 *
 * @param mixed $spec
 * @return array<string,mixed>
 */
add_filter('fides_ds_learn_country_picker', static function ($spec): array {
    unset($spec);
    if (fides_learn_trial_profile() === '') {
        return array();
    }
    return array(
        'default' => 'NL',
        'options' => array(
            'NL'    => 'The Netherlands',
            'BE'    => 'Belgium',
            'DE'    => 'Germany',
            'FR'    => 'France',
            'LU'    => 'Luxembourg',
            'IE'    => 'Ireland',
            'ES'    => 'Spain',
            'IT'    => 'Italy',
            'OTHER' => 'Other',
        ),
    );
});

/**
 * Query keys the existing catalogs actually apply. A link whose query is not in
 * this list is shown as a plain catalog link. ?usecase= and ?country= stay where
 * the catalog reads them.
 *
 * @param mixed $filters
 * @return array<string,array{keys:string[],label:string}>
 */
add_filter('fides_ds_learn_supported_filters', static function ($filters): array {
    unset($filters);
    $profile = fides_learn_trial_profile();
    if ($profile === '') {
        return array();
    }
    $wallet = array('country', 'profile', 'wallets', 'wallet');
    $org    = array('country', 'sector', 'org');
    $use    = array('theme', 'usecase');
    $cred   = array('credential', 'credentials', 'sector', 'theme');
    $issuer = array('issuer', 'issuers', 'sector', 'country', 'theme');
    $rp     = array('rp', 'rps', 'profile', 'sector', 'country', 'theme');
    $spec   = static function (array $keys, string $label): array {
        return array('keys' => $keys, 'label' => $label);
    };
    if ($profile === 'staging' || $profile === 'production') {
        return array(
            '/ecosystem-explorer/personal-wallets/'       => $spec($wallet, 'Browse personal wallets'),
            '/ecosystem-explorer/organizational-wallets/' => $spec($wallet, 'Browse business wallets'),
            '/ecosystem-explorer/credential-catalog/'     => $spec($cred, 'Browse credential types'),
            '/ecosystem-explorer/use-cases/'              => $spec($use, 'Browse use cases'),
            '/ecosystem-explorer/issuer-catalog/'         => $spec($issuer, 'Browse issuers'),
            '/ecosystem-explorer/relying-party-catalog/'  => $spec($rp, 'Browse relying parties'),
            '/organizations/'                             => $spec($org, 'Browse organisations'),
        );
    }
    return array(
        '/wallet-catalog/'         => $spec($wallet, 'Browse personal wallets'),
        '/business-wallets/'       => $spec($wallet, 'Browse business wallets'),
        '/credential-catalog/'     => $spec($cred, 'Browse credential types'),
        '/use-cases/'              => $spec($use, 'Browse use cases'),
        '/issuer-catalog/'         => $spec($issuer, 'Browse issuers'),
        '/relying-party-websites/' => $spec($rp, 'Browse relying parties'),
        '/organizations/'          => $spec($org, 'Browse organisations'),
    );
});

/**
 * Staging Learn pages stay out of the index. Production keeps the site's own
 * indexing settings and does not set a per-page robots value.
 */
add_filter('wpseo_robots', static function ($robots) {
    if (fides_learn_trial_profile() !== 'staging' || ! fides_learn_trial_is_learn_page()) {
        return $robots;
    }
    return 'noindex, nofollow';
});

add_filter('wp_robots', static function ($robots) {
    if (fides_learn_trial_profile() !== 'staging' || ! fides_learn_trial_is_learn_page()) {
        return is_array($robots) ? $robots : array();
    }
    $robots = is_array($robots) ? $robots : array();
    $robots['noindex']  = true;
    $robots['nofollow'] = true;
    unset($robots['index'], $robots['follow']);
    return $robots;
});

/**
 * On staging, the canonical and Open Graph URL of a Learn page point at the
 * production permalink. The value is not stored, so production does not inherit
 * a staging address. Production uses the permalink Yoast already prints.
 */
function fides_learn_trial_public_url($url): string {
    if (fides_learn_trial_profile() !== 'staging' || ! fides_learn_trial_is_learn_page()) {
        return (string) $url;
    }
    $path  = (string) wp_parse_url((string) $url, PHP_URL_PATH);
    $query = wp_parse_url((string) $url, PHP_URL_QUERY);
    if ($path === '') {
        $path = '/';
    }
    $public = 'https://fides.community' . $path;
    if (is_string($query) && $query !== '') {
        $public .= '?' . $query;
    }
    return $public;
}

add_filter('wpseo_canonical', 'fides_learn_trial_public_url');
add_filter('wpseo_opengraph_url', 'fides_learn_trial_public_url');

/**
 * If Yoast has no image for this Learn page, use the site's FIDES logo attachment.
 * The URL is resolved on the current site, so production does not store a staging address.
 */
add_filter('wpseo_opengraph_image', static function ($image) {
    if (fides_learn_trial_profile() === '' || ! fides_learn_trial_is_learn_page()) {
        return $image;
    }
    if (is_string($image) && $image !== '') {
        return $image;
    }
    $found = get_posts(array(
        'post_type'      => 'attachment',
        'post_status'    => 'inherit',
        'posts_per_page' => 1,
        'meta_key'       => '_wp_attached_file',
        'meta_value'     => '2025/03/FIDES_LOGO_BLUE_03.png',
        'fields'         => 'ids',
    ));
    if (! $found) {
        return $image;
    }
    $url = wp_get_attachment_url((int) $found[0]);
    return is_string($url) && $url !== '' ? $url : $image;
});

/**
 * The training meta description must not fall back to the stored design-shell intro.
 */
add_filter('wpseo_metadesc', static function ($description) {
    if (fides_learn_trial_profile() === '' || ! fides_learn_trial_is_learn_page()) {
        return $description;
    }
    $text = trim(wp_strip_all_tags((string) $description));
    if ($text !== '' && ! str_contains($text, 'Join an open training in Utrecht')) {
        return $description;
    }
    $stored = json_decode((string) get_post_meta(get_queried_object_id(), '_fides_learn_seo', true), true);
    $seeded = is_array($stored) ? trim((string) ($stored['_yoast_wpseo_metadesc'] ?? '')) : '';
    return $seeded !== '' ? $seeded : $description;
});
