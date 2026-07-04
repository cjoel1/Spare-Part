// License verification — offline, via WebCrypto ECDSA P-256.
// Only the PUBLIC key ships with the app; activation codes are signed with the
// private key kept in the owner's local keygen tool. Codes cannot be forged
// from anything present in this codebase.
//
// Code format: "SP1.<base64url(payload JSON)>.<base64url(signature)>"
// Payload: { c: client, p: plant, iss: "YYYY-MM-DD", exp: "YYYY-MM-DD" | null }
import { getKV, setKV } from "./db.js";

const PUBLIC_KEY_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "-gG1RRmH3pnq_RhQLWnIIQCxjfDlTopGaMNmeh4bym8",
  y: "EVYlQpX6Rt9rxcOZ1YFH3PpbmMTAzceCFURhIWgMM-g",
};

function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

let cachedKey = null;
async function publicKey() {
  if (!cachedKey) {
    cachedKey = await crypto.subtle.importKey(
      "jwk",
      PUBLIC_KEY_JWK,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
  }
  return cachedKey;
}

export async function verifyCode(code) {
  try {
    const parts = String(code || "").trim().split(".");
    if (parts.length !== 3 || parts[0] !== "SP1") return { valid: false, reason: "Formato de código inválido" };
    const [, payloadB64, sigB64] = parts;
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      await publicKey(),
      b64urlToBytes(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!ok) return { valid: false, reason: "El código no es auténtico" };
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64)));
    const expMs = payload.exp ? Date.parse(payload.exp + "T23:59:59") : null;
    const expired = expMs !== null && Date.now() > expMs;
    const daysLeft = expMs === null ? null : Math.ceil((expMs - Date.now()) / 86400000);
    return { valid: true, expired, daysLeft, payload };
  } catch {
    return { valid: false, reason: "No se pudo leer el código" };
  }
}

// Status of the license stored on this device:
//   missing | invalid | expired | active
export async function getLicenseStatus() {
  const code = await getKV("licenseCode", "");
  if (!code) return { state: "missing" };
  const v = await verifyCode(code);
  if (!v.valid) return { state: "invalid", reason: v.reason };
  if (v.expired) return { state: "expired", ...v };
  return { state: "active", ...v };
}

// Validates and stores a new activation code. Expired codes are rejected.
export async function activate(code) {
  const v = await verifyCode(code);
  if (!v.valid) return { ok: false, reason: v.reason };
  if (v.expired) return { ok: false, reason: "Este código ya venció — solicita uno nuevo" };
  await setKV("licenseCode", String(code).trim());
  return { ok: true, ...v };
}
