<?php
/**
 * After a content apply, record the new page id and the seed hash of each
 * route so a later restore can see whether an editor changed the page.
 * Writes one JSON file. Does not update a page.
 */
if (! defined('ABSPATH')) {
    fwrite(STDERR, "Run through WP-CLI.\n");
    exit(1);
}

$host = strtolower((string) wp_parse_url(home_url(), PHP_URL_HOST));
if (in_array($host, array('fides.community', 'www.fides.community'), true)) {
    fwrite(STDERR, "Refusing to record apply state on {$host}.\n");
    exit(1);
}

$report = (string) getenv('LEARN_REPORT');
$routes_file = (string) getenv('LEARN_ROUTES_FILE');
$dest = (string) getenv('LEARN_AFTER_FILE');
if ($report === '' || ! is_readable($report) || $routes_file === '' || $dest === '') {
    fwrite(STDERR, "LEARN_REPORT, LEARN_ROUTES_FILE and LEARN_AFTER_FILE are required.\n");
    exit(1);
}

$created = array();
foreach (file($report, FILE_IGNORE_NEW_LINES) ?: array() as $line) {
    if (! preg_match('/^created\s+(\S+)\s+page (\d+) (https?:\/\/\S+)/', $line, $match)) {
        continue;
    }
    $created[] = array(
        'route' => $match[1],
        'id'    => (int) $match[2],
        'url'   => $match[3],
    );
}

$routes = array();
foreach (file($routes_file, FILE_IGNORE_NEW_LINES) ?: array() as $line) {
    $route = trim((string) preg_replace('/#.+$/', '', $line));
    if ($route === '') {
        continue;
    }
    $post = get_page_by_path('learn/' . $route, OBJECT, 'page');
    $routes[ $route ] = array(
        'id'        => $post instanceof WP_Post ? (int) $post->ID : 0,
        'seed_hash' => $post instanceof WP_Post ? (string) get_post_meta($post->ID, '_fides_learn_seed_hash', true) : '',
        'trial'     => $post instanceof WP_Post ? (string) get_post_meta($post->ID, '_fides_learn_trial_install', true) : '',
    );
}

file_put_contents($dest, wp_json_encode(array(
    'host'    => $host,
    'taken'   => gmdate('c'),
    'created' => $created,
    'routes'  => $routes,
), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
echo 'after-apply created ' . count($created) . " file $dest\n";
