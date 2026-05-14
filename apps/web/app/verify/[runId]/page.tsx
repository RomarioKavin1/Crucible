import { VerifierClient } from "./VerifierClient";
export default function Page({ params }: { params: { runId: string } }) {
  return <VerifierClient runId={params.runId} />;
}
