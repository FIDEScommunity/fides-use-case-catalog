<?php
/**
 * Portable Dutch (nl_NL) TranslatePress strings for the Learn, Training & workshops (Services) and start/receive routes.
 *
 * Run with WP-CLI:
 *   wp eval-file learn/nl-translations-transfer.php export [file]          write the transfer file (default: learn/nl-translations.json)
 *   wp eval-file learn/nl-translations-transfer.php status [file]          dry run, shows what an import would do (changes nothing)
 *   wp eval-file learn/nl-translations-transfer.php import [file]          dry run as well (a reminder; same output as status)
 *   wp eval-file learn/nl-translations-transfer.php import-apply [file]    fills EMPTY dictionary rows only
 *   An optional third argument names a scratch copy of the dictionary table (<prefix>trp_test_*) for tests.
 *
 * Design rules:
 *  - The key is the English source text (original). There are no local database ids, post ids or user data in the file.
 *    Pages are listed by route (path below the pilot root), not by id.
 *  - Import NEVER overwrites an existing translation. A row whose translation differs is only reported ("differs").
 *    There is deliberately no overwrite option; an editor changes such a string in the TranslatePress editor.
 *  - Import is repeatable: a second run changes nothing.
 *  - Rows only exist after the English page has been opened once under /nl/ ("pending" otherwise).
 *  - "stale" = a string in the file that is neither in the dictionary nor on the current English route pages
 *    (the English source sentence changed or was removed). "new" = an English string on the route pages that has a
 *    dictionary row without a translation and is not in the file (needs a translation in the editor).
 *  - Only strings from the dictionary table (trp_dictionary_*) with a non-empty, editor-approved (status 2) translation
 *    that the route pages use are exported. Form entries, mail logs, users and options are never read.
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
$home_url  = untrailingslashit((string) get_option('home'));
$home_tok  = '{{home}}';
$roots     = array('learn' => 'learn', 'services' => 'services', 'start' => 'start-receive');
$out       = static function (string $s): void { echo $s . "\n"; };

/** Normalise a text for comparison: decode entities, squash whitespace. */
$norm = static function (string $s): string {
    $s = html_entity_decode($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $s = preg_replace('/\s+/u', ' ', $s);
    return trim((string) $s);
};

/** Route pages: published descendants of the top-level pages learn (groups learn and training = learn/sessions), services and start. */
$pages = get_pages(array('post_status' => 'publish', 'number' => 0));
$by_id = array();
foreach ($pages as $p) {
    $by_id[ $p->ID ] = $p;
}
$root_of = static function ($p) use ($by_id, $roots) {
    $chain = array($p);
    $cur   = $p;
    while ($cur->post_parent && isset($by_id[ $cur->post_parent ])) {
        $cur     = $by_id[ $cur->post_parent ];
        $chain[] = $cur;
    }
    // chain: page ... top. The route root is the child of the top-level pilot page.
    $n = count($chain);
    if ($n < 2) {
        return null;
    }
    $candidate = $chain[ $n - 2 ];
    return isset($roots[ $candidate->post_name ]) ? $roots[ $candidate->post_name ] : null;
};
$route_pages = array(); // id => array(group, route, url)
foreach ($pages as $p) {
    $group = $root_of($p);
    if ($group === null) {
        continue;
    }
    $uri   = get_page_uri($p);
    $parts = explode('/', $uri);
    array_shift($parts); // drop the pilot root slug (differs per site)
    $route = implode('/', $parts);
    if ($group === 'learn' && strpos($route . '/', 'learn/sessions/') === 0) {
        $group = 'training'; // Training & workshops live under learn/sessions
    }
    $route_pages[ $p->ID ] = array('group' => $group, 'route' => $route, 'url' => get_permalink($p));
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
foreach ($route_pages as $id => $info) {
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

/** Dictionary rows with parent-page meta (a string can belong to several pages). */
$rows = $wpdb->get_results("SELECT d.id, d.original, d.translated, d.status, d.block_type, d.original_id FROM $table d ORDER BY d.id"); // phpcs:ignore
$parents = array();
foreach ($wpdb->get_results("SELECT original_id, meta_value FROM $meta WHERE meta_key = 'post_parent_id'") as $m) { // phpcs:ignore
    $parents[ (int) $m->original_id ][] = (int) $m->meta_value;
}

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

$entries    = array();   // key => entry
$excluded   = array();
$conflicts  = array();
$candidates = 0;
foreach ($rows as $r) {
    if ((int) $r->status !== 2 || trim((string) $r->translated) === '') {
        continue;
    }
    $oid     = (int) $r->original_id;
    $pids    = isset($parents[ $oid ]) ? $parents[ $oid ] : array();
    $via_meta = array_values(array_filter($pids, static function ($pid) use ($route_pages) { return isset($route_pages[ $pid ]); }));
    $via_text = $pool_ok ? $used_by((string) $r->original) : array();
    $ids      = array_values(array_unique(array_merge($via_meta, $via_text)));
    if (! $ids) {
        continue; // not used by a route page
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

/** Gettext strings (theme/plugin text, keyed by domain + original) that carry a translation. */
$gettext_entries = array();
foreach ($wpdb->get_results("SELECT domain, original, translated FROM $gtable WHERE translated IS NOT NULL AND translated <> '' ORDER BY domain, original") as $g) { // phpcs:ignore
    $gettext_entries[] = array('domain' => (string) $g->domain, 'original' => (string) $g->original, 'translation' => (string) $g->translated);
}

if ($mode === 'export') {
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
        'note'            => 'Key = English source text (original). No database ids. {{home}} is replaced by the target site home URL on import. Entries are only filled into EMPTY dictionary rows; existing translations are never overwritten.',
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
    $out('  gettext strings (theme/plugin text): ' . count($gettext_entries));
    $out('candidates used by route pages: ' . $candidates . ', excluded: ' . count($excluded) . ', conflicting duplicates (first kept): ' . count($conflicts));
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
$expand = static function (string $s) use ($home_url, $home_tok): string {
    return str_replace($home_tok, $home_url, $s);
};
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
// All dictionary rows by normalised original (entity-decoded, whitespace squashed): one source text can have several rows.
$by_norm = array();
foreach ($rows as $r) {
    $by_norm[ $norm((string) $r->original) ][] = $r;
}
$stat = array('add' => array(), 'same' => 0, 'differs' => array(), 'pending' => array(), 'stale' => array(), 'new' => array());
$in_file = array();
foreach ($doc['entries'] as $e) {
    $orig  = $expand((string) $e['original']);
    $trans = $expand((string) $e['translation']);
    $n     = $norm($orig);
    $in_file[ $n ] = true;
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
$g_stat = array('add' => 0, 'same' => 0, 'differs' => 0, 'missing' => 0);
foreach (isset($doc['gettext']) ? $doc['gettext'] : array() as $g) {
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
if ($pool_ok) {
    // English strings on the route pages that have a dictionary row without a translation and are not in the file.
    $untranslated = $wpdb->get_results("SELECT original FROM $table WHERE translated IS NULL OR translated = ''"); // phpcs:ignore
    foreach ($untranslated as $u) {
        $n = $norm((string) $u->original);
        if ($n !== '' && isset($pool[ $n ]) && ! isset($in_file[ $n ]) && preg_match('/[A-Za-z]{3}/', $n) && ! preg_match('#^(https?://|[a-z0-9.-]+\\.[a-z]{2,}/)#i', $n)) {
            $stat['new'][ $n ] = true;
        }
    }
}
$out(($apply ? 'APPLIED' : 'DRY RUN (nothing changed)') . " for $file (" . count($doc['entries']) . ' entries)');
$out('  add (empty row gets the translation): ' . count($stat['add']) . ($apply ? ' [written]' : ''));
$out('  same (already translated identically): ' . $stat['same']);
$out('  differs (existing translation kept, only reported): ' . count($stat['differs']));
$out('  pending (no dictionary row yet, open the page under /nl/ first): ' . count($stat['pending']));
$out('  stale (English source changed or removed, not on the route pages): ' . count($stat['stale']));
$out('  new (English string on the route pages, row without translation, not in the file): ' . count($stat['new']));
foreach (array('differs' => 'differs', 'stale' => 'stale', 'pending' => 'pending') as $k => $label) {
    foreach (array_slice($stat[ $k ], 0, 400) as $x) {
        $out("    $label: " . substr(is_array($x) ? $x[0] : $x, 0, 90));
    }
}
foreach (array_slice(array_keys($stat['new']), 0, 400) as $x) {
    $out('    new: ' . substr($x, 0, 90));
}
$out("  gettext (theme/plugin text): add {$g_stat['add']}, same {$g_stat['same']}, differs {$g_stat['differs']} (kept), no row yet {$g_stat['missing']}");
if (! $pool_ok) {
    $out('  note: some route pages could not be read; stale and new could not be determined reliably.');
}
