import { sendWhatsAppText } from "./whatsapp.mjs";
import { recordAudit } from "./audit.mjs";

export const notifications = [];

export async function enqueueNotification({ type, channel = "in_app", to = null, message, metadata = {} }) {
  const notification = {
    id: `notif-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    channel,
    to,
    message,
    metadata,
    status: "queued",
    createdAt: new Date().toISOString()
  };
  notifications.push(notification);
  await recordAudit({
    actorId: metadata.actorId ?? null,
    action: "notification_queued",
    entityType: "notification",
    entityId: notification.id,
    metadata: { type, channel, to }
  });
  return notification;
}

export async function sendNotification(notification) {
  if (notification.channel === "whatsapp") {
    const delivery = await sendWhatsAppText({ to: notification.to, text: notification.message });
    notification.status = delivery.mode === "mock" ? "mock_sent" : "sent";
    notification.delivery = delivery;
    return notification;
  }

  notification.status = "in_app_ready";
  return notification;
}

export async function queuePaymentReminder({ resident, amount }) {
  return enqueueNotification({
    type: "payment_reminder",
    channel: "in_app",
    to: resident.id,
    message: `תזכורת תשלום: יתרה פתוחה ${amount} ₪ לדירה ${resident.apartment}.`,
    metadata: { residentId: resident.id }
  });
}

export async function queueEmergencyAlert({ ticket, provider }) {
  return enqueueNotification({
    type: "emergency_alert",
    channel: "in_app",
    message: `תקלה דחופה ${ticket.priority}: ${ticket.title}. ספק מומלץ: ${provider?.name ?? "לא נבחר"}.`,
    metadata: { ticketId: ticket.id, providerId: provider?.id }
  });
}

export function listNotifications() {
  return notifications.slice().reverse();
}
