import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hüsniye Özdilek Ticaret M.T.A.L. - Arıza Takip Sistemi (ATSİS)",
  description: "Hüsniye Özdilek Ticaret M.T.A.L. Arıza Takip Sistemi (ATSİS)",
  manifest: "/manifest.json",
  themeColor: "#4338CA",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ATSİS"
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
