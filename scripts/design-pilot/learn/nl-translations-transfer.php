<?php
/**
 * Portable Dutch (nl_NL) TranslatePress strings for the Learn, Training & workshops (Services), start/receive, Issuers and Relying parties routes.
 *
 * Run with WP-CLI:
 *   wp eval-file learn/nl-translations-transfer.php export [file]          write the transfer file (default: learn/nl-translations.json)
 *   wp eval-file learn/nl-translations-transfer.php status [file]          dry run, shows what an import would do (changes nothing)
 *   wp eval-file learn/nl-translations-transfer.php import [file]          dry run as well (a reminder; same output as status)
 *   wp eval-file learn/nl-translations-transfer.php import-apply [file]    fills EMPTY dictionary rows of the exported route set only
 *   An optional third argument names a scratch copy of the dictionary table (<prefix>trp_test_*) for tests.
 *   status/import/import-apply make NO HTTP request (standalone review sites block them). The optional extra argument `http` adds the
 *   local-only stale/new check (renders the English route pages over HTTP); it is never needed for an import.
 *
 * WHAT THE TOOL READS (and nothing else)
 *  1. Page structure: wp_posts columns ID, post_name, post_parent of published pages (to find the route pages below the
 *     top-level pages learn, services and start, either at the top level of a standalone site or below one pilot page).
 *     No page content, no other post types, no users, no options except 'home'.
 *  2. Only `export` (and the optional `http` argument of status/import, local only): the public HTML of each English route page
 *     over HTTP (wp_remote_get on its permalink, no login, GET only). The texts form the "pool": what the route pages show.
 *     Without it (the default for status/import/import-apply, always on a standalone review site) no request is made.
 *  3. wp_trp_original_meta: only rows with meta_key = 'post_parent_id' AND meta_value IN (route page ids)
 *     (columns original_id, meta_value), and for rows that are checked on import only those original_ids.
 *  4. wp_trp_dictionary_en_us_nl_nl: columns id, original, translated, status, original_id, and only
 *       - export/status "route set": WHERE original_id IN (strings linked to a route page) OR original IN (pool texts);
 *       - import: WHERE original IN (the English sources listed in the transfer file).
 *     Plus two aggregate counts (COUNT(*) of all rows and of rows without translation) for the status output.
 *  5. wp_trp_gettext_nl_nl: only the rows of the fixed allowlist $gettext_allow below (domain + original), four strings.
 *  NEVER read: WPForms entries, mail logs, users, usermeta, options, comments, the rest of the dictionary or gettext tables.
 *
 * WHAT THE TOOL WRITES
 *  Only import-apply writes: translated + status = 2 on rows whose translation is empty AND whose English source is in the
 *  transfer file AND that belong to one of the routes the file lists for that source (the import scope). A row outside this
 *  scope is never touched, neither "same" nor "empty". Existing translations are kept (reported as "differs"). There is no
 *  overwrite option.
 *
 * Design rules:
 *  - The key is the English source text (original). There are no local database ids, post ids or user data in the file.
 *    Pages are listed by route (path below the pilot root), not by id.
 *  - Import is repeatable: a second run changes nothing.
 *  - Rows only exist after the English page has been opened once under /nl/ ("pending" otherwise).
 *  - "stale" = a string in the file that is neither in the dictionary nor on the current English route pages
 *    (the English source sentence changed or was removed). "new" = an English string on the route pages that has a
 *    dictionary row without a translation and is not in the file (needs a translation in the editor).
 *  - Lone article fragments ("A", "An", "The") are never exported or imported: a global translation of such a fragment
 *    breaks sentences (The -> De before a het-word). The Learn articles carry the article inside the term, link or bold text
 *    instead, so every sentence opener is one string with its own article (see learn/README.md).
 *  - Only editor-approved (status 2) non-empty dictionary translations used by the route pages are exported. Entries with an
 *    email address, phone-like number, test text, a foreign local host name or a placeholder/HTML mismatch are left out.
 */
if (! defined('ABSPATH')) {
    exit;
}

