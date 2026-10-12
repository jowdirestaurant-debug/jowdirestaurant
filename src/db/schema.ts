import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const governorates = pgTable("governorates", {
  id: serial("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const regions = pgTable(
  "regions",
  {
    id: serial("id").primaryKey(),
    governorateId: integer("governorate_id")
      .references(() => governorates.id, { onDelete: "cascade" })
      .notNull(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    deliveryFeeFils: integer("delivery_fee_fils").default(1000).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => [index("regions_gov_idx").on(t.governorateId)],
);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    passwordHash: text("password_hash"),
    phone: text("phone").notNull(),
    governorateId: integer("governorate_id").references(() => governorates.id),
    regionId: integer("region_id").references(() => regions.id),
    addressDetails: text("address_details"),
    language: text("language").default("ar").notNull(),
    isGuest: boolean("is_guest").default(false).notNull(),
    isBanned: boolean("is_banned").default(false).notNull(),
    banReason: text("ban_reason"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    index("users_phone_idx").on(t.phone),
  ],
);

export const verificationCodes = pgTable(
  "verification_codes",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    code: text("code").notNull(),
    type: text("type").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    used: boolean("used").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("verification_email_idx").on(t.email)],
);

export const staff = pgTable(
  "staff",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    role: text("role").default("staff").notNull(),
    permissions: jsonb("permissions").$type<Record<string, boolean>>().default({}).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("staff_username_idx").on(t.username),
    uniqueIndex("staff_email_idx").on(t.email),
  ],
);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id"),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  slug: text("slug").notNull(),
  image: text("image"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const menuItems = pgTable(
  "menu_items",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .references(() => categories.id, { onDelete: "cascade" })
      .notNull(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    descriptionEn: text("description_en").default("").notNull(),
    descriptionAr: text("description_ar").default("").notNull(),
    image: text("image"),
    basePriceFils: integer("base_price_fils").default(0).notNull(),
    discountPercent: integer("discount_percent").default(0).notNull(),
    isAvailable: boolean("is_available").default(true).notNull(),
    hasSizes: boolean("has_sizes").default(false).notNull(),
    stock: integer("stock"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("menu_items_cat_idx").on(t.categoryId)],
);

export const itemSizes = pgTable(
  "item_sizes",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .references(() => menuItems.id, { onDelete: "cascade" })
      .notNull(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    priceFils: integer("price_fils").notNull(),
    discountPercent: integer("discount_percent").default(0).notNull(),
    stock: integer("stock"),
    isAvailable: boolean("is_available").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("item_sizes_item_idx").on(t.itemId)],
);

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    descriptionEn: text("description_en").default("").notNull(),
    descriptionAr: text("description_ar").default("").notNull(),
    discountPercent: integer("discount_percent").notNull(),
    minOrderFils: integer("min_order_fils").default(0).notNull(),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").default(0).notNull(),
    startsAt: timestamp("starts_at", { mode: "date" }),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => [uniqueIndex("promo_code_idx").on(t.code)],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    userId: integer("user_id").references(() => users.id),
    guestName: text("guest_name"),
    guestPhone: text("guest_phone"),
    guestEmail: text("guest_email"),
    orderType: text("order_type").notNull(),
    governorateId: integer("governorate_id").references(() => governorates.id),
    regionId: integer("region_id").references(() => regions.id),
    addressDetails: text("address_details"),
    subtotalFils: integer("subtotal_fils").notNull(),
    deliveryFeeFils: integer("delivery_fee_fils").default(0).notNull(),
    customerDeliveryFils: integer("customer_delivery_fils").default(0).notNull(),
    restaurantDeliveryFils: integer("restaurant_delivery_fils").default(0).notNull(),
    discountFils: integer("discount_fils").default(0).notNull(),
    totalFils: integer("total_fils").notNull(),
    promoCode: text("promo_code"),
    paymentMethod: text("payment_method").notNull(),
    paymentStatus: text("payment_status").default("pending").notNull(),
    status: text("status").default("pending").notNull(),
    notes: text("notes"),
    language: text("language").default("ar").notNull(),
    assignedAggregatorId: integer("assigned_aggregator_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("orders_number_idx").on(t.orderNumber),
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .references(() => orders.id, { onDelete: "cascade" })
      .notNull(),
    itemId: integer("item_id").references(() => menuItems.id),
    sizeId: integer("size_id").references(() => itemSizes.id),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    sizeNameEn: text("size_name_en"),
    sizeNameAr: text("size_name_ar"),
    unitPriceFils: integer("unit_price_fils").notNull(),
    quantity: integer("quantity").notNull(),
    totalFils: integer("total_fils").notNull(),
    image: text("image"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const deliveryAggregators = pgTable("delivery_aggregators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  apiKey: text("api_key").default("").notNull(),
  apiUrl: text("api_url").default("").notNull(),
  webhookSecret: text("webhook_secret").default("").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  config: jsonb("config").$type<Record<string, string>>().default({}).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const deliveryDispatches = pgTable(
  "delivery_dispatches",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .references(() => orders.id, { onDelete: "cascade" })
      .notNull(),
    aggregatorId: integer("aggregator_id")
      .references(() => deliveryAggregators.id, { onDelete: "cascade" })
      .notNull(),
    status: text("status").default("broadcast").notNull(),
    externalId: text("external_id"),
    acceptedAt: timestamp("accepted_at", { mode: "date" }),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("dispatches_order_idx").on(t.orderId)],
);

export const popups = pgTable("popups", {
  id: serial("id").primaryKey(),
  titleEn: text("title_en").notNull(),
  titleAr: text("title_ar").notNull(),
  bodyEn: text("body_en").notNull(),
  bodyAr: text("body_ar").notNull(),
  image: text("image"),
  ctaEn: text("cta_en"),
  ctaAr: text("cta_ar"),
  ctaHref: text("cta_href"),
  startsAt: timestamp("starts_at", { mode: "date" }),
  endsAt: timestamp("ends_at", { mode: "date" }),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const bans = pgTable("bans", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  value: text("value").notNull(),
  reason: text("reason").default("").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export type Governorate = typeof governorates.$inferSelect;
export type Region = typeof regions.$inferSelect;
export type User = typeof users.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type ItemSize = typeof itemSizes.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
export type DeliveryAggregator = typeof deliveryAggregators.$inferSelect;
export type Popup = typeof popups.$inferSelect;
export type Ban = typeof bans.$inferSelect;
