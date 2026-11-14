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
                if (trim((string) ($link['refId'] ?? '')) !== '') {
                    $ref = trim((string) $link['refId']);
                    $out[ $key ][] = 'ref:' . strtolower($key === 'credentials' ? Fides_Use_Case_Design::credential_canonical_id($ref) : $ref);
                }
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
                        // The row name is the link name, or the name of the catalog record the link's id points to.
                        if (in_array(strtolower($row['label']), $labels, true) || ($row['ref'] !== '' && in_array('ref:' . strtolower($row['ref']), $labels, true))) {
                            $found = true;
                        }
                    }
                    $check($found, "{$kind}:{$slug} {$bucket} '{$row['label']}' is an explicit link of {$uc_id}");
                }
            }
        }

        // Each record once per overview; detail page or listing only is decided by the catalog data.
        $stats = array('withImage' => 0, 'status' => array('yes' => 0, 'no' => 0, 'other' => 0), 'logos' => 0, 'detail' => array(), 'listingOnly' => array(), 'roles' => 0);
        foreach ($sel['shown'] as $item) {
            $stats['withImage'] += Fides_Use_Case_Design::image_url($item) !== '' ? 1 : 0;
            $pd = strtolower(trim((string) ($item['productionDeployment'] ?? '')));
            $stats['status'][ $pd === 'yes' || $pd === 'no' ? $pd : 'other' ]++;
        }
        foreach ($sel['relations'] as $bucket => $rows) {
            $refs  = array();
            $names = array();
            $stats['detail'][ $bucket ]      = 0;
            $stats['listingOnly'][ $bucket ] = 0;
            foreach ($rows as $row) {
                if ($row['ref'] !== '') {
                    $check(! isset($refs[ $row['kind'] . '|' . $row['ref'] ]), "{$kind}:{$slug} {$bucket} '{$row['label']}' (id {$row['ref']}) is listed once");
                    $refs[ $row['kind'] . '|' . $row['ref'] ] = true;
                }
                $name_key = $row['kind'] . '|' . strtolower(trim($row['label']));
                $check(! isset($names[ $name_key ]), "{$kind}:{$slug} {$bucket} name '{$row['label']}' is listed once");
                $names[ $name_key ] = true;
                $exists = false;
                if ($row['ref'] !== '') {
                    $class  = $bucket === 'organizations' ? 'Fides_Organization_Design' : ($bucket === 'credentials' ? 'Fides_Credential_Design' : 'Fides_Wallet_Design');
                    $exists = class_exists($class) && $class::find($row['ref']) !== null;
                }
                $check($row['detail'] === $exists && ($row['detail'] ? $row['href'] !== '' : $row['href'] === ''), "{$kind}:{$slug} {$bucket} '{$row['label']}': detail page only when the catalog record exists");
                $check(! $row['detail'] || strpos($row['href'], '/fides-design-pilot/') !== false, "{$kind}:{$slug} {$bucket} '{$row['label']}' links to the pilot detail page, not to a catalog route outside the pilot");
                $stats[ $row['detail'] ? 'detail' : 'listingOnly' ][ $bucket ]++;
                $stats['logos'] += ($bucket === 'organizations' && $row['logo'] !== '') ? 1 : 0;
                $stats['roles'] += count($row['roles']);
                foreach ($row['roles'] as $role) {
                    $check($bucket === 'organizations' && in_array($role, array('Issuer', 'Relying Party'), true), "{$kind}:{$slug} role '{$role}' is one of the two roles that follow from the issuers / rps links");
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
            'withImage'     => $stats['withImage'],
            'status'        => $stats['status'],
            'orgLogos'      => $stats['logos'],
            'detail'        => $stats['detail'],
            'listingOnly'   => $stats['listingOnly'],
            'roleChips'     => $stats['roles'],
        );
    }
}


