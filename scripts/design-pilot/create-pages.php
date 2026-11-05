<?php
/**
 * Create the design pilot pages (idempotent, edit-protected).
 * Local: create-pages.sh. Staging: staging/seed.sh (wp eval-file).
 *
 * Pages live under /<PILOT_BASE>/ (default fides-design-pilot) or, with PILOT_STANDALONE=1, at the root of a site whose
 * home_url() already ends in /design-review: /design-review/overview/ is then the page "overview" (no second segment).
 * Standalone also seeds the pages that normally exist on fides.community and are linked from the pilot: the five
 * submission forms and the glossary (shortcode pages), and makes the homepage the front page while none is set.
 * Existing pages, menus and the active homepage are not touched.
 *
 * Safety rules (same as create-learn-pages.php):
 *  - A seeded page carries _fides_pilot_seed (its full path). It is updated only while it still
 *    matches the state stored after the last seed (_fides_pilot_seed_hash). A page an editor changed
 *    is skipped and reported.
 *  - A page at the same path without the marker is never touched on a non-local site.
 *  - PILOT_FORCE=<paths> replaces such pages explicitly; the current state is saved to PILOT_BACKUP_DIR first.
 *  - PILOT_DRY_RUN=1 reports only and writes nothing.
 *  - Options are only seeded when they do not exist yet.
 */

if (! defined('ABSPATH')) {
    fwrite(STDERR, "Run through WP-CLI (create-pages.sh or staging/seed.sh).\n");
    exit(1);
}
require __DIR__ . '/staging/seed-guard.php';
// wp eval-file runs this file inside a function, so the shared state must be declared global explicitly.
global $pilot_ctx, $pilot_base, $pilot_dry, $pilot_force, $pilot_backup, $pilot_report;
$pilot_ctx  = fides_pilot_seed_context();
$pilot_base = $pilot_ctx['base'];
$pilot_dry   = getenv('PILOT_DRY_RUN') === '1';
$pilot_force = array_filter(array_map('trim', explode(',', (string) getenv('PILOT_FORCE'))), 'strlen');
$pilot_backup = (string) (getenv('PILOT_BACKUP_DIR') ?: sys_get_temp_dir() . '/fides-pilot-replaced');
/** Report rows: path, action, note. */
$pilot_report = array();

const PILOT_DETAIL_ID   = 'verifiable-ai-fairness-a-seal-for-the-system-a-receipt-for-the-person-O0S54J';
const PILOT_FEATURED_ID = 'digital-certificate-of-good-conduct-vog-as-a-verifiable-credential-yjw4BC';
const PILOT_ORG_ID      = 'org:credenco';
const PILOT_WALLET_ID   = 'credenco-business-wallet';
const PILOT_CREDENTIAL_ID      = 'cred:eu:ehic';
const PILOT_CREDENTIAL_ADD_URL = '{{site}}/credential-submit/';
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

/**
 * Replace the route tokens.
 *  {{base}}      page path segment of the pilot ('' when standalone)
 *  {{pilot}}     URL of the pilot pages for links and shortcode attributes: absolute below a path (standalone), else root-relative
 *  {{pilotpath}} the same relative to home_url(), for settings that are passed through home_url() (updates listing path)
 *  {{site}}      URL of the site itself (home_url() without the trailing slash; '' at the domain root)
 */
function pilot_tokens(string $text): string {
    global $pilot_ctx, $pilot_base;
    $rel = $pilot_base === '' ? '' : '/' . $pilot_base;
    // Below a path the links are absolute (see fides_pilot_origin); at the domain root they stay root-relative.
    $abs = $pilot_ctx['origin'] . $pilot_ctx['mount'];
    return strtr($text, array('{{base}}' => $pilot_base, '{{pilotpath}}' => $rel, '{{pilot}}' => $abs . $rel, '{{site}}' => $abs));
}

