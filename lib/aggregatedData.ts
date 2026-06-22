/**
 * Self-contained data layer for the public Use Case Catalog API (mirrors the
 * rp-catalog `lib/aggregatedData.ts` pattern for uniformity across catalogs).
 * The richer authoring types live in `src/types/use-case.ts`; here we only model
 * what the read-only API serves from `data/aggregated.json`.
 *
 * Note: this repo is an ESM package ("type": "module"). Under ESM, Vercel's Node
 * File Trace does not reliably include a `process.cwd()`-based `fs` read, so the
 * data is imported statically and inlined into the function bundle at build time
 * instead (refreshed on each deploy, which is when the crawler updates the file).
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JSON import inlined by the bundler (esbuild) at build time.
import aggregatedJson from '../data/aggregated.json';

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
