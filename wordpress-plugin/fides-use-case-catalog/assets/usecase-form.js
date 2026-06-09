(function () {
  const config = window.FIDES_USE_CASE_FORM_CONFIG || {};
  const root = document.getElementById("fides-use-case-form-root");
  if (!root) return;

  const apiBase = String(config.apiBase || "").replace(/\/$/, "");
  const taxonomy = config.taxonomy || {};
  const contactEmail = String(config.contactEmail || "").trim();
  const restNonce = String(config.restNonce || "").trim();

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

  root.innerHTML = `
    <section class="fides-use-case-card">
      <form id="fides-use-case-form" class="fides-use-case-form">
        <section class="fides-form-section fides-form-section-first" aria-labelledby="fides-overview-section-title">
          <div class="fides-form-accordion-heading">
            <h3 id="fides-overview-section-title" class="fides-form-section-title">Use case overview</h3>
            <span class="fides-form-accordion-badge">About 3 minutes</span>
          </div>
          <p class="fides-form-section-intro">Describe the use case, its sector, and who is submitting it.</p>
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
        </section>

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
                <p class="fides-help fides-media-col-help">Landscape images for the catalog (16:7). Upload or paste URLs. The first image is used on the card.</p>
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

        <div class="fides-consent">
          <label><input type="checkbox" name="consentPublish" required /> I confirm this information may be published *</label>
        </div>

        <div class="fides-form-actions">
          <button type="submit">Submit use case</button>
        </div>
        <p id="fides-form-message" class="fides-form-message" aria-live="polite"></p>
      </form>
    </section>
  `;

  const form = root.querySelector("#fides-use-case-form");
  const messageEl = root.querySelector("#fides-form-message");
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
  const submitterSelect = root.querySelector("#fides-organization-name");

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

    if (!apiBase) {
      setMessage("Missing API configuration.", "error");
      return;
    }

    try {
      const headers = { "Content-Type": "application/json" };
      if (restNonce) {
        headers["X-WP-Nonce"] = restNonce;
      }
      const response = await fetch(`${apiBase}/submissions`, {
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
      setMessage(`Submission received. Reference: ${json.id}`, "success");
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
})();
