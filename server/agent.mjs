import { createMaintenanceTicket, items, providers, residents } from "./data.mjs";
import { recordAudit } from "./audit.mjs";
import { classifyWithOpenAI } from "./openai-agent.mjs";

const emergencyWords = ["גז", "שריפה", "עשן", "הצפה", "חשמל חשוף", "מסוכן", "פציעה"];
const maintenanceWords = ["תקלה", "נזילה", "מעלית", "נורה", "לחות", "ריח", "חניון", "לובי", "חשמל", "מים", "ביוב"];
const paymentWords = ["לשלם", "תשלום", "ועד", "חייב", "חוב", "שילמתי"];
const borrowWords = ["להשאיל", "מלווה", "צריך", "לשאול", "מקדחה", "סולם"];
const lendWords = ["יש לי", "מוסיף", "יכול להשאיל", "להשאלה"];
const providerWords = ["ספק", "אינסטלטור", "חשמלאי", "גנן", "ניקיון", "טלפון"];

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function classifyPriority(text) {
  if (includesAny(text, emergencyWords)) return "P0";
  if (text.includes("דחוף") || text.includes("שוב") || text.includes("פעיל")) return "P1";
  if (text.includes("נורה") || text.includes("ניקיון") || text.includes("גינון")) return "P2";
  return "P3";
}

function extractLocation(text) {
  const locations = ["חניון", "לובי", "גג", "חדר מדרגות", "חדר אשפה", "קומה ג", "קומה 3", "כניסה"];
  return locations.find((location) => text.includes(location)) ?? "לא צוין";
}

function findItem(text) {
  return items.find((item) => text.includes("מקדחה") && item.name.includes("מקדחה"))
    ?? items.find((item) => text.includes("סולם") && item.name.includes("סולם"))
    ?? items.find((item) => item.status === "available");
}

function findProvider(text) {
  if (text.includes("אינסטלטור") || text.includes("גז") || text.includes("מים")) {
    return providers.find((provider) => provider.domain.includes("אינסטלציה"));
  }
  if (text.includes("חשמל") || text.includes("חשמלאי")) {
    return providers.find((provider) => provider.domain.includes("חשמל"));
  }
  if (text.includes("ניקיון")) {
    return providers.find((provider) => provider.domain.includes("ניקיון"));
  }
  return providers[0];
}

function classifyCategory(text) {
  if (text.includes("גז")) return "gas";
  if (text.includes("חשמל") || text.includes("נורה")) return "electricity";
  if (text.includes("מים") || text.includes("נזילה") || text.includes("ביוב") || text.includes("הצפה")) return "plumbing";
  if (text.includes("מעלית")) return "elevator";
  if (text.includes("ניקיון") || text.includes("אשפה")) return "cleaning";
  return "general";
}

function createTicketTitle(text, category) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 48) return cleaned || "דיווח תחזוקה";
  const categoryLabel = {
    gas: "דיווח גז",
    electricity: "דיווח חשמל",
    plumbing: "דיווח אינסטלציה",
    elevator: "דיווח מעלית",
    cleaning: "דיווח ניקיון",
    general: "דיווח תחזוקה"
  }[category] ?? "דיווח תחזוקה";
  return categoryLabel;
}

async function persistAgentActions(result, { text, residentId }) {
  const ticketAction = result.actions?.find((action) => action.type === "ticket_draft");
  const shouldCreateTicket = ticketAction || ["maintenance_report", "emergency"].includes(result.intent);
  if (!shouldCreateTicket) return result;

  const category = classifyCategory(text);
  const ticket = await createMaintenanceTicket({
    actorId: residentId,
    reporterId: residentId,
    title: createTicketTitle(text, category),
    description: text,
    category,
    priority: ticketAction?.priority ?? (result.intent === "emergency" ? "P0" : "P3"),
    status: result.intent === "emergency" ? "assigned" : "open",
    location: ticketAction?.location ?? extractLocation(text),
    providerId: ticketAction?.providerId ?? findProvider(text)?.id ?? null
  });

  return {
    ...result,
    ticket,
    actions: [
      ...(result.actions ?? []).filter((action) => action.type !== "ticket_draft"),
      { type: "ticket_created", ticketId: ticket.id, priority: ticket.priority, location: ticket.location }
    ],
    reply: result.reply
      .replace("פתחתי טיוטת קריאת תחזוקה", `פתחתי קריאת תחזוקה ${ticket.id}`)
      .replace("פתחתי טיוטת קריאת P0", `פתחתי קריאת חירום ${ticket.id}`)
  };
}

