<?php
/**
 * Behaviour tests for Fides_DS_Learn::split_continue_learning (tiles): only the "Continue learning" heading and its
 * link groups move to the side column; all other content stays in the article text, in order, as balanced HTML.
 * Pure function tests, no pages are created. Run: pilot_wp eval-file tests/learn-continue-split-behaviour.php
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

$split = static function (string $html): array {
    return Fides_DS_Learn::split_continue_learning($html);
};
$text = static function (string $html): string {
    return trim((string) preg_replace('~\s+~', ' ', wp_strip_all_tags($html)));
};
/** Balanced: every start tag of the tracked containers has an end tag (DOM round trip keeps counts equal). */
$balanced = static function (string $html): bool {
    foreach (array('div', 'ul', 'ol', 'li', 'p', 'section') as $tag) {
        if (preg_match_all('~<' . $tag . '\b~i', $html) !== preg_match_all('~</' . $tag . '>~i', $html)) {
            return false;
        }
    }
    return true;
};
$count = static function (string $html, string $needle): int {
    return substr_count($html, $needle);
};

$learn_more = '<h3 class="wp-block-heading">Learn more</h3><ul class="wp-block-list"><li><a href="/learn/a/">Article A — long label → ok</a></li><li><a href="/learn/b/">Article B</a></li></ul>';
$catalogs   = '<h3 class="wp-block-heading">Explore in the catalogs</h3><ul class="wp-block-list"><li><a href="/pilot/credentials/">Browse credential types</a></li></ul>';
$note       = '<p class="fides-learn-note">Content last checked: 11 November 2026.</p>';
$intro      = '<h2 class="wp-block-heading" id="own-anchor">Own section</h2><p>Intro text with <a href="/x/">a link</a> &amp; entity.</p>';

// 1. Flat H2 structure.
$r = $split($intro . '<h2 class="wp-block-heading">Continue learning</h2>' . $learn_more . $catalogs . $note);
$check($count($r['continue'], 'fides-learn-continue__group') === 2 && strpos($r['continue'], 'Article A — long label → ok') !== false, 'flat: both groups move to the side column, UTF-8 text is intact');
$check(strpos($r['continue'], 'id="continue-learning"') !== false && strpos($r['continue'], 'aria-labelledby="continue-learning"') !== false, 'flat: heading keeps the anchor id continue-learning');
$check(strpos($r['body'], 'Continue learning') === false && strpos($r['body'], 'Learn more') === false && strpos($r['body'], '<ul') === false, 'flat: no heading or list is left in the text (no duplication)');
$check(strpos($r['body'], 'id="own-anchor"') !== false && strpos($r['body'], 'Intro text with') !== false && strpos($r['body'], 'fides-learn-note') !== false, 'flat: other headings, anchors, paragraphs and the closing note stay in the text');
$check(strpos($r['body'], 'Own section') < strpos($r['body'], 'Content last checked'), 'flat: order of the remaining nodes is unchanged');
$check($balanced($r['body']) && $balanced($r['continue']), 'flat: both parts are balanced HTML');

// 2. Group block around the section (the heading and the groups inside one wp-block-group).
$group = '<div class="wp-block-group"><h2 class="wp-block-heading">Continue learning</h2><div class="wp-block-group">' . $learn_more . '</div><div class="wp-block-group">' . $catalogs . '</div></div>';
$r     = $split($intro . $group . $note);
$check($count($r['continue'], 'fides-learn-continue__group') === 2, 'group block: both subgroups move');
$check(strpos($r['body'], 'wp-block-group') === false && $balanced($r['body']), 'group block: the emptied group wrappers are removed, the text stays balanced');
$check(strpos($r['body'], 'Content last checked') !== false && strpos($r['body'], 'Intro text') !== false, 'group block: text before and the note after the group stay in the text');

// 3. Nested group block.
$nested = '<div class="wp-block-group"><div class="wp-block-group__inner-container"><p>Before the section.</p><div class="wp-block-group"><h2 class="wp-block-heading">Continue learning</h2>' . $learn_more . '<div class="wp-block-group"><div class="wp-block-group__inner-container">' . $catalogs . '</div></div></div></div></div>';
$r      = $split($intro . $nested . $note);
$check($count($r['continue'], 'fides-learn-continue__group') === 2, 'nested group: both subgroups move');
$check(strpos($r['body'], 'Before the section.') !== false && $balanced($r['body']) && $balanced($r['continue']), 'nested group: the outer group keeps its paragraph and stays balanced');
$check(substr_count($r['body'], '<div') === 2 && strpos($r['body'], 'Continue learning') === false, 'nested group: only the wrappers of the moved content are pruned');

