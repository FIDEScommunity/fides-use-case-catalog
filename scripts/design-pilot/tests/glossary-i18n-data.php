<?php
/**
 * Temporary nl_NL test translation for the glossary interface strings (TranslatePress dictionary).
 * Run through run-glossary-i18n-checks.sh with WP-CLI: `eval-file glossary-i18n-data.php apply|restore`.
 * "apply" stores the previous translation of every row it changes in the option below; "restore" puts it back
 * and deletes the option. TranslatePress keeps the (untranslated) strings it registered when the page was
 * visited: that is its normal behaviour and is the translator's string list.
 */
$mode   = isset($args[0]) ? $args[0] : '';
$option = 'fides_glossary_i18n_test_backup';
$table  = 'wp_trp_dictionary_en_us_nl_nl';

$nl = array(
    'Search glossary terms'                    => 'Zoek in de woordenlijst',
    'Search by term or abbreviation'           => 'Zoek op term of afkorting',
    'Search'                                   => 'Zoeken',
    'Clear search'                             => 'Zoekopdracht wissen',
    'Browse by letter'                         => 'Blader op letter',
    'Glossary terms'                           => 'Termen in de woordenlijst',
    'Select a term to view its definition'     => 'Kies een term om de definitie te lezen',
    'All'                                      => 'Alle',
    'terms ({n})'                              => 'termen ({n})',
    'Terms starting with'                      => 'Termen die beginnen met',
    '{n} term'                                 => '{n} term',
    '{n} terms'                                => '{n} termen',
    '{count} match “{query}”'                  => '{count} passend bij “{query}”',
    '{count} starting with {letter}'           => '{count} beginnend met {letter}',
    '{count} match “{query}”, starting with {letter}' => '{count} passend bij “{query}”, beginnend met {letter}',
    'Terms beginning with a number or symbol'  => 'Termen die beginnen met een cijfer of symbool',
    'Terms beginning with {letter}'            => 'Termen die beginnen met {letter}',
    'No terms match “{query}”.'                => 'Geen termen gevonden voor “{query}”.',
    'Check the spelling, try an abbreviation or use fewer words.' => 'Controleer de spelling, probeer een afkorting of gebruik minder woorden.',
    'Also known as {alias}'                    => 'Ook bekend als {alias}',
    'Also known as:'                           => 'Ook bekend als:',
    'Link to this term'                        => 'Link naar deze term',
    'Link copied'                              => 'Link gekopieerd',
    'Source:'                                  => 'Bron:',
    '(opens in a new tab)'                     => '(opent in een nieuw tabblad)',
);

global $wpdb;
if ($mode === 'apply') {
    $backup = array();
    foreach ($nl as $en => $nl_text) {
        $rows = $wpdb->get_results($wpdb->prepare("SELECT id, translated, status FROM $table WHERE original = %s", $en)); // phpcs:ignore
        foreach ($rows as $row) {
            $backup[(int) $row->id] = array((string) $row->translated, (int) $row->status);
            $wpdb->update($table, array('translated' => $nl_text, 'status' => 2), array('id' => (int) $row->id));
        }
    }
    update_option($option, $backup, false);
    echo 'applied ' . count($backup) . " rows\n";
} elseif ($mode === 'restore') {
    $backup = get_option($option, array());
    foreach ((array) $backup as $id => $prev) {
        $wpdb->update($table, array('translated' => $prev[0], 'status' => $prev[1]), array('id' => (int) $id));
    }
    delete_option($option);
    echo 'restored ' . count((array) $backup) . " rows\n";
} else {
    echo "usage: apply|restore\n";
}
