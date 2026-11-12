<?php
/**
 * The visitor notice "Local pilot view" is gone from the legacy request form template, the form itself is intact.
 * Run: wp eval-file tests/request-notice-behaviour.php   (renders the template in PHP; nothing is submitted or sent)
 */
$fail  = 0;
$check = static function (bool $ok, string $name) use (&$fail): void {
    echo ($ok ? 'ok' : 'not ok') . " - $name\n";
    if (! $ok) {
        $fail++;
    }
};
$page = get_page_by_path('fides-design-pilot/learn/sessions/request');
$check($page instanceof WP_Post, 'the request page exists');
if ($page) {
    $m = new ReflectionMethod('Fides_DS_Learn', 'render_request');
    $m->setAccessible(true);
    $html = (string) $m->invoke(null, (int) $page->ID, '');
    $check($html !== '', 'the legacy request template renders');
    $check(! preg_match('/Local pilot view|Lokale pilotweergave|Nothing you enter here is sent or stored|fides-learn-pilot-note"><strong>/i', $html), 'no "Local pilot view" visitor notice in the template');
    $check(strpos($html, 'id="fides-learn-request-form"') !== false && strpos($html, 'data-fides-learn-request') !== false, 'the request form is still there');
    foreach (array('fides-learn-name', 'fides-learn-email', 'fides-learn-offering', 'data-fides-learn-submit') as $needle) {
        $check(strpos($html, $needle) !== false, "form element present: $needle");
    }
    $check(strpos($html, 'onsubmit="return false;"') !== false, 'the form still does not submit anywhere (onsubmit guard unchanged)');
}
echo $fail ? "# $fail failed\n" : "# all passed\n";