// Rendering: statuses, headings and counts, listing only versus link, anchors, language marks (all choices).
$locale_filter = static function () {
    return 'nl_NL';
};
foreach (array('theme' => $themes, 'sector' => $sectors) as $kind => $choices) {
    foreach ($choices as $slug => $label) {
        $row = $table[ $kind . ':' . $slug ];
        if ($row['useCases'] === 0) {
            continue;
        }
        $_GET = array($kind => $slug);
        $html = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => $kind, 'overview_url' => '/fides-design-pilot/overview/', 'detail_url' => '/fides-design-pilot/use-case/'));
        $n    = $row['shown'];
        $check(substr_count($html, 'fides-ds-card--row') === $n, "{$kind}:{$slug} renders {$n} compact catalog row cards");
        $check(substr_count($html, 'fides-explore__status--production') === $row['status']['yes'] && substr_count($html, 'fides-explore__status--not-production') === $row['status']['no'], "{$kind}:{$slug} status badges equal the productionDeployment values (" . $row['status']['yes'] . ' yes, ' . $row['status']['no'] . ' no)');
        $check(substr_count($html, 'class="fides-ds-card__media fides-ds-card__media--contain"><img') === $row['withImage'], "{$kind}:{$slug} shows the catalog image of exactly the use cases that have one (" . $row['withImage'] . ')');
        foreach (array('credentials' => 'Credential types', 'organizations' => 'Organisations', 'wallets' => 'Wallets') as $bucket => $noun) {
            $total = $row[ $bucket ];
            if ($total === 0) {
                $check(strpos($html, 'data-relation="' . $bucket . '"') === false, "{$kind}:{$slug} no {$bucket} section without data");
                continue;
            }
            $check(strpos($html, '>' . $noun . '</h2>') !== false, "{$kind}:{$slug} heading is exactly '{$noun}' (the examples are named once, not in every heading)");
            $check(strpos($html, 'data-relation="' . $bucket . '" data-total="' . $total . '"') !== false, "{$kind}:{$slug} {$bucket} total is the number of unique records ({$total})");
        }
        $check(substr_count($html, 'data-fides-explore-relations-note') === (($row['credentials'] + $row['organizations'] + $row['wallets']) > 0 ? 1 : 0), "{$kind}:{$slug} the sentence that the lists belong to the shown use cases appears exactly once");
        $check(strpos($html, 'Each is listed once') === false && strpos($html, 'In 1 of these') === false && strpos($html, 'of these') === false && strpos($html, 'Listing only') === false && strpos($html, 'fides-explore__legend') === false, "{$kind}:{$slug} no repeated duplicate explanation, no 'In N of these examples', no 'Listing only'");
        $check(preg_match_all('/<details class="fides-explore__from"><summary>(Related use case|[2-4] related use cases)<\/summary>/', $html) === substr_count($html, '<details class="fides-explore__from">'), "{$kind}:{$slug} every row summary is 'Related use case' or 'N related use cases'");
        $check(strpos($html, '<h1 class="fides-ds-heading-1 fides-explore__title" id="fides-explore-title" tabindex="-1">') !== false && substr_count($html, '<h1') === 1 && strpos($html, 'data-fides-explore-change>' . ($kind === 'sector' ? 'Change sector' : 'Change theme')) !== false, "{$kind}:{$slug} one H1 (the chosen name) and the phone action Change {$kind}");
        $check(strpos($html, 'class="fides-ds-section-nav fides-explore__sections" data-fides-ds-section-nav') !== false && strpos($html, '<summary>On this page') !== false && strpos($html, 'class="fides-explore__onpage"') === false, "{$kind}:{$slug} uses the shared 'On this page' section bar");
        // Anchors of the "In N of these examples" lists exist.
        preg_match_all('/<details class="fides-explore__from">.*?<\/details>/s', $html, $lists);
        $anchors_ok = true;
        foreach ($lists[0] as $block) {
            preg_match_all('/href="#(explore-example-\d+)"/', $block, $hrefs);
            foreach ($hrefs[1] as $anchor) {
                $anchors_ok = $anchors_ok && strpos($html, 'id="' . $anchor . '"') !== false;
            }
            $anchors_ok = $anchors_ok && ! empty($hrefs[1]);
        }
        $check($anchors_ok, "{$kind}:{$slug} every example list links to an example card on the page");
        // Without a catalog page: plain name, no link, no label (linked rows have an arrow).
        $check(substr_count($html, 'fides-explore__badge') === 0 && substr_count($html, 'fides-explore__link"') === (int) preg_match_all('/data-detail="yes"/', $html), "{$kind}:{$slug} only rows with a catalog page have a link, none has a label");
        $check(preg_match_all('/data-detail="no"[^>]*>(?:(?!<\/li>).)*<a class="fides-explore__link"/s', $html) === 0, "{$kind}:{$slug} a row without a catalog page never links");
        $check(substr_count($html, 'fides-explore__link"') === substr_count($html, '<span aria-hidden="true">→</span></a></span>'), "{$kind}:{$slug} every link has its arrow");
        $check(strpos($html, 'lang="en" data-no-translation') === false && strpos($html, 'data-fides-explore-lang-note') === false, "{$kind}:{$slug} English page: no language marks");
        add_filter('locale', $locale_filter, PHP_INT_MAX);
        $nl = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => $kind, 'overview_url' => '/fides-design-pilot/overview/', 'detail_url' => '/fides-design-pilot/use-case/'));
        remove_filter('locale', $locale_filter, PHP_INT_MAX);
        $check(substr_count($nl, '<a class="fides-ds-card__link" lang="en" data-no-translation') === $n, "{$kind}:{$slug} non-English page: every use case title is marked lang=en");
        $check(substr_count($nl, '<p class="fides-ds-card__summary" lang="en" data-no-translation>') === $n, "{$kind}:{$slug} non-English page: every summary is marked lang=en");
        $check(strpos($nl, 'data-fides-explore-lang-note>Catalog content is shown in English.') !== false, "{$kind}:{$slug} non-English page: states that catalog content is English");
        $check(strpos($nl, '<span lang="en" data-no-translation>') !== false || ($row['organizations'] + $row['credentials'] + $row['wallets']) === 0, "{$kind}:{$slug} non-English page: record names are marked lang=en");
    }
}
$_GET = array();

