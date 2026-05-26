import { getResidentAccount, recordResidentPayment } from "./data.mjs";

const paypalMode = process.env.PAYPAL_MODE ?? "sandbox";
const paypalClientId = process.env.PAYPAL_CLIENT_ID ?? "";
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET ?? "";
const paypalBaseUrl = paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

function paypalConfigured() {
  return Boolean(paypalClientId && paypalClientSecret);
}

export function getPayPalConfig() {
  return {
    configured: paypalConfigured(),
    mode: paypalMode,
    clientId: paypalClientId || null
  };
}

async function getPayPalAccessToken() {
  const credentials = Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString("base64");
  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${credentials}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PayPal token failed: ${response.status} ${body}`);
  }

  const body = await response.json();
  return body.access_token;
}

export async function createPayPalOrder({ token, amount, returnUrl, cancelUrl }) {
  const account = await getResidentAccount(token);
  if (!account) return { ok: false, status: 403, body: { error: "invalid_magic_link" } };

  const numericAmount = Number(amount || account.balance.open);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { ok: false, status: 400, body: { error: "invalid_amount" } };
  }

  if (!paypalConfigured()) {
    return {
      ok: true,
      status: 200,
      body: {
        mode: "mock",
        orderId: `MOCK-PAYPAL-${Date.now()}`,
        amount: numericAmount,
        currency: "ILS",
        message: "PayPal credentials are not configured, so this is a sandbox mock order."
      }
    };
  }

  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      "paypal-request-id": `smartneighbor-${Date.now()}`
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: account.resident.id,
        description: `SmartNeighbor balance for apartment ${account.resident.apartment}`,
        amount: {
          currency_code: "ILS",
          value: numericAmount.toFixed(2)
        }
      }],
      application_context: {
        brand_name: "SmartNeighbor",
        landing_page: "BILLING",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: returnUrl ?? process.env.PAYPAL_RETURN_URL ?? "http://127.0.0.1:3000/?rt=demo-danny-4b&paypal=return#my-account",
        cancel_url: cancelUrl ?? process.env.PAYPAL_CANCEL_URL ?? "http://127.0.0.1:3000/?rt=demo-danny-4b&paypal=cancel#my-account"
      }
    })
  });

  const body = await response.json();
  return { ok: response.ok, status: response.status, body: { mode: "paypal", ...body } };
}

export async function capturePayPalOrder({ token, orderId, amount }) {
  const account = await getResidentAccount(token);
  if (!account) return { ok: false, status: 403, body: { error: "invalid_magic_link" } };

  const numericAmount = Number(amount || account.balance.open);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { ok: false, status: 400, body: { error: "invalid_amount" } };
  }

  if (!paypalConfigured() || String(orderId).startsWith("MOCK-PAYPAL-")) {
    const result = await recordResidentPayment({
      token,
      amount: numericAmount,
      method: "paypal",
      providerReference: orderId ?? `MOCK-PAYPAL-${Date.now()}`
    });
    return { ok: true, status: 200, body: { mode: "mock", captured: true, ...result } };
  }

  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    }
  });
  const body = await response.json();

  if (!response.ok) return { ok: false, status: response.status, body };

  const result = await recordResidentPayment({
    token,
    amount: numericAmount,
    method: "paypal",
    providerReference: orderId
  });
  return { ok: true, status: 200, body: { mode: "paypal", providerResponse: body, ...result } };
}
