import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";

export const metadata: Metadata = {
  title: "FundTrace - Transparent Crowdfunding & Fund Ledger",
  description: "A blockchain fund-accountability platform tracking donations from verified campaigns to proof of expenditure.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F7F4ED] text-[#141414] min-h-screen antialiased selection:bg-[#FF5023] selection:text-white">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
