# Glossary proposals (for the glossary source owners)

The Learn pages read definitions from the glossary data (`fides-vocabulary-glossary/data/glossary-aggregated.json`).
That file is a bundled copy of the community glossary (`glossary-aggregated.json` in the `fides-interop-profiles`
repository; the plugin option `fides_vocabulary_glossary_github_data_url` can point to it). The pilot copy has no git
history and is not edited here, so the pilot never shows a definition the source does not contain. The Learn filter
`fides_learn_vocabulary` exists but is not used for overrides.

## Verifiable Credential Type (alias `vct`)

Current text:

> A string identifier (vct) in SD-JWT VC metadata that names the credential type and links to its schema, commonly used in EU and EWC attestation catalogs.

Problem: the entry is named "Verifiable Credential Type" but only describes the SD-JWT VC `vct` identifier. A reader
who opens "credential type" gets a format-specific definition for a general idea.

Proposal, option A (two entries):

1. New entry **Credential Type**: "A kind of credential. It describes what information a credential of that type is expected to contain and can point to the specifications or rules that apply. How a type is defined and identified depends on the ecosystem and the format used."
2. Rename the existing entry to **Credential Type Identifier (vct)** and keep its text, with one added sentence at the start: "In SD-JWT VC, the identifier of a credential type." Keep the aliases `vct` and `VCT`.

Proposal, option B (one entry): keep the name and replace the text with: "A kind of credential, describing what information it is expected to contain. In SD-JWT VC, a credential type is identified by a string called vct, which names the type and links to its schema; other formats identify types in other ways. Commonly used in EU and EWC attestation catalogs."

## Credential

No entry exists, so Learn shows "Credential" as plain text and the seed reports `GLOSSARY-MISSING`. Proposal: "Information used to establish something about a person, organisation or other subject. The term does not by itself identify a technical format or a legal status."

## What the Learn pages do meanwhile

- "What is a credential? And what is an attestation?" explains credential types in its own words and links only the `vct` identifier to the glossary, so the popup matches what the text says.
- "Terms in this article" shows whole sentences from the glossary text and a "Full definition" button when more follows.
