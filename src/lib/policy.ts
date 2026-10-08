import type { Event } from "@prisma/client";

export function hoursLabel(h: number): string {
  if (h === 0) return "até o início do evento";
  if (h % 24 === 0) return `até ${h / 24} ${h / 24 === 1 ? "dia" : "dias"} antes do evento`;
  return `até ${h} ${h === 1 ? "hora" : "horas"} antes do evento`;
}

/** Texto da política de reembolso exibido ao comprador. */
export function refundPolicyText(e: Pick<Event, "refundMode" | "refundDeadlineHours">): string {
  return e.refundMode === "SELF_SERVICE"
    ? `Reembolso integral pelo próprio site, ${hoursLabel(e.refundDeadlineHours)}, na página do seu pedido.`
    : `Reembolso ${hoursLabel(e.refundDeadlineHours)}, solicitado diretamente ao organizador pelos contatos desta página.`;
}
