"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ActionState } from "@/components/ActionForm";

function Btn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="btn-danger px-3 py-1.5 text-xs"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(label)) e.preventDefault();
      }}
    >
      {pending ? "..." : "Reembolsar"}
    </button>
  );
}

export function RefundButton({ action, confirm }: { action: (prev: ActionState) => Promise<ActionState>; confirm: string }) {
  const [state, formAction] = useFormState(action, null);
  return (
    <form action={formAction} className="text-right">
      <Btn label={confirm} />
      {state?.error && <p className="mt-1 text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