// Fixture: one record once, roles per example only from the issuers / rps links, detail versus listing only, single example.
$org_ids  = array_column(Fides_Organization_Design::items(), 'id');
$org_ref  = (string) $org_ids[0];
$org_name = (string) Fides_Organization_Design::find($org_ref)['name'];
$mk = static function (string $id, string $title, array $links): array {
    return array('id' => $id, 'title' => $title, 'sector' => 'retail', 'status' => 'published', 'productionDeployment' => 'yes', 'publishedAt' => '2026-02-01T00:00:00+00:00', 'links' => $links);
};
$ghost = array('refId' => 'org:does-not-exist-xyz', 'labelRaw' => 'Ghost Org', 'url' => 'https://example.invalid', 'source' => 'catalog', 'walletType' => null);
$real  = array('refId' => $org_ref, 'labelRaw' => $org_name, 'url' => null, 'source' => 'catalog', 'walletType' => null);
$man   = array('refId' => null, 'labelRaw' => '  ' . strtoupper($org_name) . ' ', 'url' => null, 'source' => 'manual', 'walletType' => null);
$only_issuer = array('refId' => null, 'labelRaw' => 'Issuer Only Ltd', 'url' => null, 'source' => 'manual', 'walletType' => null);
$dups = array(
    $mk('dx-1', 'Dup one', array('organizations' => array($real, $ghost), 'issuers' => array($man, $only_issuer))),
    $mk('dx-2', 'Dup two', array('organizations' => array($man), 'rps' => array($real))),
    $mk('dx-3', 'Dup three', array('organizations' => array($real))),
);
$d = Fides_Use_Case_Explore_Choice::selection('sector', 'retail', $dups);
$orgs = $d['relations']['organizations'];
$by_ref = array();
foreach ($orgs as $o) {
    $by_ref[ $o['ref'] !== '' ? $o['ref'] : $o['label'] ] = $o;
}
$check(count($orgs) === 2 && isset($by_ref[ $org_ref ], $by_ref['org:does-not-exist-xyz']), 'fixture: the same organisation (id, and the same name without id) is one row; an issuer-only name is no organisation row (got ' . count($orgs) . ')');
$check(count($by_ref[ $org_ref ]['use_cases']) === 3, 'fixture: the one row names all three examples');
$check($by_ref[ $org_ref ]['roles'] === array('Issuer', 'Relying Party') && array_keys($by_ref[ $org_ref ]['case_roles']) === array('dx-1', 'dx-2'), 'fixture: roles per example only from the issuers / rps links of that example');
$check($by_ref[ $org_ref ]['detail'] === true && $by_ref['org:does-not-exist-xyz']['detail'] === false && $by_ref['org:does-not-exist-xyz']['href'] === '', 'fixture: existing record has a detail page, an unknown id is listing only without a destination');
$_GET = array('sector' => 'retail');
add_filter('fides_use_case_design_items', static function () use ($dups) {
    return $dups;
}, 99);
Fides_Use_Case_Design::flush_cache();
$dhtml = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => 'sector', 'overview_url' => '/fides-design-pilot/overview/'));
$check(strpos($dhtml, '>Organisations</h2>') !== false && strpos($dhtml, 'data-relation="organizations" data-total="2"') !== false && strpos($dhtml, '<summary>3 related use cases</summary>') !== false && strpos($dhtml, '<summary>Related use case</summary>') !== false, 'fixture: plain heading, two unique organisations, the summaries count related use cases (3 and 1)');
$check(strpos($dhtml, 'Listing only') === false && strpos($dhtml, 'Ghost Org</span></span>') !== false && strpos($dhtml, 'href="https://example.invalid') === false, 'fixture: the unknown organisation is plain text without a label, its own website is not linked');
$check(strpos($dhtml, '· Issuer</span>') !== false && strpos($dhtml, '· Relying Party</span>') !== false, 'fixture: per-example role shown in the example list');
remove_all_filters('fides_use_case_design_items');
$single = array($mk('sx-1', 'Single example', array('organizations' => array($real), 'credentials' => array(array('refId' => null, 'labelRaw' => 'Unlisted credential', 'url' => null, 'source' => 'manual', 'walletType' => null)))));
add_filter('fides_use_case_design_items', static function () use ($single) {
    return $single;
}, 99);
Fides_Use_Case_Design::flush_cache();
$shtml = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => 'sector', 'overview_url' => '/fides-design-pilot/overview/'));
$check(strpos($shtml, '>Organisations</h2>') !== false && strpos($shtml, '<summary>Related use case</summary>') !== false && strpos($shtml, 'belong to the use case shown above.') !== false && strpos($shtml, 'related use cases') === false, 'fixture: one example gives singular wording');
remove_all_filters('fides_use_case_design_items');
Fides_Use_Case_Design::flush_cache();
$_GET = array();

