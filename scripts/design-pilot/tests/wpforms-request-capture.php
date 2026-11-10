<?php
/**
 * Test-only mail capture for the WPForms request form checks. Never part of a package.
 *
 * run-wpforms-request-checks.sh loads this file through a temporary mu-plugin loader and removes the loader
 * afterwards. It runs after the pilot guard (which blocks all mail) and never sends anything:
 *  - mode "capture" (default): the message is appended to tests/output/wpforms-mail.jsonl and wp_mail() reports success;
 *  - mode "fail": every message is logged with ok=false and wp_mail() reports failure;
 *  - mode "fail-fides": only the message to the FIDES recipient (placeholder) fails;
 *  - mode "fail-visitor": only the messages to other addresses (the visitor) fail.
 * The mode is read from tests/output/wpforms-mail-mode on every call, so a browser test can switch it.
 */
if (! defined('ABSPATH')) {
    exit;
}

add_filter(
    'pre_wp_mail',
    static function ($pre, $atts) {
        $dir  = __DIR__ . '/output';
        $mode = is_file($dir . '/wpforms-mail-mode') ? trim((string) file_get_contents($dir . '/wpforms-mail-mode')) : 'capture';
        $to   = isset($atts['to']) ? (is_array($atts['to']) ? implode(',', $atts['to']) : (string) $atts['to']) : '';
        $team = strtolower($to) === 'request@example.invalid';
        $ok   = ! ($mode === 'fail' || ($mode === 'fail-fides' && $team) || ($mode === 'fail-visitor' && ! $team));
        $row  = array(
            'time'    => gmdate('c'),
            'ok'      => $ok,
            'to'      => $to,
            'subject' => (string) ($atts['subject'] ?? ''),
            'message' => (string) ($atts['message'] ?? ''),
            'headers' => $atts['headers'] ?? array(),
        );
        file_put_contents($dir . '/wpforms-mail.jsonl', wp_json_encode($row) . "\n", FILE_APPEND | LOCK_EX);
        return $ok;
    },
    99,
    2
);
