import { LegalPage } from "@/components/LegalPage";
import { env } from "@/lib/env";

export const metadata = { title: "Central de ajuda" };

const faq: [string, React.ReactNode][] = [
  ["Não recebi meu ingresso por e-mail", "Confira a caixa de spam e promoções. Você também pode abrir a página do pedido e clicar em \"Reenviar ingressos por e-mail\". Os ingressos sempre ficam disponíveis na página do pedido."],
  ["Paguei o Pix e o pedido não confirmou", "A confirmação costuma levar segundos. Se passar de 15 minutos, escreva para o suporte com o número do pedido e o comprovante."],
  ["Como peço reembolso?", "Veja a política do evento na página do evento ou do pedido. Alguns eventos permitem pedir pelo próprio site; em outros, o reembolso é feito pelo organizador."],
  ["Posso transferir o ingresso para um amigo?", "Sim. Na página do pedido, abra o ingresso individual e envie o link. Lembre-se: cada QR Code só vale uma entrada."],
  ["Preciso levar documento?", "Sim. Os eventos são para maiores de 18 anos e a entrada exige documento oficial com foto."],
];

export default function Help() {
  return (
    <LegalPage title="Central de ajuda">
      {faq.map(([q, a]) => (
        <div key={q}>
          <h2>{q}</h2>
          <p>{a}</p>
        </div>
      ))}
      <h2>Fale com a gente</h2>
      <p>
        <a href={`mailto:${env.supportEmail}`} className="text-brand-700 underline">{env.supportEmail}</a>. Informe o número do pedido para agilizar.
      </p>
    </LegalPage>
  );
}
