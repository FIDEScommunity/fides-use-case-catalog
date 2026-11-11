<?php
/**
 * Server-side checks for the WPForms request form prototype. Run through run-wpforms-request-checks.sh:
 *   wp eval-file tests/wpforms-request-behaviour.php [stored-data]
 * Prints "ok - ..." / "not ok - ..." lines and "info - ..." facts for the report; exits 1 on a failure.
 */
if (! defined('ABSPATH')) {
    exit(1);
}
$mode     = isset($args[0]) ? $args[0] : 'checks';
$failures = 0;
function wr_ok(string $name, bool $ok, string $detail = ''): void {
    global $failures;
    if (! $ok) {
        ++$failures;
    }
    echo ($ok ? 'ok' : 'not ok') . " - $name" . (! $ok && $detail !== '' ? " ($detail)" : '') . "\n";
}
function wr_info(string $text): void {
    echo "info - $text\n";
}

if ($mode === 'stored-data') {
    // What WPForms keeps after the browser checks: tables, entries and logs. Values of visitors are not printed.
    global $wpdb;
    $tables = $wpdb->get_col("SHOW TABLES LIKE '{$wpdb->prefix}wpforms%'"); // phpcs:ignore
    wr_info('wpforms tables: ' . implode(', ', array_map(static function ($t) use ($wpdb) { return substr($t, strlen($wpdb->prefix)); }, $tables)));
    wr_ok('no entry tables exist (this edition stores no entries)', ! in_array($wpdb->prefix . 'wpforms_entries', $tables, true) && ! in_array($wpdb->prefix . 'wpforms_entry_fields', $tables, true));
    wr_info('wpforms()->is_pro(): ' . (wpforms()->is_pro() ? 'yes' : 'no') . '; entry handler object: ' . (is_object(wpforms()->obj('entry')) ? 'present' : 'absent'));
    $logs = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}wpforms_logs"); // phpcs:ignore
    wr_info("rows in wpforms_logs: $logs");
    $form_id = Fides_DS_Request_Form::form_id();
    $posts   = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type NOT IN ('page','post','attachment','revision','nav_menu_item','wpforms','wp_global_styles','wp_navigation','wp_template','wp_template_part','customize_changeset','custom_css','oembed_cache','wp_font_family','wp_font_face') AND post_content LIKE %s", '%request-capture-marker%')); // phpcs:ignore
    wr_ok('no post of any type holds submitted test text', $posts === 0);
    $opts = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->options} WHERE option_value LIKE %s", '%request-capture-marker%')); // phpcs:ignore
    wr_ok('no option holds submitted test text', $opts === 0);
    $meta = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_value LIKE %s", '%request-capture-marker%')); // phpcs:ignore
    wr_ok('no post meta holds submitted test text', $meta === 0);
    $trans = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_fides\\_req\\_%'"); // phpcs:ignore
    wr_info("throttle counters (hashed email, expire after an hour): $trans");
    $settings = (array) get_option('wpforms_settings', array());
    wr_info('WPForms settings relevant to privacy: gdpr=' . var_export($settings['gdpr'] ?? null, true) . ', gdpr-disable-uuid=' . var_export($settings['gdpr-disable-uuid'] ?? null, true) . ', gdpr-disable-details=' . var_export($settings['gdpr-disable-details'] ?? null, true) . ', captcha provider=' . var_export($settings['captcha-provider'] ?? 'none', true));
    exit($failures ? 1 : 0);
}

