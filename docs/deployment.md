# SmartNeighbor Deployment

## Local Docker Stack

Services:

- `smartneighbor`: Node web/API app on port `3000`
- `postgres`: PostgreSQL 16 on port `5432`
- `redis`: Redis 7 on port `6379`
- `adminer`: DB UI on port `8080`

Start:

Windows PowerShell:

```powershell
.\scripts\docker-up.ps1 -Build -Detached
```

Linux / WSL:

```bash
chmod +x scripts/*.sh
./scripts/docker-up.sh --build --detached
```

Smoke test:

Windows PowerShell:

```powershell
.\scripts\docker-smoke.ps1
```

Linux / WSL:

```bash
./scripts/docker-smoke.sh
```

Stop:

Windows PowerShell:

```powershell
.\scripts\docker-down.ps1
```

Linux / WSL:

```bash
./scripts/docker-down.sh
```

Reset volumes:

Windows PowerShell:

```powershell
.\scripts\docker-down.ps1 -Volumes
```

Linux / WSL:

```bash
./scripts/docker-down.sh --volumes
```

Adminer login:

```text
System: PostgreSQL
Server: postgres
Username: smartneighbor
Password: smartneighbor
Database: smartneighbor
```

## Kubernetes Stack

Kubernetes resources:

- Namespace: `smartneighbor`
- App Deployment + Service
- PostgreSQL StatefulSet + PVC
- Redis Deployment + Service
- ConfigMap + Secret
- Ingress for `smartneighbor.local`
- HPA
- PodDisruptionBudget

Deploy:

Windows PowerShell:

```powershell
.\scripts\k8s-deploy.ps1 -BuildImage
```

Linux / WSL:

```bash
./scripts/k8s-deploy.sh --build-image
```

Check status:

Windows PowerShell:

```powershell
.\scripts\k8s-status.ps1
```

Linux / WSL:

```bash
./scripts/k8s-status.sh
```

Open locally:

Windows PowerShell:

```powershell
.\scripts\k8s-port-forward.ps1
```

Linux / WSL:

```bash
./scripts/k8s-port-forward.sh
```

Then browse:

```text
http://127.0.0.1:3000
```

Delete:

Windows PowerShell:

```powershell
.\scripts\k8s-delete.ps1
```

Linux / WSL:

```bash
./scripts/k8s-delete.sh
```

## Production Notes

- Replace `k8s/secret.example.yaml` values before using a real cluster.
- Use a managed PostgreSQL instance for production instead of the included StatefulSet.
- Use a managed Redis instance if session/cache durability matters.
- Add TLS through cert-manager or the cloud provider ingress controller.
- Push the image to a registry and update `k8s/app.yaml` or use `kubectl set image`.

## Resident Magic Links

The demo avoids login by using a resident-scoped token in the URL:

```text
http://127.0.0.1:3000?rt=demo-danny-4b#my-account
```

In production, these tokens should be random, long-lived but revocable, and scoped to read/pay only for one resident. Sensitive committee operations should still require stronger authentication.
