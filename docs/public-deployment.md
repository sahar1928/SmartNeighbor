# SmartNeighbor - Public Deployment Guide

## Goal

This guide moves SmartNeighbor from a local `127.0.0.1` demo to a public URL that friends can open from any internet connection.

## Recommended Path

For the current MVP, the simplest public setup is:

- Render, Railway, or Fly.io for the Docker web app.
- Managed PostgreSQL.
- Optional managed Redis.
- PayPal Sandbox credentials.
- BIT in simulator mode.
- WhatsApp left in mock/webhook-ready mode until a Meta Business setup is available.

## What Changed for Public Deployment

The app is now prepared for non-local hosting:

- Blank managed PostgreSQL databases are automatically bootstrapped from `database/schema.sql`.
- Demo seed data is inserted automatically if the database is empty.
- `PUBLIC_BASE_URL` can be used to generate correct public PayPal return/cancel URLs behind cloud proxies.
- `.env.production.example` documents the required production-style environment variables.
- `render.yaml` can be used as a starting point for a hosted Docker service.

## Option A - Render

Render is the most straightforward path for a demo that friends can access.

The repository includes a `render.yaml` Blueprint that creates:

- a free Docker web service
- a free Render PostgreSQL database
- an automatic internal `DATABASE_URL`

Fast path:

1. Open the Deploy to Render button in `README.md`.
2. Connect your GitHub account if Render asks.
3. Select `sahar1928/SmartNeighbor`.
4. Fill only the secret values you want to enable. For a basic public demo, PayPal and WhatsApp can stay empty.
5. Deploy.

Manual path:

1. Push the repository to GitHub.
2. In Render, create a new Blueprint from the repository.
3. Render reads `render.yaml`.
4. Render creates the web service and Postgres database.
5. Set environment variables:

```text
NODE_ENV=production
PORT=3000
PUBLIC_BASE_URL=https://YOUR-APP.onrender.com
DATABASE_URL=created automatically from smartneighbor-db
DATABASE_SSL=true
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_RETURN_URL=https://YOUR-APP.onrender.com/?rt=demo-danny-4b&paypal=return#my-account
PAYPAL_CANCEL_URL=https://YOUR-APP.onrender.com/?rt=demo-danny-4b&paypal=cancel#my-account
BIT_MODE=simulator
WHATSAPP_VERIFY_TOKEN=choose-a-random-value
WHATSAPP_DEFAULT_TO=972525452532
```

6. Deploy.
7. Open:

```text
https://YOUR-APP.onrender.com/?rt=demo-danny-4b#my-account
```

## Option B - Railway

Railway can deploy from the Dockerfile and attach PostgreSQL.

1. Create a Railway project from GitHub.
2. Add a PostgreSQL service.
3. Deploy the app service from the repository Dockerfile.
4. Set `DATABASE_URL` to the Railway PostgreSQL connection string.
5. Set `DATABASE_SSL=true` if Railway requires SSL for the chosen connection.
6. Set `PUBLIC_BASE_URL` to the Railway public domain.
7. Set the PayPal and WhatsApp variables as needed.

Railway's docs note that PostgreSQL services expose connection variables, including a `DATABASE_URL`, to other services in the project.

## Option C - Fly.io

Fly.io works well with Dockerfile-based apps.

1. Install `flyctl`.
2. Run:

```powershell
fly launch
```

3. Choose Dockerfile deployment.
4. Create or attach Postgres.
5. Set secrets:

```powershell
fly secrets set PUBLIC_BASE_URL=https://YOUR-APP.fly.dev
fly secrets set DATABASE_URL=...
fly secrets set DATABASE_SSL=true
fly secrets set PAYPAL_MODE=sandbox
fly secrets set PAYPAL_CLIENT_ID=...
fly secrets set PAYPAL_CLIENT_SECRET=...
fly secrets set BIT_MODE=simulator
```

6. Deploy:

```powershell
fly deploy
```

## Quick Alternative - Temporary Tunnel

For a short demo without cloud deployment, use a tunnel:

```powershell
docker compose --env-file .env up -d --build
ngrok http 3000
```

Then send friends the HTTPS ngrok URL.

Limitations:

- Your computer must stay on.
- The URL may change.
- It is not production hosting.
- PayPal return URLs should match the tunnel URL if you test PayPal.

## Public Demo Links

Once deployed, use these links:

```text
Resident demo:
https://YOUR-DOMAIN/?rt=demo-danny-4b#my-account

Dashboard:
https://YOUR-DOMAIN/#dashboard

Health:
https://YOUR-DOMAIN/api/health

Ready:
https://YOUR-DOMAIN/api/ready
```

## Security Notes Before Sharing

The current app is suitable for a public demo, not production with real residents.

Before production:

- Replace demo magic-link tokens with long random tokens.
- Disable or protect `/api/demo/reset-account`.
- Use real authentication for committee actions.
- Use managed secrets.
- Use HTTPS only.
- Do not use PayPal live until business/legal setup is ready.
- Do not process real WhatsApp messages without consent.

## Sources

- Render environment variables: https://render.com/docs/configure-environment-variables/
- Railway deploy docs: https://docs.railway.com/cli/deploy
- Railway PostgreSQL docs: https://docs.railway.com/guides/postgresql
- Fly Dockerfile deployment: https://fly.io/docs/languages-and-frameworks/dockerfile/
- Fly deploy docs: https://fly.io/docs/apps/deploy/
