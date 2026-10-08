import { ActionForm } from "@/components/ActionForm";
import { CommissionFields } from "@/components/CommissionFields";
import { SubmitButton } from "@/components/SubmitButton";
import { requireProducer } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl } from "@/lib/format";
import { formatCommission } from "@/lib/pricing";
import { createAdvertiser, updateAdvertiserCommission } from "../actions";

export default async function AdvertisersPage() {
  const producer = await requireProducer();
  const [advertisers, stats] = await Promise.all([
    db.advertiser.findMany({
      where: { producerId: producer.id },
      orderBy: { name: "asc" },
      include: { coupons: { include: { event: { select: { title: true } } } } },
    }),
    db.order.groupBy({
      by: ["advertiserId"],
      where: { status: "PAID", advertiserId: { not: null }, event: { producerId: producer.id } },
      _sum: { producerCents: true, totalCents: true, commissionCents: true },
      _count: true,
    }),
  ]);
  const totalCommission = stats.reduce((s, x) => s + (x._sum.commissionCents ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Anunciantes e promoters</h1>
        <p className="text-sm text-slate-600">
          Cadastre quem divulga seus eventos e defina a comissão de cada um. Depois crie um cupom para cada anunciante na aba &quot;Cupons&quot; do
          evento. A comissão é calculada sobre o valor dos ingressos (já com desconto, sem a taxa de serviço) e você paga diretamente ao anunciante.
        </p>
      </div>

      <section className="card">
        <h2 className="section-title mb-3">Novo anunciante</h2>
        <ActionForm action={createAdvertiser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">Nome</label>
            <input name="name" className="input" required />
          </div>
          <div>
            <label className="label">Instagram</label>
            <input name="instagram" className="input" placeholder="@usuario" />
          </div>
          <div>
            <label className="label">Celular</label>
            <input name="phone" className="input" />
          </div>
          <div>
            <label className="label">E-mail (opcional)</label>
            <input name="email" type="email" className="input" />
          </div>
          <CommissionFields placeholder="Ex.: 10 (deixe vazio para sem comissão)" />
          <div className="flex items-end">
            <SubmitButton className="btn-primary w-full">Cadastrar</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="card overflow-x-auto p-0">
        <div className="flex items-center justify-between p-4">
          <h2 className="section-title">Resultados</h2>
          <p className="text-sm text-slate-600">
            Total de comissões: <b>{brl(totalCommission)}</b>
          </p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Anunciante</th>
              <th>Cupons</th>
              <th className="text-right">Pedidos pagos</th>
              <th className="text-right">Vendido</th>
              <th className="text-right">Comissão a pagar</th>
              <th>Comissão padrão</th>
            </tr>
          </thead>
          <tbody>
            {advertisers.map((a) => {
              const s = stats.find((x) => x.advertiserId === a.id);
              return (
                <tr key={a.id} className="align-top">
                  <td>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-slate-500">{[a.instagram, a.phone, a.email].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="text-xs">
                    {a.coupons.map((c) => (
                      <p key={c.id}>
                        <span className="font-mono font-semibold">{c.code}</span> <span className="text-slate-500">({c.event.title})</span>
                      </p>
                    ))}
                    {a.coupons.length === 0 && <span className="text-slate-500">nenhum</span>}
                  </td>
                  <td className="text-right">{s?._count ?? 0}</td>
                  <td className="text-right">{brl(s?._sum.totalCents ?? 0)}</td>
                  <td className="text-right font-semibold">{brl(s?._sum.commissionCents ?? 0)}</td>
                  <td className="min-w-[280px]">
                    <p className="mb-1 text-xs text-slate-500">{formatCommission(a)}</p>
                    <details>
                      <summary className="cursor-pointer text-xs font-medium text-brand-700">Alterar</summary>
                      <ActionForm action={updateAdvertiserCommission.bind(null, a.id)} className="mt-2 space-y-2">
                        <CommissionFields type={a.commissionType} value={a.commissionValue} label="Nova comissão" />
                        <SubmitButton className="btn-secondary px-3 py-1.5 text-xs">Salvar</SubmitButton>
                      </ActionForm>
                    </details>
                  </td>
                </tr>
              );
            })}
            {advertisers.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-500">
                  Nenhum anunciante cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
