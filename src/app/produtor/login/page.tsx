import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { login } from "../actions";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="container-page max-w-sm py-12">
      <h1 className="mb-6 text-2xl font-black">Área do produtor</h1>
      <ActionForm action={login} className="card space-y-3">
        <div>
          <label className="label">E-mail</label>
          <input name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div>
          <label className="label">Senha</label>
          <input name="password" type="password" className="input" required autoComplete="current-password" />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="Entrando...">
          Entrar
        </SubmitButton>
      </ActionForm>
      <p className="mt-4 text-center text-sm text-slate-500">
        Ainda não vende com a gente?{" "}
        <Link href="/produtor/cadastro" className="text-brand-600">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
