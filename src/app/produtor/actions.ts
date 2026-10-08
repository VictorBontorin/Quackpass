"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/ActionForm";
import { createSession, destroySession } from "@/lib/auth";
import { db } from "@/lib/db";
import { onlyDigits } from "@/lib/format";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { headers } from "next/headers";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  document: z.string().transform(onlyDigits).pipe(z.string().regex(/^(\d{11}|\d{14})$/, "CPF ou CNPJ inválido")),
  phone: z.string().transform(onlyDigits).pipe(z.string().min(10, "Celular inválido").max(13)),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(100),
});

function ip() {
  return clientIp(new Request("http://x", { headers: headers() }));
}

export async function signup(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!rateLimit(`signup:${ip()}`, 5, 60_000)) return { error: "Muitas tentativas. Aguarde um minuto." };
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { password, ...data } = parsed.data;
  if (await db.producer.findUnique({ where: { email: data.email } })) return { error: "Já existe uma conta com este e-mail" };
  const producer = await db.producer.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
  await createSession(producer.id);
  redirect("/painel");
}

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!rateLimit(`login:${ip()}`, 10, 60_000)) return { error: "Muitas tentativas. Aguarde um minuto." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const producer = await db.producer.findUnique({ where: { email } });
  if (!producer || !(await bcrypt.compare(password, producer.passwordHash))) return { error: "E-mail ou senha incorretos" };
  await createSession(producer.id);
  redirect("/painel");
}

export async function logout() {
  destroySession();
  redirect("/produtor/login");
}
