import type { Event } from "@prisma/client";
import { ActionForm, type ActionState } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { toLocalInput } from "@/lib/format";

export function EventForm({
  action,
  event,
  submitLabel,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  event?: Event;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="card grid gap-4">
      <div>
        <label className="label">Nome do evento</label>
        <input name="title" className="input" required defaultValue={event?.title} placeholder="Ex.: Sexta Sertaneja - 4 anos" />
      </div>
      <div>
        <label className="label">Descrição</label>
        <textarea name="description" className="input min-h-32" defaultValue={event?.description} placeholder="Atrações, regras, horários..." />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Início</label>
          <input name="startsAt" type="datetime-local" className="input" required defaultValue={toLocalInput(event?.startsAt)} />
        </div>
        <div>
          <label className="label">Término (opcional)</label>
          <input name="endsAt" type="datetime-local" className="input" defaultValue={toLocalInput(event?.endsAt)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Local</label>
          <input name="venueName" className="input" required defaultValue={event?.venueName} placeholder="Nome da casa" />
        </div>
        <div>
          <label className="label">Endereço</label>
          <input name="address" className="input" required defaultValue={event?.address} />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_90px] gap-4">
        <div>
          <label className="label">Cidade</label>
          <input name="city" className="input" required defaultValue={event?.city} />
        </div>
        <div>
          <label className="label">UF</label>
          <input name="state" className="input uppercase" required maxLength={2} defaultValue={event?.state} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <div>
          <label className="label">URL do banner (imagem)</label>
          <input name="bannerUrl" type="url" className="input" defaultValue={event?.bannerUrl ?? ""} placeholder="https://..." />
        </div>
        <div>
          <label className="label">Idade mínima</label>
          <input name="minAge" type="number" min={0} max={21} className="input" defaultValue={event?.minAge ?? 18} />
        </div>
      </div>
      <div>
        <label className="label">Quem paga a taxa de serviço?</label>
        <select name="feePayer" className="input" defaultValue={event?.feePayer ?? "BUYER"}>
          <option value="BUYER">O comprador (somada ao valor do ingresso)</option>
          <option value="PRODUCER">Eu, produtor (descontada do meu repasse)</option>
        </select>
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
