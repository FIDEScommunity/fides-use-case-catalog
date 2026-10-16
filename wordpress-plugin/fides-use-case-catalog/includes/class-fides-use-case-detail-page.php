<?php
/**
 * [fides_use_case_detail] — server-rendered use-case detail page (design pilot).
 *
 * Renders one published use case from the catalog source with all present
 * content, technical details, relations, media and sources. Only fields that
 * exist on the item are shown; nothing is inferred.
 *
 * Attributes:
 *  - id          Default use-case id; ?usecase=<id> on the page URL overrides it.
 *  - listing_url Overview URL for "All use cases" (default: existing listing page).
 *  - detail_url  Base URL for related-use-case links (default: this page).
 *
 * @package fides-use-case-catalog
 */

if (! defined('ABSPATH')) {
    exit;
}

final class Fides_Use_Case_Detail_Page {

    /** @var array<string, array{0:string,1:string,2:string}> links key => [label, catalog url key, query param] */
    private const RELATION_GROUPS = array(
        'personalWallets' => array('Personal wallets', 'personalWalletCatalogUrl', 'wallet'),
        'businessWallets' => array('Business wallets', 'businessWalletCatalogUrl', 'wallet'),
        'issuers'         => array('Issuers', 'issuerCatalogUrl', 'issuer'),
        'credentials'     => array('Credential types', 'credentialCatalogUrl', 'credential'),
        'rps'             => array('Relying parties', 'rpCatalogUrl', 'rp'),
        'organizations'   => array('Organizations', 'organizationDetailUrl', ''),
    );

    /** Records shown per role before "Show all". */
    private const RELATION_VISIBLE = 6;

    public static function bootstrap(): void {
        add_shortcode('fides_use_case_detail', array(__CLASS__, 'shortcode'));
    }

    /**
     * @param array<string, string>|string $atts
     */
    public static function shortcode($atts = array()): string {
        $atts = shortcode_atts(
            array(
                'id'          => '',
                'listing_url' => '',
                'detail_url'  => '',
            ),
            is_array($atts) ? $atts : array(),
            'fides_use_case_detail'
        );
        if (! Fides_Use_Case_Design::available()) {
            return '';
        }
        Fides_Use_Case_Design::enqueue();

        $listing_url = trim((string) $atts['listing_url']);
        if ($listing_url === '') {
            $page_id     = fides_use_case_catalog_listing_page_id();
            $listing_url = $page_id > 0 ? (string) get_permalink($page_id) : home_url(fides_use_case_catalog_listing_path());
        }
        $detail_base = Fides_Use_Case_Design::detail_base((string) $atts['detail_url']);

        $id   = Fides_Use_Case_Design::requested_id((string) $atts['id']);
        $item = Fides_Use_Case_Design::find($id);
        if ($item === null) {
            return '<div class="fides-ds fides-uc-detail"><div class="fides-ds-page fides-uc-detail__missing">'
                . '<p class="fides-ds-kicker">Use case</p>'
                . '<h1 class="fides-ds-heading-2">This use case is not in the current FIDES catalog.</h1>'
                . '<p><a class="fides-ds-action-link" href="' . esc_url($listing_url) . '">← All use cases</a></p>'
                . '</div></div>';
        }

        return self::render($item, $listing_url, $detail_base);
    }

