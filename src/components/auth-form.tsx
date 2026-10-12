"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "./providers";

type Gov = { id: number; nameEn: string; nameAr: string; regions: Array<{ id: number; nameEn: string; nameAr: string }> };
type Mode = "login" | "register" | "forgot" | "reset" | "verify";

export function AuthForm({ mode }: { mode: Mode }) {
  const { lang, dict, refreshMe, settings } = useApp();
  const router = useRouter();
  const [govs, setGovs] = useState<Gov[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    confirmEmail: "",
    password: "",
    phone: "",
    governorateId: "",
    regionId: "",
    addressDetails: "",
    code: "",
  });

  useEffect(() => {
    if (mode === "register") {
      fetch("/api/public")
        .then((r) => r.json())
        .then((d) => setGovs(d.governorates || []))
        .catch(() => undefined);
    }
  }, [mode]);

  const regions = govs.find((g) => String(g.id) === form.governorateId)?.regions || [];

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { ...form, language: lang, action: mode };
      if (form.governorateId) payload.governorateId = Number(form.governorateId);
      if (form.regionId) payload.regionId = Number(form.regionId);
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; needsVerification?: boolean };
      if (!res.ok) {
        setError(data.error || dict.common.error);
        return;
      }
      if (mode === "register") {
        await refreshMe();
        router.push("/verify");
        return;
      }
      if (mode === "login" || mode === "verify") {
        await refreshMe();
        router.push("/account");
        return;
      }
      if (mode === "forgot") {
        setInfo(dict.auth.resetHint);
        return;
      }
      if (mode === "reset") {
        router.push("/login");
      }
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "login"
      ? dict.auth.loginTitle
      : mode === "register"
        ? dict.auth.registerTitle
        : mode === "forgot"
          ? dict.auth.forgotTitle
          : mode === "reset"
            ? dict.auth.resetTitle
            : dict.auth.verifyTitle;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <div className="surface-card p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
          {lang === "ar" ? settings.restaurant.nameAr : settings.restaurant.nameEn}
        </p>
        <h1 className="font-display mt-3 text-3xl">{title}</h1>
        <form className="mt-8 space-y-4" onSubmit={submit}>
          {mode === "register" ? (
            <input className="field" placeholder={dict.checkout.fullName} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
          ) : null}
          <input className="field" type="email" placeholder={dict.checkout.email} value={form.email} onChange={(e) => set("email", e.target.value)} required />
          {mode === "register" ? (
            <input className="field" type="email" placeholder={dict.checkout.confirmEmail} value={form.confirmEmail} onChange={(e) => set("confirmEmail", e.target.value)} required />
          ) : null}
          {mode === "register" ? (
            <input className="field" placeholder={dict.checkout.phone} value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
          ) : null}
          {mode === "register" ? (
            <>
              <select className="field" value={form.governorateId} onChange={(e) => set("governorateId", e.target.value)} required>
                <option value="">{dict.checkout.governorate}</option>
                {govs.map((g) => (
                  <option key={g.id} value={g.id}>
                    {lang === "ar" ? g.nameAr : g.nameEn}
                  </option>
                ))}
              </select>
              <select className="field" value={form.regionId} onChange={(e) => set("regionId", e.target.value)} required>
                <option value="">{dict.checkout.region}</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {lang === "ar" ? r.nameAr : r.nameEn}
                  </option>
                ))}
              </select>
              <textarea className="field" placeholder={dict.checkout.addressDetails} value={form.addressDetails} onChange={(e) => set("addressDetails", e.target.value)} required />
            </>
          ) : null}
          {mode === "login" || mode === "register" || mode === "reset" ? (
            <input className="field" type="password" placeholder={mode === "reset" ? dict.auth.newPassword : dict.auth.password} value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} />
          ) : null}
          {mode === "reset" || mode === "verify" ? (
            <input className="field" placeholder={dict.auth.code} value={form.code} onChange={(e) => set("code", e.target.value)} required />
          ) : null}
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          {info ? <p className="text-sm text-[var(--success)]">{info}</p> : null}
          <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
            {busy ? dict.common.loading : dict.auth.submit}
          </button>
        </form>
        <div className="mt-6 space-y-2 text-sm text-[var(--muted)]">
          {mode === "login" ? (
            <>
              <p>
                {dict.auth.noAccount} <Link href="/register" className="text-[var(--accent)]">{dict.nav.register}</Link>
              </p>
              <p>
                <Link href="/forgot-password" className="text-[var(--accent)]">{dict.auth.forgot}</Link>
              </p>
            </>
          ) : null}
          {mode === "register" ? (
            <p>
              {dict.auth.hasAccount} <Link href="/login" className="text-[var(--accent)]">{dict.nav.login}</Link>
            </p>
          ) : null}
          {mode === "forgot" ? (
            <p>
              <Link href="/reset-password" className="text-[var(--accent)]">{dict.auth.resetTitle}</Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