// ---- Form and settings
$form_id = Fides_DS_Request_Form::form_id();
wr_ok('form fides-request-form exists and is published', $form_id > 0 && get_post_status($form_id) === 'publish');
$data = wpforms_decode((string) get_post_field('post_content', $form_id));
wr_ok('form has the seven fields of the definition', count($data['fields']) === 7 && isset($data['fields'][2], $data['fields'][9]), (string) count($data['fields']));
wr_ok('AJAX submit and modern anti-spam (local honeypot and token) are on, no external captcha', ($data['settings']['ajax_submit'] ?? '') === '1' && ($data['settings']['antispam_v3'] ?? '') === '1' && empty($data['settings']['recaptcha']));
wr_ok('form carries the shared button class', ($data['settings']['submit_class'] ?? '') === 'fides-ds-button');
wr_ok('only name, email, organisation, message, offering and date are asked, no consent box', array_values(array_map(static function ($f) { return $f['type']; }, $data['fields'])) === array('select', 'select', 'name', 'email', 'text', 'textarea', 'hidden'));
wr_ok('no phone field', ! in_array('phone', array_column($data['fields'], 'type'), true));
wr_ok('the form file has no real address, only the example.invalid placeholder', (bool) preg_match('~request@example\.invalid~', (string) get_post_field('post_content', $form_id)) && ! preg_match('~[A-Za-z0-9._%+-]+@(?!example\.invalid)[A-Za-z0-9.-]+\.[a-z]{2,}~', stripslashes((string) get_post_field('post_content', $form_id))));
$src = (string) file_get_contents(WP_PLUGIN_DIR . '/fides-community-tools-tiles/includes/class-fides-ds-request-form.php');
wr_ok('class file has no real address either', ! preg_match('~[A-Za-z0-9._%+-]+@(?!example\.invalid)[A-Za-z0-9.-]+\.[a-z]{2,}~', $src));

// ---- Recipient: placeholder by default, option or filter to change, invalid values ignored
delete_option('fides_ds_request_form_recipient');
wr_ok('default recipient is the placeholder', Fides_DS_Request_Form::recipient() === 'request@example.invalid', Fides_DS_Request_Form::recipient());
update_option('fides_ds_request_form_recipient', 'team@example.test');
wr_ok('option sets the recipient', Fides_DS_Request_Form::recipient() === 'team@example.test');
update_option('fides_ds_request_form_recipient', 'not an address');
wr_ok('an invalid recipient falls back to the placeholder', Fides_DS_Request_Form::recipient() === 'request@example.invalid');
delete_option('fides_ds_request_form_recipient');

// ---- Offerings and choices
$offerings = Fides_DS_Request_Form::offerings();
wr_ok('offerings come from both request pages (training and services)', isset($offerings['wallet-introduction'], $offerings['wallet-readiness-assessment'], $offerings['eudi-business-wallets-in-practice'], $offerings['interest']), implode(',', array_keys($offerings)));
wr_ok('the dated training lists four dates', count($offerings['eudi-business-wallets-in-practice']['dates']) === 4);
$r = Fides_DS_Request_Form::resolve_choice('eudi-business-wallets-in-practice', 'thursday-14-january-2027');
wr_ok('known offering and date are accepted', $r === array('eudi-business-wallets-in-practice', 'thursday-14-january-2027'));
wr_ok('unknown offering is ignored with its date', Fides_DS_Request_Form::resolve_choice('bogus', 'thursday-14-january-2027') === array('', ''));
wr_ok('unknown date keeps the offering but drops the date', Fides_DS_Request_Form::resolve_choice('eudi-business-wallets-in-practice', 'nope') === array('eudi-business-wallets-in-practice', ''));
wr_ok('a date of another offering is dropped', Fides_DS_Request_Form::resolve_choice('wallet-introduction', 'thursday-14-january-2027') === array('wallet-introduction', ''));
wr_ok('script-like input is neutralised', Fides_DS_Request_Form::resolve_choice('"><script>x</script>', '') === array('', ''));
wr_ok('"not sure yet" is a valid date for a dated offering', Fides_DS_Request_Form::resolve_choice('eudi-business-wallets-in-practice', 'not-sure')[1] === 'not-sure');

