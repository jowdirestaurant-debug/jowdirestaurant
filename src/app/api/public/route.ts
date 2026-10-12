import { and, asc, eq, lte, gte, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { categories, governorates, itemSizes, menuItems, popups, regions } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { getSettings } from "@/lib/settings";
import { discountedPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
  } catch {
    /* still try to serve */
  }

  const site = await getSettings();
  const now = new Date();

  const [govs, regs, cats, items, sizes, pops] = await Promise.all([
    db.select().from(governorates).where(eq(governorates.isActive, true)).orderBy(asc(governorates.sortOrder)),
    db.select().from(regions).where(eq(regions.isActive, true)).orderBy(asc(regions.sortOrder)),
    db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder)),
    db.select().from(menuItems).where(eq(menuItems.isAvailable, true)).orderBy(asc(menuItems.sortOrder)),
    db.select().from(itemSizes).where(eq(itemSizes.isAvailable, true)).orderBy(asc(itemSizes.sortOrder)),
    db
      .select()
      .from(popups)
      .where(
        and(
          eq(popups.isActive, true),
          or(isNull(popups.startsAt), lte(popups.startsAt, now)),
          or(isNull(popups.endsAt), gte(popups.endsAt, now)),
        ),
      )
      .orderBy(asc(popups.sortOrder)),
  ]);

  const menu = items.map((item) => {
    const itemSizesList = sizes.filter((s) => s.itemId === item.id);
    const menuDisc = site.menuDiscountPercent || 0;
    return {
      ...item,
      sizes: itemSizesList.map((s) => {
        const disc = Math.max(s.discountPercent || 0, item.discountPercent || 0, menuDisc);
        return {
          ...s,
          finalPriceFils: discountedPrice(s.priceFils, disc),
        };
      }),
      finalPriceFils: discountedPrice(
        item.basePriceFils,
        Math.max(item.discountPercent || 0, menuDisc),
      ),
    };
  });

  return Response.json({
    settings: {
      theme: site.theme,
      restaurant: site.restaurant,
      features: site.features,
      delivery: {
        sharedEnabled: site.delivery.sharedEnabled,
        restaurantSharePercent: site.delivery.restaurantSharePercent,
        customerSharePercent: site.delivery.customerSharePercent,
      },
      payments: {
        cashEnabled: site.payments.cashEnabled,
        benefitPayEnabled: site.payments.benefitPayEnabled && Boolean(site.payments.benefitPayApiKey),
        cardEnabled: site.payments.cardEnabled && Boolean(site.payments.cardPublicKey),
      },
      menuDiscountPercent: site.menuDiscountPercent,
    },
    governorates: govs.map((g) => ({
      ...g,
      regions: regs.filter((r) => r.governorateId === g.id),
    })),
    categories: cats,
    items: menu,
    popups: pops,
  });
}
