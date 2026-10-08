import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { resetPassword } from "../actions";

export const metadata = { title: "Nova senha" };

export default function ResetPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-extrabold">Criar nova senha</h1>
      <ActionForm action={resetPassword} className="card space-y-4">
        <input type="hidden" name="token" value={searchParams.token ?? ""} />
        <div>
          <label className="label" htmlFor="password">
            Nova senha
          </label>
          <input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">
            Repita a nova senha
          </label>
          <input id="confirm" name="confirm" type="password" className="input" required minLength={8} autoComplete="new-password" />
        </div>
        <SubmitButton className="btn-primary w-full">Salvar nova senha</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-center text-sm">
        <Link href="/produtor/login" className="font-medium text-brand-700">
          Ir para o login
        </Link>
      </p>
    </div>
  );
}