// ---- Mail content: language, subject, no free text of the visitor in the confirmation
$base = wpforms_decode((string) get_post_field('post_content', $form_id));
$entry = array('fields' => array(2 => 'eudi-business-wallets-in-practice', 3 => 'eudi-business-wallets-in-practice:thursday-14-january-2027', 4 => 'Ada {field_id="7"} <b>Lovelace</b>', 5 => 'ada@example.test', 7 => 'SECRET-FREE-TEXT-https://spam.example/x', 9 => 'en'));
$_POST['wpforms']['fields'][9] = 'en';
$en = Fides_DS_Request_Form::filter_process_form_data($base, $entry);
$n1 = $en['settings']['notifications'][1];
$n2 = $en['settings']['notifications'][2];
wr_ok('FIDES mail goes to the configured recipient (placeholder)', $n1['email'] === 'request@example.invalid');
wr_ok('FIDES mail subject has offering and date', strpos($n1['subject'], 'EUDI') !== false && strpos($n1['subject'], 'Thursday 14 January 2027') !== false, $n1['subject']);
wr_ok('visitor mail goes to the typed address through the email field', $n2['email'] === '{field_id="5"}');
wr_ok('visitor subject has offering and date', strpos($n2['subject'], 'Your request to FIDES') === 0 && strpos($n2['subject'], 'Thursday 14 January 2027') !== false, $n2['subject']);
wr_ok('visitor body has the name but no message text, no smart-tag braces and no markup', strpos($n2['message'], 'SECRET-FREE-TEXT') === false && strpos($n2['message'], 'spam.example') === false && strpos($n2['message'], '{') === false && strpos($n2['message'], '<b>') === false && strpos($n2['message'], 'Ada') !== false, $n2['message']);
wr_ok('visitor body says it is no booking or payment', stripos($n2['message'], 'not a booking or a payment') !== false);
$_POST['wpforms']['fields'][9] = 'nl';
$entry['fields'][9] = 'nl';
$nl = Fides_DS_Request_Form::filter_process_form_data($base, $entry);
wr_ok('Dutch visitor mail is Dutch', strpos($nl['settings']['notifications'][2]['subject'], 'Uw aanvraag bij FIDES') === 0 && strpos($nl['settings']['notifications'][2]['message'], 'geen boeking en geen betaling') !== false);
wr_ok('FIDES mail subject stays English for the team', strpos($nl['settings']['notifications'][1]['subject'], 'New FIDES request') === 0);
$entry['fields'][2] = 'bogus';
$entry['fields'][3] = 'bogus:thursday-14-january-2027';
$unknown = Fides_DS_Request_Form::filter_process_form_data($base, $entry);
wr_ok('an unknown offering never reaches a subject', strpos($unknown['settings']['notifications'][1]['subject'], 'bogus') === false && stripos($unknown['settings']['notifications'][2]['subject'], 'bogus') === false);
unset($_POST['wpforms']);

// ---- Names: normal names stay as typed, a link or address is never repeated in the visitor mail
$_POST['wpforms']['fields'][9] = 'en';
foreach (array("Zoë O'Neil-Smith", 'María José de la Cruz', '李雷', 'Al', 'Ng', 'Dr. J.R.R. Tolkien') as $good) {
    $e = $entry;
    $e['fields'][2] = 'wallet-introduction';
    $e['fields'][3] = '';
    $e['fields'][4] = $good;
    $m = Fides_DS_Request_Form::filter_process_form_data($base, $e)['settings']['notifications'][2]['message'];
    wr_ok("name '$good' is kept in the visitor mail", strpos($m, 'Dear ' . $good . ',') === 0, substr($m, 0, 40));
}
foreach (array('visit www.spam.example now', 'https://spam.example/x', 'mail me@spam.example') as $bad) {
    $e = $entry;
    $e['fields'][4] = $bad;
    $m = Fides_DS_Request_Form::filter_process_form_data($base, $e)['settings']['notifications'][2]['message'];
    wr_ok("name '$bad' is not repeated, the greeting is generic", strpos($m, 'spam.example') === false && strpos($m, 'Hello,') === 0, substr($m, 0, 40));
}
$long = Fides_DS_Request_Form::filter_process_form_data($base, array_replace_recursive($entry, array('fields' => array(4 => str_repeat('A', 300)))))['settings']['notifications'][2]['message'];
wr_ok('a very long name is cut to 80 characters', strpos($long, str_repeat('A', 81)) === false && strpos($long, str_repeat('A', 80)) !== false);
unset($_POST['wpforms']);

