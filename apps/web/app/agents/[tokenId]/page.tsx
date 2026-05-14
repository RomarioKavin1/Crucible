import { AgentDetailClient } from "./AgentDetailClient";
export default function Page({ params }: { params: { tokenId: string } }) {
  return <AgentDetailClient tokenId={BigInt(params.tokenId)} />;
}
