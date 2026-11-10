<?php
/**
 * Behaviour test: shell links never get a doubled path in the Dutch (TranslatePress) version.
 *
 * Runs inside the standalone rehearsal site (home_url() ends in /design-review, the staging config mu-plugin is active):
 *   scripts/design-pilot/tests/run-nl-links-checks.sh
 * It switches $TRP_LANGUAGE per language and checks every shell destination of the route map plus the config helpers.
 * When TranslatePress is not active, its home_url() behaviour is emulated (abs home + /nl/ + path), so the test also
 * works on a bare site. Nothing is written.
 */

if (! defined('ABSPATH')) {
    exit(1);
}
if (! function_exists('fides_design_review_route_map')) {
    fwrite(STDERR, "The staging config mu-plugin is not active on this site.\n");
    exit(1);
}

$results = array('pass' => 0, 'fail' => array());
$check   = static function (bool $ok, string $message) use (&$results): void {
    if ($ok) {
        $results['pass']++;
    } else {
        $results['fail'][] = $message;
    }
};

$real_trp = function_exists('trp_custom_language_switcher');
if (! $real_trp) {
    add_filter(
        'home_url',
        static function ($url, $path) {
            global $TRP_LANGUAGE;
            if (($TRP_LANGUAGE ?? 'en_US') !== 'nl_NL') {
                return $url;
            }
            return trailingslashit(trailingslashit((string) get_option('home')) . 'nl') . ltrim((string) $path, '/');
        },
        1,
        2
    );
}

$home = rtrim((string) get_option('home'), '/');
$check(rtrim((string) wp_parse_url($home, PHP_URL_PATH), '/') === '/design-review', 'the test site is standalone (home path /design-review)');

$map       = fides_design_review_route_map();
$live      = fides_design_review_live_origin();
$doubled   = '~/design-review/(?:nl/)?design-review/|/nl/(?:[^?#]*/)?nl/~';
$languages = array('en_US' => '', 'nl_NL' => '/nl');

foreach ($languages as $language => $segment) {
    $GLOBALS['TRP_LANGUAGE'] = $language;
    $label                   = $language === 'nl_NL' ? 'NL' : 'EN';

    $check(fides_design_review_standalone() === true, "{$label}: layout detection stays standalone");
    $check(fides_design_review_prefix() === '', "{$label}: route prefix is empty in standalone");
    $check(fides_design_review_url('overview/') === $home . $segment . '/overview/', "{$label}: fides_design_review_url() is {$home}{$segment}/overview/");

    foreach (array_keys($map) as $path) {
        $url = Fides_DS_Site_Shell::url($path);
        $check($url === '' || preg_match($doubled, $url) !== 1, "{$label}: {$path} has no doubled path ({$url})");
        if ($url === '') {
            continue;
        }
        if (strpos($url, $live . '/') === 0) {
            $check($url === $live . $path, "{$label}: {$path} to the live site stays absolute and outside /nl/ ({$url})");
            continue;
        }
        $check(strpos($url, $home . $segment . '/') === 0, "{$label}: {$path} stays on this site and in the language ({$url})");
    }
    $check(Fides_DS_Site_Shell::url('/') === $home . $segment . '/', "{$label}: the home link is {$home}{$segment}/");
    $check(Fides_DS_Site_Shell::url('https://example.org/x/') === 'https://example.org/x/', "{$label}: an absolute URL passes through");
}

// Pilot-request detection must not depend on the language segment either.
$GLOBALS['TRP_LANGUAGE'] = 'nl_NL';
$check(fides_design_review_is_pilot_request() === true, 'NL: every request of the standalone site is a pilot request');

$GLOBALS['TRP_LANGUAGE'] = 'en_US';

echo 'nl-links-behaviour: ' . $results['pass'] . ' passed, ' . count($results['fail']) . " failed\n";
foreach ($results['fail'] as $message) {
    echo ' - FAIL: ' . $message . "\n";
}
exit(count($results['fail']) > 0 ? 1 : 0);
