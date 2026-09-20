"use client";

import React, { useState, useEffect } from "react";

interface IntroLoaderProps {
  onComplete?: () => void;
}

const LETTERS = [
  { char: "F", color: "text-white", delay: "0.06s" },
  { char: "U", color: "text-white", delay: "0.13s" },
  { char: "N", color: "text-white", delay: "0.20s" },
  { char: "D", color: "text-white", delay: "0.27s" },
  { char: "T", color: "text-[#FF5023]", delay: "0.34s" },
  { char: "R", color: "text-[#FF5023]", delay: "0.41s" },
  { char: "A", color: "text-[#FF5023]", delay: "0.48s" },
  { char: "C", color: "text-[#FF5023]", delay: "0.55s" },
  { char: "E", color: "text-[#FF5023]", delay: "0.62s" },
];

export default function IntroLoader({ onComplete }: IntroLoaderProps) {
  const [isLifting, setIsLifting] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);

  useEffect(() => {
    // Once all letters finish dropping (~0.8s) + brief pause (~0.6s) -> lift away
    const liftTimer = setTimeout(() => {
      setIsLifting(true);
    }, 1400);

    const removeTimer = setTimeout(() => {
      setIsRemoved(true);
      if (onComplete) onComplete();
    }, 2100);

    return () => {
      clearTimeout(liftTimer);
      clearTimeout(removeTimer);
    };
  }, [onComplete]);

  function handleSkip() {
    setIsLifting(true);
    setTimeout(() => {
      setIsRemoved(true);
      if (onComplete) onComplete();
    }, 350);
  }

  if (isRemoved) return null;

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[9999] bg-[#121411] text-white flex flex-col items-center justify-center select-none cursor-pointer transition-all duration-700 ease-in-out ${
        isLifting ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      }`}
      title="Click anywhere to skip"
    >
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-[#FF5023]/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        
        {/* Kinetic Letter Drop Row */}
        <div className="flex items-center justify-center overflow-hidden py-4">
          {LETTERS.map((item, index) => (
            <span
              key={index}
              className={`inline-block font-black font-display text-6xl sm:text-8xl md:text-9xl tracking-tight leading-none animate-letter-drop ${item.color} drop-shadow-2xl`}
              style={{
                animationDelay: item.delay,
              }}
            >
              {item.char}
            </span>
          ))}

          {/* Clean Orange Dot that lands with the last letter */}
          <span
            className="inline-block w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-[#FF5023] ml-1 sm:ml-2 self-end mb-2 sm:mb-4 animate-letter-drop shadow-lg shadow-[#FF5023]/50"
            style={{ animationDelay: "0.70s" }}
          />
        </div>

        {/* Minimal Subtitle Tagline */}
        <div
          className="mt-4 flex items-center gap-2.5 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.85s", animationFillMode: "forwards" }}
        >
          <span className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.25em] uppercase text-stone-400">
            On-Chain Transparent Crowdfunding
          </span>
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FF5023] text-white">
            2026
          </span>
        </div>

      </div>
    </div>
  );
}
