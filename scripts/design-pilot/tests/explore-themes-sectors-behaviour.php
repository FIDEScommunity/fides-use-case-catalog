<?php
/**
 * Behaviour tests for Explore by theme / sector (no HTTP, no database writes).
 *  - exactly six theme bundles and fourteen assignable sectors, "Other" never a choice;
 *  - per choice: matching use cases, shown cards (max 4), relations; the table is printed and written to
 *    tests/output/explore-themes-sectors-counts.json for the browser checks and the report;
 *  - reliability: every shown credential type, organisation and wallet comes from an explicit link of a SHOWN use case
 *    (checked against the raw item links, not against the renderer);
 *  - empty selection, unknown slug, shortcode output for every choice, editorial pages (one per choice, seed marker).
 * Run: pilot_wp eval-file tests/explore-themes-sectors-behaviour.php
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

$check(class_exists('Fides_Use_Case_Explore_Choice'), 'explore choice class is loaded');
$items = Fides_Use_Case_Design::items();
$check(count($items) > 0, 'catalog items are available (' . count($items) . ')');

$themes  = Fides_Use_Case_Explore_Choice::choices('theme');
$sectors = Fides_Use_Case_Explore_Choice::choices('sector');
$check(count($themes) === 6, 'six theme bundles (got ' . count($themes) . ')');
$check(array_keys($themes) === array('identity_access', 'business_authority', 'payments_commerce', 'work_qualifications', 'products_trade_supply_chains', 'government_compliance'), 'theme slugs and order');
$check(count($sectors) === 14, 'fourteen assignable sectors (got ' . count($sectors) . ')');
$check(! isset($sectors['other']), '"Other" is not a sector choice');
$check(isset($sectors['public_sector'], $sectors['healthcare'], $sectors['supply_chain']), 'sector slugs are the catalog codes');

/** Raw explicit link keys per use case id, straight from the item data. */
$raw_links = static function (array $item): array {
    $out = array();
    foreach (array('credentials', 'organizations', 'personalWallets', 'businessWallets') as $key) {
        foreach ((array) ($item['links'][ $key ] ?? array()) as $link) {
            if (is_array($link)) {
                $out[ $key ][] = strtolower(trim((string) ($link['labelRaw'] ?? $link['refId'] ?? '')));
            }
        }
    }
    return $out;
};

$table = array();
foreach (array('theme' => $themes, 'sector' => $sectors) as $kind => $choices) {
    foreach ($choices as $slug => $label) {
        $sel   = Fides_Use_Case_Explore_Choice::selection($kind, $slug, $items);
        $shown = array_column($sel['shown'], 'id');
        $check(count($sel['shown']) <= Fides_Use_Case_Explore_Choice::CARD_LIMIT, "{$kind}:{$slug} shows at most the card limit");
        $check($sel['matching'] >= count($sel['shown']), "{$kind}:{$slug} matching >= shown");

        // Independent recount of the matching use cases.
        $recount = 0;
        foreach ($items as $item) {
            $codes = $kind === 'theme' ? Fides_Use_Case_Design::theme_bundle_codes($item) : Fides_Use_Case_Design::sector_codes($item);
            $recount += in_array($slug, $codes, true) ? 1 : 0;
        }
        $check($recount === $sel['matching'], "{$kind}:{$slug} count equals an independent recount ({$recount})");

        // Reliability: each relation row is backed by an explicit link of a shown use case.
        $by_id = array();
        foreach ($sel['shown'] as $item) {
            $by_id[ (string) $item['id'] ] = $raw_links($item);
        }
        foreach ($sel['relations'] as $bucket => $rows) {
            foreach ($rows as $row) {
                $check(! empty($row['use_cases']), "{$kind}:{$slug} {$bucket} '{$row['label']}' names its use case");
                foreach (array_keys($row['use_cases']) as $uc_id) {
                    $check(in_array($uc_id, $shown, true), "{$kind}:{$slug} {$bucket} '{$row['label']}' comes from a shown use case");
                    $found = false;
                    foreach ($by_id[ $uc_id ] ?? array() as $labels) {
                        if (in_array(strtolower($row['label']), $labels, true)) {
                            $found = true;
                        }
                    }
                    $check($found, "{$kind}:{$slug} {$bucket} '{$row['label']}' is an explicit link of {$uc_id}");
                }
            }
        }
        $table[ $kind . ':' . $slug ] = array(
            'kind'          => $kind,
            'slug'          => $slug,
            'label'         => $label,
            'useCases'      => $sel['matching'],
            'shown'         => count($sel['shown']),
            'credentials'   => count($sel['relations']['credentials']),
            'organizations' => count($sel['relations']['organizations']),
            'wallets'       => count($sel['relations']['wallets']),
            'firstTitle'    => $sel['shown'] ? (string) $sel['shown'][0]['title'] : '',
        );
    }
}

// Empty selection: a fixture without any matching item shows no cards and no relations.
$empty = Fides_Use_Case_Explore_Choice::selection('theme', 'identity_access', array());
$check($empty['matching'] === 0 && $empty['shown'] === array() && $empty['relations']['organizations'] === array(), 'a choice without use cases has no cards and no relations');

// Fixture: relations only come from shown use cases (5 matching, 4 shown, the fifth carries a unique organisation).
$fixture = array();
for ($i = 1; $i <= 5; $i++) {
    $fixture[] = array(
        'id'                   => 'fx-' . $i,
        'title'                => 'Fixture ' . $i,
        'sector'               => 'retail',
        'status'               => 'published',
        'productionDeployment' => $i === 5 ? 'no' : 'yes',
        'publishedAt'          => '2026-01-0' . $i . 'T00:00:00+00:00',
        'links'                => array('organizations' => array(array('refId' => null, 'labelRaw' => 'Only in ' . $i, 'url' => null, 'source' => 'manual', 'walletType' => null))),
    );
}
$fx = Fides_Use_Case_Explore_Choice::selection('sector', 'retail', $fixture);
$check($fx['matching'] === 5 && count($fx['shown']) === 4, 'fixture: five match, four are shown');
$labels = array_column($fx['relations']['organizations'], 'label');
$check(! in_array('Only in 5', $labels, true) && count($labels) === 4, 'fixture: an organisation linked only by a use case that is not shown is not listed');

