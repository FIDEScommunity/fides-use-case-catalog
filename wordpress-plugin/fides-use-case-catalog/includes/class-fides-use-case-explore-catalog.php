<?php
/**
 * "More from the catalog" block of Explore by theme / sector (design pilot).
 *
 * Next to the relations of the (at most four) shown use cases, the catalogs hold records that carry a sector or theme of
 * their own. This class selects those records per catalog type and says, in plain words, what the selection is based on:
 *
 *  - credential types: `sectors` (sector page) or `themes` (theme page: the theme codes of the bundle in the theme map);
 *  - organisations: `sectors` (sector page only; organisation records have no theme);
 *  - relying parties: `sectors` (sector page only), on a theme page derived from the credential types they accept;
 *  - issuers: no sector or theme of their own; on a sector page derived from the sector of their organisation, on a theme
 *    page derived from the credential types they issue;
 *  - wallets: no sector or theme, so no block (their only link is the use case relation list).
 *
 * Nothing is inferred from text. A "view all" link exists only where the destination catalog has a working filter for exactly
 * this selection (credential types: ?sector= / ?theme=, organisations: ?sector=, issuers and relying parties: ?sector= / ?theme=,
 * with ?credential[]= as the fallback of an older issuer / relying party plugin); otherwise the block shows "Showing N of M" and no link.
 */

if (! defined('ABSPATH')) {
    exit;
}

final class Fides_Use_Case_Explore_Catalog {

    /** Maximum records per catalog type. */
    public const LIMIT = 4;

    /** Pilot catalog page (slug below the pilot root) per type. */
    private const PAGES = array(
        'credentials'   => 'credentials/',
        'organizations' => 'organizations/',
        'issuers'       => 'issuers/',
        'rps'           => 'relying-parties/',
    );

    /** Order of the types in the block. */
    public const TYPES = array('credentials', 'organizations', 'issuers', 'rps');

    /** Legacy sector strings to the canonical codes (as in the catalog scripts); unknown strings are dropped. */
    private const LEGACY_SECTOR = array(
        'government' => 'public_sector', 'travel' => 'mobility', 'hospitality' => 'retail', 'employment' => 'digital',
        'telecom' => 'digital', 'utilities' => 'energy', 'insurance' => 'finance', 'real-estate' => 'construction',
        'automotive' => 'mobility', 'entertainment' => 'retail', 'other' => 'digital',
    );

    /** @return list<string> canonical sector codes of a record's `sectors` */
    public static function sector_codes($raw): array {
        $known = function_exists('fides_use_case_catalog_sectors') ? fides_use_case_catalog_sectors() : array();
        $out   = array();
        foreach ((array) $raw as $code) {
            $code = is_string($code) ? trim($code) : '';
            $code = self::LEGACY_SECTOR[ $code ] ?? $code;
            if ($code !== '' && isset($known[ $code ]) && $code !== 'other' && ! in_array($code, $out, true)) {
                $out[] = $code;
            }
        }
        return $out;
    }

    /** @return list<string> catalog theme codes of a theme bundle (theme map) */
    public static function bundle_theme_codes(string $bundle): array {
        $config = class_exists('Fides_Use_Case_Discovery_Shortcode') ? Fides_Use_Case_Discovery_Shortcode::theme_config() : array();
        foreach ($config['bundles'] ?? array() as $row) {
            if ((string) $row['code'] === $bundle) {
                return array_values(array_map('strval', (array) $row['themeCodes']));
            }
        }
        return array();
    }

    /** Canonical credential type ids of a list of refs (aliases and per-format ids resolve to the type). */
    private static function canonical_refs(array $refs): array {
        $out = array();
        foreach ($refs as $ref) {
            $ref = is_string($ref) ? trim($ref) : '';
            if ($ref === '') {
                continue;
            }
            $out[ Fides_Credential_Design::canonical_id($ref) ] = true;
        }
        return array_keys($out);
    }

