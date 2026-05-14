export interface RecipeDiffProps {
  current: string;
  suggested: string;
}

export function RecipeDiff({ current, suggested }: RecipeDiffProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="text-xs text-slate-500 mb-1">Current</div>
        <pre className="bg-slate-900/40 border border-slate-700 rounded p-3 text-xs whitespace-pre-wrap text-slate-300 overflow-auto">
          {current}
        </pre>
      </div>
      <div>
        <div className="text-xs text-slate-500 mb-1">Suggested</div>
        <pre className="bg-slate-900/40 border border-emerald-700 rounded p-3 text-xs whitespace-pre-wrap text-emerald-200 overflow-auto">
          {suggested}
        </pre>
      </div>
    </div>
  );
}
