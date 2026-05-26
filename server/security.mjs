import { getResidentByToken } from "./data.mjs";
export { generateMagicToken, hashToken } from "./tokens.mjs";

export const demoResetEnabled = (process.env.ENABLE_DEMO_RESET ?? (process.env.NODE_ENV === "production" ? "false" : "true")) === "true";
const committee2faCode = process.env.COMMITTEE_2FA_CODE ?? "";

export async function authenticateToken(token) {
  if (!token) return null;
  return getResidentByToken(token);
}

export function hasRole(user, allowedRoles) {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

export function verifyCommittee2fa(user, code) {
  if (!["committee", "chair"].includes(user?.role)) return true;
  if (!committee2faCode) return true;
  return String(code ?? "") === committee2faCode;
}

export async function requireRole({ token, roles, twoFactorCode }) {
  const user = await authenticateToken(token);
  if (!user) return { ok: false, status: 403, body: { error: "invalid_magic_link" } };
  if (!hasRole(user, roles)) return { ok: false, status: 403, body: { error: "insufficient_role", required: roles } };
  if (!verifyCommittee2fa(user, twoFactorCode)) return { ok: false, status: 401, body: { error: "two_factor_required" } };
  return { ok: true, user };
}
