# Cloud Deployment

The app is Docker-ready and can run on any container platform. The simplest path is Render or Railway because they can run the Dockerfile and provide managed PostgreSQL.

For a complete checklist for sharing the app with friends on a public URL, see `docs/public-deployment.md`.

## Recommended MVP Cloud Setup

Use:

- Web service: Docker app from this repository
- PostgreSQL: managed database
- Redis: optional managed Redis
- PayPal: Sandbox REST credentials
- WhatsApp: leave empty until you connect Meta

## Render

This repository includes `render.yaml`.

1. Push the repository to GitHub.
2. In Render, create a new Blueprint from the repo.
3. Create a managed PostgreSQL database.
4. Copy its external or internal connection string into `DATABASE_URL`.
5. Set `DATABASE_SSL=true`.
6. Add PayPal Sandbox credentials:

```text
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_RETURN_URL=https://YOUR-RENDER-APP.onrender.com/?rt=demo-danny-4b&paypal=return#my-account
PAYPAL_CANCEL_URL=https://YOUR-RENDER-APP.onrender.com/?rt=demo-danny-4b&paypal=cancel#my-account
```

7. Deploy.

The health check is:

```text
/api/health
```

## Railway

1. Create a new project from GitHub.
2. Add a PostgreSQL plugin.
3. Deploy the Dockerfile service.
4. Set:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_SSL=true
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

## PayPal Sandbox

In PayPal Developer Dashboard:

1. Create or use a Sandbox REST app.
2. Copy `Client ID` and `Secret`.
3. Use a Sandbox personal account to approve test payments.

When credentials are set, SmartNeighbor creates a real PayPal Sandbox order and shows an approval link. After approval, capture can be called with the PayPal order id.

## Production Notes

- Use random, non-guessable resident magic-link tokens.
- Store only payment provider references, not card data.
- Use a real migration tool before production. The current app has lightweight startup migrations for MVP convenience.
- Use a managed PostgreSQL instance rather than the Docker Compose database.
