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
const PILOT_ORG_ID      = 'org:credenco';
const PILOT_WALLET_ID   = 'credenco-business-wallet';
const PILOT_CREDENTIAL_ID      = 'cred:eu:ehic';
const PILOT_CREDENTIAL_ADD_URL = '/credential-submit/';
/** Shared header/footer page template from fides-community-tools-tiles. */
const PILOT_SHELL_TEMPLATE = 'fides-site-shell';

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

function pilot_upsert_page(string $path, string $title, string $content, int $parent, array $layout_meta, string $template = ''): int {
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
    if ($template !== '') {
        update_post_meta($id, '_wp_page_template', $template);
    }
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
    . "<!-- wp:list-item --><li><a href=\"/fides-design-pilot/organizations/\">Organization overview</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"/fides-design-pilot/organization/\">Organization detail</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"/fides-design-pilot/personal-wallets/\">Personal wallets</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"/fides-design-pilot/business-wallets/\">Business wallets</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"/fides-design-pilot/wallet/\">Wallet detail</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"/fides-design-pilot/credentials/\">Credential types</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"/fides-design-pilot/credential/\">Credential type detail</a></li><!-- /wp:list-item -->"
    . "</ul>\n<!-- /wp:list -->",
    0,
    array('has_hero_section' => 'enabled')
);

