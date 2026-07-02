import test from "node:test";
import assert from "node:assert/strict";
import { handleAgentMessage, handleAgentMessageAsync } from "../server/agent.mjs";

test("detects emergency maintenance reports", () => {
  const result = handleAgentMessage({ message: "יש ריח גז בחדר מדרגות בקומה ג" });
  assert.equal(result.intent, "emergency");
  assert.equal(result.actions[0].priority, "P0");
  assert.equal(result.actions.some((action) => action.type === "notify_committee"), true);
});

test("answers payment query for resident with open balance", () => {
  const result = handleAgentMessage({ message: "כמה אני חייב לועד?", residentId: "res-1" });
  assert.equal(result.intent, "payment_query");
  assert.match(result.reply, /₪350/);
});

test("finds a shared item for borrowing", () => {
  const result = handleAgentMessage({ message: "מישהו מלווה מקדחה?" });
  assert.equal(result.intent, "borrow_item");
  assert.equal(result.actions[0].type, "borrow_request");
});

test("routes generic technician requests to maintenance", () => {
  const result = handleAgentMessage({ message: "אני צריך טכנאי" });
  assert.equal(result.intent, "maintenance_report");
  assert.equal(result.actions[0].type, "ticket_draft");
  assert.equal(result.actions[0].providerId, "prov-2");
});

test("answers provider contact questions without opening maintenance reports", () => {
  const result = handleAgentMessage({ message: "מה הטלפון של החשמלאי?" });
  assert.equal(result.intent, "provider_contact");
  assert.equal(result.actions[0].type, "provider_contact");
  assert.equal(result.actions.some((action) => action.type === "ticket_draft"), false);
  assert.match(result.reply, /טלפון/);
});

test("answers maintenance status questions instead of treating them as community posts", () => {
  const result = handleAgentMessage({ message: "מה קורה עם הדיווח שלי?" });
  assert.equal(result.intent, "maintenance_status");
  assert.equal(result.actions[0].type, "maintenance_status");
  assert.match(result.reply, /קריאות תחזוקה|אין כרגע/);
});

test("persisted maintenance reports use final ticket wording", async () => {
  const result = await handleAgentMessageAsync({ message: "יש נזילה בלובי", residentId: "res-1" });
  assert.equal(result.intent, "maintenance_report");
  assert.equal(result.actions.some((action) => action.type === "ticket_created"), true);
  assert.match(result.reply, /פתחתי קריאת תחזוקה T-/);
  assert.doesNotMatch(result.reply, /טיוטת/);
  assert.doesNotMatch(result.reply, /לאישור סופי/);
});

test("keeps shared item requests separate from technician requests", () => {
  const result = handleAgentMessage({ message: "צריך סולם" });
  assert.equal(result.intent, "borrow_item");
  assert.equal(result.actions[0].type, "borrow_request");
});

test("summarizes committee operating status", () => {
  const result = handleAgentMessage({ message: "תן לי סיכום מצב ועד" });
  assert.equal(result.intent, "committee_overview");
  assert.equal(result.actions[0].type, "committee_summary");
  assert.match(result.reply, /קריאות פתוחות/);
});

test("prepares payment reminder drafts for overdue residents", () => {
  const result = handleAgentMessage({ message: "שלח תזכורת תשלום לכל המאחרים" });
  assert.equal(result.intent, "payment_reminder_request");
  assert.equal(result.actions[0].type, "payment_reminder_draft");
  assert.equal(result.actions[0].requiresRole, "committee");
});

test("prepares committee vote drafts", () => {
  const result = handleAgentMessage({ message: "תפתח הצבעה על חידוש חברת ניקיון" });
  assert.equal(result.intent, "vote_draft");
  assert.equal(result.actions[0].type, "vote_draft");
  assert.match(result.reply, /חידוש חברת ניקיון/);
});

test("prepares resident announcement drafts", () => {
  const result = handleAgentMessage({ message: "תודיע לדיירים שמחר יש הפסקת מים" });
  assert.equal(result.intent, "resident_announcement");
  assert.equal(result.actions[0].type, "resident_announcement_draft");
});

test("prepares provider and resident onboarding drafts", () => {
  const providerResult = handleAgentMessage({ message: "להוסיף ספק חדש לניקיון" });
  assert.equal(providerResult.intent, "provider_onboarding");
  assert.equal(providerResult.actions[0].type, "provider_onboarding_draft");

  const residentResult = handleAgentMessage({ message: "דייר חדש נכנס לדירה 8" });
  assert.equal(residentResult.intent, "resident_onboarding");
  assert.equal(residentResult.actions[0].type, "resident_onboarding_draft");
});
