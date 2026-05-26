# SmartNeighbor - Final Submission

## 1. Problem

Residential building management is still handled through fragmented tools: WhatsApp groups, spreadsheets, manual bank transfers, phone calls, and informal memory. This creates payment friction, poor maintenance tracking, low financial transparency, and heavy workload for volunteer committee members.

SmartNeighbor solves this by keeping the familiar WhatsApp-first behavior while adding structured management behind it: payments, tickets, community board, shared item library, provider handling, and an AI-ready agent.

## 2. Market Research

The market contains partial solutions:

- WhatsApp: universal adoption, but no structure, permissions, payments, or SLA tracking.
- Bllink: strong building-payment orientation.
- Darimpo: building/committee management capabilities.
- Generic tools: forms, spreadsheets, CRMs, task boards.

SmartNeighbor is positioned as a high-simplicity, high-functionality layer: residents can use chat and Magic Links, while the building committee gets structured data.

See:

- `docs/01-market-research.md`
- `docs/project-submission-review.md`

## 3. Functional Scope Implemented

Implemented MVP:

- Hebrew RTL PWA/web app.
- Resident Magic Link account page.
- Personal charges, ledger, and balance.
- PayPal Sandbox/mock payment flow.
- BIT simulator payment flow.
- Demo reset gated by `ENABLE_DEMO_RESET`.
- Rule-based Agent with optional OpenAI Responses API adapter.
- Agent memory, confidence, and low-confidence escalation action.
- WhatsApp webhook scaffold and local WhatsApp-style feed.
- Maintenance tickets, payments, community board, library items, providers, votes.
- Committee API endpoints with role checks and optional 2FA code.
- Audit log for sensitive actions and AI decisions.
- Notification queue scaffold for payment reminders and emergency alerts.

## 4. Auth and Security

Implemented:

- Resident-scoped Magic Link tokens.
- Token expiry support in database schema.
- Token rotation metadata support.
- Role-based committee endpoint protection.
- Optional committee 2FA via `COMMITTEE_2FA_CODE`.
- No card details stored by SmartNeighbor.
- Payment provider references only.
- Audit log for sensitive actions.

Production recommendations:

- Replace demo tokens with long random generated tokens.
- Store hashes rather than raw token strings.
- Add token revocation UI.
- Enforce 2FA for all committee/chair actions.
- Disable demo reset in production.

## 5. Agent

Implemented:

- Rule-based intent engine.
- Optional OpenAI adapter via `OPENAI_API_KEY`.
- Structured AI output: intent, confidence, urgency, Hebrew reply.
- Short resident memory.
- Low-confidence escalation action.
- Audit events for AI decisions and fallback.

The app works without OpenAI credentials and falls back to local rules.

## 6. Notifications

Implemented scaffold:

- In-app notification queue.
- WhatsApp/mock sender integration.
- Payment reminder helper.
- Emergency alert helper.
- Notification audit trail.

Future work:

- Scheduled reminders.
- SMS provider.
- Push provider.
- Worker queue backed by Redis.

## 7. Committee Management

Implemented protected API foundation:

- Add resident.
- Create charge.
- Update payment status.
- Create vote.
- Approve expense.
- Add provider.
- Queue payment reminder.
- View audit log.

These are API-first foundations. The full committee UI can be added on top.

## 8. Production Database

Implemented:

- PostgreSQL schema.
- Startup bootstrap for blank managed databases.
- Lightweight migrations.
- `schema_migrations` table.
- Indexes for residents, payments, charges, ledger, and audit log.
- Seed data separated in `database/seed.sql`.
- Audit log table.

Future work:

- Dedicated migration tool.
- Automated backups.
- Data retention policy.
- Tenant isolation for many buildings.

## 9. Docker and Kubernetes

Implemented:

- `Dockerfile`
- `docker-compose.yml`
- PostgreSQL container
- Redis container
- Adminer
- Kubernetes manifests:
  - Deployment
  - Service
  - StatefulSet
  - ConfigMap
  - Secret example
  - Ingress
  - HPA
  - PDB
  - NetworkPolicy

See:

- `docs/03-docker-kubernetes-delivery.md`
- `docs/deployment.md`

## 10. Cloud

The app is deployed on Render:

```text
https://smartneighbor.onrender.com/?rt=demo-danny-4b#my-account
```

Render uses:

- Docker web service.
- Managed PostgreSQL.
- `PUBLIC_BASE_URL=https://smartneighbor.onrender.com`.

See:

- `docs/public-deployment.md`
- `render.yaml`

## 11. Testing

Implemented:

- API tests.
- Agent tests.
- Payment flow tests.
- Committee role tests.
- E2E-style HTTP browser shell test for static assets, BIT, and PayPal mock return.
- GitHub Actions CI.
- Docker build in CI.
- Kubernetes render validation in CI.

Run:

```powershell
npm test
docker build -t smartneighbor:ci .
kubectl kustomize k8s
```

## 12. Known Limitations

- WhatsApp real connection requires Meta Business credentials.
- WhatsApp API does not manage normal user groups directly.
- PayPal is Sandbox/mock until credentials are set.
- BIT is simulator until real Open Banking TPP credentials and signing certificates exist.
- Agent is rule-based unless `OPENAI_API_KEY` is configured.
- Committee management has API foundations but not a full UI yet.
- This is demo-ready and cloud-hosted, but not yet legally/operationally ready for real payment production.

## 13. Conclusion

SmartNeighbor now covers the three requested stages:

1. Market research and competitor positioning.
2. Functional specification and implemented MVP.
3. Docker/Kubernetes/cloud-ready deployment.

The project is runnable locally, deployable to cloud, tested in CI, and structured like a realistic early-stage startup MVP.
