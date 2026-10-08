import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { requireProducer } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl } from "@/lib/format";
import { createAdvertiser } from "../actions";

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
      _sum: { producerCents: true, totalCents: true },
      _count: true,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black">Anunciantes e promoters</h1>
        <p className="text-sm text-neutral-400">
          Cadastre quem divulga seus eventos. Depois crie cupons para cada um na aba &quot;Cupons&quot; do evento e acompanhe as vendas aqui.
        </p>
      </div>

      <section className="card">
        <h2 className="mb-3 font-bold">Novo anunciante</h2>
        <ActionForm action={createAdvertiser} className="grid gap-3 sm:grid-cols-5">
          <input name="name" className="input sm:col-span-2" placeholder="Nome" required />
          <input name="instagram" className="input" placeholder="@instagram" />
          <input name="phone" className="input" placeholder="Celular" />
          <SubmitButton>Cadastrar</SubmitButton>
          <input name="email" type="email" className="input sm:col-span-2" placeholder="E-mail (opcional)" />
        </ActionForm>
      </section>

      <section className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Anunciante</th>
              <th>Cupons</th>
              <th className="text-right">Pedidos pagos</th>
              <th className="text-right">Vendido</th>
              <th className="text-right">Você recebe</th>
            </tr>
          </thead>
          <tbody>
            {advertisers.map((a) => {
              const s = stats.find((x) => x.advertiserId === a.id);
              return (
                <tr key={a.id}>
                  <td>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-neutral-500">{[a.instagram, a.phone, a.email].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="text-xs">
                    {a.coupons.map((c) => (
                      <p key={c.id}>
                        <span className="font-mono">{c.code}</span> <span className="text-neutral-500">({c.event.title})</span>
                      </p>
                    ))}
                    {a.coupons.length === 0 && <span className="text-neutral-500">nenhum</span>}
                  </td>
                  <td className="text-right">{s?._count ?? 0}</td>
                  <td className="text-right">{brl(s?._sum.totalCents ?? 0)}</td>
                  <td className="text-right">{brl(s?._sum.producerCents ?? 0)}</td>
                </tr>
              );
            })}
            {advertisers.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-neutral-500">
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
