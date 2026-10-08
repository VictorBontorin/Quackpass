import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { CommissionFields } from "@/components/CommissionFields";
import { SubmitButton } from "@/components/SubmitButton";
import { createCoupon, toggleCoupon } from "@/app/painel/actions";
import { requireOwnedEvent } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { brl } from "@/lib/format";
import { formatCommission } from "@/lib/pricing";

export default async function CouponsPage({ params }: { params: { id: string } }) {
  const { event, producer } = await requireOwnedEvent(params.id);
  const [coupons, advertisers, stats] = await Promise.all([
    db.coupon.findMany({ where: { eventId: event.id }, include: { advertiser: true }, orderBy: { createdAt: "desc" } }),
    db.advertiser.findMany({ where: { producerId: producer.id }, orderBy: { name: "asc" } }),
    db.order.groupBy({ by: ["couponId"], where: { eventId: event.id, status: "PAID", couponId: { not: null } }, _sum: { producerCents: true, commissionCents: true }, _count: true }),
  ]);

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="mb-1 font-bold">Novo cupom</h2>
        <p className="mb-3 text-sm text-slate-500">
          Vincule o cupom a um anunciante/promoter para saber quanto cada um vendeu. Ele divulga o link com o cupom já aplicado.
        </p>
        <ActionForm action={createCoupon.bind(null, event.id)} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Código</label>
            <input name="code" className="input uppercase" required placeholder="WESLEY" />
          </div>
          <div>
            <label className="label">Anunciante</label>
            <select name="advertiserId" className="input" defaultValue="">
              <option value="">Nenhum</option>
              {advertisers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <Link href="/painel/anunciantes" className="text-xs text-brand-600">
              + cadastrar anunciante
            </Link>
          </div>
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <div>
              <label className="label">Desconto</label>
              <input name="value" className="input" required placeholder="10" inputMode="decimal" />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select name="discountType" className="input">
                <option value="PERCENT">%</option>
                <option value="FIXED">R$</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Limite de usos (opcional)</label>
            <input name="maxUses" type="number" min={1} className="input" />
          </div>
          <div>
            <label className="label">Válido até (opcional)</label>
            <input name="validUntil" type="datetime-local" className="input" />
          </div>
          <div className="sm:col-span-2">
            <CommissionFields label="Comissão neste cupom (opcional)" placeholder="Vazio = comissão padrão do anunciante" />
          </div>
          <div className="flex items-end">
            <SubmitButton className="btn-primary w-full">Criar cupom</SubmitButton>
          </div>
        </ActionForm>
        <p className="mt-2 text-xs text-slate-500">Dica: um cupom com desconto 0 serve só para rastrear as vendas do anunciante.</p>
      </section>

      <section className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Cupom</th>
              <th>Anunciante</th>
              <th>Desconto</th>
              <th className="text-right">Usos</th>
              <th className="text-right">Pedidos pagos</th>
              <th className="text-right">Você recebe</th>
              <th className="text-right">Comissão</th>
              <th>Link de divulgação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const s = stats.find((x) => x.couponId === c.id);
              return (
                <tr key={c.id} className={c.active ? "" : "opacity-50"}>
                  <td className="font-mono font-semibold">{c.code}</td>
                  <td>{c.advertiser?.name ?? "-"}</td>
                  <td>{c.discountType === "PERCENT" ? `${c.value}%` : brl(c.value)}</td>
                  <td className="text-right">
                    {c.uses}
                    {c.maxUses ? `/${c.maxUses}` : ""}
                  </td>
                  <td className="text-right">{s?._count ?? 0}</td>
                  <td className="text-right">{brl(s?._sum.producerCents ?? 0)}</td>
                  <td className="text-right">
                    {brl(s?._sum.commissionCents ?? 0)}
                    {c.advertiser && (
                      <p className="text-xs text-slate-500">
                        {formatCommission(c.commissionType != null && c.commissionValue != null ? { commissionType: c.commissionType, commissionValue: c.commissionValue } : c.advertiser)}
                      </p>
                    )}
                  </td>
                  <td>
                    <code className="select-all text-xs text-slate-500">
                      {env.appUrl}/evento/{event.slug}?cupom={c.code}
                    </code>
                  </td>
                  <td>
                    <form action={toggleCoupon.bind(null, event.id, c.id)}>
                      <button className="btn-secondary px-2 py-1 text-xs">{c.active ? "Desativar" : "Ativar"}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-slate-500">
                  Nenhum cupom ainda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
