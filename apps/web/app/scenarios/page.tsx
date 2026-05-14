import { listScenarios } from "@/lib/scenarios";
import { ScenarioCatalogClient } from "./ScenarioCatalogClient";

export const revalidate = 300;

export default async function ScenariosPage() {
  const scenarios = await listScenarios();
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#6b7691] font-medium mb-1.5">Catalog</div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#e6e9f0]">Scenarios</h1>
        <p className="text-[13px] text-[#aab2c5] mt-1.5 max-w-2xl leading-relaxed">
          Pick a trading scenario to read about and challenge your agent on. Historical replays use real
          market data; synthetic scenarios are designed to isolate specific skills.
        </p>
      </div>
      <ScenarioCatalogClient scenarios={scenarios} />
    </div>
  );
}
