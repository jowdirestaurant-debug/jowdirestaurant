"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers";
import { THEMES } from "@/lib/themes";
import { ALL_PERMISSIONS, type PublicSettings, type StaffPermissions } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

type Section =
  | "overview"
  | "orders"
  | "menu"
  | "customers"
  | "staff"
  | "regions"
  | "delivery"
  | "promos"
  | "popups"
  | "bans"
  | "themes"
  | "settings";

type StaffMe = { id: number; username: string; fullName: string; role: string; permissions: StaffPermissions };

async function adminGet(resource: string) {
  const res = await fetch(`/api/admin?resource=${resource}`, { credentials: "include" });
  const data = await res.json();
  if (res.status === 401) throw new Error("auth");
  return data;
}
async function adminPost(payload: Record<string, unknown>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return res.json();
}

function ImageBrowse({ value, onChange, label }: { value?: string | null; onChange: (v: string) => void; label: string }) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-[var(--muted)]">{label}</label>
      <input
        type="file"
        accept="image/*"
        className="field"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = String(reader.result || "");
            const res = await fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dataUrl }),
            });
            const data = await res.json();
            if (data.url) onChange(data.url);
          };
          reader.readAsDataURL(file);
        }}
      />
      {value ? <img src={value} alt="" className="h-20 w-20 rounded-xl object-cover" /> : null}
    </div>
  );
}

