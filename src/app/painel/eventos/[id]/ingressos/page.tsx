import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { requireOwnedEvent } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, dateTime } from "@/lib/format";
import { currentBatch } from "@/lib/pricing";
import { createBatch, createTicketType, toggleBatch, toggleTicketType, updateBatchQuantity } from "@/app/painel/actions";

export default async function TicketsPage({ params, searchParams }: { params: { id: string }; searchParams: { erro?: string } }) {
  const { event } = await requireOwnedEvent(params.id);
  const types = await db.ticketType.findMany({
    where: { eventId: event.id },
    orderBy: { sortOrder: "asc" },
    include: { batches: { orderBy: { sortOrder: "asc" } } },
  });

  return (
    <div className="space-y-6">
      {searchParams.erro === "sem-lote" && (
        <div className="card border-red-200 text-sm text-red-700">Crie pelo menos um tipo de ingresso com um lote antes de publicar.</div>
      )}
      <p className="text-sm text-slate-500">
        Cada <b>tipo</b> (Pista, VIP, Camarote...) tem <b>lotes</b>. Só um lote fica à venda por vez: quando esgota ou a data
        de fim passa, o próximo abre automaticamente.
      </p>

      {types.map((t) => {
        const onSale = currentBatch(t.batches);
        return (
          <section key={t.id} className={`card space-y-4 ${t.active ? "" : "opacity-60"}`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">{t.name}</h2>
                {t.description && <p className="text-sm text-slate-500">{t.description}</p>}
              </div>
              <form action={toggleTicketType.bind(null, event.id, t.id)}>
                <button className="btn-secondary text-xs">{t.active ? "Ocultar" : "Mostrar"}</button>
              </form>
            </div>

            {t.batches.length > 0 && (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Lote</th>
                      <th className="text-right">Preço</th>
                      <th>Vendas</th>
                      <th>Vendidos / Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.batches.map((b) => (
                      <tr key={b.id}>
                        <td>
                          {b.name}{" "}
                          {onSale?.id === b.id && <span className="badge bg-emerald-50 text-emerald-700">à venda</span>}
                          {!b.active && <span className="badge bg-slate-100 text-slate-500">pausado</span>}
                        </td>
                        <td className="text-right">{brl(b.priceCents)}</td>
                        <td className="whitespace-nowrap text-xs text-slate-500">
                          {b.salesStart ? `de ${dateTime(b.salesStart)}` : ""} {b.salesEnd ? `até ${dateTime(b.salesEnd)}` : ""}
                          {!b.salesStart && !b.salesEnd && "sem data"}
                        </td>
                        <td>
                          <form action={updateBatchQuantity.bind(null, event.id, b.id)} className="flex items-center gap-1">
                            <span className="text-sm">{b.sold} /</span>
                            <input name="quantity" type="number" min={b.sold} defaultValue={b.quantity} className="input w-24 py-1" />
                            <button className="btn-secondary px-2 py-1 text-xs">OK</button>
                          </form>
                        </td>
                        <td>
                          <form action={toggleBatch.bind(null, event.id, b.id)}>
                            <button className="btn-secondary px-2 py-1 text-xs">{b.active ? "Pausar" : "Ativar"}</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <details className="rounded-xl border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ Adicionar lote em {t.name}</summary>
              <ActionForm action={createBatch.bind(null, event.id, t.id)} className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">Nome</label>
                  <input name="name" className="input" required defaultValue={`${t.batches.length + 1}º lote`} />
                </div>
                <div>
                  <label className="label">Preço (R$)</label>
                  <input name="price" className="input" required placeholder="50,00" inputMode="decimal" />
                  <p className="hint">0 para gratuito</p>
                </div>
                <div>
                  <label className="label">Quantidade</label>
                  <input name="quantity" type="number" min={1} className="input" required defaultValue={100} />
                </div>
                <div>
                  <label className="label">Máx. por pedido</label>
                  <input name="maxPerOrder" type="number" min={1} max={50} className="input" defaultValue={10} />
                </div>
                <div>
                  <label className="label">Início das vendas (opcional)</label>
                  <input name="salesStart" type="datetime-local" className="input" />
                </div>
                <div>
                  <label className="label">Fim das vendas (opcional)</label>
                  <input name="salesEnd" type="datetime-local" className="input" />
                </div>
                <div className="flex items-end">
                  <SubmitButton className="btn-primary w-full">Criar lote</SubmitButton>
                </div>
              </ActionForm>
            </details>
          </section>
        );
      })}

      <section className="card">
        <h2 className="mb-3 font-bold">Novo tipo de ingresso</h2>
        <ActionForm action={createTicketType.bind(null, event.id)} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <input name="name" className="input" placeholder="Ex.: Pista, VIP, Camarote" required />
          <input name="description" className="input" placeholder="Descrição (opcional): ex.: open bar até 1h" />
          <SubmitButton>Adicionar</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
