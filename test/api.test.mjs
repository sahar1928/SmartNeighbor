import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../server/index.mjs";

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });
}

test("health endpoint returns ok", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
  } finally {
    server.close();
  }
});

test("agent endpoint returns classified response", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/agent/message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "צריך סולם" })
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.intent, "borrow_item");
  } finally {
    server.close();
  }
});

test("whatsapp webhook verification returns challenge", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=smartneighbor-dev-token&hub.challenge=abc123`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.equal(body, "abc123");
  } finally {
    server.close();
  }
});

test("whatsapp webhook receives text and produces reply", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/webhooks/whatsapp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              metadata: { display_phone_number: "972300000000" },
              messages: [{
                id: "wamid.test",
                from: "972501234567",
                timestamp: "1779799200",
                type: "text",
                text: { body: "יש הצפה בחניון" }
              }]
            }
          }]
        }]
      })
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.received, 1);
    assert.equal(body.replies[0].agent.intent, "emergency");
  } finally {
    server.close();
  }
});

test("whatsapp send uses default recipient when to is omitted", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/whatsapp/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "בדיקת SmartNeighbor" })
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.mode, "mock");
    assert.equal(body.message.to, "972525452532");
  } finally {
    server.close();
  }
});

test("resident magic link returns only personal account", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/me?token=demo-danny-4b`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.resident.id, "res-1");
    assert.equal(body.balance.open > 0, true);
    assert.equal(body.charges.every((charge) => charge.residentId === "res-1"), true);
  } finally {
    server.close();
  }
});

test("bit simulator payment updates resident balance", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const createResponse = await fetch(`http://127.0.0.1:${port}/api/bit/create-payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "demo-danny-4b", amount: 1 })
    });
    const created = await createResponse.json();
    assert.equal(createResponse.status, 200);
    assert.equal(created.mode, "simulator");

    const captureResponse = await fetch(`http://127.0.0.1:${port}/api/bit/capture-payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "demo-danny-4b", paymentId: created.paymentId, amount: 1 })
    });
    const captured = await captureResponse.json();
    assert.equal(captureResponse.status, 200);
    assert.equal(captured.captured, true);
    assert.equal(captured.payment.method, "bit");
  } finally {
    server.close();
  }
});

test("demo reset reopens resident charges after payment", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    await fetch(`http://127.0.0.1:${port}/api/bit/capture-payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "demo-danny-4b", paymentId: "BIT-SIM-RESET-TEST", amount: 1 })
    });

    const response = await fetch(`http://127.0.0.1:${port}/api/demo/reset-account`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "demo-danny-4b" })
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.reset, true);
    assert.equal(body.account.balance.open > 0, true);
  } finally {
    server.close();
  }
});

test("paypal mock order can be created and captured", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const createResponse = await fetch(`http://127.0.0.1:${port}/api/paypal/create-order`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "demo-danny-4b", amount: 1 })
    });
    const created = await createResponse.json();
    assert.equal(createResponse.status, 200);
    assert.equal(created.mode, "mock");

    const captureResponse = await fetch(`http://127.0.0.1:${port}/api/paypal/capture-order`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "demo-danny-4b", orderId: created.orderId, amount: 1 })
    });
    const captured = await captureResponse.json();
    assert.equal(captureResponse.status, 200);
    assert.equal(captured.captured, true);
  } finally {
    server.close();
  }
});

test("app config exposes production safety switches", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/app/config`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(typeof body.demoResetEnabled, "boolean");
    assert.equal(Array.isArray(body.notifications), true);
  } finally {
    server.close();
  }
});

test("committee endpoints enforce role-based access", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const denied = await fetch(`http://127.0.0.1:${port}/api/committee/charges`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "demo-danny-4b", residentId: "res-1", title: "בדיקה", description: "בדיקה", amount: 1, dueDate: "2026-06-01" })
    });
    assert.equal(denied.status, 403);

    const allowed = await fetch(`http://127.0.0.1:${port}/api/committee/charges`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "demo-yossi-11", residentId: "res-1", title: "בדיקה", description: "בדיקה", amount: 1, dueDate: "2026-06-01" })
    });
    assert.equal(allowed.status, 201);
  } finally {
    server.close();
  }
});
