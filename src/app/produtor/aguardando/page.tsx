import { redirect } from "next/navigation";
import { requireProducerSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cadastro em análise" };

export default async function WaitingPage() {
  const producer = await requireProducerSession();
  if (producer.status === "APPROVED") redirect("/painel");

  const rejected = producer.status === "REJECTED";
  return (
    <div className="mx-auto max-w-lg">
      <div className="card space-y-4 text-center">
        <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl ${rejected ? "bg-slate-100" : "bg-amber-50"}`}>{rejected ? "✉️" : "⏳"}</div>
        <h1 className="text-2xl font-extrabold">{rejected ? "Cadastro não aprovado" : "Cadastro em análise"}</h1>
        {rejected ? (
          <p className="text-slate-600">
            Neste momento não conseguimos aprovar o cadastro da <b>{producer.name}</b>. Se quiser conversar, escreva para{" "}
            <a href={`mailto:${env.supportEmail}`} className="text-brand-700 underline">
              {env.supportEmail}
            </a>
            .
          </p>
        ) : (
          <>
            <p className="text-slate-600">
              Recebemos o cadastro da <b>{producer.name}</b>. Nossa equipe vai falar com você pelo WhatsApp <b>{producer.phone}</b> ou pelo e-mail{" "}
              <b>{producer.email}</b>.
            </p>
            <p className="text-sm text-slate-500">Assim que o cadastro for aprovado, avisamos por e-mail e o painel fica liberado.</p>
          </>
        )}
        <form action={logout}>
          <button className="btn-secondary">Sair</button>
        </form>
      </div>
    </div>
  );
}
