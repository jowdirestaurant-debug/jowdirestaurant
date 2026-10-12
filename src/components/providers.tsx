"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { dictionaries } from "@/lib/i18n";
import type { CartLine, Lang, PublicSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";

type CustomerMe = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  governorateId: number | null;
  regionId: number | null;
  addressDetails: string | null;
  language: string;
  isGuest: boolean;
} | null;

type AppContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  dict: typeof dictionaries.en;
  dir: "rtl" | "ltr";
  cart: CartLine[];
  addToCart: (line: CartLine) => void;
  updateQty: (index: number, quantity: number) => void;
  removeLine: (index: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  settings: PublicSettings;
  setSettings: (s: PublicSettings) => void;
  me: CustomerMe;
  refreshMe: () => Promise<void>;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function readLang(): Lang {
  if (typeof window === "undefined") return "ar";
  const stored = window.localStorage.getItem("jowdi_lang");
  return stored === "en" ? "en" : "ar";
}

function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("jowdi_cart");
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function Providers({
  children,
  initialSettings,
  initialLang,
}: {
  children: ReactNode;
  initialSettings: PublicSettings;
  initialLang: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [settings, setSettings] = useState<PublicSettings>(initialSettings || DEFAULT_SETTINGS);
  const [me, setMe] = useState<CustomerMe>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLangState(readLang());
    setCart(readCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("jowdi_lang", lang);
    document.cookie = `jowdi_lang=${lang}; path=/; max-age=31536000`;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang, ready]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("jowdi_cart", JSON.stringify(cart));
  }, [cart, ready]);

  useEffect(() => {
    const theme = settings.theme || "midnight-gold";
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("jowdi_theme", theme);
  }, [settings.theme]);

  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth?action=me", { credentials: "include" });
      const data = (await res.json()) as { user?: CustomerMe };
      setMe(data.user || null);
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);

  const addToCart = useCallback((line: CartLine) => {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.itemId === line.itemId && (l.sizeId || null) === (line.sizeId || null));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + line.quantity };
        return copy;
      }
      return [...prev, line];
    });
    setCartOpen(true);
  }, []);

  const updateQty = useCallback((index: number, quantity: number) => {
    setCart((prev) => prev.map((l, i) => (i === index ? { ...l, quantity: Math.max(1, quantity) } : l)));
  }, []);

  const removeLine = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cart.reduce((s, l) => s + l.unitPriceFils * l.quantity, 0);

  const value = useMemo<AppContextValue>(
    () => ({
      lang,
      setLang,
      dict: dictionaries[lang],
      dir: lang === "ar" ? "rtl" : "ltr",
      cart,
      addToCart,
      updateQty,
      removeLine,
      clearCart,
      cartCount,
      cartTotal,
      settings,
      setSettings,
      me,
      refreshMe,
      cartOpen,
      setCartOpen,
    }),
    [lang, setLang, cart, addToCart, updateQty, removeLine, clearCart, cartCount, cartTotal, settings, me, refreshMe, cartOpen],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within Providers");
  return ctx;
}
