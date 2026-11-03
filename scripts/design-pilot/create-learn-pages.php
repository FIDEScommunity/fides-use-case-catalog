<?php
/**
 * Seed the FIDES Learn pilot pages from version-controlled example content
 * (learn/manifest.json + learn/content/*.html). Run through create-learn-pages.sh.
 *
 * Safety rules:
 *  - A page is only managed when it carries the seed marker _fides_learn_seed.
 *  - A marked page is updated only while it still matches the state this script
 *    stored after the last seed (_fides_learn_seed_hash). If an editor changed
 *    content, title, excerpt, template, order, status or any Learn field, the
 *    page is skipped and reported.
 *  - An existing page at the same path without the marker is never touched.
 *  - Replacing a skipped page needs an explicit LEARN_FORCE=<seed ids> entry;
 *    the current state is written to LEARN_BACKUP_DIR first.
 *
 * Environment (all optional):
 *  LEARN_BASE            route base without slashes at the ends   (fides-design-pilot/learn)
 *  LEARN_PILOT_BASE      base for links to the other pilot pages   (fides-design-pilot)
 *  LEARN_GLOSSARY_PATH   existing glossary page                    (/glossary/)
 *  LEARN_FORCE           comma separated seed ids to replace
 *  LEARN_DRY_RUN=1       report only, write nothing
 *  LEARN_BACKUP_DIR      where forced replacements are saved first
 *  LEARN_ALLOW_NON_PILOT=1  allow a non-pilot site (never on production)
 */

if (! defined('ABSPATH')) {
    fwrite(STDERR, "Run through WP-CLI (create-learn-pages.sh).\n");
    exit(1);
}
if (! defined('FIDES_DESIGN_PILOT') && getenv('LEARN_ALLOW_NON_PILOT') !== '1') {
    fwrite(STDERR, "Refusing to run outside the design pilot site (set LEARN_ALLOW_NON_PILOT=1 for a test environment).\n");
    exit(1);
}
if (function_exists('wp_get_environment_type') && wp_get_environment_type() === 'production') {
    fwrite(STDERR, "Refusing to seed on a production environment type.\n");
    exit(1);
}
if (! class_exists('Fides_DS_Learn')) {
    fwrite(STDERR, "Plugin fides-community-tools-tiles (with the Learn template) is not active.\n");
    exit(1);
}

const LEARN_SEED_META  = '_fides_learn_seed';
const LEARN_HASH_META  = '_fides_learn_seed_hash';
const LEARN_STATE_META = '_fides_learn_seed_state';
const LEARN_FIELDS     = array('kind', 'headline', 'eyebrow', 'sources', 'cta_title', 'cta_text', 'cta_label', 'cta_url', 'series');
const LEARN_LAYOUT_META = array(
    'has_hero_section'        => 'disabled',
    'page_structure_type'     => 'type-4',
    'content_style_source'    => 'custom',
    'content_style'           => 'wide',
    'vertical_spacing_source' => 'custom',
    'content_area_spacing'    => 'none',
    'disable_featured_image'  => 'yes',
    'disable_share_box'       => 'yes',
);

$here    = getenv('LEARN_SEED_DIR') ?: __DIR__ . '/learn';
$base    = trim((string) (getenv('LEARN_BASE') ?: 'fides-design-pilot/learn'), '/');
$pilot   = trim((string) (getenv('LEARN_PILOT_BASE') ?: 'fides-design-pilot'), '/');
$gloss   = '/' . trim((string) (getenv('LEARN_GLOSSARY_PATH') ?: '/glossary/'), '/') . '/';
$force   = array_filter(array_map('trim', explode(',', (string) getenv('LEARN_FORCE'))), 'strlen');
$dry     = getenv('LEARN_DRY_RUN') === '1';
$backup  = (string) (getenv('LEARN_BACKUP_DIR') ?: sys_get_temp_dir() . '/fides-learn-replaced');
$tokens  = array('{{learn}}' => '/' . $base, '{{pilot}}' => '/' . $pilot, '{{glossary}}' => $gloss);

$manifest = json_decode((string) file_get_contents($here . '/manifest.json'), true);
if (! is_array($manifest) || empty($manifest['pages'])) {
    fwrite(STDERR, "Invalid manifest.\n");
    exit(1);
}
kses_remove_filters(); // trusted, version-controlled content

