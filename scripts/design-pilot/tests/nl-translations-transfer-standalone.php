<?php
/**
 * Standalone review site test for learn/nl-translations-transfer.php (no pilot database changes).
 * Run: wp eval-file tests/nl-translations-transfer-standalone.php
 *
 * Imitates the staging layout without a second WordPress: a scratch copy of wp_posts (the tool reads $wpdb->posts) holds a page
 * hierarchy built from the routes of the transfer file, with the route roots (learn, services, start) at the TOP level and
 * `home` set to https://scratch.example.test/design-review (a sub-path install). A scratch copy of the TranslatePress
 * dictionary and gettext tables is the target. Every outgoing HTTP request is counted and refused. Checks: status finds the rows
 * in scope; import (dry run) reports add/same/differs and writes nothing; import-apply fills only EMPTY rows, keeps a differing
 * one and reports it; a second run changes nothing; no HTTP request is made; a layout with the route roots at the top level
 * of a root install and the old pilot layout (pages below one pilot page) still work; a site that lacks a route leaves the
 * sources of that route alone.
 */
global $wpdb;
$real  = $wpdb->prefix . 'trp_dictionary_en_us_nl_nl';
$copy  = $wpdb->prefix . 'trp_test_nl_copy';
$greal = $wpdb->prefix . 'trp_gettext_nl_nl';
$gcopy = $wpdb->prefix . 'trp_test_gettext_nl_copy';
$pcopy = $wpdb->prefix . 'trp_test_posts';
$tool  = dirname(__DIR__) . '/learn/nl-translations-transfer.php';
$file  = dirname(__DIR__) . '/learn/nl-translations.json';
$fail  = 0;
$check = static function (bool $ok, string $name) use (&$fail): void {
    echo ($ok ? 'ok' : 'not ok') . " - $name\n";
    if (! $ok) {
        $fail++;
    }
};
$http = 0;
add_filter('pre_http_request', static function ($pre, $args, $url) use (&$http) {
    $http++;
    return new WP_Error('scratch_blocked', 'all outgoing HTTP is refused in this test: ' . $url);
}, 1, 3);
$run = static function (string $mode) use ($tool, &$file, $copy): string {
    $args = array($mode, $file, $copy);
    ob_start();
    include $tool;
    return (string) ob_get_clean();
};
$doc     = json_decode((string) file_get_contents($file), true);
$entries = $doc['entries'];
$routes  = array();
foreach ($entries as $e) {
    foreach ($e['routes'] as $r) {
        $routes[ $r ] = true;
    }
}
$routes = array_keys($routes);

/** Build the page hierarchy of a layout in the scratch posts table. $prefix_slug = '' (route roots at the top) or a pilot page slug. */
$real_posts = $wpdb->posts;
$build_pages = static function (string $prefix_slug, array $only_roots = array()) use ($wpdb, $pcopy, $routes, $real_posts): void {
    $wpdb->query("DROP TABLE IF EXISTS $pcopy");
    $wpdb->query("CREATE TABLE $pcopy LIKE $real_posts");
    $next = 9000000;
    $ids  = array();
    $make = static function (string $slug, int $parent) use ($wpdb, $pcopy, &$next): int {
        $wpdb->insert($pcopy, array('ID' => ++$next, 'post_author' => 0, 'post_date' => '2026-01-01 00:00:00', 'post_date_gmt' => '2026-01-01 00:00:00',
            'post_modified' => '2026-01-01 00:00:00', 'post_modified_gmt' => '2026-01-01 00:00:00', 'post_content' => '', 'post_title' => $slug, 'post_excerpt' => '',
            'to_ping' => '', 'pinged' => '', 'post_content_filtered' => '', 'post_name' => $slug, 'post_type' => 'page', 'post_status' => 'publish', 'post_parent' => $parent));
        return $next;
    };
    $base = 0;
    if ($prefix_slug !== '') {
        $base = $make($prefix_slug, 0);
        $ids[''] = $base;
    }
    $make('about', 0); // unrelated top-level page
    foreach ($routes as $route) {
        $parts = explode('/', $route);
        if ($only_roots && ! in_array($parts[0], $only_roots, true)) {
            continue;
        }
        $path = '';
        $parent = $base;
        foreach ($parts as $part) {
            $path = $path === '' ? $part : "$path/$part";
            if (! isset($ids[ $path ])) {
                $ids[ $path ] = $make($part, $parent);
            }
            $parent = $ids[ $path ];
        }
    }
};
$set_target = static function () use ($wpdb, $copy, $gcopy, $real, $greal): void {
    $wpdb->query("DROP TABLE IF EXISTS $copy");
    $wpdb->query("CREATE TABLE $copy LIKE $real");
    $wpdb->query("INSERT INTO $copy SELECT * FROM $real");
    $wpdb->query("DROP TABLE IF EXISTS $gcopy");
    $wpdb->query("CREATE TABLE $gcopy LIKE $greal");
    $wpdb->query("INSERT INTO $gcopy SELECT * FROM $greal");
};

