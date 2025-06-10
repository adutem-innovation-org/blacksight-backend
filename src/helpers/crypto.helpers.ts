// utils/cryptoUtils.ts
import { config } from "@/config";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { throwServerError } from "./throw-request-error";

// const ENCRYPTION_KEY = process.env.API_KEY_SECRET!; // Must be 32 bytes
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  if (!config.encryption.apiKey)
    return throwServerError("Missing encryption key");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(
    "aes-256-cbc",
    Buffer.from(config.encryption.apiKey, "hex"),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(encrypted: string): string {
  if (!config.encryption.apiKey)
    return throwServerError("Missing encryption key");
  const [ivHex, encryptedDataHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(encryptedDataHex, "hex");
  const decipher = createDecipheriv(
    "aes-256-cbc",
    Buffer.from(config.encryption.apiKey, "hex"),
    iv
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
