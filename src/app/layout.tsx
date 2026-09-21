import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";

const fontSans = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  // title: "FundTrace - Transparent Crowdfunding & Fund Ledger",
  title: "researching about 3d",
  description: "A blockchain fund-accountability platform tracking donations from verified campaigns to proof of expenditure.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", fontSans.variable)}>
      <body className="bg-[#F7F4ED] text-[#141414] min-h-screen antialiased selection:bg-[#FF5023] selection:text-white">
        <WalletProvider>
          <Navbar />
          {children}
          <Toaster position="top-center" richColors />
        </WalletProvider>
      </body>
    </html>
  );
}
