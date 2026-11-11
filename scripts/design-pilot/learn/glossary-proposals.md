# Glossary proposals (for the glossary source owners)

The Learn pages read definitions from the glossary data (`fides-vocabulary-glossary/data/glossary-aggregated.json`).
That file is a bundled copy of the community glossary (`data/glossary-aggregated.json` in the `fides-interop-profiles`
repository; the plugin option `fides_vocabulary_glossary_github_data_url` can point to it). The pilot copy has no git
history and is not edited here, so the pilot never shows a definition the source does not contain. The Learn filter
`fides_learn_vocabulary` exists but is not used for overrides. Nothing below has been applied to the source or to
production; it is a proposal for the owner of the source.

## Structure of a term in the source

Every entry in `terms` has exactly these fields (checked against all 335 current entries):

```json
{ "id": "kebab-case-id", "key": "Display name", "name": "Display name", "description": "…", "url": "https://…", "aliases": ["…"], "letter": "V" }
```

There is no `related` or `sources` field. The single `url` is the source reference, and `aliases` are matched
case-insensitively by Learn (and by the glossary popups), so an alias that is too general would capture text in
unrelated places. `letter` is the first letter of `name`. Existing entries involved: `verifiable-credential`
("A tamper-evident credential whose authorship (issuer) can be cryptographically verified."), `credentialformat`
(Credential Format), `vcformat`, `verifiable-credential-type` (alias `vct`, `VCT`), `attestation`,
`attestation-type` ("An identifier for a type of attestation, unique within the context of the EUDI Wallet
ecosystem."), `electronic-attestation-of-attributes`.

## Findings

1. There is no general entry **Credential**. The Learn pages use the word everywhere, and the "Terms in this
   article" box on "The big picture" asks for it.
2. **Verifiable Credential Type** is named like a general idea but only describes the SD-JWT VC `vct` string. A reader
   who looks up "credential type" gets a format-specific definition. `attestation-type` is the EUDI equivalent
   and already exists, so a general entry would sit between the two.
3. **Mandate** says "a core European Business Wallet capability for delegation". The European Business Wallet is a
   proposal; the sentence reads as a statement about a finished product (see "What Learn does meanwhile").

## Proposal, in recommended order

Apply in this order so no reference breaks halfway: first the new entries, then the rename, then the text fix.

### 1. New entry: Credential

```json
{
  "id": "credential",
  "key": "Credential",
  "name": "Credential",
  "description": "Information about a subject, such as a person or an organisation, that an issuer provides so it can be shown to others. The term does not by itself identify a technical format or a legal status.",
  "url": "https://www.w3.org/TR/vc-data-model-2.0/",
  "aliases": [],
  "letter": "C"
}
```

Basis: the W3C Verifiable Credentials Data Model 2.0 defines a credential as a set of one or more claims made by an
issuer, and a verifiable credential as a tamper-evident credential whose authorship can be verified. The text above
stays general on purpose and does not claim that every credential is verifiable. No aliases: "credentials" and
"attestation" must not resolve here (`attestation` is its own entry with an EUDI meaning).

### 2. New entry: Credential Type

```json
{
  "id": "credential-type",
  "key": "Credential Type",
  "name": "Credential Type",
  "description": "A kind of credential, such as a diploma or an employee card. It describes what information a credential of that type is expected to contain and can point to the rules or schema that apply. How a type is defined and identified depends on the ecosystem and the format used.",
  "url": "https://www.w3.org/TR/vc-data-model-2.0/#types",
  "aliases": [],
  "letter": "C"
}
```

Basis: W3C VCDM 2.0 uses `type` for the kind of a credential; EUDI uses "attestation type" for the same idea
(`attestation-type`); SD-JWT VC identifies it with `vct`. Do not add `vct` or `credential type identifier` as aliases.

### 3. Refine the existing vct entry (keep `id`, so existing references and anchors keep working)

```json
{
  "id": "verifiable-credential-type",
  "key": "Credential Type Identifier (vct)",
  "name": "Credential Type Identifier (vct)",
  "description": "In SD-JWT VC, the identifier of a credential type. This string (vct) names the type and can link to its schema. Commonly used in EU and EWC attestation catalogs.",
  "url": "https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/",
  "aliases": ["vct", "VCT", "Verifiable Credential Type"],
  "letter": "C"
}
```

Aliases: keep `vct` and `VCT` (the term people actually search for) and move the old name to an alias, so text that
still says "Verifiable Credential Type" resolves to the same entry. Do not add "credential type" (it belongs to entry 2).
Alternative with fewer changes (option B): keep one entry and replace only the description with "A kind of credential,
describing what information it is expected to contain. In SD-JWT VC, a credential type is identified by a string called
vct, which names the type and links to its schema; other formats identify types in other ways. Commonly used in EU and
EWC attestation catalogs." Option A is preferred: it keeps the general idea and the technical identifier apart.

### 4. Soften Mandate (text only)

```json
{
  "id": "mandate",
  "description": "A digital authorization that lets one person act on behalf of an organization within defined limits. Business wallet proposals, including the European Business Wallet proposal, include mandates for delegation."
}
```

(Only `description` changes; the other fields stay as they are. Same check for `representation-rights`, which is fine today.)

## What Learn does meanwhile

- "What is a credential? And what is an attestation?" explains credential types in its own words and links only the
  `vct` identifier to the glossary, so the popup matches what the text says.
- "Business wallets: where to start" no longer links the word "mandates" to the glossary (the current definition
  describes the European Business Wallet as if it exists), and the business hub page lists "Representation rights" in
  its terms box instead of "Mandate". Restore the links after proposal 4 is applied.
- "Terms in this article" shows whole sentences from the glossary text and a "Full definition" button when more follows.
- Terms without an entry (now only **Credential**) render as plain text; the seed reports `GLOSSARY-MISSING Credential`.
- Reviewed in this round: the definitions of every term the Learn articles link (Business wallet → Organizational
  Wallet, Representation rights, Wallet, Holder, Issuer, Relying Party, Verifier, Credential Status, Electronic
  Attestation of Attributes, Qualified Electronic Attestation of Attributes, Credential Format, Verifiable Credential,
  vct, Wallet Provider). Only Mandate and vct needed a note; the others match how the articles use them. Holder,
  Issuer and Verifier are short role descriptions; Relying Party is phrased for the EUDI Wallet context.
