<?php
/**
 * [fides_use_case_featured] — editor-selected use case for a homepage slot (design pilot).
 *
 * Editors choose a published use case by its stable catalog id under
 * Settings → FIDES Use Case Catalog → Homepage feature, plus an optional
 * fallback. Title, image, organization and status always come from the
 * catalog; the slot only stores ids.
 *
 * Attributes:
 *  - id         Override the configured primary id (e.g. on a test page).
 *  - fallback   Override the configured fallback id.
 *  - detail_url Detail page base URL; default is the canonical /use-case/{id}/ URL.
 *  - variant    feature (default) or tile.
 *
 * @package fides-use-case-catalog
 */

if (! defined('ABSPATH')) {
    exit;
}

final class Fides_Use_Case_Featured {

    public const OPTION = 'fides_use_case_featured';

    public static function bootstrap(): void {
        add_shortcode('fides_use_case_featured', array(__CLASS__, 'shortcode'));
        add_action('admin_init', array(__CLASS__, 'register_setting'));
        add_action('admin_enqueue_scripts', array(__CLASS__, 'admin_assets'));
        add_action('fides_use_case_catalog_settings_sections', array(__CLASS__, 'render_settings_section'));
    }

    /**
     * @return array{primary:string, fallback:string}
     */
    public static function selection(): array {
        $value = get_option(self::OPTION, array());
        $value = is_array($value) ? $value : array();
        return array(
            'primary'  => isset($value['primary']) ? (string) $value['primary'] : '',
            'fallback' => isset($value['fallback']) ? (string) $value['fallback'] : '',
        );
    }

    public static function register_setting(): void {
        register_setting(
            FIDES_USE_CASE_CATALOG_SETTINGS_GROUP,
            self::OPTION,
            array(
                'type'              => 'array',
                'default'           => array('primary' => '', 'fallback' => ''),
                'sanitize_callback' => array(__CLASS__, 'sanitize'),
            )
        );
    }

    /**
     * @param mixed $value
     * @return array{primary:string, fallback:string}
     */
    public static function sanitize($value): array {
        $value = is_array($value) ? $value : array();
        $clean = array();
        foreach (array('primary', 'fallback') as $key) {
            $raw         = isset($value[$key]) ? (string) wp_unslash($value[$key]) : '';
            $clean[$key] = fides_use_case_catalog_sanitize_use_case_id($raw);
            if ($raw !== '' && $clean[$key] === '') {
                add_settings_error(self::OPTION, 'invalid-' . $key, sprintf('The %s homepage use case id is not a valid catalog id and was cleared.', $key));
            } elseif ($clean[$key] !== '' && Fides_Use_Case_Design::find($clean[$key]) === null) {
                // Kept on purpose: the catalog may be temporarily unreachable; rendering skips it.
                add_settings_error(
                    self::OPTION,
                    'missing-' . $key,
                    sprintf('The %s homepage use case "%s" is not in the current FIDES catalog. It is saved, but skipped until it appears.', $key, $clean[$key]),
                    'warning'
                );
            }
        }
        return $clean;
    }

    /**
     * Resolve the item to show: explicit id, configured primary, then fallback.
     * Ids that are not (or no longer) in the published catalog are skipped.
     *
     * @return array{item: array<string, mixed>|null, used: string, skipped: list<string>}
     */
    public static function resolve(string $id = '', string $fallback = ''): array {
        $selection  = self::selection();
        $candidates = array_values(array_unique(array_filter(array(
            trim($id) !== '' ? trim($id) : $selection['primary'],
            trim($fallback) !== '' ? trim($fallback) : $selection['fallback'],
        ))));
        $skipped = array();
        foreach ($candidates as $candidate) {
            $item = Fides_Use_Case_Design::find($candidate);
            if ($item !== null) {
                return array('item' => $item, 'used' => $candidate, 'skipped' => $skipped);
            }
            $skipped[] = $candidate;
        }
        return array('item' => null, 'used' => '', 'skipped' => $skipped);
    }

    /**
     * @param array<string, string>|string $atts
     */
    public static function shortcode($atts = array()): string {
        $atts = shortcode_atts(
            array(
                'id'         => '',
                'fallback'   => '',
                'detail_url' => '',
                'variant'    => 'feature',
            ),
            is_array($atts) ? $atts : array(),
            'fides_use_case_featured'
        );
        if (! Fides_Use_Case_Design::available()) {
            return '';
        }
        $resolved = self::resolve((string) $atts['id'], (string) $atts['fallback']);
        if ($resolved['item'] === null) {
            // No valid selection: render nothing so the surrounding page intro stands alone.
            return current_user_can('manage_options')
                ? '<!-- fides_use_case_featured: no published use case for the configured ids -->'
                : '';
        }
        Fides_Use_Case_Design::enqueue();
        $variant = $atts['variant'] === 'tile' ? 'tile' : 'feature';
        $card    = Fides_Use_Case_Design::render_card(
            $resolved['item'],
            $variant,
            (string) $atts['detail_url'],
            array('title_tag' => 'h2', 'image_loading' => 'eager')
        );
        return '<div class="fides-ds fides-uc-featured" data-fides-featured-source="' . esc_attr($resolved['used']) . '">' . $card . '</div>';
    }