// Dutch rows: every new string has a human-readable Dutch row (dictionary or gettext), none empty.
global $wpdb;
$dict = $wpdb->prefix . 'trp_dictionary_en_us_nl_nl';
$get  = $wpdb->prefix . 'trp_gettext_nl_nl';
foreach (array('Catalog content is shown in English.', 'In production', 'Not in production', 'No examples yet', 'Browse all use cases', 'Change sector', 'Change theme') as $en) {
    $t = (string) $wpdb->get_var($wpdb->prepare("SELECT translated FROM $dict WHERE BINARY original = %s LIMIT 1", $en)); // phpcs:ignore
    $check($t !== '', "Dutch dictionary row for '{$en}'" . ($t !== '' ? " ({$t})" : ''));
}
foreach (array('Related use case', '%d related use cases', 'These credential types, organisations and wallets belong to the use cases shown above.', 'The catalog has no published use case here yet.', '“%s” is not a theme we know. Choose one of the options below.', '“%s” is not a sector we know. Choose one of the options below.') as $en) {
    $t = (string) $wpdb->get_var($wpdb->prepare("SELECT translated FROM $get WHERE domain = 'fides-use-case-catalog' AND BINARY original = %s LIMIT 1", $en)); // phpcs:ignore
    $check($t !== '', "Dutch gettext row for '{$en}'");
}
foreach (array('Sharing information from a wallet · Learn →', 'How can someone act for an organisation? · Learn →', 'Digital wallets and public services · Learn →', 'What should a service check when receiving a credential? · Learn →') as $en) {
    $t = (string) $wpdb->get_var($wpdb->prepare("SELECT translated FROM $dict WHERE BINARY original = %s LIMIT 1", $en)); // phpcs:ignore
    $check($t !== '' && substr($t, -9) === 'Learn →', "Learn link keeps the site name 'Learn' in Dutch ({$t})");
}
$bm = (string) $wpdb->get_var("SELECT translated FROM $dict WHERE BINARY original = 'Business &amp; Mandates' LIMIT 1"); // phpcs:ignore
$check($bm === 'Bedrijven en mandaten', "business_authority title uses 'mandaten' ({$bm})");

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

