<?php
/**
 * Read-only preflight for the design pilot on a target site (staging/seed.sh runs it first).
 * Writes nothing. Exit code 1 when a FAIL row exists.
 *
 * Environment: PILOT_BASE (default design-review here), PILOT_ALLOWED_HOSTS, PILOT_PACKAGE_MANIFEST (manifest.json of the package).
 */

if (! defined('ABSPATH')) {
    fwrite(STDERR, "Run through WP-CLI.\n");
    exit(1);
}
require __DIR__ . '/seed-guard.php';
if (! fides_pilot_standalone()) {
    putenv('PILOT_BASE=' . (getenv('PILOT_BASE') ?: 'design-review'));
}
$ctx  = fides_pilot_seed_context(); // refuses production and hosts outside the allow-list
$base = $ctx['base'];
$sa   = $ctx['standalone'];
$rows = array();
$add  = static function (string $level, string $check, string $detail = '') use (&$rows) {
    $rows[] = array($level, $check, $detail);
};

// Site basics.
$add('PASS', 'host allowed for seeding', $ctx['host']);
$add($sa ? 'PASS' : 'INFO', 'layout', $sa ? 'standalone: home_url() ' . home_url() . ' (pilot pages at the site root)' : 'subpath /' . $base . '/');
if ($sa) {
    $add(rtrim(site_url(), '/') === rtrim(home_url(), '/') ? 'PASS' : 'WARN', 'site_url equals home_url', site_url() . ' / ' . home_url());
}
$add(get_option('permalink_structure') !== '' ? 'PASS' : 'FAIL', 'pretty permalinks', (string) get_option('permalink_structure'));
$add('INFO', 'environment type', function_exists('wp_get_environment_type') ? wp_get_environment_type() : 'unknown');
$add(get_option('blog_public') ? 'INFO' : 'PASS', 'site search visibility', get_option('blog_public') ? 'site is indexable; pilot pages still get noindex from the config mu-plugin' : 'discouraged');
$tpl = (string) get_option('template');
$add($tpl === 'blocksy' ? 'PASS' : 'WARN', 'parent theme blocksy', $tpl . ' / child ' . get_option('stylesheet'));

// Plugins at the packaged versions (manifest.json "plugins": slug => version).
$manifest_path = (string) (getenv('PILOT_PACKAGE_MANIFEST') ?: dirname(__DIR__, 2) . '/manifest.json');
$manifest      = is_readable($manifest_path) ? json_decode((string) file_get_contents($manifest_path), true) : array();
$required      = is_array($manifest['plugins'] ?? null) ? $manifest['plugins'] : array();
require_once ABSPATH . 'wp-admin/includes/plugin.php';
$installed = array();
foreach (get_plugins() as $file => $data) {
    $installed[ dirname($file) ] = array('file' => $file, 'version' => $data['Version']);
}
foreach ($required as $slug => $version) {
    if (! isset($installed[ $slug ])) {
        $add('FAIL', 'plugin ' . $slug, 'not installed (package ' . $version . ')');
        continue;
    }
    $active = is_plugin_active($installed[ $slug ]['file']);
    $same   = version_compare($installed[ $slug ]['version'], (string) $version, '>=');
    $add(! $active ? 'FAIL' : ($same ? 'PASS' : 'FAIL'), 'plugin ' . $slug, ($active ? 'active ' : 'INACTIVE ') . $installed[ $slug ]['version'] . ' (package ' . $version . ')');
}
foreach (array('wpforms-lite' => 'Manifesto sign form', 'complianz-gdpr' => 'consent banner', 'fides-assistant' => 'Ask FIDES item in the Learn bar (optional)') as $slug => $why) {
    $add(isset($installed[ $slug ]) && is_plugin_active($installed[ $slug ]['file']) ? 'PASS' : 'WARN', 'plugin ' . $slug, $why);
}

// Classes the pilot needs.
foreach (array('Fides_Catalog_SSR_Renderer', 'Fides_DS_Site_Shell', 'Fides_DS_Learn', 'Fides_DS_Manifesto', 'Fides_DS_About', 'Fides_DS_Updates') as $class) {
    $add(class_exists($class) ? 'PASS' : 'FAIL', 'class ' . $class);
}

// Config mu-plugin.
if (function_exists('fides_design_review_base')) {
    $add(fides_design_review_base() === $base && fides_design_review_standalone() === $sa ? 'PASS' : 'FAIL', 'config mu-plugin layout matches the seed', (fides_design_review_standalone() ? 'standalone' : 'subpath ' . fides_design_review_base()) . ' / ' . ($sa ? 'standalone' : 'subpath ' . $base));
    $add('INFO', 'outgoing writes', defined('FIDES_DESIGN_REVIEW_OUTGOING') ? (string) FIDES_DESIGN_REVIEW_OUTGOING : 'blocklist (default)');
    $add('INFO', 'mail', defined('FIDES_DESIGN_REVIEW_ALLOW_MAIL') && FIDES_DESIGN_REVIEW_ALLOW_MAIL ? 'allowed' : 'not sent');
} else {
    $add('FAIL', 'config mu-plugin fides-design-review-config.php', 'not loaded');
}

