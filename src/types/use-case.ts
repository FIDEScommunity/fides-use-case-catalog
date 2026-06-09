/**
 * Shared types for the FIDES Use Case Catalog crawler.
 */

export interface UseCaseLinkRef {
  refId?: string;
  labelRaw?: string;
  url?: string;
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

export interface UseCase {
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

/** Per-organization source file (community-catalogs/<orgSlug>/use-case-catalog.json). */
export interface UseCaseCatalogFile {
  $schema?: string;
  /**
   * Provenance: "wordpress" = written by the crawler from the WP export (pruned
   * when the org leaves the export); anything else (e.g. "community") = authored
   * directly via pull request and protected from pruning.
   */
  source?: string;
  orgId: string;
  orgName?: string;
  useCases: UseCase[];
}

/** One organization bucket as returned by the WordPress /export endpoint. */
export interface ExportOrganization {
  orgSlug: string;
  orgId: string;
  orgName: string;
  useCases: UseCase[];
}

/** Shape of the WordPress /wp-json/fides-use-case/v1/export response. */
export interface WordPressExport {
  schemaVersion: string;
  catalogType: string;
  generatedAt: string;
  organizations: ExportOrganization[];
}

/** Final aggregated output (data/aggregated.json), consumed by the WP catalog + map. */
export interface AggregatedUseCaseData {
  schemaVersion: string;
  catalogType: string;
  lastUpdated: string;
  generator: string;
  count: number;
  useCases: UseCase[];
}
