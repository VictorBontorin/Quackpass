"use client";

import { useEffect, useRef } from "react";
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
  const msgRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    msgRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [state]);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && (
        <p ref={msgRef} role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p ref={msgRef} role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {state.ok}
        </p>
      )}
    </form>
  );
}
