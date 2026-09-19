import type { Metadata } from "next";
import "./globals.css";

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
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
