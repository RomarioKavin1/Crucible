import { LandingHero } from "@/components/LandingHero";
import { ProofBand } from "@/components/ProofBand";
import { FeaturedScenarios } from "@/components/FeaturedScenarios";
import { RecentRunsBand } from "@/components/RecentRunsBand";
import { CliBand } from "@/components/CliBand";
import { listScenarios } from "@/lib/scenarios";

export const revalidate = 300;

export default async function HomePage() {
  const all = await listScenarios();

  // Editorial page composition: one band per concept, asymmetric grids inside,
  // hairline borders as the section dividers (no card stacking).
  return (
    <div className="max-w-container-wide mx-auto px-5 md:px-8">
      <LandingHero scenarioCount={all.length} />
      <ProofBand />
      <FeaturedScenarios />
      <CliBand />
      <RecentRunsBand />
    </div>
  );
}