add_filter('pre_option_home', $home_filter = static function () { return 'https://scratch.example.test/design-review'; });
add_filter('pre_option_siteurl', $site_filter = static function () { return 'https://scratch.example.test/design-review'; });
$cleanup = static function () use ($wpdb, $real_posts, $copy, $gcopy, $pcopy, &$home_filter, &$site_filter): void {
    $wpdb->posts = $real_posts;
    remove_filter('pre_option_home', $home_filter);
    remove_filter('pre_option_siteurl', $site_filter);
    foreach (array($copy, $gcopy, $pcopy) as $t) {
        $wpdb->query("DROP TABLE IF EXISTS $t");
    }
};

// Layout 1: standalone review site, home path /design-review, route roots at the top level.
$build_pages('');
$wpdb->posts = $pcopy;
$set_target();
$check(strpos((string) get_option('home'), '/design-review') !== false, 'scratch home option ends in /design-review');
$out = $run('status');
$check(preg_match('/scope: (\d+) sources .*?, (\d+) dictionary rows in scope/', $out, $m) && (int) $m[2] >= 900, 'standalone layout: status finds rows in scope (' . ($m[2] ?? '0') . ')');
$check(strpos($out, 'differs (existing translation kept, only reported): 0') !== false && strpos($out, 'add (empty row in scope gets the translation): 0') !== false, 'identical target: nothing to add, nothing differs');
$check(strpos($out, 'stale/new check skipped: no HTTP') !== false, 'status says the stale/new check was skipped (no HTTP)');

// Blank 25 covered rows, give one a different Dutch value, blank one gettext row and change another.
$rows = $wpdb->get_results("SELECT id, original FROM $copy WHERE status = 2 AND translated <> '' ORDER BY id LIMIT 80");
$ids = array_map(static function ($r) { return (int) $r->id; }, array_slice($rows, 0, 25));
$wpdb->query("UPDATE $copy SET translated = '', status = 0 WHERE id IN (" . implode(',', $ids) . ')');
$diff = $rows[40];
$wpdb->update($copy, array('translated' => 'EIGEN AFWIJKENDE WAARDE'), array('id' => (int) $diff->id));
$g = $wpdb->get_results("SELECT id FROM $gcopy WHERE translated <> '' ORDER BY id LIMIT 2");
$wpdb->update($gcopy, array('translated' => '', 'status' => 0), array('id' => (int) $g[0]->id));
$wpdb->update($gcopy, array('translated' => 'EIGEN GETTEXT'), array('id' => (int) $g[1]->id));
$before = $wpdb->get_results("SELECT id, translated, status FROM $copy ORDER BY id", OBJECT_K);
$gbefore = $wpdb->get_results("SELECT id, translated FROM $gcopy ORDER BY id", OBJECT_K);

