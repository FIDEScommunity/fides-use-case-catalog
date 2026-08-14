<?php
/**
 * Homepage discovery shortcode for published FIDES use cases.
 */

if (! defined('ABSPATH')) {
    exit;
}

final class Fides_Use_Case_Discovery_Shortcode {
    private const CONFIG_FILE = 'data/use-case-theme-map.json';

    public static function bootstrap(): void {
        add_shortcode('fides_use_case_discovery', array(__CLASS__, 'render'));
    }

    /**
     * Theme configuration shared by the homepage and catalog deeplinks.
     *
     * @return array{bundles: array<int, array<string, mixed>>, assignments: array<string, array<int, string>>}
     */
    public static function theme_config(): array {
        static $config = null;
        if (is_array($config)) {
            return $config;
        }

        $path = FIDES_USE_CASE_CATALOG_PATH . self::CONFIG_FILE;
        $json = is_readable($path) ? file_get_contents($path) : false;
        $data = is_string($json) ? json_decode($json, true) : null;
        $config = array(
            'bundles'     => array(),
            'assignments' => array(),
        );

        if (! is_array($data)) {
            return $config;
        }

        if (isset($data['bundles']) && is_array($data['bundles'])) {
            foreach ($data['bundles'] as $bundle) {
                if (! is_array($bundle)) {
                    continue;
                }
                $code = sanitize_key((string) ($bundle['code'] ?? ''));
                $theme_codes = array_values(
                    array_filter(
                        array_map('sanitize_key', is_array($bundle['themeCodes'] ?? null) ? $bundle['themeCodes'] : array())
                    )
                );
                if ($code === '' || $theme_codes === array()) {
                    continue;
                }
                $config['bundles'][] = array(
                    'code'        => $code,
                    'title'       => sanitize_text_field((string) ($bundle['title'] ?? $code)),
                    'description' => sanitize_text_field((string) ($bundle['description'] ?? '')),
                    'icon'        => sanitize_key((string) ($bundle['icon'] ?? 'identity')),
                    'themeCodes'  => $theme_codes,
                );
            }
        }

        if (isset($data['assignments']) && is_array($data['assignments'])) {
            foreach ($data['assignments'] as $id => $theme_codes) {
                $id = sanitize_text_field((string) $id);
                if ($id === '' || ! is_array($theme_codes)) {
                    continue;
                }
                $config['assignments'][ $id ] = array_values(
                    array_filter(array_map('sanitize_key', $theme_codes))
                );
            }
        }

        return $config;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function published_items(): array {
        $items = function_exists('fides_use_case_catalog_github_items')
            ? fides_use_case_catalog_github_items()
            : array();
        if ($items !== array()) {
            return $items;
        }

        $fallback_path = FIDES_USE_CASE_CATALOG_PATH . 'data/aggregated.json';
        $fallback_json = is_readable($fallback_path) ? file_get_contents($fallback_path) : false;
        $fallback = is_string($fallback_json) ? json_decode($fallback_json, true) : null;
        return is_array($fallback) && isset($fallback['useCases']) && is_array($fallback['useCases'])
            ? $fallback['useCases']
            : array();
    }

    /**
     * Prefer reviewer-managed themes embedded in the catalog item. The sidecar
     * remains a temporary fallback for records that have not been republished.
     *
     * @param array<string, mixed> $item
     * @param array<string, array<int, string>> $assignments
     * @return array<int, string>
     */
    private static function item_theme_codes(array $item, array $assignments): array {
        $themes = function_exists('fides_use_case_catalog_normalize_themes')
            ? fides_use_case_catalog_normalize_themes($item['themes'] ?? array())
            : array_values(array_filter(array_map('sanitize_key', is_array($item['themes'] ?? null) ? $item['themes'] : array())));
        if ($themes !== array()) {
            return $themes;
        }
        $id = (string) ($item['id'] ?? '');
        return isset($assignments[ $id ]) ? $assignments[ $id ] : array();
    }

    /**
     * @param array<int, array<string, mixed>> $items
     * @return array{total: int, countries: int, organizations: int, production: int}
     */
    private static function metrics(array $items): array {
        $countries = array();
        $organizations = array();
        $production = 0;

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            $country = strtoupper(trim((string) ($item['country'] ?? '')));
            if ($country !== '') {
                $countries[ $country ] = true;
            }
            $organization = trim((string) ($item['organizationName'] ?? ''));
            if ($organization !== '') {
                $organizations[ strtolower($organization) ] = true;
            }
            if (strtolower(trim((string) ($item['productionDeployment'] ?? ''))) === 'yes') {
                $production++;
            }
        }

        return array(
            'total'         => count($items),
            'countries'     => count($countries),
            'organizations' => count($organizations),
            'production'    => $production,
        );
    }

