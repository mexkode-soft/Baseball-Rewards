import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Home Run Rewards",

  description:
    "Campañas interactivas que convierten clientes en fans.",

  icons: {
    icon: [
      {
        url: "/images/logo-home-run.png",
        type: "image/png",
      },
    ],

    shortcut:
      "/images/logo-home-run.png",

    apple:
      "/images/logo-home-run.png",
  },
};

export const viewport: Viewport = {
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
        {children}
      </body>
    </html>
  );
}