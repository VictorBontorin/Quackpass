import type { Event, Order, OrderItem, Producer } from "@prisma/client";

export type CardInput = { token: string; installments?: number };

export type PaymentRequest = {
  order: Order & { items: (OrderItem & { description: string })[] };
  event: Event;
  producer: Producer;
  card?: CardInput;
};

export type GatewayStatus = "pending" | "paid" | "failed" | "canceled" | "refunded";

export type PaymentResult = {
  gatewayOrderId: string;
  gatewayChargeId?: string;
  status: GatewayStatus;
  pixQrCode?: string;
  pixQrCodeUrl?: string;
  /** Para débito com 3DS: o comprador precisa ser redirecionado para cá */
  authUrl?: string;
  failureReason?: string;
};

export interface PaymentProvider {
  name: string;
  createPayment(req: PaymentRequest): Promise<PaymentResult>;
  /** Consulta o status real no gateway (nunca confie só no corpo do webhook) */
  getStatus(gatewayOrderId: string): Promise<GatewayStatus>;
  refund?(gatewayChargeId: string): Promise<void>;
}
