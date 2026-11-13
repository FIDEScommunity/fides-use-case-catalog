# Around the world: record status check (13 November 2026)

Scope: the use-case records behind the practice cards on the India, Canada, United States, Honduras and Ethiopia pages,
plus the wallet records that are mentioned next to them. Checked on 13 November 2026 against the primary sources listed
per record. **No record was changed in this task.** No primary source confirmed a different value, so the rule "change a
status only if a primary source confirms it" leaves every field as it is. Open differences and who can confirm them are
listed at the end.

## Supported values

| Record type | Field | Supported values | Shown as |
| --- | --- | --- | --- |
| Use case | `productionDeployment` | `yes`, `no`, empty | Design: "In production" / "Not in production". Old catalog UI: "Yes" / "No". Learn card sentence: "marks this use case as in production, as reported by the organisation". |
| Wallet | `status` | `development`, `beta`, `production`, `deprecated` | "In Development", "Beta", "Production", "Deprecated" |

A use case has one yes/no flag for the whole use case. There is no value for "pilot", "test", "planned" or "partly live".
That is why the cards add a caveat in the text when a source describes only part of the use case as live.

Where the files live: all six use-case records are in `community-catalogs/<organisation>/use-case-catalog.json` with
`"source": "wordpress"`. They are materialised by the crawler from the WordPress export, and the organisations also edit
them by pull request. A status correction should therefore come from the owning organisation, through the WordPress
update form or a pull request. None of the records has a `lastUpdated` value, so a local edit would not need a date bump
anyway, but none was made.

## Use-case records

### 1. FaydaPass

- Record id: `faydapass-rP7gpJ`
- File: `community-catalogs/national-id-program/use-case-catalog.json`
- Field: `productionDeployment`
- Current value: `yes` (shown as "In production")

| Component | What the sources say | Source |
| --- | --- | --- |
| FaydaPass wallet app | A FaydaPass app is listed on Google Play under the publisher National ID Program (checked 13 November 2026). | Google Play listing |
| FaydaPass as a digital credential wallet | The programme's authentication page says it is "working on" a digital credential wallet called FaydaPass. | id.gov.et authentication page |
| Credentials issued into it by other bodies | No source found that names these bodies or says they issue today. | none |

Conclusion: the sources disagree about whether FaydaPass is already in use. The app listing points to "available", the
programme page points to "in progress". Value left at `yes`. The card text already says what the programme page says and
tells the reader to check the programme.
Action: the National ID Program (record owner) confirms which description is current and, if needed, changes the field
and the summary.

### 2. Neoflow

- Record id: `neoflow-digital-energy-passport-for-cross-border-crude-oil-clearance-RZDhoP`
- File: `community-catalogs/neoflow-mavennet-inc/use-case-catalog.json`
- Field: `productionDeployment`
- Current value: `yes`

| Component | What the sources say | Source |
| --- | --- | --- |
| Neoflow platform used by a private company | The Federal Register notice names Neoflow as a private-sector participant in the DHS SVIP programme and says the CBP test uses the Neoflow platform. | Federal Register notice of 2 June 2026 |
| CBP customs test | A one-year test, planned to begin on 2 July 2026, with possible extension, change or early end. | Same notice |
| Routine commercial operation of the passport | No source found. | none |

Conclusion: the notice supports a government test that uses Neoflow. It does not show routine production use, and it
does not contradict it. Value left at `yes`. The card says the notice describes the customs programme as a one-year test,
and the Canada page says the page has not checked whether the test started or changed.
Action: Neoflow (Mavennet Inc.) confirms whether the passport is in routine operation or only in the CBP test; CBP can
confirm the test status.

### 3. California mDL (use case)

- Record id: `the-california-mdl-and-its-growing-use-and-ecosystem-of-stakeholders-YWJK3u`
- File: `community-catalogs/california-dmv/use-case-catalog.json`
- Field: `productionDeployment`
- Current value: `yes`

| Component | What the sources say | Source |
| --- | --- | --- |
| California mDL in the CA DMV Wallet and in phone wallets | Available to the public as a free, optional app. | California DMV mobile driver's licence page |
| Acceptance at TSA checkpoints | California is on the TSA list of states and wallets. | TSA mobile driver's licence page |

Conclusion: confirmed. No change.

### 4. TSA mobile driver's licence

- Record id: `secure-domestic-travel-tsa-mobile-drivers-license-at-airport-checkpoints-IyxXZl`
- File: `community-catalogs/transportation-security-administration-tsa/use-case-catalog.json`
- Field: `productionDeployment`
- Current value: `yes`

