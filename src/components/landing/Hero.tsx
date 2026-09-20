"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-white">
      {/* Glowing Ambient Backgrounds */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] md:w-[600px] md:h-[600px] bg-[#FF5023] rounded-full blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500 rounded-full blur-[150px] opacity-10 pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-50 border border-stone-200 mb-8 backdrop-blur-md"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono text-stone-600 font-medium">
            Cryptographically Audited Philanthropy
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter text-stone-900 mb-6 uppercase font-bebas leading-[0.85]"
        >
          Zero Trust. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5023] to-amber-500">
            Absolute Impact.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-sm md:text-lg text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
        >
          FundTrace replaces blind faith with deterministic code. Donations remain locked in escrow until democratic consensus and third-party auditors cryptographically verify spending milestones.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/campaigns">
            <Button size="lg" className="h-14 px-8 text-base bg-[#FF5023] hover:bg-[#FF5023]/90 text-white rounded-full font-bold shadow-[0_0_40px_-10px_#FF5023]">
              Explore Campaigns
            </Button>
          </Link>
          <Link href="/create">
            <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-full bg-white border-stone-200 text-stone-900 hover:bg-stone-50 hover:text-stone-900 backdrop-blur-sm">
              Deploy Campaign <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Floating UI Elements (Glassmorphism Mockups) */}
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.8, type: "spring", stiffness: 50 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 w-[90%] md:w-[800px] h-[300px] bg-white/70 border border-stone-200 rounded-t-3xl backdrop-blur-2xl shadow-2xl p-6 hidden md:block"
      >
        <div className="flex items-center gap-2 mb-4 border-b border-stone-200 pb-4">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
        </div>
        <div className="grid grid-cols-3 gap-6 opacity-70">
          <div className="space-y-3">
            <div className="h-4 w-24 bg-stone-300 rounded" />
            <div className="h-8 w-full bg-stone-100 rounded-lg" />
            <div className="h-8 w-3/4 bg-stone-100 rounded-lg" />
          </div>
          <div className="col-span-2 space-y-4">
             <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                <span className="text-emerald-400 font-mono text-xs">Milestone Approved</span>
                <span className="text-emerald-400 font-mono text-xs font-bold">1.2 ETH Released</span>
             </div>
             <div className="h-12 w-full bg-stone-50 rounded-lg border border-stone-200" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