    /**
     * The selection per catalog type. A type that has no record is left out.
     *
     * Each entry: basis ("direct" = the record carries the sector/theme itself, "derived" = reached through a related record),
     * how (key of the plain-language sentence), total, records (ordered, all), url (view-all destination or ''),
     * url_exact (the destination shows exactly `total` records).
     *
     * @return array<string, array<string, mixed>>
     */
    public static function selection(string $kind, string $slug, string $overview): array {
        $out  = array();
        $base = trailingslashit(dirname(untrailingslashit($overview)));
        $base = (string) apply_filters('fides_explore_catalog_base', $base, $kind, $slug);

        // Credential types: the one type that is classified by sector and by theme.
        $credentials = array();
        if (class_exists('Fides_Credential_Design')) {
            $codes = $kind === 'theme' ? self::bundle_theme_codes($slug) : array();
            foreach (Fides_Credential_Design::items() as $item) {
                if ($kind === 'sector' ? in_array($slug, self::sector_codes($item['sectors'] ?? array()), true) : (bool) array_intersect($codes, array_map('strval', (array) ($item['themes'] ?? array())))) {
                    $credentials[] = $item;
                }
            }
            // Most specific first: a type that lists every sector says little about this one.
            usort(
                $credentials,
                static function (array $a, array $b): int {
                    $c = count(self::sector_codes($a['sectors'] ?? array())) <=> count(self::sector_codes($b['sectors'] ?? array()));
                    $c = $c !== 0 ? $c : count((array) ($a['themes'] ?? array())) <=> count((array) ($b['themes'] ?? array()));
                    return $c !== 0 ? $c : strcasecmp((string) $a['displayName'], (string) $b['displayName']);
                }
            );
        }
        if ($credentials) {
            $out['credentials'] = array(
                'basis'     => 'direct',
                'how'       => $kind === 'sector' ? 'credentials-sector' : 'credentials-theme',
                'total'     => count($credentials),
                'records'   => $credentials,
                'url'       => add_query_arg($kind === 'sector' ? 'sector' : 'theme', $kind === 'sector' ? $slug : implode(',', self::bundle_theme_codes($slug)), $base . self::PAGES['credentials']),
                'url_exact' => true,
            );
            // add_query_arg encodes the comma of a theme list; the catalogs read both forms, keep it readable.
            $out['credentials']['url'] = str_replace('%2C', ',', $out['credentials']['url']);
        }
        $credential_ids = array_map(static fn (array $c): string => (string) $c['id'], $credentials);

        // Organisations: sector only (the organisation records have no theme).
        if ($kind === 'sector' && class_exists('Fides_Organization_Design')) {
            $orgs = array_values(array_filter(Fides_Organization_Design::items(), static fn (array $o): bool => in_array($slug, Fides_Organization_Design::sector_codes($o), true)));
            usort(
                $orgs,
                static function (array $a, array $b): int {
                    $c = Fides_Organization_Design::use_case_count((string) $b['id']) <=> Fides_Organization_Design::use_case_count((string) $a['id']);
                    return $c !== 0 ? $c : strcasecmp((string) $a['name'], (string) $b['name']);
                }
            );
            if ($orgs) {
                $out['organizations'] = array(
                    'basis'     => 'direct',
                    'how'       => 'organizations-sector',
                    'total'     => count($orgs),
                    'records'   => $orgs,
                    'url'       => add_query_arg('sector', $slug, $base . self::PAGES['organizations']),
                    'url_exact' => true,
                );
            }
        }

        // Issuers: no sector or theme of their own.
        if (class_exists('Fides_Issuer_Design')) {
            $issuers = array();
            $how     = '';
            $url     = '';
            if (self::overview_filters($kind, 'Fides_Issuer_Design')) {
                // The issuer overview filters on exactly this selection (?sector= organisation sector, ?theme= credential types).
                $group   = $kind === 'sector' ? 'sector' : 'theme';
                $issuers = Fides_Issuer_Design::filter_items(Fides_Issuer_Design::items(), '', array($group => array($slug)), array());
                $how     = $kind === 'sector' ? 'issuers-org-sector' : 'issuers-credentials-theme';
                $url     = $issuers ? self::filter_url($base . self::PAGES['issuers'], $group, $slug) : '';
            } elseif ($kind === 'sector' && class_exists('Fides_Organization_Design')) {
                $org_ids = array();
                foreach (Fides_Organization_Design::items() as $org) {
                    if (in_array($slug, Fides_Organization_Design::sector_codes($org), true)) {
                        $org_ids[ (string) $org['id'] ] = true;
                    }
                }
                foreach (Fides_Issuer_Design::items() as $issuer) {
                    if (isset($org_ids[ (string) ($issuer['orgId'] ?? '') ])) {
                        $issuers[] = $issuer;
                    }
                }
                $how = 'issuers-org-sector';
            } elseif ($kind === 'theme' && $credential_ids) {
                foreach (Fides_Issuer_Design::items() as $issuer) {
                    $refs = array();
                    foreach ((array) ($issuer['credentialConfigurations'] ?? array()) as $config) {
                        $refs[] = is_array($config) ? (string) ($config['credentialCatalogRef']['id'] ?? '') : '';
                    }
                    if (array_intersect(self::canonical_refs($refs), $credential_ids)) {
                        $issuers[] = $issuer;
                    }
                }
                $how = 'issuers-credentials-theme';
                $url = self::credential_filter_url($base . self::PAGES['issuers'], $credential_ids);
            }
            usort(
                $issuers,
                static function (array $a, array $b): int {
                    $pa = strtolower((string) ($a['environment'] ?? '')) === 'production' ? 0 : 1;
                    $pb = strtolower((string) ($b['environment'] ?? '')) === 'production' ? 0 : 1;
                    return $pa !== $pb ? $pa <=> $pb : strcasecmp((string) $a['displayName'], (string) $b['displayName']);
                }
            );
            if ($issuers) {
                $out['issuers'] = array('basis' => 'derived', 'how' => $how, 'total' => count($issuers), 'records' => $issuers, 'url' => $url, 'url_exact' => $url !== '');
            }
        }

        // Relying parties: their own sector on a sector page, the accepted credential types on a theme page.
        if (class_exists('Fides_RP_Design')) {
            $rps = array();
            $url = '';
            if (self::overview_filters($kind, 'Fides_RP_Design')) {
                // The relying party overview filters on exactly this selection (?sector= own sectors, ?theme= accepted credential types).
                $group = $kind === 'sector' ? 'sector' : 'theme';
                $rps   = Fides_RP_Design::filter_items(Fides_RP_Design::items(), '', array($group => array($slug)), array());
                $basis = $kind === 'sector' ? 'direct' : 'derived';
                $how   = $kind === 'sector' ? 'rps-sector' : 'rps-credentials-theme';
                $url   = $rps ? self::filter_url($base . self::PAGES['rps'], $group, $slug) : '';
            } elseif ($kind === 'sector') {
                foreach (Fides_RP_Design::items() as $rp) {
                    if (in_array($slug, self::sector_codes($rp['sectors'] ?? array()), true)) {
                        $rps[] = $rp;
                    }
                }
                $basis = 'direct';
                $how   = 'rps-sector';
            } elseif ($credential_ids) {
                foreach (Fides_RP_Design::items() as $rp) {
                    $refs = array();
                    foreach ((array) ($rp['acceptedCredentialRefs'] ?? array()) as $ref) {
                        $refs[] = is_array($ref) ? (string) ($ref['credentialCatalogId'] ?? $ref['id'] ?? '') : '';
                    }
                    if (array_intersect(self::canonical_refs($refs), $credential_ids)) {
                        $rps[] = $rp;
                    }
                }
                $basis = 'derived';
                $how   = 'rps-credentials-theme';
                $url   = self::credential_filter_url($base . self::PAGES['rps'], $credential_ids);
            }
            usort($rps, static fn (array $a, array $b): int => strcasecmp((string) $a['name'], (string) $b['name']));
            if ($rps) {
                $out['rps'] = array('basis' => $basis, 'how' => $how, 'total' => count($rps), 'records' => $rps, 'url' => $url, 'url_exact' => $url !== '');
            }
        }

        /** Filters the catalog selection of one choice (the tests use it for a choice without any record). */
        $out = apply_filters('fides_explore_catalog_selection', $out, $kind, $slug);
        return is_array($out) ? $out : array();
    }

