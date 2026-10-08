# Quackpass

Plataforma de venda de ingressos para baladas, bares e eventos. Produtores cadastram seus eventos e vendem pela plataforma; a plataforma ganha uma taxa por ingresso vendido, sem mensalidade.

## O que já tem

| Área | Funcionalidades |
|---|---|
| **Produtor** | Cadastro e login, conta de recebimento (split automático) |
| **Eventos** | Criar/editar, publicar/pausar/cancelar, banner, idade mínima, quem paga a taxa |
| **Ingressos** | Tipos (Pista, VIP, Camarote...) com **lotes**: preço, meia-entrada, quantidade, máximo por pedido, janela de vendas. O próximo lote abre sozinho quando o anterior esgota ou vence |
| **Anunciantes** | Produtor cadastra promoters/anunciantes e cria **cupons** vinculados a eles (% ou R$, limite de usos, validade). Link de divulgação `?cupom=CODIGO` aplica o desconto automaticamente |
| **Checkout** | **Pix** (QR + copia-e-cola, confirmação automática), **cartão de crédito** (até 6x) e **débito** (com 3DS), com split entre produtor e plataforma |
| **Ingresso** | Gerado assim que o pagamento é confirmado, com QR Code único por ingresso e página individual para enviar a um amigo |
| **Painel de vendas** | Faturamento, ingressos por lote, inteira/meia, vendas por anunciante e por forma de pagamento, lista de pedidos com busca |
| **Check-in** | Página para a portaria: lê o QR pela câmera do celular (ou código digitado), mostra ✅ / ⚠️ já usado / ❌ inválido |

## Modelo de cobrança

- Taxa de serviço: `PLATFORM_FEE_PERCENT` (padrão **10%**) com mínimo de `PLATFORM_FEE_MIN_CENTS` (padrão **R$ 3,00**) por ingresso pago. Ingresso gratuito não paga taxa.
- Por evento, o produtor escolhe **quem paga a taxa**: o comprador (somada ao total) ou o próprio produtor (descontada do repasse).
- O pagamento é dividido na hora pelo gateway (**split**): a parte do produtor vai para o recebedor dele e a taxa vai para o recebedor da plataforma. A plataforma paga a tarifa do gateway e responde por chargeback (configurável em `src/lib/payments/pagarme.ts`).

Exemplo: ingresso de R$ 50 com taxa paga pelo comprador → comprador paga R$ 55, produtor recebe R$ 50, plataforma recebe R$ 5 (menos a tarifa do gateway).

## Feito para aguentar fluxo

- **Sem venda a mais:** a reserva de estoque é um `UPDATE ... WHERE sold + n <= quantity` atômico no Postgres. Testado com 100 compras simultâneas disputando 20 ingressos: exatamente 20 vendidos.
- **Reserva com tempo:** o pedido segura os ingressos por `ORDER_RESERVATION_MINUTES` (padrão 15). Se o Pix não for pago, um cron devolve o estoque e o uso do cupom.
- **Pagamento idempotente:** confirmar o mesmo pagamento duas vezes (webhook repetido, polling) emite os ingressos uma única vez. Webhooks repetidos são descartados pela tabela `WebhookEvent`.
- **Não confia no webhook:** o corpo do webhook só diz qual pedido mudou; o status real é sempre consultado na API do gateway.
- **Check-in à prova de duplicidade:** vários leitores ao mesmo tempo nunca deixam o mesmo QR entrar duas vezes.
- **Página do evento em cache (ISR, 15s):** picos de acesso na divulgação não batem no banco a cada visita. O estoque real é conferido no checkout.
- **Stateless:** o app pode rodar em várias instâncias atrás de um load balancer (sessão em JWT assinado no cookie).
- **Dados do cartão nunca passam pelo servidor:** o navegador envia direto para a Pagar.me e recebe um token.
- Índices em todas as consultas quentes, rate limit no checkout, cupom, login e cadastro.

### Para escalar mais (quando precisar)

1. **Banco:** Postgres gerenciado (Neon, Supabase, RDS) com pooler (PgBouncer/Supavisor). Use a URL com pooler em `DATABASE_URL` e a direta em `DIRECT_URL`.
2. **Rate limit distribuído:** o atual é em memória, por instância. Com várias instâncias, troque por Redis (`@upstash/ratelimit`) em `src/lib/ratelimit.ts`.
3. **Imagens:** banners por URL hoje; depois, upload para S3/R2 + CDN.
4. **Fila:** para envio de e-mails/WhatsApp com ingresso, use uma fila (ex.: Inngest, BullMQ) em vez de enviar dentro da requisição.

