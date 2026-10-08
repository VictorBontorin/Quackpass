import { LegalPage } from "@/components/LegalPage";
import { env } from "@/lib/env";

export const metadata = { title: "Política de reembolso" };

export default function RefundPolicy() {
  return (
    <LegalPage title="Política de reembolso">
      <p>
        Cada evento tem a sua política de reembolso, definida pelo organizador e exibida <b>na página do evento antes da compra</b> e na página do
        seu pedido. Ela informa até quando o reembolso pode ser pedido e como pedir.
      </p>
      <h2>Como pedir</h2>
      <ul>
        <li>
          <b>Reembolso pelo site:</b> abra a página do pedido (link no e-mail dos ingressos), clique em &quot;Solicitar reembolso&quot; e confirme
          com o e-mail da compra. O estorno é feito na hora.
        </li>
        <li>
          <b>Reembolso pelo organizador:</b> fale com o organizador pelos contatos da página do evento. Ele faz o reembolso pelo painel dele e você
          recebe a confirmação por e-mail.
        </li>
      </ul>
      <h2>Prazos de devolução do dinheiro</h2>
      <ul>
        <li>Pix: o valor volta para a conta de origem, normalmente em até 1 dia útil.</li>
        <li>Cartão de crédito: o estorno aparece em até 2 faturas, conforme o banco emissor.</li>
        <li>Cartão de débito: o valor volta para a conta em até 10 dias úteis, conforme o banco.</li>
      </ul>
      <h2>Regras gerais</h2>
      <ul>
        <li>O reembolso devolve o valor total pago no pedido e cancela todos os ingressos dele.</li>
        <li>Ingressos já utilizados (com entrada registrada) não podem ser reembolsados.</li>
        <li>Se o evento for cancelado, todos os compradores recebem o reembolso integral.</li>
        <li>Os direitos previstos no Código de Defesa do Consumidor são sempre respeitados.</li>
      </ul>
      <p>
        Dúvidas? Escreva para <a href={`mailto:${env.supportEmail}`} className="text-brand-700 underline">{env.supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
