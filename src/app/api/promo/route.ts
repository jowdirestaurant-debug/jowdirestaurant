import { and, eq, gte, lte, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { promoCodes } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as { code?: string; subtotalFils?: number };
  const code = (body.code || "").trim().toUpperCase();
  if (!code) return Response.json({ error: "Missing code" }, { status: 400 });
  const now = new Date();
  const [promo] = await db
    .select()
    .from(promoCodes)
    .where(
      and(
        eq(promoCodes.code, code),
        eq(promoCodes.isActive, true),
        or(isNull(promoCodes.startsAt), lte(promoCodes.startsAt, now)),
        or(isNull(promoCodes.expiresAt), gte(promoCodes.expiresAt, now)),
      ),
    )
    .limit(1);
  if (!promo) return Response.json({ error: "Invalid promo code" }, { status: 400 });
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    return Response.json({ error: "Promo code exhausted" }, { status: 400 });
  }
  const subtotal = Number(body.subtotalFils) || 0;
  if (subtotal < promo.minOrderFils) {
    return Response.json({ error: "Order does not meet promo minimum" }, { status: 400 });
  }
  const discountFils = Math.round((subtotal * promo.discountPercent) / 100);
  return Response.json({
    ok: true,
    code: promo.code,
    discountPercent: promo.discountPercent,
    discountFils,
    descriptionEn: promo.descriptionEn,
    descriptionAr: promo.descriptionAr,
  });
}
