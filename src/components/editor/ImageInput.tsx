"use client";

import { useRef, useState } from "react";
import { uploadImage } from "./upload";

/** Campo de imagem com upload. Guarda a URL em um input escondido (name) ou devolve via onChange. */
export function ImageInput({
  name,
  value: initial,
  onChange,
  aspect = "aspect-[21/8]",
  label = "Enviar imagem",
}: {
  name?: string;
  value?: string | null;
  onChange?: (url: string) => void;
  aspect?: string;
  label?: string;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const url = await uploadImage(file);
      setValue(url);
      onChange?.(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no envio");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`relative grid w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 hover:border-brand-500 ${aspect}`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span>{busy ? "Enviando..." : `${label} (JPG, PNG ou WEBP, até 5 MB)`}</span>
        )}
        {value && busy && <span className="absolute inset-0 grid place-items-center bg-white/70">Enviando...</span>}
      </button>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <div className="flex gap-2">
        {value && (
          <>
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => ref.current?.click()}>
              Trocar
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              onClick={() => {
                setValue("");
                onChange?.("");
              }}
            >
              Remover
            </button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
