function num(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export const env = {
  /** Site de compra (público) */
  appUrl,
  /** Área do produtor, portaria e administração. Sem configurar, tudo roda no mesmo endereço. */
  producerUrl: process.env.PRODUCER_URL ?? appUrl,
  staffUrl: process.env.STAFF_URL ?? appUrl,
  adminUrl: process.env.ADMIN_URL ?? appUrl,
  /** Quem recebe o aviso de novo cadastro de produtor */
  adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL ?? "",
  platformFeePercent: num("PLATFORM_FEE_PERCENT", 10),
  platformFeeMinCents: num("PLATFORM_FEE_MIN_CENTS", 300),
  reservationMinutes: num("ORDER_RESERVATION_MINUTES", 15),
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? "mock") as "mock" | "pagarme",
  companyName: process.env.COMPANY_NAME ?? "Quackpass",
  companyLegalName: process.env.COMPANY_LEGAL_NAME ?? "",
  companyCnpj: process.env.COMPANY_CNPJ ?? "",
  supportEmail: process.env.SUPPORT_EMAIL ?? "contato@quackpass.com.br",
};
