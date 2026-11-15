<?php
/**
 * Inventory of the catalog records that belong to a theme / sector (read only; no database writes).
 *
 * Per choice and per catalog type: records with their own sector/theme (direct), records linked from ALL matching use cases,
 * records linked from the (at most four) featured use cases, the overlap of these groups and the records reached indirectly
 * (issuer via the sector of its organisation, issuer / relying party via credential types). Writes
 * tests/output/explore-catalog-links-inventory.json; explore/catalog-links-inventory-2026-11-15.md is made from it.
 * Run: pilot_wp eval-file tests/explore-catalog-links-inventory.php
 */
if (! defined('ABSPATH')) {
    exit(1);
}

$items = Fides_Use_Case_Design::items();
$by_id = array();
foreach ($items as $item) {
    $by_id[ (string) $item['id'] ] = $item;
}

$exists = array(
    'credentials'   => array_flip(array_map(static fn ($r) => (string) $r['id'], Fides_Credential_Design::items())),
    'organizations' => array_flip(array_map(static fn ($r) => (string) $r['id'], Fides_Organization_Design::items())),
    'issuers'       => array_flip(array_map(static fn ($r) => (string) $r['id'], Fides_Issuer_Design::items())),
    'rps'           => array_flip(array_map(static fn ($r) => (string) $r['id'], Fides_RP_Design::items())),
    'wallets'       => array_flip(array_map(static fn ($r) => (string) $r['id'], Fides_Wallet_Design::items())),
);

/** Refs of one link key over a list of use case ids; credentials resolve to the canonical type id. */
$linked = static function (array $ids, array $keys, string $type) use ($by_id, $exists): array {
    $raw = array();
    $out = array();
    foreach ($ids as $id) {
        foreach ($keys as $key) {
            foreach ((array) ($by_id[ $id ]['links'][ $key ] ?? array()) as $link) {
                $ref = is_array($link) ? trim((string) ($link['refId'] ?? '')) : '';
                if ($ref === '') {
                    $raw[ $key ] = ($raw[ $key ] ?? 0) + 1; // named only, no id
                    continue;
                }
                $ref = $type === 'credentials' ? Fides_Credential_Design::canonical_id($ref) : $ref;
                if (isset($exists[ $type ][ $ref ])) {
                    $out[ $ref ] = true;
                }
            }
        }
    }
    return array_keys($out);
};

$types = array(
    'credentials'   => array('credentials'),
    'organizations' => array('organizations'),
    'issuers'       => array('issuers'),
    'rps'           => array('rps'),
    'wallets'       => array('personalWallets', 'businessWallets'),
);

$result = array('generated' => gmdate('c'), 'choices' => array(), 'themeMap' => array());
$overview = home_url('/fides-design-pilot/overview/');

foreach (array('theme', 'sector') as $kind) {
    foreach (array_keys(Fides_Use_Case_Explore_Choice::choices($kind)) as $slug) {
        $matching = Fides_Use_Case_Explore_Choice::matching_items($kind, $slug, $items);
        $all_ids  = array_map(static fn ($i) => (string) $i['id'], $matching);
        $feat_ids = array_slice($all_ids, 0, Fides_Use_Case_Explore_Choice::CARD_LIMIT);
        $sel      = Fides_Use_Case_Explore_Catalog::selection($kind, $slug, $overview);
        $row      = array('useCases' => array('all' => count($all_ids), 'featured' => count($feat_ids)), 'types' => array());
        foreach ($types as $type => $keys) {
            $all  = $linked($all_ids, $keys, $type);
            $feat = $linked($feat_ids, $keys, $type);
            $entry = isset($sel[ $type ]) ? $sel[ $type ] : null;
            $dir  = array();
            $ind  = array();
            if ($entry) {
                $ids = array_map(static fn ($r) => Fides_Use_Case_Explore_Catalog::record_id($type, $r), $entry['records']);
                if ($entry['basis'] === 'direct') {
                    $dir = $ids;
                } else {
                    $ind = $ids;
                }
            }
            $row['types'][ $type ] = array(
                'direct'            => count($dir),
                'viaAllUseCases'    => count($all),
                'viaFeatured'       => count($feat),
                'directAndAll'      => count(array_intersect($dir, $all)),
                'directAndFeatured' => count(array_intersect($dir, $feat)),
                'directOrAll'       => count(array_unique(array_merge($dir, $all))),
                'indirect'          => count($ind),
                'indirectBasis'     => $entry && $entry['basis'] === 'derived' ? $entry['how'] : '',
                'indirectAndAll'    => count(array_intersect($ind, $all)),
                'indirectAndFeatured' => count(array_intersect($ind, $feat)),
                'viewAllUrl'        => $entry ? (strlen((string) $entry['url']) > 140 ? substr((string) $entry['url'], 0, 140) . '…' : (string) $entry['url']) : '',
            );
        }
        $result['choices'][ $kind . ':' . $slug ] = $row;
    }
}

// Theme bundle versus credential theme codes.
$config  = Fides_Use_Case_Discovery_Shortcode::theme_config();
$by_code = array();
foreach (Fides_Credential_Design::items() as $credential) {
    foreach ((array) ($credential['themes'] ?? array()) as $code) {
        $by_code[ (string) $code ] = ($by_code[ (string) $code ] ?? 0) + 1;
    }
}
$covered = array();
foreach ($config['bundles'] as $bundle) {
    $union = array();
    foreach (Fides_Credential_Design::items() as $credential) {
        if (array_intersect($bundle['themeCodes'], (array) ($credential['themes'] ?? array()))) {
            $union[] = $credential['id'];
        }
    }
    foreach ($bundle['themeCodes'] as $code) {
        $covered[ $code ] = true;
    }
    $per = array();
    foreach ($bundle['themeCodes'] as $code) {
        $per[ $code ] = $by_code[ $code ] ?? 0;
    }
    $result['themeMap'][ $bundle['code'] ] = array('title' => $bundle['title'], 'themeCodes' => $per, 'credentialTypes' => count($union));
}
$result['themeCodesWithoutBundle'] = array();
foreach ($by_code as $code => $n) {
    if (! isset($covered[ $code ])) {
        $result['themeCodesWithoutBundle'][ $code ] = $n;
    }
}
$result['credentialTypes'] = count(Fides_Credential_Design::items());
$result['useCases']        = count($items);
$result['records']         = array_map('count', $exists);

$all_sector_cred = 0;
foreach (Fides_Credential_Design::items() as $credential) {
    if (count(Fides_Use_Case_Explore_Catalog::sector_codes($credential['sectors'] ?? array())) >= 14) {
        $all_sector_cred++;
    }
}
$result['credentialTypesWithAll14Sectors'] = $all_sector_cred;

$dir = dirname(__FILE__) . '/output';
file_put_contents($dir . '/explore-catalog-links-inventory.json', wp_json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
echo "written\n";
