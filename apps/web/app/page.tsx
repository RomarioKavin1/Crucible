import { LandingHero } from "@/components/LandingHero";
import { FeaturedScenarios } from "@/components/FeaturedScenarios";
import { RecentRunsFeed } from "@/components/RecentRunsFeed";
import { listScenarios } from "@/lib/scenarios";

export const revalidate = 300;

export default async function HomePage() {
  const all = await listScenarios();
  return (
    <div className="space-y-10">
      <LandingHero scenarioCount={all.length} />
      <FeaturedScenarios />
      <RecentRunsFeed />
    </div>
  );
}
