# SmartNeighbor - שלב 3: Docker ו-Kubernetes

## מטרת השלב

בשלב זה המטרה היא להראות שהפרויקט אינו רק רעיון או מסך HTML, אלא אפליקציה שניתן להריץ בסביבת שרת מודרנית:

- Docker עבור אריזת האפליקציה.
- Docker Compose עבור סביבת פיתוח מלאה.
- Kubernetes עבור תכנון פריסה production-like.

## מה Docker עושה בפרויקט

Docker אורז את SmartNeighbor כ-image שמכיל:

- Node runtime.
- קוד השרת.
- קבצי frontend.
- תלויות npm.
- פקודת הפעלה.

היתרון: אותה אפליקציה יכולה לרוץ במחשב המקומי, בשרת או בענן בצורה עקבית.

## מה Docker Compose עושה

Docker Compose מריץ כמה שירותים יחד:

| שירות | תפקיד |
|---|---|
| smartneighbor | Node API + frontend |
| postgres | מסד נתונים |
| redis | cache/תשתית עתידית לתורים |
| adminer | ממשק ניהול למסד הנתונים |

פקודת הרצה:

```powershell
docker compose --env-file .env up -d --build
```

בדיקת בריאות:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

בדיקת מוכנות:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/ready
```

## מה Kubernetes עושה בפרויקט

Kubernetes הוא שכבת ניהול לקונטיינרים. בפרויקט הוא מדגים איך SmartNeighbor יכול לרוץ בסביבת production:

- Deployment לאפליקציה.
- Service לחשיפה פנימית.
- Ingress לחשיפה חיצונית דרך דומיין.
- ConfigMap להגדרות.
- Secret לסודות.
- StatefulSet ל-PostgreSQL.
- Redis Deployment.
- HPA ל-autoscaling.
- PDB לשמירה על זמינות בזמן עדכונים.
- NetworkPolicy להגבלת תעבורה.

## מיפוי קבצים

| קובץ | תפקיד |
|---|---|
| Dockerfile | בניית image לאפליקציה |
| docker-compose.yml | הרצת app + postgres + redis + adminer |
| .env.example | משתני סביבה לדמו |
| k8s/app.yaml | Deployment ו-Service לאפליקציה |
| k8s/postgres.yaml | PostgreSQL StatefulSet |
| k8s/redis.yaml | Redis |
| k8s/configmap.yaml | הגדרות לא סודיות |
| k8s/secret.example.yaml | תבנית secrets |
| k8s/ingress.yaml | חשיפה דרך דומיין |
| k8s/hpa.yaml | autoscaling |
| k8s/networkpolicy.yaml | אבטחת רשת |

## ארכיטקטורה טכנית

```text
Browser / PWA
    |
    v
SmartNeighbor Node App
    |
    +-- PostgreSQL
    +-- Redis
    +-- PayPal Sandbox API
    +-- BIT Adapter
    +-- WhatsApp Webhook
```

ב-Docker Compose כל הרכיבים רצים באותו מחשב.

ב-Kubernetes כל רכיב הוא resource מנוהל, וניתן להריץ כמה replicas לאפליקציה.

## סביבת דמו מול Production

| נושא | דמו מקומי | Production |
|---|---|---|
| App | Docker container | Docker image בענן |
| DB | PostgreSQL container | Managed PostgreSQL |
| Redis | Redis container | Managed Redis |
| Secrets | .env | Kubernetes Secret / Cloud Secret Manager |
| Domain | localhost | דומיין אמיתי |
| HTTPS | לא חובה | חובה |
| Scaling | ידני | HPA/Cloud autoscaling |
| Payments | Sandbox/simulator | ספק סליקה Live |
| WhatsApp | webhook scaffold | Meta app מאומת |

## למה לא חייבים Kubernetes עכשיו

ל-MVP ודמו מקומי Docker Compose מספיק. Kubernetes נדרש כאשר:

- רוצים להריץ בענן רציני.
- יש כמה משתמשים אמיתיים.
- צריך זמינות גבוהה.
- צריך scaling.
- רוצים deployment מסודר עם replicas ו-rolling updates.

לכן הפרויקט כולל Kubernetes כדי להראות מוכנות, אבל לא חייבים להפעיל אותו בשביל הדמו.

## פקודות הגשה מומלצות

להרצה:

```powershell
docker compose --env-file .env up -d --build
```

בדיקות:

```powershell
npm test
```

בדיקת Kubernetes YAML:

```powershell
kubectl kustomize k8s
```

פתיחת האתר:

```text
http://127.0.0.1:3000/?rt=demo-danny-4b#my-account
```

## מה להדגיש בהצגה

- האפליקציה לא תלויה בהרצה ידנית של Node בלבד.
- יש מסד נתונים אמיתי.
- יש הפרדה בין config ל-secrets.
- יש health checks.
- יש manifests מוכנים ל-Kubernetes.
- יש Docker Compose שמרים סביבה מלאה.

## מגבלות טכניות

- Kubernetes לא הופך את הפרויקט אוטומטית לענן. צריך cluster אמיתי.
- Postgres בתוך Kubernetes מתאים לדמו, אך production עדיף עם managed database.
- PayPal עובד ב-Sandbox.
- BIT הוא simulator עד לקבלת הרשאות Open Banking.
- WhatsApp API דורש business verification ו-webhook ציבורי.