    public static function admin_assets(string $hook): void {
        if ($hook !== 'settings_page_fides-use-case-catalog') {
            return;
        }
        Fides_Use_Case_Design::register_assets();
        Fides_Use_Case_Design::enqueue();
    }

    public static function render_settings_section(): void {
        $selection = self::selection();
        $items     = Fides_Use_Case_Design::items();
        usort($items, static function ($a, $b) {
            return strcasecmp((string) $a['title'], (string) $b['title']);
        });
        $resolved = self::resolve();
        ?>
        <h2 id="homepage-feature"><?php esc_html_e('Homepage feature', 'fides-use-case-catalog'); ?></h2>
        <p><?php esc_html_e('Choose a published use case for the [fides_use_case_featured] slot. Only the stable catalog id is stored; title, image, organization and status are loaded from the catalog.', 'fides-use-case-catalog'); ?></p>
        <?php if (! $items) : ?>
            <div class="notice notice-warning inline"><p><?php esc_html_e('The published catalog could not be loaded, so no use cases can be listed right now. Saved ids are kept.', 'fides-use-case-catalog'); ?></p></div>
        <?php endif; ?>
        <table class="form-table" role="presentation">
            <?php foreach (array('primary' => __('Featured use case', 'fides-use-case-catalog'), 'fallback' => __('Fallback use case', 'fides-use-case-catalog')) as $key => $label) : ?>
                <tr>
                    <th scope="row"><label for="fides-use-case-featured-<?php echo esc_attr($key); ?>"><?php echo esc_html($label); ?></label></th>
                    <td>
                        <select id="fides-use-case-featured-<?php echo esc_attr($key); ?>" name="<?php echo esc_attr(self::OPTION . '[' . $key . ']'); ?>" style="max-width:100%">
                            <option value=""><?php echo esc_html($key === 'primary' ? __('— None —', 'fides-use-case-catalog') : __('— No fallback —', 'fides-use-case-catalog')); ?></option>
                            <?php
                            $found = false;
                            foreach ($items as $item) :
                                $id = (string) $item['id'];
                                $found = $found || $id === $selection[$key];
                                ?>
                                <option value="<?php echo esc_attr($id); ?>" <?php selected($selection[$key], $id); ?>><?php echo esc_html((string) $item['title'] . ' — ' . (string) ($item['organizationName'] ?? '')); ?></option>
                            <?php endforeach; ?>
                            <?php if ($selection[$key] !== '' && ! $found) : ?>
                                <option value="<?php echo esc_attr($selection[$key]); ?>" selected><?php echo esc_html(sprintf(__('Not in the published catalog: %s', 'fides-use-case-catalog'), $selection[$key])); ?></option>
                            <?php endif; ?>
                        </select>
                        <?php if ($selection[$key] !== '') : ?>
                            <p class="description"><?php esc_html_e('Catalog id:', 'fides-use-case-catalog'); ?> <code><?php echo esc_html($selection[$key]); ?></code></p>
                        <?php endif; ?>
                        <?php if ($key === 'fallback') : ?>
                            <p class="description"><?php esc_html_e('Shown when the featured use case is removed from the catalog. Without any valid choice the slot renders nothing.', 'fides-use-case-catalog'); ?></p>
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
            <tr>
                <th scope="row"><?php esc_html_e('Preview', 'fides-use-case-catalog'); ?></th>
                <td>
                    <?php if ($resolved['skipped']) : ?>
                        <div class="notice notice-warning inline"><p><?php echo esc_html(sprintf(__('Not in the published catalog (skipped): %s', 'fides-use-case-catalog'), implode(', ', $resolved['skipped']))); ?></p></div>
                    <?php endif; ?>
                    <?php if ($resolved['item'] !== null) : ?>
                        <p class="description"><?php echo esc_html(sprintf(__('Currently shown: %s', 'fides-use-case-catalog'), $resolved['used'])); ?></p>
                        <div class="fides-ds fides-uc-featured fides-uc-featured--admin-preview" style="max-width:576px;margin-top:12px">
                            <?php echo Fides_Use_Case_Design::render_card($resolved['item'], 'feature', '', array('title_tag' => 'h3')); // phpcs:ignore WordPress.Security.EscapeOutput ?>
                        </div>
                    <?php else : ?>
                        <p class="description"><?php esc_html_e('Nothing is shown in the slot.', 'fides-use-case-catalog'); ?></p>
                    <?php endif; ?>
                </td>
            </tr>
        </table>
        <?php
    }
}