$out = $run('status');
$check(preg_match('/add \(empty row in scope gets the translation\): (\d+)/', $out, $m) && (int) $m[1] >= 25, 'dry run reports the blanked rows as add (' . ($m[1] ?? '?') . ')');
$check(strpos($out, 'differs (existing translation kept, only reported): 1') !== false, 'dry run reports the differing row');
$check(strpos($out, '    differs: ' . substr($diff->original, 0, 40)) !== false, 'the differing row is listed by its English source');
echo "# sample status output:\n" . implode("\n", array_map(static function ($l) { return '#   ' . $l; }, array_slice(array_filter(explode("\n", $out), static function ($l) { return strpos($l, '    new:') === false; }), 0, 12))) . "\n";
$run('import');
$check($before == $wpdb->get_results("SELECT id, translated, status FROM $copy ORDER BY id", OBJECT_K) && $gbefore == $wpdb->get_results("SELECT id, translated FROM $gcopy ORDER BY id", OBJECT_K), 'status and import (dry run) write nothing');
$out = $run('import-apply');
$check((int) $wpdb->get_var("SELECT COUNT(*) FROM $copy WHERE id IN (" . implode(',', $ids) . ") AND translated <> '' AND status = 2") === 25, 'import-apply filled the 25 empty rows (status 2)');
$check((string) $wpdb->get_var($wpdb->prepare("SELECT translated FROM $copy WHERE id = %d", $diff->id)) === 'EIGEN AFWIJKENDE WAARDE', 'the differing translation was NOT overwritten');
$check(strpos($out, 'differs (existing translation kept, only reported): 1') !== false, 'import-apply reports the differing row');
$check((string) $wpdb->get_var($wpdb->prepare("SELECT translated FROM $gcopy WHERE id = %d", $g[0]->id)) !== '' && (string) $wpdb->get_var($wpdb->prepare("SELECT translated FROM $gcopy WHERE id = %d", $g[1]->id)) === 'EIGEN GETTEXT', 'gettext: empty row filled, differing row kept');
$snap = $wpdb->get_results("SELECT id, translated, status FROM $copy ORDER BY id", OBJECT_K);
$out = $run('import-apply');
$check($snap == $wpdb->get_results("SELECT id, translated, status FROM $copy ORDER BY id", OBJECT_K) && strpos($out, 'add (empty row in scope gets the translation): 0') !== false, 'second import-apply makes 0 changes');
$check($wpdb->get_var("SELECT COUNT(*) FROM $copy WHERE translated = '' OR translated IS NULL") === $wpdb->get_var("SELECT COUNT(*) FROM $real WHERE translated = '' OR translated IS NULL"), 'rows outside the file stay as they were (same number of empty rows as the pilot table)');

// Layout 2: a root install (no sub-path) and the original pilot layout below one pilot page.
foreach (array(array('', 'root install, route roots at the top level'), array('fides-design-pilot', 'pilot layout, route roots below one pilot page')) as $layout) {
    $build_pages($layout[0]);
    $set_target();
    $wpdb->query("UPDATE $copy SET translated = '', status = 0 WHERE id IN (" . implode(',', $ids) . ')');
    $out = $run('import-apply');
    $check((int) $wpdb->get_var("SELECT COUNT(*) FROM $copy WHERE id IN (" . implode(',', $ids) . ") AND translated <> ''") === 25, $layout[1] . ': the 25 empty rows are filled');
}

// Layout 3: the site has no learn/sessions pages: their sources are left alone (route not present), the rest is imported.
$build_pages('', array('learn', 'start', 'services'));
$wpdb->query("DELETE FROM $pcopy WHERE post_name = 'sessions'");
$set_target();
$training_only = array();
foreach ($entries as $e) {
    $all_training = true;
    foreach ($e['routes'] as $r) {
        if (strpos($r . '/', 'learn/sessions/') !== 0) { $all_training = false; }
    }
    if ($all_training) { $training_only[ $e['original'] ] = true; }
}
$tids = array();
foreach ($wpdb->get_results("SELECT id, original FROM $copy WHERE status = 2 AND translated <> ''") as $r) {
    if (isset($training_only[ $r->original ]) && count($tids) < 10) { $tids[] = (int) $r->id; }
}
$oids = array_slice($ids, 0, 5);
$wpdb->query("UPDATE $copy SET translated = '', status = 0 WHERE id IN (" . implode(',', array_merge($tids, $oids)) . ')');
$run('import-apply');
$check($tids && (int) $wpdb->get_var("SELECT COUNT(*) FROM $copy WHERE id IN (" . implode(',', $tids) . ") AND translated = ''") === count($tids), 'missing route: sources used only by the absent pages stay empty (' . count($tids) . ' rows)');
$check((int) $wpdb->get_var("SELECT COUNT(*) FROM $copy WHERE id IN (" . implode(',', $oids) . ") AND translated <> ''") >= 4, 'missing route: sources of the existing routes are still filled');

$check($http === 0, "no outgoing HTTP request was made by status, import or import-apply ($http)");
$cleanup();
$check(! $wpdb->get_var("SHOW TABLES LIKE '$copy'") && ! $wpdb->get_var("SHOW TABLES LIKE '$pcopy'"), 'scratch tables removed');
echo '# real posts table: ' . (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'page'") . " pages (untouched)\n";
echo $fail ? "# $fail failed\n" : "# all passed\n";