    /**
     * @param array<string, mixed> $item
     */
    private static function render(array $item, string $listing_url, string $detail_base): string {
        $id        = (string) $item['id'];
        $title     = (string) $item['title'];
        $owner     = trim((string) ($item['organizationName'] ?? ''));
        $summary   = self::paragraphs((string) ($item['summary'] ?? ''));
        $journey   = self::journey((string) ($item['userJourney'] ?? ''));
        $technical = self::technical_rows($item);
        $relations = self::relation_groups($item);
        $tags      = isset($item['tags']) && is_array($item['tags']) ? array_values(array_filter(array_map('strval', $item['tags']))) : array();
        $videos    = self::videos($item);
        $images    = self::images($item);
        $more_info = self::http_url((string) ($item['moreInfoUrl'] ?? ''));
        $related   = Fides_Use_Case_Design::related($item, 3);
        $status    = Fides_Use_Case_Design::status_label($item);
        $updated   = Fides_Use_Case_Design::updated_date($item, true);
        $updated_iso = preg_match('/^\d{4}-\d{2}-\d{2}/', (string) ($item['updatedAt'] ?? ''), $m) ? $m[0] : '';
        $page_url  = Fides_Use_Case_Design::detail_url($id, $detail_base);
        $awards    = Fides_Use_Case_Design::award_recognitions($id);
        $likes     = Fides_Use_Case_Design::like_count($id);
        $copy_status_id = 'fides-uc-copy-status';

        $sections = array();
        if ($summary) {
            $sections['overview'] = 'Overview';
        }
        if ($journey['steps'] || $journey['paragraphs']) {
            $sections['user-journey'] = 'User journey';
        }
        if ($relations) {
            $sections['ecosystem'] = 'Ecosystem';
        }
        if ($technical) {
            $sections['technical-details'] = 'Technical details';
        }
        if ($videos || $more_info !== '' || count($images) > 1) {
            $sections['video-and-links'] = $videos ? 'Video & links' : 'Links';
        }

        ob_start();
        ?>
<div class="fides-ds fides-uc-detail" data-use-case-id="<?php echo esc_attr($id); ?>">
  <div class="fides-ds-page">
    <p class="fides-uc-detail__back"><a class="fides-ds-action-link" href="<?php echo esc_url($listing_url); ?>">← All use cases</a></p>

    <header class="fides-uc-detail__header">
      <?php if (Fides_Use_Case_Design::kicker($item) !== '') : ?>
        <p class="fides-ds-kicker"><?php echo esc_html(Fides_Use_Case_Design::kicker($item)); ?></p>
      <?php endif; ?>
      <h1 class="fides-ds-heading-1 fides-ds-heading-1--detail fides-uc-detail__title"><?php echo esc_html($title); ?></h1>
      <ul class="fides-uc-detail__meta">
        <?php if ($owner !== '') : ?>
          <li class="fides-uc-detail__owner"><?php echo self::owner_html($item, $owner); // phpcs:ignore WordPress.Security.EscapeOutput ?></li>
        <?php endif; ?>
        <?php if ($updated !== '') : ?>
          <li class="fides-ds-meta">Updated <time datetime="<?php echo esc_attr($updated_iso); ?>"><?php echo esc_html($updated); ?></time></li>
        <?php endif; ?>
        <?php if ($status !== '') : ?>
          <li><span class="fides-ds-status"><?php echo esc_html($status); ?></span></li>
        <?php endif; ?>
        <?php if ($awards) : ?>
          <li><span class="fides-ds-status fides-uc-detail__award"><?php echo esc_html(Fides_Use_Case_Design::award_label($awards[0])); ?></span></li>
        <?php endif; ?>
        <?php if ($likes > 0) : ?>
          <li class="fides-ds-meta"><?php echo esc_html(Fides_Use_Case_Design::like_label($likes)); ?></li>
        <?php endif; ?>
      </ul>
    </header>

    <div class="fides-uc-detail__hero<?php echo Fides_Use_Case_Design::image_url($item) === '' ? ' fides-uc-detail__hero--no-media' : ''; ?>">
      <?php if (Fides_Use_Case_Design::image_url($item) !== '') : ?>
        <figure class="fides-uc-detail__media">
          <img class="fides-ds-card__img" src="<?php echo esc_url(Fides_Use_Case_Design::image_url($item)); ?>" alt="" decoding="async" fetchpriority="high">
          <span class="fides-ds-card__fallback" aria-hidden="true" hidden><?php echo esc_html($owner !== '' ? $owner : $title); ?></span>
        </figure>
      <?php endif; ?>
      <aside class="fides-uc-detail__glance fides-ds-panel" aria-labelledby="fides-uc-glance-title">
        <h2 class="fides-ds-panel__title" id="fides-uc-glance-title">At a glance</h2>
        <dl class="fides-ds-facts">
          <?php
          echo self::fact('Organization', $owner);
          echo self::fact('Sector', Fides_Use_Case_Design::sector_label($item));
          echo self::fact('Country', Fides_Use_Case_Design::country_label($item));
          echo self::fact('Production deployment', $status === 'In production' ? 'Yes' : ($status === 'Not in production' ? 'No' : ''));
          echo self::fact('Themes', implode(', ', self::theme_labels($item)));
          echo self::awards_fact($awards); // phpcs:ignore WordPress.Security.EscapeOutput
          ?>
        </dl>
        <div class="fides-uc-detail__actions">
          <?php if ($more_info !== '') : ?>
            <a class="fides-ds-button fides-ds-button--block" href="<?php echo esc_url($more_info); ?>" rel="noopener" target="_blank">More information <span aria-hidden="true">↗</span><span class="fides-ds-visually-hidden"> (opens in a new tab)</span></a>
          <?php endif; ?>
          <?php if ($videos) : ?>
            <a class="fides-ds-action-link" href="#video-and-links">Watch the video <span aria-hidden="true">↓</span></a>
          <?php endif; ?>
          <button type="button" class="fides-ds-text-button" data-fides-ds-copy="<?php echo esc_attr($page_url); ?>" aria-describedby="<?php echo esc_attr($copy_status_id); ?>">Copy link</button>
          <p class="fides-ds-meta fides-uc-detail__copy-status" id="<?php echo esc_attr($copy_status_id); ?>" role="status" aria-live="polite"></p>
        </div>
      </aside>
    </div>

    <?php if (count($sections) > 1) : ?>
      <details class="fides-ds-section-nav fides-uc-detail__sections" data-fides-ds-section-nav>
        <summary>On this page <svg class="fides-ds-section-nav__chevron" aria-hidden="true" focusable="false" width="12" height="8" viewBox="0 0 12 8"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></summary>
        <nav aria-label="On this page">
          <ul>
            <?php foreach ($sections as $anchor => $label) : ?>
              <li><a href="#<?php echo esc_attr($anchor); ?>"><?php echo esc_html($label); ?></a></li>
            <?php endforeach; ?>
          </ul>
        </nav>
      </details>
    <?php endif; ?>

    <div class="fides-uc-detail__layout">
      <div class="fides-uc-detail__main">
        <?php if ($summary) : ?>
          <section class="fides-uc-detail__section" id="overview" aria-labelledby="overview-title">
            <h2 class="fides-ds-heading-2" id="overview-title">Overview</h2>
            <div class="fides-ds-prose"><?php echo self::paragraphs_html($summary); // phpcs:ignore WordPress.Security.EscapeOutput ?></div>
          </section>
        <?php endif; ?>
        <?php if ($journey['steps'] || $journey['paragraphs']) : ?>
          <section class="fides-uc-detail__section" id="user-journey" aria-labelledby="user-journey-title">
            <h2 class="fides-ds-heading-2" id="user-journey-title">User journey</h2>
            <?php if ($journey['paragraphs']) : ?>
              <div class="fides-ds-prose"><?php echo self::paragraphs_html($journey['paragraphs']); // phpcs:ignore WordPress.Security.EscapeOutput ?></div>
            <?php endif; ?>
            <?php if ($journey['steps']) : ?>
              <ol class="fides-ds-steps">
                <?php foreach ($journey['steps'] as $step) : ?>
                  <li><span><?php echo esc_html($step); ?></span></li>
                <?php endforeach; ?>
              </ol>
            <?php endif; ?>
          </section>
        <?php endif; ?>
      </div>

      <div class="fides-uc-detail__aside">
        <?php if ($relations) : ?>
          <section class="fides-ds-panel fides-uc-detail__panel fides-uc-ecosystem-summary" aria-labelledby="ecosystem-summary-title">
            <h2 class="fides-ds-panel__title" id="ecosystem-summary-title">Connected ecosystem</h2>
            <p class="fides-uc-ecosystem-summary__intro">Entries per role. One party can appear in more than one role.</p>
            <dl class="fides-uc-ecosystem-summary__roles">
              <?php foreach ($relations as $group) : ?>
                <div class="fides-uc-ecosystem-summary__role">
                  <dt><?php echo esc_html($group['label']); ?></dt>
                  <dd><?php echo esc_html((string) count($group['items'])); ?></dd>
                </div>
              <?php endforeach; ?>
            </dl>
            <a class="fides-ds-action-link fides-uc-ecosystem-summary__link" href="#ecosystem">View connected ecosystem <span aria-hidden="true">↓</span></a>
          </section>
        <?php endif; ?>

        <?php if ($technical) : ?>
          <section class="fides-ds-panel fides-uc-detail__panel" id="technical-details" aria-labelledby="technical-details-title">
            <h2 class="fides-ds-panel__title" id="technical-details-title">Technical details</h2>
            <dl class="fides-ds-facts">
              <?php foreach ($technical as $label => $value) : ?>
                <?php echo self::fact($label, $value); // phpcs:ignore WordPress.Security.EscapeOutput ?>
              <?php endforeach; ?>
            </dl>
          </section>
        <?php endif; ?>

        <?php if ($tags) : ?>
          <section class="fides-ds-panel fides-uc-detail__panel" aria-labelledby="topics-title">
            <h2 class="fides-ds-panel__title" id="topics-title">Topics</h2>
            <ul class="fides-ds-tags">
              <?php foreach ($tags as $tag) : ?>
                <li class="fides-ds-tag"><?php echo esc_html($tag); ?></li>
              <?php endforeach; ?>
            </ul>
          </section>
        <?php endif; ?>
      </div>
    </div>

    <?php if ($relations) : ?>
      <section class="fides-uc-ecosystem" id="ecosystem" aria-labelledby="ecosystem-title">
        <div class="fides-uc-ecosystem__head">
          <h2 class="fides-ds-heading-3" id="ecosystem-title">Connected ecosystem</h2>
          <p class="fides-uc-ecosystem__intro">The wallets, credentials and participants listed for this use case, by role.</p>
        </div>
        <div class="fides-uc-ecosystem__groups">
          <?php foreach ($relations as $index => $group) : ?>
            <?php echo self::relation_group_html($group, 'ecosystem-group-' . $index); // phpcs:ignore WordPress.Security.EscapeOutput ?>
          <?php endforeach; ?>
        </div>
      </section>
    <?php endif; ?>

    <?php if (isset($sections['video-and-links'])) : ?>
      <section class="fides-ds-band--dark fides-uc-detail__band" id="video-and-links" aria-labelledby="video-and-links-title">
        <div class="fides-uc-detail__band-text">
          <p class="fides-ds-kicker"><?php echo esc_html($sections['video-and-links']); ?></p>
          <h2 class="fides-ds-heading-2" id="video-and-links-title"><?php echo $videos ? 'See the use case in action.' : 'Read more about this use case.'; ?></h2>
          <ul class="fides-uc-detail__links">
            <?php if ($more_info !== '') : ?>
              <li><a href="<?php echo esc_url($more_info); ?>" rel="noopener" target="_blank">More information<span aria-hidden="true"> ↗</span><span class="fides-ds-visually-hidden"> (opens in a new tab)</span></a> <span class="fides-uc-detail__link-host"><?php echo esc_html((string) wp_parse_url($more_info, PHP_URL_HOST)); ?></span></li>
            <?php endif; ?>
            <?php foreach ($videos as $index => $video) : ?>
              <li><a href="<?php echo esc_url($video['url']); ?>" rel="noopener" target="_blank"><?php echo esc_html(count($videos) > 1 ? sprintf('Video %d on %s', $index + 1, $video['provider_label']) : 'Watch on ' . $video['provider_label']); ?><span aria-hidden="true"> ↗</span><span class="fides-ds-visually-hidden"> (opens in a new tab)</span></a></li>
            <?php endforeach; ?>
          </ul>
        </div>
        <?php if ($videos && $videos[0]['thumbnail'] !== '') : ?>
          <a class="fides-uc-detail__video" href="<?php echo esc_url($videos[0]['url']); ?>" rel="noopener" target="_blank">
            <img src="<?php echo esc_url($videos[0]['thumbnail']); ?>" alt="" loading="lazy" decoding="async">
            <span class="fides-uc-detail__play" aria-hidden="true"></span>
            <span class="fides-ds-visually-hidden">Play the video for <?php echo esc_html($title); ?> on <?php echo esc_html($videos[0]['provider_label']); ?> (opens in a new tab)</span>
          </a>
        <?php endif; ?>
        <?php if (count($images) > 1) : ?>
          <ul class="fides-uc-detail__gallery" aria-label="Images">
            <?php foreach (array_slice($images, 1) as $image) : ?>
              <li><a href="<?php echo esc_url($image); ?>" rel="noopener" target="_blank"><img src="<?php echo esc_url($image); ?>" alt="" loading="lazy" decoding="async"><span class="fides-ds-visually-hidden">Open image in a new tab</span></a></li>
            <?php endforeach; ?>
          </ul>
        <?php endif; ?>
      </section>
    <?php endif; ?>

    <?php if ($related) : ?>
      <section class="fides-uc-detail__related" aria-labelledby="related-title">
        <div class="fides-uc-detail__related-head">
          <h2 class="fides-ds-heading-2" id="related-title">Keep exploring</h2>
          <a class="fides-ds-action-link" href="<?php echo esc_url($listing_url); ?>">All use cases <span aria-hidden="true">→</span></a>
        </div>
        <ul class="fides-ds-cards fides-ds-cards--tiles">
          <?php foreach ($related as $related_item) : ?>
            <li><?php echo Fides_Use_Case_Design::render_card($related_item, 'tile', $detail_base); // phpcs:ignore WordPress.Security.EscapeOutput ?></li>
          <?php endforeach; ?>
        </ul>
      </section>
    <?php endif; ?>

    <section class="fides-uc-detail__contribute" aria-labelledby="contribute-title">
      <div>
        <h2 class="fides-ds-heading-3" id="contribute-title">Help keep this use case current.</h2>
        <p class="fides-ds-meta">FIDES Community account required.</p>
      </div>
      <?php echo self::update_action_html($id); // phpcs:ignore WordPress.Security.EscapeOutput ?>
    </section>
  </div>
</div>
        <?php
        return (string) ob_get_clean();
    }