$mode = isset($args[0]) ? (string) $args[0] : 'status';
$file = isset($args[1]) ? (string) $args[1] : __DIR__ . '/nl-translations.json';
if (! in_array($mode, array('export', 'status', 'import', 'import-apply'), true)) {
    echo "Unknown mode '$mode'. Use export, status, import or import-apply.\n";
    return;
}

$http_skipped = ! ($mode === 'export' || in_array('http', array_slice($args, 1), true)); // optional extra argument `http`: local stale/new check over HTTP
global $wpdb;
$table     = $wpdb->prefix . 'trp_dictionary_en_us_nl_nl';
if (isset($args[2]) && preg_match('/^' . preg_quote($wpdb->prefix, '/') . 'trp_test_[A-Za-z0-9_]+$/', (string) $args[2])) {
    $table = (string) $args[2]; // third argument: a scratch copy of the dictionary (tests only; name must start with <prefix>trp_test_)
}
$meta      = $wpdb->prefix . 'trp_original_meta';
$gtable    = $wpdb->prefix . 'trp_gettext_nl_nl';
if (isset($args[2]) && strpos((string) $args[2], 'trp_test_') !== false) {
    $gtable = $wpdb->prefix . 'trp_test_gettext_nl_copy'; // scratch copy used by the tests
}
/** Gettext allowlist: domain + English original. Theme/plugin strings the route pages show (no personal data). */
$gettext_allow = array(
    array('blocksy', 'Skip to content'),
    array('wpforms-lite', 'Form has not been submitted, please see the errors below.'),
    array('wpforms-lite', 'Please enable JavaScript in your browser to complete this form.'),
    array('wpforms-lite', 'This field is required.'),
);
/** Lone fragments that never travel (global translation would break sentences). */
$lone_fragments = array('A', 'An', 'The');
$home_url  = untrailingslashit((string) get_option('home'));
$home_tok  = '{{home}}';
// Issuer and relying party catalog pages (list and record) travel as their own groups; the record pages join the list group.
$roots     = array('learn' => 'learn', 'services' => 'services', 'start' => 'start-receive', 'issuers' => 'issuers', 'issuer' => 'issuers', 'relying-parties' => 'relying-parties', 'relying-party' => 'relying-parties');
$out       = static function (string $s): void { echo $s . "\n"; };

