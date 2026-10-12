import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { bans, staff, users } from "@/db/schema";
import type { CustomerSession, StaffSession } from "./types";
import { ALL_PERMISSIONS } from "./types";
import { normalizePhone, signPayload, verifyPayload } from "./utils";

const MONTH_MS = 1000 * 60 * 60 * 24 * 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function setCustomerCookie(session: Omit<CustomerSession, "role" | "exp">) {
  const token = signPayload({ ...session, role: "customer", exp: Date.now() + MONTH_MS });
  const jar = await cookies();
  jar.set("jowdi_customer", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function setStaffCookie(session: Omit<StaffSession, "exp">) {
  const token = signPayload({ ...session, exp: Date.now() + MONTH_MS });
  const jar = await cookies();
  jar.set("jowdi_staff", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearCustomerCookie() {
  const jar = await cookies();
  jar.delete("jowdi_customer");
}

export async function clearStaffCookie() {
  const jar = await cookies();
  jar.delete("jowdi_staff");
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const jar = await cookies();
  return verifyPayload<CustomerSession>(jar.get("jowdi_customer")?.value);
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies();
  return verifyPayload<StaffSession>(jar.get("jowdi_staff")?.value);
}

export async function getCurrentCustomer() {
  const session = await getCustomerSession();
  if (!session) return null;
  const [row] = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  if (!row || row.isBanned) return null;
  return row;
}

export async function getCurrentStaff() {
  const session = await getStaffSession();
  if (!session) return null;
  const [row] = await db.select().from(staff).where(eq(staff.id, session.id)).limit(1);
  if (!row || !row.isActive) return null;
  return {
    ...row,
    permissions: row.role === "super_admin" ? ALL_PERMISSIONS : (row.permissions || {}),
  };
}

export async function isBannedValue(email?: string | null, phone?: string | null, address?: string | null) {
  const checks = [];
  if (email) checks.push(and(eq(bans.type, "email"), eq(bans.value, email.toLowerCase().trim())));
  if (phone) checks.push(and(eq(bans.type, "phone"), eq(bans.value, normalizePhone(phone))));
  if (address) checks.push(and(eq(bans.type, "address"), eq(bans.value, address.trim().toLowerCase())));
  if (!checks.length) return null;
  const [hit] = await db
    .select()
    .from(bans)
    .where(or(...checks))
    .limit(1);
  return hit || null;
}

export function staffToSession(row: typeof staff.$inferSelect): Omit<StaffSession, "exp"> {
  return {
    id: row.id,
    username: row.username,
    fullName: row.fullName,
    role: row.role === "super_admin" ? "super_admin" : "staff",
    permissions: row.role === "super_admin" ? ALL_PERMISSIONS : (row.permissions || {}),
  };
}
