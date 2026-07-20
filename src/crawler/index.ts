/**
 * FIDES Use Case Catalog Crawler
 *
 * Pipeline:
 *   1. (optional) SYNC — from the committed `data/wp-export/use-case.json` file
 *      that WordPress writes via the GitHub Contents API (primary), or inline
 *      JSON on repository_dispatch, or an HTTP pull on manual workflow_dispatch
 *      (recovery). Materializes one `community-catalogs/<orgSlug>/use-case-catalog.json`
 *      per organization.
 *   2. READ — load every `community-catalogs/<org>/use-case-catalog.json`.
 *   3. VALIDATE — against schemas/use-case-catalog.schema.json (draft 2020-12).
 *   4. AGGREGATE — flatten, dedupe by id, sort newest-first.
 *   5. WRITE — data/aggregated.json + a bundled copy inside the WP plugin.
 *
 * The WordPress submission DB is the source of truth; the per-org files are a
 * git-versioned, crawlable materialization (backup + cross-catalog/map source).
 */

import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type {
  UseCase,
  UseCaseCatalogFile,
  WordPressExport,
  AggregatedUseCaseData,
} from '../types/use-case.js';

const ROOT = process.cwd();

const CONFIG = {
  communityDir: path.join(ROOT, 'community-catalogs'),
  outputPath: path.join(ROOT, 'data', 'aggregated.json'),
  wpPluginDataPath: path.join(
    ROOT,
    'wordpress-plugin',
    'fides-use-case-catalog',
    'data',
    'aggregated.json'
  ),
  schemaPath: path.join(ROOT, 'schemas', 'use-case-catalog.schema.json'),
  exportUrl: process.env.USE_CASE_EXPORT_URL || '',
  // Committed export file (primary sync source). WordPress commits the full
  // export here via the GitHub Contents API; the push triggers this crawl,
  // which reads the file locally — no ~65 KB repository_dispatch payload cap
  // and no HTTP pull (so no WAF). Overridable for local testing.
  wpExportPath: process.env.USE_CASE_EXPORT_FILE
    ? path.resolve(ROOT, process.env.USE_CASE_EXPORT_FILE)
    : path.join(ROOT, 'data', 'wp-export', 'use-case.json'),
  schemaVersion: '1.0.0',
};

const SCHEMA_REF = 'https://fides.community/schemas/use-case-catalog/v1';
/** Shared UA for all FIDES catalog automation HTTP calls (CI, crawlers, invalidate). */
const AUTOMATION_USER_AGENT = 'FIDES-Catalog-Automation/1.0';

function log(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`[use-case-crawler] ${msg}`);
}

function fail(msg: string): never {
  // eslint-disable-next-line no-console
  console.error(`[use-case-crawler] ERROR: ${msg}`);
  process.exit(1);
}

function warn(msg: string): void {
  // Surface as a GitHub Actions annotation when running in CI, plus a plain log.
  if (process.env.GITHUB_ACTIONS) {
    // eslint-disable-next-line no-console
    console.log(`::warning::[use-case-crawler] ${msg}`);
  }
  // eslint-disable-next-line no-console
  console.warn(`[use-case-crawler] WARN: ${msg}`);
}

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw) as T;
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Fetch the WordPress export with the shared automation User-Agent and a small
 * retry loop. Managed WP hosts sometimes serve an HTML challenge on the first
 * hit, so a single text/html response should not fail the whole sync.
 */
