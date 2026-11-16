<?php
/**
 * Hash of a Learn page, matching create-learn-pages.php. Used to see whether
 * a page still has the state this install wrote.
 */

if (! defined('ABSPATH')) {
    exit(1);
}

require_once dirname(__DIR__) . '/staging/seed-guard.php';

/**
 * Keys of LEARN_LAYOUT_META in create-learn-pages.php. Blocksy's saved array
 * is intersected with these keys; extra style-cache keys do not count.
 *
 * @return array<string,bool>
 */
function fides_learn_trial_layout_keys(): array {
    return array(
        'has_hero_section'        => true,
        'page_structure_type'     => true,
        'content_style_source'    => true,
        'content_style'           => true,
        'vertical_spacing_source' => true,
        'content_area_spacing'    => true,
        'disable_featured_image'  => true,
        'disable_share_box'       => true,
    );
}

/** @return array<string,mixed> */
function fides_learn_trial_state(int $id): array {
    $post = get_post($id);
    if (! $post) {
        return array();
    }
    $meta = array();
    foreach (array_keys(Fides_DS_Learn::FIELDS) as $field) {
        $meta[ $field ] = trim((string) get_post_meta($id, '_fides_learn_' . $field, true));
    }
    $layout = get_post_meta($id, 'blocksy_post_meta_options', true);
    return array(
        'title'      => (string) $post->post_title,
        'excerpt'    => (string) $post->post_excerpt,
        'content'    => (string) $post->post_content,
        'status'     => (string) $post->post_status,
        'menu_order' => (int) $post->menu_order,
        'template'   => (string) get_post_meta($id, '_wp_page_template', true),
        'meta'       => $meta,
        'layout'     => is_array($layout) ? array_intersect_key($layout, fides_learn_trial_layout_keys()) : array(),
    );
}

function fides_learn_trial_hash(int $id): string {
    $state = fides_learn_trial_state($id);
    if ($state === array()) {
        return '';
    }
    $state['meta'] = array_filter($state['meta'], 'strlen');
    return sha1(fides_pilot_normalize((string) wp_json_encode($state)));
}
