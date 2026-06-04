<?php
/**
 * Shared taxonomy options for the FIDES Use Case Catalog (aligned with other catalogs).
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * @param array<string, string> $options
 * @return array<string, string>
 */
function fides_use_case_catalog_sort_options_by_label(array $options): array {
    uasort(
        $options,
        static function ($a, $b) {
            return strcasecmp((string) $a, (string) $b);
        }
    );
    return $options;
}

/**
 * @return array<string, string>
 */
function fides_use_case_catalog_sectors(): array {
    $sectors = apply_filters(
        'fides_use_case_catalog_sectors',
        array(
            'public_sector'  => 'Public Sector',
            'finance'        => 'Finance',
            'trade'          => 'Trade',
            'supply_chain'   => 'Supply Chain',
            'manufacturing'  => 'Manufacturing',
            'energy'         => 'Energy',
            'agriculture'    => 'Agriculture',
            'food'           => 'Food',
            'retail'         => 'Retail',
            'healthcare'     => 'Healthcare',
            'education'      => 'Education',
            'construction'   => 'Construction',
            'mobility'       => 'Mobility',
            'digital'        => 'Digital',
            'other'          => 'Other',
        )
    );

    $sectors = fides_use_case_catalog_sort_options_by_label($sectors);
    if (isset($sectors['other'])) {
        $other_label = $sectors['other'];
        unset($sectors['other']);
        $sectors['other'] = $other_label;
    }

    return $sectors;
}

/**
 * Sectors an approver may assign (excludes submitter placeholder "other").
 *
 * @return array<string, string>
 */
function fides_use_case_catalog_assignable_sectors(): array {
    $sectors = fides_use_case_catalog_sectors();
    unset($sectors['other']);
    return $sectors;
}

/**
 * @param string $sector
 */
function fides_use_case_catalog_sector_label(string $sector): string {
    if ($sector === 'other') {
        return __('Other (assign sector before publish)', 'fides-use-case-catalog');
    }
    $sectors = fides_use_case_catalog_sectors();
    return isset($sectors[ $sector ]) ? (string) $sectors[ $sector ] : $sector;
}

/**
 * @return array<string, string>
 */
function fides_use_case_catalog_interaction_modes(): array {
    return apply_filters(
        'fides_use_case_catalog_interaction_modes',
        array(
            'remote'    => 'Remote flow',
            'proximity' => 'Proximity flow',
        )
    );
}

/**
 * @return array<string, string>
 */
function fides_use_case_catalog_vc_formats(): array {
    return apply_filters(
        'fides_use_case_catalog_vc_formats',
        array(
            'sd_jwt_vc'          => 'SD-JWT VC',
            'mdoc'               => 'ISO mDoc',
            'jwt_vc'             => 'JWT VC',
            'vcdm_1_1'           => 'VCDM1.1',
            'vcdm_2_0'           => 'VCDM2.0',
            'anoncreds'          => 'AnonCreds',
            'idemix'             => 'Idemix',
            'apple_wallet_pass'  => 'Apple Wallet Pass',
            'google_wallet_pass' => 'Google Wallet Pass',
            'acdc'               => 'ACDC',
        )
    );
}

/**
 * @return array<string, string>
 */
function fides_use_case_catalog_issuance_protocols(): array {
    return apply_filters(
        'fides_use_case_catalog_issuance_protocols',
        array(
            'oid4vci' => 'OpenID4VCI',
            'other'   => 'Other',
        )
    );
}

/**
 * @return array<string, string>
 */
function fides_use_case_catalog_presentation_protocols(): array {
    return apply_filters(
        'fides_use_case_catalog_presentation_protocols',
        array(
            'OpenID4VP'      => 'OpenID4VP',
            'ISO 18013-5'    => 'ISO 18013-5',
            'ISO 18013-7'    => 'ISO 18013-7',
            'DIDComm v2'     => 'DIDComm v2',
            'SIOPv2'         => 'SIOPv2',
            'IRMA Protocol'  => 'IRMA Protocol',
        )
    );
}