    /**
     * Logged-in users get the update form link (same rule as the listing modal);
     * guests get the existing sign-in route.
     */
    private static function update_action_html(string $id): string {
        if (is_user_logged_in()) {
            $url = add_query_arg('usecase', rawurlencode($id), fides_use_case_catalog_update_form_url());
            return '<a class="fides-ds-button" href="' . esc_url($url) . '">Suggest an update <span aria-hidden="true">→</span></a>';
        }
        return '<a class="fides-ds-button fides-ds-button--secondary" href="' . esc_url(fides_use_case_catalog_form_login_url()) . '">Sign in to suggest an update <span aria-hidden="true">→</span></a>';
    }

    /**
     * @param list<array{program_label:string, program_url:string, year:int, category_label:string, place:int}> $awards
     */
    private static function awards_fact(array $awards): string {
        if (! $awards) {
            return '';
        }
        $lines = array();
        foreach ($awards as $award) {
            $text = Fides_Use_Case_Design::award_label($award) . ', ' . $award['program_label']
                . ($award['category_label'] !== '' ? ' (' . $award['category_label'] . ')' : '');
            $url = self::http_url($award['program_url']);
            $lines[] = $url !== ''
                ? '<a href="' . esc_url($url) . '" rel="noopener" target="_blank">' . esc_html($text) . '<span aria-hidden="true"> ↗</span><span class="fides-ds-visually-hidden"> (opens in a new tab)</span></a>'
                : esc_html($text);
        }
        return '<div class="fides-ds-facts__row"><dt>' . esc_html(count($awards) > 1 ? 'Awards' : 'Award') . '</dt><dd>' . implode('<br>', $lines) . '</dd></div>';
    }

