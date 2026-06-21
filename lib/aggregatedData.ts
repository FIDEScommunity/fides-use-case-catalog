import fs from 'fs';
import path from 'path';

/**
 * Self-contained data layer for the public Use Case Catalog API (mirrors the
 * rp-catalog `lib/aggregatedData.ts` pattern for uniformity across catalogs).
 * The richer authoring types live in `src/types/use-case.ts`; here we only model
 * what the read-only API serves from `data/aggregated.json`.
 */

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

let dataCache: AggregatedUseCaseData | null = null;
let lastLoad = 0;
const CACHE_TTL_MS = 60_000;

export function loadUseCaseData(): AggregatedUseCaseData {
  const now = Date.now();
  if (dataCache && now - lastLoad < CACHE_TTL_MS) return dataCache;
  const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'aggregated.json'), 'utf-8');
  dataCache = JSON.parse(raw) as AggregatedUseCaseData;
  lastLoad = now;
  return dataCache;
}
