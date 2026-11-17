<?php
/**
 * Write the install ledger for pages this run created.
 *
 * Reads the seed report (LEARN_REPORT) and the install id (LEARN_TRIAL_INSTALL).
 * LEARN_BACKFILL=1 sets _fides_learn_trial_install on those pages when it is still empty,
 * so an install made before this marker existed can be recorded once.
 */

if (! defined('ABSPATH')) {
    exit(1);
}

require_once __DIR__ . '/page-state.php';

$report  = (string) getenv('LEARN_REPORT');
$install = trim((string) getenv('LEARN_TRIAL_INSTALL'));
$dir     = (string) (getenv('LEARN_LEDGER_DIR') ?: '');
$backfill = getenv('LEARN_BACKFILL') === '1';
if ($report === '' || ! is_readable($report) || $install === '' || $dir === '') {
    fwrite(STDERR, "LEARN_REPORT, LEARN_TRIAL_INSTALL and LEARN_LEDGER_DIR are required.\n");
    exit(1);
}
$host = strtolower((string) wp_parse_url(home_url(), PHP_URL_HOST));
if (in_array($host, array('fides.community', 'www.fides.community'), true)) {
    if (getenv('LEARN_TARGET') !== 'production') {
        fwrite(STDERR, "Refusing to record an install on {$host} without LEARN_TARGET=production.\n");
        exit(1);
    }
    if (! is_multisite() || ! is_main_site() || (int) get_current_blog_id() !== 1) {
        fwrite(STDERR, "Refusing to record an install outside the production main site.\n");
        exit(1);
    }
}

$pages = array();
foreach (file($report, FILE_IGNORE_NEW_LINES) ?: array() as $line) {
    if (! preg_match('/^created\s+.*?page (\d+) (https?:\/\/\S+)/', $line, $match)) {
        continue;
    }
    $pages[] = array('id' => (int) $match[1], 'url' => $match[2]);
}

wp_mkdir_p($dir);
$path = $dir . '/' . $host . '-' . preg_replace('/[^0-9A-Za-z._-]/', '', $install) . '.tsv';
$rows = array("host\t{$host}", "install\t{$install}");
$warn = 0;
foreach ($pages as $page) {
    $id = $page['id'];
    $post = get_post($id);
    if (! $post || $post->post_type !== 'page') {
        fwrite(STDERR, "skip {$id}: not a page\n");
        $warn++;
        continue;
    }
    $marker = (string) get_post_meta($id, '_fides_learn_seed', true);
    $trial  = (string) get_post_meta($id, '_fides_learn_trial_install', true);
    if ($trial === '' && $backfill) {
        update_post_meta($id, '_fides_learn_trial_install', $install);
        $trial = $install;
    }
    if ($trial !== $install) {
        fwrite(STDERR, "skip {$id}: trial marker is \"{$trial}\", not {$install}\n");
        $warn++;
        continue;
    }
    $route = trim((string) wp_parse_url($page['url'], PHP_URL_PATH), '/');
    $live  = trim((string) wp_parse_url((string) get_permalink($id), PHP_URL_PATH), '/');
    $hash  = fides_learn_trial_hash($id);
    $stored = (string) get_post_meta($id, '_fides_learn_seed_hash', true);
    if ($hash === '' || $hash !== $stored || $route !== $live || $marker === '') {
        fwrite(STDERR, "skip {$id} {$route}: page no longer matches the seeded state\n");
        $warn++;
        continue;
    }
    $rows[] = "page\t{$id}\t{$route}\t{$marker}\t{$hash}";
}
file_put_contents($path, implode("\n", $rows) . "\n");
echo 'ledger ' . $path . ' pages ' . (count($rows) - 2) . ' skipped ' . $warn . "\n";
exit($warn > 0 ? 1 : 0);
