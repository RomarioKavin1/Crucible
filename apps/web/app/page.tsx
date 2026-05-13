import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] font-semibold text-[#e6e9f0]">Crucible Bench</h1>
      <p className="text-[#aab2c5]">Landing under construction. Navigate to:</p>
      <ul className="space-y-1 text-[#22d3ee] text-[13px]">
        <li><Link className="hover:underline" href="/scenarios">Scenarios →</Link></li>
        <li><Link className="hover:underline" href="/leaderboard">Leaderboard →</Link></li>
        <li><Link className="hover:underline" href="/community">Community →</Link></li>
      </ul>
    </div>
  );
}
