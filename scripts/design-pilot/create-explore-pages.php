<?php
/**
 * Seed the editorial pages behind Explore by theme / sector (explore/choices.json): one WordPress page per theme
 * bundle and per assignable sector. Title = heading, content = introduction, featured image = picture. Run through
 * create-explore-pages.sh.
 *
 * Same protection as create-pages.php and create-learn-pages.php:
 *  - a page is managed only when it carries _fides_explore_seed; it is updated only while it still matches the state
 *    stored after the last seed (_fides_explore_seed_hash). Title, content, status, parent, order or featured image
 *    changed by an editor -> `skipped-edited`, reported, never overwritten;
 *  - a page at the same path without the marker is never touched (`skipped-unmarked`);
 *  - there is no force option here; a replacement is done by hand.
 *
 * Environment: EXPLORE_DRY_RUN=1 reports only. PILOT_BASE / PILOT_STANDALONE as in seed-guard.php.
 */

if (! defined('ABSPATH')) {
    fwrite(STDERR, "Run through WP-CLI (create-explore-pages.sh).\n");
    exit(1);
}
require __DIR__ . '/staging/seed-guard.php';
if (in_array(fides_pilot_host(), array('fides.community', 'www.fides.community'), true)) {
    fwrite(STDERR, "Refusing to seed the production host.\n");
    exit(1);
}
if (! defined('FIDES_DESIGN_PILOT') && ! fides_pilot_host_allowed()) {
    fwrite(STDERR, "Refusing to run outside the design pilot site.\n");
    exit(1);
}
if (! class_exists('Fides_Use_Case_Explore_Choice')) {
    fwrite(STDERR, "Plugin fides-use-case-catalog (with Explore choices) is not active.\n");
    exit(1);
}

const EXPLORE_SEED_META  = '_fides_explore_seed';
const EXPLORE_HASH_META  = '_fides_explore_seed_hash';
const EXPLORE_STATE_META = '_fides_explore_seed_state';

$ctx      = fides_pilot_seed_context();
$sa       = $ctx['standalone'];
$mount    = $ctx['mount'];
$base     = $ctx['base']; // '' when standalone
$learn    = trim((string) (getenv('LEARN_BASE') ?: ($sa ? 'learn' : 'fides-design-pilot/learn')), '/');
$dry      = getenv('EXPLORE_DRY_RUN') === '1';
$file     = (string) (getenv('EXPLORE_CHOICES_FILE') ?: __DIR__ . '/explore/choices.json');
$data     = json_decode((string) file_get_contents($file), true);
if (! is_array($data) || empty($data['choices'])) {
    fwrite(STDERR, "Invalid explore/choices.json.\n");
    exit(1);
}
$parent = 0;
if ($base !== '') {
    $parent_page = get_page_by_path($base, OBJECT, 'page');
    if (! $parent_page) {
        fwrite(STDERR, "Parent page /{$base}/ does not exist. Run create-pages.sh first.\n");
        exit(1);
    }
    $parent = (int) $parent_page->ID;
}
kses_remove_filters(); // trusted, version-controlled content

/** @return array<string, mixed> canonical, comparable state of a page */
function explore_state_of(int $id): array {
    $post = get_post($id);
    return array(
        'title'      => (string) $post->post_title,
        'content'    => (string) $post->post_content,
        'status'     => (string) $post->post_status,
        'parent'     => (int) $post->post_parent,
        'menu_order' => (int) $post->menu_order,
        'thumbnail'  => (int) get_post_thumbnail_id($id),
        'choice'     => (string) get_post_meta($id, Fides_Use_Case_Explore_Choice::META, true),
    );
}

function explore_hash(array $state): string {
    return sha1(fides_pilot_normalize((string) wp_json_encode($state)));
}

/** @return list<string> keys that differ */
function explore_diff(array $a, array $b): array {
    $out = array();
    foreach ($a as $key => $value) {
        if (($b[ $key ] ?? null) != $value) { // phpcs:ignore WordPress.PHP.StrictComparisons
            $out[] = $key;
        }
    }
    return $out;
}

