<?php
/**
 * Plugin Name: FIDES Use Case Catalog
 * Description: Submission form and catalog renderer for the FIDES Use Case Catalog.
 * Version: 0.2.45
 * Author: FIDES Labs BV
 * License: Apache-2.0
 */

if (! defined('ABSPATH')) {
    exit;
}

define('FIDES_USE_CASE_CATALOG_VERSION', '0.2.45');
define('FIDES_USE_CASE_CATALOG_URL', plugin_dir_url(__FILE__));
define('FIDES_USE_CASE_CATALOG_PATH', plugin_dir_path(__FILE__));
define('FIDES_USE_CASE_CATALOG_TABLE', $GLOBALS['wpdb']->prefix . 'fides_use_case_submissions');
define('FIDES_USE_CASE_CATALOG_DB_VERSION', '1.4.0');
define('FIDES_USE_CASE_LOOKUP_LIMIT', 8);

require_once FIDES_USE_CASE_CATALOG_PATH . 'includes/use-case-taxonomy.php';

register_activation_hook(__FILE__, 'fides_use_case_catalog_activate');
add_action('admin_init', 'fides_use_case_catalog_maybe_upgrade_schema');
add_action('init', 'fides_use_case_catalog_register_with_core', 5);
add_action('admin_menu', 'fides_use_case_catalog_register_admin_page');
add_action('admin_post_fides_use_case_set_status', 'fides_use_case_catalog_handle_status_action');
add_action('admin_post_fides_use_case_save_submission', 'fides_use_case_catalog_handle_save_submission_action');
add_action('rest_api_init', 'fides_use_case_catalog_register_rest_routes');

function fides_use_case_catalog_activate(): void {
    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    $charset_collate = $wpdb->get_charset_collate();

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $sql = "CREATE TABLE {$table} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        use_case_id VARCHAR(191) NOT NULL,
        event_key VARCHAR(191) NOT NULL DEFAULT '',
        theme_key VARCHAR(191) NOT NULL DEFAULT '',
        sectors_json LONGTEXT NULL,
        taxonomy_json LONGTEXT NULL,
        title VARCHAR(191) NOT NULL,
        summary TEXT NOT NULL,
        organization_name VARCHAR(191) NOT NULL,
        country_code VARCHAR(8) NULL,
        contact_email VARCHAR(191) NOT NULL,
        stage VARCHAR(32) NOT NULL DEFAULT '',
        video_url TEXT NULL,
        video_provider VARCHAR(32) NULL,
        image_url TEXT NULL,
        more_info_url TEXT NULL,
        user_journey TEXT NULL,
        tags_json LONGTEXT NULL,
        links_json LONGTEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'received',
        published_at DATETIME NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY use_case_id (use_case_id),
        KEY status_idx (status),
        KEY event_idx (event_key),
        KEY theme_idx (theme_key),
        KEY status_updated_idx (status, updated_at)
    ) {$charset_collate};";

    dbDelta($sql);
    update_option('fides_use_case_catalog_db_version', FIDES_USE_CASE_CATALOG_DB_VERSION);
}

function fides_use_case_catalog_maybe_upgrade_schema(): void {
    $installed = get_option('fides_use_case_catalog_db_version');
    if ($installed === FIDES_USE_CASE_CATALOG_DB_VERSION) {
        return;
    }
    fides_use_case_catalog_activate();
    fides_use_case_catalog_migrate_legacy_stages();
    fides_use_case_catalog_migrate_awards_columns();
    fides_use_case_catalog_migrate_country_column();
    update_option('fides_use_case_catalog_db_version', FIDES_USE_CASE_CATALOG_DB_VERSION);
}

/**
 * Primary REST namespace (legacy fides-awards/v1 routes remain registered for compatibility).
 */
function fides_use_case_catalog_rest_namespace(): string {
    return 'fides-use-case/v1';
}

/**
 * @param string $route
 * @param array<string, mixed> $args
 */
function fides_use_case_catalog_register_rest_route(string $route, array $args): void {
    register_rest_route(fides_use_case_catalog_rest_namespace(), $route, $args);
    register_rest_route('fides-awards/v1', $route, $args);
}

/**
 * Readiness levels aligned with the RP catalog.
 *
 * @return array<string, string>
 */
function fides_use_case_catalog_readiness_levels(): array {
    return array(
        'demo'       => 'Demo',
        'production' => 'Production',
    );
}

/**
 * Map legacy stage values and validate against readiness enum.
 */
function fides_use_case_catalog_normalize_stage(string $stage): string {
    $stage = sanitize_key(str_replace('_', '-', $stage));
    $legacy = array(
        'idea'             => 'demo',
        'technical-demo'   => 'demo',
        'use-case-demo'    => 'demo',
        'pilot'            => 'production',
        'production-pilot' => 'production',
        'live'             => 'production',
    );
    if (isset($legacy[ $stage ])) {
        return $legacy[ $stage ];
    }
    $levels = fides_use_case_catalog_readiness_levels();
    return isset($levels[ $stage ]) ? $stage : '';
}

/**
 * Upgrade stored legacy readiness values to demo/production slugs.
 */
function fides_use_case_catalog_migrate_legacy_stages(): void {
    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    $map = array(
        'idea'             => 'demo',
        'technical-demo'   => 'demo',
        'use-case-demo'    => 'demo',
        'pilot'            => 'production',
        'production-pilot' => 'production',
        'live'             => 'production',
    );
    foreach ($map as $old => $new) {
        $wpdb->update(
            $table,
            array('stage' => $new),
            array('stage' => $old),
            array('%s'),
            array('%s')
        );
    }
}

/**
 * Login URL for the public submission form (same pattern as catalog ratings).
 */