    private static function fact(string $label, string $value): string {
        $value = trim($value);
        if ($value === '') {
            return '';
        }
        return '<div class="fides-ds-facts__row"><dt>' . esc_html($label) . '</dt><dd>' . esc_html($value) . '</dd></div>';
    }

    /**
     * Organization name, linked to its FIDES organization page when the item
     * links an organization with the same name to a catalog record, otherwise
     * to that organization's own URL.
     *
     * @param array<string, mixed> $item
     */
    private static function owner_html(array $item, string $owner): string {
        $orgs = isset($item['links']['organizations']) && is_array($item['links']['organizations']) ? $item['links']['organizations'] : array();
        foreach ($orgs as $org) {
            if (! is_array($org) || strcasecmp(trim((string) ($org['labelRaw'] ?? '')), $owner) !== 0) {
                continue;
            }
            $relation = self::relation($org, 'organizations', (string) $item['id']);
            if ($relation['href'] !== '') {
                return '<a href="' . esc_url($relation['href']) . '"' . ($relation['external'] ? ' rel="noopener" target="_blank"' : '') . '>'
                    . esc_html($owner) . ($relation['external'] ? '<span aria-hidden="true"> ↗</span><span class="fides-ds-visually-hidden"> (external site, opens in a new tab)</span>' : '') . '</a>';
            }
        }
        return esc_html($owner);
    }

