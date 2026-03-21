import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AHORIA — Finanzas personales inteligentes",
  description: "Entiende tu dinero en menos de 1 minuto. Control financiero claro y simple.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
