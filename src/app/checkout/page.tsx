"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteChrome } from "@/components/site-chrome";
import { useApp } from "@/components/providers";
import { formatMoney } from "@/lib/utils";
import type { OrderType, PaymentMethod } from "@/lib/types";

type Gov = {
  id: number;
  nameEn: string;
  nameAr: string;
  regions: Array<{ id: number; nameEn: string; nameAr: string; deliveryFeeFils: number }>;
};

export default function CheckoutPage() {
  return (
    <SiteChrome>
      <CheckoutForm />
    </SiteChrome>
  );
}

function CheckoutForm() {
  const { lang, dict, cart, cartTotal, clearCart, me, settings } = useApp();
  const router = useRouter();
  const [govs, setGovs] = useState<Gov[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [promo, setPromo] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    governorateId: "",
    regionId: "",
    addressDetails: "",
    notes: "",
  });

  useEffect(() => {
    const stored = window.localStorage.getItem("jowdi_order_type") as OrderType | null;
    if (stored) setOrderType(stored);
    fetch("/api/public")
      .then((r) => r.json())
      .then((d) => setGovs(d.governorates || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (me) {
      setForm((f) => ({
        ...f,
        fullName: me.fullName || f.fullName,
        email: me.email || f.email,
        phone: me.phone || f.phone,
        governorateId: me.governorateId ? String(me.governorateId) : f.governorateId,
        regionId: me.regionId ? String(me.regionId) : f.regionId,
        addressDetails: me.addressDetails || f.addressDetails,
      }));
    }
  }, [me]);

  const regions = govs.find((g) => String(g.id) === form.governorateId)?.regions || [];
  const region = regions.find((r) => String(r.id) === form.regionId);
  const fullFee = orderType === "delivery" ? region?.deliveryFeeFils || 0 : 0;
  const customerFee = settings.delivery.sharedEnabled
    ? Math.round((fullFee * settings.delivery.customerSharePercent) / 100)
    : fullFee;
  const restaurantFee = fullFee - customerFee;
  const total = Math.max(0, cartTotal - promoDiscount + customerFee);

  async function applyPromo() {
    setPromoError("");
    const res = await fetch("/api/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promo, subtotalFils: cartTotal }),
    });
    const data = (await res.json()) as { error?: string; discountFils?: number };
    if (!res.ok) {
      setPromoDiscount(0);
      setPromoError(data.error || dict.common.error);
      return;
    }
    setPromoDiscount(data.discountFils || 0);
  }

  async function place(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!cart.length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          paymentMethod,
          ...form,
          governorateId: form.governorateId ? Number(form.governorateId) : null,
          regionId: form.regionId ? Number(form.regionId) : null,
          promoCode: promo || undefined,
          language: lang,
          items: cart,
        }),
      });
      const data = (await res.json()) as { error?: string; order?: { id: number; orderNumber: string } };
      if (!res.ok) {
        setError(data.error || dict.common.error);
        return;
      }
      clearCart();
      router.push(`/order/${data.order?.id}`);
    } finally {
      setBusy(false);
    }
  }

  const enabledTypes = useMemo(
    () =>
      [
        settings.features.dineIn ? "dine_in" : null,
        settings.features.takeaway ? "takeaway" : null,
        settings.features.delivery ? "delivery" : null,
      ].filter(Boolean) as OrderType[],
    [settings.features],
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:px-6">
      <form className="space-y-6" onSubmit={place}>
        <h1 className="font-display text-4xl">{dict.checkout.title}</h1>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{dict.checkout.orderType}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {enabledTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOrderType(t)}
                className={`rounded-full px-4 py-2 text-sm ${orderType === t ? "bg-[var(--accent)] text-[var(--accent-text)]" : "border border-[var(--border)]"}`}
              >
                {dict.orderTypes[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{dict.checkout.contact}</p>
          <input className="field" placeholder={dict.checkout.fullName} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <input className="field" type="email" placeholder={dict.checkout.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="field" placeholder={dict.checkout.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        </div>
        {orderType === "delivery" ? (
          <div className="grid gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{dict.checkout.address}</p>
            <select className="field" value={form.governorateId} onChange={(e) => setForm({ ...form, governorateId: e.target.value, regionId: "" })} required>
              <option value="">{dict.checkout.governorate}</option>
              {govs.map((g) => (
                <option key={g.id} value={g.id}>{lang === "ar" ? g.nameAr : g.nameEn}</option>
              ))}
            </select>
            <select className="field" value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value })} required>
              <option value="">{dict.checkout.region}</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{lang === "ar" ? r.nameAr : r.nameEn}</option>
              ))}
            </select>
            <textarea className="field" placeholder={dict.checkout.addressDetails} value={form.addressDetails} onChange={(e) => setForm({ ...form, addressDetails: e.target.value })} required />
          </div>
        ) : null}
        <textarea className="field" placeholder={dict.checkout.notes} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{dict.checkout.payment}</p>
          <div className="mt-3 space-y-2">
            {settings.payments.cashEnabled ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={paymentMethod === "cash"} onChange={() => setPaymentMethod("cash")} />
                {dict.checkout.cash}
              </label>
            ) : null}
            {settings.payments.benefitPayEnabled ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={paymentMethod === "benefitpay"} onChange={() => setPaymentMethod("benefitpay")} />
                {dict.checkout.benefitpay}
              </label>
            ) : (
              <p className="text-xs text-[var(--muted)]">{dict.checkout.benefitpay}: {dict.checkout.paymentUnavailable}</p>
            )}
            {settings.payments.cardEnabled ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} />
                {dict.checkout.card}
              </label>
            ) : (
              <p className="text-xs text-[var(--muted)]">{dict.checkout.card}: {dict.checkout.paymentUnavailable}</p>
            )}
          </div>
        </div>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <button type="submit" className="btn-primary w-full py-3" disabled={busy || !cart.length}>
          {busy ? dict.checkout.processing : dict.checkout.place}
        </button>
      </form>
      <aside className="surface-card h-fit p-6">
        {cart.map((line, i) => (
          <div key={i} className="mb-3 flex justify-between gap-3 text-sm">
            <span>
              {lang === "ar" ? line.nameAr : line.nameEn}
              {line.sizeNameEn ? ` · ${lang === "ar" ? line.sizeNameAr : line.sizeNameEn}` : ""} × {line.quantity}
            </span>
            <span>{formatMoney(line.unitPriceFils * line.quantity, lang)}</span>
          </div>
        ))}
        <div className="gold-line my-4" />
        <div className="flex gap-2">
          <input className="field" placeholder={dict.checkout.promo} value={promo} onChange={(e) => setPromo(e.target.value)} />
          <button type="button" className="btn-ghost px-4" onClick={() => void applyPromo()}>{dict.checkout.apply}</button>
        </div>
        {promoError ? <p className="mt-2 text-xs text-[var(--danger)]">{promoError}</p> : null}
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span>{dict.checkout.subtotal}</span><span>{formatMoney(cartTotal, lang)}</span></div>
          {promoDiscount ? <div className="flex justify-between text-[var(--success)]"><span>{dict.checkout.discount}</span><span>- {formatMoney(promoDiscount, lang)}</span></div> : null}
          {orderType === "delivery" ? (
            <>
              <div className="flex justify-between"><span>{dict.checkout.deliveryFee}</span><span>{formatMoney(customerFee, lang)}</span></div>
              {settings.delivery.sharedEnabled ? (
                <p className="text-xs text-[var(--muted)]">
                  {dict.checkout.sharedNote} ({dict.checkout.restaurantShare}: {formatMoney(restaurantFee, lang)})
                </p>
              ) : null}
            </>
          ) : null}
          <div className="flex justify-between text-lg font-semibold">
            <span>{dict.checkout.total}</span>
            <span>{formatMoney(total, lang)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
