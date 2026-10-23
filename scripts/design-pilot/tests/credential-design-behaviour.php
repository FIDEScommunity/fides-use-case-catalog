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
            array('name' => 'contacts', 'type' => 'array'),
            array('name' => 'contacts/item/email', 'type' => 'string'),
            array('name' => 'contacts/item/phone', 'type' => 'string'),
        ),
        'schemaComment'        => 'Generated <i>draft</i> schema.',
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
$ehic_meta = substr($ehic, strpos($ehic, 'fides-credential-detail__meta'), strpos($ehic, 'fides-credential-detail__actions') - strpos($ehic, 'fides-credential-detail__meta'));
$check($has($ehic_meta, '<span class="fides-credential-detail__formats"><span class="fides-credential-detail__formats-label">Formats</span><span class="fides-credential-format-label">mDoc</span><span class="fides-credential-format-label">SD-JWT VC</span></span>'), 'EHIC hero: one static label per format');
$check($has($ehic_meta, '<span class="fides-credential-detail__facts">Subject · Person</span>') && ! $has($ehic_meta, 'mDoc · ') && ! preg_match('/<(a|button)\b|tabindex|role="button"/', substr($ehic_meta, 0, strpos($ehic_meta, 'fides-credential-detail__facts'))), 'EHIC hero: subject apart from the formats; labels are not controls');
$check(substr_count($render('cred:webuild:eucc'), 'class="fides-credential-format-label"') === 1, 'EUCC hero: one format label');
$check(substr_count($ehic, 'data-credential-format-panel') === 2, 'EHIC: one panel per format');
$check($has($ehic, 'role="tablist"') && preg_match('/<div[^>]*role="tablist"[^>]*hidden/', $ehic) === 1, 'EHIC: tablist stays hidden until JS enhances it');
$check($has($ehic, 'eu.europa.ec.eudi.ehic.1') && $has($ehic, 'urn:eudi:ehic:1'), 'EHIC: docType and VCT per format');
$check($has($ehic, 'docType') && $has($ehic, '>VCT<'), 'EHIC: format-specific identifier labels');
$check($has($ehic, 'The attribute index is shared at credential-type level.'), 'EHIC: shared attribute index note');
$check($has($ehic, '12 indexed fields · 8 top-level'), 'EHIC: attribute counts');
$check($has($ehic, 'data-fides-ds-show-all="8"') && $has($ehic, 'id="attributes-list"'), 'EHIC: attributes show-all');
$check($has($ehic, 'Schema metadata · TS11') && $has($ehic, 'data-fides-ds-collapsible="closed"'), 'EHIC: TS11 panel (accordion on narrow screens)');
$check(! $has($ehic, 'fides-ds-status fides-credential-ts11-status'), 'EHIC: no TS11 metadata marker');
$check($has($ehic, '<p class="fides-credential-ts11__summary">2 supported formats. Rulebook, trusted authorities, security level and holder binding are not provided.</p>'), 'EHIC: short TS11 explanation from field presence');
$check($has($ehic, '<dt>API metadata coverage</dt><dd>Partial</dd>'), 'EHIC: API metadata coverage is partial');
$check($has($ehic, '<dt>Source URIs</dt><dd>2 schema links</dd>'), 'EHIC: two typed schema links');
$check(preg_match('/<button type="button" class="fides-credential-ts11__toggle" data-credential-ts11-toggle aria-expanded="true" aria-controls="ts11-technical" hidden>/', $ehic) === 1 && $has($ehic, 'id="ts11-technical"'), 'EHIC: technical metadata toggle (hidden until JS closes the panel)');
$check($has($ehic, 'Technical metadata · EHIC'), 'EHIC: technical metadata caption');
$labels = array('Metadata ID', 'Version', 'Rulebook', 'Trusted authorities', 'Security level', 'Holder binding', 'Formats (TS11)', 'Source URIs', 'API metadata coverage');
preg_match_all('/<dt>([^<]+)<\/dt>/', substr($ehic, strpos($ehic, 'id="ts11-technical"'), strpos($ehic, 'fides-credential-ts11__foot') - strpos($ehic, 'id="ts11-technical"')), $ts11_dts);
$check($ts11_dts[1] === $labels, 'EHIC: TS11 rows use the readable labels in order (' . implode(', ', $ts11_dts[1]) . ')');
$check(! $has($ehic, '<dt>SchemaMeta.id</dt>') && ! $has($ehic, '<dt>schemaURIs</dt>'), 'EHIC: no raw TS11 keys as row labels');
$check($has($ehic, '<code class="fides-credential-code">mso_mdoc · dc+sd-jwt</code>') || $has($ehic, '<code class="fides-credential-code">dc+sd-jwt · mso_mdoc</code>'), 'EHIC: TS11 formats');
$check($has($ehic, 'projected from catalog version 1'), 'EHIC: semantic version is labelled as a projection');
$check($has($ehic, 'data-fides-ds-term="' . Fides_Credential_Design::TS11_TEMPLATE . '"') && $has($ehic, '<template id="' . Fides_Credential_Design::TS11_TEMPLATE . '"'), 'EHIC: Explain opens the per-record TS11 template');
$check($has($ehic, 'id="sources"') && $has($ehic, 'Catalog data on GitHub'), 'EHIC: sources section with the data source');
$check(! $has($ehic, 'QEAA</span>') && ! $has($ehic, 'fides-credential-qeaa') && ! preg_match('/class="fides-ds-status[^"]*">(EAA|QEAA|PID)</', $ehic), 'EHIC: no EAA/QEAA/PID status is derived');
$check($has($ehic, 'https://api.fides.community/api/public/credentialtype/cred%3Aeu%3Aehic'), 'EHIC: API record links to the public credentialtype endpoint');
$check($has($ehic, 'Help keep this credential type current.'), 'EHIC: shared closing');
$check($has($ehic, 'data-credential-source-note') && $has($ehic, 'This schema was automatically generated from EUDI issuer metadata and may be provisional or incomplete.'), 'EHIC: schema source note from the schema $comment');