function fides_use_case_catalog_form_login_url(): string {
    $current_request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '';
    $current_host = isset($_SERVER['HTTP_HOST']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_HOST'])) : '';
    $current_url = $current_host !== ''
        ? ((is_ssl() ? 'https://' : 'http://') . $current_host . $current_request_uri)
        : home_url('/');
    $oid4vp_options = get_option('universal_openid4vp_options', array());
    if (is_array($oid4vp_options) && ! empty($oid4vp_options['loginUrl'])) {
        return esc_url_raw((string) $oid4vp_options['loginUrl']);
    }
    return wp_login_url($current_url);
}

/**
 * Register the catalog type so shared ratings REST accepts usecase likes.
 */
function fides_use_case_catalog_register_with_core(): void {
    if (! class_exists('Fides_Catalog_Registry')) {
        return;
    }

    Fides_Catalog_Registry::register(
        'usecase',
        array(
            'label'             => 'Use Cases',
            'json_url'          => rest_url(fides_use_case_catalog_rest_namespace() . '/catalog'),
            'collection_key'    => 'useCases',
            'id_field'          => 'id',
            'name_field'        => 'title',
            'description_field' => 'summary',
            'detail_param'      => 'usecase',
            'pages'             => array(
                'main' => apply_filters('fides_use_case_catalog_path', '/use-cases/'),
            ),
            'jsonld_type'       => 'CreativeWork',
        )
    );
}

/**
 * @deprecated Awards events removed; use fides_use_case_catalog_taxonomy_options().
 * @return array<string, mixed>
 */
function fides_use_case_catalog_events(): array {
    return array();
}

function fides_use_case_catalog_valid_statuses(): array {
    return array('received', 'approved', 'published');
}

function fides_use_case_catalog_normalize_status(string $status): string {
    $status = sanitize_key($status);
    if ($status === 'submitted' || $status === 'in_review' || $status === 'rejected' || $status === '') {
        return 'received';
    }
    if ($status === 'approved') {
        return 'approved';
    }
    if ($status === 'published') {
        return 'published';
    }
    return 'received';
}

function fides_use_case_catalog_is_local_site(): bool {
    $host = '';
    if (function_exists('get_site_url')) {
        $parsed = parse_url(get_site_url());
        $host = isset($parsed['host']) ? strtolower((string) $parsed['host']) : '';
    }
    if ($host === '' && ! empty($_SERVER['HTTP_HOST'])) {
        $host = strtolower((string) $_SERVER['HTTP_HOST']);
    }
    return $host !== '' && (preg_match('/\.local$/i', $host) || $host === 'localhost');
}

/**
 * @return array<string, string>
 */
function fides_use_case_catalog_catalog_urls(): array {
    $use_local = fides_use_case_catalog_is_local_site();
    $base = rtrim((string) get_site_url(), '/');

    $personal_wallet_catalog_url = $use_local
        ? $base . '/community-tools/personal-wallets/'
        : 'https://fides.community/community-tools/personal-wallets/';
    $business_wallet_catalog_url = $use_local
        ? $base . '/ecosystem-explorer/organizational-wallets/'
        : 'https://fides.community/ecosystem-explorer/organizational-wallets/';

    return array(
        'walletCatalogUrl' => $personal_wallet_catalog_url,
        'personalWalletCatalogUrl' => $personal_wallet_catalog_url,
        'businessWalletCatalogUrl' => $business_wallet_catalog_url,
        'issuerCatalogUrl' => $use_local
            ? $base . '/ecosystem-explorer/issuer-catalog/'
            : 'https://fides.community/ecosystem-explorer/issuer-catalog/',
        'credentialCatalogUrl' => $use_local
            ? $base . '/ecosystem-explorer/credential-catalog/'
            : 'https://fides.community/ecosystem-explorer/credential-catalog/',
        'rpCatalogUrl' => $use_local
            ? $base . '/community-tools/relying-party-catalog/'
            : 'https://fides.community/community-tools/relying-party-catalog/',
    );
}

function fides_use_case_catalog_lookup_sources(): array {
    $wallet_source = 'https://raw.githubusercontent.com/FIDEScommunity/fides-wallet-catalog/main/data/aggregated.json';

    return apply_filters(
        'fides_use_case_catalog_lookup_sources',
        array(
            'wallet' => $wallet_source,
            'personal-wallet' => $wallet_source,
            'business-wallet' => $wallet_source,
            'issuer' => 'https://raw.githubusercontent.com/FIDEScommunity/fides-issuer-catalog/main/data/aggregated.json',
            'credential' => 'https://raw.githubusercontent.com/FIDEScommunity/fides-credential-catalog/main/data/aggregated.json',
            'organization' => 'https://raw.githubusercontent.com/FIDEScommunity/fides-organization-catalog/main/data/aggregated.json',
            'rp' => 'https://raw.githubusercontent.com/FIDEScommunity/fides-rp-catalog/main/data/aggregated.json',
        )
    );
}

function fides_use_case_catalog_cached_remote_json(string $url): ?array {
    $cache_key = 'fides_uc_lookup_' . md5($url);
    $cached = get_transient($cache_key);
    if (is_array($cached)) {
        return $cached;
    }

    $response = wp_remote_get($url, array('timeout' => 10));
    if (is_wp_error($response)) {
        return null;
    }

    $status = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    if ($status >= 400 || $body === '') {
        return null;
    }

    $json = json_decode($body, true);
    if (! is_array($json)) {
        return null;
    }

    set_transient($cache_key, $json, 10 * MINUTE_IN_SECONDS);
    return $json;
}

function fides_use_case_catalog_extract_items_for_type(array $json, string $type): array {
    $candidates = array();
    if (isset($json['content']) && is_array($json['content'])) {
        $candidates = $json['content'];
    } elseif ($type === 'wallet' && isset($json['wallets']) && is_array($json['wallets'])) {
        $candidates = $json['wallets'];
    } elseif ($type === 'issuer' && isset($json['issuers']) && is_array($json['issuers'])) {
        $candidates = $json['issuers'];
    } elseif ($type === 'credential' && isset($json['credentials']) && is_array($json['credentials'])) {
        $candidates = $json['credentials'];
    } elseif ($type === 'organization' && isset($json['organizations']) && is_array($json['organizations'])) {
        $candidates = $json['organizations'];
    } elseif ($type === 'rp' && isset($json['rps']) && is_array($json['rps'])) {
        $candidates = $json['rps'];
    } elseif ($type === 'rp' && isset($json['relyingParties']) && is_array($json['relyingParties'])) {
        $candidates = $json['relyingParties'];
    }
    return $candidates;
}

/**
 * @return array<string, string>
 */
function fides_use_case_catalog_link_section_labels(): array {
    return array(
        'personalWallets' => 'Personal wallets',
        'businessWallets' => 'Business wallets',
        'wallets' => 'Wallets',
        'issuers' => 'Issuers',
        'credentials' => 'Credential types',
        'organizations' => 'Organizations',
        'rps' => 'Relying parties',
    );
}

/**
 * @return array<string, array<int, array<string, mixed>>>
 */
function fides_use_case_catalog_empty_links(): array {
    return array(
        'personalWallets' => array(),
        'businessWallets' => array(),
        'issuers' => array(),
        'credentials' => array(),
        'organizations' => array(),
        'rps' => array(),
    );
}

/**
 * @param array<string, mixed> $item
 */
function fides_use_case_catalog_wallet_type_for_item(array $item): string {
    $wallet_type = isset($item['walletType']) ? sanitize_key((string) $item['walletType']) : '';
    if ($wallet_type === 'organizational' || $wallet_type === 'business') {
        return 'organizational';
    }

    return 'personal';
}

/**
 * Normalizes link buckets and migrates legacy `wallets` into personal/business.
 *
 * @param mixed $links
 * @return array<string, array<int, array<string, mixed>>>
 */
function fides_use_case_catalog_normalize_links_structure($links): array {
    $normalized = fides_use_case_catalog_empty_links();
    if (! is_array($links)) {
        return $normalized;
    }

    foreach (array('issuers', 'credentials', 'organizations', 'rps') as $key) {
        if (isset($links[ $key ])) {
            $normalized[ $key ] = fides_use_case_catalog_normalize_link_items($links[ $key ]);
        }
    }

    $personal = array();
    $business = array();
    if (isset($links['personalWallets'])) {
        $personal = fides_use_case_catalog_normalize_link_items($links['personalWallets']);
    }
    if (isset($links['businessWallets'])) {
        $business = fides_use_case_catalog_normalize_link_items($links['businessWallets']);
    }

    if (isset($links['wallets']) && empty($personal) && empty($business)) {
        foreach (fides_use_case_catalog_normalize_link_items($links['wallets']) as $legacy_item) {
            if (! is_array($legacy_item)) {
                continue;
            }
            if (fides_use_case_catalog_wallet_type_for_item($legacy_item) === 'organizational') {
                $business[] = $legacy_item;
            } else {
                $personal[] = $legacy_item;
            }
        }
    }

    $normalized['personalWallets'] = $personal;
    $normalized['businessWallets'] = $business;

    return $normalized;
}

/**
 * Relevance score for lookup ranking (higher = shown first).
 */
function fides_use_case_catalog_lookup_match_score(string $query, string $label, string $subtitle, string $id, string $description): int {
    $q = strtolower(trim($query));
    if ($q === '') {
        return 0;
    }

    $label_lower = strtolower($label);
    $subtitle_lower = strtolower($subtitle);
    $id_lower = strtolower($id);
    $description_lower = strtolower($description);

    if ($label_lower === $q) {
        return 100;
    }
    if ($id_lower === $q) {
        return 95;
    }
    if (strpos($label_lower, $q) === 0) {
        return 90;
    }
    if ($subtitle_lower !== '' && strpos($subtitle_lower, $q) === 0) {
        return 85;
    }
    if (strpos($label_lower, $q) !== false) {
        return 75;
    }
    if ($subtitle_lower !== '' && strpos($subtitle_lower, $q) !== false) {
        return 55;
    }
    if ($id_lower !== '' && strpos($id_lower, $q) !== false) {
        return 45;
    }
    if ($description_lower !== '' && strpos($description_lower, $q) !== false) {
        return 25;
    }

    return 0;
}

/**
 * @return array{content: array<int, array<string, mixed>>, totalMatches: int, limit: int, truncated: bool}
 */
function fides_use_case_catalog_map_lookup_items(array $items, string $query, string $wallet_scope = ''): array {
    $q = strtolower(trim($query));
    $limit = (int) FIDES_USE_CASE_LOOKUP_LIMIT;
    if ($limit < 1) {
        $limit = 8;
    }

    $matches = array();
    foreach ($items as $item) {
        if (! is_array($item)) {
            continue;
        }

        if ($wallet_scope === 'personal') {
            $item_type = isset($item['type']) ? (string) $item['type'] : '';
            if ($item_type !== '' && $item_type !== 'personal') {
                continue;
            }
        } elseif ($wallet_scope === 'business') {
            $item_type = isset($item['type']) ? (string) $item['type'] : '';
            if ($item_type !== '' && $item_type !== 'organizational') {
                continue;
            }
        }

        $id = isset($item['id']) ? (string) $item['id'] : '';
        $label = '';
        if (isset($item['displayName']) && is_string($item['displayName'])) {
            $label = $item['displayName'];
        } elseif (isset($item['name']) && is_string($item['name'])) {
            $label = $item['name'];
        } elseif (isset($item['title']) && is_string($item['title'])) {
            $label = $item['title'];
        } elseif ($id !== '') {
            $label = $id;
        }

        $subtitle = '';
        if (isset($item['organizationName']) && is_string($item['organizationName'])) {
            $subtitle = $item['organizationName'];
        } elseif (isset($item['provider']['name']) && is_string($item['provider']['name'])) {
            $subtitle = $item['provider']['name'];
        } elseif (isset($item['orgId']) && is_string($item['orgId'])) {
            $subtitle = $item['orgId'];
        }

        if ($label === '') {
            continue;
        }

        $description = isset($item['description']) ? (string) $item['description'] : '';
        $score = fides_use_case_catalog_lookup_match_score($q, $label, $subtitle, $id, $description);
        if ($q !== '' && $score === 0) {
            continue;
        }

        $matches[] = array(
            'score' => $score,
            'row' => array(
                'id' => $id !== '' ? $id : sanitize_title($label),
                'label' => $label,
                'subtitle' => $subtitle,
                'url' => isset($item['website']) ? (string) $item['website'] : null,
            ),
        );
    }

    usort(
        $matches,
        static function (array $a, array $b): int {
            $score_cmp = (int) $b['score'] <=> (int) $a['score'];
            if ($score_cmp !== 0) {
                return $score_cmp;
            }
            return strcasecmp((string) $a['row']['label'], (string) $b['row']['label']);
        }
    );

    $total = count($matches);
    $content = array();
    foreach (array_slice($matches, 0, $limit) as $entry) {
        $content[] = $entry['row'];
    }

    return array(
        'content' => $content,
        'totalMatches' => $total,
        'limit' => $limit,
        'truncated' => $total > $limit,
    );
}

function fides_use_case_catalog_slugify(string $text): string {
    $slug = sanitize_title($text);
    if ($slug === '') {
        $slug = 'use-case';
    }
    return $slug;
}

function fides_use_case_catalog_detect_video_provider(string $url): string {
    $host = wp_parse_url($url, PHP_URL_HOST);
    if (! is_string($host)) {
        return '';
    }
    $host = strtolower($host);
    if (strpos($host, 'youtu') !== false) {
        return 'youtube';
    }
    if (strpos($host, 'vimeo') !== false) {
        return 'vimeo';
    }
    return '';
}

function fides_use_case_catalog_normalize_link_items($items): array {
    if (! is_array($items)) {
        return array();
    }

    $normalized = array();
    foreach ($items as $item) {
        if (! is_array($item)) {
            continue;
        }
        $wallet_type = '';
        if (isset($item['walletType'])) {
            $wallet_type = fides_use_case_catalog_wallet_type_for_item($item);
        }

        $normalized[] = array(
            'refId' => isset($item['refId']) ? sanitize_text_field((string) $item['refId']) : null,
            'labelRaw' => isset($item['labelRaw']) ? sanitize_text_field((string) $item['labelRaw']) : null,
            'url' => isset($item['url']) ? esc_url_raw((string) $item['url']) : null,
            'source' => (isset($item['source']) && $item['source'] === 'catalog') ? 'catalog' : 'manual',
            'walletType' => $wallet_type !== '' ? $wallet_type : null,
        );
    }
    return $normalized;
}

function fides_use_case_catalog_register_rest_routes(): void {
    fides_use_case_catalog_register_rest_route(
        '/taxonomy',
        array(
            'methods' => WP_REST_Server::READABLE,
            'permission_callback' => '__return_true',
            'callback' => function () {
                return rest_ensure_response(fides_use_case_catalog_taxonomy_options());
            },
        )
    );

    fides_use_case_catalog_register_rest_route(
        '/lookups/(?P<type>[a-z][a-z0-9-]*)',
        array(
            'methods' => WP_REST_Server::READABLE,
            'permission_callback' => '__return_true',
            'callback' => function (WP_REST_Request $request) {
                $raw_type = sanitize_key((string) $request->get_param('type'));
                $type = $raw_type;
                $query = sanitize_text_field((string) $request->get_param('q'));
                $sources = fides_use_case_catalog_lookup_sources();
                $wallet_scope = '';

                if ($raw_type === 'personalwallet' || $raw_type === 'personal-wallet') {
                    $type = 'wallet';
                    $wallet_scope = 'personal';
                } elseif ($raw_type === 'businesswallet' || $raw_type === 'business-wallet') {
                    $type = 'wallet';
                    $wallet_scope = 'business';
                }

                $lookup_key = $wallet_scope === 'personal'
                    ? 'personal-wallet'
                    : ($wallet_scope === 'business' ? 'business-wallet' : $type);

                if (! isset($sources[ $lookup_key ]) && ! isset($sources[ $type ])) {
                    return new WP_REST_Response(array('message' => 'Unsupported lookup type.'), 400);
                }
                if ($query === '') {
                    return rest_ensure_response(array('content' => array()));
                }
                $source = $sources[ $lookup_key ] ?? $sources[ $type ];
                $json = fides_use_case_catalog_cached_remote_json($source);
                if (! is_array($json)) {
                    return new WP_REST_Response(array('message' => 'Lookup source unavailable.'), 502);
                }

                $items = fides_use_case_catalog_extract_items_for_type($json, $type);
                $lookup = fides_use_case_catalog_map_lookup_items($items, $query, $wallet_scope);
                return rest_ensure_response(
                    array(
                        'content' => $lookup['content'],
                        'totalMatches' => $lookup['totalMatches'],
                        'limit' => $lookup['limit'],
                        'truncated' => $lookup['truncated'],
                        'source' => $source,
                    )
                );
            },
        )
    );

    fides_use_case_catalog_register_rest_route(
        '/submissions/card-image',
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'permission_callback' => static function (): bool {
                return is_user_logged_in();
            },
            'callback' => 'fides_use_case_catalog_rest_upload_card_image',
        )
    );

    fides_use_case_catalog_register_rest_route(
        '/submissions',
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'permission_callback' => static function (): bool {
                return is_user_logged_in();
            },
            'callback' => function (WP_REST_Request $request) {
                global $wpdb;
                $table = FIDES_USE_CASE_CATALOG_TABLE;
                $payload = $request->get_json_params();
                if (! is_array($payload)) {
                    return new WP_REST_Response(array('message' => 'Invalid JSON body.'), 400);
                }

                $user = wp_get_current_user();
                $contact_email = sanitize_email((string) $user->user_email);
                if (! is_email($contact_email)) {
                    return new WP_REST_Response(
                        array('message' => 'Your WordPress profile must have a valid email address before submitting.'),
                        400
                    );
                }

                $title = sanitize_text_field((string) ($payload['title'] ?? ''));
                $summary = trim(wp_kses_post((string) ($payload['summary'] ?? '')));
                $organization_name = sanitize_text_field((string) ($payload['organizationName'] ?? ''));
                $stage = fides_use_case_catalog_normalize_stage(sanitize_text_field((string) ($payload['stage'] ?? '')));
                $video_url = esc_url_raw((string) ($payload['videoUrl'] ?? ''));
                $image_url = esc_url_raw((string) ($payload['imageUrl'] ?? ''));
                $more_info_url = esc_url_raw((string) ($payload['moreInfoUrl'] ?? ''));
                $user_journey = trim(wp_kses_post((string) ($payload['userJourney'] ?? '')));
                $consent_publish = ! empty($payload['consentPublish']);
                $tags = is_array($payload['tags'] ?? null) ? array_values(array_map('sanitize_text_field', $payload['tags'])) : array();

                if (strlen($title) < 5 || strlen($summary) < 30 || $organization_name === '') {
                    return new WP_REST_Response(array('message' => 'Validation failed for required fields.'), 400);
                }
                if ($stage === '') {
                    return new WP_REST_Response(array('message' => 'Readiness level is required.'), 400);
                }
                if ($user_journey === '') {
                    return new WP_REST_Response(array('message' => 'How it works is required.'), 400);
                }
                if (! $consent_publish) {
                    return new WP_REST_Response(array('message' => 'Publish consent is required.'), 400);
                }

                $sector = fides_use_case_catalog_normalize_sector($payload['sector'] ?? ($payload['sectors'] ?? ''));
                if ($sector === '') {
                    return new WP_REST_Response(array('message' => 'Sector is required.'), 400);
                }

                $taxonomy = fides_use_case_catalog_normalize_taxonomy_payload($payload);

                $video_provider = '';
                if ($video_url !== '') {
                    $video_provider = fides_use_case_catalog_detect_video_provider($video_url);
                    if ($video_provider === '') {
                        return new WP_REST_Response(array('message' => 'Video URL must be YouTube or Vimeo.'), 400);
                    }
                }

                $links = is_array($payload['links'] ?? null) ? $payload['links'] : array();
                $normalized_links = fides_use_case_catalog_normalize_links_structure($links);

                $use_case_id = fides_use_case_catalog_slugify($title) . '-' . wp_generate_password(6, false, false);
                $now = current_time('mysql', true);
                $inserted = $wpdb->insert(
                    $table,
                    array(
                        'use_case_id' => $use_case_id,
                        'event_key' => '',
                        'theme_key' => '',
                        'sectors_json' => wp_json_encode(array($sector)),
                        'taxonomy_json' => wp_json_encode($taxonomy),
                        'title' => $title,
                        'summary' => $summary,
                        'organization_name' => $organization_name,
                        'contact_email' => $contact_email,
                        'stage' => $stage,
                        'video_url' => $video_url !== '' ? $video_url : null,
                        'video_provider' => $video_provider !== '' ? $video_provider : null,
                        'image_url' => $image_url !== '' ? $image_url : null,
                        'more_info_url' => $more_info_url !== '' ? $more_info_url : null,
                        'user_journey' => $user_journey,
                        'tags_json' => wp_json_encode($tags),
                        'links_json' => wp_json_encode($normalized_links),
                        'status' => 'received',
                        'created_at' => $now,
                        'updated_at' => $now,
                    )
                );

                if (! $inserted) {
                    return new WP_REST_Response(array('message' => 'Failed to store submission.'), 500);
                }

                return rest_ensure_response(
                    array(
                        'ok' => true,
                        'id' => $use_case_id,
                        'status' => 'received',
                    )
                );
            },
        )
    );

    fides_use_case_catalog_register_rest_route(
        '/catalog',
        array(
            'methods' => WP_REST_Server::READABLE,
            'permission_callback' => '__return_true',
            'callback' => function () {
                global $wpdb;
                $table = FIDES_USE_CASE_CATALOG_TABLE;
                $rows = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT * FROM {$table} WHERE status = %s ORDER BY COALESCE(published_at, updated_at) DESC",
                        'published'
                    ),
                    ARRAY_A
                );

                $use_cases = array();
                foreach ($rows as $row) {
                    if (! is_array($row)) {
                        continue;
                    }
                    $use_cases[] = fides_use_case_catalog_row_to_item($row);
                }

                return rest_ensure_response(
                    array(
                        'schemaVersion' => '1.1.0',
                        'catalogType' => 'use-case-catalog',
                        'lastUpdated' => gmdate(DATE_ATOM),
                        'taxonomy' => fides_use_case_catalog_taxonomy_options(),
                        'useCases' => $use_cases,
                    )
                );
            },
        )
    );
}

