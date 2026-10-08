import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { signup } from "../actions";

export const metadata = { title: "Cadastro de produtor" };

export default function SignupPage() {
  return (
    <div className="container-page max-w-md py-12">
      <h1 className="mb-1 text-2xl font-black">Venda ingressos com a Quackpass</h1>
      <p className="mb-6 text-sm text-slate-500">Cadastre sua balada, bar ou evento. Sem mensalidade: você só paga quando vende.</p>
      <ActionForm action={signup} className="card space-y-3">
        <div>
          <label className="label">Nome da casa / produtora</label>
          <input name="name" className="input" required />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">CPF ou CNPJ</label>
            <input name="document" className="input" required inputMode="numeric" />
          </div>
          <div>
            <label className="label">Celular</label>
            <input name="phone" className="input" required inputMode="tel" />
          </div>
        </div>
        <div>
          <label className="label">Senha</label>
          <input name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="Criando conta...">
          Criar conta
        </SubmitButton>
      </ActionForm>
      <p className="mt-4 text-center text-sm text-slate-500">
        Já tem conta?{" "}
        <Link href="/produtor/login" className="text-brand-600">
          Entrar
        </Link>
      </p>
    </div>
  );
}
