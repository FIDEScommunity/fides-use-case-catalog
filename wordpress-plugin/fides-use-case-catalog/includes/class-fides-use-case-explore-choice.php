<?php
/**
 * Explore by theme / Explore by sector (Paper "Explore · Themes" and "Explore · Sectors").
 *
 * One page per dimension. The choices are always visible as real links (`?theme=<bundle>` or `?sector=<sector>`),
 * the chosen overview is rendered on the same page on the server, and the script only swaps that region without a
 * page load. Everything shown comes from existing catalog data:
 *  - use cases: published records whose theme bundle (`themes`, bundle map in data/use-case-theme-map.json) or
 *    sector (`sector`, `sectors`) equals the choice;
 *  - credential types, organisations and wallets: only the explicit links of the use cases that are shown on the page
 *    (`links.credentials`, `links.organizations`, `links.personalWallets`, `links.businessWallets`), each row says which
 *    example it comes from. Nothing is inferred and no counts are invented.
 *
 * Introduction and image per choice live in one WordPress page each (title = heading, content = introduction,
 * featured image = image), marked with the post meta below by create-explore-pages.sh. A direct visit of such a
 * page is redirected to the choice URL.
 *
 * Shortcode: [fides_explore_choice kind="theme|sector" overview_url="/…/overview/" detail_url="/…/use-case/"]
 */

if (! defined('ABSPATH')) {
    exit;
}

final class Fides_Use_Case_Explore_Choice {

    public const META          = '_fides_explore_choice';
    public const STYLE_HANDLE  = 'fides-use-case-explore-choice';
    public const SCRIPT_HANDLE = 'fides-use-case-explore-choice';

    /** Maximum number of use case cards; the relations below are derived from exactly these cards. */
    public const CARD_LIMIT = 4;
    /** Maximum rows per relation list; the rest is reported as a number. */
    public const LIST_LIMIT = 8;

    /** @var array<string, array<string, int>>|null kind => slug => page id */
    private static ?array $pages = null;

    public static function bootstrap(): void {
        add_shortcode('fides_explore_choice', array(__CLASS__, 'shortcode'));
        add_action('wp_enqueue_scripts', array(__CLASS__, 'register_assets'), 22);
        add_action('template_redirect', array(__CLASS__, 'redirect_content_page'), 5);
        add_action('edit_form_after_title', array(__CLASS__, 'editor_notice'));
        add_filter('document_title_parts', array(__CLASS__, 'filter_title_parts'), 20);
        add_filter('get_canonical_url', array(__CLASS__, 'filter_canonical_url'), 20, 2);
    }

    /** @return array<string, string> kind => query parameter */
    public static function kinds(): array {
        return array('theme' => 'theme', 'sector' => 'sector');
    }

    /**
     * The choices of a dimension in display order: slug => label.
     * Themes are the six bundles; sectors are the assignable sectors ("Other" is a submitter placeholder, never a choice).
     *
     * @return array<string, string>
     */
    public static function choices(string $kind): array {
        $out = array();
        if ($kind === 'theme') {
            $config = class_exists('Fides_Use_Case_Discovery_Shortcode') ? Fides_Use_Case_Discovery_Shortcode::theme_config() : array();
            foreach ($config['bundles'] ?? array() as $bundle) {
                $out[ (string) $bundle['code'] ] = (string) $bundle['title'];
            }
        } elseif ($kind === 'sector' && function_exists('fides_use_case_catalog_assignable_sectors')) {
            foreach (fides_use_case_catalog_assignable_sectors() as $slug => $label) {
                $out[ (string) $slug ] = (string) $label;
            }
        }
        return $out;
    }

