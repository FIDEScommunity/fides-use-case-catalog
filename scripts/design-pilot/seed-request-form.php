<?php
/**
 * Seed the WPForms request form prototype: the form "fides-request-form" and its request page.
 * Run through seed-request-form.sh (WP-CLI). Idempotent, pilot sites only.
 *
 *  - The form comes from learn/request-form/fides-request-form.json (same file works with the WPForms importer).
 *    The form is found by its slug, not by id, because ids differ per site.
 *  - A form that an editor changed in the builder (content hash differs from the one stored after the last seed)
 *    is skipped and reported. REQUEST_FORM_FORCE=1 replaces it.
 *  - The page is created once (child of the Training & workshops page, slug request-wpforms). An existing page is kept.
 *  - REQUEST_FORM_PAGE=test creates a separate test page instead (slug request-wpforms-test, at the site root of a
 *    standalone site, below the pilot base page otherwise). It is never a routing target and is not linked from anywhere.
 *  - The routing of the existing request links stays OFF; this script never changes the option.
 *  - No network access: only WordPress functions and the JSON file next to this script are used.
 *
 * Environment: REQUEST_FORM_PAGE=test, REQUEST_FORM_FORCE=1, REQUEST_FORM_DRY_RUN=1, PILOT_STANDALONE=1, PILOT_BASE,
 * PILOT_ALLOWED_HOSTS (see staging/seed-guard.php)
 */
if (! defined('ABSPATH')) {
    fwrite(STDERR, "Run through WP-CLI (seed-request-form.sh).\n");
    exit(1);
}
require __DIR__ . '/staging/seed-guard.php';
if (! defined('FIDES_DESIGN_PILOT') && ! fides_pilot_host_allowed()) {
    fwrite(STDERR, "Refusing to run outside the design pilot site.\n");
    exit(1);
}
if (! function_exists('wpforms') || ! class_exists('Fides_DS_Request_Form')) {
    fwrite(STDERR, "WPForms and fides-community-tools-tiles (with the request form class) must be active.\n");
    exit(1);
}

$dry   = getenv('REQUEST_FORM_DRY_RUN') === '1';
$test  = getenv('REQUEST_FORM_PAGE') === 'test';
$force = getenv('REQUEST_FORM_FORCE') === '1';
$raw   = json_decode((string) file_get_contents(__DIR__ . '/learn/request-form/fides-request-form.json'), true);
$form  = is_array($raw) ? reset($raw) : null;
if (! is_array($form)) {
    fwrite(STDERR, "learn/request-form/fides-request-form.json is not valid.\n");
    exit(1);
}

// ---- Form ----
$existing = get_posts(array('post_type' => 'wpforms', 'name' => Fides_DS_Request_Form::FORM_SLUG, 'post_status' => 'any', 'numberposts' => 1));
$title    = (string) $form['settings']['form_title'];
if (! $existing) {
    echo "form: create\n";
    if (! $dry) {
        $id = wp_insert_post(array('post_type' => 'wpforms', 'post_status' => 'publish', 'post_title' => $title, 'post_name' => Fides_DS_Request_Form::FORM_SLUG, 'post_content' => '{}'), true);
        if (is_wp_error($id)) {
            fwrite(STDERR, $id->get_error_message() . "\n");
            exit(1);
        }
        $form['id'] = (int) $id;
        wp_update_post(array('ID' => $id, 'post_content' => wpforms_encode($form)));
        update_post_meta($id, '_fides_request_form_hash', sha1((string) get_post_field('post_content', $id)));
        echo "form: id $id\n";
    }
} else {
    $post = $existing[0];
    $hash = (string) get_post_meta($post->ID, '_fides_request_form_hash', true);
    if ($hash !== '' && $hash !== sha1((string) $post->post_content) && ! $force) {
        echo "form: skipped (changed in the builder since the last seed; REQUEST_FORM_FORCE=1 replaces it), id {$post->ID}\n";
    } else {
        $form['id'] = (int) $post->ID;
        $new        = wpforms_encode($form); // already slashed for wp_update_post
        $same       = wp_unslash($new) === $post->post_content;
        echo ($same ? 'form: up to date' : 'form: update') . ", id {$post->ID}\n";
        if (! $dry && ! $same) {
            wp_update_post(array('ID' => $post->ID, 'post_content' => $new));
        }
        if (! $dry) {
            update_post_meta($post->ID, '_fides_request_form_hash', sha1((string) get_post_field('post_content', $post->ID)));
        }
    }
}