// No choice: the heading names the page, no phone action, all choices; a chosen page names the choice.
foreach (array('theme' => array('Explore by theme', 'Business & Mandates', 'business_authority'), 'sector' => array('Explore by sector', 'Education', 'education')) as $kind => $words) {
    $_GET = array();
    $h = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => $kind));
    $check(strpos($h, 'tabindex="-1">' . $words[0] . '</h1>') !== false && strpos($h, 'data-fides-explore-change') === false && strpos($h, 'data-fides-ds-section-nav') === false, "{$kind}: without a choice the H1 is '{$words[0]}', there is no Change action and no section bar");
    $_GET = array($kind => $words[2]);
    $h = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => $kind));
    $check(strpos($h, 'tabindex="-1">' . str_replace('&', '&amp;', $words[1]) . '</h1>') !== false, "{$kind}: with a choice the H1 is the chosen name '{$words[1]}'");
}
$_GET = array();

// Editorial order (data/explore-featured-use-cases.json): featured use cases come first, only when they match the choice.
$front = static function (string $kind, string $slug) use ($items): array {
    return array_column(array_slice(Fides_Use_Case_Explore_Choice::matching_items($kind, $slug, $items), 0, 4), 'id');
};
$check($front('sector', 'education') === Fides_Use_Case_Explore_Choice::featured_ids('sector', 'education') && count($front('sector', 'education')) === 4, 'editorial order: Education starts with the four featured use cases, in the order of the data file');
$edu_titles = array_column(array_slice(Fides_Use_Case_Explore_Choice::matching_items('sector', 'education', $items), 0, 2), 'title');
$check(strpos((string) $edu_titles[0], 'Verification of Education Credentials') !== false && strpos((string) $edu_titles[1], 'Academic Credential') !== false, 'editorial order: Education leads with diploma / academic credential verification');
$biz = array_column(array_slice(Fides_Use_Case_Explore_Choice::matching_items('theme', 'business_authority', $items), 0, 2), 'title');
$check(strpos((string) $biz[0], 'Hypersign KYB') === 0 && strpos((string) $biz[1], 'Mandator') === 0, 'editorial order: Business & Mandates leads with Hypersign KYB and Mandator');
$stale = static function ($ids, $k, $s) { return $k === 'sector' && $s === 'education' ? array_merge(array('does-not-exist', 'faster-onboarding-not-matching'), $ids) : $ids; };
add_filter('fides_explore_choice_featured', $stale, 10, 3);
$check(Fides_Use_Case_Explore_Choice::matching_items('sector', 'education', $items)[0]['id'] === $front('sector', 'education')[0], 'editorial order: an unknown id in the data is skipped, a stale entry changes nothing');
remove_filter('fides_explore_choice_featured', $stale);
$foreign = static function ($ids, $k, $s) { return $k === 'sector' && $s === 'education' ? array('mandator-public-procurement-portal-0aYOCh') : $ids; };
add_filter('fides_explore_choice_featured', $foreign, 10, 3);
$check(! in_array('mandator-public-procurement-portal-0aYOCh', array_column(Fides_Use_Case_Explore_Choice::matching_items('sector', 'education', $items), 'id'), true), 'editorial order: a featured id that does not match the choice is never added');
remove_filter('fides_explore_choice_featured', $foreign);

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
    printf(
        "%-43s %9d %6d %12d %14d %8d   img %d, status %d/%d, logos %d/%d orgs, detail %d+%d+%d, listing only %d+%d+%d\n",
        $key,
        $row['useCases'],
        $row['shown'],
        $row['credentials'],
        $row['organizations'],
        $row['wallets'],
        $row['withImage'],
        $row['status']['yes'],
        $row['status']['no'],
        $row['orgLogos'],
        $row['organizations'],
        $row['detail']['credentials'],
        $row['detail']['organizations'],
        $row['detail']['wallets'],
        $row['listingOnly']['credentials'],
        $row['listingOnly']['organizations'],
        $row['listingOnly']['wallets']
    );
}
echo "\n" . $results['pass'] . " passed, " . count($results['fail']) . " failed\n";
foreach ($results['fail'] as $failure) {
    echo "FAIL: {$failure}\n";
}
exit(count($results['fail']) ? 1 : 0);