/**
 * Handle card image upload for logged-in submitters (JPEG/PNG/WebP/GIF, max 2 MB).
 */
function fides_use_case_catalog_rest_upload_card_image(WP_REST_Request $request) {
    $files = $request->get_file_params();
    if (empty($files['file']) || ! is_array($files['file'])) {
        return new WP_REST_Response(array('message' => 'No image file uploaded.'), 400);
    }

    $file = $files['file'];
    if (! empty($file['error'])) {
        return new WP_REST_Response(array('message' => 'Image upload failed.'), 400);
    }

    $allowed_types = array('image/jpeg', 'image/png', 'image/webp', 'image/gif');
    $mime = isset($file['type']) ? (string) $file['type'] : '';
    if (! in_array($mime, $allowed_types, true)) {
        return new WP_REST_Response(array('message' => 'Use JPEG, PNG, WebP, or GIF.'), 400);
    }

    $max_bytes = 2 * 1024 * 1024;
    $size = isset($file['size']) ? (int) $file['size'] : 0;
    if ($size <= 0 || $size > $max_bytes) {
        return new WP_REST_Response(array('message' => 'Image must be between 1 byte and 2 MB.'), 400);
    }

    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';

    $upload = wp_handle_upload(
        $file,
        array(
            'test_form' => false,
            'mimes' => array(
                'jpg|jpeg|jpe' => 'image/jpeg',
                'png'          => 'image/png',
                'webp'         => 'image/webp',
                'gif'          => 'image/gif',
            ),
        )
    );

    if (isset($upload['error'])) {
        return new WP_REST_Response(array('message' => (string) $upload['error']), 400);
    }

    $url = isset($upload['url']) ? esc_url_raw((string) $upload['url']) : '';
    if ($url === '') {
        return new WP_REST_Response(array('message' => 'Upload succeeded but no URL was returned.'), 500);
    }

    return rest_ensure_response(array('url' => $url));
}

