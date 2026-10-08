import Link from "next/link";
import { staffLogout } from "./actions";

export function TopBar({ title, subtitle, back }: { title: string; subtitle?: string; back?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          {back && (
            <Link href={back} className="text-xs text-slate-400">
              ← Eventos
            </Link>
          )}
          <p className="truncate font-bold">{title}</p>
          {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
        </div>
        <form action={staffLogout}>
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300">Sair</button>
        </form>
      </div>
    </header>
  );
}