    /**
     * @return list<string>
     */
    private static function paragraphs(string $text): array {
        $text = trim(str_replace("\r\n", "\n", $text));
        if ($text === '') {
            return array();
        }
        return array_values(array_filter(array_map('trim', preg_split('/\n\s*\n/', $text))));
    }

    /**
     * @param list<string> $paragraphs
     */
    private static function paragraphs_html(array $paragraphs): string {
        $html = '';
        foreach ($paragraphs as $paragraph) {
            $html .= '<p>' . nl2br(esc_html($paragraph), false) . '</p>';
        }
        return $html;
    }

    /**
     * Numbered lines ("1. …") become steps; any other text stays as paragraphs.
     * Unnumbered lines directly after a step are appended to that step.
     *
     * @return array{steps: list<string>, paragraphs: list<string>}
     */
    private static function journey(string $text): array {
        $text  = trim(str_replace("\r\n", "\n", $text));
        $out   = array('steps' => array(), 'paragraphs' => array());
        if ($text === '') {
            return $out;
        }
        $lines    = explode("\n", $text);
        $numbered = preg_grep('/^\s*\d+[.)]\s+\S/', $lines);
        if (count($numbered) < 2) {
            $out['paragraphs'] = self::paragraphs($text);
            return $out;
        }
        $intro = array();
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            if (preg_match('/^\d+[.)]\s+(.*)$/', $line, $m)) {
                $out['steps'][] = trim($m[1]);
            } elseif ($out['steps']) {
                $out['steps'][count($out['steps']) - 1] .= ' ' . $line;
            } else {
                $intro[] = $line;
            }
        }
        $out['paragraphs'] = $intro ? array(implode("\n", $intro)) : array();
        return $out;
    }

    /**
     * @param array<string, mixed> $item
     * @return array<string, string>
     */
    private static function technical_rows(array $item): array {
        $taxonomy = fides_use_case_catalog_taxonomy_options();
        $groups   = array(
            'interactionModes'      => 'Interaction mode',
            'vcFormats'             => 'Credential format',
            'issuanceProtocols'     => 'Issuance protocol',
            'presentationProtocols' => 'Presentation protocol',
            'interopProfiles'       => 'Interoperability profile',
        );
        $rows = array();
        foreach ($groups as $key => $label) {
            $values = isset($item[$key]) && is_array($item[$key]) ? $item[$key] : array();
            $labels = array();
            foreach ($values as $value) {
                $value = (string) $value;
                if ($value === '') {
                    continue;
                }
                $labels[] = isset($taxonomy[$key][$value]) ? (string) $taxonomy[$key][$value] : $value;
            }
            if ($labels) {
                $rows[$label] = implode(', ', $labels);
            }
        }
        return $rows;
    }

    /**
     * @param array<string, mixed> $item
     * @return list<string>
     */
    private static function theme_labels(array $item): array {
        $options = fides_use_case_catalog_theme_options();
        $themes  = isset($item['themes']) && is_array($item['themes']) ? $item['themes'] : array();
        $labels  = array();
        foreach ($themes as $theme) {
            $theme = (string) $theme;
            if ($theme !== '') {
                $labels[] = $options[$theme] ?? $theme;
            }
        }
        return $labels;
    }

    /**
     * @param array<string, mixed> $item
     * @return list<array{label:string, items:list<array{label:string, href:string, external:bool, source:string, identifier:string}>}>
     */
    private static function relation_groups(array $item): array {
        $links  = isset($item['links']) && is_array($item['links']) ? $item['links'] : array();
        $groups = array();
        foreach (self::RELATION_GROUPS as $key => $config) {
            $list = isset($links[$key]) && is_array($links[$key]) ? $links[$key] : array();
            $rows = array();
            $seen = array();
            foreach ($list as $link) {
                if (! is_array($link)) {
                    continue;
                }
                $relation = self::relation($link, $key, (string) $item['id']);
                // Source data can list the same record twice in one role; count it once.
                $dedupe = strtolower($relation['label'] . '|' . $relation['href'] . '|' . $relation['identifier']);
                if ($relation['label'] !== '' && ! isset($seen[$dedupe])) {
                    $seen[$dedupe] = true;
                    $rows[] = $relation;
                }
            }
            if ($rows) {
                $groups[] = array('label' => $config[0], 'items' => $rows);
            }
        }
        return $groups;
    }

    /**
     * One role group in the Connected ecosystem section. Groups longer than
     * RELATION_VISIBLE keep the rest in a native disclosure, so every record
     * stays reachable by keyboard and in the HTML.
     *
     * @param array{label:string, items:list<array{label:string, href:string, external:bool, source:string, identifier:string}>} $group
     */
    private static function relation_group_html(array $group, string $id): string {
        $items   = $group['items'];
        $visible = array_slice($items, 0, self::RELATION_VISIBLE);
        $rest    = array_slice($items, self::RELATION_VISIBLE);
        $list    = static function (array $rows): string {
            return '<ul class="fides-uc-relations">' . implode('', array_map(array(__CLASS__, 'relation_item_html'), $rows)) . '</ul>';
        };
        $html = '<div class="fides-uc-ecosystem__group" role="group" aria-labelledby="' . esc_attr($id) . '">'
            . '<h3 class="fides-uc-ecosystem__role" id="' . esc_attr($id) . '">' . esc_html($group['label'])
            . ' <span class="fides-uc-ecosystem__count">' . esc_html((string) count($items)) . '</span></h3>'
            . $list($visible);
        if ($rest) {
            $html .= '<details class="fides-uc-ecosystem__more"><summary>'
                . '<span class="fides-uc-ecosystem__more-closed">Show all ' . esc_html((string) count($items)) . '</span>'
                . '<span class="fides-uc-ecosystem__more-open">Show fewer</span>'
                . '<span class="fides-ds-visually-hidden"> ' . esc_html($group['label']) . '</span></summary>'
                . $list($rest) . '</details>';
        }
        return $html . '</div>';
    }

    /**
     * Internal catalog link, external link (marked) or plain text when the
     * record has no destination; URNs stay visible as code.
     *
     * @param array{label:string, href:string, external:bool, source:string, identifier:string} $relation
     */
    private static function relation_item_html(array $relation): string {
        if ($relation['href'] !== '') {
            $name = '<a class="fides-uc-relations__name" href="' . esc_url($relation['href']) . '"' . ($relation['external'] ? ' rel="noopener" target="_blank"' : '') . '>'
                . esc_html($relation['label'])
                . ($relation['external'] ? '<span aria-hidden="true"> ↗</span><span class="fides-ds-visually-hidden"> (external site, opens in a new tab)</span>' : '')
                . '</a>';
        } else {
            $name = '<span class="fides-uc-relations__label">' . esc_html($relation['label']) . '</span>';
        }
        $identifier = $relation['identifier'] !== ''
            ? '<code class="fides-uc-relations__identifier">' . esc_html($relation['identifier']) . '</code>'
            : '';
        return '<li class="fides-uc-relations__item">' . $name . $identifier
            . '<span class="fides-uc-relations__source">' . esc_html($relation['source']) . '</span></li>';
    }

    /**
     * Catalog deep link when the relation references a FIDES catalog record,
     * the relation's own http(s) URL otherwise, or plain text. A non-web
     * identifier in the url field (e.g. a URN) is kept and shown as text.
     *
     * @param array<string, mixed> $link
     * @return array{label:string, href:string, external:bool, source:string, identifier:string}
     */
    private static function relation(array $link, string $key, string $use_case_id): array {
        $ref        = trim((string) ($link['refId'] ?? ''));
        $raw_url    = trim((string) ($link['url'] ?? ''));
        $url        = self::http_url($raw_url);
        $identifier = $url === '' ? $raw_url : '';
        if ($ref !== '' && $key === 'credentials') {
            $ref = Fides_Use_Case_Design::credential_canonical_id($ref);
        }
        $label = trim((string) ($link['labelRaw'] ?? ''));
        $label = $label !== '' ? $label : ($ref !== '' ? $ref : ($url !== '' ? $url : $identifier));
        if ($identifier === $label) {
            $identifier = '';
        }
        $urls  = fides_use_case_catalog_catalog_urls();
        $href  = '';
        if ($ref !== '' && isset(self::RELATION_GROUPS[$key])) {
            [, $url_key, $param] = self::RELATION_GROUPS[$key];
            $base = isset($urls[$url_key]) ? rtrim((string) $urls[$url_key], '/') : '';
            if ($base !== '' && $key === 'organizations') {
                $href = add_query_arg('from', rawurlencode('usecase:' . $use_case_id), $base . '/' . rawurlencode($ref) . '/');
            } elseif ($base !== '' && $param !== '') {
                $href = $base . '/?' . $param . '=' . rawurlencode($ref);
            }
        }
        $external = false;
        if ($href === '' && $url !== '') {
            $href     = $url;
            $external = true;
        }
        $in_catalog = ($link['source'] ?? '') === 'catalog' && $ref !== '';
        return array(
            'label'      => $label,
            'href'       => $href,
            'external'   => $external,
            'source'     => $in_catalog ? 'FIDES catalog record' : 'Listed by the submitter',
            'identifier' => $identifier,
        );
    }

    private static function http_url(string $url): string {
        $url = trim($url);
        return preg_match('~^https?://~i', $url) === 1 ? $url : '';
    }

    /**
     * @param array<string, mixed> $item
     * @return list<array{url:string, provider_label:string, thumbnail:string}>
     */
    private static function videos(array $item): array {
        $rows = isset($item['videos']) && is_array($item['videos']) ? $item['videos'] : array();
        if (! $rows && isset($item['video']) && is_array($item['video'])) {
            $rows = array($item['video']);
        }
        $videos = array();
        $seen   = array();
        foreach ($rows as $row) {
            $url = is_array($row) ? self::http_url((string) ($row['url'] ?? '')) : '';
            if ($url === '' || isset($seen[$url])) {
                continue;
            }
            $seen[$url] = true;
            $provider   = strtolower((string) ($row['provider'] ?? ''));
            $videos[]   = array(
                'url'            => $url,
                'provider_label' => $provider === 'youtube' ? 'YouTube' : ($provider === 'vimeo' ? 'Vimeo' : (string) wp_parse_url($url, PHP_URL_HOST)),
                'thumbnail'      => $provider === 'youtube' ? fides_use_case_catalog_youtube_thumbnail_url($url) : '',
            );
        }
        return $videos;
    }

    /**
     * @param array<string, mixed> $item
     * @return list<string>
     */
    private static function images(array $item): array {
        $images = isset($item['imageUrls']) && is_array($item['imageUrls']) ? $item['imageUrls'] : array();
        if (! empty($item['imageUrl'])) {
            array_unshift($images, (string) $item['imageUrl']);
        }
        return array_values(array_unique(array_filter(array_map(array(__CLASS__, 'http_url'), array_map('strval', $images)))));
    }
}
