<?php
/**
 * Email notifications for the FIDES Use Case Catalog.
 *
 * Moments that trigger mail:
 *   1. A new submission is stored (status "received"): the site admin gets a
 *      review notice and the submitter gets a confirmation.
 *   2. A submission is published: the submitter is told it is now live.
 *   3. Weekly linkcheck (CI → secret REST): submitters get broken-link notices
 *      with FIDES in CC. Contact emails are looked up from the DB only and are
 *      never exported to GitHub (GDPR).
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
    $path = (string) apply_filters('fides_use_case_catalog_path', '/ecosystem-explorer/use-cases/');
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
 *
 * @param string               $to      Primary recipient.
 * @param string               $subject Subject line.
 * @param string               $message Plain-text body.
 * @param array<int, string>   $cc      Optional CC addresses (already validated).
 */
function fides_use_case_catalog_send_email(string $to, string $subject, string $message, array $cc = array()): bool {
    if (! is_email($to)) {
        return false;
    }
    $headers = array('Content-Type: text/plain; charset=UTF-8');
    foreach ($cc as $cc_addr) {
        $cc_addr = sanitize_email((string) $cc_addr);
        if (is_email($cc_addr) && strtolower($cc_addr) !== strtolower($to)) {
            $headers[] = 'Cc: ' . $cc_addr;
        }
    }
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

/**
 * Shared secret for the linkcheck notify REST route.
 *
 * Prefer defining FIDES_USE_CASE_LINKCHECK_NOTIFY_SECRET in wp-config.php, or
 * set option `fides_use_case_catalog_linkcheck_notify_secret`. Never commit the
 * secret to git.
 */
function fides_use_case_catalog_linkcheck_notify_secret(): string {
    if (defined('FIDES_USE_CASE_LINKCHECK_NOTIFY_SECRET')) {
        return (string) constant('FIDES_USE_CASE_LINKCHECK_NOTIFY_SECRET');
    }
    $option = (string) get_option('fides_use_case_catalog_linkcheck_notify_secret', '');
    return (string) apply_filters('fides_use_case_catalog_linkcheck_notify_secret', $option);
}

/**
 * CC address(es) for broken-link notices (FIDES team).
 *
 * @return array<int, string>
 */
function fides_use_case_catalog_linkcheck_cc_emails(): array {
    $raw = (string) apply_filters(
        'fides_use_case_catalog_linkcheck_cc_email',
        'catalog@fides.community'
    );
    $out = array();
    foreach (preg_split('/\s*,\s*/', $raw) ?: array() as $addr) {
        $addr = sanitize_email((string) $addr);
        if (is_email($addr)) {
            $out[] = $addr;
        }
    }
    return $out;
}

/**
 * Whether the incoming REST request presents a valid linkcheck notify secret.
 */
function fides_use_case_catalog_linkcheck_notify_permission(WP_REST_Request $request): bool {
    $expected = fides_use_case_catalog_linkcheck_notify_secret();
    if ($expected === '') {
        return false;
    }
    $provided = (string) $request->get_header('x-fides-linkcheck-secret');
    return $provided !== '' && hash_equals($expected, $provided);
}

/**
 * Look up the submitter contact_email for a published use case id.
 */
function fides_use_case_catalog_contact_email_for_use_case(string $use_case_id): string {
    global $wpdb;
    $table = FIDES_USE_CASE_CATALOG_TABLE;
    $email = $wpdb->get_var(
        $wpdb->prepare(
            "SELECT contact_email FROM {$table} WHERE use_case_id = %s AND status = %s LIMIT 1",
            $use_case_id,
            'published'
        )
    );
    $email = sanitize_email((string) $email);
    return is_email($email) ? $email : '';
}

/**
 * Build and send broken-link emails from a linkcheck report payload.
 *
 * The payload must NOT contain email addresses. WordPress resolves them from
 * the local DB by use_case_id.
 *
 * @param array<string, mixed> $payload
 * @return array{sent:int, skipped:int, errors:array<int, string>}
 */
function fides_use_case_catalog_notify_broken_links(array $payload): array {
    $result = array(
        'sent' => 0,
        'skipped' => 0,
        'errors' => array(),
    );

    if (! fides_use_case_catalog_notifications_enabled()) {
        $result['errors'][] = 'notifications_disabled';
        return $result;
    }

    $by_submitter = $payload['bySubmitter'] ?? null;
    if (! is_array($by_submitter) || $by_submitter === array()) {
        $result['errors'][] = 'empty_bySubmitter';
        return $result;
    }

    $run_at = isset($payload['runAt']) ? (string) $payload['runAt'] : gmdate('Y-m-d');
    $run_day = substr($run_at, 0, 10);
    $cc = fides_use_case_catalog_linkcheck_cc_emails();
    $site = wp_specialchars_decode((string) get_bloginfo('name'), ENT_QUOTES);

    // Merge by resolved contact email so one person gets one message.
    /** @var array<string, array{names: array<int, string>, urls: array<int, array<string, string>>}> $by_email */
    $by_email = array();

    foreach ($by_submitter as $org_name => $entry) {
        if (! is_array($entry)) {
            continue;
        }
        $org_label = is_string($org_name) ? $org_name : 'Unknown';
        $broken_urls = isset($entry['brokenUrls']) && is_array($entry['brokenUrls'])
            ? $entry['brokenUrls']
            : array();
        if ($broken_urls === array()) {
            continue;
        }

        // Resolve email from the first use-case id that has a contact on file.
        $email = '';
        $use_case_ids = isset($entry['useCaseIds']) && is_array($entry['useCaseIds'])
            ? $entry['useCaseIds']
            : array();
        foreach ($use_case_ids as $uc_id) {
            $email = fides_use_case_catalog_contact_email_for_use_case((string) $uc_id);
            if ($email !== '') {
                break;
            }
        }
        if ($email === '') {
            // Fall back: try each broken URL's itemId.
            foreach ($broken_urls as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $email = fides_use_case_catalog_contact_email_for_use_case((string) ($row['itemId'] ?? ''));
                if ($email !== '') {
                    break;
                }
            }
        }
        if ($email === '') {
            $result['skipped']++;
            $result['errors'][] = 'no_contact_email:' . $org_label;
            continue;
        }

        $key = strtolower($email);
        if (! isset($by_email[$key])) {
            $by_email[$key] = array(
                'names' => array($org_label),
                'urls' => array(),
            );
        } elseif (! in_array($org_label, $by_email[$key]['names'], true)) {
            $by_email[$key]['names'][] = $org_label;
        }

        foreach ($broken_urls as $row) {
            if (! is_array($row)) {
                continue;
            }
            $item = array(
                'itemId' => (string) ($row['itemId'] ?? ''),
                'itemTitle' => (string) ($row['itemTitle'] ?? ''),
                'field' => (string) ($row['field'] ?? ''),
                'url' => (string) ($row['url'] ?? ''),
                'error' => (string) ($row['error'] ?? ''),
            );
            $dup = false;
            foreach ($by_email[$key]['urls'] as $existing) {
                if (
                    $existing['url'] === $item['url']
                    && $existing['itemId'] === $item['itemId']
                    && $existing['field'] === $item['field']
                ) {
                    $dup = true;
                    break;
                }
            }
            if (! $dup && $item['url'] !== '') {
                $by_email[$key]['urls'][] = $item;
            }
        }
    }

    foreach ($by_email as $email => $bundle) {
        $names = implode(' / ', $bundle['names']);
        /* translators: %s: site name */
        $subject = sprintf(__('[%s] Broken link(s) on your use case submission', 'fides-use-case-catalog'), $site);

        $lines = array(
            __('Hello,', 'fides-use-case-catalog'),
            '',
            sprintf(
                /* translators: %s: organization / submitter label */
                __('The weekly FIDES Use Case Catalog link check found broken or unreachable URL(s) on use case(s) submitted under "%s".', 'fides-use-case-catalog'),
                $names
            ),
            '',
            __('Please update the affected link(s) via the FIDES submission form or a pull request against your organization\'s use-case-catalog.json file.', 'fides-use-case-catalog'),
            '',
            sprintf(
                /* translators: %s: ISO date */
                __('Run date: %s', 'fides-use-case-catalog'),
                $run_day
            ),
            '',
            __('Broken links:', 'fides-use-case-catalog'),
        );

        $by_use_case = array();
        foreach ($bundle['urls'] as $u) {
            $label = ($u['itemTitle'] !== '' ? $u['itemTitle'] : $u['itemId']) . ' (' . $u['itemId'] . ')';
            if (! isset($by_use_case[$label])) {
                $by_use_case[$label] = array();
            }
            $by_use_case[$label][] = $u;
        }
        foreach ($by_use_case as $label => $urls) {
            $lines[] = '';
            $lines[] = '— ' . $label;
            foreach ($urls as $u) {
                $lines[] = '  • [' . $u['field'] . '] ' . $u['url'];
                if ($u['error'] !== '') {
                    $lines[] = '    ' . $u['error'];
                }
            }
        }

        $lines[] = '';
        $lines[] = __('Catalog:', 'fides-use-case-catalog') . ' ' . home_url(
            (string) apply_filters('fides_use_case_catalog_path', '/ecosystem-explorer/use-cases/')
        );
        $lines[] = __('Repository:', 'fides-use-case-catalog') . ' https://github.com/FIDEScommunity/fides-use-case-catalog';
        $lines[] = '';
        $lines[] = '— ' . $site;
        $lines[] = '';
        $lines[] = __('You received this message because you are listed as the submitter contact for these use case(s). FIDES is CC\'d on this email.', 'fides-use-case-catalog');

        $body = implode("\n", $lines);
        $subject = (string) apply_filters('fides_use_case_catalog_linkcheck_email_subject', $subject, $email, $bundle);
        $body = (string) apply_filters('fides_use_case_catalog_linkcheck_email_body', $body, $email, $bundle);

        if (fides_use_case_catalog_send_email($email, $subject, $body, $cc)) {
            $result['sent']++;
        } else {
            $result['errors'][] = 'send_failed';
        }
    }

    return $result;
}
