export default function AgentDetail({ params }: { params: { id: string } }) {
  return (
    <main style={{ padding: 24, fontFamily: "ui-monospace, monospace" }}>
      <h1>Agent #{params.id}</h1>
      <p>Recipe history, run history, aggregate metrics — placeholder.</p>
    </main>
  );
}