async function fetchExport(url: string): Promise<WordPressExport> {
  const maxAttempts = 4;
  let lastError = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Cache-bust to avoid an edge-cached HTML response being replayed.
    const target = new URL(url);
    target.searchParams.set('_', String(Date.now()));

    const res = await fetch(target.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': AUTOMATION_USER_AGENT,
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });

    const body = await res.text();
    const contentType = res.headers.get('content-type') || '';

    if (res.ok) {
      try {
        return JSON.parse(body) as WordPressExport;
      } catch {
        const snippet = body.slice(0, 200).replace(/\s+/g, ' ').trim();
        lastError =
          `Export endpoint did not return JSON (content-type: "${contentType}", final URL: ${res.url}). ` +
          `Response started with: ${snippet}`;
      }
    } else {
      lastError = `Export request failed: HTTP ${res.status} (final URL: ${res.url}).`;
    }

    if (attempt < maxAttempts) {
      const delayMs = 1500 * attempt;
      log(`Export attempt ${attempt}/${maxAttempts} failed (${lastError}); retrying in ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(
    `${lastError}\n` +
    `       Use the canonical WordPress host without a redirect (e.g. https://fides.community/... not https://www.fides.community/...).`
  );
}

/**
 * SYNC step: materialize per-organization files from a WordPress export payload.
 * Existing use-case-catalog.json files for organizations no longer present in
 * the export are pruned so the git tree mirrors the published set.
 */
async function applyExportToCommunityFiles(data: WordPressExport): Promise<void> {
  if (!data || !Array.isArray(data.organizations)) {
    throw new Error('Export response missing "organizations" array.');
  }

  await fs.mkdir(CONFIG.communityDir, { recursive: true });

  const keptSlugs = new Set<string>();
  for (const org of data.organizations) {
    const slug = String(org.orgSlug || '').trim();
    if (!slug) continue;
    keptSlugs.add(slug);

    const file: UseCaseCatalogFile = {
      $schema: SCHEMA_REF,
      // Provenance marker: files written from the WordPress export are pruned
      // when their org drops out of the export. Community-authored files (added
      // via pull request, marked "community") are protected from pruning.
      source: 'wordpress',
      orgId: org.orgId,
      orgName: org.orgName,
      useCases: Array.isArray(org.useCases) ? org.useCases : [],
    };
    const dest = path.join(CONFIG.communityDir, slug, 'use-case-catalog.json');
    await writeJson(dest, file);
    log(`Wrote ${path.relative(ROOT, dest)} (${file.useCases.length} use cases)`);
  }

  // Prune organizations that are no longer published — but never touch
  // community-authored files (source !== "wordpress"), which are maintained by
  // organizations directly through pull requests rather than the WP export.
  const entries = existsSync(CONFIG.communityDir)
    ? await fs.readdir(CONFIG.communityDir, { withFileTypes: true })
    : [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (keptSlugs.has(entry.name)) continue;
    const stale = path.join(CONFIG.communityDir, entry.name, 'use-case-catalog.json');
    if (!existsSync(stale)) continue;

    let staleSource = '';
    try {
      const parsed = await readJson<UseCaseCatalogFile>(stale);
      staleSource = String(parsed.source || '');
    } catch {
      // Unreadable file: leave it for the validation step to flag.
      continue;
    }
    // Only files explicitly marked "community" are protected from pruning.
    // Everything else — WP-managed files, including legacy files that predate
    // the provenance marker — is pruned once its org drops out of the export.
    if (staleSource === 'community') {
      log(`Kept community-authored ${path.relative(ROOT, stale)} (source="community")`);
      continue;
    }

    await fs.rm(stale);
    log(`Pruned stale ${path.relative(ROOT, stale)}`);
  }
}

function loadInlineExportPayload(): WordPressExport | null {
  const inline = process.env.USE_CASE_EXPORT_JSON?.trim();
  if (!inline) return null;
  try {
    const data = JSON.parse(inline) as WordPressExport;
    if (!data?.organizations || !Array.isArray(data.organizations)) {
      throw new Error('export_json is missing organizations array.');
    }
    return data;
  } catch (err) {
    throw new Error(
      `Invalid USE_CASE_EXPORT_JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function shouldSyncFromWordPress(): boolean {
  if (process.env.USE_CASE_EXPORT_JSON?.trim()) return true;
  // Committed export file is the primary source: materialize community files
  // from it on every run (idempotent) so the git tree mirrors the export.
  if (existsSync(CONFIG.wpExportPath)) return true;
  const event = process.env.GITHUB_EVENT_NAME?.trim();
  if (event === 'repository_dispatch') return true;
  if (event === 'workflow_dispatch' && CONFIG.exportUrl) return true;
  if (process.env.USE_CASE_SYNC === '1' && CONFIG.exportUrl) return true;
  return false;
}

async function loadWordPressExport(): Promise<WordPressExport> {
  const inline = loadInlineExportPayload();
  if (inline) {
    log('Using inline export payload (WordPress push sync).');
    return inline;
  }

  // Primary: the export file WordPress committed via the Contents API.
  if (existsSync(CONFIG.wpExportPath)) {
    const rel = path.relative(ROOT, CONFIG.wpExportPath);
    log(`Using committed WordPress export ${rel}.`);
    const data = await readJson<WordPressExport>(CONFIG.wpExportPath);
    if (!data?.organizations || !Array.isArray(data.organizations)) {
      throw new Error(`Committed export ${rel} is missing an "organizations" array.`);
    }
    return data;
  }

  const event = process.env.GITHUB_EVENT_NAME?.trim();
  if (event === 'repository_dispatch') {
    throw new Error(
      'Missing USE_CASE_EXPORT_JSON on repository_dispatch. '
      + 'Enable GitHub push sync in WP Settings → FIDES Catalog SEO, or run recovery via workflow_dispatch.',
    );
  }

  if (!CONFIG.exportUrl) {
    throw new Error('Sync requested but USE_CASE_EXPORT_URL is not set.');
  }

  log(
    event === 'workflow_dispatch'
      ? `Recovery sync: pulling export via HTTP from ${CONFIG.exportUrl}`
      : `Fetching export from ${CONFIG.exportUrl}`,
  );
  return fetchExport(CONFIG.exportUrl);
}

async function listCommunityFiles(): Promise<string[]> {
  if (!existsSync(CONFIG.communityDir)) return [];
  const out: string[] = [];
  const orgs = await fs.readdir(CONFIG.communityDir, { withFileTypes: true });
  for (const org of orgs) {
    if (!org.isDirectory()) continue;
    const file = path.join(CONFIG.communityDir, org.name, 'use-case-catalog.json');
    if (existsSync(file)) out.push(file);
  }
  return out.sort();
}

async function main(): Promise<void> {
  if (shouldSyncFromWordPress()) {
    const data = await loadWordPressExport();
    await applyExportToCommunityFiles(data);
  }

  const schema = await readJson<Record<string, unknown>>(CONFIG.schemaPath);
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const files = await listCommunityFiles();
  if (files.length === 0) {
    log('No community-catalog files found. Writing an empty aggregate.');
  }

  const all: UseCase[] = [];
  const seen = new Set<string>();
  let invalid = 0;

  for (const file of files) {
    let parsed: UseCaseCatalogFile;
    try {
      parsed = await readJson<UseCaseCatalogFile>(file);
    } catch (err) {
      invalid++;
      // eslint-disable-next-line no-console
      console.error(
        `[use-case-crawler] Invalid JSON: ${path.relative(ROOT, file)} — ${(err as Error).message}`
      );
      continue;
    }

    if (!validate(parsed)) {
      invalid++;
      // eslint-disable-next-line no-console
      console.error(
        `[use-case-crawler] Schema errors in ${path.relative(ROOT, file)}:\n` +
          JSON.stringify(validate.errors, null, 2)
      );
      continue;
    }

    for (const uc of parsed.useCases) {
      const id = String(uc.id || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      all.push(uc);
    }
  }

  if (invalid > 0) {
    fail(`${invalid} community-catalog file(s) failed validation. Aborting.`);
  }

  all.sort((a, b) => {
    const ta = Date.parse(String(a.publishedAt || a.updatedAt || '')) || 0;
    const tb = Date.parse(String(b.publishedAt || b.updatedAt || '')) || 0;
    return tb - ta;
  });

  const aggregated: AggregatedUseCaseData = {
    schemaVersion: CONFIG.schemaVersion,
    catalogType: 'use-case-catalog',
    lastUpdated: new Date().toISOString(),
    generator: 'fides-use-case-catalog crawler',
    count: all.length,
    useCases: all,
  };

  await writeJson(CONFIG.outputPath, aggregated);
  log(`Wrote ${path.relative(ROOT, CONFIG.outputPath)} (${all.length} use cases)`);

  if (existsSync(path.dirname(path.dirname(CONFIG.wpPluginDataPath)))) {
    await writeJson(CONFIG.wpPluginDataPath, aggregated);
    log(`Wrote ${path.relative(ROOT, CONFIG.wpPluginDataPath)}`);
  }
}

main().catch((err) => fail((err as Error).message));