export default function AdminPage() {
  const { dict, lang, setLang, settings, setSettings } = useApp();
  const router = useRouter();
  const [me, setMe] = useState<StaffMe | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [stats, setStats] = useState({ todayOrders: 0, revenue: 0, openOrders: 0, customers: 0 });
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [menu, setMenu] = useState<{ categories: Array<Record<string, unknown>>; items: Array<Record<string, unknown>> }>({ categories: [], items: [] });
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [staffRows, setStaffRows] = useState<Array<Record<string, unknown>>>([]);
  const [govs, setGovs] = useState<Array<Record<string, unknown>>>([]);
  const [aggregators, setAggregators] = useState<Array<Record<string, unknown>>>([]);
  const [promos, setPromos] = useState<Array<Record<string, unknown>>>([]);
  const [popups, setPopups] = useState<Array<Record<string, unknown>>>([]);
  const [banRows, setBanRows] = useState<Array<Record<string, unknown>>>([]);
  const [site, setSite] = useState<PublicSettings>(settings);

  const perms = me?.role === "super_admin" ? ALL_PERMISSIONS : me?.permissions || {};

  const nav: Array<{ id: Section; label: string; show: boolean }> = [
    { id: "overview", label: dict.admin.overview, show: true },
    { id: "orders", label: dict.admin.orders, show: Boolean(perms.orders) },
    { id: "menu", label: dict.admin.menu, show: Boolean(perms.menu) },
    { id: "customers", label: dict.admin.customers, show: Boolean(perms.customers) },
    { id: "staff", label: dict.admin.staff, show: Boolean(perms.staff) },
    { id: "regions", label: dict.admin.regions, show: Boolean(perms.regions) },
    { id: "delivery", label: dict.admin.delivery, show: Boolean(perms.delivery) },
    { id: "promos", label: dict.admin.promos, show: Boolean(perms.promos) },
    { id: "popups", label: dict.admin.popups, show: Boolean(perms.popups) },
    { id: "bans", label: dict.admin.bans, show: Boolean(perms.bans) },
    { id: "themes", label: dict.admin.themes, show: Boolean(perms.themes) },
    { id: "settings", label: dict.admin.settings, show: Boolean(perms.settings || perms.payments) },
  ];

  async function boot() {
    try {
      const meData = await adminGet("me");
      setMe(meData.staff);
      const s = await adminGet("stats");
      setStats(s);
    } catch {
      router.push("/admin/login");
    }
  }

  useEffect(() => {
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me) return;
    if (section === "orders") adminGet("orders").then((d) => setOrders(d.orders || []));
    if (section === "menu") adminGet("menu").then((d) => setMenu({ categories: d.categories || [], items: d.items || [] }));
    if (section === "customers") adminGet("customers").then((d) => setCustomers(d.customers || []));
    if (section === "staff") adminGet("staff").then((d) => setStaffRows(d.staff || []));
    if (section === "regions") adminGet("regions").then((d) => setGovs(d.governorates || []));
    if (section === "delivery") adminGet("delivery").then((d) => setAggregators(d.aggregators || []));
    if (section === "promos") adminGet("promos").then((d) => setPromos(d.promos || []));
    if (section === "popups") adminGet("popups").then((d) => setPopups(d.popups || []));
    if (section === "bans") adminGet("bans").then((d) => setBanRows(d.bans || []));
    if (section === "settings" || section === "themes") adminGet("settings").then((d) => d.settings && setSite(d.settings));
  }, [section, me]);

  async function logout() {
    await adminPost({ action: "logout" });
    router.push("/admin/login");
  }

  async function applyTheme(id: string) {
    const data = await adminPost({ action: "setTheme", theme: id });
    if (data.settings) {
      setSite(data.settings);
      setSettings(data.settings);
    }
  }

  if (!me) return <div className="grid min-h-screen place-items-center">{dict.common.loading}</div>;

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <aside className="hidden w-64 shrink-0 border-e border-[var(--border)] bg-[var(--bg-elev)] p-4 md:block">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">{dict.admin.dashboard}</p>
        <p className="mt-2 font-medium">{me.fullName}</p>
        <nav className="mt-6 space-y-1 text-sm">
          {nav.filter((n) => n.show).map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setSection(n.id)}
              className={`block w-full rounded-xl px-3 py-2 text-start ${section === n.id ? "bg-[var(--accent)] text-[var(--accent-text)]" : "hover:bg-[var(--surface)]"}`}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <button type="button" className="btn-ghost mt-8 w-full py-2 text-sm" onClick={() => void logout()}>
          {dict.admin.logout}
        </button>
      </aside>
      <main className="flex-1 overflow-x-auto p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl">{nav.find((n) => n.id === section)?.label}</h1>
          <div className="flex gap-2">
            <select className="field md:hidden" value={section} onChange={(e) => setSection(e.target.value as Section)}>
              {nav.filter((n) => n.show).map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
            <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
              {dict.nav.language}
            </button>
          </div>
        </div>

        {section === "overview" ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[
              [dict.admin.todayOrders, stats.todayOrders],
              [dict.admin.revenue, formatMoney(stats.revenue, lang)],
              [dict.admin.openOrders, stats.openOrders],
              [dict.admin.customersCount, stats.customers],
            ].map(([l, v]) => (
              <div key={String(l)} className="surface-card p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{l}</p>
                <p className="mt-3 text-3xl">{v}</p>
              </div>
            ))}
          </div>
        ) : null}

        {section === "orders" ? <OrdersSection orders={orders} lang={lang} dict={dict} onChange={() => adminGet("orders").then((d) => setOrders(d.orders || []))} /> : null}
        {section === "menu" ? <MenuSection menu={menu} dict={dict} onChange={() => adminGet("menu").then((d) => setMenu({ categories: d.categories || [], items: d.items || [] }))} /> : null}
        {section === "customers" ? (
          <div className="overflow-x-auto surface-card">
            <table className="w-full text-sm">
              <thead className="text-start text-[var(--muted)]">
                <tr>
                  <th className="p-3">{dict.checkout.fullName}</th>
                  <th className="p-3">{dict.checkout.email}</th>
                  <th className="p-3">{dict.checkout.phone}</th>
                  <th className="p-3">{dict.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={String(c.id)} className="border-t border-[var(--border)]">
                    <td className="p-3">{String(c.fullName)}</td>
                    <td className="p-3">{String(c.email)}</td>
                    <td className="p-3">{String(c.phone)}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        className="btn-ghost px-3 py-1 text-xs"
                        onClick={async () => {
                          await adminPost({ action: "toggleCustomerBan", id: c.id, reason: "Admin action" });
                          const d = await adminGet("customers");
                          setCustomers(d.customers || []);
                        }}
                      >
                        {c.isBanned ? "Unban" : "Ban"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {section === "staff" ? <StaffSection rows={staffRows} dict={dict} onChange={() => adminGet("staff").then((d) => setStaffRows(d.staff || []))} /> : null}
        {section === "regions" ? <RegionsSection govs={govs} dict={dict} lang={lang} onChange={() => adminGet("regions").then((d) => setGovs(d.governorates || []))} /> : null}
        {section === "delivery" ? <DeliverySection rows={aggregators} dict={dict} onChange={() => adminGet("delivery").then((d) => setAggregators(d.aggregators || []))} /> : null}
        {section === "promos" ? <PromosSection rows={promos} dict={dict} onChange={() => adminGet("promos").then((d) => setPromos(d.promos || []))} /> : null}
        {section === "popups" ? <PopupsSection rows={popups} dict={dict} onChange={() => adminGet("popups").then((d) => setPopups(d.popups || []))} /> : null}
        {section === "bans" ? <BansSection rows={banRows} dict={dict} onChange={() => adminGet("bans").then((d) => setBanRows(d.bans || []))} /> : null}

        {section === "themes" ? (
          <div>
            <p className="mb-4 text-sm text-[var(--muted)]">{dict.admin.currentTheme}: {site.theme}</p>
            <div className="grid gap-4 md:grid-cols-4">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => void applyTheme(t.id)}
                  className={`surface-card p-4 text-start ${site.theme === t.id ? "ring-2 ring-[var(--accent)]" : ""}`}
                >
                  <div className="mb-3 flex h-14 overflow-hidden rounded-xl">
                    {t.preview.map((c) => (
                      <span key={c} className="flex-1" style={{ background: c }} />
                    ))}
                  </div>
                  <p className="font-medium">{lang === "ar" ? t.nameAr : t.nameEn}</p>
                  <p className="text-xs text-[var(--muted)]">{t.group}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {section === "settings" ? (
          <SettingsSection
            site={site}
            dict={dict}
            onSave={async (next) => {
              const data = await adminPost({ action: "saveSettings", settings: next });
              if (data.settings) {
                setSite(data.settings);
                setSettings(data.settings);
              }
            }}
          />
        ) : null}
      </main>
    </div>
  );
}

function OrdersSection({
  orders,
  lang,
  dict,
  onChange,
}: {
  orders: Array<Record<string, unknown>>;
  lang: "ar" | "en";
  dict: ReturnType<typeof useApp>["dict"];
  onChange: () => void;
}) {
  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <div key={String(o.id)} className="surface-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{String(o.orderNumber)}</p>
              <p className="text-xs text-[var(--muted)]">
                {String(o.guestName)} · {String(o.guestPhone)} · {String(o.orderType)} · {formatMoney(Number(o.totalFils), lang)}
              </p>
            </div>
            <div className="flex gap-2">
              <select
                className="field"
                value={String(o.status)}
                onChange={async (e) => {
                  await adminPost({ action: "updateOrder", id: o.id, status: e.target.value });
                  onChange();
                }}
              >
                {Object.keys(dict.order.statuses).map((s) => (
                  <option key={s} value={s}>{dict.order.statuses[s as keyof typeof dict.order.statuses]}</option>
                ))}
              </select>
              <select
                className="field"
                value={String(o.paymentStatus)}
                onChange={async (e) => {
                  await adminPost({ action: "updateOrder", id: o.id, paymentStatus: e.target.value });
                  onChange();
                }}
              >
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="failed">failed</option>
                <option value="cash_on_arrival">cash_on_arrival</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuSection({
  menu,
  dict,
  onChange,
}: {
  menu: { categories: Array<Record<string, unknown>>; items: Array<Record<string, unknown>> };
  dict: ReturnType<typeof useApp>["dict"];
  onChange: () => void;
}) {
  const [cat, setCat] = useState({ nameEn: "", nameAr: "", image: "" });
  const [item, setItem] = useState({
    categoryId: "",
    nameEn: "",
    nameAr: "",
    descriptionEn: "",
    descriptionAr: "",
    image: "",
    basePriceFils: "0",
    discountPercent: "0",
    hasSizes: false,
  });
  const [size, setSize] = useState({ itemId: "", nameEn: "", nameAr: "", priceFils: "0", discountPercent: "0" });

  return (
    <div className="space-y-8">
      <div className="surface-card p-5">
        <h3 className="font-display text-xl">Categories</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input className="field" placeholder="Name EN" value={cat.nameEn} onChange={(e) => setCat({ ...cat, nameEn: e.target.value })} />
          <input className="field" placeholder="الاسم" value={cat.nameAr} onChange={(e) => setCat({ ...cat, nameAr: e.target.value })} />
        </div>
        <div className="mt-3">
          <ImageBrowse value={cat.image} onChange={(v) => setCat({ ...cat, image: v })} label={dict.common.browse} />
        </div>
        <button
          type="button"
          className="btn-primary mt-4 px-4 py-2"
          onClick={async () => {
            await adminPost({ action: "createCategory", ...cat });
            setCat({ nameEn: "", nameAr: "", image: "" });
            onChange();
          }}
        >
          {dict.common.add}
        </button>
        <div className="mt-4 space-y-2 text-sm">
          {menu.categories.map((c) => (
            <div key={String(c.id)} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
              <span>{String(c.nameEn)} / {String(c.nameAr)}</span>
              <button type="button" className="text-[var(--danger)]" onClick={async () => { await adminPost({ action: "deleteCategory", id: c.id }); onChange(); }}>{dict.common.delete}</button>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card p-5">
        <h3 className="font-display text-xl">Items</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <select className="field" value={item.categoryId} onChange={(e) => setItem({ ...item, categoryId: e.target.value })}>
            <option value="">Category</option>
            {menu.categories.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.nameEn)}</option>)}
          </select>
          <input className="field" placeholder="Name EN" value={item.nameEn} onChange={(e) => setItem({ ...item, nameEn: e.target.value })} />
          <input className="field" placeholder="الاسم" value={item.nameAr} onChange={(e) => setItem({ ...item, nameAr: e.target.value })} />
          <input className="field" placeholder="Price (fils)" value={item.basePriceFils} onChange={(e) => setItem({ ...item, basePriceFils: e.target.value })} />
          <input className="field" placeholder="Discount %" value={item.discountPercent} onChange={(e) => setItem({ ...item, discountPercent: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.hasSizes} onChange={(e) => setItem({ ...item, hasSizes: e.target.checked })} /> Multi-size</label>
        </div>
        <textarea className="field mt-3" placeholder="Description EN" value={item.descriptionEn} onChange={(e) => setItem({ ...item, descriptionEn: e.target.value })} />
        <textarea className="field mt-3" placeholder="الوصف" value={item.descriptionAr} onChange={(e) => setItem({ ...item, descriptionAr: e.target.value })} />
        <div className="mt-3"><ImageBrowse value={item.image} onChange={(v) => setItem({ ...item, image: v })} label={dict.common.browse} /></div>
        <button
          type="button"
          className="btn-primary mt-4 px-4 py-2"
          onClick={async () => {
            await adminPost({
              action: "createItem",
              ...item,
              categoryId: Number(item.categoryId),
              basePriceFils: Number(item.basePriceFils),
              discountPercent: Number(item.discountPercent),
            });
            onChange();
          }}
        >
          {dict.common.add}
        </button>
        <div className="mt-4 space-y-3">
          {menu.items.map((it) => (
            <div key={String(it.id)} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex justify-between gap-3">
                <p>{String(it.nameEn)} / {String(it.nameAr)} · {Number(it.basePriceFils)} fils</p>
                <button type="button" className="text-[var(--danger)]" onClick={async () => { await adminPost({ action: "deleteItem", id: it.id }); onChange(); }}>{dict.common.delete}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card p-5">
        <h3 className="font-display text-xl">Sizes</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <select className="field" value={size.itemId} onChange={(e) => setSize({ ...size, itemId: e.target.value })}>
            <option value="">Item</option>
            {menu.items.map((it) => <option key={String(it.id)} value={String(it.id)}>{String(it.nameEn)}</option>)}
          </select>
          <input className="field" placeholder="Small / Half / Family" value={size.nameEn} onChange={(e) => setSize({ ...size, nameEn: e.target.value })} />
          <input className="field" placeholder="صغير / النصف / العائلي" value={size.nameAr} onChange={(e) => setSize({ ...size, nameAr: e.target.value })} />
          <input className="field" placeholder="Price fils" value={size.priceFils} onChange={(e) => setSize({ ...size, priceFils: e.target.value })} />
        </div>
        <button
          type="button"
          className="btn-primary mt-4 px-4 py-2"
          onClick={async () => {
            await adminPost({
              action: "createSize",
              itemId: Number(size.itemId),
              nameEn: size.nameEn,
              nameAr: size.nameAr,
              priceFils: Number(size.priceFils),
              discountPercent: Number(size.discountPercent),
            });
            onChange();
          }}
        >
          {dict.common.add}
        </button>
      </div>
    </div>
  );
}

function StaffSection({ rows, dict, onChange }: { rows: Array<Record<string, unknown>>; dict: ReturnType<typeof useApp>["dict"]; onChange: () => void }) {
  const keys = Object.keys(ALL_PERMISSIONS) as Array<keyof StaffPermissions>;
  const [form, setForm] = useState({ username: "", email: "", fullName: "", password: "", permissions: { ...ALL_PERMISSIONS, staff: false, settings: false, payments: false } as StaffPermissions });
  return (
    <div className="space-y-6">
      <div className="surface-card grid gap-3 p-5 md:grid-cols-2">
        <input className="field" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input className="field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="field" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <input className="field" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="md:col-span-2 flex flex-wrap gap-3 text-sm">
          {keys.map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" checked={Boolean(form.permissions[k])} onChange={(e) => setForm({ ...form, permissions: { ...form.permissions, [k]: e.target.checked } })} />
              {k}
            </label>
          ))}
        </div>
        <button type="button" className="btn-primary px-4 py-2" onClick={async () => { await adminPost({ action: "createStaff", ...form }); onChange(); }}>{dict.common.add}</button>
      </div>
      {rows.map((s) => (
        <div key={String(s.id)} className="surface-card flex items-center justify-between p-4">
          <div>
            <p>{String(s.fullName)} · {String(s.username)}</p>
            <p className="text-xs text-[var(--muted)]">{String(s.role)}</p>
          </div>
          {s.role !== "super_admin" ? (
            <button type="button" className="text-[var(--danger)]" onClick={async () => { await adminPost({ action: "deleteStaff", id: s.id }); onChange(); }}>{dict.common.delete}</button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function RegionsSection({ govs, dict, lang, onChange }: { govs: Array<Record<string, unknown>>; dict: ReturnType<typeof useApp>["dict"]; lang: "ar" | "en"; onChange: () => void }) {
  const [g, setG] = useState({ nameEn: "", nameAr: "" });
  const [r, setR] = useState({ governorateId: "", nameEn: "", nameAr: "", deliveryFeeFils: "1000" });
  return (
    <div className="space-y-6">
      <div className="surface-card grid gap-3 p-5 md:grid-cols-2">
        <input className="field" placeholder="Governorate EN" value={g.nameEn} onChange={(e) => setG({ ...g, nameEn: e.target.value })} />
        <input className="field" placeholder="المحافظة" value={g.nameAr} onChange={(e) => setG({ ...g, nameAr: e.target.value })} />
        <button type="button" className="btn-primary px-4 py-2" onClick={async () => { await adminPost({ action: "createGovernorate", ...g }); onChange(); }}>{dict.common.add}</button>
      </div>
      <div className="surface-card grid gap-3 p-5 md:grid-cols-2">
        <select className="field" value={r.governorateId} onChange={(e) => setR({ ...r, governorateId: e.target.value })}>
          <option value="">Governorate</option>
          {govs.map((gov) => <option key={String(gov.id)} value={String(gov.id)}>{lang === "ar" ? String(gov.nameAr) : String(gov.nameEn)}</option>)}
        </select>
        <input className="field" placeholder="Region EN" value={r.nameEn} onChange={(e) => setR({ ...r, nameEn: e.target.value })} />
        <input className="field" placeholder="المنطقة" value={r.nameAr} onChange={(e) => setR({ ...r, nameAr: e.target.value })} />
        <input className="field" placeholder="Delivery fee fils" value={r.deliveryFeeFils} onChange={(e) => setR({ ...r, deliveryFeeFils: e.target.value })} />
        <button type="button" className="btn-primary px-4 py-2" onClick={async () => { await adminPost({ action: "createRegion", ...r, governorateId: Number(r.governorateId), deliveryFeeFils: Number(r.deliveryFeeFils) }); onChange(); }}>{dict.common.add}</button>
      </div>
      {govs.map((gov) => (
        <div key={String(gov.id)} className="surface-card p-4">
          <div className="flex justify-between">
            <p className="font-medium">{String(gov.nameEn)} / {String(gov.nameAr)}</p>
            <button type="button" className="text-[var(--danger)]" onClick={async () => { await adminPost({ action: "deleteGovernorate", id: gov.id }); onChange(); }}>{dict.common.delete}</button>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {((gov.regions as Array<Record<string, unknown>>) || []).map((reg) => (
              <div key={String(reg.id)} className="flex justify-between">
                <span>{String(reg.nameEn)} / {String(reg.nameAr)} · {Number(reg.deliveryFeeFils)} fils</span>
                <button type="button" className="text-[var(--danger)]" onClick={async () => { await adminPost({ action: "deleteRegion", id: reg.id }); onChange(); }}>{dict.common.delete}</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DeliverySection({ rows, dict, onChange }: { rows: Array<Record<string, unknown>>; dict: ReturnType<typeof useApp>["dict"]; onChange: () => void }) {
  const [form, setForm] = useState({ name: "", apiKey: "", apiUrl: "", webhookSecret: "" });
  return (
    <div className="space-y-4">
      <div className="surface-card grid gap-3 p-5">
        <input className="field" placeholder="Name (Parcel, Webey…)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="field" placeholder="API URL" value={form.apiUrl} onChange={(e) => setForm({ ...form, apiUrl: e.target.value })} />
        <input className="field" placeholder="API Key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
        <input className="field" placeholder="Webhook secret" value={form.webhookSecret} onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })} />
        <button type="button" className="btn-primary px-4 py-2" onClick={async () => { await adminPost({ action: "createAggregator", ...form }); onChange(); }}>{dict.common.add}</button>
      </div>
      {rows.map((a) => (
        <div key={String(a.id)} className="surface-card flex justify-between p-4">
          <div>
            <p>{String(a.name)}</p>
            <p className="text-xs text-[var(--muted)]">{String(a.apiUrl || "No endpoint yet")}</p>
          </div>
          <button type="button" className="text-[var(--danger)]" onClick={async () => { await adminPost({ action: "deleteAggregator", id: a.id }); onChange(); }}>{dict.common.delete}</button>
        </div>
      ))}
    </div>
  );
}

function PromosSection({ rows, dict, onChange }: { rows: Array<Record<string, unknown>>; dict: ReturnType<typeof useApp>["dict"]; onChange: () => void }) {
  const [form, setForm] = useState({ code: "", descriptionEn: "", descriptionAr: "", discountPercent: "10", minOrderFils: "0" });
  return (
    <div className="space-y-4">
      <div className="surface-card grid gap-3 p-5 md:grid-cols-2">
        <input className="field" placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input className="field" placeholder="Discount %" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
        <input className="field" placeholder="Description EN" value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
        <input className="field" placeholder="الوصف" value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} />
        <button type="button" className="btn-primary px-4 py-2" onClick={async () => { await adminPost({ action: "createPromo", ...form, discountPercent: Number(form.discountPercent), minOrderFils: Number(form.minOrderFils) }); onChange(); }}>{dict.common.add}</button>
      </div>
      {rows.map((p) => (
        <div key={String(p.id)} className="surface-card flex justify-between p-4">
          <p>{String(p.code)} · {String(p.discountPercent)}%</p>
          <button type="button" className="text-[var(--danger)]" onClick={async () => { await adminPost({ action: "deletePromo", id: p.id }); onChange(); }}>{dict.common.delete}</button>
        </div>
      ))}
    </div>
  );
}

function PopupsSection({ rows, dict, onChange }: { rows: Array<Record<string, unknown>>; dict: ReturnType<typeof useApp>["dict"]; onChange: () => void }) {
  const [form, setForm] = useState({ titleEn: "", titleAr: "", bodyEn: "", bodyAr: "", ctaEn: "", ctaAr: "", ctaHref: "#menu", image: "" });
  return (
    <div className="space-y-4">
      <div className="surface-card grid gap-3 p-5 md:grid-cols-2">
        <input className="field" placeholder="Title EN" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
        <input className="field" placeholder="العنوان" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
        <textarea className="field md:col-span-2" placeholder="Body EN" value={form.bodyEn} onChange={(e) => setForm({ ...form, bodyEn: e.target.value })} />
        <textarea className="field md:col-span-2" placeholder="النص" value={form.bodyAr} onChange={(e) => setForm({ ...form, bodyAr: e.target.value })} />
        <ImageBrowse value={form.image} onChange={(v) => setForm({ ...form, image: v })} label={dict.common.browse} />
        <button type="button" className="btn-primary px-4 py-2" onClick={async () => { await adminPost({ action: "createPopup", ...form }); onChange(); }}>{dict.common.add}</button>
      </div>
      {rows.map((p) => (
        <div key={String(p.id)} className="surface-card flex justify-between p-4">
          <p>{String(p.titleEn)} / {String(p.titleAr)}</p>
          <button type="button" className="text-[var(--danger)]" onClick={async () => { await adminPost({ action: "deletePopup", id: p.id }); onChange(); }}>{dict.common.delete}</button>
        </div>
      ))}
    </div>
  );
}

function BansSection({ rows, dict, onChange }: { rows: Array<Record<string, unknown>>; dict: ReturnType<typeof useApp>["dict"]; onChange: () => void }) {
  const [form, setForm] = useState({ type: "email", value: "", reason: "" });
  return (
    <div className="space-y-4">
      <div className="surface-card grid gap-3 p-5 md:grid-cols-3">
        <select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="email">email</option>
          <option value="phone">phone</option>
          <option value="address">address</option>
        </select>
        <input className="field" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        <input className="field" placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button type="button" className="btn-primary px-4 py-2" onClick={async () => { await adminPost({ action: "createBan", ...form }); onChange(); }}>{dict.common.add}</button>
      </div>
      {rows.map((b) => (
        <div key={String(b.id)} className="surface-card flex justify-between p-4">
          <p>{String(b.type)} · {String(b.value)}</p>
          <button type="button" className="text-[var(--danger)]" onClick={async () => { await adminPost({ action: "deleteBan", id: b.id }); onChange(); }}>{dict.common.delete}</button>
        </div>
      ))}
    </div>
  );
}

function SettingsSection({ site, dict, onSave }: { site: PublicSettings; dict: ReturnType<typeof useApp>["dict"]; onSave: (s: PublicSettings) => Promise<void> }) {
  const [form, setForm] = useState(site);
  useEffect(() => {
    setForm(site);
  }, [site]);
  return (
    <div className="space-y-6">
      <div className="surface-card grid gap-3 p-5 md:grid-cols-2">
        <input className="field" value={form.restaurant.nameEn} onChange={(e) => setForm({ ...form, restaurant: { ...form.restaurant, nameEn: e.target.value } })} />
        <input className="field" value={form.restaurant.nameAr} onChange={(e) => setForm({ ...form, restaurant: { ...form.restaurant, nameAr: e.target.value } })} />
        <input className="field" value={form.restaurant.phone} onChange={(e) => setForm({ ...form, restaurant: { ...form.restaurant, phone: e.target.value } })} />
        <input className="field" value={form.restaurant.email} onChange={(e) => setForm({ ...form, restaurant: { ...form.restaurant, email: e.target.value } })} />
        <input className="field md:col-span-2" value={form.restaurant.addressEn} onChange={(e) => setForm({ ...form, restaurant: { ...form.restaurant, addressEn: e.target.value } })} />
        <input className="field md:col-span-2" value={form.restaurant.addressAr} onChange={(e) => setForm({ ...form, restaurant: { ...form.restaurant, addressAr: e.target.value } })} />
        <ImageBrowse value={form.restaurant.logo} onChange={(v) => setForm({ ...form, restaurant: { ...form.restaurant, logo: v } })} label={dict.common.browse} />
      </div>
      <div className="surface-card grid gap-3 p-5 md:grid-cols-2">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.features.dineIn} onChange={(e) => setForm({ ...form, features: { ...form.features, dineIn: e.target.checked } })} /> Dine-in</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.features.takeaway} onChange={(e) => setForm({ ...form, features: { ...form.features, takeaway: e.target.checked } })} /> Takeaway</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.features.delivery} onChange={(e) => setForm({ ...form, features: { ...form.features, delivery: e.target.checked } })} /> Delivery</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.features.guestCheckout} onChange={(e) => setForm({ ...form, features: { ...form.features, guestCheckout: e.target.checked } })} /> Guest checkout</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.delivery.sharedEnabled} onChange={(e) => setForm({ ...form, delivery: { ...form.delivery, sharedEnabled: e.target.checked } })} /> Shared delivery fee</label>
        <input className="field" placeholder="Customer share %" value={form.delivery.customerSharePercent} onChange={(e) => setForm({ ...form, delivery: { ...form.delivery, customerSharePercent: Number(e.target.value), restaurantSharePercent: 100 - Number(e.target.value) } })} />
        <input className="field" placeholder="Menu-wide discount %" value={form.menuDiscountPercent} onChange={(e) => setForm({ ...form, menuDiscountPercent: Number(e.target.value) })} />
      </div>
      <div className="surface-card grid gap-3 p-5 md:grid-cols-2">
        <h3 className="font-display md:col-span-2 text-xl">{dict.admin.payments}</h3>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.payments.cashEnabled} onChange={(e) => setForm({ ...form, payments: { ...form.payments, cashEnabled: e.target.checked } })} /> Cash</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.payments.benefitPayEnabled} onChange={(e) => setForm({ ...form, payments: { ...form.payments, benefitPayEnabled: e.target.checked } })} /> BenefitPay</label>
        <input className="field" placeholder="BenefitPay API key" value={form.payments.benefitPayApiKey} onChange={(e) => setForm({ ...form, payments: { ...form.payments, benefitPayApiKey: e.target.value } })} />
        <input className="field" placeholder="BenefitPay merchant id" value={form.payments.benefitPayMerchantId} onChange={(e) => setForm({ ...form, payments: { ...form.payments, benefitPayMerchantId: e.target.value } })} />
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.payments.cardEnabled} onChange={(e) => setForm({ ...form, payments: { ...form.payments, cardEnabled: e.target.checked } })} /> Cards</label>
        <input className="field" placeholder="Card public key" value={form.payments.cardPublicKey} onChange={(e) => setForm({ ...form, payments: { ...form.payments, cardPublicKey: e.target.value } })} />
        <input className="field" placeholder="Card secret key" value={form.payments.cardSecretKey} onChange={(e) => setForm({ ...form, payments: { ...form.payments, cardSecretKey: e.target.value } })} />
      </div>
      <button type="button" className="btn-primary px-6 py-3" onClick={() => void onSave(form)}>{dict.common.save}</button>
    </div>
  );
}
