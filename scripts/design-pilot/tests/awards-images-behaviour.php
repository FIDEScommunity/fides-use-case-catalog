<?php
/**
 * Behaviour test: the awards pages use bundled images from the media library, and the outgoing guard is unchanged.
 * Runs inside the standalone rehearsal site (staging config mu-plugin active) after `seed.sh apply`:
 *   scripts/design-pilot/tests/run-awards-images-checks.sh
 *
 * Checks: every manifest image is an attachment with its file on disk and the manifest marker, both awards pages exist and
 * reference only this site's uploads (no image src on another host, in particular not fides.community), outgoing write
 * requests to GitHub / the production site and mail are still blocked, and the shell links to the live site stay absolute.
 * Reads the database only; the HTTP checks never leave the machine (the guard answers before a request is made).
 */

if (! defined('ABSPATH')) {
    exit(1);
}

$results = array('pass' => 0, 'fail' => array());
$check   = static function (bool $ok, string $message) use (&$results): void {
    if ($ok) {
        $results['pass']++;
    } else {
        $results['fail'][] = $message;
    }
};

$dir   = dirname(__DIR__) . '/awards';
$sums  = array();
$total = 0;
foreach (array('manifest.json' => 'global-digital-trust-awards', 'community-manifest.json' => 'fides-community-awards') as $manifest_file => $slug) {
    $manifest = json_decode((string) file_get_contents($dir . '/' . $manifest_file), true);
    $check(is_array($manifest) && ! empty($manifest['images']), "{$manifest_file} is readable");
    foreach ($manifest['images'] as $image) {
        ++$total;
        $check(! empty($image['file']) && ! empty($image['sha256']) && ! empty($image['bytes']), "{$image['key']}: manifest carries file, bytes and sha256");
        $found = get_posts(array('post_type' => 'attachment', 'post_status' => 'inherit', 'numberposts' => 1, 'fields' => 'ids', 'meta_key' => '_fides_awards_source', 'meta_value' => $image['source']));
        $check(! empty($found), "{$image['key']}: imported as an attachment");
        if ($found) {
            $file = get_attached_file((int) $found[0]);
            $check($file && is_file($file), "{$image['key']}: the file exists on disk");
            if ($file && is_file($file) && ! empty($image['sha256'])) {
                // WordPress may store a scaled copy of very large uploads; only the unscaled case compares byte for byte.
                $same = hash_file('sha256', $file) === $image['sha256'];
                $check($same || strpos(basename($file), '-scaled.') !== false, "{$image['key']}: stored file equals the bundled file");
            }
            $check(get_post_meta((int) $found[0], '_wp_attachment_image_alt', true) === $image['alt'], "{$image['key']}: alt text is the manifest alt");
        }
    }
    $page = get_page_by_path($slug);
    $check($page instanceof WP_Post && $page->post_status === 'publish', "{$slug}: page exists and is published");
    if ($page instanceof WP_Post) {
        preg_match_all('/<img\b[^>]*\ssrc="([^"]+)"/i', $page->post_content, $m);
        $check(count($m[1]) > 0, "{$slug}: page content has images (" . count($m[1]) . ')');
        $uploads = wp_get_upload_dir()['baseurl'];
        $foreign = array_filter($m[1], static function ($src) use ($uploads) {
            return strpos($src, $uploads . '/') !== 0 && strpos($src, wp_parse_url($uploads, PHP_URL_PATH) . '/') !== 0;
        });
        $check(! $foreign, "{$slug}: every image src is a file of this site's uploads" . ($foreign ? ' (' . implode(', ', array_slice($foreign, 0, 2)) . ')' : ''));
        $check(strpos($page->post_content, '{{aw:') === false, "{$slug}: no unresolved {{aw:...}} token");
        $check(strpos($page->post_content, 'fides.community/app/uploads') === false, "{$slug}: no image points at fides.community");
        $check(preg_match('~/design-review/(?:nl/)?design-review/~', $page->post_content) !== 1, "{$slug}: no doubled path in the content");
    }
}
$check($total > 100, "manifests list {$total} images");

// The outgoing guard is unchanged: writes to GitHub / the production site and mail stay blocked.
$github = wp_remote_post('https://api.github.com/repos/x/y/pulls', array('body' => '{}'));
$check(is_wp_error($github) && $github->get_error_code() === 'fides_design_review_blocked', 'POST to GitHub is blocked');
$live = wp_remote_post('https://fides.community/wp-json/x', array('body' => '{}'));
$check(is_wp_error($live) && $live->get_error_code() === 'fides_design_review_blocked', 'POST to the production site is blocked');
$put = wp_remote_request('https://fides.community/wp-json/x', array('method' => 'PUT', 'body' => '{}'));
$check(is_wp_error($put) && $put->get_error_code() === 'fides_design_review_blocked', 'PUT to the production site is blocked');
$del = wp_remote_request('https://api.github.com/repos/x/y', array('method' => 'DELETE'));
$check(is_wp_error($del) && $del->get_error_code() === 'fides_design_review_blocked', 'DELETE to GitHub is blocked');
$check(wp_mail('someone@example.org', 'x', 'y') === false, 'wp_mail sends nothing');

// Seeding never uses the network: the download path is opt-in and off.
$check(getenv('PILOT_AWARDS_ALLOW_DOWNLOAD') !== '1', 'PILOT_AWARDS_ALLOW_DOWNLOAD is not set');

// The live-site links of the shell are not rewritten by the pilot mapping.
$check(Fides_DS_Site_Shell::url('/community-tools/interop-profiles/') === rtrim(fides_design_review_live_origin(), '/') . '/community-tools/interop-profiles/', 'a shell link without a page here stays an absolute live-site URL');

echo 'awards-images-behaviour: ' . $results['pass'] . ' passed, ' . count($results['fail']) . " failed\n";
foreach ($results['fail'] as $message) {
    echo ' - FAIL: ' . $message . "\n";
}
exit(count($results['fail']) > 0 ? 1 : 0);