$ehic_ts11 = Fides_Credential_Design::ts11(Fides_Credential_Design::find('cred:eu:ehic'));
$check(in_array('trustedAuthorities', $ehic_ts11['missing'], true) && in_array('attestationLoS', $ehic_ts11['missing'], true), 'EHIC: API missing list names trustedAuthorities and attestationLoS');
$check($ehic_ts11['level'] === 'partial', 'EHIC: API level partial');

// ---------- EUCC: rich TS11 record ----------

$eucc_item = Fides_Credential_Design::find('cred:webuild:eucc');
$eucc      = $render('cred:webuild:eucc');
$check(Fides_Credential_Design::has_ts11_marker($eucc_item), 'EUCC: TS11 metadata marker');
$check($has($eucc, 'fides-ds-status fides-credential-ts11-status">TS11 metadata<'), 'EUCC: marker in the TS11 panel');
$check(! $has($eucc, 'data-credential-format-panel') && ! $has($eucc, 'role="tablist"') && $has($eucc, 'urn:eudi:eucc:1'), 'EUCC: single format without tabs, VCT shown');
$check($has($eucc, '66 indexed fields · 30 top-level'), 'EUCC: 66 indexed fields, 30 top-level');
$eucc_tree = Fides_Credential_Design::attribute_tree($eucc_item);
$eucc_rep  = array_values(array_filter($eucc_tree, static function ($node) {
    return $node['path'] === 'legal_representative';
}));
$check(count($eucc_tree) === 30, 'EUCC: attribute tree has 30 roots (' . count($eucc_tree) . ')');
$check(count($eucc_rep) === 1 && count($eucc_rep[0]['children'] ?? array()) === 7, 'EUCC: seven representative fields nest under legal_representative');
$check(count($eucc_rep) === 1 && in_array('full_name', array_column($eucc_rep[0]['children'] ?? array(), 'name'), true), 'EUCC: nested labels drop the array item segment');
$check($has($eucc, 'High · ISO/IEC 18045'), 'EUCC: attestationLoS label');
$check($has($eucc, 'View rulebook'), 'EUCC: rulebook link');
$check($has($eucc, '<p class="fides-credential-ts11__summary">Format, source, rulebook, security level and holder binding are provided. Trusted authorities are not provided.</p>'), 'EUCC: short TS11 explanation names provided and missing fields');
$check($has($eucc, '<dt>Source URIs</dt><dd>1 schema link</dd>') && $has($eucc, '<dt>API metadata coverage</dt><dd>Partial</dd>'), 'EUCC: one schema link, partial coverage');
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
$check($has($obc, '<p class="fides-credential-ts11__summary">Issuer metadata is linked; an attribute index is not available. Rulebook, trusted authorities, security level and holder binding are not provided.</p>'), 'OBC: short TS11 explanation names the issuer metadata endpoint');
$check($has($obc, '<dt>Source URIs</dt><dd>1 issuer metadata endpoint; not an attribute-schema link</dd>'), 'OBC: TS11 names the issuer metadata endpoint, not a schema link');
$obc_ts11 = Fides_Credential_Design::ts11(Fides_Credential_Design::find('cred:eduwallet:open-badge'));
$check($obc_ts11['schema_uris'] === 1 && ! in_array('schemaURIs', $obc_ts11['missing'], true), 'OBC: API projection still counts the URI under schemaURIs');
$obc_tpl = substr($obc, strpos($obc, '<template id="' . Fides_Credential_Design::TS11_TEMPLATE . '"'));
$check($has($obc_tpl, 'issuer metadata endpoint') && preg_match('/Provided:<\/strong>[^<]*schema/', $obc_tpl) !== 1 && preg_match('/Not provided:<\/strong>[^<]*attribute-schema link/', $obc_tpl) === 1, 'OBC: Explain dialog does not count the endpoint as a schema link');
$check(Fides_Credential_Design::source_uri_kind('https://example.org/s.json', '') === 'source' && Fides_Credential_Design::source_uris_label(array('endpoint' => 0, 'schema' => 0, 'source' => 2)) === '2 source links', 'Untyped URIs are generic source links');
$check(Fides_Credential_Design::category_label('health') === 'Health' && Fides_Credential_Design::category_label('identity') === 'Identity' && Fides_Credential_Design::category_label('professional') === 'Professional' && Fides_Credential_Design::category_label('custom-x') === 'custom-x', 'Category display labels by explicit mapping');

// ---------- vLEI and mDL edge cases ----------

$vlei_ts11 = Fides_Credential_Design::ts11(Fides_Credential_Design::find('cred:gleif:legal-entity-vlei'));
$check($vlei_ts11['level'] === 'compatible' && $vlei_ts11['version'] === '', 'vLEI: unmapped format, non-numeric version');
$vlei = $render('cred:gleif:legal-entity-vlei');
$check($has($vlei, 'is not numeric') && $has($vlei, 'no TS11 format identifier'), 'vLEI: version and format gaps are explained');

$mdl = $render('cred:iso:mdl');
$check($has($mdl, 'recorded, not resolved') || $has($mdl, 'scheme'), 'mDL: trusted authority reference shown');

