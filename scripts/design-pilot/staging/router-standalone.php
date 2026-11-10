<?php
/**
 * Router for `php -S` in the standalone rehearsal: the document root is the web root of the domain and WordPress lives in
 * /design-review/ (home_url() = http://host/design-review). Everything outside that path is a 404, like a server that only
 * serves this one site below its domain.
 */
$root = rtrim((string) $_SERVER['DOCUMENT_ROOT'], '/');
$path = (string) parse_url((string) $_SERVER['REQUEST_URI'], PHP_URL_PATH);
$mount = '/design-review';

if ($path !== $mount && strpos($path, $mount . '/') !== 0) {
    http_response_code(404);
    echo 'Not found (the rehearsal serves only ' . $mount . '/).';
    return true;
}
$target = $root . $path;
if (is_file($target) && substr($target, -4) !== '.php') {
    return false; // static file
}
if (is_file($target) || (is_dir($target) && is_file(rtrim($target, '/') . '/index.php'))) {
    if (is_dir($target)) {
        $target = rtrim($target, '/') . '/index.php';
    }
    $_SERVER['SCRIPT_NAME']     = substr($target, strlen($root));
    $_SERVER['SCRIPT_FILENAME'] = $target;
    chdir(dirname($target));
    require $target;
    return true;
}
$_SERVER['SCRIPT_NAME']     = $mount . '/index.php';
$_SERVER['SCRIPT_FILENAME'] = $root . $mount . '/index.php';
// php -S derives PATH_INFO from the URL below the script. Apache and nginx do not for pretty permalinks, and WordPress
// would then use it instead of the request path: it does not strip the TranslatePress language segment (/design-review/nl/...)
// from PATH_INFO, so every /nl/ page was a 404 in the rehearsal only.
unset($_SERVER['PATH_INFO']);
$_SERVER['PHP_SELF'] = $mount . '/index.php';
chdir($root . $mount);
require $root . $mount . '/index.php';
