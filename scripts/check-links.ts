/**
 * Linkcheck for the use-case catalog.
 *
 * Reads data/aggregated.json, collects HTTP(S) URLs from each use case,
 * checks them with HEAD→GET fallback + retries (to limit false positives),
 * and writes data/linkcheck-report.json + data/linkcheck-summary.md.
 *
 * Grouping is per submitting organization (no email addresses — those stay in
 * WordPress only for GDPR). The notify step posts use-case IDs to WordPress,
 * which looks up contact_email server-side and sends mail.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const AGGREGATED_PATH = join(process.cwd(), 'data/aggregated.json');
const REPORT_JSON_PATH = join(process.cwd(), 'data/linkcheck-report.json');
const REPORT_MD_PATH = join(process.cwd(), 'data/linkcheck-summary.md');

const REQUEST_TIMEOUT_MS = 12_000;
const DELAY_BETWEEN_REQUESTS_MS = 350;
const MAX_ATTEMPTS = 3;
const USER_AGENT =
  'Mozilla/5.0 (compatible; FIDES-UseCase-Catalog-Linkcheck/1.0; +https://fides.community)';

/** Status codes that mean "resource exists but blocks automated clients". */
const SOFT_OK_STATUSES = new Set([401, 403]);
/** Transient statuses worth retrying before deciding. */
const RETRY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function isHttpUrl(s: string): boolean {
  return typeof s === 'string' && (s.startsWith('http://') || s.startsWith('https://'));
}

interface LinkContext {
  itemId: string;
  itemTitle: string;
  field: string;
  submitterName: string;
}

function addUrl(
  map: Map<string, { contexts: LinkContext[] }>,
  url: string,
  context: LinkContext
): void {
  const normalized = url.trim();
  if (!isHttpUrl(normalized)) return;
  const existing = map.get(normalized);
  if (existing) {
    if (!existing.contexts.some((c) => c.itemId === context.itemId && c.field === context.field)) {
      existing.contexts.push(context);
    }
  } else {
    map.set(normalized, { contexts: [context] });
  }
}

interface UseCaseLinkRef {
  url?: string | null;
}

interface UseCaseItem {
  id: string;
  title?: string;
  organizationName?: string;
  moreInfoUrl?: string;
  imageUrl?: string;
  imageUrls?: string[];
  links?: Record<string, UseCaseLinkRef[] | undefined>;
  video?: { url?: string } | null;
  videos?: Array<{ url?: string } | string>;
}

interface AggregatedData {
  useCases?: UseCaseItem[];
}

function collectUseCaseUrls(
  useCases: UseCaseItem[],
  urlToContexts: Map<string, { contexts: LinkContext[] }>
): void {
  for (const uc of useCases) {
    const submitterName = (uc.organizationName || 'Unknown').trim() || 'Unknown';
    const itemTitle = (uc.title || uc.id).trim();
    const ctx = (field: string): LinkContext => ({
      itemId: uc.id,
      itemTitle,
      field,
      submitterName,
    });

    if (uc.moreInfoUrl) addUrl(urlToContexts, uc.moreInfoUrl, ctx('moreInfoUrl'));
    if (uc.imageUrl) addUrl(urlToContexts, uc.imageUrl, ctx('imageUrl'));
    for (const [i, url] of (uc.imageUrls ?? []).entries()) {
      if (url) addUrl(urlToContexts, url, ctx(`imageUrls[${i}]`));
    }

    if (uc.video && typeof uc.video === 'object' && uc.video.url) {
      addUrl(urlToContexts, uc.video.url, ctx('video.url'));
    }
    for (const [i, entry] of (uc.videos ?? []).entries()) {
      const url = typeof entry === 'string' ? entry : entry?.url;
      if (url) addUrl(urlToContexts, url, ctx(`videos[${i}].url`));
    }

    const links = uc.links ?? {};
    for (const [bucket, items] of Object.entries(links)) {
      for (const [i, item] of (items ?? []).entries()) {
        if (item?.url) addUrl(urlToContexts, item.url, ctx(`links.${bucket}[${i}]`));
      }
    }
  }
}

function shouldSkipUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (
      (u.hostname === 'www.google.com' || u.hostname === 'google.com') &&
      u.pathname === '/s2/favicons'
    ) {
      return 'Google favicon helper URLs are excluded (often flaky for automated checks).';
    }
  } catch {
    return 'Invalid URL.';
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithMethod(
  url: string,
  method: 'HEAD' | 'GET'
): Promise<{ ok: boolean; status: number; softOk: boolean }> {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: '*/*',
  };
  // Avoid downloading full media/PDF bodies when GET is needed.
  if (method === 'GET') {
    headers.Range = 'bytes=0-0';
  }

  const res = await fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers,
  });

  const status = res.status;
  if (status >= 200 && status < 400) {
    return { ok: true, status, softOk: false };
  }
  if (SOFT_OK_STATUSES.has(status)) {
    return { ok: true, status, softOk: true };
  }
  return { ok: false, status, softOk: false };
}

function shouldRetryWithGetAfterHead(status: number | undefined): boolean {
  if (status === undefined) return true;
  // Many CDNs/WAF setups reject HEAD but serve GET.
  return status === 405 || status === 404 || status === 403 || status === 400;
}

async function checkOnce(
  url: string
): Promise<{ ok: boolean; status?: number; error?: string; via?: string; softOk?: boolean }> {
  try {
    const head = await fetchWithMethod(url, 'HEAD');
    if (head.ok) {
      return { ok: true, status: head.status, via: 'HEAD', softOk: head.softOk };
    }
    if (!shouldRetryWithGetAfterHead(head.status)) {
      return { ok: false, status: head.status, error: `HTTP ${head.status}`, via: 'HEAD' };
    }
    const get = await fetchWithMethod(url, 'GET');
    if (get.ok) {
      return { ok: true, status: get.status, via: 'GET', softOk: get.softOk };
    }
    return {
      ok: false,
      status: get.status,
      error: `HTTP ${get.status} (HEAD was ${head.status})`,
      via: 'GET',
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    try {
      const get = await fetchWithMethod(url, 'GET');
      if (get.ok) {
        return { ok: true, status: get.status, via: 'GET', softOk: get.softOk };
      }
      return {
        ok: false,
        status: get.status,
        error: `${message}; GET HTTP ${get.status}`,
        via: 'GET',
      };
    } catch (e2) {
      const m2 = e2 instanceof Error ? e2.message : String(e2);
      return { ok: false, error: `${message}; GET: ${m2}` };
    }
  }
}

async function checkHttpUrl(
  url: string
): Promise<{ ok: boolean; status?: number; error?: string; via?: string; softOk?: boolean }> {
  let last:
    | { ok: boolean; status?: number; error?: string; via?: string; softOk?: boolean }
    | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    last = await checkOnce(url);
    if (last.ok) return last;

    const retryable =
      last.status === undefined || (last.status !== undefined && RETRY_STATUSES.has(last.status));
    if (!retryable || attempt === MAX_ATTEMPTS) {
      // Persistent 429/503 after retries is usually a temporary outage or bot
      // throttle — do not email submitters about it.
      if (last.status !== undefined && (last.status === 429 || last.status === 503)) {
        return { ok: true, status: last.status, via: last.via, softOk: true };
      }
      return last;
    }
    await sleep(800 * attempt);
  }

  return last ?? { ok: false, error: 'Unknown error' };
}

interface BrokenEntry {
  url: string;
  status?: number;
  error: string;
  contexts: LinkContext[];
}