// Empty data: a choice without published use cases keeps the choices and shows the message and a link to all use cases.
add_filter('fides_use_case_design_items', '__return_empty_array', 99);
Fides_Use_Case_Design::flush_cache();
$_GET = array('theme' => 'business_authority');
$empty_html = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => 'theme', 'overview_url' => '/fides-design-pilot/overview/'));
remove_filter('fides_use_case_design_items', '__return_empty_array', 99);
Fides_Use_Case_Design::flush_cache();
$_GET = array();
$check(strpos($empty_html, 'No examples yet') !== false && strpos($empty_html, 'Browse all use cases') !== false, 'empty data: message and link to all use cases');
$check(preg_match_all('/<a class="fides-explore__choice[ "]/', $empty_html) === 6 && strpos($empty_html, 'fides-explore__cards') === false && strpos($empty_html, 'On this page') === false, 'empty data: the six choices stay, no cards and no on-page navigation');

// Shortcode output: every choice renders the choices as links, one marked as current, the overview link carries the filter.
$wrong_page = get_page_by_path('fides-design-pilot/themes');
$check($wrong_page instanceof WP_Post, 'the themes page exists');
foreach (array('theme' => $themes, 'sector' => $sectors) as $kind => $choices) {
    $param = $kind;
    foreach ($choices as $slug => $label) {
        $_GET = array($param => $slug);
        $html = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => $kind, 'overview_url' => '/fides-design-pilot/overview/', 'detail_url' => '/fides-design-pilot/use-case/'));
        $n_links = preg_match_all('/<a class="fides-explore__choice[^"]*" href="[^"]*\?' . $param . '=/', $html);
        $check($n_links === count($choices), "{$kind}:{$slug} renders all " . count($choices) . ' choices as links (got ' . $n_links . ')');
        $check(substr_count($html, 'aria-current="true"') === 1, "{$kind}:{$slug} marks exactly one choice with aria-current");
        $check(strpos($html, 'data-fides-explore-state="selected"') !== false, "{$kind}:{$slug} renders the overview on the server");
        if ($table[ $kind . ':' . $slug ]['useCases'] > 0) {
            $check(strpos($html, 'overview/?' . $param . '=' . $slug) !== false, "{$kind}:{$slug} links to the filtered use case overview");
            $n = $table[ $kind . ':' . $slug ]['useCases'];
            $check(strpos($html, 'See all matching use cases') !== false && strpos($html, ($n === 1 ? 'One use case in' : ($n > 4 ? 'Showing 4 of ' . $n . ' use cases' : $n . ' use cases in'))) !== false, "{$kind}:{$slug} states the real number of matching use cases ({$n})");
        } else {
            $check(strpos($html, 'No examples yet') !== false, "{$kind}:{$slug} shows the empty message");
        }
    }
}

// No choice and unknown slug.
$_GET = array();
$none = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => 'theme'));
$check(strpos($none, 'data-fides-explore-state="none"') !== false && strpos($none, 'aria-current') === false, 'no choice: introduction state, nothing marked');
$_GET = array('theme' => 'nonsense');
$bad = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => 'theme'));
$check(strpos($bad, 'data-fides-explore-state="none"') !== false && strpos($bad, 'fides-explore__notice--invalid') !== false, 'unknown slug: introduction state with a notice');
$_GET = array('sector' => 'other');
$other = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => 'sector'));
$check(strpos($other, 'fides-explore__notice--invalid') !== false && strpos($other, 'data-choice="other"') === false, '?sector=other is not a valid choice');
$_GET = array('theme' => 'business_authority');
$wrong = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => 'sector'));
$check(strpos($wrong, 'data-fides-explore-state="none"') !== false, 'a theme parameter on the sector page is ignored');
$_GET = array();

// Editorial pages: one per choice, marked by the seed, published.
foreach (array('theme' => $themes, 'sector' => $sectors) as $kind => $choices) {
    $pages = Fides_Use_Case_Explore_Choice::content_pages($kind);
    foreach ($choices as $slug => $label) {
        $check(isset($pages[ $slug ]), "{$kind}:{$slug} has an editorial page (run create-explore-pages.sh)");
        if (isset($pages[ $slug ])) {
            $post = get_post($pages[ $slug ]);
            $check($post instanceof WP_Post && trim((string) $post->post_content) !== '' && $post->post_status === 'publish', "{$kind}:{$slug} editorial page has an introduction");
        }
    }
}

$out_dir = __DIR__ . '/output';
if (! is_dir($out_dir)) {
    mkdir($out_dir, 0775, true);
}
file_put_contents($out_dir . '/explore-themes-sectors-counts.json', wp_json_encode(array_values($table), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "kind:slug                                   use cases  shown  credentials  organisations  wallets\n";
foreach ($table as $key => $row) {
    printf("%-43s %9d %6d %12d %14d %8d\n", $key, $row['useCases'], $row['shown'], $row['credentials'], $row['organizations'], $row['wallets']);
}
echo "\n" . $results['pass'] . " passed, " . count($results['fail']) . " failed\n";
foreach ($results['fail'] as $failure) {
    echo "FAIL: {$failure}\n";
}
exit(count($results['fail']) ? 1 : 0);
