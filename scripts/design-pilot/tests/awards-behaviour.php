<?php
/**
 * Behaviour tests for the Global Digital Trust Awards page (Paper 28.2 / 28.3):
 * one editable page of normal blocks, original content kept, no copy in PHP,
 * every catalog link resolves to an existing record. Reads only.
 *
 * Run: scripts/design-pilot/run-tests.sh
 */

if (! defined('ABSPATH')) {
    exit(1);
}

$results = array('pass' => 0, 'fail' => array());
$check = static function (bool $ok, string $message) use (&$results): void {
    if ($ok) {
        $results['pass']++;
    } else {
        $results['fail'][] = $message;
    }
};

$page = get_page_by_path('fides-design-pilot/global-digital-trust-awards', OBJECT, 'page');
$check($page instanceof WP_Post, 'the awards page exists below the pilot base');
if ($page instanceof WP_Post) {
    $check($page->post_status === 'publish', 'the page is published');
    $check(get_post_meta($page->ID, '_wp_page_template', true) === 'fides-site-shell', 'the page uses the existing site shell template');
    $check(count(get_posts(array('post_type' => 'page', 'post_parent' => $page->ID, 'post_status' => 'any', 'fields' => 'ids'))) === 0, 'no child pages for categories, highlights or jury');
    $check(count(get_posts(array('post_type' => 'page', 'post_status' => 'any', 'fields' => 'ids', 's' => 'Global Digital Trust Awards', 'numberposts' => 20))) <= 2, 'no separate awards pages besides the single page');

    // ---- Content model: only core blocks, no shortcode or raw HTML.
    $allowed = array('core/group', 'core/heading', 'core/paragraph', 'core/image', 'core/gallery', 'core/details', 'core/list', 'core/list-item', 'core/buttons', 'core/button');
    $names   = array();
    $walk    = static function (array $blocks) use (&$walk, &$names): void {
        foreach ($blocks as $b) {
            if ($b['blockName']) {
                $names[] = $b['blockName'];
            }
            if (! empty($b['innerBlocks'])) {
                $walk($b['innerBlocks']);
            }
        }
    };
    $blocks = parse_blocks($page->post_content);
    $walk($blocks);
    $check(count($names) > 100 && ! array_diff(array_unique($names), $allowed), 'only normal core blocks are used: ' . implode(',', array_diff(array_unique($names), $allowed)));
    $check(strpos($page->post_content, '[fides_') === false && strpos($page->post_content, 'wp:html') === false && strpos($page->post_content, 'wp:shortcode') === false, 'no shortcode or custom HTML block');
    $check(count(array_filter($blocks, static function ($b) { return $b['blockName'] === null && trim((string) $b['innerHTML']) !== ''; })) === 0, 'no freeform content outside blocks');
    $counts = array_count_values($names);
    $check(($counts['core/details'] ?? 0) === 8, 'eight accordions: five categories plus highlights, categories and jury');
    $check(strpos($page->post_content, '"showContent":true') === false && ! preg_match('/<details[^>]* open/', $page->post_content), 'all accordions are closed by default');
    $check(($counts['core/gallery'] ?? 0) === 2, 'one photo gallery and one logo gallery');

    // ---- Content: texts and structure from Paper and the existing page.
    $html = $page->post_content;
    foreach (array('Global Digital Trust Awards', 'Meet the winners', 'About the awards', '2026 finalists &amp; rankings', 'Highlights from Geneva', '2026 international jury', 'Award categories and voting guidelines', 'Download the full report', 'THE FIRST EDITION', 'finalists across five award categories') as $text) {
        $check(strpos($html, $text) !== false, 'content has "' . $text . '"');
    }
    $check(substr_count($html, 'fides-awards-finalist ') + substr_count($html, 'fides-awards-finalist"') >= 24 && preg_match_all('/class="wp-block-group fides-awards-finalist[ "]/', $html) === 24, 'exactly 24 finalists');
    $check(preg_match_all('/class="wp-block-group fides-awards-winner"/', $html) === 5, 'five winner blocks');
    $check(substr_count($html, 'Winner 2026') === 5, 'five winners are marked in the rankings');
    foreach (array('Collaboration Award', 'Social Impact Award', 'Adoption Award', 'Best Wallet Award', 'Business Value Award') as $cat) {
        $check(strpos($html, '<summary>' . $cat . '</summary>') !== false, 'category row ' . $cat);
    }
    $check(strpos($html, 'empowerment') !== false && strpos($html, 'empowermen<') === false, 'voting guidelines are complete words');

    // ---- Anchors: every anchor link has a target on the page.
    preg_match_all('/href="#([^"]+)"/', $html, $anchors);
    preg_match_all('/ id="([^"]+)"/', $html, $ids);
    $check(count(array_diff(array_unique($anchors[1]), $ids[1])) === 0, 'every #anchor link has a target id: ' . implode(',', array_diff(array_unique($anchors[1]), $ids[1])));
    foreach (array('winners', 'finalists', 'highlights', 'categories', 'jury', 'about') as $id) {
        $check(in_array($id, $ids[1], true), 'anchor id ' . $id);
    }

    // ---- Images: five original banners from the media library, alt text on every image.
    preg_match_all('/wp-image-(\d+)/', $html, $att);
    $att_ids = array_unique(array_map('intval', $att[1]));
    $check(count($att_ids) === 83, '83 media library images (5 banners, 71 photos, jury image, 6 logos): ' . count($att_ids));
    $bad_alt = 0;
    $bad_src = 0;
    foreach ($att_ids as $aid) {
        if (trim((string) get_post_meta($aid, '_wp_attachment_image_alt', true)) === '') {
            $bad_alt++;
        }
        if (! get_post($aid) || get_post_type($aid) !== 'attachment') {
            $bad_src++;
        }
    }
    $check($bad_alt === 0, 'every image has alt text (' . $bad_alt . ' without)');
    $check($bad_src === 0, 'every image id is an attachment');
    $banners = array();
    foreach (array('Winner_collaboration', 'winner_social_impact', 'winner_adoption_award', 'Winner_best_wallet', 'winner_business_value') as $stem) {
        $q = get_posts(array('post_type' => 'attachment', 'post_status' => 'inherit', 'numberposts' => 1, 'meta_key' => '_fides_awards_source', 'meta_value' => 'https://fides.community/app/uploads/2026/09/' . $stem . '.png'));
        $check(count($q) === 1 && is_array(wp_get_attachment_metadata($q[0]->ID)), 'original banner ' . $stem . ' is imported');
        if ($q) {
            $meta = wp_get_attachment_metadata($q[0]->ID);
            $check(isset($meta['width'], $meta['height']) && (int) $meta['width'] === 1254 && (int) $meta['height'] === 1254, 'banner ' . $stem . ' keeps the original 1254x1254 pixels');
        }
    }

    // ---- Catalog links: every use case and wallet exists in the local catalog.
    preg_match_all('/href="[^"]*\/use-case\/\?usecase=([^"]+)"/', $html, $uc);
    preg_match_all('/href="[^"]*\/wallet\/\?wallet=([^"]+)"/', $html, $wl);
    $check(count($uc[1]) === 24, 'use case links: ' . count($uc[1])); // 4 winner cards + 20 finalist rows
    $uc_ids = array_unique($uc[1]);
    $wl_ids = array_unique($wl[1]);
    $check(count($uc_ids) === 20, 'twenty distinct use cases are linked: ' . count($uc_ids));
    $check(count($wl_ids) === 4, 'four distinct wallets are linked: ' . count($wl_ids));
    if (class_exists('Fides_Catalog_Source')) {
        $uc_src = Fides_Catalog_Source::for('usecase');
        $wl_src = Fides_Catalog_Source::for('wallet');
        $missing = array();
        foreach ($uc_ids as $id) {
            if (! $uc_src || ! is_array($uc_src->find_by_id(urldecode($id)))) {
                $missing[] = $id;
            }
        }
        foreach ($wl_ids as $id) {
            if (! $wl_src || ! is_array($wl_src->find_by_id(urldecode($id)))) {
                $missing[] = $id;
            }
        }
        $check(! $missing, 'all linked records exist in the catalogs: ' . implode(',', $missing));
    } else {
        $check(false, 'Fides_Catalog_Source is available');
    }
    // The five winners are the ones the award registry names.
    if (class_exists('Fides_Award_Programs')) {
        $gdt = Fides_Award_Programs::get(Fides_Award_Programs::PROGRAM_GDT);
        foreach ($gdt['categories'] as $cat) {
            $check(strpos($html, $cat['winner_id']) !== false, 'winner of ' . $cat['label'] . ' is linked');
        }
    }
}

