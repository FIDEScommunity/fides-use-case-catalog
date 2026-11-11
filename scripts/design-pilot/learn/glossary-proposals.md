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

## The 16 eIDAS terms

They were already in `data/vocabulary.json` (commit `1924200`, 2026-08-15); the committed aggregate dated from 2026-07-01, so the rebuild only caught up. They become visible on the glossary page when the aggregate is published: Eidas Trust Services (`eidastrustservices`), QEAA (`qeaa`), QEArch (`qearch`), QERDS (`qerds`), QESeal (`qeseal`), QESig (`qesig`), QPres (`qpres`), QPresSig (`qpressig`), QPresSeal (`qpresseal`), QRemSeal (`qremseal`), QRemSig (`qremsig`), QTimestamp (`qtimestamp`), QVal (`qval`), QValSeal (`qvalseal`), QValSig (`qvalsig`), QWAC (`qwac`). Conflicts: `qeaa`, `qerds` and `qeseal` share a name or alias with the existing long-form terms; no id, alias or name of an existing term moved or disappeared. Details and a suggestion for the owners are in `learn/glossary-pr-description.md`.

## Still open (staging and production)

1. Review and merge commit `bd923fe` in `fides-interop-profiles`; GitHub `main` then feeds the glossary page on every site.
2. Update the glossary plugin copy on staging (and the pilot copy on other machines) with the generated `glossary-aggregated.json`. The pilot copy is **not in git** and is not part of the staging package; copy the file by hand. The previous pilot copy is kept at `tests/output/glossary-aggregated.pilot-before-2026-11-11.json` (not committed).
3. Optional: legal review of the Mandate sentence. The interop matrix fallback `vocabulary.json` is not regenerated by any script and is out of scope.

## What Learn does now

- "What is a credential? And what is an attestation?" links Credential, credential type and the `vct` identifier to their own entries.
- The terms lists on "The big picture" (Credential) and "For businesses" (Mandate) work again; "mandates" is linked again on "Business wallets: where to start". The seed no longer reports `GLOSSARY-MISSING`.
- "Terms in this article" shows whole sentences and a "Full definition" button when more follows.
