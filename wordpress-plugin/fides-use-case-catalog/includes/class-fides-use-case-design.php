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

    public static function bootstrap(): void {
        add_action('wp_enqueue_scripts', array(__CLASS__, 'register_assets'), 20);
        add_action('wp_enqueue_scripts', array(__CLASS__, 'enqueue_for_current_post'), 21);
    }

    /** True when the shared design system from fides-community-tools-tiles is loaded. */
    public static function available(): bool {
        return class_exists('Fides_DS_Card');
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
     * Detail URL: the pilot detail page when configured, otherwise the canonical
     * share URL /use-case/{id}/ (which opens the existing listing modal).
     */
    public static function detail_url(string $id, string $detail_base = ''): string {
        $detail_base = trim($detail_base);
        if ($detail_base !== '') {
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
     * First paragraph of the summary, cut at a word boundary.
     */
    public static function excerpt(string $text, int $max = 220): string {
        $text = trim($text);
        if ($text === '') {
            return '';
        }
        $parts = preg_split('/\n\s*\n/', $text);
        $first = trim(preg_replace('/\s+/u', ' ', (string) ($parts[0] ?? '')));
        if (mb_strlen($first) <= $max) {
            return $first;
        }
        $cut = mb_substr($first, 0, $max);
        $space = mb_strrpos($cut, ' ');
        if ($space !== false && $space > $max * 0.6) {
            $cut = mb_substr($cut, 0, $space);
        }
        return preg_replace('/[\s,;:.\-–—]+$/u', '', $cut) . '…';
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
            $props['kicker']  = self::kicker($item);
            $props['summary'] = self::excerpt((string) ($item['summary'] ?? ''));
            $props['owner']   = $owner;
            $props['status']  = self::status_label($item);
            $props['meta']    = $updated !== '' ? 'Updated ' . $updated : '';
        } elseif ($variant === 'feature') {
            $props['kicker']    = implode(' · ', array_filter(array('Featured use case', $owner)));
            $props['status']    = self::status_label($item);
            $props['media_fit'] = 'cover';
            $props['cta_label'] = 'Explore this use case →';
        } else {
            $props['kicker'] = implode(' · ', array_filter(array($owner, self::country_label($item))));
        }
        return $props;
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
     * Related use cases: shared themes first, then sector, then country;
     * ties broken by most recent update.
     *
     * @param array<string, mixed> $item
     * @return array<int, array<string, mixed>>
     */
    public static function related(array $item, int $limit = 3): array {
        $id      = (string) ($item['id'] ?? '');
        $themes  = isset($item['themes']) && is_array($item['themes']) ? $item['themes'] : array();
        $sector  = (string) ($item['sector'] ?? '');
        $country = strtoupper((string) ($item['country'] ?? ''));
        $scored  = array();
        foreach (self::items() as $candidate) {
            if ((string) $candidate['id'] === $id) {
                continue;
            }
            $candidate_themes = isset($candidate['themes']) && is_array($candidate['themes']) ? $candidate['themes'] : array();
            $score = 3 * count(array_intersect($themes, $candidate_themes));
            if ($sector !== '' && (string) ($candidate['sector'] ?? '') === $sector) {
                $score += 2;
            }
            if ($country !== '' && strtoupper((string) ($candidate['country'] ?? '')) === $country) {
                $score += 1;
            }
            if ($score > 0) {
                $scored[] = array($score, (string) ($candidate['updatedAt'] ?? ''), $candidate);
            }
        }
        usort($scored, static function ($a, $b) {
            return $b[0] <=> $a[0] ?: strcmp($b[1], $a[1]);
        });
        return array_map(static function ($row) {
            return $row[2];
        }, array_slice($scored, 0, $limit));
    }
}
