<?php
/**
 * Behaviour tests for the Manifesto page: original principles, supporter
 * selection and order from the organization catalog, tiles, empty data, sign
 * route. Fixtures are injected through filters; nothing is written.
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

// ---- Principles: seven, original wording, no placeholder text.
$p = Fides_DS_Manifesto::principles();
$check(count($p) === 7, 'seven principles');
$titles = array_column($p, 'title');
$check($titles === array(
    'must protect people’s rights',
    'depends on transparency and verifiability',
    'must ensure freedom of choice',
    'requires open standards & interoperability',
    'should be accessible for everybody',
    'is propelled by action',
    'is ever evolving',
), 'original principle titles in order');
$check(strpos($p[0]['text'], 'respectful environments that uphold privacy and foster trust.') !== false, 'principle 1 keeps its full text');
$check(strpos($p[2]['text'], 'respects the preferences of all users and stakeholders.') !== false, 'principle 3 keeps its full text');
$check(strpos($p[3]['text'], 'circumstances may justify deviations.') !== false, 'principle 4 keeps its full text');
$check(strpos($p[5]['text'], 'Think big and start small. Involving all stakeholders including individuals.') !== false, 'principle 6 keeps its full text');
$check(strpos($p[6]['text'], 'at any moment in time.') !== false, 'principle 7 keeps its full text');
$check(min(array_map(static function ($x) { return strlen($x['text']); }, $p)) > 200, 'no principle is a short summary');
$all_text = implode(' ', array_column($p, 'text'));
$check(stripos($all_text, 'full original') === false && stripos($all_text, 'summar') === false && stripos($all_text, 'placeholder') === false, 'no design placeholder text');

// ---- Supporter selection and order (synthetic records).
$orgs = array(
    array('id' => 'org:z', 'name' => 'Zeta', 'fidesManifestoSupporter' => true),
    array('id' => 'org:b', 'name' => 'beta Labs', 'fidesManifestoSupporter' => true),
    array('id' => 'org:i', 'name' => 'iLabs', 'fidesManifestoSupporter' => true),
    array('id' => 'org:id', 'name' => 'Identinet', 'fidesManifestoSupporter' => true),
    array('id' => 'org:im', 'name' => 'Impierce', 'fidesManifestoSupporter' => true),
    array('id' => 'org:no', 'name' => 'Not a supporter', 'fidesManifestoSupporter' => false),
    array('id' => 'org:str', 'name' => 'String flag', 'fidesManifestoSupporter' => 'true'),
    array('id' => 'org:one', 'name' => 'Number flag', 'fidesManifestoSupporter' => 1),
    array('id' => 'org:miss', 'name' => 'Missing flag'),
    array('id' => 'org:nn', 'name' => '  ', 'fidesManifestoSupporter' => true),
    array('id' => '', 'name' => 'No id', 'fidesManifestoSupporter' => true),
    'not an array',
);
$sel = Fides_DS_Manifesto::select_supporters($orgs);
$check(array_column($sel, 'id') === array('org:b', 'org:id', 'org:i', 'org:im', 'org:z'), 'only explicit true, alphabetical and case-insensitive: ' . implode(',', array_column($sel, 'id')));

// ---- The real catalog: every explicit supporter, no paging.
$source = Fides_Catalog_Source::for('organization');
$catalog = $source ? $source->all() : array();
$expected = count(array_filter($catalog, static function ($o) { return is_array($o) && ($o['fidesManifestoSupporter'] ?? null) === true; }));
$real = Fides_DS_Manifesto::supporters();
$check($expected > 0 && count($real) === $expected, 'every catalog supporter is listed (' . count($real) . ' of ' . $expected . ')');
$names = array_map(static function ($o) { return (string) $o['name']; }, $real);
$sorted = $names;
usort($sorted, static function ($a, $b) { $c = new Collator('en'); return (int) $c->compare($a, $b); });
$check($names === $sorted, 'real supporters are alphabetical');

$html = Fides_DS_Manifesto::render();
$check(substr_count($html, 'class="fides-manifesto__tile"') === $expected, 'one tile per supporter');
$check(strpos($html, 'data-fides-manifesto-count="' . $expected . '"') !== false, 'tile count attribute');
$check(stripos($html, 'show all') === false && stripos($html, 'load more') === false && stripos($html, 'pagination') === false, 'no paging or Show all');
$check(substr_count($html, 'fides-manifesto__principle"') === 7, 'seven principles rendered');

// ---- Tiles: logo, missing logo, profile link, escaping.
add_filter('fides_manifesto_supporter_source', static function () {
    return array(
        array('id' => 'org:with-logo', 'name' => 'With Logo', 'fidesManifestoSupporter' => true, 'logoUri' => 'https://example.org/logo.png'),
        array('id' => 'org:no-logo', 'name' => 'No Logo BV', 'fidesManifestoSupporter' => true),
        array('id' => 'org:bad-logo', 'name' => 'Bad Logo', 'fidesManifestoSupporter' => true, 'logoUri' => 'javascript:alert(1)'),
        array('id' => 'org:long', 'name' => 'A very long organization name that keeps going to test wrapping in a narrow tile ' . str_repeat('Supercalifragilistic', 3), 'fidesManifestoSupporter' => true),
        array('id' => 'org:amp', 'name' => 'Fish & <b>Chips</b>', 'fidesManifestoSupporter' => true),
    );
});
$html = Fides_DS_Manifesto::render(array('detail_url' => '/fides-design-pilot/organization/'));
$check(substr_count($html, 'class="fides-manifesto__tile"') === 5, 'fixture tiles');
$check(substr_count($html, '<img ') === 1 && strpos($html, 'https://example.org/logo.png') !== false, 'only a valid http logo becomes an image');
$check(strpos($html, 'javascript:') === false, 'unsafe logo URL is dropped');
$check(preg_match('~<span class="fides-ds-card__fallback fides-manifesto__name" aria-hidden="true">No Logo BV</span>~', $html) === 1, 'missing logo shows a visible name tile');
$check(preg_match('~<img[^>]*fides-manifesto__logo[^>]*alt=""[^>]*>\s*<span class="fides-ds-card__fallback fides-manifesto__name" aria-hidden="true" hidden>With Logo</span>~', $html) === 1, 'a logo comes with a hidden name tile for when it fails');
$check(strpos($html, 'Fish &amp; &lt;b&gt;Chips&lt;/b&gt;') !== false && strpos($html, '<b>Chips</b>') === false, 'names are escaped');
$check(substr_count($html, 'fides-ds-visually-hidden') >= 5, 'every tile has an accessible name');
$check(substr_count($html, 'data-org-id="') === 5, 'every tile links to a profile');
$check(strpos($html, home_url('/fides-design-pilot/organization/?org=org%3Acredenco')) === false && strpos($html, '/fides-design-pilot/organization/?org=org%3Awith-logo') !== false, 'tiles link to the given detail page with the organization id');
$profile = Fides_DS_Manifesto::profile_url(array('id' => 'org:credenco', 'name' => 'Credenco'), '/fides-design-pilot/organization/');
$plain   = Fides_DS_Manifesto::profile_url(array('id' => 'org:credenco', 'name' => 'Credenco'), '');
$check($plain !== '' && strpos($plain, 'credenco') !== false, 'without a detail page the canonical profile route is used: ' . $plain);
$check($profile !== '' && strpos($profile, 'credenco') !== false, 'profile link carries the organization id: ' . $profile);
$check(strpos($profile, '/fides-design-pilot/organization/') !== false, 'profile link goes to the pilot organization detail');
remove_all_filters('fides_manifesto_supporter_source');

// ---- Empty data: the heading stays, no tiles, a quiet notice.
add_filter('fides_manifesto_supporter_source', '__return_empty_array');
$html = Fides_DS_Manifesto::render();
$check(strpos($html, 'Organizations supporting the Manifesto') !== false && strpos($html, 'fides-manifesto__tiles') === false, 'empty data: heading, no tile list');
$check(strpos($html, 'fides-manifesto__empty') !== false && strpos($html, 'role="status"') !== false, 'empty data: notice');
$check(substr_count($html, 'fides-manifesto__principle"') === 7 && strpos($html, 'Support the FIDES Manifesto.') !== false, 'empty data: the rest of the page stays');
remove_all_filters('fides_manifesto_supporter_source');

// ---- Sign route: the existing live form, never a copy.
$sign = Fides_DS_Manifesto::sign_url();
$check($sign === 'https://fides.community/manifesto/#ratify-the-fides-manifesto-today', 'pilot sign URL is the existing form: ' . $sign);
$html = Fides_DS_Manifesto::render();
$check(substr_count($html, esc_url($sign)) === 2, 'support actions in hero and closing band');
$check(stripos($html, '<form') === false && stripos($html, '<input') === false && stripos($html, '<textarea') === false, 'no pretend form');
add_filter('fides_manifesto_sign_url', static function () { return ''; }, 99);
$html = Fides_DS_Manifesto::render();
$check(strpos($html, 'Support the Manifesto') === false && strpos($html, 'The existing form') === false, 'no sign URL: no dead action');
remove_all_filters('fides_manifesto_sign_url');
$default = Fides_DS_Manifesto::sign_url();
$check($default === home_url('/manifesto/#ratify-the-fides-manifesto-today'), 'default sign URL is the form anchor on the site Manifesto page');

// ---- Shell links.
$check(Fides_DS_Site_Shell::url('/manifesto/') === home_url('/fides-design-pilot/manifesto/'), 'footer Manifesto link points at the pilot page');
$check(Fides_DS_Site_Shell::url('/about-fides/') === home_url('/fides-design-pilot/about-fides/'), 'About link stays on the pilot About page');

foreach (array('includes/class-fides-ds-manifesto.php', 'assets/manifesto.css', 'assets/manifesto.js') as $rel) {
    $src = (string) file_get_contents(dirname(dirname(dirname(__DIR__))) . '/../fides-community-tools-tiles/' . $rel);
    $check($src !== '' && stripos($src, 'localhost') === false && stripos($src, '10088') === false, 'no hard-coded local host in ' . $rel);
}

echo 'manifesto behaviour: ' . $results['pass'] . ' passed, ' . count($results['fail']) . " failed\n";
foreach ($results['fail'] as $message) {
    echo '  FAIL: ' . $message . "\n";
}
exit(count($results['fail']) ? 1 : 0);
