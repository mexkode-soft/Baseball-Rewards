import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Home Run Rewards", description: "Campañas interactivas que convierten clientes en fans." };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