// ---------- Column split, Credential details, Tags, navigation (Paper 20.8 / 20.19 / 20.33-20.35) ----------

$columns = static function (string $html): array {
    $main  = strpos($html, 'fides-credential-detail__main');
    $aside = strpos($html, 'fides-credential-detail__aside');
    $after = strpos($html, '<section class="fides-credential-eco"');
    if ($after === false) {
        $after = strpos($html, 'id="listing"');
    }
    return array(
        'main'  => $main === false || $aside === false ? '' : substr($html, $main, $aside - $main),
        'aside' => $aside === false || $after === false ? '' : substr($html, $aside, $after - $aside),
    );
};
$section_ids = static function (string $html): array {
    preg_match_all('/<section class="[^"]*" id="([a-z0-9-]+)"/', $html, $m);
    return $m[1];
};
$block = static function (string $html, string $id): string {
    $start = strpos($html, 'id="' . $id . '"');
    if ($start === false) {
        return '';
    }
    $start = strrpos(substr($html, 0, $start), '<section');
    return substr($html, $start, strpos($html, '</section>', $start) - $start);
};

foreach (array('cred:eu:ehic' => 'EHIC', 'cred:webuild:eucc' => 'EUCC', 'cred:eduwallet:open-badge' => 'OBC') as $layout_id => $label) {
    $html = $render($layout_id);
    $item = Fides_Credential_Design::find($layout_id);
    $cols = $columns($html);
    $main_ids  = $section_ids($cols['main']);
    $aside_ids = $section_ids($cols['aside']);
    $expected_main = array_values(array_filter(array('overview', Fides_Credential_Design::use_cases_for($layout_id) ? 'use-cases' : '', 'attributes')));
    $check($main_ids === $expected_main, "$label: main column holds " . implode(', ', $expected_main) . ' (' . implode(', ', $main_ids) . ')');
    $check($aside_ids === array('details', 'formats', 'ts11', 'tags', 'sources'), "$label: context column holds details, formats, TS11, tags, sources (" . implode(', ', $aside_ids) . ')');
    $check($has($cols['aside'], 'data-credential-formats') && ! $has($cols['aside'], 'id="attributes-list"') && ! $has($cols['aside'], 'No attribute index'), "$label: attributes stay in the main column");

    $details = $block($html, 'details');
    $check($has($details, '<h2 class="fides-ds-panel__title" id="details-title">Credential details</h2>'), "$label: Credential details block");
    $check($has($details, '<dt>Authority</dt>') && $has($details, esc_html(Fides_Credential_Design::authority_name($item))), "$label: authority in Credential details");
    $subject = trim((string) ($item['subjectType'] ?? ''));
    $check($subject === '' || $has($details, '<dt>Subject type</dt><dd>' . esc_html($subject) . '</dd>'), "$label: subject type in Credential details");
    $category = trim((string) ($item['category'] ?? ''));
    $check($category === '' || $has($details, '<dt>Category</dt><dd>' . esc_html(Fides_Credential_Design::category_label($category)) . '</dd>'), "$label: category display label in Credential details");
    $check($category === '' || ! $has($details, '<dd>' . esc_html($category) . '</dd>') || $category === Fides_Credential_Design::category_label($category), "$label: raw category code not shown");
    foreach (array('ecosystems' => 'Ecosystem', 'themes' => 'Theme', 'sectors' => 'Sectors') as $field => $dt) {
        $labels = Fides_Credential_Design::taxonomy_labels($item, $field);
        $check($labels ? $has($details, '<dt>' . $dt . '</dt><dd>' . esc_html(implode(' · ', $labels)) . '</dd>') : ! $has($details, '<dt>' . $dt . '</dt>'), "$label: $dt only when recorded");
    }
    $check($has($details, 'data-fides-ds-term="' . Fides_Credential_Design::ATTESTATIONS_TEMPLATE . '"') && $has($html, '<template id="' . Fides_Credential_Design::ATTESTATIONS_TEMPLATE . '"'), "$label: Credentials & attestations explained from Credential details");

    $tags = array_values(array_unique(array_filter(array_map('trim', array_filter((array) ($item['tags'] ?? array()), 'is_string')), 'strlen')));
    $tag_block = $block($html, 'tags');
    $check(substr_count($tag_block, '<li class="fides-ds-tag">') === count($tags) && $has($tag_block, 'fides-ds-tags'), "$label: separate tag block with the recorded tags (" . count($tags) . ')');
    foreach ($tags as $tag) {
        $check($has($tag_block, '<span aria-hidden="true">#</span>' . esc_html($tag) . '</li>'), "$label: tag $tag shown as #label, value unchanged");
    }

    $sources = $block($html, 'sources');
    $check($has($sources, 'Catalog data on GitHub') && $has($sources, 'View API record'), "$label: Sources keeps the data source and API record");
    $check(! $has($sources, 'Schema sources') && ! $has($sources, 'Classification') && ! $has($sources, '<dt>Tags</dt>') && ! $has($sources, 'Sectors'), "$label: Sources holds no schema, classification or tag rows");
    foreach (Fides_Credential_Design::formats($item) as $format) {
        foreach ($format['schemas'] as $schema) {
            $check(! $has($sources, esc_url($schema['uri'])) && substr_count($cols['aside'], 'href="' . esc_url($schema['uri']) . '"') === 1, "$label: schema link listed once, with its format");
        }
    }

    $check($has($html, 'href="#attributes">Attributes</a>') && $has($html, 'href="#formats">Formats &amp; identifiers</a>') && $has($html, 'href="#ts11">Schema metadata · TS11</a>'), "$label: separate Attributes, Formats & identifiers and TS11 links");
    $check(! $has($html, 'Formats &amp; attributes') && ! $has($html, 'Formats & attributes'), "$label: no combined Formats & attributes link");
    $check($has($block($html, 'attributes'), '<h2 class="fides-ds-heading-2 fides-credential-attrs__title" id="attributes-title">Attributes</h2>'), "$label: Attributes is its own section");

    $check(preg_match('/id="formats"[^>]*data-fides-ds-collapsible="open"/', $html) === 1, "$label: Formats accordion starts open");
    $check(preg_match('/id="ts11"[^>]*data-fides-ds-collapsible="closed"/', $html) === 1 && preg_match('/id="sources"[^>]*data-fides-ds-collapsible="closed"/', $html) === 1, "$label: TS11 and Sources accordions start closed");
    $check(! $has($details, 'data-fides-ds-collapsible') && ! $has($tag_block, 'data-fides-ds-collapsible'), "$label: Credential details and Tags are not accordions");
}

