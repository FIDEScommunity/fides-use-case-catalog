# Technology and Around the world: comparison with existing pages, deviations and open points (13 November 2026)

Source of the plan: the concept "Learn: Technology en Around the world" of 12 November 2026. Overview pages and articles:
`topics/technology/` (three articles, series `technology`, Previous/Next) and `topics/around-the-world/` (three pages, no series).
Fact check: `learn/technology-around-world-legal-fact-check-2026-11-13.md`. Dutch proposals (not seeded): `learn/nl-translation-changes-technology-around-world.md`.

## Existing pages compared before entering the new articles

Existing: **Formats and protocols: what do they do?** (`topics/the-big-picture/formats-and-protocols/`, "FP"), **Trust and interoperability**
(`topics/the-big-picture/trust-and-interoperability/`, "TI") and **Trust service providers and trust frameworks**
(`topics/ecosystem-roles/trust-service-providers-and-trust-frameworks/`, "TSP"). Both existing articles named in the Technology overview are linked from it.

| New article | Overlap found in the concept | What was cut or shortened | What points to the existing article for the basis | What stays new |
|---|---|---|---|---|
| How do wallets and services exchange information? | The education example is the same illustrative example as in FP ("Start with the interaction"); the OpenID4VCI/OpenID4VP descriptions repeat the bullets under FP "What is a protocol?"; three of the five check questions (protocol versions, credential formats and types, test with the parties) repeat FP "What should an organisation ask?". | Check questions reduced from five to three (identify each other and find information; failure, unavailable credential or status; agreements and test environments). The version and format questions are replaced by one sentence pointing to FP. Example kept (it carries the step-by-step flow) but stated once, briefly. | First paragraph and check section link to FP; "Learn more" starts with FP. | The sequence receive, hold, present, check; the final status of OpenID4VCI 1.0 (September 2025) and OpenID4VP 1.0 (July 2025). |
| Credential formats and interoperability | "What does a format describe?", "More than a format" and "Comparing products" repeat FP sections "What is a credential format?", "Does a matching format mean everything will work?", "What should an organisation ask?" and "Where can I find this information in FIDES?". | The interoperability profile paragraph is one sentence (FP explains profiles). "Comparing products" is two sentences: the questions live in FP; only issuer recognition and status checks are added. The FIDES catalog sentence is kept (one sentence); the FP statement that FIDES does not verify every claim is not repeated. | Opening paragraph, "More than a format" and "Comparing products" link to FP. | What a format describes (information plus proof), the data model versus SD-JWT VC versus mdoc with their real status (W3C Recommendation, IETF Internet-Draft, ISO/IEC 18013-5), the added ISO source. |
| Trust frameworks and registries | "What is a trust framework?" repeats TSP "What is a trust framework?"; "Trusted lists" repeats TSP "What does qualified mean?" and "Finding providers"; the registry paragraph overlaps with TI "What are rulebooks and trust registries?". | Trusted lists reduced to two paragraphs (what an EU trusted list is, how to use the QTSP filter); the explanation of qualified services and the difference between the role filter and the QTSP filter stay in TSP. Framework and registry text kept at concept level; the TI "rulebook" part is not repeated. | Opening paragraph links to TI; the framework section and the qualified section link to TSP; "Learn more" has TI, TSP and the service check article. | What a registry can and cannot establish (with the W3C "verifiable data registry" notion), the concrete EUDI ARF trust model example, questions to ask. |

Result: the three articles keep their own question; the shared basis is one link away. A reader of FP and TI will still meet the education example, the notion of trust frameworks and
the QTSP filter again; those places are marked in the table and are deliberate (each article must stand on its own).

## Deviations from the concept (old: concept, new: published text)

