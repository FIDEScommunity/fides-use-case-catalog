<?php
/**
 * Write a restorable snapshot of the routes in routes-update.txt.
 * Content, SEO fields and seed markers only. Does not update a page,
 * an option, a menu, or a form.
 */
if (! defined('ABSPATH')) {
    fwrite(STDERR, "Run through WP-CLI.\n");
    exit(1);
}

$host = strtolower((string) wp_parse_url(home_url(), PHP_URL_HOST));
if (in_array($host, array('fides.community', 'www.fides.community'), true)) {
    fwrite(STDERR, "Refusing to back up pages on {$host}. This package does not install on production.\n");
    exit(1);
}

$routes_file = (string) getenv('LEARN_ROUTES_FILE');
$dest        = (string) getenv('LEARN_BACKUP_FILE');
if ($routes_file === '' || ! is_readable($routes_file) || $dest === '') {
    fwrite(STDERR, "LEARN_ROUTES_FILE and LEARN_BACKUP_FILE are required.\n");
    exit(1);
}

$routes = array();
foreach (file($routes_file, FILE_IGNORE_NEW_LINES) ?: array() as $line) {
    $route = trim((string) preg_replace('/#.+$/', '', $line));
    if ($route !== '') {
        $routes[] = $route;
    }
}

$seo_keys = array(
    '_yoast_wpseo_title',
    '_yoast_wpseo_metadesc',
    '_yoast_wpseo_opengraph-title',
    '_yoast_wpseo_opengraph-description',
    '_fides_learn_seo',
);
$pages = array();
foreach ($routes as $route) {
    $full = 'learn/' . $route;
    $post = get_page_by_path($full, OBJECT, 'page');
    if (! $post instanceof WP_Post) {
        $pages[] = array('route' => $route, 'full' => $full, 'exists' => false);
        continue;
    }
    $id  = (int) $post->ID;
    $seo = array();
    foreach ($seo_keys as $key) {
        $seo[ $key ] = (string) get_post_meta($id, $key, true);
    }
    $pages[] = array(
        'route'        => $route,
        'full'         => $full,
        'exists'       => true,
        'id'           => $id,
        'title'        => (string) $post->post_title,
        'excerpt'      => (string) $post->post_excerpt,
        'content'      => (string) $post->post_content,
        'status'       => (string) $post->post_status,
        'menu_order'   => (int) $post->menu_order,
        'parent'       => (int) $post->post_parent,
        'permalink'    => (string) get_permalink($id),
        'template'     => (string) get_post_meta($id, '_wp_page_template', true),
        'seed'         => (string) get_post_meta($id, '_fides_learn_seed', true),
        'seed_hash'    => (string) get_post_meta($id, '_fides_learn_seed_hash', true),
        'series'       => (string) get_post_meta($id, '_fides_learn_series', true),
        'trial'        => (string) get_post_meta($id, '_fides_learn_trial_install', true),
        'seo'          => $seo,
    );
}

$payload = array(
    'host'    => $host,
    'home'    => (string) home_url(),
    'taken'   => gmdate('c'),
    'routes'  => $pages,
);
$dir = dirname($dest);
if (! is_dir($dir) && ! mkdir($dir, 0700, true) && ! is_dir($dir)) {
    fwrite(STDERR, "Could not create $dir\n");
    exit(1);
}
file_put_contents($dest, wp_json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n");
$present = 0;
foreach ($pages as $page) {
    if (! empty($page['exists'])) {
        $present++;
    }
}
echo 'backup pages ' . $present . ' present, ' . (count($pages) - $present) . " absent, file $dest\n";
