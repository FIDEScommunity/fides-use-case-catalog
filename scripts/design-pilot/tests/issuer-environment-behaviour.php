<?php
/**
 * Environment values of the issuer pilot with fixture issuers (no data files, no database writes).
 * Run: wp eval-file tests/issuer-environment-behaviour.php
 * Checks: production and test stay as they are, sandbox and pilot are test, a missing, empty or unknown value is
 * "Not specified" (Niet opgegeven in NL) in the label, the filter facets, the sort order and the legend sentence.
 */
$fail  = 0;
$check = static function (bool $ok, string $name) use (&$fail): void {
    echo ($ok ? 'ok' : 'not ok') . " - $name\n";
    if (! $ok) {
        $fail++;
    }
};
$items = array(
    array('id' => 'a', 'environment' => 'production'),
    array('id' => 'b', 'environment' => 'test'),
    array('id' => 'c', 'environment' => 'Sandbox'),
    array('id' => 'd', 'environment' => 'pilot'),
    array('id' => 'e'),
    array('id' => 'f', 'environment' => ''),
    array('id' => 'g', 'environment' => 'staging'),
);
$codes = array_map(array('Fides_Issuer_Design', 'environment_code'), $items);
$check($codes === array('production', 'test', 'test', 'test', 'unspecified', 'unspecified', 'unspecified'), 'codes: ' . implode(',', $codes));
$check(Fides_Issuer_Design::environment_counts($items) === array('production' => 1, 'test' => 3, 'unspecified' => 3), 'counts per code');
$check(Fides_Issuer_Design::environment_label($items[4]) === 'Not specified', 'EN label for a missing value');
$facets = Fides_Issuer_Design::facets($items)['environment'] ?? array();
$check(array_column($facets, 'value') === array('production', 'test', 'unspecified'), 'facet order: production, test, not specified');
$check(array_column($facets, 'count') === array(1, 3, 3), 'facet counts');
$check(array_column($facets, 'label') === array('Production', 'Test', 'Not specified'), 'facet labels (EN)');
$check(count(Fides_Issuer_Design::filter_items($items, '', array('environment' => array('unspecified')), array())) === 3, 'filter unspecified finds the 3 issuers');
$check(Fides_Issuer_Design::environment_legend_extra($items) === 'Not specified: no environment is recorded.', 'legend sentence when an issuer lacks an environment');
$check(Fides_Issuer_Design::environment_legend_extra(array($items[0], $items[1])) === '', 'no legend sentence when every issuer has an environment');
$sorted = array_column(Fides_Issuer_Design::sort_items($items, 'status'), 'id');
$check(in_array($sorted[0], array('a'), true), 'production sorts first (' . implode('', $sorted) . ')');

$dutch = static function () { return 'nl_NL'; };
add_filter('locale', $dutch, 99);
add_filter('pre_determine_locale', $dutch, 99);
$check(Fides_Issuer_Design::environment_label($items[4]) === 'Niet opgegeven', 'NL label for a missing value');
$check(Fides_Issuer_Design::environment_label($items[0]) === 'Productie', 'NL label for production');
$check(Fides_Issuer_Design::environment_legend_extra($items) === 'Niet opgegeven: er is geen omgeving vastgelegd.', 'NL legend sentence');
remove_filter('locale', $dutch, 99);
remove_filter('pre_determine_locale', $dutch, 99);
echo $fail ? "\n$fail failed\n" : "\nall passed\n";
