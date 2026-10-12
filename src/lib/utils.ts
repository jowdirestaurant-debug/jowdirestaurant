import { createHmac, timingSafeEqual } from "crypto";
import type { Lang } from "./types";

export function formatMoney(fils: number, lang: Lang): string {
  const value = (Math.max(0, fils) / 1000).toFixed(3);
  return lang === "ar" ? `${value} د.ب` : `BHD ${value}`;
}

export function discountedPrice(priceFils: number, discountPercent: number): number {
  if (!discountPercent) return priceFils;
  return Math.round(priceFils * (1 - discountPercent / 100));
}

export function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `JOW-${y}${m}${d}-${rand}`;
}

export function generateCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || `item-${Date.now()}`;
}

function secret(): string {
  return process.env.AUTH_SECRET || "jowdi-auth-secret-change-in-production";
}

export function signPayload(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyPayload<T>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = createHmac("sha256", secret()).update(data).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  try {
    const json = JSON.parse(Buffer.from(data, "base64url").toString()) as T & { exp?: number };
    if (json.exp && json.exp < Date.now()) return null;
    return json;
  } catch {
    return null;
  }
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
