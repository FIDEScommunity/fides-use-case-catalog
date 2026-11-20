<?php
/**
 * Copy Learn seed images into the uploads directory.
 * A dry-run returns before any directory or file is created.
 */
function learn_install_media(string $src, string $dest, bool $dry): void {
    if ($dry || ! is_dir($src)) {
        return;
    }
    if (! is_dir($dest) && ! wp_mkdir_p($dest)) {
        fwrite(STDERR, "Could not create {$dest}\n");
        exit(1);
    }
    foreach (glob($src . '/*.{jpg,jpeg,png,webp}', GLOB_BRACE) ?: array() as $media_file) {
        if (! is_file($media_file)) {
            continue;
        }
        if (! copy($media_file, $dest . '/' . basename($media_file))) {
            fwrite(STDERR, "Could not copy {$media_file}\n");
            exit(1);
        }
    }
}
