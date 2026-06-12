import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdScripts } from "@/components/ads/AdScripts";
import { ConsentBanner } from "@/components/ads/ConsentBanner";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Busted Board",
  description: "Find something great to watch based on your taste and streaming services.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster theme="dark" position="top-center" />
        <ConsentBanner />
        <AdScripts />
      </body>
    </html>
  );
}
