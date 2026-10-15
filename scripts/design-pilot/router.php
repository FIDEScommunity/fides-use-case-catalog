<?php
/**
 * Router for `php -S` so WordPress pretty permalinks work on the pilot site.
 */
$root = rtrim((string) $_SERVER['DOCUMENT_ROOT'], '/');
$path = (string) parse_url((string) $_SERVER['REQUEST_URI'], PHP_URL_PATH);
$target = $root . $path;

if ($path !== '/' && (is_file($target) || (is_dir($target) && is_file(rtrim($target, '/') . '/index.php')))) {
    return false;
}

$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = $root . '/index.php';
require $root . '/index.php';
