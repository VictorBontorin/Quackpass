import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { env } from "@/lib/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${env.companyName}: ingressos para baladas, bares e eventos`, template: `%s | ${env.companyName}` },
  description: "Compre ingressos com segurança. Pague com Pix ou cartão e receba o ingresso por e-mail na hora.",
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

/** Layout raiz mínimo. Cada área (site, produtor, portaria, admin) tem o seu próprio layout. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
