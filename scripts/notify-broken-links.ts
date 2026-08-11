/**
 * Post the linkcheck report to WordPress so it can email submitters.
 *
 * Submitter emails never leave the WordPress database (GDPR). This script only
 * sends use-case IDs + broken URL details to a secret-protected REST endpoint;
 * WordPress looks up contact_email and sends mail (with FIDES in CC).
 *
 * Env:
 *   LINKCHECK_NOTIFY_URL     e.g. https://fides.community/wp-json/fides-use-case/v1/linkcheck-notify
 *   LINKCHECK_NOTIFY_SECRET  shared secret (must match WP option/filter)
 *   LINKCHECK_DRY_RUN=1      log payload without POSTing
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const REPORT_JSON_PATH = join(process.cwd(), 'data/linkcheck-report.json');

interface LinkcheckReport {
  runAt: string;
  brokenCount: number;
  bySubmitter: Record<
    string,
    {
      useCaseIds: string[];
      brokenUrls: Array<{
        url: string;
        error: string;
        status?: number;
        itemId: string;
        itemTitle: string;
        field: string;
      }>;
    }
  >;
}

async function main(): Promise<void> {
  if (!existsSync(REPORT_JSON_PATH)) {
    console.log('No linkcheck report found; nothing to notify.');
    return;
  }

  const report: LinkcheckReport = JSON.parse(readFileSync(REPORT_JSON_PATH, 'utf-8'));
  if (!report.brokenCount || !report.bySubmitter || Object.keys(report.bySubmitter).length === 0) {
    console.log('No broken links; nothing to notify.');
    return;
  }

  // Payload contains no email addresses — only public catalog fields + use-case IDs.
  const payload = {
    runAt: report.runAt,
    brokenCount: report.brokenCount,
    bySubmitter: report.bySubmitter,
  };

  const dryRun = process.env.LINKCHECK_DRY_RUN === '1';
  if (dryRun) {
    console.log('DRY RUN — would POST linkcheck notify payload (no emails):');
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const url = process.env.LINKCHECK_NOTIFY_URL?.trim();
  const secret = process.env.LINKCHECK_NOTIFY_SECRET?.trim();
  if (!url || !secret) {
    console.log(
      'LINKCHECK_NOTIFY_URL / LINKCHECK_NOTIFY_SECRET not set; skipping submitter notify.'
    );
    return;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-FIDES-Linkcheck-Secret': secret,
      'User-Agent': 'FIDES-UseCase-Catalog-Linkcheck-Notify/1.0',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep raw text
  }

  if (!res.ok) {
    console.error('Linkcheck notify failed:', res.status, body);
    process.exit(1);
  }

  console.log('Linkcheck notify OK:', body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
