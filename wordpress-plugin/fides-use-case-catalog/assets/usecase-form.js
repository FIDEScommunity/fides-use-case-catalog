(function () {
  const config = window.FIDES_USE_CASE_FORM_CONFIG || {};
  const mode = config.mode === "update" ? "update" : "create";
  const root =
    document.getElementById(
      mode === "update" ? "fides-use-case-update-form-root" : "fides-use-case-form-root"
    ) || document.querySelector(".fides-use-case-submission-root");
  if (!root) return;

  const apiBase = String(config.apiBase || "").replace(/\/$/, "");
  const taxonomy = config.taxonomy || {};
  const contactEmail = String(config.contactEmail || "").trim();
  const restNonce = String(config.restNonce || "").trim();
  const countries = Array.isArray(config.countries) ? config.countries : [];
  const VOCABULARY_URL = config.vocabularyUrl ? String(config.vocabularyUrl) : "";
  const VOCABULARY_FALLBACK_URL = config.vocabularyFallbackUrl ? String(config.vocabularyFallbackUrl) : "";
  let vocabulary = null;

  const FORM_FIELD_TO_VOCAB = {
    interactionModes: "interactionMode",
    vcFormats: "vcFormat",
    issuanceProtocols: "issuanceProtocol",
    presentationProtocols: "presentationProtocol",
    interopProfiles: "interopProfile"
  };

  /** Map form option slugs to vocabulary.json term keys (when they differ). */
  const FORM_OPTION_TO_VOCAB = {
    issuanceProtocols: {
      oid4vci: "OpenID4VCI"
    }
  };
  let selectedUseCaseId = mode === "update" ? String(config.preselectUseCaseId || "").trim() : "";
  let selectedUseCaseLabel = "";

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function sortedOptionEntries(optionsMap) {
    return Object.entries(optionsMap || {}).sort((a, b) =>
      String(a[1]).localeCompare(String(b[1]), undefined, { sensitivity: "base" })
    );
  }

  function sortedSectorOptionEntries(optionsMap) {
    const entries = sortedOptionEntries(optionsMap).filter(([key]) => key !== "other");
    if (optionsMap && optionsMap.other !== undefined) {
      entries.push(["other", "...Other"]);
    }
    return entries;
  }

  function countryLabel(code) {
    const upper = String(code || "").trim().toUpperCase();
    const match = countries.find((entry) => String(entry.code || "").toUpperCase() === upper);
    return match && match.label ? String(match.label) : upper;
  }

  function countrySelectHtml(selected) {
    const sel = String(selected || "").trim().toUpperCase();
    let html = '<option value="">Select...</option>';
    countries.forEach((entry) => {
      const code = String(entry.code || "").trim().toUpperCase();
      if (!code) return;
      const label = String(entry.label || code);
      html += `<option value="${escapeHtml(code)}"${sel === code ? " selected" : ""}>${escapeHtml(label)} (${escapeHtml(code)})</option>`;
    });
    return html;
  }

  const updateCountryFieldHtml =
    mode === "update"
      ? `<div class="fides-form-row">
              <label for="fides-country">Country *</label>
              <p class="fides-help">Confirm the country for this use case. It is normally assigned during review; change it only when the country should be updated.</p>
              <select id="fides-country" name="country" required>
                ${countrySelectHtml("")}
              </select>
            </div>`
      : "";

  function renderCheckboxGroup(label, fieldKey, optionsMap, required) {
    const entries = sortedOptionEntries(optionsMap);
    if (entries.length === 0) return "";
    const req = required ? " *" : "";
    const labelId = `fides-label-${fieldKey}`;
    return `
      <div class="fides-linked-field fides-taxonomy-field" data-multi-field="${escapeHtml(fieldKey)}">
        <label id="${escapeHtml(labelId)}">${escapeHtml(label)}${req}</label>
        <div class="fides-form-choices" role="group" aria-labelledby="${escapeHtml(labelId)}">
          ${entries
            .map(
              ([value, optionLabel]) => `
            <label class="fides-form-choice">
              <input type="checkbox" name="${escapeHtml(fieldKey)}" value="${escapeHtml(value)}" />
              <span>${escapeHtml(optionLabel)}</span>
            </label>`
            )
            .join("")}
        </div>
      </div>
    `;
  }

  const technicalFieldsHtml = [
    renderCheckboxGroup("Interaction mode", "interactionModes", taxonomy.interactionModes, false),
    renderCheckboxGroup("VC format", "vcFormats", taxonomy.vcFormats, false),
    renderCheckboxGroup("Issuance protocol", "issuanceProtocols", taxonomy.issuanceProtocols, false),
    renderCheckboxGroup("Presentation protocol", "presentationProtocols", taxonomy.presentationProtocols, false),
    renderCheckboxGroup("Interop profile", "interopProfiles", taxonomy.interopProfiles, false)
  ].join("");

  const descriptionPlaceholder =
    "Describe the use case, the problem it solves, the value it creates, the organizations and user roles involved, and the role of digital wallets and verifiable credentials.";

  const howItWorksPlaceholder =
    "Walk through the process step by step from a user and organizational perspective. Explain how the different parties interact and where digital wallets and verifiable credentials are used throughout the flow.";

  const sectionTitle = mode === "update" ? "Suggest an update" : "Use case overview";
  const sectionIntroHtml =
    mode === "update"
      ? `<p class="fides-form-section-intro">Search for a published use case, review the pre-filled details, and submit your proposed changes for review.</p>`
      : `<p class="fides-form-section-intro">Describe the use case, its sector, and who is submitting it.</p>`;
  const sectionBadgeHtml =
    mode === "create" ? `<span class="fides-form-accordion-badge">About 3 minutes</span>` : "";
  const updatePickerHtml =
    mode === "update"
      ? `<div id="fides-use-case-update-picker" class="fides-form-section-body fides-use-case-update-picker-body">
            <div id="fides-use-case-search-block" class="fides-linked-field">
              <label for="fides-use-case-search">Find use case *</label>
              <p class="fides-help">Search the published use case catalog by title or organization name.</p>
              <div class="fides-linked-inputs">
                <input id="fides-use-case-search" type="text" autocomplete="off" placeholder="Start typing…" />
              </div>
              <div class="fides-lookup-panel">
                <p id="fides-use-case-lookup-hint" class="fides-lookup-hint" hidden></p>
                <ul id="fides-use-case-lookup-results" class="fides-lookup-results" role="listbox" aria-label="Search results"></ul>
              </div>
            </div>
            <div id="fides-use-case-update-banner" class="fides-update-banner-row" hidden>
              <div class="fides-update-banner">
                <span class="fides-update-banner-label">Updating:</span>
                <strong id="fides-use-case-update-name"></strong>
                <code id="fides-use-case-update-id"></code>
              </div>
              <button type="button" class="fides-secondary-btn" id="fides-use-case-change">Choose different</button>
            </div>
          </div>`
      : "";

  root.innerHTML = `
    <section class="fides-use-case-card">
      <form id="fides-use-case-form" class="fides-use-case-form${mode === "update" ? " fides-use-case-form--update" : ""}">
        ${
          mode === "update"
            ? `<section class="fides-form-section fides-form-section-first" aria-labelledby="fides-overview-section-title">
          <div class="fides-form-accordion-heading">
            <h3 id="fides-overview-section-title" class="fides-form-section-title">${escapeHtml(sectionTitle)}</h3>
          </div>
          ${sectionIntroHtml}
          ${updatePickerHtml}
          <div id="fides-use-case-fields-wrap" hidden aria-hidden="true">`
            : `<div id="fides-use-case-fields-wrap">
        <section class="fides-form-section fides-form-section-first" aria-labelledby="fides-overview-section-title">
          <div class="fides-form-accordion-heading">
            <h3 id="fides-overview-section-title" class="fides-form-section-title">${escapeHtml(sectionTitle)}</h3>
            ${sectionBadgeHtml}
          </div>
          ${sectionIntroHtml}`
        }
          <div class="fides-form-section-body">
            <div class="fides-form-row">
              <label for="fides-title">Use case title *</label>
              <input id="fides-title" name="title" type="text" minlength="5" maxlength="120" required />
            </div>
            <div class="fides-form-row">
              <label for="fides-summary">Description *</label>
              <textarea id="fides-summary" name="summary" minlength="30" maxlength="1200" required placeholder="${escapeHtml(descriptionPlaceholder)}"></textarea>
            </div>
            <div class="fides-form-grid fides-form-grid-pair fides-form-grid-pair--aligned">
              <div class="fides-form-row">
                <label for="fides-sector">Sector *</label>
                <p class="fides-help">The primary sector this use case applies to.</p>
                <select id="fides-sector" name="sector" required>
                  <option value="">Select...</option>
                  ${sortedSectorOptionEntries(taxonomy.sectors)
                    .map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`)
                    .join("")}
                </select>
              </div>
              <div class="fides-form-row">
                <span class="fides-form-label">Production deployment *</span>
                <p class="fides-help">Is this use case currently deployed in a live operational environment?</p>
                <div class="fides-form-choices fides-form-choices-inline">
                  <label class="fides-form-choice">
                    <input type="radio" id="fides-production-deployment-yes" name="productionDeployment" value="yes" required>
                    <span>Yes</span>
                  </label>
                  <label class="fides-form-choice">
                    <input type="radio" id="fides-production-deployment-no" name="productionDeployment" value="no" required>
                    <span>No</span>
                  </label>
                </div>
              </div>
            </div>
            ${updateCountryFieldHtml}
            <div class="fides-overview-orgs">
              <div id="fides-org-link-field"></div>
            </div>
            <div class="fides-submitter-block">
              <div class="fides-form-grid fides-form-grid-pair fides-submitter-grid">
                <div class="fides-form-row">
                  <label for="fides-organization-name">Submitted by organization *</label>
                  <p id="fides-submitter-hint" class="fides-help fides-submitter-hint">Add at least one involved organization above before you can select who is submitting.</p>
                  <select id="fides-organization-name" name="organizationName" disabled>
                    <option value="">Select...</option>
                  </select>
                </div>
                ${
                  contactEmail
                    ? `<div class="fides-form-row">
                  <label for="fides-contact-email">Contact email *</label>
                  <p class="fides-help fides-contact-email-hint">Taken from your FIDES account</p>
                  <input id="fides-contact-email" class="fides-input-locked" type="email" value="${escapeHtml(contactEmail)}" readonly aria-readonly="true" tabindex="-1" />
                </div>`
                    : `<div class="fides-form-row"><p class="fides-form-message is-error">Your WordPress profile must have a valid email address before you can submit.</p></div>`
                }
              </div>
            </div>
            <div class="fides-form-row">
              <label for="fides-user-journey">How it works *</label>
              <p class="fides-help">Walk through the end-user flow step by step (who does what, in which order).</p>
              <textarea
                id="fides-user-journey"
                class="fides-user-journey"
                name="userJourney"
                maxlength="1200"
                rows="6"
                required
                placeholder="${escapeHtml(howItWorksPlaceholder)}"
              ></textarea>
            </div>
            <div class="fides-form-grid fides-form-grid-pair">
              <div class="fides-form-row">
                <label for="fides-tags">Tags (comma separated)</label>
                <input id="fides-tags" name="tags" type="text" placeholder="identity, payment, education" />
              </div>
              <div class="fides-form-row">
                <label for="fides-more-info-url">More info URL</label>
                <input id="fides-more-info-url" name="moreInfoUrl" type="url" placeholder="https://…" />
              </div>
            </div>
          </div>
        ${mode === "create" ? "</section>" : ""}

        <section class="fides-form-section" aria-labelledby="fides-media-section-title">
          <div class="fides-form-accordion-heading">
            <h3 id="fides-media-section-title" class="fides-form-section-title">Media</h3>
            <span class="fides-form-accordion-badge">Optional</span>
          </div>
          <p class="fides-form-section-intro">Images and demo videos appear on the catalog card and detail page. The first image or video thumbnail is used on the card; all media are shown in the detail modal. If you omit images, the catalog uses a thumbnail from your first video. If both are omitted, an AI-generated image is created from your use case description.</p>
          <div class="fides-form-section-body fides-media-section-body">
            <div class="fides-form-grid fides-media-grid">
              <div class="fides-media-col">
                <label>Cover images</label>
                <p class="fides-help fides-media-col-help">Landscape images work best (16:9). Upload or paste URLs. The first image is used on the card; the detail modal uses the same ratio.</p>
                <div id="fides-image-rows" class="fides-media-rows" aria-live="polite"></div>
              </div>
              <div class="fides-media-col">
                <label>Demo videos</label>
                <p class="fides-help fides-media-col-help">YouTube or Vimeo links to demos of the flow.</p>
                <div id="fides-video-rows" class="fides-media-rows" aria-live="polite"></div>
              </div>
            </div>
            <p id="fides-image-upload-status" class="fides-lookup-hint" hidden></p>
          </div>
        </section>

        <details class="fides-form-section fides-form-accordion">
          <summary class="fides-form-accordion-summary">
            <span class="fides-form-accordion-heading">
              <span class="fides-form-section-title">Technical details</span>
              <span class="fides-form-accordion-badge">Optional</span>
            </span>
            <span class="fides-form-accordion-chevron" aria-hidden="true"></span>
          </summary>
          <div class="fides-form-accordion-panel">
            <p class="fides-form-section-intro">Select the protocols, formats, and profiles that apply to this use case.</p>
            <div class="fides-form-section-body">
              ${technicalFieldsHtml}
            </div>
          </div>
        </details>

        <details class="fides-form-section fides-form-accordion">
          <summary class="fides-form-accordion-summary">
            <span class="fides-form-accordion-heading">
              <span class="fides-form-section-title">Linked catalog items</span>
              <span class="fides-form-accordion-badge">Optional</span>
            </span>
            <span class="fides-form-accordion-chevron" aria-hidden="true"></span>
          </summary>
          <div class="fides-form-accordion-panel">
            <p class="fides-form-section-intro">Link wallets, issuers, credentials, and relying parties used in this use case. Search FIDES catalogs or add names manually when an item is not listed yet.</p>
            <div id="fides-link-fields" class="fides-form-section-body"></div>
          </div>
        </details>
        </div>
        ${mode === "update" ? "</section>" : ""}

        <div id="fides-use-case-submit-block" class="fides-use-case-submit-block"${mode === "update" ? ' hidden aria-hidden="true"' : ""}>
        <div class="fides-consent">
          <label><input type="checkbox" name="consentPublish" required /> I confirm this information may be published *</label>
        </div>

        <div class="fides-form-actions">
          <button type="submit">${mode === "update" ? "Submit update proposal" : "Submit use case"}</button>
        </div>
        </div>
        <p id="fides-form-message" class="fides-form-message" aria-live="polite"></p>
      </form>
    </section>
  `;

  const form = root.querySelector("#fides-use-case-form");
  const messageEl = root.querySelector("#fides-form-message");
  const fieldsWrap = root.querySelector("#fides-use-case-fields-wrap");
  const submitBlock = root.querySelector("#fides-use-case-submit-block");
  const searchInput = root.querySelector("#fides-use-case-search");
  const lookupResults = root.querySelector("#fides-use-case-lookup-results");
  const lookupHint = root.querySelector("#fides-use-case-lookup-hint");
  const updateBanner = root.querySelector("#fides-use-case-update-banner");
  const searchBlock = root.querySelector("#fides-use-case-search-block");
  const updateNameEl = root.querySelector("#fides-use-case-update-name");
  const updateIdEl = root.querySelector("#fides-use-case-update-id");
  const changeUseCaseBtn = root.querySelector("#fides-use-case-change");
  const imageRowsEl = root.querySelector("#fides-image-rows");
  const videoRowsEl = root.querySelector("#fides-video-rows");
  const imageUploadStatusEl = root.querySelector("#fides-image-upload-status");
  const imageRowsState = [{ url: "" }];
  const videoRowsState = [{ url: "" }];

  function getCheckedValues(fieldKey) {
    return Array.from(form.querySelectorAll(`input[name="${fieldKey}"]:checked`))
      .map((input) => String(input.value || "").trim())
      .filter(Boolean);
  }
  const linkFieldsRoot = root.querySelector("#fides-link-fields");
  const organizationsLinkRoot = root.querySelector("#fides-org-link-field");

  const organizationLinkType = {
    key: "organizations",
    label: "Involved organizations",
    lookupType: "organization",
    intro:
      "Add all organizations involved in this use case. Search the organization catalog or enter a name manually if it is not listed yet. Then choose which organization is submitting below."
  };

  const linkTypes = [
    { key: "personalWallets", label: "Personal wallets used", lookupType: "personal-wallet", walletType: "personal" },
    { key: "businessWallets", label: "Business wallets used", lookupType: "business-wallet", walletType: "organizational" },
    { key: "issuers", label: "Issuers involved", lookupType: "issuer" },
    { key: "credentials", label: "Credential types used", lookupType: "credential" },
    { key: "rps", label: "Relying parties", lookupType: "rp" }
  ];
  const linkState = {};
  const linkChipRefreshers = {};
  const submitterSelect = root.querySelector("#fides-organization-name");
  const countrySelect = root.querySelector("#fides-country");

  function involvedOrganizationLabels() {
    const orgs = linkState.organizations || [];
    const seen = new Set();
    const labels = [];
    orgs.forEach((item) => {
      const label = String(item.labelRaw || item.refId || "").trim();
      if (!label || seen.has(label)) return;
      seen.add(label);
      labels.push(label);
    });
    return labels.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }

  function syncSubmittedByOrganizationSelect() {
    if (!submitterSelect) return;
    const labels = involvedOrganizationLabels();
    const previous = submitterSelect.value;
    submitterSelect.innerHTML =
      '<option value="">Select...</option>' +
      labels
        .map((label) => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`)
        .join("");

    if (labels.length === 0) {
      submitterSelect.value = "";
      submitterSelect.disabled = true;
      submitterSelect.removeAttribute("required");
      return;
    }

    submitterSelect.disabled = false;
    submitterSelect.setAttribute("required", "required");
    if (previous && labels.includes(previous)) {
      submitterSelect.value = previous;
    }
  }

  function setMessage(text, type) {
    messageEl.textContent = text || "";
    messageEl.className = `fides-form-message ${type ? `is-${type}` : ""}`.trim();
  }

  function submissionItemUrl(useCaseId) {
    const id = String(useCaseId || "").trim();
    if (!id || !/^[a-z0-9][a-z0-9._-]*$/.test(id)) {
      return "";
    }
    return `${apiBase}/submissions/${encodeURIComponent(id)}`;
  }

  function showUpdateSelectionUi() {
    const hasSelection = Boolean(selectedUseCaseId);
    if (updateBanner) updateBanner.hidden = !hasSelection;
    if (searchBlock) searchBlock.hidden = hasSelection;
    if (submitBlock && mode === "update") submitBlock.hidden = !hasSelection;
    if (!hasSelection) {
      if (updateNameEl) updateNameEl.textContent = "";
      if (updateIdEl) updateIdEl.textContent = "";
      return;
    }
    if (updateNameEl) updateNameEl.textContent = selectedUseCaseLabel || selectedUseCaseId;
    if (updateIdEl) updateIdEl.textContent = selectedUseCaseId;
  }

  function revealFields(show) {
    if (fieldsWrap) {
      fieldsWrap.hidden = !show;
      if (show) {
        fieldsWrap.removeAttribute("aria-hidden");
      } else {
        fieldsWrap.setAttribute("aria-hidden", "true");
      }
    }
  }

  function setMediaFromPayload(payload) {
    const imageUrls = Array.isArray(payload.imageUrls)
      ? payload.imageUrls.map((url) => String(url || "").trim()).filter(Boolean)
      : [];
    if (imageUrls.length === 0 && payload.imageUrl) {
      imageUrls.push(String(payload.imageUrl).trim());
    }
    imageRowsState.length = 0;
    (imageUrls.length ? imageUrls : [""]).forEach((url) => imageRowsState.push({ url }));
    renderImageRows();

    const videoUrls = [];
    if (Array.isArray(payload.videos)) {
      payload.videos.forEach((video) => {
        if (video && video.url) videoUrls.push(String(video.url).trim());
      });
    }
    if (Array.isArray(payload.videoUrls)) {
      payload.videoUrls.forEach((url) => {
        const trimmed = String(url || "").trim();
        if (trimmed) videoUrls.push(trimmed);
      });
    }
    if (videoUrls.length === 0 && payload.video && payload.video.url) {
      videoUrls.push(String(payload.video.url).trim());
    }
    videoRowsState.length = 0;
    (videoUrls.length ? videoUrls : [""]).forEach((url) => videoRowsState.push({ url }));
    renderVideoRows();
  }

  function setCountryValue(code) {
    if (!countrySelect) return;
    const upper = String(code || "").trim().toUpperCase();
    if (!upper) {
      countrySelect.value = "";
      return;
    }
    const hasOption = Array.from(countrySelect.options).some((opt) => opt.value === upper);
    if (hasOption) {
      countrySelect.value = upper;
      return;
    }
    const option = document.createElement("option");
    option.value = upper;
    option.textContent = `${countryLabel(upper)} (${upper})`;
    option.selected = true;
    countrySelect.appendChild(option);
  }

  function fillForm(payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    const titleEl = form.querySelector("#fides-title");
    const summaryEl = form.querySelector("#fides-summary");
    const sectorEl = form.querySelector("#fides-sector");
    const userJourneyEl = form.querySelector("#fides-user-journey");
    const tagsEl = form.querySelector("#fides-tags");
    const moreInfoEl = form.querySelector("#fides-more-info-url");

    if (titleEl) titleEl.value = String(data.title || "");
    if (summaryEl) summaryEl.value = String(data.summary || "");
    if (sectorEl) sectorEl.value = String(data.sector || "");
    if (userJourneyEl) userJourneyEl.value = String(data.userJourney || "");
    if (tagsEl) {
      tagsEl.value = Array.isArray(data.tags) ? data.tags.join(", ") : "";
    }
    if (moreInfoEl) moreInfoEl.value = String(data.moreInfoUrl || "");
    setCountryValue(data.country || "");

    const production = String(data.productionDeployment || "").trim();
    form.querySelectorAll('input[name="productionDeployment"]').forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      input.checked = production !== "" && input.value === production;
    });

    ["interactionModes", "vcFormats", "issuanceProtocols", "presentationProtocols", "interopProfiles"].forEach(
      (fieldKey) => {
        const values = Array.isArray(data[fieldKey]) ? data[fieldKey].map(String) : [];
        form.querySelectorAll(`input[name="${fieldKey}"]`).forEach((input) => {
          if (!(input instanceof HTMLInputElement)) return;
          input.checked = values.includes(input.value);
        });
      }
    );

    Object.keys(linkState).forEach((key) => {
      linkState[key] = [];
    });
    const links = data.links && typeof data.links === "object" ? data.links : {};
    Object.keys(linkState).forEach((key) => {
      const items = Array.isArray(links[key]) ? links[key] : [];
      linkState[key] = items.map((item) => ({
        refId: item && item.refId ? String(item.refId) : null,
        labelRaw: item && item.labelRaw ? String(item.labelRaw) : null,
        url: item && item.url ? String(item.url) : null,
        source: item && item.source === "catalog" ? "catalog" : "manual",
        walletType: item && item.walletType ? String(item.walletType) : null
      }));
    });

    Object.values(linkChipRefreshers).forEach((refresh) => {
      if (typeof refresh === "function") refresh();
    });

    if (submitterSelect && data.organizationName) {
      submitterSelect.value = String(data.organizationName);
    }
    syncSubmittedByOrganizationSelect();

    setMediaFromPayload(data);
    const consentEl = form.querySelector('input[name="consentPublish"]');
    if (consentEl instanceof HTMLInputElement) {
      consentEl.checked = false;
    }
  }

  async function loadItemPayload(useCaseId) {
    const url = submissionItemUrl(useCaseId);
    if (!url) {
      setMessage("Invalid use case id.", "error");
      return;
    }
    setMessage("Loading use case details…", "");
    const headers = {};
    if (restNonce) headers["X-WP-Nonce"] = restNonce;
    try {
      const response = await fetch(url, {
        credentials: "same-origin",
        headers
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(json.message || "Could not load use case details.", "error");
        return;
      }
      fillForm(json.payload || {});
      if (json.payload && json.payload.title) {
        selectedUseCaseLabel = String(json.payload.title);
        showUpdateSelectionUi();
      }
      revealFields(true);
      setMessage("", "");
    } catch (_err) {
      setMessage("Could not load use case details due to a network error.", "error");
    }
  }

  async function selectUseCase(item) {
    selectedUseCaseId = String(item.id || "").trim();
    selectedUseCaseLabel = String(item.label || selectedUseCaseId).trim();
    if (lookupResults) lookupResults.innerHTML = "";
    if (lookupHint) {
      lookupHint.hidden = true;
      lookupHint.textContent = "";
    }
    showUpdateSelectionUi();
    await loadItemPayload(selectedUseCaseId);
  }

  function resetUpdateSelection() {
    selectedUseCaseId = "";
    selectedUseCaseLabel = "";
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
    showUpdateSelectionUi();
    revealFields(false);
    fillForm({});
    setMessage("", "");
  }

  function setImageUploadStatus(text) {
    if (!imageUploadStatusEl) return;
    if (!text) {
      imageUploadStatusEl.hidden = true;
      imageUploadStatusEl.textContent = "";
      return;
    }
    imageUploadStatusEl.hidden = false;
    imageUploadStatusEl.textContent = text;
  }

  function collectMediaUrls(state) {
    return state.map((entry) => String(entry.url || "").trim()).filter(Boolean);
  }

  function renderImageRows() {
    if (!imageRowsEl) return;
    const lastIndex = imageRowsState.length - 1;
    imageRowsEl.innerHTML = imageRowsState
      .map(
        (entry, index) => {
          const isLast = index === lastIndex;
          const rowAction = isLast
            ? `<button type="button" class="fides-secondary-btn fides-media-action-btn" data-add-image="1">Add</button>`
            : `<button type="button" class="fides-secondary-btn fides-media-action-btn" data-remove-image="${index}" aria-label="Remove image">Remove</button>`;
          return `
          <div class="fides-media-row" data-image-index="${index}">
            <div class="fides-media-inputs">
              <input type="url" data-image-url="${index}" value="${escapeHtml(entry.url || "")}" placeholder="https://…" />
              <label class="fides-secondary-btn fides-media-action-btn fides-upload-btn">
                Upload
                <input type="file" data-image-file="${index}" accept="image/jpeg,image/png,image/webp,image/gif" hidden />
              </label>
              ${rowAction}
            </div>
            ${
              entry.url
                ? `<div class="fides-image-preview"><img src="${escapeHtml(entry.url)}" alt="Image preview" loading="lazy" /></div>`
                : ""
            }
          </div>`;
        }
      )
      .join("");
  }

  function renderVideoRows() {
    if (!videoRowsEl) return;
    const lastIndex = videoRowsState.length - 1;
    videoRowsEl.innerHTML = videoRowsState
      .map(
        (entry, index) => {
          const isLast = index === lastIndex;
          const rowAction = isLast
            ? `<button type="button" class="fides-secondary-btn fides-media-action-btn" data-add-video="1">Add</button>`
            : `<button type="button" class="fides-secondary-btn fides-media-action-btn" data-remove-video="${index}" aria-label="Remove video">Remove</button>`;
          return `
          <div class="fides-media-row" data-video-index="${index}">
            <div class="fides-media-inputs">
              <input type="url" data-video-url="${index}" value="${escapeHtml(entry.url || "")}" placeholder="https://…" />
              ${rowAction}
            </div>
          </div>`;
        }
      )
      .join("");
  }

  function resetMediaRows() {
    imageRowsState.length = 0;
    imageRowsState.push({ url: "" });
    videoRowsState.length = 0;
    videoRowsState.push({ url: "" });
    renderImageRows();
    renderVideoRows();
    setImageUploadStatus("");
  }

  async function uploadImageFile(file, rowIndex) {
    if (!file || !apiBase) {
      setImageUploadStatus("Missing API configuration.");
      return;
    }
    setImageUploadStatus("Uploading…");
    const formData = new FormData();
    formData.append("file", file);
    const headers = {};
    if (restNonce) {
      headers["X-WP-Nonce"] = restNonce;
    }
    try {
      const response = await fetch(`${apiBase}/submissions/card-image`, {
        method: "POST",
        credentials: "same-origin",
        headers,
        body: formData
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setImageUploadStatus(json.message || "Image upload failed.");
        return;
      }
      const url = json.url ? String(json.url) : "";
      if (!url) {
        setImageUploadStatus("Upload succeeded but no URL was returned.");
        return;
      }
      if (imageRowsState[rowIndex]) {
        imageRowsState[rowIndex].url = url;
      }
      renderImageRows();
      setImageUploadStatus("Image uploaded.");
    } catch (_err) {
      setImageUploadStatus("Image upload failed due to a network error.");
    }
  }

  renderImageRows();
  renderVideoRows();

  if (imageRowsEl) {
    imageRowsEl.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.hasAttribute("data-image-url")) return;
      const index = Number(target.getAttribute("data-image-url"));
      if (!Number.isFinite(index) || !imageRowsState[index]) return;
      imageRowsState[index].url = target.value.trim();
      renderImageRows();
    });

    imageRowsEl.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.hasAttribute("data-image-file")) return;
      const index = Number(target.getAttribute("data-image-file"));
      const file = target.files && target.files[0];
      target.value = "";
      if (!Number.isFinite(index) || !file) return;
      uploadImageFile(file, index);
    });

    imageRowsEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.hasAttribute("data-add-image")) {
        imageRowsState.push({ url: "" });
        renderImageRows();
        return;
      }
      const indexAttr = target.getAttribute("data-remove-image");
      if (indexAttr == null) return;
      const index = Number(indexAttr);
      if (!Number.isFinite(index) || imageRowsState.length <= 1) return;
      imageRowsState.splice(index, 1);
      renderImageRows();
    });
  }

  if (videoRowsEl) {
    videoRowsEl.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.hasAttribute("data-video-url")) return;
      const index = Number(target.getAttribute("data-video-url"));
      if (!Number.isFinite(index) || !videoRowsState[index]) return;
      videoRowsState[index].url = target.value.trim();
    });

    videoRowsEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.hasAttribute("data-add-video")) {
        videoRowsState.push({ url: "" });
        renderVideoRows();
        return;
      }
      const indexAttr = target.getAttribute("data-remove-video");
      if (indexAttr == null) return;
      const index = Number(indexAttr);
      if (!Number.isFinite(index) || videoRowsState.length <= 1) return;
      videoRowsState.splice(index, 1);
      renderVideoRows();
    });
  }

  function renderSelected(container, key) {
    const selected = linkState[key] || [];
    container.innerHTML = selected
      .map((item, index) => {
        const label = item.labelRaw || item.refId || "Custom";
        const manualBadge =
          item.source === "manual" ? ' <small class="fides-chip-source">Manual</small>' : "";
        return `<span class="fides-chip">${escapeHtml(label)}${manualBadge}<button type="button" data-remove-index="${index}" aria-label="Remove">×</button></span>`;
      })
      .join("");
  }

  function renderLookupOption(item, idx) {
    const title = escapeHtml(item.label || "Unnamed");
    const subtitle = item.subtitle ? escapeHtml(item.subtitle) : "";
    return (
      `<li><button type="button" class="fides-lookup-option" data-result-index="${idx}" ` +
      `aria-label="Add ${title}${subtitle ? `, ${subtitle}` : ""}">` +
      `<span class="fides-lookup-option-main">` +
      `<span class="fides-lookup-option-title">${title}</span>` +
      (subtitle ? `<span class="fides-lookup-option-subtitle">${subtitle}</span>` : "") +
      `</span>` +
      `<span class="fides-lookup-option-action">Add</span>` +
      `</button></li>`
    );
  }

  function addLinkField(fieldConfig, mountRoot) {
    const targetRoot = mountRoot || linkFieldsRoot;
    if (!targetRoot) return;

    linkState[fieldConfig.key] = [];
    const wrapper = document.createElement("div");
    wrapper.className = "fides-linked-field";
    const introHtml = fieldConfig.intro
      ? `<p class="fides-help fides-linked-field-intro">${escapeHtml(fieldConfig.intro)}</p>`
      : "";

    wrapper.innerHTML = `
      <label>${escapeHtml(fieldConfig.label)}</label>
      ${introHtml}
      <div class="fides-linked-inputs">
        <input type="text" placeholder="Search by name…" autocomplete="off" />
        <button type="button" class="fides-secondary-btn">Add manually</button>
      </div>
      <div class="fides-lookup-panel">
        <p class="fides-lookup-hint" hidden></p>
        <ul class="fides-lookup-results" role="listbox" aria-label="Search results"></ul>
      </div>
      <div class="fides-chip-list"></div>
    `;

    const searchInput = wrapper.querySelector("input");
    const manualBtn = wrapper.querySelector("button");
    const resultsEl = wrapper.querySelector(".fides-lookup-results");
    const hintEl = wrapper.querySelector(".fides-lookup-hint");
    const chipsEl = wrapper.querySelector(".fides-chip-list");
    let debounceTimer = null;

    function refreshChips() {
      renderSelected(chipsEl, fieldConfig.key);
      if (fieldConfig.key === "organizations") {
        syncSubmittedByOrganizationSelect();
      }
    }
    linkChipRefreshers[fieldConfig.key] = refreshChips;

    function setLookupHint(message) {
      if (!hintEl) return;
      if (!message) {
        hintEl.hidden = true;
        hintEl.textContent = "";
        return;
      }
      hintEl.hidden = false;
      hintEl.textContent = message;
    }

    function clearLookupResults() {
      resultsEl.innerHTML = "";
      setLookupHint("");
    }

    function fetchResults(query) {
      if (!apiBase || query.length < 2) {
        clearLookupResults();
        return;
      }
      fetch(`${apiBase}/lookups/${fieldConfig.lookupType}?q=${encodeURIComponent(query)}`)
        .then(async (response) => {
          const json = await response.json().catch(() => ({}));
          if (!response.ok) {
            const message = json && json.message ? json.message : "Lookup failed";
            throw new Error(message);
          }
          return json;
        })
        .then((json) => {
          const items = Array.isArray(json.content) ? json.content : [];
          const totalMatches = Number(json.totalMatches);
          const limit = Number(json.limit) || 8;
          const truncated =
            json.truncated === true ||
            (Number.isFinite(totalMatches) && totalMatches > items.length);

          if (items.length === 0) {
            setLookupHint("");
            resultsEl.innerHTML =
              '<li class="fides-lookup-empty"><span>No matches. Use “Add manually”.</span></li>';
            return;
          }

          const shown = items.length;
          const totalLabel = Number.isFinite(totalMatches) && totalMatches > 0 ? totalMatches : shown;
          if (truncated) {
            setLookupHint(`Showing top ${shown} of ${totalLabel} matches. Type a more specific name to narrow results.`);
          } else {
            setLookupHint(
              totalLabel === 1 ? "1 match — click to add" : `${totalLabel} matches — click to add`
            );
          }

          const moreRow = truncated
            ? `<li class="fides-lookup-more" aria-live="polite"><span>+ ${totalLabel - shown} more not shown — refine your search</span></li>`
            : "";

          resultsEl.innerHTML = items.map((item, idx) => renderLookupOption(item, idx)).join("") + moreRow;

          resultsEl.querySelectorAll("button[data-result-index]").forEach((btn) => {
            btn.addEventListener("click", () => {
              const idx = Number(btn.getAttribute("data-result-index"));
              const selected = items[idx];
              if (!selected) return;
              linkState[fieldConfig.key].push({
                refId: selected.id || null,
                labelRaw: selected.label || null,
                url: selected.url || null,
                source: "catalog",
                walletType: fieldConfig.walletType || null
              });
              refreshChips();
              clearLookupResults();
              searchInput.value = "";
            });
          });
        })
        .catch((error) => {
          const message = error && error.message ? error.message : "Lookup failed";
          setLookupHint("");
          resultsEl.innerHTML = `<li class="fides-lookup-empty"><span>${escapeHtml(message)}. Try “Add manually”.</span></li>`;
        });
    }

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchResults(query), 250);
    });

    manualBtn.addEventListener("click", () => {
      const label = window.prompt(`Manual ${fieldConfig.label} name`);
      if (!label) return;
      const url = window.prompt("Optional URL");
      linkState[fieldConfig.key].push({
        refId: null,
        labelRaw: label.trim(),
        url: (url || "").trim() || null,
        source: "manual",
        walletType: fieldConfig.walletType || null
      });
      refreshChips();
    });

    chipsEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const indexAttr = target.getAttribute("data-remove-index");
      if (indexAttr == null) return;
      const index = Number(indexAttr);
      linkState[fieldConfig.key].splice(index, 1);
      refreshChips();
    });

    targetRoot.appendChild(wrapper);
  }

  if (organizationsLinkRoot) {
    addLinkField(organizationLinkType, organizationsLinkRoot);
    syncSubmittedByOrganizationSelect();
  }
  linkTypes.forEach((fieldConfig) => addLinkField(fieldConfig, linkFieldsRoot));

  if (mode === "update" && searchInput && lookupResults) {
    showUpdateSelectionUi();
    let debounceTimer = null;

    function setLookupHint(message) {
      if (!lookupHint) return;
      if (!message) {
        lookupHint.hidden = true;
        lookupHint.textContent = "";
        return;
      }
      lookupHint.hidden = false;
      lookupHint.textContent = message;
    }

    function renderLookupOption(item, idx) {
      const title = escapeHtml(item.label || "Unnamed");
      const subtitle = item.subtitle ? escapeHtml(item.subtitle) : "";
      return (
        `<li><button type="button" class="fides-lookup-option" data-result-index="${idx}" ` +
        `aria-label="Select ${title}${subtitle ? `, ${subtitle}` : ""}">` +
        `<span class="fides-lookup-option-main">` +
        `<span class="fides-lookup-option-title">${title}</span>` +
        (subtitle ? `<span class="fides-lookup-option-subtitle">${subtitle}</span>` : "") +
        `</span>` +
        `<span class="fides-lookup-option-action">Select</span>` +
        `</button></li>`
      );
    }

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        lookupResults.innerHTML = "";
        setLookupHint("");
        if (query.length < 2) return;
        if (!apiBase) {
          setLookupHint("Missing API configuration.");
          return;
        }
        const headers = {};
        if (restNonce) headers["X-WP-Nonce"] = restNonce;
        try {
          const response = await fetch(
            `${apiBase}/lookups/usecase?q=${encodeURIComponent(query)}`,
            { credentials: "same-origin", headers }
          );
          const json = await response.json().catch(() => ({}));
          if (!response.ok) {
            setLookupHint(json.message || "Lookup failed.");
            return;
          }
          const items = Array.isArray(json.content) ? json.content : [];
          if (items.length === 0) {
            setLookupHint("No matches. Check the spelling or contact us if the use case is missing.");
            return;
          }
          const total = Number(json.totalMatches) || items.length;
          setLookupHint(total === 1 ? "1 match — click to select" : `${total} matches — click to select`);
          lookupResults.innerHTML = items.map((item, idx) => renderLookupOption(item, idx)).join("");
          lookupResults.querySelectorAll("button[data-result-index]").forEach((btn) => {
            btn.addEventListener("click", () => {
              const idx = Number(btn.getAttribute("data-result-index"));
              const picked = items[idx];
              if (picked) selectUseCase(picked);
            });
          });
        } catch (_err) {
          setLookupHint("Lookup failed due to a network error.");
        }
      }, 250);
    });

    if (changeUseCaseBtn) {
      changeUseCaseBtn.addEventListener("click", (event) => {
        event.preventDefault();
        resetUpdateSelection();
      });
    }

    if (selectedUseCaseId) {
      selectUseCase({ id: selectedUseCaseId, label: selectedUseCaseId });
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setMessage("", "");
    const getInput = (name) => form.querySelector(`[name="${name}"]`);
    const getValue = (name) => {
      const input = getInput(name);
      return input && "value" in input ? String(input.value || "").trim() : "";
    };
    const getRadioValue = (name) => {
      const input = form.querySelector(`input[name="${name}"]:checked`);
      return input ? String(input.value || "").trim() : "";
    };
    const isChecked = (name) => {
      const input = getInput(name);
      return Boolean(input && "checked" in input && input.checked);
    };

    const sector = getValue("sector");
    if (!sector) {
      setMessage("Select a sector.", "error");
      return;
    }
    if (!contactEmail) {
      setMessage("Your WordPress profile must have a valid email address before submitting.", "error");
      return;
    }
    if (mode === "update" && !selectedUseCaseId) {
      setMessage("Select a published use case before submitting an update proposal.", "error");
      return;
    }

    const organizationName = getValue("organizationName");
    if (involvedOrganizationLabels().length === 0) {
      setMessage("Add at least one involved organization before selecting who is submitting.", "error");
      return;
    }
    if (!organizationName) {
      setMessage("Select the organization submitting this use case.", "error");
      return;
    }
    const productionDeployment = getRadioValue("productionDeployment");
    if (!productionDeployment) {
      setMessage("Select whether this use case is deployed in production.", "error");
      return;
    }
    if (mode === "update") {
      const country = getValue("country");
      if (!country) {
        setMessage("Select a country.", "error");
        return;
      }
    }

    const payload = {
      sector,
      interactionModes: getCheckedValues("interactionModes"),
      vcFormats: getCheckedValues("vcFormats"),
      issuanceProtocols: getCheckedValues("issuanceProtocols"),
      presentationProtocols: getCheckedValues("presentationProtocols"),
      interopProfiles: getCheckedValues("interopProfiles"),
      title: getValue("title"),
      summary: getValue("summary"),
      organizationName: getValue("organizationName"),
      productionDeployment: productionDeployment,
      imageUrls: collectMediaUrls(imageRowsState),
      videoUrls: collectMediaUrls(videoRowsState),
      imageUrl: collectMediaUrls(imageRowsState)[0] || "",
      videoUrl: collectMediaUrls(videoRowsState)[0] || "",
      moreInfoUrl: getValue("moreInfoUrl"),
      userJourney: getValue("userJourney"),
      tags: getValue("tags")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      consentPublish: isChecked("consentPublish"),
      links: linkState
    };
    if (mode === "update") {
      payload.country = getValue("country").toUpperCase();
    }

    if (!apiBase) {
      setMessage("Missing API configuration.", "error");
      return;
    }

    try {
      const headers = { "Content-Type": "application/json" };
      if (restNonce) {
        headers["X-WP-Nonce"] = restNonce;
      }
      const submitUrl =
        mode === "update" ? submissionItemUrl(selectedUseCaseId) : `${apiBase}/submissions`;
      if (!submitUrl) {
        setMessage("Missing API configuration.", "error");
        return;
      }
      const response = await fetch(submitUrl, {
        method: "POST",
        credentials: "same-origin",
        headers,
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(json.message || "Submission failed.", "error");
        return;
      }
      const ref = json.id || (mode === "update" ? selectedUseCaseId : "") || "";
      setMessage(
        mode === "update"
          ? `Update proposal received${ref ? ` for ${ref}` : ""}. It will be reviewed before publication.`
          : `Submission received${ref ? ` (${ref})` : ""}. It will be reviewed before publication.`,
        "success"
      );
      if (mode === "update") {
        selectedUseCaseId = "";
        selectedUseCaseLabel = "";
        if (searchInput) searchInput.value = "";
        if (lookupResults) lookupResults.innerHTML = "";
        if (lookupHint) {
          lookupHint.hidden = true;
          lookupHint.textContent = "";
        }
        fillForm({});
        revealFields(false);
        showUpdateSelectionUi();
        return;
      }
      form.reset();
      resetMediaRows();
      Object.keys(linkState).forEach((key) => {
        linkState[key] = [];
      });
      root.querySelectorAll(".fides-chip-list").forEach((el) => {
        el.innerHTML = "";
      });
      root.querySelectorAll(".fides-lookup-results").forEach((el) => {
        el.innerHTML = "";
      });
      root.querySelectorAll(".fides-lookup-hint").forEach((el) => {
        el.hidden = true;
      });
    } catch (_err) {
      setMessage("Submission failed due to a network error.", "error");
    }
  });

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
        console.warn("Use case form vocabulary load failed (first):", e.message);
      }
    }
    if (second) {
      try {
        return await tryLoad(second);
      } catch (e) {
        console.warn("Use case form vocabulary load failed (second):", e.message);
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

  function formChoiceLabelText(label) {
    const span = label.querySelector("span");
    return span ? span.textContent.trim() : label.textContent.trim();
  }

  function taxonomyOptionLabel(fieldKey, value) {
    const map = taxonomy[fieldKey];
    return map && map[value] ? String(map[value]) : value;
  }

  function resolveFormOptionVocabKey(fieldKey, slug) {
    const groupMap = FORM_OPTION_TO_VOCAB[fieldKey];
    if (groupMap && groupMap[slug]) {
      return groupMap[slug];
    }
    return slug;
  }

  function showFormVocabularyPopup(button, groupEl, fieldKey, vocabKey) {
    hideVocabularyPopup();
    if (!vocabulary) return;
    const groupTerm = vocabulary[vocabKey];
    const labelEl = groupEl.querySelector(".fides-form-label-with-info label, label");
    const categoryName = labelEl ? labelEl.textContent.replace(/\s*\*$/, "").trim() : "";
    let html = "";
    if (categoryName) {
      html += '<p class="fides-vocab-popup-title"><strong>' + escapeHtml(categoryName) + "</strong></p>";
    }
    if (groupTerm && groupTerm.description) {
      html += '<p class="fides-vocab-popup-intro">' + escapeHtml(groupTerm.description) + "</p>";
    }
    const choicesEl = groupEl.querySelector(".fides-form-choices");
    if (choicesEl) {
      const labels = choicesEl.querySelectorAll("label.fides-form-choice");
      if (labels.length > 0) {
        const listItems = [];
        labels.forEach((label) => {
          const input = label.querySelector("input");
          const value = input ? String(input.value || "").trim() : "";
          let labelText = formChoiceLabelText(label);
          if (!labelText || labelText === value) {
            labelText = taxonomyOptionLabel(fieldKey, value);
          }
          const optionVocabKey = resolveFormOptionVocabKey(fieldKey, value);
          const term = optionVocabKey ? vocabulary[optionVocabKey] : null;
          const desc = term && term.description ? escapeHtml(term.description) : "";
          if (desc) {
            listItems.push({ labelText, desc });
          }
        });
        if (listItems.length > 0) {
          html += '<ul class="fides-vocab-popup-list">';
          listItems.forEach((item) => {
            html += "<li><strong>" + escapeHtml(item.labelText) + "</strong>: " + item.desc + "</li>";
          });
          html += "</ul>";
        }
      }
    }
    if (!html) html = "<p>No description available.</p>";

    const popup = document.createElement("div");
    popup.className = "fides-vocab-popup";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-label", "Field explanation");
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

  function initFormVocabularyInfo(containerEl) {
    if (!vocabulary) return;
    hideVocabularyPopup();
    containerEl.querySelectorAll(".fides-vocab-info").forEach((btn) => btn.remove());
    containerEl.querySelectorAll(".fides-taxonomy-field[data-multi-field]").forEach((groupEl) => {
      const fieldKey = groupEl.getAttribute("data-multi-field") || "";
      const vocabKey = FORM_FIELD_TO_VOCAB[fieldKey] || fieldKey;
      if (!vocabulary[vocabKey]) return;
      const labelEl = groupEl.querySelector(":scope > label");
      if (!labelEl) return;

      const infoBtn = document.createElement("button");
      infoBtn.type = "button";
      infoBtn.className = "fides-vocab-info";
      infoBtn.dataset.group = vocabKey;
      infoBtn.setAttribute("aria-label", "Show help for this field");
      infoBtn.setAttribute("title", "Show help");
      infoBtn.textContent = "i";
      infoBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        showFormVocabularyPopup(e.currentTarget, groupEl, fieldKey, vocabKey);
      });

      const parent = labelEl.parentNode;
      if (parent && parent.classList && parent.classList.contains("fides-form-label-with-info")) {
        parent.appendChild(infoBtn);
        return;
      }
      const wrapper = document.createElement("div");
      wrapper.className = "fides-form-label-with-info";
      parent.insertBefore(wrapper, labelEl);
      wrapper.appendChild(labelEl);
      wrapper.appendChild(infoBtn);
    });
  }

  if (VOCABULARY_URL || VOCABULARY_FALLBACK_URL) {
    loadVocabulary(VOCABULARY_URL, VOCABULARY_FALLBACK_URL)
      .then((terms) => {
        vocabulary = terms;
        if (vocabulary) initFormVocabularyInfo(root);
      })
      .catch(() => {});
  }
})();
