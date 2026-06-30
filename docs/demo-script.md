# SmartNeighbor - תסריט דמו להצגה

## מטרה

תסריט קצר שמראה את הפרויקט בשלוש דקות: הבעיה, הפתרון, והוכחה שהמערכת רצה עם Docker וכוללת Kubernetes.

## לפני ההצגה

הרץ:

```powershell
docker compose --env-file .env up -d --build
```

פתח:

```text
http://127.0.0.1:3000/?rt=demo-danny-4b#my-account
```

אם צריך לאפס חוב דמו, השתמש בכפתור:

```text
איפוס חוב דמו לבדיקה נוספת
```

או דרך API:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/demo/reset-account -ContentType 'application/json' -Body '{"token":"demo-danny-4b"}'
```

## פתיחה

"הפרויקט שלי נקרא SmartNeighbor. הוא פותר בעיה של ניהול בניין מגורים: תשלומי ועד, תחזוקה, הודעות ודיירים - הכל מתנהל היום ב-Telegram בצורה לא מסודרת. המטרה היא לשמור על הפשטות של Telegram, אבל להוסיף מאחורי הקלעים מערכת ניהול מסודרת."

## שלב 1 - שוק

להציג:

- Telegram הוא הכלי הקיים, אבל אין בו מבנה.
- Bllink ו-Darimpo נותנים פתרונות ניהול/תשלומים.
- הפער: אין מוצר שמחבר Telegram-first, תשלומים, תחזוקה, קהילה ו-Agent.

משפט מרכזי:

"SmartNeighbor לא מנסה להחליף את Telegram, אלא לבנות מעליו שכבת ניהול חכמה."

## שלב 2 - פונקציונליות

להראות באתר:

1. חשבון דייר:
   - דני לוי.
   - דירה 4ב.
   - מאזן לתשלום.
   - חיובים ותנועות.

2. תשלום:
   - כפתורי PayPal Sandbox ו-BIT.
   - להסביר ש-PayPal יוצר order אמיתי ב-Sandbox.
   - BIT כרגע simulator כי API אמיתי דורש Open Banking credentials.

3. Agent:
   - לכתוב: `יש הצפה בחניון`
   - להראות שה-Agent מזהה חירום/תקלה.

4. Telegram feed:
   - לשלוח הודעה מקומית.
   - להראות שהיא מופיעה בפיד בלי לקפוץ למעלה.

5. תחזוקה וקהילה:
   - להראות טיקטים.
   - להראות לוח קהילה.
   - להראות ספריית חפצים.

## שלב 3 - Docker/Kubernetes

להראות בקצרה:

```powershell
docker ps
```

ולהסביר:

- `smartneighbor` הוא השרת.
- `postgres` הוא מסד הנתונים.
- `redis` הוא תשתית cache/queue.
- `adminer` הוא כלי ניהול DB.

להראות שיש Kubernetes:

```powershell
kubectl kustomize k8s
```

משפט מרכזי:

"Docker מריץ את סביבת הדמו המלאה. Kubernetes מראה איך הפרויקט יכול לעבור לסביבת ענן production-like."

## שאלות ותשובות מוכנות

### האם זה מחובר ל-Telegram אמיתי?

הפרויקט כולל webhook אמיתי ל-Telegram Bot API, אך בדמו המקומי הוא עובד כ-simulator. חיבור אמיתי דורש BotFather token ו-webhook ציבורי.

### האם התשלום אמיתי?

PayPal עובד ב-Sandbox, כלומר יוצר order אמיתי בסביבת בדיקות. BIT עובד כסימולטור כי חיבור אמיתי דורש הרשאות Open Banking ותעודות חתימה.

### למה Magic Link בלי login?

כדי להקטין חיכוך לדיירים. כל דייר מקבל קישור אישי שרואה רק את הנתונים שלו. ב-production צריך token חזק, תוקף מוגבל ו-2FA לפעולות ועד.

### למה Kubernetes אם זה רץ ב-Docker?

Docker מספיק לדמו מקומי. Kubernetes מראה מוכנות לפריסה בענן, replicas, restart, scaling ו-secrets.

## סיום

"התוצאה היא MVP עובד שמדגים מוצר אמיתי: יש אפיון שוק, מפרט פונקציונלי, ותשתית Docker/Kubernetes. החלקים החיצוניים כמו Telegram production, BIT production ו-PayPal live מוכנים ברמת adapter ודורשים הרשאות ספקים אמיתיות."
