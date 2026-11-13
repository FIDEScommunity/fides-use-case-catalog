# Around the world: five country pages, fact check (13 November 2026)

Pages: India, Canada, United States, Honduras, Ethiopia (`learn/content/{india,canada,united-states,honduras,ethiopia}.html`).
Check date: 13 November 2026. Local only. Nothing was invented where a source could not be reached; those claims are marked
**not verified** and the page text avoids stating them.

Result values: **confirmed** (read in the named primary source), **adjusted** (the concept text was changed), **not verified**
(source unreachable or silent; the page does not rely on it).

## Claims

### India

| Claim | Source | Result | Adjustment |
|---|---|---|---|
| UIDAI issues Aadhaar numbers and provides authentication | UIDAI Aadhaar Handbook for Residents | confirmed (via search excerpt; the PDF could not be fetched directly) | none |
| An Aadhaar number is a proof of identity, not of citizenship or domicile | UIDAI Handbook / clarifications | confirmed | stated as "UIDAI states" |
| Aadhaar is not in itself a proof of date of birth | UIDAI clarification on date of birth | confirmed | the concept labelled this file "clarification on the role of Aadhaar"; the file is about date of birth, label corrected |
| The handbook is a "2026" edition | Handbook PDF text shows "2021-Ver.2.0" | adjusted | year dropped from the source label (the file name still contains 2026) |
| The Aadhaar App lets the holder share verifiable credentials in full or in part, with consent, for offline verification | UIDAI Aadhaar App FAQ | confirmed | worded "According to UIDAI" |
| Swiggy uses the Aadhaar App for delivery agent and customer checks | FIDES record only; no UIDAI or Swiggy page names it | **not verified** | the page says the sources consulted do not confirm how the platform uses the Aadhaar App; the record is a submitted example |

### Canada

| Claim | Source | Result | Adjustment |
|---|---|---|---|
| CDS builds CanadaLogin and GC Issue and Verify; use is optional; features to be tested in the coming months | Government of Canada, Trusted access to digital services | confirmed | described as plans (future tense in the source) |
| GC Issue and Verify is meant for credentials such as work permits and boating licences | same page | confirmed | none |
| BC Wallet stores digital credentials; the Lawyer Credential comes from the Law Society of BC | BC Wallet page; BC digital trust documentation | confirmed | the concept's BC "credentials" URL returns 404; replaced by the BC DevHub Legal Professional governance page |
| The Lawyer Credential has been available to practising lawyers since 15 January 2025 | BC DevHub governance page | confirmed | added to the page |
| BC is adding BC Wallet functionality to the BC Services Card app | BC Wallet page, last updated 26 October 2026 | confirmed | added with the update date |
| CBP will run a pipeline crude oil test; start 2 July 2026; one year, subject to extension, modification or early termination | Federal Register notice 2026-10979 (2 June 2026) | confirmed | "one year" added; the concept said only "pilot" |
| Neoflow use case is in production | FIDES record (`productionDeployment: yes`) versus CBP "test" | **discrepancy** | see "Status discrepancies" |

### United States

| Claim | Source | Result | Adjustment |
|---|---|---|---|
| A mobile driving licence is a digital driving licence presented from a phone; states and territories issue it; several standards bodies are involved | NIST blog of 17 December 2025 | confirmed | article date shown on the page |
| TSA accepts participating mobile licences at some airports; travellers should still carry a physical ID | TSA, Participating States and Eligible Digital IDs | confirmed | none |
| Utah ends acceptance from 1 January 2027; West Virginia from 4 May 2027 | same TSA page | confirmed | added; it shows acceptance can end |
| TSA covers "250+ checkpoints" while the record lists 271 airports | TSA page versus record | differs | page makes no count claim |
| ISO/IEC 18013-5 and AAMVA guidance | NIST article mentions standards bodies generally | partly | the page names no standard by number; it follows NIST ("several standards organisations") |
| California DMV lists age-restricted retail purchases among the uses of its mobile licence in the CA DMV Wallet | California DMV, California mDL | confirmed | none |
| The wallet-catalog status of the CA DMV Wallet ("beta" / "pilot") differs from the California use case ("in production") | wallet and use case records | observation | the page makes no wallet status claim |

