import React from "react";
import { motion } from "framer-motion";
import { Network, Fingerprint, Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Features() {
  const features = [
    {
      title: "Consensus Escrow",
      description: "Funds aren't released immediately. Donors review AI audits and sanction milestone spending requests before smart contracts unlock capital.",
      icon: <Coins className="w-6 h-6 text-[#FF5023]" />,
    },
    {
      title: "Immutable Audits",
      description: "Every campaign story, location, and expense receipt is hashed via Keccak-256 and anchored permanently on the FundTrace Network.",
      icon: <Fingerprint className="w-6 h-6 text-emerald-400" />,
    },
    {
      title: "Verifier Gates",
      description: "Zero self-audits. Designated institutional verifiers must sign off on campaign credentials before public funding can even begin.",
      icon: <Network className="w-6 h-6 text-amber-400" />,
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <section className="py-24 bg-white relative z-10 border-t border-stone-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black font-bebas tracking-wide uppercase text-stone-900 mb-4">
            The Trust Engine
          </h2>
          <p className="text-stone-600 text-sm md:text-base max-w-2xl mx-auto">
            Traditional crowdfunding suffers from phantom disbursements. FundTrace replaces trust with cryptographic guarantees.
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {features.map((feature, i) => (
            <motion.div key={i} variants={itemVariants}>
              <Card className="bg-stone-50 border-stone-200 backdrop-blur-md hover:bg-stone-100 transition-colors h-full">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 flex items-center justify-center mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 mb-3">{feature.title}</h3>
                  <p className="text-stone-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
