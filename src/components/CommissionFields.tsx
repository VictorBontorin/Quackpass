import type { DiscountType } from "@prisma/client";

/** Campos de comissão: valor + tipo (% da venda ou R$ por ingresso). */
export function CommissionFields({
  type,
  value,
  placeholder = "Ex.: 10",
  label = "Comissão",
}: {
  type?: DiscountType | null;
  value?: number | null;
  placeholder?: string;
  label?: string;
}) {
  const display = value == null || value === 0 ? "" : type === "FIXED" ? (value / 100).toFixed(2).replace(".", ",") : String(value / 100).replace(".", ",");
  return (
    <div>
      <label className="label">{label}</label>
      <div className="grid grid-cols-[1fr_130px] gap-2">
        <input name="commissionValue" className="input" placeholder={placeholder} inputMode="decimal" defaultValue={display} />
        <select name="commissionType" className="input" defaultValue={type ?? "PERCENT"}>
          <option value="PERCENT">% da venda</option>
          <option value="FIXED">R$ por ingresso</option>
        </select>
      </div>
    </div>
  );
}
