<?php
/**
 * Create the design pilot test pages in the pilot database (idempotent).
 * Run through WP-CLI: create-pages.sh (wp eval-file).
 *
 * Pages live under /fides-design-pilot/ and are new; existing pages, menus and
 * the active homepage are not touched.
 */

if (! defined('ABSPATH') || ! defined('FIDES_DESIGN_PILOT')) {
    fwrite(STDERR, "Refusing to run outside the design pilot site.\n");
    exit(1);
}

const PILOT_DETAIL_ID   = 'verifiable-ai-fairness-a-seal-for-the-system-a-receipt-for-the-person-O0S54J';
const PILOT_FEATURED_ID = 'digital-certificate-of-good-conduct-vog-as-a-verifiable-credential-yjw4BC';

$layout_meta = array(
    'has_hero_section'        => 'disabled',
    'page_structure_type'     => 'type-4',
    'content_style_source'    => 'custom',
    'content_style'           => 'wide',
    'vertical_spacing_source' => 'custom',
    'content_area_spacing'    => 'none',
    'disable_featured_image'  => 'yes',
    'disable_share_box'       => 'yes',
);

function pilot_upsert_page(string $path, string $title, string $content, int $parent, array $layout_meta): int {
    $existing = get_page_by_path($path);
    $postarr  = array(
        'post_type'    => 'page',
        'post_status'  => 'publish',
        'post_title'   => $title,
        'post_name'    => basename($path),
        'post_parent'  => $parent,
        'post_content' => $content,
    );
    if ($existing instanceof WP_Post) {
        $postarr['ID'] = $existing->ID;
        $id = wp_update_post($postarr, true);
    } else {
        $id = wp_insert_post($postarr, true);
    }
    if (is_wp_error($id)) {
        fwrite(STDERR, $id->get_error_message() . "\n");
        exit(1);
    }
    update_post_meta($id, 'blocksy_post_meta_options', $layout_meta);
    update_post_meta($id, '_fides_design_pilot', '1');
    WP_CLI::log(sprintf('%-40s %s', $path, get_permalink($id)));
    return (int) $id;
}

$parent = pilot_upsert_page(
    'fides-design-pilot',
    'FIDES design pilot',
    "<!-- wp:paragraph -->\n<p>Local design pilot. Test pages:</p>\n<!-- /wp:paragraph -->\n\n"
    . "<!-- wp:list -->\n<ul class=\"wp-block-list\">"
    . "<!-- wp:list-item --><li><a href=\"/fides-design-pilot/overview/\">Use case overview</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"/fides-design-pilot/use-case/\">Use case detail</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"/fides-design-pilot/homepage-fragment/\">Homepage fragment</a></li><!-- /wp:list-item -->"
    . "</ul>\n<!-- /wp:list -->",
    0,
    array('has_hero_section' => 'enabled')
);

pilot_upsert_page(
    'fides-design-pilot/overview',
    'Use cases (design pilot)',
    '<!-- wp:shortcode -->[fides_use_case_catalog design="pilot" title="Use cases" detail_url="/fides-design-pilot/use-case/" add_url="/use-case-form/"]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta
);

pilot_upsert_page(
    'fides-design-pilot/use-case',
    'Use case detail (design pilot)',
    '<!-- wp:shortcode -->[fides_use_case_detail id="' . PILOT_DETAIL_ID . '" listing_url="/fides-design-pilot/overview/"]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta
);

// Hero text is the existing homepage hero (page 771); the card comes from the catalog.
pilot_upsert_page(
    'fides-design-pilot/homepage-fragment',
    'Homepage fragment (design pilot)',
    "<!-- wp:group {\"className\":\"fides-ds fides-ds-page\",\"style\":{\"spacing\":{\"padding\":{\"top\":\"48px\",\"bottom\":\"96px\"}}},\"layout\":{\"type\":\"default\"}} -->\n"
    . "<div class=\"wp-block-group fides-ds fides-ds-page\" style=\"padding-top:48px;padding-bottom:96px\">"
    . "<!-- wp:columns {\"verticalAlignment\":\"center\",\"style\":{\"spacing\":{\"blockGap\":{\"left\":\"64px\"}}}} -->\n<div class=\"wp-block-columns are-vertically-aligned-center\">"
    . "<!-- wp:column {\"verticalAlignment\":\"center\",\"width\":\"55%\"} -->\n<div class=\"wp-block-column is-vertically-aligned-center\" style=\"flex-basis:55%\">"
    . "<!-- wp:heading {\"level\":1,\"className\":\"fides-ds-heading-1\"} -->\n<h1 class=\"wp-block-heading fides-ds-heading-1\">Accelerating Digital Trust</h1>\n<!-- /wp:heading -->\n"
    . "<!-- wp:paragraph {\"className\":\"fides-ds-lead\",\"style\":{\"spacing\":{\"margin\":{\"top\":\"24px\"}}}} -->\n<p class=\"fides-ds-lead\" style=\"margin-top:24px\">The new international movement dedicated to the continuous improvement of digital trust on the internet.</p>\n<!-- /wp:paragraph -->"
    . "</div>\n<!-- /wp:column -->\n"
    . "<!-- wp:column {\"verticalAlignment\":\"center\",\"width\":\"45%\"} -->\n<div class=\"wp-block-column is-vertically-aligned-center\" style=\"flex-basis:45%\">"
    . "<!-- wp:shortcode -->[fides_use_case_featured detail_url=\"/fides-design-pilot/use-case/\"]<!-- /wp:shortcode -->"
    . "</div>\n<!-- /wp:column -->"
    . "</div>\n<!-- /wp:columns -->"
    . "</div>\n<!-- /wp:group -->",
    $parent,
    $layout_meta
);

if (! get_option(Fides_Use_Case_Featured::OPTION)) {
    update_option(Fides_Use_Case_Featured::OPTION, array('primary' => PILOT_FEATURED_ID, 'fallback' => PILOT_DETAIL_ID));
}
WP_CLI::log('Homepage feature: ' . wp_json_encode(get_option(Fides_Use_Case_Featured::OPTION)));
