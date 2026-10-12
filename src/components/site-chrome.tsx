"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "./providers";
import { formatMoney } from "@/lib/utils";

type Popup = {
  id: number;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  image?: string | null;
  ctaEn?: string | null;
  ctaAr?: string | null;
  ctaHref?: string | null;
};

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const { lang, setLang, dict, cart, cartCount, cartTotal, cartOpen, setCartOpen, updateQty, removeLine, clearCart, me, settings } =
    useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [popupIndex, setPopupIndex] = useState(0);

  useEffect(() => {
    fetch("/api/public")
      .then((r) => r.json())
      .then((data: { popups?: Popup[] }) => {
        const dismissed = new Set(
          (typeof window !== "undefined" ? window.sessionStorage.getItem("jowdi_popups") : "")?.split(",").filter(Boolean),
        );
        setPopups((data.popups || []).filter((p) => !dismissed.has(String(p.id))));
      })
      .catch(() => undefined);
  }, []);

  const dismissPopup = () => {
    const current = popups[popupIndex];
    if (current) {
      const prev = window.sessionStorage.getItem("jowdi_popups") || "";
      window.sessionStorage.setItem("jowdi_popups", [...prev.split(",").filter(Boolean), String(current.id)].join(","));
    }
    if (popupIndex + 1 >= popups.length) setPopups([]);
    else setPopupIndex((i) => i + 1);
  };

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    window.location.href = "/";
  }

  const brand = lang === "ar" ? settings.restaurant.nameAr : settings.restaurant.nameEn;
  const popup = popups[popupIndex];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--header)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <img src={settings.restaurant.logo || "/logo.png"} alt={brand} className="h-12 w-12 rounded-full object-cover ring-1 ring-[var(--accent)]/40" />
            <div>
              <p className="font-display text-lg leading-none tracking-wide">{brand}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[var(--accent)]">{settings.restaurant.nameEn === brand ? settings.restaurant.nameAr : settings.restaurant.nameEn}</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="/#menu" className="text-[var(--muted)] hover:text-[var(--accent)]">{dict.nav.menu}</a>
            <a href="/#story" className="text-[var(--muted)] hover:text-[var(--accent)]">{dict.nav.about}</a>
            {me ? <Link href="/account" className="text-[var(--muted)] hover:text-[var(--accent)]">{dict.nav.account}</Link> : null}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            >
              {dict.nav.language}
            </button>
            {me ? (
              <button type="button" className="hidden px-2 text-xs text-[var(--muted)] md:block" onClick={() => void logout()}>
                {dict.nav.logout}
              </button>
            ) : (
              <Link href="/login" className="hidden px-2 text-xs text-[var(--muted)] md:block">
                {dict.nav.login}
              </Link>
            )}
            <button type="button" className="btn-primary relative px-4 py-2 text-sm" onClick={() => setCartOpen(true)}>
              {dict.nav.cart}
              {cartCount > 0 ? (
                <span className="absolute -top-2 -end-2 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--text)] px-1 text-[10px] text-[var(--bg)]">
                  {cartCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      {children}

      <footer className="mt-20 border-t border-[var(--border)] bg-[var(--bg-elev)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6">
          <div>
            <img src={settings.restaurant.logo || "/logo.png"} alt="" className="h-16 w-16 object-contain" />
            <p className="font-display mt-3 text-xl">{brand}</p>
            <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">{dict.brand.tagline}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{dict.footer.contact}</p>
            <p className="mt-3 text-sm">{settings.restaurant.phone}</p>
            <p className="text-sm">{settings.restaurant.email}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {lang === "ar" ? settings.restaurant.addressAr : settings.restaurant.addressEn}
            </p>
            <p className="mt-3 text-sm text-[var(--muted)]">{dict.footer.hours}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{dict.footer.follow}</p>
            <p className="mt-3 text-sm">Instagram @{settings.restaurant.instagram}</p>
            <p className="text-sm">WhatsApp {settings.restaurant.whatsapp}</p>
          </div>
        </div>
        <div className="gold-line" />
        <p className="px-4 py-6 text-center text-xs text-[var(--muted)]">
          © {new Date().getFullYear()} {settings.restaurant.nameEn} · {settings.restaurant.nameAr}. {dict.footer.rights}
        </p>
      </footer>

      {cartOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setCartOpen(false)}>
          <aside
            className="flex h-full w-full max-w-md flex-col bg-[var(--surface)] p-5 shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{dict.cart.title}</h2>
              <button type="button" className="btn-ghost px-3 py-1 text-sm" onClick={() => setCartOpen(false)}>
                {dict.menu.close}
              </button>
            </div>
            <div className="mt-5 flex-1 space-y-4 overflow-y-auto">
              {cart.length === 0 ? <p className="text-sm text-[var(--muted)]">{dict.cart.empty}</p> : null}
              {cart.map((line, i) => (
                <div key={`${line.itemId}-${line.sizeId}-${i}`} className="flex gap-3 rounded-2xl border border-[var(--border)] p-3">
                  {line.image ? <img src={line.image} alt="" className="h-16 w-16 rounded-xl object-cover" /> : null}
                  <div className="flex-1">
                    <p className="font-medium">{lang === "ar" ? line.nameAr : line.nameEn}</p>
                    {line.sizeNameEn ? (
                      <p className="text-xs text-[var(--muted)]">{lang === "ar" ? line.sizeNameAr : line.sizeNameEn}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-[var(--accent)]">{formatMoney(line.unitPriceFils * line.quantity, lang)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" className="btn-ghost h-7 w-7" onClick={() => updateQty(i, line.quantity - 1)}>−</button>
                      <span className="text-sm">{line.quantity}</span>
                      <button type="button" className="btn-ghost h-7 w-7" onClick={() => updateQty(i, line.quantity + 1)}>+</button>
                      <button type="button" className="ms-auto text-xs text-[var(--danger)]" onClick={() => removeLine(i)}>
                        {dict.cart.remove}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border)] pt-4">
              <div className="mb-3 flex justify-between text-sm">
                <span>{dict.cart.subtotal}</span>
                <span>{formatMoney(cartTotal, lang)}</span>
              </div>
              {cart.length ? (
                <button type="button" className="mb-2 text-xs text-[var(--muted)]" onClick={clearCart}>
                  {dict.cart.clear}
                </button>
              ) : null}
              <button
                type="button"
                className="btn-primary w-full py-3"
                disabled={!cart.length}
                onClick={() => {
                  setCartOpen(false);
                  router.push("/checkout");
                }}
              >
                {dict.cart.checkout}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {popup ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4">
          <div className="surface-card w-full max-w-lg overflow-hidden">
            {popup.image ? <img src={popup.image} alt="" className="h-44 w-full object-cover" /> : null}
            <div className="p-6">
              <h3 className="font-display text-2xl">{lang === "ar" ? popup.titleAr : popup.titleEn}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{lang === "ar" ? popup.bodyAr : popup.bodyEn}</p>
              <div className="mt-6 flex gap-3">
                {popup.ctaHref ? (
                  <a href={popup.ctaHref} className="btn-primary px-5 py-2 text-sm" onClick={dismissPopup}>
                    {lang === "ar" ? popup.ctaAr : popup.ctaEn}
                  </a>
                ) : null}
                <button type="button" className="btn-ghost px-5 py-2 text-sm" onClick={dismissPopup}>
                  {dict.popup.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pathname?.startsWith("/admin") ? null : (
        <button
          type="button"
          className="admin-hidden-trigger"
          aria-label=""
          title=""
          onClick={() => router.push("/admin/login")}
        />
      )}
    </div>
  );
}
