import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../server/index.mjs";

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });
}

test("browser shell assets and payment flow are available", async () => {
  const server = createServer();
  const port = await listen(server);
  const base = `http://127.0.0.1:${port}`;
  try {
    for (const path of ["/", "/app.js", "/styles.css", "/manifest.webmanifest", "/sw.js"]) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 200, `${path} should load`);
    }

    const accountResponse = await fetch(`${base}/api/me?token=demo-danny-4b`);
    const account = await accountResponse.json();
    assert.equal(accountResponse.status, 200);
    assert.equal(account.resident.id, "res-1");

    const bitResponse = await fetch(`${base}/api/bit/create-payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "demo-danny-4b", amount: 1 })
    });
    const bit = await bitResponse.json();
    assert.equal(bitResponse.status, 200);
    assert.equal(bit.mode, "simulator");

    const paypalReturn = await fetch(`${base}/api/paypal/capture-order`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "demo-danny-4b", orderId: "MOCK-PAYPAL-E2E", amount: 1 })
    });
    const captured = await paypalReturn.json();
    assert.equal(paypalReturn.status, 200);
    assert.equal(captured.captured, true);
  } finally {
    server.close();
  }
});
