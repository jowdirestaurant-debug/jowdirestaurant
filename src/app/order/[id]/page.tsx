"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SiteChrome } from "@/components/site-chrome";
import { useApp } from "@/components/providers";
import { formatMoney } from "@/lib/utils";

type Order = {
  id: number;
  orderNumber: string;
  status: string;
  orderType: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotalFils: number;
  customerDeliveryFils: number;
  discountFils: number;
  totalFils: number;
  guestName: string;
  createdAt: string;
};
type Item = {
  id: number;
  nameEn: string;
  nameAr: string;
  sizeNameEn: string | null;
  sizeNameAr: string | null;
  quantity: number;
  totalFils: number;
};

export default function OrderPage() {
  return (
    <SiteChrome>
      <OrderView />
    </SiteChrome>
  );
}

function OrderView() {
  const params = useParams<{ id: string }>();
  const { lang, dict } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/orders?id=${params.id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) setError(d.error || dict.common.error);
        else {
          setOrder(d.order);
          setItems(d.items || []);
        }
      })
      .catch(() => setError(dict.common.error));
  }, [params.id, dict.common.error]);

  if (error) return <div className="px-6 py-20 text-center text-[var(--danger)]">{error}</div>;
  if (!order) return <div className="px-6 py-20 text-center">{dict.common.loading}</div>;

  const statusKey = order.status as keyof typeof dict.order.statuses;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="surface-card p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent)]">{dict.checkout.success}</p>
        <h1 className="font-display mt-2 text-3xl">{dict.order.number} {order.orderNumber}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {dict.order.status}: {dict.order.statuses[statusKey] || order.status}
        </p>
        <div className="mt-6 space-y-2 text-sm">
          {items.map((i) => (
            <div key={i.id} className="flex justify-between">
              <span>
                {lang === "ar" ? i.nameAr : i.nameEn}
                {i.sizeNameEn ? ` · ${lang === "ar" ? i.sizeNameAr : i.sizeNameEn}` : ""} × {i.quantity}
              </span>
              <span>{formatMoney(i.totalFils, lang)}</span>
            </div>
          ))}
        </div>
        <div className="gold-line my-5" />
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>{dict.checkout.subtotal}</span><span>{formatMoney(order.subtotalFils, lang)}</span></div>
          {order.discountFils ? <div className="flex justify-between"><span>{dict.checkout.discount}</span><span>- {formatMoney(order.discountFils, lang)}</span></div> : null}
          {order.customerDeliveryFils ? <div className="flex justify-between"><span>{dict.checkout.deliveryFee}</span><span>{formatMoney(order.customerDeliveryFils, lang)}</span></div> : null}
          <div className="flex justify-between text-lg font-semibold"><span>{dict.checkout.total}</span><span>{formatMoney(order.totalFils, lang)}</span></div>
        </div>
      </div>
    </div>
  );
}
