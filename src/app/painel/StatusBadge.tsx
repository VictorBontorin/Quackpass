const styles: Record<string, [string, string]> = {
  DRAFT: ["Rascunho", "bg-slate-100 text-slate-700"],
  PUBLISHED: ["À venda", "bg-emerald-50 text-emerald-700"],
  CANCELLED: ["Cancelado", "bg-red-50 text-red-700"],
  PENDING: ["Aguardando", "bg-amber-50 text-amber-800"],
  PAID: ["Pago", "bg-emerald-50 text-emerald-700"],
  FAILED: ["Recusado", "bg-red-50 text-red-700"],
  EXPIRED: ["Expirado", "bg-slate-100 text-slate-500"],
  REFUNDING: ["Reembolsando", "bg-amber-50 text-amber-800"],
  REFUNDED: ["Reembolsado", "bg-purple-50 text-purple-700"],
};

export function StatusBadge({ status }: { status: string }) {
  const [label, cls] = styles[status] ?? [status, "bg-slate-100"];
  return <span className={`badge ${cls}`}>{label}</span>;
}
