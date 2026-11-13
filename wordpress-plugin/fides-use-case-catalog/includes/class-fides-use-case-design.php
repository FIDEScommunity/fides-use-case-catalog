<?php
/**
 * Design-system integration for use cases (pilot).
 *
 * Maps published use-case items (GitHub aggregated.json via the shared
 * Fides_Catalog_Source cache) to props for the shared Fides_DS_Card component
 * from fides-community-tools-tiles. The JavaScript listing mirrors these rules
 * in useCaseCardProps() in assets/usecase-catalog.js.
 *
 * @package fides-use-case-catalog
 */

if (! defined('ABSPATH')) {
    exit;
}

final class Fides_Use_Case_Design {

    public const STYLE_HANDLE = 'fides-use-case-design';

    private const MONTHS = array('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec');

    /** @var array<int, array<string, mixed>>|null */
    private static ?array $items = null;

    /** @var array<string, string>|null credential id or alias => canonical credential id */
    private static ?array $credential_ids = null;

    /** @var array<string, list<array<string, mixed>>>|null use-case id => award recognitions */
    private static ?array $awards = null;

    /** @var array<string, int> */
    private static array $likes = array();

    public static function bootstrap(): void {
        add_action('wp_enqueue_scripts', array(__CLASS__, 'register_assets'), 20);
        add_action('wp_enqueue_scripts', array(__CLASS__, 'enqueue_for_current_post'), 21);
        add_filter('get_canonical_url', array(__CLASS__, 'filter_canonical_url'), 10, 2);
    }

    /** Drop per-request caches (catalog items, credential aliases, awards, likes). */
    public static function flush_cache(): void {
        self::$items          = null;
        self::$credential_ids = null;
        self::$awards         = null;
        self::$likes          = array();
    }

    /**
     * Canonical for a page with [fides_use_case_detail]: the same URL that
     * "Copy link" and related cards use for the record that is shown.
     *
     * @param string       $canonical_url
     * @param WP_Post|null $post
     * @return string
     */
    public static function filter_canonical_url($canonical_url, $post = null) {
        if (! $post instanceof WP_Post || ! has_shortcode((string) $post->post_content, 'fides_use_case_detail')) {
            return $canonical_url;
        }
        $atts = self::shortcode_attributes((string) $post->post_content, 'fides_use_case_detail');
        $id   = self::requested_id((string) ($atts['id'] ?? ''));
        if ($id === '' || self::find($id) === null) {
            return $canonical_url;
        }
        return self::detail_url($id, self::detail_base((string) ($atts['detail_url'] ?? ''), $post));
    }

    /**
     * Base URL for detail links rendered by [fides_use_case_detail]: the
     * shortcode's detail_url, else the permalink of the page itself.
     */
    public static function detail_base(string $detail_url, $post = null): string {
        $detail_url = trim($detail_url);
        if ($detail_url !== '') {
            return $detail_url;
        }
        return (string) get_permalink($post);
    }

    /**
     * @return array<string, string>
     */
    private static function shortcode_attributes(string $content, string $tag): array {
        if (! preg_match_all('/' . get_shortcode_regex(array($tag)) . '/', $content, $matches, PREG_SET_ORDER)) {
            return array();
        }
        $atts = shortcode_parse_atts($matches[0][3]);
        return is_array($atts) ? array_map('strval', $atts) : array();
    }

    /** True when the shared design system from fides-community-tools-tiles is loaded. */
    public static function available(): bool {
        return class_exists('Fides_DS_Card') && class_exists('Fides_DS_Gallery');
    }

    public static function register_assets(): void {
        if (class_exists('FIDES_Community_Tools_Tiles') && method_exists('FIDES_Community_Tools_Tiles', 'register_design_system_assets')) {
            FIDES_Community_Tools_Tiles::register_design_system_assets();
        }
        if (! wp_style_is('fides-design-system', 'registered')) {
            return;
        }
        $path = FIDES_USE_CASE_CATALOG_PATH . 'assets/usecase-design.css';
        wp_register_style(
            self::STYLE_HANDLE,
            FIDES_USE_CASE_CATALOG_URL . 'assets/usecase-design.css',
            array('fides-design-system'),
            file_exists($path) ? (string) filemtime($path) : FIDES_USE_CASE_CATALOG_VERSION
        );
    }

