"use client";

import React from "react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#141414] selection:bg-[#FF5023] selection:text-white flex flex-col justify-between">
      <main className="max-w-4xl mx-auto px-6 sm:px-12 py-16 sm:py-24 w-full">
        {/* Header Badge & Title */}
        <div className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5023]/10 border border-[#FF5023]/20 text-[#FF5023] text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#FF5023] animate-pulse" />
            Transparency & Governance
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight font-display text-stone-900">
            Privacy Policy
          </h1>
          <p className="text-stone-600 text-sm sm:text-base font-medium max-w-2xl">
            Last updated: September 2026. This policy outlines how data is handled across the FundTrace decentralized application, smart contracts, and off-chain storage layers.
          </p>
        </div>

        {/* Policy Content Cards */}
        <div className="space-y-8 text-stone-800 leading-relaxed text-sm sm:text-base">

          {/* Section 1 */}
          <section className="bg-white/80 backdrop-blur-sm border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                01
              </span>
              Public Blockchain & Ledger Immutability
            </h2>
            <p className="text-stone-600 mb-4">
              FundTrace operates on Ethereum Virtual Machine (EVM) compatible blockchains. By design, any interaction sent to the FundTrace smart contracts becomes a permanent, public part of the blockchain ledger.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-600 text-sm">
              <li><strong>Public Wallet Addresses:</strong> Addresses of campaign creators, institutional verifiers, donors, and spending recipients are publicly viewable.</li>
              <li><strong>Financial Transactions:</strong> Contribution amounts, timestamps, voting weight, approval tallies, and fund releases are immutable on-chain records.</li>
              <li><strong>Cryptographic Hashes:</strong> Keccak-256 fingerprints of campaign metadata, vendor quotes, and expenditure receipts are recorded publicly on-chain.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="bg-white/80 backdrop-blur-sm border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                02
              </span>
              Non-Custodial Data & Authentication
            </h2>
            <p className="text-stone-600">
              FundTrace is entirely non-custodial. We <strong>never</strong> collect, store, or have access to your private keys, seed phrases, or passwords. Authentication occurs strictly via client-side Web3 wallet signatures (e.g., MetaMask or pre-funded local demo accounts). You maintain full control over your cryptographic assets at all times.
            </p>
          </section>

          {/* Section 3 */}
          <section className="bg-white/80 backdrop-blur-sm border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                03
              </span>
              Off-Chain Content & Document Storage
            </h2>
            <p className="text-stone-600 mb-4">
              To keep gas costs low and enable rich storytelling, supporting media and documentation are stored in off-chain database and storage layers (Supabase):
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-600 text-sm">
              <li><strong>Campaign Information:</strong> Titles, descriptions, category tags, and cover images are stored off-chain and verified against on-chain metadata hashes.</li>
              <li><strong>Proof of Expenditure Documents:</strong> Original vendor quotation PDFs and post-release receipts uploaded by creators are stored in raw byte format for cryptographic hash verification.</li>
              <li><strong>Client-Side Verification:</strong> Anyone can inspect and verify document integrity by dragging and dropping a file into the browser, which computes the Keccak-256 hash locally without modifying the file.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-white/80 backdrop-blur-sm border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                04
              </span>
              Analytics & Third-Party Trackers
            </h2>
            <p className="text-stone-600">
              FundTrace prioritizes privacy and transparency. We do <strong>not</strong> use invasive third-party ad networks, tracking cookies, or sell personal data to data brokers. The public audit ledger can be freely queried and verified without creating an account or logging in.
            </p>
          </section>
        </div>

        {/* Back Link */}
        <div className="mt-12 pt-8 border-t border-stone-200 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-[#FF5023] transition-colors"
          >
            â† Back to Home
          </Link>
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white px-5 py-2.5 rounded-full hover:bg-stone-800 transition-colors"
          >
            Explore Campaigns
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#161813] text-stone-400 py-10 px-6 sm:px-12 border-t border-stone-800 text-xs">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>Copyright &copy; 2026 FundTrace. All Rights Reserved. Built for Versathon 2.0.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/campaigns" className="hover:text-white transition-colors">Campaigns</Link>
            <Link href="/privacy" className="text-white font-bold transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