The TSA page lists the accepted states and wallets, with checkpoints in operation. Confirmed. No change. The Learn pages
say that the list changes and name the Utah and West Virginia end dates.

### 5. BIEN (Honduras)

- Record id: `honduras-billetera-electronica-nacional-bien-4-gob-authorities-issuing-into-one-citizen-controlled-wallet-YVNSXc`
- File: `community-catalogs/tech5/use-case-catalog.json` (submitted by TECH5, not by the Honduran government)
- Field: `productionDeployment`
- Current value: `yes`

| Component | What the sources say | Source |
| --- | --- | --- |
| BIEN wallet | DIGER describes BIEN as available ("ya disponible"), for Android and iOS. | DIGER BIEN pages |
| Credentials from RNP, the transport authority and the police | Named by DIGER as issued into the wallet. | DIGER BIEN pages |
| Residence card from INM | The overview page presents INM as an identity provider. The FAQ says this card is still to come ("próximamente"). The two DIGER pages disagree. | DIGER BIEN pages |
| Fourth issuer in the record | The record names "DPI/National Police". DIGER names a vehicle-related issuer that the record does not list. | DIGER BIEN pages |

Conclusion: the wallet and most credentials are supported as available. The INM part is not confirmed. The yes/no flag
cannot express that, so it stays at `yes`. The card says what DIGER says (available, and the issuers it names). The
record's summary and user journey list INM and the issuers differently from DIGER.
Action: TECH5 (submitter) corrects the issuer list in the summary, or DIGER confirms the INM status. This is a text
change for the owner, not a status change.

### 6. Swiggy and the Aadhaar App

- Record id: `delivery-agent-and-customer-identity-verification-using-the-aadhaar-app-p0mDau`
- File: `community-catalogs/unique-identification-authority-of-india/use-case-catalog.json` (submitted by UIDAI)
- Field: `productionDeployment`
- Current value: `yes`

| Component | What the sources say | Source |
| --- | --- | --- |
| Aadhaar App | In use. UIDAI describes verification of gig workers and service partners as one of its use cases. | UIDAI press release on the new Aadhaar App, UIDAI OVSE playbook |
| Registration of organisations that verify | Any organisation can register as an offline verification seeking entity (OVSE). | UIDAI OVSE pages and FAQ |
| Swiggy as a verifier, delivery agents verified through the app | No UIDAI source names Swiggy or this flow. UIDAI's onboarding material describes OTP or biometric authentication for delivery partners, which is a different method. | none found |

Conclusion: the Aadhaar App and the use case type are supported. Swiggy's use is not confirmed by a source found. Value
left at `yes`. The card now says the sources consulted do not confirm how Swiggy uses the app.
Action: UIDAI (record owner) provides a source naming Swiggy, or adjusts the record.

## Wallet records mentioned next to the cards

| Wallet id | File (repo `wallet-catalog`) | Current `status` | What the source says | Conclusion |
| --- | --- | --- | --- | --- |
| `ca-dmv-wallet` | `community-catalogs/CA/wallet-catalog.json` | `beta` (description says "mDL pilot") | The DMV describes the app as a free, optional app that is available to the public. It does not use "beta" or "pilot". | Unresolved. The source does not say "production" in these words either, so no change was made. Proposed value: `production`, plus removal of "pilot" from the description. The record is GitHub-only (no WordPress marker). California DMV or the wallet catalog maintainers confirm. |
| `bien` | `community-catalogs/honduras/wallet-catalog.json` | `production` | DIGER: available. | Consistent. |
| `aadhaar` | `community-catalogs/uidai/wallet-catalog.json` | `production` | UIDAI: app in use, with a published download count. | Consistent. WordPress-managed (`managedWallets`), so any change goes through the owner. |
| `fayda-id` | `community-catalogs/ethiopia/wallet-catalog.json` | `production` | This is the Fayda ID wallet, not FaydaPass. No source found that contradicts it. | Not checked in depth, outside the FaydaPass question. No wallet record exists for FaydaPass. |

The `wallet-catalog` repository is separate from this one and was not touched.

## Open differences and who confirms them

| # | Difference | Who confirms |
| --- | --- | --- |
| 1 | FaydaPass: app listed, programme page says "working on" | National ID Program |
| 2 | Neoflow: production flag versus a one-year CBP test | Neoflow (Mavennet Inc.), CBP |
| 3 | BIEN: INM credential and the issuer list in the record text | TECH5, DIGER |
| 4 | Swiggy: no source naming Swiggy | UIDAI |
| 5 | California DMV wallet record: `beta` / "pilot" versus an available app | California DMV, wallet catalog maintainers |
