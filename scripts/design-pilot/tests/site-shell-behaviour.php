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
foreach (array('Learn', 'Explore', 'Updates', 'Ecosystem', 'Tools &amp; API', 'About FIDES', 'Contact', 'Search', 'Sign in', 'Menu') as $label) {
    $check(strpos($header, '>' . $label) !== false, "header shows {$label}");
}
// Main items: Learn, Explore, Updates, Ecosystem, Tools & API, About FIDES (a dropdown that also holds Services); Contact, Search and Sign in on the right.
preg_match('#<nav[^>]*aria-label="Main">(.*?)</nav>#s', $header, $main_nav);
preg_match_all('#fides-ds-site-nav__(?:link|toggle)"[^>]*>([^<]+)#', $main_nav[1] ?? '', $main_labels);
$check(array_map('html_entity_decode', $main_labels[1]) === array('Learn', 'Explore', 'Updates', 'Ecosystem', 'Tools & API', 'About FIDES'), 'main items: Services is not a main item, About FIDES is a dropdown: ' . implode(' | ', $main_labels[1]));
$check(strpos($header, '>Community<') === false && strpos($header, '/fides-design-pilot/services/') !== false, 'no Community item; Services links to the pilot Services page');
preg_match('#id="fides-ds-panel-about".*?</div></div></div>#s', $header, $about_panel);
$check(isset($about_panel[0]) && strpos($about_panel[0], '>About FIDES') !== false && strpos($about_panel[0], '>Manifesto') !== false && strpos($about_panel[0], '/fides-design-pilot/services/') !== false && strpos($about_panel[0], 'Services') !== false, 'About FIDES panel holds About FIDES, Manifesto and Services');
$check(preg_match('#fides-ds-site-nav__link"[^>]*>Services#', $header) === 0, 'Services is not a main navigation link');
$check(strpos($header, 'aria-controls="fides-ds-panel-about"') !== false && preg_match('#aria-current="true" aria-controls="fides-ds-panel-about"#', $header) === 0, 'About FIDES toggle is not marked current outside its pages');
$check(strpos($header, '>Plans<') !== false && preg_match('#class="fides-ds-site-nav__link"[^>]*>Plans#', $header) === 0, 'Plans lives under Ecosystem > Contribute, not in the main items');
$check(strpos($header, 'Intermediaries') === false && strpos($header, 'Trust schemes') === false && strpos($header, 'Get help choosing') === false && strpos($header, 'Ask FIDES') === false && strpos($header, 'Interop Testbed') === false, 'links to pages that do not exist yet are not shown');
// The language switcher is a div inside the actions, so the block ends at the search panel, not at the first </div>.
preg_match('#fides-ds-site-header__actions">(.*?)</div></div><div class="fides-ds-site-search-panel"#s', $header, $actions);
preg_match_all('#>(Contact|Search|Sign in|Menu)<#', $actions[1] ?? '', $action_labels);
$check($action_labels[1] === array('Contact', 'Search', 'Sign in', 'Menu'), 'header actions: Contact, Search, Sign in: ' . implode(' | ', $action_labels[1]));
preg_match('#id="fides-ds-panel-ecosystem".*?</div></div></div>#s', $header, $eco_panel);
preg_match_all('#fides-ds-site-nav__group-label"[^>]*>([^<]+)<#', $eco_panel[0] ?? '', $eco_groups);
$check($eco_groups[1] === array('Meet & participate', 'Awards', 'Contribute') || array_map('html_entity_decode', $eco_groups[1]) === array('Meet & participate', 'Awards', 'Contribute'), 'Ecosystem groups follow Paper: ' . implode(' | ', $eco_groups[1]));
preg_match('#id="fides-ds-panel-tools".*?</div></div></div>#s', $header, $tools_panel);
preg_match_all('#fides-ds-site-nav__group-label"[^>]*>([^<]+)<#', $tools_panel[0] ?? '', $tools_groups);
$check(array_map('html_entity_decode', $tools_groups[1]) === array('Ask & learn', 'Data & integration', 'Build & test'), 'Tools & API groups follow Paper: ' . implode(' | ', $tools_groups[1]));
$check(preg_match('#<p class="fides-ds-menu__title">FIDES menu</p>.*?fides-ds-menu__section--lead.*?>Learn<.*?>Explore</p>#s', $header) === 1, 'mobile menu: title FIDES menu, then Learn, then the Explore section');
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
$check(array_map('html_entity_decode', $explore_groups[1]) === array('Discover', 'Learn & connect', 'Browse catalogs'), 'Explore has the groups Discover, Learn & connect and Browse catalogs: ' . implode(', ', $explore_groups[1]));
$check(preg_match('#>Learn &amp; connect</p>(?:(?!group-label).)*>Topics &amp; guides\s*<(?:(?!group-label).)*>Glossary\s*<#s', $explore_panel) === 1, 'Learn & connect lists Topics & guides and Glossary');
$check(preg_match('#class="fides-ds-site-nav__link" href="[^"]*/fides-design-pilot/learn/"#', $header) === 1, 'Learn is a primary item that maps to the pilot Learn root');
$check(strpos($header, 'href="' . esc_url(home_url('/fides-design-pilot/start/')) . '"') !== false, 'Find your starting point maps to the pilot starting point page');
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
$check(strpos($header_dropped, '>Plans') !== false, 'other links stay when one is dropped');
// A site that maps the proposed Services page gets it inside the About FIDES panel, never as a main item; an unmapped site has no Services link.
$map_services = static function ($url, $path) { return $path === '/services/' ? home_url('/fides-design-pilot/learn/sessions/') : $url; };
add_filter('fides_site_shell_url', $map_services, PHP_INT_MAX, 2);
$header_services = Fides_DS_Site_Shell::render_header();
remove_filter('fides_site_shell_url', $map_services, PHP_INT_MAX);
preg_match_all('#fides-ds-site-nav__(?:link|toggle)"[^>]*>([^<]+)#', $header_services, $svc_labels);
$check(array_slice($svc_labels[1], 0, 3) === array('Learn', 'Explore', 'Updates'), 'a mapped Services page is not a main item: ' . implode(' | ', $svc_labels[1]));
$check(preg_match('#id="fides-ds-panel-about".*?>Services#s', $header_services) === 1, 'a mapped Services page appears in the About FIDES panel');
$unmap_services = static function ($url, $path) { return $path === '/services/' ? '' : $url; };
add_filter('fides_site_shell_url', $unmap_services, PHP_INT_MAX, 2);
$header_no_services = Fides_DS_Site_Shell::render_header();
remove_filter('fides_site_shell_url', $unmap_services, PHP_INT_MAX);
$check(strpos($header_no_services, '>Services') === false && strpos($header_no_services, 'id="fides-ds-panel-about"') !== false && strpos($header_no_services, '>Manifesto') !== false, 'an unmapped Services page leaves About FIDES with About and Manifesto');

