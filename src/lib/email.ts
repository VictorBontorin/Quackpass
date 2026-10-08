import fs from "fs/promises";
import path from "path";
import nodemailer, { type Transporter } from "nodemailer";
import QRCode from "qrcode";
import { db } from "./db";
import { env } from "./env";
import { brl, dateTime } from "./format";
import { formatTicketCode } from "./tickets";

/**
 * Envio por SMTP (funciona com Resend, Amazon SES, Brevo, SendGrid, Gmail Workspace...).
 * Sem SMTP_URL configurado, o e-mail só é registrado no log (e salvo em EMAIL_PREVIEW_DIR, se definido).
 */
let transporter: Transporter | null = null;
function getTransporter() {
  if (!process.env.SMTP_URL) return null;
  transporter ??= nodemailer.createTransport(process.env.SMTP_URL);
  return transporter;
}

type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Buffer; cid: string }[];
};

export async function sendMail(mail: Mail) {
  const from = process.env.EMAIL_FROM ?? `${env.companyName} <nao-responda@localhost>`;
  const t = getTransporter();
  if (!t) {
    console.log(`[email] (sem SMTP) para=${mail.to} assunto="${mail.subject}"`);
    if (process.env.EMAIL_PREVIEW_DIR) {
      await fs.mkdir(process.env.EMAIL_PREVIEW_DIR, { recursive: true });
      let html = mail.html;
      for (const a of mail.attachments ?? []) html = html.replaceAll(`cid:${a.cid}`, `data:image/png;base64,${a.content.toString("base64")}`);
      await fs.writeFile(path.join(process.env.EMAIL_PREVIEW_DIR, `${Date.now()}-${mail.to}.html`), html);
    }
    return;
  }
  await t.sendMail({ from, ...mail });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0">
<tr><td style="padding:20px 24px;border-bottom:1px solid #e2e8f0;font-size:20px;font-weight:bold;color:#1d4ed8">${esc(env.companyName)}</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:20px">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">
${esc(env.companyName)}${env.companyCnpj ? ` · CNPJ ${esc(env.companyCnpj)}` : ""}<br>
Dúvidas? ${esc(env.supportEmail)}
</td></tr></table></td></tr></table></body></html>`;
}

/** Envia os ingressos do pedido. Pode ser chamado de novo para reenviar. */
export async function sendTicketsEmail(orderId: string, to?: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { event: true, tickets: { include: { batch: { include: { ticketType: true } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!order || order.status !== "PAID" || order.tickets.length === 0) return;
  const ev = order.event;
  const orderUrl = `${env.appUrl}/pedido/${order.id}`;

  const attachments = await Promise.all(
    order.tickets.map(async (t) => ({
      filename: `ingresso-${t.code}.png`,
      content: await QRCode.toBuffer(t.code, { margin: 1, width: 280 }),
      cid: `qr-${t.code}`,
    })),
  );

  const ticketsHtml = order.tickets
    .map(
      (t, i) => `<table role="presentation" width="100%" style="border:1px solid #e2e8f0;border-radius:10px;margin:12px 0"><tr>
<td style="padding:12px;width:150px" valign="top"><img src="cid:qr-${t.code}" width="140" height="140" alt="QR Code" style="display:block"></td>
<td style="padding:12px" valign="top">
<div style="font-size:12px;color:#64748b">INGRESSO ${i + 1} DE ${order.tickets.length}</div>
<div style="font-size:16px;font-weight:bold;margin:4px 0">${esc(t.batch.ticketType.name)} · ${esc(t.batch.name)}</div>
<div style="font-size:14px">${esc(t.holderName)}</div>
<div style="font-family:monospace;font-size:15px;letter-spacing:2px;color:#1d4ed8;margin-top:6px">${formatTicketCode(t.code)}</div>
${t.status === "CANCELLED" ? '<div style="color:#b91c1c;font-weight:bold">CANCELADO</div>' : ""}
</td></tr></table>`,
    )
    .join("");

  const html = layout(
    `Seus ingressos para ${ev.title}`,
    `<p style="margin:0 0 4px">Olá, ${esc(order.buyerName.split(" ")[0])}! Sua compra foi confirmada.</p>
<p style="margin:0 0 16px;color:#334155"><b>${esc(dateTime(ev.startsAt))}</b><br>${esc(ev.venueName)} · ${esc(ev.address)} · ${esc(ev.city)}/${esc(ev.state)}</p>
${ticketsHtml}
<p style="margin:16px 0;padding:12px;background:#fef9c3;border-radius:8px;font-size:13px">
Evento para maiores de ${ev.minAge} anos. Leve um documento oficial com foto.
Cada QR Code dá direito a uma entrada e só pode ser usado uma vez.</p>
<p style="margin:0 0 16px"><a href="${orderUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Ver meus ingressos</a></p>
<table role="presentation" width="100%" style="font-size:13px;color:#334155">
<tr><td>Pedido</td><td align="right">${order.id}</td></tr>
${order.discountCents > 0 ? `<tr><td>Desconto</td><td align="right">- ${brl(order.discountCents)}</td></tr>` : ""}
${ev.feePayer === "BUYER" && order.feeCents > 0 ? `<tr><td>Taxa de serviço</td><td align="right">${brl(order.feeCents)}</td></tr>` : ""}
<tr><td><b>Total pago</b></td><td align="right"><b>${brl(order.totalCents)}</b></td></tr></table>`,
  );

  const text = [
    `Seus ingressos para ${ev.title}`,
    `${dateTime(ev.startsAt)} - ${ev.venueName}, ${ev.address}, ${ev.city}/${ev.state}`,
    ...order.tickets.map((t) => `${t.batch.ticketType.name} - ${t.batch.name}: ${formatTicketCode(t.code)}`),
    `Veja os QR Codes em: ${orderUrl}`,
  ].join("\n");

  await sendMail({ to: to ?? order.buyerEmail, subject: `Seus ingressos: ${ev.title}`, html, text, attachments });
  await db.order.update({ where: { id: order.id }, data: { ticketsEmailedAt: new Date() } });
}

export async function sendRefundEmail(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { event: true } });
  if (!order || order.status !== "REFUNDED") return;
  const method =
    order.paymentMethod === "PIX"
      ? "O valor volta para a conta de origem do Pix, normalmente em até 1 dia útil."
      : "O estorno aparece na sua fatura em até 2 faturas, conforme o seu banco.";
  await sendMail({
    to: order.buyerEmail,
    subject: `Reembolso confirmado: ${order.event.title}`,
    html: layout(
      "Reembolso confirmado",
      `<p>Olá, ${esc(order.buyerName.split(" ")[0])}. O reembolso do seu pedido para <b>${esc(order.event.title)}</b> foi feito.</p>
<p>Valor: <b>${brl(order.totalCents)}</b><br>${method}</p>
<p style="color:#64748b;font-size:13px">Os ingressos deste pedido foram cancelados e não dão mais acesso ao evento.</p>`,
    ),
    text: `Reembolso confirmado de ${brl(order.totalCents)} para ${order.event.title}. ${method}`,
  });
}

/** Não deixa falha de e-mail derrubar o pagamento: registra e segue. */
export async function safely(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
  } catch (err) {
    console.error(`[email] falha em ${label}`, err);
  }
}