    /**
     * Published use cases of one choice, ordered for display: in production first, then newest, then by title.
     *
     * @param array<int, array<string, mixed>> $items
     * @return list<array<string, mixed>>
     */
    public static function matching_items(string $kind, string $slug, array $items): array {
        $match = array();
        foreach ($items as $item) {
            if (! is_array($item) || empty($item['id']) || empty($item['title'])) {
                continue;
            }
            $codes = $kind === 'theme' ? Fides_Use_Case_Design::theme_bundle_codes($item) : Fides_Use_Case_Design::sector_codes($item);
            if (in_array($slug, $codes, true)) {
                $match[] = $item;
            }
        }
        usort(
            $match,
            static function (array $a, array $b): int {
                $pa = strtolower(trim((string) ($a['productionDeployment'] ?? ''))) === 'yes' ? 0 : 1;
                $pb = strtolower(trim((string) ($b['productionDeployment'] ?? ''))) === 'yes' ? 0 : 1;
                if ($pa !== $pb) {
                    return $pa <=> $pb;
                }
                $da = (string) ($a['publishedAt'] ?? $a['updatedAt'] ?? '');
                $db = (string) ($b['publishedAt'] ?? $b['updatedAt'] ?? '');
                if ($da !== $db) {
                    return strcmp($db, $da);
                }
                return strcasecmp((string) $a['title'], (string) $b['title']);
            }
        );
        return $match;
    }

    /**
     * Relations of the shown use cases only. Every row keeps the ids and titles of the use cases it comes from.
     *
     * @param list<array<string, mixed>> $shown
     * @return array{credentials: list<array<string, mixed>>, organizations: list<array<string, mixed>>, wallets: list<array<string, mixed>>}
     */
    public static function relations(array $shown): array {
        $keys = array(
            'credentials'     => 'credentials',
            'organizations'   => 'organizations',
            'personalWallets' => 'wallets',
            'businessWallets' => 'wallets',
        );
        $out  = array('credentials' => array(), 'organizations' => array(), 'wallets' => array());
        $seen = array('credentials' => array(), 'organizations' => array(), 'wallets' => array());
        foreach ($shown as $item) {
            $groups = Fides_Use_Case_Detail_Page::relation_groups($item);
            foreach ($keys as $link_key => $bucket) {
                foreach ($groups[ $link_key ]['items'] ?? array() as $row) {
                    $id = strtolower($row['label']) . '|' . $row['href'] . '|' . ($bucket === 'wallets' ? $link_key : '');
                    if (! isset($seen[ $bucket ][ $id ])) {
                        $seen[ $bucket ][ $id ] = count($out[ $bucket ]);
                        $out[ $bucket ][]       = $row + array(
                            'kind'      => $link_key,
                            'use_cases' => array(),
                        );
                    }
                    $index = $seen[ $bucket ][ $id ];
                    $out[ $bucket ][ $index ]['use_cases'][ (string) $item['id'] ] = (string) $item['title'];
                }
            }
        }
        foreach ($out as $bucket => $rows) {
            // Rows that appear in most examples first, then by name.
            usort(
                $rows,
                static function (array $a, array $b): int {
                    $c = count($b['use_cases']) <=> count($a['use_cases']);
                    return $c !== 0 ? $c : strcasecmp((string) $a['label'], (string) $b['label']);
                }
            );
            $out[ $bucket ] = $rows;
        }
        return $out;
    }

    /**
     * Everything one choice shows, as data (used by the page and by the behaviour test).
     *
     * @param array<int, array<string, mixed>> $items
     * @return array{matching: int, shown: list<array<string, mixed>>, relations: array<string, list<array<string, mixed>>>}
     */
    public static function selection(string $kind, string $slug, array $items): array {
        $matching = self::matching_items($kind, $slug, $items);
        $shown    = array_slice($matching, 0, (int) apply_filters('fides_explore_choice_card_limit', self::CARD_LIMIT));
        return array(
            'matching'  => count($matching),
            'shown'     => $shown,
            'relations' => self::relations($shown),
        );
    }

    /** @return array<string, int> slug => page id of the editorial pages of one kind */
    public static function content_pages(string $kind): array {
        if (self::$pages === null) {
            self::$pages = array('theme' => array(), 'sector' => array());
            $ids = get_posts(
                array(
                    'post_type'      => 'page',
                    'post_status'    => 'publish',
                    'numberposts'    => -1,
                    'meta_key'       => self::META, // phpcs:ignore WordPress.DB.SlowDBQuery
                    'fields'         => 'ids',
                    'no_found_rows'  => true,
                    'suppress_filters' => true,
                )
            );
            foreach ($ids as $id) {
                $value = (string) get_post_meta((int) $id, self::META, true);
                if (strpos($value, ':') === false) {
                    continue;
                }
                list($k, $slug) = explode(':', $value, 2);
                if (isset(self::$pages[ $k ]) && $slug !== '') {
                    self::$pages[ $k ][ $slug ] = (int) $id;
                }
            }
        }
        return self::$pages[ $kind ] ?? array();
    }

