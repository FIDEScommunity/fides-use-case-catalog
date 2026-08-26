<?php
/**
 * Listing orgId must follow organizationName, not links.organizations[0].
 *
 * Run from the repo root:
 *   php tests/php/org-bucket.php
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}

$plugin = dirname(__DIR__, 2) . '/wordpress-plugin/fides-use-case-catalog';
require $plugin . '/includes/use-case-org-bucket.php';

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

$hopae = array(
    'organizationName' => 'Hopae',
    'links' => array(
        'organizations' => array(
            array(
                'refId' => 'org:google',
                'labelRaw' => 'Google',
                'source' => 'catalog',
            ),
            array(
                'refId' => 'org:trip-com',
                'labelRaw' => 'Trip.com',
                'source' => 'catalog',
            ),
            array(
                'refId' => 'org:hopae',
                'labelRaw' => 'Hopae',
                'source' => 'catalog',
            ),
        ),
    ),
);

$bucket = fides_use_case_catalog_org_bucket($hopae);
expect_same($bucket['orgSlug'], 'hopae', 'Hopae folder slug stays hopae');
expect_same($bucket['orgId'], 'org:hopae', 'Hopae orgId is the listing org, not Google');
expect_same($bucket['orgName'], 'Hopae', 'Hopae display name is the listing name');

$nedmod = array(
    'organizationName' => 'Nedmod',
    'links' => array(
        'organizations' => array(
            array('refId' => 'org:credenid', 'labelRaw' => 'Credenid', 'source' => 'catalog'),
            array('refId' => 'org:nedmod', 'labelRaw' => 'Nedmod', 'source' => 'catalog'),
        ),
    ),
);
$nedmod_bucket = fides_use_case_catalog_org_bucket($nedmod);
expect_same($nedmod_bucket['orgId'], 'org:nedmod', 'Nedmod is not overwritten by Credenid');

$unlinked = array('organizationName' => 'Hopae', 'links' => array('organizations' => array()));
$unlinked_bucket = fides_use_case_catalog_org_bucket($unlinked);
expect_same($unlinked_bucket['orgId'], 'org:hopae', 'without catalog links, orgId is org:{slug}');

$partners_only = array(
    'organizationName' => 'Hopae',
    'links' => array(
        'organizations' => array(
            array('refId' => 'org:google', 'labelRaw' => 'Google', 'source' => 'catalog'),
        ),
    ),
);
$partners_bucket = fides_use_case_catalog_org_bucket($partners_only);
expect_same($partners_bucket['orgId'], 'org:hopae', 'partner-only links do not steal orgId');

echo "\n{$passes} passed, {$failures} failed\n";
exit($failures > 0 ? 1 : 0);
