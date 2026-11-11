<?php
/**
 * Behaviour test: percent-encoded characters in Learn source URLs survive saving and rendering.
 * Creates one temporary page and removes it again.
 * Run: source env.sh && pilot_wp eval-file tests/learn-source-url-behaviour.php
 */

if (! defined('ABSPATH')) {
    exit(1);
}

$results = array('pass' => 0, 'fail' => array());
$check   = static function (bool $ok, string $message) use (&$results): void {
    if ($ok) {
        $results['pass']++;
    } else {
        $results['fail'][] = $message;
    }
};

$encoded = 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32024R1183';
$other   = 'https://example.org/a%20b/%C3%A9?q=%2F&x=1';
$sources = "EUR-Lex | {$encoded}\nExample | {$other}\nBroken | javascript:alert(1)";

// Pure sanitiser: keeps percent sequences, still removes tags and control characters.
$check(Fides_DS_Learn::sanitize_field_value($sources, true, 'sources') === "EUR-Lex | {$encoded}\nExample | {$other}\nBroken | javascript:alert(1)", 'sanitiser keeps percent-encoded octets in multi-line fields');
$check(Fides_DS_Learn::sanitize_field_value('<b>Label</b> %3A', false) === 'Label %3A', 'sanitiser still strips tags and keeps the percent sequence');
$check(Fides_DS_Learn::sanitize_field_value('https://x.test/a%3Ab', false, 'cta_url') === 'https://x.test/a%3Ab', 'button URL keeps percent-encoding');
$check(Fides_DS_Learn::sanitize_field_value('100% sure', false) === '100% sure', 'a lone percent sign is kept');
$check(Fides_DS_Learn::sanitize_field_value('%3A', false) === '%3A' && Fides_DS_Learn::sanitize_field_value('%253A', false) === '%253A', 'no double encoding or decoding');

$id = wp_insert_post(array('post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Source URL test', 'post_name' => 'learn-source-url-test', 'post_content' => '<p>x</p>'));
update_post_meta($id, '_wp_page_template', Fides_DS_Learn::TEMPLATE);
update_post_meta($id, '_fides_learn_kind', 'article');

// Seed path: update_post_meta runs the registered sanitize callback.
update_post_meta($id, '_fides_learn_sources', wp_slash($sources));
$stored = (string) get_post_meta($id, '_fides_learn_sources', true);
$check(strpos($stored, $encoded) !== false && strpos($stored, $other) !== false, 'stored meta keeps percent-encoding (seed path)');

// Editor path: simulate the metabox save (wp_unslash on the request data, nonce, capability).
$admin = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ID'));
wp_set_current_user((int) ($admin[0] ?? 1));
$_POST = wp_slash(array(
    'fides_learn_nonce' => wp_create_nonce('fides_learn_meta'),
    'fides_learn'       => array('kind' => 'article', 'sources' => $sources, 'cta_url' => 'https://x.test/a%3Ab'),
));
Fides_DS_Learn::save_meta($id, get_post($id));
$_POST = array();
$check((string) get_post_meta($id, '_fides_learn_sources', true) === $sources, 'metabox save keeps the source field unchanged');
$check((string) get_post_meta($id, '_fides_learn_cta_url', true) === 'https://x.test/a%3Ab', 'metabox save keeps the button URL');

// Second save with the stored value (edit, save again): still identical.
$_POST = wp_slash(array(
    'fides_learn_nonce' => wp_create_nonce('fides_learn_meta'),
    'fides_learn'       => array('kind' => 'article', 'sources' => (string) get_post_meta($id, '_fides_learn_sources', true)),
));
Fides_DS_Learn::save_meta($id, get_post($id));
$_POST = array();
$check((string) get_post_meta($id, '_fides_learn_sources', true) === $sources, 'saving twice does not change the value');

// Rendering: the href equals the stored URL.
$method = new ReflectionMethod('Fides_DS_Learn', 'sources');
$method->setAccessible(true);
$parsed = $method->invoke(null, $id);
$check(count($parsed) === 2 && $parsed[0]['url'] === $encoded, 'parsed source URL is unchanged and the unsafe line is dropped');
$check(strpos(esc_url($parsed[0]['url']), 'celex%3A32024R1183') !== false, 'esc_url keeps the encoded colon in the href');

wp_delete_post($id, true);

// "Terms in this article": short definitions end at a sentence boundary.
$short = Fides_DS_Learn::short_definition('One short sentence.');
$check($short === array('text' => 'One short sentence.', 'more' => false), 'a one-sentence definition is shown whole');
$long = 'First sentence of the definition. ' . 'Second ' . str_repeat('word ', 37) . 'ends here. ' . 'Third ' . str_repeat('more ', 30) . 'closes here.';
$short = Fides_DS_Learn::short_definition($long, 40);
$check($short['more'] === true && substr($short['text'], -1) === '.' && strpos($short['text'], 'ends here') === false, 'a long definition stops after a whole sentence and signals more');
$one  = str_repeat('word ', 60) . 'done.';
$short = Fides_DS_Learn::short_definition($one, 40);
$check($short['more'] === false && substr($short['text'], -5) === 'done.', 'a long first sentence is never cut');
$vct = Fides_DS_Learn::find_term('vct');
$check(is_array($vct) && strpos((string) $vct['description'], 'SD-JWT VC') !== false, 'vct resolves to the SD-JWT VC specific glossary entry');

foreach ($results['fail'] as $message) {
    echo "not ok - {$message}\n";
}
printf("# pass %d\n# fail %d\n", $results['pass'], count($results['fail']));
if ($results['fail']) {
    exit(1);
}
