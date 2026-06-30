import { handleAgentMessageAsync } from "./agent.mjs";

const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";

export const telegramMessages = [];

function addTelegramMessage(message) {
  const entry = {
    id: message.id ?? `telegram-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: message.timestamp ?? new Date().toISOString(),
    ...message
  };
  telegramMessages.push(entry);
  return entry;
}

export function verifyTelegramSecret(headers) {
  if (!webhookSecret) return true;
  return headers["x-telegram-bot-api-secret-token"] === webhookSecret;
}

function extractTelegramTextMessage(payload) {
  const message = payload?.message ?? payload?.edited_message;
  if (!message?.text || !message?.chat?.id) return null;

  return {
    updateId: payload.update_id,
    messageId: message.message_id,
    chatId: message.chat.id,
    chatType: message.chat.type,
    from: message.from?.username
      ? `@${message.from.username}`
      : String(message.from?.id ?? message.chat.id),
    text: message.text,
    timestamp: message.date
      ? new Date(Number(message.date) * 1000).toISOString()
      : new Date().toISOString()
  };
}

function commandReply(text) {
  if (text.startsWith("/start") || text.startsWith("/help")) {
    return "שלום, אני SmartNeighbor. אפשר לכתוב לי למשל: \"אני צריך טכנאי\", \"יש נזילה בלובי\", או \"כמה אני חייב לועד\".";
  }
  return null;
}

export async function sendTelegramText({ chatId, text }) {
  const outbound = addTelegramMessage({
    direction: "outbound",
    chatId,
    from: "SmartNeighbor Bot",
    to: String(chatId),
    text,
    source: botToken ? "telegram" : "mock"
  });

  if (!botToken) {
    return {
      sent: false,
      mode: "mock",
      reason: "Missing TELEGRAM_BOT_TOKEN",
      message: outbound
    };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  const body = await response.json().catch(() => ({}));
  return {
    sent: response.ok,
    mode: "telegram",
    status: response.status,
    providerResponse: body,
    message: outbound
  };
}

export async function handleIncomingTelegramWebhook(payload) {
  const incoming = extractTelegramTextMessage(payload);
  if (!incoming) return { received: 0, ignored: true };

  addTelegramMessage({
    direction: "inbound",
    chatId: incoming.chatId,
    from: incoming.from,
    to: "SmartNeighbor Bot",
    text: incoming.text,
    timestamp: incoming.timestamp,
    source: "telegram"
  });

  const cannedReply = commandReply(incoming.text.trim());
  if (cannedReply) {
    const delivery = await sendTelegramText({ chatId: incoming.chatId, text: cannedReply });
    return { received: 1, inbound: incoming, command: true, delivery };
  }

  const agent = await handleAgentMessageAsync({ message: incoming.text, residentId: "res-1" });
  const delivery = await sendTelegramText({ chatId: incoming.chatId, text: agent.reply });
  return { received: 1, inbound: incoming, agent, delivery };
}