$ehic_formats = $block($ehic, 'formats');
$check($has($ehic_formats, 'data-credential-source-note') && $has($ehic_formats, 'Schema description'), 'EHIC: schema source note and description sit with Formats & identifiers');
$obc_formats = $block($render('cred:eduwallet:open-badge'), 'formats');
$check($has($obc_formats, 'Metadata endpoint') && $has($obc_formats, 'Schema type: Other'), 'OBC: metadata endpoint and schema type stay with the format');

$about = Fides_Credential_Design::attestations_template();
$check($has($about, 'data-fides-ds-term-title="Credentials &amp; attestations"') && $has($about, 'Credential is the broad term used in this catalog.') && $has($about, 'QEAA: a qualified EAA') && $has($about, 'it does not mean “non-qualified”'), 'Credentials & attestations: approved text of Paper 20.35');
$check($has($about, esc_url(Fides_Credential_Design::EIDAS_REGULATION_URL)) && $has($about, 'Regulation (EU) 2024/1183 · Article 3(44–46), Annex V'), 'Credentials & attestations: regulation source');

$bare_details = $block($render('cred:pilot-test:bare'), 'details');
$check($bare_details !== '' && ! $has($bare_details, '<dl'), 'bare: Credential details shows no empty rows');
$check(! $has($render('cred:pilot-test:bare'), 'id="tags"'), 'bare: no tag block without tags');

// ---------- Ecosystem connections (Paper 20.36-20.38) ----------

$section_of = static function (string $html): string {
    $start = strpos($html, '<section class="fides-credential-eco"');
    return $start === false ? '' : substr($html, $start, strpos($html, '</section>', $start) - $start);
};
$names_in = static function (string $html, string $list_id): array {
    $start = strpos($html, 'id="' . $list_id . '"');
    if ($start === false) {
        return array();
    }
    $list = substr($html, $start, strpos($html, '</ul>', $start) - $start);
    preg_match_all('#<span class="fides-org-eco__name fides-credential-eco__name">(.*?)</span>#', $list, $m);
    return array_map('html_entity_decode', $m[1]);
};