// ---- Outcome matrix: confirmation text and error per (entry stored, FIDES mail, visitor mail)
// The entry id is simulated by calling the hook with a number (Lite never stores one; Plus passes the id of the stored entry).
// Nothing in the production code reads a test flag. Mail results are fed through the same public tracking methods WordPress calls.
$ref_log = new ReflectionProperty('Fides_DS_Request_Form', 'mail_log');
$ref_log->setAccessible(true);
$ref_out = new ReflectionProperty('Fides_DS_Request_Form', 'outcome');
$ref_out->setAccessible(true);
$sim = static function (int $entry_id, bool $fides_ok, bool $visitor_ok, string $lang = 'en') use ($form_id, $ref_log, $ref_out): array {
    $ref_log->setValue(null, array());
    $ref_out->setValue(null, array());
    $_POST['wpforms']['fields'][9] = $lang;
    $process         = wpforms()->obj('process');
    $process->errors = array();
    foreach (array('request@example.invalid' => $fides_ok, 'visitor@example.test' => $visitor_ok) as $to => $ok) {
        if ($ok) {
            Fides_DS_Request_Form::track_mail_ok(array('to' => array($to)));
        } else {
            Fides_DS_Request_Form::track_mail_failed(new WP_Error('wp_mail_failed', 'x', array('to' => array($to))));
        }
    }
    $form_data = array('id' => $form_id);
    Fides_DS_Request_Form::after_send(array(5 => array('value' => 'visitor@example.test')), array(), $form_data, $entry_id);
    $text = wp_strip_all_tags(Fides_DS_Request_Form::confirmation_message('<p>neutral</p>', $form_data));
    return array($text, (string) ($process->errors[ $form_id ]['header'] ?? ''));
};
list($t, $e) = $sim(0, true, true);
wr_ok('no entry, both mails sent: confirmation says received and confirmation sent', strpos($t, 'sent a confirmation to your email address') !== false && $e === '', $t . '|' . $e);
list($t, $e) = $sim(0, true, false);
wr_ok('no entry, visitor mail failed: says received, no confirmation mail could be sent', strpos($t, 'could not send a confirmation') !== false && strpos($t, 'sent a confirmation to') === false && $e === '', $t);
list($t, $e) = $sim(0, false, true);
wr_ok('no entry, FIDES mail failed: error with alternative contact, nothing is promised', strpos($e, 'could not be sent right now') !== false && strpos($e, 'request@example.invalid') !== false && stripos($e, 'we will reply') === false, $e);
list($t, $e) = $sim(0, false, false);
wr_ok('no entry, both mails failed: error', strpos($e, 'could not be sent right now') !== false);
list($t, $e) = $sim(123, false, true);
wr_ok('entry stored, FIDES mail failed: "saved" text, no error, no promise of a reply time', strpos($t, 'is saved') !== false && strpos($t, 'cannot say when') !== false && strpos($t, 'sent a confirmation') === false && $e === '', $t . '|' . $e);
list($t, $e) = $sim(123, false, false);
wr_ok('entry stored, both mails failed: still the "saved" text', strpos($t, 'is saved') !== false && $e === '', $t);
list($t, $e) = $sim(123, true, false);
wr_ok('entry stored, visitor mail failed: received, no confirmation mail', strpos($t, 'could not send a confirmation') !== false && $e === '', $t);
list($t, $e) = $sim(123, true, true);
wr_ok('entry stored, both mails sent: normal confirmation', strpos($t, 'sent a confirmation to your email address') !== false && $e === '', $t);
list($t, $e) = $sim(123, false, true, 'nl');
wr_ok('Dutch: entry stored, FIDES mail failed gives the Dutch "saved" text', strpos($t, 'is opgeslagen') !== false, $t);
list($t, $e) = $sim(0, false, true, 'nl');
wr_ok('Dutch: no entry, FIDES mail failed gives the Dutch error', strpos($e, 'kon nu niet worden verstuurd') !== false, $e);
$ref_log->setValue(null, array());
$ref_out->setValue(null, array());
wr_ok('without an outcome (spam, unfinished) the neutral form text stays and claims nothing', Fides_DS_Request_Form::confirmation_message('<p>neutral</p>', array('id' => $form_id)) === '<p>neutral</p>');
$stored = wpforms_decode((string) get_post_field('post_content', $form_id));
wr_ok('form JSON: entry storing stays on (no disable_entries key, because Plus treats the key as "off" even when empty), user details off', ! array_key_exists('disable_entries', $stored['settings']) && ($stored['settings']['disable_ip'] ?? '') === '1');
wr_ok('form JSON: neutral base confirmation claims no mail', stripos($stored['settings']['confirmations'][1]['message'], 'confirmation to your email') === false);
unset($_POST['wpforms']);

