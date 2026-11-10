<?php
/**
 * Behaviour tests for the Services section (overview, readiness assessment, enquiry):
 * rendering from editor fields, link resolution and edit + re-render + restore.
 * The pages are edited temporarily and restored exactly. Run: scripts/design-pilot/run-tests.sh
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

$root       = get_page_by_path('fides-design-pilot/services', OBJECT, 'page');
$assessment = get_page_by_path('fides-design-pilot/services/wallet-readiness-assessment', OBJECT, 'page');
$enquiry    = get_page_by_path('fides-design-pilot/services/enquiry', OBJECT, 'page');
$check($root instanceof WP_Post && $assessment instanceof WP_Post && $enquiry instanceof WP_Post, 'the three Services pages are seeded (run create-learn-pages.sh)');
if (! ($root instanceof WP_Post && $assessment instanceof WP_Post && $enquiry instanceof WP_Post)) {
    echo 'FAIL: ' . implode('; ', $results['fail']) . "\n";
    exit(1);
}
$meta = static function (int $id, string $field): string {
    return (string) get_post_meta($id, '_fides_learn_' . $field, true);
};
$set = static function (int $id, string $field, string $value): void {
    update_post_meta($id, '_fides_learn_' . $field, wp_slash($value));
};

// Overview: four services, in order, from the "services" field; no prices; training link kept.
$html  = Fides_DS_Learn::render_page($root->ID);
$rows  = Fides_DS_Learn::services($root->ID);
$check(array_column($rows, 'title') === array('Wallet readiness assessment', 'Use case and business case', 'Independent advice and selection', 'Project and ecosystem coordination'), 'four services in the agreed order');
$check(substr_count($html, 'fides-ds-card--row') === 4, 'one shared row card per service');
$check(strpos($html, 'fides-learn__bar') === false && strpos($html, 'data-fides-learn-bar') === false, 'Services has no Learn bar');
$check(! preg_match('/€|\bprice\b|\bfee\b|per day|excluding VAT/i', wp_strip_all_tags($html)), 'no prices or price indications on the overview');
$check(strpos($html, '/learn/sessions/') !== false, 'the training and workshops overview stays linked');
$check(strpos($html, 'wallet-readiness-assessment/') !== false, 'the assessment is linked');
$contact = Fides_DS_Site_Shell::url('/about-fides/contact/');
$check($contact !== '' && substr_count($html, 'href="' . esc_url($contact) . '"') >= 4, 'other services and the hero action use the site Contact page');
$check(strpos($html, 'Design preview') === false && strpos($html, 'not built yet') === false, 'no design notes');

// A site that drops Contact: no dead link, rows stay readable as text.
$drop = static function ($url, $path) {
    return $path === '/about-fides/contact/' ? '' : $url;
};
add_filter('fides_site_shell_url', $drop, PHP_INT_MAX, 2);
$dropped = Fides_DS_Learn::render_page($root->ID);
remove_filter('fides_site_shell_url', $drop, PHP_INT_MAX);
$check(strpos($dropped, 'Use case and business case') !== false && strpos($dropped, 'href="">') === false && strpos($dropped, 'about-fides/contact') === false, 'without a Contact page the rows keep their text and no empty link is rendered');
$check(substr_count($dropped, 'fides-ds-card__arrow') === 1, 'only the assessment row keeps an arrow without Contact');

// Edit and re-render: add a service, change the intro action, then restore exactly.
$original = array('services' => $meta($root->ID, 'services'), 'actions' => $meta($root->ID, 'actions'), 'cta_title' => $meta($root->ID, 'cta_title'));
$set($root->ID, 'services', $original['services'] . "\nTest service | A temporary line. | Ask about it | contact");
$set($root->ID, 'actions', 'Talk to us | contact | primary');
$set($root->ID, 'cta_title', 'Temporary band title');
$edited = Fides_DS_Learn::render_page($root->ID);
$check(strpos($edited, 'Test service') !== false && substr_count($edited, 'fides-ds-card--row') === 5, 'an added service line shows up');
$check(strpos($edited, '>Talk to us') !== false && strpos($edited, 'Temporary band title') !== false, 'edited hero action and band title show up');
foreach ($original as $field => $value) {
    $set($root->ID, $field, $value);
}
$check(Fides_DS_Learn::render_page($root->ID) === $html, 'restoring the fields gives the original page back');

// Assessment: details box, More block split, actions and closing block come from fields and content.
$a = Fides_DS_Learn::render_page($assessment->ID);
$check(substr_count($a, '<h1>') === 1 && strpos($a, 'Prepare your service for digital wallets.') !== false, 'assessment has one H1 from the headline field');
$check(strpos($a, 'FIDES SERVICES · READINESS') !== false, 'assessment shows its eyebrow');
$check(preg_match_all('~<div><dt>[^<]+</dt><dd>~', $a) === 5, 'assessment details box has five rows');
$check(strpos($a, 'fides-learn-offering__lower') !== false && strpos($a, 'How it works') > strpos($a, 'fides-learn-details'), 'content after the More block runs below the details box');
$check(! preg_match('/€|\bprice\b|\bfee\b|\bweeks?\b|\bdays?\b|written report|final report|roadmap/i', wp_strip_all_tags($a)), 'no price, fixed duration or specific deliverable promise on the assessment page');
$check(strpos($a, '/services/enquiry/?offering=wallet-readiness-assessment') !== false, 'primary action opens the enquiry with the assessment context');
$check(strpos($a, '/learn/sessions/wallet-readiness-workshop/') !== false && strpos($a, '/overview/') !== false, 'assessment links to the workshop page and the use case overview');
$check(strpos($a, 'class="fides-learn__back"') === false, 'no duplicate back link beside the breadcrumb');
$trail = Fides_DS_Learn::breadcrumb($assessment->ID);
$check(array_column($trail, 'label') === array('Home', 'Services', 'Wallet readiness assessment'), 'breadcrumb is Home / Services / assessment: ' . implode(' / ', array_column($trail, 'label')));

$orig_details = $meta($assessment->ID, 'details');
$check(strpos($a, '<dt>Availability</dt><dd>Primarily available in the Netherlands. Contact us to discuss your requirements and location.</dd>') !== false, 'assessment shows the availability line from the details field');
$check(strpos($a, '€') === false, 'assessment shows no price');
$orig_content = (string) $assessment->post_content;
$set($assessment->ID, 'details', preg_replace('~^Availability \\|.*$~m', 'Availability | Temporary availability text', $orig_details) . "\nExtra row | Temporary value");
wp_update_post(array('ID' => $assessment->ID, 'post_content' => wp_slash(str_replace('What we look at', 'What we look at today', $orig_content))));
$a2 = Fides_DS_Learn::render_page($assessment->ID);
$check(strpos($a2, 'Temporary value') !== false && strpos($a2, 'Temporary availability text') !== false && strpos($a2, 'Primarily available') === false && strpos($a2, 'What we look at today') !== false, 'edited details and body show up after re-render');
$set($assessment->ID, 'details', $orig_details);
wp_update_post(array('ID' => $assessment->ID, 'post_content' => wp_slash($orig_content)));
$check(Fides_DS_Learn::render_page($assessment->ID) === $a, 'restoring details and content gives the original assessment page back');

// Editor: the four services are named inputs (title, description, action label, destination) with validation.
$admins = get_users(array('role' => 'administrator', 'number' => 1));
$check(! empty($admins), 'an administrator exists for the editor checks');
if ($admins) {
    wp_set_current_user($admins[0]->ID);
}
$valid = Fides_DS_Learn::validate_services(array(
    array('title' => 'One', 'text' => 'Text one.', 'label' => 'Ask', 'url' => 'contact'),
    array('title' => '', 'text' => '', 'label' => '', 'url' => ''),
    array('title' => 'Two', 'text' => '', 'label' => 'Open', 'url' => '/services/wallet-readiness-assessment/'),
    array('title' => 'Three', 'text' => 'x', 'label' => 'Go', 'url' => 'https://example.org/a?b=1'),
));
$check($valid['errors'] === array() && substr_count($valid['value'], "\n") === 2, 'valid input is accepted and empty groups are skipped');
$bad = Fides_DS_Learn::validate_services(array(
    array('title' => '', 'text' => 'No title', 'label' => 'Ask', 'url' => 'contact'),
    array('title' => 'No URL', 'text' => '', 'label' => 'Ask', 'url' => ''),
    array('title' => 'Typo', 'text' => '', 'label' => 'Ask', 'url' => 'conact'),
    array('title' => 'Unsafe', 'text' => '', 'label' => 'Ask', 'url' => 'javascript:alert(1)'),
    array('title' => 'Data', 'text' => '', 'label' => 'Ask', 'url' => 'data:text/html;base64,AAAA'),
    array('title' => 'Protocol relative', 'text' => '', 'label' => 'Ask', 'url' => '//evil.example/x'),
    array('title' => 'No label', 'text' => '', 'label' => '', 'url' => 'contact'),
    array('title' => 'Pipe | here', 'text' => '', 'label' => 'Ask', 'url' => 'contact'),
));
$check(count($bad['errors']) === 8, 'every invalid service is reported once (title, URL, keyword, javascript, data, //, label, pipe): ' . implode(' / ', $bad['errors']));
// Metabox: existing value fills the named inputs (migration needs no data change) and one empty group is offered.
ob_start();
Fides_DS_Learn::render_meta_box($root);
$box = ob_get_clean();
$check(substr_count($box, 'name="fides_learn_services[') >= 4 * 5 && strpos($box, 'value="Wallet readiness assessment"') !== false && strpos($box, 'name="fides_learn[services]"') === false, 'the metabox shows named inputs for the stored services plus an empty group');
$check(strpos($box, 'the word <code>contact</code>') !== false && strpos($box, 'Do not use the | character') !== false, 'the metabox explains the destination values');
// Save through the real handler: a valid edit is stored, an invalid one keeps the stored value and shows a message.
$all_fields = array();
foreach (array_keys(Fides_DS_Learn::FIELDS) as $field) {
    $all_fields[ $field ] = $meta($root->ID, $field);
}
$save = static function (array $services) use ($root, $all_fields): void {
    $_POST = array(
        'fides_learn_nonce'    => wp_create_nonce('fides_learn_meta'),
        'fides_learn'          => wp_slash($all_fields),
        'fides_learn_services' => wp_slash($services),
    );
    Fides_DS_Learn::save_meta($root->ID, $root);
    $_POST = array();
};
$stored_before = $meta($root->ID, 'services');
$rows_before   = Fides_DS_Learn::services($root->ID);
$edit          = array();
foreach ($rows_before as $r) {
    $edit[] = array('title' => $r['title'], 'text' => $r['text'], 'label' => $r['label'], 'url' => $r['url'] === '' ? '' : ($r['url'] === $contact ? 'contact' : (string) preg_replace('~^https?://[^/]+~', '', $r['url'])));
}
$edit[1]['title'] = 'Use case and business case (edited)';
$save($edit);
$check(strpos($meta($root->ID, 'services'), 'Use case and business case (edited)') !== false && Fides_DS_Learn::render_page($root->ID) !== $html, 'a valid edit through the metabox handler is stored and rendered');
$check(strpos(Fides_DS_Learn::render_page($root->ID), 'contact') !== false && count(Fides_DS_Learn::services($root->ID)) === 4, 'the other services and their contact destinations stay intact');
$good_value = $meta($root->ID, 'services');
$edit[2]['url'] = 'conact';
$edit[3]['title'] = '';
$save($edit);
$check($meta($root->ID, 'services') === $good_value, 'an invalid save keeps the previously stored services');
$errors = get_transient('fides_learn_services_err_' . get_current_user_id() . '_' . $root->ID);
$check(is_array($errors) && count($errors) === 2, 'the problems are stored for the admin message');
$_GET['post'] = (string) $root->ID;
ob_start();
Fides_DS_Learn::services_admin_notice();
$notice = ob_get_clean();
unset($_GET['post']);
$check(strpos($notice, 'notice-error') !== false && strpos($notice, 'Service 3') !== false && strpos($notice, 'Service 4: enter a title') !== false && strpos($notice, 'previous services are kept') !== false, 'a visible admin notice lists what to fix');
delete_transient('fides_learn_services_err_' . get_current_user_id() . '_' . $root->ID);
$set($root->ID, 'services', $stored_before);
$check(Fides_DS_Learn::render_page($root->ID) === $html && $meta($root->ID, 'services') === $stored_before, 'the original services are restored exactly');
wp_set_current_user(0);

// Enquiry: offered contexts come from the Services tree, no webinar interest, wording follows the section.
$offerings = Fides_DS_Learn::offerings($enquiry->ID);
$check(array_keys($offerings) === array('wallet-readiness-assessment'), 'enquiry offers the assessment only: ' . implode(',', array_keys($offerings)));
$_GET['offering'] = 'wallet-readiness-assessment';
$e = Fides_DS_Learn::render_page($enquiry->ID);
unset($_GET['offering']);
$check(strpos($e, 'data-context-prefix="Services"') !== false && strpos($e, 'Services · Wallet readiness assessment') !== false, 'enquiry context reads Services · assessment');
$check(strpos($e, 'Back to Wallet readiness assessment') !== false, 'enquiry links back to the assessment');
$check(! preg_match('/€|\bprice\b|\bfee\b/i', wp_strip_all_tags($e)), 'enquiry for services mentions no price or fee');
$check(strpos($e, 'Training &amp; workshops') === false && strpos($e, 'webinar') === false, 'enquiry for services has no Training & workshops wording');

// The workshop page points at the assessment (existing destination).
$workshop = get_page_by_path('fides-design-pilot/learn/sessions/wallet-readiness-workshop', OBJECT, 'page');
$check($workshop instanceof WP_Post && strpos(Fides_DS_Learn::render_page($workshop->ID), '/services/wallet-readiness-assessment/') !== false, 'the workshop page links to the assessment');

// Shell: Services appears in the main navigation and is the current item below /services/.
$header = Fides_DS_Site_Shell::render_header();
$check(strpos($header, '>Services<') !== false, 'the Services item is in the header navigation');

if ($results['fail']) {
    echo 'FAIL (' . count($results['fail']) . '): ' . implode('; ', $results['fail']) . "\n";
    exit(1);
}
echo 'services behaviour: ' . $results['pass'] . " checks passed\n";
