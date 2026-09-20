"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useWallet } from "@/context/WalletContext";

export default function HomePage() {
  const { wallet } = useWallet();

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-[#FF5023] selection:text-white antialiased">
      {/* 
        The Navbar currently defaults to a light theme in its source, 
        but we wrap it here in a div that overrides some styles if needed, 
        or we just let the Navbar handle its own styling.
      */}
      <div className="sticky top-0 z-50">
        <Navbar />
      </div>

      <main>
        <Hero />
        <Features />

        {/* Minimal FAQ Section */}
        <section className="py-24 bg-[#09090b] relative z-10 border-t border-white/5">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-black font-bebas tracking-wide uppercase text-white mb-8 text-center">
              Protocol FAQ
            </h2>
            <Accordion className="w-full">
              <AccordionItem value="item-1" className="border-white/10">
                <AccordionTrigger className="text-left font-bold text-stone-200 hover:text-white">
                  How does democratic consensus work?
                </AccordionTrigger>
                <AccordionContent className="text-stone-400 leading-relaxed">
                  When a campaign creator needs to spend funds (e.g. to buy supplies), they submit a "Spending Request". 
                  The smart contract calculates the total voting power of all donors. The funds remain locked in escrow 
                  until donors representing &gt;50% of the capital vote to approve the request.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className="border-white/10">
                <AccordionTrigger className="text-left font-bold text-stone-200 hover:text-white">
                  What is the "Dormancy Refund"?
                </AccordionTrigger>
                <AccordionContent className="text-stone-400 leading-relaxed">
                  If a campaign becomes inactive for 30 days without filing any spending requests or hitting milestones, 
                  the smart contract triggers a Dormancy timeout. Donors can then freely reclaim their remaining unspent funds directly from the smart contract.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="border-white/10">
                <AccordionTrigger className="text-left font-bold text-stone-200 hover:text-white">
                  Who verifies the campaigns?
                </AccordionTrigger>
                <AccordionContent className="text-stone-400 leading-relaxed">
                  Campaigns cannot audit themselves. A third-party institutional verifier must be designated upon creation. 
                  This verifier reviews off-chain licenses, KYC, and permits, then calls a specialized contract function to allow funding to open.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-stone-500 text-xs font-mono">
        <p>© 2026 FundTrace Protocol. Built on Ethereum.</p>
      </footer>
    </div>
  );
}