    /**
     * Heading, introduction (HTML) and image (HTML) of a choice. The introduction is the page content; without an
     * editorial page a theme falls back to the bundle description from the theme map and a sector has none.
     *
     * @return array{title: string, intro: string, image: string}
     */
    public static function editorial(string $kind, string $slug, string $label): array {
        $out   = array('title' => $label, 'intro' => '', 'image' => '');
        $pages = self::content_pages($kind);
        if (isset($pages[ $slug ])) {
            $post = get_post($pages[ $slug ]);
            if ($post instanceof WP_Post) {
                $title = trim((string) $post->post_title);
                if ($title !== '') {
                    $out['title'] = $title;
                }
                $content = trim((string) $post->post_content);
                if ($content !== '') {
                    $out['intro'] = (string) apply_filters('the_content', $content);
                }
                if (has_post_thumbnail($post)) {
                    $out['image'] = (string) get_the_post_thumbnail($post, 'large', array('class' => 'fides-explore__img', 'loading' => 'eager', 'decoding' => 'async'));
                }
            }
        }
        if ($out['intro'] === '' && $kind === 'theme') {
            $config = Fides_Use_Case_Discovery_Shortcode::theme_config();
            foreach ($config['bundles'] ?? array() as $bundle) {
                if ((string) $bundle['code'] === $slug && (string) $bundle['description'] !== '') {
                    $out['intro'] = '<p>' . esc_html((string) $bundle['description']) . '.</p>';
                }
            }
        }
        return $out;
    }

    public static function register_assets(): void {
        $css = FIDES_USE_CASE_CATALOG_PATH . 'assets/explore-choice.css';
        $js  = FIDES_USE_CASE_CATALOG_PATH . 'assets/explore-choice.js';
        wp_register_style(
            self::STYLE_HANDLE,
            FIDES_USE_CASE_CATALOG_URL . 'assets/explore-choice.css',
            wp_style_is('fides-design-system', 'registered') ? array('fides-design-system') : array(),
            file_exists($css) ? (string) filemtime($css) : FIDES_USE_CASE_CATALOG_VERSION
        );
        wp_register_script(
            self::SCRIPT_HANDLE,
            FIDES_USE_CASE_CATALOG_URL . 'assets/explore-choice.js',
            array(),
            file_exists($js) ? (string) filemtime($js) : FIDES_USE_CASE_CATALOG_VERSION,
            true
        );
        if (is_singular()) {
            $post = get_post();
            if ($post instanceof WP_Post && has_shortcode((string) $post->post_content, 'fides_explore_choice')) {
                self::enqueue();
            }
        }
    }

    public static function enqueue(): void {
        if (class_exists('Fides_Use_Case_Design')) {
            Fides_Use_Case_Design::enqueue();
        }
        wp_enqueue_style(self::STYLE_HANDLE);
        wp_enqueue_script(self::SCRIPT_HANDLE);
    }

    /** The requested choice for a kind: slug, or '' (none); `invalid` carries the unknown slug for the notice. */
    private static function requested(string $kind, array $choices): array {
        $param = self::kinds()[ $kind ];
        // phpcs:ignore WordPress.Security.NonceVerification -- read-only filter parameter
        $raw   = isset($_GET[ $param ]) && is_string($_GET[ $param ]) ? sanitize_text_field(wp_unslash($_GET[ $param ])) : '';
        if ($raw === '') {
            return array('slug' => '', 'invalid' => '');
        }
        return isset($choices[ $raw ]) ? array('slug' => $raw, 'invalid' => '') : array('slug' => '', 'invalid' => $raw);
    }

    /** The page URL without any choice parameter. */
    private static function page_url(): string {
        $post = get_post();
        $url  = $post instanceof WP_Post ? (string) get_permalink($post) : '';
        return $url !== '' ? $url : home_url('/');
    }

