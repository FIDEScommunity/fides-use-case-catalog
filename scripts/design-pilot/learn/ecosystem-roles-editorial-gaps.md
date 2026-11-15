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
| Issuer catalog | Done 15 November 2026: `Browse issuers` links to the pilot catalog (`{{pilot}}/issuers/`) on the issuer article. Check that the page exists in the target environment. |
| Relying party catalog | Done 15 November 2026: `Browse relying parties` links to the pilot catalog (`{{pilot}}/relying-parties/`) on the relying party article. |
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
- Filter counts: on the trust article the role filter (`?role=eidas_trust_service_provider`) shows 3 organisations and the QTSP filter (`?cert=qtsp`) shows 285 (live data of 12 November 2026),
  because they use different fields. The role comes from the self-described `ecosystemRoleCodes` of the organisation profile; only 3 organisations have it (Banqup, Docaposte, Doccle).
  The QTSP certification comes from the eIDAS Trust Browser import (`certifications[].code = qtsp`), which covers qualified providers whatever their profile says. Only Banqup has both.
  Of the 285 QTSP organisations, 281 have no ecosystem role at all and 4 have other roles. Both filters match exactly (no substring matching); the checks are `tests/org-qtsp-filter-data-check.cjs` and `tests/org-qtsp-filter-checks.cjs`.
  The pilot's own `aggregated.json` snapshot (19 October) has 283; the page loads the live GitHub aggregate, which added Bit4id and an AGPMDEF PKI authority. No source data was changed. Proposal for the catalog team: ask Docaposte and Doccle to check their profiles, and consider adding the TSP role to organisations imported as QTSP.
- Sources for "Wallet providers and other service providers": the W3C Verifiable Credentials Data Model 2.0 was added as the general source for the roles of issuer, holder and verifier and for credentials. It does not describe wallet products or providers; no second primary source was added. On staging an editor must add the source by hand if the page was edited there (`skipped-edited`).