// Existing pages the pilot links to (they are not part of the package).
$deps = array(
    'use-case-form'       => array('FAIL', 'Submit a use case (aanvraagroute for use cases)'),
    'organizations-submit' => array('FAIL', 'Submit an organization'),
    'organizations-update' => array('WARN', 'Update an organization'),
    'wallet-submit'       => array('FAIL', 'Submit a wallet'),
    'credential-submit'   => array('FAIL', 'Submit a credential type'),
    'wallets-update'      => array('WARN', 'Update a wallet (default update path of the wallet catalog)'),
    'credentials-update'  => array('WARN', 'Update a credential type (default update path of the credential catalog)'),
    'glossary'            => array('FAIL', 'Glossary page used by Learn articles'),
    'manifesto'           => array('WARN', 'Existing Manifesto page with the sign form (#ratify-the-fides-manifesto-today); the pilot page works without it, only the sign button needs it'),
    'explorer'            => array('WARN', 'Ecosystem explorer'),
    'map'                 => array('WARN', 'Map'),
    'theme'               => array('WARN', 'Theme page'),
    'issuer-catalog'      => array('WARN', 'Issuer catalog'),
    'relying-party-websites' => array('WARN', 'Relying party catalog'),
);
// Standalone: the form pages and the glossary are seeded by the package; the other destinations are not on this site
// and the shell links to the live site for them (read-only links, FIDES_DESIGN_REVIEW_LIVE_FALLBACK).
$seeded_here = array('use-case-form', 'organizations-submit', 'organizations-update', 'wallet-submit', 'credential-submit', 'wallets-update', 'credentials-update', 'glossary');
foreach ($deps as $path => $info) {
    $page = get_page_by_path($path, OBJECT, 'page');
    if ($sa) {
        $own = $page && get_post_meta($page->ID, '_fides_pilot_seed', true) !== '';
        if (in_array($path, $seeded_here, true)) {
            $add($page && ! $own ? 'WARN' : 'INFO', 'page /' . $path . '/', $page ? ($own ? 'seeded earlier; later edits are kept' : 'exists and is not made by the seed; it is kept') : 'seeded by this package: ' . $info[1]);
        } else {
            $add('INFO', 'page /' . $path . '/', 'not seeded; links to it go to the live site: ' . $info[1]);
        }
        continue;
    }
    $add($page && $page->post_status === 'publish' ? 'PASS' : $info[0], 'existing page /' . $path . '/', $info[1]);
}
$manifesto = $sa ? null : get_page_by_path('manifesto', OBJECT, 'page');
if ($manifesto) {
    $has_form = (bool) preg_match('/\[wpforms|wp:wpforms|ratify-the-fides-manifesto-today/', (string) $manifesto->post_content);
    $add($has_form ? 'PASS' : 'WARN', 'sign form on /manifesto/', $has_form ? 'form or anchor found in the page content' : 'no WPForms block or anchor found; the sign button links to /manifesto/#ratify-the-fides-manifesto-today');
}

// The base path.
if ($sa) {
    $index = get_page_by_path('pilot-pages', OBJECT, 'page');
    $add($index ? 'INFO' : 'PASS', 'page /pilot-pages/', $index ? 'exists (seeded earlier or made by an editor)' : 'free, the seed creates it');
    $add((int) get_option('page_on_front') > 0 ? 'INFO' : 'PASS', 'front page', (int) get_option('page_on_front') > 0 ? 'already set (page ' . (int) get_option('page_on_front') . '), the seed keeps it' : 'not set: the seed makes the pilot homepage the front page');
    $base_page = null;
} else {
    $base_page = get_page_by_path($base, OBJECT, 'page');
}
if ($sa) {
    // nothing else to check for the base
} elseif ($base_page) {
    $seeded = get_post_meta($base_page->ID, '_fides_pilot_seed', true) !== '';
    $add($seeded ? 'PASS' : 'WARN', "page /{$base}/ exists", $seeded ? 'seeded earlier; later edits are kept' : 'not made by the seed; it is kept and the pilot pages become its children');
} else {
    $add('PASS', "page /{$base}/ is free", 'the seed creates it');
}
$conflicts = array();
foreach (array('overview', 'use-case', 'organizations', 'organization', 'personal-wallets', 'business-wallets', 'wallet', 'credentials', 'credential', 'about-fides', 'manifesto', 'updates', 'learn', 'start', 'homepage-fragment', 'use-case-form', 'organizations-submit', 'organizations-update', 'wallet-submit', 'credential-submit', 'wallets-update', 'credentials-update', 'glossary') as $slug) {
    $p = get_page_by_path($sa ? $slug : $base . '/' . $slug, OBJECT, 'page');
    if ($p && get_post_meta($p->ID, '_fides_pilot_seed', true) === '' && get_post_meta($p->ID, '_fides_learn_seed', true) === '') {
        $conflicts[] = $slug;
    }
}
$add($conflicts ? 'WARN' : 'PASS', 'pilot paths free of unmarked pages', $conflicts ? 'kept untouched: ' . implode(', ', $conflicts) : '');

// Options an editor owns (seeded only when absent).
foreach (array('fides_use_case_featured', 'fides_ds_updates', 'fides_ds_editorial_links') as $option) {
    $add('INFO', 'option ' . $option, get_option($option, null) === null ? 'absent: the seed creates it' : 'present: kept');
}

foreach ($rows as $row) {
    echo str_pad($row[0], 6) . str_pad($row[1], 52) . $row[2] . "\n";
}
$counts = array_count_values(array_column($rows, 0));
ksort($counts);
echo 'SUMMARY ' . wp_json_encode($counts) . "\n";
exit(in_array('FAIL', array_column($rows, 0), true) ? 1 : 0);
