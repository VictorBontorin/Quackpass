export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      {updated && <p className="mt-1 text-sm text-slate-500">Atualizado em {updated}</p>}
      <div className="card mt-6 space-y-4 leading-relaxed text-slate-700 [&_h2]:pt-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </div>
  );
}
