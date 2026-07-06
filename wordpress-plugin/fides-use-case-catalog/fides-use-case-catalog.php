<?php
/**
 * Plugin Name: FIDES Use Case Catalog
 * Description: Submission form and catalog renderer for the FIDES Use Case Catalog.
 * Version: 0.8.7
 * Author: FIDES Labs BV
 * License: Apache-2.0
 */

if (! defined('ABSPATH')) {
    exit;
}

define('FIDES_USE_CASE_CATALOG_VERSION', '0.8.7');
define('FIDES_USE_CASE_CATALOG_DEFAULT_UPDATE_FORM_PATH', '/use-cases/update/');
define('FIDES_USE_CASE_CATALOG_SETTINGS_GROUP', 'fides_use_case_catalog_settings');
define('FIDES_USE_CASE_CATALOG_URL', plugin_dir_url(__FILE__));
define('FIDES_USE_CASE_CATALOG_PATH', plugin_dir_path(__FILE__));
define('FIDES_USE_CASE_CATALOG_TABLE', $GLOBALS['wpdb']->prefix . 'fides_use_case_submissions');
define('FIDES_USE_CASE_CATALOG_DB_VERSION', '1.7.0');
define('FIDES_USE_CASE_LOOKUP_LIMIT', 8);

require_once FIDES_USE_CASE_CATALOG_PATH . 'includes/use-case-taxonomy.php';
require_once FIDES_USE_CASE_CATALOG_PATH . 'includes/use-case-notifications.php';
require_once FIDES_USE_CASE_CATALOG_PATH . 'includes/class-fides-use-case-catalog-ssr.php';
require_once FIDES_USE_CASE_CATALOG_PATH . 'includes/class-fides-use-case-catalog-submission-diff.php';

// Boot the SSR/SEO renderer (no-op shim when the tiles base class is absent).
Fides_Use_Case_Catalog_SSR::bootstrap();

register_activation_hook(__FILE__, 'fides_use_case_catalog_activate');
add_action('admin_init', 'fides_use_case_catalog_maybe_upgrade_schema');
add_action('admin_init', 'fides_use_case_catalog_register_settings');
add_action('init', 'fides_use_case_catalog_register_with_core', 5);
add_action('admin_menu', 'fides_use_case_catalog_register_admin_page');
add_action('admin_menu', 'fides_use_case_catalog_register_settings_page');
add_action('admin_post_fides_use_case_set_status', 'fides_use_case_catalog_handle_status_action');
add_action('admin_post_fides_use_case_save_submission', 'fides_use_case_catalog_handle_save_submission_action');
add_action('admin_post_fides_use_case_refresh_github', 'fides_use_case_catalog_handle_refresh_github_action');
add_action('admin_post_fides_use_case_delete', 'fides_use_case_catalog_handle_delete_action');
add_action('admin_post_fides_use_case_import_github', 'fides_use_case_catalog_handle_import_github_action');
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
        production_deployment VARCHAR(8) NOT NULL DEFAULT '',
        video_url TEXT NULL,
        video_provider VARCHAR(32) NULL,
        image_url TEXT NULL,
        media_json LONGTEXT NULL,
        more_info_url TEXT NULL,
        user_journey TEXT NULL,
        tags_json LONGTEXT NULL,
        links_json LONGTEXT NULL,
        submission_action VARCHAR(16) NOT NULL DEFAULT 'create',
        target_use_case_id VARCHAR(191) NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'received',
        published_at DATETIME NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY  (id),
        KEY use_case_id_idx (use_case_id),
        KEY target_use_case_idx (target_use_case_id),
        KEY submission_action_idx (submission_action),
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
    fides_use_case_catalog_migrate_production_deployment_column();
    fides_use_case_catalog_migrate_awards_columns();
    fides_use_case_catalog_migrate_country_column();
    fides_use_case_catalog_migrate_media_column();
    fides_use_case_catalog_migrate_update_proposal_columns();
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
 * Production deployment options (stored as yes/no).
 *
 * @return array<string, string>
 */
function fides_use_case_catalog_production_deployment_options(): array {
    return array(
        'yes' => 'Yes',
        'no'  => 'No',
    );
}

/**
 * Validate production deployment slug.
 */
function fides_use_case_catalog_normalize_production_deployment(string $value): string {
    $value = sanitize_key(str_replace('_', '-', $value));
    $options = fides_use_case_catalog_production_deployment_options();
    return isset($options[ $value ]) ? $value : '';
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
        // Append the current page as return_to so the user lands back on the
        // submission form after signing in (same pattern as the catalog like
        // buttons), instead of being dropped on the homepage.
        return esc_url_raw(
            add_query_arg('return_to', $current_url, (string) $oid4vp_options['loginUrl'])
        );
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
            // Source of truth = git-versioned aggregated.json on GitHub (same
            // pattern as the other FIDES catalogs). The shared core caches this
            // with a transient + options backup; SSR, sitemap and the catalog
            // map all read from it. REST /catalog stays available as the JS
            // fallback and feeds the export/crawler pipeline.
            'json_url'          => fides_use_case_catalog_aggregated_url(),
            'collection_key'    => 'useCases',
            'id_field'          => 'id',
            'name_field'        => 'title',
            'description_field' => 'summary',
            'logo_field'        => 'imageUrl',
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
        ? $base . '/ecosystem-explorer/personal-wallets/'
        : 'https://fides.community/ecosystem-explorer/personal-wallets/';
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
            ? $base . '/ecosystem-explorer/relying-party-catalog/'
            : 'https://fides.community/ecosystem-explorer/relying-party-catalog/',
        'organizationCatalogUrl' => $use_local
            ? $base . '/organizations/'
            : 'https://fides.community/organizations/',
        'ecosystemExplorerUrl' => get_option(
            'fides_use_case_catalog_ecosystem_explorer_url',
            'https://fides.community/topics/ecosystem-explorer/'
        ),
    );
}

/**
 * Sanitize optional URL: empty string allowed (means “use default behavior”).
 *
 * @param mixed $value Raw option value.
 */
function fides_use_case_catalog_sanitize_optional_url($value): string {
    $value = is_string($value) ? trim($value) : '';
    if ($value === '') {
        return '';
    }
    return esc_url_raw($value);
}

function fides_use_case_catalog_register_settings(): void {
    register_setting(
        FIDES_USE_CASE_CATALOG_SETTINGS_GROUP,
        'fides_use_case_catalog_update_form_url',
        array(
            'type'              => 'string',
            'default'           => '',
            'sanitize_callback' => 'fides_use_case_catalog_sanitize_optional_url',
        )
    );
}

function fides_use_case_catalog_register_settings_page(): void {
    add_options_page(
        'FIDES Use Case Catalog Settings',
        'FIDES Use Case Catalog',
        'manage_options',
        'fides-use-case-catalog',
        'fides_use_case_catalog_render_settings_page'
    );
}

