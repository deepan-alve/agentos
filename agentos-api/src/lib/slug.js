// Deterministic-ish slug generator. "build me a calculator" -> "calculator-7f3a"

import crypto from "node:crypto";

const STOP = new Set([
  "build","me","a","the","an","please","app","application","that","with","for","my",
  "i","want","need","let","can","you","make","do","just","like","one","using",
]);

export function slugify(prompt, suffix) {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
  const base = words.slice(0, 3).join("-") || "app";
  const tail = suffix ?? crypto.randomBytes(2).toString("hex");
  return `${base}-${tail}`.slice(0, 48);
}

export function randomSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}