$av_id      = 'cred:eu:age-verification';
$av_html    = $render($av_id);
$av_eco     = $section_of($av_html);
$av_issuers = Fides_Credential_Design::issuers_for($av_id);
$av_rps     = Fides_Credential_Design::relying_parties_for($av_id);
$av_wallets = Fides_Credential_Design::wallets_for($av_id);
$ni = count($av_issuers);
$nr = count($av_rps);
$nw = count($av_wallets);
$check($ni > 3 && $nr > 3 && $nw > 1, "AV: rich ecosystem snapshot ($ni issuers, $nr relying parties, $nw wallets)");
$check($av_eco !== '' && $has($av_html, 'href="#ecosystem"'), 'AV: ecosystem section and nav entry');
$p_aside   = strpos($av_html, 'fides-credential-detail__aside');
$p_eco     = strpos($av_html, '<section class="fides-credential-eco"');
$p_closing = strpos($av_html, 'id="listing"');
$check($p_aside !== false && $p_eco > $p_aside && $p_eco < $p_closing, 'AV: ecosystem sits below main/aside and above the closing');
$role_count = static fn(string $role, int $n): string => $role . '<span class="fides-credential-eco__role-count"> · ' . $n . '</span>';
$badge      = static fn(int $n): string => '<span class="fides-uc-detail__count fides-credential-eco__count">' . $n . '</span>';
$check($has($av_eco, 'Who issues it?') && $has($av_eco, $badge($ni)) && $has($av_eco, $role_count('Issuers', $ni)), 'AV: issuer group with the small count badge and the accordion role line');
$check($has($av_eco, 'Where is it accepted?') && $has($av_eco, $badge($nr)) && $has($av_eco, $role_count('Relying parties', $nr)), 'AV: relying-party group with dynamic count');
$check($has($av_eco, 'Which wallets?') && $has($av_eco, $badge($nw)) && $has($av_eco, $role_count('Wallets', $nw)), 'AV: wallet group with dynamic count');
$check(! $has($av_eco, '<span aria-hidden="true">·</span> '), 'AV: the badge carries the number only');
$check(! $has($av_eco, 'Not specified</p>') && ! $has($av_eco, 'fides-credential-eco__missing-note'), 'AV: no Not specified state when every role has links');
$check(strpos($av_eco, 'Who issues it?') < strpos($av_eco, 'Which wallets?') && strpos($av_eco, 'Which wallets?') < strpos($av_eco, 'Where is it accepted?'), 'AV: order issuers, wallets, relying parties');
$check($has($av_eco, 'fides-credential-eco__groups--3') && substr_count($av_eco, 'data-fides-ds-wide-min="1280"') === 3, 'AV: three groups switch to columns from 1280px');
$check(substr_count($av_eco, 'class="fides-org-eco__row fides-credential-eco__row" href="') === $ni + $nr, 'AV: one shared relation row (with status) per issuer and relying party');
$check(substr_count($av_eco, 'class="fides-org-eco__row fides-credential-eco__row fides-credential-eco__row--plain" href="') === $nw, 'AV: one plain relation row per wallet, without a status slot');
$check(substr_count($av_eco, 'data-fides-ds-show-all="3" data-fides-ds-show-all-wide data-fides-ds-show-all-follow') === 3, 'AV: all three lists show three rows until View all, and open fully in the accordion');
$check($has($av_eco, 'data-fides-ds-show-all-more="View all"') && $has($av_eco, 'data-fides-ds-show-all-fewer="Show fewer issuers"') && $has($av_eco, 'data-fides-ds-show-all-fewer="Show fewer wallets"') && $has($av_eco, 'data-fides-ds-show-all-fewer="Show fewer relying parties"'), 'AV: View all / Show fewer labels per group');
$check(substr_count($av_eco, 'data-fides-ds-collapsible="closed"') === 3, 'AV: groups are shared collapsibles, closed by default');
$check($has($av_eco, '<p class="fides-credential-eco__intro">Wallets named by these relying parties.</p>'), 'AV: wallet group says the wallets are named by these relying parties');
$check(! $has($av_eco, 'overflow') && ! $has($av_html, 'fides-credential-flow') && ! $has($av_html, 'fides-credential-rel'), 'AV: no conceptual flow or old relation markup');
$sorted = static function (array $names): array {
    $copy = $names;
    if (class_exists('Collator')) {
        (new Collator('en'))->sort($copy);
    } else {
        usort($copy, 'strcasecmp');
    }
    return $copy;
};
$issuer_names = $names_in($av_eco, 'eco-issuers-list');
$rp_names     = $names_in($av_eco, 'eco-rps-list');
$check(count($issuer_names) === $ni && $issuer_names === $sorted($issuer_names), 'AV: issuers listed alphabetically');
$check(count($rp_names) === $nr && $rp_names === $sorted($rp_names), 'AV: relying parties listed alphabetically');
$issuer_ids = array_column($av_issuers, 'id');
$rp_ids     = array_column($av_rps, 'id');
$check($has($av_eco, 'Open these ' . $ni . ' in the issuer catalog') && $has($av_eco, esc_url(Fides_Credential_Design::issuers_catalog_url($issuer_ids))), 'AV: filtered issuer catalog route');
$check($has(Fides_Credential_Design::issuers_catalog_url($issuer_ids), 'issuers=' . rawurlencode((string) $issuer_ids[0])), 'AV: issuer route lists the issuer ids');
$check($has($av_eco, 'Open these ' . $nr . ' in the relying party catalog') && $has(Fides_Credential_Design::rps_catalog_url($rp_ids), 'rps='), 'AV: filtered relying-party catalog route');
$check($has(Fides_Credential_Design::issuer_url('x y'), 'issuer=x%20y') && $has(Fides_Credential_Design::rp_url('a'), 'rp=a'), 'single records keep the ?issuer= / ?rp= deeplinks');
$wallet_ids = array_column($av_wallets, 'id');
$check(count($wallet_ids) === count(array_unique($wallet_ids)), 'AV: wallets deduplicated by id');
$expected_via = array();
foreach ($av_rps as $rp) {
    foreach ((array) ($rp['supportedWallets'] ?? array()) as $sw) {
        $wid = is_array($sw) ? trim((string) ($sw['walletCatalogId'] ?? '')) : '';
        if ($wid !== '') {
            $expected_via[ $wid ][ (string) $rp['id'] ] = (string) $rp['name'];
        }
    }
}
$check(array_keys($expected_via) == array_values($wallet_ids) || count(array_diff($wallet_ids, array_keys($expected_via))) === 0 && count($expected_via) === $nw, 'AV: wallets come only from supportedWallets.walletCatalogId of the linked relying parties');
$wallet_names = $names_in($av_eco, 'eco-wallets-list');
$check(count($wallet_names) === $nw && $wallet_names === $sorted($wallet_names), 'AV: wallets listed alphabetically');
foreach ($av_wallets as $wallet) {
    $via = array_values($expected_via[ $wallet['id'] ] ?? array());
    $via = $sorted($via);
    $meta = 'Named by ' . $via[0] . (count($via) > 1 ? ' and other services' : '');
    $check($wallet['via'] === $via && $has($av_eco, 'href="' . esc_url(Fides_Credential_Design::wallet_url($wallet['id'])) . '"><span class="fides-credential-eco__text"><span class="fides-org-eco__name fides-credential-eco__name">' . esc_html($wallet['name']) . '</span><span class="fides-credential-eco__meta">' . esc_html($meta) . '</span>'), "AV: wallet {$wallet['id']} row names its relying party and opens its record ($meta)");
    $check((bool) preg_match('/[?&]wallet=' . preg_quote(rawurlencode($wallet['id']), '/') . '(&|$)/', Fides_Credential_Design::wallet_url($wallet['id'])), "AV: wallet {$wallet['id']} link opens that wallet record (?wallet=)");
}
$check($has($av_eco, 'Open these ' . $nw . ' in the wallet catalog') && $has($av_eco, esc_url(Fides_Credential_Design::wallets_catalog_url($wallet_ids))) && $has(Fides_Credential_Design::wallets_catalog_url($wallet_ids), 'wallets='), 'AV: filtered wallet catalog route');
$check($has($av_eco, '<p class="fides-ds-meta fides-credential-eco__note">These catalog connections do not guarantee that every issuer, wallet and service works together.</p>'), 'AV: catalog connections are not presented as compatibility');
$check(! $has($av_eco, 'Wallets linked through') && ! $has($av_eco, 'fides-credential-eco__wallets'), 'AV: the separate wallet link is replaced by the wallet group');
$readiness = array_filter(array_map(static fn($rp) => (string) ($rp['readiness'] ?? ''), $av_rps));
foreach (array_unique($readiness) as $value) {
    $label = Fides_Credential_Design::rp_status(array('readiness' => $value));
    $check($has($av_eco, 'Status: </span>' . esc_html($label) . '</span>'), "AV: relying-party readiness $value shows as $label");
}
$check(Fides_Credential_Design::rp_status(array('readiness' => 'production-pilot')) === 'Pilot' && Fides_Credential_Design::rp_status(array('readiness' => 'technical-demo')) === 'Technical demo' && Fides_Credential_Design::rp_status(array('readiness' => 'use-case-demo')) === 'Demo' && Fides_Credential_Design::rp_status(array()) === '', 'RP readiness labels keep Pilot, Demo and Technical demo apart, and invent none');
$check($has($av_html, 'Help keep this credential type current.') && $has($av_html, 'class="fides-org-closing__date"'), 'AV: closing title and date kept below the ecosystem');