### Honduras

| Claim | Source | Result | Adjustment |
|---|---|---|---|
| BIEN is the official mobile app of DIGER for a digital identity credential; Android and iOS | DIGER, identidad digital | confirmed (WebFetch; curl gets a Cloudflare 403) | none |
| Credentials listed: biometric national ID (RNP), driving licence (DNVT), firearms carry permit (Policía Nacional), vehicle inspection slip (Instituto de la Propiedad) | DIGER overview | confirmed | issuers named as DIGER names them |
| The residence card (INM) | DIGER FAQ says "will be added later"; the overview lists it | **inconsistent in the source** | both statements reported on the page |
| The record's issuing authorities | FIDES record versus DIGER | differs | the page says the list differs in places |
| Legal acceptance of digital credentials | no primary source consulted | **not verified** | the page states nothing about it |

### Ethiopia

| Claim | Source | Result | Adjustment |
|---|---|---|---|
| Fayda is a foundational digital identity programme; Fayda Identification Number after registration | id.gov.et/about | confirmed | none |
| Forms of Fayda ID: eFayda paper form, digital copy in the National ID mini app in telebirr, physical card on request | id.gov.et/credentials | confirmed | none |
| Offline verification by QR code; online eKYC by OTP, selfie or fingerprint | id.gov.et/authentication | confirmed | none |
| FaydaPass | id.gov.et/authentication: "working on" a digital credential wallet | confirmed as work in progress | no production claim |
| An app named FaydaPass exists in Google Play, published by the National ID Program | Google Play listing | confirmed | the page notes the programme's information is not consistent; it names no credentials or institutions |

## Status discrepancies (records not changed)

- **FaydaPass (`faydapass-rP7gpJ`)**: the record says `productionDeployment: yes` in the National ID Program catalog file
  (`community-catalogs/national-id-program/use-case-catalog.json`), while the programme's authentication page calls the
  wallet work in progress. The discrepancy comes **from the record field**, not from the display: the card generates "in
  production, as reported by the organisation" from that field. The record and status were not changed. The Ethiopia page uses a
  custom card text (`[fides_learn_record]`) that adds the programme's statement, and makes no production claim itself.
- **Neoflow (`neoflow-digital-energy-passport-for-cross-border-crude-oil-clearance-RZDhoP`)**: record "yes" versus a CBP one-year
  test. Same handling: custom card text with the CBP statement.
- **Swiggy, TSA, California, BIEN**: the record says "yes". The cards use the standard sentence (organisation + "as reported
  by the organisation"). No primary source contradicts TSA or California acceptance; the Swiggy and BIEN deployments
  could not be confirmed. These are the best available records for the country; no alternative without a discrepancy exists in
  the catalog for India or Honduras.

## Sources that could not be reached from here

- UIDAI PDFs (handbook, date-of-birth clarification): timeout; content read through search excerpts.
- DIGER: Cloudflare challenge for curl; read via WebFetch.
- `www.id.gov.et`: timeout with curl; `id.gov.et` and WebFetch worked for part of the pages.
- The browser test reports these external links as warnings (`not verifiable from here`), not failures.

## Deviations from the concept (old to new)

- India: UIDAI file labels corrected (see above); added the Aadhaar-not-citizenship statement and a sentence that the sources do
  not confirm the Swiggy process.
- Canada: BC "credentials" URL (404) replaced; federal items described as plans; Lawyer Credential date, BC Services Card note
  and the one-year CBP test added.
- United States: Utah and West Virginia end-of-acceptance dates added; two cards instead of one.
- Honduras: INM inconsistency stated; no legal-acceptance claim.
- Ethiopia: no FaydaPass production claim; status stated as inconsistent in the published information.
- Learn more: two links per page. The existing four-link pages were not extended; only "Credential formats and
  interoperability" went from three to four (link to the United States page).

## Before staging

Re-check: Utah and West Virginia dates, the CBP test period, BC Wallet and BC Services Card app status, the DIGER credential
list (INM), the FaydaPass status, and the Swiggy and BIEN record status.