function fides_use_case_catalog_enqueue_assets(): void {
    wp_register_style(
        'fides-use-case-catalog-style',
        FIDES_USE_CASE_CATALOG_URL . 'assets/style.css',
        array(),
        FIDES_USE_CASE_CATALOG_VERSION
    );

    wp_register_script(
        'fides-use-case-catalog-form',
        FIDES_USE_CASE_CATALOG_URL . 'assets/usecase-form.js',
        array(),
        FIDES_USE_CASE_CATALOG_VERSION,
        true
    );

    wp_register_script(
        'fides-use-case-catalog-list',
        FIDES_USE_CASE_CATALOG_URL . 'assets/usecase-catalog.js',
        array(),
        FIDES_USE_CASE_CATALOG_VERSION,
        true
    );
}
add_action('wp_enqueue_scripts', 'fides_use_case_catalog_enqueue_assets');

function fides_use_case_catalog_form_shortcode(array $atts = array()): string {
    if (! is_user_logged_in()) {
        $login_url = fides_use_case_catalog_form_login_url();
        return sprintf(
            '<div class="fides-use-case-card"><p>%s</p><p><a class="fides-form-login-link" href="%s">%s</a></p></div>',
            esc_html__('You must be logged in to submit a use case.', 'fides-use-case-catalog'),
            esc_url($login_url),
            esc_html__('Log in to continue', 'fides-use-case-catalog')
        );
    }

    wp_enqueue_style('fides-use-case-catalog-style');
    wp_enqueue_script('fides-use-case-catalog-form');

    $user = wp_get_current_user();
    $config = array(
        'apiBase' => esc_url_raw(rest_url(fides_use_case_catalog_rest_namespace())),
        'taxonomy' => fides_use_case_catalog_taxonomy_options(),
        'readinessLevels' => fides_use_case_catalog_readiness_levels(),
        'isLoggedIn' => true,
        'contactEmail' => sanitize_email((string) $user->user_email),
        'restNonce' => wp_create_nonce('wp_rest'),
    );

    wp_add_inline_script(
        'fides-use-case-catalog-form',
        'window.FIDES_USE_CASE_FORM_CONFIG = ' . wp_json_encode($config) . ';',
        'before'
    );

    return '<div id="fides-use-case-form-root"></div>';
}
add_shortcode('fides_use_case_form', 'fides_use_case_catalog_form_shortcode');

