<?php
/**
 * Behaviour tests for the Explore <-> Learn cross links (no HTTP, no database writes).
 * Editorial entries and their published targets, the inline link with its fallback, the line variant,
 * the credential and organization helpers, and the editorially chosen use case records.
 * Run: pilot_wp eval-file tests/explore-learn-crosslinks-behaviour.php
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

$check(class_exists('Fides_DS_Editorial_Links'), 'editorial links module is loaded');

// Every context used by the catalogs has a published target page.
$expected = array(
    'wallet-overview:personal'                    => '/learn/topics/for-you/choosing-and-managing-a-wallet/',
    'credential-explain'                          => '/learn/topics/the-big-picture/what-is-a-credential/',
    'credential-formats'                          => '/learn/topics/technology/credential-formats-and-interoperability/',
    'usecase-overview:digital-wallets'            => '/learn/topics/the-big-picture/what-is-a-digital-wallet/',
    'usecase-overview:verifiable-credentials'     => '/learn/topics/the-big-picture/what-is-a-credential/',
    'organization-overview:roles'                 => '/learn/topics/ecosystem-roles/',
    'organization-overview:qtsp'                  => '/learn/topics/ecosystem-roles/trust-service-providers-and-trust-frameworks/',
);
foreach ($expected as $context => $suffix) {
    $resolved = Fides_DS_Editorial_Links::resolved($context);
    $check(is_array($resolved) && substr(rtrim((string) wp_parse_url($resolved['url'], PHP_URL_PATH), '/') . '/', -strlen($suffix)) === $suffix, "{$context} resolves to the published page ending in {$suffix}");
}

// Inline link: editorial target first, then the fides.community fallback, then plain text.
$html = do_shortcode('[fides_editorial_inline context="usecase-overview:digital-wallets" fallback="https://fides.community/topics/personal-wallets/"]digital wallets[/fides_editorial_inline]');
$check(strpos($html, '/learn/topics/the-big-picture/what-is-a-digital-wallet/') !== false && strpos($html, '>digital wallets</a>') !== false && strpos($html, 'fides.community') === false, 'inline link points to the Learn article, not to fides.community');
$ghost = static function ($entry, $context) {
    return $context === 'test:ghost' ? array('title' => 'T', 'label' => 'L', 'target' => '/fides-design-pilot/learn/no-such-page/') : $entry;
};
add_filter('fides_ds_editorial_link_entry', $ghost, 10, 2);
$fallback = do_shortcode('[fides_editorial_inline context="test:ghost" fallback="https://fides.community/topics/personal-wallets/"]digital wallets[/fides_editorial_inline]');
$check(strpos($fallback, 'href="https://fides.community/topics/personal-wallets/"') !== false, 'a missing target falls back to the given live address');
$check(do_shortcode('[fides_editorial_inline context="test:ghost"]digital wallets[/fides_editorial_inline]') === 'digital wallets', 'without a fallback the text stays plain, never a dead link');
$check(do_shortcode('[fides_editorial_inline context="test:none" fallback="javascript:alert(1)"]x[/fides_editorial_inline]') === 'x', 'a fallback that is not http(s) is ignored');
$check(Fides_DS_Editorial_Links::render('test:ghost', 'line') === '', 'line variant renders nothing for an unpublished target');
$check(Fides_Credential_Design::learn_more_html('test:ghost') === '', 'credential explanation shows no Learn link for an unpublished target');
remove_filter('fides_ds_editorial_link_entry', $ghost, 10);

// Line variant: one sentence and one link, English text from the entry only.
$line = Fides_DS_Editorial_Links::render('organization-overview:roles', 'line');
$check(strpos($line, 'fides-ds-editorial-link--line') !== false && substr_count($line, '<a ') === 1 && strpos($line, 'Organizations describe their own roles.') !== false, 'roles line is one sentence and one link and names the roles as self-described');
$qtsp = Fides_DS_Editorial_Links::resolved('organization-overview:qtsp');
$check(is_array($qtsp) && stripos($qtsp['text'], 'imported') !== false && stripos($qtsp['text'], 'describe for themselves') !== false, 'QTSP line keeps imported certification data apart from self-described roles');

// Credential explanation and organization data attributes.
$more = Fides_Credential_Design::learn_more_html('credential-explain');
$check(strpos($more, 'what-is-a-credential') !== false && substr_count($more, '<a ') === 1, 'credential explanation links to What is a credential?');
$check(strpos(Fides_Credential_Design::attestations_template(), 'what-is-a-credential') !== false, 'the Credentials & attestations dialog contains the Learn link');
$attrs = Fides_Organization_Design::learn_attributes();
$check(strpos($attrs, 'data-learn-roles-url="') !== false && strpos($attrs, 'data-learn-qtsp-url="') !== false, 'organization overview passes both Learn lines to the script');
$personal = Fides_DS_Editorial_Links::resolved('wallet-overview:personal');
$check(is_array($personal) && $personal['label'] === 'Choosing and managing a wallet', 'personal wallet strip names the article it links to');

// Editorially chosen use cases exist, are published, and carry the facts the Learn text relies on.
$source = class_exists('Fides_Catalog_Source') ? Fides_Catalog_Source::for('usecase') : null;
$records = array(
    'from-repeated-verification-to-reusable-trust-re-imagining-the-real-estate-purchasing-journey-kS1jWN' => array('Interac', 'yes'),
    'nijmegen-attribute-based-municipal-login'                                                          => array('Gemeente Nijmegen', 'yes'),
    'reeco-textile-dpp-the-supply-chain-verified-independently-of-the-brands-systems-CH9jvV'             => array('Reeco', 'no'),
);
foreach ($records as $id => $facts) {
    $item = $source ? $source->find_by_id($id) : null;
    $check(is_array($item) && ($item['status'] ?? '') === 'published', "use case {$facts[0]} is published");
    $check(is_array($item) && ($item['organizationName'] ?? '') === $facts[0] && ($item['productionDeployment'] ?? '') === $facts[1], "use case {$facts[0]} keeps the organisation and status the Learn text assumes");
    $card = do_shortcode('[fides_learn_usecase id="' . $id . '" url="/fides-design-pilot/use-case/" kicker="See it in practice" label="Explore"]');
    $check(strpos($card, 'data-fides-learn-record="usecase:' . $id . '"') !== false, "card for {$facts[0]} renders");
}
$check(do_shortcode('[fides_learn_usecase id="no-such-record" url="/fides-design-pilot/use-case/"]') === '', 'a missing record hides the card');

// The use case overview seed has no hard-coded fides.community explanation links left.
$overview = get_page_by_path('fides-design-pilot/overview', OBJECT, 'page');
$content  = $overview ? (string) $overview->post_content : '';
$check($content !== '' && strpos($content, 'fides_editorial_inline') !== false && strpos($content, 'href="https://fides.community/topics/') === false, 'use case overview intro uses editorial links, not fixed fides.community addresses');

foreach ($results['fail'] as $message) {
    echo "not ok - {$message}\n";
}
printf("# pass %d\n# fail %d\n", $results['pass'], count($results['fail']));
if ($results['fail']) {
    exit(1);
}