/** Canonical, comparable state of a page as stored in the database. */
function learn_state_of(int $id): array {
    $post = get_post($id);
    $meta = array();
    foreach (LEARN_FIELDS as $field) {
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
        'layout'     => is_array($layout) ? array_intersect_key($layout, LEARN_LAYOUT_META) : array(), // Blocksy adds a styles cache on first view
    );
}

function learn_hash(array $state): string {
    return sha1((string) wp_json_encode($state));
}

/** @return string[] names of top-level state keys (and meta fields) that differ. */
function learn_diff(array $a, array $b): array {
    $out = array();
    foreach ($a as $key => $value) {
        if ($key === 'meta') {
            foreach ($value as $field => $v) {
                if (($b['meta'][ $field ] ?? null) !== $v) {
                    $out[] = 'meta:' . $field;
                }
            }
        } elseif (($b[ $key ] ?? null) != $value) { // phpcs:ignore WordPress.PHP.StrictComparisons -- arrays compared by value
            $out[] = $key;
        }
    }
    return $out;
}

$parent_path = dirname($base) === '.' ? '' : dirname($base);
$base_parent = 0;
if ($parent_path !== '') {
    $parent = get_page_by_path($parent_path, OBJECT, 'page');
    if (! $parent) {
        fwrite(STDERR, "Parent page /{$parent_path}/ does not exist. Create it first (pilot: create-pages.sh).\n");
        exit(1);
    }
    $base_parent = (int) $parent->ID;
}

