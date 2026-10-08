import type { Event } from "@prisma/client";
import { ActionForm, type ActionState } from "@/components/ActionForm";
import { BlocksEditor } from "@/components/editor/BlocksEditor";
import { ImageInput } from "@/components/editor/ImageInput";
import { SubmitButton } from "@/components/SubmitButton";
import { ACCENT_COLORS, parseContent } from "@/lib/content";
import { toLocalInput } from "@/lib/format";

const DEADLINES = [
  [0, "Até o início do evento"],
  [24, "Até 24 horas antes"],
  [48, "Até 48 horas antes"],
  [72, "Até 3 dias antes"],
  [168, "Até 7 dias antes"],
] as const;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4">
      <div>
        <h2 className="section-title">{title}</h2>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function EventForm({
  action,
  event,
  submitLabel,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  event?: Event;
  submitLabel: string;
}) {
  const deadline = event?.refundDeadlineHours ?? 48;
  const deadlineOptions = DEADLINES.some(([h]) => h === deadline) ? DEADLINES : [...DEADLINES, [deadline, `Até ${deadline} horas antes`] as const];

  return (
    <ActionForm action={action} className="space-y-5">
      <Section title="Informações principais">
        <div>
          <label className="label" htmlFor="title">
            Nome do evento
          </label>
          <input id="title" name="title" className="input" required defaultValue={event?.title} placeholder="Ex.: Sexta Sertaneja - 4 anos da casa" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="startsAt">
              Início
            </label>
            <input id="startsAt" name="startsAt" type="datetime-local" className="input" required defaultValue={toLocalInput(event?.startsAt)} />
          </div>
          <div>
            <label className="label" htmlFor="endsAt">
              Término (opcional)
            </label>
            <input id="endsAt" name="endsAt" type="datetime-local" className="input" defaultValue={toLocalInput(event?.endsAt)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="venueName">
              Nome do local
            </label>
            <input id="venueName" name="venueName" className="input" required defaultValue={event?.venueName} />
          </div>
          <div>
            <label className="label" htmlFor="address">
              Endereço
            </label>
            <input id="address" name="address" className="input" required defaultValue={event?.address} placeholder="Rua, número, bairro" />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_90px] gap-4">
          <div>
            <label className="label" htmlFor="city">
              Cidade
            </label>
            <input id="city" name="city" className="input" required defaultValue={event?.city} />
          </div>
          <div>
            <label className="label" htmlFor="state">
              UF
            </label>
            <input id="state" name="state" className="input uppercase" required maxLength={2} defaultValue={event?.state} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showMap" defaultChecked={event?.showMap ?? true} className="h-4 w-4" /> Mostrar mapa do local na página
        </label>
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Todos os eventos são para maiores de 18 anos, com confirmação de idade na compra.</p>
      </Section>

      <Section title="Aparência" description="A capa aparece no topo da página e na lista de eventos. Tamanho ideal: 1920 x 730 px.">
        <ImageInput name="bannerUrl" value={event?.bannerUrl} label="Enviar imagem de capa" />
        <div>
          <p className="label">Cor do evento</p>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map((c) => (
              <label key={c.value} className="cursor-pointer text-center text-xs text-slate-600">
                <input type="radio" name="accentColor" value={c.value} defaultChecked={(event?.accentColor ?? ACCENT_COLORS[0].value) === c.value} className="peer sr-only" />
                <span className="mx-auto block h-10 w-10 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-slate-900 peer-focus-visible:ring-2" style={{ background: c.value }} />
                {c.name}
              </label>
            ))}
          </div>
          <p className="hint">Usada nos botões e destaques da página e do ingresso.</p>
        </div>
      </Section>

      <Section title="Conteúdo da página" description="Conte tudo sobre o evento. Monte a página com os blocos na ordem que preferir.">
        <div>
          <label className="label" htmlFor="description">
            Sobre o evento
          </label>
          <textarea id="description" name="description" className="input min-h-32" defaultValue={event?.description} placeholder="Apresente o evento: estilo musical, open bar, dress code, horários..." />
          <p className="hint">Dica: **negrito**, *itálico*, [link](https://...) e listas com &quot;- &quot; no começo da linha.</p>
        </div>
        <BlocksEditor name="content" initial={parseContent(event?.content ?? [])} />
      </Section>

      <Section title="Contato do organizador" description="Aparece na página do evento. É por aqui que o cliente fala com você (inclusive para reembolso).">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="contactPhone">
              WhatsApp
            </label>
            <input id="contactPhone" name="contactPhone" className="input" defaultValue={event?.contactPhone ?? ""} placeholder="(41) 99999-9999" />
          </div>
          <div>
            <label className="label" htmlFor="contactEmail">
              E-mail
            </label>
            <input id="contactEmail" name="contactEmail" type="email" className="input" defaultValue={event?.contactEmail ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="contactInstagram">
              Instagram
            </label>
            <input id="contactInstagram" name="contactInstagram" className="input" defaultValue={event?.contactInstagram ?? ""} placeholder="@suacasa" />
          </div>
        </div>
      </Section>

      <Section title="Reembolso" description="Esta política aparece para o cliente antes da compra.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="refundMode">
              Quem faz o reembolso
            </label>
            <select id="refundMode" name="refundMode" className="input" defaultValue={event?.refundMode ?? "PRODUCER"}>
              <option value="PRODUCER">Só eu, pelo painel (o cliente fala comigo)</option>
              <option value="SELF_SERVICE">O próprio site, automático (o cliente pede sozinho)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="refundDeadlineHours">
              Prazo para pedir
            </label>
            <select id="refundDeadlineHours" name="refundDeadlineHours" className="input" defaultValue={deadline}>
              {deadlineOptions.map(([h, label]) => (
                <option key={h} value={h}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="hint">
          Você sempre pode reembolsar qualquer pedido pelo painel, mesmo fora do prazo. Pelo Código de Defesa do Consumidor, compras online podem ser
          canceladas em até 7 dias da compra, então evite prazos que impeçam isso.
        </p>
      </Section>

      <Section title="Taxa de serviço">
        <select name="feePayer" className="input" defaultValue={event?.feePayer ?? "BUYER"} aria-label="Quem paga a taxa de serviço">
          <option value="BUYER">O comprador paga (somada ao valor do ingresso)</option>
          <option value="PRODUCER">Eu pago (descontada do meu repasse)</option>
        </select>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <SubmitButton className="btn-primary w-full sm:w-auto">{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
