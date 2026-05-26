import test from "node:test";
import assert from "node:assert/strict";
import { handleAgentMessage } from "../server/agent.mjs";

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
