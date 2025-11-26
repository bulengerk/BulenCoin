---
title: BulenCoin – legal and compliance notes
language: en
---

> This document is informational and technical. It is **not** legal or tax advice. Before
> running a production network or offering services based on BulenCoin, consult a lawyer
> familiar with EU and local regulations on crypto-assets, financial services, and data
> protection.

# 1. Scope and assumptions

BulenCoin in this repository is:

- an experimental crypto-network concept,
- technical/demo materials (prototype Node.js client, block explorer),
- **without** token issuance, investment offers, or profit guarantees in this repo.

Implications:

- Source code and docs are not an offer to acquire crypto-assets.
- Running a node is a technical action performed at the operator’s own responsibility.

# 2. Crypto-assets and EU regulation (high level)

Relevant frameworks in the EU:

- **MiCA** (Markets in Crypto-Assets) for issuance/offering and crypto-asset services,
- **AML/CFT** obligations,
- local laws of member states.

Likely interpretation:

- Implementing the protocol and running a node for personal use typically does **not**
  constitute a regulated financial service.
- Activities that may trigger licensing/registration (MiCA or local rules):
  - public token issuance,
  - operating an exchange/OTC desk,
  - custodial wallets,
  - brokering crypto-asset trades.

This project:

- does not define or describe a token sale process,
- keeps wallets non-custodial; operators do not hold user funds,
- stresses the experimental nature and absence of guaranteed returns.

Anyone planning a real (especially commercial) deployment should:

- obtain independent legal advice,
- confirm whether licensing/registration or notifications to regulators are required.

# 3. Data protection (GDPR)

Design intent: minimal data.

- Nodes speak P2P using IPs and node IDs.
- Chain state carries addresses and balances, not personal data.
- Telemetry (if implemented) should be anonymised/aggregated.

Practical considerations:

- An IP address can be personal data.
- Gateway/API logs may contain identifiers, headers, IPs.
- Telemetry that profiles users may fall under GDPR.

Operator recommendations:

- Limit logs to what is necessary; anonymise/pseudonymise where possible.
- Define log retention and secure storage.
- If collecting user-identifying data (e.g., for a gateway service):
  - publish a privacy notice,
  - ensure a lawful basis (consent/contract/legal obligation),
  - support data-subject rights (access, deletion, objection).

Prototype BulenNode in this repo:

- has no telemetry module; `BULEN_TELEMETRY_ENABLED` is off by default and left to future
  clients.

# 4. Tax responsibility

Crypto activity may have tax consequences (income/corporate tax on gains, record keeping,
possible VAT on services). This project:

- does not provide accounting or tax reporting tools,
- does not keep off-chain ledgers of user transactions,
- does not track tax residency.

Users/operators:

- are responsible for understanding their own tax obligations,
- should consult a tax advisor in their jurisdiction.

# 5. User safety and investment warnings

Repository and website messaging must clearly state:

- experimental project, no profit guarantee,
- seed loss = fund loss,
- misconfiguration can lead to losses (e.g., slashing),
- nothing here is investment advice.

Recommendations:

- Do not market BulenCoin as savings/investment without legal analysis.
- Avoid promising returns to end users.
- Communicate technical/economic risks in any marketing.

# 6. Minimal compliance hygiene

For the team and node operators:

- **Role separation:** open-source code/spec as a technical project; any exchange/custodial
  service is a separately regulated activity.
- **Policies:** IT security (backups, key management), privacy (for HTTP/API services),
  incident response.
- **Transparency:** disclose who operates a given gateway node (company/person) and publish
  updates and known vulnerabilities.

Before production, perform:

- legal review (MiCA, AML, local law),
- security audit of the implementation,
- basic load testing and failure drills.
