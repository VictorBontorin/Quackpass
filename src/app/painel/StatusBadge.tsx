const styles: Record<string, [string, string]> = {
  DRAFT: ["Rascunho", "bg-neutral-800 text-neutral-300"],
  PUBLISHED: ["À venda", "bg-emerald-950 text-emerald-300"],
  CANCELLED: ["Cancelado", "bg-red-950 text-red-300"],
  PENDING: ["Aguardando", "bg-amber-950 text-amber-300"],
  PAID: ["Pago", "bg-emerald-950 text-emerald-300"],
  FAILED: ["Recusado", "bg-red-950 text-red-300"],
  EXPIRED: ["Expirado", "bg-neutral-800 text-neutral-400"],
  REFUNDED: ["Estornado", "bg-purple-950 text-purple-300"],
};

export function StatusBadge({ status }: { status: string }) {
  const [label, cls] = styles[status] ?? [status, "bg-neutral-800"];
  return <span className={`badge ${cls}`}>{label}</span>;
}
