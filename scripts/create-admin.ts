/**
 * Cria (ou atualiza a senha de) um administrador da plataforma.
 * Uso: npm run admin:create -- email@dominio.com "Seu Nome" "senha-forte"
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [email, name, password] = process.argv.slice(2);
if (!email || !name || !password || password.length < 10) {
  console.error('Uso: npm run admin:create -- email@dominio.com "Seu Nome" "senha com 10+ caracteres"');
  process.exit(1);
}

const db = new PrismaClient();
db.adminUser
  .upsert({
    where: { email: email.toLowerCase() },
    update: { name, passwordHash: bcrypt.hashSync(password, 10) },
    create: { email: email.toLowerCase(), name, passwordHash: bcrypt.hashSync(password, 10) },
  })
  .then((a) => console.log(`Administrador pronto: ${a.email}`))
  .finally(() => db.$disconnect());
