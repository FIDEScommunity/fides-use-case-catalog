<?php
/**
 * Plugin Name: FIDES Learn trial
 * Description: Theme header and footer for Learn on the local production copy and on staging.fides.community. Catalog paths resolve to that site's existing pages. Production hosts are left unchanged. Remove this file to return Learn to the design-shell default.
 *
 * Does not change WPML, TranslatePress, or any language switcher. The design shell's own switcher is not used while chrome is "theme".
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Which site this file may change. Empty means: do nothing to chrome or catalog links.
 * fides.community and www.fides.community stay empty on purpose.
 */
function fides_learn_trial_profile(): string {
    $host = strtolower((string) wp_parse_url(home_url(), PHP_URL_HOST));
    if ($host === 'staging.fides.community') {
        return 'staging';
    }
    if ($host === 'utrecht-demo.local') {
        return 'local';
    }
    return '';
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
    if (fides_learn_trial_profile() === 'staging') {
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
        '/learn/sessions/request/',
        '/services/',
        '/start/receive/',
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
    if ($profile === 'staging') {
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
