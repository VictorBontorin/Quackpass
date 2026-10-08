import Link from "next/link";
import { requireProducer } from "@/lib/auth";
import { logout } from "../produtor/actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const producer = await requireProducer();
  return (
    <div className="container-page py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs uppercase text-slate-500">Painel do produtor</p>
          <p className="font-bold">{producer.name}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/painel" className="btn-secondary">
            Eventos
          </Link>
          <Link href="/painel/anunciantes" className="btn-secondary">
            Anunciantes
          </Link>
          <Link href="/painel/conta" className="btn-secondary">
            Recebimento
          </Link>
          <form action={logout}>
            <button className="btn text-slate-500 hover:text-slate-900">Sair</button>
          </form>
        </nav>
      </div>
      {!producer.recipientId && (
        <Link href="/painel/conta" className="card mb-6 block border-brand-200 bg-brand-50 text-sm">
          ⚠️ Cadastre sua conta bancária para começar a receber pelas vendas →
        </Link>
      )}
      {children}
    </div>
  );
}
