<?php
/**
 * Behaviour tests for the shared site shell (tiles) as used by the pilot:
 * template scoping, navigation URL mapping, header/footer markup and the
 * overview contribute band. Runs inside the pilot WordPress; read-only.
 *
 * Run: scripts/design-pilot/run-tests.sh
 */

if (! defined('ABSPATH')) {
    exit(1);
}

$results = array('pass' => 0, 'fail' => array());

$check = static function (bool $ok, string $message) use (&$results): void {
    if ($ok) {
        $results['pass']++;
    } else {
        $results['fail'][] = $message;
    }
};

$query_page = static function (int $page_id): void {
    $GLOBALS['wp_query']     = new WP_Query(array('page_id' => $page_id));
    $GLOBALS['wp_the_query'] = $GLOBALS['wp_query'];
};

$shell_template = 'templates/site-shell.php';

// Template scoping: only the three pilot pages use the shell.
$check(isset(apply_filters('theme_page_templates', array())[Fides_DS_Site_Shell::TEMPLATE]), 'shell template is offered as a page template');
$pilot_pages = array('fides-design-pilot/overview', 'fides-design-pilot/use-case', 'fides-design-pilot/homepage-fragment');
foreach ($pilot_pages as $path) {
    $page = get_page_by_path($path);
    $check($page instanceof WP_Post, "pilot page {$path} exists");
    if (! $page instanceof WP_Post) {
        continue;
    }
    $query_page($page->ID);
    $template = apply_filters('template_include', 'theme-page.php');
    $check(substr($template, -strlen($shell_template)) === $shell_template, "{$path} renders in the site shell");
    $check(in_array('fides-ds-shell-body', apply_filters('body_class', array()), true), "{$path} gets the shell body class");
}
$untouched = array_filter(array(
    'homepage'           => (int) get_option('page_on_front'),
    'pilot parent'       => ($parent = get_page_by_path('fides-design-pilot')) ? $parent->ID : 0,
    'use-case listing'   => ($listing = get_page_by_path('use-cases')) ? $listing->ID : 0,
));
foreach ($untouched as $label => $page_id) {
    $query_page($page_id);
    $check(apply_filters('template_include', 'theme-page.php') === 'theme-page.php', "{$label} keeps the theme template");
    $check(! in_array('fides-ds-shell-body', apply_filters('body_class', array()), true), "{$label} gets no shell body class");
}
$check(isset($untouched['homepage']), 'homepage was checked');
wp_reset_query();

// Header markup.
$header = Fides_DS_Site_Shell::render_header();
foreach (array('Explore', 'Updates', 'Community', 'Tools &amp; API', 'Plans', 'About FIDES', 'Sign in', 'Search', 'Menu') as $label) {
    $check(strpos($header, '>' . $label) !== false, "header shows {$label}");
}
$check(strpos($header, '<nav class="fides-ds-site-nav" aria-label="Main">') !== false || preg_match('#<nav[^>]*aria-label="Main"#', $header) === 1, 'main navigation is labelled');
preg_match_all('#\sid="([^"]+)"#', $header, $ids);
$check(count($ids[1]) === count(array_unique($ids[1])), 'header ids are unique');
preg_match_all('#aria-controls="([^"]+)"#', $header, $controls);
$missing_targets = array_diff(array_unique($controls[1]), $ids[1]);
$check($controls[1] !== array() && $missing_targets === array(), 'every toggle controls an element in the header: ' . implode(', ', $missing_targets));
$check(preg_match('#<div[^>]*id="fides-ds-menu"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*hidden#', $header) === 1, 'mobile menu is a hidden modal dialog');
$check(preg_match('#class="fides-ds-site-nav__panel"[^>]*hidden#', $header) === 1, 'dropdown panels start hidden');
$check(strpos($header, 'href="' . esc_url(home_url('/fides-design-pilot/overview/')) . '"') !== false, 'Use cases maps to the pilot overview');
$check(strpos($header, 'href="https://fides.community/plans/"') !== false, 'destination without a local page links to fides.community');
$check(strpos($header, 'placeholder="Search FIDES"') !== false && strpos($header, 'name="s"') !== false, 'search uses the WordPress search with a labelled field');
$check(strpos($header, 'fides-ds-site-nav__panel-text') === false, 'panel links carry no descriptions');
preg_match('#id="fides-ds-panel-explore".*?</div></div></div>#s', $header, $explore_panel);
$explore_panel = $explore_panel[0] ?? '';
preg_match_all('#fides-ds-site-nav__group-label"[^>]*>([^<]+)<#', $explore_panel, $explore_groups);
$check($explore_groups[1] === array('Discover', 'Browse catalogs'), 'Explore has the groups Discover and Browse catalogs: ' . implode(', ', $explore_groups[1]));
$check(preg_match('#>Discover</p>(?:(?!group-label).)*>Glossary\s*<#s', $explore_panel) === 1, 'Glossary is listed under Discover');
$check(strpos($explore_panel, 'Learn &amp; connect') === false, 'Learn & connect is not shown yet');
$brand_url = Fides_DS_Site_Shell::url('/');
$check($brand_url !== '' && strpos($header, 'class="fides-ds-site-header__brand" href="' . esc_url($brand_url) . '"') !== false, 'logo links to the mapped homepage');
$check(preg_match('#class="fides-ds-site-header__brand" href="[^"]*/fides-design-pilot/homepage-fragment/"#', $header) === 1, 'logo links to the pilot homepage fragment in the pilot');

