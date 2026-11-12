# Ecosystem roles: what is still missing (editorial round, 12 November 2026)

The overview `topics/ecosystem-roles/` exists. The five role articles from the editorial outline are **not written**, and no empty pages were
created for them: the rows on the overview have no link and show the "Design preview" label. Each row points to the closest existing
article in its description. When an article is published, link its row title (and remove the "for now" pointer), add it to
`learn/manifest.json` with `kind: article`, `eyebrow: "Explainer · Ecosystem roles"`, `sources`, and a content file under `learn/content/`.
Also remove the paragraph "Where a separate article about a role is not available yet..." from `ecosystem-roles.html` once all rows are linked.

Source of the plan: the editorial outline "Learn Topics, vervolgopzet" (section "Eerste uitwerking, Ecosystem roles"). Sources named below still need to be
chosen by the editors; none is quoted here as fact.

| Role / article | Content still needed (from the outline) | Existing article used for now | Follow-up links to add when written |
|---|---|---|---|
| The holder | Who receives and shares information; which choices the holder has; how it works when someone acts on behalf of an organisation. | What is a digital wallet? | Back link to the overview; Business wallets: where to start (acting for an organisation); the personal and business wallet catalogs; For you (when it exists); a mandate article (none exists). |
| The issuer | Who provides a credential; where the information comes from; how issuing relates to responsibility for the content. | Issuing credentials for wallets | Credential Catalog (credential types); issuer catalog (only on the full site, see below); What is a credential?; For governments (when it exists, public issuers). |
| The relying party | Who requests information and why; what a technical check delivers; which assessment stays with the service. | Accepting information from a wallet | Relying party websites catalog (only on the full site, see below); Receive information from wallets (route, already linked from other articles); Trust and interoperability. |
| Wallet providers and other service providers | Which software and services can support an interaction; how responsibilities differ per setup (own software, service from another organisation). | none (the overview describes it in one sentence) | Personal and business wallet catalogs; organisation catalog; What is a digital wallet?; EUDI and EBW comparison (without equating roles or legal frameworks). |
| Trust services and trust frameworks | An introduction to trust services, agreements and registers. Legal qualifications only with a concrete source and applicable framework. | Trust and interoperability | Organisation catalog (qualified trust service providers, only if the editors confirm the listing fits); interop profiles / matrix (no pilot destination, see below); Formats and protocols. |

## Destinations that are not available in the pilot

- `Browse issuers` (`/issuer-catalog/`) and `Browse relying parties` (`/relying-party-websites/`) exist only on the full site; the overview does not link to
  them. Add them to the "Explore in the catalogs" paragraph and to the issuer and relying party articles when the destinations exist in the target environment.
- Interop profiles and interop matrix have no pilot page.
- For you and For governments are "Design preview" rows on Topics; the issuer and holder articles should link to them once they exist.

## Other points for the editors

- The Topics description of Ecosystem roles ("Holders, issuers, relying parties, providers and trust services") is unchanged.
- The overview uses the same example as "How credentials connect issuers, wallets and services" (training provider, recipient, employer); keep the two in step.
- EUDI and EBW: the overview only points to the comparison article. Role articles should say which framework a statement applies to.
- Check the German and other country examples in "How credentials connect" are not copied into the role articles without their own source and date.
- A staging page that an editor already changed is skipped by the seed (also in dry-run). That applies to Topics and the five articles that now link back: if they were edited on staging, add the "Ecosystem roles" link there by hand (see `staging/UPDATE-PLAN-NL-LEARN.md`).
