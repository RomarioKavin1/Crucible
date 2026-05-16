"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { NPM_BENCH_URL } from "@/lib/links";
import { OgMark } from "./OgMark";
import { PRESS_BUTTON, EASE_OUT, DURATION } from "@/lib/motion";

export function LandingHero({ scenarioCount }: { scenarioCount: number }) {
  return (
    <section className="relative pt-12 pb-16 md:pt-20 md:pb-24">
      {/* 0G micro-credit, top-left */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.dropdown, ease: EASE_OUT }}
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#1c2538] bg-[#0f1623] text-[11px] text-[#aab2c5] mb-7"
      >
        <OgMark size={11} className="text-[#22d3ee]" />
        <span>Verifiable benchmarks on</span>
        <span className="font-medium text-[#e6e9f0]">0G</span>
      </motion.div>

      {/* Headline — slightly tighter, single confident line */}
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.modal, ease: EASE_OUT, delay: 0.05 }}
        className="text-[44px] md:text-[60px] font-semibold tracking-[-0.02em] text-[#e6e9f0] leading-[1.02] max-w-3xl"
      >
        Battle-test your AI trading agent against real market crises.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.modal, ease: EASE_OUT, delay: 0.1 }}
        className="mt-5 text-[15px] md:text-[16px] text-[#aab2c5] max-w-2xl leading-[1.6]"
      >
        Replay LUNA&rsquo;s collapse, the BTC flash crash, the ETH ETF reaction. One{" "}
        <code className="font-mono text-[#22d3ee] text-[14px]">npx</code> command, any LLM provider, every score
        signed by your agent&rsquo;s wallet and recorded on 0G Galileo. No self-reporting, no repo to clone.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.modal, ease: EASE_OUT, delay: 0.15 }}
        className="mt-7 flex flex-wrap items-center gap-3"
      >
        <motion.div {...PRESS_BUTTON}>
          <Link
            href="/scenarios"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#22d3ee] [@media(hover:hover)and(pointer:fine)]:hover:bg-[#67e8f9] text-[#0a0e17] px-5 py-2.5 rounded-lg transition-colors"
          >
            Browse {scenarioCount} scenarios <span aria-hidden>→</span>
          </Link>
        </motion.div>
        <motion.div {...PRESS_BUTTON}>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#0f1623] border border-[#1c2538] text-[#e6e9f0] [@media(hover:hover)and(pointer:fine)]:hover:border-[#232d44] px-5 py-2.5 rounded-lg transition-colors"
          >
            Read the docs <span aria-hidden>→</span>
          </Link>
        </motion.div>
        <Link
          href={NPM_BENCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6b7691] hover:text-[#22d3ee] px-2 py-2.5 transition-colors"
        >
          <code className="font-mono">npx crucible-bench</code>
          <span aria-hidden className="text-[#3d4a6e]">↗</span>
        </Link>
      </motion.div>
    </section>
  );
}
