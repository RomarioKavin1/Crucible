import { LandingHero } from "@/components/LandingHero";
import { InstallStrip } from "@/components/InstallStrip";
import { FeaturedScenarios } from "@/components/FeaturedScenarios";
import { RecentRunsFeed } from "@/components/RecentRunsFeed";
import { listScenarios } from "@/lib/scenarios";

export const revalidate = 300;

export default async function HomePage() {
  const all = await listScenarios();
  return (
    <div className="space-y-12">
      <LandingHero scenarioCount={all.length} />
      <InstallStrip />
      <FeaturedScenarios />
      <RecentRunsFeed />
    </div>
  );
}
