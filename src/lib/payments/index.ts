import { env } from "../env";
import { mockProvider } from "./mock";
import { pagarmeProvider } from "./pagarme";
import type { PaymentProvider } from "./types";

export function paymentProvider(): PaymentProvider {
  return env.paymentProvider === "pagarme" ? pagarmeProvider : mockProvider;
}

export * from "./types";