/**
 * @return array<string, string>
 */
function fides_use_case_catalog_interop_profiles(): array {
    return apply_filters(
        'fides_use_case_catalog_interop_profiles',
        array(
            'DIIP v4'         => 'DIIP v4',
            'DIIP v5'         => 'DIIP v5',
            'EWC v3'          => 'EWC v3',
            'HAIP v1'         => 'HAIP v1',
            'EUDI Wallet ARF' => 'EUDI Wallet ARF',
        )
    );
}

/**
 * Legacy awards theme keys → canonical sector codes.
 *
 * @return array<string, string>
 */
function fides_use_case_catalog_legacy_theme_to_sector(): array {
    return array(
        'person_identity'         => 'digital',
        'organizational_identity' => 'digital',
        'payments'                => 'finance',
        'education'               => 'education',
        'compliance_reporting'    => 'public_sector',
        'trade_documents'         => 'trade',
        'dataspaces'              => 'digital',
        'agentic_ai'              => 'digital',
    );
}

/**
 * @return array<string, array<string, string>>
 */
function fides_use_case_catalog_taxonomy_options(): array {
    return array(
        'sectors'               => fides_use_case_catalog_sectors(),
        'interactionModes'      => fides_use_case_catalog_sort_options_by_label(fides_use_case_catalog_interaction_modes()),
        'vcFormats'             => fides_use_case_catalog_sort_options_by_label(fides_use_case_catalog_vc_formats()),
        'issuanceProtocols'     => fides_use_case_catalog_sort_options_by_label(fides_use_case_catalog_issuance_protocols()),
        'presentationProtocols' => fides_use_case_catalog_sort_options_by_label(fides_use_case_catalog_presentation_protocols()),
        'interopProfiles'       => fides_use_case_catalog_sort_options_by_label(fides_use_case_catalog_interop_profiles()),
    );
}

/**
 * @param mixed $values
 * @param array<string, string> $allowed
 * @return array<int, string>
 */
function fides_use_case_catalog_normalize_multi_select($values, array $allowed): array {
    if (! is_array($values)) {
        return array();
    }

    $lookup = array();
    foreach (array_keys($allowed) as $key) {
        $lookup[ strtolower((string) $key) ] = (string) $key;
    }

    $normalized = array();
    foreach ($values as $value) {
        $raw = trim((string) $value);
        if ($raw === '') {
            continue;
        }

        $canonical = $lookup[ strtolower($raw) ] ?? null;
        if ($canonical === null) {
            $slug = sanitize_key(str_replace(array(' ', '.', '-'), '_', $raw));
            if (isset($allowed[ $slug ])) {
                $canonical = $slug;
            }
        }

        if ($canonical !== null) {
            $normalized[ $canonical ] = $canonical;
        }
    }

    return array_values($normalized);
}

/**
 * @param mixed $values
 * @return array<int, string>
 */
function fides_use_case_catalog_normalize_sectors($values): array {
    return fides_use_case_catalog_normalize_multi_select($values, fides_use_case_catalog_sectors());
}

/**
 * Normalize a single required sector (string or legacy array with one value).
 */
function fides_use_case_catalog_normalize_sector($value): string {
    if (is_array($value)) {
        $value = $value[0] ?? '';
    }
    $normalized = fides_use_case_catalog_normalize_sectors(array($value));
    return $normalized[0] ?? '';
}

/**
 * @param mixed $payload
 * @return array<string, array<int, string>>
 */
function fides_use_case_catalog_normalize_taxonomy_payload($payload): array {
    $options = fides_use_case_catalog_taxonomy_options();
    $source = is_array($payload) ? $payload : array();

    return array(
        'interactionModes'      => fides_use_case_catalog_normalize_multi_select($source['interactionModes'] ?? array(), $options['interactionModes']),
        'vcFormats'             => fides_use_case_catalog_normalize_multi_select($source['vcFormats'] ?? array(), $options['vcFormats']),
        'issuanceProtocols'     => fides_use_case_catalog_normalize_multi_select($source['issuanceProtocols'] ?? array(), $options['issuanceProtocols']),
        'presentationProtocols' => fides_use_case_catalog_normalize_multi_select($source['presentationProtocols'] ?? array(), $options['presentationProtocols']),
        'interopProfiles'       => fides_use_case_catalog_normalize_multi_select($source['interopProfiles'] ?? array(), $options['interopProfiles']),
    );
}

