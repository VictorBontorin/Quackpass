import { randomUUID } from "crypto";
import type { GatewayStatus, PaymentProvider } from "./types";

/**
 * Gateway falso para desenvolvimento.
 * - Pix: fica pendente; use o botão "Simular pagamento" na tela do pedido.
 * - Cartão: token "mock_fail" recusa, qualquer outro aprova na hora.
 */
export const mockProvider: PaymentProvider = {
  name: "mock",
  async createPayment({ order, card }) {
    const gatewayOrderId = `mock_${randomUUID()}`;
    if (order.paymentMethod === "PIX") {
      const payload = `00020126MOCKPIX${order.id}5204000053039865406${(order.totalCents / 100).toFixed(2)}5802BR`;
      return { gatewayOrderId, gatewayChargeId: `ch_${randomUUID()}`, status: "pending", pixQrCode: payload };
    }
    if (card?.token === "mock_fail") {
      return { gatewayOrderId, status: "failed", failureReason: "Cartão recusado pelo emissor (simulado)" };
    }
    return { gatewayOrderId, gatewayChargeId: `ch_${randomUUID()}`, status: "paid" };
  },
  async getStatus(): Promise<GatewayStatus> {
    return "pending";
  },
  async refund() {},
};
