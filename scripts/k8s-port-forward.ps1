$ErrorActionPreference = "Stop"
kubectl -n smartneighbor port-forward svc/smartneighbor 3000:80
