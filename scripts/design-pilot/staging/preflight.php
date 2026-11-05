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
putenv('PILOT_BASE=' . (getenv('PILOT_BASE') ?: 'design-review'));
$ctx  = fides_pilot_seed_context(); // refuses production and hosts outside the allow-list
$base = $ctx['base'];
$rows = array();
$add  = static function (string $level, string $check, string $detail = '') use (&$rows) {
    $rows[] = array($level, $check, $detail);
};

// Site basics.
$add('PASS', 'host allowed for seeding', $ctx['host']);
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
    $add(fides_design_review_base() === $base ? 'PASS' : 'FAIL', 'config mu-plugin base matches PILOT_BASE', fides_design_review_base() . ' / ' . $base);
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
    'glossary'            => array('FAIL', 'Glossary page used by Learn articles'),
    'manifesto'           => array('FAIL', 'Manifesto page with the sign form (#ratify-the-fides-manifesto-today)'),
    'explorer'            => array('WARN', 'Ecosystem explorer'),
    'map'                 => array('WARN', 'Map'),
    'theme'               => array('WARN', 'Theme page'),
    'issuer-catalog'      => array('WARN', 'Issuer catalog'),
    'relying-party-websites' => array('WARN', 'Relying party catalog'),
);
foreach ($deps as $path => $info) {
    $page = get_page_by_path($path, OBJECT, 'page');
    $add($page && $page->post_status === 'publish' ? 'PASS' : $info[0], 'existing page /' . $path . '/', $info[1]);
}
$manifesto = get_page_by_path('manifesto', OBJECT, 'page');
if ($manifesto) {
    $has_form = (bool) preg_match('/\[wpforms|wp:wpforms|ratify-the-fides-manifesto-today/', (string) $manifesto->post_content);
    $add($has_form ? 'PASS' : 'WARN', 'sign form on /manifesto/', $has_form ? 'form or anchor found in the page content' : 'no WPForms block or anchor found; the sign button links to /manifesto/#ratify-the-fides-manifesto-today');
}

// The base path.
$base_page = get_page_by_path($base, OBJECT, 'page');
if ($base_page) {
    $seeded = get_post_meta($base_page->ID, '_fides_pilot_seed', true) !== '';
    $add($seeded ? 'PASS' : 'WARN', "page /{$base}/ exists", $seeded ? 'seeded earlier; later edits are kept' : 'not made by the seed; it is kept and the pilot pages become its children');
} else {
    $add('PASS', "page /{$base}/ is free", 'the seed creates it');
}
$conflicts = array();
foreach (array('overview', 'use-case', 'organizations', 'organization', 'personal-wallets', 'business-wallets', 'wallet', 'credentials', 'credential', 'about-fides', 'manifesto', 'updates', 'learn', 'start') as $slug) {
    $p = get_page_by_path($base . '/' . $slug, OBJECT, 'page');
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
