import { createHash, randomBytes } from "node:crypto";

const HASH_PREFIX = "sha256";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(`${salt}:${password}`, "utf8")
    .digest("hex");
  return `${HASH_PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password: string, encodedHash: string | null | undefined) {
  if (!encodedHash) {
    return false;
  }

  const parts = encodedHash.split("$");
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX) {
    return false;
  }

  const [, salt, expectedHash] = parts;
  const computedHash = createHash("sha256")
    .update(`${salt}:${password}`, "utf8")
    .digest("hex");
  return computedHash === expectedHash;
}

export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(14);
  let result = "";

  for (let index = 0; index < bytes.length; index += 1) {
    result += alphabet[bytes[index] % alphabet.length];
  }

  return result;
}

