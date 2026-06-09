<?php
/**
 * Email notifications for the FIDES Use Case Catalog.
 *
 * Two moments trigger mail:
 *   1. A new submission is stored (status "received"): the site admin gets a
 *      review notice and the submitter gets a confirmation.
 *   2. A submission is published: the submitter is told it is now live.
 *
 * All sending is gated behind the `fides_use_case_catalog_send_notifications`
 * filter so a site can disable it wholesale, and individual recipients /
 * subjects / bodies are filterable for customisation.
 *
 * @package fides-use-case-catalog
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Whether notification emails should be sent at all.
 */
function fides_use_case_catalog_notifications_enabled(): bool {
    return (bool) apply_filters('fides_use_case_catalog_send_notifications', true);
}

/**
 * Public detail URL for a published use case.
 */
function fides_use_case_catalog_detail_url(string $use_case_id): string {
    $path = (string) apply_filters('fides_use_case_catalog_path', '/use-cases/');
    return add_query_arg('usecase', rawurlencode($use_case_id), home_url($path));
}

/**
 * Admin review URL for a submission row.
 */
function fides_use_case_catalog_admin_review_url(int $row_id): string {
    return admin_url('tools.php?page=fides-use-case-submissions&submission=' . $row_id);
}

/**
 * Thin wrapper around wp_mail with a plain-text content type.
 */
function fides_use_case_catalog_send_email(string $to, string $subject, string $message): bool {
    if (! is_email($to)) {
        return false;
    }
    $headers = array('Content-Type: text/plain; charset=UTF-8');
    return (bool) wp_mail($to, $subject, $message, $headers);
}

/**
 * Notify the admin and the submitter that a new use case has been received.
 */
function fides_use_case_catalog_notify_submission(
    int $row_id,
    string $use_case_id,
    string $title,
    string $organization_name,
    string $contact_email
): void {
    if (! fides_use_case_catalog_notifications_enabled()) {
        return;
    }

    $site = wp_specialchars_decode((string) get_bloginfo('name'), ENT_QUOTES);

    // --- Admin review notice -------------------------------------------------
    $admin_email = (string) get_option('admin_email');
    $admin_email = (string) apply_filters(
        'fides_use_case_catalog_admin_notification_email',
        $admin_email,
        $use_case_id
    );
    if (is_email($admin_email)) {
        /* translators: 1: site name, 2: use case title */
        $subject = sprintf(__('[%1$s] New use case submission: %2$s', 'fides-use-case-catalog'), $site, $title);
        $body = implode("\n", array(
            __('A new use case has been submitted and is awaiting review.', 'fides-use-case-catalog'),
            '',
            sprintf(__('Title: %s', 'fides-use-case-catalog'), $title),
            sprintf(__('Organization: %s', 'fides-use-case-catalog'), $organization_name),
            sprintf(__('Submitted by: %s', 'fides-use-case-catalog'), $contact_email),
            '',
            __('Review it here:', 'fides-use-case-catalog'),
            fides_use_case_catalog_admin_review_url($row_id),
        ));
        $subject = (string) apply_filters('fides_use_case_catalog_admin_email_subject', $subject, $use_case_id, $title);
        $body    = (string) apply_filters('fides_use_case_catalog_admin_email_body', $body, $use_case_id, $title);
        fides_use_case_catalog_send_email($admin_email, $subject, $body);
    }

    // --- Submitter confirmation ---------------------------------------------
    if (is_email($contact_email)) {
        /* translators: %s: site name */
        $subject = sprintf(__('[%s] We received your use case submission', 'fides-use-case-catalog'), $site);
        $body = implode("\n", array(
            /* translators: %s: site name */
            sprintf(__('Thank you for submitting your use case to %s.', 'fides-use-case-catalog'), $site),
            '',
            sprintf(__('Title: %s', 'fides-use-case-catalog'), $title),
            '',
            __('Our team will review it and publish it once approved. You will receive another email when it goes live.', 'fides-use-case-catalog'),
            '',
            '— ' . $site,
        ));
        $subject = (string) apply_filters('fides_use_case_catalog_submitter_email_subject', $subject, $use_case_id, $title);
        $body    = (string) apply_filters('fides_use_case_catalog_submitter_email_body', $body, $use_case_id, $title);
        fides_use_case_catalog_send_email($contact_email, $subject, $body);
    }
}

/**
 * Notify the submitter that their use case is now published / live.
 */
function fides_use_case_catalog_notify_published(int $row_id): void {
    if (! fides_use_case_catalog_notifications_enabled()) {
        return;
    }

    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    $row = $wpdb->get_row(
        $wpdb->prepare("SELECT use_case_id, title, contact_email FROM {$table} WHERE id = %d", $row_id),
        ARRAY_A
    );
    if (! is_array($row)) {
        return;
    }

    $contact_email = sanitize_email((string) ($row['contact_email'] ?? ''));
    if (! is_email($contact_email)) {
        return;
    }

    $site  = wp_specialchars_decode((string) get_bloginfo('name'), ENT_QUOTES);
    $title = (string) ($row['title'] ?? '');
    $url   = fides_use_case_catalog_detail_url((string) ($row['use_case_id'] ?? ''));

    /* translators: %s: site name */
    $subject = sprintf(__('[%s] Your use case is now live', 'fides-use-case-catalog'), $site);
    $body = implode("\n", array(
        __('Good news — your use case has been published and is now visible in the catalog.', 'fides-use-case-catalog'),
        '',
        sprintf(__('Title: %s', 'fides-use-case-catalog'), $title),
        sprintf(__('View it here: %s', 'fides-use-case-catalog'), $url),
        '',
        '— ' . $site,
    ));
    $subject = (string) apply_filters('fides_use_case_catalog_published_email_subject', $subject, $row['use_case_id'] ?? '', $title);
    $body    = (string) apply_filters('fides_use_case_catalog_published_email_body', $body, $row['use_case_id'] ?? '', $title);
    fides_use_case_catalog_send_email($contact_email, $subject, $body);
}
