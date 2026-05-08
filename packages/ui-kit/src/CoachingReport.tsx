"use client";
import React from "react";

interface Issue {
  title: string;
  confidence: "low" | "medium" | "high";
  evidence: string;
  fix: string;
}

export function CoachingReport({ issues }: { issues: Issue[] }) {
  return (
    <ol style={{ fontFamily: "ui-monospace, monospace" }}>
      {issues.map((it, i) => (
        <li key={i} style={{ marginBottom: 16 }}>
          <strong>{it.title}</strong> ({it.confidence})
          <div style={{ opacity: 0.7 }}>{it.evidence}</div>
          <div>Fix: {it.fix}</div>
        </li>
      ))}
    </ol>
  );
}
