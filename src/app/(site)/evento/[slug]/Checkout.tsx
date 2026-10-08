"use client";

import type { FeePayer } from "@prisma/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { brl } from "@/lib/format";
import { calculatePricing } from "@/lib/pricing";

export type CheckoutTicketType = {
  id: string;
  name: string;
  description: string;
  soldOut: boolean;
  batch: { id: string; name: string; priceCents: number; maxPerOrder: number } | null;
};

type Coupon = { code: string; discountType: "PERCENT" | "FIXED"; value: number; advertiserName: string | null };
type Method = "PIX" | "CREDIT_CARD" | "DEBIT_CARD";

const MAX_INSTALLMENTS = 6;

export function Checkout(props: {
  eventId: string;
  ticketTypes: CheckoutTicketType[];
  feePayer: FeePayer;
  fee: { percent: number; minCents: number };
  provider: "mock" | "pagarme";
  pagarmePublicKey: string;
  /** Pré-visualização do produtor: mostra a caixa mas não deixa comprar */
  preview?: boolean;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [step, setStep] = useState<1 | 2>(1);
  const [couponInput, setCouponInput] = useState(search.get("cupom") ?? "");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("PIX");
  const [installments, setInstallments] = useState(1);
  const [buyer, setBuyer] = useState({ name: "", email: "", emailConfirm: "", document: "", phone: "" });
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [card, setCard] = useState({ number: "", holder: "", exp: "", cvv: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function applyCoupon(code: string) {
    setCouponMsg(null);
    if (!code.trim()) return setCoupon(null);
    const res = await fetch(`/api/coupons/validate?eventId=${props.eventId}&code=${encodeURIComponent(code.trim())}`);
    const data = await res.json();
    if (res.ok) {
      setCoupon(data);
      setCouponMsg(`Cupom ${data.code} aplicado`);
    } else {
      setCoupon(null);
      setCouponMsg(data.error ?? "Cupom inválido");
    }
  }

  // Cupom vindo do link (?cupom=XYZ) é aplicado automaticamente
  useEffect(() => {
    const c = search.get("cupom");
    if (c) applyCoupon(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lines = useMemo(
    () =>
      props.ticketTypes
        .filter((t) => t.batch && (qty[t.batch.id] ?? 0) > 0)
        .map((t) => ({ batch: t.batch!, quantity: qty[t.batch!.id], type: t })),
    [qty, props.ticketTypes],
  );
  const pricing = useMemo(() => calculatePricing(lines, coupon, props.feePayer, props.fee), [lines, coupon, props.feePayer, props.fee]);
  const totalTickets = lines.reduce((s, l) => s + l.quantity, 0);
  const isFree = totalTickets > 0 && pricing.totalCents === 0;

  async function tokenizeCard(): Promise<string> {
    const [mm, yy] = card.exp.split("/").map((s) => s.trim());
    const number = card.number.replace(/\D/g, "");
    if (number.length < 13 || !mm || !yy || card.cvv.length < 3 || card.holder.length < 3) {
      throw new Error("Confira os dados do cartão");
    }
    if (props.provider === "mock") return number.endsWith("0002") ? "mock_fail" : "mock_ok";
    // O número do cartão vai direto do navegador para a Pagar.me: nunca passa pelo nosso servidor
    const res = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${props.pagarmePublicKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "card",
        card: { number, holder_name: card.holder, exp_month: Number(mm), exp_year: Number(yy.length === 2 ? `20${yy}` : yy), cvv: card.cvv },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.id) throw new Error("Cartão inválido. Confira os dados.");
    return data.id as string;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (buyer.email.trim().toLowerCase() !== buyer.emailConfirm.trim().toLowerCase()) {
      return setError("Os e-mails não conferem. É para ele que enviamos os ingressos.");
    }
    if (!ageConfirmed) return setError("Confirme que você tem 18 anos ou mais.");
    setLoading(true);
    try {
      const token = !isFree && method !== "PIX" ? await tokenizeCard() : undefined;
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: props.eventId,
          items: lines.map((l) => ({ batchId: l.batch.id, quantity: l.quantity })),
          couponCode: coupon?.code,
          buyer: { name: buyer.name, email: buyer.email, document: buyer.document, phone: buyer.phone },
          ageConfirmed,
          paymentMethod: method,
          installments: method === "CREDIT_CARD" ? installments : 1,
          card: token ? { token } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao finalizar a compra");
      if (data.authUrl) window.location.href = data.authUrl;
      else router.push(`/pedido/${data.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao finalizar a compra");
      setLoading(false);
    }
  }

  const summary = (
    <div className="space-y-1.5 border-t border-slate-200 pt-4 text-sm">
      <Row label={`Ingressos (${totalTickets})`} value={brl(pricing.subtotalCents)} />
      {pricing.discountCents > 0 && <Row label={`Desconto ${coupon?.code}`} value={`- ${brl(pricing.discountCents)}`} accent />}
      {props.feePayer === "BUYER" && pricing.feeCents > 0 && <Row label="Taxa de serviço" value={brl(pricing.feeCents)} />}
      <Row label="Total" value={brl(pricing.totalCents)} bold />
    </div>
  );

  if (step === 1) {
    return (
      <div className="card space-y-4">
        <h2 className="text-lg font-bold">Ingressos</h2>
        {props.ticketTypes.length === 0 && <p className="text-sm text-slate-500">Os ingressos ainda não foram liberados.</p>}
        {props.ticketTypes.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
            <div className="min-w-0">
              <p className="font-semibold">{t.name}</p>
              {t.batch && <p className="text-xs text-slate-500">{t.batch.name}</p>}
              {t.description && <p className="text-xs text-slate-500">{t.description}</p>}
              {t.batch ? (
                <p className="mt-1 font-bold">{t.batch.priceCents === 0 ? "Gratuito" : brl(t.batch.priceCents)}</p>
              ) : (
                <p className="mt-1 text-sm font-semibold text-slate-400">{t.soldOut ? "Esgotado" : "Em breve"}</p>
              )}
            </div>
            {t.batch && (
              <Stepper
                value={qty[t.batch.id] ?? 0}
                onChange={(v) => setQty((q) => ({ ...q, [t.batch!.id]: Math.max(0, Math.min(v, t.batch!.maxPerOrder)) }))}
              />
            )}
          </div>
        ))}

        <div>
          <label className="label" htmlFor="coupon">
            Cupom de desconto
          </label>
          <div className="flex gap-2">
            <input id="coupon" className="input uppercase placeholder:normal-case" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Opcional" />
            <button type="button" className="btn-secondary" onClick={() => applyCoupon(couponInput)}>
              Aplicar
            </button>
          </div>
          {couponMsg && <p className={`mt-1 text-xs font-medium ${coupon ? "text-emerald-700" : "text-red-700"}`}>{couponMsg}</p>}
        </div>

        {totalTickets > 0 && summary}
        <button className="btn-accent w-full py-3 text-base" disabled={totalTickets === 0 || props.preview} onClick={() => setStep(2)}>
          {props.preview ? "Pré-visualização" : "Continuar"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <button type="button" onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-900">
        ← Alterar ingressos
      </button>
      <div>
        <h2 className="text-lg font-bold">Seus dados</h2>
        <p className="text-xs text-slate-500">Os ingressos serão enviados para o e-mail informado.</p>
      </div>
      <div className="grid gap-3">
        <Field label="Nome completo" value={buyer.name} onChange={(v) => setBuyer({ ...buyer, name: v })} autoComplete="name" />
        <Field label="E-mail" type="email" value={buyer.email} onChange={(v) => setBuyer({ ...buyer, email: v })} autoComplete="email" />
        <Field label="Confirme o e-mail" type="email" value={buyer.emailConfirm} onChange={(v) => setBuyer({ ...buyer, emailConfirm: v })} autoComplete="off" onPaste={(e) => e.preventDefault()} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="CPF" value={buyer.document} onChange={(v) => setBuyer({ ...buyer, document: v })} inputMode="numeric" />
          <Field label="Celular" value={buyer.phone} onChange={(v) => setBuyer({ ...buyer, phone: v })} inputMode="tel" autoComplete="tel" />
        </div>
      </div>

      {!isFree && (
        <>
          <h2 className="pt-2 text-lg font-bold">Pagamento</h2>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Forma de pagamento">
            {(
              [
                ["PIX", "Pix"],
                ["CREDIT_CARD", "Crédito"],
                ["DEBIT_CARD", "Débito"],
              ] as const
            ).map(([m, label]) => (
              <button
                type="button"
                role="radio"
                aria-checked={method === m}
                key={m}
                onClick={() => setMethod(m)}
                className={`btn border ${method === m ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {method === "PIX" ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">O QR Code do Pix aparece na próxima tela. A confirmação é automática, em segundos.</p>
          ) : (
            <div className="grid gap-3">
              <Field label="Número do cartão" value={card.number} onChange={(v) => setCard({ ...card, number: v })} inputMode="numeric" autoComplete="cc-number" />
              <Field label="Nome impresso no cartão" value={card.holder} onChange={(v) => setCard({ ...card, holder: v })} autoComplete="cc-name" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Validade (MM/AA)" value={card.exp} onChange={(v) => setCard({ ...card, exp: v })} autoComplete="cc-exp" />
                <Field label="CVV" value={card.cvv} onChange={(v) => setCard({ ...card, cvv: v.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" autoComplete="cc-csc" />
              </div>
              {method === "CREDIT_CARD" && (
                <div>
                  <label className="label" htmlFor="installments">
                    Parcelas
                  </label>
                  <select id="installments" className="input" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                    {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}x de {brl(Math.ceil(pricing.totalCents / n))} sem juros
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {method === "DEBIT_CARD" && <p className="text-xs text-slate-500">No débito, o seu banco pede uma confirmação de segurança.</p>}
            </div>
          )}
        </>
      )}

      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} />
        <span>
          Declaro que tenho <b>18 anos ou mais</b> e que vou apresentar documento com foto na entrada.
        </span>
      </label>

      {summary}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button className="btn-accent w-full py-3 text-base" disabled={loading}>
        {loading ? "Processando..." : isFree ? "Garantir ingresso" : method === "PIX" ? "Gerar Pix" : `Pagar ${brl(pricing.totalCents)}`}
      </button>
      <p className="text-center text-xs text-slate-500">
        Ao continuar, você concorda com os{" "}
        <Link href="/termos" target="_blank" className="underline">
          Termos de uso
        </Link>{" "}
        e a{" "}
        <Link href="/politica-de-reembolso" target="_blank" className="underline">
          Política de reembolso
        </Link>
        .
      </p>
    </form>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "pt-1 text-base font-bold" : "text-slate-600"} ${accent ? "text-emerald-700" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button type="button" className="btn-secondary h-9 w-9 p-0 text-lg" onClick={() => onChange(value - 1)} aria-label="Diminuir" disabled={value === 0}>
        −
      </button>
      <span className="w-6 text-center font-semibold" aria-live="polite">
        {value}
      </span>
      <button type="button" className="btn-secondary h-9 w-9 p-0 text-lg" onClick={() => onChange(value + 1)} aria-label="Aumentar">
        +
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} className="input" required value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}
