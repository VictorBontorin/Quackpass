import { Fragment, type ReactNode } from "react";

/**
 * Formatação simples e segura para os textos do produtor (sem HTML):
 * **negrito**, *itálico*, [link](https://...), listas com "- " e parágrafos por linha em branco.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[1]) out.push(<strong key={k}>{m[1]}</strong>);
    else if (m[2]) out.push(<em key={k}>{m[2]}</em>);
    else
      out.push(
        <a key={k} href={m[4]} target="_blank" rel="noopener noreferrer nofollow" className="underline">
          {m[3]}
        </a>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const paragraphs = text.replace(/\r/g, "").split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div className={`space-y-3 leading-relaxed ${className}`}>
      {paragraphs.map((p, pi) => {
        const lines = p.split("\n");
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <ul key={pi} className="list-disc space-y-1 pl-5">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*[-•]\s+/, ""), `${pi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={pi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, `${pi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
