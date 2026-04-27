import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "SindiCore — Gestão Condominial Inteligente",
    template: "%s | SindiCore",
  },
  description:
    "Plataforma completa de gestão condominial: moradores, ocorrências, finanças, assembleias com videoconferência e controle de visitantes em tempo real.",
  keywords: [
    "condomínio", "síndico", "gestão condominial", "portaria",
    "assembleia online", "controle financeiro condomínio",
  ],
  authors: [{ name: "SindiCore" }],
  appleWebApp: {
    capable: true,
    title: "SindiCore",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)",  color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`h-full ${inter.variable}`}>
      <body
        className="h-full antialiased font-sans"
        style={{ overscrollBehavior: "none" }}
      >
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          theme="light"
          toastOptions={{
            classNames: {
              toast: "shadow-lg border border-slate-200",
            },
          }}
        />
      </body>
    </html>
  );
}
