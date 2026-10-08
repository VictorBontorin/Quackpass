"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ActionState } from "@/components/ActionForm";

function Btn({ children, className, confirm }: { children: React.ReactNode; className: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "..." : children}
    </button>
  );
}

/** Botões de reembolso e reenvio de um pedido pago. */
export function OrderRowActions({
  refund,
  resend,
  buyer,
  total,
}: {
  refund: (prev: ActionState) => Promise<ActionState>;
  resend: (prev: ActionState) => Promise<ActionState>;
  buyer: string;
  total: string;
}) {
  const [refundState, refundAction] = useFormState(refund, null);
  const [resendState, resendAction] = useFormState(resend, null);
  const msg = refundState ?? resendState;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <form action={resendAction}>
          <Btn className="btn-secondary px-2 py-1 text-xs">Reenviar e-mail</Btn>
        </form>
        <form action={refundAction}>
          <Btn className="btn-danger px-2 py-1 text-xs" confirm={`Reembolsar ${total} para ${buyer}? Os ingressos do pedido serão cancelados.`}>
            Reembolsar
          </Btn>
        </form>
      </div>
      {msg && <p className={`max-w-[220px] text-right text-xs ${msg.error ? "text-red-700" : "text-emerald-700"}`}>{msg.error ?? msg.ok}</p>}
    </div>
  );
}
