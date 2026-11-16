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

/**
 * Round 4: "More from the catalog" (Fides_Use_Case_Explore_Catalog). Every record is traced back to the sector/theme it carries
 * itself, or to the related record it is derived from; counts are recounted independently; the HTML is checked per choice.
 * ONLY_ROUND4=1 runs only this part. Writes tests/output/explore-catalog-block.json for the browser checks.
 */
$round4 = static function () use ($check, $items, $themes, $sectors, &$results): array {
    $overview = home_url('/fides-design-pilot/overview/');
    $report   = array();
    $cred_by_id = array();
    foreach (Fides_Credential_Design::items() as $c) {
        $cred_by_id[ (string) $c['id'] ] = $c;
    }
    $org_by_id = array();
    foreach (Fides_Organization_Design::items() as $o) {
        $org_by_id[ (string) $o['id'] ] = $o;
    }
    foreach (array('theme' => $themes, 'sector' => $sectors) as $kind => $choices) {
        foreach (array_keys($choices) as $slug) {
            $tag = "round4 {$kind}:{$slug}";
            $sel = Fides_Use_Case_Explore_Catalog::selection($kind, $slug, $overview);
            $check(! isset($sel['wallets']), "{$tag}: no wallets part (wallet records have no sector or theme)");
            $codes = $kind === 'theme' ? Fides_Use_Case_Explore_Catalog::bundle_theme_codes($slug) : array();
            // Independent recount of the direct credential types.
            $direct_cred = array();
            foreach ($cred_by_id as $id => $c) {
                $hit = $kind === 'sector'
                    ? in_array($slug, Fides_Use_Case_Explore_Catalog::sector_codes($c['sectors'] ?? array()), true)
                    : (bool) array_intersect($codes, (array) ($c['themes'] ?? array()));
                if ($hit) {
                    $direct_cred[] = $id;
                }
            }
            $check(($sel['credentials']['total'] ?? 0) === count($direct_cred), "{$tag}: credential types total equals an independent recount (" . count($direct_cred) . ')');
            $check($kind !== 'theme' || count($codes) > 0, "{$tag}: the bundle has theme codes in the theme map");
            foreach ($sel as $type => $entry) {
                $ids = array_map(static fn ($r) => Fides_Use_Case_Explore_Catalog::record_id($type, $r), $entry['records']);
                $check(count($ids) === count(array_unique($ids)) && count($ids) === (int) $entry['total'], "{$tag}/{$type}: each record once, total equals the list");
                $check(in_array($entry['basis'], array('direct', 'derived'), true) && $entry['how'] !== '', "{$tag}/{$type}: the basis is named");
                foreach ($entry['records'] as $r) {
                    $rid = Fides_Use_Case_Explore_Catalog::record_id($type, $r);
                    if ($type === 'credentials') {
                        $check(in_array($rid, $direct_cred, true), "{$tag}/credentials {$rid} carries the sector/theme itself");
                    } elseif ($type === 'organizations') {
                        $check(in_array($slug, Fides_Organization_Design::sector_codes($r), true), "{$tag}/organizations {$rid} lists the sector itself");
                    } elseif ($type === 'rps' && $entry['basis'] === 'direct') {
                        $check(in_array($slug, Fides_Use_Case_Explore_Catalog::sector_codes($r['sectors'] ?? array()), true), "{$tag}/rps {$rid} lists the sector itself");
                    } elseif ($type === 'issuers' && $kind === 'sector') {
                        $org = $org_by_id[ (string) ($r['orgId'] ?? '') ] ?? null;
                        $check($org !== null && in_array($slug, Fides_Organization_Design::sector_codes($org), true), "{$tag}/issuers {$rid}: the organisation {$r['orgId']} lists the sector");
                    } else {
                        $refs = array();
                        foreach ($type === 'issuers' ? (array) ($r['credentialConfigurations'] ?? array()) : (array) ($r['acceptedCredentialRefs'] ?? array()) as $x) {
                            $refs[] = Fides_Credential_Design::canonical_id((string) ($type === 'issuers' ? ($x['credentialCatalogRef']['id'] ?? '') : ($x['credentialCatalogId'] ?? $x['id'] ?? '')));
                        }
                        $check((bool) array_intersect($refs, $direct_cred), "{$tag}/{$type} {$rid}: reached through a credential type of the selection");
                    }
                }
                // A view-all link exists only where the destination has a working filter for exactly this selection.
                $filterable = $entry['how'] === 'credentials-sector' || $entry['how'] === 'credentials-theme' || $entry['how'] === 'organizations-sector'
                    || $entry['how'] === 'issuers-credentials-theme' || $entry['how'] === 'rps-credentials-theme'
                    || $entry['how'] === 'issuers-org-sector' || $entry['how'] === 'rps-sector';
                $check(($entry['url'] !== '') === $filterable, "{$tag}/{$type}: view-all link only with a working destination filter ({$entry['how']})");
                if ($entry['how'] === 'credentials-theme') {
                    $check(strpos($entry['url'], 'theme=' . implode(',', $codes)) !== false, "{$tag}/credentials: the link carries the theme codes of the bundle");
                }
                if ($type === 'credentials') {
                    $last_rank = -1;
                    $last_sectors = -1;
                    $identity = 0;
                    foreach ($entry['records'] as $credential) {
                        $rank = ($kind === 'theme' && $slug === 'business_authority' && Fides_Use_Case_Explore_Catalog::is_identity_or_representation($credential)) ? 0 : ($kind === 'theme' && $slug === 'business_authority' ? 1 : 0);
                        $sectors = count(Fides_Use_Case_Explore_Catalog::sector_codes($credential['sectors'] ?? array()));
                        if ($last_rank >= 0) {
                            $check($rank > $last_rank || ($rank === $last_rank && $sectors >= $last_sectors), "{$tag}/credentials: specific types stay ahead of generic ones, and on Business & Mandates identity and representation come first");
                        }
                        $identity += $rank === 0 && $kind === 'theme' && $slug === 'business_authority' ? 1 : 0;
                        $last_rank = $rank;
                        $last_sectors = $sectors;
                    }
                    if ($kind === 'theme' && $slug === 'business_authority') {
                        $check($identity > 0 && $identity < count($entry['records']), "{$tag}/credentials: the filtered set contains both identity/representation types and other types ({$identity})");
                    }
                }
                if ($type === 'issuers' || $type === 'rps') {
                    // Round 5: one short ?sector= / ?theme= parameter instead of one credential[] per type (up to 36 pills).
                    parse_str((string) parse_url($entry['url'], PHP_URL_QUERY), $q);
                    $check(($q[ $kind ] ?? null) === $slug && count($q) === 1, "{$tag}/{$type}: the link is the short ?{$kind}={$slug} filter and nothing else");
                    $class = $type === 'issuers' ? 'Fides_Issuer_Design' : 'Fides_RP_Design';
                    $again = $class::filter_items($class::items(), '', array($kind => array($slug)), array());
                    $check(count($again) === (int) $entry['total'], "{$tag}/{$type}: the overview filter returns exactly the {$entry['total']} records of the block");
                }
            }

            // HTML
            $_GET = array($kind => $slug);
            $html = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => $kind, 'overview_url' => '/fides-design-pilot/overview/', 'detail_url' => '/fides-design-pilot/use-case/'));
            $_GET = array();
            preg_match_all('/<section class="fides-explore__catalog-type" data-catalog-type="([a-z]+)" data-basis="([a-z]+)" data-total="(\d+)" data-shown="(\d+)" data-has-link="([a-z]+)"(.*?)<\/section>/s', $html, $m, PREG_SET_ORDER);
            $types = array();
            foreach ($m as $part) {
                $cards = substr_count($part[6], 'data-record-id="');
                $types[] = array('type' => $part[1], 'basis' => $part[2], 'total' => (int) $part[3], 'shown' => (int) $part[4], 'hasLink' => $part[5] === 'yes');
                $check($cards === (int) $part[4] && $cards >= 1 && $cards <= 4 && $cards === min(4, (int) $part[3]), "{$tag}/{$part[1]}: {$cards} cards, at most four, never an empty part");
                preg_match_all('/data-record-id="([^"]+)"/', $part[6], $ids);
                $check(count($ids[1]) === count(array_unique($ids[1])), "{$tag}/{$part[1]}: record ids are unique in the part");
                $check($part[5] === 'yes' ? substr_count($part[6], 'data-fides-explore-all="' . $part[1] . '"') === 1 : strpos($part[6], 'data-fides-explore-all') === false, "{$tag}/{$part[1]}: the link exists exactly when the data says so");
                $check($part[1] !== 'organizations' || strpos($part[6], 'fides-explore__all-count') === false, "{$tag}/organizations: no number on the link (the organisation overview loads another snapshot)");
                $check($part[1] === 'organizations' || $part[5] === 'no' || strpos($part[6], '(' . $part[3] . ')') !== false, "{$tag}/{$part[1]}: the number on the link is the total");
            }
            $check(count($types) === count($sel), "{$tag}: one part per type with records (" . count($types) . '/' . count($sel) . ')');
            $check((strpos($html, 'id="explore-catalog"') !== false) === (count($sel) > 0), "{$tag}: the block exists exactly when a type has records");
            $check(strpos($html, 'data-catalog-type="wallets"') === false, "{$tag}: no wallets part in the HTML");

            // Dedupe: a record that is a relation of a shown use case says so; nothing else does.
            $selection = Fides_Use_Case_Explore_Choice::selection($kind, $slug, $items);
            $rel_refs  = array('credentials' => array(), 'organizations' => array());
            foreach (array_keys($rel_refs) as $bucket) {
                foreach ($selection['relations'][ $bucket ] as $row) {
                    if ($row['ref'] !== '') {
                        $rel_refs[ $bucket ][] = $row['ref'];
                    }
                }
            }
            $expected_also = 0;
            foreach (array('credentials', 'organizations') as $bucket) {
                foreach (array_slice($sel[ $bucket ]['records'] ?? array(), 0, 4) as $r) {
                    $expected_also += in_array(Fides_Use_Case_Explore_Catalog::record_id($bucket, $r), $rel_refs[ $bucket ], true) ? 1 : 0;
                }
            }
            $check(substr_count($html, 'data-fides-explore-also') === 0 && strpos($html, 'Classified directly') === false && strpos($html, 'Derived from related records') === false, "{$tag}: no basis badge and no 'also linked' note");
            $check(strpos($html, 'Explore the catalogs') !== false && strpos($html, 'How are these selected?') !== false, "{$tag}: the catalog section and the selection disclosure are present");
            $report[ $kind . ':' . $slug ] = array('types' => $types, 'also' => 0, 'urls' => array_map(static fn ($e) => $e['url'], $sel), 'totals' => array_map(static fn ($e) => (int) $e['total'], $sel));
        }
    }
    // A choice without any record: the block is left out completely.
    $none = static fn () => array();
    add_filter('fides_explore_catalog_selection', $none);
    $_GET = array('sector' => 'education');
    $html = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => 'sector', 'overview_url' => '/fides-design-pilot/overview/'));
    $_GET = array();
    remove_filter('fides_explore_catalog_selection', $none);
    $check(strpos($html, 'explore-catalog') === false && strpos($html, 'Explore the catalogs') === false, 'round4: without any record the block and the "On this page" entry are left out');
    $check(strpos($html, 'id="explore-use-cases"') !== false, 'round4: without catalog records the use cases stay');
    return $report;
};
$round6 = static function () use ($check, $items): void {
    foreach (array(array('sector', 'education'), array('theme', 'business_authority')) as $pair) {
        list($kind, $slug) = $pair;
        $_GET = array($kind => $slug);
        $html = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => $kind, 'overview_url' => '/fides-design-pilot/overview/', 'detail_url' => '/fides-design-pilot/use-case/'));
        $_GET = array();
        $tag = "round6 {$kind}:{$slug}";
        $check(strpos($html, 'id="explore-credentials"') === false && strpos($html, 'Related use case') === false, "{$tag}: shared relation sections are gone");
        $check(strpos($html, 'href="#explore-use-cases"') !== false && strpos($html, 'href="#explore-catalog"') !== false && strpos($html, '>Explore the catalogs</a>') !== false, "{$tag}: On this page lists Use cases and Explore the catalogs");
        $check(strpos($html, 'How are these selected?') !== false && strpos($html, 'Classified directly') === false, "{$tag}: selection basis is in the disclosure, not a badge");
        $check(preg_match_all('/data-fides-explore-all="(credentials|organizations|issuers|rps)"/', $html, $alls) >= 1, "{$tag}: at least one View all link");
        foreach ($alls[1] as $type) {
            $check(strpos($html, 'data-fides-explore-all="' . $type . '"') !== false, "{$tag}: View all for {$type}");
        }
        $sel = Fides_Use_Case_Explore_Choice::selection($kind, $slug, $items);
        $check(substr_count($html, 'Related credentials, organizations and wallets') === count($sel['shown']), "{$tag}: one relations disclosure per shown use case");
    }
    $overview = home_url('/fides-design-pilot/overview/');
    $biz = Fides_Use_Case_Explore_Catalog::selection('theme', 'business_authority', $overview);
    $first = array_slice($biz['credentials']['records'], 0, 4);
    $check(count($first) === 4 && Fides_Use_Case_Explore_Catalog::is_identity_or_representation($first[0]) && Fides_Use_Case_Explore_Catalog::is_identity_or_representation($first[3]), 'round6: the four Business & Mandates credential types shown are identity or representation');
};
if (getenv('ONLY_ROUND6') === '1') {
    $round6();
    echo $results['pass'] . " passed, " . count($results['fail']) . " failed\n";
    foreach ($results['fail'] as $failure) {
        echo "FAIL: {$failure}\n";
    }
    exit(count($results['fail']) ? 1 : 0);
}
if (getenv('ONLY_ROUND4') === '1') {
    $report = $round4();
    $dir    = __DIR__ . '/output';
    file_put_contents($dir . '/explore-catalog-block.json', wp_json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    echo count($report) . " choices checked\n" . $results['pass'] . " passed, " . count($results['fail']) . " failed\n";
    foreach ($results['fail'] as $failure) {
        echo "FAIL: {$failure}\n";
    }
    exit(count($results['fail']) ? 1 : 0);
}

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
        // The use case part of the page (the "More from the catalog" block, round 4, is checked separately).
        $cut  = strpos($html, 'id="explore-catalog"');
        $html = $cut !== false ? substr($html, 0, $cut) : $html;
        $check(substr_count($html, 'fides-ds-card--row') === $n, "{$kind}:{$slug} renders {$n} compact catalog row cards");
        $check(substr_count($html, 'fides-explore__status--production') === $row['status']['yes'] && substr_count($html, 'fides-explore__status--not-production') === $row['status']['no'], "{$kind}:{$slug} status badges equal the productionDeployment values (" . $row['status']['yes'] . ' yes, ' . $row['status']['no'] . ' no)');
        $check(substr_count($html, 'class="fides-ds-card__media fides-ds-card__media--contain"><img') === $row['withImage'], "{$kind}:{$slug} shows the catalog image of exactly the use cases that have one (" . $row['withImage'] . ')');
        $check(strpos($html, 'id="explore-credentials"') === false && strpos($html, 'id="explore-organisations"') === false && strpos($html, 'id="explore-wallets"') === false, "{$kind}:{$slug} no shared Credential types / Organisations / Wallets sections");
        $check(strpos($html, 'fides-explore__from') === false && strpos($html, 'data-fides-explore-relations-note') === false && strpos($html, 'Related use case') === false, "{$kind}:{$slug} no shared relation note and no 'Related use case' details");
        $check(strpos($html, 'Each is listed once') === false && strpos($html, 'In 1 of these') === false && strpos($html, 'of these') === false && strpos($html, 'Listing only') === false && strpos($html, 'fides-explore__legend') === false, "{$kind}:{$slug} no repeated duplicate explanation, no 'In N of these examples', no 'Listing only'");
        $check(substr_count($html, 'Related credentials, organizations and wallets') === $n, "{$kind}:{$slug} every use case card has the relations disclosure");
        $check(strpos($html, 'href="#explore-use-cases"') !== false && strpos($html, '>Use cases</a>') !== false && strpos($html, 'href="#explore-credentials"') === false && strpos($html, 'href="#explore-organisations"') === false && strpos($html, 'href="#explore-wallets"') === false, "{$kind}:{$slug} 'On this page' lists Use cases and not the removed relation sections");
        $check(strpos($html, '<h1 class="fides-ds-heading-1 fides-explore__title" id="fides-explore-title" tabindex="-1">') !== false && substr_count($html, '<h1') === 1 && strpos($html, 'data-fides-explore-change>' . ($kind === 'sector' ? 'Change sector' : 'Change theme')) !== false, "{$kind}:{$slug} one H1 (the chosen name) and the phone action Change {$kind}");
        $check(strpos($html, 'class="fides-ds-section-nav fides-explore__sections" data-fides-ds-section-nav') !== false && strpos($html, '<summary>On this page') !== false && strpos($html, 'class="fides-explore__onpage"') === false, "{$kind}:{$slug} uses the shared 'On this page' section bar");
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
        // Status message templates for the aria-live region come from gettext: English here; the Dutch template is verified in the browser test (TranslatePress gettext rows only apply on a real /nl/ request).
        $check(strpos($html, 'data-live-selected="%s selected"') !== false && strpos($html, 'data-live-none="No selection"') !== false, "{$kind}:{$slug} English page: live status templates are English");
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
$check(strpos($dhtml, 'id="explore-organisations"') === false && strpos($dhtml, 'Related use case') === false && substr_count($dhtml, 'Related credentials, organizations and wallets') === 3, 'fixture: each use case has its own relations disclosure, no shared organisation section');
$check(strpos($dhtml, 'Listing only') === false && strpos($dhtml, 'Ghost Org</span>') !== false && strpos($dhtml, 'href="https://example.invalid') === false, 'fixture: the unknown organisation is plain text without a label, its own website is not linked');
$check(substr_count($dhtml, 'id="explore-example-1"') === 1 && strpos($dhtml, 'Ghost Org') !== false, 'fixture: the unknown organisation stays on the use case that links it');
remove_all_filters('fides_use_case_design_items');
$single = array($mk('sx-1', 'Single example', array('organizations' => array($real), 'credentials' => array(array('refId' => null, 'labelRaw' => 'Unlisted credential', 'url' => null, 'source' => 'manual', 'walletType' => null)))));
add_filter('fides_use_case_design_items', static function () use ($single) {
    return $single;
}, 99);
Fides_Use_Case_Design::flush_cache();
$shtml = Fides_Use_Case_Explore_Choice::shortcode(array('kind' => 'sector', 'overview_url' => '/fides-design-pilot/overview/'));
$check(substr_count($shtml, 'Related credentials, organizations and wallets') === 1 && strpos($shtml, 'belong to the use case shown above.') === false && strpos($shtml, 'id="explore-organisations"') === false, 'fixture: one example keeps its relations on the card');
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
$check(preg_match_all('/<a class="fides-explore__choice[ "]/', $empty_html) === 6 && strpos($empty_html, 'data-fides-explore-cards') === false && strpos($empty_html, 'href="#explore-use-cases"') === false, 'empty data: the six choices stay and Use cases is not on the page');
$check((strpos($empty_html, 'id="explore-catalog"') !== false) === (strpos($empty_html, '>Explore the catalogs</a>') !== false), 'empty data: the section bar names Explore the catalogs only when that section is present');

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
$biz = array_column(array_slice(Fides_Use_Case_Explore_Choice::matching_items('theme', 'business_authority', $items), 0, 4), 'title');
$check(strpos((string) $biz[0], 'Business Wallet-Based KYB') === 0 && strpos((string) $biz[1], 'From Document Trust') === 0 && strpos((string) $biz[2], 'Hypersign KYB') === 0 && strpos((string) $biz[3], 'Mandator') === 0, 'editorial order: Business & Mandates leads with Business Wallet-Based KYB, From Document Trust, Hypersign KYB and Mandator');
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

$round6();
$report4 = $round4();
$out_dir = __DIR__ . '/output';
if (! is_dir($out_dir)) {
    mkdir($out_dir, 0775, true);
}
file_put_contents($out_dir . '/explore-catalog-block.json', wp_json_encode($report4, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
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
