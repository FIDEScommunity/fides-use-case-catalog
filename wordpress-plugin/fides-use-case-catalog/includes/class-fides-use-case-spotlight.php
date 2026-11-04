<?php
/**
 * [fides_use_case_spotlight] — homepage block "One use case. A connected ecosystem." (design pilot).
 *
 * Shows one published use case from the catalog (image, kicker, title, status)
 * with a short editorial explanation, plus at most two catalog items that the
 * record links explicitly: one organization and one business wallet. A related
 * item is left out when the record does not link it, the catalog has no
 * record for it, or no detail page can be built. Nothing about the use case is
 * copied into the page; only the id and the editorial sentence are stored.
 *
 * Attributes:
 *  - id         Catalog id of the use case (required).
 *  - intro      One or two plain-language sentences (editorial; optional).
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

    /**
     * Linked rows (with a catalog reference) of one relation list in the record.
     *
     * @param array<string, mixed> $item
     * @return list<string> reference ids in record order
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
     * Organization the record links explicitly; the owner of the use case wins.
     *
     * @param array<string, mixed> $item
     * @return array{label:string,name:string,logo:string,meta:string,href:string,link:string}|null
     */
    public static function related_organization(array $item): ?array {
        if (! class_exists('Fides_Organization_Design')) {
            return null;
        }
        $owner   = strtolower(trim((string) ($item['organizationName'] ?? '')));
        $matches = array();
        $others  = array();
        foreach (self::linked_refs($item, 'organizations') as $ref) {
            $org = Fides_Organization_Design::find($ref);
            if ($org === null) {
                continue;
            }
            if ($owner !== '' && strtolower(trim((string) $org['name'])) === $owner) {
                $matches[] = $org;
            } else {
                $others[] = $org;
            }
        }
        $org = $matches[0] ?? $others[0] ?? null;
        if ($org === null) {
            return null;
        }
        $href = Fides_Use_Case_Design::organization_profile_href((string) $org['id']);
        if ($href === '') {
            return null;
        }
        $sector = '';
        if (! empty($org['sectors'][0]) && is_string($org['sectors'][0])) {
            $sector = ucfirst(str_replace(array('_', '-'), ' ', $org['sectors'][0]));
        }
        return array(
            'label' => 'Organization',
            'name'  => (string) $org['name'],
            'logo'  => (string) ($org['logoUri'] ?? ''),
            'meta'  => implode(' · ', array_filter(array(Fides_Use_Case_Design::country_label($org), $sector))),
            'href'  => $href,
            'link'  => 'View organization →',
        );
    }

    /**
     * Business wallet the record links explicitly. A wallet provided by one of
     * the linked organizations comes first.
     *
     * @param array<string, mixed> $item
     * @return array{label:string,name:string,logo:string,meta:string,href:string,link:string}|null
     */
    public static function related_wallet(array $item): ?array {
        if (! class_exists('Fides_Wallet_Design')) {
            return null;
        }
        $org_refs = self::linked_refs($item, 'organizations');
        $first    = null;
        $provided = null;
        foreach (self::linked_refs($item, 'businessWallets') as $ref) {
            $wallet = Fides_Wallet_Design::find($ref);
            if ($wallet === null || strtolower((string) ($wallet['type'] ?? '')) !== 'organizational') {
                continue;
            }
            $first = $first ?? $wallet;
            if ($provided === null && ! empty($wallet['orgId']) && in_array((string) $wallet['orgId'], $org_refs, true)) {
                $provided = $wallet;
            }
        }
        $wallet = $provided ?? $first;
        if ($wallet === null) {
            return null;
        }
        $href = Fides_Wallet_Design::detail_url((string) $wallet['id'], Fides_Wallet_Design::pilot_detail_base());
        if ($href === '') {
            return null;
        }
        $parts = method_exists('Fides_Wallet_Design', 'capability_labels') ? Fides_Wallet_Design::capability_labels($wallet) : array();
        foreach ((array) ($wallet['platforms'] ?? array()) as $platform) {
            if (is_string($platform) && $platform !== '') {
                $parts[] = $platform;
            }
        }
        return array(
            'label' => 'Business wallet',
            'name'  => (string) $wallet['name'],
            'logo'  => (string) ($wallet['logo'] ?? ''),
            'meta'  => implode(' · ', array_unique(array_map('strval', $parts))),
            'href'  => $href,
            'link'  => 'View wallet →',
        );
    }

    /** @param array{label:string,name:string,logo:string,meta:string,href:string,link:string} $rel */
    private static function related_html(array $rel): string {
        $initial = function_exists('mb_substr') ? mb_substr($rel['name'], 0, 1) : substr($rel['name'], 0, 1);
        $logo    = $rel['logo'] !== ''
            ? '<img class="fides-uc-spot__logo-img" src="' . esc_url($rel['logo']) . '" alt="" width="64" height="64" loading="lazy" decoding="async">'
            : '<span class="fides-uc-spot__logo-fallback" aria-hidden="true">' . esc_html(strtoupper($initial)) . '</span>';
        return '<li class="fides-uc-spot__related-item">'
            . '<p class="fides-uc-spot__label">' . esc_html($rel['label']) . '</p>'
            . '<div class="fides-uc-spot__entity"><span class="fides-uc-spot__logo">' . $logo . '</span>'
            . '<h3 class="fides-uc-spot__entity-name">' . esc_html($rel['name']) . '</h3></div>'
            . ($rel['meta'] !== '' ? '<p class="fides-uc-spot__meta">' . esc_html($rel['meta']) . '</p>' : '')
            . '<a class="fides-uc-spot__link" href="' . esc_url($rel['href']) . '" aria-label="' . esc_attr(rtrim($rel['link'], ' →') . ': ' . $rel['name']) . '"><span>' . esc_html($rel['link']) . '</span></a>'
            . '</li>';
    }

    /**
     * @param array<string, string>|string $atts
     */
    public static function shortcode($atts = array()): string {
        $atts = shortcode_atts(
            array('id' => '', 'intro' => '', 'detail_url' => '', 'catalog_url' => ''),
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
        // Demo label plus the catalog's own status; the status is never rewritten.
        $kicker   = implode(' · ', array_filter(array('Demo use case', Fides_Use_Case_Design::kicker($item), Fides_Use_Case_Design::status_label($item))));

        $related = array_values(array_filter(array(self::related_organization($item), self::related_wallet($item))));

        $html  = '<section class="fides-ds fides-uc-spot" aria-labelledby="fides-uc-spot-title"><div class="fides-uc-spot__inner">';
        $html .= '<div class="fides-uc-spot__head"><div><p class="fides-uc-spot__eyebrow">' . esc_html__('Explore in practice', 'fides-use-case-catalog') . '</p>'
            . '<h2 class="fides-uc-spot__title" id="fides-uc-spot-title">' . esc_html__('One use case. A connected ecosystem.', 'fides-use-case-catalog') . '</h2></div>'
            . '<a class="fides-uc-spot__link fides-uc-spot__link--head" href="' . esc_url($overview) . '"><span>' . esc_html__('Explore the catalog →', 'fides-use-case-catalog') . '</span></a></div>';
        $html .= '<div class="fides-uc-spot__body' . ($related ? '' : ' fides-uc-spot__body--single') . '"><article class="fides-uc-spot__case" data-use-case-id="' . esc_attr($id) . '">';
        if ($image !== '') {
            $html .= '<a class="fides-uc-spot__media" href="' . esc_url($detail) . '" tabindex="-1" aria-hidden="true"><img src="' . esc_url($image) . '" alt="" loading="lazy" decoding="async"></a>';
        }
        $html .= '<p class="fides-uc-spot__kicker">' . esc_html($kicker) . '</p>';
        $html .= '<h3 class="fides-uc-spot__case-title">' . esc_html($title) . '</h3>';
        if (trim((string) $atts['intro']) !== '') {
            $html .= '<p class="fides-uc-spot__intro">' . esc_html(trim((string) $atts['intro'])) . '</p>';
        }
        $html .= '<a class="fides-uc-spot__link" href="' . esc_url($detail) . '" aria-label="' . esc_attr('Read the use case: ' . $title) . '"><span>' . esc_html__('Read the use case →', 'fides-use-case-catalog') . '</span></a></article>';
        if ($related) {
            $html .= '<aside class="fides-uc-spot__related" aria-labelledby="fides-uc-spot-related"><h3 class="fides-uc-spot__related-title" id="fides-uc-spot-related">' . esc_html__('Connected to this use case', 'fides-use-case-catalog') . '</h3><ul class="fides-uc-spot__related-list">';
            foreach (array_slice($related, 0, 2) as $rel) {
                $html .= self::related_html($rel);
            }
            $html .= '</ul></aside>';
        }
        return $html . '</div></div></section>';
    }
}
