<?php
/**
 * Restore the pre-apply snapshot.
 * A page whose seed hash is no longer the hash recorded after apply is left
 * as it is: that is a later edit, and a future seed still skips edited pages.
 * The only page this will unpublish is the route named in LEARN_NEW_ROUTE,
 * and only when its id is the id this apply created.
 * Writes only when LEARN_RESTORE=1. Does not set LEARN_FORCE.
 */
if (! defined('ABSPATH')) {
    fwrite(STDERR, "Run through WP-CLI.\n");
    exit(1);
}

$host = strtolower((string) wp_parse_url(home_url(), PHP_URL_HOST));
if (in_array($host, array('fides.community', 'www.fides.community'), true)) {
    fwrite(STDERR, "Refusing to restore pages on {$host}.\n");
    exit(1);
}

$backup_file = (string) getenv('LEARN_BACKUP_FILE');
$after_file  = (string) getenv('LEARN_AFTER_FILE');
$new_route   = (string) getenv('LEARN_NEW_ROUTE');
$write       = getenv('LEARN_RESTORE') === '1';
if ($backup_file === '' || ! is_readable($backup_file) || $after_file === '' || ! is_readable($after_file) || $new_route === '') {
    fwrite(STDERR, "LEARN_BACKUP_FILE, LEARN_AFTER_FILE and LEARN_NEW_ROUTE are required.\n");
    exit(1);
}

$backup = json_decode((string) file_get_contents($backup_file), true);
$after  = json_decode((string) file_get_contents($after_file), true);
if (! is_array($backup) || ! is_array($after)) {
    fwrite(STDERR, "Backup JSON is not readable.\n");
    exit(1);
}

echo $write ? "mode: restore\n" : "mode: dry-run\n";
$seo_keys = array(
    '_yoast_wpseo_title',
    '_yoast_wpseo_metadesc',
    '_yoast_wpseo_opengraph-title',
    '_yoast_wpseo_opengraph-description',
    '_fides_learn_seo',
);

foreach ($backup['routes'] ?? array() as $page) {
    if (empty($page['exists'])) {
        echo 'absent-before ' . $page['route'] . " was not on the site before apply\n";
        continue;
    }
    $route = (string) $page['route'];
    $id    = (int) $page['id'];
    $post  = get_post($id);
    if (! $post instanceof WP_Post) {
        echo "skip $route page $id is gone\n";
        continue;
    }
    $current_hash = (string) get_post_meta($id, '_fides_learn_seed_hash', true);
    $applied_hash = (string) ($after['routes'][ $route ]['seed_hash'] ?? '');
    if ($applied_hash !== '' && $current_hash !== $applied_hash) {
        echo "skip $route page $id seed hash is not the hash this apply wrote; later edit kept\n";
        continue;
    }
    if ($current_hash !== '' && $current_hash === (string) $page['seed_hash'] && (string) $post->post_content === (string) $page['content']) {
        echo "unchanged $route page $id already has the pre-apply content\n";
        continue;
    }
    echo "restore $route page $id\n";
    if (! $write) {
        continue;
    }
    $result = wp_update_post(array(
        'ID'           => $id,
        'post_title'   => $page['title'],
        'post_excerpt' => $page['excerpt'],
        'post_content' => $page['content'],
        'post_status'  => $page['status'],
        'menu_order'   => (int) $page['menu_order'],
    ), true);
    if (is_wp_error($result)) {
        echo 'error ' . $route . ' ' . $result->get_error_message() . "\n";
        exit(1);
    }
    update_post_meta($id, '_wp_page_template', $page['template']);
    update_post_meta($id, '_fides_learn_seed', $page['seed']);
    update_post_meta($id, '_fides_learn_seed_hash', $page['seed_hash']);
    update_post_meta($id, '_fides_learn_series', $page['series']);
    foreach ($seo_keys as $key) {
        update_post_meta($id, $key, (string) ($page['seo'][ $key ] ?? ''));
    }
}

foreach ($after['created'] ?? array() as $created) {
    if ((string) ($created['route'] ?? '') !== $new_route) {
        echo 'skip created ' . ($created['route'] ?? '') . " is not $new_route\n";
        continue;
    }
    $id   = (int) $created['id'];
    $post = get_post($id);
    if (! $post instanceof WP_Post) {
        echo "skip created page $id is already gone\n";
        continue;
    }
    $live = trim((string) wp_parse_url((string) get_permalink($id), PHP_URL_PATH), '/');
    if (! str_ends_with($live, $new_route)) {
        echo "skip created page $id permalink is $live\n";
        continue;
    }
    echo "unpublish $new_route page $id\n";
    if ($write) {
        wp_update_post(array('ID' => $id, 'post_status' => 'draft'));
    }
}
