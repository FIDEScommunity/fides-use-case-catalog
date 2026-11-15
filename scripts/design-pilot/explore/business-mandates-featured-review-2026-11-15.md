# Business & Mandates: featured examples review (15 November 2026)

Local design pilot only. Nothing here was sent or published. No source record was changed.

## What was found

`theme:business_authority` matches 25 published use cases. The first two cards were Hypersign KYB and Mandator.

- **Hypersign KYB** (`reusable-kyb-due-digital-due-diligence-for-financial-transactions-E06Xyi`, Hypermine, in production): the summary opens with BoostN and the Bavarian Ice Hockey League; the KYB message only starts in the second paragraph. The card shows the first lines, so a visitor reads a story about fundraising before learning what the theme is about.
- **Mandator** (`mandator-public-procurement-portal-0aYOCh`, Authbound): about "can this person bind that company?" (power of attorney, qualified eSeal), which is exactly the "mandates" half of the theme. But the summary calls it "a fictional EU public procurement portal" while the record says `productionDeployment: yes` (badge "In production"). Both cannot be true.

## Alternatives in the same data

| Use case | Production | Image | Why it helps / limits |
|---|---|---|---|
| Business Wallet-Based KYB & Financial Onboarding (Hovi) | no | yes | First sentence is the scenario: a company representative opens a business bank account using EU Business Wallet credentials. States who issues (national business registers), who holds (the company through a representative), who verifies (the bank) and that a mandate proves authority to act. Clearest explanation of business identity plus authority. |
| From Document Trust to Digital Trust (Melento) | yes | no (name fallback) | Starts with the problem (PDFs and manual KYC for counterparty identity) and the solution. Production example with signatories and counterparties. |
| Green Lane Verified (KVK) | no | yes | Real authority-run route (company registration); "Pre-pilot fase" in the text. Good, but pre-pilot. |
| Credenid KYB, End-to-End Business Workflows (Bosch) | no | yes | Valid, narrower or more technical openings. |

## Decision (featured order, `data/explore-featured-use-cases.json`)

1. Business Wallet-Based KYB & Financial Onboarding (Hovi): opens with the scenario and covers business identity and authority to act. Shown with the honest badge "Not in production".
2. From Document Trust to Digital Trust (Melento): production, problem first.
3. Hypersign KYB: production, still relevant, no longer the first thing a visitor reads.
4. Mandator: kept because it is the only explicit "mandates" example, but last until the status question is answered.

inGo (subcontractor management, anchored in construction) dropped out of the four; it still matches the theme and follows the default order. Card text, images and badges still come from the records; the ordering file is the only change.

## Open data questions

1. **Mandator status**: record says in production, text says fictional. Same pattern in the other Authbound showcase records: of 15 records, 5 have `productionDeployment: yes` (Mandator, Nordhaus, ApteekPlus, Roamline, Aurora Bet) and all 15 describe a fictional organisation built for demo purposes ("We built it for demo purposes only", PulsePay). The record owner should confirm the field. Source of truth: `community-catalogs/authbound/use-case-catalog.json` has `"source": "wordpress"`, so a change belongs in the WordPress update form of the owner (a GitHub edit is overwritten by the next sync).
2. **Hypersign KYB opening**: the owner (Hypermine) may want to start the description with the KYB problem and move the BoostN story down. Not changed here.
3. Whether the pilot should ever show a "demo / fictional" label: the data has no such field, so none is shown (no inference).

## Message to the record owner (copy-paste, not sent)

> Subject: Please check the production status of the Mandator record in the FIDES use case catalog
>
> Hello Authbound team,
>
> The use case "Mandator: Public procurement portal" (https://authbound.io/showcase/mandator, catalog id `mandator-public-procurement-portal-0aYOCh`, last updated 2026-08-15) is published with "Production deployment: yes", so the catalog shows the badge "In production". The description, however, starts with "Mandator is a fictional EU public procurement portal", and your showcase page presents it as a demo.
>
> Could you check which one is right? If Mandator is a demonstration, please set "Production deployment" to "no" in the update form (the same may apply to Nordhaus, ApteekPlus, Roamline and Aurora Bet, which are also marked "yes" while their descriptions say "fictional"). If any of them runs in production, a sentence in the description saying so would prevent confusion.
>
> Visitors compare these badges on the Explore pages, so a consistent status helps them. Thank you.
>
> Kind regards,
> FIDES Community team