## Rodando localmente

Requisitos: Node 20+ e Postgres 14+ (ou Docker).

```bash
cp .env.example .env          # ajuste AUTH_SECRET
npm install
npx prisma migrate deploy     # cria as tabelas
npm run db:seed               # evento de demonstração (login: produtor@demo.com / demo12345)
npm run dev                   # http://localhost:3000
```

Com Docker: `docker compose up --build`.

Com `PAYMENT_PROVIDER="mock"` (padrão) nada é cobrado de verdade:
- **Pix:** a tela do pedido mostra o botão "[DEV] Simular pagamento".
- **Cartão:** qualquer número é aprovado; números terminados em `0002` são recusados.

Demo: `http://localhost:3000/evento/4-anos-folks-curitiba?cupom=WESLEY`

## Colocando em produção com a Pagar.me

1. Crie a conta em [pagar.me](https://pagar.me) e peça a ativação de **Marketplace / Split** e dos meios **Pix, crédito e débito**.
2. No painel da Pagar.me, pegue as chaves (`sk_...` e `pk_...`) e o **recipient_id da sua conta** (o recebedor que fica com a taxa).
3. Configure as variáveis:
   ```
   PAYMENT_PROVIDER="pagarme"
   PAGARME_SECRET_KEY="sk_..."
   PAGARME_PUBLIC_KEY="pk_..."
   PAGARME_PLATFORM_RECIPIENT_ID="rp_..."
   PAGARME_WEBHOOK_USER="..."        # invente um usuário
   PAGARME_WEBHOOK_PASSWORD="..."    # e uma senha forte
   APP_URL="https://seudominio.com.br"
   CRON_SECRET="..."
   ```
4. No painel da Pagar.me, crie um webhook para `https://seudominio.com.br/api/webhooks/pagarme` com **Basic Auth** (o usuário/senha acima) e os eventos `order.paid`, `order.payment_failed`, `order.canceled`, `charge.paid`, `charge.refunded`, `charge.payment_failed`.
5. Libere o domínio do site para tokenização de cartão no painel da Pagar.me.
6. Agende `GET /api/cron/expire-orders` a cada minuto com o header `Authorization: Bearer <CRON_SECRET>`. Na Vercel isso já está no `vercel.json` (cron por minuto exige plano Pro; no plano grátis use um cron externo).
7. Cada produtor ativa o recebimento em **Painel → Recebimento**: isso cria o recebedor dele na Pagar.me com a conta bancária informada.

> Teste tudo primeiro com as chaves de **sandbox** (`sk_test_...`). Em especial o **débito**, que depende da autenticação 3DS do banco e precisa ser validado no sandbox antes de ir ao ar.

### Deploy

- **Vercel** + Postgres gerenciado: importe o repositório, configure as variáveis e rode `npx prisma migrate deploy` na primeira vez (ou no build).
- **Docker** (Railway, Render, Fly.io, AWS, VPS): o `Dockerfile` já aplica as migrations ao iniciar.

## Estrutura

```
prisma/schema.prisma              Modelo de dados
src/lib/orders.ts                 Criação do pedido, reserva de estoque, confirmação, expiração
src/lib/pricing.ts                Cálculo de desconto, taxa e split; lote vigente
src/lib/payments/                 Gateway (pagarme.ts real, mock.ts para dev)
src/app/evento/[slug]/            Página pública + checkout
src/app/pedido/[id]/              Pix / ingressos gerados
src/app/ingresso/[code]/          Ingresso individual com QR
src/app/painel/                   Painel do produtor (eventos, lotes, cupons, anunciantes, pedidos, check-in, recebimento)
src/app/api/                      checkout, cupom, status do pedido, webhook, check-in, cron
```

## Próximos passos sugeridos

- Envio do ingresso por e-mail/WhatsApp
- Usuários de equipe (portaria) com acesso só ao check-in
- Reembolso/cancelamento pelo painel
- Transferência de titularidade do ingresso
- Lista VIP / nome na lista
- Upload de banner
- Painel administrativo da plataforma
