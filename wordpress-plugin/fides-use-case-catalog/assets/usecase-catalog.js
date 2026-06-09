(function () {
  const config = window.FIDES_USE_CASE_LIST_CONFIG || {};
  const apiBase = String(config.apiBase || "").replace(/\/$/, "");
  // Primary data source = git-versioned aggregated.json on GitHub (the source
  // organizations can amend via pull request). REST /catalog stays as the
  // same-origin fallback for local/empty/unreachable situations.
  const aggregatedUrl = String(config.aggregatedUrl || "").trim();
  const taxonomy = config.taxonomy || {};
  const SECTOR_LABELS = taxonomy.sectors || {};
  const INTERACTION_MODE_LABELS = taxonomy.interactionModes || {};
  const VC_FORMAT_LABELS = taxonomy.vcFormats || {};
  const ISSUANCE_PROTOCOL_LABELS = taxonomy.issuanceProtocols || {};
  const PRESENTATION_PROTOCOL_LABELS = taxonomy.presentationProtocols || {};
  const INTEROP_PROFILE_LABELS = taxonomy.interopProfiles || {};
  const TAXONOMY_FILTER_GROUPS = [
    { key: "interactionModes", title: "Interaction mode", labels: INTERACTION_MODE_LABELS },
    { key: "vcFormats", title: "VC format", labels: VC_FORMAT_LABELS },
    { key: "issuanceProtocols", title: "Issuance protocol", labels: ISSUANCE_PROTOCOL_LABELS },
    { key: "presentationProtocols", title: "Presentation protocol", labels: PRESENTATION_PROTOCOL_LABELS },
    { key: "interopProfiles", title: "Interop profile", labels: INTEROP_PROFILE_LABELS }
  ];
  const USE_CASE_FILTER_TO_VOCAB = {
    sector: "sector",
    country: "country",
    productionDeployment: "productionDeployment",
    interactionModes: "interactionMode",
    vcFormats: "vcFormat",
    issuanceProtocols: "issuanceProtocol",
    presentationProtocols: "presentationProtocol",
    interopProfiles: "interopProfile"
  };
  const RATINGS_API_BASE = config.ratingsApiBase ? String(config.ratingsApiBase).trim().replace(/\/$/, "") : "";
  const RATINGS_NONCE = config.ratingsNonce ? String(config.ratingsNonce) : "";
  const RATINGS_IS_LOGGED_IN = !!config.ratingsIsLoggedIn;
  const RATINGS_LOGIN_URL = config.ratingsLoginUrl ? String(config.ratingsLoginUrl) : "";
  const RATINGS_BATCH_LIMIT = 100;
  const RATINGS_TYPE = "usecase";
  const root = document.getElementById("fides-use-case-catalog-root");
  if (!root) return;

  const PRODUCTION_DEPLOYMENT_LABELS = Object.assign(
    { no: "No", yes: "Yes" },
    config.productionDeploymentOptions || {}
  );
  const PRODUCTION_DEPLOYMENT_OPTIONS = Object.keys(PRODUCTION_DEPLOYMENT_LABELS);
  const CATALOG_URLS = {
    personalWallet: String(config.personalWalletCatalogUrl || config.walletCatalogUrl || "").replace(/\/$/, ""),
    businessWallet: String(config.businessWalletCatalogUrl || "").replace(/\/$/, ""),
    issuer: String(config.issuerCatalogUrl || "").replace(/\/$/, ""),
    credential: String(config.credentialCatalogUrl || "").replace(/\/$/, ""),
    rp: String(config.rpCatalogUrl || "").replace(/\/$/, ""),
    organization: String(config.organizationCatalogUrl || "").replace(/\/$/, "")
  };
  const LINK_ACCORDION_SECTIONS = [
    {
      key: "personal-wallets",
      linksKey: "personalWallets",
      title: "Personal wallets",
      iconKey: "wallet",
      catalogType: "personalWallet",
      ratingType: "wallet",
      param: "wallet",
      pluralParam: "wallets"
    },
    {
      key: "business-wallets",
      linksKey: "businessWallets",
      title: "Business wallets",
      iconKey: "wallet",
      catalogType: "businessWallet",
      ratingType: "wallet",
      param: "wallet",
      pluralParam: "wallets"
    },
    { key: "issuers", linksKey: "issuers", title: "Issuers", iconKey: "server", catalogType: "issuer", param: "issuer", pluralParam: "issuers" },
    { key: "rps", linksKey: "rps", title: "Relying parties", iconKey: "building", catalogType: "rp", param: "rp", pluralParam: "rps" },
    { key: "credentials", linksKey: "credentials", title: "Credential types", iconKey: "fileCheck", catalogType: "credential", param: "credential", pluralParam: "credentials" }
  ];
  const ratingSummariesByUseCaseId = Object.create(null);
  const ratingSummariesByLinkedType = Object.create(null);
  let selectedUseCase = null;
  let vocabulary = null;
  const VOCABULARY_URL = config.vocabularyUrl ? String(config.vocabularyUrl) : "";
  const VOCABULARY_FALLBACK_URL = config.vocabularyFallbackUrl ? String(config.vocabularyFallbackUrl) : "";

  function normalizeColumns(value) {
    const cols = String(value || "3");
    return cols === "2" || cols === "3" || cols === "4" ? cols : "3";
  }

  const settings = {
    showFilters: true,
    showSearch: true,
    columns: normalizeColumns(root.dataset.columns || config.columns)
  };
  const LIST_BREAKPOINT = 1024;
  let viewMode = localStorage.getItem("fides-use-case-view") || "grid";

  const icons = {
    search:
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>',
    filter:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>',
    x:
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    xSmall:
      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    chevronDown:
      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    chevronLeft:
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    chevronRight:
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    chevronUp:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"></path></svg>',
    chevronDoubleDown:
      '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 8 6 6 6-6"></path><path d="m6 14 6 6 6-6"></path></svg>',
    viewGrid:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
    viewList:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>',
    globe:
      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
    building:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>',
    tag:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>',
    calendar:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
    link:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    eye:
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    xLarge:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>',
    maximize:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
    play:
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>',
    share:
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>',
    server:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>',
    wallet:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>',
    fileCheck:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></svg>',
    shield:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
    check:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    externalLinkSmall:
      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" x2="21" y1="14" y2="3"></line></svg>'
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function prettifyKey(value) {
    return String(value || "")
      .replaceAll(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  function normalizeProductionDeployment(value) {
    const raw = String(value || "").trim().toLowerCase();
    return PRODUCTION_DEPLOYMENT_LABELS[raw] ? raw : "";
  }

  function productionDeploymentLabel(value) {
    const slug = normalizeProductionDeployment(value);
    return slug ? PRODUCTION_DEPLOYMENT_LABELS[slug] || prettifyKey(slug) : "—";
  }

  function formatLikeCount(count) {
    const n = Number(count) || 0;
    if (n <= 0) return "No likes yet";
    return n + " like" + (n === 1 ? "" : "s");
  }

  function buildRatingsEndpoint(baseUrl, path, queryParams) {
    const rawBase = String(baseUrl || "").trim();
    const safePath = String(path || "").replace(/^\/+/, "");
    if (!rawBase) return "";
    try {
      const url = new URL(rawBase, window.location.origin);
      if (url.origin !== window.location.origin) {
        url.protocol = window.location.protocol;
        url.host = window.location.host;
      }
      if (url.searchParams.has("rest_route")) {
        const currentRoute = String(url.searchParams.get("rest_route") || "").replace(/\/+$/, "");
        url.searchParams.set("rest_route", currentRoute + "/" + safePath);
      } else {
        const basePath = url.pathname.replace(/\/+$/, "");
        url.pathname = basePath + "/" + safePath;
      }
      if (queryParams && typeof queryParams === "object") {
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;
          url.searchParams.set(key, String(value));
        });
      }
      return url.toString();
    } catch (_err) {
      return "";
    }
  }

  function setUseCaseRatingSummary(useCaseId, rawSummary) {
    if (!useCaseId || !rawSummary) return;
    const likeCount = Number(rawSummary.likes);
    ratingSummariesByUseCaseId[useCaseId] = {
      count: Number.isFinite(likeCount) ? likeCount : Number(rawSummary.count) || 0,
      myRating: Number(rawSummary.my_like) > 0 || Number(rawSummary.my_rating) > 0 ? 1 : null
    };
  }

  function ratingMapForLinkedType(type) {
    if (!type) return null;
    if (!ratingSummariesByLinkedType[type]) {
      ratingSummariesByLinkedType[type] = Object.create(null);
    }
    return ratingSummariesByLinkedType[type];
  }

  function setLinkedRatingSummary(type, itemId, rawSummary) {
    if (!type || !itemId || !rawSummary) return;
    const map = ratingMapForLinkedType(type);
    if (!map) return;
    const likeCount = Number(rawSummary.likes);
    map[itemId] = {
      count: Number.isFinite(likeCount) ? likeCount : Number(rawSummary.count) || 0,
      myRating: Number(rawSummary.my_like) > 0 || Number(rawSummary.my_rating) > 0 ? 1 : null
    };
  }

  function renderModalEntityLike(type, itemId) {
    const map = ratingMapForLinkedType(type);
    const summary = map && itemId ? map[itemId] : null;
    const count = summary ? Number(summary.count) || 0 : 0;
    if (count < 1) return "";
    const likedClass = summary && summary.myRating === 1 ? " is-liked" : "";
    return (
      '<span class="fides-modal-entity-like' +
      likedClass +
      '">' +
      '<span class="fides-modal-entity-like-star">★</span><span class="fides-modal-entity-like-count">' +
      escapeHtml(String(count)) +
      "</span></span>"
    );
  }

  async function loadLinkedEntityRatingSummaries(item) {
    Object.keys(ratingSummariesByLinkedType).forEach((key) => {
      delete ratingSummariesByLinkedType[key];
    });
    if (!RATINGS_API_BASE || !item) return;

    const batchIdsByType = Object.create(null);
    LINK_ACCORDION_SECTIONS.forEach((section) => {
      const type = section.ratingType || section.catalogType;
      if (!type) return;
      if (!batchIdsByType[type]) batchIdsByType[type] = new Set();
      getLinkItems(item, section.linksKey)
        .map((link) => link && link.refId)
        .filter(Boolean)
        .forEach((id) => batchIdsByType[type].add(String(id)));
    });
    const batches = Object.keys(batchIdsByType).map((type) => ({
      type,
      ids: Array.from(batchIdsByType[type])
    }));

    for (const batch of batches) {
      for (let i = 0; i < batch.ids.length; i += RATINGS_BATCH_LIMIT) {
        const chunk = batch.ids.slice(i, i + RATINGS_BATCH_LIMIT);
        const url = buildRatingsEndpoint(RATINGS_API_BASE, "ratings/batch", {
          type: batch.type,
          ids: chunk.join(","),
          _wpnonce: RATINGS_NONCE || ""
        });
        if (!url) continue;
        try {
          const res = await fetch(url, {
            method: "GET",
            credentials: "same-origin",
            headers: { "X-WP-Nonce": RATINGS_NONCE || "" }
          });
          if (!res.ok) continue;
          const data = await res.json();
          const results = data && data.results ? data.results : {};
          chunk.forEach((id) =>
            setLinkedRatingSummary(batch.type, id, results[id] || { likes: 0, count: 0, my_like: null })
          );
        } catch (_err) {
          /* linked tables still render without likes */
        }
      }
    }
  }

  function renderUseCaseHeroLikeBadge(useCaseId) {
    const summary = ratingSummariesByUseCaseId[useCaseId];
    const count = summary ? Number(summary.count) || 0 : 0;
    const isLiked = summary && summary.myRating === 1;

    if (!RATINGS_API_BASE) return "";

    return (
      '<span class="fides-use-case-hero-like-badge' +
      (isLiked ? " is-liked" : "") +
      '" title="Community likes">' +
      '<span class="fides-use-case-hero-like-star' +
      (isLiked ? " is-filled" : "") +
      '" aria-hidden="true">★</span>' +
      '<span class="fides-use-case-hero-like-count">' +
      escapeHtml(String(count)) +
      "</span></span>"
    );
  }

  async function loadUseCaseRatingSummaries(items) {
    Object.keys(ratingSummariesByUseCaseId).forEach((key) => {
      delete ratingSummariesByUseCaseId[key];
    });
    if (!RATINGS_API_BASE) return;
    const ids = Array.from(new Set((items || []).map((item) => item && item.id).filter(Boolean)));
    for (let i = 0; i < ids.length; i += RATINGS_BATCH_LIMIT) {
      const chunk = ids.slice(i, i + RATINGS_BATCH_LIMIT);
      const url = buildRatingsEndpoint(RATINGS_API_BASE, "ratings/batch", {
        type: RATINGS_TYPE,
        ids: chunk.join(","),
        _wpnonce: RATINGS_NONCE || ""
      });
      if (!url) continue;
      try {
        const res = await fetch(url, {
          method: "GET",
          credentials: "same-origin",
          headers: { "X-WP-Nonce": RATINGS_NONCE || "" }
        });
        if (!res.ok) continue;
        const data = await res.json();
        const results = data && data.results ? data.results : {};
        chunk.forEach((id) => setUseCaseRatingSummary(id, results[id] || { likes: 0, count: 0, my_like: null }));
      } catch (_err) {
        /* keep cards usable without ratings */
      }
    }
  }

  async function submitUseCaseLike(useCaseId) {
    const url = buildRatingsEndpoint(RATINGS_API_BASE, "ratings", {
      _wpnonce: RATINGS_NONCE || ""
    });
    if (!url) throw new Error("ratings_url_invalid");
    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": RATINGS_NONCE || ""
      },
      body: JSON.stringify({
        type: RATINGS_TYPE,
        item_id: useCaseId,
        rating: 1
      })
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const reason = payload && (payload.error || payload.code || payload.message);
      throw new Error(reason || "like_submit_failed");
    }
    return payload || {};
  }

  async function deleteUseCaseLike(useCaseId) {
    const url = buildRatingsEndpoint(RATINGS_API_BASE, "ratings", {
      _wpnonce: RATINGS_NONCE || "",
      type: RATINGS_TYPE,
      item_id: useCaseId
    });
    if (!url) throw new Error("ratings_url_invalid");
    const res = await fetch(url, {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "X-WP-Nonce": RATINGS_NONCE || "" }
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const reason = payload && (payload.error || payload.code || payload.message);
      throw new Error(reason || "like_delete_failed");
    }
    return payload || {};
  }

  function refreshUseCaseRatingUi(useCaseId) {
    const safeId = String(useCaseId || "");
    root.querySelectorAll(".fides-use-case-card-item").forEach((card) => {
      if (card.getAttribute("data-use-case-id") !== safeId) return;
      const slot = card.querySelector(".fides-use-case-hero-like");
      if (slot) slot.innerHTML = renderUseCaseHeroLikeBadge(useCaseId);
    });
  }

  function useCaseModalDeepLink(useCaseId) {
    const url = new URL(window.location.href);
    url.searchParams.set("usecase", useCaseId);
    return url.toString();
  }

  function buildLoginUrlWithReturnTo(loginUrl, returnToUrl) {
    const base = String(loginUrl || "").trim();
    const returnTo = String(returnToUrl || "").trim();
    if (!base) return "";
    if (!returnTo) return base;
    try {
      const u = new URL(base, window.location.origin);
      u.searchParams.set("return_to", returnTo);
      return u.toString();
    } catch {
      const sep = base.indexOf("?") === -1 ? "?" : "&";
      return base + sep + "return_to=" + encodeURIComponent(returnTo);
    }
  }

  function renderUseCaseModalLike(slot, state) {
    if (!slot) return;
    const summaryLabel = formatLikeCount(state.count);
    const isLiked = state.myRating === 1;
    const deepLink = selectedUseCase ? useCaseModalDeepLink(selectedUseCase.id) : "";
    const loginUrl = buildLoginUrlWithReturnTo(RATINGS_LOGIN_URL, deepLink);
    const starButton = RATINGS_IS_LOGGED_IN
      ? '<button type="button" class="fides-rating-star fides-rating-star-single' +
        (isLiked ? " is-filled" : "") +
        '" data-rating-toggle="1" ' +
        (state.saving ? "disabled" : "") +
        ' aria-label="' +
        (isLiked ? "Remove your like" : "Like this use case") +
        '">★</button>'
      : '<button type="button" class="fides-rating-star fides-rating-star-single is-readonly' +
        (isLiked ? " is-filled" : "") +
        '" disabled aria-hidden="true">★</button>';
    const actionLine = RATINGS_IS_LOGGED_IN
      ? '<span class="fides-modal-rating-note fides-modal-rating-note-inline">' +
        (state.saving ? "Updating like..." : isLiked ? "You like this use case. Click again to remove." : "Click the star to like this use case.") +
        "</span>"
      : loginUrl
        ? '<span class="fides-modal-rating-note fides-modal-rating-note-inline"><a href="' +
          escapeHtml(loginUrl) +
          '" class="fides-modal-rating-login">Sign in to like</a></span>'
        : '<span class="fides-modal-rating-note fides-modal-rating-note-inline">Sign in to like</span>';
    slot.innerHTML =
      '<div class="fides-modal-rating">' +
      '<div class="fides-modal-rating-summary">' +
      starButton +
      '<span class="fides-modal-rating-value">' +
      escapeHtml(summaryLabel) +
      "</span>" +
      actionLine +
      "</div></div>";
  }

  async function initUseCaseModalLike(useCaseId) {
    const slot = document.getElementById("fides-modal-rating-slot");
    if (!slot || !useCaseId || !RATINGS_API_BASE) return;
    let state = { count: 0, myRating: null, saving: false };
    const cached = ratingSummariesByUseCaseId[useCaseId];
    if (cached) state = Object.assign(state, cached);
    renderUseCaseModalLike(slot, state);
    slot.addEventListener("click", async (event) => {
      const btn = event.target && event.target.closest ? event.target.closest("[data-rating-toggle]") : null;
      if (!btn || !RATINGS_IS_LOGGED_IN || state.saving) return;
      event.preventDefault();
      event.stopPropagation();
      const previous = { count: state.count, myRating: state.myRating };
      const removing = state.myRating === 1;
      state = Object.assign(state, { saving: true, myRating: removing ? null : 1 });
      renderUseCaseModalLike(slot, state);
      try {
        const data = removing ? await deleteUseCaseLike(useCaseId) : await submitUseCaseLike(useCaseId);
        const summary = data && data.summary ? data.summary : {};
        const likes = Number(summary.likes);
        state = {
          count: Number.isFinite(likes) ? likes : Number(summary.count) || 0,
          myRating: Number(data && data.my_like) > 0 || Number(data && data.my_rating) > 0 ? 1 : null,
          saving: false
        };
        ratingSummariesByUseCaseId[useCaseId] = { count: state.count, myRating: state.myRating };
        refreshUseCaseRatingUi(useCaseId);
      } catch (_err) {
        state = Object.assign(state, { count: previous.count, myRating: previous.myRating, saving: false });
      }
      renderUseCaseModalLike(slot, state);
    });
  }

  function showToast(message, type, theme) {
    const toast = document.createElement("div");
    toast.className = "fides-toast";
    toast.setAttribute("data-theme", theme || "fides");
    toast.innerHTML =
      `<div class="fides-toast-icon">${type === "success" ? icons.check : icons.x}</div>` +
      `<div class="fides-toast-message">${escapeHtml(message)}</div>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("fides-toast-out");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function copyUseCaseLink() {
    if (!selectedUseCase || !selectedUseCase.id) return;
    const text = useCaseModalDeepLink(selectedUseCase.id);
    const catalogEl = root.querySelector(".fides-use-case-catalog");
    const theme = catalogEl ? catalogEl.getAttribute("data-theme") || "fides" : "fides";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast("Link copied to clipboard", "success", theme);
      }).catch(() => {
        showToast("Failed to copy link", "error", theme);
      });
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand("copy");
    textarea.remove();
    showToast(success ? "Link copied to clipboard" : "Failed to copy link", success ? "success" : "error", theme);
  }

  function formatDateLabel(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US");
  }

  function getLinkItems(item, linksKey) {
    const links = item && item.links ? item.links : {};
    const list = links[linksKey];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }

  function linkItemLabel(link) {
    if (!link || typeof link !== "object") return "—";
    return String(link.labelRaw || link.refId || link.url || "—").trim() || "—";
  }

  function catalogExploreHref(catalogBase, param, pluralParam, links) {
    const base = String(catalogBase || "").replace(/\/$/, "");
    if (!base) return "";
    const ids = (links || []).map((link) => link && link.refId).filter(Boolean);
    if (ids.length === 0) return "";
    try {
      const url = new URL(base, window.location.origin);
      if (ids.length === 1) {
        url.searchParams.set(param, ids[0]);
      } else {
        url.searchParams.set(pluralParam, ids.map((id) => encodeURIComponent(String(id))).join(","));
      }
      return url.toString();
    } catch (_err) {
      return "";
    }
  }

  function linkItemHref(link, catalogBase, param) {
    if (link && link.url) return String(link.url);
    const refId = link && link.refId ? String(link.refId) : "";
    const base = String(catalogBase || "").replace(/\/$/, "");
    if (!refId || !base) return "";
    try {
      const url = new URL(base, window.location.origin);
      url.searchParams.set(param, refId);
      return url.toString();
    } catch (_err) {
      return "";
    }
  }

  function linkedItemsHaveVisibleLikes(links, ratingType) {
    if (!ratingType || !RATINGS_API_BASE) return false;
    const map = ratingMapForLinkedType(ratingType);
    if (!map) return false;
    return (links || []).some((link) => {
      const refId = link && link.refId ? String(link.refId) : "";
      if (!refId) return false;
      const summary = map[refId];
      return summary && (Number(summary.count) || 0) >= 1;
    });
  }

  function renderEcoWalletBox(count, labelSingular, labelPlural, exploreHref, accordionId) {
    const label = count === 1 ? labelSingular : labelPlural;
    const countLabel = count > 0 ? String(count) : "—";
    const hasItems = count > 0;
    const targetAttr = hasItems && accordionId ? ` data-fides-eco-target="${accordionId}"` : "";

    if (hasItems && exploreHref) {
      return `<a href="${escapeHtml(exploreHref)}" class="fides-eco-wallet-box fides-eco-wallet-box--link" onclick="event.stopPropagation();"${targetAttr}>
          <span class="fides-eco-wallet-count">${countLabel}</span>
          <span class="fides-eco-wallet-label">${label}</span>
        </a>`;
    }

    const interactiveClass = hasItems && accordionId ? " fides-eco-wallet-box--interactive" : "";
    return `<div class="fides-eco-wallet-box${interactiveClass}"${targetAttr}>
        <span class="fides-eco-wallet-count">${countLabel}</span>
        <span class="fides-eco-wallet-label">${label}</span>
      </div>`;
  }

  function renderUseCaseEcosystemModel(item) {
    const personalWallets = getLinkItems(item, "personalWallets");
    const businessWallets = getLinkItems(item, "businessWallets");
    const issuers = getLinkItems(item, "issuers");
    const credentials = getLinkItems(item, "credentials");
    const rps = getLinkItems(item, "rps");
    const personalExploreHref = catalogExploreHref(
      CATALOG_URLS.personalWallet,
      "wallet",
      "wallets",
      personalWallets
    );
    const businessExploreHref = catalogExploreHref(
      CATALOG_URLS.businessWallet,
      "wallet",
      "wallets",
      businessWallets
    );
    const credentialLabel = credentials.length === 1 ? "Credential type" : "Credential types";

    const personalWalletBox = renderEcoWalletBox(
      personalWallets.length,
      "Personal Wallet",
      "Personal Wallets",
      personalExploreHref,
      "fides-accordion-personal-wallets"
    );
    const businessWalletBox = renderEcoWalletBox(
      businessWallets.length,
      "Business Wallet",
      "Business Wallets",
      businessExploreHref,
      "fides-accordion-business-wallets"
    );

    const issuerStatClass =
      "fides-eco-wallet-box fides-eco-stat-box fides-eco-stat-box--green" +
      (issuers.length > 0 ? "" : " fides-eco-stat-box--static");
    const rpStatClass =
      "fides-eco-wallet-box fides-eco-stat-box fides-eco-stat-box--blue" +
      (rps.length > 0 ? "" : " fides-eco-stat-box--static");
    const credentialStatClass =
      "fides-eco-wallet-box fides-eco-stat-box fides-eco-stat-box--green" +
      (credentials.length > 0 ? "" : " fides-eco-stat-box--static");

    return `
      <div class="fides-accordion fides-modal-section" id="fides-use-case-ecosystem">
        <div class="fides-accordion-header fides-modal-section-header">
          <span class="fides-accordion-title">${icons.wallet} FIDES Ecosystem Model</span>
        </div>
        <div class="fides-accordion-body fides-modal-ecosystem-body">
          <div class="fides-modal-ecosystem">
            <div class="fides-eco-wallet-row">${personalWalletBox}</div>
            <div class="fides-eco-wallet-connector">${icons.chevronUp}</div>
            <div class="fides-eco-main-row">
              <div class="fides-eco-col fides-eco-stat-wrap">
                <div class="${issuerStatClass}"${issuers.length > 0 ? ' data-fides-eco-target="fides-accordion-issuers"' : ""}>
                  <div class="fides-eco-stat-box-main">
                    <span class="fides-eco-wallet-count">${issuers.length}</span>
                    <span class="fides-eco-wallet-label">${issuers.length === 1 ? "Issuer" : "Issuers"}</span>
                  </div>
                  ${issuers.length > 0 ? `<span class="fides-eco-stat-hint" aria-hidden="true">${icons.chevronDoubleDown}</span>` : ""}
                </div>
              </div>
              <div class="fides-eco-arrow">${icons.chevronDown}</div>
              <div class="fides-eco-col fides-eco-stat-wrap fides-eco-col-center">
                <div class="${credentialStatClass}"${
                  credentials.length > 0 ? ' data-fides-eco-target="fides-accordion-credentials"' : ""
                }>
                  <div class="fides-eco-stat-box-main">
                    <span class="fides-eco-wallet-count">${credentials.length > 0 ? credentials.length : "—"}</span>
                    <span class="fides-eco-wallet-label">${credentialLabel}</span>
                  </div>
                  ${credentials.length > 0 ? `<span class="fides-eco-stat-hint" aria-hidden="true">${icons.chevronDoubleDown}</span>` : ""}
                </div>
              </div>
              <div class="fides-eco-arrow fides-eco-arrow-right">${icons.chevronDown}</div>
              <div class="fides-eco-col fides-eco-stat-wrap fides-eco-rp-col">
                <div class="${rpStatClass}"${rps.length > 0 ? ' data-fides-eco-target="fides-accordion-rps"' : ""}>
                  <div class="fides-eco-stat-box-main">
                    <span class="fides-eco-wallet-count">${rps.length}</span>
                    <span class="fides-eco-wallet-label">${rps.length === 1 ? "Relying party" : "Relying parties"}</span>
                  </div>
                  ${rps.length > 0 ? `<span class="fides-eco-stat-hint" aria-hidden="true">${icons.chevronDoubleDown}</span>` : ""}
                </div>
              </div>
            </div>
            <div class="fides-eco-wallet-connector">${icons.chevronDown}</div>
            <div class="fides-eco-wallet-row">${businessWalletBox}</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderLinkedEntityList(links, catalogBase, param, sectionTitle, ratingType) {
    const sorted = [...links].sort((a, b) =>
      linkItemLabel(a).localeCompare(linkItemLabel(b), undefined, { sensitivity: "base" })
    );
    if (sorted.length === 0) {
      return `<p class="fides-modal-empty">No linked ${escapeHtml(sectionTitle.toLowerCase())} yet.</p>`;
    }
    const showLikesCol = linkedItemsHaveVisibleLikes(sorted, ratingType);
    const tableClass = showLikesCol
      ? "fides-attributes-table fides-modal-rp-table fides-modal-entity-table fides-modal-entity-table--likes"
      : "fides-attributes-table fides-modal-entity-table";

    return `<div class="fides-attributes-table-wrap"><table class="${tableClass}" aria-label="${escapeHtml(sectionTitle)}">
      <tbody>
        ${sorted
          .map((link) => {
            const label = escapeHtml(linkItemLabel(link));
            const href = linkItemHref(link, catalogBase, param);
            const nameCell = href
              ? `<a href="${escapeHtml(href)}" class="fides-modal-link-inline" onclick="event.stopPropagation();">${label}</a>`
              : `<span>${label}</span>`;
            if (!showLikesCol) {
              return `<tr><td>${nameCell}</td></tr>`;
            }
            const refId = link && link.refId ? String(link.refId) : "";
            const likeCell = `<td class="fides-modal-entity-col-likes">${
              refId ? renderModalEntityLike(ratingType, refId) : ""
            }</td>`;
            return `<tr><td>${nameCell}</td>${likeCell}</tr>`;
          })
          .join("")}
      </tbody>
    </table></div>`;
  }

  function renderLinkAccordionSection(section, item) {
    const links = getLinkItems(item, section.linksKey);
    const count = links.length;
    const icon = icons[section.iconKey] || "";
    const catalogBase = CATALOG_URLS[section.catalogType] || "";
    const exploreHref = catalogExploreHref(catalogBase, section.param, section.pluralParam, links);

    return `
      <div class="fides-accordion" id="fides-accordion-${escapeHtml(section.key)}">
        <div class="fides-accordion-header-bar">
          <button class="fides-accordion-header fides-accordion-toggle" type="button" aria-expanded="false">
            <span class="fides-accordion-title">${icon} ${escapeHtml(section.title)} <span class="fides-accordion-count">${count}</span></span>
          </button>
          ${
            exploreHref
              ? `<a href="${escapeHtml(exploreHref)}" class="fides-accordion-explore-link" aria-label="${escapeHtml(section.title)} catalog (filtered view)">Open in catalog</a>`
              : ""
          }
          <button type="button" class="fides-accordion-chevron-btn fides-accordion-toggle" aria-expanded="false" aria-label="Toggle ${escapeHtml(section.title)} section">
            <span class="fides-accordion-chevron">${icons.chevronDown}</span>
          </button>
        </div>
        <div class="fides-accordion-body">
          ${renderLinkedEntityList(links, catalogBase, section.param, section.title, section.ratingType || section.catalogType)}
        </div>
      </div>
    `;
  }

  function parseVimeoVideoId(url) {
    try {
      const u = new URL(String(url || ""));
      const parts = u.pathname.split("/").filter(Boolean);
      const id = parts.length ? parts[parts.length - 1] : "";
      return /^\d+$/.test(id) ? id : "";
    } catch (_err) {
      return "";
    }
  }

  function itemVideos(item) {
    if (Array.isArray(item.videos) && item.videos.length) {
      return item.videos.filter((video) => video && video.url);
    }
    if (item.video && item.video.url) {
      return [item.video];
    }
    return [];
  }

  function itemImageUrls(item) {
    if (Array.isArray(item.imageUrls) && item.imageUrls.length) {
      return item.imageUrls.filter(Boolean);
    }
    if (item.imageUrl) {
      return [String(item.imageUrl)];
    }
    return [];
  }

  function getVideoEmbedSrc(video) {
    const videoUrl = video && video.url ? String(video.url) : "";
    if (!videoUrl) return "";

    if (video.provider === "youtube") {
      const id = parseYoutubeVideoId(videoUrl);
      if (id) {
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
      }
    }

    if (video.provider === "vimeo") {
      const id = parseVimeoVideoId(videoUrl);
      if (id) {
        return `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
      }
    }

    return "";
  }

  let currentModalMediaSlides = [];

  function slideThumbUrl(slide) {
    if (slide.type === "image") return slide.imageUrl;
    return slide.thumbUrl || "";
  }

  function buildModalMediaSlides(item) {
    const title = item.title || "Use case preview";
    const slides = [];

    itemVideos(item).forEach((video, index) => {
      const embedSrc = getVideoEmbedSrc(video);
      if (!embedSrc) return;
      let thumbUrl = "";
      if (video.provider === "youtube") {
        const id = parseYoutubeVideoId(String(video.url || ""));
        if (id) thumbUrl = `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
      }
      slides.push({
        type: "video",
        label: index === 0 ? "Demo video" : `Demo video ${index + 1}`,
        embedSrc,
        videoTitle: index === 0 ? "Demo video" : `Demo video ${index + 1}`,
        thumbUrl
      });
    });

    const seenImages = new Set();
    itemImageUrls(item).forEach((url, index) => {
      const imageUrl = String(url || "").trim();
      if (!imageUrl || seenImages.has(imageUrl)) return;
      seenImages.add(imageUrl);
      slides.push({
        type: "image",
        label: index === 0 ? "Cover image" : `Image ${index + 1}`,
        imageUrl,
        alt: index === 0 ? title : `${title} image ${index + 1}`
      });
    });

    if (!slides.length) {
      const fallback = deriveCardImage(item);
      if (fallback && !seenImages.has(fallback)) {
        slides.push({
          type: "image",
          label: "Cover image",
          imageUrl: fallback,
          alt: title
        });
      }
    }

    return slides;
  }

  function renderUseCaseModalMediaSlide(slide) {
    if (slide.type === "video") {
      return `
        <div class="fides-use-case-modal-media fides-use-case-modal-media-video">
          <div
            class="fides-use-case-modal-media-frame"
            data-video-embed-src="${escapeHtml(slide.embedSrc)}"
            data-video-title="${escapeHtml(slide.videoTitle)}"
          ></div>
        </div>
      `;
    }

    return `
      <div class="fides-use-case-modal-media fides-use-case-modal-media-image">
        <img src="${escapeHtml(slide.imageUrl)}" alt="${escapeHtml(slide.alt)}" loading="lazy">
      </div>
    `;
  }

  function renderMediaThumbs(slides, context) {
    if (slides.length < 2) return "";
    const thumbs = slides
      .map((slide, index) => {
        const thumb = slideThumbUrl(slide);
        const inner = thumb
          ? `<img src="${escapeHtml(thumb)}" alt="" loading="lazy">`
          : `<span class="fides-media-thumb-fallback">${icons.play}</span>`;
        const videoBadge = slide.type === "video" ? `<span class="fides-media-thumb-play">${icons.play}</span>` : "";
        return `
          <button type="button" class="fides-media-thumb${index === 0 ? " is-active" : ""}" data-thumb-index="${index}" aria-label="${escapeHtml(slide.label)}">
            ${inner}${videoBadge}
          </button>`;
      })
      .join("");
    return `<div class="fides-media-thumbs" data-media-thumbs="${context}">${thumbs}</div>`;
  }

  function renderUseCaseModalMedia(item) {
    const slides = buildModalMediaSlides(item);
    currentModalMediaSlides = slides;
    if (!slides.length) return "";

    const multi = slides.length > 1;
    const expandLabel = slides[0].type === "video" ? "View larger" : "View larger";

    return `
      <div class="fides-use-case-modal-media-wrap${multi ? " is-multi" : ""}">
        <div class="fides-use-case-modal-carousel" tabindex="0" aria-roledescription="carousel" aria-label="Use case media">
          <div class="fides-use-case-modal-carousel-viewport">
            <div class="fides-use-case-modal-carousel-track" data-carousel-track style="transform: translateX(0);">
              ${slides
                .map(
                  (slide, index) => `
                <div class="fides-use-case-modal-carousel-slide${index === 0 ? " is-active" : ""}" data-carousel-slide="${index}" aria-hidden="${index === 0 ? "false" : "true"}">
                  <button type="button" class="fides-media-expand-btn" data-media-expand="${index}" aria-label="${escapeHtml(expandLabel)}" title="${escapeHtml(expandLabel)}">${icons.maximize}</button>
                  ${renderUseCaseModalMediaSlide(slide)}
                </div>`
                )
                .join("")}
            </div>
            ${
              multi
                ? `<button type="button" class="fides-carousel-nav fides-carousel-nav-edge fides-carousel-prev" data-carousel-prev aria-label="Previous slide">${icons.chevronLeft}</button>
                   <button type="button" class="fides-carousel-nav fides-carousel-nav-edge fides-carousel-next" data-carousel-next aria-label="Next slide">${icons.chevronRight}</button>
                   <span class="fides-carousel-counter-overlay" data-carousel-counter>1 / ${slides.length}</span>`
                : ""
            }
          </div>
          ${renderMediaThumbs(slides, "modal")}
        </div>
      </div>
    `;
  }

  function activateCarouselSlideMedia(slide) {
    if (!slide) return;
    slide.querySelectorAll("[data-video-embed-src]").forEach((frame) => {
      const src = frame.getAttribute("data-video-embed-src");
      if (!src || frame.querySelector("iframe")) return;
      const iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.title = frame.getAttribute("data-video-title") || "Demo video";
      iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute("loading", "lazy");
      frame.appendChild(iframe);
    });
  }

  function deactivateCarouselSlideMedia(slide) {
    if (!slide) return;
    slide.querySelectorAll("[data-video-embed-src]").forEach((frame) => {
      const iframe = frame.querySelector("iframe");
      if (iframe) iframe.remove();
    });
  }

  function bindCarousel(carousel, options) {
    const opts = options || {};
    const slideEls = Array.from(carousel.querySelectorAll("[data-carousel-slide]"));
    if (!slideEls.length) return null;

    const track = carousel.querySelector("[data-carousel-track]");
    const counter = carousel.querySelector("[data-carousel-counter]");
    const thumbButtons = Array.from(carousel.querySelectorAll("[data-thumb-index]"));
    const prevBtn = carousel.querySelector("[data-carousel-prev]");
    const nextBtn = carousel.querySelector("[data-carousel-next]");
    let index = Math.min(Math.max(opts.startIndex || 0, 0), slideEls.length - 1);

    function applyIndex(skipActivate) {
      slideEls.forEach((slide, slideIndex) => {
        const isActive = slideIndex === index;
        slide.classList.toggle("is-active", isActive);
        slide.setAttribute("aria-hidden", isActive ? "false" : "true");
      });
      thumbButtons.forEach((btn) => {
        btn.classList.toggle("is-active", Number(btn.getAttribute("data-thumb-index")) === index);
      });
      if (track) track.style.transform = `translateX(-${index * 100}%)`;
      if (counter) counter.textContent = `${index + 1} / ${slideEls.length}`;
      if (!skipActivate) {
        slideEls.forEach((slide, slideIndex) => {
          if (slideIndex !== index) deactivateCarouselSlideMedia(slide);
        });
        activateCarouselSlideMedia(slideEls[index]);
      }
    }

    function goTo(nextIndex) {
      index = (nextIndex + slideEls.length) % slideEls.length;
      applyIndex(false);
    }

    if (prevBtn) prevBtn.addEventListener("click", () => goTo(index - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => goTo(index + 1));
    thumbButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const thumbIndex = Number(btn.getAttribute("data-thumb-index"));
        if (Number.isFinite(thumbIndex)) goTo(thumbIndex);
      });
    });
    carousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(index + 1);
      }
    });

    applyIndex(false);
    return { goTo: goTo, current: () => index };
  }

  function closeMediaLightbox() {
    const existing = document.getElementById("fides-media-lightbox");
    if (!existing) return;
    existing.querySelectorAll("[data-carousel-slide]").forEach((slide) => deactivateCarouselSlideMedia(slide));
    existing.remove();
    document.removeEventListener("keydown", onMediaLightboxKeydown);
  }

  function onMediaLightboxKeydown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeMediaLightbox();
    }
  }

  function openMediaLightbox(startIndex) {
    const slides = currentModalMediaSlides;
    if (!slides || !slides.length) return;
    closeMediaLightbox();

    const multi = slides.length > 1;
    const html = `
      <div class="fides-media-lightbox" id="fides-media-lightbox" role="dialog" aria-modal="true" aria-label="Media viewer">
        <button type="button" class="fides-media-lightbox-close" data-lightbox-close aria-label="Close viewer">${icons.xLarge}</button>
        <div class="fides-media-lightbox-stage">
          <div class="fides-use-case-modal-carousel fides-media-lightbox-carousel" tabindex="0">
            <div class="fides-use-case-modal-carousel-viewport">
              <div class="fides-use-case-modal-carousel-track" data-carousel-track style="transform: translateX(0);">
                ${slides
                  .map(
                    (slide, index) => `
                  <div class="fides-use-case-modal-carousel-slide${index === 0 ? " is-active" : ""}" data-carousel-slide="${index}" aria-hidden="${index === 0 ? "false" : "true"}">
                    ${renderUseCaseModalMediaSlide(slide)}
                  </div>`
                  )
                  .join("")}
              </div>
              ${
                multi
                  ? `<button type="button" class="fides-carousel-nav fides-carousel-nav-edge fides-carousel-prev" data-carousel-prev aria-label="Previous slide">${icons.chevronLeft}</button>
                     <button type="button" class="fides-carousel-nav fides-carousel-nav-edge fides-carousel-next" data-carousel-next aria-label="Next slide">${icons.chevronRight}</button>
                     <span class="fides-carousel-counter-overlay" data-carousel-counter>1 / ${slides.length}</span>`
                  : ""
              }
            </div>
            ${renderMediaThumbs(slides, "lightbox")}
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);

    const lightbox = document.getElementById("fides-media-lightbox");
    if (!lightbox) return;
    const carousel = lightbox.querySelector(".fides-media-lightbox-carousel");
    if (carousel) bindCarousel(carousel, { startIndex: startIndex || 0 });

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeMediaLightbox();
    });
    const closeBtn = lightbox.querySelector("[data-lightbox-close]");
    if (closeBtn) closeBtn.addEventListener("click", closeMediaLightbox);
    document.addEventListener("keydown", onMediaLightboxKeydown);

    const focusTarget = carousel || closeBtn;
    if (focusTarget && typeof focusTarget.focus === "function") focusTarget.focus();
  }

  function initUseCaseModalMediaCarousels() {
    document.querySelectorAll("#fides-modal-overlay .fides-use-case-modal-carousel").forEach((carousel) => {
      bindCarousel(carousel, { startIndex: 0 });
    });

    document.querySelectorAll("#fides-modal-overlay [data-media-expand]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        const idx = Number(btn.getAttribute("data-media-expand"));
        openMediaLightbox(Number.isFinite(idx) ? idx : 0);
      });
    });
  }

  function renderUseCaseModalHero(item) {
    const summary = String(item.summary || "").trim();
    const media = renderUseCaseModalMedia(item);
    if (!summary && !media) return "";

    const layoutClass = media ? "fides-use-case-modal-hero has-media" : "fides-use-case-modal-hero";

    return `
      <section class="${layoutClass}">
        ${summary ? `<div class="fides-use-case-modal-copy"><p class="fides-modal-description">${escapeHtml(summary)}</p></div>` : ""}
        ${media}
      </section>
    `;
  }

  function renderUseCaseHowItWorks(item) {
    const userJourney = item.userJourney ? String(item.userJourney).trim() : "";
    if (!userJourney) return "";
    return `
      <section class="fides-use-case-modal-journey">
        <h3 class="fides-use-case-modal-section-title">How it works</h3>
        <p class="fides-use-case-modal-journey-text">${escapeHtml(userJourney)}</p>
      </section>
    `;
  }

  function itemListValues(item, key) {
    const values = item[key];
    return Array.isArray(values) ? values.filter(Boolean) : [];
  }

  function formatListLabels(values, labelMap) {
    if (!values.length) return "";
    return values.map((value) => labelMap[value] || prettifyKey(value)).join(", ");
  }

  function renderTaxonomyKvRow(label, values, labelMap) {
    if (!values.length) return "";
    const display = formatListLabels(values, labelMap);
    return `
            <div class="fides-kv-row fides-kv-row-wide">
              <span class="fides-kv-key">${escapeHtml(label)}</span>
              <span class="fides-kv-val">${escapeHtml(display)}</span>
            </div>`;
  }

  function itemSector(item) {
    if (item.sector) return String(item.sector);
    const legacySectors = itemListValues(item, "sectors");
    if (legacySectors.length) return legacySectors[0];
    if (item.themeKey) return String(item.themeKey);
    return "";
  }

  function sectorLabel(item) {
    const sector = itemSector(item);
    if (!sector) return "—";
    return SECTOR_LABELS[sector] || prettifyKey(sector);
  }

  const COUNTRY_LABEL_OVERRIDES = {
    EU: "European Union",
    GB: "United Kingdom",
    US: "United States",
    XK: "Kosovo"
  };
  let regionDisplayNamesEn = null;

  function getRegionDisplayNamesEn() {
    if (regionDisplayNamesEn !== null) return regionDisplayNamesEn;
    try {
      if (typeof Intl !== "undefined" && Intl.DisplayNames) {
        regionDisplayNamesEn = new Intl.DisplayNames(["en"], { type: "region" });
      } else {
        regionDisplayNamesEn = false;
      }
    } catch (_err) {
      regionDisplayNamesEn = false;
    }
    return regionDisplayNamesEn;
  }

  function countryLabel(item) {
    const code = item && item.country ? String(item.country).trim().toUpperCase() : "";
    if (!code) return "—";
    if (COUNTRY_LABEL_OVERRIDES[code]) return COUNTRY_LABEL_OVERRIDES[code];
    const dn = getRegionDisplayNamesEn();
    if (dn) {
      try {
        const name = dn.of(code);
        if (typeof name === "string" && name.length > 0 && name.toUpperCase() !== code) {
          return name;
        }
      } catch (_err) {
        /* fall through */
      }
    }
    return code;
  }

  function renderMetaCountryIcon(countryCode) {
    const code = countryCode ? String(countryCode).trim().toUpperCase() : "";
    if (code.length === 2) {
      return (
        '<img src="https://flagcdn.com/w20/' +
        escapeHtml(code.toLowerCase()) +
        '.png" alt="" class="fides-country-flag" width="20" height="15" loading="lazy" />'
      );
    }
    return icons.globe;
  }

  function itemSectorCodes(item) {
    const codes = [];
    const primary = itemSector(item);
    if (primary) codes.push(primary);
    itemListValues(item, "sectors").forEach((code) => {
      const normalized = String(code || "").trim();
      if (normalized && !codes.includes(normalized)) codes.push(normalized);
    });
    return codes.filter((code) => Object.prototype.hasOwnProperty.call(SECTOR_LABELS, code));
  }

  function renderUseCaseModalBadges(item) {
    const stage = normalizeProductionDeployment(item.productionDeployment);
    const readinessBadge = stage
      ? `<span class="fides-modal-badge readiness-${escapeHtml(stage)}">${escapeHtml(productionDeploymentLabel(item.productionDeployment))}</span>`
      : "";
    const sectorBadges = itemSectorCodes(item)
      .slice()
      .sort((a, b) => SECTOR_LABELS[a].localeCompare(SECTOR_LABELS[b], "en", { sensitivity: "base" }))
      .map((code) => `<span class="fides-modal-badge sector">${escapeHtml(SECTOR_LABELS[code])}</span>`)
      .join("");
    if (!readinessBadge && !sectorBadges) return "";
    return `
      <div class="fides-modal-badges">
        <div class="fides-modal-badges-left">
          ${readinessBadge}
          ${sectorBadges}
        </div>
      </div>
    `;
  }

  function orgInitial(label) {
    const cleaned = String(label || "").trim();
    if (!cleaned) return "?";
    return cleaned.charAt(0).toUpperCase();
  }

  function organizationChipHref(link) {
    const refId = link && link.refId ? String(link.refId).trim() : "";
    const orgBase = CATALOG_URLS.organization;
    if (refId && orgBase) {
      return `${orgBase}/?org=${encodeURIComponent(refId)}`;
    }
    if (link && link.url) return String(link.url);
    return "";
  }

  function renderUseCaseInvolvedOrganizations(item) {
    const orgs = getLinkItems(item, "organizations");
    if (orgs.length === 0) return "";
    const chips = orgs
      .slice()
      .sort((a, b) => linkItemLabel(a).localeCompare(linkItemLabel(b), undefined, { sensitivity: "base" }))
      .map((link) => {
        const label = linkItemLabel(link);
        const labelHtml = escapeHtml(label);
        const avatar = `<span class="fides-modal-org-avatar" aria-hidden="true">${escapeHtml(orgInitial(label))}</span>`;
        const inner = `${avatar}<span class="fides-modal-org-name">${labelHtml}</span>`;
        const href = organizationChipHref(link);
        if (href) {
          const external = !(link && link.refId && CATALOG_URLS.organization);
          const relAttr = external ? ' target="_blank" rel="noopener noreferrer"' : "";
          return `<a class="fides-modal-org-chip" href="${escapeHtml(href)}"${relAttr} onclick="event.stopPropagation();">${inner}</a>`;
        }
        return `<span class="fides-modal-org-chip fides-modal-org-chip--static">${inner}</span>`;
      })
      .join("");
    return `
      <div class="fides-modal-orgs">
        <span class="fides-modal-orgs-label">${icons.building} Involved organizations</span>
        <div class="fides-modal-orgs-list">${chips}</div>
      </div>
    `;
  }

  function useCaseHasTechnicalDetails(item) {
    return !!(
      itemListValues(item, "interactionModes").length ||
      itemListValues(item, "vcFormats").length ||
      itemListValues(item, "issuanceProtocols").length ||
      itemListValues(item, "presentationProtocols").length ||
      itemListValues(item, "interopProfiles").length
    );
  }

  function renderTechnicalKvCell(label, values, labelMap) {
    if (!values.length) return "";
    const display = formatListLabels(values, labelMap);
    return `
      <div class="fides-kv-row">
        <span class="fides-kv-key">${escapeHtml(label)}</span>
        <span class="fides-kv-val">${escapeHtml(display)}</span>
      </div>`;
  }

  function renderUseCaseTechnicalAccordion(item) {
    if (!useCaseHasTechnicalDetails(item)) return "";
    const cells = [
      renderTechnicalKvCell("Interaction mode", itemListValues(item, "interactionModes"), INTERACTION_MODE_LABELS),
      renderTechnicalKvCell("VC format", itemListValues(item, "vcFormats"), VC_FORMAT_LABELS),
      renderTechnicalKvCell("Issuance protocol", itemListValues(item, "issuanceProtocols"), ISSUANCE_PROTOCOL_LABELS),
      renderTechnicalKvCell("Presentation protocol", itemListValues(item, "presentationProtocols"), PRESENTATION_PROTOCOL_LABELS),
      renderTechnicalKvCell("Interop profile", itemListValues(item, "interopProfiles"), INTEROP_PROFILE_LABELS)
    ].filter(Boolean);

    return `
      <div class="fides-accordion" id="fides-accordion-technical">
        <div class="fides-accordion-header-bar">
          <button class="fides-accordion-header fides-accordion-toggle" type="button" aria-expanded="false">
            <span class="fides-accordion-title">${icons.fileCheck} Technical details</span>
          </button>
          <button type="button" class="fides-accordion-chevron-btn fides-accordion-toggle" aria-expanded="false" aria-label="Toggle technical details section">
            <span class="fides-accordion-chevron">${icons.chevronDown}</span>
          </button>
        </div>
        <div class="fides-accordion-body">
          <div class="fides-details-kv fides-details-kv--technical-grid">
            ${cells.join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderUseCaseDetailsAccordion(item) {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const moreInfoUrl = item.moreInfoUrl ? String(item.moreInfoUrl) : "";
    const sector = itemSector(item);
    const readinessLabel = productionDeploymentLabel(item.productionDeployment);

    return `
      <div class="fides-accordion is-open" id="fides-accordion-details">
        <div class="fides-accordion-header-bar">
          <button class="fides-accordion-header fides-accordion-toggle" type="button" aria-expanded="true">
            <span class="fides-accordion-title">${icons.shield} Use case details</span>
          </button>
          <button type="button" class="fides-accordion-chevron-btn fides-accordion-toggle" aria-expanded="true" aria-label="Toggle use case details section">
            <span class="fides-accordion-chevron">${icons.chevronDown}</span>
          </button>
        </div>
        <div class="fides-accordion-body">
          <div class="fides-details-kv">
            ${
              item.country
                ? `<div class="fides-kv-row"><span class="fides-kv-key">Country</span><span class="fides-kv-val">${escapeHtml(countryLabel(item))}</span></div>`
                : ""
            }
            ${
              item.productionDeployment
                ? `<div class="fides-kv-row"><span class="fides-kv-key">Production deployment</span><span class="fides-kv-val">${escapeHtml(readinessLabel)}</span></div>`
                : ""
            }
            ${
              sector
                ? `<div class="fides-kv-row"><span class="fides-kv-key">Sector</span><span class="fides-kv-val">${escapeHtml(sectorLabel(item))}</span></div>`
                : ""
            }
            <div class="fides-kv-row">
              <span class="fides-kv-key">Submitted by</span>
              <span class="fides-kv-val">${escapeHtml(item.organizationName || "—")}</span>
            </div>
            <div class="fides-kv-row">
              <span class="fides-kv-key">Last updated</span>
              <span class="fides-kv-val">${escapeHtml(formatDateLabel(item.updatedAt))}</span>
            </div>
            ${
              item.publishedAt
                ? `<div class="fides-kv-row"><span class="fides-kv-key">Published</span><span class="fides-kv-val">${escapeHtml(formatDateLabel(item.publishedAt))}</span></div>`
                : ""
            }
            ${
              moreInfoUrl
                ? `<div class="fides-kv-row fides-kv-row-wide"><span class="fides-kv-key">More info</span><span class="fides-kv-val"><a href="${escapeHtml(moreInfoUrl)}" target="_blank" rel="noopener noreferrer" class="fides-modal-link-inline" onclick="event.stopPropagation();">${icons.externalLinkSmall} Open page</a></span></div>`
                : ""
            }
            ${
              tags.length > 0
                ? `<div class="fides-kv-row fides-kv-row-wide"><span class="fides-kv-key">Tags</span><span class="fides-kv-val">${tags.map((tag) => `<span class="fides-tag-chip">${escapeHtml(tag)}</span>`).join(" ")}</span></div>`
                : ""
            }
          </div>
        </div>
      </div>
    `;
  }

  function renderUseCaseModal() {
    if (!selectedUseCase) return "";
    const item = selectedUseCase;
    const catalogEl = root.querySelector(".fides-use-case-catalog");
    const currentTheme = catalogEl ? catalogEl.getAttribute("data-theme") || "fides" : "fides";
    const sectorText = itemSectorCodes(item)
      .slice()
      .sort((a, b) => SECTOR_LABELS[a].localeCompare(SECTOR_LABELS[b], "en", { sensitivity: "base" }))
      .map((code) => SECTOR_LABELS[code])
      .join(", ");
    const countryText = item.country ? countryLabel(item) : "";
    const subtitleParts = [];
    if (sectorText) {
      subtitleParts.push(`<span class="fides-modal-subtitle-item">${icons.building} ${escapeHtml(sectorText)}</span>`);
    }
    if (countryText) {
      subtitleParts.push(`<span class="fides-modal-subtitle-item">${icons.globe} ${escapeHtml(countryText)}</span>`);
    }
    const subtitleHtml = subtitleParts.join('<span class="fides-modal-subtitle-sep">|</span>');

    return `
      <div class="fides-modal-overlay fides-modal-overlay--usecase" id="fides-modal-overlay" data-theme="${escapeHtml(currentTheme)}">
        <div class="fides-modal" role="dialog" aria-modal="true" aria-labelledby="fides-modal-title">
          <div class="fides-modal-header">
            <div class="fides-modal-header-content">
              <div class="fides-modal-logo-placeholder">${icons.globe}</div>
              <div class="fides-modal-title-wrap">
                <h2 class="fides-modal-title" id="fides-modal-title">${escapeHtml(item.title || item.id)}</h2>
                ${subtitleHtml ? `<p class="fides-modal-provider">${subtitleHtml}</p>` : ""}
              </div>
            </div>
            <div class="fides-modal-header-actions">
              <button type="button" class="fides-modal-copy-link" id="fides-modal-copy-link" aria-label="Copy link to this use case" title="Copy link to this use case">
                ${icons.share}
              </button>
              <button type="button" class="fides-modal-close" id="fides-modal-close" aria-label="Close modal">${icons.xLarge}</button>
            </div>
          </div>
          <div class="fides-modal-body">
            <div id="fides-modal-rating-slot"></div>
            ${renderUseCaseInvolvedOrganizations(item)}
            ${renderUseCaseModalHero(item)}
            ${renderUseCaseHowItWorks(item)}
            <div class="fides-use-case-modal-accordions">
              ${renderUseCaseEcosystemModel(item)}
              ${LINK_ACCORDION_SECTIONS.map((section) => renderLinkAccordionSection(section, item)).join("")}
              ${renderUseCaseTechnicalAccordion(item)}
              ${renderUseCaseDetailsAccordion(item)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function openUseCaseModal() {
    closeUseCaseModal();
    if (selectedUseCase) {
      await loadLinkedEntityRatingSummaries(selectedUseCase);
    }
    const html = renderUseCaseModal();
    if (!html) return;
    document.body.insertAdjacentHTML("beforeend", html);
    document.body.style.overflow = "hidden";
    bindUseCaseModalEvents();
    initUseCaseModalMediaCarousels();
    if (selectedUseCase && selectedUseCase.id) {
      initUseCaseModalLike(selectedUseCase.id);
    }
  }

  function closeUseCaseModal() {
    closeMediaLightbox();
    const existing = document.getElementById("fides-modal-overlay");
    if (existing) existing.remove();
    document.removeEventListener("keydown", onUseCaseModalKeydown);
    if (!root.querySelector(".fides-sidebar.mobile-open")) {
      document.body.style.overflow = "";
    }
  }

  function clearUseCaseDeepLink() {
    const url = new URL(window.location.href);
    url.searchParams.delete("usecase");
    window.history.replaceState({}, "", url.toString());
  }

  function bindUseCaseModalEvents() {
    const closeButton = document.getElementById("fides-modal-close");
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        selectedUseCase = null;
        clearUseCaseDeepLink();
        closeUseCaseModal();
      });
    }

    const copyLinkButton = document.getElementById("fides-modal-copy-link");
    if (copyLinkButton) {
      copyLinkButton.addEventListener("click", (event) => {
        event.stopPropagation();
        copyUseCaseLink();
      });
    }

    const modalOverlay = document.getElementById("fides-modal-overlay");
    if (modalOverlay) {
      modalOverlay.addEventListener("click", (event) => {
        if (event.target.id === "fides-modal-overlay") {
          selectedUseCase = null;
          clearUseCaseDeepLink();
          closeUseCaseModal();
        }
      });
    }

    document.querySelectorAll("#fides-modal-overlay .fides-accordion-toggle[type='button']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const accordion = btn.closest(".fides-accordion");
        if (!accordion) return;
        const isOpen = accordion.classList.toggle("is-open");
        accordion.querySelectorAll(".fides-accordion-toggle[type='button']").forEach((toggle) => {
          toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
      });
    });

    document.querySelectorAll("#fides-modal-overlay [data-fides-eco-target]").forEach((el) => {
      el.addEventListener("click", (event) => {
        if (event.target.closest("a")) return;
        const accordionId = el.getAttribute("data-fides-eco-target");
        if (!accordionId) return;
        const accordion = document.getElementById(accordionId);
        if (!accordion) return;
        accordion.classList.add("is-open");
        accordion.querySelectorAll(".fides-accordion-toggle[type='button']").forEach((toggle) => {
          toggle.setAttribute("aria-expanded", "true");
        });
        accordion.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });

    document.addEventListener("keydown", onUseCaseModalKeydown);
  }

  function onUseCaseModalKeydown(event) {
    if (event.key !== "Escape" || !document.getElementById("fides-modal-overlay")) return;
    // If the media lightbox is open, let it handle Escape (close lightbox only).
    if (document.getElementById("fides-media-lightbox")) return;
    selectedUseCase = null;
    clearUseCaseDeepLink();
    closeUseCaseModal();
  }

  function openUseCaseById(useCaseId) {
    selectedUseCase = currentItems.find((item) => item.id === useCaseId) || null;
    if (!selectedUseCase) return;
    const url = new URL(window.location.href);
    url.searchParams.set("usecase", useCaseId);
    window.history.replaceState({}, "", url.toString());
    openUseCaseModal();
  }

  function bindUseCaseCardEvents() {
    root.querySelectorAll(".fides-use-case-card-item, .fides-use-case-row-item").forEach((card) => {
      const open = () => {
        const id = card.getAttribute("data-use-case-id") || "";
        if (!id) return;
        openUseCaseById(id);
      };

      card.addEventListener("click", (event) => {
        if (event.target.closest("a")) return;
        open();
      });

      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });
  }

  function openUseCaseFromQueryParam() {
    const useCaseId = new URLSearchParams(window.location.search).get("usecase");
    if (!useCaseId) return;
    openUseCaseById(useCaseId);
  }

  function parseYoutubeVideoId(url) {
    try {
      const u = new URL(String(url || ""));
      const host = u.hostname.toLowerCase();
      if (host.includes("youtu.be")) {
        return u.pathname.replace(/^\/+/, "");
      }
      if (host.includes("youtube.com")) {
        return u.searchParams.get("v") || "";
      }
    } catch (_err) {
      return "";
    }
    return "";
  }

  function deriveCardImage(item) {
    if (item.imageUrl) return item.imageUrl;
    if (item.video && item.video.url && item.video.provider === "youtube") {
      const id = parseYoutubeVideoId(item.video.url);
      if (id) return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
    }
    return "";
  }

  function countLinkedItems(item) {
    const links = item.links || {};
    return ["personalWallets", "businessWallets", "issuers", "credentials", "organizations", "rps"].reduce((total, key) => {
      const list = Array.isArray(links[key]) ? links[key] : [];
      return total + list.length;
    }, 0);
  }

  let currentItems = [];
  let filterFacets = null;
  const filterGroupState = {
    sector: true,
    country: false,
    productionDeployment: false,
    interactionModes: false,
    vcFormats: false,
    issuanceProtocols: false,
    presentationProtocols: false,
    interopProfiles: false
  };
  const filters = {
    search: "",
    sector: [],
    country: [],
    interactionModes: [],
    vcFormats: [],
    issuanceProtocols: [],
    presentationProtocols: [],
    interopProfiles: [],
    productionDeployment: [],
    sortBy: "updated_desc"
  };

  function effectiveView() {
    return window.innerWidth < LIST_BREAKPOINT ? "grid" : viewMode;
  }

  function uniqueSorted(items, keyFn) {
    return [...new Set(items.map(keyFn).flat().filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
    );
  }

  function getActiveFilterCount() {
    return (
      filters.sector.length +
      filters.country.length +
      filters.interactionModes.length +
      filters.vcFormats.length +
      filters.issuanceProtocols.length +
      filters.presentationProtocols.length +
      filters.interopProfiles.length +
      filters.productionDeployment.length
    );
  }

  function incrementFacetCounts(facets, key, values) {
    values.forEach((value) => {
      if (!value) return;
      facets[key][value] = (facets[key][value] || 0) + 1;
    });
  }

  function computeFacets(items) {
    const facets = {
      sector: {},
      country: {},
      interactionModes: {},
      vcFormats: {},
      issuanceProtocols: {},
      presentationProtocols: {},
      interopProfiles: {},
      productionDeployment: {}
    };
    items.forEach((item) => {
      const sectorValue = itemSector(item);
      if (sectorValue) facets.sector[sectorValue] = (facets.sector[sectorValue] || 0) + 1;
      if (item.country) {
        const countryCode = String(item.country).trim().toUpperCase();
        if (countryCode) facets.country[countryCode] = (facets.country[countryCode] || 0) + 1;
      }
      TAXONOMY_FILTER_GROUPS.forEach((group) => {
        incrementFacetCounts(facets, group.key, itemListValues(item, group.key));
      });
      if (item.productionDeployment) {
        const stage = normalizeProductionDeployment(item.productionDeployment);
        if (stage) facets.productionDeployment[stage] = (facets.productionDeployment[stage] || 0) + 1;
      }
    });
    return facets;
  }

  function itemMatchesArrayFilter(item, filterKey, itemKey) {
    const selected = filters[filterKey] || [];
    if (!selected.length) return true;
    if (itemKey === "sector") {
      const value = itemSector(item);
      return value !== "" && selected.includes(value);
    }
    if (itemKey === "country") {
      const value = item.country ? String(item.country).trim().toUpperCase() : "";
      return value !== "" && selected.includes(value);
    }
    return selected.some((value) => itemListValues(item, itemKey).includes(value));
  }

  function renderCheckboxGroup(title, key, options, labelFn) {
    const expanded = filterGroupState[key] !== false;
    const hasActive = (filters[key] || []).length > 0;
    return `
      <div class="fides-filter-group collapsible ${expanded ? "" : "collapsed"} ${hasActive ? "has-active" : ""}" data-filter-group="${escapeHtml(key)}">
        <button class="fides-filter-label-toggle" type="button" aria-expanded="${expanded ? "true" : "false"}">
          <span class="fides-filter-label">${escapeHtml(title)}</span>
          <span class="fides-filter-active-indicator"></span>
          ${icons.chevronDown}
        </button>
        <div class="fides-filter-options">
          ${options
            .map((value) => {
              const selected = filters[key].includes(value) ? "checked" : "";
              const count = filterFacets?.[key]?.[value] || 0;
              return `
                <label class="fides-filter-checkbox">
                  <input type="checkbox" data-filter-group="${escapeHtml(key)}" value="${escapeHtml(value)}" ${selected}>
                  <span>${escapeHtml(labelFn(value))}<span class="fides-filter-option-count">(${count})</span></span>
                </label>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function renderFiltersPanel() {
    if (!settings.showFilters) return "";
    const activeFilterCount = getActiveFilterCount();
    const stageOptions = PRODUCTION_DEPLOYMENT_OPTIONS;
    const sectorOptions = Object.keys(SECTOR_LABELS)
      .filter((key) => (filterFacets?.sector?.[key] || 0) > 0)
      .sort((a, b) => SECTOR_LABELS[a].localeCompare(SECTOR_LABELS[b], "en", { sensitivity: "base" }));
    const countryOptions = Object.keys(filterFacets?.country || {})
      .filter((key) => (filterFacets?.country?.[key] || 0) > 0)
      .sort((a, b) => countryLabel({ country: a }).localeCompare(countryLabel({ country: b }), "en", { sensitivity: "base" }));
    const taxonomyFilterPanels = TAXONOMY_FILTER_GROUPS.map((group) => {
      const options = Object.keys(group.labels).filter((key) => (filterFacets?.[group.key]?.[key] || 0) > 0);
      if (!options.length) return "";
      return renderCheckboxGroup(group.title, group.key, options, (value) => group.labels[value] || prettifyKey(value));
    }).join("");

    return `
      <aside class="fides-sidebar">
        <div class="fides-sidebar-header">
          <div class="fides-sidebar-title">
            ${icons.filter}
            <span>Filters</span>
            <span class="fides-filter-count ${activeFilterCount > 0 ? "" : "hidden"}">${activeFilterCount || 0}</span>
          </div>
          <div class="fides-sidebar-actions">
            <button class="fides-clear-all ${activeFilterCount > 0 ? "" : "hidden"}" id="fides-clear" type="button">${icons.x} Clear</button>
            <button class="fides-sidebar-close" id="fides-sidebar-close" type="button" aria-label="Close filters">${icons.x}</button>
          </div>
        </div>
        <div class="fides-sidebar-content">
          ${
            sectorOptions.length
              ? renderCheckboxGroup("Sector", "sector", sectorOptions, (value) => SECTOR_LABELS[value] || prettifyKey(value))
              : ""
          }
          ${
            countryOptions.length
              ? renderCheckboxGroup("Country", "country", countryOptions, (value) => countryLabel({ country: value }))
              : ""
          }
          ${renderCheckboxGroup("Production deployment", "productionDeployment", stageOptions, (value) => productionDeploymentLabel(value))}
          ${taxonomyFilterPanels}
        </div>
      </aside>
    `;
  }

  function computeMetrics(items) {
    const countries = new Set(
      items.map((i) => String(i.country || "").trim().toUpperCase()).filter(Boolean)
    );
    const productionDeployments = items.filter(
      (i) => normalizeProductionDeployment(i.productionDeployment) === "yes"
    ).length;
    const recent = items.filter((i) => {
      const t = Date.parse(i.updatedAt || "");
      if (!Number.isFinite(t)) return false;
      return Date.now() - t <= 30 * 24 * 60 * 60 * 1000;
    }).length;
    return {
      total: items.length,
      countries: countries.size,
      productionDeployments,
      recent
    };
  }

  function renderKpiCards(metrics) {
    return `
      <div class="fides-kpi-row">
        <div class="fides-kpi-card"><span class="fides-kpi-value">${metrics.total}</span><span class="fides-kpi-label">Use cases</span></div>
        <div class="fides-kpi-card"><span class="fides-kpi-value">${metrics.countries}</span><span class="fides-kpi-label">Countries</span></div>
        <div class="fides-kpi-card"><span class="fides-kpi-value">${metrics.productionDeployments}</span><span class="fides-kpi-label">Production deployments</span></div>
        <div class="fides-kpi-card"><span class="fides-kpi-value">${metrics.recent}</span><span class="fides-kpi-label">Updated last 30 days</span></div>
      </div>
    `;
  }

  function renderViewToggle() {
    const activeView = effectiveView();
    const hidden = window.innerWidth < LIST_BREAKPOINT ? "hidden" : "";
    return `
      <div class="fides-view-toggle ${hidden}">
        <button class="fides-view-btn ${activeView === "grid" ? "active" : ""}" data-view="grid" type="button" aria-label="Grid view" aria-pressed="${activeView === "grid" ? "true" : "false"}">${icons.viewGrid}</button>
        <button class="fides-view-btn ${activeView === "list" ? "active" : ""}" data-view="list" type="button" aria-label="List view" aria-pressed="${activeView === "list" ? "true" : "false"}">${icons.viewList}</button>
      </div>
    `;
  }

  function renderMetaItem(icon, label, value, title) {
    const displayValue = value || "—";
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : displayValue !== "—" ? ` title="${escapeHtml(displayValue)}"` : "";
    return `
      <div class="fides-use-case-meta-item">
        <div class="fides-use-case-meta-heading">
          <span class="fides-use-case-meta-icon" aria-hidden="true">${icon}</span>
          <span class="fides-use-case-meta-label">${escapeHtml(label)}</span>
        </div>
        <p class="fides-use-case-meta-value"${titleAttr}>${escapeHtml(displayValue)}</p>
      </div>
    `;
  }

  function renderViewUseCaseDetails(ctaUrl) {
    const label = `${icons.eye} View use case`;
    if (ctaUrl) {
      return `<a class="fides-view-details" href="${escapeHtml(ctaUrl)}" target="_blank" rel="noreferrer">${label}</a>`;
    }
    return `<span class="fides-view-details">${label}</span>`;
  }

  function renderUseCaseCard(item) {
    const imageUrl = deriveCardImage(item);
    const readinessLabel = productionDeploymentLabel(item.productionDeployment);
    const summary = String(item.summary || "").trim();
    const ctaUrl = item.moreInfoUrl || (item.video && item.video.url) || "";
    const heroStyle = imageUrl ? ` style="background-image:url('${escapeHtml(imageUrl)}')"` : "";
    const heroClass = imageUrl ? "fides-use-case-hero" : "fides-use-case-hero fides-use-case-hero-placeholder";
    const useCaseId = String(item.id || "");
    const countryCode = item.country ? String(item.country).trim().toUpperCase() : "";

    return `
      <article class="fides-use-case-card-item" data-use-case-id="${escapeHtml(useCaseId)}" role="button" tabindex="0">
        <div class="${heroClass}">
          <div class="fides-use-case-hero-media"${heroStyle} aria-hidden="true"></div>
          <div class="fides-use-case-hero-overlay">
            <div class="fides-use-case-hero-badges fides-use-case-hero-badges--like-only">
              <span class="fides-use-case-hero-like">${renderUseCaseHeroLikeBadge(useCaseId)}</span>
            </div>
            <div class="fides-use-case-hero-text">
              <h3 class="fides-use-case-hero-title">${escapeHtml(item.title || item.id)}</h3>
              ${summary ? `<p class="fides-use-case-hero-summary">${escapeHtml(summary)}</p>` : ""}
            </div>
          </div>
        </div>
        <div class="fides-use-case-meta-strip">
          ${renderMetaItem(renderMetaCountryIcon(countryCode), "Country", countryLabel(item))}
          ${renderMetaItem(icons.check, "Production deployment", readinessLabel)}
          ${renderMetaItem(icons.building, "Sector", sectorLabel(item))}
        </div>
        <footer class="fides-credential-footer">${renderViewUseCaseDetails(ctaUrl)}</footer>
      </article>
    `;
  }

  function renderUseCaseListLike(useCaseId) {
    if (!RATINGS_API_BASE) return "";
    const summary = ratingSummariesByUseCaseId[useCaseId];
    const count = summary ? Number(summary.count) || 0 : 0;
    const isLiked = summary && summary.myRating === 1;
    return (
      '<span class="fides-row-like-badge' +
      (isLiked ? " is-liked" : "") +
      '" title="Community likes">' +
      '<span class="fides-row-like-star" aria-hidden="true">★</span>' +
      '<span class="fides-row-like-count">' +
      escapeHtml(String(count)) +
      "</span></span>"
    );
  }

  function renderUseCaseListHeader() {
    return `
      <div class="fides-use-case-list-header" aria-hidden="true">
        <div>Use case</div>
        <div class="fides-list-col-likes"></div>
        <div>Country</div>
        <div>Production deployment</div>
        <div>Sector</div>
        <div style="padding-left:0.75rem">Updated</div>
      </div>
    `;
  }

  function renderUseCaseRow(item) {
    const readinessLabel = productionDeploymentLabel(item.productionDeployment);
    const sectorText = sectorLabel(item);
    const countryText = countryLabel(item);
    const countryCode = item.country ? String(item.country).trim().toUpperCase() : "";
    const useCaseId = String(item.id || "");

    return `
      <article class="fides-use-case-row-item" data-use-case-id="${escapeHtml(useCaseId)}" role="button" tabindex="0" aria-label="${escapeHtml(item.title || item.id)}">
        <div class="fides-row-name">
          <span class="fides-row-name-text" title="${escapeHtml(item.title || item.id)}">${escapeHtml(item.title || item.id)}</span>
        </div>
        <div class="fides-row-likes">${renderUseCaseListLike(useCaseId)}</div>
        <div class="fides-row-country">
          <span class="fides-row-country-icon" aria-hidden="true">${renderMetaCountryIcon(countryCode)}</span>
          <span class="fides-row-country-text">${escapeHtml(countryText)}</span>
        </div>
        <div class="fides-row-deployment">${escapeHtml(readinessLabel)}</div>
        <div class="fides-row-sector">${escapeHtml(sectorText)}</div>
        <div class="fides-row-updated">${escapeHtml(formatDateLabel(item.updatedAt))}</div>
      </article>
    `;
  }

  function renderCards(items) {
    const mode = effectiveView();
    if (items.length === 0) {
      return `
      <div class="fides-use-case-grid" data-view="${escapeHtml(mode)}" data-columns="${escapeHtml(settings.columns)}">
        <p class="fides-empty">No use cases found.</p>
      </div>
    `;
    }
    return `
      <div class="fides-use-case-grid" data-view="${escapeHtml(mode)}" data-columns="${escapeHtml(settings.columns)}">
        ${mode === "list" ? renderUseCaseListHeader() : ""}
        ${items.map((item) => (mode === "list" ? renderUseCaseRow(item) : renderUseCaseCard(item))).join("")}
      </div>
    `;
  }

  function render() {
    const filtered = getFilteredUseCases();
    const metrics = computeMetrics(filtered);
    root.innerHTML = `
      <section class="fides-use-case-catalog fides-credential-catalog" data-theme="fides">
        <div class="fides-main-layout fides-main ${settings.showFilters ? "" : "no-filters"}">
          ${renderFiltersPanel()}
          <section class="fides-main-content">
            <div class="fides-results-bar">
              ${
                settings.showSearch
                  ? `
                <div class="fides-topbar-search">
                  <div class="fides-search-wrapper">
                    <span class="fides-search-icon">${icons.search}</span>
                    <input id="fides-search-input" class="fides-search-input" type="text" placeholder="Search..." value="${escapeHtml(filters.search)}" autocomplete="off">
                    <button class="fides-search-clear ${filters.search ? "" : "hidden"}" id="fides-search-clear" type="button" aria-label="Clear search">${icons.xSmall}</button>
                  </div>
                </div>
              `
                  : ""
              }
              <label class="fides-sort-label" for="fides-sort-select">
                <span class="fides-sort-text">Sort by:</span>
                <select id="fides-sort-select" class="fides-sort-select">
                  <option value="updated_desc" ${filters.sortBy === "updated_desc" ? "selected" : ""}>Most recent</option>
                  <option value="title_asc" ${filters.sortBy === "title_asc" ? "selected" : ""}>A–Z</option>
                  <option value="linked_desc" ${filters.sortBy === "linked_desc" ? "selected" : ""}>Most linked</option>
                </select>
              </label>
              ${
                settings.showFilters
                  ? `
                <button class="fides-mobile-filter-toggle" id="fides-mobile-filter-toggle" type="button">
                  ${icons.filter}
                  <span>Filters</span>
                  <span class="fides-filter-count ${getActiveFilterCount() > 0 ? "" : "hidden"}">${getActiveFilterCount() || 0}</span>
                </button>
              `
                  : ""
              }
              ${renderViewToggle()}
            </div>
            ${renderKpiCards(metrics)}
            <div class="fides-results">
              ${renderCards(filtered)}
            </div>
            <p id="fides-catalog-message" class="fides-form-message" aria-live="polite"></p>
          </section>
        </div>
      </section>
    `;

    bindEvents();
  }

  function linkedWalletSearchTerms(item) {
    return [...getLinkItems(item, "personalWallets"), ...getLinkItems(item, "businessWallets")]
      .map(linkItemLabel)
      .filter((label) => label && label !== "—");
  }

  function getFilteredUseCases() {
    const list = currentItems
      .filter((item) => {
        if (filters.search) {
          const haystack = [
            item.title,
            item.summary,
            item.organizationName,
            ...(item.tags ?? []),
            sectorLabel(item),
            itemSector(item),
            countryLabel(item),
            ...linkedWalletSearchTerms(item),
            ...itemListValues(item, "interactionModes").map((v) => INTERACTION_MODE_LABELS[v] || v),
            ...itemListValues(item, "vcFormats").map((v) => VC_FORMAT_LABELS[v] || v),
            ...itemListValues(item, "issuanceProtocols").map((v) => ISSUANCE_PROTOCOL_LABELS[v] || v),
            ...itemListValues(item, "presentationProtocols").map((v) => PRESENTATION_PROTOCOL_LABELS[v] || v),
            ...itemListValues(item, "interopProfiles").map((v) => INTEROP_PROFILE_LABELS[v] || v)
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(filters.search)) return false;
        }
        if (!itemMatchesArrayFilter(item, "sector", "sector")) return false;
        if (!itemMatchesArrayFilter(item, "country", "country")) return false;
        if (!itemMatchesArrayFilter(item, "interactionModes", "interactionModes")) return false;
        if (!itemMatchesArrayFilter(item, "vcFormats", "vcFormats")) return false;
        if (!itemMatchesArrayFilter(item, "issuanceProtocols", "issuanceProtocols")) return false;
        if (!itemMatchesArrayFilter(item, "presentationProtocols", "presentationProtocols")) return false;
        if (!itemMatchesArrayFilter(item, "interopProfiles", "interopProfiles")) return false;
        if (filters.productionDeployment.length > 0 && !filters.productionDeployment.includes(normalizeProductionDeployment(item.productionDeployment || ""))) return false;
        return true;
      })
      .slice();

    if (filters.sortBy === "title_asc") {
      list.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" }));
    } else if (filters.sortBy === "linked_desc") {
      list.sort((a, b) => countLinkedItems(b) - countLinkedItems(a));
    } else {
      list.sort((a, b) => Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || ""));
    }
    return list;
  }

  function renderResultsOnly() {
    const filtered = getFilteredUseCases();
    const metrics = computeMetrics(filtered);

    const resultsEl = root.querySelector(".fides-results");
    if (resultsEl) {
      resultsEl.innerHTML = renderCards(filtered);
    }

    const kpiValues = root.querySelectorAll(".fides-kpi-card .fides-kpi-value");
    if (kpiValues.length >= 4) {
      kpiValues[0].textContent = String(metrics.total);
      kpiValues[1].textContent = String(metrics.countries);
      kpiValues[2].textContent = String(metrics.productionDeployments);
      kpiValues[3].textContent = String(metrics.recent);
    }

    const searchClear = root.querySelector("#fides-search-clear");
    if (searchClear) searchClear.classList.toggle("hidden", !filters.search);
    bindUseCaseCardEvents();
  }

  function bindEvents() {
    const searchInput = root.querySelector("#fides-search-input");
    const searchClear = root.querySelector("#fides-search-clear");
    const sortSelect = root.querySelector("#fides-sort-select");
    const clearBtn = root.querySelector("#fides-clear");

    if (searchInput) {
      const handleSearch = debounce((e) => {
        filters.search = String(e.target.value || "").trim().toLowerCase();
        renderResultsOnly();
      }, 250);
      searchInput.addEventListener("input", handleSearch);
    }
    if (searchClear) {
      searchClear.addEventListener("click", () => {
        filters.search = "";
        if (searchInput) searchInput.value = "";
        searchClear.classList.add("hidden");
        renderResultsOnly();
      });
    }
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        filters.sortBy = String(e.target.value || "updated_desc");
        renderResultsOnly();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        filters.search = "";
        filters.sector = [];
        filters.country = [];
        filters.interactionModes = [];
        filters.vcFormats = [];
        filters.issuanceProtocols = [];
        filters.presentationProtocols = [];
        filters.interopProfiles = [];
        filters.productionDeployment = [];
        filters.sortBy = "updated_desc";
        render();
      });
    }

    root.querySelectorAll('[data-filter-group]').forEach((input) => {
      if (input.tagName !== "INPUT") return;
      input.addEventListener("change", (e) => {
        const group = e.target.dataset.filterGroup;
        const value = e.target.value;
        if (!Array.isArray(filters[group])) return;
        if (e.target.checked) {
          if (!filters[group].includes(value)) filters[group].push(value);
        } else {
          filters[group] = filters[group].filter((v) => v !== value);
        }
        render();
      });
    });

    root.querySelectorAll(".fides-filter-label-toggle").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const group = toggle.closest(".fides-filter-group")?.dataset.filterGroup;
        if (!group || !(group in filterGroupState)) return;
        filterGroupState[group] = !filterGroupState[group];
        render();
      });
    });

    root.querySelectorAll(".fides-view-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-view") || "grid";
        if (next === viewMode) return;
        viewMode = next;
        localStorage.setItem("fides-use-case-view", viewMode);
        root.querySelectorAll(".fides-view-btn").forEach((otherBtn) => {
          const isActive = otherBtn.getAttribute("data-view") === viewMode;
          otherBtn.classList.toggle("active", isActive);
          otherBtn.setAttribute("aria-pressed", String(isActive));
        });
        renderResultsOnly();
      });
    });

    window.addEventListener(
      "resize",
      debounce(() => {
        render();
      }, 150)
    );

    const mobileToggle = root.querySelector("#fides-mobile-filter-toggle");
    const sidebar = root.querySelector(".fides-sidebar");
    const sidebarClose = root.querySelector("#fides-sidebar-close");
    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener("click", () => {
        sidebar.classList.add("mobile-open");
        document.body.style.overflow = "hidden";
      });
    }
    if (sidebarClose && sidebar) {
      sidebarClose.addEventListener("click", () => {
        sidebar.classList.remove("mobile-open");
        document.body.style.overflow = "";
      });
    }
    if (sidebar) {
      sidebar.addEventListener("click", (e) => {
        if (e.target === sidebar && sidebar.classList.contains("mobile-open")) {
          sidebar.classList.remove("mobile-open");
          document.body.style.overflow = "";
        }
      });
    }

    bindUseCaseCardEvents();
    initVocabularyInfo(root);
  }

  function isFidesLocalDevHost() {
    try {
      const host = window.location.hostname || "";
      const href = window.location.href || "";
      return host.includes(".local") || href.includes(".local");
    } catch (_err) {
      return false;
    }
  }

  async function loadVocabulary(primaryUrl, fallbackUrl) {
    let first = primaryUrl;
    let second = fallbackUrl;
    if (isFidesLocalDevHost() && primaryUrl && fallbackUrl) {
      first = fallbackUrl;
      second = primaryUrl;
    }
    const tryLoad = async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      return data.terms || null;
    };
    if (first) {
      try {
        return await tryLoad(first);
      } catch (e) {
        console.warn("Vocabulary load failed (first):", e.message);
      }
    }
    if (second) {
      try {
        return await tryLoad(second);
      } catch (e) {
        console.warn("Vocabulary load failed (second):", e.message);
      }
    }
    return null;
  }

  function hideVocabularyPopup() {
    const overlay = document.querySelector(".fides-vocab-overlay");
    const popup = document.querySelector(".fides-vocab-popup");
    if (overlay) overlay.remove();
    if (popup) popup.remove();
  }

  function filterCheckboxLabelTextWithoutCount(label) {
    const span = label.querySelector("span");
    if (!span) return label.textContent.trim();
    const clone = span.cloneNode(true);
    clone.querySelectorAll(".fides-filter-option-count").forEach((el) => el.remove());
    return clone.textContent.trim();
  }

  function showVocabularyPopup(button, groupEl, vocabKey) {
    hideVocabularyPopup();
    if (!vocabulary) return;
    const groupTerm = vocabulary[vocabKey];
    const categoryName = (groupEl.querySelector(".fides-filter-label") || {}).textContent
      ? groupEl.querySelector(".fides-filter-label").textContent.trim()
      : "";
    let html = "";
    if (categoryName) html += '<p class="fides-vocab-popup-title"><strong>' + escapeHtml(categoryName) + "</strong></p>";
    if (groupTerm && groupTerm.description) html += '<p class="fides-vocab-popup-intro">' + escapeHtml(groupTerm.description) + "</p>";
    const optionsEl = groupEl.querySelector(".fides-filter-options");
    if (optionsEl) {
      const labels = optionsEl.querySelectorAll("label.fides-filter-checkbox");
      if (labels.length > 0) {
        const listItems = [];
        labels.forEach((label) => {
          const input = label.querySelector("input");
          const value = input ? input.dataset.value || input.value : "";
          const labelText = filterCheckboxLabelTextWithoutCount(label);
          const term = vocabulary[value] || null;
          const desc = term && term.description ? escapeHtml(term.description) : "";
          listItems.push({ labelText, desc });
        });
        const hasAnyOptionDesc = listItems.some((item) => item.desc);
        if (hasAnyOptionDesc) {
          html += '<ul class="fides-vocab-popup-list">';
          listItems.forEach((item) => {
            html += "<li><strong>" + escapeHtml(item.labelText) + "</strong>" + (item.desc ? ": " + item.desc : "") + "</li>";
          });
          html += "</ul>";
        }
      }
    }
    if (!html) html = "<p>No description available.</p>";
    const popup = document.createElement("div");
    popup.className = "fides-vocab-popup";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-label", "Filter explanation");
    popup.innerHTML = html;
    const overlay = document.createElement("div");
    overlay.className = "fides-vocab-overlay";
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    const margin = 20;
    const rect = button.getBoundingClientRect();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pw = popup.offsetWidth;
    const ph = popup.offsetHeight;
    const left = Math.max(margin, Math.min(rect.right + 40, w - pw - margin));
    const top = Math.max(margin, Math.min((h - ph) / 2, h - ph - margin));
    popup.style.left = left + "px";
    popup.style.top = top + "px";
    setTimeout(() => {
      overlay.classList.add("visible");
      popup.classList.add("visible");
    }, 10);
    const close = (e) => {
      if (e && e.target.closest && e.target.closest(".fides-vocab-popup")) return;
      hideVocabularyPopup();
      document.removeEventListener("click", close, true);
      document.removeEventListener("keydown", onKeydown);
    };
    function onKeydown(e) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeydown);
    setTimeout(() => document.addEventListener("click", close, true), 0);
  }

  function initVocabularyInfo(containerEl) {
    if (!vocabulary) return;
    hideVocabularyPopup();
    containerEl.querySelectorAll(".fides-vocab-info").forEach((btn) => btn.remove());
    containerEl.querySelectorAll(".fides-filter-group").forEach((groupEl) => {
      const toggle = groupEl.querySelector(".fides-filter-label-toggle");
      const labelSpan = toggle && toggle.querySelector(".fides-filter-label");
      if (!toggle || !labelSpan) return;
      const filterGroup = groupEl.dataset.filterGroup;
      const vocabKey = USE_CASE_FILTER_TO_VOCAB[filterGroup] || filterGroup;
      if (!vocabulary[vocabKey]) return;
      const infoBtn = document.createElement("button");
      infoBtn.type = "button";
      infoBtn.className = "fides-vocab-info";
      infoBtn.dataset.group = vocabKey;
      infoBtn.setAttribute("aria-label", "Explain filter");
      infoBtn.textContent = "i";
      infoBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        showVocabularyPopup(e.currentTarget, groupEl, vocabKey);
      });
      const parent = labelSpan.parentNode;
      if (parent.classList && parent.classList.contains("fides-filter-label-with-info")) {
        parent.appendChild(infoBtn);
        return;
      }
      const wrapper = document.createElement("div");
      wrapper.className = "fides-filter-label-with-info";
      parent.insertBefore(wrapper, labelSpan);
      wrapper.appendChild(labelSpan);
      wrapper.appendChild(infoBtn);
      const spacer = document.createElement("span");
      spacer.className = "fides-filter-toggle-spacer";
      spacer.setAttribute("aria-hidden", "true");
      parent.insertBefore(spacer, wrapper.nextSibling);
    });
  }

  async function fetchUseCases(url, options) {
    const response = await fetch(url, options || {});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return Array.isArray(json.useCases) ? json.useCases : [];
  }

  // Try the git-versioned GitHub aggregate first, then fall back to the
  // same-origin REST /catalog. The REST endpoint is also used when GitHub
  // returns an empty set (e.g. a local site with no published git data yet).
  async function loadUseCases() {
    if (aggregatedUrl) {
      try {
        const items = await fetchUseCases(aggregatedUrl, { cache: "no-cache" });
        if (items.length > 0) return items;
      } catch (githubError) {
        console.warn("Use case GitHub source unavailable, falling back to REST:", githubError.message);
      }
    }
    if (apiBase) {
      return fetchUseCases(`${apiBase}/catalog`);
    }
    return [];
  }

  async function load() {
    if (!aggregatedUrl && !apiBase) return;
    try {
      const rawItems = await loadUseCases();
      currentItems = rawItems.map((item) => Object.assign({}, item, { productionDeployment: normalizeProductionDeployment(item.productionDeployment) }));
      filterFacets = computeFacets(currentItems);
      await loadUseCaseRatingSummaries(currentItems);
      render();
      openUseCaseFromQueryParam();
      if (VOCABULARY_URL || VOCABULARY_FALLBACK_URL) {
        loadVocabulary(VOCABULARY_URL, VOCABULARY_FALLBACK_URL)
          .then((terms) => {
            vocabulary = terms;
            if (vocabulary) initVocabularyInfo(root);
          })
          .catch((vocabError) => {
            console.warn("Use case vocabulary load failed:", vocabError.message);
          });
      }
    } catch (_err) {
      // Reveal the server-rendered SSR fallback (if present) instead of
      // wiping the container with an error — keeps content for no-JS/crawlers
      // and for users when the upstream catalog feed is unreachable.
      const ssrFallback = root.querySelector('[data-fides-ssr="usecase"]');
      if (ssrFallback) {
        ssrFallback.style.display = "";
        ssrFallback.removeAttribute("aria-hidden");
        const spinner = root.querySelector('[data-fides-ssr-spinner="1"]');
        if (spinner) spinner.remove();
        return;
      }
      root.innerHTML = '<p class="fides-form-message is-error">Could not load catalog data.</p>';
    }
  }

  load();
})();
