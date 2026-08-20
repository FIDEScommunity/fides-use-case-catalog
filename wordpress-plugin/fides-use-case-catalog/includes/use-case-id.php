<?php
/**
 * Public use-case id validation. Ids are case-sensitive (catalog suffixes
 * such as -IyxXZl / -b5dcHk must not be lowercased).
 *
 * @package fides-use-case-catalog
 */

if (! defined('ABSPATH')) {
    exit;
}

if (! defined('FIDES_USE_CASE_ID_ROUTE_PATTERN')) {
    define('FIDES_USE_CASE_ID_ROUTE_PATTERN', '[A-Za-z0-9][A-Za-z0-9._-]*');
}

if (! defined('FIDES_USE_CASE_ID_PATTERN')) {
    define('FIDES_USE_CASE_ID_PATTERN', '/^' . FIDES_USE_CASE_ID_ROUTE_PATTERN . '$/');
}

function fides_use_case_catalog_is_valid_use_case_id(string $raw): bool {
    $raw = trim($raw);
    return $raw !== '' && preg_match(FIDES_USE_CASE_ID_PATTERN, $raw) === 1;
}

/**
 * Sanitize a public use case id for REST paths and lookups.
 * Preserves mixed case; returns '' when the value is not a valid id.
 */
function fides_use_case_catalog_sanitize_use_case_id(string $raw): string {
    $raw = trim($raw);
    if (function_exists('sanitize_text_field')) {
        $raw = sanitize_text_field($raw);
    }
    if (! fides_use_case_catalog_is_valid_use_case_id($raw)) {
        return '';
    }
    return $raw;
}
