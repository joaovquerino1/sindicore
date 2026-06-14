import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: {
    default: "SindiCORE — Gestão condominial sob medida",
    template: "%s | SindiCORE",
  },
  description:
    "Plataforma completa de gestão condominial: moradores, ocorrências, finanças, assembleias com videoconferência e controle de visitantes em tempo real. Um produto LAMPY.",
  keywords: [
    "condomínio", "síndico", "gestão condominial", "portaria",
    "assembleia online", "controle financeiro condomínio",
  ],
  authors: [{ name: "LAMPY" }],
  appleWebApp: {
    capable: true,
    title: "SindiCORE",
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
    { media: "(prefers-color-scheme: light)", color: "#f7f5fc" },
    { media: "(prefers-color-scheme: dark)",  color: "#14111f" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`h-full ${inter.variable} ${sora.variable}`} suppressHydrationWarning>
      <body
        className="h-full antialiased font-sans bg-background text-foreground"
        style={{ overscrollBehavior: "none" }}
      >
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast: "shadow-lg border border-border",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
