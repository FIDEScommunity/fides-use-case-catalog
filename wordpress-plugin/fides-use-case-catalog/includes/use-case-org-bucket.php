<?php
/**
 * Resolve the organization folder (slug + orgId) for a use-case listing.
 *
 * The listing org is `organizationName` (the submitter). Linked
 * `links.organizations[]` partners must not steal orgId — using
 * organizations[0].refId assigned Hopae → org:google after catalog links
 * were filled in.
 *
 * @package fides-use-case-catalog
 */

if (! defined('ABSPATH')) {
    exit;
}

if (! function_exists('fides_use_case_catalog_slugify')) {
    /**
     * URL-safe slug. Uses WordPress sanitize_title when available.
     */
    function fides_use_case_catalog_slugify(string $text): string {
        if (function_exists('sanitize_title')) {
            $slug = (string) sanitize_title($text);
        } else {
            $slug = strtolower(trim((string) preg_replace('/[^a-z0-9]+/i', '-', $text), '-'));
        }
        if ($slug === '') {
            $slug = 'use-case';
        }
        return $slug;
    }
}

/**
 * Display label of a linked organization row.
 *
 * @param array<string, mixed> $link
 */
function fides_use_case_catalog_org_link_label(array $link): string {
    foreach (array('labelRaw', 'label', 'name') as $key) {
        if (! isset($link[ $key ])) {
            continue;
        }
        $label = trim((string) $link[ $key ]);
        if ($label !== '') {
            return $label;
        }
    }
    return '';
}

/**
 * Linked organizations on a use-case item.
 *
 * @param array<string, mixed> $item
 * @return array<int, array<string, mixed>>
 */
function fides_use_case_catalog_item_org_links(array $item): array {
    if (! isset($item['links']) || ! is_array($item['links'])) {
        return array();
    }
    $rows = $item['links']['organizations'] ?? null;
    if (! is_array($rows)) {
        return array();
    }
    $out = array();
    foreach ($rows as $row) {
        if (is_array($row)) {
            $out[] = $row;
        }
    }
    return $out;
}

/**
 * Catalog org:… ref for the listing organization, or '' when none matches.
 *
 * Prefers a linked row whose label equals organizationName; then a refId
 * whose slug matches the listing slug. Never falls back to organizations[0].
 *
 * @param array<string, mixed> $item
 */
function fides_use_case_catalog_listing_org_ref(array $item, string $listing_slug): string {
    $org_name = isset($item['organizationName']) ? trim((string) $item['organizationName']) : '';
    $org_name_lc = strtolower($org_name);
    $expected_ref = $listing_slug !== '' ? ('org:' . $listing_slug) : '';
    $links = fides_use_case_catalog_item_org_links($item);

    if ($org_name_lc !== '') {
        foreach ($links as $link) {
            $ref = isset($link['refId']) ? trim((string) $link['refId']) : '';
            $label = fides_use_case_catalog_org_link_label($link);
            if ($ref !== '' && $label !== '' && strtolower($label) === $org_name_lc) {
                return $ref;
            }
        }
    }

    if ($expected_ref !== '') {
        foreach ($links as $link) {
            $ref = isset($link['refId']) ? trim((string) $link['refId']) : '';
            if ($ref === $expected_ref) {
                return $ref;
            }
        }
    }

    return '';
}

/**
 * Resolve the organization bucket (folder slug + id + display name) for an item.
 *
 * Slug stays derived from organizationName so community-catalog folders remain
 * stable. orgId is the matching catalog ref, else org:{slug}.
 *
 * @param array<string, mixed> $item
 * @return array{orgSlug:string, orgId:string, orgName:string}
 */
function fides_use_case_catalog_org_bucket(array $item): array {
    $org_name = isset($item['organizationName']) ? trim((string) $item['organizationName']) : '';
    $slug = $org_name !== ''
        ? fides_use_case_catalog_slugify($org_name)
        : 'unknown-organization';

    $matched_ref = fides_use_case_catalog_listing_org_ref($item, $slug);
    $org_id = $matched_ref !== '' ? $matched_ref : ('org:' . $slug);

    $org_name_out = $org_name;
    if ($org_name_out === '') {
        $org_name_out = $matched_ref !== '' ? $matched_ref : 'Unknown organization';
    }

    return array(
        'orgSlug' => $slug,
        'orgId'   => $org_id,
        'orgName' => $org_name_out,
    );
}
