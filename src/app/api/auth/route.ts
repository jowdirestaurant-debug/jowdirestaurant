import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { users, verificationCodes } from "@/db/schema";
import {
  clearCustomerCookie,
  getCurrentCustomer,
  hashPassword,
  isBannedValue,
  setCustomerCookie,
  verifyPassword,
} from "@/lib/auth";
import { sendResetEmail, sendVerificationEmail } from "@/lib/email";
import { generateCode, normalizePhone } from "@/lib/utils";
import type { Lang } from "@/lib/types";

export const dynamic = "force-dynamic";

type Body = {
  action?: string;
  fullName?: string;
  email?: string;
  confirmEmail?: string;
  password?: string;
  phone?: string;
  governorateId?: number | null;
  regionId?: number | null;
  addressDetails?: string;
  language?: Lang;
  code?: string;
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

async function issueCode(email: string, type: "verify" | "reset") {
  const code = generateCode(6);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await db.insert(verificationCodes).values({ email: email.toLowerCase(), code, type, expiresAt });
  return code;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  if (action === "me") {
    const user = await getCurrentCustomer();
    if (!user) return json({ user: null });
    return json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        governorateId: user.governorateId,
        regionId: user.regionId,
        addressDetails: user.addressDetails,
        language: user.language,
        isGuest: user.isGuest,
        emailVerified: user.emailVerified,
      },
    });
  }
  return json({ ok: true });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const action = body.action;
  const lang: Lang = body.language === "en" ? "en" : "ar";

  if (action === "logout") {
    await clearCustomerCookie();
    return json({ ok: true });
  }

  if (action === "register") {
    const fullName = (body.fullName || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const confirmEmail = (body.confirmEmail || "").trim().toLowerCase();
    const password = body.password || "";
    const phone = normalizePhone(body.phone || "");
    if (!fullName || !email || !password || !phone) return json({ error: "Missing required fields" }, 400);
    if (email !== confirmEmail) return json({ error: "Emails do not match" }, 400);
    if (!email.includes("@")) return json({ error: "Invalid email" }, 400);
    if (password.length < 8) return json({ error: "Password too short" }, 400);
    const banned = await isBannedValue(email, phone, body.addressDetails);
    if (banned) return json({ error: "This account cannot be created" }, 403);
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing && !existing.isGuest) return json({ error: "Email already registered" }, 409);
    const passwordHash = await hashPassword(password);
    let user;
    if (existing && existing.isGuest) {
      const [updated] = await db
        .update(users)
        .set({
          fullName,
          passwordHash,
          phone,
          governorateId: body.governorateId || null,
          regionId: body.regionId || null,
          addressDetails: body.addressDetails || null,
          language: lang,
          isGuest: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      user = updated;
    } else {
      const [created] = await db
        .insert(users)
        .values({
          fullName,
          email,
          passwordHash,
          phone,
          governorateId: body.governorateId || null,
          regionId: body.regionId || null,
          addressDetails: body.addressDetails || null,
          language: lang,
          isGuest: false,
        })
        .returning();
      user = created;
    }
    const code = await issueCode(email, "verify");
    await sendVerificationEmail(email, code, lang);
    await setCustomerCookie({ id: user.id, email: user.email, fullName: user.fullName });
    return json({ ok: true, needsVerification: true });
  }

  if (action === "login") {
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !user.passwordHash) return json({ error: "Invalid credentials" }, 401);
    if (user.isBanned) return json({ error: "Account is blocked" }, 403);
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return json({ error: "Invalid credentials" }, 401);
    await setCustomerCookie({ id: user.id, email: user.email, fullName: user.fullName });
    return json({ ok: true });
  }

  if (action === "verify") {
    const email = (body.email || "").trim().toLowerCase();
    const code = (body.code || "").trim();
    const [row] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.email, email),
          eq(verificationCodes.code, code),
          eq(verificationCodes.type, "verify"),
          eq(verificationCodes.used, false),
          gt(verificationCodes.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row) return json({ error: "Invalid or expired code" }, 400);
    await db.update(verificationCodes).set({ used: true }).where(eq(verificationCodes.id, row.id));
    const [user] = await db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
    if (user) await setCustomerCookie({ id: user.id, email: user.email, fullName: user.fullName });
    return json({ ok: true });
  }

  if (action === "forgot") {
    const email = (body.email || "").trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user) {
      const code = await issueCode(email, "reset");
      await sendResetEmail(email, code, lang);
    }
    return json({ ok: true });
  }

  if (action === "reset") {
    const email = (body.email || "").trim().toLowerCase();
    const code = (body.code || "").trim();
    const password = body.password || "";
    if (password.length < 8) return json({ error: "Password too short" }, 400);
    const [row] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.email, email),
          eq(verificationCodes.code, code),
          eq(verificationCodes.type, "reset"),
          eq(verificationCodes.used, false),
          gt(verificationCodes.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row) return json({ error: "Invalid or expired code" }, 400);
    const passwordHash = await hashPassword(password);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.email, email));
    await db.update(verificationCodes).set({ used: true }).where(eq(verificationCodes.id, row.id));
    return json({ ok: true });
  }

  if (action === "update") {
    const user = await getCurrentCustomer();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const [updated] = await db
      .update(users)
      .set({
        fullName: (body.fullName || user.fullName).trim(),
        phone: normalizePhone(body.phone || user.phone),
        governorateId: body.governorateId ?? user.governorateId,
        regionId: body.regionId ?? user.regionId,
        addressDetails: body.addressDetails ?? user.addressDetails,
        language: lang,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();
    await setCustomerCookie({ id: updated.id, email: updated.email, fullName: updated.fullName });
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
}