function explore_content(array $choice, string $learn_url): string {
    $html = "<!-- wp:paragraph -->\n<p>" . esc_html((string) $choice['intro']) . "</p>\n<!-- /wp:paragraph -->";
    if (! empty($choice['learn']['path'])) {
        $html .= "\n\n<!-- wp:paragraph -->\n<p><a href=\"" . esc_url($learn_url . '/' . trim((string) $choice['learn']['path'], '/') . '/') . '">'
            . esc_html((string) $choice['learn']['label']) . ' · Learn →</a></p>' . "\n<!-- /wp:paragraph -->";
    }
    return $html;
}

$learn_url = $ctx['origin'] . $mount . '/' . $learn;
$report    = array();
foreach ($data['choices'] as $choice) {
    $kind  = (string) $choice['kind'];
    $slug  = (string) $choice['slug'];
    $value = $kind . ':' . $slug;
    $name  = 'explore-' . $kind . '-' . str_replace('_', '-', $slug);
    $path  = $base === '' ? $name : $base . '/' . $name;
    $label = $kind . ': ' . $slug;

    $desired = array(
        'title'      => (string) $choice['title'],
        'content'    => explore_content($choice, $learn_url),
        'status'     => 'publish',
        'parent'     => $parent,
        'menu_order' => (int) ($choice['menu_order'] ?? 0),
        'thumbnail'  => 0,
        'choice'     => $value,
    );

    $marked = get_posts(array('post_type' => 'page', 'post_status' => 'any', 'numberposts' => 1, 'meta_key' => EXPLORE_SEED_META, 'meta_value' => $value, 'fields' => 'ids'));
    $post   = $marked ? get_post((int) $marked[0]) : get_page_by_path($path, OBJECT, 'page');
    $action = 'created';

    if ($post instanceof WP_Post) {
        if (! $marked) {
            $report[] = array($label, 'skipped-unmarked', 'page ' . $post->ID . ' exists at /' . $path . '/ without seed marker; not touched');
            continue;
        }
        $current = explore_state_of((int) $post->ID);
        $stored  = (string) get_post_meta($post->ID, EXPLORE_HASH_META, true);
        if ($stored !== explore_hash($current)) {
            $before   = json_decode((string) get_post_meta($post->ID, EXPLORE_STATE_META, true), true);
            $report[] = array($label, 'skipped-edited', 'page ' . $post->ID . ' changed since seed: ' . implode(', ', is_array($before) ? explore_diff($current, $before) : array('unknown')));
            continue;
        }
        // A featured image added by an editor is part of the state: the page then counts as edited (skipped above).
        if (explore_hash($desired) === explore_hash($current)) {
            $report[] = array($label, 'unchanged', 'page ' . $post->ID);
            continue;
        }
        $action = 'updated';
    }

    if ($dry) {
        $report[] = array($label, 'would-' . $action, $post ? 'page ' . $post->ID : '');
        continue;
    }

    $postarr = array(
        'post_type'    => 'page',
        'post_status'  => 'publish',
        'post_title'   => wp_slash($desired['title']),
        'post_name'    => $name,
        'post_parent'  => $parent,
        'menu_order'   => $desired['menu_order'],
        'post_content' => wp_slash($desired['content']),
    );
    if ($post instanceof WP_Post) {
        $postarr['ID'] = (int) $post->ID;
        $id            = wp_update_post($postarr, true);
    } else {
        $id = wp_insert_post($postarr, true);
    }
    if (is_wp_error($id)) {
        $report[] = array($label, 'error', $id->get_error_message());
        continue;
    }
    update_post_meta($id, Fides_Use_Case_Explore_Choice::META, $value);
    update_post_meta($id, '_fides_design_pilot', '1');
    update_post_meta($id, EXPLORE_SEED_META, $value);
    $stored_state = explore_state_of((int) $id); // read back, so WordPress normalisation does not count as an edit
    update_post_meta($id, EXPLORE_HASH_META, explore_hash($stored_state));
    update_post_meta($id, EXPLORE_STATE_META, wp_slash((string) wp_json_encode($stored_state)));
    $report[] = array($label, $action, 'page ' . $id);
}

foreach ($report as $row) {
    echo str_pad($row[1], 17) . str_pad($row[0], 44) . $row[2] . "\n";
}
$counts = array_count_values(array_column($report, 1));
ksort($counts);
echo 'SUMMARY ' . wp_json_encode($counts) . "\n";
exit(in_array('error', array_column($report, 1), true) ? 1 : 0);