// 4. Empty group and empty lists.
$empty = '<h2 class="wp-block-heading">Continue learning</h2><div class="wp-block-group"><h3 class="wp-block-heading">Learn more</h3><ul class="wp-block-list"><li></li></ul></div>' . $catalogs;
$r     = $split($intro . $empty . $note);
$check($count($r['continue'], 'fides-learn-continue__group') === 1 && strpos($r['continue'], 'Learn more') === false, 'empty group: the empty Learn more group is dropped without its heading');
$check(strpos($r['body'], 'wp-block-group') === false && strpos($r['body'], 'Learn more') === false, 'empty group: no empty wrapper or heading remains in the text');
$r = $split($intro . '<h2 class="wp-block-heading">Continue learning</h2><div class="wp-block-group"><h3>Learn more</h3><ul><li> </li></ul></div>' . $note);
$check($r['continue'] === '' && strpos($r['body'], 'Continue learning') === false && strpos($r['body'], 'Learn more') === false && strpos($r['body'], 'Content last checked') !== false, 'empty section: no side section and no empty heading anywhere');
$r = $split($intro . '<h2 class="wp-block-heading">Continue learning</h2>' . $note);
$check($r['continue'] === '' && strpos($r['body'], 'Continue learning') === false && strpos($r['body'], 'Content last checked') !== false, 'heading without any group: dropped, note stays');

// 5. Plain paragraph (and other blocks) after the follow-up links stay in the text.
$after = '<p>A normal paragraph after the links, with <strong>bold</strong>.</p><h3>Another heading</h3><ul><li>Plain list item</li></ul>';
$r     = $split($intro . '<h2 class="wp-block-heading">Continue learning</h2>' . $learn_more . $after . $note);
$check($count($r['continue'], 'fides-learn-continue__group') === 1 && strpos($r['continue'], 'normal paragraph') === false && strpos($r['continue'], 'Another heading') === false, 'paragraph after links: nothing after the paragraph moves');
$check(strpos($r['body'], 'A normal paragraph after the links') !== false && strpos($r['body'], 'Another heading') !== false && strpos($r['body'], 'Plain list item') !== false, 'paragraph after links: paragraph, heading and list stay in the text');
$check(strpos($r['body'], 'normal paragraph') < strpos($r['body'], 'Another heading') && strpos($r['body'], 'Another heading') < strpos($r['body'], 'Content last checked'), 'paragraph after links: original order kept');
// The same inside a group block: text after the links in the same group stays in the group.
$r = $split($intro . '<div class="wp-block-group"><h2>Continue learning</h2>' . $learn_more . '<p>Text in the same group.</p></div>' . $note);
$check($count($r['continue'], 'fides-learn-continue__group') === 1 && strpos($r['continue'], 'Text in the same group') === false, 'paragraph in the same group: not lifted');
$check(strpos($r['body'], '<div class="wp-block-group"><p>Text in the same group.</p></div>') !== false && $balanced($r['body']), 'paragraph in the same group: the group stays around its paragraph');
// A paragraph between the heading and the links: nothing is lifted past it.
$r = $split('<h2>Continue learning</h2><p>Lead sentence.</p>' . $learn_more);
$check($r['continue'] === '' && strpos($r['body'], 'Learn more') !== false && strpos($r['body'], 'Lead sentence.') !== false, 'paragraph before the links: the lists stay in the text (the section is dropped)');

// 6. Only Learn more / only Explore.
$r = $split($intro . '<h2>Continue learning</h2>' . $learn_more . $note);
$check($count($r['continue'], 'fides-learn-continue__group') === 1 && strpos($r['continue'], 'Learn more') !== false && strpos($r['continue'], 'Explore in the catalogs') === false, 'only Learn more: one group');
$r = $split($intro . '<h2>Continue learning</h2>' . $catalogs . $note);
$check($count($r['continue'], 'fides-learn-continue__group') === 1 && strpos($r['continue'], 'Explore in the catalogs') !== false, 'only Explore: one group');

// 7. Missing section: input comes back unchanged.
$plain = $intro . '<p>No follow-up section here.</p><ul><li>List</li></ul>' . $note;
$r     = $split($plain);
$check($r['continue'] === '' && $r['body'] === $plain, 'missing section: body is returned byte for byte, no side section');
$r = $split('<h2>Something else</h2><h3>Learn more</h3><ul><li><a href="/x/">x</a></li></ul>');
$check($r['continue'] === '', 'a "Learn more" list without the Continue learning heading is not lifted');

// 8. Several Learn more / Explore lists, two lists under one label, a lead list without label.
$r = $split($intro . '<h2>Continue learning</h2><ul><li><a href="/lead/">Lead link</a></li></ul>' . $learn_more . '<ul><li><a href="/more/">Second list, same label</a></li></ul>' . $learn_more . $catalogs . $catalogs . $note);
$check($count($r['continue'], 'fides-learn-continue__group') === 5, 'several lists: lead group, two Learn more, two Explore groups all move');
$check(strpos($r['continue'], 'Second list, same label') !== false && strpos($r['body'], '<ul') === false, 'several lists: a second list under one label moves with it, nothing is left behind');
$check(strpos($r['continue'], 'Lead link') < strpos($r['continue'], 'Article A'), 'several lists: order inside the side column follows the editor');