export function handleAgentMessage({ message, residentId = "res-1" }) {
  const text = String(message ?? "").trim();
  const normalized = text.toLowerCase();
  const resident = residents.find((entry) => entry.id === residentId) ?? residents[0];

  if (!text) {
    return {
      intent: "smalltalk",
      reply: "אפשר לכתוב לי על תשלום, תקלה, השאלת חפץ, ספק או פרסום לקהילה.",
      actions: []
    };
  }

  if (includesAny(normalized, paymentWords)) {
    if (resident.balanceDue > 0) {
      return {
        intent: "payment_query",
        reply: `מצאתי יתרה פתוחה לדירה ${resident.apartment}: ₪${resident.balanceDue}. אפשר לשלם עכשיו בכרטיס, Bit או העברה בנקאית.`,
        actions: [
          { type: "payment_link", label: "שלם עכשיו", url: `/pay/${resident.id}` },
          { type: "remind_later", label: "תזכר לי מחר" }
        ]
      };
    }

    return {
      intent: "payment_query",
      reply: `החשבון של ${resident.name} מעודכן. אין חוב פתוח לחודש הנוכחי.`,
      actions: []
    };
  }

  if (includesAny(normalized, maintenanceWords) || includesAny(normalized, emergencyWords)) {
    const priority = classifyPriority(normalized);
    const location = extractLocation(normalized);
    const provider = findProvider(normalized);
    const emergency = priority === "P0";

    return {
      intent: emergency ? "emergency" : "maintenance_report",
      reply: emergency
        ? `זיהיתי דיווח חירום. פתחתי טיוטת קריאת P0, מיקום: ${location}. הוועד יקבל התראה מיידית והספק המומלץ הוא ${provider.name}.`
        : `פתחתי טיוטת קריאת תחזוקה. מיקום: ${location}, עדיפות: ${priority}. לאישור סופי אפשר לצרף תמונה או לשלוח "אשר".`,
      actions: [
        { type: "ticket_draft", priority, location, providerId: provider.id },
        ...(emergency ? [{ type: "notify_committee", channel: "whatsapp_sms" }] : [])
      ]
    };
  }

  if (includesAny(normalized, lendWords) && includesAny(normalized, borrowWords)) {
    return {
      intent: "lend_item",
      reply: "מעולה. אוסיף את הפריט לספריית החפצים כטיוטה. כדי להשלים, כתוב לי לכמה ימים מותר להשאיל ומה התנאים.",
      actions: [{ type: "item_draft" }]
    };
  }

  if (includesAny(normalized, borrowWords)) {
    const item = findItem(normalized);
    if (!item) {
      return {
        intent: "borrow_item",
        reply: "לא מצאתי כרגע פריט מתאים בספריית הבניין. אפשר לפרסם בקשה בלוח הקהילה.",
        actions: [{ type: "community_post_draft" }]
      };
    }

    return {
      intent: "borrow_item",
      reply: `מצאתי ${item.name} אצל ${item.owner} (דירה ${item.apartment}), סטטוס: ${item.status === "available" ? "זמין" : "לא זמין כרגע"}. לשלוח בקשת השאלה?`,
      actions: [{ type: "borrow_request", itemId: item.id, owner: item.owner }]
    };
  }

  if (includesAny(normalized, providerWords)) {
    const provider = findProvider(normalized);
    return {
      intent: "provider_contact",
      reply: `הספק המתאים הוא ${provider.name}, תחום: ${provider.domain}, טלפון: ${provider.phone}, דירוג: ${provider.rating}/5.`,
      actions: [{ type: "provider_contact", providerId: provider.id }]
    };
  }

  return {
    intent: "community_post",
    reply: "זה נשמע כמו הודעה קהילתית. האם לפרסם אותה גם בלוח הקהילה הרשמי?",
    actions: [{ type: "community_post_draft", body: text }]
  };
}

export async function handleAgentMessageAsync({ message, residentId = "res-1" }) {
  const text = String(message ?? "").trim();
  const rulesResult = handleAgentMessage({ message, residentId });
  const rulesConfidence = rulesResult.intent === "community_post" ? 0.55 : 0.9;
  const rulesFoundSpecificIntent = !["community_post", "smalltalk"].includes(rulesResult.intent);

  if (rulesFoundSpecificIntent) {
    const result = {
      ...rulesResult,
      confidence: rulesConfidence,
      urgency: rulesResult.intent === "emergency" ? "critical" : "medium",
      actions: rulesResult.actions ?? []
    };
    await recordAudit({
      actorId: residentId,
      action: "agent_decision",
      entityType: "agent",
      entityId: `agent-${Date.now()}`,
      metadata: { provider: "rules_precheck", intent: result.intent, confidence: result.confidence, urgency: result.urgency }
    });
    return persistAgentActions(result, { text, residentId });
  }

  try {
    const ai = await classifyWithOpenAI({ message, residentId });
    if (ai) {
      const aiMissedSpecificIntent = ["community_post", "smalltalk"].includes(ai.intent);
      const useRulesGuard = rulesFoundSpecificIntent && (ai.intent !== rulesResult.intent || aiMissedSpecificIntent || Number(ai.confidence) < 0.82);
      const selected = useRulesGuard
        ? { ...rulesResult, confidence: Math.max(rulesConfidence, 0.9), urgency: rulesResult.intent === "emergency" ? "critical" : "medium" }
        : {
            intent: ai.intent,
            confidence: ai.confidence,
            urgency: ai.urgency,
            reply: ai.reply_hebrew,
            actions: ai.confidence < 0.7 ? [{ type: "escalate_to_committee", reason: "low_confidence" }] : []
          };
      const result = {
        ...selected,
        actions: selected.actions ?? []
      };
      await recordAudit({
        actorId: residentId,
        action: "agent_decision",
        entityType: "agent",
        entityId: `agent-${Date.now()}`,
        metadata: {
          provider: useRulesGuard ? "openai_rules_guard" : "openai",
          intent: result.intent,
          confidence: result.confidence,
          urgency: result.urgency,
          aiIntent: ai.intent,
          rulesIntent: rulesResult.intent
        }
      });
      return persistAgentActions(result, { text, residentId });
    }
  } catch (error) {
    await recordAudit({
      actorId: residentId,
      action: "agent_ai_fallback",
      entityType: "agent",
      entityId: `agent-${Date.now()}`,
      metadata: { message: error.message }
    });
  }

  const result = rulesResult;
  result.confidence = result.intent === "community_post" ? 0.55 : 0.86;
  if (result.confidence < 0.7) {
    result.actions.push({ type: "escalate_to_committee", reason: "low_confidence" });
  }
  await recordAudit({
    actorId: residentId,
    action: "agent_decision",
    entityType: "agent",
    entityId: `agent-${Date.now()}`,
    metadata: { provider: "rules", intent: result.intent, confidence: result.confidence }
  });
  return persistAgentActions(result, { text, residentId });
}
