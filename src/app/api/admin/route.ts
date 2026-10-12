import { and, asc, desc, eq, gte, notInArray } from "drizzle-orm";
import { db } from "@/db";
import {
  bans,
  categories,
  deliveryAggregators,
  deliveryDispatches,
  governorates,
  itemSizes,
  menuItems,
  orderItems,
  orders,
  popups,
  promoCodes,
  regions,
  staff,
  users,
} from "@/db/schema";
import {
  clearStaffCookie,
  getCurrentStaff,
  hashPassword,
  setStaffCookie,
  staffToSession,
  verifyPassword,
} from "@/lib/auth";
import { acceptDispatch } from "@/lib/delivery";
import { ensureSeeded } from "@/lib/seed";
import { getSettings, saveSettings } from "@/lib/settings";
import { ALL_PERMISSIONS, DEFAULT_SETTINGS, type PublicSettings, type StaffPermissions } from "@/lib/types";
import { isThemeId } from "@/lib/themes";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function can(permissions: StaffPermissions, key: keyof StaffPermissions) {
  return Boolean(permissions[key]);
}

export async function GET(req: Request) {
  await ensureSeeded();
  const url = new URL(req.url);
  const resource = url.searchParams.get("resource") || "me";
  if (resource === "health") return json({ ok: true });

  const current = await getCurrentStaff();
  if (!current) return json({ error: "Unauthorized" }, 401);
  const perms = current.role === "super_admin" ? ALL_PERMISSIONS : current.permissions;

  if (resource === "me") {
    return json({
      staff: {
        id: current.id,
        username: current.username,
        fullName: current.fullName,
        role: current.role,
        permissions: perms,
      },
    });
  }

  if (resource === "stats") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const todayRows = await db.select().from(orders).where(gte(orders.createdAt, start));
    const allOpen = await db
      .select()
      .from(orders)
      .where(notInArray(orders.status, ["delivered", "completed", "cancelled"]));
    const customersCount = await db.select({ id: users.id }).from(users);
    const revenue = todayRows.reduce((s, o) => s + (o.totalFils || 0), 0);
    return json({
      todayOrders: todayRows.length,
      revenue,
      openOrders: allOpen.length,
      customers: customersCount.length,
    });
  }

  if (resource === "orders" && can(perms, "orders")) {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200);
    const items = await db.select().from(orderItems);
    const dispatches = await db.select().from(deliveryDispatches);
    return json({
      orders: rows.map((o) => ({
        ...o,
        items: items.filter((i) => i.orderId === o.id),
        dispatches: dispatches.filter((d) => d.orderId === o.id),
      })),
    });
  }

  if (resource === "menu" && can(perms, "menu")) {
    const [cats, items, sizes] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.sortOrder)),
      db.select().from(menuItems).orderBy(asc(menuItems.sortOrder)),
      db.select().from(itemSizes).orderBy(asc(itemSizes.sortOrder)),
    ]);
    return json({
      categories: cats,
      items: items.map((i) => ({ ...i, sizes: sizes.filter((s) => s.itemId === i.id) })),
    });
  }

  if (resource === "customers" && can(perms, "customers")) {
    const rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(300);
    return json({
      customers: rows.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        addressDetails: u.addressDetails,
        isGuest: u.isGuest,
        isBanned: u.isBanned,
        banReason: u.banReason,
        createdAt: u.createdAt,
      })),
    });
  }

  if (resource === "staff" && can(perms, "staff")) {
    const rows = await db.select().from(staff).orderBy(asc(staff.id));
    return json({
      staff: rows.map((s) => ({
        id: s.id,
        username: s.username,
        email: s.email,
        fullName: s.fullName,
        role: s.role,
        permissions: s.permissions,
        isActive: s.isActive,
      })),
    });
  }

  if (resource === "regions" && can(perms, "regions")) {
    const govs = await db.select().from(governorates).orderBy(asc(governorates.sortOrder));
    const regs = await db.select().from(regions).orderBy(asc(regions.sortOrder));
    return json({
      governorates: govs.map((g) => ({ ...g, regions: regs.filter((r) => r.governorateId === g.id) })),
    });
  }

  if (resource === "delivery" && can(perms, "delivery")) {
    const aggs = await db.select().from(deliveryAggregators).orderBy(asc(deliveryAggregators.id));
    const dispatches = await db.select().from(deliveryDispatches).orderBy(desc(deliveryDispatches.createdAt)).limit(100);
    return json({ aggregators: aggs, dispatches });
  }

  if (resource === "promos" && can(perms, "promos")) {
    return json({ promos: await db.select().from(promoCodes).orderBy(desc(promoCodes.id)) });
  }
  if (resource === "popups" && can(perms, "popups")) {
    return json({ popups: await db.select().from(popups).orderBy(asc(popups.sortOrder)) });
  }
  if (resource === "bans" && can(perms, "bans")) {
    return json({ bans: await db.select().from(bans).orderBy(desc(bans.createdAt)) });
  }
  if (resource === "settings" && (can(perms, "settings") || can(perms, "payments") || can(perms, "themes"))) {
    return json({ settings: await getSettings() });
  }

  return json({ error: "Forbidden" }, 403);
}