// Intro text is the existing paragraph on fides.community/ecosystem-explorer/use-cases/
// (not in the local copy); split in two sentences as in Paper 16.1.
pilot_upsert_page(
    'fides-design-pilot/overview',
    'Use cases (design pilot)',
    '<!-- wp:shortcode -->[fides_use_case_catalog design="pilot" title="Use cases" detail_url="/fides-design-pilot/use-case/" add_url="/use-case-form/"]'
    . '<p>Discover real-world examples of <a href="https://fides.community/topics/personal-wallets/">digital wallets</a> and <a href="https://fides.community/topics/credentials/">verifiable credentials</a> in action — passwordless login, age verification, digital travel, cross-border and public services, and more.</p>'
    . '<p>Learn from proven patterns, compare approaches, and reuse what works instead of starting from scratch.</p>'
    . '[/fides_use_case_catalog]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

pilot_upsert_page(
    'fides-design-pilot/use-case',
    'Use case detail (design pilot)',
    '<!-- wp:shortcode -->[fides_use_case_detail id="' . PILOT_DETAIL_ID . '" listing_url="/fides-design-pilot/overview/"]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

// Organization pilot (Paper 20.3/20.4). Intro text is the one in Paper 20.3.
pilot_upsert_page(
    'fides-design-pilot/organizations',
    'Organizations (design pilot)',
    '<!-- wp:shortcode -->[fides_organization_catalog design="pilot" title="Organizations" detail_url="/fides-design-pilot/organization/" add_url="/organizations-submit/"'
    . ' intro="Discover organizations shaping the global ecosystem of digital wallets and verifiable credentials and explore their roles."]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

pilot_upsert_page(
    'fides-design-pilot/organization',
    'Organization detail (design pilot)',
    '<!-- wp:shortcode -->[fides_organization_detail id="' . PILOT_ORG_ID . '" listing_url="/fides-design-pilot/organizations/" use_case_detail_url="/fides-design-pilot/use-case/"]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

// Wallet pilot: one plugin, shared templates for personal and business wallets. Intro texts are the ones in Paper.
pilot_upsert_page(
    'fides-design-pilot/personal-wallets',
    'Personal wallets (design pilot)',
    '<!-- wp:shortcode -->[fides_wallet_catalog type="personal" design="pilot" title="Personal wallets" detail_url="/fides-design-pilot/wallet/" add_url="/wallet-submit/"'
    . ' cross_url="/fides-design-pilot/business-wallets/" intro="Explore digital wallets for individuals."]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

pilot_upsert_page(
    'fides-design-pilot/business-wallets',
    'Business wallets (design pilot)',
    '<!-- wp:shortcode -->[fides_wallet_catalog type="organizational" design="pilot" title="Business wallets" detail_url="/fides-design-pilot/wallet/" add_url="/wallet-submit/"'
    . ' cross_url="/fides-design-pilot/personal-wallets/" intro="Explore digital wallets and related tooling that allow organizations to receive, store, present, issue or verify verifiable credentials."]<!-- /wp:shortcode -->'
    // The editor-chosen Learn link (context wallet-overview:organizational) is rendered by the wallet plugin in the intro.
    ,
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

pilot_upsert_page(
    'fides-design-pilot/wallet',
    'Wallet detail (design pilot)',
    '<!-- wp:shortcode -->[fides_wallet_detail id="' . PILOT_WALLET_ID . '" personal_listing_url="/fides-design-pilot/personal-wallets/" business_listing_url="/fides-design-pilot/business-wallets/" use_case_detail_url="/fides-design-pilot/use-case/"]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

// Credential pilot (Paper 20.7 / 20.8 / 20.33–20.35). Lead text is the one in Paper 20.7.
pilot_upsert_page(
    'fides-design-pilot/credentials',
    'Credential types (design pilot)',
    '<!-- wp:shortcode -->[fides_credential_catalog design="pilot" title="Credential Types" detail_url="/fides-design-pilot/credential/" add_url="' . PILOT_CREDENTIAL_ADD_URL . '"'
    . ' intro="Find credential types, inspect their attributes and reuse the published schemas."]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

pilot_upsert_page(
    'fides-design-pilot/credential',
    'Credential type detail (design pilot)',
    '<!-- wp:shortcode -->[fides_credential_detail id="' . PILOT_CREDENTIAL_ID . '" listing_url="/fides-design-pilot/credentials/" use_case_detail_url="/fides-design-pilot/use-case/"]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

// The existing listing with its modal: reference for the similar-use-case parity check.
pilot_upsert_page(
    'fides-design-pilot/existing-listing',
    'Use cases (existing listing)',
    '<!-- wp:shortcode -->[fides_use_case_catalog]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta
);

// Hero text is the existing homepage hero (page 771); the card comes from the catalog.
// "Explore use cases" is the secondary hero action from Paper 11.1, pointing at the pilot overview.
pilot_upsert_page(
    'fides-design-pilot/homepage-fragment',
    'Homepage fragment (design pilot)',
    "<!-- wp:group {\"className\":\"fides-ds fides-ds-page\",\"style\":{\"spacing\":{\"padding\":{\"top\":\"48px\",\"bottom\":\"96px\"}}},\"layout\":{\"type\":\"default\"}} -->\n"
    . "<div class=\"wp-block-group fides-ds fides-ds-page\" style=\"padding-top:48px;padding-bottom:96px\">"
    . "<!-- wp:columns {\"verticalAlignment\":\"center\",\"style\":{\"spacing\":{\"blockGap\":{\"left\":\"64px\"}}}} -->\n<div class=\"wp-block-columns are-vertically-aligned-center\">"
    . "<!-- wp:column {\"verticalAlignment\":\"center\",\"width\":\"55%\"} -->\n<div class=\"wp-block-column is-vertically-aligned-center\" style=\"flex-basis:55%\">"
    . "<!-- wp:heading {\"level\":1,\"className\":\"fides-ds-heading-hero\"} -->\n<h1 class=\"wp-block-heading fides-ds-heading-hero\">Accelerating Digital Trust</h1>\n<!-- /wp:heading -->\n"
    . "<!-- wp:paragraph {\"className\":\"fides-ds-lead\",\"style\":{\"spacing\":{\"margin\":{\"top\":\"24px\"}}}} -->\n<p class=\"fides-ds-lead\" style=\"margin-top:24px\">The new international movement dedicated to the continuous improvement of digital trust on the internet.</p>\n<!-- /wp:paragraph -->"
    // Primary entry to the starting point (Paper 22.HOME hero), next to the existing secondary action.
    . "\n<!-- wp:html -->\n<div class=\"fides-uc-fragment__actions\" style=\"margin-top:32px;display:flex;flex-wrap:wrap;align-items:center;gap:16px 32px\"><a class=\"fides-ds-button\" href=\"/fides-design-pilot/start/\">Find your starting point <span aria-hidden=\"true\">→</span></a><a class=\"fides-ds-action-link\" href=\"/fides-design-pilot/overview/\"><span>Explore use cases</span> <span aria-hidden=\"true\">→</span></a></div>\n<!-- /wp:html -->"
    . "</div>\n<!-- /wp:column -->\n"
    . "<!-- wp:column {\"verticalAlignment\":\"center\",\"width\":\"45%\"} -->\n<div class=\"wp-block-column is-vertically-aligned-center\" style=\"flex-basis:45%\">"
    . "<!-- wp:shortcode -->[fides_use_case_featured detail_url=\"/fides-design-pilot/use-case/\"]<!-- /wp:shortcode -->"
    . "</div>\n<!-- /wp:column -->"
    . "</div>\n<!-- /wp:columns -->"
    . "</div>\n<!-- /wp:group -->",
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

if (! get_option(Fides_Use_Case_Featured::OPTION)) {
    update_option(Fides_Use_Case_Featured::OPTION, array('primary' => PILOT_FEATURED_ID, 'fallback' => PILOT_DETAIL_ID));
}
// Explicit editorial short title for the featured use case (Paper 25.7); set once, an editor's value is kept.
$featured_option = get_option(Fides_Use_Case_Featured::OPTION);
if (is_array($featured_option) && ! array_key_exists('short_title', $featured_option) && ($featured_option['primary'] ?? '') === PILOT_FEATURED_ID) {
    $featured_option['short_title'] = 'Digital Certificate of Good Conduct in a wallet';
    update_option(Fides_Use_Case_Featured::OPTION, $featured_option);
}
WP_CLI::log('Homepage feature: ' . wp_json_encode(get_option(Fides_Use_Case_Featured::OPTION)));
