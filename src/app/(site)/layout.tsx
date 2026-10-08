import Link from "next/link";
import { ShieldIcon } from "@/components/Icons";
import { Logo } from "@/components/Logo";
import { env } from "@/lib/env";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="container-page flex h-16 items-center justify-between">
            <Link href="/" aria-label="Página inicial">
              <Logo />
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/para-produtores" className="hidden px-3 py-2 font-medium text-slate-600 hover:text-slate-900 sm:block">
                Venda seus ingressos
              </Link>
              <a href={`${env.producerUrl}/painel`} className="btn-secondary">
                Área do produtor
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-page grid gap-8 py-10 text-sm sm:grid-cols-3">
        <div className="space-y-3">
          <Logo />
          <p className="text-slate-500">Plataforma de venda de ingressos para baladas, bares e eventos.</p>
          <div className="flex flex-wrap gap-2" aria-label="Formas de pagamento">
            {["Pix", "Visa", "Mastercard", "Elo", "Amex"].map((m) => (
              <span key={m} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">
                {m}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Ajuda</p>
          <Link href="/ajuda" className="block text-slate-600 hover:text-slate-900">
            Central de ajuda
          </Link>
          <Link href="/politica-de-reembolso" className="block text-slate-600 hover:text-slate-900">
            Política de reembolso
          </Link>
          <Link href="/termos" className="block text-slate-600 hover:text-slate-900">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="block text-slate-600 hover:text-slate-900">
            Privacidade
          </Link>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Contato</p>
          <a href={`mailto:${env.supportEmail}`} className="block text-slate-600 hover:text-slate-900">
            {env.supportEmail}
          </a>
          <Link href="/para-produtores" className="block text-slate-600 hover:text-slate-900">
            Quero vender ingressos
          </Link>
          <a href={`${env.producerUrl}/painel`} className="block text-slate-600 hover:text-slate-900">
            Área do produtor
          </a>
          <p className="flex items-center gap-2 pt-2 text-slate-500">
            <ShieldIcon /> Pagamento processado com criptografia por instituição autorizada pelo Banco Central.
          </p>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {env.companyLegalName || env.companyName}
        {env.companyCnpj && ` · CNPJ ${env.companyCnpj}`}
      </div>
    </footer>
  );
}