    /** @param array<string, string>|string $atts */
    public static function shortcode($atts = array()): string {
        $atts = shortcode_atts(
            array(
                'kind'         => 'theme',
                'overview_url' => '',
                'detail_url'   => '',
            ),
            is_array($atts) ? $atts : array(),
            'fides_explore_choice'
        );
        $kind = $atts['kind'] === 'sector' ? 'sector' : 'theme';
        if (! class_exists('Fides_Use_Case_Design') || ! Fides_Use_Case_Design::available()) {
            return '';
        }
        self::enqueue();

        $choices  = self::choices($kind);
        $req      = self::requested($kind, $choices);
        $slug     = $req['slug'];
        $overview = Fides_Use_Case_Design::local_url((string) $atts['overview_url']);
        if ($overview === '') {
            $overview = home_url(function_exists('fides_use_case_catalog_listing_path') ? fides_use_case_catalog_listing_path() : '/use-cases/');
        }
        $detail_base = (string) $atts['detail_url'];
        $items       = Fides_Use_Case_Design::items();
        $words       = self::words($kind);
        $param       = self::kinds()[ $kind ];
        $base_url    = self::page_url();

        ob_start();
        ?>
<div class="fides-ds fides-explore" data-fides-explore="<?php echo esc_attr($kind); ?>" data-param="<?php echo esc_attr($param); ?>" data-selected="<?php echo esc_attr($slug); ?>">
  <div class="fides-ds-page fides-explore__page">
    <header class="fides-explore__head">
      <p class="fides-explore__crumb"><?php echo esc_html('Explore / ' . $words['plural']); ?></p>
      <h1 class="fides-ds-heading-1 fides-explore__title"><?php echo esc_html($words['title']); ?></h1>
      <p class="fides-explore__lead"><?php echo esc_html($words['lead']); ?></p>
      <?php if ($req['invalid'] !== '') : ?>
        <p class="fides-explore__notice fides-explore__notice--invalid" role="status" data-fides-explore-notice><?php echo esc_html(sprintf($kind === 'sector' ? __('“%s” is not a sector we know. Choose one of the options below.', 'fides-use-case-catalog') : __('“%s” is not a theme we know. Choose one of the options below.', 'fides-use-case-catalog'), $req['invalid'])); ?></p>
      <?php endif; ?>
      <nav class="fides-explore__choices" aria-labelledby="fides-explore-choices-label" data-fides-explore-choices>
        <p class="fides-explore__choices-label" id="fides-explore-choices-label"><?php echo esc_html('Choose a ' . strtolower($words['singular'])); ?></p>
        <ul class="fides-explore__choice-list fides-explore__choice-list--<?php echo esc_attr($kind); ?>">
          <?php foreach ($choices as $choice_slug => $choice_label) :
              $current = $choice_slug === $slug;
              ?>
            <li>
              <a class="fides-explore__choice<?php echo $current ? ' is-current' : ''; ?>" href="<?php echo esc_url(add_query_arg($param, $choice_slug, $base_url)); ?>" data-choice="<?php echo esc_attr($choice_slug); ?>"<?php echo $current ? ' aria-current="true"' : ''; ?>>
                <span><?php echo esc_html($choice_label); ?></span><?php if ($current) : ?><span class="fides-explore__check" aria-hidden="true"> ✓</span><span class="fides-ds-visually-hidden"> (selected)</span><?php endif; ?>
              </a>
            </li>
          <?php endforeach; ?>
        </ul>
      </nav>
    </header>

    <div class="fides-explore__result" data-fides-explore-result>
      <?php
      if ($slug === '') {
          echo self::intro_state_html($words); // phpcs:ignore WordPress.Security.EscapeOutput
      } else {
          echo self::selected_html($kind, $slug, $choices[ $slug ], $items, $overview, $detail_base, $words); // phpcs:ignore WordPress.Security.EscapeOutput
      }
      ?>
    </div>
  </div>
</div>
        <?php
        return (string) ob_get_clean();
    }

    /** @return array<string, string> */
    private static function words(string $kind): array {
        if ($kind === 'sector') {
            return array(
                'singular' => 'Sector',
                'plural'   => 'Sectors',
                'title'    => 'Explore by sector',
                'lead'     => 'Choose a sector to see how digital trust is used, with examples and related organisations.',
                'empty'    => 'Choose a sector to get started',
                'again'    => 'Choose another sector',
            );
        }
        return array(
            'singular' => 'Theme',
            'plural'   => 'Themes',
            'title'    => 'Explore by theme',
            'lead'     => 'Choose a theme to explore use cases, credential types and organisations across sectors.',
            'empty'    => 'Choose a theme to get started',
            'again'    => 'Choose another theme',
        );
    }

