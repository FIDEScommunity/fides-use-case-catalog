# Legal check: digital EU power of attorney and European Business Wallet proposal (12 November 2026)

Scope: every passage in the Learn content that names Directive (EU) 2025/25, the digital EU power of attorney, COM(2025) 838 or the
European Business Wallet (EBW) proposal. Pages: `how-can-someone-act-for-an-organisation` (section "What do European sources say today?" and
"Identity, authority and mandate"), `european-business-wallet`, `eudi-wallet-and-european-business-wallet`,
`business-wallets-where-to-start`. A grep for "volmacht", "power of representation", "digital EU power", "Business Wallet proposal", "COM(2025)",
"2025/25" found no other Learn page.

## Sources read on 12 November 2026

| Source | URL | Result |
|---|---|---|
| Directive (EU) 2025/25, full text (EUR-Lex, CELEX 32025L0025) | https://eur-lex.europa.eu/eli/dir/2025/25/oj | read in full (HTTP 200) |
| COM(2025) 838 final, 19.11.2025, full text (EUR-Lex, CELEX 52025PC0838) | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025PC0838 | read in full (HTTP 200) |
| Legislative Observatory, procedure 2025/0358(COD) | https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0358(COD) | read (HTTP 200) |
| Council press release, 9 June 2026 | https://www.consilium.europa.eu/en/press/press-releases/2026/06/09/european-business-wallets-council-adopts-negotiating-position/ | `curl` answers 403 (bot protection). Text read through a web search result, plus the Council document ST 10346/26 ("General approach", 9 June 2026) |
| EC page "European Business Wallets" | https://digital-strategy.ec.europa.eu/en/policies/business-wallets | read (HTTP 200) |

## Status of the EBW proposal as checked

- Commission proposal COM(2025) 838, 2025/0358(COD), published 19 November 2025 (OEIL, EUR-Lex). Regulation, ordinary legislative procedure.
- Council: general approach (negotiating position) adopted on 9 June 2026 (Council press release; document ST 10346/26).
- European Parliament: lead committee ITRE voted on 10 September 2026 to adopt its report and to open interinstitutional negotiations (report A10-0240/2026 tabled 23 September 2026); the decision to enter negotiations was announced on 5 October 2026 and confirmed by plenary on 7 October 2026 (Rule 72). The OEIL stage still reads "Awaiting Parliament's position in 1st reading".
- Not adopted, not in force. The proposal text says it would apply one year after entry into force (date left open).
- Consequence for the page text: "still a proposal; the Council has its position and the European Parliament decided in October 2026 to open negotiations; nothing has been adopted".

## Claim-by-claim

Legend: confirmed, partly confirmed (wording narrowed on the page), not confirmed, not verifiable.

