import { and, eq, gte, lte, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { itemSizes, menuItems, orders, orderItems, promoCodes, regions, users } from "@/db/schema";
import { getCurrentCustomer, isBannedValue } from "@/lib/auth";
import { broadcastDelivery, splitDeliveryFee } from "@/lib/delivery";
import { sendOrderEmail } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import type { CartLine, Lang, OrderType, PaymentMethod } from "@/lib/types";
import { discountedPrice, formatMoney, generateOrderNumber, normalizePhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CheckoutBody = {
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  fullName: string;
  email?: string;
  phone: string;
  governorateId?: number | null;
  regionId?: number | null;
  addressDetails?: string;
  notes?: string;
  promoCode?: string;
  language?: Lang;
  items: CartLine[];
};

export async function POST(req: Request) {
  const body = (await req.json()) as CheckoutBody;
  const lang: Lang = body.language === "en" ? "en" : "ar";
  const settings = await getSettings();
  const customer = await getCurrentCustomer();

  if (!body.items?.length) return Response.json({ error: "Cart is empty" }, { status: 400 });
  if (!body.fullName?.trim() || !body.phone?.trim()) {
    return Response.json({ error: "Name and phone are required" }, { status: 400 });
  }
  if (!["dine_in", "takeaway", "delivery"].includes(body.orderType)) {
    return Response.json({ error: "Invalid order type" }, { status: 400 });
  }
  if (body.orderType === "dine_in" && !settings.features.dineIn) {
    return Response.json({ error: "Dine-in is disabled" }, { status: 400 });
  }
  if (body.orderType === "takeaway" && !settings.features.takeaway) {
    return Response.json({ error: "Takeaway is disabled" }, { status: 400 });
  }
  if (body.orderType === "delivery" && !settings.features.delivery) {
    return Response.json({ error: "Delivery is disabled" }, { status: 400 });
  }
  if (!customer && !settings.features.guestCheckout) {
    return Response.json({ error: "Please sign in to order" }, { status: 401 });
  }

  const email = (body.email || customer?.email || "").trim().toLowerCase();
  const phone = normalizePhone(body.phone);
  const address = (body.addressDetails || "").trim();
  const banned = await isBannedValue(email, phone, address);
  if (banned || customer?.isBanned) {
    return Response.json({ error: "Ordering is not available for this customer" }, { status: 403 });
  }

  if (body.orderType === "delivery" && (!body.governorateId || !body.regionId || !address)) {
    return Response.json({ error: "Complete delivery address is required" }, { status: 400 });
  }

  const method = body.paymentMethod;
  const pay = settings.payments;
  if (method === "cash" && !pay.cashEnabled) return Response.json({ error: "Cash is disabled" }, { status: 400 });
  if (method === "benefitpay" && (!pay.benefitPayEnabled || !pay.benefitPayApiKey)) {
    return Response.json({ error: "BenefitPay is not configured" }, { status: 400 });
  }
  if (method === "card" && (!pay.cardEnabled || !pay.cardSecretKey)) {
    return Response.json({ error: "Card payments are not configured" }, { status: 400 });
  }

  let subtotal = 0;
  const lines: Array<{
    itemId: number;
    sizeId: number | null;
    nameEn: string;
    nameAr: string;
    sizeNameEn: string | null;
    sizeNameAr: string | null;
    unitPriceFils: number;
    quantity: number;
    totalFils: number;
    image: string | null;
  }> = [];

  for (const line of body.items) {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, line.itemId)).limit(1);
    if (!item || !item.isAvailable) {
      return Response.json({ error: `Item unavailable: ${line.nameEn}` }, { status: 400 });
    }
    let raw = item.basePriceFils;
    let disc = item.discountPercent || 0;
    let sizeNameEn: string | null = null;
    let sizeNameAr: string | null = null;
    let sizeId: number | null = null;
    if (line.sizeId) {
      const [size] = await db
        .select()
        .from(itemSizes)
        .where(and(eq(itemSizes.id, line.sizeId), eq(itemSizes.itemId, item.id)))
        .limit(1);
      if (!size || !size.isAvailable) {
        return Response.json({ error: "Selected size is unavailable" }, { status: 400 });
      }
      raw = size.priceFils;
      disc = Math.max(disc, size.discountPercent || 0);
      sizeNameEn = size.nameEn;
      sizeNameAr = size.nameAr;
      sizeId = size.id;
      if (size.stock != null && size.stock < line.quantity) {
        return Response.json({ error: "Insufficient stock for selected size" }, { status: 400 });
      }
    } else if (item.stock != null && item.stock < line.quantity) {
      return Response.json({ error: "Insufficient stock" }, { status: 400 });
    }
    disc = Math.max(disc, settings.menuDiscountPercent || 0);
    const unit = discountedPrice(raw, disc);
    const qty = Math.max(1, Math.min(50, Number(line.quantity) || 1));
    const total = unit * qty;
    subtotal += total;
    lines.push({
      itemId: item.id,
      sizeId,
      nameEn: item.nameEn,
      nameAr: item.nameAr,
      sizeNameEn,
      sizeNameAr,
      unitPriceFils: unit,
      quantity: qty,
      totalFils: total,
      image: item.image,
    });
  }

  let discountFils = 0;
  let promoUsed: string | null = null;
  if (body.promoCode) {
    const code = body.promoCode.trim().toUpperCase();
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
    if (subtotal < promo.minOrderFils) {
      return Response.json({ error: "Order does not meet promo minimum" }, { status: 400 });
    }
    discountFils = Math.round((subtotal * promo.discountPercent) / 100);
    promoUsed = promo.code;
    await db
      .update(promoCodes)
      .set({ usedCount: promo.usedCount + 1 })
      .where(eq(promoCodes.id, promo.id));
  }

  let deliveryFeeFils = 0;
  let customerDeliveryFils = 0;
  let restaurantDeliveryFils = 0;
  if (body.orderType === "delivery" && body.regionId) {
    const [region] = await db.select().from(regions).where(eq(regions.id, body.regionId)).limit(1);
    if (!region || !region.isActive) return Response.json({ error: "Invalid region" }, { status: 400 });
    const split = await splitDeliveryFee(region.deliveryFeeFils);
    deliveryFeeFils = split.full;
    customerDeliveryFils = split.customer;
    restaurantDeliveryFils = split.restaurant;
  }

  const totalFils = Math.max(0, subtotal - discountFils + customerDeliveryFils);

  let userId = customer?.id || null;
  if (!userId && email) {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      userId = existing.id;
    } else {
      const [guest] = await db
        .insert(users)
        .values({
          fullName: body.fullName.trim(),
          email: email || `guest-${Date.now()}@guest.jowdi.local`,
          phone,
          governorateId: body.governorateId || null,
          regionId: body.regionId || null,
          addressDetails: address || null,
          language: lang,
          isGuest: true,
        })
        .returning();
      userId = guest.id;
    }
  }

  const paymentStatus =
    method === "cash" ? "cash_on_arrival" : method === "benefitpay" || method === "card" ? "pending" : "pending";
  const status = method === "cash" ? "confirmed" : "pending";

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber: generateOrderNumber(),
      userId,
      guestName: body.fullName.trim(),
      guestPhone: phone,
      guestEmail: email || null,
      orderType: body.orderType,
      governorateId: body.governorateId || null,
      regionId: body.regionId || null,
      addressDetails: address || null,
      subtotalFils: subtotal,
      deliveryFeeFils,
      customerDeliveryFils,
      restaurantDeliveryFils,
      discountFils,
      totalFils,
      promoCode: promoUsed,
      paymentMethod: method,
      paymentStatus,
      status,
      notes: body.notes || null,
      language: lang,
    })
    .returning();

  await db.insert(orderItems).values(
    lines.map((l) => ({
      orderId: order.id,
      itemId: l.itemId,
      sizeId: l.sizeId,
      nameEn: l.nameEn,
      nameAr: l.nameAr,
      sizeNameEn: l.sizeNameEn,
      sizeNameAr: l.sizeNameAr,
      unitPriceFils: l.unitPriceFils,
      quantity: l.quantity,
      totalFils: l.totalFils,
      image: l.image,
    })),
  );

  if (body.orderType === "delivery") {
    await broadcastDelivery(order.id);
  }

  if (email && !email.endsWith("@guest.jowdi.local")) {
    await sendOrderEmail(email, order.orderNumber, formatMoney(totalFils, lang), lang);
  }

  let paymentHint: string | null = null;
  if (method === "benefitpay") {
    paymentHint = "BenefitPay configured — complete payment in the BenefitPay app using the merchant credentials stored in admin settings.";
  }
  if (method === "card") {
    paymentHint = "Card gateway hook ready. Provide the processor keys in admin payments to enable live capture.";
  }

  return Response.json({ ok: true, order, paymentHint });
}
