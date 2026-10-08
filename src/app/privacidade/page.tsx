import { LegalPage } from "@/components/LegalPage";
import { env } from "@/lib/env";

export const metadata = { title: "Privacidade" };

// Modelo inicial: revise com um advogado antes de lançar.
export default function Privacy() {
  return (
    <LegalPage title="Política de privacidade">
      <p>Coletamos apenas os dados necessários para vender e entregar o seu ingresso, em conformidade com a LGPD (Lei 13.709/2018).</p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li>Nome, e-mail, CPF e celular: emissão do ingresso, envio por e-mail, prevenção a fraudes e atendimento.</li>
        <li>Dados do cartão: enviados diretamente ao processador de pagamento. Não armazenamos o número do cartão.</li>
      </ul>
      <h2>Com quem compartilhamos</h2>
      <ul>
        <li>Com o organizador do evento que você comprou: nome e e-mail, para controle de entrada e atendimento.</li>
        <li>Com o processador de pagamento, para processar a transação.</li>
      </ul>
      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail{" "}
        <a href={`mailto:${env.supportEmail}`} className="text-brand-700 underline">{env.supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
