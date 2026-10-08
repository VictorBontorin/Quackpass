import type { Metadata } from "next";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: { default: `Administração | ${env.companyName}`, template: `%s | Admin` }, robots: { index: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