// A site that does not map the proposed routes shows no Learn item and keeps the Explorer entry.
$unmapped = static function ($url, $path) {
    return in_array($path, array('/learn/', '/learn/topics/', '/ecosystem-explorer/start/'), true) ? '' : $url;
};
add_filter('fides_site_shell_url', $unmapped, PHP_INT_MAX, 2);
$header_unmapped = Fides_DS_Site_Shell::render_header();
remove_filter('fides_site_shell_url', $unmapped, PHP_INT_MAX);
$check(strpos($header_unmapped, '>Learn<') === false && strpos($header_unmapped, 'Topics &amp; guides') === false, 'proposed Learn links are left out when the site maps nothing');
$check(strpos($header_unmapped, 'Find your starting point') !== false && strpos($header_unmapped, '/fides-design-pilot/start/') === false, 'starting point falls back to the Explorer entry');

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
$check(strpos($band, 'Catalog data is available on GitHub') !== false && strpos($band, 'Contribute via GitHub') === false, 'GitHub is named as data source, not as a contribution route');
if (class_exists('Fides_Organization_Design')) {
    $org_band = Fides_Organization_Design::contribute_band_html('http://localhost/org-add/', 'http://localhost/org-update/');
    $check(strpos($org_band, 'Add or update<br>a listing.') !== false && strpos($org_band, 'Help keep the ecosystem visible and useful.') !== false, 'organization band shares the use-case hierarchy');
    $check(preg_match('~class="fides-ds-button" href="http://localhost/org-add/"><span>Add organization</span>~', $org_band) === 1 && strpos($org_band, 'class="fides-uc-contribute__link" href="http://localhost/org-update/"><span>Update organization</span>') !== false, 'organization band: Add as button, Update as text link');
    $check(strpos($org_band, 'Use the FIDES forms to submit an organization or request an update. A FIDES account is required. Submissions are reviewed before publication.') !== false, 'organization band explanation');
    $check(strpos($org_band, 'Catalog data is available on GitHub') !== false && strpos($org_band, 'Contribute via GitHub') === false && strpos($org_band, 'mailto:catalog@fides.community') !== false, 'organization band: GitHub as data source, contact kept');
    $check(strpos($org_band, 'does not guarantee completeness') !== false, 'organization band keeps the disclaimer');
}
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
