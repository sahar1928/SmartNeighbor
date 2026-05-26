import { handleAgentMessageAsync } from "./agent.mjs";

const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION ?? "v24.0";
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? "smartneighbor-dev-token";
const defaultRecipient = process.env.WHATSAPP_DEFAULT_TO ?? "972525452532";

export const whatsappMessages = [
  {
    id: "local-1",
    direction: "inbound",
    from: "קבוצת בניין רוטשילד 24",
    to: "SmartNeighbor Agent",
    text: "שוב יש ריח גז בחדר המדרגות בקומה ג'",
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    source: "demo"
  },
  {
    id: "local-2",
    direction: "outbound",
    from: "SmartNeighbor Agent",
    to: "קבוצת בניין רוטשילד 24",
    text: "זיהיתי דיווח חירום. פתחתי טיוטת קריאת P0, מיקום: חדר מדרגות. הוועד יקבל התראה מיידית.",
    timestamp: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    source: "demo"
  }
];

function addMessage(message) {
  const entry = {
    id: message.id ?? `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: message.timestamp ?? new Date().toISOString(),
    ...message
  };
  whatsappMessages.push(entry);
  return entry;
}

export function normalizeWhatsappPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
}

export function verifyWebhook(url) {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return { ok: true, challenge };
  }

  return { ok: false };
}

function extractIncomingMessages(payload) {
  const entries = payload?.entry ?? [];
  const messages = [];

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      for (const message of value.messages ?? []) {
        if (message.type !== "text") continue;
        messages.push({
          id: message.id,
          from: message.from,
          to: value.metadata?.display_phone_number ?? "SmartNeighbor Agent",
          text: message.text?.body ?? "",
          timestamp: message.timestamp
            ? new Date(Number(message.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
          source: "whatsapp"
        });
      }
    }
  }

  return messages;
}

export async function sendWhatsAppText({ to = defaultRecipient, text }) {
  const normalizedTo = normalizeWhatsappPhone(to);
  const outbound = addMessage({
    direction: "outbound",
    from: "SmartNeighbor Agent",
    to: normalizedTo,
    text,
    source: accessToken && phoneNumberId ? "whatsapp" : "mock"
  });

  if (!accessToken || !phoneNumberId) {
    return {
      sent: false,
      mode: "mock",
      reason: "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID",
      message: outbound
    };
  }

  const response = await fetch(`https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedTo,
      type: "text",
      text: {
        preview_url: false,
        body: text
      }
    })
  });

  const body = await response.json().catch(() => ({}));
  return {
    sent: response.ok,
    mode: "whatsapp",
    status: response.status,
    providerResponse: body,
    message: outbound
  };
}

export async function handleIncomingWebhook(payload) {
  const incoming = extractIncomingMessages(payload);
  const replies = [];

  for (const message of incoming) {
    addMessage({ ...message, direction: "inbound" });
    const agentResult = await handleAgentMessageAsync({ message: message.text, residentId: "res-1" });
    const delivery = await sendWhatsAppText({ to: message.from, text: agentResult.reply });
    replies.push({ inbound: message, agent: agentResult, delivery });
  }

  return { received: incoming.length, replies };
}

export async function addLocalWhatsappMessage({ text, from = "דייר חדש", to = "קבוצת בניין רוטשילד 24" }) {
  const inbound = addMessage({
    direction: "inbound",
    from,
    to,
    text,
    source: "local"
  });
  const agent = await handleAgentMessageAsync({ message: text, residentId: "res-1" });
  const outbound = addMessage({
    direction: "outbound",
    from: "SmartNeighbor Agent",
    to,
    text: agent.reply,
    source: "local"
  });
  return { inbound, agent, outbound };
}
