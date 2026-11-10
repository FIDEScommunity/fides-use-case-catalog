<?php
/**
 * Collect the awards images for the staging package WITHOUT network access.
 *
 * The images were imported into the local pilot's media library earlier (attachment meta _fides_awards_source = the source
 * URL of the manifest). This script copies each attachment file into a cache directory outside git and records
 * file name, byte size and SHA-256 in awards/manifest.json and awards/community-manifest.json (those fields are committed,
 * the image files are not). build-package.py copies the cache into seed/awards/images/ and verifies every checksum.
 *
 * Run on the local pilot (pilot_wp):
 *   pilot_wp eval-file scripts/design-pilot/staging/collect-awards-images.php
 * Environment: AWARDS_IMAGES_DIR  target directory (default <pilot root>/local-data/awards-images)
 *
 * Read-only for the database. Idempotent: re-running rewrites the same files and fields.
 */

if (! defined('ABSPATH')) {
    exit(1);
}

$awards_dir = dirname(__DIR__) . '/awards';
$target     = getenv('AWARDS_IMAGES_DIR') ?: dirname(__DIR__, 4) . '/local-data/awards-images';
if (! is_dir($target) && ! mkdir($target, 0755, true)) {
    fwrite(STDERR, "Cannot create {$target}\n");
    exit(1);
}

$missing = 0;
$total   = 0;
foreach (array('manifest.json', 'community-manifest.json') as $name) {
    $path     = $awards_dir . '/' . $name;
    $manifest = json_decode((string) file_get_contents($path), true);
    if (! is_array($manifest) || empty($manifest['images'])) {
        fwrite(STDERR, "Cannot read {$path}\n");
        exit(1);
    }
    foreach ($manifest['images'] as $i => $image) {
        $found = get_posts(array('post_type' => 'attachment', 'post_status' => 'inherit', 'numberposts' => 1, 'fields' => 'ids', 'meta_key' => '_fides_awards_source', 'meta_value' => $image['source']));
        $file  = $found ? get_attached_file((int) $found[0]) : '';
        if (! $file || ! is_file($file)) {
            fwrite(STDERR, "missing in the media library: {$image['key']} ({$image['source']})\n");
            ++$missing;
            continue;
        }
        $ext  = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $leaf = $image['key'] . '.' . $ext;
        if (! copy($file, $target . '/' . $leaf)) {
            fwrite(STDERR, "cannot copy {$file}\n");
            exit(1);
        }
        $manifest['images'][ $i ]['file']   = $leaf;
        $manifest['images'][ $i ]['bytes']  = filesize($target . '/' . $leaf);
        $manifest['images'][ $i ]['sha256'] = hash_file('sha256', $target . '/' . $leaf);
        ++$total;
    }
    $manifest['note'] = 'Images of ' . ($name === 'manifest.json' ? 'https://fides.community/awards/global-digital-trust-awards/' : 'https://fides.community/awards/fides-community-awards/')
        . '. The package ships each file in seed/awards/images/ (file, bytes, sha256 below); the seed imports it from there into the media library (no network) and replaces {{aw:id:KEY}} / {{aw:url:KEY[:size]}} in the page content. "source" is the original URL, kept as provenance and as the idempotency marker of an imported attachment.';
    $json = (string) wp_json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $json = preg_replace_callback('/^( {4})+/m', static function ($m) { return str_repeat(' ', intdiv(strlen($m[0]), 4)); }, $json); // keep the one-space indent of the manifests
    file_put_contents($path, $json . "\n");
}
echo "collected {$total} images into {$target}" . ($missing ? ", {$missing} missing" : '') . "\n";
exit($missing > 0 ? 1 : 0);
