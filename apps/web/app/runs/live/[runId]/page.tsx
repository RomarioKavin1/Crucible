import { LiveRunClient } from "./LiveRunClient";
export default function Page({ params }: { params: { runId: string } }) {
  return <LiveRunClient runId={params.runId} />;
}