// Dropped destinations disappear, including emptied groups.
$drop = static function ($url, $path) {
    return in_array($path, array('/about-fides/news/', '/awards/global-digital-trust-awards/', '/awards/fides-community-awards/'), true) ? '' : $url;
};
add_filter('fides_site_shell_url', $drop, PHP_INT_MAX, 2);
$header_dropped = Fides_DS_Site_Shell::render_header();
$footer_dropped = Fides_DS_Site_Shell::render_footer();
remove_filter('fides_site_shell_url', $drop, PHP_INT_MAX);
$check(strpos($header_dropped, '>Updates<') === false, 'link with an empty URL is left out of the header');
$check(strpos($header, '>Awards</p>') !== false && strpos($header_dropped, '>Awards</p>') === false, 'group without links is left out');
$check(strpos($footer_dropped, '>News<') === false, 'link with an empty URL is left out of the footer');
$check(strpos($header_dropped, '>Plans<') !== false, 'other links stay when one is dropped');

// Account link.
$admins = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ID'));
if ($admins) {
    wp_set_current_user((int) $admins[0]);
    $signed_in = Fides_DS_Site_Shell::render_header();
    wp_set_current_user(0);
    $check(strpos($signed_in, '>Account<') !== false && strpos($signed_in, '>Sign in<') === false, 'signed-in visitor sees Account instead of Sign in');
    $check(strpos($signed_in, 'data-fides-ds-sign-in') === false, 'Account link is not rewritten as a sign-in route');
}
$check(preg_match_all('#<a [^>]*data-fides-ds-sign-in[^>]*>Sign in</a>#', $header) === 2, 'header and menu Sign in links refresh their return URL on use');
$check(strpos(Fides_DS_Site_Shell::sign_in_url(), 'return_to=') !== false || strpos(Fides_DS_Site_Shell::sign_in_url(), 'redirect_to=') !== false, 'Sign in returns the visitor to the current page');

// Footer markup.
$footer = Fides_DS_Site_Shell::render_footer();
$check(strpos($footer, 'FIDES Labs · Utrecht') !== false, 'footer shows FIDES Labs · Utrecht');
foreach (array('Terms', 'Privacy', 'Contact', 'About FIDES', 'Manifesto', 'News') as $label) {
    $check(strpos($footer, '>' . $label . '<') !== false, "footer links to {$label}");
}

// Contribute band on the overview.
$band = Fides_Use_Case_Design::contribute_band_html('http://localhost/add/');
$check(strpos($band, 'aria-labelledby="fides-uc-contribute-title"') !== false && strpos($band, 'id="fides-uc-contribute-title"') !== false, 'contribute band is a labelled section');
$check(strpos($band, 'Add or update<br>a listing.') !== false, 'contribute band title');
$check(strpos($band, 'href="http://localhost/add/"') !== false && strpos($band, 'Add a use case') !== false, 'contribute band links to the submission form');
$check(strpos(Fides_Use_Case_Design::contribute_band_html(''), 'fides-ds-button') === false, 'contribute band without a form URL has no button');
$overview = get_page_by_path('fides-design-pilot/overview');
if ($overview instanceof WP_Post) {
    $check(strpos(apply_filters('the_content', $overview->post_content), 'fides-uc-contribute') !== false, 'pilot overview renders the contribute band');
}

foreach ($results['fail'] as $message) {
    echo "not ok - {$message}\n";
}
printf("# pass %d\n# fail %d\n", $results['pass'], count($results['fail']));
if ($results['fail']) {
    exit(1);
}
