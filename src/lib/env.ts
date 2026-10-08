function num(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  platformFeePercent: num("PLATFORM_FEE_PERCENT", 10),
  platformFeeMinCents: num("PLATFORM_FEE_MIN_CENTS", 300),
  reservationMinutes: num("ORDER_RESERVATION_MINUTES", 15),
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? "mock") as "mock" | "pagarme",
  companyName: process.env.COMPANY_NAME ?? "Quackpass",
  companyLegalName: process.env.COMPANY_LEGAL_NAME ?? "",
  companyCnpj: process.env.COMPANY_CNPJ ?? "",
  supportEmail: process.env.SUPPORT_EMAIL ?? "contato@quackpass.com.br",
};
