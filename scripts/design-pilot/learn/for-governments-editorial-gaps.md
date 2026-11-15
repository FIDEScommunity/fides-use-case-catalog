# For governments: open points for the editors (12 November 2026)

The overview `topics/for-governments/` and four articles exist (series `for-governments`, Previous/Next). Source of the plan: the editorial outline
"Learn Topics, vervolgopzet" (For governments) and the ICTU Globaal Ontwerp GBO as background.

## GBO source status (checked online on 12 November 2026)

- Consulted: Globaal Ontwerp GBO **version 0.9.5, September 2026** (supplied PDF, author ICTU, "Status: voor vaststelling").
- Online: `https://ictu.github.io/GBO-GO/latest/` publishes 0.9.5 as `latest` (versions list: 0.9.5 is the newest; also a `main` branch), with the text "dit globaal ontwerp is nog niet definitief".
  `https://ictu.github.io/GBO/latest/` lists the Globaal Ontwerp review round as completed (v0.8.7, 22 April to 22 May 2026), status "Verwerking review t.b.v. vaststelling".
  ICTU programme page and digitaleoverheid.nl describe the programme and its phases (development phase July to December 2026, realisation phase 2027).
- Outcome: 0.9.5 is the current published version; no source states that the design has been adopted and no newer version was found. Wording used: "version 0.9.5 (September 2026), a draft design submitted for adoption".
- The PDF content matches the public documentation site (same title, date and text), so the summaries contain nothing that is not public. Passages kept at headline level, no quotes: three routes (EUDI Wallet, OOTS, DvTP), two issuing variants, optional shared facilities, "still to be realised" status, consent and pseudonymisation route. Not used: the stelselfunctie tables, component names beyond OOTS, the change log, the impact table.
- Doubt about public intent: none found. The document carries the note that it is not final; the demo environment note was not used.

## Second pass (12 November 2026)

- **Article 5f** (Regulation (EU) 2024/1183, EUR-Lex text read on 12 November 2026): article 3 summarises paragraph 1 (public sector bodies: where Member States require electronic identification and authentication for an online service, they shall also accept EUDI Wallets provided in accordance with the Regulation), paragraph 2 (private relying parties, except micro and small enterprises, where strong user authentication is required by law or contract: 36 months from the date the implementing acts of Articles 5a(23) and 5c(6) enter into force, on voluntary request of the user) and paragraph 3 (very large online platforms). Paragraph 1 names no date of its own; the paragraph 2 date depends on the implementing acts, so the page says so and tells readers to check the current position. The page says "also accept" and notes that the text does not make wallets the only accepted means. It is labelled as a summary and not legal advice. Article 4 carries one pointer; the overview has none (optional). Open point: confirm the dates of the implementing acts before staging.
- **QTSP route** (article 2): the GBO draft describes two services at the authentic source interface, a verify service (the provider checks attribute values it has been given) and an optional retrieve service (the provider fetches attributes on behalf of the source holder and qualifies them). The earlier "after checking or retrieving" sentence merged them. The draft ties the verify service to Article 45e; the page attributes that to the draft.
- **GBO text:** version, status and the extended Dutch context live on article 4 ("A Dutch example", anchor `#a-dutch-example`). Articles 1 to 3 have one short paragraph and a link there. Sources on articles 1 to 3 were reduced to those the text still uses; the Digitale Overheid source is no longer used anywhere in For governments.
- **Overview:** one short intro (the manifest excerpt), the terms panel kept, four rows, a short Dutch-example section and the catalog block.
- **Review document:** no review file specific to For governments was found in the Codex project folder; the six requested points were the basis.

## To do

- Re-check the GBO version and status before staging and update the date in the four articles, the overview, the manifest sources and `for-governments-checks.cjs`/`for-governments-seed.sh` (constants `version 0.9.5 (September 2026)`).
- The two use case cards (Honduras BIEN, Nijmegen municipal login) and the smart government card come live from the catalog; recheck the sentence above each card when a record changes.
- Country examples beyond the Netherlands are not included (outline: only after checking the responsible source). Germany and the Netherlands (EDI-Stelsel) appear only as sources in the national implementation article.
- Browse issuers and Browse relying parties are linked since 15 November 2026 (issuing: Browse issuers; accepting: Browse relying parties). Not available in the pilot and not linked: interop profiles and matrix.
- "For you" and "Around the world" on Topics stay unlinked.
- A staging page an editor changed is skipped by the seed (also in dry-run). That applies to Topics, "Issuing credentials for wallets", "Accepting information from a wallet" and "European Digital Identity Wallet": add the For governments links by hand (see `staging/UPDATE-PLAN-NL-LEARN.md`).
- Dutch proposals: `learn/nl-translation-changes-for-governments.md` (not seeded).
