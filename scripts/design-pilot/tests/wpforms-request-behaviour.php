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
    wr_info("throttle counters (hashed email/IP, expire after an hour): $trans");
    $settings = (array) get_option('wpforms_settings', array());
    wr_info('WPForms settings relevant to privacy: gdpr=' . var_export($settings['gdpr'] ?? null, true) . ', gdpr-disable-uuid=' . var_export($settings['gdpr-disable-uuid'] ?? null, true) . ', gdpr-disable-details=' . var_export($settings['gdpr-disable-details'] ?? null, true) . ', captcha provider=' . var_export($settings['captcha-provider'] ?? 'none', true));
    exit($failures ? 1 : 0);
}

// ---- Form and settings
$form_id = Fides_DS_Request_Form::form_id();
wr_ok('form fides-request-form exists and is published', $form_id > 0 && get_post_status($form_id) === 'publish');
$data = wpforms_decode((string) get_post_field('post_content', $form_id));
wr_ok('form has the eight fields of the definition', count($data['fields']) === 8 && isset($data['fields'][2], $data['fields'][9]), (string) count($data['fields']));
wr_ok('AJAX submit and modern anti-spam (local honeypot and token) are on, no external captcha', ($data['settings']['ajax_submit'] ?? '') === '1' && ($data['settings']['antispam_v3'] ?? '') === '1' && empty($data['settings']['recaptcha']));
wr_ok('form carries the shared button class', ($data['settings']['submit_class'] ?? '') === 'fides-ds-button');
wr_ok('only name, email, organisation, message, consent, offering and date are asked', array_values(array_map(static function ($f) { return $f['type']; }, $data['fields'])) === array('select', 'select', 'name', 'email', 'text', 'textarea', 'checkbox', 'hidden'));
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
wr_ok('Dutch visitor mail and confirmation are Dutch', strpos($nl['settings']['notifications'][2]['subject'], 'Uw aanvraag bij FIDES') === 0 && strpos($nl['settings']['notifications'][2]['message'], 'geen boeking en geen betaling') !== false && strpos($nl['settings']['confirmations'][1]['message'], 'Bedankt') !== false);
wr_ok('FIDES mail subject stays English for the team', strpos($nl['settings']['notifications'][1]['subject'], 'New FIDES request') === 0);
$entry['fields'][2] = 'bogus';
$entry['fields'][3] = 'bogus:thursday-14-january-2027';
$unknown = Fides_DS_Request_Form::filter_process_form_data($base, $entry);
wr_ok('an unknown offering never reaches a subject', strpos($unknown['settings']['notifications'][1]['subject'], 'bogus') === false && stripos($unknown['settings']['notifications'][2]['subject'], 'bogus') === false);
unset($_POST['wpforms']);

// ---- Routing switch: off by default, rewrites only the request links, keeps the query
$old = array();
foreach (get_posts(array('post_type' => 'page', 'post_status' => 'publish', 'numberposts' => 5, 'fields' => 'ids', 'meta_key' => '_fides_learn_kind', 'meta_value' => 'request')) as $pid) {
    if (! Fides_DS_Request_Form::is_form_page((int) $pid)) {
        $old[] = get_permalink($pid);
    }
}
$html = '<a href="' . esc_url($old[0] . '?offering=wallet-introduction&date=x') . '">a</a> <a href="' . esc_url($old[1]) . '">b</a> <a href="https://example.test/other/">c</a> <a href="/fides-design-pilot/learn/sessions/">d</a>';
delete_option('fides_ds_request_form_route');
wr_ok('switch is OFF by default and links stay unchanged', ! Fides_DS_Request_Form::route_enabled() && Fides_DS_Request_Form::route_links($html) === $html);
update_option('fides_ds_request_form_route', '1');
$routed = Fides_DS_Request_Form::route_links($html);
wr_ok('switch ON sends both existing request links to the WPForms page and keeps the query', substr_count($routed, 'request-wpforms/') === 2 && strpos($routed, 'request-wpforms/?offering=wallet-introduction&#038;date=x') !== false, $routed);
wr_ok('other links stay unchanged', strpos($routed, 'https://example.test/other/') !== false && strpos($routed, '/learn/sessions/"') !== false);
delete_option('fides_ds_request_form_route');
wr_ok('switch is OFF again after the check', ! Fides_DS_Request_Form::route_enabled());

// ---- Facts for the report
wr_info('WPForms version ' . WPFORMS_VERSION . ', edition ' . (wpforms()->is_pro() ? 'Pro/Plus build' : 'Lite'));
exit($failures ? 1 : 0);