| # | Claim on the page (before this check) | Source and place | Result | Page change |
|---|---|---|---|---|
| 1 | Directive (EU) 2025/25 "introduces a digital EU power of attorney for companies, based on a common template". | Directive 2025/25 inserts Article 16c into Directive (EU) 2017/1132; recital 27 | Partly confirmed. The tool is limited to companies listed in Annexes II and IIB of 2017/1132, and to procedures within that directive's scope in another Member State. "Introduces" suggested it is already available. | Rewritten: "inserts ... (Article 16c) into ... Directive (EU) 2017/1132", names the limited scope and procedures. |
| 2 | Availability (not stated before). | Directive 2025/25 Art. 4: transposition by 31 July 2027, measures apply from 31 July 2028 | Confirmed; the old text could be read as if the tool exists today. | Added: "Member States apply these measures from 31 July 2028." |
| 3 | The power of attorney is drawn up "in accordance with national legal requirements". | Art. 16c(1): drawn up, amended or revoked "in accordance with national requirements", which "shall at least include the verification by courts, notaries or other competent authorities of the identity, legal capacity and authority to represent the company of the person granting" it. | Confirmed (more specific than the old text). | Wording kept and extended with the minimum verification. |
| 4 | It "does not affect national rules on the use of powers of attorney". | Recitals 27 and 28: without prejudice to national rules on formation of companies, limitations on powers of attorney, "legal and statutory representation or any other types of powers of attorney". Recitals, not an article. | Confirmed (recital level). | Reworded to "does not affect national rules on legal and statutory representation or other powers of attorney". |
| 5 | (not stated before) It "should be accepted as evidence". | Art. 16c(2): "shall be accepted as evidence of the authorised person's entitlement to represent the company as specified in the document". | Confirmed. The old closing sentence "acceptance is for the service to decide" conflicted for these procedures. | Added; closing sentence now begins "Outside rules like these, ...". |
| 6 | "Member States are free to choose whether a specific EU digital power of attorney must be filed". | Art. 16c(3): Member States "may require" filing with a register; recital 28. | Confirmed. | Condensed to "Member States may require it to be filed with a register". |
| 7 | "Company law already requires information on legal representatives to be disclosed in business registers". | Recital 28 of Directive 2025/25, referring to Directive (EU) 2017/1132. A recital, not a new rule. | Confirmed as a statement of the recital. | Removed from the Directive bullet (the sentence is not needed for the claim); the "Identity, authority and mandate" list still names "the rules on a company's legal representatives" only as an example origin of authority. |
| 8 | The EBW proposal defines "mandate" as the authorisation given by the wallet owner to an authorised representative to act for the owner in operating the functions of that wallet. | COM(2025) 838, Article 3 definitions (18) "authorised representative" and (19) "mandate" (the earlier gap note cited "Art. 2"; the definitions are in Article 3) | Confirmed. | Wording stays; "Article 3" corrected in the editorial notes. |
| 9 | The proposal "aims to be compatible with the digital EU power of attorney". | Recital 18: the authorisation system "should ensure compatibility with the EU digital power of attorney, as established by Directive (EU) 2025/25"; financial statement mentions attestations for delegating a digital power of attorney. Recital, non-binding. | Confirmed (recital). | Page now says "says in a recital that its authorisation system should be compatible with the digital EU power of attorney". |
| 10 | The proposal "would let an owner give authorised representatives mandates". | Art. 3(1)(c): wallet enables "the creation, management and delegation of mandates to authorised representatives"; recital 18 (technical and administrative mandate). | Confirmed. | Wording stays in the definition sentence. |
| 11 | "It is a proposal that is still in the legislative process." | OEIL, Council press release (see status). | Confirmed. | Replaced by the dated status sentence. |
| 12 | Council: the authorisation system "is not intended to affect any power of attorney or legal mandates provided under national or Union law". | Council press release 9 June 2026, "Key provisions" (also in the general approach, ST 10346/26) | Confirmed through the press release text. Direct `curl` is blocked (403), so the automated link check shows a warning, not a failure. | Added to the proposal bullet; the press release and the OEIL file are now listed as sources of the article. |
| 13 | "European Parliament decided in October 2026 to open negotiations". | OEIL key events: committee decision 10 September 2026, announced 5 October, confirmed by plenary 7 October 2026 (Rule 72). | Confirmed. | Added to the status sentence; also one sentence on `european-business-wallet`. |
| 14 | `european-business-wallet`: "The Council adopted its negotiating position on 9 June 2026." | Council press release and ST 10346/26 | Confirmed. | Kept; Parliament sentence added; "last checked" moved to 12 November 2026. |
| 15 | `eudi-wallet-and-european-business-wallet` and `business-wallets-where-to-start`: "legislative proposal, not a rule in force; final rules may differ". | OEIL: not adopted | Confirmed. | None. |
| 16 | Identity regulation: Annex VI lists "powers and mandates to represent natural or legal persons". | Regulation (EU) 2024/1183, Annex VI point 9; Art. 3(1), 3(3) "natural person representing another natural person or a legal person" | Confirmed (read on the EUR-Lex text). | None. |
| 17 | ARF: representation attestation for natural person representing another natural person; legal-person wallet units removed in view of a separate business wallet. | ARF `main` branch: section 2.6.5 and chapter 3 (GitHub, retrieved 12 November 2026). The ARF changes frequently. | Confirmed for the version retrieved; may change. | None; the ARF link is a moving target. |
| 18 | W3C: authorisation not an appropriate use of the data model without an authorisation framework. | VC Data Model 2.0, section 5.9 | Confirmed. | None. |

## Not claimed (checked and left out)

- That a mandate or power of attorney is valid, sufficient or must be accepted by every service (only claim 5, which is limited to Art. 16c procedures).
- Any statement on which register, notary or authority is competent in a given Member State.
- That the EBW authorisation system or the EBW itself is available, or that a final text exists.
- The draft implementing text on relying-party registration quoted in an ARF discussion paper (a draft, not used).

## Open

- The national transposition of Directive 2025/25 (deadline 31 July 2027) is not checked here; the page says nothing about national law.
- Recheck the Parliament position and any trilogue outcome before staging; the Council press release URL cannot be verified by script (403).
