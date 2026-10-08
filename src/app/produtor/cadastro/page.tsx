import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { signup } from "../actions";

export const metadata = { title: "Seja parceiro" };

function F({ label, name, hint, ...rest }: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} className="input" {...rest} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Venda os ingressos da sua casa com a gente</h1>
        <p className="text-slate-600">Sem mensalidade: você só paga uma taxa por ingresso vendido.</p>
        <ol className="space-y-3 text-sm">
          {[
            ["Preencha o cadastro", "Conte um pouco sobre a sua casa ou produtora."],
            ["Falamos com você", "Nossa equipe entra em contato pelo WhatsApp para conhecer o seu negócio."],
            ["Acesso liberado", "Com o cadastro aprovado, você cria e publica os seus eventos."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-slate-600">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <ActionForm action={signup} className="card grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="section-title">Cadastro de parceiro</h2>
        </div>
        <F label="Nome da casa / produtora" name="name" required />
        <F label="Seu nome (responsável)" name="contactName" required autoComplete="name" />
        <F label="WhatsApp" name="phone" required inputMode="tel" placeholder="(41) 99999-9999" />
        <F label="E-mail" name="email" type="email" required autoComplete="email" />
        <F label="CPF ou CNPJ" name="document" required inputMode="numeric" />
        <F label="Instagram da casa" name="instagram" placeholder="@suacasa" />
        <div className="grid grid-cols-[1fr_80px] gap-3">
          <F label="Cidade" name="city" required />
          <F label="UF" name="state" required maxLength={2} className="input uppercase" />
        </div>
        <div>
          <label className="label" htmlFor="venueType">
            Tipo
          </label>
          <select id="venueType" name="venueType" className="input" defaultValue="Balada">
            {["Balada", "Bar", "Casa de show", "Produtora de eventos", "Outro"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="eventsPerMonth">
            Eventos por mês
          </label>
          <select id="eventsPerMonth" name="eventsPerMonth" className="input" defaultValue="1 a 4">
            {["Menos de 1", "1 a 4", "5 a 10", "Mais de 10"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <F label="Crie uma senha" name="password" type="password" required minLength={8} autoComplete="new-password" hint="Mínimo de 8 caracteres" />
        <div className="sm:col-span-2">
          <label className="label" htmlFor="message">
            Quer contar algo? (opcional)
          </label>
          <textarea id="message" name="message" className="input min-h-20" placeholder="Capacidade da casa, público, como vende hoje..." />
        </div>
        <div className="sm:col-span-2">
          <SubmitButton className="btn-primary w-full" pendingText="Enviando...">
            Enviar cadastro
          </SubmitButton>
          <p className="mt-3 text-center text-sm text-slate-600">
            Já é parceiro?{" "}
            <Link href="/produtor/login" className="font-medium text-brand-700">
              Entrar
            </Link>
          </p>
        </div>
      </ActionForm>
    </div>
  );
}
