<?php
/**
 * [fides_use_case_spotlight] — homepage block "One use case. A connected ecosystem." (design pilot).
 *
 * Shows one published use case straight from its catalog record: title,
 * short preview of the description, image and status. Connected records come
 * from the explicit links of the record only, grouped as Organizations and
 * Business wallets. Each group shows the number of unique linked records that
 * exist in the catalog, at most two names, and a "View all N" link to the
 * matching section of the use case page when there are more. Empty groups are
 * left out. Only the id is stored in the page.
 *
 * Attributes:
 *  - id         Catalog id of the use case (required).
 *  - detail_url Use case detail page base; default is the canonical share URL.
 *  - catalog_url Overview URL; default comes from the site shell.
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
     * Unique reference ids of one relation list in the record (record order).
     *
     * @param array<string, mixed> $item
     * @return list<string>
     */
    private static function linked_refs(array $item, string $key): array {
        $links = isset($item['links']) && is_array($item['links']) ? $item['links'] : array();
        $rows  = isset($links[ $key ]) && is_array($links[ $key ]) ? $links[ $key ] : array();
        $refs  = array();
        foreach ($rows as $row) {
            $ref = is_array($row) ? trim((string) ($row['refId'] ?? '')) : '';
            if ($ref !== '' && ! in_array($ref, $refs, true)) {
                $refs[] = $ref;
            }
        }
        return $refs;
    }

    /**
     * Short plain-text preview of the catalog description: the first line,
     * without a leading "Use Case:" label, cut at a word boundary.
     *
     * @param array<string, mixed> $item
     */
    public static function preview(array $item): string {
        $lines = preg_split('/\R/u', trim((string) ($item['summary'] ?? '')));
        $text  = '';
        foreach ((array) $lines as $line) {
            $line = trim((string) $line);
            if ($line !== '') {
                $text = $line;
                break;
            }
        }
        $text = trim((string) preg_replace('/^use case\s*:\s*/iu', '', $text));
        $len  = function_exists('mb_strlen') ? mb_strlen($text) : strlen($text);
        if ($len <= self::PREVIEW_LENGTH) {
            return $text;
        }
        $cut = function_exists('mb_substr') ? mb_substr($text, 0, self::PREVIEW_LENGTH) : substr($text, 0, self::PREVIEW_LENGTH);
        $pos = strrpos($cut, ' ');
        if ($pos !== false && $pos > 80) {
            $cut = substr($cut, 0, $pos);
        }
        return rtrim($cut, " ,;:.-") . '…';
    }

    /**
     * Organizations the record links explicitly, resolved in the catalog. The
     * owner of the use case comes first.
     *
     * @param array<string, mixed> $item
     * @return list<array{name:string,href:string}>
     */
    private static function organizations(array $item): array {
        if (! class_exists('Fides_Organization_Design')) {
            return array();
        }
        $owner = strtolower(trim((string) ($item['organizationName'] ?? '')));
        $first = array();
        $rest  = array();
        foreach (self::linked_refs($item, 'organizations') as $ref) {
            $org = Fides_Organization_Design::find($ref);
            if ($org === null) {
                continue;
            }
            $href = Fides_Use_Case_Design::organization_profile_href((string) $org['id'], 'usecase:' . (string) $item['id']);
            if ($href === '') {
                continue;
            }
            $row = array('name' => (string) $org['name'], 'href' => $href);
            if ($owner !== '' && strtolower(trim($row['name'])) === $owner) {
                $first[] = $row;
            } else {
                $rest[] = $row;
            }
        }
        return array_merge($first, $rest);
    }

    /**
     * Business wallets the record links explicitly, resolved in the catalog.
     * A wallet provided by one of the linked organizations comes first.
     *
     * @param array<string, mixed> $item
     * @return list<array{name:string,href:string}>
     */
    private static function wallets(array $item): array {
        if (! class_exists('Fides_Wallet_Design')) {
            return array();
        }
        $org_refs = self::linked_refs($item, 'organizations');
        $first    = array();
        $rest     = array();
        foreach (self::linked_refs($item, 'businessWallets') as $ref) {
            $wallet = Fides_Wallet_Design::find($ref);
            if ($wallet === null) {
                continue;
            }
            $href = Fides_Wallet_Design::detail_url((string) $wallet['id'], Fides_Wallet_Design::pilot_detail_base());
            if ($href === '') {
                continue;
            }
            $row = array('name' => (string) $wallet['name'], 'href' => $href);
            if (! empty($wallet['orgId']) && in_array((string) $wallet['orgId'], $org_refs, true)) {
                $first[] = $row;
            } else {
                $rest[] = $row;
            }
        }
        return array_merge($first, $rest);
    }

    /**
     * Connected groups for the block; empty groups are omitted. "total" counts
     * every unique linked catalog record, "names" holds at most two.
     *
     * @param array<string, mixed> $item
     * @return list<array{key:string,label:string,noun:string,total:int,names:list<array{name:string,href:string}>,all_url:string}>
     */
    public static function relation_groups(array $item, string $detail_url): array {
        $defs = array(
            array('organizations', 'Organizations', 'organizations', self::organizations($item), '#organisations'),
            array('businessWallets', 'Business wallets', 'business wallets', self::wallets($item), '#ecosystem-businesswallets'),
        );
        $groups = array();
        foreach ($defs as [$key, $label, $noun, $rows, $anchor]) {
            if (! $rows) {
                continue;
            }
            $groups[] = array(
                'key'     => $key,
                'label'   => $label,
                'noun'    => $noun,
                'total'   => count($rows),
                'names'   => array_slice($rows, 0, 2),
                'all_url' => $detail_url . $anchor,
            );
        }
        return $groups;
    }

    /** @param array{key:string,label:string,noun:string,total:int,names:list<array{name:string,href:string}>,all_url:string} $group */
    private static function group_html(array $group, string $title): string {
        $id   = 'fides-uc-spot-' . strtolower($group['key']);
        $html = '<section class="fides-uc-spot__group" data-group="' . esc_attr($group['key']) . '" aria-labelledby="' . esc_attr($id) . '">'
            . '<h3 class="fides-uc-spot__group-title" id="' . esc_attr($id) . '">' . esc_html($group['label'])
            . ' <span class="fides-uc-spot__group-count">' . esc_html((string) $group['total']) . '</span></h3><ul class="fides-uc-spot__names">';
        foreach ($group['names'] as $row) {
            $html .= '<li><a href="' . esc_url($row['href']) . '">' . esc_html($row['name']) . '</a></li>';
        }
        $html .= '</ul>';
        if ($group['total'] > count($group['names'])) {
            $html .= '<a class="fides-uc-spot__all" href="' . esc_url($group['all_url']) . '" aria-label="' . esc_attr('View all ' . $group['total'] . ' ' . $group['noun'] . ': ' . $title) . '">'
                . esc_html('View all ' . $group['total'] . ' ' . $group['noun']) . '<span class="fides-uc-spot__arrow" aria-hidden="true">→</span></a>';
        }
        return $html . '</section>';
    }

    /**
     * @param array<string, string>|string $atts
     */
    public static function shortcode($atts = array()): string {
        $atts = shortcode_atts(
            array('id' => '', 'detail_url' => '', 'catalog_url' => ''),
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
        $overview = Fides_Use_Case_Discovery_Shortcode::overview_url((string) $atts['catalog_url']);
        $preview  = self::preview($item);
        // Demo label plus the catalog's own status; the status is never rewritten.
        $kicker   = implode(' · ', array_filter(array('Demo use case', Fides_Use_Case_Design::kicker($item), Fides_Use_Case_Design::status_label($item))));
        $groups   = self::relation_groups($item, $detail);

        $html  = '<section class="fides-ds fides-uc-spot" aria-labelledby="fides-uc-spot-title"><div class="fides-uc-spot__inner">';
        $html .= '<div class="fides-uc-spot__head"><div><p class="fides-uc-spot__eyebrow">' . esc_html__('Explore in practice', 'fides-use-case-catalog') . '</p>'
            . '<h2 class="fides-uc-spot__title" id="fides-uc-spot-title">' . esc_html__('One use case. A connected ecosystem.', 'fides-use-case-catalog') . '</h2></div>'
            . '<a class="fides-uc-spot__link fides-uc-spot__link--head" href="' . esc_url($overview) . '">' . esc_html__('Explore the catalog', 'fides-use-case-catalog') . '<span class="fides-uc-spot__arrow" aria-hidden="true">→</span></a></div>';
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
        if ($groups) {
            $html .= '<div class="fides-uc-spot__related">';
            foreach ($groups as $group) {
                $html .= self::group_html($group, $title);
            }
            $html .= '</div>';
        }
        return $html . '</article></div></section>';
    }
}
