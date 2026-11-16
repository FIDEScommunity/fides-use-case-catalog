<?php
/**
 * Plugin Name: FIDES Learn trial
 * Description: Local trial only. Learn pages use the active theme header and footer, and stored pilot catalog paths resolve to this site's existing catalogs. Remove this file to return Learn to the design-shell default.
 *
 * Does not change WPML, TranslatePress, or any language switcher. The design shell's own switcher is not used while chrome is "theme".
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * This copy lists every page in the header. Keep the trial pages out of that
 * automatic list so the existing menu stays as it was. The pages remain at their URLs.
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
    if ($path === '/community-tools/glossary/') {
        return home_url('/glossary/');
    }
    return $url;
}, 10, 2);

add_filter('fides_ds_learn_chrome', static function (): string {
    $choice = (string) get_option('fides_learn_trial_chrome', 'theme');
    return $choice === 'shell' ? 'shell' : 'theme';
});

/**
 * Stored pilot paths => pages that exist on the local utrecht-demo copy.
 * A site shaped like fides.community uses the other map in learn-trial/INSTALL.md.
 * Relying parties have no page on this copy, so that path is not mapped.
 *
 * @param mixed $map
 * @return array<string,string>
 */
add_filter('fides_ds_learn_catalog_bases', static function ($map): array {
    unset($map);
    return array(
        '/personal-wallets/' => '/wallet-catalog/',
        '/business-wallets/' => '/business-wallets/',
        '/credentials/'      => '/credential-catalog/',
        '/overview/'         => '/use-cases/',
        '/use-case/'         => '/use-cases/',
        '/issuers/'          => '/issuer-catalog/',
        '/organizations/'    => '/organizations/',
    );
});
