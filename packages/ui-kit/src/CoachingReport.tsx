import ReactMarkdown from "react-markdown";

export interface CoachingReportProps {
  markdown: string;
}

export function CoachingReport({ markdown }: CoachingReportProps) {
  return (
    <div className="prose prose-invert max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-slate-100 prose-code:text-cyan-300">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