function fides_use_case_catalog_render_settings_page(): void {
    if (! current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="wrap">
        <h1><?php esc_html_e('FIDES Use Case Catalog', 'fides-use-case-catalog'); ?></h1>
        <form method="post" action="options.php">
            <?php settings_fields(FIDES_USE_CASE_CATALOG_SETTINGS_GROUP); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row">
                        <label for="fides_use_case_catalog_update_form_url"><?php esc_html_e('Use case update form page URL', 'fides-use-case-catalog'); ?></label>
                    </th>
                    <td>
                        <input type="url" class="large-text code" id="fides_use_case_catalog_update_form_url"
                               name="fides_use_case_catalog_update_form_url"
                               value="<?php echo esc_attr(get_option('fides_use_case_catalog_update_form_url', '')); ?>"
                               placeholder="<?php echo esc_attr(home_url(FIDES_USE_CASE_CATALOG_DEFAULT_UPDATE_FORM_PATH)); ?>">
                        <p class="description">
                            <?php esc_html_e('Create a WordPress page with the [fides_use_case_update_form] shortcode and paste its URL here. Logged-in users see a “Suggest an update” icon in the use case modal linking here with ?usecase= pre-filled. The plugin does not create this page for you.', 'fides-use-case-catalog'); ?>
                        </p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

function fides_use_case_catalog_update_form_url(): string {
    $option = trim((string) get_option('fides_use_case_catalog_update_form_url', ''));
    if ($option !== '') {
        return esc_url_raw($option);
    }
    return home_url(FIDES_USE_CASE_CATALOG_DEFAULT_UPDATE_FORM_PATH);
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
    $cache_key  = 'fides_uc_lookup_' . md5($url);
    $backup_key = 'fides_uc_lookup_bak_' . md5($url);

    $cached = get_transient($cache_key);
    if (is_array($cached)) {
        return $cached;
    }

    $response = wp_remote_get($url, array('timeout' => 10));
    if (! is_wp_error($response)) {
        $status = wp_remote_retrieve_response_code($response);
        $body   = wp_remote_retrieve_body($response);
        if ($status < 400 && $body !== '') {
            $json = json_decode($body, true);
            if (is_array($json)) {
                set_transient($cache_key, $json, 10 * MINUTE_IN_SECONDS);
                // Long-lived backup so a later upstream outage / rate-limit
                // still returns the last-known-good payload instead of nothing.
                set_transient($backup_key, $json, 7 * DAY_IN_SECONDS);
                return $json;
            }
        }
    }

    // Upstream unreachable, rate-limited, or returned junk: serve the stale
    // backup if we have one, otherwise fail safe with null.
    $backup = get_transient($backup_key);
    return is_array($backup) ? $backup : null;
}

/**
 * Canonical published data source: the git-versioned aggregated.json on GitHub.
 *
 * This — not the WordPress DB — is the source of truth for published use cases.
 * Organizations can amend their use cases through a pull request against the
 * per-organization community-catalog files, which the crawler aggregates here.
 * The WordPress submission DB is only the intake/moderation workspace.
 */
function fides_use_case_catalog_aggregated_url(): string {
    return apply_filters(
        'fides_use_case_catalog_aggregated_url',
        'https://raw.githubusercontent.com/FIDEScommunity/fides-use-case-catalog/main/data/aggregated.json'
    );
}

/**
 * Fetch the published use cases from the GitHub aggregated.json.
 *
 * Cached + fail-safe via fides_use_case_catalog_cached_remote_json(). Pass
 * $bust = true to skip the short-lived cache (used by the admin "Refresh from
 * GitHub" action so moderators always see the latest committed version).
 *
 * @return array<int, array<string, mixed>>
 */
function fides_use_case_catalog_github_items(bool $bust = false): array {
    $url = fides_use_case_catalog_aggregated_url();
    if ($url === '') {
        return array();
    }
    if ($bust) {
        delete_transient('fides_uc_lookup_' . md5($url));
    }
    $json = fides_use_case_catalog_cached_remote_json($url);
    if (! is_array($json) || ! isset($json['useCases']) || ! is_array($json['useCases'])) {
        return array();
    }
    return $json['useCases'];
}

/**
 * Find a single published use case in the GitHub aggregated.json by its id.
 *
 * @return array<string, mixed>|null
 */
function fides_use_case_catalog_github_item_by_id(string $use_case_id, bool $bust = false): ?array {
    $use_case_id = trim($use_case_id);
    if ($use_case_id === '') {
        return null;
    }
    foreach (fides_use_case_catalog_github_items($bust) as $item) {
        if (is_array($item) && isset($item['id']) && (string) $item['id'] === $use_case_id) {
            return $item;
        }
    }
    return null;
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

/**
 * Builds a normalized links structure from the admin editor POST payload
 * ($_POST['links'][<bucket>][<index>][<field>]). Blank rows and rows flagged
 * for removal are dropped; everything else runs through the standard
 * normalizer so wallet types and bucket migration stay consistent.
 *
 * @param mixed $posted
 * @return array<string, array<int, array<string, mixed>>>
 */
function fides_use_case_catalog_links_from_admin_post($posted): array {
    if (! is_array($posted)) {
        return fides_use_case_catalog_empty_links();
    }

    $raw = fides_use_case_catalog_empty_links();
    foreach (array_keys($raw) as $bucket) {
        if (! isset($posted[ $bucket ]) || ! is_array($posted[ $bucket ])) {
            continue;
        }
        $items = array();
        foreach ($posted[ $bucket ] as $row) {
            if (! is_array($row) || ! empty($row['remove'])) {
                continue;
            }
            $label = isset($row['labelRaw']) ? sanitize_text_field((string) $row['labelRaw']) : '';
            $ref   = isset($row['refId']) ? sanitize_text_field((string) $row['refId']) : '';
            $url   = isset($row['url']) ? esc_url_raw((string) $row['url']) : '';
            if ($label === '' && $ref === '' && $url === '') {
                continue; // blank row
            }
            $items[] = array(
                'refId'      => $ref !== '' ? $ref : null,
                'labelRaw'   => $label !== '' ? $label : null,
                'url'        => $url !== '' ? $url : null,
                'source'     => (isset($row['source']) && $row['source'] === 'catalog') ? 'catalog' : 'manual',
                'walletType' => isset($row['walletType']) ? $row['walletType'] : null,
            );
        }
        $raw[ $bucket ] = $items;
    }

    return fides_use_case_catalog_normalize_links_structure($raw);
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

/**
 * Normalize submission action slug.
 */
function fides_use_case_catalog_normalize_submission_action(string $action): string {
    $action = sanitize_key($action);
    return in_array($action, array('create', 'update'), true) ? $action : 'create';
}

/**
 * Whether a DB row represents an update proposal (not the canonical published entry).
 *
 * @param array<string, mixed> $row
 */
function fides_use_case_catalog_is_update_proposal_row(array $row): bool {
    if (fides_use_case_catalog_normalize_submission_action((string) ($row['submission_action'] ?? '')) === 'update') {
        return true;
    }
    if (trim((string) ($row['target_use_case_id'] ?? '')) !== '') {
        return true;
    }

    return preg_match('/-upd-/i', (string) ($row['use_case_id'] ?? '')) === 1;
}

/**
 * Browser confirm() message when deleting a submission row.
 *
 * @param array<string, mixed> $row
 */
function fides_use_case_catalog_delete_confirm_message(array $row): string {
    $title = (string) ($row['title'] ?? '');
    if (fides_use_case_catalog_is_update_proposal_row($row)) {
        return sprintf(
            /* translators: %s: use case title */
            __('Delete this update proposal for “%s”? The published use case stays unchanged. This cannot be undone.', 'fides-use-case-catalog'),
            $title
        );
    }

    if (fides_use_case_catalog_normalize_status((string) ($row['status'] ?? '')) === 'published') {
        return sprintf(
            /* translators: %s: use case title */
            __('Permanently delete “%s” from the public catalog? This cannot be undone.', 'fides-use-case-catalog'),
            $title
        );
    }

    return sprintf(
        /* translators: %s: use case title */
        __('Delete this submission for “%s”? It is not in the public catalog yet. This cannot be undone.', 'fides-use-case-catalog'),
        $title
    );
}

/**
 * Sanitize a public use case id for REST paths and lookups.
 */
function fides_use_case_catalog_sanitize_use_case_id(string $raw): string {
    $raw = sanitize_text_field(trim($raw));
    if ($raw === '') {
        return '';
    }
    if (! preg_match('/^[a-z0-9][a-z0-9._-]*$/i', $raw)) {
        return '';
    }
    return strtolower($raw);
}

/**
 * Published row in the local database for a canonical use case id.
 *
 * @return array<string, mixed>|null
 */
function fides_use_case_catalog_published_row_by_use_case_id(string $use_case_id): ?array {
    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    $row = $wpdb->get_row(
        $wpdb->prepare(
            "SELECT * FROM {$table} WHERE use_case_id = %s AND status = %s LIMIT 1",
            $use_case_id,
            'published'
        ),
        ARRAY_A
    );
    return is_array($row) ? $row : null;
}

/**
 * Resolve a published catalog item by id (database first, then git community data).
 *
 * @return array<string, mixed>|null
 */
function fides_use_case_catalog_published_item_by_id(string $use_case_id): ?array {
    $row = fides_use_case_catalog_published_row_by_use_case_id($use_case_id);
    if (is_array($row)) {
        return fides_use_case_catalog_row_to_item($row);
    }
    return fides_use_case_catalog_github_item_by_id($use_case_id, false);
}

/**
 * Items eligible for the public update-form lookup (published DB rows + git-only community items).
 *
 * @return array<int, array<string, mixed>>
 */
function fides_use_case_catalog_published_lookup_items(): array {
    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    $rows = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT * FROM {$table} WHERE status = %s ORDER BY COALESCE(published_at, updated_at) DESC",
            'published'
        ),
        ARRAY_A
    );

    $items = array();
    $seen = array();
    foreach ((array) $rows as $row) {
        if (! is_array($row)) {
            continue;
        }
        $item = fides_use_case_catalog_row_to_item($row);
        $id = isset($item['id']) ? (string) $item['id'] : '';
        if ($id === '') {
            continue;
        }
        $seen[ $id ] = true;
        $items[] = $item;
    }

    foreach (fides_use_case_catalog_github_items() as $gh_item) {
        if (! is_array($gh_item)) {
            continue;
        }
        $id = isset($gh_item['id']) ? (string) $gh_item['id'] : '';
        if ($id === '' || isset($seen[ $id ])) {
            continue;
        }
        $seen[ $id ] = true;
        $items[] = $gh_item;
    }

    return $items;
}

/**
 * Whether an open update proposal already exists for a published use case.
 */
function fides_use_case_catalog_has_pending_update_proposal(string $target_use_case_id): bool {
    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    $count = (int) $wpdb->get_var(
        $wpdb->prepare(
            "SELECT COUNT(*) FROM {$table}
             WHERE target_use_case_id = %s
               AND submission_action = %s
               AND status IN ('received', 'approved')",
            $target_use_case_id,
            'update'
        )
    );
    return $count > 0;
}

/**
 * Validate a public submission payload shared by create and update proposal endpoints.
 *
 * @param array<string, mixed> $payload
 * @return array{row: array<string, mixed>}|WP_REST_Response
 */
function fides_use_case_catalog_validate_submission_payload(array $payload, WP_User $user) {
    $contact_email = sanitize_email((string) $user->user_email);
    if (! is_email($contact_email)) {
        return new WP_REST_Response(
            array('message' => 'Your WordPress profile must have a valid email address before submitting.'),
            400
        );
    }

    $title = sanitize_text_field((string) ($payload['title'] ?? ''));
    $summary = fides_use_case_catalog_normalize_multiline_text((string) ($payload['summary'] ?? ''));
    $organization_name = sanitize_text_field((string) ($payload['organizationName'] ?? ''));
    $production_deployment = fides_use_case_catalog_normalize_production_deployment(
        sanitize_text_field((string) ($payload['productionDeployment'] ?? ''))
    );
    $more_info_url = esc_url_raw((string) ($payload['moreInfoUrl'] ?? ''));
    $user_journey = fides_use_case_catalog_normalize_multiline_text((string) ($payload['userJourney'] ?? ''));
    $consent_publish = ! empty($payload['consentPublish']);
    $tags = is_array($payload['tags'] ?? null)
        ? array_values(array_map('sanitize_text_field', $payload['tags']))
        : array();

    if (strlen($title) < 5 || strlen($summary) < 30 || $organization_name === '') {
        return new WP_REST_Response(array('message' => 'Validation failed for required fields.'), 400);
    }
    if ($production_deployment === '') {
        return new WP_REST_Response(array('message' => 'Production deployment is required.'), 400);
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

    $video_validation_error = fides_use_case_catalog_validate_media_video_urls($payload);
    if ($video_validation_error !== null) {
        return new WP_REST_Response(array('message' => $video_validation_error), 400);
    }

    $media = fides_use_case_catalog_normalize_media_payload($payload);
    $media_storage = fides_use_case_catalog_media_storage_fields($media);
    $links = is_array($payload['links'] ?? null) ? $payload['links'] : array();
    $normalized_links = fides_use_case_catalog_normalize_links_structure($links);
    $country_code = fides_use_case_catalog_sanitize_country_code((string) ($payload['country'] ?? ''));

    return array(
        'row' => array(
            'event_key' => '',
            'theme_key' => '',
            'sectors_json' => wp_json_encode(array($sector)),
            'taxonomy_json' => wp_json_encode($taxonomy),
            'title' => $title,
            'summary' => $summary,
            'organization_name' => $organization_name,
            'country_code' => $country_code !== '' ? $country_code : null,
            'contact_email' => $contact_email,
            'production_deployment' => $production_deployment,
            'video_url' => $media_storage['video_url'] !== '' ? $media_storage['video_url'] : null,
            'video_provider' => $media_storage['video_provider'] !== '' ? $media_storage['video_provider'] : null,
            'image_url' => $media_storage['image_url'] !== '' ? $media_storage['image_url'] : null,
            'media_json' => $media_storage['media_json'] !== '' ? $media_storage['media_json'] : null,
            'more_info_url' => $more_info_url !== '' ? $more_info_url : null,
            'user_journey' => $user_journey,
            'tags_json' => wp_json_encode($tags),
            'links_json' => wp_json_encode($normalized_links),
        ),
    );
}

/**
 * Import a git-only use case into the database as a published row.
 *
 * @return array<string, mixed>|null Published row on success.
 */
function fides_use_case_catalog_import_github_item_as_published(string $use_case_id): ?array {
    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    $use_case_id = fides_use_case_catalog_sanitize_use_case_id($use_case_id);
    if ($use_case_id === '') {
        return null;
    }

    $existing_id = (int) $wpdb->get_var(
        $wpdb->prepare("SELECT id FROM {$table} WHERE use_case_id = %s LIMIT 1", $use_case_id)
    );
    if ($existing_id > 0) {
        $existing_row = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM {$table} WHERE id = %d LIMIT 1", $existing_id),
            ARRAY_A
        );
        if (
            is_array($existing_row)
            && fides_use_case_catalog_normalize_status((string) $existing_row['status']) === 'published'
        ) {
            return $existing_row;
        }
        return null;
    }

    $item = fides_use_case_catalog_github_item_by_id($use_case_id, true);
    if (! is_array($item)) {
        return null;
    }

    $now  = current_time('mysql', true);
    $data = fides_use_case_catalog_item_to_row_data($item);
    $data['use_case_id']     = $use_case_id;
    $data['contact_email']   = sanitize_email((string) get_option('admin_email'));
    $data['status']          = 'published';
    $data['published_at']    = $now;
    $data['created_at']      = $now;
    $data['updated_at']      = $now;
    $data['submission_action'] = 'create';
    $data['target_use_case_id'] = null;

    if ($wpdb->insert($table, $data) === false) {
        return null;
    }

    return fides_use_case_catalog_published_row_by_use_case_id($use_case_id);
}

/**
 * Ensure a published DB row exists for merge targets (database first, GitHub import fallback).
 *
 * @return array<string, mixed>|null
 */
function fides_use_case_catalog_ensure_published_target_row(string $use_case_id): ?array {
    $use_case_id = fides_use_case_catalog_sanitize_use_case_id($use_case_id);
    if ($use_case_id === '') {
        return null;
    }

    $row = fides_use_case_catalog_published_row_by_use_case_id($use_case_id);
    if (is_array($row)) {
        return $row;
    }

    return fides_use_case_catalog_import_github_item_as_published($use_case_id);
}

/**
 * Merge an approved update proposal into its published target row.
 */
function fides_use_case_catalog_publish_update_proposal(int $proposal_id, array $proposal_row): bool {
    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    $target_use_case_id = fides_use_case_catalog_sanitize_use_case_id(
        (string) ($proposal_row['target_use_case_id'] ?? '')
    );
    if ($target_use_case_id === '') {
        return false;
    }

    $target_row = fides_use_case_catalog_ensure_published_target_row($target_use_case_id);
    if (! is_array($target_row)) {
        return false;
    }

    $item = fides_use_case_catalog_row_to_item($proposal_row);
    $content = fides_use_case_catalog_item_to_row_data($item);
    if (fides_use_case_catalog_normalize_country_code((string) ($content['country_code'] ?? '')) === '') {
        $content['country_code'] = fides_use_case_catalog_normalize_country_code(
            (string) ($target_row['country_code'] ?? '')
        );
    }
    $content['contact_email'] = sanitize_email((string) ($proposal_row['contact_email'] ?? ''));
    $content['updated_at'] = current_time('mysql', true);
    $content['published_at'] = current_time('mysql', true);

    $updated = $wpdb->update($table, $content, array('id' => (int) $target_row['id']));
    if ($updated === false) {
        return false;
    }

    $wpdb->delete($table, array('id' => $proposal_id), array('%d'));
    fides_use_case_catalog_notify_published((int) $target_row['id']);

    return true;
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
                } elseif ($raw_type === 'usecase' || $raw_type === 'use-case') {
                    if ($query === '') {
                        return rest_ensure_response(array('content' => array()));
                    }
                    if (! is_user_logged_in()) {
                        return new WP_REST_Response(array('message' => 'Sign in to search published use cases.'), 401);
                    }
                    $lookup = fides_use_case_catalog_map_lookup_items(
                        fides_use_case_catalog_published_lookup_items(),
                        $query
                    );
                    return rest_ensure_response(
                        array(
                            'content' => $lookup['content'],
                            'totalMatches' => $lookup['totalMatches'],
                            'limit' => $lookup['limit'],
                            'truncated' => $lookup['truncated'],
                            'source' => 'published-use-cases',
                        )
                    );
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
                $validated = fides_use_case_catalog_validate_submission_payload($payload, $user);
                if ($validated instanceof WP_REST_Response) {
                    return $validated;
                }

                $row_data = $validated['row'];
                $use_case_id = fides_use_case_catalog_slugify((string) $row_data['title'])
                    . '-' . wp_generate_password(6, false, false);
                $now = current_time('mysql', true);
                $inserted = $wpdb->insert(
                    $table,
                    array_merge(
                        $row_data,
                        array(
                            'use_case_id' => $use_case_id,
                            'submission_action' => 'create',
                            'target_use_case_id' => null,
                            'status' => 'received',
                            'created_at' => $now,
                            'updated_at' => $now,
                        )
                    )
                );

                if (! $inserted) {
                    return new WP_REST_Response(array('message' => 'Failed to store submission.'), 500);
                }

                fides_use_case_catalog_notify_submission(
                    (int) $wpdb->insert_id,
                    $use_case_id,
                    (string) $row_data['title'],
                    (string) $row_data['organization_name'],
                    (string) $row_data['contact_email']
                );

                return rest_ensure_response(
                    array(
                        'ok' => true,
                        'id' => $use_case_id,
                        'status' => 'received',
                        'submissionAction' => 'create',
                    )
                );
            },
        )
    );

    fides_use_case_catalog_register_rest_route(
        '/submissions/(?P<use_case_id>[a-z0-9][a-z0-9._-]*)',
        array(
            array(
                'methods' => WP_REST_Server::READABLE,
                'permission_callback' => static function (): bool {
                    return is_user_logged_in();
                },
                'callback' => function (WP_REST_Request $request) {
                    $use_case_id = fides_use_case_catalog_sanitize_use_case_id(
                        (string) $request->get_param('use_case_id')
                    );
                    if ($use_case_id === '') {
                        return new WP_REST_Response(array('message' => 'Invalid use case id.'), 400);
                    }

                    $item = fides_use_case_catalog_published_item_by_id($use_case_id);
                    if (! is_array($item)) {
                        return new WP_REST_Response(array('message' => 'Published use case not found.'), 404);
                    }

                    return rest_ensure_response(
                        array(
                            'id' => $use_case_id,
                            'payload' => $item,
                        )
                    );
                },
            ),
            array(
                'methods' => WP_REST_Server::CREATABLE,
                'permission_callback' => static function (): bool {
                    return is_user_logged_in();
                },
                'callback' => function (WP_REST_Request $request) {
                    global $wpdb;
                    $table = FIDES_USE_CASE_CATALOG_TABLE;
                    $target_use_case_id = fides_use_case_catalog_sanitize_use_case_id(
                        (string) $request->get_param('use_case_id')
                    );
                    if ($target_use_case_id === '') {
                        return new WP_REST_Response(array('message' => 'Invalid use case id.'), 400);
                    }

                    if (! is_array(fides_use_case_catalog_published_item_by_id($target_use_case_id))) {
                        return new WP_REST_Response(array('message' => 'Published use case not found.'), 404);
                    }

                    if (fides_use_case_catalog_has_pending_update_proposal($target_use_case_id)) {
                        return new WP_REST_Response(
                            array('message' => 'An update proposal for this use case is already awaiting review.'),
                            409
                        );
                    }

                    $payload = $request->get_json_params();
                    if (! is_array($payload)) {
                        return new WP_REST_Response(array('message' => 'Invalid JSON body.'), 400);
                    }

                    $user = wp_get_current_user();
                    $validated = fides_use_case_catalog_validate_submission_payload($payload, $user);
                    if ($validated instanceof WP_REST_Response) {
                        return $validated;
                    }

                    $row_data = $validated['row'];
                    $proposal_id = $target_use_case_id . '-upd-' . wp_generate_password(6, false, false);
                    $now = current_time('mysql', true);
                    $inserted = $wpdb->insert(
                        $table,
                        array_merge(
                            $row_data,
                            array(
                                'use_case_id' => $proposal_id,
                                'submission_action' => 'update',
                                'target_use_case_id' => $target_use_case_id,
                                'status' => 'received',
                                'created_at' => $now,
                                'updated_at' => $now,
                            )
                        )
                    );

                    if (! $inserted) {
                        return new WP_REST_Response(array('message' => 'Failed to store update proposal.'), 500);
                    }

                    fides_use_case_catalog_notify_submission(
                        (int) $wpdb->insert_id,
                        $proposal_id,
                        (string) $row_data['title'],
                        (string) $row_data['organization_name'],
                        (string) $row_data['contact_email']
                    );

                    return rest_ensure_response(
                        array(
                            'ok' => true,
                            'id' => $proposal_id,
                            'targetUseCaseId' => $target_use_case_id,
                            'status' => 'received',
                            'submissionAction' => 'update',
                        )
                    );
                },
            ),
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

    // Per-organization export consumed by the git/crawler publishing pipeline.
    fides_use_case_catalog_register_rest_route(
        '/export',
        array(
            'methods' => WP_REST_Server::READABLE,
            'permission_callback' => '__return_true',
            'callback' => function () {
                return rest_ensure_response(fides_use_case_catalog_build_export());
            },
        )
    );
}

/**
 * Build the per-organization export of all published use cases.
 *
 * The shape mirrors the other FIDES catalogs' community-catalog source files so
 * a crawler can write one `community-catalogs/<orgSlug>/use-case-catalog.json`
 * per organization and aggregate them into a single `data/aggregated.json`.
 *
 * @return array<string, mixed>
 */
function fides_use_case_catalog_build_export(): array {
    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    $rows = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT * FROM {$table} WHERE status = %s ORDER BY COALESCE(published_at, updated_at) DESC",
            'published'
        ),
        ARRAY_A
    );

    $buckets = array();
    foreach ((array) $rows as $row) {
        if (! is_array($row)) {
            continue;
        }
        $item   = fides_use_case_catalog_row_to_item($row);
        $bucket = fides_use_case_catalog_org_bucket($item);
        $slug   = $bucket['orgSlug'];
        if (! isset($buckets[$slug])) {
            $buckets[$slug] = array(
                'orgSlug'  => $slug,
                'orgId'    => $bucket['orgId'],
                'orgName'  => $bucket['orgName'],
                'useCases' => array(),
            );
        }
        $buckets[$slug]['useCases'][] = $item;
    }

    ksort($buckets);

    return array(
        'schemaVersion' => '1.0.0',
        'catalogType'   => 'use-case-catalog',
        'generatedAt'   => gmdate(DATE_ATOM),
        'organizations' => array_values($buckets),
    );
}

