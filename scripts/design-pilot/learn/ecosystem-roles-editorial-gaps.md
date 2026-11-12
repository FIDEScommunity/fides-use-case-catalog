# Ecosystem roles: what is still open (editorial round, 12 November 2026)

The overview `topics/ecosystem-roles/` and its five role articles exist (the holder, the issuer, the relying party, wallet providers and other
service providers, trust service providers and trust frameworks). All six rows on the overview are links. Source of the texts: the editorial
draft "Learn, Ecosystem roles". The articles describe general roles and set out no specific legal obligations.

## Still open

| Item | What is missing |
|---|---|
| For you | The page does not exist. The holder article should link to it when it does (it is a "Design preview"/"In preparation" row on Topics). |
| For governments | The page does not exist. The issuer article should link to it (public issuers) when it does. |
| A mandate article | None exists. The holder article mentions mandates in one sentence (glossary term only) and points nowhere. |
| Issuer catalog | `Browse issuers` (`/issuer-catalog/`) exists only on the full site. Add it to "Explore in the catalogs" on the issuer article when the destination exists in the target environment. |
| Relying party catalog | `Browse relying parties` (`/relying-party-websites/`) exists only on the full site. Add it to the relying party article when it exists. |
| Interop profiles and matrix | No pilot page; the trust article does not link to them. |
| Sources for "Wallet providers and other service providers" | The draft names no source for this article. None was added. |
| "Trust framework" and "Trust service provider" | No glossary entry exists, so these terms are plain text on the trust article. Glossary content is out of scope here. |
| Role articles for staging | A staging copy of Topics, the four extended articles or the overview that an editor changed is `skipped-edited`; add the missing links by hand (see `staging/UPDATE-PLAN-NL-LEARN.md`). |

## Other points for the editors

- The overview and "How credentials connect issuers, wallets and services" use the same example (training provider, recipient, employer); the holder
  article uses a student and an employer. Keep the examples consistent when one of them changes.
- EUDI and EBW: the overview only points to the comparison article. Role articles should say which framework a statement applies to.
- Check that German and other country examples in "How credentials connect" are not copied into the role articles without their own source and date.
- The trust article links to the organisation catalog with the role filter `eIDAS Trust Service Provider` (`?role=eidas_trust_service_provider`) and the certification filter
  `QTSP (eIDAS)` (`?cert=qtsp`). Check on staging that the organisation data there shows results and the selected filter chips.
- The overview row for the last role now carries the article title "Trust service providers and trust frameworks" (earlier "Trust services and trust frameworks").
