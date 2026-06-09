/**
 * FIDES Use Case Catalog Crawler
 *
 * Pipeline:
 *   1. (optional) SYNC — when USE_CASE_EXPORT_URL is set (or `npm run sync`),
 *      fetch the WordPress /export endpoint and (re)write one
 *      `community-catalogs/<orgSlug>/use-case-catalog.json` per organization.
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
  syncMode: process.env.USE_CASE_SYNC === '1' || !!process.env.USE_CASE_EXPORT_URL,
  schemaVersion: '1.0.0',
};

const SCHEMA_REF = 'https://fides.community/schemas/use-case-catalog/v1';

function log(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`[use-case-crawler] ${msg}`);
}

function fail(msg: string): never {
  // eslint-disable-next-line no-console
  console.error(`[use-case-crawler] ERROR: ${msg}`);
  process.exit(1);
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
 * SYNC step: pull the WordPress export and (re)write per-organization files.
 * Existing use-case-catalog.json files for organizations no longer present in
 * the export are pruned so the git tree always mirrors the published set.
 */
async function syncFromWordPress(): Promise<void> {
  if (!CONFIG.exportUrl) {
    fail('Sync requested but USE_CASE_EXPORT_URL is not set.');
  }
  log(`Fetching export from ${CONFIG.exportUrl}`);

  const res = await fetch(CONFIG.exportUrl, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    fail(`Export request failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as WordPressExport;
  if (!data || !Array.isArray(data.organizations)) {
    fail('Export response missing "organizations" array.');
  }

  await fs.mkdir(CONFIG.communityDir, { recursive: true });

  const keptSlugs = new Set<string>();
  for (const org of data.organizations) {
    const slug = String(org.orgSlug || '').trim();
    if (!slug) continue;
    keptSlugs.add(slug);

    const file: UseCaseCatalogFile = {
      $schema: SCHEMA_REF,
      orgId: org.orgId,
      orgName: org.orgName,
      useCases: Array.isArray(org.useCases) ? org.useCases : [],
    };
    const dest = path.join(CONFIG.communityDir, slug, 'use-case-catalog.json');
    await writeJson(dest, file);
    log(`Wrote ${path.relative(ROOT, dest)} (${file.useCases.length} use cases)`);
  }

  // Prune organizations that are no longer published.
  const entries = existsSync(CONFIG.communityDir)
    ? await fs.readdir(CONFIG.communityDir, { withFileTypes: true })
    : [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (keptSlugs.has(entry.name)) continue;
    const stale = path.join(CONFIG.communityDir, entry.name, 'use-case-catalog.json');
    if (existsSync(stale)) {
      await fs.rm(stale);
      log(`Pruned stale ${path.relative(ROOT, stale)}`);
    }
  }
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
  if (CONFIG.syncMode) {
    await syncFromWordPress();
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