/** Canonical, comparable state of a page as stored in the database. */
function pilot_state_of(int $id): array {
    $post   = get_post($id);
    $layout = get_post_meta($id, 'blocksy_post_meta_options', true);
    return array(
        'title'    => (string) $post->post_title,
        'content'  => (string) $post->post_content,
        'status'   => (string) $post->post_status,
        'parent'   => (int) $post->post_parent,
        'template' => (string) get_post_meta($id, '_wp_page_template', true),
        'layout'   => is_array($layout) ? array_intersect_key($layout, array('has_hero_section' => 1, 'page_structure_type' => 1, 'content_style_source' => 1, 'content_style' => 1, 'vertical_spacing_source' => 1, 'content_area_spacing' => 1, 'disable_featured_image' => 1, 'disable_share_box' => 1)) : array(),
    );
}

function pilot_hash(array $state): string {
    ksort($state['layout']);
    return sha1(fides_pilot_normalize((string) wp_json_encode($state)));
}

function pilot_upsert_page(string $path, string $title, string $content, int $parent, array $layout_meta, string $template = ''): int {
    global $pilot_ctx, $pilot_dry, $pilot_force, $pilot_backup, $pilot_report;
    $path    = trim(pilot_tokens($path), '/');
    $content = pilot_tokens($content);
    $title   = pilot_tokens($title);

    $marked = get_posts(array('post_type' => 'page', 'post_status' => 'any', 'numberposts' => 1, 'meta_key' => '_fides_pilot_seed', 'meta_value' => $path, 'fields' => 'ids'));
    $post   = $marked ? get_post((int) $marked[0]) : get_page_by_path($path, OBJECT, 'page');
    $action = 'created';
    $note   = '';
    // A local page made by the first version of this script (no marker yet) is adopted; elsewhere it is protected.
    $legacy = $post instanceof WP_Post && ! $marked && $pilot_ctx['local'] && get_post_meta($post->ID, '_fides_design_pilot', true) === '1';

    $desired = array(
        'title'    => $title,
        'content'  => $content,
        'status'   => 'publish',
        'parent'   => $parent,
        'template' => $template,
        'layout'   => $layout_meta,
    );

    if ($post instanceof WP_Post) {
        $current = pilot_state_of((int) $post->ID);
        if ($marked || $legacy) {
            $stored = (string) get_post_meta($post->ID, '_fides_pilot_seed_hash', true);
            $edited = $marked && $stored !== pilot_hash($current);
            if ($edited && ! in_array($path, $pilot_force, true)) {
                $stored_state = json_decode((string) get_post_meta($post->ID, '_fides_pilot_seed_state', true), true);
                $changed = array();
                foreach ($current as $k => $v) {
                    if (is_array($stored_state) && ($stored_state[ $k ] ?? null) != $v) { // phpcs:ignore WordPress.PHP.StrictComparisons
                        $changed[] = $k;
                    }
                }
                $pilot_report[] = array($path, 'skipped-edited', 'page ' . $post->ID . ' changed since seed: ' . implode(', ', $changed ?: array('unknown')));
                return (int) $post->ID;
            }
            if (! $edited && pilot_hash($desired) === pilot_hash($current) && ! $legacy) {
                $pilot_report[] = array($path, 'unchanged', 'page ' . $post->ID);
                return (int) $post->ID;
            }
            $action = $edited ? 'forced' : ($legacy ? 'adopted' : 'updated');
        } else {
            if (! in_array($path, $pilot_force, true)) {
                $pilot_report[] = array($path, 'skipped-unmarked', 'page ' . $post->ID . ' exists without seed marker; not touched');
                return (int) $post->ID;
            }
            $action = 'forced';
        }
        if ($action === 'forced' && ! $pilot_dry) {
            wp_mkdir_p($pilot_backup);
            $file = $pilot_backup . '/' . gmdate('Ymd-His') . '-' . $post->ID . '.json';
            file_put_contents($file, wp_json_encode(array('path' => $path, 'post_id' => (int) $post->ID, 'state' => $current), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            $note = ' (previous state saved to ' . $file . ')';
        }
    }

    if ($pilot_dry) {
        $pilot_report[] = array($path, 'would-' . $action, $post ? 'page ' . $post->ID : '');
        return $post ? (int) $post->ID : 0;
    }

    $postarr = array(
        'post_type'    => 'page',
        'post_status'  => 'publish',
        'post_title'   => wp_slash($title),
        'post_name'    => basename($path),
        'post_parent'  => $parent,
        'post_content' => wp_slash($content),
    );
    if ($post instanceof WP_Post) {
        $postarr['ID'] = $post->ID;
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
    update_post_meta($id, '_wp_page_template', $template);
    update_post_meta($id, '_fides_pilot_seed', $path);
    // The stored state is read back from the database, so later comparisons ignore WordPress normalisation.
    $stored = pilot_state_of((int) $id);
    update_post_meta($id, '_fides_pilot_seed_hash', pilot_hash($stored));
    update_post_meta($id, '_fides_pilot_seed_state', wp_slash((string) wp_json_encode($stored)));
    $pilot_report[] = array($path, $action, 'page ' . $id . ' ' . get_permalink($id) . $note);
    return (int) $id;
}

$parent = pilot_upsert_page(
    $pilot_ctx['standalone'] ? 'pilot-pages' : '{{base}}',
    'FIDES design pilot',
    ($pilot_ctx['standalone'] ? "<!-- wp:heading {\"level\":1} -->\n<h1 class=\"wp-block-heading\">FIDES design pilot</h1>\n<!-- /wp:heading -->\n\n" : '')
    . "<!-- wp:paragraph -->\n<p>Design pilot pages:</p>\n<!-- /wp:paragraph -->\n\n"
    . "<!-- wp:list -->\n<ul class=\"wp-block-list\">"
    . "<!-- wp:list-item --><li><a href=\"{{pilot}}/overview/\">Use case overview</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"{{pilot}}/use-case/\">Use case detail</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"{{pilot}}/homepage-fragment/\">Homepage fragment</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"{{pilot}}/organizations/\">Organization overview</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"{{pilot}}/organization/\">Organization detail</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"{{pilot}}/personal-wallets/\">Personal wallets</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"{{pilot}}/business-wallets/\">Business wallets</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"{{pilot}}/wallet/\">Wallet detail</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"{{pilot}}/credentials/\">Credential types</a></li><!-- /wp:list-item -->"
    . "<!-- wp:list-item --><li><a href=\"{{pilot}}/credential/\">Credential type detail</a></li><!-- /wp:list-item -->"
    . "</ul>\n<!-- /wp:list -->",
    0,
    array('has_hero_section' => 'enabled'),
    $pilot_ctx['standalone'] ? PILOT_SHELL_TEMPLATE : '' // standalone: the index page gets the same header and footer as the pilot pages
);
if ($pilot_ctx['standalone']) {
    $parent = 0; // standalone: the pilot pages are not children of the index page
}

// Intro text is the existing paragraph on fides.community/ecosystem-explorer/use-cases/
// (not in the local copy); split in two sentences as in Paper 16.1.
pilot_upsert_page(
    '{{base}}/overview',
    'Use cases (design pilot)',
    '<!-- wp:shortcode -->[fides_use_case_catalog design="pilot" title="Use cases" detail_url="{{pilot}}/use-case/" add_url="{{site}}/use-case-form/"]'
    . '<p>Discover real-world examples of <a href="https://fides.community/topics/personal-wallets/">digital wallets</a> and <a href="https://fides.community/topics/credentials/">verifiable credentials</a> in action — passwordless login, age verification, digital travel, cross-border and public services, and more.</p>'
    . '<p>Learn from proven patterns, compare approaches, and reuse what works instead of starting from scratch.</p>'
    . '[/fides_use_case_catalog]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

pilot_upsert_page(
    '{{base}}/use-case',
    'Use case detail (design pilot)',
    '<!-- wp:shortcode -->[fides_use_case_detail id="' . PILOT_DETAIL_ID . '" listing_url="{{pilot}}/overview/"]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

// Organization pilot (Paper 20.3/20.4). Intro text is the one in Paper 20.3.
pilot_upsert_page(
    '{{base}}/organizations',
    'Organizations (design pilot)',
    '<!-- wp:shortcode -->[fides_organization_catalog design="pilot" title="Organizations" detail_url="{{pilot}}/organization/" add_url="{{site}}/organizations-submit/"'
    . ' intro="Discover organizations shaping the global ecosystem of digital wallets and verifiable credentials and explore their roles."]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

pilot_upsert_page(
    '{{base}}/organization',
    'Organization detail (design pilot)',
    '<!-- wp:shortcode -->[fides_organization_detail id="' . PILOT_ORG_ID . '" listing_url="{{pilot}}/organizations/" use_case_detail_url="{{pilot}}/use-case/"]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

// Wallet pilot: one plugin, shared templates for personal and business wallets. Intro texts are the ones in Paper.
pilot_upsert_page(
    '{{base}}/personal-wallets',
    'Personal wallets (design pilot)',
    '<!-- wp:shortcode -->[fides_wallet_catalog type="personal" design="pilot" title="Personal wallets" detail_url="{{pilot}}/wallet/" add_url="{{site}}/wallet-submit/"'
    . ' cross_url="{{pilot}}/business-wallets/" intro="Explore digital wallets for individuals."]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

pilot_upsert_page(
    '{{base}}/business-wallets',
    'Business wallets (design pilot)',
    '<!-- wp:shortcode -->[fides_wallet_catalog type="organizational" design="pilot" title="Business wallets" detail_url="{{pilot}}/wallet/" add_url="{{site}}/wallet-submit/"'
    . ' cross_url="{{pilot}}/personal-wallets/" intro="Explore digital wallets and related tooling that allow organizations to receive, store, present, issue or verify verifiable credentials."]<!-- /wp:shortcode -->'
    // The editor-chosen Learn link (context wallet-overview:organizational) is rendered by the wallet plugin in the intro.
    ,
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

pilot_upsert_page(
    '{{base}}/wallet',
    'Wallet detail (design pilot)',
    '<!-- wp:shortcode -->[fides_wallet_detail id="' . PILOT_WALLET_ID . '" personal_listing_url="{{pilot}}/personal-wallets/" business_listing_url="{{pilot}}/business-wallets/" use_case_detail_url="{{pilot}}/use-case/"]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

// Credential pilot (Paper 20.7 / 20.8 / 20.33–20.35). Lead text is the one in Paper 20.7.
pilot_upsert_page(
    '{{base}}/credentials',
    'Credential types (design pilot)',
    '<!-- wp:shortcode -->[fides_credential_catalog design="pilot" title="Credential Types" detail_url="{{pilot}}/credential/" add_url="' . PILOT_CREDENTIAL_ADD_URL . '"'
    . ' intro="Find credential types, inspect their attributes and reuse the published schemas."]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

pilot_upsert_page(
    '{{base}}/credential',
    'Credential type detail (design pilot)',
    '<!-- wp:shortcode -->[fides_credential_detail id="' . PILOT_CREDENTIAL_ID . '" listing_url="{{pilot}}/credentials/" use_case_detail_url="{{pilot}}/use-case/"]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

// The existing listing with its modal: reference for the similar-use-case parity check.
pilot_upsert_page(
    '{{base}}/existing-listing',
    'Use cases (existing listing)',
    '<!-- wp:shortcode -->[fides_use_case_catalog]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta
);

// Hero text is the existing homepage hero (page 771); the card comes from the catalog.
// "Explore use cases" is the secondary hero action from Paper 11.1, pointing at the pilot overview.
$pilot_home_id = pilot_upsert_page(
    '{{base}}/homepage-fragment',
    'Homepage fragment (design pilot)',
    "<!-- wp:group {\"className\":\"fides-ds fides-ds-page\",\"style\":{\"spacing\":{\"padding\":{\"top\":\"48px\",\"bottom\":\"48px\"}}},\"layout\":{\"type\":\"default\"}} -->\n"
    . "<div class=\"wp-block-group fides-ds fides-ds-page\" style=\"padding-top:48px;padding-bottom:48px\">"
    . "<!-- wp:columns {\"verticalAlignment\":\"center\",\"style\":{\"spacing\":{\"blockGap\":{\"left\":\"64px\"}}}} -->\n<div class=\"wp-block-columns are-vertically-aligned-center\">"
    . "<!-- wp:column {\"verticalAlignment\":\"center\",\"width\":\"55%\",\"className\":\"fides-uc-hero\"} -->\n<div class=\"wp-block-column is-vertically-aligned-center fides-uc-hero\" style=\"flex-basis:55%\">"
    . "<!-- wp:paragraph {\"className\":\"fides-ds-kicker\"} -->\n<p class=\"fides-ds-kicker\">The global digital trust ecosystem</p>\n<!-- /wp:paragraph -->\n"
    . "<!-- wp:heading {\"level\":1,\"className\":\"fides-ds-heading-hero\"} -->\n<h1 class=\"wp-block-heading fides-ds-heading-hero\">Accelerating<br>Digital Trust</h1>\n<!-- /wp:heading -->\n"
    . "<!-- wp:paragraph {\"className\":\"fides-ds-lead\",\"style\":{\"spacing\":{\"margin\":{\"top\":\"24px\"}}}} -->\n<p class=\"fides-ds-lead\" style=\"margin-top:24px\">FIDES helps organizations understand and use digital wallets and credentials through real-world examples, practical guides, catalogs and expert guidance.</p>\n<!-- /wp:paragraph -->"
    // Primary entry to the starting point (Paper 22.HOME hero), next to the existing secondary action.
    . "\n<!-- wp:html -->\n<div class=\"fides-uc-fragment__actions\" style=\"margin-top:32px;display:flex;flex-wrap:wrap;align-items:center;gap:16px 32px\"><a class=\"fides-ds-button\" href=\"{{pilot}}/start/\">Find your starting point <span aria-hidden=\"true\">→</span></a><a class=\"fides-ds-action-link\" href=\"{{pilot}}/overview/\"><span>Explore use cases</span> <span aria-hidden=\"true\">→</span></a></div>\n<!-- /wp:html -->"
    . "</div>\n<!-- /wp:column -->\n"
    . "<!-- wp:column {\"verticalAlignment\":\"center\",\"width\":\"45%\"} -->\n<div class=\"wp-block-column is-vertically-aligned-center\" style=\"flex-basis:45%\">"
    . "<!-- wp:shortcode -->[fides_use_case_featured detail_url=\"{{pilot}}/use-case/\"]<!-- /wp:shortcode -->"
    . "</div>\n<!-- /wp:column -->"
    . "</div>\n<!-- /wp:columns -->"
    . "</div>\n<!-- /wp:group -->"
    // Paper 25.15: Learn strip, theme index and latest updates under the hero (blocks read their data themselves).
    . "\n<!-- wp:shortcode -->[fides_home_learn]<!-- /wp:shortcode -->"
    . "\n<!-- wp:shortcode -->[fides_use_case_discovery layout=\"index\"]<!-- /wp:shortcode -->"
    . "\n<!-- wp:shortcode -->[fides_home_updates]<!-- /wp:shortcode -->"
    // Paper 25.12: blue spotlight on one demo use case with its explicit catalog relations.
    . "\n<!-- wp:shortcode -->[fides_use_case_spotlight id=\"end-to-end-digital-business-workflows-transforming-kyb-kyc-kys-via-eu-business-wallet-F665Dh\" detail_url=\"{{pilot}}/use-case/\"]<!-- /wp:shortcode -->",
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);

// Standalone: the pilot homepage is the front page of the site, unless a front page is already set.
if ($pilot_ctx['standalone'] && $pilot_home_id > 0) {
    if ((int) get_option('page_on_front') === 0 && ! $pilot_dry) {
        update_option('show_on_front', 'page');
        update_option('page_on_front', $pilot_home_id);
        $pilot_report[] = array('front page', 'set', 'page ' . $pilot_home_id . ' (homepage-fragment)');
    } else {
        $pilot_report[] = array('front page', $pilot_dry ? 'would-keep-or-set' : 'kept', 'page_on_front ' . (int) get_option('page_on_front'));
    }
}

if (! $pilot_dry && ! get_option(Fides_Use_Case_Featured::OPTION)) {
    update_option(Fides_Use_Case_Featured::OPTION, array('primary' => PILOT_FEATURED_ID, 'fallback' => PILOT_DETAIL_ID));
}
// Explicit editorial short title for the featured use case (Paper 25.7); set once, an editor's value is kept.
$featured_option = get_option(Fides_Use_Case_Featured::OPTION);
if (! $pilot_dry && is_array($featured_option) && ($featured_option['primary'] ?? '') === PILOT_FEATURED_ID
    && (! array_key_exists('short_title', $featured_option) || (($featured_option['short_title'] ?? '') !== '' && empty($featured_option['short_title_for'])))) {
    // The title is tied to the record it was written for (short_title_for); a legacy value without that link is bound once here.
    $featured_option['short_title']     = ($featured_option['short_title'] ?? '') !== '' ? $featured_option['short_title'] : 'Digital Certificate of Good Conduct in a wallet';
    $featured_option['short_title_for'] = PILOT_FEATURED_ID;
    update_option(Fides_Use_Case_Featured::OPTION, $featured_option);
}
$pilot_report[] = array('option fides_use_case_featured', 'info', (string) wp_json_encode(get_option(Fides_Use_Case_Featured::OPTION)));

// Standalone only: the pages the pilot links to that exist on fides.community and are shortcode pages in the plugins.
// They are ordinary seeded pages (same edit protection). Forms keep their plugin behaviour; this script submits nothing.
if ($pilot_ctx['standalone']) {
    $companions = array(
        'use-case-form'        => array('Submit a use case', '[fides_use_case_form]'),
        'organizations-submit' => array('Submit an organization', '[fides_organization_submit_form]'),
        'organizations-update' => array('Update an organization', '[fides_organization_update_form]'),
        'wallet-submit'        => array('Submit a wallet', '[fides_wallet_submit_form]'),
        'credential-submit'    => array('Submit a credential type', '[fides_credential_submit_form]'),
        'glossary'             => array('Glossary', '[fides_vocabulary_glossary]'),
    );
    foreach ($companions as $slug => $def) {
        pilot_upsert_page($slug, $def[0], '<!-- wp:shortcode -->' . $def[1] . '<!-- /wp:shortcode -->', 0, $layout_meta, PILOT_SHELL_TEMPLATE);
    }
}

// Updates overview (Paper 26.1/26.3) and own-article layout (26.2).
// The programme links below are a pilot SEED taken from the dedicated programme sources in
// organization-catalog/data/listing-news-sources.json. On a real site an editor maintains them
// under Settings > FIDES Updates; an existing setting is never overwritten here.
pilot_upsert_page(
    '{{base}}/about-fides',
    'About FIDES',
    '<!-- wp:shortcode -->[fides_about]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);
pilot_upsert_page(
    '{{base}}/manifesto',
    'FIDES Manifesto',
    '<!-- wp:shortcode -->[fides_manifesto detail_url="{{pilot}}/organization/"]<!-- /wp:shortcode -->',
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);
pilot_upsert_page(
    '{{base}}/updates',
    'Updates',
    "<!-- wp:group {\"className\":\"fides-ds fides-ds-page\",\"style\":{\"spacing\":{\"padding\":{\"top\":\"48px\",\"bottom\":\"0px\"}}},\"layout\":{\"type\":\"default\"}} -->\n"
    . "<div class=\"wp-block-group fides-ds fides-ds-page\" style=\"padding-top:48px;padding-bottom:0px\">"
    . "<!-- wp:paragraph {\"className\":\"fides-ds-kicker\"} -->\n<p class=\"fides-ds-kicker\">FIDES · Knowledge &amp; ecosystem</p>\n<!-- /wp:paragraph -->\n"
    . "<!-- wp:heading {\"level\":1,\"className\":\"fides-ds-heading-1 fides-ds-heading-1--catalog\"} -->\n<h1 class=\"wp-block-heading fides-ds-heading-1 fides-ds-heading-1--catalog\">Updates</h1>\n<!-- /wp:heading -->\n"
    . "<!-- wp:paragraph {\"className\":\"fides-ds-lead\"} -->\n<p class=\"fides-ds-lead\">Follow developments in digital identity, wallets and trusted data.</p>\n<!-- /wp:paragraph -->"
    . "</div>\n<!-- /wp:group -->\n"
    . "<!-- wp:group {\"className\":\"fides-ds fides-ds-page\",\"style\":{\"spacing\":{\"padding\":{\"top\":\"32px\"}}},\"layout\":{\"type\":\"default\"}} -->\n"
    . "<div class=\"wp-block-group fides-ds fides-ds-page\" style=\"padding-top:32px\"><!-- wp:shortcode -->[fides_updates]<!-- /wp:shortcode --></div>\n<!-- /wp:group -->",
    $parent,
    $layout_meta,
    PILOT_SHELL_TEMPLATE
);
if (class_exists('Fides_DS_Updates') && ! $pilot_dry) {
    // Each programme link is limited to the host of its dedicated programme source (allowedHosts in
    // listing-news-sources.json), so a third-party article or a release about the same organization is
    // never labelled as programme news.
    $seed_programmes = array(
        'org:webuild'     => array('label' => 'WE BUILD', 'hosts' => array('webuildconsortium.eu')),
        'org:netherlands' => array('label' => 'EDI-Stelsel NL', 'hosts' => array('edi.pleio.nl')),
        'org:germany'     => array('label' => 'German EUDI Wallet', 'hosts' => array('eudi-wallet.gov.de')),
        'org:imda'        => array('label' => 'TradeTrust', 'hosts' => array('tradetrust.io')),
    );
    $updates_option = get_option(Fides_DS_Updates::OPTION);
    if (! $updates_option) {
        update_option(Fides_DS_Updates::OPTION, array(
            'programmes'       => $seed_programmes,
            'hidden_urls'      => array(),
            'news_url'         => '',
            'listing_path'     => pilot_tokens('{{pilotpath}}/updates/'),
            'article_template' => true,
        ));
    } elseif (is_array($updates_option)) {
        // Upgrade only entries that still hold the earlier unscoped seed value; editor changes stay.
        foreach ($seed_programmes as $key => $entry) {
            if (($updates_option['programmes'][$key] ?? null) === $entry['label']) {
                $updates_option['programmes'][$key] = $entry;
            }
        }
        update_option(Fides_DS_Updates::OPTION, $updates_option);
    }
}

foreach ($pilot_report as $row) {
    echo str_pad($row[1], 17) . str_pad($row[0], 50) . $row[2] . "\n";
}
$pilot_counts = array_count_values(array_column($pilot_report, 1));
ksort($pilot_counts);
echo 'SUMMARY ' . wp_json_encode($pilot_counts) . "\n";
