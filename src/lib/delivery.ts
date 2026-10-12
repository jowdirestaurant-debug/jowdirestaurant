import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliveryAggregators, deliveryDispatches, orders } from "@/db/schema";
import { getSettings } from "./settings";

export function splitDeliveryFee(fullFeeFils: number) {
  return getSettings().then((s) => {
    if (!s.delivery.sharedEnabled) {
      return { customer: fullFeeFils, restaurant: 0, full: fullFeeFils };
    }
    const customerPct = Math.min(100, Math.max(0, s.delivery.customerSharePercent));
    const customer = Math.round((fullFeeFils * customerPct) / 100);
    return { customer, restaurant: fullFeeFils - customer, full: fullFeeFils };
  });
}

export async function broadcastDelivery(orderId: number) {
  const aggregators = await db
    .select()
    .from(deliveryAggregators)
    .where(eq(deliveryAggregators.isActive, true));
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return [];

  const results = [];
  for (const agg of aggregators) {
    const [dispatch] = await db
      .insert(deliveryDispatches)
      .values({
        orderId,
        aggregatorId: agg.id,
        status: "broadcast",
        payload: {
          orderNumber: order.orderNumber,
          guestName: order.guestName,
          guestPhone: order.guestPhone,
          addressDetails: order.addressDetails,
          totalFils: order.totalFils,
        },
      })
      .returning();

    if (agg.apiUrl && agg.apiKey) {
      try {
        const res = await fetch(agg.apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${agg.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderNumber: order.orderNumber,
            customerName: order.guestName,
            phone: order.guestPhone,
            address: order.addressDetails,
            totalFils: order.totalFils,
            notes: order.notes,
          }),
        });
        const body = await res.text();
        await db
          .update(deliveryDispatches)
          .set({ payload: { httpStatus: res.status, body: body.slice(0, 2000) } })
          .where(eq(deliveryDispatches.id, dispatch.id));
      } catch (error) {
        await db
          .update(deliveryDispatches)
          .set({ payload: { error: error instanceof Error ? error.message : "request_failed" } })
          .where(eq(deliveryDispatches.id, dispatch.id));
      }
    }
    results.push(dispatch);
  }
  return results;
}

export async function acceptDispatch(orderId: number, aggregatorId: number, externalId?: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { ok: false as const, error: "Order not found" };
  if (order.assignedAggregatorId) {
    return { ok: false as const, error: "Order already accepted by another aggregator" };
  }

  await db
    .update(orders)
    .set({ assignedAggregatorId: aggregatorId, status: "dispatched", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await db
    .update(deliveryDispatches)
    .set({ status: "accepted", acceptedAt: new Date(), externalId: externalId || null })
    .where(and(eq(deliveryDispatches.orderId, orderId), eq(deliveryDispatches.aggregatorId, aggregatorId)));

  await db
    .update(deliveryDispatches)
    .set({ status: "closed" })
    .where(and(eq(deliveryDispatches.orderId, orderId), eq(deliveryDispatches.status, "broadcast")));

  return { ok: true as const };
}