function fides_use_case_catalog_list_shortcode(array $atts = array()): string {
    $atts = shortcode_atts(
        array(
            'columns' => '3',
        ),
        $atts,
        'fides_use_case_catalog'
    );
    $columns = in_array($atts['columns'], array('2', '3', '4'), true) ? $atts['columns'] : '3';

    wp_enqueue_style('fides-use-case-catalog-style');
    wp_enqueue_script('fides-use-case-catalog-list');

    $current_request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '';
    $current_host = isset($_SERVER['HTTP_HOST']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_HOST'])) : '';
    $current_url = $current_host !== ''
        ? ((is_ssl() ? 'https://' : 'http://') . $current_host . $current_request_uri)
        : home_url('/');
    $oid4vp_options = get_option('universal_openid4vp_options', array());
    $oid4vp_login_url = '';
    if (is_array($oid4vp_options) && ! empty($oid4vp_options['loginUrl'])) {
        $oid4vp_login_url = esc_url_raw((string) $oid4vp_options['loginUrl']);
    }
    $ratings_login_url = $oid4vp_login_url !== '' ? $oid4vp_login_url : wp_login_url($current_url);

    $config = array_merge(
        array(
            'apiBase' => esc_url_raw(rest_url(fides_use_case_catalog_rest_namespace())),
            'taxonomy' => fides_use_case_catalog_taxonomy_options(),
            'columns' => $columns,
            'readinessLevels' => fides_use_case_catalog_readiness_levels(),
            'ratingsApiBase' => rest_url('fides-catalog/v1'),
            'ratingsNonce' => wp_create_nonce('wp_rest'),
            'ratingsIsLoggedIn' => is_user_logged_in(),
            'ratingsLoginUrl' => $ratings_login_url,
        ),
        fides_use_case_catalog_catalog_urls()
    );

    wp_add_inline_script(
        'fides-use-case-catalog-list',
        'window.FIDES_USE_CASE_LIST_CONFIG = ' . wp_json_encode($config) . ';',
        'before'
    );

    return sprintf(
        '<div id="fides-use-case-catalog-root" data-columns="%s"></div>',
        esc_attr($columns)
    );
}
add_shortcode('fides_use_case_catalog', 'fides_use_case_catalog_list_shortcode');

/**
 * Read-only list of linked catalog entries for the admin review screen.
 *
 * @param array<int, array<string, mixed>> $items
 */
function fides_use_case_catalog_render_admin_linked_items_html(array $items): string {
    if (empty($items)) {
        return '<p class="description" style="margin:0;">None listed.</p>';
    }

    $html = '<ul style="margin:0;">';
    foreach ($items as $item) {
        if (! is_array($item)) {
            continue;
        }
        $label = isset($item['labelRaw']) && $item['labelRaw']
            ? (string) $item['labelRaw']
            : ((isset($item['refId']) && $item['refId']) ? (string) $item['refId'] : 'Untitled');
        $html .= '<li>';
        $html .= esc_html($label);
        if (! empty($item['refId'])) {
            $html .= ' <code>' . esc_html((string) $item['refId']) . '</code>';
        }
        if (! empty($item['source'])) {
            $html .= ' <em>(' . esc_html((string) $item['source']) . ')</em>';
        }
        $html .= '</li>';
    }
    $html .= '</ul>';

    return $html;
}

/**
 * Linked catalog buckets in the same order as the public submission form.
 *
 * @return array<string, string>
 */
function fides_use_case_catalog_admin_linked_catalog_sections(): array {
    return array(
        'personalWallets' => 'Personal wallets used',
        'businessWallets' => 'Business wallets used',
        'issuers'         => 'Issuers involved',
        'credentials'     => 'Credential types used',
        'rps'             => 'Relying parties',
    );
}

function fides_use_case_catalog_register_admin_page(): void {
    add_submenu_page(
        'tools.php',
        'Use Case Submissions',
        'Use Case Submissions',
        'manage_options',
        'fides-use-case-submissions',
        'fides_use_case_catalog_render_admin_page'
    );
}

function fides_use_case_catalog_render_admin_page(): void {
    if (! current_user_can('manage_options')) {
        return;
    }
    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    $selected_id = isset($_GET['submission']) ? (int) $_GET['submission'] : 0;
    $selected_submission = null;
    if ($selected_id > 0) {
        $selected_submission = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM {$table} WHERE id = %d LIMIT 1", $selected_id),
            ARRAY_A
        );
    }
    $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY updated_at DESC LIMIT 250", ARRAY_A);
    ?>
    <div class="wrap">
        <h1>Use Case Submissions</h1>
        <p>Review submissions and move them through the publication workflow.</p>
        <?php if (! empty($_GET['sector_pending'])) : ?>
            <div class="notice notice-warning is-dismissible">
                <p><?php esc_html_e('Cannot publish while sector is still “Other”. Open the submission, assign the correct sector, save, then publish.', 'fides-use-case-catalog'); ?></p>
            </div>
        <?php endif; ?>
        <?php if (! empty($_GET['country_pending'])) : ?>
            <div class="notice notice-warning is-dismissible">
                <p><?php esc_html_e('Cannot publish without a country. Open the submission, select a country, save, then publish.', 'fides-use-case-catalog'); ?></p>
            </div>
        <?php endif; ?>
        <?php if (! empty($_GET['saved'])) : ?>
            <div class="notice notice-success is-dismissible">
                <p><?php esc_html_e('Submission details saved.', 'fides-use-case-catalog'); ?></p>
            </div>
        <?php endif; ?>
        <?php if (is_array($selected_submission)) : ?>
            <?php
            $tags = json_decode((string) $selected_submission['tags_json'], true);
            $links = fides_use_case_catalog_normalize_links_structure(
                json_decode((string) $selected_submission['links_json'], true)
            );
            $taxonomy_options = fides_use_case_catalog_taxonomy_options();
            $selected_sector = fides_use_case_catalog_row_sector($selected_submission);
            $selected_taxonomy = fides_use_case_catalog_row_taxonomy($selected_submission);
            $save_nonce = wp_create_nonce('fides_use_case_save_submission_' . (int) $selected_submission['id']);
            $involved_orgs = isset($links['organizations']) && is_array($links['organizations']) ? $links['organizations'] : array();
            $linked_catalog_sections = fides_use_case_catalog_admin_linked_catalog_sections();
            $selected_country = fides_use_case_catalog_normalize_country_code((string) ($selected_submission['country_code'] ?? ''));
            ?>
            <div class="postbox" style="max-width: 1200px; margin: 16px 0;">
                <div class="inside">
                    <h2 style="margin-top: 0;">Submission details</h2>
                    <p><strong>Status:</strong> <?php echo esc_html(fides_use_case_catalog_normalize_status((string) $selected_submission['status'])); ?></p>

                    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin: 12px 0 16px;">
                        <input type="hidden" name="action" value="fides_use_case_save_submission">
                        <input type="hidden" name="id" value="<?php echo esc_attr((string) $selected_submission['id']); ?>">
                        <input type="hidden" name="_wpnonce" value="<?php echo esc_attr($save_nonce); ?>">

                        <h3 style="margin: 20px 0 8px;">Use case overview</h3>
                        <table class="form-table" role="presentation">
                            <tbody>
                                <tr>
                                    <th scope="row"><label for="uc-title">Use case title</label></th>
                                    <td><input class="regular-text" id="uc-title" name="title" type="text" required value="<?php echo esc_attr((string) $selected_submission['title']); ?>"></td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="uc-summary">Description</label></th>
                                    <td><textarea class="large-text" id="uc-summary" name="summary" rows="4" required><?php echo esc_textarea((string) $selected_submission['summary']); ?></textarea></td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="uc-sector">Sector</label></th>
                                    <td>
                                        <?php if ($selected_sector === 'other') : ?>
                                            <p class="description"><?php esc_html_e('Submitter selected Other. Choose the correct sector from the list below before publishing.', 'fides-use-case-catalog'); ?></p>
                                        <?php endif; ?>
                                        <?php echo fides_use_case_catalog_render_admin_select_field('sector', fides_use_case_catalog_assignable_sectors(), $selected_sector === 'other' ? '' : $selected_sector, true); ?>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="uc-stage">Readiness level</label></th>
                                    <td>
                                        <select id="uc-stage" name="stage">
                                            <option value="" <?php selected((string) $selected_submission['stage'], ''); ?>>-</option>
                                            <?php foreach (fides_use_case_catalog_readiness_levels() as $stage_key => $stage_label) : ?>
                                                <option value="<?php echo esc_attr($stage_key); ?>" <?php selected(fides_use_case_catalog_normalize_stage((string) $selected_submission['stage']), $stage_key); ?>><?php echo esc_html($stage_label); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">Involved organizations</th>
                                    <td><?php echo fides_use_case_catalog_render_admin_linked_items_html($involved_orgs); ?></td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="uc-org">Submitted by organization</label></th>
                                    <td><input class="regular-text" id="uc-org" name="organization_name" type="text" required value="<?php echo esc_attr((string) $selected_submission['organization_name']); ?>"></td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="uc-country">Country *</label></th>
                                    <td>
                                        <?php echo fides_use_case_catalog_render_admin_select_field('country_code', fides_use_case_catalog_country_options(), $selected_country, true); ?>
                                        <p class="description">Assigned during review (not collected on the public submission form). ISO 3166-1 alpha-2 or EU. Required before publish.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="uc-email">Contact email</label></th>
                                    <td><input class="regular-text" id="uc-email" name="contact_email" type="email" required value="<?php echo esc_attr((string) $selected_submission['contact_email']); ?>"></td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="uc-user-journey">How it works</label></th>
                                    <td><textarea class="large-text" id="uc-user-journey" name="user_journey" rows="6"><?php echo esc_textarea((string) $selected_submission['user_journey']); ?></textarea></td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="uc-tags">Tags (comma separated)</label></th>
                                    <td><input class="regular-text" id="uc-tags" name="tags" type="text" value="<?php echo esc_attr(is_array($tags) ? implode(', ', array_map('strval', $tags)) : ''); ?>"></td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="uc-more-info">More info URL</label></th>
                                    <td><input class="regular-text" id="uc-more-info" name="more_info_url" type="url" value="<?php echo esc_attr((string) $selected_submission['more_info_url']); ?>"></td>
                                </tr>
                            </tbody>
                        </table>

                        <h3 style="margin: 24px 0 8px;">Media</h3>
                        <table class="form-table" role="presentation">
                            <tbody>
                                <tr>
                                    <th scope="row"><label for="uc-image">Cover image</label></th>
                                    <td>
                                        <input class="regular-text" id="uc-image" name="image_url" type="url" value="<?php echo esc_attr((string) ($selected_submission['image_url'] ?? '')); ?>">
                                        <p class="description">Landscape image for the catalog card (16:7).</p>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="uc-video">Demo video</label></th>
                                    <td><input class="regular-text" id="uc-video" name="video_url" type="url" value="<?php echo esc_attr((string) $selected_submission['video_url']); ?>"></td>
                                </tr>
                            </tbody>
                        </table>

                        <h3 style="margin: 24px 0 8px;">Technical details</h3>
                        <table class="form-table" role="presentation">
                            <tbody>
                                <tr>
                                    <th scope="row">Interaction mode</th>
                                    <td><?php echo fides_use_case_catalog_render_admin_checkbox_field('interaction_modes', $taxonomy_options['interactionModes'], $selected_taxonomy['interactionModes']); ?></td>
                                </tr>
                                <tr>
                                    <th scope="row">VC format</th>
                                    <td><?php echo fides_use_case_catalog_render_admin_checkbox_field('vc_formats', $taxonomy_options['vcFormats'], $selected_taxonomy['vcFormats']); ?></td>
                                </tr>
                                <tr>
                                    <th scope="row">Issuance protocol</th>
                                    <td><?php echo fides_use_case_catalog_render_admin_checkbox_field('issuance_protocols', $taxonomy_options['issuanceProtocols'], $selected_taxonomy['issuanceProtocols']); ?></td>
                                </tr>
                                <tr>
                                    <th scope="row">Presentation protocol</th>
                                    <td><?php echo fides_use_case_catalog_render_admin_checkbox_field('presentation_protocols', $taxonomy_options['presentationProtocols'], $selected_taxonomy['presentationProtocols']); ?></td>
                                </tr>
                                <tr>
                                    <th scope="row">Interop profile</th>
                                    <td><?php echo fides_use_case_catalog_render_admin_checkbox_field('interop_profiles', $taxonomy_options['interopProfiles'], $selected_taxonomy['interopProfiles']); ?></td>
                                </tr>
                            </tbody>
                        </table>

                        <p>
                            <button class="button button-secondary" type="submit">Save details</button>
                            <a class="button button-secondary" href="<?php echo esc_url(admin_url('tools.php?page=fides-use-case-submissions')); ?>">Cancel</a>
                        </p>
                    </form>

                    <h3 style="margin: 24px 0 8px;">Linked catalog items</h3>
                    <?php
                    $has_linked_catalog = false;
                    foreach ($linked_catalog_sections as $link_type => $link_label) {
                        $items = isset($links[ $link_type ]) && is_array($links[ $link_type ]) ? $links[ $link_type ] : array();
                        if (empty($items)) {
                            continue;
                        }
                        $has_linked_catalog = true;
                        ?>
                        <p style="margin-bottom: 4px;"><strong><?php echo esc_html($link_label); ?></strong></p>
                        <?php echo fides_use_case_catalog_render_admin_linked_items_html($items); ?>
                    <?php } ?>
                    <?php if (! $has_linked_catalog) : ?>
                        <p>No linked catalog items.</p>
                    <?php endif; ?>
                </div>
            </div>
        <?php endif; ?>
        <table class="widefat striped">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Sector</th>
                    <th>Organization</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($rows)) : ?>
                    <tr><td colspan="6">No submissions found.</td></tr>
                <?php else : ?>
                    <?php foreach ($rows as $row) : ?>
                        <tr>
                            <td><strong><?php echo esc_html($row['title']); ?></strong><br><code><?php echo esc_html($row['use_case_id']); ?></code></td>
                            <td><?php echo esc_html(fides_use_case_catalog_sector_label(fides_use_case_catalog_row_sector($row)) ?: '—'); ?></td>
                            <td><?php echo esc_html($row['organization_name']); ?></td>
                            <td><?php echo esc_html(fides_use_case_catalog_normalize_status((string) $row['status'])); ?></td>
                            <td><?php echo esc_html(get_date_from_gmt((string) $row['updated_at'], 'Y-m-d H:i')); ?></td>
                            <td>
                                <?php
                                $base = admin_url('admin-post.php?action=fides_use_case_set_status&id=' . (int) $row['id']);
                                $nonce = wp_create_nonce('fides_use_case_set_status_' . (int) $row['id']);
                                $view_url = admin_url('tools.php?page=fides-use-case-submissions&submission=' . (int) $row['id']);
                                ?>
                                <a class="button button-small" href="<?php echo esc_url($view_url); ?>">View</a>
                                <a class="button button-small" href="<?php echo esc_url($base . '&status=approved&_wpnonce=' . $nonce); ?>">Approve</a>
                                <a class="button button-small button-primary" href="<?php echo esc_url($base . '&status=published&_wpnonce=' . $nonce); ?>">Publish</a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
    <?php
}

