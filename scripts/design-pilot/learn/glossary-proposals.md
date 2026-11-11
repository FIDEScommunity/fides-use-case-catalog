# Glossary changes for FIDES Learn

Status: **processed locally in the source repository, not merged or published.** Local commit
`bd923fe` in `/Users/victorvanderhulst/Projects/interop-profiles` (remote `FIDEScommunity/fides-interop-profiles`,
branch `main`). Nothing was pushed. The pilot's bundled glossary plugin copy was synchronised from the generated file.

## Which file leads

| What | Where | Role |
|---|---|---|
| `data/vocabulary.json` | interop-profiles | **Source of truth.** Object keyed by term (`terms["Credential"] = { description, aliases?, url, title? }`), schema `schemas/vocabulary.schema.json`. |
| `scripts/build-glossary-aggregated.mjs` (`npm run build:glossary`) | interop-profiles | Generates the list below. `id` = slug of the key, `name` = `title` or formatted key, `letter` = first letter of `name`. No network, no pushes; it writes two files. |
| `data/glossary-aggregated.json` | interop-profiles | Generated, committed. The glossary page script fetches it from GitHub `main` first. |
| `wordpress-plugin/fides-vocabulary-glossary/data/glossary-aggregated.json` | interop-profiles | Generated copy for the plugin (git-ignored there). |
| `wordpress/wp-content/plugins/fides-vocabulary-glossary/data/glossary-aggregated.json` | design pilot | **Not in git.** Local copy; Learn dialogs and the server-rendered glossary list read it. |
| `wordpress-plugin/fides-interop-matrix/assets/vocabulary.json` | interop-profiles | Separate fallback copy for the interop matrix; already differs from the source and was left alone. |

The committed aggregate was stale (335 terms against 351 in the source), so the rebuild also added the 16 eIDAS trust
service terms that were already in `vocabulary.json` (commit `1924200`). Version of `vocabulary.json`: 1.10.1 → 1.11.0.

## Processed changes (exact values in `data/vocabulary.json`)

1. **Credential** (new, id `credential`): "Information about a subject, such as a person or an organisation, that an issuer provides so the subject can show it to others. The term does not identify a technical format or a legal status." Source: W3C VC Data Model 2.0 (a credential is a set of claims made by an issuer). No aliases, so "attestation" keeps its own EUDI entry.
2. **Credential Type** (new, id `credential-type`): "A kind of credential, such as a diploma or an employee card. It describes what information a credential of that type is expected to contain and can point to the rules or schema that apply. How a type is defined and identified depends on the ecosystem and the format. The EUDI Wallet ecosystem speaks of an attestation type." Source: W3C VCDM 2.0 `type`. No aliases; `vct` does not belong here.
3. **vct** (existing key `Verifiable Credential Type`, id `verifiable-credential-type` unchanged): display name through the `title` field is now **Credential Type Identifier (vct)**; text "In SD-JWT VC, the identifier of a credential type. This string (vct) names the type and can link to its schema. Commonly used in EU and EWC attestation catalogs."; aliases `vct`, `VCT` kept, `Verifiable Credential Type` added (the old name keeps matching in search and in Learn). The key was **not** renamed because the id is derived from it; the `title` field changes only what readers see. Source (IETF SD-JWT VC draft) unchanged.
4. **Mandate** (text only; id, alias `delegation`, url unchanged): the claim "a core European Business Wallet capability" became "A digital authorization that lets one person act on behalf of an organization within defined limits. Mandates are a common topic in business wallet discussions, including the proposed European Business Wallet."

Assessment notes: the three general entries use the same wording as "What is a credential? And what is an attestation?" (credential broad and format-neutral, credential type as a kind, `vct` as the SD-JWT VC identifier only). No definition claims legal status or qualified status. Uncertainty: the Mandate sentence is deliberately vague about what the proposal contains; a legal reviewer may prefer to cite the proposal text. `Credential Format` and `Verifiable Credential` were read and need no change.

## Consumers of the changed terms

- By id or alias (unchanged, still resolve): glossary deep link `?term=verifiable-credential-type`, Learn `[fides_learn_term term="vct"]` (matches key, name or alias), search for `vct`/`VCT`/the old name, glossary page ids.
- Show the new name: glossary page (list and open row), glossary SSR list, Learn dialogs use the link text as title and the new definition as body.
- Search of the workspace found no other consumer: `enrich-vocabulary-urls.mjs` and `docs/vocabulary-opzet.md` use the **key** (unchanged); the credential catalog `aggregated.json` only contains the phrase in an attribute description. Catalog filters (`vocabulary.json` keys) are not affected by the new entries.


- Source order per consumer: glossary page and plugin script GitHub `main` first, bundled file second (the pilot and the review site point the option at the bundled file, see HANDOVER "Glossary data"); Learn the bundled file only; catalog popups `vocabulary.json` from GitHub with a plugin fallback; interop matrix the same with its own copy.

## The 16 eIDAS terms (duplicates resolved in `aa84e8b`)

They were already in `data/vocabulary.json` (commit `1924200`, 2026-08-15); the committed aggregate dated from 2026-07-01 because the sync workflow only rebuilds it for a WordPress submission. Resolution, per concept:

- `QEAA` and `QERDS`: same concept as `Qualified Electronic Attestation of Attributes` and `Qualified Electronic Registered Delivery Service`. They stay in `vocabulary.json` (catalog popups look them up by key) with the new optional field `duplicateOf`, the same description and source URL, and are merged into the long term as aliases (QEAA; QERDS, Q_ERDS). The glossary lists one card each; `?term=qeaa` / `?term=qerds` were never published, so no deep link breaks.
- `QESeal` (`qeseal`) and `QESig` (`qesig`): certificates, not the seal/signature itself. Titles now "Qualified Electronic Seal Certificate" / "Qualified Electronic Signature Certificate"; the alias `QESeal` was removed from "Qualified Electronic Seal" (alias `QSeal` stays).
- QEArch, QPres, QPresSig, QPresSeal, QRemSeal, QRemSig, QTimestamp, QVal, QValSeal, QValSig, QWAC and "eIDAS Trust Services": descriptive titles, the key as alias next to the existing Q_* code, source URL = Regulation (EU) 910/2014 (general reference; the owners may refine per article).
- Same pattern exists live for eight other pairs (gaia-x, sd-jwt-vc, iso18013-5, iso18013-7, uncefact, vcdm20/vcdm_2_0, eudi-wallet, iso-mdl): a filter key and a standard with near-identical meaning. They need an editorial choice and are only listed as known in `scripts/check-glossary-aggregate.mjs`.

Version 1.11.1, 351 terms. Details and rollout route: `learn/glossary-pr-description.md`.
