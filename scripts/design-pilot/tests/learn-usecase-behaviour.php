<?php
/**
 * Behaviour test: [fides_learn_usecase] takes title, organisation and status from the catalog record.
 * Run: source env.sh && pilot_wp eval-file tests/learn-usecase-behaviour.php
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
$url   = home_url('/fides-design-pilot/use-case/');
$hovi  = 'business-wallet-based-kyb-financial-onboarding-Rzqouv';
$bosch = 'end-to-end-digital-business-workflows-transforming-kyb-kyc-kys-via-eu-business-wallet-F665Dh';
$source = Fides_Catalog_Source::for('usecase');
$hovi_item  = $source->find_by_id($hovi);
$bosch_item = $source->find_by_id($bosch);
$check(is_array($hovi_item) && is_array($bosch_item), 'both records exist in the local catalog data');

wp_set_current_user(0);
$html = do_shortcode('[fides_learn_usecase id="' . $hovi . '" url="' . $url . '"]');
$check(strpos($html, esc_html($hovi_item['title'])) !== false, 'title comes from the record');
$check(strpos($html, 'The catalog lists Hovi as the organisation.') !== false, 'organisation comes from the record');
$check(strpos($html, 'does not mark this use case as in production') !== false, 'productionDeployment no => careful sentence');
$check(strpos($html, 'usecase=' . rawurlencode($hovi)) !== false, 'link points at the record');
$check(strpos($html, 'fides-learn-record__image') !== false, 'image comes from the record');
$check(strpos($html, 'Example use case') !== false && strpos($html, 'Explore this use case') !== false, 'default kicker and label');

$bosch_html = do_shortcode('[fides_learn_usecase id="' . $bosch . '" url="' . $url . '" label="Explore the use case"]');
$check(strpos($bosch_html, 'Robert Bosch GmbH') !== false && strpos($bosch_html, 'Explore the use case') !== false, 'second record and custom label');

// Status wording, independent of the data file.
$yes = Fides_DS_Learn::usecase_status_text(array('organizationName' => 'Acme', 'productionDeployment' => 'yes'));
$no  = Fides_DS_Learn::usecase_status_text(array('organizationName' => 'Acme', 'productionDeployment' => 'no'));
$unk = Fides_DS_Learn::usecase_status_text(array('organizationName' => 'Acme', 'productionDeployment' => ''));
$check(strpos($yes, 'marks this use case as in production') !== false && strpos($yes, 'does not mark') === false, 'yes => reported as in production');
$check(strpos($no, 'does not mark this use case as in production') !== false, 'no => not marked');
$check(strpos($unk, 'production') === false && strpos($unk, 'Acme') !== false, 'unknown status adds no production claim');
$check(Fides_DS_Learn::usecase_status_text(array()) === '', 'empty record => empty text');

// Unknown record: hidden for visitors, notice for editors, never fatal.
$check(do_shortcode('[fides_learn_usecase id="does-not-exist" url="' . $url . '"]') === '', 'unknown id => nothing for visitors');
$check(do_shortcode('[fides_learn_usecase url="' . $url . '"]') === '', 'missing id => nothing for visitors');
$admin = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ID'));
wp_set_current_user((int) ($admin[0] ?? 1));
$notice = do_shortcode('[fides_learn_usecase id="does-not-exist" url="' . $url . '"]');
$check(strpos($notice, 'Editor notice') !== false && strpos($notice, 'fides-learn-record"') === false, 'unknown id => notice for editors, no card');
wp_set_current_user(0);


// VOG record (productionDeployment yes), as used on two Learn articles: kicker can be left out, heading level 2.
$vog = 'digital-certificate-of-good-conduct-vog-as-a-verifiable-credential-yjw4BC';
$vog_item = $source->find_by_id($vog);
$check(is_array($vog_item), 'VOG record exists');
$vog_html = do_shortcode('[fides_learn_usecase id="' . $vog . '" url="' . $url . '" kicker="" heading="2" label="View the VOG use case"]');
$check(strpos($vog_html, esc_html($vog_item['title'])) !== false && strpos($vog_html, 'The catalog lists Credenco as the organisation.') !== false, 'VOG title and organisation from the record');
$check(strpos($vog_html, 'marks this use case as in production, as reported by the organisation') !== false, 'VOG productionDeployment yes => reported sentence');
$check(strpos($vog_html, 'fides-learn-record__kicker') === false && strpos($vog_html, '<h2>') !== false && strpos($vog_html, 'View the VOG use case') !== false, 'empty kicker omitted, heading 2, custom label');
$check(strpos(do_shortcode('[fides_learn_usecase id="' . $vog . '" url="' . $url . '" kicker="See it in practice"]'), 'See it in practice') !== false, 'custom kicker shown');

// Unpublished record (in-memory only, nothing is written): hidden for visitors, notice for editors.
$idx = new ReflectionProperty(Fides_Catalog_Source::class, 'id_index_cache');
$idx->setAccessible(true);
$source->find_by_id('warm-up');
$index = (array) $idx->getValue($source);
$index['tmp-draft-usecase'] = array_merge($vog_item, array('id' => 'tmp-draft-usecase', 'status' => 'draft'));
$idx->setValue($source, $index);
wp_set_current_user(0);
$check(do_shortcode('[fides_learn_usecase id="tmp-draft-usecase" url="' . $url . '"]') === '', 'unpublished record => nothing for visitors');
wp_set_current_user((int) ($admin[0] ?? 1));
$check(strpos(do_shortcode('[fides_learn_usecase id="tmp-draft-usecase" url="' . $url . '"]'), 'Editor notice') !== false, 'unpublished record => notice for editors');
unset($index['tmp-draft-usecase']);
$idx->setValue($source, $index);
wp_set_current_user(0);

echo 'learn-usecase-behaviour: ' . $results['pass'] . ' passed, ' . count($results['fail']) . " failed\n";
foreach ($results['fail'] as $f) {
    echo 'FAIL: ' . $f . "\n";
}
exit($results['fail'] ? 1 : 0);
