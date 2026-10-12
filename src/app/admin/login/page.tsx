"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers";

export default function AdminLoginPage() {
  const { dict, lang, setLang, settings } = useApp();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || dict.common.error);
        return;
      }
      router.push("/admin");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg)] px-4">
      <form onSubmit={submit} className="surface-card w-full max-w-md p-8">
        <div className="flex items-center justify-between">
          <img src={settings.restaurant.logo || "/logo.png"} alt="" className="h-12 w-12 object-contain" />
          <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
            {dict.nav.language}
          </button>
        </div>
        <h1 className="font-display mt-6 text-2xl">{dict.admin.login}</h1>
        <input className="field mt-6" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input className="field mt-3" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
        <button className="btn-primary mt-6 w-full py-3" disabled={busy} type="submit">
          {busy ? dict.common.loading : dict.auth.submit}
        </button>
      </form>
    </div>
  );
}
