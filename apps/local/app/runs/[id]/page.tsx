import { LiveRunView } from "@/components/LiveRunView";
export default function RunPage({ params }: { params: { id: string } }) {
  return <LiveRunView runId={params.id} />;
}
