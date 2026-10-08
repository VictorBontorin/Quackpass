import { env } from "../env";
import { onlyDigits } from "../format";
import type { GatewayStatus, PaymentProvider, PaymentResult } from "./types";

/**
 * Integração com Pagar.me API v5 (https://docs.pagar.me/reference).
 * Usa split: cada cobrança é dividida entre o recebedor do produtor e o da plataforma.
 */
const BASE = "https://api.pagar.me/core/v5";

function authHeader() {
  const key = process.env.PAGARME_SECRET_KEY;
  if (!key) throw new Error("PAGARME_SECRET_KEY não configurada");
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

export async function pagarmeFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: authHeader(), "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.message ?? `Pagar.me HTTP ${res.status}`;
    const details = body?.errors ? ` ${JSON.stringify(body.errors)}` : "";
    throw new Error(msg + details);
  }
  return body as T;
}

function mapStatus(s: string | undefined): GatewayStatus {
  switch (s) {
    case "paid":
      return "paid";
    case "failed":
    case "not_authorized":
      return "failed";
    case "canceled":
      return "canceled";
    case "refunded":
    case "chargedback":
      return "refunded";
    default:
      return "pending";
  }
}

function phone(raw: string) {
  const d = onlyDigits(raw).replace(/^55(?=\d{10,11}$)/, "");
  return { country_code: "55", area_code: d.slice(0, 2), number: d.slice(2) };
}

export const pagarmeProvider: PaymentProvider = {
  name: "pagarme",

  async createPayment({ order, event, producer, card }): Promise<PaymentResult> {
    const platformRecipient = process.env.PAGARME_PLATFORM_RECIPIENT_ID;
    if (!platformRecipient) throw new Error("PAGARME_PLATFORM_RECIPIENT_ID não configurado");
    if (!producer.recipientId) throw new Error("Produtor sem conta de recebimento cadastrada");

    const split = [
      {
        amount: order.producerCents,
        recipient_id: producer.recipientId,
        type: "flat",
        options: { charge_processing_fee: false, charge_remainder_fee: false, liable: false },
      },
      {
        amount: order.platformCents,
        recipient_id: platformRecipient,
        type: "flat",
        // A plataforma paga a tarifa do gateway e responde por chargeback
        options: { charge_processing_fee: true, charge_remainder_fee: true, liable: true },
      },
    ].filter((s) => s.amount > 0);

    let payment: Record<string, unknown>;
    if (order.paymentMethod === "PIX") {
      payment = {
        payment_method: "pix",
        pix: { expires_in: env.reservationMinutes * 60 },
      };
    } else if (order.paymentMethod === "CREDIT_CARD") {
      if (!card?.token) throw new Error("Token do cartão ausente");
      payment = {
        payment_method: "credit_card",
        credit_card: {
          installments: order.installments,
          statement_descriptor: "QUACKPASS",
          card_token: card.token,
          operation_type: "auth_and_capture",
        },
      };
    } else if (order.paymentMethod === "DEBIT_CARD") {
      if (!card?.token) throw new Error("Token do cartão ausente");
      // Débito no e-commerce exige autenticação 3DS pelo banco
      payment = {
        payment_method: "debit_card",
        debit_card: {
          statement_descriptor: "QUACKPASS",
          card_token: card.token,
          authentication: {
            type: "threed_secure",
            threed_secure: { mpi: "acquirer", success_url: `${env.appUrl}/pedido/${order.id}` },
          },
        },
      };
    } else {
      throw new Error("Método de pagamento inválido");
    }

    const body = {
      code: order.id,
      closed: true,
      // Um item único com o total: desconto de cupom e taxa já estão embutidos,
      // e a Pagar.me exige que itens e pagamento somem o mesmo valor.
      items: [
        {
          code: event.id,
          description: `Ingressos ${event.title}: ${order.items.map((i) => `${i.quantity}x ${i.description}`).join(", ")}`.slice(0, 256),
          amount: order.totalCents,
          quantity: 1,
        },
      ],
      customer: {
        name: order.buyerName,
        email: order.buyerEmail,
        document: onlyDigits(order.buyerDocument),
        type: onlyDigits(order.buyerDocument).length > 11 ? "company" : "individual",
        phones: { mobile_phone: phone(order.buyerPhone) },
      },
      payments: [{ ...payment, amount: order.totalCents, split }],
      metadata: { event_id: event.id, order_id: order.id },
    };

    const res = await pagarmeFetch<any>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": order.id },
    });

    const charge = res.charges?.[0];
    const tx = charge?.last_transaction ?? {};
    const status = mapStatus(charge?.status ?? res.status);
    return {
      gatewayOrderId: res.id,
      gatewayChargeId: charge?.id,
      status,
      pixQrCode: tx.qr_code,
      pixQrCodeUrl: tx.qr_code_url,
      authUrl: tx.threed_authentication_url ?? tx.authentication_url ?? tx.url,
      failureReason:
        status === "failed"
          ? tx.acquirer_message ?? tx.gateway_response?.errors?.[0]?.message ?? "Pagamento recusado"
          : undefined,
    };
  },

  async getStatus(gatewayOrderId) {
    const res = await pagarmeFetch<any>(`/orders/${gatewayOrderId}`);
    return mapStatus(res.charges?.[0]?.status ?? res.status);
  },

  async refund(gatewayChargeId) {
    await pagarmeFetch(`/charges/${gatewayChargeId}`, { method: "DELETE" });
  },
};

/** Cria o recebedor (conta que recebe o split) do produtor na Pagar.me. */
export async function createPagarmeRecipient(input: {
  name: string;
  email: string;
  document: string;
  phone: string;
  bank: { holder: string; code: string; branch: string; account: string; digit: string; type: "checking" | "savings" };
}): Promise<string> {
  const doc = onlyDigits(input.document);
  const isCompany = doc.length > 11;
  const p = phone(input.phone);
  const res = await pagarmeFetch<any>("/recipients", {
    method: "POST",
    body: JSON.stringify({
      register_information: {
        type: isCompany ? "corporation" : "individual",
        document: doc,
        email: input.email,
        ...(isCompany ? { company_name: input.name, trading_name: input.name } : { name: input.name }),
        phone_numbers: [{ ddd: p.area_code, number: p.number, type: "mobile" }],
      },
      default_bank_account: {
        holder_name: input.bank.holder,
        holder_type: isCompany ? "company" : "individual",
        holder_document: doc,
        bank: input.bank.code,
        branch_number: input.bank.branch,
        account_number: input.bank.account,
        account_check_digit: input.bank.digit,
        type: input.bank.type,
      },
      // Repasse automático; o saldo libera conforme o prazo do método de pagamento
      transfer_settings: { transfer_enabled: true, transfer_interval: "Daily", transfer_day: 0 },
    }),
  });
  return res.id as string;
}
