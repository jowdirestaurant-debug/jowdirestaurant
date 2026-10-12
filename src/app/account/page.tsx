"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteChrome } from "@/components/site-chrome";
import { useApp } from "@/components/providers";
import { formatMoney } from "@/lib/utils";

type Gov = { id: number; nameEn: string; nameAr: string; regions: Array<{ id: number; nameEn: string; nameAr: string }> };
type Order = {
  id: number;
  orderNumber: string;
  status: keyof typeof import("@/dictionaries/en").en.order.statuses;
  totalFils: number;
  createdAt: string;
  orderType: string;
};

export default function AccountPage() {
  return (
    <SiteChrome>
      <AccountView />
    </SiteChrome>
  );
}

function AccountView() {
  const { lang, dict, me, refreshMe } = useApp();
  const [govs, setGovs] = useState<Gov[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    governorateId: "",
    regionId: "",
    addressDetails: "",
  });

  useEffect(() => {
    fetch("/api/public")
      .then((r) => r.json())
      .then((d) => setGovs(d.governorates || []))
      .catch(() => undefined);
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (me) {
      setForm({
        fullName: me.fullName,
        phone: me.phone,
        governorateId: me.governorateId ? String(me.governorateId) : "",
        regionId: me.regionId ? String(me.regionId) : "",
        addressDetails: me.addressDetails || "",
      });
    }
  }, [me]);

  const regions = govs.find((g) => String(g.id) === form.governorateId)?.regions || [];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        ...form,
        governorateId: form.governorateId ? Number(form.governorateId) : null,
        regionId: form.regionId ? Number(form.regionId) : null,
        language: lang,
      }),
    });
    await refreshMe();
    setSaved(true);
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl">{dict.nav.login}</h1>
        <Link href="/login" className="btn-primary mt-6 inline-block px-6 py-3">{dict.nav.login}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:px-6">
      <form className="surface-card space-y-4 p-6" onSubmit={save}>
        <h1 className="font-display text-3xl">{dict.account.title}</h1>
        <input className="field" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <input className="field" value={me.email} disabled />
        <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <select className="field" value={form.governorateId} onChange={(e) => setForm({ ...form, governorateId: e.target.value, regionId: "" })}>
          <option value="">{dict.checkout.governorate}</option>
          {govs.map((g) => (
            <option key={g.id} value={g.id}>{lang === "ar" ? g.nameAr : g.nameEn}</option>
          ))}
        </select>
        <select className="field" value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value })}>
          <option value="">{dict.checkout.region}</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{lang === "ar" ? r.nameAr : r.nameEn}</option>
          ))}
        </select>
        <textarea className="field" value={form.addressDetails} onChange={(e) => setForm({ ...form, addressDetails: e.target.value })} />
        {saved ? <p className="text-sm text-[var(--success)]">{dict.auth.saved}</p> : null}
        <button className="btn-primary px-5 py-2" type="submit">{dict.account.save}</button>
      </form>
      <div className="surface-card p-6">
        <h2 className="font-display text-2xl">{dict.account.orders}</h2>
        <div className="mt-4 space-y-3">
          {orders.length === 0 ? <p className="text-sm text-[var(--muted)]">{dict.account.emptyOrders}</p> : null}
          {orders.map((o) => (
            <Link key={o.id} href={`/order/${o.id}`} className="block rounded-2xl border border-[var(--border)] p-4">
              <div className="flex justify-between">
                <span className="font-medium">{o.orderNumber}</span>
                <span className="text-[var(--accent)]">{formatMoney(o.totalFils, lang)}</span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {dict.order.statuses[o.status] || o.status} · {new Date(o.createdAt).toLocaleString(lang === "ar" ? "ar-BH" : "en-GB")}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
