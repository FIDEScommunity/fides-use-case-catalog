<?php
/**
 * Admin diff helpers for use case update proposals.
 *
 * @package fides-use-case-catalog
 */

if (! defined('ABSPATH')) {
    exit;
}

if (! class_exists('Fides_Use_Case_Catalog_Submission_Diff')) {

    class Fides_Use_Case_Catalog_Submission_Diff {

        const KIND_ADDED = 'added';
        const KIND_REMOVED = 'removed';
        const KIND_CHANGED = 'changed';

        /** @var array<string, string> */
        const FIELD_LABELS = array(
            'title'                 => 'Use case title',
            'summary'               => 'Description',
            'sector'                => 'Sector',
            'organizationName'      => 'Submitted by organization',
            'country'               => 'Country',
            'productionDeployment'  => 'Production deployment',
            'userJourney'           => 'How it works',
            'tags'                  => 'Tags',
            'moreInfoUrl'           => 'More info URL',
            'imageUrl'              => 'Cover image',
            'imageUrls'             => 'Cover images',
            'video'                 => 'Demo video',
            'videos'                => 'Demo videos',
            'interactionModes'      => 'Interaction mode',
            'vcFormats'             => 'VC format',
            'issuanceProtocols'     => 'Issuance protocol',
            'presentationProtocols' => 'Presentation protocol',
            'interopProfiles'       => 'Interop profile',
            'links.personalWallets' => 'Personal wallets',
            'links.businessWallets' => 'Business wallets',
            'links.issuers'         => 'Issuers involved',
            'links.credentials'     => 'Credential types used',
            'links.rps'             => 'Relying parties',
        );

        /**
         * @param array<string, mixed> $item Catalog item shape from row_to_item().
         * @return array<string, mixed>
         */
        public static function prepare_item(array $item): array {
            unset($item['status'], $item['updatedAt'], $item['publishedAt'], $item['id']);
            if (isset($item['summary'])) {
                $item['summary'] = fides_use_case_catalog_normalize_multiline_text((string) $item['summary']);
            }
            if (isset($item['userJourney'])) {
                $item['userJourney'] = fides_use_case_catalog_normalize_multiline_text((string) $item['userJourney']);
            }
            return $item;
        }

        /**
         * @param array<string, mixed> $proposal_row DB submission row.
         * @return array{payload: array<string, mixed>, source: string}
         */
        public static function baseline_for_update_proposal(array $proposal_row): array {
            $target_id = fides_use_case_catalog_sanitize_use_case_id(
                (string) ($proposal_row['target_use_case_id'] ?? '')
            );
            if ($target_id === '') {
                return array(
                    'payload' => array(),
                    'source'  => 'missing',
                );
            }

            $item = fides_use_case_catalog_published_item_by_id($target_id);
            if (! is_array($item)) {
                return array(
                    'payload' => array(),
                    'source'  => 'missing',
                );
            }

            return array(
                'payload' => self::prepare_item($item),
                'source'  => 'catalog',
            );
        }

        /**
         * @param array<string, mixed> $proposal_row DB submission row.
         * @return array<string, mixed>
         */
        public static function proposed_item(array $proposal_row): array {
            return self::prepare_item(fides_use_case_catalog_row_to_item($proposal_row));
        }

        /**
         * @param array<string, mixed> $before Baseline item.
         * @param array<string, mixed> $after  Proposed item.
         * @return array<int, array{field: string, kind: string, before: string, after: string}>
         */
        public static function compare_items(array $before, array $after): array {
            if (class_exists('Fides_Catalog_Submission_Diff')) {
                return Fides_Catalog_Submission_Diff::compare(
                    self::prepare_item($before),
                    self::prepare_item($after)
                );
            }

            $left  = self::flatten(self::prepare_item($before));
            $right = self::flatten(self::prepare_item($after));
            $keys  = array_unique(array_merge(array_keys($left), array_keys($right)));
            sort($keys, SORT_STRING);

            $rows = array();
            foreach ($keys as $field) {
                $old = isset($left[ $field ]) ? (string) $left[ $field ] : '';
                $new = isset($right[ $field ]) ? (string) $right[ $field ] : '';
                if ($old === $new) {
                    continue;
                }

                if ($old === '' && $new !== '') {
                    $kind = self::KIND_ADDED;
                } elseif ($old !== '' && $new === '') {
                    $kind = self::KIND_REMOVED;
                } else {
                    $kind = self::KIND_CHANGED;
                }

                $rows[] = array(
                    'field'  => $field,
                    'kind'   => $kind,
                    'before' => $old,
                    'after'  => $new,
                );
            }

            return $rows;
        }

        /**
         * @param string $field Flattened field path.
         */
        public static function field_label(string $field): string {
            if (isset(self::FIELD_LABELS[ $field ])) {
                return self::FIELD_LABELS[ $field ];
            }
            return ucwords(str_replace(array('.', '_'), ' ', $field));
        }

        /**
         * @param array<string, mixed> $proposal_row DB submission row.
         */
        public static function render_admin_section(array $proposal_row): void {
            if (fides_use_case_catalog_normalize_submission_action((string) ($proposal_row['submission_action'] ?? '')) !== 'update') {
                return;
            }

            $target_id = fides_use_case_catalog_sanitize_use_case_id(
                (string) ($proposal_row['target_use_case_id'] ?? '')
            );
            $baseline = self::baseline_for_update_proposal($proposal_row);
            $before   = isset($baseline['payload']) && is_array($baseline['payload']) ? $baseline['payload'] : array();
            $source   = isset($baseline['source']) ? (string) $baseline['source'] : 'missing';
            $after    = self::proposed_item($proposal_row);
            $rows     = self::compare_items($before, $after);
            ?>
            <div class="notice notice-info inline" style="margin: 12px 0;">
                <p>
                    <?php
                    if ($target_id !== '') {
                        printf(
                            /* translators: %s: canonical published use case id */
                            esc_html__('This is an update proposal for %1$s. Publishing merges the proposed fields into the published use case and removes this proposal row.', 'fides-use-case-catalog'),
                            esc_html($target_id)
                        );
                    } else {
                        esc_html_e('This is an update proposal. Publishing merges changes into the published use case when a valid target id is set.', 'fides-use-case-catalog');
                    }
                    ?>
                </p>
            </div>

            <h3 style="margin: 20px 0 8px;"><?php esc_html_e('Changes', 'fides-use-case-catalog'); ?></h3>
            <?php if ($source === 'missing') : ?>
                <div class="notice notice-warning inline"><p><?php esc_html_e('The published use case was not found locally or on GitHub. All submitted fields are shown as proposed values.', 'fides-use-case-catalog'); ?></p></div>
            <?php else : ?>
                <p class="description"><?php esc_html_e('Compared against the current published use case (database first, then GitHub aggregate).', 'fides-use-case-catalog'); ?></p>
            <?php endif; ?>

            <?php if (empty($rows)) : ?>
                <p class="description"><?php esc_html_e('No differences detected between this proposal and the published baseline.', 'fides-use-case-catalog'); ?></p>
                <?php
                return;
            endif;

            $kind_labels = array(
                self::KIND_ADDED   => __('Added', 'fides-use-case-catalog'),
                self::KIND_REMOVED => __('Removed', 'fides-use-case-catalog'),
                self::KIND_CHANGED => __('Changed', 'fides-use-case-catalog'),
            );
            ?>
            <style>
                .fides-submission-diff-table td,
                .fides-submission-diff-table th {
                    vertical-align: top;
                }
                .fides-submission-diff-kind {
                    display: inline-block;
                    min-width: 4.5rem;
                    padding: 2px 8px;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 600;
                    line-height: 1.4;
                }
                .fides-submission-diff-kind.is-added {
                    background: #edfaef;
                    color: #1e4620;
                }
                .fides-submission-diff-kind.is-removed {
                    background: #fcf0f1;
                    color: #8a1f1f;
                }
                .fides-submission-diff-kind.is-changed {
                    background: #f0f6fc;
                    color: #0a4b78;
                }
                .fides-submission-diff-value {
                    display: block;
                    max-width: 420px;
                    white-space: pre-wrap;
                    word-break: break-word;
                    font-family: Consolas, Monaco, monospace;
                    font-size: 12px;
                }
                .fides-submission-diff-value.is-empty {
                    color: #757575;
                    font-style: italic;
                }
            </style>
            <table class="widefat striped fides-submission-diff-table" style="max-width:1200px;">
                <thead>
                    <tr>
                        <th style="width:16%;"><?php esc_html_e('Field', 'fides-use-case-catalog'); ?></th>
                        <th style="width:10%;"><?php esc_html_e('Change', 'fides-use-case-catalog'); ?></th>
                        <th style="width:37%;"><?php esc_html_e('Current', 'fides-use-case-catalog'); ?></th>
                        <th style="width:37%;"><?php esc_html_e('Proposed', 'fides-use-case-catalog'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($rows as $diff_row) : ?>
                        <?php
                        $kind = isset($diff_row['kind']) ? (string) $diff_row['kind'] : self::KIND_CHANGED;
                        $kind_class = in_array($kind, array(self::KIND_ADDED, self::KIND_REMOVED, self::KIND_CHANGED), true)
                            ? $kind
                            : self::KIND_CHANGED;
                        $before_val = isset($diff_row['before']) ? (string) $diff_row['before'] : '';
                        $after_val  = isset($diff_row['after']) ? (string) $diff_row['after'] : '';
                        ?>
                        <tr>
                            <td>
                                <strong><?php echo esc_html(self::field_label((string) ($diff_row['field'] ?? ''))); ?></strong><br>
                                <code class="description"><?php echo esc_html((string) ($diff_row['field'] ?? '')); ?></code>
                            </td>
                            <td>
                                <span class="fides-submission-diff-kind is-<?php echo esc_attr($kind_class); ?>">
                                    <?php echo esc_html($kind_labels[ $kind_class ] ?? ucfirst($kind_class)); ?>
                                </span>
                            </td>
                            <td>
                                <?php if ($before_val === '') : ?>
                                    <span class="fides-submission-diff-value is-empty"><?php esc_html_e('(empty)', 'fides-use-case-catalog'); ?></span>
                                <?php else : ?>
                                    <span class="fides-submission-diff-value"><?php echo esc_html($before_val); ?></span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if ($after_val === '') : ?>
                                    <span class="fides-submission-diff-value is-empty"><?php esc_html_e('(empty)', 'fides-use-case-catalog'); ?></span>
                                <?php else : ?>
                                    <span class="fides-submission-diff-value"><?php echo esc_html($after_val); ?></span>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php
        }

        /**
         * @param array<string, mixed> $payload Nested payload.
         * @return array<string, string>
         */
        private static function flatten(array $payload): array {
            $out = array();
            self::flatten_into($payload, '', $out);
            ksort($out, SORT_STRING);
            return $out;
        }

        /**
         * @param mixed                 $value  Value to flatten.
         * @param string                $prefix Dot path prefix.
         * @param array<string, string> $out    Output map.
         */
        private static function flatten_into($value, string $prefix, array &$out): void {
            if (is_array($value)) {
                if ($value === array()) {
                    if ($prefix !== '') {
                        $out[ $prefix ] = '';
                    }
                    return;
                }

                if (self::is_list_array($value)) {
                    if ($prefix === '') {
                        return;
                    }
                    $out[ $prefix ] = self::format_list($value);
                    return;
                }

                foreach ($value as $key => $child) {
                    $path = $prefix === '' ? (string) $key : $prefix . '.' . (string) $key;
                    self::flatten_into($child, $path, $out);
                }
                return;
            }

            if ($prefix === '') {
                return;
            }

            $out[ $prefix ] = self::format_scalar($value);
        }

        /**
         * @param array<int, mixed> $list List values.
         */
        private static function format_list(array $list): string {
            $parts = array();
            foreach ($list as $item) {
                if (is_array($item)) {
                    $encoded = wp_json_encode($item, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    $parts[] = is_string($encoded) ? $encoded : '';
                    continue;
                }
                $parts[] = self::format_scalar($item);
            }
            $parts = array_values(array_filter($parts, static function ($part) {
                return $part !== '';
            }));
            sort($parts, SORT_STRING);
            return implode(', ', $parts);
        }

        /**
         * @param mixed $value Scalar value.
         */
        private static function format_scalar($value): string {
            if ($value === null) {
                return '';
            }
            if (is_bool($value)) {
                return $value ? 'true' : 'false';
            }
            return trim((string) $value);
        }

        /**
         * @param array<mixed> $value Array to inspect.
         */
        private static function is_list_array(array $value): bool {
            if ($value === array()) {
                return true;
            }
            return array_keys($value) === range(0, count($value) - 1);
        }
    }
}
