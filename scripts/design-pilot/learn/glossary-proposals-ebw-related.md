# Proposals: related European Business Wallet (EBW) terms (not applied)

Status: review notes of 11 November 2026 after glossary 1.12.1 (PR #5, `9bf77c9`). **No definition was changed.** These proposals are for the source owners; nothing was applied to `vocabulary.json`, and no wording was aligned only to match other terms.

Sources, retrieved with GET on 11 November 2026:

- Commission proposal COM(2025) 838 final, 2025/0358(COD), "Proposal for a Regulation on the establishment of European Business Wallets", EUR-Lex: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025PC0838 (cited as "proposal").
- Commission page: https://digital-strategy.ec.europa.eu/en/policies/business-wallets

| Term | Current text (1.12.1) | Conclusion | Source |
|---|---|---|---|
| European Unique Identifier (EUID) | "…used in European Business Wallets where assigned under EU company law or anti-money-laundering rules." | Minor. The EUID itself exists (Directive (EU) 2017/1132; used by BRIS and BORIS). Its use in EBW is proposed. Optional change. | Proposal Article 1(5) and Article 9(1): the EUID would be the unique identifier of EBW owners where attributed; otherwise a similar identifier would be created (Article 9(2)). Explanatory memorandum: EUID is "existing". |
| QERDS (two entries: QERDS key and Qualified Electronic Registered Delivery Service) | "…offered alongside European Business Wallets." | No correction needed; the sentence is vague, not a wrong fact. QERDS is an existing eIDAS trust service. The link to EBW is proposed. Optional clarification. | Proposal Article 5(1)(i) (core functionality) and Article 5(3): providers of EBW "shall enable the provision of the qualified electronic registered delivery service … as a standalone service to users of European Digital Identity Wallets". |
| EU Company Certificate | "…intended for use within European Business Wallets under the EU 28th regime framework." | Already hedged ("intended"). The link to the "28th regime" is not supported by the sources used here (the proposal mentions the upcoming 28th regime only as policy context). Suggest dropping or sourcing that clause. | Proposal, legislative financial statement, section 1.5: Directive (EU) 2025/25 "introduced the EU Company Certificate and digital EU power of attorney"; the Regulation would offer a tool to exchange them via EBW. |
| Single Digital Gateway | "…complemented by European Business Wallets for trusted B2G identification and data exchange." | Small change recommended. SDG exists; the complement is the proposal's stated intention, presented here as present fact. | Proposal, explanatory memorandum ("Consistency with other Union policies") and financial statement: "The European Business Wallets proposal will complement the SDG and OOTS…". |
| Economic operator | "Any natural or legal person, or entity conducting economic activity, that may use a European Business Wallet to interact with public authorities or other businesses." | No correction needed (no legal-effect claim). Optional alignment with the proposal's definition, which is narrower and more precise. Decision for the owners. | Proposal Article 3(4): "'economic operator' means any natural or legal person, or a group of such persons, including temporary associations of undertakings, acting in a commercial or professional capacity for purposes related to their trade, business, craft or profession". |

## Proposed wording (only if the owners want to change them)

- **European Unique Identifier:** "A Union-wide unique identifier for companies and other legal entities, established under Directive (EU) 2017/1132 (company law) and used by the business registers interconnection systems. The European Commission's proposal for European Business Wallets would use it as the unique identifier of wallet owners where one has been attributed."
- **QERDS / Qualified Electronic Registered Delivery Service** (both entries share the text): "A qualified trust service that transmits data between third parties by electronic means and provides evidence on the handling of the data, including proof of delivery. The European Commission's proposal for European Business Wallets would make it one of the wallets' core functionalities."
- **EU Company Certificate:** "A digital certificate attesting company information for cross-border business procedures, introduced by Directive (EU) 2025/25. The European Commission's proposal for European Business Wallets would enable companies to exchange it through their wallets." (Add a source URL, for example the proposal on EUR-Lex.)
- **Single Digital Gateway:** "An EU initiative requiring key public services to be accessible online across borders. The European Commission's proposal for European Business Wallets is intended to complement it by providing trusted identification and authentication of businesses and public bodies and a secure exchange layer."
- **Economic operator (alignment, optional):** "Any natural or legal person, or a group of such persons, acting in a commercial or professional capacity for purposes related to their trade, business, craft or profession. In the European Commission's proposal for European Business Wallets, economic operators and public sector bodies are the intended wallet owners."

## Not assessed here

Business Registers Interconnection System ("linked to European Business Wallet identity data": mild, probably describes the proposal's intended interconnection) and WE BUILD (a pilot consortium, no claim about legal effect).
