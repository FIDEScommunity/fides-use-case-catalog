<?php
/**
 * Regression tests for share-URL listing detection and mixed-case use-case ids.
 *
 * Run from the repo root:
 *   php tests/php/run.php
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}

$plugin = dirname(__DIR__, 2) . '/wordpress-plugin/fides-use-case-catalog';
require $plugin . '/includes/use-case-id.php';
require $plugin . '/includes/use-case-share-url.php';
require $plugin . '/includes/use-case-video.php';

$failures = 0;
$passes = 0;

function expect_same($actual, $expected, string $label): void {
    global $failures, $passes;
    if ($actual !== $expected) {
        $failures++;
        fwrite(STDERR, "FAIL {$label}\n  expected: " . var_export($expected, true) . "\n  actual:   " . var_export($actual, true) . "\n");
        return;
    }
    $passes++;
    echo "ok {$label}\n";
}

$aliases = array_merge(
    array('/ecosystem-explorer/use-cases/'),
    fides_use_case_catalog_default_listing_path_aliases()
);

$listing_paths = array(
    '/ecosystem-explorer/use-cases/',
    '/ecosystem-explorer/use-cases',
    '/use-cases/',
    '/use-cases',
);

foreach ($listing_paths as $path) {
    expect_same(
        fides_use_case_catalog_path_is_exact_listing($path, $aliases),
        true,
        "listing path redirects: {$path}"
    );
}

$form_paths = array(
    '/ecosystem-explorer/use-cases/update-use-case/',
    '/ecosystem-explorer/use-cases/update-use-case',
    '/use-cases/update-use-case/',
    '/use-cases/update/',
    '/use-case/trusted-service-assistant-IyxXZl/',
    '/submit-use-case/',
    '/',
    '',
);

foreach ($form_paths as $path) {
    expect_same(
        fides_use_case_catalog_path_is_exact_listing($path, $aliases),
        false,
        "non-listing path must not redirect: {$path}"
    );
}

expect_same(
    fides_use_case_catalog_is_listing_request_path('/use-cases/'),
    true,
    'default aliases treat /use-cases/ as listing without WP listing_path()'
);
expect_same(
    fides_use_case_catalog_is_listing_request_path('/ecosystem-explorer/use-cases/update-use-case/'),
    false,
    'update form nested under listing must not count as listing'
);

$mixed = array(
    'trusted-service-assistant-IyxXZl',
    'samsung-sds-integrated-digital-wallet-b5dcHk',
    'end-to-end-digital-business-workflows-F665Dh',
    'altme-demo',
);

foreach ($mixed as $id) {
    expect_same(
        fides_use_case_catalog_sanitize_use_case_id($id),
        $id,
        "sanitize preserves mixed-case id: {$id}"
    );
    expect_same(
        fides_use_case_catalog_is_valid_use_case_id($id),
        true,
        "id is valid: {$id}"
    );
}

expect_same(fides_use_case_catalog_sanitize_use_case_id(''), '', 'empty id is rejected');
expect_same(fides_use_case_catalog_sanitize_use_case_id('../etc/passwd'), '', 'path traversal id is rejected');
expect_same(fides_use_case_catalog_sanitize_use_case_id('has space'), '', 'whitespace id is rejected');
expect_same(fides_use_case_catalog_sanitize_use_case_id('-leading-dash'), '', 'leading dash id is rejected');

$route = '#^/submissions/(?P<use_case_id>' . FIDES_USE_CASE_ID_ROUTE_PATTERN . ')$#';
foreach ($mixed as $id) {
    $matched = preg_match($route, '/submissions/' . $id, $m) === 1;
    expect_same($matched, true, "REST route accepts mixed-case id: {$id}");
    if ($matched) {
        expect_same($m['use_case_id'], $id, "REST capture preserves case: {$id}");
    }
}

$legacy_lowercase = '/^[a-z0-9][a-z0-9._-]*$/';
expect_same(
    preg_match($legacy_lowercase, 'trusted-service-assistant-IyxXZl') === 1,
    false,
    'legacy lowercase-only regex still rejects mixed case (documents the bug)'
);

expect_same(
    fides_use_case_catalog_youtube_video_id('https://youtu.be/wKQxV9O-k64?si=XYW3QStIIVqQ5FmJ'),
    'wKQxV9O-k64',
    'youtu.be id ignores share query'
);
expect_same(
    fides_use_case_catalog_youtube_video_id('https://www.youtube.com/watch?v=aCgyC9P3T0Q&t=7s'),
    'aCgyC9P3T0Q',
    'watch?v= id ignores timestamp'
);
expect_same(
    fides_use_case_catalog_youtube_video_id('https://youtube.com/shorts/j5EiM5PI3lA?si=INwcf5mSZn_F9W9f'),
    'j5EiM5PI3lA',
    'youtube shorts id'
);
expect_same(
    fides_use_case_catalog_youtube_video_id('https://www.youtube.com/embed/QiyfHuwZ4zU'),
    'QiyfHuwZ4zU',
    'youtube embed id'
);
expect_same(
    fides_use_case_catalog_youtube_video_id('https://vimeo.com/123456'),
    '',
    'vimeo url has no youtube id'
);

$honduras = array(
    'title' => 'Honduras: Billetera Electronica Nacional (BIEN)',
    'summary' => 'Honduras launched BIEN, a self-sovereign digital identity wallet.',
    'publishedAt' => '2026-08-18T17:17:36+01:00',
    'video' => array(
        'url' => 'https://youtu.be/wKQxV9O-k64?si=XYW3QStIIVqQ5FmJ',
        'provider' => 'youtube',
    ),
);
$video_ld = fides_use_case_catalog_video_object_for_jsonld($honduras);
expect_same(is_array($video_ld), true, 'complete youtube item emits VideoObject');
expect_same($video_ld['@type'] ?? '', 'VideoObject', 'VideoObject @type');
expect_same($video_ld['thumbnailUrl'] ?? '', 'https://i.ytimg.com/vi/wKQxV9O-k64/hqdefault.jpg', 'youtube thumbnailUrl');
expect_same($video_ld['embedUrl'] ?? '', 'https://www.youtube-nocookie.com/embed/wKQxV9O-k64', 'youtube embedUrl');
expect_same($video_ld['description'] ?? '', $honduras['summary'], 'VideoObject description from summary');
expect_same(isset($video_ld['uploadDate']) && $video_ld['uploadDate'] !== '', true, 'VideoObject uploadDate is set');

$no_thumb = array(
    'title' => 'No thumbnail host',
    'summary' => 'A hosted mp4 without a poster.',
    'publishedAt' => '2026-08-18T17:17:36+01:00',
    'video' => array('url' => 'https://example.com/demo.mp4'),
);
expect_same(
    fides_use_case_catalog_video_object_for_jsonld($no_thumb),
    null,
    'non-youtube without imageUrl omits VideoObject'
);

$fallback_image = $no_thumb;
$fallback_image['imageUrl'] = 'https://example.com/poster.jpg';
$fallback_ld = fides_use_case_catalog_video_object_for_jsonld($fallback_image);
expect_same(is_array($fallback_ld), true, 'non-youtube with imageUrl emits VideoObject');
expect_same($fallback_ld['thumbnailUrl'] ?? '', 'https://example.com/poster.jpg', 'imageUrl used as thumbnailUrl');
expect_same(isset($fallback_ld['embedUrl']), false, 'non-youtube has no embedUrl');

$no_date = $honduras;
unset($no_date['publishedAt']);
expect_same(
    fides_use_case_catalog_video_object_for_jsonld($no_date),
    null,
    'missing upload date omits VideoObject'
);

$from_videos = array(
    'title' => 'Videos array only',
    'summary' => 'Uses videos[0].',
    'updatedAt' => '2026-08-18T17:17:36+01:00',
    'videos' => array(
        array('url' => 'https://www.youtube.com/watch?v=6GwCxyofSVE', 'provider' => 'youtube'),
    ),
);
$videos_ld = fides_use_case_catalog_video_object_for_jsonld($from_videos);
expect_same($videos_ld['contentUrl'] ?? '', 'https://www.youtube.com/watch?v=6GwCxyofSVE', 'falls back to videos[0]');

echo "\n{$passes} passed, {$failures} failed\n";
exit($failures > 0 ? 1 : 0);
