<?php
/**
 * Read-only gate for a Learn content update.
 * Missing renderer functions or a missing request-form coupling stop the seed.
 * This file does not install a plugin, change an option, or write a page.
 */
if (! defined('ABSPATH')) {
    fwrite(STDERR, "Run through WP-CLI.\n");
    exit(1);
}

/**
 * @return string[] human-readable reasons to stop, empty when the site can take this content
 */
function learn_content_update_blockers(): array {
    $errors = array();
    if (! class_exists('Fides_DS_Learn')) {
        $errors[] = 'Refusing: Fides_DS_Learn is not active. This package does not install a plugin.';
    }
    foreach (array('fides_learn_record', 'fides_learn_usecase') as $shortcode) {
        if (! shortcode_exists($shortcode)) {
            $errors[] = "Refusing: shortcode {$shortcode} is missing. This package does not install a plugin.";
        }
    }
    if (! class_exists('Fides_DS_Learn') || ! method_exists('Fides_DS_Learn', 'adjust_trial_links')) {
        $errors[] = 'Refusing: Fides_DS_Learn::adjust_trial_links is missing. This package does not install a plugin.';
    }
    if (getenv('LEARN_CONTENT_UPDATE') === '1') {
        $spec = apply_filters('fides_ds_learn_contact_buttons', array());
        $form = is_array($spec) ? (string) ($spec['form'] ?? '') : '';
        if (! str_contains($form, '/learn/sessions/request-wpforms')) {
            $errors[] = 'Refusing: training and date buttons are not coupled to /learn/sessions/request-wpforms/. This package does not change that coupling and does not install a plugin.';
        }
    }
    return $errors;
}

if (getenv('LEARN_CHECK_REQUIREMENTS') === '1') {
    $learn_requirement_errors = learn_content_update_blockers();
    foreach ($learn_requirement_errors as $learn_requirement_error) {
        fwrite(STDERR, $learn_requirement_error . "\n");
    }
    exit($learn_requirement_errors === array() ? 0 : 1);
}
