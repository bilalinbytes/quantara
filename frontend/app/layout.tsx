import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { CommandPalette } from "../components/CommandPalette";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quantara — AI Financial Intelligence Platform",
  description: "Institutional-grade AI financial research: filings, earnings, news, and multi-agent investment analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full antialiased dark ${inter.variable}`}>
      <body className="min-h-full flex flex-col bg-[#080d18] text-slate-200 font-sans">
        <Providers>
          {children}
          <CommandPalette />
        </Providers>
      </body>
    </html>
  );
}
