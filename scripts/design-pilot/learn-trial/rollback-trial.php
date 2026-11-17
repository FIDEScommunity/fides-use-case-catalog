<?php
/**
 * Roll back one Learn trial install.
 *
 * Deletes a page only when the ledger's id, route, seed marker, install marker
 * and content hash all still match. Pages that already existed, and pages
 * edited after the install, are left in place and reported.
 *
 * Dry-run unless LEARN_ROLLBACK=1.
 */

if (! defined('ABSPATH')) {
    exit(1);
}

require_once __DIR__ . '/page-state.php';

$ledger = (string) getenv('LEARN_LEDGER');
$apply  = getenv('LEARN_ROLLBACK') === '1';
if ($ledger === '' || ! is_readable($ledger)) {
    fwrite(STDERR, "LEARN_LEDGER must be the install file written by record-install.php.\n");
    exit(1);
}
$host = strtolower((string) wp_parse_url(home_url(), PHP_URL_HOST));
if (in_array($host, array('fides.community', 'www.fides.community'), true) && getenv('LEARN_TARGET') !== 'production') {
    fwrite(STDERR, "Refusing to roll back on {$host} without LEARN_TARGET=production.\n");
    exit(1);
}

$recorded_host = '';
$install       = '';
$rows          = array();
foreach (file($ledger, FILE_IGNORE_NEW_LINES) ?: array() as $line) {
    if ($line === '' || str_starts_with($line, '#')) {
        continue;
    }
    $cols = explode("\t", $line);
    if ($cols[0] === 'host') {
        $recorded_host = strtolower($cols[1] ?? '');
    } elseif ($cols[0] === 'install') {
        $install = $cols[1] ?? '';
    } elseif ($cols[0] === 'page' && count($cols) >= 5) {
        $rows[] = array(
            'id'     => (int) $cols[1],
            'route'  => $cols[2],
            'marker' => $cols[3],
            'hash'   => $cols[4],
        );
    }
}
if ($recorded_host === '' || $recorded_host !== $host || $install === '' || $rows === array()) {
    fwrite(STDERR, "Refusing: ledger host \"{$recorded_host}\" does not match {$host}, or the file has no pages.\n");
    exit(1);
}

$ids = array();
foreach ($rows as $row) {
    $ids[ $row['id'] ] = true;
    $post = get_post($row['id']);
    $route = trim((string) wp_parse_url((string) get_permalink($row['id']), PHP_URL_PATH), '/');
    $marker = $post ? (string) get_post_meta($row['id'], '_fides_learn_seed', true) : '';
    $trial  = $post ? (string) get_post_meta($row['id'], '_fides_learn_trial_install', true) : '';
    $hash   = $post ? fides_learn_trial_hash($row['id']) : '';
    $why    = '';
    if (! $post || $post->post_type !== 'page') {
        $why = 'missing';
    } elseif ($marker !== $row['marker'] || $trial !== $install || $route !== $row['route']) {
        $why = 'marker';
    } elseif ($hash !== $row['hash']) {
        $why = 'edited';
    }
    if ($why !== '') {
        echo str_pad('kept-' . $why, 16) . $row['id'] . "\t" . $row['route'] . "\n";
        continue;
    }
    if (! $apply) {
        echo str_pad('would-delete', 16) . $row['id'] . "\t" . $row['route'] . "\n";
        continue;
    }
    wp_delete_post($row['id'], true);
    echo str_pad('deleted', 16) . $row['id'] . "\t" . $row['route'] . "\n";
}

$others = get_posts(array(
    'post_type'   => 'page',
    'post_status' => 'any',
    'numberposts' => -1,
    'meta_key'    => '_fides_learn_seed',
));
foreach ($others as $post) {
    if (isset($ids[ (int) $post->ID ])) {
        continue;
    }
    $route = trim((string) wp_parse_url((string) get_permalink($post), PHP_URL_PATH), '/');
    echo str_pad('kept-existing', 16) . $post->ID . "\t" . $route . "\n";
}
echo 'mode ' . ($apply ? 'rollback' : 'dry-run') . ' install ' . $install . ' host ' . $host . "\n";
