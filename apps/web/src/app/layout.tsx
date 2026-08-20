import type { Metadata } from "next";
import { DM_Mono } from "next/font/google";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";

const foundersGrotesk = localFont({
  src: [
    {
      path: "./fonts/TestFoundersGrotesk-Regular-BF66175e972ac1c.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/TestFoundersGrotesk-Medium-BF66175e9723b7a.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/TestFoundersGrotesk-Semibold-BF66175e972c958.otf",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-founders-grotesk",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yappa",
  description: "A debate-based podcast learning platform powered by two opposing LLMs.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${foundersGrotesk.variable} ${dmMono.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
