import { LandingHero } from "@/components/LandingHero";
import { FeaturedScenarios } from "@/components/FeaturedScenarios";
import { CliOnboardingCard } from "@/components/CliOnboardingCard";
import { RecentRunsFeed } from "@/components/RecentRunsFeed";
import { listScenarios } from "@/lib/scenarios";

export const revalidate = 300;

export default async function HomePage() {
  const all = await listScenarios();

  return (
    // Single grid from the very top so the on-chain feed sits alongside the
    // hero — no wasted horizontal space above the fold.
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 lg:gap-8 xl:gap-12">
      <div className="space-y-14 min-w-0">
        <LandingHero scenarioCount={all.length} />
        <FeaturedScenarios />
        {/* <CliOnboardingCard /> */}
      </div>
      <RecentRunsFeed />
    </div>
  );
}
