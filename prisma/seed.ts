import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Dados de demonstração. Login: produtor@demo.com / demo12345
async function main() {
  const producer = await db.producer.upsert({
    where: { email: "produtor@demo.com" },
    update: {},
    create: {
      name: "Folks Bar",
      email: "produtor@demo.com",
      passwordHash: await bcrypt.hash("demo12345", 10),
      document: "12345678909",
      phone: "41999999999",
      recipientId: "mock_rp_demo",
    },
  });

  if (await db.event.findUnique({ where: { slug: "4-anos-folks-curitiba" } })) return;

  const startsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const event = await db.event.create({
    data: {
      producerId: producer.id,
      slug: "4-anos-folks-curitiba",
      title: "4 Anos Folks Curitiba",
      description:
        "A maior festa do ano está chegando! Para comemorar 4 anos de casa, preparamos **3 ambientes**, open bar e convidados especiais.\n\n- Open bar de chopp e drinks até 1h\n- 3 pistas: sertanejo, funk e eletrônica\n- Área VIP com camarote",
      venueName: "Folks Bar",
      address: "Rua Exemplo, 123 - Batel",
      city: "Curitiba",
      state: "PR",
      startsAt,
      status: "PUBLISHED",
      accentColor: "#7c3aed",
      contactPhone: "(41) 99999-9999",
      contactEmail: "contato@folksbar.com.br",
      contactInstagram: "folksbar",
      refundMode: "SELF_SERVICE",
      refundDeadlineHours: 48,
      content: [
        {
          type: "lineup",
          title: "Atrações",
          items: [
            { name: "DJ Alok Cover", detail: "23h" },
            { name: "Banda Sertaneja Raiz", detail: "00h30" },
            { name: "MC Convidado", detail: "02h" },
          ],
        },
        {
          type: "faq",
          title: "Perguntas frequentes",
          items: [
            { q: "Qual a idade mínima?", a: "18 anos, com documento oficial com foto." },
            { q: "Tem estacionamento?", a: "Sim, conveniado ao lado da casa." },
          ],
        },
      ],
      ticketTypes: {
        create: [
          {
            name: "Pista",
            sortOrder: 0,
            batches: {
              create: [
                { name: "1º lote", priceCents: 4000, quantity: 100, sortOrder: 0 },
                { name: "2º lote", priceCents: 6000, quantity: 200, sortOrder: 1 },
              ],
            },
          },
          {
            name: "VIP",
            description: "Área exclusiva + open bar premium",
            sortOrder: 1,
            batches: { create: [{ name: "Lote único", priceCents: 15000, quantity: 50, maxPerOrder: 4 }] },
          },
        ],
      },
    },
  });

  // Wesley ganha 10% por venda
  const wesley = await db.advertiser.create({
    data: { producerId: producer.id, name: "Wesley Promoter", instagram: "@wesley", commissionType: "PERCENT", commissionValue: 1000 },
  });
  await db.coupon.create({ data: { eventId: event.id, advertiserId: wesley.id, code: "WESLEY", discountType: "PERCENT", value: 10 } });
  console.log("Seed ok:", event.slug);
}

main().finally(() => db.$disconnect());
