import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { NotificationProvider } from "@/contexts/notification-context";
import PwaWrapper from "@/components/pwa/pwa-wrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Life Blossom Care & Cure Hospital – Your Health, Our Priority",
  description:
    "Your health, our priority – where care meets cure. Life Blossom Care & Cure Hospital provides world-class medical care at 20 Fatade Road, Baruwa-Ipaja, Lagos.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Life Blossom",
  },
  icons: {
    icon: "/images/hosp-logo/life-blossom-logo.png",
    apple: "/images/hosp-logo/life-blossom-logo.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0F4C81",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/images/hosp-logo/life-blossom-logo.png" />
        <link rel="icon" type="image/png" href="/images/hosp-logo/life-blossom-logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Life Blossom" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)]" suppressHydrationWarning>
        <AuthProvider>
          <NotificationProvider>
            <PwaWrapper>{children}</PwaWrapper>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