    /**
     * Enqueue styles in <head> for pages that use design-system shortcodes so
     * the first paint already has the final layout (no flash of unstyled cards).
     */
    public static function enqueue_for_current_post(): void {
        if (! is_singular()) {
            return;
        }
        $post = get_post();
        if (! $post instanceof WP_Post) {
            return;
        }
        $content = (string) $post->post_content;
        $uses_design = has_shortcode($content, 'fides_use_case_detail')
            || has_shortcode($content, 'fides_use_case_featured')
            || (has_shortcode($content, 'fides_use_case_catalog') && strpos($content, 'design="pilot"') !== false);
        if ($uses_design) {
            self::enqueue();
        }
    }

    public static function enqueue(): void {
        if (! wp_style_is(self::STYLE_HANDLE, 'registered')) {
            self::register_assets();
        }
        wp_enqueue_style(self::STYLE_HANDLE);
        wp_enqueue_script('fides-design-system');
    }

    /**
     * Published use cases. Same cached source as SSR, sitemap and catalog map.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function items(): array {
        if (self::$items !== null) {
            return self::$items;
        }
        $items = array();
        if (class_exists('Fides_Catalog_Source')) {
            $source = Fides_Catalog_Source::for('usecase');
            if ($source) {
                $items = $source->all();
            }
        }
        if (empty($items) && function_exists('fides_use_case_catalog_github_items')) {
            $items = fides_use_case_catalog_github_items();
        }
        /** Filters the published use cases used by the design views. */
        $items       = apply_filters('fides_use_case_design_items', $items);
        self::$items = array_values(array_filter(is_array($items) ? $items : array(), static function ($item) {
            return is_array($item) && ! empty($item['id']) && ! empty($item['title']);
        }));
        return self::$items;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function find(string $id): ?array {
        $id = trim($id);
        if ($id === '') {
            return null;
        }
        foreach (self::items() as $item) {
            if ((string) $item['id'] === $id) {
                return $item;
            }
        }
        return null;
    }

    /**
     * Canonical credential-catalog id for a credential reference that may be
     * an alias id or a per-format credentialId. Same rules as
     * buildCredentialAliasIndex() in the shared fides-catalog-ui.js.
     */
    public static function credential_canonical_id(string $ref): string {
        $ref = trim($ref);
        if ($ref === '') {
            return '';
        }
        if (self::$credential_ids === null) {
            $credentials = array();
            if (class_exists('Fides_Catalog_Source')) {
                $source = Fides_Catalog_Source::for('credential');
                if ($source) {
                    $credentials = $source->all();
                }
            }
            /** Filters the credential catalog rows used for alias resolution. */
            $credentials = apply_filters('fides_use_case_design_credentials', $credentials);
            $index       = array();
            foreach (is_array($credentials) ? $credentials : array() as $credential) {
                if (! is_array($credential) || ! isset($credential['id']) || ! is_string($credential['id']) || $credential['id'] === '') {
                    continue;
                }
                $canonical  = $credential['id'];
                $resolvable = array($canonical);
                foreach ((array) ($credential['aliasIds'] ?? array()) as $alias) {
                    $resolvable[] = (string) $alias;
                }
                foreach ((array) ($credential['formats'] ?? array()) as $format) {
                    if (is_array($format) && ! empty($format['credentialId'])) {
                        $resolvable[] = (string) $format['credentialId'];
                    }
                }
                foreach ($resolvable as $resolvable_id) {
                    if ($resolvable_id !== '') {
                        $index[$resolvable_id] = $canonical;
                    }
                }
            }
            self::$credential_ids = $index;
        }
        return self::$credential_ids[$ref] ?? $ref;
    }

