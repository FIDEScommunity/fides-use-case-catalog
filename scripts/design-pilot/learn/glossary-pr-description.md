# Proposed pull request: glossary terms for FIDES Learn

Target: `FIDEScommunity/fides-interop-profiles`, branch `main`. Local commit: `bd923fe` (not pushed). This text is a proposal for the description; the commit message is shorter.

## What changes

- `data/vocabulary.json` (version 1.10.1 → 1.11.0, the source of truth):
  - new term **Credential** (id `credential`),
  - new term **Credential Type** (id `credential-type`),
  - **Verifiable Credential Type** keeps its key and id (`verifiable-credential-type`) and the aliases `vct` and `VCT`; it is now displayed as **Credential Type Identifier (vct)** through the `title` field, its text is limited to SD-JWT VC, and the old name is added as an alias,
  - **Mandate**: the sentence "a core European Business Wallet capability" becomes "Mandates are a common topic in business wallet discussions, including the proposed European Business Wallet."
- `data/glossary-aggregated.json`: regenerated with `npm run build:glossary` (353 terms).

## Please review

1. The two new terms and the revised vct and Mandate texts (exact wording and sources are in `learn/glossary-proposals.md` of the design pilot).
2. **16 eIDAS terms that appear in the aggregate for the first time.** They have been in `data/vocabulary.json` since commit `1924200` (2026-08-15) but the committed aggregate was last built on 2026-07-01 (the sync workflow only rebuilds it when a WordPress submission changes something). Publishing the aggregate therefore adds them to the glossary page: Eidas Trust Services, QEAA, QEArch, QERDS, QESeal, QESig, QPres, QPresSig, QPresSeal, QRemSeal, QRemSig, QTimestamp, QVal, QValSeal, QValSig, QWAC.
3. **Three of those collide with existing terms** (same name or alias as an existing long-form term): `qeaa` / `Qualified Electronic Attestation of Attributes` (alias QEAA), `qerds` / `Qualified Electronic Registered Delivery Service` (alias QERDS), `qeseal` / `Qualified Electronic Seal` (alias QESeal). A search for "QEAA" then lists two entries, and anything that resolves a term by alias can match either. The short terms have no source URL. Suggestion for the source owners: turn the short terms into aliases of the long-form entries, or give the short terms a distinguishing name, before or after this merge.

## Not changed

No id, alias or name of an existing term was removed or moved to another term (checked against the previous aggregate). `?term=verifiable-credential-type`, `vct` and `VCT` keep working.

## After the merge

The design pilot and a staging package use the bundled copy of the aggregate (see `staging/glossary-source.json`); update that file and the bundled copy from the merged commit so they stay identical to GitHub `main`.
