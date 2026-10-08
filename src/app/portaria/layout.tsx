import type { Metadata, Viewport } from "next";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: { default: `Portaria | ${env.companyName}`, template: `%s | Portaria` }, robots: { index: false } };
export const viewport: Viewport = { themeColor: "#020617", width: "device-width", initialScale: 1, maximumScale: 1 };

export default function PortariaLayout({ children }: { children: React.ReactNode }) {
  return <div className="theme-dark min-h-screen">{children}</div>;
}
