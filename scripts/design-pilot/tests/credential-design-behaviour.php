<?php
/**
 * Behaviour tests for the credential pilot (Paper 20.7 / 20.8 / 20.33–20.35):
 * real records (EHIC, EUCC, Open Badge, vLEI, mDL) plus fixtures for missing
 * fields, long URIs, escaping and aliases. Covers format panels, the
 * attribute index, TS11 metadata (UI marker vs API completeness), relations,
 * routing and the overview shortcode. Nothing is written to the database.
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

$long_uri = 'https://schemas.example.org/' . str_repeat('very-long-path-segment/', 18) . 'credential.schema.json';
$fixtures = array(
    array(
        'id'               => 'cred:pilot-test:bare',
        'displayName'      => 'Bare <script>alert(1)</script> Credential',
        'vcFormat'         => 'sd_jwt_vc',
        'formats'          => array(array('credentialId' => 'cred:pilot-test:bare:sd-jwt-vc', 'vcFormat' => 'sd_jwt_vc')),
        'aliasIds'         => array('cred:pilot-test:legacy-bare'),
    ),
    array(
        'id'                   => 'cred:pilot-test:long',
        'displayName'          => 'Long URI Credential',
        'shortDescription'     => 'Fixture with a very long schema URI.',
        'authority'            => array('name' => 'Pilot Authority'),
        'subjectType'          => 'Person',
        'vcFormat'             => 'sd_jwt_vc',
        'nativeIdentifier'     => 'urn:pilot:' . str_repeat('x', 160),
        'nativeIdentifierType' => 'vct',
        'schemaUrl'            => $long_uri,
        'schemaType'           => 'JSON Schema',
        'version'              => '2',
        'attributes'           => array(
            array('name' => 'address', 'type' => 'object', 'required' => true),
            array('name' => 'address/street', 'type' => 'string', 'description' => 'Street <b>name</b>'),
        ),
    ),
);

add_filter('fides_credential_design_items', static function ($items) use ($fixtures) {
    return array_merge(is_array($items) ? $items : array(), $fixtures);
});
add_filter('fides_credential_pilot_detail_base', static function () {
    return '/fides-design-pilot/credential/';
});

$flush = static function (): void {
    Fides_Credential_Design::flush_cache();
};
$flush();

$render = static function (string $id): string {
    $item = Fides_Credential_Design::find($id);
    return $item === null ? '' : Fides_Credential_Detail_Page::render($item, '/fides-design-pilot/credentials/', '/fides-design-pilot/use-case/', '/fides-design-pilot/credential/');
};

$has = static function (string $html, string $needle): bool {
    return strpos($html, $needle) !== false;
};

wp_set_current_user(0);

// ---------- Data and routing ----------

$items = Fides_Credential_Design::items();
$check(count($items) >= 100, 'catalog items load (' . count($items) . ')');
$check(Fides_Credential_Design::canonical_id('cred:eu:ehic-mdoc:mdoc') === 'cred:eu:ehic', 'format id resolves to the EHIC type');
$check(Fides_Credential_Design::canonical_id('cred:pilot-test:legacy-bare') === 'cred:pilot-test:bare', 'legacy alias resolves to its type');
$check(Fides_Credential_Design::canonical_id('cred:unknown:x') === 'cred:unknown:x', 'unknown ref stays as is');
$check(Fides_Credential_Design::find('cred:webuild:eucc:sd-jwt-vc')['id'] === 'cred:webuild:eucc', 'find() accepts a format alias');

$_GET = array('credential' => 'cred:eu:ehic');
$check(Fides_Credential_Design::requested_id('x') === 'cred:eu:ehic', 'requested_id reads ?credential=');
$_GET = array('credential' => '<script>');
$check(Fides_Credential_Design::requested_id('fallback') === 'fallback', 'requested_id rejects invalid characters');
$_GET = array('credential' => str_repeat('a', 201));
$check(Fides_Credential_Design::requested_id('fallback') === 'fallback', 'requested_id rejects ids over 200 characters');
$_GET = array();

$url = Fides_Credential_Design::detail_url('cred:eu:ehic');
$check($has($url, '/fides-design-pilot/credential/?credential=cred%3Aeu%3Aehic'), 'detail URL keeps the ?credential= deeplink: ' . $url);

// Shortcode: unknown id shows the missing state, an alias renders the canonical type.
$_GET = array('credential' => 'cred:does-not-exist');
$missing = Fides_Credential_Detail_Page::shortcode(array('id' => 'cred:eu:ehic', 'listing_url' => '/fides-design-pilot/credentials/'));
$check($has($missing, 'This credential type is not in the current FIDES catalog.') && $has($missing, 'All credential types'), 'unknown id: missing state with a way back');
$_GET = array('credential' => 'cred:eu:ehic-sd-jwt-vc:sd-jwt-vc');
$alias = Fides_Credential_Detail_Page::shortcode(array('listing_url' => '/fides-design-pilot/credentials/'));
$check($has($alias, 'data-credential-id="cred:eu:ehic"'), 'format alias renders the canonical EHIC record');
$_GET = array();

// ---------- EHIC: two formats, attributes, partial TS11 ----------

$ehic = $render('cred:eu:ehic');
$check($has($ehic, '<h1 class="fides-ds-heading-1 fides-ds-heading-1--detail fides-org-detail__title">EHIC</h1>'), 'EHIC: H1');
$check($has($ehic, 'data-fides-ds-back="credential"') && $has($ehic, 'All credential types'), 'EHIC: shared back link');
$check(substr_count($ehic, 'data-credential-format-panel') === 2, 'EHIC: one panel per format');
$check($has($ehic, 'role="tablist"') && preg_match('/<div[^>]*role="tablist"[^>]*hidden/', $ehic) === 1, 'EHIC: tablist stays hidden until JS enhances it');
$check($has($ehic, 'eu.europa.ec.eudi.ehic.1') && $has($ehic, 'urn:eudi:ehic:1'), 'EHIC: docType and VCT per format');
$check($has($ehic, 'docType') && $has($ehic, '>VCT<'), 'EHIC: format-specific identifier labels');
$check($has($ehic, 'The attribute index below is shared at credential-type level.'), 'EHIC: shared attribute index note');
$check($has($ehic, '12 indexed fields · 8 top-level'), 'EHIC: attribute counts');
$check($has($ehic, 'data-fides-ds-show-all="8"') && $has($ehic, 'id="attributes-list"'), 'EHIC: attributes show-all');
$check($has($ehic, 'Schema metadata · TS11') && $has($ehic, 'data-fides-ds-collapsible="closed"'), 'EHIC: TS11 panel (accordion on narrow screens)');
$check(! $has($ehic, 'fides-ds-status fides-credential-ts11-status'), 'EHIC: no TS11 metadata marker');
$check($has($ehic, 'Some source metadata is not provided.'), 'EHIC: TS11 summary explains missing metadata');
$check($has($ehic, 'Partial <span class="fides-ds-meta">· missing'), 'EHIC: API conformance is partial');
$check($has($ehic, 'projected from catalog version 1'), 'EHIC: semantic version is labelled as a projection');
$check($has($ehic, 'data-fides-ds-term="' . Fides_Credential_Design::TS11_TEMPLATE . '"') && $has($ehic, '<template id="' . Fides_Credential_Design::TS11_TEMPLATE . '"'), 'EHIC: Explain opens the per-record TS11 template');
$check($has($ehic, 'id="sources"') && $has($ehic, 'Catalog record'), 'EHIC: sources section');
$check($has($ehic, 'not provided in this record'), 'EHIC: missing legal metadata is stated, not filled in');
$check($has($ehic, 'https://api.fides.community/api/public/credentialtype/cred%3Aeu%3Aehic'), 'EHIC: API record links to the public credentialtype endpoint');
$check($has($ehic, 'Help keep this credential type current.'), 'EHIC: shared closing');

$ehic_ts11 = Fides_Credential_Design::ts11(Fides_Credential_Design::find('cred:eu:ehic'));
$check(in_array('trustedAuthorities', $ehic_ts11['missing'], true) && in_array('attestationLoS', $ehic_ts11['missing'], true), 'EHIC: API missing list names trustedAuthorities and attestationLoS');
$check($ehic_ts11['level'] === 'partial', 'EHIC: API level partial');

// ---------- EUCC: rich TS11 record ----------

$eucc_item = Fides_Credential_Design::find('cred:webuild:eucc');
$eucc      = $render('cred:webuild:eucc');
$check(Fides_Credential_Design::has_ts11_marker($eucc_item), 'EUCC: TS11 metadata marker');
$check($has($eucc, 'fides-ds-status fides-credential-ts11-status">TS11 metadata<'), 'EUCC: marker in the TS11 panel');
$check(! $has($eucc, 'data-credential-format-panel') && ! $has($eucc, 'role="tablist"') && $has($eucc, 'urn:eudi:eucc:1'), 'EUCC: single format without tabs, VCT shown');
$check($has($eucc, '66 indexed fields'), 'EUCC: 66 indexed fields');
$check($has($eucc, 'High · ISO/IEC 18045'), 'EUCC: attestationLoS label');
$check($has($eucc, 'View rulebook'), 'EUCC: rulebook link');
$check($has($eucc, 'Trusted authorities are not provided.'), 'EUCC: marker summary still names missing trusted authorities');
$eucc_ts11 = Fides_Credential_Design::ts11($eucc_item);
$check($eucc_ts11['missing'] === array('trustedAuthorities'), 'EUCC: API only misses trustedAuthorities (' . implode(',', $eucc_ts11['missing']) . ')');
$check($eucc_ts11['version'] === '0.1.0', 'EUCC: SemVer kept');

// ---------- Open Badge: limited record ----------

$obc = $render('cred:eduwallet:open-badge');
$check($has($obc, 'Not yet indexed') && $has($obc, 'No attribute index is available for this catalog record yet.'), 'OBC: empty attribute index is explained');
$check(! $has($obc, 'id="attributes-list"'), 'OBC: no empty attribute list');
$check($has($obc, 'OpenID credential issuer metadata'), 'OBC: metadata endpoint labelled as such');
$check($has($obc, 'View metadata endpoint'), 'OBC: hero action names the metadata endpoint');
$check($has($obc, 'Type identifier') && $has($obc, 'OpenBadgeCredential'), 'OBC: native type identifier');
$check($has($obc, 'Schema type: Other'), 'OBC: schema type Other is shown');

// ---------- vLEI and mDL edge cases ----------

$vlei_ts11 = Fides_Credential_Design::ts11(Fides_Credential_Design::find('cred:gleif:legal-entity-vlei'));
$check($vlei_ts11['level'] === 'compatible' && $vlei_ts11['version'] === '', 'vLEI: unmapped format, non-numeric version');
$vlei = $render('cred:gleif:legal-entity-vlei');
$check($has($vlei, 'is not numeric') && $has($vlei, 'no TS11 format identifier'), 'vLEI: version and format gaps are explained');

$mdl = $render('cred:iso:mdl');
$check($has($mdl, 'recorded, not resolved') || $has($mdl, 'scheme'), 'mDL: trusted authority reference shown');

// ---------- Fixtures: escaping, long URI, nested attributes, bare record ----------

$bare = $render('cred:pilot-test:bare');
$check(! $has($bare, '<script>alert(1)</script>') && $has($bare, '&lt;script&gt;'), 'bare: display name is escaped');
$check(! $has($bare, 'id="overview"') && ! $has($bare, 'id="ecosystem"') && ! $has($bare, 'id="use-cases"'), 'bare: empty sections are left out');
$check($has($bare, 'Not provided'), 'bare: missing TS11 fields say Not provided');

$long = $render('cred:pilot-test:long');
$check($has($long, esc_url($long_uri)) && $has($long, 'fides-credential-uri'), 'long URI: full link kept with the wrapping class');
$check($has($long, '<details class="fides-credential-attr__details">') && $has($long, 'street'), 'nested attributes render inside their object');
$check(! $has($long, 'Street <b>name</b>') && $has($long, 'Street &lt;b&gt;name&lt;/b&gt;'), 'attribute descriptions are escaped');

// ---------- Marker parity and overview shortcode ----------

$marker_count = 0;
foreach (Fides_Credential_Design::items() as $item) {
    if (strpos((string) $item['id'], 'cred:pilot-test:') === 0) {
        continue;
    }
    $marker_count += Fides_Credential_Design::has_ts11_marker($item) ? 1 : 0;
}
$check($marker_count === 19, 'TS11 marker count matches the overview filter (19): ' . $marker_count);

$overview = do_shortcode('[fides_credential_catalog design="pilot" title="Credential Types" detail_url="/fides-design-pilot/credential/" add_url="/credential-submit/" intro="Find credential types."]');
$check($has($overview, 'data-design="pilot"') && $has($overview, 'fides-credential-pilot'), 'overview: pilot root');
$check($has($overview, 'data-detail-url="') && $has($overview, '/fides-design-pilot/credential/'), 'overview: detail URL for rows');
$check($has($overview, '<template id="' . Fides_Credential_Design::TS11_TEMPLATE . '"'), 'overview: TS11 explanation template');
$check($has($overview, 'Add credential type'), 'overview: contribute band');
$classic = do_shortcode('[fides_credential_catalog]');
$check(! $has($classic, 'data-design="pilot"'), 'classic shortcode stays classic');

// ---------- Access ----------

$check(Fides_Credential_Design::update_url(Fides_Credential_Design::find('cred:eu:ehic')) === '', 'guest: no direct update link');
$admins = get_users(array('role' => 'administrator', 'fields' => 'ID', 'number' => 1));
if ($admins) {
    wp_set_current_user((int) $admins[0]);
    $check(Fides_Credential_Design::can_edit(Fides_Credential_Design::find('cred:eu:ehic')), 'administrator can edit');
    $check(Fides_Credential_Design::update_url(Fides_Credential_Design::find('cred:eu:ehic')) !== '', 'administrator gets the update link');
    wp_set_current_user(0);
}

$flush();

foreach ($results['fail'] as $message) {
    echo "not ok - {$message}\n";
}
printf("# pass %d\n# fail %d\n", $results['pass'], count($results['fail']));
if ($results['fail']) {
    exit(1);
}
