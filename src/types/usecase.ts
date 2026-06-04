export type LinkSource = "catalog" | "manual";

export interface UseCaseLink {
  refId: string | null;
  labelRaw: string | null;
  url: string | null;
  source: LinkSource;
  walletType?: "personal" | "organizational" | null;
}

export interface UseCaseLinks {
  personalWallets?: UseCaseLink[];
  businessWallets?: UseCaseLink[];
  /** @deprecated Migrated to personalWallets / businessWallets on read */
  wallets?: UseCaseLink[];
  issuers?: UseCaseLink[];
  credentials?: UseCaseLink[];
  organizations?: UseCaseLink[];
  rps?: UseCaseLink[];
}

export type UseCaseStatus = "received" | "approved" | "published";
export type UseCaseStage = "demo" | "production";
export type InteractionMode = "remote" | "proximity";
export type IssuanceProtocol = "oid4vci" | "other";
export type VideoProvider = "youtube" | "vimeo";

export interface UseCaseVideo {
  url: string;
  provider: VideoProvider;
}

export interface UseCaseItem {
  id: string;
  sector: string;
  interactionModes?: InteractionMode[];
  vcFormats?: string[];
  issuanceProtocols?: IssuanceProtocol[];
  presentationProtocols?: string[];
  interopProfiles?: string[];
  title: string;
  summary: string;
  userJourney?: string;
  organizationName: string;
  /** ISO 3166-1 alpha-2 or EU */
  country?: string;
  stage?: UseCaseStage;
  imageUrl?: string;
  moreInfoUrl?: string;
  video?: UseCaseVideo;
  links?: UseCaseLinks;
  tags?: string[];
  status: UseCaseStatus;
  publishedAt?: string;
  updatedAt: string;
}

export interface UseCaseCatalogAggregated {
  schemaVersion: "1.1.0";
  catalogType: "use-case-catalog";
  lastUpdated: string;
  useCases: UseCaseItem[];
}