    /** True when the issuer or relying party overview of this installation has a filter for the choice kind (?sector= / ?theme=). */
    private static function overview_filters(string $kind, string $class): bool {
        $group = $kind === 'sector' ? 'sector' : 'theme';
        return class_exists($class) && method_exists($class, 'filter_available') && $class::filter_available($group);
    }

    /** Overview URL with one ?sector=<code> / ?theme=<bundle code> filter. */
    private static function filter_url(string $page, string $group, string $slug): string {
        return $page . '?' . $group . '=' . rawurlencode($slug);
    }

    /** Issuer / relying party overview filtered on credential types (?credential[]=…, one value per type, any of them). */
    private static function credential_filter_url(string $page, array $ids): string {
        $parts = array();
        foreach ($ids as $id) {
            $parts[] = 'credential%5B%5D=' . rawurlencode((string) $id);
        }
        return $page . '?' . implode('&', $parts);
    }

    /** Stable identifier of a record per type. */
    public static function record_id(string $type, array $record): string {
        return (string) ($type === 'credentials' ? Fides_Credential_Design::canonical_id((string) $record['id']) : $record['id']);
    }

    /**
     * Row-card props of one record from the catalog's own card builder (same card as the catalog overview); credential types
     * have no PHP builder, so their props follow credentialPilotCardProps() of the listing script.
     *
     * @return array<string, mixed>
     */
    public static function card_props(string $type, array $record): array {
        if ($type === 'organizations') {
            return Fides_Organization_Overview::card_props($record, Fides_Organization_Design::pilot_detail_base());
        }
        if ($type === 'issuers') {
            return Fides_Issuer_Overview::card_props($record, Fides_Issuer_Design::pilot_detail_base());
        }
        if ($type === 'rps') {
            return Fides_RP_Overview::card_props($record, Fides_RP_Design::pilot_detail_base());
        }
        $id      = (string) $record['id'];
        $logo    = trim((string) ($record['provider']['logo'] ?? ''));
        return array(
            'variant'        => 'row',
            'href'           => Fides_Credential_Design::detail_url($id),
            'title'          => (string) $record['displayName'],
            'image_url'      => $logo,
            'image_alt'      => '',
            'fallback_label' => 'VC',
            'data'           => array('credential-id' => $id),
            'summary'        => trim((string) preg_replace('/\s+/u', ' ', (string) ($record['shortDescription'] ?? $record['schemaDescription'] ?? ''))),
            'owner'          => trim((string) ($record['authority']['name'] ?? '')),
            'kicker'         => trim((string) ($record['subjectType'] ?? '')),
        );
    }
}
