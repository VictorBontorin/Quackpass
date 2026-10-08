import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { login } from "../actions";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-2xl font-extrabold">Entrar</h1>
      <p className="mb-6 text-sm text-slate-600">Acesse o painel da sua casa.</p>
      <ActionForm action={login} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="password">
              Senha
            </label>
            <Link href="/produtor/esqueci-senha" className="text-xs font-medium text-brand-700">
              Esqueci minha senha
            </Link>
          </div>
          <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="Entrando...">
          Entrar
        </SubmitButton>
      </ActionForm>
      <p className="mt-4 text-center text-sm text-slate-600">
        Ainda não é parceiro?{" "}
        <Link href="/produtor/cadastro" className="font-medium text-brand-700">
          Faça o seu cadastro
        </Link>
      </p>
    </div>
  );
}
