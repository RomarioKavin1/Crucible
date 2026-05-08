import Link from "next/link";

interface LeaderboardEntry {
  agentId: number;
  owner: string;
  scenarioId: string;
  score: number;
}

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // TODO: read RunRegistry via og-client. Hardcoded for now so the page renders.
  return [
    { agentId: 1, owner: "0xabc...111", scenarioId: "eth-trump-tariff-apr2025", score: 1.42 },
    { agentId: 2, owner: "0xabc...222", scenarioId: "eth-trump-tariff-apr2025", score: 0.91 },
  ];
}

export default async function Leaderboard() {
  const rows = await getLeaderboard();
  return (
    <main style={{ padding: 24, fontFamily: "ui-monospace, monospace" }}>
      <h1>Crucible Leaderboard</h1>
      <table>
        <thead>
          <tr>
            <th>Agent</th>
            <th>Owner</th>
            <th>Scenario</th>
            <th>Sortino</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.agentId}>
              <td>
                <Link href={`/agent/${r.agentId}`}>#{r.agentId}</Link>
              </td>
              <td>{r.owner}</td>
              <td>{r.scenarioId}</td>
              <td>{r.score.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
