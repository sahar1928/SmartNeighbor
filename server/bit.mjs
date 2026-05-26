import { getResidentAccount, recordResidentPayment } from "./data.mjs";

const bitMode = process.env.BIT_MODE ?? "simulator";
const bitClientId = process.env.BIT_CLIENT_ID ?? "";
const bitClientSecret = process.env.BIT_CLIENT_SECRET ?? "";
const bitPaymentProduct = process.env.BIT_PAYMENT_PRODUCT ?? "domestic-credit-transfers";
const bitAuthorizationUrl = process.env.BIT_AUTHORIZATION_URL ?? "https://www.bitpay.co.il/app/open-banking";

function bitConfigured() {
  return Boolean(bitClientId && bitClientSecret && process.env.BIT_TPP_CERTIFICATE && process.env.BIT_PRIVATE_KEY);
}

function validateAmount(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid payment amount");
  }
  return numericAmount;
}

export function getBitConfig() {
  return {
    configured: bitConfigured(),
    mode: bitConfigured() ? bitMode : "simulator",
    paymentProduct: bitPaymentProduct
  };
}

export async function createBitPayment({ token, amount, returnUrl }) {
  const numericAmount = validateAmount(amount);
  const account = await getResidentAccount(token);
  if (!account) return { ok: false, status: 403, body: { error: "invalid_magic_link" } };

  if (!bitConfigured()) {
    const paymentId = `BIT-SIM-${Date.now()}`;
    return {
      ok: true,
      status: 200,
      body: {
        mode: "simulator",
        paymentId,
        status: "ACSP",
        amount: numericAmount,
        currency: "ILS",
        message: "BIT OpenAPI requires registered TPP credentials and signing certificates. This simulator records the same payment lifecycle for local development."
      }
    };
  }

  const authorizationUrl = new URL(bitAuthorizationUrl);
  authorizationUrl.searchParams.set("client_id", bitClientId);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "PIS");
  if (returnUrl) authorizationUrl.searchParams.set("redirect_uri", returnUrl);

  return {
    ok: true,
    status: 200,
    body: {
      mode: "bit",
      paymentProduct: bitPaymentProduct,
      amount: numericAmount,
      currency: "ILS",
      authorizationUrl: authorizationUrl.toString()
    }
  };
}

export async function captureBitPayment({ token, paymentId, amount }) {
  const numericAmount = validateAmount(amount);
  const account = await getResidentAccount(token);
  if (!account) return { ok: false, status: 403, body: { error: "invalid_magic_link" } };

  const result = await recordResidentPayment({
    token,
    amount: numericAmount,
    method: "bit",
    providerReference: paymentId ?? `BIT-SIM-${Date.now()}`
  });

  return {
    ok: true,
    status: 200,
    body: {
      mode: bitConfigured() ? "bit" : "simulator",
      captured: true,
      ...result
    }
  };
}
