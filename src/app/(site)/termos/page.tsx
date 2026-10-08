import { LegalPage } from "@/components/LegalPage";
import { env } from "@/lib/env";

export const metadata = { title: "Termos de uso" };

// Modelo inicial: revise com um advogado antes de lançar.
export default function Terms() {
  const name = env.companyLegalName || env.companyName;
  return (
    <LegalPage title="Termos de uso">
      <p>
        A {name}
        {env.companyCnpj && ` (CNPJ ${env.companyCnpj})`} é uma plataforma que intermedia a venda de ingressos de eventos organizados por terceiros
        (&quot;organizadores&quot;). Ao comprar, você concorda com estes termos.
      </p>
      <h2>1. Papel da plataforma</h2>
      <p>
        O organizador é o responsável pela realização do evento, pelas informações publicadas na página e pelo atendimento no local. A plataforma
        é responsável pelo processamento da venda, emissão e envio dos ingressos.
      </p>
      <h2>2. Compra e taxa de serviço</h2>
      <p>
        O valor de cada ingresso e a taxa de serviço (quando cobrada do comprador) são exibidos antes do pagamento. O ingresso é enviado ao e-mail
        informado assim que o pagamento é confirmado.
      </p>
      <h2>3. Idade mínima</h2>
      <p>
        Os eventos podem ter venda de bebidas alcoólicas e são destinados a maiores de 18 anos. O comprador declara ter idade mínima e a entrada
        depende da apresentação de documento oficial com foto.
      </p>
      <h2>4. Uso do ingresso</h2>
      <p>
        Cada QR Code dá direito a uma única entrada. Não compartilhe o seu ingresso publicamente: a primeira leitura na entrada é a válida. Não
        compre ingressos de terceiros fora da plataforma.
      </p>
      <h2>5. Cancelamento e reembolso</h2>
      <p>Conforme a Política de reembolso e as regras do evento informadas na página antes da compra.</p>
      <h2>6. Dados pessoais</h2>
      <p>Tratamos seus dados conforme a Política de privacidade e a LGPD.</p>
    </LegalPage>
  );
}
