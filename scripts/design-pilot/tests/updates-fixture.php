<?php
/**
 * Local test fixture for the Updates browser checks: ONE fixed message whose publication source differs
 * from its organization. Used by tests/updates-checks.cjs through run-updates-checks.sh.
 *
 * Run with WP-CLI: wp eval-file tests/updates-fixture.php set|clear
 *  - set:   writes the short-lived feed cache (transient Fides_DS_Updates::FEED_CACHE) as "current feed + fixture post".
 *           The post is attached to the first catalog organization that has a website, with a URL on another host
 *           and a fixed sourceLabel. No real post, option or catalog record is changed; the cache expires on its own.
 *  - clear: deletes the feed cache, so the next request reads the live (or bundled) feed again.
 * Local pilot only: refuses to run when the site is not localhost.
 */
if (! defined('ABSPATH')) {
    exit(1);
}

$mode = isset($args[0]) ? (string) $args[0] : '';
$host = (string) wp_parse_url((string) get_option('home'), PHP_URL_HOST);
if ($host !== 'localhost' && $host !== '127.0.0.1') {
    echo "Refusing to run: not the local pilot site.\n";
    exit(1);
}

if ($mode === 'clear') {
    delete_transient(Fides_DS_Updates::FEED_CACHE);
    echo "updates fixture cleared\n";
    return;
}
if ($mode !== 'set') {
    echo "Usage: set|clear\n";
    exit(1);
}

// Start from a clean cache so the payload below is "feed as it is now" plus the fixture.
delete_transient(Fides_DS_Updates::FEED_CACHE);
$payload = Fides_DS_Updates::feed_payload();
if ($payload === null) {
    $payload = array('organizations' => array(), 'origin' => 'bundled', 'generated_at' => '');
}

$org_key = '';
$source  = Fides_Catalog_Source::for('organization');
$items   = $source ? (array) $source->all() : array();
foreach ($items as $item) {
    if (! empty($item['id']) && ! empty($item['name']) && ! empty($item['website'])) {
        $org_key = (string) $item['id'];
        break;
    }
}
if ($org_key === '') {
    echo "No catalog organization with a website found.\n";
    exit(1);
}

$fixture = array(
    'title'       => 'Fixture message about the pilot wallet milestone',
    'url'         => 'https://press.fixture-source.test/articles/pilot-wallet-milestone',
    'publishedAt' => '2026-11-01',
    'sourceLabel' => 'Fixture Press',
);
$orgs = $payload['organizations'];
if (isset($orgs[ $org_key ]['items']) && is_array($orgs[ $org_key ]['items'])) {
    array_unshift($orgs[ $org_key ]['items'], $fixture);
} elseif (isset($orgs[ $org_key ]) && is_array($orgs[ $org_key ])) {
    array_unshift($orgs[ $org_key ], $fixture);
} else {
    $orgs[ $org_key ] = array($fixture);
}
$payload['organizations'] = $orgs;
set_transient(Fides_DS_Updates::FEED_CACHE, $payload, 15 * MINUTE_IN_SECONDS);
echo "updates fixture set on " . $org_key . "\n";
