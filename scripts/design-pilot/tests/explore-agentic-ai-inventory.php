<?php
/**
 * Read-only inventory of what the catalogs hold about Agentic AI (no database writes, no new bundle).
 * Classified = an existing identifier: credential `themes` contains agentic_ai; use case theme map assignment contains agentic_ai;
 * issuers / relying parties through those credential types; organisations / wallets only through use case links.
 * Text mentions (the word "agent" in name, tags or summary) are counted separately as an indication only; they are NOT a classification
 * and never feed the pages.
 * Run: pilot_wp eval-file tests/explore-agentic-ai-inventory.php   (writes tests/output/explore-agentic-ai-inventory.json)
 */
if (! defined('ABSPATH')) {
    exit(1);
}
$out   = array();
$cred  = array();
foreach (Fides_Credential_Design::items() as $c) {
    if (in_array('agentic_ai', array_map('strval', (array) ($c['themes'] ?? array())), true)) {
        $cred[ Fides_Credential_Design::canonical_id((string) $c['id']) ] = $c;
    }
}
$out['credentials'] = array_map(static fn ($c) => array('id' => $c['id'], 'name' => $c['displayName'], 'themes' => $c['themes'], 'sectors' => count((array) ($c['sectors'] ?? array())), 'owner' => $c['authority']['name'] ?? ''), array_values($cred));

$config = Fides_Use_Case_Discovery_Shortcode::theme_config();
$assigned = array();
foreach ((array) $config['assignments'] as $id => $codes) {
    if (in_array('agentic_ai', (array) $codes, true)) {
        $assigned[] = (string) $id;
    }
}
$uc_by = array();
foreach (Fides_Use_Case_Design::items() as $u) {
    $uc_by[ (string) $u['id'] ] = $u;
}
$out['useCasesAssigned'] = array();
foreach ($assigned as $id) {
    $u = $uc_by[ $id ] ?? null;
    $out['useCasesAssigned'][] = array('id' => $id, 'inCatalog' => $u !== null, 'title' => $u['title'] ?? $u['name'] ?? '', 'themes' => $config['assignments'][ $id ], 'production' => $u['productionDeployment'] ?? null,
        'orgs' => count((array) ($u['links']['organizations'] ?? array())), 'issuers' => count((array) ($u['links']['issuers'] ?? array())), 'rps' => count((array) ($u['links']['rps'] ?? array())), 'wallets' => count((array) ($u['links']['personalWallets'] ?? array())) + count((array) ($u['links']['businessWallets'] ?? array())), 'credentials' => count((array) ($u['links']['credentials'] ?? array())));
}
$org_ids = $wallet_ids = $issuer_link = $rp_link = array();
foreach ($out['useCasesAssigned'] as $row) {
    $u = $uc_by[ $row['id'] ] ?? array();
    foreach ((array) ($u['links']['organizations'] ?? array()) as $l) { if (! empty($l['refId'])) { $org_ids[ $l['refId'] ] = true; } }
    foreach (array('personalWallets', 'businessWallets') as $k) { foreach ((array) ($u['links'][ $k ] ?? array()) as $l) { if (! empty($l['refId'])) { $wallet_ids[ $l['refId'] ] = true; } } }
}
$exists = static fn (array $items, array $ids): array => array_values(array_filter(array_keys($ids), static function ($id) use ($items) { foreach ($items as $i) { if ((string) $i['id'] === (string) $id) { return true; } } return false; }));
$out['organizationsViaUseCases'] = count($exists(Fides_Organization_Design::items(), $org_ids)) . ' with a catalog page of ' . count($org_ids) . ' linked by id';
$out['walletsViaUseCases'] = count($exists(Fides_Wallet_Design::items(), $wallet_ids)) . ' with a catalog page of ' . count($wallet_ids) . ' linked by id';

$ids = array_keys($cred);
$out['issuersViaCredentials'] = array();
foreach (Fides_Issuer_Design::items() as $i) {
    if (array_intersect(array_keys(Fides_Issuer_Design::credential_types($i)), $ids)) {
        $out['issuersViaCredentials'][] = $i['displayName'];
    }
}
$out['rpsViaCredentials'] = array();
foreach (Fides_RP_Design::items() as $r) {
    if (array_intersect(array_keys(Fides_RP_Design::credential_types($r)), $ids)) {
        $out['rpsViaCredentials'][] = $r['name'];
    }
}
// Indication only: the word in names, tags and summaries (not a classification).
$hit = static fn (string $t): bool => (bool) preg_match('/\bagent(ic|s)?\b|\bAI\b|\bLLM\b|\bMCP\b/u', $t);
$text = array();
foreach (array('useCases' => Fides_Use_Case_Design::items(), 'credentials' => Fides_Credential_Design::items(), 'organizations' => Fides_Organization_Design::items(), 'issuers' => Fides_Issuer_Design::items(), 'rps' => Fides_RP_Design::items(), 'wallets' => Fides_Wallet_Design::items()) as $type => $items) {
    $n = 0; $names = array();
    foreach ($items as $i) {
        $blob = implode(' ', array((string) ($i['title'] ?? $i['displayName'] ?? $i['name'] ?? ''), implode(' ', array_map('strval', (array) ($i['tags'] ?? array()))), (string) ($i['shortDescription'] ?? $i['summary'] ?? $i['description'] ?? '')));
        if ($hit($blob)) { $n++; if (count($names) < 8) { $names[] = (string) ($i['title'] ?? $i['displayName'] ?? $i['name'] ?? ''); } }
    }
    $text[ $type ] = array('count' => $n, 'of' => count($items), 'examples' => $names);
}
$out['textMentionIndication'] = $text;
$out['themeBundles'] = array_map(static fn ($b) => $b['code'], $config['bundles']);
$out['agenticInBundle'] = false;
foreach ($config['bundles'] as $b) { if (in_array('agentic_ai', $b['themeCodes'], true)) { $out['agenticInBundle'] = $b['code']; } }
$count_by_theme = array();
foreach ((array) $config['assignments'] as $codes) { foreach ((array) $codes as $c) { $count_by_theme[ $c ] = ($count_by_theme[ $c ] ?? 0) + 1; } }
$out['useCaseAssignmentsPerThemeCode'] = $count_by_theme;
file_put_contents(__DIR__ . '/output/explore-agentic-ai-inventory.json', wp_json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
echo wp_json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), "\n";
