import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SindiCore - Gestão Condominial",
  description: "Sistema completo de gestão condominial",
  // PWA / iOS home-screen app metadata
  appleWebApp: {
    capable: true,
    title: "SindiCore",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  // Prevents double-tap zoom and ensures the layout fills the entire screen
  // including the notch / Dynamic Island / home indicator areas
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",   // ← key for iPhone notch / Dynamic Island
  themeColor: "#1e293b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        {/* Capacitor / WKWebView live-server connection */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={`${inter.className} h-full antialiased`}
        // Prevent iOS rubber-band scroll on the root — each scroll
        // container manages its own overscroll behaviour
        style={{ overscrollBehavior: "none" }}
      >
        {children}
      </body>
    </html>
  );
}
