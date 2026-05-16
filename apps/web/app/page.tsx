import { LandingHero } from "@/components/LandingHero";
import { FeaturedScenarios } from "@/components/FeaturedScenarios";
import { CliOnboardingCard } from "@/components/CliOnboardingCard";
import { RecentRunsFeed } from "@/components/RecentRunsFeed";
import { listScenarios } from "@/lib/scenarios";

export const revalidate = 300;

export default async function HomePage() {
  const all = await listScenarios();

  return (
    <div className="space-y-12">
      {/* Hero — full width */}
      <LandingHero scenarioCount={all.length} />

      {/* 2-column: main rail (scenarios + onboarding) + sticky recent runs */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-8 lg:gap-10">
        <div className="space-y-12 min-w-0">
          <FeaturedScenarios />
          <CliOnboardingCard />
        </div>
        <RecentRunsFeed />
      </div>
    </div>
  );
}