/**
 * @param mixed $json
 * @return array<int, string>
 */
function fides_use_case_catalog_decode_string_list($json): array {
    $decoded = is_string($json) ? json_decode($json, true) : $json;
    if (! is_array($decoded)) {
        return array();
    }
    $list = array();
    foreach ($decoded as $value) {
        $value = sanitize_text_field((string) $value);
        if ($value !== '') {
            $list[] = $value;
        }
    }
    return $list;
}

/**
 * @param array<string, mixed> $row
 * @return array<int, string>
 */
function fides_use_case_catalog_row_sectors(array $row): array {
    $sector = fides_use_case_catalog_row_sector($row);
    return $sector !== '' ? array( $sector ) : array();
}

/**
 * @param array<string, mixed> $row
 */
function fides_use_case_catalog_row_sector(array $row): string {
    $sectors = fides_use_case_catalog_decode_string_list($row['sectors_json'] ?? '[]');
    if (! empty($sectors)) {
        $normalized = fides_use_case_catalog_normalize_sectors($sectors);
        return $normalized[0] ?? '';
    }

    $theme_key = isset($row['theme_key']) ? sanitize_key((string) $row['theme_key']) : '';
    if ($theme_key === '') {
        return '';
    }

    $map = fides_use_case_catalog_legacy_theme_to_sector();
    return isset($map[ $theme_key ]) ? (string) $map[ $theme_key ] : '';
}

/**
 * @param array<string, mixed> $row
 * @return array<string, array<int, string>>
 */