$ehic_eco = $section_of($render('cred:eu:ehic'));
$check($has($ehic_eco, $role_count('Issuers', count(Fides_Credential_Design::issuers_for('cred:eu:ehic')))) && $has($ehic_eco, $role_count('Relying parties', count(Fides_Credential_Design::relying_parties_for('cred:eu:ehic')))), 'EHIC: shared template shows both groups');

// Roles without links: always the three roles, a static "Not specified" state, no zero count or empty action.
$missing_texts = array(
    'issuers' => 'No issuer is recorded for this credential type.',
    'wallets' => 'No wallet is recorded through the linked relying parties.',
    'rps'     => 'No relying party is recorded for this credential type.',
);
$group_of = static function (string $eco, string $key): string {
    $start = strpos($eco, 'fides-credential-eco__group--' . $key);
    if ($start === false) {
        return '';
    }
    $next = strpos($eco, 'class="fides-credential-eco__group ', $start + 1);
    $end  = $next !== false ? $next : strpos($eco, '</div><p class="fides-ds-meta', $start);
    return substr($eco, $start, $end - $start);
};
$eco_cases = array(
    'cred:eu:loyalty'           => array('wallets'),
    'cred:eduwallet:open-badge' => array('issuers'),
    'cred:webuild:eucc'         => array('wallets', 'rps'),
    'cred:uidai:aadhaar'        => array('issuers', 'wallets'),
);
foreach ($eco_cases as $id => $missing_keys) {
    $label = $id;
    $html  = $render($id);
    $eco   = $section_of($html);
    $check($eco !== '' && $has($html, 'href="#ecosystem"'), "$label: ecosystem section and nav entry with at least one link");
    $check(strpos($eco, 'Who issues it?') !== false && strpos($eco, 'Who issues it?') < strpos($eco, 'Which wallets?') && strpos($eco, 'Which wallets?') < strpos($eco, 'Where is it accepted?') && $has($eco, 'fides-credential-eco__groups--3'), "$label: all three roles in order");
    $check(substr_count($eco, 'data-fides-ds-wide-min="1280"') === 3 - count($missing_keys), "$label: only roles with links are collapsibles (columns from 1280px)");
    $check($has($eco, '<p class="fides-ds-meta fides-credential-eco__missing-note">Not specified means no link is recorded in this catalog.</p>'), "$label: shared Not specified note");
    $check($has($eco, '<p class="fides-ds-meta fides-credential-eco__note">These catalog connections do not guarantee that every issuer, wallet and service works together.</p>'), "$label: compatibility note kept");
    foreach (array('issuers' => 'Issuers', 'wallets' => 'Wallets', 'rps' => 'Relying parties') as $key => $role) {
        $group = $group_of($eco, $key);
        if (in_array($key, $missing_keys, true)) {
            $check($has($group, 'fides-credential-eco__group--missing') && $has($group, '<p class="fides-credential-eco__role">' . $role . '<span class="fides-credential-eco__role-state"> · Not specified</span></p>') && $has($group, '<p class="fides-credential-eco__missing">Not specified</p>') && $has($group, '<p class="fides-credential-eco__missing-text">' . $missing_texts[$key] . '</p>'), "$label: $key says Not specified with its explanation");
            $check((bool) preg_match('#<h3 class="fides-credential-eco__title" id="eco-' . $key . '-title">#', $group), "$label: $key keeps a real heading");
            $check(! preg_match('/<(a|button|ul)\b|tabindex|aria-expanded|data-fides-ds-collapsible|data-fides-ds-show-all|__count|View all|catalog/', $group), "$label: $key has no badge, list, button, link or accordion");
        } else {
            $check($has($group, 'data-fides-ds-collapsible="closed"') && ! $has($group, 'Not specified</p>') && ! $has($group, '>0</span>'), "$label: $key with links stays a collapsible, no zero count");
        }
    }
}
$aad_eco = $section_of($render('cred:uidai:aadhaar'));
$aad_rps = Fides_Credential_Design::relying_parties_for('cred:uidai:aadhaar');
$check(count($aad_rps) === 1 && $has($aad_eco, $badge(1)) && $has($aad_eco, $role_count('Relying parties', 1)) && ! $has($aad_eco, 'relying party catalog'), 'Aadhaar: one relying party, count 1, no list route');
$check(Fides_Credential_Design::wallets_for('cred:uidai:aadhaar') === array() && $has($aad_eco, 'No wallet is recorded through the linked relying parties.'), 'Aadhaar: no wallet is derived from the relying party without a wallet reference');
$obc_eco = $section_of($render('cred:eduwallet:open-badge'));
$check(! $has($obc_eco, 'fides-credential-eco__catalog') && $has($obc_eco, $role_count('Wallets', 1)) && $has($obc_eco, 'Wallets named by this relying party.'), 'OBC: single records need no catalog list route; wallet intro is singular');
$exam = $render('cred:eduwallet:exam-enrollment');
$check(Fides_Credential_Design::issuers_for('cred:eduwallet:exam-enrollment') === array() && ! $has($exam, 'id="ecosystem"') && ! $has($exam, 'href="#ecosystem"') && ! $has($exam, 'Not specified means'), 'exam enrollment: no links at all hides the section and its nav entry');

