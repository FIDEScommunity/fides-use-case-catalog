> **Status:** merged as glossary 1.12.0 (PR #4, `b27bc88`, 344 terms). The pilot is pinned to it in `staging/glossary-source.json`.

# Proposed pull request: glossary terms for FIDES Learn

Target: `FIDEScommunity/fides-interop-profiles`, branch `main`. Historic: local commit `bd923fe` (merged as part of 1.12.0, PR #4; 1.12.1 followed in PR #5). This text is a proposal for the description; the commit message is shorter.

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
3. **Three of those collided with existing terms** (`qeaa`, `qerds`, `qeseal`). Resolved in the same PR: `QEAA` and `QERDS` carry `duplicateOf` and are listed once (aliases of the long terms); `QESeal` is a certificate and has its own title; the alias `QESeal` left the seal term. The other short terms got descriptive titles and a source URL. See `learn/glossary-proposals.md`.

## Not changed

No id, alias or name of an existing term was removed or moved to another term (checked against the previous aggregate). `?term=verifiable-credential-type`, `vct` and `VCT` keep working.

## After the merge

The design pilot and a staging package use the bundled copy of the aggregate (see `staging/glossary-source.json`); update that file and the bundled copy from the merged commit so they stay identical to GitHub `main`.

## Rollout route (for the source maintainer; nothing here is done by the pilot)

Live finding (2026-11-11 18:35-18:40 UTC, GET only): the glossary page https://fides.community/community-tools/glossary/ shows 335 terms from GitHub `main` `data/glossary-aggregated.json` (version 1.10.1, built 2026-07-01); the 16 eIDAS terms are missing there (search "QESig" gives nothing), and there is no QEAA card. The catalog popups (e.g. https://fides.community/ecosystem-explorer/organizational-wallets/) read `data/vocabulary.json` from `main` (351 terms) and show the short definitions ("Qualified electronic seal certificate"). Search for "QESeal" on the glossary shows "Qualified Electronic Seal", the popup shows the certificate: same word, different definitions. Eight other duplicate pairs (gaia-x/gaia-x-2, sd-jwt-vc/-2, ISO 18013-5/-7, UN/CEFACT, VCDM 2.0, EUDI Wallet, ISO mDL) are live today.

1. Open a PR in `FIDEScommunity/fides-interop-profiles` from the three local commits (`bd923fe`, `0b63c68`, `aa84e8b`); review the texts; CI runs `npm run check:glossary` (new workflow).
2. Merge. `data/glossary-aggregated.json` is committed in the PR, so no extra rebuild is needed. Raw GitHub caches for about 5 minutes.
3. Production: the glossary page reads the GitHub aggregate first (option `fides_vocabulary_glossary_github_data_url`), so no plugin release is needed for the page. Popups read `vocabulary.json` from `main` (immediate after the merge). The plugin's bundled `data/glossary-aggregated.json` and `fides-wallet-catalog/assets/vocabulary.json` (100 terms, v1.0.0) are only fallbacks; refresh them with the next plugin releases. Flush the vocabulary catalog cache (the invalidate hook in `wp-submissions-sync.yml`, or WP transient flush) if the server-side listing is cached.
4. Dependencies: tiles and catalog plugins need no change (popup keys are unchanged). Do not remove the short keys `QEAA`, `QERDS`, ... from `vocabulary.json`.
5. Post-rollout GET checks: aggregate `terms` = 351 and contains no id `qeaa`/`qerds`; glossary page search "QEAA", "QERDS", "QESeal", "QESig" gives one card each; popups for QEAA/QERDS show the long definition; `?term=verifiable-credential-type` and `?term=mandate` still open.
6. Rollback: revert the merge commit on `main` (the old aggregate returns; caches expire in minutes). No data migration is involved.
7. Caveat: `import-wp-vocabulary-submissions.mjs` writes whole term objects for WordPress-managed terms; `duplicateOf` entries are not WordPress-managed, but a WP submission with key `QEAA` would drop the field and `check:glossary` would flag the duplicate.