// 9. Classic markup (no block classes), headings keep ids and links keep their href.
$r = $split('<h2 id="classic">Classic</h2><p>Text</p><h2>Continue learning</h2><h3>Learn more</h3><ul><li><a href="/learn/z/?a=1&amp;b=2#frag">Z</a></li></ul>');
$check($count($r['continue'], 'href="/learn/z/?a=1&amp;b=2#frag"') === 1 && strpos($r['body'], 'id="classic"') !== false, 'classic markup: query string, fragment and heading id are kept');
// A heading with extra markup and another case.
$r = $split('<h2 class="x"><span>Continue</span>&nbsp;learning</h2>' . $learn_more);
$check($count($r['continue'], 'fides-learn-continue__group') === 1 && strpos($r['body'], 'Continue') === false, 'heading with inner markup and a non-breaking space is recognised');
// A heading with an own id keeps it.
$r = $split('<h2 id="my-id">Continue learning</h2>' . $learn_more);
$check(strpos($r['continue'], 'id="my-id"') !== false && strpos($r['continue'], 'aria-labelledby="my-id"') !== false, 'own heading id is kept');

// 10. Real block markup rendered by WordPress (group block with the section inside).
$blocks = '<!-- wp:paragraph --><p>Before.</p><!-- /wp:paragraph -->'
    . '<!-- wp:group --><div class="wp-block-group"><!-- wp:heading --><h2 class="wp-block-heading">Continue learning</h2><!-- /wp:heading -->'
    . '<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Learn more</h3><!-- /wp:heading -->'
    . '<!-- wp:list --><ul class="wp-block-list"><!-- wp:list-item --><li><a href="/learn/a/">A</a></li><!-- /wp:list-item --></ul><!-- /wp:list -->'
    . '<!-- wp:group --><div class="wp-block-group"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Explore in the catalogs</h3><!-- /wp:heading -->'
    . '<!-- wp:list --><ul class="wp-block-list"><!-- wp:list-item --><li><a href="/pilot/credentials/">C</a></li><!-- /wp:list-item --></ul><!-- /wp:list --></div><!-- /wp:group --></div><!-- /wp:group -->'
    . '<!-- wp:paragraph --><p>After the group.</p><!-- /wp:paragraph -->';
$r = $split(do_blocks($blocks));
$check($count($r['continue'], 'fides-learn-continue__group') === 2 && strpos($r['body'], 'wp-block-group') === false && $text($r['body']) === 'Before.After the group.', 'rendered group blocks: both groups move, text keeps Before and After in order');

// 11. Contents (prepare_body): the lifted section is not a contents entry, other headings keep their ids and order.
$r        = $split($intro . '<h2>Second</h2><p>x</p><h2>Continue learning</h2>' . $learn_more . $catalogs . $note);
$prepared = Fides_DS_Learn::prepare_body($r['body']);
$check(array_column($prepared['toc'], 'id') === array('own-anchor', 'second'), 'contents: Continue learning is not listed, the other sections are, in order');

// 12. Entities survive the DOM round trip (TranslatePress keys its dictionary on the markup text: &#8217; must not become a raw character).
$entities = '<p>The applicant&#8217;s file &amp; the &#8220;check&#8221; &#8211; done&hellip;</p><p>Keep&nbsp;together.</p><h2>Continue learning</h2><h3>Learn more</h3><ul><li><a href="/learn/a/?x=1&amp;y=2">Rock &amp; roll&#8217;s end</a></li></ul>';
$r        = $split($entities);
$check(strpos($r['body'], 'applicant&#8217;s file &amp; the &#8220;check&#8221; &#8211; done&hellip;') !== false, 'entities in the body keep their entity form');
$check(strpos($r['body'], '’') === false && strpos($r['body'], '“') === false, 'no raw typographic characters appear in the body');
$check(strpos($r['body'], 'Keep&nbsp;together.') !== false, 'a non-breaking space stays an entity');
$check(strpos($r['continue'], 'href="/learn/a/?x=1&amp;y=2"') !== false && strpos($r['continue'], 'Rock &amp; roll&#8217;s end') !== false, 'entities in the lifted section keep their entity form');
$check(strpos($r['body'] . $r['continue'], 'FIDESENT') === false, 'no entity markers leak into the output');

foreach ($results['fail'] as $message) {
    echo "not ok - {$message}\n";
}
printf("# pass %d\n# fail %d\n", $results['pass'], count($results['fail']));
if ($results['fail']) {
    exit(1);
}