/** Normalise a text for comparison: decode entities, squash whitespace. */
$norm = static function (string $s): string {
    $s = html_entity_decode($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $s = preg_replace('/\s+/u', ' ', $s);
    return trim((string) $s);
};

/** The forms TranslatePress may have stored a source in: plain, &amp;, &#038;, and typographic characters as numeric entities. */
$variants = static function (string $s): array {
    $forms = array($s, str_replace('&', '&amp;', $s), str_replace('&', '&#038;', $s));
    $out   = array();
    foreach ($forms as $f) {
        $out[ $f ] = true;
        if (preg_match('/[\x{2018}\x{2019}\x{201C}\x{201D}\x{2013}\x{2014}\x{2026}\x{00A0}]/u', $f)) {
            $out[ preg_replace_callback('/[\x{2018}\x{2019}\x{201C}\x{201D}\x{2013}\x{2014}\x{2026}\x{00A0}]/u', static function ($m) {
                return '&#' . mb_ord($m[0], 'UTF-8') . ';';
            }, $f) ] = true;
        }
    }
    return array_keys($out);
};

/** Read only these columns of dictionary rows, selected by original_id list or by exact source texts (chunked). */
$select_cols = 'id, original, translated, status, original_id';
$fetch_by_ids = static function (array $ids) use ($wpdb, $table, $select_cols): array {
    $rows = array();
    foreach (array_chunk(array_values(array_unique(array_map('intval', $ids))), 400) as $chunk) {
        foreach ($wpdb->get_results("SELECT $select_cols FROM $table WHERE original_id IN (" . implode(',', $chunk) . ')') as $r) { // phpcs:ignore
            $rows[ (int) $r->id ] = $r;
        }
    }
    return $rows;
};
$fetch_by_text = static function (array $texts) use ($wpdb, $table, $select_cols): array {
    $rows = array();
    foreach (array_chunk(array_values(array_unique($texts)), 150) as $chunk) {
        $ph = implode(',', array_fill(0, count($chunk), '%s'));
        foreach ($wpdb->get_results($wpdb->prepare("SELECT $select_cols FROM $table WHERE original IN ($ph)", $chunk)) as $r) { // phpcs:ignore
            $rows[ (int) $r->id ] = $r;
        }
    }
    return $rows;
};

/** Route pages: published descendants of the top-level pages learn (groups learn and training = learn/sessions), services, start, issuers, issuer, relying-parties and relying-party. */
$page_rows = $wpdb->get_results("SELECT ID, post_name, post_parent FROM {$wpdb->posts} WHERE post_type = 'page' AND post_status = 'publish'"); // phpcs:ignore
$by_id = array();
foreach ($page_rows as $p) {
    $by_id[ (int) $p->ID ] = $p;
}
$route_pages = array(); // id => array(group, route, url)
foreach ($by_id as $id => $p) {
    $chain = array($p);
    $cur   = $p;
    while ($cur->post_parent && isset($by_id[ (int) $cur->post_parent ])) {
        $cur     = $by_id[ (int) $cur->post_parent ];
        $chain[] = $cur;
    }
    $n = count($chain);
    // Two layouts: the local pilot nests the route roots below one top-level pilot page (/fides-design-pilot/learn/...); a
    // standalone review site has them at the top level (/design-review/learn/... where /design-review is the home path, or /learn/...).
    // The top-level chain element is chain[$n - 1]; the route root is that element itself (standalone) or its child (pilot page).
    $top = $chain[ $n - 1 ];
    if (isset($roots[ $top->post_name ])) {
        $root_index = $n - 1;
        $skip_slugs = 0;
    } elseif ($n >= 2 && isset($roots[ $chain[ $n - 2 ]->post_name ])) {
        $root_index = $n - 2;
        $skip_slugs = 1; // drop the pilot root slug (differs per site)
    } else {
        continue;
    }
    $candidate = $chain[ $root_index ];
    $group = $roots[ $candidate->post_name ];
    $slugs = array_reverse(array_map(static function ($c) { return $c->post_name; }, $chain));
    $slugs = array_slice($slugs, $skip_slugs);
    $route = implode('/', $slugs);
    if ($group === 'learn' && strpos($route . '/', 'learn/sessions/') === 0) {
        $group = 'training'; // Training & workshops live under learn/sessions
    }
    $route_pages[ $id ] = array('group' => $group, 'route' => $route, 'url' => $http_skipped ? '' : get_permalink($id)); // the permalink is only needed to read the page over HTTP (export)
}

/** Text pool of the English route pages (text nodes, attributes, element texts), used to tell what the pages use. */
$pool_ok = true;
$pool    = array(); // normalised text => array of route ids
$add_pool = static function (string $text, int $id) use (&$pool, $norm): void {
    $n = $norm($text);
    if ($n === '') {
        return;
    }
    $pool[ $n ][ $id ] = true;
};
// The page text pool needs the rendered English pages over HTTP. Only `export` (run on the pilot where the pages are reachable) does that.
// status/import/import-apply make no request unless the optional argument `http` is given (local pilot only, for the stale/new signal): the scope then comes from the page hierarchy and the TranslatePress parent-page links alone.
if ($http_skipped) {
    $pool_ok = false;
}
foreach ($http_skipped ? array() : $route_pages as $id => $info) {
    $resp = wp_remote_get($info['url'], array('timeout' => 20, 'sslverify' => false, 'redirection' => 3));
    if (is_wp_error($resp) || (int) wp_remote_retrieve_response_code($resp) !== 200) {
        $pool_ok = false;
        continue;
    }
    $html = (string) wp_remote_retrieve_body($resp);
    $dom  = new DOMDocument();
    libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="utf-8"?>' . $html);
    libxml_clear_errors();
    $xp = new DOMXPath($dom);
    foreach ($xp->query('//text()[not(ancestor::script) and not(ancestor::style)]') as $t) {
        $add_pool($t->nodeValue, $id);
    }
    foreach ($xp->query('//*[@aria-label or @title or @alt or @placeholder or @value]') as $el) {
        foreach (array('aria-label', 'title', 'alt', 'placeholder', 'value') as $a) {
            if ($el->hasAttribute($a)) {
                $add_pool($el->getAttribute($a), $id);
            }
        }
    }
    foreach ($xp->query('//*[not(self::script) and not(self::style) and not(self::html) and not(self::body) and not(self::head)]') as $el) {
        $tc = $norm($el->textContent);
        if ($tc !== '' && strlen($tc) <= 1200) {
            $pool[ $tc ][ $id ] = true;
        }
    }
}
$used_by = static function (string $original) use (&$pool, $norm): array {
    $cands = array($norm($original));
    if (strpos($original, '<') !== false) {
        $cands[] = $norm(strip_tags(html_entity_decode($original, ENT_QUOTES | ENT_HTML5, 'UTF-8')));
    }
    $ids = array();
    foreach ($cands as $c) {
        if ($c !== '' && isset($pool[ $c ])) {
            $ids += $pool[ $c ];
        }
    }
    return array_keys($ids);
};

/** Route pages a set of original_ids is linked to (only post_parent_id meta rows that point at route pages are read). */
$route_ids_sql = $route_pages ? implode(',', array_map('intval', array_keys($route_pages))) : '0';
$parents_of = static function (array $oids) use ($wpdb, $meta, $route_ids_sql): array {
    $parents = array();
    foreach (array_chunk(array_values(array_unique(array_map('intval', $oids))), 400) as $chunk) {
        $sql = "SELECT original_id, meta_value FROM $meta WHERE meta_key = 'post_parent_id' AND meta_value IN ($route_ids_sql) AND original_id IN (" . implode(',', $chunk) . ')';
        foreach ($wpdb->get_results($sql) as $m) { // phpcs:ignore
            $parents[ (int) $m->original_id ][] = (int) $m->meta_value;
        }
    }
    return $parents;
};
/** Route ids a dictionary row is used on: via parent-page meta and via the page text pool. */
$row_route_ids = static function ($r, array $parents) use ($route_pages, $used_by, &$pool_ok): array {
    $oid = (int) $r->original_id;
    $via_meta = array();
    foreach (isset($parents[ $oid ]) ? $parents[ $oid ] : array() as $pid) {
        if (isset($route_pages[ $pid ])) {
            $via_meta[] = $pid;
        }
    }
    $via_text = $pool_ok ? $used_by((string) $r->original) : array();
    return array_values(array_unique(array_merge($via_meta, $via_text)));
};

/** Placeholder signature: HTML tag names, printf and {name} placeholders, nbsp. */
$signature = static function (string $s): string {
    preg_match_all('#</?[a-z0-9]+#i', $s, $tags);
    preg_match_all('/%(?:\d+\$)?[sdf]|\{[a-z_]+\}|&nbsp;|&#160;/i', $s, $ph);
    $a = array_map('strtolower', $tags[0]);
    $b = array_map('strtolower', $ph[0]);
    sort($a);
    sort($b);
    return implode(',', $a) . '|' . implode(',', $b);
};
$pii_reason = static function (string $s): string {
    if (preg_match_all('/[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/', $s, $m)) {
        foreach ($m[1] as $domain) {
            // Example domains in placeholders are fine (name@organisation.com, naam@organisatie.nl).
            if (! preg_match('/^(organisation\.com|organisatie\.nl|example\.(com|org|net)|fides\.community)$/i', $domain)) {
                return 'email address';
            }
        }
    }
    if (preg_match('/\+?\d[\d\s().-]{8,}\d/', preg_replace('/\b(?:19|20)\d{2}\b/', '', $s))) {
        return 'phone-like number';
    }
    if (preg_match('/\b(testbericht|test request|test enquiry|lorem ipsum|asdf)\b/i', $s)) {
        return 'test text';
    }
    return '';
};
$decode_pair = static function (string $s) use ($home_url, $home_tok): array {
    // Returns [stored key form, html flag]. Strings with markup keep their raw form (attributes stay valid).
    $has_html = strpos($s, '<') !== false;
    $s = $has_html ? $s : html_entity_decode($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    if ($home_url !== '') {
        $s = str_replace($home_url, $home_tok, $s);
    }
    return array($s, $has_html);
};
$expand = static function (string $s) use ($home_url, $home_tok): string {
    return str_replace($home_tok, $home_url, $s);
};

/** Read the transfer file for status/import. */
$load = static function (string $path) use ($out): ?array {
    if (! is_readable($path)) {
        $out("Transfer file not found: $path");
        return null;
    }
    $d = json_decode((string) file_get_contents($path), true);
    if (! is_array($d) || empty($d['entries'])) {
        $out('Transfer file is not valid.');
        return null;
    }
    return $d;
};

/** Allowlisted gettext rows (domain + original) with their current translation. */
$gettext_rows = static function () use ($wpdb, $gtable, $gettext_allow): array {
    $res = array();
    foreach ($gettext_allow as $pair) {
        $row = $wpdb->get_row($wpdb->prepare("SELECT id, translated FROM $gtable WHERE domain = %s AND BINARY original = %s LIMIT 1", $pair[0], $pair[1])); // phpcs:ignore
        $res[] = array('domain' => $pair[0], 'original' => $pair[1], 'row' => $row);
    }
    return $res;
};

if ($mode === 'export') {
    // Route set: strings linked to a route page plus rows whose source equals a pool text.
    $oid_rows = array();
    $meta_oids = array();
    if ($route_pages) {
        $sql = "SELECT DISTINCT original_id FROM $meta WHERE meta_key = 'post_parent_id' AND meta_value IN ($route_ids_sql)";
        foreach ($wpdb->get_col($sql) as $oid) { // phpcs:ignore
            $meta_oids[] = (int) $oid;
        }
        $oid_rows = $fetch_by_ids($meta_oids);
    }
    $texts = array();
    if ($pool_ok) {
        foreach (array_keys($pool) as $p) {
            if (strlen($p) <= 1200) {
                foreach ($variants($p) as $v) {
                    $texts[] = $v;
                }
            }
        }
    }
    $rows    = $oid_rows + $fetch_by_text($texts);
    $parents = $parents_of(array_map(static function ($r) { return (int) $r->original_id; }, $rows));

    $entries    = array();
    $excluded   = array();
    $conflicts  = array();
    $skipped_lone = array();
    $candidates = 0;
    ksort($rows);
    foreach ($rows as $r) {
        if ((int) $r->status !== 2 || trim((string) $r->translated) === '') {
            continue;
        }
        $ids = $row_route_ids($r, $parents);
        if (! $ids) {
            continue; // not used by a route page
        }
        if (in_array((string) $r->original, $lone_fragments, true)) {
            $skipped_lone[ (string) $r->original ] = true;
            continue;
        }
        $candidates++;
        $reason = $pii_reason($r->original . ' ' . $r->translated);
        if ($reason === '' && preg_match('#localhost|127\.0\.0\.1#', $r->original . $r->translated)
            && strpos($r->original . $r->translated, $home_url) === false) {
            $reason = 'foreign local host name';
        }
        if ($reason !== '') {
            $excluded[] = array(substr($r->original, 0, 70), $reason);
            continue;
        }
        if ($signature($r->original) !== $signature($r->translated)) {
            $excluded[] = array(substr($r->original, 0, 70), 'placeholder or HTML mismatch');
            continue;
        }
        list($key, $html) = $decode_pair((string) $r->original);
        list($val, )      = $decode_pair((string) $r->translated);
        $groups = array();
        $routes = array();
        foreach ($ids as $pid) {
            $groups[ $route_pages[ $pid ]['group'] ] = true;
            $routes[ $route_pages[ $pid ]['route'] ] = true;
        }
        if (isset($entries[ $key ])) {
            if ($entries[ $key ]['translation'] !== $val) {
                $conflicts[] = $key;
            }
            $entries[ $key ]['routes'] = array_values(array_unique(array_merge($entries[ $key ]['routes'], array_keys($routes))));
            $entries[ $key ]['groups'] = array_values(array_unique(array_merge($entries[ $key ]['groups'], array_keys($groups))));
            continue;
        }
        $entries[ $key ] = array(
            'original'    => $key,
            'translation' => $val,
            'html'        => $html,
            'fragment'    => (strlen($key) <= 4 || ! preg_match('/^[A-Z0-9(\\x{201C}\\x{2018}"\']/u', $key)),
            'groups'      => array_keys($groups),
            'routes'      => array_keys($routes),
        );
    }
    $gettext_entries = array();
    foreach ($gettext_rows() as $g) {
        if ($g['row'] && trim((string) $g['row']->translated) !== '') {
            $gettext_entries[] = array('domain' => $g['domain'], 'original' => $g['original'], 'translation' => (string) $g['row']->translated);
        }
    }
    foreach ($entries as &$e) {
        sort($e['groups']);
        sort($e['routes']);
        $e['group'] = count($e['groups']) === 1 ? $e['groups'][0] : 'shared';
    }
    unset($e);
    $list = array_values($entries);
    usort($list, static function ($a, $b) { return strcmp($a['group'] . $a['original'], $b['group'] . $b['original']); });
    $counts = array();
    foreach ($list as $e) {
        $counts[ $e['group'] ] = ($counts[ $e['group'] ] ?? 0) + 1;
    }
    ksort($counts);
    $doc = array(
        'schema'          => 1,
        'language'        => 'nl_NL',
        'source_language' => 'en_US',
        'domain'          => 'trp_dictionary',
        'note'            => 'Key = English source text (original). No database ids. {{home}} is replaced by the target site home URL on import. Entries are only filled into EMPTY dictionary rows that belong to the listed routes; existing translations are never overwritten. The lone fragments A, An and The are never part of this file.',
        'counts'          => $counts,
        'total'           => count($list),
        'entries'         => $list,
        'gettext'         => $gettext_entries,
    );
    file_put_contents($file, json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n");
    $out("exported: " . count($list) . " entries to $file");
    foreach ($counts as $g => $c) {
        $out("  group $g: $c");
    }
    $out('  gettext strings (theme/plugin text, allowlist): ' . count($gettext_entries));
    $out('route set rows read: ' . count($rows) . ' (of which ' . $candidates . ' candidates), excluded: ' . count($excluded) . ', conflicting duplicates (first kept): ' . count($conflicts));
    $out('lone fragments left out of the export: ' . ($skipped_lone ? implode(', ', array_keys($skipped_lone)) : 'none (no translated row on the route pages)'));
    foreach ($excluded as $x) {
        $out("  excluded ({$x[1]}): {$x[0]}");
    }
    foreach ($conflicts as $c) {
        $out('  conflict: ' . substr($c, 0, 70));
    }
    $out($pool_ok ? 'route pages read: ' . count($route_pages) : 'WARNING: some route pages could not be read; page usage fell back to the parent-page meta only.');
    return;
}

// status / import / import-apply
$doc = $load($file);
if ($doc === null) {
    return;
}
$apply = ($mode === 'import-apply');
/** Re-encode a translation the way the dictionary row stores its original (TranslatePress keeps "&amp;" or "&#038;" in some). */
$encode_like = static function (string $translation, string $row_original): string {
    if (strpos($row_original, '&amp;') !== false) {
        return str_replace('&', '&amp;', str_replace('&amp;', '&', $translation));
    }
    if (strpos($row_original, '&#038;') !== false) {
        return str_replace('&', '&#038;', str_replace('&#038;', '&', $translation));
    }
    return $translation;
};

// The import scope: file entries without the lone fragments.
$scope = array(); // normalised source => entry
$skipped_lone = 0;
foreach ($doc['entries'] as $e) {
    if (in_array((string) $e['original'], $lone_fragments, true)) {
        $skipped_lone++;
        continue;
    }
    $scope[ $norm($expand((string) $e['original'])) ] = $e;
}
// Rows for the scope: exact source text variants only.
$texts = array();
foreach ($scope as $e) {
    foreach ($variants($expand((string) $e['original'])) as $v) {
        $texts[] = $v;
    }
}
$rows    = $fetch_by_text($texts);
$parents = $parents_of(array_map(static function ($r) { return (int) $r->original_id; }, $rows));
$by_norm = array();
foreach ($rows as $r) {
    $n = $norm((string) $r->original);
    if (isset($scope[ $n ])) { // the database match is case-insensitive; the normalised key is case-sensitive
        $by_norm[ $n ][] = $r;
    }
}

$existing_routes = array();
foreach ($route_pages as $rp) {
    $existing_routes[ $rp['route'] ] = $rp['route'];
}
$existing_routes = array_values($existing_routes);
$stat = array('add' => array(), 'same' => 0, 'differs' => array(), 'pending' => array(), 'stale' => array(), 'new' => array(), 'outside_route' => array(), 'rows_in_scope' => 0);
foreach ($scope as $n => $e) {
    $orig  = $expand((string) $e['original']);
    $trans = $expand((string) $e['translation']);
    if (empty($by_norm[ $n ])) {
        // Either the page was not opened under /nl/ yet (pending) or the English source changed (stale).
        if ($pool_ok && ! isset($pool[ $n ]) && ! isset($pool[ $norm(strip_tags($orig)) ])) {
            $stat['stale'][] = $e['original'];
        } else {
            $stat['pending'][] = $e['original'];
        }
        continue;
    }
    foreach ($by_norm[ $n ] as $row) {
        // Route scope: the row must be used by one of the routes the file lists for this source.
        $row_routes = array();
        foreach ($row_route_ids($row, $parents) as $pid) {
            $row_routes[ $route_pages[ $pid ]['route'] ] = true;
        }
        if ($http_skipped) {
            // No page text pool without HTTP, and the TranslatePress parent-page links only name the page where a string was
            // first recorded. The file already lists the routes each source belongs to (decided at export time from the rendered
            // pages), so the scope is: at least one of those routes exists as a published page on this site.
            foreach (array_intersect((array) $e['routes'], $existing_routes) as $er) {
                $row_routes[ $er ] = true;
            }
        }
        if (! array_intersect(array_keys($row_routes), (array) $e['routes'])) {
            $stat['outside_route'][] = $e['original'];
            continue;
        }
        $stat['rows_in_scope']++;
        if (trim((string) $row->translated) === '') {
            $stat['add'][] = $e['original'];
            if ($apply) {
                $wpdb->update($table, array('translated' => $encode_like($trans, (string) $row->original), 'status' => 2), array('id' => (int) $row->id));
            }
        } elseif ($norm((string) $row->translated) === $norm($trans)) {
            $stat['same']++;
        } else {
            $stat['differs'][] = array($e['original'], (string) $row->translated);
        }
    }
}

// Gettext: allowlisted domain + original only, and only if the file carries them.
$g_stat = array('add' => 0, 'same' => 0, 'differs' => 0, 'missing' => 0, 'not_allowed' => 0);
$allowed = array();
foreach ($gettext_allow as $pair) {
    $allowed[ $pair[0] . "\n" . $pair[1] ] = true;
}
foreach (isset($doc['gettext']) ? $doc['gettext'] : array() as $g) {
    if (! isset($allowed[ $g['domain'] . "\n" . $g['original'] ])) {
        $g_stat['not_allowed']++;
        continue;
    }
    $row = $wpdb->get_row($wpdb->prepare("SELECT id, translated FROM $gtable WHERE domain = %s AND BINARY original = %s LIMIT 1", $g['domain'], $g['original'])); // phpcs:ignore
    if (! $row) {
        $g_stat['missing']++;
    } elseif (trim((string) $row->translated) === '') {
        $g_stat['add']++;
        if ($apply) {
            $wpdb->update($gtable, array('translated' => $g['translation'], 'status' => 2), array('id' => (int) $row->id));
        }
    } elseif ((string) $row->translated === (string) $g['translation']) {
        $g_stat['same']++;
    } else {
        $g_stat['differs']++;
    }
}

// "new": untranslated rows of the route set (strings linked to route pages or equal to a pool text) that the file does not cover.
if ($pool_ok) {
    $meta_oids = array();
    if ($route_pages) {
        foreach ($wpdb->get_col("SELECT DISTINCT original_id FROM $meta WHERE meta_key = 'post_parent_id' AND meta_value IN ($route_ids_sql)") as $oid) { // phpcs:ignore
            $meta_oids[] = (int) $oid;
        }
    }
    $route_rows = $fetch_by_ids($meta_oids);
    foreach ($route_rows as $u) {
        if (trim((string) $u->translated) !== '') {
            continue;
        }
        $n = $norm((string) $u->original);
        if ($n !== '' && isset($pool[ $n ]) && ! isset($scope[ $n ]) && ! in_array((string) $u->original, $lone_fragments, true)
            && preg_match('/[A-Za-z]{3}/', $n) && ! preg_match('#^(https?://|[a-z0-9.-]+\\.[a-z]{2,}/)#i', $n)) {
            $stat['new'][ $n ] = true;
        }
    }
}
// Aggregate counts only (no row content): the size of the dictionary outside the scope.
$total_rows = (int) $wpdb->get_var("SELECT COUNT(*) FROM $table"); // phpcs:ignore
$empty_rows = (int) $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE translated IS NULL OR translated = ''"); // phpcs:ignore

$out(($apply ? 'APPLIED' : 'DRY RUN (nothing changed)') . " for $file (" . count($doc['entries']) . ' entries)');
$out('  scope: ' . count($scope) . ' sources in the file (' . $skipped_lone . ' lone fragments skipped), ' . $stat['rows_in_scope'] . ' dictionary rows in scope on the listed routes');
$out('  outside scope: ' . max(0, $total_rows - $stat['rows_in_scope']) . ' of ' . $total_rows . ' dictionary rows ('
    . $empty_rows . ' without translation overall) are never read for import and never changed; '
    . count($stat['outside_route']) . ' row(s) with an exported source on a route not listed for it were left alone');
$out('  add (empty row in scope gets the translation): ' . count($stat['add']) . ($apply ? ' [written]' : ''));
$out('  same (already translated identically): ' . $stat['same']);
$out('  differs (existing translation kept, only reported): ' . count($stat['differs']));
$out('  pending (no dictionary row yet, open the page under /nl/ first): ' . count($stat['pending']));
$out('  stale (English source changed or removed, not on the route pages): ' . count($stat['stale']));
$out('  new (English string on the route pages, row without translation, not in the file): ' . count($stat['new']));
foreach (array('differs' => 'differs', 'stale' => 'stale', 'pending' => 'pending', 'outside_route' => 'outside route') as $k => $label) {
    foreach (array_slice($stat[ $k ], 0, 400) as $x) {
        $out("    $label: " . substr(is_array($x) ? $x[0] : $x, 0, 90));
    }
}
foreach (array_slice(array_keys($stat['new']), 0, 400) as $x) {
    $out('    new: ' . substr($x, 0, 90));
}
$out("  gettext (allowlist of " . count($gettext_allow) . "): add {$g_stat['add']}, same {$g_stat['same']}, differs {$g_stat['differs']} (kept), no row yet {$g_stat['missing']}, not allowlisted (ignored) {$g_stat['not_allowed']}");
if ($http_skipped) {
    $out('  stale/new check skipped: no HTTP (scope: the routes listed in the file that exist as pages on this site; no request was made).');
} elseif (! $pool_ok) {
    $out('  note: some route pages could not be read; stale, new and route scope could not be determined reliably.');
}
