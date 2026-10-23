<?php
/**
 * Prints the catalog links the credential pilot builds on a public (non-local) site, for
 * public-link-checks.cjs. The site URL is filtered for this run only; nothing is written.
 *
 * Run: pilot_wp eval-file public-link-urls.php
 */

if (! defined('ABSPATH')) {
    exit(1);
}

add_filter('site_url', static function () {
    return 'https://fides.community';
});

$id      = 'cred:eu:age-verification';
$rps     = Fides_Credential_Design::relying_parties_for($id);
$issuers = Fides_Credential_Design::issuers_for($id);
$wallets = Fides_Credential_Design::wallets_for($id);
$name    = static function (array $row): string {
    return (string) ($row['displayName'] ?? $row['name'] ?? $row['id']);
};

echo wp_json_encode(array(
    array('label' => 'pilot · one relying party', 'href' => Fides_Credential_Design::rp_url($rps[0]['id']), 'kind' => 'rp', 'ids' => array($rps[0]['id']), 'name' => $name($rps[0])),
    array('label' => 'pilot · relying parties filter', 'href' => Fides_Credential_Design::rps_catalog_url(array_column($rps, 'id')), 'kind' => 'rp', 'ids' => array_column($rps, 'id')),
    array('label' => 'pilot · one issuer', 'href' => Fides_Credential_Design::issuer_url($issuers[0]['id']), 'kind' => 'issuer', 'ids' => array($issuers[0]['id']), 'name' => $name($issuers[0])),
    array('label' => 'pilot · issuers filter', 'href' => Fides_Credential_Design::issuers_catalog_url(array_column($issuers, 'id')), 'kind' => 'issuer', 'ids' => array_column($issuers, 'id')),
    array('label' => 'public wallet fallback · one wallet', 'href' => Fides_Credential_Design::wallet_catalog_record_url($wallets[0]['id']), 'kind' => 'wallet', 'ids' => array($wallets[0]['id']), 'name' => $name($wallets[0])),
    array('label' => 'public wallet fallback · wallets filter', 'href' => Fides_Credential_Design::wallets_catalog_url(array_column($wallets, 'id')), 'kind' => 'wallet', 'ids' => array_column($wallets, 'id')),
), JSON_UNESCAPED_SLASHES);
