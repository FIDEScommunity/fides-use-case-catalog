/**
 * Self-contained data layer for the public Use Case Catalog API (mirrors the
 * rp-catalog `lib/aggregatedData.ts` pattern for uniformity across catalogs).
 * The richer authoring types live in `src/types/use-case.ts`; here we only model
 * what the read-only API serves from `data/aggregated.json`.
 *
 * Note: this repo is an ESM package ("type": "module"). A `process.cwd()`-based
 * `fs` read is not reliably traced/bundled by Vercel under ESM, and a bare
 * `import ... from '*.json'` needs runtime import attributes. Loading the JSON
 * via `createRequire` avoids both: the static path is traced and bundled, and
 * `require()` of JSON works without attributes.
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const aggregatedJson = require('../data/aggregated.json');

export interface UseCaseLinkRef {
  refId?: string | null;
  labelRaw?: string;
  url?: string | null;
  source?: string;
  walletType?: string | null;
}

export interface UseCaseLinks {
  personalWallets?: UseCaseLinkRef[];
  businessWallets?: UseCaseLinkRef[];
  issuers?: UseCaseLinkRef[];
  credentials?: UseCaseLinkRef[];
  organizations?: UseCaseLinkRef[];
  rps?: UseCaseLinkRef[];
  [bucket: string]: UseCaseLinkRef[] | undefined;
}

export interface AggregatedUseCase {
  id: string;
  title: string;
  summary: string;
  sector?: string;
  organizationName?: string;
  productionDeployment?: 'yes' | 'no' | '';
  status?: string;
  country?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  moreInfoUrl?: string;
  userJourney?: string;
  imageUrl?: string;
  imageUrls?: string[];
  tags?: string[];
  interactionModes?: string[];
  vcFormats?: string[];
  issuanceProtocols?: string[];
  presentationProtocols?: string[];
  interopProfiles?: string[];
  links?: UseCaseLinks;
  video?: Record<string, unknown> | null;
  videos?: unknown[];
  [extra: string]: unknown;
}

export interface AggregatedUseCaseData {
  schemaVersion?: string;
  catalogType?: string;
  lastUpdated?: string;
  generator?: string;
  count?: number;
  useCases: AggregatedUseCase[];
}

const aggregated = aggregatedJson as unknown as AggregatedUseCaseData;

export function loadUseCaseData(): AggregatedUseCaseData {
  return aggregated;
}
