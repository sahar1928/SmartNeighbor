import { randomBytes, createHash } from "node:crypto";

export function generateMagicToken() {
  return `sn_${randomBytes(32).toString("base64url")}`;
}

export function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}
