import { ActionForm } from "@/components/ActionForm";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { adminLogin } from "../actions";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Logo />
        <p className="text-sm text-slate-500">Administração da plataforma</p>
      </div>
      <ActionForm action={adminLogin} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Senha
          </label>
          <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="Entrando...">
          Entrar
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
