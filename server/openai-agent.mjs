const openAiApiKey = process.env.OPENAI_API_KEY ?? "";
const openAiModel = process.env.OPENAI_MODEL ?? "gpt-5.1";
const memoryByResident = new Map();

export function getAgentMemory(residentId) {
  return memoryByResident.get(residentId) ?? [];
}

function remember(residentId, entry) {
  const memory = getAgentMemory(residentId);
  memory.push({ ...entry, at: new Date().toISOString() });
  memoryByResident.set(residentId, memory.slice(-12));
}

export async function classifyWithOpenAI({ message, residentId }) {
  if (!openAiApiKey) return null;

  const priorMessages = getAgentMemory(residentId)
    .map((entry) => `${entry.role}: ${entry.content}`)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${openAiApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: openAiModel,
      instructions: [
        "You are SmartNeighbor Agent for an Israeli residential building committee app.",
        "Classify short Hebrew/English/Arabic/Russian resident or committee messages into one operational intent.",
        "Return only compact JSON with keys intent, confidence, urgency, reply_hebrew.",
        "Supported intents: payment_query, payment_reminder_request, maintenance_report, maintenance_status, emergency, provider_contact, provider_onboarding, resident_onboarding, vote_draft, expense_review, resident_announcement, committee_overview, borrow_item, lend_item, community_post, smalltalk.",
        "The agent should cover building committee work: maintenance, providers, payments, collection reminders, resident announcements, votes, expenses, resident/provider onboarding, shared items, and community posts.",
        "Do not classify building operations, committee tasks, payments, votes, expenses, provider work, leaks, elevator, lights, lobby, parking, gas, electricity, water, sewage, or cleaning issues as smalltalk."
      ].join(" "),
      input: `Resident id: ${residentId}\nRecent memory:\n${priorMessages || "none"}\nMessage:\n${message}`,
      text: {
        format: {
          type: "json_schema",
          name: "smartneighbor_intent",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              intent: { type: "string", enum: ["payment_query", "payment_reminder_request", "maintenance_report", "maintenance_status", "emergency", "provider_contact", "provider_onboarding", "resident_onboarding", "vote_draft", "expense_review", "resident_announcement", "committee_overview", "borrow_item", "lend_item", "community_post", "smalltalk"] },
              confidence: { type: "number" },
              urgency: { type: "string" },
              reply_hebrew: { type: "string" }
            },
            required: ["intent", "confidence", "urgency", "reply_hebrew"]
          },
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI agent failed: ${response.status} ${body}`);
  }

  const body = await response.json();
  const outputText = body.output_text ?? body.output?.flatMap((item) => item.content ?? []).find((part) => part.text)?.text;
  const parsed = JSON.parse(outputText);
  remember(residentId, { role: "user", content: message });
  remember(residentId, { role: "assistant", content: parsed.reply_hebrew });
  return parsed;
}
