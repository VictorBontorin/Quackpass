import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { forgotPassword } from "../actions";

export const metadata = { title: "Esqueci minha senha" };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-2xl font-extrabold">Esqueci minha senha</h1>
      <p className="mb-6 text-sm text-slate-600">Informe o e-mail do cadastro. Vamos enviar um link para você criar uma nova senha.</p>
      <ActionForm action={forgotPassword} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="Enviando...">
          Enviar link
        </SubmitButton>
      </ActionForm>
      <p className="mt-4 text-center text-sm">
        <Link href="/produtor/login" className="font-medium text-brand-700">
          ← Voltar para o login
        </Link>
      </p>
    </div>
  );
}