/**
 * Push published use-case export to GitHub (requires tiles push sync ≥ 1.7.7).
 */
function fides_use_case_catalog_trigger_github_sync(): void {
    if (! class_exists('Fides_Catalog_Github_Sync')) {
        return;
    }
    Fides_Catalog_Github_Sync::trigger_export_data(
        'use-case',
        fides_use_case_catalog_build_export()
    );
}

/**
 * Resolve the organization bucket (folder slug + id + display name) for an item.
 *
 * Prefers a linked organization reference (refId from the organization catalog)
 * and otherwise derives a stable slug from the free-text organizationName.
 *
 * @param array<string, mixed> $item
 * @return array{orgSlug:string, orgId:string, orgName:string}
 */
function fides_use_case_catalog_org_bucket(array $item): array {
    $org_name = isset($item['organizationName']) ? trim((string) $item['organizationName']) : '';

    $linked_ref = '';
    if (isset($item['links']['organizations'][0]) && is_array($item['links']['organizations'][0])) {
        $linked_ref = isset($item['links']['organizations'][0]['refId'])
            ? trim((string) $item['links']['organizations'][0]['refId'])
            : '';
    }

    $slug_basis = $org_name !== '' ? $org_name : $linked_ref;
    $slug = $slug_basis !== ''
        ? fides_use_case_catalog_slugify($slug_basis)
        : 'unknown-organization';

    // A linked refId is already an org:… style identifier from the org catalog.
    $org_id = $linked_ref !== '' ? $linked_ref : ('org:' . $slug);

    return array(
        'orgSlug' => $slug,
        'orgId'   => $org_id,
        'orgName' => $org_name !== '' ? $org_name : ($linked_ref !== '' ? $linked_ref : 'Unknown organization'),
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

function fides_use_case_catalog_render_form_shortcode(string $mode, array $extra = array()): string {
    if (! is_user_logged_in()) {
        wp_enqueue_style('fides-use-case-catalog-style');
        $login_url = fides_use_case_catalog_form_login_url();
        $message = $mode === 'update'
            ? __('You must be signed in to suggest a use case update.', 'fides-use-case-catalog')
            : __('You must be signed in to submit a use case.', 'fides-use-case-catalog');
        return sprintf(
            '<div class="fides-use-case-card"><p>%s</p><p><a class="fides-form-login-link" href="%s">%s</a></p></div>',
            esc_html($message),
            esc_url($login_url),
            esc_html__('Sign in to continue', 'fides-use-case-catalog')
        );
    }

    wp_enqueue_style('fides-use-case-catalog-style');
    wp_enqueue_script('fides-use-case-catalog-form');

    $user = wp_get_current_user();
    $config = array_merge(
        array(
            'mode' => $mode === 'update' ? 'update' : 'create',
            'apiBase' => esc_url_raw(rest_url(fides_use_case_catalog_rest_namespace())),
            'taxonomy' => fides_use_case_catalog_taxonomy_options(),
            'productionDeploymentOptions' => fides_use_case_catalog_production_deployment_options(),
            'isLoggedIn' => true,
            'contactEmail' => sanitize_email((string) $user->user_email),
            'restNonce' => wp_create_nonce('wp_rest'),
            'preselectUseCaseId' => '',
            'countries' => array(),
            'vocabularyUrl' => 'https://raw.githubusercontent.com/FIDEScommunity/fides-interop-profiles/main/data/vocabulary.json',
            'vocabularyFallbackUrl' => FIDES_USE_CASE_CATALOG_URL . 'assets/vocabulary.json',
        ),
        $extra
    );

    if ($mode === 'update') {
        $country_entries = array();
        foreach (fides_use_case_catalog_country_options() as $code => $label) {
            $country_entries[] = array(
                'code'  => $code,
                'label' => $label,
            );
        }
        $config['countries'] = $country_entries;
    }

    wp_add_inline_script(
        'fides-use-case-catalog-form',
        'window.FIDES_USE_CASE_FORM_CONFIG = ' . wp_json_encode($config) . ';',
        'before'
    );

    $root_id = $mode === 'update' ? 'fides-use-case-update-form-root' : 'fides-use-case-form-root';
    return '<div id="' . esc_attr($root_id) . '" class="fides-use-case-submission-root"></div>';
}

function fides_use_case_catalog_form_shortcode(array $atts = array()): string {
    return fides_use_case_catalog_render_form_shortcode('create');
}

function fides_use_case_catalog_normalize_usecase_query_param(string $raw): string {
    return fides_use_case_catalog_sanitize_use_case_id($raw);
}

function fides_use_case_catalog_update_form_shortcode(array $atts = array()): string {
    $atts = shortcode_atts(
        array(
            'usecase' => '',
        ),
        $atts,
        'fides_use_case_update_form'
    );
    $preselect = fides_use_case_catalog_normalize_usecase_query_param((string) $atts['usecase']);
    if ($preselect === '' && isset($_GET['usecase'])) {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $preselect = fides_use_case_catalog_normalize_usecase_query_param((string) wp_unslash($_GET['usecase']));
    }
    return fides_use_case_catalog_render_form_shortcode(
        'update',
        array(
            'preselectUseCaseId' => $preselect,
        )
    );
}
add_shortcode('fides_use_case_form', 'fides_use_case_catalog_form_shortcode');
add_shortcode('fides_use_case_update_form', 'fides_use_case_catalog_update_form_shortcode');

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
            // Primary data source: git-versioned aggregated.json on GitHub
            // (org-editable via pull request). REST /catalog (apiBase) is the
            // same-origin fallback for local/empty/unreachable situations.
            'aggregatedUrl' => esc_url_raw(fides_use_case_catalog_aggregated_url()),
            'taxonomy' => fides_use_case_catalog_taxonomy_options(),
            'columns' => $columns,
            'productionDeploymentOptions' => fides_use_case_catalog_production_deployment_options(),
            'vocabularyUrl' => 'https://raw.githubusercontent.com/FIDEScommunity/fides-interop-profiles/main/data/vocabulary.json',
            'vocabularyFallbackUrl' => FIDES_USE_CASE_CATALOG_URL . 'assets/vocabulary.json',
            'ratingsApiBase' => rest_url('fides-catalog/v1'),
            'ratingsNonce' => wp_create_nonce('wp_rest'),
            'ratingsIsLoggedIn' => is_user_logged_in(),
            'ratingsLoginUrl' => $ratings_login_url,
            'updateFormUrl' => fides_use_case_catalog_update_form_url(),
            'isLoggedIn' => is_user_logged_in(),
        ),
        fides_use_case_catalog_catalog_urls()
    );

    wp_add_inline_script(
        'fides-use-case-catalog-list',
        'window.FIDES_USE_CASE_LIST_CONFIG = ' . wp_json_encode($config) . ';',
        'before'
    );

    $ssr_html = '';
    if (class_exists('Fides_Use_Case_Catalog_SSR')) {
        $ssr_html = Fides_Use_Case_Catalog_SSR::build_initial_html($atts);
    }

    return sprintf(
        '<div id="fides-use-case-catalog-root" data-columns="%s">%s</div>',
        esc_attr($columns),
        $ssr_html
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
 * Renders an editable table for one linked-catalog bucket so moderators can fix
 * refIds (deep-link / like targets), labels and URLs, remove entries, or add new
 * ones. Field names use links[<bucket>][<index>][<field>] so the save handler
 * can rebuild links_json. A couple of blank rows are appended for adding items.
 *
 * @param array<int, array<string, mixed>> $items
 */
function fides_use_case_catalog_render_admin_linked_items_editor(string $bucket, array $items, string $wallet_type = ''): string {
    $rows = array();
    foreach ($items as $item) {
        if (is_array($item)) {
            $rows[] = $item;
        }
    }
    // One blank row to start adding entries; the “Add row” button clones more.
    $rows[] = array();

    $html  = '<table class="widefat striped fides-linked-items-table" data-bucket="' . esc_attr($bucket) . '" data-wallet-type="' . esc_attr($wallet_type) . '" style="max-width:980px; margin:0 0 6px;">';
    $html .= '<thead><tr>'
        . '<th style="width:30%;">Label</th>'
        . '<th style="width:24%;">Catalog ID (refId)</th>'
        . '<th style="width:26%;">URL (for manual entries)</th>'
        . '<th style="width:12%;">Source</th>'
        . '<th style="width:8%;text-align:center;">Remove</th>'
        . '</tr></thead><tbody>';

    foreach ($rows as $index => $item) {
        $label  = isset($item['labelRaw']) ? (string) $item['labelRaw'] : '';
        $ref    = isset($item['refId']) ? (string) $item['refId'] : '';
        $url    = isset($item['url']) ? (string) $item['url'] : '';
        $source = (isset($item['source']) && $item['source'] === 'catalog') ? 'catalog' : 'manual';
        $base   = 'links[' . $bucket . '][' . (int) $index . ']';

        $html .= '<tr>';
        $html .= '<td><input type="text" style="width:100%;" name="' . esc_attr($base . '[labelRaw]') . '" value="' . esc_attr($label) . '"></td>';
        $html .= '<td><input type="text" style="width:100%;" name="' . esc_attr($base . '[refId]') . '" value="' . esc_attr($ref) . '" placeholder="catalog id"></td>';
        $html .= '<td><input type="text" style="width:100%;" name="' . esc_attr($base . '[url]') . '" value="' . esc_attr($url) . '" placeholder="https://…"></td>';
        $html .= '<td><select name="' . esc_attr($base . '[source]') . '">'
            . '<option value="catalog"' . selected($source, 'catalog', false) . '>Catalog</option>'
            . '<option value="manual"' . selected($source, 'manual', false) . '>Manual</option>'
            . '</select>';
        if ($wallet_type !== '') {
            $html .= '<input type="hidden" name="' . esc_attr($base . '[walletType]') . '" value="' . esc_attr($wallet_type) . '">';
        }
        $html .= '</td>';
        $html .= '<td style="text-align:center;"><input type="checkbox" name="' . esc_attr($base . '[remove]') . '" value="1"></td>';
        $html .= '</tr>';
    }

    $html .= '</tbody></table>';
    $html .= '<p style="margin:0 0 16px;"><button type="button" class="button button-secondary fides-add-linked-row" data-bucket="' . esc_attr($bucket) . '">+ Add row</button></p>';

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

/**
 * Editable linked-catalog buckets (includes organizations) with wallet-type
 * hints used by the admin editor.
 *
 * @return array<int, array{key:string, label:string, walletType:string}>
 */
function fides_use_case_catalog_admin_linked_editor_sections(): array {
    return array(
        array('key' => 'organizations',   'label' => 'Involved organizations', 'walletType' => ''),
        array('key' => 'personalWallets', 'label' => 'Personal wallets used',  'walletType' => 'personal'),
        array('key' => 'businessWallets', 'label' => 'Business wallets used',   'walletType' => 'organizational'),
        array('key' => 'issuers',         'label' => 'Issuers involved',        'walletType' => ''),
        array('key' => 'credentials',     'label' => 'Credential types used',   'walletType' => ''),
        array('key' => 'rps',             'label' => 'Relying parties',         'walletType' => ''),
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

    // Published use cases are owned by the git-versioned GitHub aggregate, which
    // organizations can amend via pull request. When a moderator opens a
    // published submission, detect whether the committed GitHub version differs
    // from the local DB copy. We DO NOT overwrite the form here — the form edits
    // (and Save persists) the local DB copy, which the crawler then exports to
    // GitHub. To pull an organization's PR edits the moderator uses the explicit
    // "Refresh from GitHub" button. $github_diff only drives the on-screen notice.
    $github_diff = false;
    if (is_array($selected_submission)
        && fides_use_case_catalog_normalize_status((string) $selected_submission['status']) === 'published'
    ) {
        $github_item = fides_use_case_catalog_github_item_by_id((string) $selected_submission['use_case_id']);
        if (is_array($github_item)) {
            $github_row = fides_use_case_catalog_item_to_row_data($github_item);
            foreach ($github_row as $col => $value) {
                $existing = array_key_exists($col, $selected_submission) ? $selected_submission[$col] : null;
                if ((string) $value !== (string) $existing) {
                    $github_diff = true;
                    break;
                }
            }
        }
    }

    $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY updated_at DESC LIMIT 250", ARRAY_A);
    ?>
    <div class="wrap">
        <h1>Use Case Submissions</h1>
        <p>Review submissions and move them through the publication workflow.</p>
        <p>
            <a class="button button-secondary"
               href="<?php echo esc_url(rest_url(fides_use_case_catalog_rest_namespace() . '/export')); ?>"
               download="fides-use-cases-export.json"
               target="_blank" rel="noopener">
                <?php esc_html_e('Download published export (JSON)', 'fides-use-case-catalog'); ?>
            </a>
            <span class="description" style="margin-left:.5em;">
                <?php esc_html_e('Manual backup of all published use cases, grouped per organization (same data the crawler publishes to git).', 'fides-use-case-catalog'); ?>
            </span>
        </p>
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
        <?php if (! empty($_GET['publish_merge_failed'])) : ?>
            <div class="notice notice-error is-dismissible">
                <p><?php esc_html_e('Could not publish this update proposal. The target use case must exist as a published row (import it from GitHub first if it is git-only).', 'fides-use-case-catalog'); ?></p>
            </div>
        <?php endif; ?>
        <?php if (! empty($_GET['update_merged'])) : ?>
            <div class="notice notice-success is-dismissible">
                <p><?php esc_html_e('Update proposal merged into the published use case. The proposal row was removed from this list.', 'fides-use-case-catalog'); ?></p>
            </div>
        <?php endif; ?>
        <?php if (! empty($_GET['saved'])) : ?>
            <div class="notice notice-success is-dismissible">
                <p><?php esc_html_e('Submission details saved.', 'fides-use-case-catalog'); ?></p>
            </div>
        <?php endif; ?>
        <?php if (! empty($_GET['deleted'])) : ?>
            <div class="notice notice-success is-dismissible">
                <p><?php esc_html_e('Submission permanently deleted. If it was published, it will also be removed from the live catalog after the next crawler run.', 'fides-use-case-catalog'); ?></p>
            </div>
        <?php endif; ?>
        <?php if (! empty($_GET['imported'])) : ?>
            <div class="notice notice-success is-dismissible">
                <p><?php esc_html_e('Use case imported from GitHub into the database (published). You can now edit it through the form below. Remove its git “community” file so the database becomes the single source.', 'fides-use-case-catalog'); ?></p>
            </div>
        <?php endif; ?>
        <?php if (! empty($_GET['import_exists'])) : ?>
            <div class="notice notice-warning is-dismissible">
                <p><?php esc_html_e('This use case is already in the database; nothing imported.', 'fides-use-case-catalog'); ?></p>
            </div>
        <?php endif; ?>
        <?php if (! empty($_GET['import_missing'])) : ?>
            <div class="notice notice-warning is-dismissible">
                <p><?php esc_html_e('Could not find that use case in the GitHub aggregated data.', 'fides-use-case-catalog'); ?></p>
            </div>
        <?php endif; ?>
        <?php if (! empty($_GET['github_refreshed'])) : ?>
            <div class="notice notice-success is-dismissible">
                <p><?php esc_html_e('Local copy synced with the published version on GitHub.', 'fides-use-case-catalog'); ?></p>
            </div>
        <?php endif; ?>
        <?php if (! empty($_GET['github_missing'])) : ?>
            <div class="notice notice-warning is-dismissible">
                <p><?php esc_html_e('This use case was not found in the GitHub aggregated data. It may not be published to git yet (the crawler runs daily), or its id changed.', 'fides-use-case-catalog'); ?></p>
            </div>
        <?php endif; ?>
        <?php if ($github_diff) : ?>
            <div class="notice notice-info">
                <p><?php esc_html_e('This published use case differs from the version currently on GitHub. The form below shows your local (database) copy — edits you save here become the published version after the next crawler run. Use “Refresh from GitHub” only if you want to pull an organization’s pull-request edits into the database.', 'fides-use-case-catalog'); ?></p>
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
            $selected_country = fides_use_case_catalog_normalize_country_code((string) ($selected_submission['country_code'] ?? ''));
            $selected_media = fides_use_case_catalog_media_from_row($selected_submission);
            $admin_image_urls_text = implode("\n", $selected_media['images']);
            $admin_video_urls_text = implode(
                "\n",
                array_map(
                    static function (array $video): string {
                        return (string) ($video['url'] ?? '');
                    },
                    $selected_media['videos']
                )
            );
            ?>
            <div class="postbox" style="max-width: 1200px; margin: 16px 0;">
                <div class="inside">
                    <h2 style="margin-top: 0;">Submission details</h2>
                    <p><strong>Status:</strong> <?php echo esc_html(fides_use_case_catalog_normalize_status((string) $selected_submission['status'])); ?></p>
                    <?php if (class_exists('Fides_Use_Case_Catalog_Submission_Diff')) : ?>
                        <?php Fides_Use_Case_Catalog_Submission_Diff::render_admin_section($selected_submission); ?>
                    <?php endif; ?>

                    <?php if (fides_use_case_catalog_normalize_status((string) $selected_submission['status']) === 'published') : ?>
                        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin: 0 0 12px;">
                            <input type="hidden" name="action" value="fides_use_case_refresh_github">
                            <input type="hidden" name="id" value="<?php echo esc_attr((string) $selected_submission['id']); ?>">
                            <input type="hidden" name="_wpnonce" value="<?php echo esc_attr(wp_create_nonce('fides_use_case_refresh_github_' . (int) $selected_submission['id'])); ?>">
                            <button type="submit" class="button button-secondary">
                                <?php esc_html_e('Refresh from GitHub', 'fides-use-case-catalog'); ?>
                            </button>
                            <span class="description" style="margin-left:.5em;">
                                <?php esc_html_e('Overwrite the local copy with the latest committed version from the GitHub aggregated data.', 'fides-use-case-catalog'); ?>
                            </span>
                        </form>
                    <?php endif; ?>

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
                                    <th scope="row"><label for="uc-production-deployment">Production deployment</label></th>
                                    <td>
                                        <select id="uc-production-deployment" name="production_deployment">
                                            <option value="" <?php selected((string) ($selected_submission['production_deployment'] ?? ''), ''); ?>>-</option>
                                            <?php foreach (fides_use_case_catalog_production_deployment_options() as $option_key => $option_label) : ?>
                                                <option value="<?php echo esc_attr($option_key); ?>" <?php selected(fides_use_case_catalog_normalize_production_deployment((string) ($selected_submission['production_deployment'] ?? '')), $option_key); ?>><?php echo esc_html($option_label); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                    </td>
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
                                    <th scope="row"><label for="uc-image-urls">Cover images</label></th>
                                    <td>
                                        <textarea class="large-text code" id="uc-image-urls" name="image_urls" rows="4"><?php echo esc_textarea($admin_image_urls_text); ?></textarea>
                                        <p class="description">One image URL per line. The first image is used on the catalog card; all images appear in the detail modal gallery.</p>
                                        <?php echo fides_use_case_catalog_render_admin_media_previews($selected_media['images']); ?>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="uc-video-urls">Demo videos</label></th>
                                    <td>
                                        <textarea class="large-text code" id="uc-video-urls" name="video_urls" rows="4"><?php echo esc_textarea($admin_video_urls_text); ?></textarea>
                                        <p class="description">One YouTube or Vimeo URL per line. All videos appear in the detail modal carousel.</p>
                                    </td>
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

                        <h3 style="margin: 24px 0 8px;">Linked catalog items</h3>
                        <p class="description" style="margin: 0 0 12px;">
                            <?php esc_html_e('Manage the catalog items linked to this use case. The Catalog ID (refId) must match the id in the target catalog so the deep link opens the right entry and community likes line up (e.g. the wallet id “yivi”, not “yivi-wallet”). Leave the URL empty for catalog entries; use it only for manual items that are not in a FIDES catalog. Tick Remove to delete a row; use “Add row” to link as many items as you need.', 'fides-use-case-catalog'); ?>
                        </p>
                        <?php foreach (fides_use_case_catalog_admin_linked_editor_sections() as $editor_section) : ?>
                            <?php
                            $bucket_key   = $editor_section['key'];
                            $bucket_items = isset($links[ $bucket_key ]) && is_array($links[ $bucket_key ]) ? $links[ $bucket_key ] : array();
                            ?>
                            <p style="margin: 12px 0 4px;"><strong><?php echo esc_html($editor_section['label']); ?></strong></p>
                            <?php
                            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- builder escapes each field.
                            echo fides_use_case_catalog_render_admin_linked_items_editor($bucket_key, $bucket_items, (string) $editor_section['walletType']);
                            ?>
                        <?php endforeach; ?>
                        <script>
                        (function () {
                            // Clone the last row of a linked-items bucket so moderators can link
                            // an unlimited number of items without round-tripping a save first.
                            function bumpRowIndex(name, newIndex) {
                                return name.replace(/(\[[^\]]*\]\[)(\d+)(\])/, '$1' + newIndex + '$3');
                            }
                            document.addEventListener('click', function (event) {
                                var btn = event.target && event.target.closest ? event.target.closest('.fides-add-linked-row') : null;
                                if (!btn) { return; }
                                event.preventDefault();
                                var bucket = btn.getAttribute('data-bucket');
                                var table = document.querySelector('.fides-linked-items-table[data-bucket="' + bucket + '"]');
                                if (!table) { return; }
                                var tbody = table.querySelector('tbody');
                                var rows = tbody ? tbody.querySelectorAll('tr') : [];
                                if (!rows.length) { return; }
                                var maxIndex = -1;
                                rows.forEach(function (row) {
                                    row.querySelectorAll('[name]').forEach(function (el) {
                                        var m = el.getAttribute('name').match(/\[(\d+)\]/);
                                        if (m) { maxIndex = Math.max(maxIndex, parseInt(m[1], 10)); }
                                    });
                                });
                                var newIndex = maxIndex + 1;
                                var clone = rows[rows.length - 1].cloneNode(true);
                                clone.querySelectorAll('[name]').forEach(function (el) {
                                    el.setAttribute('name', bumpRowIndex(el.getAttribute('name'), newIndex));
                                    if (el.type === 'checkbox') { el.checked = false; }
                                    else if (el.type === 'hidden') { /* keep walletType */ }
                                    else if (el.tagName === 'SELECT') { /* keep default source */ }
                                    else { el.value = ''; }
                                });
                                tbody.appendChild(clone);
                            });
                        })();
                        </script>

                        <p>
                            <button class="button button-secondary" type="submit">Save details</button>
                            <a class="button button-secondary" href="<?php echo esc_url(admin_url('tools.php?page=fides-use-case-submissions')); ?>">Cancel</a>
                            <?php
                            $detail_delete_url = admin_url('admin-post.php?action=fides_use_case_delete&id=' . (int) $selected_submission['id'] . '&_wpnonce=' . wp_create_nonce('fides_use_case_delete_' . (int) $selected_submission['id']));
                            $detail_delete_confirm = esc_js(fides_use_case_catalog_delete_confirm_message($selected_submission));
                            ?>
                            <a class="button button-link-delete" style="float:right; color:#b32d2e;" href="<?php echo esc_url($detail_delete_url); ?>" onclick="return confirm('<?php echo $detail_delete_confirm; ?>');"><?php esc_html_e('Delete permanently', 'fides-use-case-catalog'); ?></a>
                        </p>
                    </form>
                </div>
            </div>
        <?php endif; ?>
        <?php
        // Community use cases that live only in git (GitHub aggregated.json) and
        // are not yet in the local database. Importing creates a published row so
        // moderators can maintain them through the form.
        $existing_use_case_ids = array();
        foreach ((array) $rows as $existing_row) {
            $existing_use_case_ids[(string) $existing_row['use_case_id']] = true;
        }
        $importable_items = array();
        if (function_exists('fides_use_case_catalog_github_items')) {
            foreach (fides_use_case_catalog_github_items() as $gh_item) {
                if (! is_array($gh_item)) {
                    continue;
                }
                $gh_id = isset($gh_item['id']) ? (string) $gh_item['id'] : '';
                if ($gh_id === '' || isset($existing_use_case_ids[ $gh_id ])) {
                    continue;
                }
                $importable_items[] = $gh_item;
            }
        }
        ?>
        <?php if (! empty($importable_items)) : ?>
            <div class="postbox" style="max-width: 1200px; margin: 16px 0;">
                <div class="inside">
                    <h2 style="margin-top: 0;"><?php esc_html_e('Import community use cases from GitHub', 'fides-use-case-catalog'); ?></h2>
                    <p class="description">
                        <?php esc_html_e('These use cases exist only in the git-versioned GitHub data, not in this database. Import one to manage it through the form. After importing, remove its git “community” file so the database is the single source.', 'fides-use-case-catalog'); ?>
                    </p>
                    <table class="widefat striped">
                        <thead>
                            <tr>
                                <th><?php esc_html_e('Title', 'fides-use-case-catalog'); ?></th>
                                <th><?php esc_html_e('Organization', 'fides-use-case-catalog'); ?></th>
                                <th><?php esc_html_e('ID', 'fides-use-case-catalog'); ?></th>
                                <th><?php esc_html_e('Actions', 'fides-use-case-catalog'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($importable_items as $gh_item) : ?>
                                <tr>
                                    <td><strong><?php echo esc_html((string) ($gh_item['title'] ?? '')); ?></strong></td>
                                    <td><?php echo esc_html((string) ($gh_item['organizationName'] ?? '')); ?></td>
                                    <td><code><?php echo esc_html((string) ($gh_item['id'] ?? '')); ?></code></td>
                                    <td>
                                        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin:0;">
                                            <input type="hidden" name="action" value="fides_use_case_import_github">
                                            <input type="hidden" name="use_case_id" value="<?php echo esc_attr((string) ($gh_item['id'] ?? '')); ?>">
                                            <input type="hidden" name="_wpnonce" value="<?php echo esc_attr(wp_create_nonce('fides_use_case_import_github_' . md5((string) ($gh_item['id'] ?? '')))); ?>">
                                            <button type="submit" class="button button-small button-primary"><?php esc_html_e('Import', 'fides-use-case-catalog'); ?></button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
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
                            <td><strong><?php echo esc_html($row['title']); ?></strong><br><code><?php echo esc_html($row['use_case_id']); ?></code>
                                <?php if (fides_use_case_catalog_normalize_submission_action((string) ($row['submission_action'] ?? '')) === 'update') : ?>
                                    <br><span class="description"><?php
                                    printf(
                                        /* translators: %s: canonical published use case id */
                                        esc_html__('Update proposal for %s', 'fides-use-case-catalog'),
                                        esc_html((string) ($row['target_use_case_id'] ?? ''))
                                    );
                                    ?></span>
                                <?php endif; ?>
                            </td>
                            <td><?php echo esc_html(fides_use_case_catalog_sector_label(fides_use_case_catalog_row_sector($row)) ?: '—'); ?></td>
                            <td><?php echo esc_html($row['organization_name']); ?></td>
                            <td><?php echo esc_html(fides_use_case_catalog_normalize_status((string) $row['status'])); ?></td>
                            <td><?php echo esc_html(get_date_from_gmt((string) $row['updated_at'], 'Y-m-d H:i')); ?></td>
                            <td>
                                <?php
                                $base = admin_url('admin-post.php?action=fides_use_case_set_status&id=' . (int) $row['id']);
                                $nonce = wp_create_nonce('fides_use_case_set_status_' . (int) $row['id']);
                                $view_url = admin_url('tools.php?page=fides-use-case-submissions&submission=' . (int) $row['id']);
                                $delete_url = admin_url('admin-post.php?action=fides_use_case_delete&id=' . (int) $row['id'] . '&_wpnonce=' . wp_create_nonce('fides_use_case_delete_' . (int) $row['id']));
                                $delete_confirm = esc_js(fides_use_case_catalog_delete_confirm_message($row));
                                ?>
                                <a class="button button-small" href="<?php echo esc_url($view_url); ?>">View</a>
                                <a class="button button-small" href="<?php echo esc_url($base . '&status=approved&_wpnonce=' . $nonce); ?>">Approve</a>
                                <a class="button button-small button-primary" href="<?php echo esc_url($base . '&status=published&_wpnonce=' . $nonce); ?>">Publish</a>
                                <a class="button button-small button-link-delete" style="color:#b32d2e;" href="<?php echo esc_url($delete_url); ?>" onclick="return confirm('<?php echo $delete_confirm; ?>');">Delete</a>
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

    $previous_status = (string) $wpdb->get_var(
        $wpdb->prepare("SELECT status FROM {$table} WHERE id = %d", $id)
    );

    $proposal_row = $wpdb->get_row(
        $wpdb->prepare("SELECT * FROM {$table} WHERE id = %d", $id),
        ARRAY_A
    );
    if (! is_array($proposal_row)) {
        wp_safe_redirect(admin_url('tools.php?page=fides-use-case-submissions'));
        exit;
    }

    if (
        $status === 'published'
        && fides_use_case_catalog_normalize_submission_action((string) ($proposal_row['submission_action'] ?? '')) === 'update'
    ) {
        $sector = fides_use_case_catalog_row_sector($proposal_row);
        if ($sector === 'other') {
            wp_safe_redirect(
                admin_url('tools.php?page=fides-use-case-submissions&submission=' . $id . '&sector_pending=1')
            );
            exit;
        }
        $country_code = fides_use_case_catalog_normalize_country_code((string) ($proposal_row['country_code'] ?? ''));
        if ($country_code === '') {
            $target_id = fides_use_case_catalog_sanitize_use_case_id(
                (string) ($proposal_row['target_use_case_id'] ?? '')
            );
            $target_row = $target_id !== '' ? fides_use_case_catalog_published_row_by_use_case_id($target_id) : null;
            if (is_array($target_row)) {
                $country_code = fides_use_case_catalog_normalize_country_code(
                    (string) ($target_row['country_code'] ?? '')
                );
            }
        }
        if ($country_code === '') {
            wp_safe_redirect(
                admin_url('tools.php?page=fides-use-case-submissions&submission=' . $id . '&country_pending=1')
            );
            exit;
        }

        if (! fides_use_case_catalog_publish_update_proposal($id, $proposal_row)) {
            wp_safe_redirect(
                add_query_arg('publish_merge_failed', '1', admin_url('tools.php?page=fides-use-case-submissions'))
            );
            exit;
        }

        fides_use_case_catalog_trigger_github_sync();
        wp_safe_redirect(add_query_arg('update_merged', '1', admin_url('tools.php?page=fides-use-case-submissions')));
        exit;
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

    if ($status === 'published' && $previous_status !== 'published') {
        fides_use_case_catalog_notify_published($id);
    }

    if ($status === 'published' || fides_use_case_catalog_normalize_status($previous_status) === 'published') {
        fides_use_case_catalog_trigger_github_sync();
    }

    wp_safe_redirect(admin_url('tools.php?page=fides-use-case-submissions'));
    exit;
}

/**
 * Permanently delete a submission row from the database.
 *
 * Note: deleting a published row removes it from the /export endpoint, after
 * which the crawler prunes its (source="wordpress") git file on the next run,
 * so it disappears from the live catalog too. Community-authored use cases
 * (git-only, source="community") are not stored in this table and cannot be
 * deleted here — remove their JSON file via pull request instead.
 */
function fides_use_case_catalog_handle_delete_action(): void {
    if (! current_user_can('manage_options')) {
        wp_die('Insufficient permissions.');
    }

    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;

    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($id <= 0) {
        wp_safe_redirect(admin_url('tools.php?page=fides-use-case-submissions'));
        exit;
    }

    $nonce = isset($_GET['_wpnonce']) ? sanitize_text_field((string) $_GET['_wpnonce']) : '';
    if (! wp_verify_nonce($nonce, 'fides_use_case_delete_' . $id)) {
        wp_die('Invalid nonce.');
    }

    $previous_status = (string) $wpdb->get_var(
        $wpdb->prepare("SELECT status FROM {$table} WHERE id = %d", $id)
    );
    $was_published = fides_use_case_catalog_normalize_status($previous_status) === 'published';

    $wpdb->delete($table, array('id' => $id), array('%d'));

    if ($was_published) {
        fides_use_case_catalog_trigger_github_sync();
    }

    wp_safe_redirect(add_query_arg('deleted', '1', admin_url('tools.php?page=fides-use-case-submissions')));
    exit;
}

/**
 * Import a community (git-only) use case from the GitHub aggregated data into
 * the local submissions table as a published row, so moderators can maintain it
 * through the admin form. After importing, the git "community" file should be
 * removed so the database becomes the single source (the crawler re-exports the
 * row as a source="wordpress" file). Avoids the duplicate-source pitfall.
 */
function fides_use_case_catalog_handle_import_github_action(): void {
    if (! current_user_can('manage_options')) {
        wp_die('Insufficient permissions.');
    }

    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    $redirect = admin_url('tools.php?page=fides-use-case-submissions');

    $use_case_id = isset($_POST['use_case_id']) ? sanitize_text_field((string) wp_unslash($_POST['use_case_id'])) : '';
    $nonce = isset($_POST['_wpnonce']) ? sanitize_text_field((string) $_POST['_wpnonce']) : '';
    if ($use_case_id === '' || ! wp_verify_nonce($nonce, 'fides_use_case_import_github_' . md5($use_case_id))) {
        wp_die('Invalid request.');
    }

    $existing = (int) $wpdb->get_var(
        $wpdb->prepare("SELECT id FROM {$table} WHERE use_case_id = %s LIMIT 1", $use_case_id)
    );
    if ($existing > 0) {
        wp_safe_redirect(add_query_arg(array('submission' => $existing, 'import_exists' => '1'), $redirect));
        exit;
    }

    $target_row = fides_use_case_catalog_import_github_item_as_published($use_case_id);
    if (! is_array($target_row)) {
        wp_safe_redirect(add_query_arg('import_missing', '1', $redirect));
        exit;
    }

    wp_safe_redirect(add_query_arg(array('submission' => (int) $target_row['id'], 'imported' => '1'), $redirect));
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

    $title = sanitize_text_field((string) wp_unslash($_POST['title'] ?? ''));
    $summary = trim(wp_kses_post((string) wp_unslash($_POST['summary'] ?? '')));
    $sector = fides_use_case_catalog_normalize_sector(wp_unslash($_POST['sector'] ?? ($_POST['sectors'] ?? '')));
    $taxonomy = fides_use_case_catalog_normalize_taxonomy_payload(
        array(
            'interactionModes' => $_POST['interaction_modes'] ?? array(),
            'vcFormats' => $_POST['vc_formats'] ?? array(),
            'issuanceProtocols' => $_POST['issuance_protocols'] ?? array(),
            'presentationProtocols' => $_POST['presentation_protocols'] ?? array(),
            'interopProfiles' => $_POST['interop_profiles'] ?? array(),
        )
    );
    $organization_name = sanitize_text_field((string) wp_unslash($_POST['organization_name'] ?? ''));
    $country_code      = fides_use_case_catalog_sanitize_country_code((string) wp_unslash($_POST['country_code'] ?? ''));
    $contact_email     = sanitize_email((string) wp_unslash($_POST['contact_email'] ?? ''));
    $production_deployment = fides_use_case_catalog_normalize_production_deployment(sanitize_text_field((string) wp_unslash($_POST['production_deployment'] ?? '')));
    $image_urls_text = isset($_POST['image_urls']) ? (string) wp_unslash($_POST['image_urls']) : '';
    $video_urls_text = isset($_POST['video_urls']) ? (string) wp_unslash($_POST['video_urls']) : '';
    $more_info_url = esc_url_raw((string) wp_unslash($_POST['more_info_url'] ?? ''));
    $user_journey = trim(wp_kses_post((string) wp_unslash($_POST['user_journey'] ?? '')));
    $tags_raw = sanitize_text_field((string) wp_unslash($_POST['tags'] ?? ''));

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

    $media_payload = array(
        'imageUrls' => fides_use_case_catalog_parse_url_lines($image_urls_text),
        'videoUrls' => fides_use_case_catalog_parse_url_lines($video_urls_text),
    );
    $video_validation_error = fides_use_case_catalog_validate_media_video_urls($media_payload);
    if ($video_validation_error !== null) {
        wp_die(esc_html($video_validation_error));
    }

    $media = fides_use_case_catalog_normalize_media_payload($media_payload);
    $media_storage = fides_use_case_catalog_media_storage_fields($media);

    $tags = array();
    foreach (explode(',', $tags_raw) as $tag) {
        $tag = sanitize_text_field(trim($tag));
        if ($tag !== '') {
            $tags[] = $tag;
        }
    }

    $update_data = array(
        'event_key' => '',
        'theme_key' => '',
        'sectors_json' => wp_json_encode(array($sector)),
        'taxonomy_json' => wp_json_encode($taxonomy),
        'title' => $title,
        'summary' => $summary,
        'organization_name' => $organization_name,
        'country_code'      => $country_code,
        'contact_email'     => $contact_email,
        'production_deployment' => $production_deployment,
        'video_url' => $media_storage['video_url'] !== '' ? $media_storage['video_url'] : null,
        'video_provider' => $media_storage['video_provider'] !== '' ? $media_storage['video_provider'] : null,
        'image_url' => $media_storage['image_url'] !== '' ? $media_storage['image_url'] : null,
        'media_json' => $media_storage['media_json'] !== '' ? $media_storage['media_json'] : null,
        'more_info_url' => $more_info_url !== '' ? $more_info_url : null,
        'user_journey' => $user_journey !== '' ? $user_journey : null,
        'tags_json' => wp_json_encode($tags),
        'updated_at' => current_time('mysql', true),
    );

    // Only rebuild links_json when the editable linked-items fields were posted,
    // so other save paths can never accidentally wipe existing links.
    if (isset($_POST['links']) && is_array($_POST['links'])) {
        $update_data['links_json'] = wp_json_encode(
            fides_use_case_catalog_links_from_admin_post(wp_unslash($_POST['links']))
        );
    }

    $wpdb->update($table, $update_data, array('id' => $id));

    $current_status = (string) $wpdb->get_var(
        $wpdb->prepare("SELECT status FROM {$table} WHERE id = %d", $id)
    );
    if (fides_use_case_catalog_normalize_status($current_status) === 'published') {
        fides_use_case_catalog_trigger_github_sync();
    }

    wp_safe_redirect(
        add_query_arg(
            array('saved' => '1', 'submission' => $id),
            admin_url('tools.php?page=fides-use-case-submissions')
        )
    );
    exit;
}

/**
 * Pull the latest committed version of a published use case from the GitHub
 * aggregated.json and overwrite the local DB content columns with it.
 *
 * Lets a moderator reconcile the local moderation copy with edits an
 * organization made through a pull request. Identity/lifecycle columns are
 * preserved; only content is synced.
 */
function fides_use_case_catalog_handle_refresh_github_action(): void {
    if (! current_user_can('manage_options')) {
        wp_die('Insufficient permissions.');
    }

    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;

    $id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
    $nonce = isset($_POST['_wpnonce']) ? sanitize_text_field((string) $_POST['_wpnonce']) : '';
    if ($id <= 0 || ! wp_verify_nonce($nonce, 'fides_use_case_refresh_github_' . $id)) {
        wp_die('Invalid request.');
    }

    $use_case_id = (string) $wpdb->get_var(
        $wpdb->prepare("SELECT use_case_id FROM {$table} WHERE id = %d", $id)
    );

    $redirect = admin_url('tools.php?page=fides-use-case-submissions&submission=' . $id);

    $item = $use_case_id !== '' ? fides_use_case_catalog_github_item_by_id($use_case_id, true) : null;
    if (! is_array($item)) {
        wp_safe_redirect(add_query_arg('github_missing', '1', $redirect));
        exit;
    }

    $data = fides_use_case_catalog_item_to_row_data($item);
    $data['updated_at'] = current_time('mysql', true);
    $wpdb->update($table, $data, array('id' => $id));

    wp_safe_redirect(add_query_arg('github_refreshed', '1', $redirect));
    exit;
}

