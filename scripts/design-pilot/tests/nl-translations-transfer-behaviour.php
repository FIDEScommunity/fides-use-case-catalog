<?php
/**
 * Behaviour test for learn/nl-translations-transfer.php on a scratch copy of the dictionary table (the real table is only read).
 * Run: wp eval-file tests/nl-translations-transfer-behaviour.php
 * Checks: export file shape (no ids, no duplicates, no empty values, placeholders intact), dry run changes nothing,
 * import-apply fills only empty rows, never overwrites a differing translation, a second run changes nothing,
 * a changed English source is reported as stale.
 */
global $wpdb;
$real  = $wpdb->prefix . 'trp_dictionary_en_us_nl_nl';
$copy  = $wpdb->prefix . 'trp_test_nl_copy';
$tool  = dirname(__DIR__) . '/learn/nl-translations-transfer.php';
$file  = dirname(__DIR__) . '/learn/nl-translations.json';
$fail  = 0;
$check = static function (bool $ok, string $name) use (&$fail): void {
    echo ($ok ? 'ok' : 'not ok') . " - $name\n";
    if (! $ok) {
        $fail++;
    }
};
$run = static function (string $mode) use ($tool, &$file, $copy): string {
    $args = array($mode, $file, $copy);
    ob_start();
    include $tool;
    return (string) ob_get_clean();
};

$doc = json_decode((string) file_get_contents($file), true);
$entries = $doc['entries'];
$keys = array_column($entries, 'original');
$check(count($keys) === count(array_unique($keys)), 'no duplicate keys in the transfer file');
$check(count(array_filter($entries, static function ($e) { return trim($e['translation']) === ''; })) === 0, 'no empty translations');
$check(! preg_match('/"(id|original_id|post_id|post_parent_id)"/', (string) file_get_contents($file)), 'no database or post ids in the file');
$check(count(array_filter($entries, static function ($e) { return preg_match('/[\w.+-]+@(?!organisation\.com|organisatie\.nl)[\w-]+\.\w+/', $e['original'] . $e['translation']); })) === 0, 'no email addresses except the example placeholders');
$sig = static function (string $s): string { preg_match_all('#</?[a-z0-9]+|%(?:\d+\$)?[sdf]|\{[a-z_]+\}#i', $s, $m); sort($m[0]); return implode(',', $m[0]); };
$check(count(array_filter($entries, static function ($e) use ($sig) { return $sig($e['original']) !== $sig($e['translation']); })) === 0, 'HTML tags and placeholders are intact in every translation');
$groups = array();
foreach ($entries as $e) { $groups[ $e['group'] ] = ($groups[ $e['group'] ] ?? 0) + 1; }
ksort($groups); ksort($doc['counts']);
$check($groups === $doc['counts'] && array_sum($groups) === $doc['total'], 'counts per group match the entries: ' . json_encode($groups));

// Scratch copy of the dictionary.
$greal = $wpdb->prefix . 'trp_gettext_nl_nl';
$gcopy = $wpdb->prefix . 'trp_test_gettext_nl_copy';
$wpdb->query("DROP TABLE IF EXISTS $gcopy");
$wpdb->query("CREATE TABLE $gcopy LIKE $greal");
$wpdb->query("INSERT INTO $gcopy SELECT * FROM $greal");
$wpdb->query("DROP TABLE IF EXISTS $copy");
$wpdb->query("CREATE TABLE $copy LIKE $real");
$wpdb->query("INSERT INTO $copy SELECT * FROM $real");
$total = (int) $wpdb->get_var("SELECT COUNT(*) FROM $copy");
$check($total > 0, "scratch copy created ($total rows)");
$out = $run('status');
$check(strpos($out, 'add (empty row gets the translation): 0') !== false && strpos($out, 'differs (existing translation kept, only reported): 0') !== false, 'status on an identical copy: nothing to add, nothing differs');

