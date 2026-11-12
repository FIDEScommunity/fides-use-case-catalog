<?php
/**
 * Read-only: lists the TranslatePress segments of the Ecosystem roles and For governments pages in page order
 * (every text node and text attribute of the rendered English page), each looked up in the dictionary by its exact
 * source text, with the current Dutch text and status.
 *
 *   pilot_wp eval-file tests/nl-roles-governments-segments.php [json-output-file]
 *
 * Only the <main> content area is read; header, footer, cookie banner and glossary popups are out of scope here.
 * Local pilot only. Reads: published page ids by route, the dictionary columns id, original, translated, status
 * (selected by exact source text) and the English pages over HTTP (GET, no login). Writes nothing to the database.
 * The optional argument names a JSON file for the result: route => list of {text, rows: [{id, translated, status}]}.
 * `missing` = no dictionary row (open the page under /nl/ once), `empty` = row without translation.
 */
if (! defined('ABSPATH')) {
    exit;
}
global $wpdb;
$host = (string) wp_parse_url((string) get_option('home'), PHP_URL_HOST);
if ($host !== 'localhost' && $host !== '127.0.0.1') {
    echo "Refusing: not the local pilot.\n";
    return;
}
$table  = $wpdb->prefix . 'trp_dictionary_en_us_nl_nl';
$routes = array(
    'topics/ecosystem-roles',
    'topics/ecosystem-roles/the-holder',
    'topics/ecosystem-roles/the-issuer',
    'topics/ecosystem-roles/the-relying-party',
    'topics/ecosystem-roles/wallet-providers-and-other-service-providers',
    'topics/ecosystem-roles/trust-service-providers-and-trust-frameworks',
    'topics/for-governments',
    'topics/for-governments/digital-wallets-and-public-services',
    'topics/for-governments/issuing-public-information-to-wallets',
    'topics/for-governments/accepting-information-from-wallets-in-public-services',
    'topics/for-governments/the-eudi-wallet-and-national-implementation',
);
$norm = static function (string $s): string {
    $s = html_entity_decode($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim((string) preg_replace('/\s+/u', ' ', $s));
};
$forms = static function (string $s): array {
    $f = array($s, str_replace('&', '&amp;', $s), str_replace('&', '&#038;', $s));
    $o = array();
    foreach ($f as $x) {
        $o[ $x ] = true;
        $o[ preg_replace_callback('/[\x{2018}\x{2019}\x{201C}\x{201D}\x{2013}\x{2014}\x{2026}\x{00A0}]/u', static function ($m) {
            return '&#' . mb_ord($m[0], 'UTF-8') . ';';
        }, $x) ] = true;
    }
    return array_keys($o);
};
$result = array();
foreach ($routes as $route) {
    $page = get_page_by_path('fides-design-pilot/learn/' . $route);
    if (! $page) {
        echo "NO PAGE: $route\n";
        continue;
    }
    $resp = wp_remote_get(get_permalink($page->ID), array('timeout' => 30, 'sslverify' => false));
    $html = is_wp_error($resp) ? '' : (string) wp_remote_retrieve_body($resp);
    $dom  = new DOMDocument();
    libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="utf-8"?>' . $html);
    libxml_clear_errors();
    $xp    = new DOMXPath($dom);
    $nodes = array();
    foreach ($xp->query('//main//text()[not(ancestor::script) and not(ancestor::style) and not(ancestor::noscript)]') as $t) {
        $n = $norm($t->nodeValue);
        if ($n !== '') {
            $nodes[ $n ] = true;
        }
    }
    foreach ($xp->query('//main//*[@aria-label or @title or @alt or @placeholder]') as $el) {
        foreach (array('aria-label', 'title', 'alt', 'placeholder') as $a) {
            if ($el->hasAttribute($a) && $norm($el->getAttribute($a)) !== '') {
                $nodes[ $norm($el->getAttribute($a)) ] = true;
            }
        }
    }
    $items = array();
    foreach (array_keys($nodes) as $text) {
        $all = array();
        foreach ($forms($text) as $f) {
            $all[ $f ] = true;
        }
        $keys = array_keys($all);
        $ph   = implode(',', array_fill(0, count($keys), '%s'));
        $rows = $wpdb->get_results($wpdb->prepare("SELECT id, original, translated, status FROM $table WHERE BINARY original IN ($ph)", $keys)); // phpcs:ignore
        $items[] = array(
            'text' => $text,
            'rows' => array_map(static function ($r) {
                return array('id' => (int) $r->id, 'original' => (string) $r->original, 'translated' => (string) $r->translated, 'status' => (int) $r->status);
            }, $rows),
        );
    }
    $result[ $route ] = $items;
    $missing = count(array_filter($items, static function ($i) { return ! $i['rows']; }));
    $empty   = count(array_filter($items, static function ($i) { return $i['rows'] && $i['rows'][0]['translated'] === ''; }));
    echo str_pad($route, 90) . ' segments ' . count($items) . ', missing ' . $missing . ', empty ' . $empty . "\n";
}
if (isset($args[0])) {
    file_put_contents((string) $args[0], json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    echo 'written: ' . $args[0] . "\n";
}
