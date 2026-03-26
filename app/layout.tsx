import type { Metadata, Viewport } from "next";
export const dynamic = 'force-dynamic'

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { InstallPrompt } from "@/components/InstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fuel Different — Performance Nutrition for Athletes",
  description: "AI-powered nutrition tracking and coaching platform for student athletes. Track meals, monitor wellness, manage supplements, and optimize performance with personalized macro recommendations.",
  keywords: ["nutrition tracking", "athlete nutrition", "sports nutrition", "meal tracking", "macro calculator", "student athlete"],
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
      { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-icon-192-PocscrgojEbdJSVNv8Eyxf.png", sizes: "192x192", type: "image/png" },
      { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-icon-512-JQoDE7gaomSKzeZcwhxNCY.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-icon-192-PocscrgojEbdJSVNv8Eyxf.png", sizes: "192x192" },
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
        <ServiceWorkerRegistration />
        <InstallPrompt />
      </body>
    </html>
  );
}