// Blank 20 translated rows that the file covers, change one, rename the source of one.
$rows = $wpdb->get_results("SELECT id, original FROM $copy WHERE status = 2 AND translated <> '' ORDER BY id LIMIT 60");
$blank = array_slice($rows, 0, 20);
$ids = array();
foreach ($blank as $r) { $ids[] = (int) $r->id; }
$wpdb->query("UPDATE $copy SET translated = '', status = 0 WHERE id IN (" . implode(',', $ids) . ')');
$diff = $rows[30];
$wpdb->update($copy, array('translated' => 'AFWIJKENDE TEST'), array('id' => (int) $diff->id));
// An entry whose English source no longer exists (neither in the dictionary nor on the route pages) is stale.
// Gettext: blank one translated gettext row and change another; the first must be filled, the second kept.
$g_rows = $wpdb->get_results("SELECT id FROM $gcopy WHERE translated <> '' ORDER BY id LIMIT 2");
$check(count($g_rows) === 2, 'the gettext copy has translated rows');
$wpdb->update($gcopy, array('translated' => '', 'status' => 0), array('id' => (int) $g_rows[0]->id));
$wpdb->update($gcopy, array('translated' => 'AFWIJKENDE GETTEXT'), array('id' => (int) $g_rows[1]->id));
$stale_doc = $doc;
$stale_doc['entries'][] = array('original' => 'This English sentence was rewritten and is no longer used anywhere.', 'translation' => 'Deze zin is herschreven.', 'html' => false, 'group' => 'learn', 'groups' => array('learn'), 'routes' => array('learn'));
$stale_file = sys_get_temp_dir() . '/nl-translations-stale-test.json';
file_put_contents($stale_file, json_encode($stale_doc, JSON_UNESCAPED_UNICODE));
$before = $wpdb->get_results("SELECT id, translated FROM $copy ORDER BY id", OBJECT_K);

$file_real = $file;
$file = $stale_file;
$out = $run('status');
$file = $file_real;
$after = $wpdb->get_results("SELECT id, translated FROM $copy ORDER BY id", OBJECT_K);
$check($before == $after, 'dry run (status) writes nothing');
$check(preg_match('/add \(empty row gets the translation\): (\d+)/', $out, $m) && (int) $m[1] >= 20, 'status reports the blanked rows as add: ' . ($m[1] ?? '?'));
$check(strpos($out, 'differs (existing translation kept, only reported): 1') !== false, 'status reports the differing row');
$check(preg_match('/stale \([^)]*\): (\d+)/', $out, $m2) && (int) $m2[1] >= 1, 'status reports the changed English source as stale: ' . ($m2[1] ?? '?'));
$out = $run('import');
$after = $wpdb->get_results("SELECT id, translated FROM $copy ORDER BY id", OBJECT_K);
$check($before == $after, 'import without -apply is a dry run');

$out = $run('import-apply');
$check((string) $wpdb->get_var($wpdb->prepare("SELECT translated FROM $copy WHERE id = %d", $diff->id)) === 'AFWIJKENDE TEST', 'a differing existing translation is never overwritten');
$check((int) $wpdb->get_var("SELECT COUNT(*) FROM $copy WHERE id IN (" . implode(',', $ids) . ") AND translated <> '' AND status = 2") === 20, 'empty rows were filled with status 2');
$check((string) $wpdb->get_var($wpdb->prepare("SELECT translated FROM $gcopy WHERE id = %d", $g_rows[0]->id)) !== '', 'an empty gettext row was filled');
$check((string) $wpdb->get_var($wpdb->prepare("SELECT translated FROM $gcopy WHERE id = %d", $g_rows[1]->id)) === 'AFWIJKENDE GETTEXT', 'a differing gettext translation is never overwritten');
$snapshot = $wpdb->get_results("SELECT id, translated, status FROM $copy ORDER BY id", OBJECT_K);
$out = $run('import-apply');
$again = $wpdb->get_results("SELECT id, translated, status FROM $copy ORDER BY id", OBJECT_K);
$check($snapshot == $again && strpos($out, 'add (empty row gets the translation): 0') !== false, 'second import-apply makes 0 changes');

$wpdb->query("DROP TABLE IF EXISTS $copy");
$wpdb->query("DROP TABLE IF EXISTS $gcopy");
@unlink($stale_file);
$check(! $wpdb->get_var("SHOW TABLES LIKE '$copy'"), 'scratch copy removed');
$real_after = (int) $wpdb->get_var("SELECT COUNT(*) FROM $real WHERE translated <> '' AND status = 2");
echo "# real table untouched: $real_after translated rows\n";
echo $fail ? "# $fail failed\n" : "# all passed\n";