function fides_use_case_catalog_handle_status_action(): void {
    if (! current_user_can('manage_options')) {
        wp_die('Insufficient permissions.');
    }

    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;

    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    $status = isset($_GET['status']) ? fides_use_case_catalog_normalize_status((string) $_GET['status']) : '';
    $valid_statuses = fides_use_case_catalog_valid_statuses();

    if ($id <= 0 || ! in_array($status, $valid_statuses, true)) {
        wp_safe_redirect(admin_url('tools.php?page=fides-use-case-submissions'));
        exit;
    }

    $nonce = isset($_GET['_wpnonce']) ? sanitize_text_field((string) $_GET['_wpnonce']) : '';
    if (! wp_verify_nonce($nonce, 'fides_use_case_set_status_' . $id)) {
        wp_die('Invalid nonce.');
    }

    $data = array(
        'status' => $status,
        'updated_at' => current_time('mysql', true),
    );
    if ($status === 'published') {
        $row = $wpdb->get_row(
            $wpdb->prepare("SELECT sectors_json, theme_key, country_code FROM {$table} WHERE id = %d", $id),
            ARRAY_A
        );
        if (is_array($row) && fides_use_case_catalog_row_sector($row) === 'other') {
            wp_safe_redirect(
                admin_url('tools.php?page=fides-use-case-submissions&submission=' . $id . '&sector_pending=1')
            );
            exit;
        }
        if (
            is_array($row)
            && fides_use_case_catalog_normalize_country_code((string) ($row['country_code'] ?? '')) === ''
        ) {
            wp_safe_redirect(
                admin_url('tools.php?page=fides-use-case-submissions&submission=' . $id . '&country_pending=1')
            );
            exit;
        }
        $data['published_at'] = current_time('mysql', true);
    }

    $wpdb->update($table, $data, array('id' => $id));
    wp_safe_redirect(admin_url('tools.php?page=fides-use-case-submissions'));
    exit;
}