    /** @param array<string, string> $words */
    private static function intro_state_html(array $words): string {
        return '<section class="fides-explore__start" aria-labelledby="fides-explore-start-title" data-fides-explore-state="none">'
            . '<h2 class="fides-explore__start-title" id="fides-explore-start-title" tabindex="-1">' . esc_html($words['empty']) . '</h2>'
            . '<p>You’ll see an introduction, use cases and related credential types and organisations here.</p>'
            . '</section>';
    }

    /**
     * @param array<int, array<string, mixed>> $items
     * @param array<string, string>            $words
     */
    private static function selected_html(string $kind, string $slug, string $label, array $items, string $overview, string $detail_base, array $words): string {
        $param     = self::kinds()[ $kind ];
        $editorial = self::editorial($kind, $slug, $label);
        $selection = self::selection($kind, $slug, $items);
        $rel       = $selection['relations'];
        $all_url   = add_query_arg($param, $slug, $overview);
        $matching  = $selection['matching'];
        $shown     = $selection['shown'];

        $sections = array();
        if ($shown) {
            $sections['explore-use-cases'] = 'Use cases';
            if ($rel['credentials']) {
                $sections['explore-credentials'] = 'Credential types';
            }
            if ($rel['organizations']) {
                $sections['explore-organisations'] = 'Organisations';
            }
            if ($rel['wallets']) {
                $sections['explore-wallets'] = 'Wallets';
            }
        }

        $html  = '<section class="fides-explore__selected" aria-labelledby="fides-explore-selected-title" data-fides-explore-state="selected" data-fides-explore-title="' . esc_attr($editorial['title'] . ' · ' . $words['title']) . '">';
        $html .= '<div class="fides-explore__hero' . ($editorial['image'] === '' ? ' fides-explore__hero--no-image' : '') . '">';
        $html .= '<div class="fides-explore__hero-text"><h2 class="fides-explore__selected-title" id="fides-explore-selected-title" tabindex="-1">' . esc_html($editorial['title']) . '</h2>';
        if ($editorial['intro'] !== '') {
            $html .= '<div class="fides-explore__intro">' . $editorial['intro'] . '</div>';
        }
        $html .= '</div>';
        if ($editorial['image'] !== '') {
            $html .= '<figure class="fides-explore__figure">' . $editorial['image'] . '</figure>';
        }
        $html .= '</div>';

        if (! $shown) {
            $html .= '<div class="fides-explore__empty" data-fides-explore-state="empty"><h3 class="fides-explore__empty-title">No examples yet</h3>'
                . '<p>' . esc_html__('The catalog has no published use case here yet.', 'fides-use-case-catalog') . '</p>'
                . '<p><a class="fides-ds-action-link" href="' . esc_url($overview) . '"><span>Browse all use cases</span> <span aria-hidden="true">→</span></a></p></div>';
            return $html . '</section>';
        }

        $html .= '<nav class="fides-explore__onpage" aria-label="On this page"><span class="fides-explore__onpage-label" aria-hidden="true">On this page</span><ul>';
        foreach ($sections as $anchor => $text) {
            $html .= '<li><a href="#' . esc_attr($anchor) . '">' . esc_html($text) . '</a></li>';
        }
        $html .= '</ul></nav>';

        // Use cases.
        $html .= '<section class="fides-explore__section" id="explore-use-cases" aria-labelledby="explore-use-cases-title">';
        $html .= '<div class="fides-explore__section-head"><h2 class="fides-explore__h2" id="explore-use-cases-title">Selected use cases</h2>'
            . '<a class="fides-ds-action-link" href="' . esc_url($all_url) . '"><span>See all matching use cases</span> <span aria-hidden="true">→</span></a></div>';
        if ($matching > count($shown)) {
            $count_text = sprintf(__('Showing %1$d of %2$d use cases in the catalog.', 'fides-use-case-catalog'), count($shown), $matching);
        } elseif ($matching === 1) {
            $count_text = __('One use case in the catalog.', 'fides-use-case-catalog');
        } else {
            $count_text = sprintf(__('%d use cases in the catalog.', 'fides-use-case-catalog'), $matching);
        }
        $html .= '<p class="fides-explore__count">' . esc_html($count_text) . '</p>';
        $html .= '<ul class="fides-explore__cards">';
        foreach ($shown as $item) {
            $html .= '<li>' . self::card_html($item, $detail_base) . '</li>';
        }
        $html .= '</ul></section>';

        // Credential types and organisations side by side.
        if ($rel['credentials'] || $rel['organizations']) {
            $html .= '<div class="fides-explore__columns">';
            if ($rel['credentials']) {
                $html .= self::relation_section('explore-credentials', 'Credential types in these examples', $rel['credentials'], count($shown));
            }
            if ($rel['organizations']) {
                $html .= self::relation_section('explore-organisations', 'Organisations in these examples', $rel['organizations'], count($shown));
            }
            $html .= '</div>';
        }
        if ($rel['wallets']) {
            $html .= '<div class="fides-explore__columns fides-explore__columns--single">' . self::relation_section('explore-wallets', 'Wallets in these examples', $rel['wallets'], count($shown)) . '</div>';
        }

        $html .= '<p class="fides-explore__again"><a class="fides-ds-action-link" href="#fides-explore-choices-label"><span>' . esc_html($words['again']) . '</span> <span aria-hidden="true">↑</span></a></p>';
        return $html . '</section>';
    }