$report = array();
$ids    = array();
foreach ($manifest['pages'] as $page) {
    $seed_id = (string) $page['path'];
    $label   = $seed_id === '' ? '(root)' : $seed_id;
    $full    = $seed_id === '' ? $base : $base . '/' . $seed_id;
    $slug    = basename($full);
    $parent  = $seed_id === '' ? $base_parent : (int) ($ids[ dirname($seed_id) === '.' ? '' : dirname($seed_id) ] ?? 0);
    if ($seed_id !== '' && $parent === 0) {
        $report[] = array($label, 'error', 'parent page missing');
        continue;
    }
    $content = strtr((string) file_get_contents($here . '/content/' . $page['content']), $tokens);
    $desired = array(
        'title'      => (string) $page['title'],
        'excerpt'    => (string) ($page['excerpt'] ?? ''),
        'content'    => $content,
        'status'     => 'publish',
        'menu_order' => (int) ($page['menu_order'] ?? 0),
        'template'   => Fides_DS_Learn::TEMPLATE,
        'meta'       => array(),
        'layout'     => LEARN_LAYOUT_META,
    );
    foreach (LEARN_FIELDS as $field) {
        $desired['meta'][ $field ] = trim(strtr((string) ($page[ $field ] ?? ''), $tokens));
    }

    // Marker first (the page may have been moved), then the path.
    // The marker holds the full route, so a second tree (other LEARN_BASE) never matches this one.
    $marked = get_posts(array('post_type' => 'page', 'post_status' => 'any', 'numberposts' => 1, 'meta_key' => LEARN_SEED_META, 'meta_value' => $full, 'fields' => 'ids'));
    if (! $marked) {
        // Earlier seeds stored the path relative to the base; accept it only at the same route.
        $legacy = get_posts(array('post_type' => 'page', 'post_status' => 'any', 'numberposts' => 1, 'meta_key' => LEARN_SEED_META, 'meta_value' => $seed_id, 'fields' => 'ids'));
        if ($legacy && get_page_uri((int) $legacy[0]) === $full) {
            $marked = $legacy;
            if (! $dry) {
                update_post_meta((int) $legacy[0], LEARN_SEED_META, $full);
            }
        }
    }
    $post   = $marked ? get_post((int) $marked[0]) : get_page_by_path($full, OBJECT, 'page');
    $is_marked = (bool) $marked;
    $action = 'created';
    $note   = '';

    if ($post) {
        $current = learn_state_of((int) $post->ID);
        if ($is_marked) {
            $stored_hash  = (string) get_post_meta($post->ID, LEARN_HASH_META, true);
            $stored_state = json_decode((string) get_post_meta($post->ID, LEARN_STATE_META, true), true);
            $edited       = learn_hash($current) !== $stored_hash;
            if ($edited && ! in_array($seed_id, $force, true)) {
                $changed  = is_array($stored_state) ? learn_diff($current, $stored_state) : array('unknown');
                $report[] = array($label, 'skipped-edited', 'page ' . $post->ID . ' changed since seed: ' . implode(', ', $changed));
                $ids[ $seed_id ] = (int) $post->ID;
                continue;
            }
            if (! $edited && learn_hash($desired) === $stored_hash) {
                $report[] = array($label, 'unchanged', 'page ' . $post->ID);
                $ids[ $seed_id ] = (int) $post->ID;
                continue;
            }
            $action = $edited ? 'forced' : 'updated';
        } else {
            if (! in_array($seed_id, $force, true)) {
                $report[] = array($label, 'skipped-unmarked', 'page ' . $post->ID . ' exists at /' . $full . '/ without seed marker; not touched');
                $ids[ $seed_id ] = (int) $post->ID;
                continue;
            }
            $action = 'forced';
        }
        if ($action === 'forced' && ! $dry) {
            wp_mkdir_p($backup);
            $file = $backup . '/' . gmdate('Ymd-His') . '-' . $post->ID . '.json';
            file_put_contents($file, wp_json_encode(array('seed_id' => $seed_id, 'post_id' => (int) $post->ID, 'state' => $current), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            $note = 'previous state saved to ' . $file;
        }
    }

    if ($dry) {
        $report[] = array($label, 'would-' . $action, $post ? 'page ' . $post->ID : '');
        $ids[ $seed_id ] = $post ? (int) $post->ID : -1;
        continue;
    }

    $postarr = array(
        'post_type'    => 'page',
        'post_status'  => 'publish',
        'post_title'   => wp_slash($desired['title']),
        'post_name'    => $slug,
        'post_excerpt' => wp_slash($desired['excerpt']),
        'post_content' => wp_slash($content),
        'post_parent'  => $parent,
        'menu_order'   => $desired['menu_order'],
    );
    if ($post) {
        $postarr['ID'] = (int) $post->ID;
        $id            = wp_update_post($postarr, true);
    } else {
        $id = wp_insert_post($postarr, true);
    }
    if (is_wp_error($id)) {
        $report[] = array($label, 'error', $id->get_error_message());
        continue;
    }
    update_post_meta($id, '_wp_page_template', Fides_DS_Learn::TEMPLATE);
    foreach (LEARN_FIELDS as $field) {
        update_post_meta($id, '_fides_learn_' . $field, wp_slash($desired['meta'][ $field ]));
    }
    update_post_meta($id, 'blocksy_post_meta_options', LEARN_LAYOUT_META);
    update_post_meta($id, '_fides_design_pilot', '1');
    update_post_meta($id, LEARN_SEED_META, $full);
    // The stored state is read back from the database, so later comparisons ignore WordPress normalisation.
    $stored = learn_state_of((int) $id);
    update_post_meta($id, LEARN_HASH_META, learn_hash($stored));
    update_post_meta($id, LEARN_STATE_META, wp_slash((string) wp_json_encode($stored)));
    $ids[ $seed_id ] = (int) $id;
    $report[]        = array($label, $action, 'page ' . $id . ' ' . get_permalink($id) . ($note !== '' ? ' (' . $note . ')' : ''));
}

// Glossary terms requested by the content that have no vocabulary entry.
$missing = array();
if (! $dry) {
    foreach ($ids as $id) {
        if ($id > 0) {
            apply_filters('the_content', (string) get_post_field('post_content', $id));
        }
    }
    $missing = array_values(array_unique(Fides_DS_Learn::$missing));
}

foreach ($report as $row) {
    echo str_pad($row[1], 17) . str_pad($row[0], 58) . $row[2] . "\n";
}
$counts = array_count_values(array_column($report, 1));
ksort($counts);
echo 'SUMMARY ' . wp_json_encode($counts) . "\n";
if ($missing) {
    echo 'GLOSSARY-MISSING ' . implode(', ', $missing) . " (shown as plain text; no definition invented)\n";
}
exit(in_array('error', array_column($report, 1), true) ? 1 : 0);
