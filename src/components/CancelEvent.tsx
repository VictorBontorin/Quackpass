"use client";

import { useState } from "react";
import { ActionForm, type ActionState } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

/** Cancelamento com confirmação: reembolsa todos os compradores automaticamente. */
export function CancelEvent({
  action,
  paidOrders,
  small,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  paidOrders: number;
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button className={`btn-danger ${small ? "px-3 py-1.5 text-xs" : ""}`} onClick={() => setOpen(true)}>
        Cancelar evento
      </button>
    );
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
      <ActionForm action={action} className="card w-full max-w-md space-y-4">
        <h2 id="cancel-title" className="section-title">
          Cancelar o evento?
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>As vendas param na hora.</li>
          <li>
            <b>{paidOrders} pedido(s) pago(s)</b> serão reembolsados integralmente, de forma automática.
          </li>
          <li>Todos os compradores recebem um e-mail avisando do cancelamento e do reembolso.</li>
          <li>Não dá para desfazer.</li>
        </ul>
        <div>
          <label className="label" htmlFor="reason">
            Motivo (aparece para os compradores)
          </label>
          <input id="reason" name="reason" className="input" placeholder="Ex.: problema com a licença do local" maxLength={300} />
        </div>
        <div>
          <label className="label" htmlFor="confirm">
            Digite CANCELAR para confirmar
          </label>
          <input id="confirm" name="confirm" className="input uppercase" autoComplete="off" required />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Voltar
          </button>
          <SubmitButton className="btn bg-red-700 text-white hover:bg-red-800" pendingText="Cancelando e reembolsando...">
            Cancelar evento e reembolsar
          </SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