    /** @param array<string, mixed> $item */
    private static function card_html(array $item, string $detail_base): string {
        $id      = (string) $item['id'];
        $kicker  = Fides_Use_Case_Design::card_props($item, 'tile', $detail_base)['kicker'] ?? '';
        $summary = trim((string) preg_replace('/\s+/u', ' ', (string) ($item['summary'] ?? '')));
        if (function_exists('mb_strlen') && mb_strlen($summary) > 170) {
            $summary = rtrim((string) mb_substr($summary, 0, 170), " ,.;:") . '…';
        }
        return '<article class="fides-explore__card" data-use-case-id="' . esc_attr($id) . '">'
            . ($kicker !== '' ? '<p class="fides-explore__card-meta">' . esc_html((string) $kicker) . '</p>' : '')
            . '<h3 class="fides-explore__card-title"><a href="' . esc_url(Fides_Use_Case_Design::detail_url($id, $detail_base)) . '">' . esc_html((string) $item['title']) . ' <span aria-hidden="true">→</span></a></h3>'
            . ($summary !== '' ? '<p class="fides-explore__card-summary">' . esc_html($summary) . '</p>' : '')
            . '</article>';
    }

    /**
     * @param list<array<string, mixed>> $rows
     */
    private static function relation_section(string $anchor, string $heading, array $rows, int $shown_cases): string {
        $total = count($rows);
        $rows  = array_slice($rows, 0, (int) apply_filters('fides_explore_choice_list_limit', self::LIST_LIMIT));
        $html  = '<section class="fides-explore__section fides-explore__relations" id="' . esc_attr($anchor) . '" aria-labelledby="' . esc_attr($anchor . '-title') . '">'
            . '<h2 class="fides-explore__h2 fides-explore__h2--small" id="' . esc_attr($anchor . '-title') . '">' . esc_html($heading) . '</h2><ul class="fides-explore__list">';
        foreach ($rows as $row) {
            $name = $row['href'] !== ''
                ? '<a href="' . esc_url((string) $row['href']) . '"' . (! empty($row['external']) ? ' rel="noopener" target="_blank"' : '') . '>' . esc_html((string) $row['label'])
                    . (! empty($row['external']) ? ' <span aria-hidden="true">↗</span><span class="fides-ds-visually-hidden"> (external site, opens in a new tab)</span>' : ' <span aria-hidden="true">→</span>') . '</a>'
                : '<span class="fides-explore__plain-name">' . esc_html((string) $row['label']) . '</span>';
            $cases = array_values($row['use_cases']);
            $from  = count($cases) === 1
                ? sprintf(__('In “%s”', 'fides-use-case-catalog'), $cases[0])
                : sprintf(__('In %1$d of these %2$d examples', 'fides-use-case-catalog'), count($cases), $shown_cases);
            $type  = '';
            if ($row['kind'] === 'personalWallets') {
                $type = '<span class="fides-explore__row-type">Personal wallet</span> · ';
            } elseif ($row['kind'] === 'businessWallets') {
                $type = '<span class="fides-explore__row-type">Business wallet</span> · ';
            }
            $html .= '<li class="fides-explore__row"><span class="fides-explore__row-name">' . $name . '</span><span class="fides-explore__row-from">' . $type . esc_html($from) . '</span></li>';
        }
        $html .= '</ul>';
        if ($total > count($rows)) {
            $html .= '<p class="fides-explore__more">' . esc_html(sprintf(__('%d more listed in these examples. Open a use case to see them.', 'fides-use-case-catalog'), $total - count($rows))) . '</p>';
        }
        return $html . '</section>';
    }