function fides_use_case_catalog_handle_save_submission_action(): void {
    if (! current_user_can('manage_options')) {
        wp_die('Insufficient permissions.');
    }

    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;

    $id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
    $nonce = isset($_POST['_wpnonce']) ? sanitize_text_field((string) $_POST['_wpnonce']) : '';
    if ($id <= 0 || ! wp_verify_nonce($nonce, 'fides_use_case_save_submission_' . $id)) {
        wp_die('Invalid request.');
    }

    $title = sanitize_text_field((string) ($_POST['title'] ?? ''));
    $summary = trim(wp_kses_post((string) ($_POST['summary'] ?? '')));
    $sector = fides_use_case_catalog_normalize_sector($_POST['sector'] ?? ($_POST['sectors'] ?? ''));
    $taxonomy = fides_use_case_catalog_normalize_taxonomy_payload(
        array(
            'interactionModes' => $_POST['interaction_modes'] ?? array(),
            'vcFormats' => $_POST['vc_formats'] ?? array(),
            'issuanceProtocols' => $_POST['issuance_protocols'] ?? array(),
            'presentationProtocols' => $_POST['presentation_protocols'] ?? array(),
            'interopProfiles' => $_POST['interop_profiles'] ?? array(),
        )
    );
    $organization_name = sanitize_text_field((string) ($_POST['organization_name'] ?? ''));
    $country_code      = fides_use_case_catalog_sanitize_country_code((string) ($_POST['country_code'] ?? ''));
    $contact_email     = sanitize_email((string) ($_POST['contact_email'] ?? ''));
    $stage = fides_use_case_catalog_normalize_stage(sanitize_text_field((string) ($_POST['stage'] ?? '')));
    $video_url = esc_url_raw((string) ($_POST['video_url'] ?? ''));
    $image_url = esc_url_raw((string) ($_POST['image_url'] ?? ''));
    $more_info_url = esc_url_raw((string) ($_POST['more_info_url'] ?? ''));
    $user_journey = trim(wp_kses_post((string) ($_POST['user_journey'] ?? '')));
    $tags_raw = sanitize_text_field((string) ($_POST['tags'] ?? ''));

    if (
        $title === ''
        || $summary === ''
        || $sector === ''
        || $sector === 'other'
        || $organization_name === ''
        || $country_code === ''
        || ! is_email($contact_email)
    ) {
        wp_die('Required fields are missing or invalid. Assign a sector other than Other and select a country before saving.');
    }

    $video_provider = '';
    if ($video_url !== '') {
        $video_provider = fides_use_case_catalog_detect_video_provider($video_url);
        if ($video_provider === '') {
            wp_die('Video URL must be YouTube or Vimeo.');
        }
    }

    $tags = array();
    foreach (explode(',', $tags_raw) as $tag) {
        $tag = sanitize_text_field(trim($tag));
        if ($tag !== '') {
            $tags[] = $tag;
        }
    }

    $wpdb->update(
        $table,
        array(
            'event_key' => '',
            'theme_key' => '',
            'sectors_json' => wp_json_encode(array($sector)),
            'taxonomy_json' => wp_json_encode($taxonomy),
            'title' => $title,
            'summary' => $summary,
            'organization_name' => $organization_name,
            'country_code'      => $country_code,
            'contact_email'     => $contact_email,
            'stage' => $stage,
            'video_url' => $video_url !== '' ? $video_url : null,
            'video_provider' => $video_provider !== '' ? $video_provider : null,
            'image_url' => $image_url !== '' ? $image_url : null,
            'more_info_url' => $more_info_url !== '' ? $more_info_url : null,
            'user_journey' => $user_journey !== '' ? $user_journey : null,
            'tags_json' => wp_json_encode($tags),
            'updated_at' => current_time('mysql', true),
        ),
        array('id' => $id)
    );

    wp_safe_redirect(admin_url('tools.php?page=fides-use-case-submissions&saved=1'));
    exit;
}

