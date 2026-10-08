import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { currentStaff } from "@/lib/auth";
import { env } from "@/lib/env";
import { staffLogin } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortariaLogin() {
  if (await currentStaff()) redirect("/portaria/eventos");
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <p className="text-center text-lg font-extrabold">
        {env.companyName} <span className="text-brand-500">Portaria</span>
      </p>
      <p className="mb-6 text-center text-sm text-slate-400">Acesso da equipe de entrada</p>
      <ActionForm action={staffLogin} className="card space-y-4">
        <div>
          <label className="label" htmlFor="login">
            Login
          </label>
          <input id="login" name="login" className="input py-3 text-base lowercase" required autoCapitalize="none" autoCorrect="off" autoComplete="username" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Senha
          </label>
          <input id="password" name="password" type="password" className="input py-3 text-base" required autoComplete="current-password" />
        </div>
        <SubmitButton className="btn-primary w-full py-3 text-base" pendingText="Entrando...">
          Entrar
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-xs text-slate-500">O acesso é criado pelo responsável da casa no painel do produtor.</p>
    </div>
  );
}
