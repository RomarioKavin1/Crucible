"use client";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, LayoutGroup } from "motion/react";
import { CopyableCommand } from "@crucible/ui-kit";
import { OgMark } from "./OgMark";
import { PRESS_BUTTON, EASE_OUT, DURATION } from "@/lib/motion";

type ProviderId = "anthropic" | "openai" | "google" | "openrouter" | "ollama";

const PROVIDERS: {
  id: ProviderId; label: string; envKey: string; model: string; extra?: string;
}[] = [
  { id: "anthropic",  label: "Anthropic",          envKey: "ANTHROPIC_API_KEY",              model: "claude-haiku-4-5" },
  { id: "openai",     label: "OpenAI",             envKey: "OPENAI_API_KEY",                 model: "gpt-4o-mini" },
  { id: "google",     label: "Google (Gemini)",    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",   model: "gemini-2.0-flash" },
  { id: "openrouter", label: "OpenRouter",         envKey: "LLM_API_KEY",                    model: "meta-llama/llama-3.3-70b-instruct" },
  { id: "ollama",     label: "Ollama (local)",     envKey: "# no key — local",               model: "qwen2.5:32b",                      extra: " --llm-base-url http://localhost:11434/v1" },
];

export function CliOnboardingCard() {
  const [providerId, setProviderId] = useState<ProviderId>("anthropic");
  const provider = PROVIDERS.find((p) => p.id === providerId)!;

  const exports = `export AGENT_PRIVATE_KEY=0x...        # from step 2
export AGENT_TOKEN_ID=42                # from step 1
${provider.envKey === "# no key — local" ? provider.envKey : `export ${provider.envKey}=sk-...`}`;

  const npxCommand = `npx crucible-bench \\
  --scenario fakeout-pump \\
  --provider ${provider.id} \\
  --model ${provider.model}${provider.extra ?? ""} \\
  --watch`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: DURATION.modal, ease: EASE_OUT }}
      className="space-y-4"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-[18px] font-semibold text-[#e6e9f0]">Run your first benchmark</h2>
        <Link href="/docs" className="text-[12px] text-[#22d3ee] hover:underline">
          Read the docs →
        </Link>
      </div>

      <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
        {/* Step 1 — Mint */}
        <Step
          n={1}
          title="Mint an AgentINFT"
          subtitle="Your agent's on-chain identity. One transaction, ~10s."
          primaryCTA={
            <motion.div {...PRESS_BUTTON}>
              <Link
                href="/my-agents"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium bg-[#22d3ee] [@media(hover:hover)and(pointer:fine)]:hover:bg-[#67e8f9] text-[#0a0e17] px-4 py-2 rounded-lg transition-colors"
              >
                Mint your agent <span aria-hidden>→</span>
              </Link>
            </motion.div>
          }
        >
          <p className="text-[12px] text-[#aab2c5] leading-relaxed">
            ERC-7857 INFT on{" "}
            <span className="inline-flex items-center gap-1 align-middle">
              <OgMark size={11} /> <span className="text-[#aab2c5]">0G Galileo</span>
            </span>
            . You'll get a tokenId you reference everywhere else.
          </p>
        </Step>

        {/* Step 2 — Generate credentials */}
        <Step
          n={2}
          title="Generate runner credentials"
          subtitle="A delegated hot key for your terminal — your owner key stays in the wallet."
        >
          <p className="text-[12px] text-[#aab2c5] leading-relaxed">
            On your agent's page, click{" "}
            <em className="text-[#e6e9f0] not-italic font-medium">Generate Runner Credentials</em>. You'll
            get a private key + tokenId to paste below.
          </p>
        </Step>

        {/* Step 3 — Run */}
        <Step n={3} title="Pick a provider and run" subtitle="Any LLM provider works via a flag — Anthropic, OpenAI, Google, OpenRouter, Ollama.">
          <div className="space-y-3">
            <LayoutGroup id="cli-providers">
              <div className="flex flex-wrap gap-1.5">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProviderId(p.id)}
                    className={`relative px-2.5 py-1 rounded-md text-[11.5px] font-medium border transition-colors ${
                      p.id === providerId
                        ? "border-[#22d3ee55] text-[#22d3ee] bg-[#22d3ee0a]"
                        : "border-[#1c2538] text-[#6b7691] [@media(hover:hover)and(pointer:fine)]:hover:text-[#aab2c5] [@media(hover:hover)and(pointer:fine)]:hover:border-[#232d44]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </LayoutGroup>

            <AnimatePresence mode="wait">
              <motion.div
                key={providerId}
                initial={{ opacity: 0, filter: "blur(2px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(2px)" }}
                transition={{ duration: DURATION.dropdown, ease: EASE_OUT }}
                className="space-y-2"
              >
                <CopyableCommand command={exports} />
                <CopyableCommand command={npxCommand} />
              </motion.div>
            </AnimatePresence>
          </div>
        </Step>
      </div>
    </motion.section>
  );
}

function Step({
  n, title, subtitle, children, primaryCTA,
}: {
  n: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  primaryCTA?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 px-5 py-5 border-b border-[#1c2538] last:border-b-0">
      {/* Number column */}
      <div className="flex flex-col items-center shrink-0">
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-[#22d3ee15] border border-[#22d3ee44] text-[12px] font-mono font-bold text-[#22d3ee]">
          {n}
        </span>
        <span className="flex-1 w-px bg-[#1c2538] mt-2 last:hidden" aria-hidden />
      </div>
      {/* Body */}
      <div className="flex-1 min-w-0 space-y-2.5 pt-0.5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-[13.5px] font-semibold text-[#e6e9f0] leading-snug">{title}</h3>
            {subtitle && <p className="text-[11.5px] text-[#6b7691] mt-0.5 leading-snug">{subtitle}</p>}
          </div>
          {primaryCTA}
        </div>
        {children}
      </div>
    </div>
  );
}
