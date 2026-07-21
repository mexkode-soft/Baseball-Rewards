import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Run Rewards",
  description: "Campañas, experiencias y recompensas para fans del béisbol.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
