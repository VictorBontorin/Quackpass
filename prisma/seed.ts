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
      description: "A maior festa do ano! Open bar até 1h, 3 pistas e convidados especiais.",
      venueName: "Folks Bar",
      address: "Rua Exemplo, 123",
      city: "Curitiba",
      state: "PR",
      startsAt,
      minAge: 18,
      status: "PUBLISHED",
      ticketTypes: {
        create: [
          {
            name: "Pista",
            sortOrder: 0,
            batches: {
              create: [
                { name: "1º lote", priceCents: 4000, halfPriceCents: 2000, quantity: 100, sortOrder: 0 },
                { name: "2º lote", priceCents: 6000, halfPriceCents: 3000, quantity: 200, sortOrder: 1 },
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

  const wesley = await db.advertiser.create({ data: { producerId: producer.id, name: "Wesley Promoter", instagram: "@wesley" } });
  await db.coupon.create({ data: { eventId: event.id, advertiserId: wesley.id, code: "WESLEY", discountType: "PERCENT", value: 10 } });
  console.log("Seed ok:", event.slug);
}

main().finally(() => db.$disconnect());