export async function POST(req: Request) {
  await ensureSeeded();
  const body = (await req.json()) as Record<string, unknown>;
  const action = String(body.action || "");

  if (action === "login") {
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const [row] = await db
      .select()
      .from(staff)
      .where(eq(staff.username, username))
      .limit(1);
    const byEmail = row
      ? row
      : (
          await db.select().from(staff).where(eq(staff.email, username)).limit(1)
        )[0];
    if (!byEmail || !byEmail.isActive) return json({ error: "Invalid credentials" }, 401);
    const ok = await verifyPassword(password, byEmail.passwordHash);
    if (!ok) return json({ error: "Invalid credentials" }, 401);
    await setStaffCookie(staffToSession(byEmail));
    return json({ ok: true });
  }

  if (action === "logout") {
    await clearStaffCookie();
    return json({ ok: true });
  }

  const current = await getCurrentStaff();
  if (!current) return json({ error: "Unauthorized" }, 401);
  const perms = current.role === "super_admin" ? ALL_PERMISSIONS : current.permissions;
  const id = Number(body.id);

  if (action === "updateOrder" && can(perms, "orders")) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.status === "string") patch.status = body.status;
    if (typeof body.paymentStatus === "string") patch.paymentStatus = body.paymentStatus;
    await db.update(orders).set(patch).where(eq(orders.id, id));
    return json({ ok: true });
  }

  if (action === "acceptDispatch" && can(perms, "delivery")) {
    const result = await acceptDispatch(Number(body.orderId), Number(body.aggregatorId));
    return json(result, result.ok ? 200 : 400);
  }

  if (action === "createCategory" && can(perms, "menu")) {
    const [row] = await db
      .insert(categories)
      .values({
        nameEn: String(body.nameEn || ""),
        nameAr: String(body.nameAr || ""),
        slug: slugify(String(body.slug || body.nameEn || "category")),
        image: body.image ? String(body.image) : null,
        parentId: body.parentId ? Number(body.parentId) : null,
        sortOrder: Number(body.sortOrder || 0),
        isActive: body.isActive !== false,
      })
      .returning();
    return json({ ok: true, row });
  }
  if (action === "updateCategory" && can(perms, "menu")) {
    await db
      .update(categories)
      .set({
        nameEn: String(body.nameEn || ""),
        nameAr: String(body.nameAr || ""),
        slug: slugify(String(body.slug || body.nameEn || "category")),
        image: body.image ? String(body.image) : null,
        parentId: body.parentId ? Number(body.parentId) : null,
        sortOrder: Number(body.sortOrder || 0),
        isActive: body.isActive !== false,
      })
      .where(eq(categories.id, id));
    return json({ ok: true });
  }
  if (action === "deleteCategory" && can(perms, "menu")) {
    await db.delete(categories).where(eq(categories.id, id));
    return json({ ok: true });
  }

  if (action === "createItem" && can(perms, "menu")) {
    const [row] = await db
      .insert(menuItems)
      .values({
        categoryId: Number(body.categoryId),
        nameEn: String(body.nameEn || ""),
        nameAr: String(body.nameAr || ""),
        descriptionEn: String(body.descriptionEn || ""),
        descriptionAr: String(body.descriptionAr || ""),
        image: body.image ? String(body.image) : null,
        basePriceFils: Number(body.basePriceFils || 0),
        discountPercent: Number(body.discountPercent || 0),
        isAvailable: body.isAvailable !== false,
        hasSizes: Boolean(body.hasSizes),
        stock: body.stock == null || body.stock === "" ? null : Number(body.stock),
        sortOrder: Number(body.sortOrder || 0),
      })
      .returning();
    return json({ ok: true, row });
  }
  if (action === "updateItem" && can(perms, "menu")) {
    await db
      .update(menuItems)
      .set({
        categoryId: Number(body.categoryId),
        nameEn: String(body.nameEn || ""),
        nameAr: String(body.nameAr || ""),
        descriptionEn: String(body.descriptionEn || ""),
        descriptionAr: String(body.descriptionAr || ""),
        image: body.image ? String(body.image) : null,
        basePriceFils: Number(body.basePriceFils || 0),
        discountPercent: Number(body.discountPercent || 0),
        isAvailable: body.isAvailable !== false,
        hasSizes: Boolean(body.hasSizes),
        stock: body.stock == null || body.stock === "" ? null : Number(body.stock),
        sortOrder: Number(body.sortOrder || 0),
      })
      .where(eq(menuItems.id, id));
    return json({ ok: true });
  }
  if (action === "deleteItem" && can(perms, "menu")) {
    await db.delete(menuItems).where(eq(menuItems.id, id));
    return json({ ok: true });
  }

  if (action === "createSize" && can(perms, "menu")) {
    const [row] = await db
      .insert(itemSizes)
      .values({
        itemId: Number(body.itemId),
        nameEn: String(body.nameEn || ""),
        nameAr: String(body.nameAr || ""),
        priceFils: Number(body.priceFils || 0),
        discountPercent: Number(body.discountPercent || 0),
        stock: body.stock == null || body.stock === "" ? null : Number(body.stock),
        isAvailable: body.isAvailable !== false,
        sortOrder: Number(body.sortOrder || 0),
      })
      .returning();
    await db.update(menuItems).set({ hasSizes: true }).where(eq(menuItems.id, Number(body.itemId)));
    return json({ ok: true, row });
  }
  if (action === "updateSize" && can(perms, "menu")) {
    await db
      .update(itemSizes)
      .set({
        nameEn: String(body.nameEn || ""),
        nameAr: String(body.nameAr || ""),
        priceFils: Number(body.priceFils || 0),
        discountPercent: Number(body.discountPercent || 0),
        stock: body.stock == null || body.stock === "" ? null : Number(body.stock),
        isAvailable: body.isAvailable !== false,
        sortOrder: Number(body.sortOrder || 0),
      })
      .where(eq(itemSizes.id, id));
    return json({ ok: true });
  }
  if (action === "deleteSize" && can(perms, "menu")) {
    await db.delete(itemSizes).where(eq(itemSizes.id, id));
    return json({ ok: true });
  }

  if (action === "createStaff" && can(perms, "staff")) {
    const passwordHash = await hashPassword(String(body.password || "ChangeMe123"));
    const [row] = await db
      .insert(staff)
      .values({
        username: String(body.username || ""),
        email: String(body.email || ""),
        passwordHash,
        fullName: String(body.fullName || ""),
        role: String(body.role || "staff"),
        permissions: (body.permissions as StaffPermissions) || {},
        isActive: body.isActive !== false,
      })
      .returning();
    return json({ ok: true, row: { id: row.id } });
  }
  if (action === "updateStaff" && can(perms, "staff")) {
    const patch: Record<string, unknown> = {
      username: String(body.username || ""),
      email: String(body.email || ""),
      fullName: String(body.fullName || ""),
      role: String(body.role || "staff"),
      permissions: (body.permissions as StaffPermissions) || {},
      isActive: body.isActive !== false,
    };
    if (body.password) patch.passwordHash = await hashPassword(String(body.password));
    await db.update(staff).set(patch).where(eq(staff.id, id));
    return json({ ok: true });
  }
  if (action === "deleteStaff" && can(perms, "staff")) {
    if (id === current.id) return json({ error: "Cannot delete yourself" }, 400);
    await db.delete(staff).where(and(eq(staff.id, id), eq(staff.role, "staff")));
    return json({ ok: true });
  }

  if (action === "createGovernorate" && can(perms, "regions")) {
    const [row] = await db
      .insert(governorates)
      .values({
        nameEn: String(body.nameEn || ""),
        nameAr: String(body.nameAr || ""),
        sortOrder: Number(body.sortOrder || 0),
        isActive: body.isActive !== false,
      })
      .returning();
    return json({ ok: true, row });
  }
  if (action === "updateGovernorate" && can(perms, "regions")) {
    await db
      .update(governorates)
      .set({
        nameEn: String(body.nameEn || ""),
        nameAr: String(body.nameAr || ""),
        sortOrder: Number(body.sortOrder || 0),
        isActive: body.isActive !== false,
      })
      .where(eq(governorates.id, id));
    return json({ ok: true });
  }
  if (action === "deleteGovernorate" && can(perms, "regions")) {
    await db.delete(governorates).where(eq(governorates.id, id));
    return json({ ok: true });
  }

  if (action === "createRegion" && can(perms, "regions")) {
    const [row] = await db
      .insert(regions)
      .values({
        governorateId: Number(body.governorateId),
        nameEn: String(body.nameEn || ""),
        nameAr: String(body.nameAr || ""),
        deliveryFeeFils: Number(body.deliveryFeeFils || 0),
        sortOrder: Number(body.sortOrder || 0),
        isActive: body.isActive !== false,
      })
      .returning();
    return json({ ok: true, row });
  }
  if (action === "updateRegion" && can(perms, "regions")) {
    await db
      .update(regions)
      .set({
        governorateId: Number(body.governorateId),
        nameEn: String(body.nameEn || ""),
        nameAr: String(body.nameAr || ""),
        deliveryFeeFils: Number(body.deliveryFeeFils || 0),
        sortOrder: Number(body.sortOrder || 0),
        isActive: body.isActive !== false,
      })
      .where(eq(regions.id, id));
    return json({ ok: true });
  }
  if (action === "deleteRegion" && can(perms, "regions")) {
    await db.delete(regions).where(eq(regions.id, id));
    return json({ ok: true });
  }

  if (action === "createAggregator" && can(perms, "delivery")) {
    const [row] = await db
      .insert(deliveryAggregators)
      .values({
        name: String(body.name || ""),
        apiKey: String(body.apiKey || ""),
        apiUrl: String(body.apiUrl || ""),
        webhookSecret: String(body.webhookSecret || ""),
        isActive: body.isActive !== false,
      })
      .returning();
    return json({ ok: true, row });
  }
  if (action === "updateAggregator" && can(perms, "delivery")) {
    await db
      .update(deliveryAggregators)
      .set({
        name: String(body.name || ""),
        apiKey: String(body.apiKey || ""),
        apiUrl: String(body.apiUrl || ""),
        webhookSecret: String(body.webhookSecret || ""),
        isActive: body.isActive !== false,
      })
      .where(eq(deliveryAggregators.id, id));
    return json({ ok: true });
  }
  if (action === "deleteAggregator" && can(perms, "delivery")) {
    await db.delete(deliveryAggregators).where(eq(deliveryAggregators.id, id));
    return json({ ok: true });
  }

  if (action === "createPromo" && can(perms, "promos")) {
    const [row] = await db
      .insert(promoCodes)
      .values({
        code: String(body.code || "").toUpperCase(),
        descriptionEn: String(body.descriptionEn || ""),
        descriptionAr: String(body.descriptionAr || ""),
        discountPercent: Number(body.discountPercent || 0),
        minOrderFils: Number(body.minOrderFils || 0),
        maxUses: body.maxUses == null || body.maxUses === "" ? null : Number(body.maxUses),
        startsAt: body.startsAt ? new Date(String(body.startsAt)) : null,
        expiresAt: body.expiresAt ? new Date(String(body.expiresAt)) : null,
        isActive: body.isActive !== false,
      })
      .returning();
    return json({ ok: true, row });
  }
  if (action === "updatePromo" && can(perms, "promos")) {
    await db
      .update(promoCodes)
      .set({
        code: String(body.code || "").toUpperCase(),
        descriptionEn: String(body.descriptionEn || ""),
        descriptionAr: String(body.descriptionAr || ""),
        discountPercent: Number(body.discountPercent || 0),
        minOrderFils: Number(body.minOrderFils || 0),
        maxUses: body.maxUses == null || body.maxUses === "" ? null : Number(body.maxUses),
        startsAt: body.startsAt ? new Date(String(body.startsAt)) : null,
        expiresAt: body.expiresAt ? new Date(String(body.expiresAt)) : null,
        isActive: body.isActive !== false,
      })
      .where(eq(promoCodes.id, id));
    return json({ ok: true });
  }
  if (action === "deletePromo" && can(perms, "promos")) {
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
    return json({ ok: true });
  }

  if (action === "createPopup" && can(perms, "popups")) {
    const [row] = await db
      .insert(popups)
      .values({
        titleEn: String(body.titleEn || ""),
        titleAr: String(body.titleAr || ""),
        bodyEn: String(body.bodyEn || ""),
        bodyAr: String(body.bodyAr || ""),
        image: body.image ? String(body.image) : null,
        ctaEn: body.ctaEn ? String(body.ctaEn) : null,
        ctaAr: body.ctaAr ? String(body.ctaAr) : null,
        ctaHref: body.ctaHref ? String(body.ctaHref) : null,
        startsAt: body.startsAt ? new Date(String(body.startsAt)) : null,
        endsAt: body.endsAt ? new Date(String(body.endsAt)) : null,
        isActive: body.isActive !== false,
        sortOrder: Number(body.sortOrder || 0),
      })
      .returning();
    return json({ ok: true, row });
  }
  if (action === "updatePopup" && can(perms, "popups")) {
    await db
      .update(popups)
      .set({
        titleEn: String(body.titleEn || ""),
        titleAr: String(body.titleAr || ""),
        bodyEn: String(body.bodyEn || ""),
        bodyAr: String(body.bodyAr || ""),
        image: body.image ? String(body.image) : null,
        ctaEn: body.ctaEn ? String(body.ctaEn) : null,
        ctaAr: body.ctaAr ? String(body.ctaAr) : null,
        ctaHref: body.ctaHref ? String(body.ctaHref) : null,
        startsAt: body.startsAt ? new Date(String(body.startsAt)) : null,
        endsAt: body.endsAt ? new Date(String(body.endsAt)) : null,
        isActive: body.isActive !== false,
        sortOrder: Number(body.sortOrder || 0),
      })
      .where(eq(popups.id, id));
    return json({ ok: true });
  }
  if (action === "deletePopup" && can(perms, "popups")) {
    await db.delete(popups).where(eq(popups.id, id));
    return json({ ok: true });
  }

  if (action === "createBan" && can(perms, "bans")) {
    const [row] = await db
      .insert(bans)
      .values({
        type: String(body.type || "email"),
        value: String(body.value || "").trim().toLowerCase(),
        reason: String(body.reason || ""),
      })
      .returning();
    if (String(body.type) === "email") {
      await db.update(users).set({ isBanned: true, banReason: String(body.reason || "") }).where(eq(users.email, String(body.value || "").toLowerCase()));
    }
    return json({ ok: true, row });
  }
  if (action === "deleteBan" && can(perms, "bans")) {
    await db.delete(bans).where(eq(bans.id, id));
    return json({ ok: true });
  }
  if (action === "toggleCustomerBan" && can(perms, "bans")) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) return json({ error: "Not found" }, 404);
    const next = !user.isBanned;
    await db.update(users).set({ isBanned: next, banReason: String(body.reason || user.banReason || "") }).where(eq(users.id, id));
    return json({ ok: true });
  }

  if (action === "saveSettings" && (can(perms, "settings") || can(perms, "payments") || can(perms, "themes"))) {
    const currentSettings = await getSettings();
    const incoming = body.settings as Partial<PublicSettings>;
    const next: PublicSettings = {
      ...currentSettings,
      ...incoming,
      restaurant: { ...currentSettings.restaurant, ...(incoming?.restaurant || {}) },
      payments: { ...currentSettings.payments, ...(incoming?.payments || {}) },
      delivery: { ...currentSettings.delivery, ...(incoming?.delivery || {}) },
      features: { ...currentSettings.features, ...(incoming?.features || {}) },
    };
    if (next.theme && !isThemeId(next.theme)) next.theme = DEFAULT_SETTINGS.theme;
    const saved = await saveSettings(next);
    return json({ ok: true, settings: saved });
  }

  if (action === "setTheme" && can(perms, "themes")) {
    const theme = String(body.theme || "");
    if (!isThemeId(theme)) return json({ error: "Unknown theme" }, 400);
    const currentSettings = await getSettings();
    const saved = await saveSettings({ ...currentSettings, theme });
    return json({ ok: true, settings: saved });
  }

  return json({ error: "Unknown or forbidden action" }, 400);
}