// ---- Page ----
$marked = get_posts(array(
    'post_type'   => 'page',
    'post_status' => 'any',
    'numberposts' => 1,
    'meta_query'  => array(
        array('key' => Fides_DS_Request_Form::PAGE_META, 'value' => '1'),
        array('key' => Fides_DS_Request_Form::TEST_META, 'compare' => $test ? 'EXISTS' : 'NOT EXISTS'),
    ),
));
if ($marked) {
    // The page must not carry the kind "request": the existing request page lookups would pick it up.
    if (! $dry && get_post_meta($marked[0]->ID, '_fides_learn_kind', true) !== 'article') {
        update_post_meta($marked[0]->ID, '_fides_learn_kind', 'article');
        echo "page: kind set to article\n";
    }
    echo 'page: exists, id ' . $marked[0]->ID . ' ' . get_permalink($marked[0]) . "\n";
    exit(0);
}
$parents = get_posts(array('post_type' => 'page', 'post_status' => 'publish', 'numberposts' => 1, 'meta_key' => '_fides_learn_kind', 'meta_value' => 'sessions'));
if (! $parents) {
    fwrite(STDERR, "No Learn sessions page found for the request page.\n");
    exit(1);
}
$source   = get_posts(array('post_type' => 'page', 'post_status' => 'publish', 'numberposts' => 1, 'post_parent' => $parents[0]->ID, 'meta_key' => '_fides_learn_kind', 'meta_value' => 'request'));
$template = $source ? get_page_template_slug($source[0]->ID) : 'fides-learn';
if ($test) {
    // Site root on a standalone site (/design-review/request-wpforms-test/); below the pilot base page on the local pilot.
    $parent_id = 0;
    if (! fides_pilot_standalone()) {
        $base = get_page_by_path((string) (getenv('PILOT_BASE') ?: 'fides-design-pilot'));
        $parent_id = $base ? (int) $base->ID : 0;
    }
    $slug = 'request-wpforms-test';
    echo 'page: create test page ' . $slug . ($parent_id ? " below {$parent_id}" : ' at the site root') . "\n";
} else {
    $parent_id = (int) $parents[0]->ID;
    $slug      = 'request-wpforms';
    echo "page: create under {$parents[0]->post_name}\n";
}
if ($dry) {
    exit(0);
}
$body = '<!-- wp:heading {"level":2} --><h2 class="wp-block-heading">What happens next</h2><!-- /wp:heading -->'
    . '<!-- wp:list {"ordered":true} --><ol class="wp-block-list"><!-- wp:list-item --><li>We read your request and reply by email.</li><!-- /wp:list-item -->'
    . '<!-- wp:list-item --><li>If it fits, we discuss the content with you.</li><!-- /wp:list-item -->'
    . '<!-- wp:list-item --><li>We send a proposal with scope and price. You decide after that.</li><!-- /wp:list-item --></ol><!-- /wp:list -->';
$page_id = wp_insert_post(array(
    'post_type'    => 'page',
    'post_status'  => 'publish',
    'post_title'   => 'Request',
    'post_name'    => $slug,
    'post_parent'  => $parent_id,
    'post_excerpt' => 'Choose a training date or tell us about your team. No account is needed, and nothing is booked or paid through this form.',
    'post_content' => $body,
    'page_template' => $template ?: 'fides-learn',
), true);
if (is_wp_error($page_id)) {
    fwrite(STDERR, $page_id->get_error_message() . "\n");
    exit(1);
}
update_post_meta($page_id, '_fides_learn_kind', 'article'); // not "request": the existing request page lookups would pick it up
update_post_meta($page_id, '_fides_learn_headline', 'Tell us what you need.');
update_post_meta($page_id, '_fides_learn_eyebrow', 'Learn / Request');
update_post_meta($page_id, '_fides_design_pilot', '1');
update_post_meta($page_id, Fides_DS_Request_Form::PAGE_META, '1');
if ($test) {
    update_post_meta($page_id, Fides_DS_Request_Form::TEST_META, '1');
}
echo 'page: id ' . $page_id . ' ' . get_permalink($page_id) . "\n";
