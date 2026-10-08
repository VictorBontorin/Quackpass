import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Quackpass - Ingressos para baladas e eventos", template: "%s | Quackpass" },
  description: "Compre ingressos para as melhores baladas, bares e eventos.",
};

export const viewport: Viewport = { themeColor: "#0a0a0a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-neutral-900 bg-neutral-950/85 backdrop-blur">
          <div className="container-page flex h-14 items-center justify-between">
            <Link href="/" className="text-lg font-black tracking-tight">
              <span className="text-brand-400">Quack</span>pass
            </Link>
            <nav className="flex items-center gap-4 text-sm text-neutral-300">
              <Link href="/painel" className="hover:text-white">
                Área do produtor
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} Quackpass. Venda de ingressos com segurança.
        </footer>
      </body>
    </html>
  );
}
