import { AreaHeader } from "@/components/AreaHeader";
import { env } from "@/lib/env";

export const metadata = { robots: { index: false } };

export default function ProducerAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AreaHeader label="Área do produtor" home="/produtor/login">
        <a href={env.appUrl} className="px-3 py-2 text-slate-600 hover:text-slate-900">
          Ir para o site
        </a>
      </AreaHeader>
      <main className="container-page py-10">{children}</main>
    </div>
  );
}
