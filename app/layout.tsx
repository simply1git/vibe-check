import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VibeCheck - The Friendship Soul Test",
  description: "Discover the soul of your friend group. No login required.",
  openGraph: {
    title: "VibeCheck - The Friendship Soul Test",
    description: "Discover the soul of your friend group. No login required.",
    type: "website",
    locale: "en_US",
    siteName: "VibeCheck",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "VibeCheck - The Friendship Soul Test",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeCheck",
    description: "Discover the soul of your friend group.",
    images: ["/api/og"],
  },
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
