import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleAgentMessageAsync } from "./agent.mjs";
import { listAuditEvents } from "./audit.mjs";
import { captureBitPayment, createBitPayment, getBitConfig } from "./bit.mjs";
import { communityPosts, createProvider, createResident, createResidentCharge, createVote, approveExpense, getDashboard, getResidentAccount, items, listMaintenanceTickets, payments, providers, recordResidentPayment, resetResidentDemoAccount, residents, updatePaymentStatus, votes } from "./data.mjs";
import { listNotifications, queuePaymentReminder } from "./notifications.mjs";
import { capturePayPalOrder, createPayPalOrder, getPayPalConfig } from "./paypal.mjs";
import { demoResetEnabled, requireRole } from "./security.mjs";
import { handleIncomingTelegramWebhook, telegramMessages, verifyTelegramSecret } from "./telegram.mjs";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(rootDir, "public");
const port = Number(process.env.PORT ?? 3000);
const startedAt = new Date().toISOString();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function getPublicOrigin(req, url) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const protocol = proto || url.protocol.replace(":", "");
  return `${protocol}://${url.host}`;
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

export async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, {
      status: "ok",
      service: "smartneighbor",
      version: process.env.APP_VERSION ?? "0.1.0",
      startedAt
    });
  }

  if (req.method === "GET" && url.pathname === "/api/ready") {
    return json(res, 200, {
      status: "ready",
      checks: {
        http: "ok",
        databaseConfigured: Boolean(process.env.DATABASE_URL),
        databaseMode: process.env.DATABASE_MODE ?? "memory",
        redisConfigured: Boolean(process.env.REDIS_URL),
        telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN)
      }
    });
  }

  if (req.method === "GET" && url.pathname === "/api/app/config") {
    return json(res, 200, {
      demoResetEnabled,
      openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
      notifications: ["in_app", "telegram"],
      committee2faRequired: Boolean(process.env.COMMITTEE_2FA_CODE)
    });
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    return json(res, 200, await getDashboard());
  }

  if (req.method === "GET" && url.pathname === "/api/sync") {
    const token = url.searchParams.get("token");
    const [dashboard, account, maintenanceTickets] = await Promise.all([
      getDashboard(),
      token ? getResidentAccount(token) : null,
      listMaintenanceTickets()
    ]);

    return json(res, 200, {
      syncedAt: new Date().toISOString(),
      dashboard,
      account,
      tickets: maintenanceTickets,
      payments,
      telegramMessages,
      communityPosts,
      items
    });
  }

  if (req.method === "GET" && url.pathname === "/api/me") {
    const account = await getResidentAccount(url.searchParams.get("token"));
    if (!account) return json(res, 403, { error: "invalid_magic_link" });
    return json(res, 200, account);
  }

  if (req.method === "GET" && url.pathname === "/api/residents") return json(res, 200, residents);
  if (req.method === "GET" && url.pathname === "/api/payments") return json(res, 200, payments);
  if (req.method === "GET" && url.pathname === "/api/tickets") return json(res, 200, await listMaintenanceTickets());
  if (req.method === "GET" && url.pathname === "/api/providers") return json(res, 200, providers);
  if (req.method === "GET" && url.pathname === "/api/community") return json(res, 200, communityPosts);
  if (req.method === "GET" && url.pathname === "/api/items") return json(res, 200, items);
  if (req.method === "GET" && url.pathname === "/api/votes") return json(res, 200, votes);
  if (req.method === "GET" && url.pathname === "/api/telegram/messages") return json(res, 200, telegramMessages);
  if (req.method === "GET" && url.pathname === "/api/paypal/config") return json(res, 200, getPayPalConfig());
  if (req.method === "GET" && url.pathname === "/api/bit/config") return json(res, 200, getBitConfig());
  if (req.method === "GET" && url.pathname === "/api/notifications") return json(res, 200, listNotifications());

  if (req.method === "POST" && url.pathname === "/api/telegram/local-message") {
    try {
      const body = await parseBody(req);
      if (!body.text) return json(res, 400, { error: "missing_text" });
      return json(res, 200, await handleIncomingTelegramWebhook({
        update_id: Date.now(),
        message: {
          message_id: Date.now(),
          date: Math.floor(Date.now() / 1000),
          chat: { id: body.chatId ?? 123456789, type: body.chatType ?? "group", title: body.chatTitle ?? "בניין רוטשילד 24" },
          from: { id: body.fromId ?? 987654321, username: body.from ?? "resident" },
          text: body.text
        }
      }));
    } catch (error) {
      return json(res, 400, { error: "telegram_local_message_failed", message: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/payments/demo-card") {
    try {
      const body = await parseBody(req);
      if (!body.token) return json(res, 403, { error: "invalid_magic_link" });
      if (!body.cardLast4) return json(res, 400, { error: "missing_demo_card" });
      const result = await recordResidentPayment({
        token: body.token,
        amount: body.amount,
        method: "paypal_demo_card",
        providerReference: `DEMO-CARD-${body.cardLast4}-${Date.now()}`
      });
      if (!result) return json(res, 403, { error: "invalid_magic_link" });
      return json(res, 200, { mode: "demo", captured: true, ...result });
    } catch (error) {
      return json(res, 400, { error: "payment_failed", message: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/paypal/create-order") {
    try {
      const result = await createPayPalOrder(await parseBody(req));
      return json(res, result.status, result.body);
    } catch (error) {
      return json(res, 502, { error: "paypal_create_failed", message: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/paypal/capture-order") {
    try {
      const result = await capturePayPalOrder(await parseBody(req));
      return json(res, result.status, result.body);
    } catch (error) {
      return json(res, 502, { error: "paypal_capture_failed", message: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/bit/create-payment") {
    try {
      const result = await createBitPayment(await parseBody(req));
      return json(res, result.status, result.body);
    } catch (error) {
      return json(res, 502, { error: "bit_create_failed", message: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/bit/capture-payment") {
    try {
      const result = await captureBitPayment(await parseBody(req));
      return json(res, result.status, result.body);
    } catch (error) {
      return json(res, 502, { error: "bit_capture_failed", message: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/demo/reset-account") {
    if (!demoResetEnabled) return json(res, 403, { error: "demo_reset_disabled" });
    try {
      const body = await parseBody(req);
      if (!body.token) return json(res, 403, { error: "invalid_magic_link" });
      const result = await resetResidentDemoAccount(body.token);
      if (!result) return json(res, 403, { error: "invalid_magic_link" });
      return json(res, 200, { reset: true, ...result });
    } catch (error) {
      return json(res, 400, { error: "reset_failed", message: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/agent/message") {
    try {
      const body = await parseBody(req);
      return json(res, 200, await handleAgentMessageAsync(body));
    } catch (error) {
      return json(res, 400, { error: "invalid_json", message: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/inbound/message") {
    try {
      const body = await parseBody(req);
      if (!body.text && !body.message) return json(res, 400, { error: "missing_text" });
      const result = await handleAgentMessageAsync({
        message: body.text ?? body.message,
        residentId: body.residentId ?? "res-1"
      });
      return json(res, 200, {
        channel: body.channel ?? "generic",
        from: body.from ?? "unknown",
        text: body.text ?? body.message,
        ...result
      });
    } catch (error) {
      return json(res, 400, { error: "inbound_failed", message: error.message });
    }
  }

  if (url.pathname.startsWith("/api/committee/")) {
    try {
      const body = req.method === "GET" ? {} : await parseBody(req);
      const auth = await requireRole({
        token: body.token || url.searchParams.get("token"),
        roles: ["committee", "chair"],
        twoFactorCode: body.twoFactorCode || req.headers["x-2fa-code"]
      });
      if (!auth.ok) return json(res, auth.status, auth.body);

      if (req.method === "POST" && url.pathname === "/api/committee/residents") {
        return json(res, 201, await createResident({ actorId: auth.user.id, ...body }));
      }
      if (req.method === "POST" && url.pathname === "/api/committee/charges") {
        return json(res, 201, await createResidentCharge({ actorId: auth.user.id, ...body }));
      }
      if (req.method === "POST" && url.pathname === "/api/committee/payments/status") {
        return json(res, 200, await updatePaymentStatus({ actorId: auth.user.id, ...body }));
      }
      if (req.method === "POST" && url.pathname === "/api/committee/votes") {
        return json(res, 201, await createVote({ actorId: auth.user.id, ...body }));
      }
      if (req.method === "POST" && url.pathname === "/api/committee/expenses/approve") {
        return json(res, 201, await approveExpense({ actorId: auth.user.id, ...body }));
      }
      if (req.method === "POST" && url.pathname === "/api/committee/providers") {
        return json(res, 201, await createProvider({ actorId: auth.user.id, ...body }));
      }
      if (req.method === "POST" && url.pathname === "/api/committee/notifications/payment-reminder") {
        return json(res, 201, await queuePaymentReminder({ resident: { id: body.residentId, apartment: body.apartment ?? "לא צוין" }, amount: body.amount }));
      }
      if (req.method === "GET" && url.pathname === "/api/committee/audit") {
        return json(res, 200, await listAuditEvents());
      }
    } catch (error) {
      return json(res, 400, { error: "committee_action_failed", message: error.message });
    }
  }

  return json(res, 404, { error: "not_found" });
}

async function handleTelegramWebhook(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  if (!verifyTelegramSecret(req.headers)) {
    return json(res, 403, { error: "invalid_telegram_secret" });
  }

  try {
    const body = await parseBody(req);
    const result = await handleIncomingTelegramWebhook(body);
    return json(res, 200, result);
  } catch (error) {
    return json(res, 400, { error: "telegram_webhook_failed", message: error.message });
  }
}

async function handlePayPalStart(req, res, url) {
  const token = url.searchParams.get("rt") || url.searchParams.get("token") || "demo-danny-4b";
  const amount = Number(url.searchParams.get("amount") || 1);
  const encodedToken = encodeURIComponent(token);
  const encodedAmount = encodeURIComponent(String(amount));
  const origin = getPublicOrigin(req, url);

  try {
    const result = await createPayPalOrder({
      token,
      amount,
      returnUrl: `${origin}/?rt=${encodedToken}&paypal=return&amount=${encodedAmount}#my-account`,
      cancelUrl: `${origin}/?rt=${encodedToken}&paypal=cancel#my-account`
    });

    if (!result.ok) return json(res, result.status, result.body);

    const approveLink = result.body.links?.find((link) => link.rel === "approve")?.href;
    if (!approveLink) return json(res, 502, { error: "missing_paypal_approval_link", result: result.body });

    res.writeHead(302, { location: approveLink });
    res.end();
  } catch (error) {
    return json(res, 502, { error: "paypal_redirect_failed", message: error.message });
  }
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = normalize(join(publicDir, requested));

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, { "content-type": mimeTypes[extname(filePath)] ?? "application/octet-stream" });
    res.end(content);
  } catch {
    const content = await readFile(join(publicDir, "index.html"));
    res.writeHead(200, { "content-type": mimeTypes[".html"] });
    res.end(content);
  }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname === "/webhooks/telegram") {
      await handleTelegramWebhook(req, res);
      return;
    }
    if (url.pathname === "/paypal/start") {
      await handlePayPalStart(req, res, url);
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  });
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  createServer().listen(port, () => {
    console.log(`SmartNeighbor is running on http://localhost:${port}`);
  });
}
