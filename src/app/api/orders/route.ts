import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const number = url.searchParams.get("number");
  const customer = await getCurrentCustomer();

  if (id || number) {
    const [order] = id
      ? await db.select().from(orders).where(eq(orders.id, Number(id))).limit(1)
      : await db.select().from(orders).where(eq(orders.orderNumber, number || "")).limit(1);
    if (!order) return Response.json({ error: "Not found" }, { status: 404 });
    if (customer && order.userId && order.userId !== customer.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    return Response.json({ order, items });
  }

  if (!customer) return Response.json({ orders: [] });
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, customer.id))
    .orderBy(desc(orders.createdAt));
  return Response.json({ orders: rows });
}
