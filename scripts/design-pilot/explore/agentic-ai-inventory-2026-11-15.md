# Agentic AI inventory for Themes (2026-11-15)

Read-only. Script: `tests/explore-agentic-ai-inventory.php` (`pilot_wp eval-file`, JSON in `tests/output/explore-agentic-ai-inventory.json`, not committed). No bundle was created and nothing was changed in the data. Local pilot data: 101 use cases, 118 credential types, 826 organisations, 75 issuers, 102 relying parties, 134 wallets.

## What is classified (existing identifiers only)

| Catalog | Classified as `agentic_ai` | How |
|---|---|---|
| Credential types | **7** | `themes` contains `agentic_ai`: Closed / Open Checkout Mandate and Closed / Open Payment Mandate (FIDO Alliance, also `payments`), ECS Service Credential and ECS User Agent Credential (Verana Council, `agentic_ai` only), Power Of Representation (European Commission, five themes and all 14 sectors, so generic) |
| Use cases | **4** | `use-case-theme-map.json` assignments contain `agentic_ai`: Smart Government Applications Powered by Digital Wallets, Vesta Appliances (impostors to Proof-of-Trust), Spherity's Trusted AI, Preventing SIM Swap Fraud with EUDI Wallets and AI Voice Agents. Two are in production, two not. All four also carry another theme (organizational identity, person identity, ...) |
| Organisations | none own | organisations have a sector but no theme. Through the four use cases: 10 organisations (all with a catalog page) |
| Issuers | none own | through the 7 credential types: 11 issuers (7 are Verana Playground demo issuers; four are real issuers because of Power Of Representation or the FIDES mandate credentials) |
| Relying parties | none own | through the 7 credential types: 3 (EUDI Test Relying Party, two Mandate relying parties; not checked per record which of the seven types they accept) |
| Wallets | none own | through the four use cases: 16 wallets (all with a catalog page). Wallets carry no sector or theme |

Theme code `agentic_ai` has **no bundle**: the pages offer six bundles and never show it (`catalog-links-inventory-2026-11-15.md`, gap 8).

## Indication from text (NOT a classification; never used by the pages)

Counting the words "agent(s)", "agentic", "AI", "LLM", "MCP" in name, tags and summary gives: 13 of 101 use cases (four are the classified ones; e.g. ARIA, Agent Checkpoint: Verified Delegation for AI Agents, Seal, Hologram and Trusted Caller Identity are not assigned), 5 of 118 credential types, 12 of 826 organisations (for example 2060.io, Aqta, TrustLayer Foundation, Finema), 2 of 134 wallets (Hovi Business Wallet, Wallet4Agent), none of the issuers and relying parties. Word matches also catch unrelated words, so these numbers only show how much the classification may be missing.

## Assessment

- **Core is thin but real.** Four use cases, seven credential types (five with a clear agent or mandate meaning), a handful of wallets and organisations. Two use cases in production.
- **Classification lags the content.** Up to nine more use cases mention agents or AI in their text but carry no `agentic_ai` assignment (word matches, not verified one by one). A bundle built today would look smaller than the topic is.
- **Issuers and relying parties would be misleading.** The derived issuer results come from one generic credential type (Power Of Representation, all sectors, five themes) and from demo issuers of a single playground; the relying party result is only three records.
- **Organisations and wallets only through use cases**, which is fine as secondary context but not a classification.
- **Advice:** a stand-alone "Agentic AI" bundle is sensible later, not yet. Before building: (1) an editorial pass that assigns `agentic_ai` to the use cases that clearly are about agents (data change owned by the use case catalog, not here), (2) decide whether Power Of Representation counts (it would put the theme on every credential block), (3) show a bundle with use cases and credential types only, with "Showing N of M" and no view-all for issuers, relying parties and wallets until they have their own classification. With the current data the theme can stay a hidden catalog code; the use cases keep appearing under Identity & Access, Business & Mandates and Payments & Commerce through their other themes.
