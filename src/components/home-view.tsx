"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "./providers";
import { formatMoney } from "@/lib/utils";
import type { OrderType } from "@/lib/types";

type Size = {
  id: number;
  nameEn: string;
  nameAr: string;
  priceFils: number;
  finalPriceFils: number;
  discountPercent: number;
  isAvailable: boolean;
};
type Item = {
  id: number;
  categoryId: number;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  image: string | null;
  basePriceFils: number;
  finalPriceFils: number;
  discountPercent: number;
  hasSizes: boolean;
  sizes: Size[];
  isAvailable: boolean;
};
type Category = { id: number; nameEn: string; nameAr: string; slug: string; image: string | null; parentId: number | null };

export function HomeView() {
  const { lang, dict, addToCart, settings, setSettings } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeCat, setActiveCat] = useState<number | "all">("all");
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [selected, setSelected] = useState<Item | null>(null);
  const [sizeId, setSizeId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    fetch("/api/public")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories || []);
        setItems(data.items || []);
        if (data.settings) setSettings({ ...settings, ...data.settings, restaurant: { ...settings.restaurant, ...data.settings.restaurant } });
      })
      .catch(() => undefined);
    const stored = window.localStorage.getItem("jowdi_order_type") as OrderType | null;
    if (stored) setOrderType(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem("jowdi_order_type", orderType);
  }, [orderType]);

  const visible = useMemo(
    () => (activeCat === "all" ? items : items.filter((i) => i.categoryId === activeCat)),
    [items, activeCat],
  );

  function openItem(item: Item) {
    setSelected(item);
    setQty(1);
    setSizeId(item.sizes[0]?.id || null);
  }

  function addSelected() {
    if (!selected) return;
    const size = selected.sizes.find((s) => s.id === sizeId);
    const unit = size ? size.finalPriceFils : selected.finalPriceFils;
    addToCart({
      itemId: selected.id,
      sizeId: size?.id || null,
      nameEn: selected.nameEn,
      nameAr: selected.nameAr,
      sizeNameEn: size?.nameEn,
      sizeNameAr: size?.nameAr,
      unitPriceFils: unit,
      quantity: qty,
      image: selected.image,
    });
    setSelected(null);
  }

  const types: Array<{ id: OrderType; enabled: boolean }> = [
    { id: "dine_in", enabled: settings.features.dineIn },
    { id: "takeaway", enabled: settings.features.takeaway },
    { id: "delivery", enabled: settings.features.delivery },
  ];

  return (
    <main>
      <section className="relative min-h-[88vh] overflow-hidden">
        <img src="/images/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: "var(--hero-overlay)" }} />
        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-4 pb-16 pt-28 md:px-6">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent)]">{dict.hero.kicker}</p>
          <h1 className="font-display mt-4 max-w-3xl text-4xl leading-[1.1] md:text-6xl">{dict.hero.title}</h1>
          <p className="mt-5 max-w-xl text-base text-[var(--muted)] md:text-lg">{dict.hero.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#menu" className="btn-primary px-6 py-3">{dict.hero.ctaMenu}</a>
            <a href="#order-types" className="btn-ghost px-6 py-3">{dict.hero.ctaOrder}</a>
          </div>
        </div>
      </section>

      <section id="order-types" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent)]">{dict.brand.since}</p>
        <h2 className="font-display mt-3 text-3xl md:text-4xl">{dict.orderTypes.title}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {types.filter((t) => t.enabled).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setOrderType(t.id)}
              className={`surface-card p-6 text-start transition ${orderType === t.id ? "ring-2 ring-[var(--accent)]" : ""}`}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
                {t.id === "dine_in" ? dict.orderTypes.dine_in_ar : t.id === "takeaway" ? dict.orderTypes.takeaway_ar : dict.orderTypes.delivery_ar}
              </p>
              <p className="mt-2 text-2xl font-display">{dict.orderTypes[t.id]}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {t.id === "dine_in" ? dict.orderTypes.dine_in_desc : t.id === "takeaway" ? dict.orderTypes.takeaway_desc : dict.orderTypes.delivery_desc}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
        <h2 className="font-display text-3xl md:text-4xl">{dict.menu.title}</h2>
        <p className="mt-2 text-[var(--muted)]">{dict.menu.subtitle}</p>
        <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setActiveCat("all")}
            className={`rounded-full px-4 py-2 text-sm ${activeCat === "all" ? "bg-[var(--accent)] text-[var(--accent-text)]" : "border border-[var(--border)]"}`}
          >
            {dict.menu.all}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCat(c.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${activeCat === c.id ? "bg-[var(--accent)] text-[var(--accent-text)]" : "border border-[var(--border)]"}`}
            >
              {lang === "ar" ? c.nameAr : c.nameEn}
            </button>
          ))}
        </div>
        <div className="menu-grid mt-8">
          {visible.map((item) => {
            const fromPrice = item.sizes.length
              ? Math.min(...item.sizes.map((s) => s.finalPriceFils))
              : item.finalPriceFils;
            return (
              <article key={item.id} className="surface-card overflow-hidden fade-up">
                <button type="button" className="block w-full text-start" onClick={() => openItem(item)}>
                  <div className="relative h-48 overflow-hidden">
                    {item.image ? <img src={item.image} alt={item.nameEn} className="h-full w-full object-cover transition duration-500 hover:scale-105" /> : <div className="h-full bg-[var(--surface-2)]" />}
                    {item.discountPercent > 0 ? (
                      <span className="absolute top-3 start-3 rounded-full bg-[var(--accent)] px-2 py-1 text-[10px] font-bold text-[var(--accent-text)]">
                        {item.discountPercent}% {dict.menu.discount}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold">{lang === "ar" ? item.nameAr : item.nameEn}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{lang === "ar" ? item.descriptionAr : item.descriptionEn}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-[var(--accent)]">
                        {item.hasSizes ? `${dict.menu.from} ` : ""}
                        {formatMoney(fromPrice, lang)}
                      </p>
                      <span className="btn-primary px-3 py-1.5 text-xs">{dict.menu.add}</span>
                    </div>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section id="story" className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-20 md:grid-cols-2 md:px-6">
        <img src="https://images.pexels.com/photos/30119016/pexels-photo-30119016.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="" className="h-[420px] w-full rounded-[28px] object-cover" />
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent)]">{dict.nav.about}</p>
          <h2 className="font-display mt-3 text-3xl">{lang === "ar" ? "من موقد الجودي إلى مائدتك" : "From Jowdi’s hearth to your table"}</h2>
          <p className="mt-4 leading-8 text-[var(--muted)]">
            {lang === "ar"
              ? "نطبخ المشاوي والمندي وأطباق البحرين على نار هادئة، ونقدّم الضيافة كما تُقدَّم في البيوت. كل طبق له حجمه وسعره، وكل طلب يصل كما طلبته."
              : "We cook grills, mandi and Bahraini classics over quiet fire, and we serve hospitality the way it is served at home. Every dish has its size and price, and every order arrives as you asked."}
          </p>
        </div>
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setSelected(null)}>
          <div className="surface-card w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {selected.image ? <img src={selected.image} alt="" className="h-52 w-full object-cover" /> : null}
            <div className="p-5">
              <h3 className="font-display text-2xl">{lang === "ar" ? selected.nameAr : selected.nameEn}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{lang === "ar" ? selected.descriptionAr : selected.descriptionEn}</p>
              {selected.sizes.length ? (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{dict.menu.sizes}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selected.sizes.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSizeId(s.id)}
                        className={`rounded-full border px-3 py-1.5 text-sm ${sizeId === s.id ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]" : "border-[var(--border)]"}`}
                      >
                        {lang === "ar" ? s.nameAr : s.nameEn} · {formatMoney(s.finalPriceFils, lang)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-[var(--accent)]">{formatMoney(selected.finalPriceFils, lang)}</p>
              )}
              <div className="mt-5 flex items-center gap-3">
                <button type="button" className="btn-ghost h-10 w-10" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                <span>{qty}</span>
                <button type="button" className="btn-ghost h-10 w-10" onClick={() => setQty((q) => q + 1)}>+</button>
                <button type="button" className="btn-primary ms-auto px-5 py-2" onClick={addSelected}>
                  {dict.menu.add}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
