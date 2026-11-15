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

    /** @var array<string, array<string, true>> record type => ids present in the catalog data of the pilot */
    private static array $record_ids = array();

    /** @var array<string, array<string, mixed>>|null organisation records by id (logo) */
    private static ?array $org_rows = null;

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

        // Editorial order: the featured ids that match this choice come first, in the order of the data file.
        $featured = self::featured_ids($kind, $slug);
        if ($featured) {
            $by_id = array();
            foreach ($match as $item) {
                $by_id[ (string) $item['id'] ] = $item;
            }
            $front = array();
            foreach ($featured as $id) {
                if (isset($by_id[ $id ])) {
                    $front[ $id ] = $by_id[ $id ];
                }
            }
            $rest  = array_filter($match, static fn (array $item): bool => ! isset($front[ (string) $item['id'] ]));
            $match = array_merge(array_values($front), array_values($rest));
        }
        return $match;
    }

    /**
     * Editorial order of one choice: use case ids from data/explore-featured-use-cases.json (key "<kind>:<slug>"),
     * adjustable with the filter `fides_explore_choice_featured`. Ids that are not published or do not match the choice are
     * ignored by the caller, so the file can only reorder what the catalog already matches.
     *
     * @return list<string>
     */
    public static function featured_ids(string $kind, string $slug): array {
        static $file = null;
        if ($file === null) {
            $file = array();
            $path = FIDES_USE_CASE_CATALOG_PATH . 'data/explore-featured-use-cases.json';
            if (is_readable($path)) {
                $decoded = json_decode((string) file_get_contents($path), true); // phpcs:ignore WordPress.WP.AlternativeFunctions
                if (is_array($decoded) && isset($decoded['featured']) && is_array($decoded['featured'])) {
                    $file = $decoded['featured'];
                }
            }
        }
        $ids = array();
        foreach ((array) ($file[ $kind . ':' . $slug ] ?? array()) as $id) {
            if (is_string($id) && $id !== '' && ! in_array($id, $ids, true)) {
                $ids[] = $id;
            }
        }
        $ids = apply_filters('fides_explore_choice_featured', $ids, $kind, $slug);
        return is_array($ids) ? array_values(array_filter($ids, 'is_string')) : array();
    }

    /**
     * Whether a catalog record exists in the data of the pilot, by type. This is how "has a catalog page" is decided:
     * the detail pages of the pilot (organization, wallet, credential) render the record that `find()` returns for the
     * same data, so an id that is in the set has a page and an id that is not in the set has none.
     *
     * @return array<string, true> ids of one record type
     */
    private static function record_ids(string $type): array {
        if (isset(self::$record_ids[ $type ])) {
            return self::$record_ids[ $type ];
        }
        $classes = array('organization' => 'Fides_Organization_Design', 'wallet' => 'Fides_Wallet_Design', 'credential' => 'Fides_Credential_Design');
        $ids     = array();
        $class   = $classes[ $type ] ?? '';
        if ($class !== '' && class_exists($class) && method_exists($class, 'items')) {
            foreach ((array) $class::items() as $row) {
                if (is_array($row) && ! empty($row['id'])) {
                    $ids[ (string) $row['id'] ] = true;
                }
            }
        }
        self::$record_ids[ $type ] = $ids;
        return $ids;
    }

    /** Organisation record (for the logo) by id, or null. */
    private static function organization_record(string $ref): ?array {
        if ($ref === '' || ! class_exists('Fides_Organization_Design') || ! isset(self::record_ids('organization')[ $ref ])) {
            return null;
        }
        if (self::$org_rows === null) {
            self::$org_rows = array();
            foreach ((array) Fides_Organization_Design::items() as $row) {
                if (is_array($row) && ! empty($row['id'])) {
                    self::$org_rows[ (string) $row['id'] ] = $row;
                }
            }
        }
        return self::$org_rows[ $ref ] ?? null;
    }

    /**
     * Detail page of a linked record, or '' when the pilot has no page for it ("listing only").
     * Only ids that exist in the catalog data of the pilot get a destination; names without a catalog id never link.
     */
    private static function detail_href(string $bucket, string $ref): string {
        if ($ref === '') {
            return '';
        }
        if ($bucket === 'organizations') {
            return isset(self::record_ids('organization')[ $ref ]) ? Fides_Use_Case_Design::organization_profile_href($ref) : '';
        }
        if ($bucket === 'credentials') {
            return isset(self::record_ids('credential')[ $ref ]) && class_exists('Fides_Credential_Design') ? Fides_Credential_Design::detail_url($ref) : '';
        }
        return isset(self::record_ids('wallet')[ $ref ]) && class_exists('Fides_Wallet_Design') ? Fides_Wallet_Design::detail_url($ref, Fides_Wallet_Design::pilot_detail_base()) : '';
    }

    private static function norm_name(string $name): string {
        $name = (string) preg_replace('/\s+/u', ' ', trim($name));
        return function_exists('mb_strtolower') ? mb_strtolower($name) : strtolower($name);
    }

    /**
     * Roles of organisations in one use case, only from its explicit links: listed under `issuers` = Issuer,
     * listed under `rps` = Relying Party. Matched to an organisation link of the SAME use case by catalog id or by the
     * same name; nothing is read from the organisation record and nothing is inferred.
     *
     * @param array<string, mixed> $links
     * @return array<string, list<string>> normalised name or "ref:<id>" => role labels
     */
    private static function case_roles(array $links): array {
        $labels = array('issuers' => 'Issuer', 'rps' => 'Relying Party');
        if (class_exists('Fides_Organization_Design')) {
            $labels['issuers'] = Fides_Organization_Design::ROLE_LABELS['issuer'] ?? $labels['issuers'];
            $labels['rps']     = Fides_Organization_Design::ROLE_LABELS['relying_party'] ?? $labels['rps'];
        }
        $out = array();
        foreach ($labels as $link_key => $role) {
            foreach ((array) ($links[ $link_key ] ?? array()) as $link) {
                if (! is_array($link)) {
                    continue;
                }
                $keys = array();
                if (trim((string) ($link['refId'] ?? '')) !== '') {
                    $keys[] = 'ref:' . trim((string) $link['refId']);
                }
                if (trim((string) ($link['labelRaw'] ?? '')) !== '') {
                    $keys[] = self::norm_name((string) $link['labelRaw']);
                }
                foreach ($keys as $key) {
                    if (! isset($out[ $key ]) || ! in_array($role, $out[ $key ], true)) {
                        $out[ $key ][] = $role;
                    }
                }
            }
        }
        return $out;
    }

    /**
     * Relations of the shown use cases only, each record ONCE per overview.
     *
     * A record is the same record when its catalog id is the same, or (when one of the links has no id) when the name is
     * the same after trimming and lower-casing. Every row keeps the use cases it comes from (id => title), the roles per
     * use case (organisations: Issuer / Relying Party from the `issuers` / `rps` links of that use case) and whether the pilot
     * has a detail page for it (`href` is '' for a listing only mention). Nothing else is added.
     *
     * @param list<array<string, mixed>> $shown
     * @return array{credentials: list<array<string, mixed>>, organizations: list<array<string, mixed>>, wallets: list<array<string, mixed>>}
     */
    public static function relations(array $shown): array {
        $map     = array(
            'credentials'     => 'credentials',
            'organizations'   => 'organizations',
            'personalWallets' => 'wallets',
            'businessWallets' => 'wallets',
        );
        $entries = array('credentials' => array(), 'organizations' => array(), 'wallets' => array());
        foreach ($shown as $item) {
            $links = isset($item['links']) && is_array($item['links']) ? $item['links'] : array();
            $roles = self::case_roles($links);
            foreach ($map as $link_key => $bucket) {
                foreach ((array) ($links[ $link_key ] ?? array()) as $link) {
                    if (! is_array($link)) {
                        continue;
                    }
                    $ref   = trim((string) ($link['refId'] ?? ''));
                    $ref   = ($ref !== '' && $bucket === 'credentials') ? Fides_Use_Case_Design::credential_canonical_id($ref) : $ref;
                    $label = trim((string) ($link['labelRaw'] ?? ''));
                    $label = $label !== '' ? $label : $ref;
                    if ($label === '') {
                        continue;
                    }
                    $found = array();
                    if ($bucket === 'organizations') {
                        foreach (array('ref:' . $ref, self::norm_name($label)) as $key) {
                            foreach ($roles[ $key ] ?? array() as $role) {
                                $found[ $role ] = true;
                            }
                        }
                    }
                    $entries[ $bucket ][] = array(
                        'link_key' => $link_key,
                        'ref'      => $ref,
                        'label'    => $label,
                        'case_id'  => (string) $item['id'],
                        'case'     => (string) $item['title'],
                        'roles'    => array_keys($found),
                    );
                }
            }
        }

        $out = array('credentials' => array(), 'organizations' => array(), 'wallets' => array());
        foreach ($entries as $bucket => $list) {
            // Names that belong to an entry with a catalog id join that id (same name, same use-case data set).
            $by_name = array();
            foreach ($list as $entry) {
                if ($entry['ref'] !== '' && ! isset($by_name[ $entry['link_key'] . '|' . self::norm_name($entry['label']) ])) {
                    $by_name[ $entry['link_key'] . '|' . self::norm_name($entry['label']) ] = $entry['ref'];
                }
            }
            $rows = array();
            foreach ($list as $entry) {
                $ref  = $entry['ref'] !== '' ? $entry['ref'] : (string) ($by_name[ $entry['link_key'] . '|' . self::norm_name($entry['label']) ] ?? '');
                $key  = $entry['link_key'] . '|' . ($ref !== '' ? 'ref:' . $ref : 'name:' . self::norm_name($entry['label']));
                if (! isset($rows[ $key ])) {
                    $href         = self::detail_href($bucket, $ref);
                    $rows[ $key ] = array(
                        'label'     => $entry['label'],
                        'ref'       => $ref,
                        'kind'      => $entry['link_key'],
                        'href'      => $href,
                        'detail'    => $href !== '',
                        'logo'      => '',
                        'roles'     => array(),
                        'use_cases' => array(),
                        'case_roles' => array(),
                    );
                    if ($bucket === 'organizations' && $href !== '') {
                        $record = self::organization_record($ref);
                        if ($record !== null && class_exists('Fides_Organization_Overview')) {
                            $rows[ $key ]['logo']  = Fides_Organization_Overview::logo_url($record);
                            $rows[ $key ]['label'] = (string) $record['name'] !== '' ? (string) $record['name'] : $entry['label'];
                        }
                    }
                }
                $rows[ $key ]['use_cases'][ $entry['case_id'] ] = $entry['case'];
                foreach ($entry['roles'] as $role) {
                    if (! in_array($role, $rows[ $key ]['roles'], true)) {
                        $rows[ $key ]['roles'][] = $role;
                    }
                    if (! in_array($role, $rows[ $key ]['case_roles'][ $entry['case_id'] ] ?? array(), true)) {
                        $rows[ $key ]['case_roles'][ $entry['case_id'] ][] = $role;
                    }
                }
            }
            $rows = array_values($rows);
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

        // The heading says what is chosen; without a choice it names the page.
        $editorial = $slug !== '' ? self::editorial($kind, $slug, $choices[ $slug ]) : null;
        $heading   = $editorial !== null ? $editorial['title'] : $words['title'];

        ob_start();
        ?>
<div class="fides-ds fides-explore" data-fides-explore="<?php echo esc_attr($kind); ?>" data-param="<?php echo esc_attr($param); ?>" data-selected="<?php echo esc_attr($slug); ?>" data-live-selected="<?php echo esc_attr(__('%s selected', 'fides-use-case-catalog')); ?>" data-live-none="<?php echo esc_attr(__('No selection', 'fides-use-case-catalog')); ?>">
  <div class="fides-ds-page fides-explore__page">
    <header class="fides-explore__head" data-fides-explore-head>
      <p class="fides-explore__crumb"><?php echo esc_html('Explore / ' . $words['plural']); ?></p>
      <div class="fides-explore__titlerow">
        <h1 class="fides-ds-heading-1 fides-explore__title" id="fides-explore-title" tabindex="-1"><?php echo esc_html($heading); ?></h1>
        <?php if ($slug !== '') : ?>
          <?php /* Phones: the list is folded away after a choice; this link opens it (a plain #anchor link works without JavaScript). */ ?>
          <a class="fides-explore__change" href="#fides-explore-choices" aria-controls="fides-explore-choices" data-fides-explore-change><?php echo esc_html($words['change']); ?></a>
        <?php endif; ?>
      </div>
      <?php if ($slug === '') : ?>
        <p class="fides-explore__lead"><?php echo esc_html($words['lead']); ?></p>
      <?php endif; ?>
      <?php if ($req['invalid'] !== '') : ?>
        <p class="fides-explore__notice fides-explore__notice--invalid" role="status" data-fides-explore-notice><?php echo esc_html(sprintf($kind === 'sector' ? __('“%s” is not a sector we know. Choose one of the options below.', 'fides-use-case-catalog') : __('“%s” is not a theme we know. Choose one of the options below.', 'fides-use-case-catalog'), $req['invalid'])); ?></p>
      <?php endif; ?>
      <nav class="fides-explore__choices" id="fides-explore-choices" aria-labelledby="fides-explore-choices-label" data-fides-explore-choices>
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
          echo self::selected_html($kind, $slug, $editorial ?? self::editorial($kind, $slug, $choices[ $slug ]), $items, $overview, $detail_base, $words); // phpcs:ignore WordPress.Security.EscapeOutput
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
                'change'   => 'Change sector',
            );
        }
        return array(
            'singular' => 'Theme',
            'plural'   => 'Themes',
            'title'    => 'Explore by theme',
            'lead'     => 'Choose a theme to explore use cases, credential types and organisations across sectors.',
            'empty'    => 'Choose a theme to get started',
            'again'    => 'Choose another theme',
            'change'   => 'Change theme',
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
    private static function selected_html(string $kind, string $slug, array $editorial, array $items, string $overview, string $detail_base, array $words): string {
        $param     = self::kinds()[ $kind ];
        $selection = self::selection($kind, $slug, $items);
        $rel       = $selection['relations'];
        $all_url   = add_query_arg($param, $slug, $overview);
        $matching  = $selection['matching'];
        $shown     = $selection['shown'];

        // The records the catalogs classify under this choice themselves (compact block below the use case relations).
        $catalog_html = self::catalog_block_html($kind, $slug, self::translate_text((string) $editorial['title']), $overview, $rel, $shown);

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
            if ($catalog_html !== '') {
                $sections['explore-catalog'] = 'More from the catalog';
            }
        }

        // The chosen name is the page heading (H1, in the header); the result starts with the introduction and the image.
        $html  = '<section class="fides-explore__selected" aria-labelledby="fides-explore-title" data-fides-explore-state="selected" data-fides-explore-title="' . esc_attr($editorial['title'] . ' · ' . $words['title']) . '">';
        if ($editorial['intro'] !== '' || $editorial['image'] !== '') {
            $html .= '<div class="fides-explore__hero' . ($editorial['image'] === '' ? ' fides-explore__hero--no-image' : '') . '">';
            $html .= '<div class="fides-explore__hero-text">';
            if ($editorial['intro'] !== '') {
                $html .= '<div class="fides-explore__intro">' . $editorial['intro'] . '</div>';
            }
            $html .= '</div>';
            if ($editorial['image'] !== '') {
                $html .= '<figure class="fides-explore__figure">' . $editorial['image'] . '</figure>';
            }
            $html .= '</div>';
        }

        if (! $shown) {
            $html .= '<div class="fides-explore__empty" data-fides-explore-state="empty"><h3 class="fides-explore__empty-title">No examples yet</h3>'
                . '<p>' . esc_html__('The catalog has no published use case here yet.', 'fides-use-case-catalog') . '</p>'
                . '<p><a class="fides-ds-action-link" href="' . esc_url($overview) . '"><span>Browse all use cases</span> <span aria-hidden="true">→</span></a></p></div>';
            return $html . $catalog_html . '</section>';
        }

        // The shared "On this page" bar (as on the use case detail page): tabs from 1100px, folded below; sticky on every width.
        $html .= '<details class="fides-ds-section-nav fides-explore__sections" data-fides-ds-section-nav data-fides-explore-sections>'
            . '<summary>On this page <svg class="fides-ds-section-nav__chevron" aria-hidden="true" focusable="false" width="12" height="8" viewBox="0 0 12 8"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></summary>'
            . '<nav aria-label="On this page"><ul>';
        foreach ($sections as $anchor => $text) {
            $html .= '<li><a href="#' . esc_attr($anchor) . '">' . esc_html($text) . '</a></li>';
        }
        $html .= '</ul></nav></details>';

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
        if (! self::is_english()) {
            $html .= '<p class="fides-explore__lang-note" data-fides-explore-lang-note>Catalog content is shown in English.</p>';
        }
        $anchors = array();
        $html   .= '<ul class="fides-ds-cards fides-explore__cards" data-fides-explore-cards>';
        foreach ($shown as $index => $item) {
            $anchors[ (string) $item['id'] ] = 'explore-example-' . ($index + 1);
            $html .= '<li class="fides-explore__card-item" id="' . esc_attr($anchors[ (string) $item['id'] ]) . '">' . self::card_html($item, $detail_base) . '</li>';
        }
        $html .= '</ul></section>';

        // Credential types, organisations and wallets: each record once, from the shown examples only.
        $n = count($shown);
        if ($rel['credentials'] || $rel['organizations'] || $rel['wallets']) {
            // Said once here instead of in every heading and row.
            $html .= '<p class="fides-explore__relations-note" data-fides-explore-relations-note>' . esc_html($n === 1 ? __('These credential types, organisations and wallets belong to the use case shown above.', 'fides-use-case-catalog') : __('These credential types, organisations and wallets belong to the use cases shown above.', 'fides-use-case-catalog')) . '</p>';
        }
        if ($rel['credentials'] || $rel['organizations']) {
            $html .= '<div class="fides-explore__columns">';
            if ($rel['credentials']) {
                $html .= self::relation_section('explore-credentials', 'credentials', $rel['credentials'], $n, $anchors);
            }
            if ($rel['organizations']) {
                $html .= self::relation_section('explore-organisations', 'organizations', $rel['organizations'], $n, $anchors);
            }
            $html .= '</div>';
        }
        if ($rel['wallets']) {
            $html .= '<div class="fides-explore__columns fides-explore__columns--single">' . self::relation_section('explore-wallets', 'wallets', $rel['wallets'], $n, $anchors) . '</div>';
        }

        $html .= $catalog_html;

        $html .= '<p class="fides-explore__again"><a class="fides-ds-action-link" href="#fides-explore-choices" data-fides-explore-change><span>' . esc_html($words['again']) . '</span> <span aria-hidden="true">↑</span></a></p>';
        return $html . '</section>';
    }

    /**
     * The visible text of a label in the current language, through the TranslatePress dictionary (the document title is built
     * in PHP, so it is not translated as a whole string). English pages and a missing TranslatePress return the text unchanged.
     */
    private static function translate_text(string $text): string {
        if ($text === '' || self::is_english() || ! function_exists('trp_translate')) {
            return $text;
        }
        $out = trim(html_entity_decode(wp_strip_all_tags((string) trp_translate(esc_html($text), null, false)), ENT_QUOTES, 'UTF-8'));
        return $out !== '' ? $out : $text;
    }

    /** True on an English page; the catalog texts are English, so other languages mark and announce them. */
    private static function is_english(): bool {
        // Either source naming another language is enough (TranslatePress switches the page language on /nl/).
        foreach (array(function_exists('determine_locale') ? (string) determine_locale() : '', (string) get_locale()) as $locale) {
            if ($locale !== '' && strpos(strtolower($locale), 'en') !== 0) {
                return false;
            }
        }
        return true;
    }

    /** Attributes for text that comes from the catalog and is not translated: lang="en" and out of the TranslatePress dictionary. */
    private static function catalog_text_attrs(): string {
        return self::is_english() ? '' : ' lang="en" data-no-translation';
    }

    /**
     * One use case as the compact variant of the catalog row card (same component, image, status badge and owner as
     * the use case overview; the engagement line and the arrow-only layout are left to the shared CSS).
     *
     * @param array<string, mixed> $item
     */
    private static function card_html(array $item, string $detail_base): string {
        $status = Fides_Use_Case_Design::status_label($item);
        $html   = Fides_Use_Case_Design::render_card($item, 'row', $detail_base, array('meta' => '', 'image_loading' => 'lazy'));
        if ($status !== '') {
            $modifier = strtolower(trim((string) ($item['productionDeployment'] ?? ''))) === 'yes' ? 'production' : 'not-production';
            $html     = str_replace(
                '<span class="fides-ds-card__status">',
                '<span class="fides-ds-card__status fides-explore__status fides-explore__status--' . $modifier . '" data-status="' . esc_attr($modifier) . '">',
                $html
            );
        }
        if (! self::is_english()) {
            // Titles, descriptions and owner names are catalog records in English: say so, and never translate them.
            $attrs = self::catalog_text_attrs();
            $html  = str_replace(
                array('<a class="fides-ds-card__link"', '<p class="fides-ds-card__summary">', '<a class="fides-ds-card__owner-link"', '<li class="fides-ds-card__fact fides-ds-card__fact--owner">'),
                array('<a class="fides-ds-card__link"' . $attrs, '<p class="fides-ds-card__summary"' . $attrs . '>', '<a class="fides-ds-card__owner-link"' . $attrs, '<li class="fides-ds-card__fact fides-ds-card__fact--owner"' . $attrs . '>'),
                $html
            );
        }
        return $html;
    }

    /** Two letters for the placeholder of a missing logo (first letters of the first two words). */
    private static function initials(string $name): string {
        $words = preg_split('/[^\p{L}\p{N}]+/u', trim($name), -1, PREG_SPLIT_NO_EMPTY) ?: array();
        $out   = '';
        foreach (array_slice($words, 0, 2) as $word) {
            $out .= function_exists('mb_substr') ? mb_substr($word, 0, 1) : substr($word, 0, 1);
        }
        $out = function_exists('mb_strtoupper') ? mb_strtoupper($out) : strtoupper($out);
        return $out !== '' ? $out : '•';
    }

    /**
     * Logo of an organisation in a fixed 40×40 box: the catalog logo (lazy, contain) when there is one, a quiet initials
     * placeholder when there is none or when it fails to load (the shared script swaps the image for the placeholder).
     */
    private static function logo_html(string $name, string $logo): string {
        $initials = '<span class="fides-ds-card__fallback" aria-hidden="true"' . ($logo !== '' ? ' hidden' : '') . '>' . esc_html(self::initials($name)) . '</span>';
        $img      = $logo !== ''
            ? '<img class="fides-ds-card__img" src="' . esc_url($logo) . '" alt="" width="40" height="40" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
            : '';
        return '<span class="fides-ds-card__media fides-ds-card__media--contain fides-explore__logo" data-logo="' . ($logo !== '' ? 'image' : 'placeholder') . '">' . $img . $initials . '</span>';
    }

    /** Plain-language basis sentence per selection kind (`%s` = the chosen name). */
    private static function catalog_basis_text(string $how, string $name, string $slug = ''): string {
        switch ($how) {
            case 'credentials-sector':
                /* translators: %s: sector name */
                return sprintf(__('Credential types classified in the %s sector.', 'fides-use-case-catalog'), $name);
            case 'credentials-theme':
                // The catalog's own theme names are what the credential catalog shows as the filter, so they are named here.
                $labels = array();
                foreach (Fides_Use_Case_Explore_Catalog::bundle_theme_codes($slug) as $code) {
                    $labels[] = Fides_Credential_Design::THEME_LABELS[ $code ] ?? $code;
                }
                if (count($labels) === 1) {
                    /* translators: 1: theme name of the page, 2: theme name in the credential catalog */
                    return sprintf(__('Credential types classified under “%2$s”, the catalog theme behind %1$s.', 'fides-use-case-catalog'), $name, $labels[0]);
                }
                /* translators: 1: theme name of the page, 2: list of theme names in the credential catalog */
                return sprintf(__('Credential types classified under any of these catalog themes, which together make up %1$s: %2$s.', 'fides-use-case-catalog'), $name, implode(', ', $labels));
            case 'organizations-sector':
                /* translators: %s: sector name */
                return sprintf(__('Organisations that list %s as a sector.', 'fides-use-case-catalog'), $name);
            case 'rps-sector':
                /* translators: %s: sector name */
                return sprintf(__('Relying parties that list %s as a sector.', 'fides-use-case-catalog'), $name);
            case 'issuers-org-sector':
                /* translators: %s: sector name */
                return sprintf(__('Issuers have no sector of their own. These are run by an organisation that lists %s as a sector.', 'fides-use-case-catalog'), $name);
            case 'issuers-credentials-theme':
                /* translators: %s: theme name */
                return sprintf(__('Issuers have no theme of their own. These issue credential types classified under the theme %s.', 'fides-use-case-catalog'), $name);
            case 'rps-credentials-theme':
                /* translators: %s: theme name */
                return sprintf(__('Relying parties have no theme of their own. These accept credential types classified under the theme %s.', 'fides-use-case-catalog'), $name);
        }
        return '';
    }

    /**
     * "More from the catalog": per catalog type at most four records that the catalogs classify under this choice (or reach
     * through a related record), the basis in plain words, and a link to the filtered catalog when that filter exists.
     * Records that are also a relation of a shown use case say so (with the use case) instead of being listed twice unmarked.
     * Empty types are left out; no record at all returns ''.
     *
     * @param array<string, list<array<string, mixed>>> $rel   relations of the shown use cases
     * @param list<array<string, mixed>>                $shown shown use cases
     */
    private static function catalog_block_html(string $kind, string $slug, string $name, string $overview, array $rel, array $shown): string {
        if (! class_exists('Fides_Use_Case_Explore_Catalog')) {
            return '';
        }
        $selection = Fides_Use_Case_Explore_Catalog::selection($kind, $slug, $overview);
        if (! $selection) {
            return '';
        }
        $titles = array(
            'credentials'   => 'Credential types',
            'organizations' => 'Organisations',
            'issuers'       => 'Issuers',
            'rps'           => 'Relying parties',
        );
        $all_text = array(
            'credentials'   => 'View all credential types',
            'organizations' => 'View all organisations',
            'issuers'       => 'View all issuers',
            'rps'           => 'View all relying parties',
        );
        // Records that are a relation of a shown use case: record id => use case id => title.
        $linked = array('credentials' => array(), 'organizations' => array());
        foreach (array('credentials', 'organizations') as $bucket) {
            foreach ($rel[ $bucket ] as $row) {
                if ($row['ref'] !== '') {
                    $linked[ $bucket ][ (string) $row['ref'] ] = $row['use_cases'];
                }
            }
        }
        $anchors = array();
        foreach ($shown as $index => $item) {
            $anchors[ (string) $item['id'] ] = 'explore-example-' . ($index + 1);
        }
        $attrs = self::catalog_text_attrs();
        $html  = '<section class="fides-explore__section fides-explore__catalog" id="explore-catalog" aria-labelledby="explore-catalog-title" data-fides-explore-catalog>'
            . '<h2 class="fides-explore__h2" id="explore-catalog-title">More from the catalog</h2>'
            . '<p class="fides-explore__relations-note" data-fides-explore-catalog-note>' . esc_html(sprintf(__('Records the catalogs classify under %s themselves, or reach through a related record. Each part says which.', 'fides-use-case-catalog'), $name)) . '</p>';
        $count = 0;
        foreach (Fides_Use_Case_Explore_Catalog::TYPES as $type) {
            if (empty($selection[ $type ])) {
                continue;
            }
            $entry   = $selection[ $type ];
            $records = array_slice($entry['records'], 0, Fides_Use_Case_Explore_Catalog::LIMIT);
            $cards   = '';
            foreach ($records as $record) {
                $props = Fides_Use_Case_Explore_Catalog::card_props($type, $record);
                $id    = Fides_Use_Case_Explore_Catalog::record_id($type, $record);
                $also  = '';
                if (isset($linked[ $type ][ $id ])) {
                    $links = array();
                    foreach ($linked[ $type ][ $id ] as $case_id => $case_title) {
                        $links[] = '<a href="#' . esc_attr($anchors[ $case_id ] ?? '') . '"' . $attrs . '>' . esc_html((string) $case_title) . '</a>';
                    }
                    $also = '<p class="fides-explore__also" data-fides-explore-also>' . esc_html__('Also linked to a use case above:', 'fides-use-case-catalog') . ' ' . implode(', ', $links) . '</p>';
                }
                $cards .= '<li class="fides-explore__card-item" data-record-id="' . esc_attr($id) . '"><div class="fides-explore__catalog-card"' . $attrs . '>' . Fides_DS_Card::render($props) . '</div>' . $also . '</li>';
                $count++;
            }
            $direct = $entry['basis'] === 'direct';
            $total  = (int) $entry['total'];
            $shown_n = count($records);
            $foot   = '';
            if ($entry['url'] !== '') {
                // The number is only given where the destination shows exactly this many records (credential types, issuers,
                // relying parties); the organisation overview loads its own, larger data snapshot in the browser.
                $number = $type === 'organizations' ? '' : ' <span class="fides-explore__all-count">(' . $total . ')</span>';
                $foot  .= '<a class="fides-ds-action-link" href="' . esc_url($entry['url']) . '" data-fides-explore-all="' . esc_attr($type) . '"><span>' . esc_html($all_text[ $type ]) . '</span>' . $number . ' <span aria-hidden="true">→</span></a>';
            }
            if ($type !== 'organizations' || $entry['url'] === '') {
                $foot .= '<span class="fides-explore__shown-count">' . esc_html(sprintf(__('Showing %1$d of %2$d.', 'fides-use-case-catalog'), $shown_n, $total)) . '</span>';
            }
            $html .= '<section class="fides-explore__catalog-type" data-catalog-type="' . esc_attr($type) . '" data-basis="' . ($direct ? 'direct' : 'derived') . '" data-total="' . esc_attr((string) $total) . '" data-shown="' . esc_attr((string) $shown_n) . '" data-has-link="' . ($entry['url'] !== '' ? 'yes' : 'no') . '" aria-labelledby="explore-catalog-' . esc_attr($type) . '-title">'
                . '<div class="fides-explore__catalog-head"><h3 class="fides-explore__h3" id="explore-catalog-' . esc_attr($type) . '-title">' . esc_html($titles[ $type ]) . '</h3>'
                . '<span class="fides-explore__basis fides-explore__basis--' . ($direct ? 'direct' : 'derived') . '">' . esc_html($direct ? 'Classified directly' : 'Derived from related records') . '</span></div>'
                . '<p class="fides-explore__basis-text">' . esc_html(self::catalog_basis_text((string) $entry['how'], $name, $slug)) . '</p>'
                . '<ul class="fides-ds-cards fides-explore__cards" data-fides-explore-catalog-cards>' . $cards . '</ul>'
                . '<p class="fides-explore__catalog-foot">' . $foot . '</p>'
                . '</section>';
        }
        return $html . '</section>';
    }

    /** Plain heading per relation type. Which examples they belong to is said once above the lists, not in every heading. */
    private static function relation_heading(string $type): string {
        $names = array('credentials' => 'Credential types', 'organizations' => 'Organisations', 'wallets' => 'Wallets');
        return $names[ $type ] ?? '';
    }

    /**
     * @param list<array<string, mixed>>  $rows
     * @param array<string, string>       $anchors use case id => anchor id of its card on this page
     */
    private static function relation_section(string $anchor, string $type, array $rows, int $shown_cases, array $anchors): string {
        $total = count($rows);
        $rows  = array_slice($rows, 0, (int) apply_filters('fides_explore_choice_list_limit', self::LIST_LIMIT));
        $heading = self::relation_heading($type);
        $attrs = self::catalog_text_attrs();
        $html  = '<section class="fides-explore__section fides-explore__relations" id="' . esc_attr($anchor) . '" data-relation="' . esc_attr($type) . '" data-total="' . esc_attr((string) $total) . '" aria-labelledby="' . esc_attr($anchor . '-title') . '">'
            . '<h2 class="fides-explore__h2 fides-explore__h2--small" id="' . esc_attr($anchor . '-title') . '">' . esc_html($heading) . '</h2>'
            . '<ul class="fides-explore__list">';
        foreach ($rows as $row) {
            $label = (string) $row['label'];
            $name  = $row['detail']
                ? '<a class="fides-explore__link" href="' . esc_url((string) $row['href']) . '"><span' . $attrs . '>' . esc_html($label) . '</span> <span aria-hidden="true">→</span></a>'
                : '<span class="fides-explore__plain-name"' . $attrs . '>' . esc_html($label) . '</span>';
            $chips = '';
            $types = array();
            if ($row['kind'] === 'personalWallets') {
                $types[] = 'Personal wallet';
            } elseif ($row['kind'] === 'businessWallets') {
                $types[] = 'Business wallet';
            }
            foreach (array_merge($types, $row['roles']) as $chip) {
                $chips .= '<li class="fides-explore__chip">' . esc_html((string) $chip) . '</li>';
            }
            $cases = $row['use_cases'];
            // The name and link of each related use case stay one click away (native <details>).
            $text  = count($cases) === 1
                ? __('Related use case', 'fides-use-case-catalog')
                : sprintf(__('%d related use cases', 'fides-use-case-catalog'), count($cases));
            $list  = '';
            foreach ($cases as $case_id => $case_title) {
                $roles = $row['case_roles'][ $case_id ] ?? array();
                $list .= '<li><a href="#' . esc_attr($anchors[ $case_id ] ?? '') . '"' . $attrs . '>' . esc_html((string) $case_title) . '</a>'
                    . ($roles ? ' <span class="fides-explore__case-role">· ' . esc_html(implode(', ', $roles)) . '</span>' : '') . '</li>';
            }
            $html .= '<li class="fides-explore__row' . ($row['logo'] !== '' || $type === 'organizations' ? ' fides-explore__row--logo' : '') . '" data-detail="' . ($row['detail'] ? 'yes' : 'no') . '">'
                . ($type === 'organizations' ? self::logo_html($label, (string) $row['logo']) : '')
                . '<div class="fides-explore__row-main"><span class="fides-explore__row-name">' . $name . '</span>'
                . ($chips !== '' ? '<ul class="fides-explore__chips">' . $chips . '</ul>' : '')
                . '<details class="fides-explore__from"><summary>' . esc_html($text) . '</summary><ul class="fides-explore__from-list">' . $list . '</ul></details></div></li>';
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
            $parts['title'] = self::translate_text($state['label']) . ' · ' . self::translate_text($state['words']['title']);
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
