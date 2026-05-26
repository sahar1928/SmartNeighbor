# SmartNeighbor Architecture

## Current MVP

```text
Browser dashboard
       |
       v
Node HTTP server
       |
       +-- Static web app
       +-- JSON API
       +-- Rule-based Agent
       +-- Seeded in-memory data
```

This repository intentionally starts without external runtime dependencies. It is easy to run locally, easy to containerize, and ready to replace the in-memory layer with PostgreSQL later.

## Production target

```text
WhatsApp Business API / Web / PWA / SMS
                 |
                 v
          API Gateway / BFF
                 |
      SmartNeighbor Agent service
                 |
   +-------------+-------------+-------------+
   |             |             |             |
Payments     Maintenance   Community   Library
service      service       service     service
   |             |             |             |
PostgreSQL + Redis + object storage + payment gateway
```

## Suggested next services

- `agent-service`: OpenAI/Azure AI intent extraction, context memory, and action router.
- `payments-service`: CardCom/Tranzila/Bit/PayBox integrations and webhook verification.
- `maintenance-service`: ticket lifecycle, SLA tracking, provider assignment.
- `community-service`: posts, votes, moderation, and search.
- `library-service`: shared items, trust score, loan lifecycle.
- `identity-service`: residents, committees, providers, consent, and role-based access control.

## Security baseline

- Keep card details outside SmartNeighbor. Store payment provider tokens only.
- Require 2FA for committee users.
- Audit all sensitive actions: payment status changes, expense approvals, resident data access.
- Explicit consent before processing WhatsApp group messages.
- Support export and deletion flows for privacy compliance.