    /**
     * Award recognitions for a use case from the shared awards REST route
     * (the same data the listing loads in loadAwardRecognitions()).
     *
     * @return list<array{program_label:string, program_url:string, year:int, category_label:string, place:int}>
     */
    public static function award_recognitions(string $id): array {
        if (self::$awards === null) {
            self::$awards = array();
            if (function_exists('rest_do_request')) {
                foreach (fides_use_case_catalog_award_program_keys() as $program_key) {
                    $response = rest_do_request(new WP_REST_Request('GET', '/fides-catalog/v1/awards/' . rawurlencode($program_key)));
                    $payload  = $response instanceof WP_REST_Response && $response->get_status() === 200 ? $response->get_data() : null;
                    if (! is_array($payload) || empty($payload['ok'])) {
                        continue;
                    }
                    foreach ((array) ($payload['categories'] ?? array()) as $category) {
                        foreach ((array) ($category['finalists'] ?? array()) as $finalist) {
                            if (($finalist['type'] ?? '') !== 'usecase' || empty($finalist['id'])) {
                                continue;
                            }
                            self::$awards[(string) $finalist['id']][] = array(
                                'program_label'  => (string) ($payload['label'] ?? $program_key),
                                'program_url'    => (string) ($payload['url'] ?? ''),
                                'year'           => (int) ($payload['year'] ?? 0),
                                'category_label' => (string) ($category['label'] ?? $category['key'] ?? ''),
                                'place'          => (int) ($finalist['place'] ?? 0),
                            );
                        }
                    }
                }
            }
        }
        $recognitions = self::$awards[$id] ?? array();
        usort($recognitions, static function ($a, $b) {
            return ($b['place'] === 1) <=> ($a['place'] === 1);
        });
        return $recognitions;
    }

    /**
     * "Winner 2026" / "Finalist 2026", as awardBadgeLabel() in the listing.
     *
     * @param array{year:int, place:int} $recognition
     */
    public static function award_label(array $recognition): string {
        $result = $recognition['place'] === 1 ? 'Winner' : 'Finalist';
        return $recognition['year'] > 0 ? $result . ' ' . $recognition['year'] : $result;
    }

    /**
     * Award line for the featured slot: "Winner 2026 · Global Digital Trust Awards".
     * Empty unless both the award name and its result (winner or finalist) are known.
     */
    public static function award_line(string $id): string {
        $recognitions = $id !== '' ? self::award_recognitions($id) : array();
        if (! $recognitions) {
            return '';
        }
        $name = trim((string) ($recognitions[0]['program_label'] ?? ''));
        if ($name === '' || ! isset($recognitions[0]['place'])) {
            return '';
        }
        $year   = (int) ($recognitions[0]['year'] ?? 0);
        $result = $recognitions[0]['place'] === 1 ? 'Winner' : 'Finalist';
        // The programme name often carries the year already ("FIDES Community Awards 2026").
        if ($year > 0 && strpos($name, (string) $year) === false) {
            $name .= ' ' . $year;
        }
        return $result . ' · ' . $name;
    }

    /** Like count from the shared ratings REST route. */
    public static function like_count(string $id): int {
        if (! array_key_exists($id, self::$likes)) {
            self::$likes[$id] = 0;
            if (function_exists('rest_do_request')) {
                $request = new WP_REST_Request('GET', '/fides-catalog/v1/ratings/batch');
                $request->set_query_params(array('type' => 'usecase', 'ids' => $id));
                $response = rest_do_request($request);
                $data     = $response instanceof WP_REST_Response && $response->get_status() === 200 ? $response->get_data() : null;
                $row      = is_array($data) && isset($data['results'][$id]) && is_array($data['results'][$id]) ? $data['results'][$id] : array();
                self::$likes[$id] = max(0, (int) ($row['likes'] ?? $row['count'] ?? 0));
            }
        }
        return self::$likes[$id];
    }

    public static function like_label(int $count): string {
        return $count === 1 ? '1 like' : $count . ' likes';
    }

    /**
     * Requested use-case id from ?usecase= (validated), else the fallback.
     */
    public static function requested_id(string $fallback = ''): string {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        if (isset($_GET['usecase']) && is_string($_GET['usecase'])) {
            // phpcs:ignore WordPress.Security.NonceVerification.Recommended
            $id = fides_use_case_catalog_sanitize_use_case_id((string) wp_unslash($_GET['usecase']));
            if ($id !== '') {
                return $id;
            }
        }
        return trim($fallback);
    }