// ---- Render-time upgrades: shared section menu and catalog images (no invented images).
$check(class_exists('Fides_DS_Awards'), 'the awards renderer class is loaded');
if ($page instanceof WP_Post && class_exists('Fides_DS_Awards')) {
    $html = do_blocks($page->post_content);
    $check(substr_count($html, 'data-fides-ds-section-nav') === 1 && strpos($html, 'fides-awards-sections') !== false, 'the page renders one shared section menu');
    $check(strpos($html, 'fides-awards-navbar') === false, 'the editor-side navbar group is replaced by the shared menu on render');
    $check(preg_match_all('~<li><a href="#(winners|finalists|highlights|categories|jury)"~', $html) === 5, 'the menu keeps the five editor-maintained anchors');
    $check(substr_count($html, 'fides-awards-finalist__image') === 23, '23 finalists get a catalog image, only where the record has one');
    $check(preg_match('~fides-awards-finalist__image"><img[^>]+alt=""~', $html) === 1, 'catalog images are decorative (empty alt, the title is next to them)');
    $check(preg_match_all('~fides-awards-finalist__image"><img[^>]+src="https?://~', $html) === 23, 'catalog image URLs are the records\' own http(s) URLs');
}
// The main menu entry resolves to the pilot page, not to production.
if (class_exists('Fides_DS_Site_Shell')) {
    $awards_url = Fides_DS_Site_Shell::url('/awards/global-digital-trust-awards/');
    $check(strpos($awards_url, '/fides-design-pilot/global-digital-trust-awards/') !== false, 'Ecosystem > Global Digital Trust Awards points to the pilot page: ' . $awards_url);
}

// ---- No awards copy in plugin PHP or CSS/JS: editorial content stays in WordPress.
$root = dirname((new ReflectionClass('Fides_DS_Site_Shell'))->getFileName(), 2) . '/';
foreach (array('assets/awards.css', 'assets/awards.js', 'includes/class-fides-ds-site-shell.php') as $file) {
    $src = (string) @file_get_contents($root . $file);
    $check($src !== '' && stripos($src, 'Mobile Driving') === false && stripos($src, 'Meet the winners') === false && stripos($src, 'Aadhaar') === false, $file . ' holds no award copy');
}

echo 'awards behaviour: ' . $results['pass'] . ' passed, ' . count($results['fail']) . " failed\n";
foreach ($results['fail'] as $message) {
    echo '  FAIL: ' . $message . "\n";
}
exit(empty($results['fail']) ? 0 : 1);
