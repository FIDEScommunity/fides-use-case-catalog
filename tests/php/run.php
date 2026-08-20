<?php
/**
 * Regression tests for share-URL listing detection and mixed-case use-case ids.
 *
 * Run from the repo root:
 *   php tests/php/run.php
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}

$plugin = dirname(__DIR__, 2) . '/wordpress-plugin/fides-use-case-catalog';
require $plugin . '/includes/use-case-id.php';
require $plugin . '/includes/use-case-share-url.php';

$failures = 0;
$passes = 0;

function expect_same($actual, $expected, string $label): void {
    global $failures, $passes;
    if ($actual !== $expected) {
        $failures++;
        fwrite(STDERR, "FAIL {$label}\n  expected: " . var_export($expected, true) . "\n  actual:   " . var_export($actual, true) . "\n");
        return;
    }
    $passes++;
    echo "ok {$label}\n";
}

$aliases = array_merge(
    array('/ecosystem-explorer/use-cases/'),
    fides_use_case_catalog_default_listing_path_aliases()
);

$listing_paths = array(
    '/ecosystem-explorer/use-cases/',
    '/ecosystem-explorer/use-cases',
    '/use-cases/',
    '/use-cases',
);

foreach ($listing_paths as $path) {
    expect_same(
        fides_use_case_catalog_path_is_exact_listing($path, $aliases),
        true,
        "listing path redirects: {$path}"
    );
}

$form_paths = array(
    '/ecosystem-explorer/use-cases/update-use-case/',
    '/ecosystem-explorer/use-cases/update-use-case',
    '/use-cases/update-use-case/',
    '/use-cases/update/',
    '/use-case/trusted-service-assistant-IyxXZl/',
    '/submit-use-case/',
    '/',
    '',
);

foreach ($form_paths as $path) {
    expect_same(
        fides_use_case_catalog_path_is_exact_listing($path, $aliases),
        false,
        "non-listing path must not redirect: {$path}"
    );
}

expect_same(
    fides_use_case_catalog_is_listing_request_path('/use-cases/'),
    true,
    'default aliases treat /use-cases/ as listing without WP listing_path()'
);
expect_same(
    fides_use_case_catalog_is_listing_request_path('/ecosystem-explorer/use-cases/update-use-case/'),
    false,
    'update form nested under listing must not count as listing'
);

$mixed = array(
    'trusted-service-assistant-IyxXZl',
    'samsung-sds-integrated-digital-wallet-b5dcHk',
    'end-to-end-digital-business-workflows-F665Dh',
    'altme-demo',
);

foreach ($mixed as $id) {
    expect_same(
        fides_use_case_catalog_sanitize_use_case_id($id),
        $id,
        "sanitize preserves mixed-case id: {$id}"
    );
    expect_same(
        fides_use_case_catalog_is_valid_use_case_id($id),
        true,
        "id is valid: {$id}"
    );
}

expect_same(fides_use_case_catalog_sanitize_use_case_id(''), '', 'empty id is rejected');
expect_same(fides_use_case_catalog_sanitize_use_case_id('../etc/passwd'), '', 'path traversal id is rejected');
expect_same(fides_use_case_catalog_sanitize_use_case_id('has space'), '', 'whitespace id is rejected');
expect_same(fides_use_case_catalog_sanitize_use_case_id('-leading-dash'), '', 'leading dash id is rejected');

$route = '#^/submissions/(?P<use_case_id>' . FIDES_USE_CASE_ID_ROUTE_PATTERN . ')$#';
foreach ($mixed as $id) {
    $matched = preg_match($route, '/submissions/' . $id, $m) === 1;
    expect_same($matched, true, "REST route accepts mixed-case id: {$id}");
    if ($matched) {
        expect_same($m['use_case_id'], $id, "REST capture preserves case: {$id}");
    }
}

$legacy_lowercase = '/^[a-z0-9][a-z0-9._-]*$/';
expect_same(
    preg_match($legacy_lowercase, 'trusted-service-assistant-IyxXZl') === 1,
    false,
    'legacy lowercase-only regex still rejects mixed case (documents the bug)'
);

echo "\n{$passes} passed, {$failures} failed\n";
exit($failures > 0 ? 1 : 0);
