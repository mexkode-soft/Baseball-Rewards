import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/PwaRegister";

import "./globals.css";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  title: "Home Run Rewards",

  description:
    "Campañas interactivas que convierten clientes en fans.",

  icons: {
    icon: [
      {
        url: "/icon-192.png",
        type: "image/png",
      },
    ],

    shortcut: "/icon-192.png",

    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="es">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}