interface BySubmitterEntry {
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

interface SkippedEntry {
  url: string;
  reason: string;
}

interface SoftOkEntry {
  url: string;
  status: number;
}

interface LinkcheckReport {
  runAt: string;
  totalCatalogUrls: number;
  skippedCount: number;
  skipped?: SkippedEntry[];
  softOkCount: number;
  softOk?: SoftOkEntry[];
  totalUrls: number;
  brokenCount: number;
  broken: BrokenEntry[];
  bySubmitter: Record<string, BySubmitterEntry>;
}

async function main(): Promise<void> {
  const raw = readFileSync(AGGREGATED_PATH, 'utf-8');
  const data: AggregatedData = JSON.parse(raw);
  const useCases = data.useCases ?? [];

  const urlToContexts = new Map<string, { contexts: LinkContext[] }>();
  collectUseCaseUrls(useCases, urlToContexts);

  const skipped: SkippedEntry[] = [];
  const toCheck: string[] = [];
  for (const url of urlToContexts.keys()) {
    const reason = shouldSkipUrl(url);
    if (reason) {
      skipped.push({ url, reason });
      continue;
    }
    toCheck.push(url);
  }

  const totalCatalogUrls = urlToContexts.size;
  const skippedCount = skipped.length;
  const totalUrls = toCheck.length;
  console.log(`Checking ${totalUrls} unique URL(s) (${skippedCount} skipped)...`);

  const broken: BrokenEntry[] = [];
  const softOk: SoftOkEntry[] = [];
  let checked = 0;

  for (const url of toCheck) {
    const result = await checkHttpUrl(url);
    if (result.ok && result.softOk && result.status !== undefined) {
      softOk.push({ url, status: result.status });
    } else if (!result.ok) {
      broken.push({
        url,
        status: result.status,
        error: result.error ?? 'Unknown error',
        contexts: urlToContexts.get(url)!.contexts,
      });
    }
    checked++;
    if (checked % 25 === 0) console.log(`  ${checked}/${totalUrls}`);
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  const bySubmitter: Record<string, BySubmitterEntry> = {};
  for (const b of broken) {
    for (const ctx of b.contexts) {
      const name = ctx.submitterName;
      if (!bySubmitter[name]) {
        bySubmitter[name] = {
          useCaseIds: [],
          brokenUrls: [],
        };
      }
      if (!bySubmitter[name].useCaseIds.includes(ctx.itemId)) {
        bySubmitter[name].useCaseIds.push(ctx.itemId);
      }
      const exists = bySubmitter[name].brokenUrls.some(
        (u) => u.url === b.url && u.itemId === ctx.itemId && u.field === ctx.field
      );
      if (!exists) {
        bySubmitter[name].brokenUrls.push({
          url: b.url,
          error: b.error,
          status: b.status,
          itemId: ctx.itemId,
          itemTitle: ctx.itemTitle,
          field: ctx.field,
        });
      }
    }
  }

  const report: LinkcheckReport = {
    runAt: new Date().toISOString(),
    totalCatalogUrls,
    skippedCount,
    skipped: skippedCount > 0 ? skipped : undefined,
    softOkCount: softOk.length,
    softOk: softOk.length > 0 ? softOk : undefined,
    totalUrls,
    brokenCount: broken.length,
    broken,
    bySubmitter,
  };

  writeFileSync(REPORT_JSON_PATH, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Report written to ${REPORT_JSON_PATH}`);

  let md = `# Use-case catalog linkcheck – ${report.runAt.slice(0, 10)}\n\n`;
  md += `- **Catalog URLs collected:** ${totalCatalogUrls}\n`;
  if (skippedCount > 0) md += `- **Skipped (excluded):** ${skippedCount}\n`;
  md += `- **URLs checked:** ${totalUrls}\n`;
  if (softOk.length > 0) {
    md += `- **Soft-OK (401/403, treated as reachable):** ${softOk.length}\n`;
  }
  md += `- **Broken:** ${broken.length}\n\n`;

  if (broken.length > 0) {
    md += `## Broken links by submitter\n\n`;
    for (const [name, entry] of Object.entries(bySubmitter)) {
      md += `### ${name}\n`;
      for (const u of entry.brokenUrls) {
        md += `- \`${u.itemTitle}\` (${u.field}): ${u.url} — ${u.error}\n`;
      }
      md += `\n`;
    }
  }

  writeFileSync(REPORT_MD_PATH, md, 'utf-8');
  console.log(`Summary written to ${REPORT_MD_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