    /**
     * @param array<int, array<string, mixed>> $items
     * @param array<int, string>               $theme_codes
     * @param array<string, array<int, string>> $assignments
     */
    private static function bundle_count(array $items, array $theme_codes, array $assignments): int {
        $count = 0;
        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            if (array_intersect($theme_codes, self::item_theme_codes($item, $assignments)) !== array()) {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Log coverage problems without breaking the public homepage.
     *
     * @param array<int, array<string, mixed>> $items
     * @param array<string, array<int, string>> $assignments
     */
    private static function validate_coverage(array $items, array $assignments): void {
        if (! defined('WP_DEBUG') || ! WP_DEBUG) {
            return;
        }
        $published_ids = array();
        $missing = array();
        foreach ($items as $item) {
            $id = is_array($item) ? trim((string) ($item['id'] ?? '')) : '';
            if ($id !== '') {
                $published_ids[ $id ] = true;
                if (self::item_theme_codes($item, $assignments) === array()) {
                    $missing[ $id ] = true;
                }
            }
        }
        $stale = array_diff_key($assignments, $published_ids);
        if ($missing !== array() || $stale !== array()) {
            error_log(
                sprintf(
                    'FIDES use-case theme mapping coverage: %d missing published IDs, %d stale IDs.',
                    count($missing),
                    count($stale)
                )
            );
        }
    }

    private static function icon(string $key): string {
        $icons = array(
            'identity'       => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><circle cx="12" cy="9" r="2.5"/><path d="M8.5 16c.8-2 2-3 3.5-3s2.7 1 3.5 3"/></svg>',
            'business'       => '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg>',
            'payments'       => '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>',
            'qualifications' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11.5V16c3 2.5 9 2.5 12 0v-4.5M22 9v6"/></svg>',
            'products'       => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 7 9 5 9-5v10l-9 5-9-5V7Z"/><path d="M12 12v10"/></svg>',
            'government'     => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 9 9-5 9 5H3ZM5 9v8M9 9v8M15 9v8M19 9v8M3 17h18M2 21h20"/></svg>',
            'organization'   => '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M8 10h.01M8 14h.01M16 14h.01"/></svg>',
            'issuer'         => '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
            'credential'     => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>',
            'wallet'         => '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="13" r="1"/></svg>',
            'business_wallet' => '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M4 8h16M4 13h16M4 18h16M10 22v-4h4v4"/></svg>',
            'rp'             => '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2Z"/></svg>',
            'usecase'        => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12.83 2.18-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83l-8.59-3.91Z"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65M22 17.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/></svg>',
        );
        return $icons[ $key ] ?? $icons['identity'];
    }

    /**
     * @param array<string, mixed> $atts
     */
    public static function render(array $atts = array()): string {
        $atts = shortcode_atts(
            array(
                'catalog_url'      => '',
                'surface'          => '0',
                'show_connection'  => '1',
            ),
            $atts,
            'fides_use_case_discovery'
        );

        wp_enqueue_style('fides-use-case-discovery');
        wp_enqueue_script('fides-use-case-discovery');

        $items = self::published_items();
        $config = self::theme_config();
        $bundles = $config['bundles'];
        $assignments = $config['assignments'];
        self::validate_coverage($items, $assignments);

        $catalog_url = trim((string) $atts['catalog_url']);
        if ($catalog_url === '') {
            $path = apply_filters('fides_use_case_catalog_path', '/ecosystem-explorer/use-cases/');
            $catalog_url = home_url((string) $path);
        }
        $catalog_urls = function_exists('fides_use_case_catalog_catalog_urls')
            ? fides_use_case_catalog_catalog_urls()
            : array();

        $metrics = self::metrics($items);
        $surface = in_array(strtolower((string) $atts['surface']), array('1', 'true', 'yes', 'on'), true);
        $show_connection = ! in_array(strtolower((string) $atts['show_connection']), array('0', 'false', 'no', 'off'), true);
        $root_class = 'fides-uc-discovery' . ($surface ? ' fides-uc-discovery--surface' : '');

        ob_start();
        ?>
        <section class="<?php echo esc_attr($root_class); ?>" aria-labelledby="fides-uc-discovery-themes-title">
            <div class="fides-uc-discovery__overview">
                <div class="fides-uc-discovery__kpi-overview">
                    <h3 class="fides-uc-discovery__kpis-title"><?php esc_html_e('At a glance', 'fides-use-case-catalog'); ?></h3>
                    <div class="fides-uc-discovery__kpis" aria-label="<?php esc_attr_e('Use case catalog statistics', 'fides-use-case-catalog'); ?>">
                        <div class="fides-uc-discovery__kpi"><strong class="fides-ct-count" data-count="<?php echo esc_attr((string) $metrics['total']); ?>"><?php echo esc_html((string) $metrics['total']); ?></strong><span><?php esc_html_e('Use Cases', 'fides-use-case-catalog'); ?></span></div>
                        <div class="fides-uc-discovery__kpi"><strong class="fides-ct-count" data-count="<?php echo esc_attr((string) $metrics['countries']); ?>"><?php echo esc_html((string) $metrics['countries']); ?></strong><span><?php esc_html_e('Countries', 'fides-use-case-catalog'); ?></span></div>
                        <div class="fides-uc-discovery__kpi"><strong class="fides-ct-count" data-count="<?php echo esc_attr((string) $metrics['organizations']); ?>"><?php echo esc_html((string) $metrics['organizations']); ?></strong><span><?php esc_html_e('Organisations', 'fides-use-case-catalog'); ?></span></div>
                        <div class="fides-uc-discovery__kpi">
                            <strong class="fides-ct-count" data-count="<?php echo esc_attr((string) $metrics['production']); ?>"><?php echo esc_html((string) $metrics['production']); ?></strong>
                            <span><span class="fides-uc-discovery__production-prefix"><?php esc_html_e('In', 'fides-use-case-catalog'); ?> </span><?php esc_html_e('Production', 'fides-use-case-catalog'); ?></span>
                        </div>
                    </div>
                </div>

                <div class="fides-uc-discovery__theme-overview">
                    <h3 id="fides-uc-discovery-themes-title" class="fides-uc-discovery__themes-title"><?php esc_html_e('Explore by theme', 'fides-use-case-catalog'); ?></h3>
                    <div class="fides-uc-discovery__themes">
                        <?php foreach ($bundles as $bundle) : ?>
                            <?php
                            $count = self::bundle_count($items, $bundle['themeCodes'], $assignments);
                            $url = add_query_arg('theme', $bundle['code'], $catalog_url);
                            ?>
                            <a class="fides-uc-discovery__theme" href="<?php echo esc_url($url); ?>"
                               data-matomo-category="Use Case Discovery" data-matomo-action="Open theme"
                               data-matomo-name="<?php echo esc_attr($bundle['title']); ?>">
                                <span class="fides-uc-discovery__theme-icon"><?php echo self::icon($bundle['icon']); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG allowlist. ?></span>
                                <span class="fides-uc-discovery__theme-copy">
                                    <strong><?php echo esc_html($bundle['title']); ?></strong>
                                    <span><?php echo esc_html($bundle['description']); ?></span>
                                    <span class="fides-uc-discovery__theme-count">
                                        <?php
                                        printf(
                                            esc_html(_n('%s use case', '%s use cases', $count, 'fides-use-case-catalog')),
                                            esc_html(number_format_i18n($count))
                                        );
                                        ?>
                                        <span aria-hidden="true">→</span>
                                    </span>
                                </span>
                            </a>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>

            <?php if ($show_connection) : ?>
                <div class="fides-uc-discovery__connection">
                    <div class="fides-uc-discovery__connection-copy">
                        <h3><?php esc_html_e('How use cases connect the ecosystem', 'fides-use-case-catalog'); ?></h3>
                        <p><?php esc_html_e('Organizations fulfil one or more ecosystem roles. Use cases show how these roles and components work together.', 'fides-use-case-catalog'); ?></p>
                        <a class="fides-uc-discovery__ecosystem-link"
                           href="<?php echo esc_url(home_url('/ecosystem-explorer/')); ?>">
                            <?php esc_html_e('Explore the full Ecosystem Explorer', 'fides-use-case-catalog'); ?>
                            <span aria-hidden="true">→</span>
                        </a>
                    </div>
                    <div class="fides-uc-discovery__ecosystem">
                        <span class="fides-uc-discovery__layer-label">
                            <?php echo self::icon('usecase'); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG allowlist. ?>
                            <span><?php esc_html_e('Real-world Use Case', 'fides-use-case-catalog'); ?></span>
                        </span>
                        <ol class="fides-uc-discovery__components" aria-label="<?php esc_attr_e('Related FIDES catalogs', 'fides-use-case-catalog'); ?>">
                        <?php
                        $components = array(
                            array('organization', __('Organisations', 'fides-use-case-catalog'), $catalog_urls['organizationCatalogUrl'] ?? ''),
                            array('issuer', __('Issuers', 'fides-use-case-catalog'), $catalog_urls['issuerCatalogUrl'] ?? ''),
                            array('credential', __('Credentials', 'fides-use-case-catalog'), $catalog_urls['credentialCatalogUrl'] ?? ''),
                            array('rp', __('Relying Parties', 'fides-use-case-catalog'), $catalog_urls['rpCatalogUrl'] ?? ''),
                        );
                        foreach (array_slice($components, 0, 3) as $component_index => $component) :
                            list($icon, $label, $url) = $component;
                            ?>
                            <li>
                                <a href="<?php echo esc_url($url); ?>">
                                    <span class="fides-uc-discovery__flow-icon"><?php echo self::icon($icon); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG allowlist. ?></span>
                                    <span><?php echo esc_html($label); ?></span>
                                </a>
                            </li>
                            <li class="fides-uc-discovery__flow-arrow<?php echo $component_index === 0 ? ' is-separator' : ''; ?>" aria-hidden="true">
                                <?php echo $component_index === 0 ? '│' : '→'; ?>
                            </li>
                        <?php endforeach; ?>
                            <li class="is-wallet-group">
                                <span class="fides-uc-discovery__wallet-links">
                                    <a href="<?php echo esc_url($catalog_urls['personalWalletCatalogUrl'] ?? ''); ?>">
                                        <span class="fides-uc-discovery__flow-icon"><?php echo self::icon('wallet'); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG allowlist. ?></span>
                                        <span><?php esc_html_e('Personal Wallets', 'fides-use-case-catalog'); ?></span>
                                    </a>
                                    <span class="fides-uc-discovery__wallet-separator" aria-hidden="true">&amp;</span>
                                    <a href="<?php echo esc_url($catalog_urls['businessWalletCatalogUrl'] ?? ''); ?>">
                                        <span class="fides-uc-discovery__flow-icon"><?php echo self::icon('business_wallet'); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG allowlist. ?></span>
                                        <span><?php esc_html_e('Business Wallets', 'fides-use-case-catalog'); ?></span>
                                    </a>
                                </span>
                            </li>
                            <li class="fides-uc-discovery__flow-arrow" aria-hidden="true">→</li>
                        <?php
                        $component = $components[3];
                        list($icon, $label, $url) = $component;
                        ?>
                            <li>
                                <a href="<?php echo esc_url($url); ?>">
                                    <span class="fides-uc-discovery__flow-icon"><?php echo self::icon($icon); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG allowlist. ?></span>
                                    <span><?php echo esc_html($label); ?></span>
                                </a>
                            </li>
                        </ol>
                    </div>
                </div>
            <?php endif; ?>
        </section>
        <?php
        return (string) ob_get_clean();
    }
}
