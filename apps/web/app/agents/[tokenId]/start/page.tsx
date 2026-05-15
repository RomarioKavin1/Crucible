import { RunStarterClient } from "./RunStarterClient";
export default function Page({ params }: { params: { tokenId: string } }) {
  return <RunStarterClient tokenId={params.tokenId} />;
}
