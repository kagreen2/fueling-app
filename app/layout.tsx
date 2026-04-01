import type { Metadata, Viewport } from "next";
export const dynamic = 'force-dynamic'

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { InstallPrompt } from "@/components/InstallPrompt";
import PushNotificationManager from "@/components/PushNotificationManager";
import { ErrorReporter } from "@/components/ErrorReporter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fuel Different — Evidence-Based Nutrition Coaching",
  description: "AI-powered nutrition tracking and coaching platform for athletes and fitness enthusiasts. Personalized macros, InBody integration, smart meal tracking, and real-time coach communication.",
  keywords: ["nutrition tracking", "athlete nutrition", "sports nutrition", "meal tracking", "macro calculator", "InBody", "nutrition coaching", "fitness nutrition"],
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fuel Different",
  },
  icons: {
    icon: [
      { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-icon-192_4a157b7a.png", sizes: "192x192", type: "image/png" },
      { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-icon-512_1306ffdf.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-icon-192_4a157b7a.png", sizes: "192x192" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0F172A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <ErrorReporter />
        <ServiceWorkerRegistration />
        <InstallPrompt />
        <PushNotificationManager />
      </body>
    </html>
  );
}