$eco_method = new ReflectionMethod('Fides_Credential_Detail_Page', 'ecosystem_html');
$eco_method->setAccessible(true);
$long_name = 'Municipal age attestation service for the Kingdom of the Netherlands and its overseas <b>territories</b>';
$fixture = $eco_method->invoke(
    null,
    'Fixture <i>type</i>',
    array(
        array('id' => 'iss-long', 'displayName' => $long_name, 'organization' => array('name' => 'Org & Co', 'country' => 'nl')),
        array('id' => 'iss-prod', 'displayName' => 'Live issuer', 'environment' => 'production', 'organization' => array('name' => 'Live org')),
    ),
    array(array('id' => 'rp-none', 'name' => 'Unlabelled verifier')),
    array()
);
$check(substr_count($fixture, 'fides-credential-eco__status--unknown">') === 2 && substr_count($fixture, '<span class="fides-ds-visually-hidden">Status: </span>Not specified') === 2, 'fixture: missing status says Not specified, never a guessed one');
$check($has($fixture, 'fides-credential-eco__status--production"><span class="fides-ds-visually-hidden">Status: </span>Production'), 'fixture: production status gets its own badge');
$check($has($fixture, esc_html($long_name)) && ! $has($fixture, '<b>territories</b>') && ! $has($fixture, '<i>type</i>'), 'fixture: long and unsafe names are escaped, not shortened');
$check($has($fixture, 'Org &amp; Co · NL'), 'fixture: organization with country code');
$check($has($fixture, 'Open these 2 in the issuer catalog') && ! $has($fixture, 'relying party catalog'), 'fixture: list route only for groups with more than one record');
$check($has($fixture, 'Which wallets?') && $has($fixture, 'No wallet is recorded through the linked relying parties.') && substr_count($fixture, 'data-fides-ds-wide-min="1280"') === 2, 'fixture: wallet role stays as Not specified without linked wallets');
$none = $eco_method->invoke(null, 'Fixture', array(), array(), array(array('id' => 'w-only', 'name' => 'Only wallet', 'via' => array())));
$check($has($none, 'Which wallets?') && substr_count($none, 'fides-credential-eco__group--missing') === 2 && $has($none, 'No issuer is recorded for this credential type.') && $has($none, 'No relying party is recorded for this credential type.'), 'fixture: one role with links shows the other two as Not specified');
$fixture_w = $eco_method->invoke(
    null,
    'Fixture',
    array(),
    array(array('id' => 'rp-a', 'name' => 'A verifier'), array('id' => 'rp-b', 'name' => 'B verifier')),
    array(array('id' => 'w-long', 'name' => $long_name, 'via' => array('A verifier', 'B verifier')))
);
$wallet_list = substr($fixture_w, strpos($fixture_w, 'id="eco-wallets-list"'), strpos($fixture_w, 'id="eco-rps-title"') - strpos($fixture_w, 'id="eco-wallets-list"'));
$check($has($wallet_list, esc_html($long_name)) && $has($wallet_list, 'Named by A verifier and other services') && ! $has($wallet_list, 'Status: '), 'fixture: long wallet name kept whole, provenance names the first relying party, no status');

// ---------- Fixtures: escaping, long URI, nested attributes, bare record ----------

$bare = $render('cred:pilot-test:bare');
$check(! $has($bare, '<script>alert(1)</script>') && $has($bare, '&lt;script&gt;'), 'bare: display name is escaped');
$check(! $has($bare, 'id="overview"') && ! $has($bare, 'id="ecosystem"') && ! $has($bare, 'id="use-cases"'), 'bare: empty sections are left out');
$check($has($bare, 'Not provided'), 'bare: missing TS11 fields say Not provided');

$long = $render('cred:pilot-test:long');
$check($has($long, esc_url($long_uri)) && $has($long, 'fides-credential-uri'), 'long URI: full link kept with the wrapping class');
$check($has($long, '<details class="fides-credential-attr__details">') && $has($long, 'street'), 'nested attributes render inside their object');
$check(! $has($long, 'Street <b>name</b>') && $has($long, 'Street &lt;b&gt;name&lt;/b&gt;'), 'attribute descriptions are escaped');
$long_tree = Fides_Credential_Design::attribute_tree(Fides_Credential_Design::find('cred:pilot-test:long'));
$check(array_column($long_tree, 'path') === array('address', 'contacts'), 'array item fields without their own item row nest under the array');
$check(array_column($long_tree[1]['children'] ?? array(), 'name') === array('email', 'phone'), 'array item labels are relative to the array');
$check($has($long, 'Schema source note') && $has($long, 'Generated &lt;i&gt;draft&lt;/i&gt; schema.'), 'schema source note is escaped');
$check(! $has($render('cred:eduwallet:open-badge'), 'data-credential-source-note'), 'no source note without a schema $comment');

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

