import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_SETTINGS, type PublicSettings } from "./types";

function mergeSettings(raw: unknown): PublicSettings {
  const value = (raw || {}) as Partial<PublicSettings>;
  return {
    theme: value.theme || DEFAULT_SETTINGS.theme,
    restaurant: { ...DEFAULT_SETTINGS.restaurant, ...(value.restaurant || {}) },
    payments: { ...DEFAULT_SETTINGS.payments, ...(value.payments || {}) },
    delivery: { ...DEFAULT_SETTINGS.delivery, ...(value.delivery || {}) },
    features: { ...DEFAULT_SETTINGS.features, ...(value.features || {}) },
    menuDiscountPercent: value.menuDiscountPercent ?? DEFAULT_SETTINGS.menuDiscountPercent,
  };
}

export async function getSettings(): Promise<PublicSettings> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "site")).limit(1);
    if (!row) return DEFAULT_SETTINGS;
    return mergeSettings(row.value);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(next: PublicSettings): Promise<PublicSettings> {
  const current = await getSettings();
  const merged = mergeSettings({ ...current, ...next });
  await db
    .insert(settings)
    .values({ key: "site", value: merged })
    .onConflictDoUpdate({ target: settings.key, set: { value: merged } });
  return merged;
}

export function publicPayments(settingsValue: PublicSettings) {
  return {
    cashEnabled: settingsValue.payments.cashEnabled,
    benefitPayEnabled: settingsValue.payments.benefitPayEnabled && Boolean(settingsValue.payments.benefitPayApiKey),
    cardEnabled: settingsValue.payments.cardEnabled && Boolean(settingsValue.payments.cardPublicKey),
    benefitPayConfigured: Boolean(settingsValue.payments.benefitPayApiKey),
    cardConfigured: Boolean(settingsValue.payments.cardSecretKey),
  };
}
