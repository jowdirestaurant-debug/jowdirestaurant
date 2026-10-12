import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deliveryAggregators } from "@/db/schema";
import { acceptDispatch } from "@/lib/delivery";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    orderId?: number;
    aggregatorId?: number;
    apiKey?: string;
    action?: string;
    externalId?: string;
  };
  if (!body.orderId || !body.aggregatorId || !body.apiKey) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }
  const [agg] = await db
    .select()
    .from(deliveryAggregators)
    .where(eq(deliveryAggregators.id, body.aggregatorId))
    .limit(1);
  if (!agg || !agg.isActive) return Response.json({ error: "Unknown aggregator" }, { status: 404 });
  const secret = agg.webhookSecret || agg.apiKey;
  if (!secret || secret !== body.apiKey) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }
  if (body.action !== "accept") {
    return Response.json({ error: "Unsupported action" }, { status: 400 });
  }
  const result = await acceptDispatch(body.orderId, body.aggregatorId, body.externalId);
  return Response.json(result, { status: result.ok ? 200 : 409 });
}
