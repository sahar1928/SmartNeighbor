# SmartNeighbor

MVP runnable implementation for a WhatsApp-first building and community management platform.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/sahar1928/SmartNeighbor)

## What is included

- Hebrew RTL web dashboard for residents and committee members.
- HTTP API with seeded data for buildings, residents, payments, maintenance tickets, providers, community posts, shared items, and votes.
- Docker Compose startup stack with Node, PostgreSQL, Redis, and Adminer.
- Kubernetes stack with app deployment, Postgres StatefulSet, Redis, ingress, HPA, and PDB.
- Rule-based SmartNeighbor Agent simulator for core intents:
  - maintenance reports
  - payment queries
  - item borrowing
  - item lending
  - provider lookup
  - community posts
- Optional OpenAI Agent adapter with conversation memory, confidence score, escalation actions, and audit log.
- Role-protected committee API for residents, charges, payments, votes, expense approvals, providers, reminders, and audit viewing.
- Production safety flags for demo reset, committee 2FA, hashed Magic Link support, and payment provider modes.
- Dockerfile, Docker Compose, and Kubernetes manifests.
- Node test coverage for the Agent, API handlers, payment flow, committee permissions, and browser shell assets.

## Submission Docs

For the three required project stages, use these documents:

- [Stage 1 - Market Research](docs/01-market-research.md)
- [Stage 2 - Functional Spec Addendum](docs/02-functional-spec-addendum.md)
- [Stage 3 - Docker and Kubernetes Delivery](docs/03-docker-kubernetes-delivery.md)
- [Final Submission](FINAL_SUBMISSION.md)
- [Project Submission Review](docs/project-submission-review.md)
- [Demo Script](docs/demo-script.md)
- [Public Deployment Guide](docs/public-deployment.md)

## Run locally

```powershell
node server/index.mjs
```

Open:

```text
http://localhost:3000
```

## Test

```powershell
node --test
```

## Docker

Windows PowerShell:

```powershell
.\scripts\docker-up.ps1 -Build -Detached
```

Linux / WSL:

```bash
chmod +x scripts/*.sh
./scripts/docker-up.sh --build --detached
```

Open:

```text
http://localhost:3000
```

Adminer:

```text
http://localhost:8080
```

## WhatsApp Business Cloud API

The app includes a real WhatsApp webhook and sender integration:

- Webhook verification: `GET /webhooks/whatsapp`
- Incoming messages: `POST /webhooks/whatsapp`
- Dashboard feed: `GET /api/whatsapp/messages`
- Local group simulator: `POST /api/whatsapp/local-message`
- Outbound send: `POST /api/whatsapp/send`

Create a local env file:

```powershell
Copy-Item .env.example .env
```

Fill:

```text
WHATSAPP_VERIFY_TOKEN=your-random-webhook-secret
WHATSAPP_ACCESS_TOKEN=your-meta-access-token
WHATSAPP_PHONE_NUMBER_ID=your-meta-phone-number-id
WHATSAPP_GRAPH_API_VERSION=v24.0
WHATSAPP_DEFAULT_TO=972525452532
```

The test recipient number is configured from your WhatsApp number:

```text
+97252-5452532 becomes 972525452532
```

Run with Docker:

```powershell
docker compose --env-file .env up --build
```

For Meta webhook setup, the callback URL must be public HTTPS. During local development, expose Docker with a tunnel such as ngrok:

```powershell
ngrok http 3000
```

Then configure Meta:

```text
Callback URL: https://YOUR-NGROK-DOMAIN/webhooks/whatsapp
Verify token: same value as WHATSAPP_VERIFY_TOKEN
```

Important limitation: Meta's official WhatsApp Cloud API does not let a bot create or manage normal WhatsApp groups. SmartNeighbor therefore supports real 1:1 WhatsApp Business conversations and shows them in the in-app "building group" feed. A real group-style experience can be represented inside SmartNeighbor, while WhatsApp itself remains the resident entry point.

## Resident Payments

The resident portal uses a Magic Link instead of login:

```text
http://localhost:3000?rt=demo-danny-4b#my-account
```

It shows only that resident's open charges, ledger, and balance. The payment panel has two provider buttons only: PayPal Sandbox and BIT. If `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are configured, the backend creates real PayPal Sandbox approval orders and captures them after return. BIT is wired through `/api/bit/*`; it runs as a local simulator until real Open Banking TPP credentials and signing certificates are configured.

PayPal Sandbox test card:

```text
Card number: 4580 4324 9043 8806
Expiry: 12/2029
CVC: 684
```

The app does not collect card details directly. Use this card only inside the PayPal Sandbox checkout page after clicking `PayPal Sandbox`.

## Production switches

For local demos, `.env.example` keeps demo helpers enabled. For Render/Kubernetes production-style deployment, use `.env.production.example` and keep:

```text
ENABLE_DEMO_RESET=false
NODE_ENV=production
PAYPAL_MODE=sandbox
BIT_MODE=simulator
```

Optional real integrations:

```text
COMMITTEE_2FA_CODE=choose-a-private-code
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-5.1
```

Committee endpoints require a committee/chair Magic Link token and, when `COMMITTEE_2FA_CODE` is configured, a matching `twoFactorCode` value.

## PWA App

SmartNeighbor is also installable as a PWA:

- `public/manifest.webmanifest`
- `public/sw.js`
- offline shell at `public/offline.html`
- mobile bottom navigation
- quick action screens for payment, maintenance reports, shared items, community, and committee dashboard

Open the app in Chrome or Edge and use the install button when the browser offers it.

## Kubernetes

Windows PowerShell:

```powershell
.\scripts\k8s-deploy.ps1 -BuildImage
.\scripts\k8s-port-forward.ps1
```

Linux / WSL:

```bash
./scripts/k8s-deploy.sh --build-image
./scripts/k8s-port-forward.sh
```

Then open:

```text
http://127.0.0.1:3000
```

More deployment details are in `docs/deployment.md`.

## Cloud

The project can run on a real cloud container host. A Render blueprint is included:

```text
render.yaml
```

Cloud deployment notes are in `docs/cloud.md`.

To share the app with friends outside your local network, use:

- [Public Deployment Guide](docs/public-deployment.md)
- `.env.production.example`
- `scripts/cloud-smoke.ps1` or `scripts/cloud-smoke.sh`

Public demo URL format:

```text
https://YOUR-DOMAIN/?rt=demo-danny-4b#my-account
```

After deployment, verify the public URL:

```powershell
.\scripts\cloud-smoke.ps1 -BaseUrl https://YOUR-DOMAIN
```
