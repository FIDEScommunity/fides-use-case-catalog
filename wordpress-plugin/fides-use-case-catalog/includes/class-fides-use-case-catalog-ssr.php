<?php
/**
 * Use Case Catalog SSR — use-case-specific implementation of the shared
 * Fides_Catalog_SSR_Renderer base class shipped by fides-community-tools-tiles.
 *
 * Catalog-specific responsibilities living here:
 *   - Register the 'usecase' catalog type in Fides_Catalog_Registry (delegates
 *     to the canonical fides_use_case_catalog_register_with_core()).
 *   - Provide the dl meta rows (sector, country, production deployment, more
 *     info, last updated) and the "how it works" / taxonomy / linked-item
 *     sections for the SSR detail block.
 *   - Enrich the CreativeWork JSON-LD with use-case-specific properties
 *     (about, keywords, image, author organisation, dates, video).
 *
 * Everything stays gated on fides_catalog_ssr_enabled(); flipping the master
 * switch off in /wp-admin/options-general.php?page=fides-catalog-seo instantly
 * returns the plugin to legacy JS-only behaviour.
 *
 * @package fides-use-case-catalog
 */

if (! defined('ABSPATH')) {
    exit;
}

if (! class_exists('Fides_Use_Case_Catalog_SSR')) {

    /**
     * If the shared base class isn't loaded (e.g. tiles plugin disabled),
     * this class becomes a no-op shim with the same public surface so the
     * main plugin file keeps working without conditional checks.
     */
    if (! class_exists('Fides_Catalog_SSR_Renderer')) {

        class Fides_Use_Case_Catalog_SSR {
            const TYPE = 'usecase';
            public static function bootstrap() { /* no-op without base */ }
            public static function build_initial_html(array $atts) { return ''; }
        }

    } else {

        class Fides_Use_Case_Catalog_SSR extends Fides_Catalog_SSR_Renderer {

            const TYPE = 'usecase';
            const MAX_LISTING_ITEMS = 30;

            /** @var self|null */
            private static $instance = null;

            /* --------------------------------------------------------------
             * Static facade for the main plugin file.
             * -------------------------------------------------------------- */

            public static function bootstrap(): void {
                if (self::$instance === null) {
                    self::$instance = new self();
                    self::$instance->bootstrap_renderer();
                }
            }

            public static function build_initial_html(array $atts): string {
                self::bootstrap();
                return self::$instance->render_initial_html($atts);
            }

            /* --------------------------------------------------------------
             * Required overrides
             * -------------------------------------------------------------- */

            protected function type(): string              { return self::TYPE; }
            protected function text_domain(): string       { return 'fides-use-case-catalog'; }
            protected function shortcode_root_id(): string { return 'fides-use-case-catalog-root'; }
            protected function loading_label(): string     { return __('Loading use case catalog…', 'fides-use-case-catalog'); }
            protected function max_listing_items(): int    { return self::MAX_LISTING_ITEMS; }

            public function register_with_core(): void {
                // The canonical registration lives in the main plugin file so
                // the catalog still registers when SSR is unavailable. Re-using
                // it here keeps a single source of truth for the registry array.
                if (function_exists('fides_use_case_catalog_register_with_core')) {
                    fides_use_case_catalog_register_with_core();
                }
            }

            /* --------------------------------------------------------------
             * Listing page detection / naming
             * -------------------------------------------------------------- */

            private static function listing_path(): string {
                return (string) apply_filters('fides_use_case_catalog_path', '/use-cases/');
            }

            protected function listing_page_name(string $page_slug): string {
                return __('Use Case Catalog', 'fides-use-case-catalog');
            }

            protected function listing_page_url(string $page_slug): string {
                return home_url(self::listing_path());
            }

            /* --------------------------------------------------------------
             * Detail header: use cases store the organisation as a plain
             * string (`organizationName`), not a nested provider array.
             * -------------------------------------------------------------- */

            protected function item_provider(array $item): array {
                $name = isset($item['organizationName']) ? trim((string) $item['organizationName']) : '';
                return $name !== '' ? array('name' => $name) : array();
            }

            /* --------------------------------------------------------------
             * Detail meta rows
             * -------------------------------------------------------------- */

            protected function detail_meta_rows(array $item): array {
                $rows = array();
                $td   = 'fides-use-case-catalog';

                $sector_label = $this->sector_label(isset($item['sector']) ? (string) $item['sector'] : '');
                if ($sector_label !== '') {
                    $rows[] = array(
                        'label' => __('Sector', $td),
                        'html'  => esc_html($sector_label),
                    );
                }

                $country_label = $this->country_label(isset($item['country']) ? (string) $item['country'] : '');
                if ($country_label !== '') {
                    $rows[] = array(
                        'label' => __('Country', $td),
                        'html'  => esc_html($country_label),
                    );
                }

                $deployment = isset($item['productionDeployment']) ? (string) $item['productionDeployment'] : '';
                if ($deployment === 'yes' || $deployment === 'no') {
                    $rows[] = array(
                        'label' => __('Production deployment', $td),
                        'html'  => $deployment === 'yes'
                            ? esc_html__('Yes', $td)
                            : esc_html__('No', $td),
                    );
                }

                $more_info = isset($item['moreInfoUrl']) ? trim((string) $item['moreInfoUrl']) : '';
                if ($more_info !== '') {
                    $rows[] = array(
                        'label' => __('More information', $td),
                        'html'  => sprintf(
                            '<a href="%1$s" rel="nofollow noopener" target="_blank">%2$s</a>',
                            esc_url($more_info),
                            esc_html($more_info)
                        ),
                    );
                }

                $updated_at = isset($item['updatedAt']) ? (string) $item['updatedAt'] : '';
                if ($updated_at !== '') {
                    $ts = strtotime($updated_at);
                    if ($ts) {
                        $rows[] = array(
                            'label' => __('Last updated', $td),
                            'html'  => sprintf(
                                '<time datetime="%1$s">%1$s</time>',
                                esc_attr(gmdate('Y-m-d', $ts))
                            ),
                        );
                    }
                }

                return $rows;
            }

            /* --------------------------------------------------------------
             * Detail extra sections: how it works + taxonomy + linked items
             * -------------------------------------------------------------- */

            protected function detail_extra_sections(array $item): string {
                $td = 'fides-use-case-catalog';
                ob_start();

                $user_journey = isset($item['userJourney']) ? trim((string) $item['userJourney']) : '';
                if ($user_journey !== '') {
                    ?>
                    <section class="fides-ssr-detail__section">
                        <h2 class="fides-ssr-detail__section-title"><?php esc_html_e('How it works', $td); ?></h2>
                        <?php
                        $paragraphs = preg_split('/\n{2,}/', $user_journey);
                        if (! is_array($paragraphs)) {
                            $paragraphs = array($user_journey);
                        }
                        foreach ($paragraphs as $paragraph) {
                            $paragraph = trim((string) $paragraph);
                            if ($paragraph === '') {
                                continue;
                            }
                            echo '<p>' . nl2br(esc_html($paragraph)) . '</p>';
                        }
                        ?>
                    </section>
                    <?php
                }

                // Free-text tags are stored verbatim.
                echo $this->render_chip_section($this->list_field($item, 'tags'), __('Tags', $td));

                // Taxonomy slugs are mapped to their human labels.
                echo $this->render_chip_section(
                    $this->map_labels($this->list_field($item, 'interactionModes'), 'interactionModes'),
                    __('Interaction modes', $td)
                );
                echo $this->render_chip_section(
                    $this->map_labels($this->list_field($item, 'vcFormats'), 'vcFormats'),
                    __('VC formats', $td)
                );
                echo $this->render_chip_section(
                    $this->map_labels($this->list_field($item, 'issuanceProtocols'), 'issuanceProtocols'),
                    __('Issuance protocols', $td)
                );
                echo $this->render_chip_section(
                    $this->map_labels($this->list_field($item, 'presentationProtocols'), 'presentationProtocols'),
                    __('Presentation protocols', $td)
                );
                echo $this->render_chip_section(
                    $this->map_labels($this->list_field($item, 'interopProfiles'), 'interopProfiles'),
                    __('Interop profiles', $td)
                );

                // Linked catalog entries (wallets, issuers, credentials, RPs, organisations).
                foreach ($this->linked_sections() as $bucket => $title) {
                    echo $this->render_chip_section($this->linked_labels($item, $bucket), $title);
                }

                return (string) ob_get_clean();
            }

            /* --------------------------------------------------------------
             * JSON-LD enrichment (base type: CreativeWork)
             * -------------------------------------------------------------- */

            protected function enrich_jsonld(array $jsonld, array $item): array {
                if (! empty($item['summary']) && is_string($item['summary'])) {
                    $jsonld['description'] = (string) $item['summary'];
                }

                $sector_label = $this->sector_label(isset($item['sector']) ? (string) $item['sector'] : '');
                if ($sector_label !== '') {
                    $jsonld['about'] = $sector_label;
                }

                $keywords = array_merge(
                    $this->list_field($item, 'tags'),
                    $this->map_labels($this->list_field($item, 'interactionModes'), 'interactionModes'),
                    $this->map_labels($this->list_field($item, 'vcFormats'), 'vcFormats'),
                    $this->map_labels($this->list_field($item, 'issuanceProtocols'), 'issuanceProtocols'),
                    $this->map_labels($this->list_field($item, 'presentationProtocols'), 'presentationProtocols')
                );
                if (! empty($keywords)) {
                    $jsonld['keywords'] = implode(', ', array_unique($keywords));
                }

                $image = isset($item['imageUrl']) ? trim((string) $item['imageUrl']) : '';
                if ($image !== '') {
                    $jsonld['image'] = $image;
                }

                $org = isset($item['organizationName']) ? trim((string) $item['organizationName']) : '';
                if ($org !== '') {
                    $jsonld['author'] = array(
                        '@type' => 'Organization',
                        'name'  => $org,
                    );
                    $jsonld['sourceOrganization'] = array(
                        '@type' => 'Organization',
                        'name'  => $org,
                    );
                }

                $jsonld['inLanguage'] = 'en';

                if (! empty($item['updatedAt']) && is_string($item['updatedAt'])) {
                    $ts = strtotime($item['updatedAt']);
                    if ($ts) {
                        $jsonld['dateModified'] = gmdate('Y-m-d', $ts);
                    }
                }
                if (! empty($item['publishedAt']) && is_string($item['publishedAt'])) {
                    $ts = strtotime($item['publishedAt']);
                    if ($ts) {
                        $jsonld['datePublished'] = gmdate('Y-m-d', $ts);
                    }
                }

                $video = (isset($item['video']) && is_array($item['video'])) ? $item['video'] : array();
                if (! empty($video['url']) && is_string($video['url'])) {
                    $video_object = array(
                        '@type' => 'VideoObject',
                        'name'  => isset($item['title']) ? (string) $item['title'] : '',
                        'contentUrl' => (string) $video['url'],
                    );
                    if (! empty($video_object['name'])) {
                        $jsonld['video'] = $video_object;
                    }
                }

                $more_info = isset($item['moreInfoUrl']) ? trim((string) $item['moreInfoUrl']) : '';
                if ($more_info !== '') {
                    $jsonld['sameAs'] = array($more_info);
                }

                return $jsonld;
            }

            /* --------------------------------------------------------------
             * Helpers
             * -------------------------------------------------------------- */

            /**
             * Linked catalog buckets in the same order as the submission form.
             *
             * @return array<string, string>
             */
            private function linked_sections(): array {
                $td = 'fides-use-case-catalog';
                return array(
                    'personalWallets' => __('Personal wallets used', $td),
                    'businessWallets' => __('Business wallets used', $td),
                    'issuers'         => __('Issuers involved', $td),
                    'credentials'     => __('Credential types used', $td),
                    'rps'             => __('Relying parties', $td),
                );
            }

            /**
             * @return array<int, string>
             */
            private function linked_labels(array $item, string $bucket): array {
                $links = (isset($item['links']) && is_array($item['links'])) ? $item['links'] : array();
                $rows  = (isset($links[$bucket]) && is_array($links[$bucket])) ? $links[$bucket] : array();
                $out   = array();
                foreach ($rows as $row) {
                    if (! is_array($row)) {
                        continue;
                    }
                    $label = '';
                    if (! empty($row['labelRaw'])) {
                        $label = (string) $row['labelRaw'];
                    } elseif (! empty($row['label'])) {
                        $label = (string) $row['label'];
                    } elseif (! empty($row['refId'])) {
                        $label = (string) $row['refId'];
                    }
                    $label = trim($label);
                    if ($label !== '') {
                        $out[] = $label;
                    }
                }
                return $out;
            }

            /**
             * Map taxonomy slugs to their human labels via the shared options.
             *
             * @param array<int, string> $slugs
             * @return array<int, string>
             */
            private function map_labels(array $slugs, string $group): array {
                if (empty($slugs) || ! function_exists('fides_use_case_catalog_taxonomy_options')) {
                    return $slugs;
                }
                $options = fides_use_case_catalog_taxonomy_options();
                $map = (isset($options[$group]) && is_array($options[$group])) ? $options[$group] : array();
                $out = array();
                foreach ($slugs as $slug) {
                    $slug = (string) $slug;
                    $out[] = isset($map[$slug]) ? (string) $map[$slug] : $slug;
                }
                return $out;
            }

            private function sector_label(string $slug): string {
                $slug = trim($slug);
                if ($slug === '' || ! function_exists('fides_use_case_catalog_sectors')) {
                    return $slug;
                }
                $sectors = fides_use_case_catalog_sectors();
                return isset($sectors[$slug]) ? (string) $sectors[$slug] : $slug;
            }

            private function country_label(string $code): string {
                $code = strtoupper(trim($code));
                if ($code === '') {
                    return '';
                }
                if ($code === 'EU') {
                    return __('European Union', 'fides-use-case-catalog');
                }
                if (function_exists('locale_get_display_region')) {
                    $name = locale_get_display_region('-' . $code, 'en');
                    if (is_string($name) && $name !== '' && strtoupper($name) !== $code) {
                        return $name;
                    }
                }
                return $code;
            }
        }
    }
}