// ---------- Public catalog links (defaults, stored options, public wallet fallback) ----------

$rp_default     = 'https://fides.community/ecosystem-explorer/relying-party-catalog/';
$wallet_default = 'https://fides.community/ecosystem-explorer/personal-wallets/';
$check(FIDES_CREDENTIAL_CATALOG_DEFAULT_RP_CATALOG_URL === $rp_default, 'RP default is the ecosystem-explorer catalog');
$check(FIDES_CREDENTIAL_CATALOG_DEFAULT_WALLET_CATALOG_URL === $wallet_default, 'wallet default is the ecosystem-explorer personal wallets catalog');

$with_option = static function (string $option, $value, callable $run) {
    $filter = static function () use ($value) {
        return $value;
    };
    add_filter("pre_option_{$option}", $filter);
    try {
        return $run();
    } finally {
        remove_filter("pre_option_{$option}", $filter);
    }
};
$rp_opt     = 'fides_credential_catalog_rp_catalog_url';
$wallet_opt = 'fides_credential_catalog_wallet_catalog_url';

$check(Fides_Credential_Design::rp_url('eideasy-afterhours-cinema-demo') === $rp_default . '?rp=eideasy-afterhours-cinema-demo', 'default: one relying party opens ?rp= in the ecosystem-explorer catalog');
$check(Fides_Credential_Design::rps_catalog_url(array('a', 'b:c')) === $rp_default . '?rps=a,b%3Ac', 'default: several relying parties filter ?rps= with literal commas and ids encoded once');
$check(fides_credential_catalog_url_option($rp_opt, $rp_default) === $rp_default, 'missing option: default');
$check($with_option($rp_opt, '', static fn() => Fides_Credential_Design::rp_url('a')) === $rp_default . '?rp=a', 'empty stored option: falls back to the default');
$check($with_option($rp_opt, '   ', static fn() => Fides_Credential_Design::rp_url('a')) === $rp_default . '?rp=a', 'blank stored option: falls back to the default');
$check($with_option($rp_opt, 'https://staging.example.org/rp', static fn() => Fides_Credential_Design::rp_url('a')) === 'https://staging.example.org/rp/?rp=a', 'custom host and route are kept (trailing slash added)');
$check($with_option($rp_opt, 'https://example.org/rp/?lang=nl', static fn() => Fides_Credential_Design::rps_catalog_url(array('a', 'b'))) === 'https://example.org/rp/?lang=nl&rps=a,b', 'a query in the stored base is kept');
$check($with_option($rp_opt, 'https://example.org/rp/?rp=old#top', static fn() => Fides_Credential_Design::rp_url('new')) === 'https://example.org/rp/?rp=new', 'a stale ?rp= and fragment in the base are replaced');
$check($with_option($rp_opt, 'https://fides.community/community-tools/relying-party-catalog/', static fn() => Fides_Credential_Design::rp_url('a')) === 'https://fides.community/community-tools/relying-party-catalog/?rp=a', 'a stored former default is not rewritten at runtime (migration script)');

// Public wallet fallback: a non-local site and a wallet without a pilot record.
$public_site = static function () {
    return 'https://fides.community';
};
add_filter('site_url', $public_site);
$check(! fides_credential_catalog_is_local_site(), 'public-site simulation is active');
$check(Fides_Credential_Design::wallet_url('no-pilot-wallet') === $wallet_default . '?wallet=no-pilot-wallet', 'public fallback: one wallet opens its record with ?wallet=');
$check(Fides_Credential_Design::wallets_catalog_url(array('paradym-wallet', 'altid')) === $wallet_default . '?wallets=paradym-wallet,altid', 'public fallback: several wallets filter ?wallets=');
$check(Fides_Credential_Design::wallet_catalog_record_url('paradym-wallet') === $wallet_default . '?wallet=paradym-wallet', 'public fallback without the pilot: record link for a known wallet');
$check($with_option($wallet_opt, 'https://example.org/wallets?lang=nl', static fn() => Fides_Credential_Design::wallet_url('x y')) === 'https://example.org/wallets/?lang=nl&wallet=x%20y', 'custom wallet base with query is kept; id encoded once');
$check($with_option($wallet_opt, 'https://wallets.fides.community', static fn() => Fides_Credential_Design::wallet_catalog_record_url('a')) === 'https://wallets.fides.community/?wallet=a', 'a stored former wallet default is not rewritten at runtime (migration script)');
remove_filter('site_url', $public_site);
$check(fides_credential_catalog_is_local_site(), 'local site restored');
$check(Fides_Credential_Design::wallet_catalog_record_url('a') === home_url('/community-tools/personal-wallets/') . '?wallet=a', 'local site: wallet fallback stays on the local catalog route');
if (class_exists('Fides_Wallet_Design') && Fides_Wallet_Design::find('paradym-wallet') !== null) {
    $check($has(Fides_Credential_Design::wallet_url('paradym-wallet'), '/fides-design-pilot/wallet/?wallet=paradym-wallet'), 'local pilot: wallet with a pilot record keeps the pilot detail route');
}

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
