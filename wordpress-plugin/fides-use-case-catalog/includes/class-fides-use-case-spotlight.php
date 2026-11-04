<?php
/**
 * [fides_use_case_spotlight] — homepage block "One use case. A connected ecosystem." (design pilot).
 *
 * Shows one published use case straight from its catalog record: title,
 * short preview of the description, image and status. Under it sits one
 * compact link per explicitly linked relation type (Organizations 7 →,
 * Business wallets 4 →, …), each pointing to the matching section of the use
 * case page. The counts are the ones that page lists; types without links
 * are left out. Only the id is stored in the page.
 *
 * Attributes:
 *  - id         Catalog id of the use case (required).
 *  - detail_url Use case detail page base; default is the canonical share URL.
 *
 * @package fides-use-case-catalog
 */

if (! defined('ABSPATH')) {
    exit;
}

final class Fides_Use_Case_Spotlight {

    public static function bootstrap(): void {
        add_shortcode('fides_use_case_spotlight', array(__CLASS__, 'shortcode'));
        add_action('wp_enqueue_scripts', array(__CLASS__, 'register_assets'), 20);
    }

    public static function register_assets(): void {
        $dir = FIDES_USE_CASE_CATALOG_PATH . 'assets/usecase-spotlight.css';
        wp_register_style(
            'fides-use-case-spotlight',
            FIDES_USE_CASE_CATALOG_URL . 'assets/usecase-spotlight.css',
            wp_style_is('fides-design-system', 'registered') ? array('fides-design-system') : array(),
            file_exists($dir) ? (string) filemtime($dir) : FIDES_USE_CASE_CATALOG_VERSION
        );
    }

    private const PREVIEW_LENGTH = 200;

    /**
     * Short plain-text preview of the catalog description: the first line,
     * without a leading "Use Case:" label, cut at a word boundary.
     *
     * @param array<string, mixed> $item
     */
    public static function preview(array $item): string {
        $lines = array_values(array_filter(array_map('trim', (array) preg_split('/\R/u', trim((string) ($item['summary'] ?? '')))), static function ($line) {
            return $line !== '';
        }));
        $text  = trim((string) preg_replace('/^use case\s*:\s*/iu', '', (string) ($lines[0] ?? '')));
        $more  = count($lines) > 1;
        $len   = function_exists('mb_strlen') ? mb_strlen($text) : strlen($text);
        if ($len > self::PREVIEW_LENGTH) {
            $cut = function_exists('mb_substr') ? mb_substr($text, 0, self::PREVIEW_LENGTH) : substr($text, 0, self::PREVIEW_LENGTH);
            $pos = strrpos($cut, ' ');
            $text = $pos !== false && $pos > 80 ? substr($cut, 0, $pos) : $cut;
            $more = true;
        }
        // The description continues on the use case page: mark the cut.
        return $more && $text !== '' ? rtrim($text, " ,;:.-") . '…' : $text;
    }

    /**
     * One entry per relation type the record links explicitly, in a fixed
     * order; types without links are omitted. "total" is the number of unique
     * rows the use case page lists in that section.
     *
     * @param array<string, mixed> $item
     * @return list<array{key:string,label:string,total:int,url:string}>
     */
    public static function relation_links(array $item, string $detail_url): array {
        if (! class_exists('Fides_Use_Case_Detail_Page') || ! method_exists('Fides_Use_Case_Detail_Page', 'relation_counts')) {
            return array();
        }
        $counts = Fides_Use_Case_Detail_Page::relation_counts($item);
        $links  = array();
        foreach (array('organizations', 'businessWallets', 'personalWallets', 'credentials', 'issuers', 'rps') as $key) {
            if (empty($counts[ $key ]['total'])) {
                continue;
            }
            $links[] = array(
                'key'   => $key,
                'label' => (string) $counts[ $key ]['label'],
                'total' => (int) $counts[ $key ]['total'],
                'url'   => $detail_url . '#' . $counts[ $key ]['anchor'],
            );
        }
        return $links;
    }

