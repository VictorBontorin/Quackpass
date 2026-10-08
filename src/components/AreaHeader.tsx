import Link from "next/link";
import { Logo } from "./Logo";

/** Cabeçalho das áreas restritas (produtor, administração). */
export function AreaHeader({ label, home, children }: { label: string; home: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="container-page flex min-h-16 flex-wrap items-center justify-between gap-3 py-2">
        <Link href={home} className="flex items-center gap-3">
          <Logo />
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
        </Link>
        {children && <nav className="flex flex-wrap items-center gap-1 text-sm">{children}</nav>}
      </div>
    </header>
  );
}
