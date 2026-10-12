import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cairo, Playfair_Display } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getSettings } from "@/lib/settings";
import { ensureSeeded } from "@/lib/seed";
import type { Lang } from "@/lib/types";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jowdi Restaurant | مطعم الجودي",
  description: "Jowdi Restaurant — dine-in, takeaway and delivery across Bahrain. مطعم الجودي",
  icons: { icon: "/logo.png" },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  try {
    await ensureSeeded();
  } catch (error) {
    console.error("seed failed", error);
  }

  const jar = await cookies();
  const lang = (jar.get("jowdi_lang")?.value === "en" ? "en" : "ar") as Lang;
  const settings = await getSettings();
  const theme = settings.theme || "midnight-gold";

  return (
    <html
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      data-theme={theme}
      className={`${cairo.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("jowdi_theme");var l=localStorage.getItem("jowdi_lang");if(t)document.documentElement.setAttribute("data-theme",t);if(l==="en"||l==="ar"){document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr";}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers initialSettings={settings} initialLang={lang}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