    /**
     * @param array<string, string>|string $atts
     */
    public static function shortcode($atts = array()): string {
        $atts = shortcode_atts(
            array('id' => '', 'detail_url' => ''),
            is_array($atts) ? $atts : array(),
            'fides_use_case_spotlight'
        );
        if (! Fides_Use_Case_Design::available()) {
            return '';
        }
        $item = Fides_Use_Case_Design::find(trim((string) $atts['id']));
        if ($item === null) {
            return current_user_can('manage_options') ? '<!-- fides_use_case_spotlight: use case not in the published catalog -->' : '';
        }

        wp_enqueue_style('fides-use-case-spotlight');
        if (class_exists('FIDES_Community_Tools_Tiles')) {
            FIDES_Community_Tools_Tiles::register_design_system_assets();
            wp_enqueue_style('fides-design-system');
        }

        $id       = (string) $item['id'];
        $title    = (string) ($item['title'] ?? $id);
        $detail   = Fides_Use_Case_Design::detail_url($id, (string) $atts['detail_url']);
        $image    = Fides_Use_Case_Design::image_url($item);
        $preview  = self::preview($item);
        // Demo label plus the catalog's own status; the status is never rewritten.
        $kicker   = implode(' · ', array_filter(array('Demo use case', Fides_Use_Case_Design::kicker($item), Fides_Use_Case_Design::status_label($item))));
        $links    = self::relation_links($item, $detail);

        $html  = '<section class="fides-ds fides-uc-spot" aria-labelledby="fides-uc-spot-title"><div class="fides-uc-spot__inner">';
        $html .= '<div class="fides-uc-spot__head"><div><p class="fides-uc-spot__eyebrow">' . esc_html__('Explore in practice', 'fides-use-case-catalog') . '</p>'
            . '<h2 class="fides-uc-spot__title" id="fides-uc-spot-title">' . esc_html__('One use case. A connected ecosystem.', 'fides-use-case-catalog') . '</h2></div></div>';
        $html .= '<article class="fides-uc-spot__case' . ($image === '' ? ' fides-uc-spot__case--no-media' : '') . '" data-use-case-id="' . esc_attr($id) . '">';
        if ($image !== '') {
            $html .= '<a class="fides-uc-spot__media" href="' . esc_url($detail) . '" tabindex="-1" aria-hidden="true"><img src="' . esc_url($image) . '" alt="" loading="lazy" decoding="async"></a>';
        }
        $html .= '<div class="fides-uc-spot__text"><p class="fides-uc-spot__kicker">' . esc_html($kicker) . '</p>'
            . '<h3 class="fides-uc-spot__case-title">' . esc_html($title) . '</h3>';
        if ($preview !== '') {
            $html .= '<p class="fides-uc-spot__preview">' . esc_html($preview) . '</p>';
        }
        $html .= '<a class="fides-uc-spot__link" href="' . esc_url($detail) . '" aria-label="' . esc_attr('Read the use case: ' . $title) . '">' . esc_html__('Read the use case', 'fides-use-case-catalog') . '<span class="fides-uc-spot__arrow" aria-hidden="true">→</span></a></div>';
        if ($links) {
            $html .= '<nav class="fides-uc-spot__relations" aria-label="' . esc_attr__('Connected to this use case', 'fides-use-case-catalog') . '"><ul class="fides-uc-spot__relation-list">';
            foreach ($links as $link) {
                $html .= '<li><a class="fides-uc-spot__relation" data-relation="' . esc_attr($link['key']) . '" href="' . esc_url($link['url']) . '">'
                    . '<span class="fides-uc-spot__name">' . esc_html($link['label']) . '</span> <data class="fides-uc-spot__count" value="' . esc_attr((string) $link['total']) . '">' . esc_html((string) $link['total']) . '</data>'
                    . '<span class="fides-uc-spot__arrow" aria-hidden="true">→</span></a></li>';
            }
            $html .= '</ul></nav>';
        }
        return $html . '</article></div></section>';
    }
}
