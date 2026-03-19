import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AHORIA — Ahorra ahora. Vive mejor.",
  description: "Entiende tus finanzas en menos de 1 minuto. Control total, sin complicaciones.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased"
        style={{ backgroundColor: '#070e0a', color: '#ecfdf5' }}>
        {children}
      </body>
    </html>
  );
}
