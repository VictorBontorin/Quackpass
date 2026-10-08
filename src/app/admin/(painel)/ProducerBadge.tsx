const s: Record<string, [string, string]> = {
  PENDING: ["Aguardando aprovação", "bg-amber-50 text-amber-800"],
  APPROVED: ["Aprovado", "bg-emerald-50 text-emerald-700"],
  REJECTED: ["Recusado", "bg-slate-100 text-slate-600"],
  BLOCKED: ["Bloqueado", "bg-red-50 text-red-700"],
};
export function ProducerBadge({ status }: { status: string }) {
  const [label, cls] = s[status] ?? [status, "bg-slate-100"];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function whatsappLink(phone: string, text: string) {
  const d = phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return `https://wa.me/55${d}?text=${encodeURIComponent(text)}`;
}
