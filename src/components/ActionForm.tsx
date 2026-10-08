"use client";

import { useFormState } from "react-dom";

export type ActionState = { error?: string; ok?: string } | null;

/** Form que mostra o erro/sucesso devolvido pela server action. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useFormState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && <p className="rounded-lg bg-red-950 p-2 text-sm text-red-200">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-emerald-950 p-2 text-sm text-emerald-200">{state.ok}</p>}
    </form>
  );
}