// ---- Separate test page: marked, never a routing target, its own noindex
$test_pages = get_posts(array('post_type' => 'page', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids', 'meta_key' => Fides_DS_Request_Form::TEST_META, 'meta_value' => '1'));
if ($test_pages) {
    wr_ok('test page exists with slug request-wpforms-test and is a form page', get_post_field('post_name', $test_pages[0]) === 'request-wpforms-test' && Fides_DS_Request_Form::is_form_page((int) $test_pages[0]));
    wr_ok('the routing target is not the test page', Fides_DS_Request_Form::page_id() !== (int) $test_pages[0] && Fides_DS_Request_Form::page_id() > 0);
    wr_ok('the test page keeps the kind article (no clash with the request page lookups)', get_post_meta($test_pages[0], '_fides_learn_kind', true) === 'article');
} else {
    wr_info('no test page seeded here (REQUEST_FORM_PAGE=test seed-request-form.sh)');
}

// ---- Routing switch: on by default in the pilot (guard), option 0 falls back, rewrites only the request links, keeps the query
$old = array();
foreach (get_posts(array('post_type' => 'page', 'post_status' => 'publish', 'numberposts' => 5, 'fields' => 'ids', 'meta_key' => '_fides_learn_kind', 'meta_value' => 'request')) as $pid) {
    if (! Fides_DS_Request_Form::is_form_page((int) $pid)) {
        $old[] = get_permalink($pid);
    }
}
$html = '<a href="' . esc_url($old[0] . '?offering=wallet-introduction&date=x') . '">a</a> <a href="' . esc_url($old[1]) . '">b</a> <a href="https://example.test/other/">c</a> <a href="/fides-design-pilot/learn/sessions/">d</a>';
update_option('fides_ds_request_form_route', '0');
wr_ok('option 0 switches the route off and links stay unchanged', ! Fides_DS_Request_Form::route_enabled() && Fides_DS_Request_Form::route_links($html) === $html);
delete_option('fides_ds_request_form_route');
wr_ok('without an option the pilot guard default is ON', Fides_DS_Request_Form::route_enabled());
remove_all_filters('fides_ds_request_form_route_default');
wr_ok('without the pilot guard the built-in default is OFF', ! Fides_DS_Request_Form::route_enabled());
add_filter('fides_ds_request_form_route_default', '__return_true');
update_option('fides_ds_request_form_route', '1');
$routed = Fides_DS_Request_Form::route_links($html);
wr_ok('switch ON sends both existing request links to the WPForms page and keeps the query', substr_count($routed, 'request-wpforms/') === 2 && strpos($routed, 'request-wpforms/?offering=wallet-introduction&#038;date=x') !== false, $routed);
wr_ok('other links stay unchanged', strpos($routed, 'https://example.test/other/') !== false && strpos($routed, '/learn/sessions/"') !== false);
delete_option('fides_ds_request_form_route');
wr_ok('option removed again: back to the default', Fides_DS_Request_Form::route_enabled());
wr_ok('legacy bypass is off without the query parameter', ! Fides_DS_Request_Form::legacy_requested());
$_GET['fides_legacy_form'] = '1';
wr_ok('?fides_legacy_form=1 is recognised and leaves links unchanged', Fides_DS_Request_Form::legacy_requested() && Fides_DS_Request_Form::route_links($html) === $html);
unset($_GET['fides_legacy_form']);
wr_ok("NL-prefixed links are routed and keep their prefix", strpos(Fides_DS_Request_Form::route_links('<a href="/nl' . wp_parse_url($old[0], PHP_URL_PATH) . '?offering=x">a</a>'), 'href="/nl/') !== false && strpos(Fides_DS_Request_Form::route_links('<a href="/nl' . wp_parse_url($old[0], PHP_URL_PATH) . '?offering=x">a</a>'), 'request-wpforms/?offering=x') !== false, Fides_DS_Request_Form::route_links("<a href=\"/nl" . wp_parse_url($old[0], PHP_URL_PATH) . "?offering=x\">a</a>"));
add_filter('fides_ds_request_form_followup', static function () { return 'Placeholder follow-up.'; });
$ref = new ReflectionMethod('Fides_DS_Request_Form', 'followup');
$ref->setAccessible(true);
wr_ok('follow-up sentence is empty by default and filterable', $ref->invoke(null, 'en') === 'Placeholder follow-up.');
remove_all_filters('fides_ds_request_form_followup');
wr_ok('follow-up sentence is empty without a filter', $ref->invoke(null, 'en') === '');

// ---- Context comes from the chosen offering only
$ctx = new ReflectionMethod('Fides_DS_Request_Form', 'context_for');
$ctx->setAccessible(true);
wr_ok('context: a service, a training and no offering', $ctx->invoke(null, 'use-case-and-business-case') === 'service' && $ctx->invoke(null, 'general-service-question') === 'service' && $ctx->invoke(null, 'wallet-introduction') === 'training' && $ctx->invoke(null, '') === 'general' && $ctx->invoke(null, 'bogus') === 'general');
$_GET['context'] = 'service';
$link = new ReflectionMethod('Fides_DS_Request_Form', 'link_choice');
$link->setAccessible(true);
wr_ok('?context=service without an offering selects the general service question', $link->invoke(null)[0] === 'general-service-question');
$_GET['offering'] = 'wallet-introduction';
wr_ok('an offering in the link wins over ?context=service', $link->invoke(null)[0] === 'wallet-introduction');
$_GET['context'] = 'evil';
unset($_GET['offering']);
wr_ok('unknown context values are ignored', $link->invoke(null)[0] === '');
unset($_GET['context']);
$posted = new ReflectionMethod('Fides_DS_Request_Form', 'posted_context');
$posted->setAccessible(true);
wr_ok('submission context follows the submitted offering and ignores any hint field', $posted->invoke(null, array('fields' => array(2 => 'use-case-and-business-case'))) === 'service' && $posted->invoke(null, array('fields' => array(2 => 'none'))) === 'general' && $posted->invoke(null, array('fields' => array(2 => 'wallet-introduction'))) === 'training');
$_POST['fides_context'] = 'service';
wr_ok('a posted fides_context field changes nothing', $posted->invoke(null, array('fields' => array(2 => 'none'))) === 'general');
unset($_POST['fides_context']);
$ss = new ReflectionMethod('Fides_DS_Request_Form', 'posted_choice');
$ss->setAccessible(true);
wr_ok('a date that belongs to another offering is dropped', $ss->invoke(null, array('fields' => array(2 => 'use-case-and-business-case', 3 => 'eudi-business-wallets-in-practice:thursday-14-january-2027')))[1] === '');

// ---- Facts for the report
wr_info('WPForms version ' . WPFORMS_VERSION . ', edition ' . (wpforms()->is_pro() ? 'Pro/Plus build' : 'Lite'));
exit($failures ? 1 : 0);