function fides_use_case_catalog_row_taxonomy(array $row): array {
    $decoded = json_decode((string) ($row['taxonomy_json'] ?? '{}'), true);
    return fides_use_case_catalog_normalize_taxonomy_payload(is_array($decoded) ? $decoded : array());
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function fides_use_case_catalog_row_to_item(array $row): array {
    $tags = json_decode((string) ($row['tags_json'] ?? '[]'), true);
    $links = fides_use_case_catalog_normalize_links_structure(
        json_decode((string) ($row['links_json'] ?? '{}'), true)
    );
    $sector = fides_use_case_catalog_row_sector($row);
    $taxonomy = fides_use_case_catalog_row_taxonomy($row);

    $item = array(
        'id' => (string) $row['use_case_id'],
        'sector' => $sector,
        'title' => (string) $row['title'],
        'summary' => (string) $row['summary'],
        'organizationName' => (string) $row['organization_name'],
        'stage'            => fides_use_case_catalog_normalize_stage((string) $row['stage']),
        'status' => fides_use_case_catalog_normalize_status((string) $row['status']),
        'updatedAt' => get_date_from_gmt((string) $row['updated_at'], DATE_ATOM),
        'publishedAt' => ! empty($row['published_at']) ? get_date_from_gmt((string) $row['published_at'], DATE_ATOM) : null,
        'tags' => is_array($tags) ? $tags : array(),
        'links' => is_array($links) ? $links : array(),
        'interactionModes' => $taxonomy['interactionModes'],
        'vcFormats' => $taxonomy['vcFormats'],
        'issuanceProtocols' => $taxonomy['issuanceProtocols'],
        'presentationProtocols' => $taxonomy['presentationProtocols'],
        'interopProfiles' => $taxonomy['interopProfiles'],
    );

    if (! empty($row['video_url']) && ! empty($row['video_provider'])) {
        $item['video'] = array(
            'url' => (string) $row['video_url'],
            'provider' => (string) $row['video_provider'],
        );
    }
    if (! empty($row['image_url'])) {
        $item['imageUrl'] = (string) $row['image_url'];
    }
    if (! empty($row['more_info_url'])) {
        $item['moreInfoUrl'] = (string) $row['more_info_url'];
    }
    if (! empty($row['user_journey'])) {
        $item['userJourney'] = (string) $row['user_journey'];
    }

    $country = fides_use_case_catalog_normalize_country_code((string) ($row['country_code'] ?? ''));
    if ($country !== '') {
        $item['country'] = $country;
    }

    return $item;
}

/**
 * Deprecated / non-country CLDR codes excluded from the ISO picker.
 *
 * @return list<string>
 */
function fides_use_case_catalog_iso_country_codes_excluded(): array {
    return array(
        'UN', 'EZ', 'QO', 'XA', 'XB', 'CP', 'CQ', 'ZZ', 'ZO',
        'AN', 'BU', 'CS', 'DD', 'DY', 'FX', 'HV', 'NH', 'ND', 'PU', 'QU',
        'RH', 'SU', 'TP', 'UK', 'VD', 'YD', 'YU', 'ZR', 'WI',
    );
}

/**
 * Static ISO 3166-1 alpha-2 fallback when PHP intl is unavailable (256 codes incl. EU, XK).
 *
 * @return non-empty-string
 */
function fides_use_case_catalog_iso_country_codes_json(): string {
    return '["AC","AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DG","DJ","DK","DM","DO","DZ","EA","EC","EE","EG","EH","ER","ES","ET","EU","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","IC","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TA","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","XK","YE","YT","ZA","ZM","ZW"]';
}

/**
 * All assignable ISO 3166-1 alpha-2 codes (and EU), cached.
 *
 * @return list<string>
 */
function fides_use_case_catalog_iso_country_codes(): array {
    static $cache = null;
    if (is_array($cache)) {
        return $cache;
    }

    $excluded = fides_use_case_catalog_iso_country_codes_excluded();
    $codes    = array();

    if (function_exists('locale_get_display_region')) {
        for ($i = ord('A'); $i <= ord('Z'); $i++) {
            for ($j = ord('A'); $j <= ord('Z'); $j++) {
                $code = chr($i) . chr($j);
                if (in_array($code, $excluded, true)) {
                    continue;
                }
                $name = locale_get_display_region('en_' . $code, 'en');
                if (! is_string($name) || $name === '' || strcasecmp($name, $code) === 0) {
                    continue;
                }
                $codes[] = $code;
            }
        }
    }

    if ($codes === array()) {
        $decoded = json_decode(fides_use_case_catalog_iso_country_codes_json(), true);
        $codes   = is_array($decoded) ? $decoded : array();
    }

    if (! in_array('XK', $codes, true)) {
        $codes[] = 'XK';
    }

    $codes = array_values(array_unique($codes));
    sort($codes, SORT_STRING);
    $cache = $codes;

    return $cache;
}

/**
 * @return array<string, string>
 */
function fides_use_case_catalog_country_label_overrides(): array {
    return array(
        'EU' => 'European Union',
        'GB' => 'United Kingdom',
        'US' => 'United States',
        'XK' => 'Kosovo',
        'BA' => 'Bosnia and Herzegovina',
        'MK' => 'North Macedonia',
        'CZ' => 'Czech Republic',
        'KR' => 'South Korea',
    );
}

function fides_use_case_catalog_normalize_country_code(string $code): string {
    $code = strtoupper(trim(sanitize_text_field($code)));
    if ($code === 'EU') {
        return 'EU';
    }
    if (strlen($code) === 2 && ctype_alpha($code)) {
        return $code;
    }

    return '';
}

function fides_use_case_catalog_country_display_name(string $code): string {
    $code = fides_use_case_catalog_normalize_country_code($code);
    if ($code === '') {
        return '';
    }

    $overrides = fides_use_case_catalog_country_label_overrides();
    if (isset($overrides[ $code ])) {
        return $overrides[ $code ];
    }

    if (function_exists('locale_get_display_region')) {
        $name = locale_get_display_region('en_' . $code, 'en');
        if (is_string($name) && $name !== '') {
            return $name;
        }
    }

    return $code;
}

/**
 * Country select options for admin review (EU first, then alphabetical by label).
 *
 * @return array<string, string> code => English label
 */
function fides_use_case_catalog_country_options(): array {
    static $options = null;
    if (is_array($options)) {
        return $options;
    }

    $options = array();
    foreach (fides_use_case_catalog_iso_country_codes() as $code) {
        $options[ $code ] = fides_use_case_catalog_country_display_name($code);
    }

    asort($options, SORT_NATURAL | SORT_FLAG_CASE);

    if (isset($options['EU'])) {
        $eu_label = $options['EU'];
        unset($options['EU']);
        $options = array('EU' => $eu_label) + $options;
    } else {
        $options = array('EU' => 'European Union') + $options;
    }

    return $options;
}

function fides_use_case_catalog_sanitize_country_code(string $code): string {
    $normalized = fides_use_case_catalog_normalize_country_code($code);
    if ($normalized === '') {
        return '';
    }

    return in_array($normalized, fides_use_case_catalog_iso_country_codes(), true) ? $normalized : '';
}

function fides_use_case_catalog_migrate_country_column(): void {
    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name is a constant.
    $column = $wpdb->get_results("SHOW COLUMNS FROM {$table} LIKE 'country_code'", ARRAY_A);
    if (! empty($column)) {
        return;
    }

    // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name is a constant.
    $wpdb->query("ALTER TABLE {$table} ADD COLUMN country_code VARCHAR(8) NULL DEFAULT NULL AFTER organization_name");
}

/**
 * Migrate legacy event/theme columns into sectors_json + taxonomy_json.
 */
/**
 * @param string               $name
 * @param array<string,string> $options
 * @param array<int,string>    $selected
 */
function fides_use_case_catalog_render_admin_select_field(string $name, array $options, string $selected, bool $required = false): string {
    $element_ids = array(
        'sector'       => 'uc-sector',
        'country_code' => 'uc-country',
    );
    $element_id = $element_ids[ $name ] ?? $name;
    $html = sprintf(
        '<select name="%1$s" id="%2$s"%3$s>',
        esc_attr($name),
        esc_attr($element_id),
        $required ? ' required' : ''
    );
    $html .= '<option value="">Select...</option>';
    foreach ($options as $key => $label) {
        $selected_attr = ((string) $key === $selected) ? ' selected' : '';
        $html .= sprintf(
            '<option value="%1$s"%2$s>%3$s</option>',
            esc_attr((string) $key),
            $selected_attr,
            esc_html((string) $label)
        );
    }
    $html .= '</select>';
    return $html;
}

function fides_use_case_catalog_render_admin_checkbox_field(string $name, array $options, array $selected): string {
    $html = '<fieldset class="fides-admin-checkbox-list">';
    foreach ($options as $key => $label) {
        $checked = in_array((string) $key, $selected, true) ? ' checked' : '';
        $html .= sprintf(
            '<label style="display:block;margin:0 0 4px;"><input type="checkbox" name="%1$s[]" value="%2$s"%3$s> %4$s</label>',
            esc_attr($name),
            esc_attr((string) $key),
            $checked,
            esc_html((string) $label)
        );
    }
    $html .= '</fieldset>';
    return $html;
}

function fides_use_case_catalog_migrate_awards_columns(): void {
    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    $rows = $wpdb->get_results("SELECT id, theme_key, sectors_json, taxonomy_json FROM {$table}", ARRAY_A);
    if (! is_array($rows)) {
        return;
    }

    foreach ($rows as $row) {
        $sectors_json = (string) ($row['sectors_json'] ?? '');
        $update = array();

        if ($sectors_json === '' || $sectors_json === '[]' || $sectors_json === 'null') {
            $sectors = fides_use_case_catalog_row_sectors($row);
            if (! empty($sectors)) {
                $update['sectors_json'] = wp_json_encode($sectors);
            }
        }

        if (! empty($update)) {
            $wpdb->update($table, $update, array('id' => (int) $row['id']));
        }
    }
}
