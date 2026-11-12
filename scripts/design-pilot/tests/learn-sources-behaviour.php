<?php
/**
 * Behaviour test: source link markup. External hosts get target=_blank, rel and the indicator; the own host does not;
 * the visible URL is never printed. Pure render check, no pages are created.
 * Run: source env.sh && pilot_wp eval-file tests/learn-sources-behaviour.php
 */
if (! defined('ABSPATH')) {
    exit(1);
}
$fail = array();
$pass = 0;
$ok   = static function (bool $c, string $m) use (&$fail, &$pass): void {
    $c ? $pass++ : $fail[] = $m;
};
$m = new ReflectionMethod('Fides_DS_Learn', 'source_link');
$m->setAccessible(true);
$home = home_url('/some/page/');
$own  = $m->invoke(null, array('label' => 'FIDES · Own page', 'url' => $home));
$ext  = $m->invoke(null, array('label' => 'W3C · Data Model 2.0', 'url' => 'https://www.w3.org/TR/vc-data-model-2.0/'));
$ok(strpos($own, 'target=') === false && strpos($own, '↗') === false && strpos($own, 'new tab') === false, 'own-domain source: no new tab, no indicator');
$ok(strpos($own, 'href="' . esc_url($home) . '"') !== false && strpos($own, 'FIDES · Own page') !== false, 'own-domain source: full href and label');
$ok(strpos($ext, 'target="_blank"') !== false && strpos($ext, 'noopener') !== false && strpos($ext, '↗') !== false && strpos($ext, 'opens in a new tab') !== false, 'external source: new tab, rel, indicator, accessible hint');
$ok(substr_count($ext, 'https://www.w3.org/TR/vc-data-model-2.0/') === 1 && substr_count($own, $home) === 1, 'the URL appears only once (href), not as visible text');
$ok(strpos($ext, 'aria-label') === false, 'no aria-label contradicting the visible text');
$www = $m->invoke(null, array('label' => 'x · y', 'url' => preg_replace('~^(https?://)~', '$1www.', $home)));
$ok(strpos($www, 'target=') === false, 'www variant of the own host counts as own');
echo count($fail) ? "FAIL\n" . implode("\n", $fail) . "\n" : "ok - {$pass} source link checks passed\n";
exit(count($fail) ? 1 : 0);