    /**
     * Root-relative addresses from shortcode attributes ("/fides-design-pilot/use-case/") go through home_url(), so the
     * Dutch (TranslatePress) site keeps visitors on /nl/ instead of sending them to the English page. Absolute
     * addresses and anything else stay as they are.
     */
    public static function local_url(string $url): string {
        $url = trim($url);
        return ($url !== '' && $url[0] === '/' && strpos($url, '//') !== 0) ? home_url($url) : $url;
    }

    /**
     * Detail URL: the pilot detail page when configured, otherwise the canonical
     * share URL /use-case/{id}/ (which opens the existing listing modal).
     */
    public static function detail_url(string $id, string $detail_base = ''): string {
        $detail_base = trim($detail_base);
        if ($detail_base !== '') {
            if ($detail_base[0] === '/' && strpos($detail_base, '//') !== 0) {
                $detail_base = home_url($detail_base);
            }
            return add_query_arg('usecase', rawurlencode($id), $detail_base);
        }
        return home_url(fides_use_case_catalog_share_path() . rawurlencode($id) . '/');
    }

    public static function share_url(string $id): string {
        return home_url(fides_use_case_catalog_share_path() . rawurlencode($id) . '/');
    }

    /**
     * @param array<string, mixed> $item
     */
    public static function sector_label(array $item): string {
        $sector = isset($item['sector']) ? (string) $item['sector'] : '';
        return $sector !== '' ? fides_use_case_catalog_sector_label($sector) : '';
    }

    /**
     * @param array<string, mixed> $item
     */
    public static function country_label(array $item): string {
        $code = isset($item['country']) ? (string) $item['country'] : '';
        return $code !== '' ? fides_use_case_catalog_country_display_name($code) : '';
    }

    /**
     * @param array<string, mixed> $item
     */
    public static function kicker(array $item): string {
        return implode(' · ', array_filter(array(self::sector_label($item), self::country_label($item))));
    }

    /**
     * @param array<string, mixed> $item
     */
    public static function status_label(array $item): string {
        $value = isset($item['productionDeployment']) ? strtolower(trim((string) $item['productionDeployment'])) : '';
        if ($value === 'yes') {
            return 'In production';
        }
        if ($value === 'no') {
            return 'Not in production';
        }
        return '';
    }