1. Technology overview: "Bestaand artikel." markers removed; the five rows are the real page titles (FP and TI are linked). Added a one-sentence panel ("Start with the interaction") and the terms panel (OpenID4VCI, OpenID4VP, Credential Format, Trusted List) after the pattern of For governments; catalog sentence: browse credential types, personal wallets, business wallets and use cases.
2. Topics row text for Technology: "Formats, protocols, identifiers and interoperability concepts" -> "Formats, protocols, trust frameworks and interoperability" ("identifiers" has no article in this topic).
3. Page title and H1 of the Around the world overview: the concept names the overview "Digital trust around the world" and the Topics row "Around the world". Title (breadcrumb, Topics row, links) = **Around the world**, H1 (headline field) = **Digital trust around the world**. The row title equals the real page title.
4. Around the world overview: country rows: "Explore the Dutch EDI ecosystem, public-source access and the organisations involved." -> "Explore the Dutch EDI programme and the programme for shared access to public-source data." ("organisations involved" is not on the sources). The international rows are three (European Digital Identity Wallet, **The EUDI Wallet and national implementation**, UN Transparency Protocol): the concept says "Bestaande Learn-artikelen" for the EUDI part, so both existing articles are linked with their real titles; the row text for the EUDI article: "Learn about the European framework." ("and national implementation" moved to the second row).
5. Netherlands: concept "Public organisations and other participants are working on how people can receive and share information with services." (not on the EDI page) -> "Programma EDI-Stelsel NL works on the implementation of the revised eIDAS Regulation ... developed on its behalf (NL Wallet) ... responsibility of the Ministry of the Interior and Kingdom Relations" and "using a wallet is not mandatory" (from the page). GBO: concept "making data from public sources available for several routes, including the EUDI Wallet" -> the three routes (EUDI Wallet, OOTS, consent-based sharing) and "not meant to become a new, separate system"; planning stated as ICTU's planning. "Read the current programme documentation" kept as the version/status sentence.
6. Germany: concept "The programme publishes information for the public and technical documentation for participants" -> "information for the public ... and its FAQ explains how organisations can test use cases in a sandbox" ("technical documentation" was not confirmed). Concept "The programme's September 2026 announcement gave 2 January 2027 as the planned launch date" -> exact dates (press conference 9 September, news item 15 September), who announced it (the Federal Minister), the wording "first credentials and use cases are scheduled to become available", and the FAQ's "early 2027". The source URL for the ecosystem page is the English one.
7. UNTP: "work by UN/CEFACT on digital information for product and supply-chain transparency" -> "published by UN/CEFACT as a protocol ... not a platform". "Specifications include a digital product passport and other types of information" -> named examples (conformity credentials, traceability events, facility records). Added the status block (Work in Progress, pre-production pilots, schema v0.8.0, public review closed, version 1.0 expected), what the UNTP DPP is, and that it differs from the EU regulatory passport.
8. Sources: SD-JWT VC title updated to the draft's current title with the draft number; the ISO/IEC 18013-5 source added; the EC trusted lists source uses the real page title; the ARF trust model is a third source on the Trust frameworks article.
9. "Continue learning": the concept's plain item lists were split into the standard groups "Learn more" and "Explore in the catalogs". "Browse personal wallets and business wallets" became two links. For the Trust frameworks article the EC page is a link in "Learn more" with the real title.
10. Technology articles: the concept's editorial remark about adding an mdoc source and a concrete trust framework source was applied (ISO source, ARF trust model).
11. Last-checked line: "Content last checked: 13 November 2026" on every new page (concept: 12 November 2026 for the concept date).

## Existing pages changed

- `topics.html`: the Technology and Around the world rows are links (both were plain text rows without a link before).
- `formats-and-protocols.html`: one extra link in "Continue learning" (How do wallets and services exchange information?). `trust-and-interoperability.html`: one extra link (Trust frameworks and registries). No back link was added to the national implementation article ("Learn more" is capped at four links by `tests/for-governments-checks.cjs`).
- Not changed: `overview.html` lists "Wallets & credentials · Ecosystem roles · Technology · Around the world" as plain text (not links; no change needed). The existing sources lists keep the older SD-JWT VC title and the German ecosystem URL.
- Tests changed: `tests/ecosystem-roles-checks.cjs` (the check that "Around the world" stays unlinked is removed), `tests/learn-recovery-checks.cjs` (only "Wallets & credentials" stays a plain row), `tests/nl-route-checks.cjs` (new routes included, `NL_PATHS` for a focused run).

## Open points

- Dutch for all new strings: proposals only; the Dutch routes show English sentences until entered (16 deliberate reports in `tests/nl-route-checks.cjs`).
- Decision on the Dutch names of the two topics (Technologie / Rond de wereld or English).
- Before staging re-check: German launch date, UNTP version, GBO version, SD-JWT VC status (see the fact-check file).
- Missing destinations (not linked, no route invented): issuer overview, relying party overview, interop profiles and matrix; there is no pilot page per country beyond the two written ones.
- Countries are examples, not a complete list: more countries only with an actual primary source and an owner who maintains the page.
- `tests/learn-recovery-checks.cjs` still reports one older failure that is not caused by this work: "What is a digital wallet?" has seven "Learn more" items (the check allows fewer).

## Resolved 13 November 2026

- Topic names in Dutch: "Technologie" and "Internationaal" (H1 "Digitaal vertrouwen wereldwijd"). The nav title and the H1 are separate strings.
- The recovery test that expected seven Learn more links on "What is a digital wallet?" now passes with four links.
