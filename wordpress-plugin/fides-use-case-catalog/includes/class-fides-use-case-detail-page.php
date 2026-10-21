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
 *  - detail_url  Base URL for this page's share link (default: this page).
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
                . '<p><a class="fides-ds-action-link" href="' . esc_url($listing_url) . '"><span aria-hidden="true">←</span> <span>All use cases</span></a></p>'
                . '</div></div>';
        }

        return self::render($item, $listing_url, $detail_base);
    }

    /**
     * One template for every record: each block renders only when its source
     * field is present. Desktop: text column + side column; below 1100px one
     * column in reading order (see usecase-design.css).
     *
     * @param array<string, mixed> $item
     */
    private static function render(array $item, string $listing_url, string $detail_base): string {
        $id          = (string) $item['id'];
        $title       = (string) $item['title'];
        $summary     = self::paragraphs((string) ($item['summary'] ?? ''));
        $journey     = self::journey((string) ($item['userJourney'] ?? ''));
        $technical   = self::technical_rows($item);
        $groups      = self::relation_groups($item);
        $orgs        = $groups['organizations'] ?? null;
        unset($groups['organizations']);
        $ecosystem   = array_values($groups);
        $compact     = $ecosystem && max(array_map(static function (array $group): int { return count($group['items']); }, $ecosystem)) <= 3;
        $tags        = isset($item['tags']) && is_array($item['tags']) ? array_values(array_filter(array_map('strval', $item['tags']))) : array();
        $themes      = self::theme_options($item);
        $videos      = self::videos($item);
        $images      = self::images($item);
        $more_info   = self::http_url((string) ($item['moreInfoUrl'] ?? ''));
        $status      = Fides_Use_Case_Design::status_label($item);
        $updated     = Fides_Use_Case_Design::updated_date($item, true);
        $updated_iso = preg_match('/^\d{4}-\d{2}-\d{2}/', (string) ($item['updatedAt'] ?? ''), $m) ? $m[0] : '';
        $page_url    = Fides_Use_Case_Design::detail_url($id, $detail_base);
        $awards      = Fides_Use_Case_Design::award_recognitions($id);
        $likes       = Fides_Use_Case_Design::like_count($id);
        $related     = fides_use_case_catalog_similar_cases_enabled() ? Fides_Use_Case_Design::similar_matches($item, 3) : array();
        $hero_image  = self::http_url(Fides_Use_Case_Design::image_url($item));
        if ($hero_image === '' && $videos && $videos[0]['poster'] !== '') {
            $hero_image = $videos[0]['poster'];
        }
        // A video still in the hero must play, not look playable and do nothing.
        $hero_poster = $videos && $hero_image !== '' && $hero_image === $videos[0]['poster'];
        $has_media   = $videos || count($images) > 1;
        // Without a media section, a single image is only reachable through this link.
        $original    = ! $has_media && count($images) === 1 ? $images[0] : '';
        $media_title = Fides_DS_Gallery::title(count($images), count($videos));

        $sections = array();
        if ($summary) {
            $sections['overview'] = 'Overview';
        }
        if ($journey['steps'] || $journey['paragraphs']) {
            $sections['user-journey'] = 'User journey';
        }
        if ($orgs) {
            $sections['organisations'] = 'Organisations';
        }
        if ($ecosystem) {
            $sections['ecosystem'] = 'Ecosystem';
        }
        if ($technical) {
            $sections['technical-details'] = 'Technical details';
        }
        if ($has_media) {
            $sections['media'] = $media_title;
        }

        ob_start();
        ?>
<div class="fides-ds fides-uc-detail" data-use-case-id="<?php echo esc_attr($id); ?>">
  <div class="fides-ds-page">
    <?php
    echo Fides_DS_Detail_Top::render(array( // phpcs:ignore WordPress.Security.EscapeOutput
        'back_url'   => $listing_url,
        'back_label' => 'All use cases',
        'back_attrs' => array('data-fides-ds-back' => 'usecase', 'data-fides-ds-back-id' => $id),
        'crumbs'     => array(
            array('Ecosystem Explorer', class_exists('Fides_DS_Site_Shell') ? Fides_DS_Site_Shell::url('/ecosystem-explorer/') : home_url('/ecosystem-explorer/')),
            array('Use cases', $listing_url),
        ),
        'share_url'  => $page_url,
    ));
    ?>

    <header class="fides-uc-detail__hero<?php echo $hero_image === '' ? ' fides-uc-detail__hero--no-media' : ''; ?>">
      <div class="fides-uc-detail__intro">
        <?php if (Fides_Use_Case_Design::kicker($item) !== '') : ?>
          <p class="fides-ds-kicker"><?php echo esc_html(Fides_Use_Case_Design::kicker($item)); ?></p>
        <?php endif; ?>
        <h1 class="fides-ds-heading-1 fides-ds-heading-1--detail fides-uc-detail__title"><?php echo esc_html($title); ?></h1>
        <?php if ($status !== '' || $awards || $likes > 0) : ?>
          <ul class="fides-uc-detail__badges">
            <?php if ($status !== '') : ?>
              <li><span class="fides-ds-status"><?php echo esc_html($status); ?></span></li>
            <?php endif; ?>
            <?php foreach ($awards as $award) : ?>
              <li><?php echo self::award_html($award); // phpcs:ignore WordPress.Security.EscapeOutput ?></li>
            <?php endforeach; ?>
            <?php if ($likes > 0) : ?>
              <li class="fides-ds-meta"><?php echo esc_html(Fides_Use_Case_Design::like_label($likes)); ?></li>
            <?php endif; ?>
          </ul>
        <?php endif; ?>
        <?php if ($more_info !== '' || $has_media) : ?>
          <div class="fides-uc-detail__actions">
            <?php if ($more_info !== '') : ?>
              <a class="fides-ds-button" href="<?php echo esc_url($more_info); ?>" rel="noopener" target="_blank">More information <span aria-hidden="true">↗</span><span class="fides-ds-visually-hidden"> (opens in a new tab)</span></a>
            <?php endif; ?>
            <?php if ($has_media) : ?>
              <a class="fides-ds-action-link" href="#media"><span><?php echo $videos ? 'Watch media' : 'View images'; ?></span> <span aria-hidden="true">↓</span></a>
            <?php endif; ?>
          </div>
        <?php endif; ?>
      </div>
      <?php if ($hero_image !== '' && $original !== '') : ?>
        <div class="fides-uc-detail__visual">
          <figure class="fides-uc-detail__media">
            <img class="fides-ds-card__img" src="<?php echo esc_url($hero_image); ?>" alt="" decoding="async" fetchpriority="high">
          </figure>
          <a class="fides-ds-action-link fides-uc-detail__original" href="<?php echo esc_url($original); ?>" rel="noopener" target="_blank"><span>Open original image</span> <span aria-hidden="true">↗</span><span class="fides-ds-visually-hidden"> (opens in a new tab)</span></a>
        </div>
      <?php elseif ($hero_poster) : ?>
        <a class="fides-uc-detail__media fides-uc-detail__media--video" href="#media" data-fides-ds-play>
          <img class="fides-ds-card__img" src="<?php echo esc_url($hero_image); ?>" alt="" decoding="async" fetchpriority="high">
          <span class="fides-ds-gallery__play" aria-hidden="true"></span>
          <span class="fides-ds-visually-hidden">Play video: <?php echo esc_html($title); ?></span>
        </a>
      <?php elseif ($hero_image !== '') : ?>
        <figure class="fides-uc-detail__media">
          <img class="fides-ds-card__img" src="<?php echo esc_url($hero_image); ?>" alt="" decoding="async" fetchpriority="high">
        </figure>
      <?php endif; ?>
    </header>

    <?php if (count($sections) > 1) : ?>
      <details class="fides-ds-section-nav fides-uc-detail__sections" data-fides-ds-section-nav>
        <summary>On this page <svg class="fides-ds-section-nav__chevron" aria-hidden="true" focusable="false" width="12" height="8" viewBox="0 0 12 8"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></summary>
        <nav aria-label="On this page">
          <ul>
            <?php foreach ($sections as $anchor => $label) : ?>
              <li><a href="#<?php echo esc_attr($anchor); ?>"><?php echo esc_html($label); ?></a></li>
            <?php endforeach; ?>
            <li class="fides-uc-detail__sections-update"><a href="#update"><span>Suggest an update</span> <span aria-hidden="true">→</span></a></li>
          </ul>
        </nav>
      </details>
    <?php endif; ?>

    <div class="fides-uc-detail__body<?php echo $compact ? ' fides-uc-detail__body--compact' : ''; ?>">
      <div class="fides-uc-detail__main">
        <?php if ($summary) : ?>
          <section class="fides-uc-detail__section" id="overview" aria-labelledby="overview-title">
            <h2 class="fides-ds-heading-2" id="overview-title">Overview</h2>
            <div data-fides-ds-readmore="8" data-fides-ds-readmore-label="Read full overview">
              <div class="fides-ds-readmore__body fides-ds-prose" id="overview-text"><?php echo self::paragraphs_html($summary); // phpcs:ignore WordPress.Security.EscapeOutput ?></div>
            </div>
          </section>
        <?php endif; ?>
        <?php if ($journey['steps'] || $journey['paragraphs']) : ?>
          <section class="fides-uc-detail__section" id="user-journey" aria-labelledby="user-journey-title">
            <h2 class="fides-ds-heading-2" id="user-journey-title">User journey</h2>
            <div data-fides-ds-readmore="10" data-fides-ds-readmore-label="Read full user journey">
              <div class="fides-ds-readmore__body" id="user-journey-text">
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
              </div>
            </div>
          </section>
        <?php endif; ?>
      </div>

      <div class="fides-uc-detail__aside fides-ds-context">
        <?php if ($orgs) : ?>
          <section class="fides-ds-panel fides-uc-detail__panel fides-uc-detail__orgs" id="organisations" aria-labelledby="organisations-title">
            <h2 class="fides-ds-panel__title" id="organisations-title">Organisations involved <span class="fides-uc-detail__count"><?php echo esc_html((string) count($orgs['items'])); ?></span></h2>
            <ul class="fides-uc-relations" id="organisations-list" data-fides-ds-show-all="3" data-fides-ds-show-all-label="organisations">
              <?php foreach ($orgs['items'] as $relation) : ?>
                <?php echo self::relation_item_html($relation); // phpcs:ignore WordPress.Security.EscapeOutput ?>
              <?php endforeach; ?>
            </ul>
          </section>
        <?php endif; ?>

        <?php if ($ecosystem) : ?>
          <section class="fides-uc-detail__panel fides-uc-ecosystem-summary" aria-labelledby="ecosystem-summary-title">
            <h2 class="fides-ds-panel__title" id="ecosystem-summary-title">Connected ecosystem</h2>
            <p class="fides-uc-ecosystem-summary__intro">Entries per role. One party can appear in more than one role.</p>
            <dl class="fides-uc-ecosystem-summary__roles">
              <?php foreach ($ecosystem as $group) : ?>
                <div class="fides-uc-ecosystem-summary__role">
                  <dt><a href="#<?php echo esc_attr($group['anchor']); ?>"><?php echo esc_html($group['label']); ?></a></dt>
                  <dd><?php echo esc_html((string) count($group['items'])); ?></dd>
                </div>
              <?php endforeach; ?>
            </dl>
            <a class="fides-ds-action-link fides-uc-ecosystem-summary__link" href="#ecosystem"><span>View connected ecosystem</span> <span aria-hidden="true">↓</span></a>
          </section>
        <?php endif; ?>

        <?php if ($technical) : ?>
          <section class="fides-ds-panel fides-uc-detail__panel fides-uc-detail__technical" id="technical-details" aria-labelledby="technical-details-title" data-fides-ds-collapsible="closed">
            <h2 class="fides-ds-panel__title" id="technical-details-title" data-fides-ds-collapsible-title>Technical details</h2>
            <div data-fides-ds-collapsible-body id="technical-details-body">
              <dl class="fides-ds-facts">
                <?php foreach ($technical as $label => $value) : ?>
                  <?php echo self::fact($label, $value); // phpcs:ignore WordPress.Security.EscapeOutput ?>
                <?php endforeach; ?>
              </dl>
            </div>
          </section>
        <?php endif; ?>

        <?php if ($themes || $tags) : ?>
          <section class="fides-ds-panel fides-uc-detail__panel fides-uc-detail__tags" aria-labelledby="tags-title">
            <h2 class="fides-ds-panel__title" id="tags-title"><?php echo $tags ? 'Tags' : 'Themes'; ?></h2>
            <?php if ($themes) : ?>
              <p class="fides-uc-detail__themes"><?php echo $tags ? '<span class="fides-uc-detail__themes-label">Themes</span> ' : ''; // phpcs:ignore WordPress.Security.EscapeOutput ?>
                <?php
                $links = array();
                foreach ($themes as $slug => $label) {
                    $links[] = '<a href="' . esc_url(add_query_arg('theme', rawurlencode((string) $slug), $listing_url)) . '">' . esc_html($label) . '</a>';
                }
                echo implode('<span aria-hidden="true"> · </span>', $links); // phpcs:ignore WordPress.Security.EscapeOutput
                ?>
              </p>
            <?php endif; ?>
            <?php if ($tags) : ?>
              <ul class="fides-ds-tags">
                <?php foreach ($tags as $tag) : ?>
                  <li class="fides-ds-tag"><?php echo esc_html($tag); ?></li>
                <?php endforeach; ?>
              </ul>
            <?php endif; ?>
          </section>
        <?php endif; ?>
      </div>

      <?php if ($ecosystem) : ?>
        <section class="fides-uc-ecosystem<?php echo $compact ? ' fides-uc-ecosystem--compact' : ' fides-uc-ecosystem--wide'; ?>" id="ecosystem" aria-labelledby="ecosystem-title">
          <div class="fides-uc-ecosystem__head">
            <h2 class="fides-ds-heading-3" id="ecosystem-title">Connected ecosystem</h2>
            <p class="fides-uc-ecosystem__intro">The wallets, credentials and participants listed for this use case, by role.</p>
          </div>
          <div class="fides-uc-ecosystem__groups">
            <?php foreach ($ecosystem as $group) : ?>
              <?php echo self::relation_group_html($group); // phpcs:ignore WordPress.Security.EscapeOutput ?>
            <?php endforeach; ?>
          </div>
        </section>
      <?php endif; ?>

      <?php if ($has_media) : ?>
        <?php echo self::media_html($images, $videos, $media_title, $more_info); // phpcs:ignore WordPress.Security.EscapeOutput ?>
      <?php endif; ?>

      <?php if ($related) : ?>
        <section class="fides-uc-detail__related" aria-labelledby="related-title">
          <div class="fides-uc-detail__related-head">
            <h2 class="fides-ds-heading-2" id="related-title">Explore further</h2>
            <a class="fides-ds-action-link" href="<?php echo esc_url($listing_url); ?>"><span>All use cases</span> <span aria-hidden="true">→</span></a>
          </div>
          <ul class="fides-ds-cards fides-ds-cards--tiles fides-uc-detail__related-cards">
            <?php foreach ($related as $match) : ?>
              <li><?php echo self::related_card_html($match['item'], $match['reason'], $detail_base); // phpcs:ignore WordPress.Security.EscapeOutput ?></li>
            <?php endforeach; ?>
          </ul>
        </section>
      <?php endif; ?>

      <section class="fides-uc-detail__update" id="update" aria-labelledby="update-title">
        <div>
          <h2 class="fides-ds-heading-3" id="update-title">Help keep this use case current.</h2>
          <?php if ($updated !== '') : ?>
            <p class="fides-ds-meta">Updated <time datetime="<?php echo esc_attr($updated_iso); ?>"><?php echo esc_html($updated); ?></time></p>
          <?php endif; ?>
        </div>
        <?php echo self::update_action_html($id); // phpcs:ignore WordPress.Security.EscapeOutput ?>
      </section>
    </div>
  </div>
</div>
        <?php
        return (string) ob_get_clean();
    }

    /**
     * Media band around the shared design-system gallery (Fides_DS_Gallery).
     *
     * @param list<string> $images
     * @param list<array{url:string, provider_label:string, poster:string, embed:string}> $videos
     */
    private static function media_html(array $images, array $videos, string $title, string $more_info): string {
        $html = '<section class="fides-ds-band--dark fides-uc-detail__band" id="media" aria-labelledby="media-title">'
            . '<div class="fides-uc-detail__band-text">'
            . '<h2 class="fides-ds-heading-3" id="media-title">' . esc_html($title) . '</h2>'
            . '<p class="fides-uc-detail__band-count">' . esc_html(Fides_DS_Gallery::count_label(count($images), count($videos))) . '</p>';
        if ($more_info !== '') {
            $html .= '<p><a class="fides-ds-action-link" href="' . esc_url($more_info) . '" rel="noopener" target="_blank"><span>More information</span> <span aria-hidden="true">↗</span><span class="fides-ds-visually-hidden"> (opens in a new tab)</span></a></p>';
        }
        return $html . '</div>' . Fides_DS_Gallery::render(Fides_DS_Gallery::items($images, $videos), $title) . '</section>';
    }

    /**
     * @param array{program_label:string, program_url:string, year:int, category_label:string, place:int} $award
     */
    /**
     * Explore further tile: the match reason from similar_matches() above the
     * title, the organization below it.
     *
     * @param array<string, mixed> $item
     */
    private static function related_card_html(array $item, string $reason, string $detail_base): string {
        return Fides_Use_Case_Design::render_card($item, 'tile', $detail_base, array(
            'kicker' => $reason,
            'meta'   => trim((string) ($item['organizationName'] ?? '')),
        ));
    }

    private static function award_html(array $award): string {
        $text   = Fides_Use_Case_Design::award_label($award);
        $detail = $award['program_label'] . ($award['category_label'] !== '' ? ' (' . $award['category_label'] . ')' : '');
        $url    = self::http_url($award['program_url']);
        $inner  = esc_html($text) . ($detail !== '' ? '<span class="fides-ds-visually-hidden">, ' . esc_html($detail) . '</span>' : '');
        return $url !== ''
            ? '<a class="fides-ds-status fides-uc-detail__award" href="' . esc_url($url) . '" rel="noopener" target="_blank" title="' . esc_attr($detail) . '">' . $inner . '<span class="fides-ds-visually-hidden"> (opens in a new tab)</span></a>'
            : '<span class="fides-ds-status fides-uc-detail__award" title="' . esc_attr($detail) . '">' . $inner . '</span>';
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

    private static function fact(string $label, string $value): string {
        $value = trim($value);
        if ($value === '') {
            return '';
        }
        return '<div class="fides-ds-facts__row"><dt>' . esc_html($label) . '</dt><dd>' . esc_html($value) . '</dd></div>';
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
     * @return array<string, string> theme slug => label
     */
    private static function theme_options(array $item): array {
        $options = fides_use_case_catalog_theme_options();
        $themes  = isset($item['themes']) && is_array($item['themes']) ? $item['themes'] : array();
        $labels  = array();
        foreach ($themes as $theme) {
            $theme = (string) $theme;
            if ($theme !== '') {
                $labels[$theme] = $options[$theme] ?? $theme;
            }
        }
        return $labels;
    }

    /**
     * Role groups keyed by link key; empty roles are left out. Only exact
     * duplicate references (same name, destination and identifier) are shown
     * once; different records with the same name stay separate.
     *
     * @param array<string, mixed> $item
     * @return array<string, array{label:string, anchor:string, items:list<array{label:string, href:string, external:bool, source:string, identifier:string}>}>
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
                $dedupe   = $relation['label'] . '|' . $relation['href'] . '|' . $relation['identifier'];
                if ($relation['label'] !== '' && ! isset($seen[$dedupe])) {
                    $seen[$dedupe] = true;
                    $rows[] = $relation;
                }
            }
            if ($rows) {
                $groups[$key] = array('label' => $config[0], 'anchor' => 'ecosystem-' . strtolower($key), 'items' => $rows);
            }
        }
        return $groups;
    }

    /**
     * One role group in the Connected ecosystem section. Below 1100px it is
     * a disclosure: groups with up to three records start open, longer ones
     * closed with the count visible. All records stay in the HTML.
     *
     * @param array{label:string, anchor:string, items:list<array{label:string, href:string, external:bool, source:string, identifier:string}>} $group
     */
    private static function relation_group_html(array $group): string {
        $items = $group['items'];
        $id    = $group['anchor'];
        return '<section class="fides-uc-ecosystem__group" id="' . esc_attr($id) . '" aria-labelledby="' . esc_attr($id . '-title') . '"'
            . ' data-fides-ds-collapsible="' . (count($items) <= 3 ? 'open' : 'closed') . '">'
            . '<h3 class="fides-uc-ecosystem__role" id="' . esc_attr($id . '-title') . '" data-fides-ds-collapsible-title>'
            . esc_html($group['label']) . ' <span class="fides-uc-ecosystem__count">' . esc_html((string) count($items)) . '</span></h3>'
            . '<div data-fides-ds-collapsible-body id="' . esc_attr($id . '-body') . '"><ul class="fides-uc-relations">'
            . implode('', array_map(array(__CLASS__, 'relation_item_html'), $items))
            . '</ul></div></section>';
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
        $identifier = $url === '' && preg_match('~^https?:~i', $raw_url) !== 1 ? $raw_url : '';
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
            if ($key === 'organizations') {
                $href = Fides_Use_Case_Design::organization_profile_href($ref, 'usecase:' . $use_case_id);
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
        return Fides_DS_Gallery::http_url($url);
    }

    /**
     * @param array<string, mixed> $item
     * @return list<array{url:string, provider_label:string, poster:string, embed:string}>
     */
    private static function videos(array $item): array {
        $rows = isset($item['videos']) && is_array($item['videos']) ? $item['videos'] : array();
        if (! $rows && isset($item['video']) && is_array($item['video'])) {
            $rows = array($item['video']);
        }
        $videos = array();
        foreach ($rows as $row) {
            $video = is_array($row) ? Fides_DS_Gallery::video((string) ($row['url'] ?? ''), (string) ($row['provider'] ?? '')) : null;
            if ($video !== null && ! isset($videos[$video['url']])) {
                $videos[$video['url']] = $video;
            }
        }
        return array_values($videos);
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