    /**
     * "21 Sep 2026" from the calendar date in updatedAt (timezone-independent).
     *
     * @param array<string, mixed> $item
     */
    public static function updated_date(array $item, bool $long = false): string {
        $raw = isset($item['updatedAt']) ? (string) $item['updatedAt'] : '';
        if (! preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $raw, $m)) {
            return '';
        }
        $month = (int) $m[2];
        if ($month < 1 || $month > 12) {
            return '';
        }
        $name = $long ? gmdate('F', gmmktime(0, 0, 0, $month, 1, 2000)) : self::MONTHS[$month - 1];
        return (int) $m[3] . ' ' . $name . ' ' . $m[1];
    }

    /**
     * @param array<string, mixed> $item
     */
    public static function image_url(array $item): string {
        $image = isset($item['imageUrl']) ? trim((string) $item['imageUrl']) : '';
        if ($image !== '') {
            return $image;
        }
        $video = isset($item['video']) && is_array($item['video']) ? $item['video'] : array();
        if (! empty($video['url']) && (($video['provider'] ?? '') === 'youtube')) {
            return fides_use_case_catalog_youtube_thumbnail_url((string) $video['url']);
        }
        return '';
    }

    /**
     * Shared card props for a use case.
     *
     * @param array<string, mixed> $item
     * @return array<string, mixed>
     */
    public static function card_props(array $item, string $variant, string $detail_base = ''): array {
        $id      = (string) ($item['id'] ?? '');
        $title   = (string) ($item['title'] ?? $id);
        $owner   = trim((string) ($item['organizationName'] ?? ''));
        $updated = self::updated_date($item);
        $props   = array(
            'variant'        => $variant,
            'href'           => self::detail_url($id, $detail_base),
            'title'          => $title,
            'image_url'      => self::image_url($item),
            'image_alt'      => '',
            'fallback_label' => $owner !== '' ? $owner : $title,
            'cta_label'      => 'Read use case →',
            'data'           => array('use-case-id' => $id),
        );
        if ($variant === 'row') {
            unset($props['fallback_label'], $props['cta_label']);
            $props['kicker']     = self::kicker($item);
            $props['summary']    = trim((string) preg_replace('/\s+/u', ' ', (string) ($item['summary'] ?? '')));
            $props['owner']      = $owner;
            $props['owner_href'] = self::owner_href($item, $owner);
            $props['status']  = self::status_label($item);
            $props['meta']    = self::engagement_meta($id, $updated !== '' ? 'Updated ' . $updated : '');
        } elseif ($variant === 'feature') {
            $props['kicker']    = implode(' · ', array_filter(array('Featured use case', $owner)));
            $props['status']    = self::status_label($item);
            $props['meta']      = self::engagement_meta($id, '');
            $props['media_fit'] = 'cover';
            $props['cta_label'] = 'Explore this use case →';
        } else {
            $props['kicker'] = implode(' · ', array_filter(array($owner, self::country_label($item))));
            $props['meta']   = self::engagement_meta($id, '');
        }
        return $props;
    }

    /**
     * FIDES organization page for the owner when the item links an
     * organization record with the same name; mirrors pilotOwnerHref().
     *
     * @param array<string, mixed> $item
     */
    public static function owner_href(array $item, string $owner): string {
        if ($owner === '') {
            return '';
        }
        $orgs = isset($item['links']['organizations']) && is_array($item['links']['organizations']) ? $item['links']['organizations'] : array();
        foreach ($orgs as $org) {
            if (! is_array($org) || strcasecmp(trim((string) ($org['labelRaw'] ?? '')), $owner) !== 0) {
                continue;
            }
            $ref = trim((string) ($org['refId'] ?? ''));
            if ($ref !== '') {
                return self::organization_profile_href($ref, 'usecase:' . (string) ($item['id'] ?? ''));
            }
        }
        return '';
    }

    /**
     * Organization profile for a catalog ref. On the design pilot this is
     * /fides-design-pilot/organization/?org=…; otherwise the classic
     * /organization/{id}/ route. The from value is kept when present.
     */
    public static function organization_profile_href(string $ref, string $from = ''): string {
        $ref = trim($ref);
        if ($ref === '') {
            return '';
        }
        if (class_exists('Fides_Organization_Design')) {
            $pilot = Fides_Organization_Design::pilot_detail_base();
            if ($pilot !== '') {
                $url = Fides_Organization_Design::detail_url($ref, $pilot);
                if ($from !== '') {
                    $url .= (strpos($url, '?') === false ? '?' : '&') . 'from=' . rawurlencode($from);
                }
                return $url;
            }
        }
        $urls = function_exists('fides_use_case_catalog_catalog_urls') ? fides_use_case_catalog_catalog_urls() : array();
        $base = isset($urls['organizationDetailUrl']) ? rtrim((string) $urls['organizationDetailUrl'], '/') : '';
        if ($base === '') {
            return '';
        }
        $url = $base . '/' . rawurlencode($ref) . '/';
        if ($from !== '') {
            $url .= '?from=' . rawurlencode($from);
        }
        return $url;
    }

    /**
     * Card meta line: optional prefix, strongest award, like count (when > 0).
     * Mirrors pilotEngagementMeta() in assets/usecase-catalog.js.
     */
    public static function engagement_meta(string $id, string $prefix): string {
        $parts        = array($prefix);
        $recognitions = $id !== '' ? self::award_recognitions($id) : array();
        if ($recognitions) {
            $parts[] = self::award_label($recognitions[0]);
        }
        $likes = $id !== '' ? self::like_count($id) : 0;
        if ($likes > 0) {
            $parts[] = self::like_label($likes);
        }
        return implode(' · ', array_filter($parts, 'strlen'));
    }

    /**
     * @param array<string, mixed> $item
     */
    public static function render_card(array $item, string $variant, string $detail_base = '', array $overrides = array()): string {
        if (! self::available()) {
            return '';
        }
        return Fides_DS_Card::render(array_merge(self::card_props($item, $variant, $detail_base), $overrides));
    }

    /**
     * Dark "Contribute" band closing the overview (Paper 02 Use cases). Rendered
     * next to the JS root so the client-side overview never replaces it.
     */
    public static function contribute_band_html(string $add_url): string {
        return self::contribute_band(array(
            'id'      => 'fides-uc-contribute-title',
            'actions' => $add_url !== '' ? array(array('Add a use case', $add_url)) : array(),
            'text'    => 'List your organization first, then submit a use case or suggest an update.',
            'note'    => 'A FIDES Community account is required. Submissions are reviewed before publication.',
            'data'    => 'https://github.com/FIDEScommunity/fides-use-case-catalog',
        ));
    }

    /**
     * Shared overview contribute band for use cases and organizations
     * (Paper 20.3): title and form actions left; explanation, disclaimer and
     * GitHub as data source right. The first action is the button, the
     * others are text links.
     *
     * @param array{
     *   id:string,
     *   actions:list<array{0:string, 1:string}>,
     *   text:string,
     *   about?:string,
     *   note?:string,
     *   data?:string,
     *   email?:string,
     *   class?:string
     * } $args
     */
    public static function contribute_band(array $args): string {
        $actions = array();
        foreach ($args['actions'] as $index => [$label, $url]) {
            $actions[] = '<a class="' . ($index === 0 ? 'fides-ds-button' : 'fides-uc-contribute__link') . '" href="' . esc_url($url) . '"><span>' . esc_html($label) . '</span> <span aria-hidden="true">→</span></a>';
        }
        $sources = array();
        if (! empty($args['data'])) {
            $sources[] = '<a href="' . esc_url($args['data']) . '" rel="noopener" target="_blank">Catalog data is available on GitHub <span aria-hidden="true">↗</span><span class="fides-ds-visually-hidden"> (opens in a new tab)</span></a>';
        }
        if (! empty($args['email'])) {
            $sources[] = '<a href="' . esc_url('mailto:' . $args['email']) . '">' . esc_html($args['email']) . '</a>';
        }
        $id = esc_attr($args['id']);
        return '<section class="fides-ds fides-ds-band--dark fides-uc-contribute' . (! empty($args['class']) ? ' ' . esc_attr($args['class']) : '') . '" aria-labelledby="' . $id . '">'
            . '<div class="fides-ds-page fides-uc-contribute__inner">'
            . '<div class="fides-uc-contribute__intro">'
            . '<p class="fides-ds-kicker">Contribute</p>'
            . '<h2 class="fides-uc-contribute__title" id="' . $id . '">Add or update<br>a listing.</h2>'
            . '<p>Help keep the ecosystem visible and useful.</p>'
            . ($actions ? '<p class="fides-uc-contribute__actions">' . implode(' ', $actions) . '</p>' : '')
            . '</div>'
            . '<div class="fides-uc-contribute__steps">'
            . '<p>' . esc_html($args['text']) . '</p>'
            . (! empty($args['about']) ? '<h3 class="fides-uc-contribute__about-title">About this catalog</h3><p class="fides-uc-contribute__note">' . esc_html($args['about']) . '</p>' : '')
            . (! empty($args['note']) ? '<p class="fides-uc-contribute__note">' . esc_html($args['note']) . '</p>' : '')
            . ($sources ? '<p class="fides-uc-contribute__sources">' . implode(' <span aria-hidden="true">·</span> ', $sources) . '</p>' : '')
            . '</div></div></section>';
    }

    /**
     * Load like counts for many ids with one batch request per 100 ids.
     *
     * @param list<string> $ids
     */
    public static function prime_likes(array $ids): void {
        $missing = array_values(array_filter(array_unique($ids), static function ($id) {
            return $id !== '' && ! array_key_exists($id, self::$likes);
        }));
        if (! $missing || ! function_exists('rest_do_request')) {
            return;
        }
        foreach (array_chunk($missing, 100) as $chunk) {
            $request = new WP_REST_Request('GET', '/fides-catalog/v1/ratings/batch');
            $request->set_query_params(array('type' => 'usecase', 'ids' => implode(',', $chunk)));
            $response = rest_do_request($request);
            $data     = $response instanceof WP_REST_Response && $response->get_status() === 200 ? $response->get_data() : null;
            foreach ($chunk as $id) {
                $row = is_array($data) && isset($data['results'][$id]) && is_array($data['results'][$id]) ? $data['results'][$id] : array();
                self::$likes[$id] = max(0, (int) ($row['likes'] ?? $row['count'] ?? 0));
            }
        }
    }

    /**
     * Theme bundle codes for an item, as itemThemeBundleCodes() in the listing.
     *
     * @param array<string, mixed> $item
     * @return list<string>
     */
    private static function theme_bundle_codes(array $item): array {
        $config = class_exists('Fides_Use_Case_Discovery_Shortcode') ? Fides_Use_Case_Discovery_Shortcode::theme_config() : array();
        $themes = isset($item['themes']) && is_array($item['themes']) ? $item['themes'] : array();
        if (! $themes) {
            $assigned = $config['assignments'][ (string) ($item['id'] ?? '') ] ?? array();
            $themes   = is_array($assigned) ? $assigned : array();
        }
        $themes = array_map('strval', $themes);
        $codes  = array();
        if ($themes) {
            foreach ($config['bundles'] ?? array() as $bundle) {
                if (array_intersect($themes, $bundle['themeCodes'])) {
                    $codes[] = (string) $bundle['code'];
                }
            }
        }
        return $codes;
    }

    /** @return array<string, string> code => title */
    private static function theme_bundle_titles(): array {
        $config = class_exists('Fides_Use_Case_Discovery_Shortcode') ? Fides_Use_Case_Discovery_Shortcode::theme_config() : array();
        $titles = array();
        foreach ($config['bundles'] ?? array() as $bundle) {
            $titles[ (string) $bundle['code'] ] = (string) ($bundle['title'] !== '' ? $bundle['title'] : $bundle['code']);
        }
        return $titles;
    }

    /**
     * Unique link refIds under one or more links keys, as itemLinkRefIds().
     *
     * @param array<string, mixed> $item
     * @param list<string> $keys
     * @return list<string>
     */
    private static function link_ref_ids(array $item, array $keys): array {
        $ids = array();
        foreach ($keys as $key) {
            $links = isset($item['links'][ $key ]) && is_array($item['links'][ $key ]) ? $item['links'][ $key ] : array();
            foreach ($links as $link) {
                $ref = is_array($link) ? trim((string) ($link['refId'] ?? '')) : '';
                if ($ref !== '' && ! in_array($ref, $ids, true)) {
                    $ids[] = $ref;
                }
            }
        }
        return $ids;
    }

    /**
     * Primary sector (sector, else first legacy sector, else themeKey), as itemSector().
     *
     * @param array<string, mixed> $item
     */
    private static function primary_sector(array $item): string {
        if (! empty($item['sector'])) {
            return (string) $item['sector'];
        }
        $legacy = isset($item['sectors']) && is_array($item['sectors']) ? array_values(array_filter($item['sectors'])) : array();
        if ($legacy) {
            return (string) $legacy[0];
        }
        return ! empty($item['themeKey']) ? (string) $item['themeKey'] : '';
    }

    /**
     * Known sector codes, primary first, as itemSectorCodes().
     *
     * @param array<string, mixed> $item
     * @return list<string>
     */
    private static function sector_codes(array $item): array {
        $known   = function_exists('fides_use_case_catalog_sectors') ? fides_use_case_catalog_sectors() : array();
        $codes   = array();
        $primary = self::primary_sector($item);
        if ($primary !== '') {
            $codes[] = $primary;
        }
        foreach (isset($item['sectors']) && is_array($item['sectors']) ? $item['sectors'] : array() as $code) {
            $code = trim((string) $code);
            if ($code !== '' && ! in_array($code, $codes, true)) {
                $codes[] = $code;
            }
        }
        return array_values(array_filter($codes, static function ($code) use ($known) {
            return array_key_exists($code, $known);
        }));
    }

    /**
     * Similar use cases: the same selection, order and reason as
     * similarUseCases() in assets/usecase-catalog.js (listing modal). Shared
     * theme bundle, credential, wallet, organisation or sector; nothing else.
     *
     * @param array<string, mixed> $item
     * @return list<array{item: array<string, mixed>, reason: string}>
     */
    public static function similar_matches(array $item, int $limit = 3): array {
        $id      = (string) ($item['id'] ?? '');
        $wallets = array('personalWallets', 'businessWallets');
        $source  = array(
            'themes'        => self::theme_bundle_codes($item),
            'credentials'   => self::link_ref_ids($item, array('credentials')),
            'wallets'       => self::link_ref_ids($item, $wallets),
            'organizations' => self::link_ref_ids($item, array('organizations')),
            'sectors'       => self::sector_codes($item),
        );
        $titles  = self::theme_bundle_titles();
        $matches = array();
        foreach (self::items() as $candidate) {
            $candidate_id = (string) ($candidate['id'] ?? '');
            if ($candidate_id === '' || $candidate_id === $id) {
                continue;
            }
            $themes        = array_values(array_intersect($source['themes'], self::theme_bundle_codes($candidate)));
            $credentials   = array_values(array_intersect($source['credentials'], self::link_ref_ids($candidate, array('credentials'))));
            $wallet_ids    = array_values(array_intersect($source['wallets'], self::link_ref_ids($candidate, $wallets)));
            $organizations = array_values(array_intersect($source['organizations'], self::link_ref_ids($candidate, array('organizations'))));
            $sectors       = array_values(array_intersect($source['sectors'], self::sector_codes($candidate)));
            $rank          = array(
                $themes ? 1 : 0,
                $credentials ? 1 : 0,
                $wallet_ids ? 1 : 0,
                $organizations ? 1 : 0,
                $sectors ? 1 : 0,
                count($themes),
                count($credentials),
                count($wallet_ids),
                count($organizations),
            );
            if (! array_sum(array_slice($rank, 0, 5))) {
                continue;
            }
            if ($themes) {
                $reason = isset($titles[ $themes[0] ]) ? 'Shared theme: ' . $titles[ $themes[0] ] : 'Shared theme';
            } elseif ($credentials) {
                $reason = count($credentials) === 1 ? 'Shared credential' : count($credentials) . ' shared credentials';
            } elseif ($wallet_ids) {
                $reason = count($wallet_ids) === 1 ? 'Shared wallet' : count($wallet_ids) . ' shared wallets';
            } elseif ($organizations) {
                $reason = count($organizations) === 1 ? 'Shared organisation' : count($organizations) . ' shared organisations';
            } else {
                $code   = self::primary_sector($candidate);
                $known  = fides_use_case_catalog_sectors();
                $reason = 'Same sector: ' . ($code === '' ? '—' : (string) ($known[ $code ] ?? $code));
            }
            $matches[] = array('item' => $candidate, 'rank' => $rank, 'reason' => $reason);
        }
        if (! $matches) {
            return array();
        }
        self::prime_likes(array_map(static function ($match) {
            return (string) $match['item']['id'];
        }, $matches));
        $collator = class_exists('Collator') ? new Collator('en') : null;
        if ($collator) {
            $collator->setStrength(Collator::PRIMARY);
        }
        usort($matches, static function ($left, $right) use ($collator) {
            foreach ($left['rank'] as $index => $value) {
                if ($value !== $right['rank'][ $index ]) {
                    return $right['rank'][ $index ] <=> $value;
                }
            }
            $likes = self::like_count((string) $right['item']['id']) <=> self::like_count((string) $left['item']['id']);
            if ($likes !== 0) {
                return $likes;
            }
            $a = (string) ($left['item']['title'] ?? '');
            $b = (string) ($right['item']['title'] ?? '');
            return $collator ? (int) $collator->compare($a, $b) : strcasecmp(remove_accents($a), remove_accents($b));
        });
        return array_map(static function ($match) {
            return array('item' => $match['item'], 'reason' => $match['reason']);
        }, array_slice($matches, 0, $limit));
    }
}