    /** A visit to an editorial content page goes to the choice URL (the page only holds the text, title and image). */
    public static function redirect_content_page(): void {
        if (! is_singular('page') || is_preview() || is_customize_preview()) {
            return;
        }
        $id    = (int) get_queried_object_id();
        $value = $id > 0 ? (string) get_post_meta($id, self::META, true) : '';
        if ($value === '' || strpos($value, ':') === false) {
            return;
        }
        list($kind, $slug) = explode(':', $value, 2);
        $page = self::landing_page($kind);
        if ($page !== '') {
            wp_safe_redirect(add_query_arg(self::kinds()[ $kind ] ?? 'theme', $slug, $page), 302);
            exit;
        }
    }

    /** Permalink of the page that holds the shortcode of a kind. */
    private static function landing_page(string $kind): string {
        $pages = get_posts(
            array(
                'post_type'     => 'page',
                'post_status'   => 'publish',
                'numberposts'   => 1,
                's'             => '[fides_explore_choice kind="' . $kind . '"',
                'fields'        => 'ids',
                'no_found_rows' => true,
            )
        );
        return $pages ? (string) get_permalink((int) $pages[0]) : '';
    }

    public static function editor_notice(WP_Post $post): void {
        $value = (string) get_post_meta($post->ID, self::META, true);
        if ($post->post_type !== 'page' || $value === '' || strpos($value, ':') === false) {
            return;
        }
        list($kind, $slug) = explode(':', $value, 2);
        echo '<div class="notice notice-info inline"><p><strong>Explore ' . esc_html($kind === 'sector' ? 'sector' : 'theme') . ' text.</strong> '
            . 'The title is the heading, the content is the introduction and the featured image is the picture on '
            . esc_html($kind === 'sector' ? 'Explore by sector' : 'Explore by theme') . ' for “' . esc_html($slug) . '”. '
            . 'Use cases, credential types, organisations and wallets come from the catalog and are not edited here. '
            . 'Visitors who open this page are sent to the Explore page.</p></div>';
    }

    /**
     * @param array<string, string> $parts
     * @return array<string, string>
     */
    public static function filter_title_parts($parts) {
        $state = self::current_state();
        if ($state !== null && is_array($parts)) {
            $parts['title'] = $state['label'] . ' · ' . $state['words']['title'];
        }
        return $parts;
    }

    /** @param string $url @param WP_Post|null $post */
    public static function filter_canonical_url($url, $post = null) {
        $state = self::current_state($post);
        if ($state === null) {
            return $url;
        }
        return add_query_arg(self::kinds()[ $state['kind'] ], $state['slug'], (string) get_permalink($post));
    }

    /** @return array{kind:string,slug:string,label:string,words:array<string,string>}|null */
    private static function current_state($post = null): ?array {
        $post = $post instanceof WP_Post ? $post : get_post();
        if (! $post instanceof WP_Post || ! has_shortcode((string) $post->post_content, 'fides_explore_choice')) {
            return null;
        }
        $kind    = strpos((string) $post->post_content, 'kind="sector"') !== false ? 'sector' : 'theme';
        $choices = self::choices($kind);
        $req     = self::requested($kind, $choices);
        if ($req['slug'] === '') {
            return null;
        }
        $editorial = self::editorial($kind, $req['slug'], $choices[ $req['slug'] ]);
        return array('kind' => $kind, 'slug' => $req['slug'], 'label' => $editorial['title'], 'words' => self::words($kind));
    }
}
