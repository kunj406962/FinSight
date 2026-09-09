import type { ReactNode } from "react";

// Minimal, dependency-free renderer for Gemini's markdown-ish narration
// (### headings, **bold**, "* " bullets). Not a full markdown parser —
// just enough to make the narration readable instead of one raw blob.

function renderInlineBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="text-slate-100">{part}</strong> : part
  );
}

export function NarrationText({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  const blocks: ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = (key: string) => {
    if (bulletBuffer.length > 0) {
      blocks.push(
        <ul key={key} className="list-disc list-inside space-y-1 text-sm text-slate-300">
          {bulletBuffer.map((item, i) => (
            <li key={i}>{renderInlineBold(item)}</li>
          ))}
        </ul>
      );
      bulletBuffer = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("### ")) {
      flushBullets(`ul-${i}`);
      blocks.push(
        <h3 key={i} className="text-sm font-semibold text-slate-200 mt-2">
          {renderInlineBold(trimmed.replace(/^###\s*/, ""))}
        </h3>
      );
    } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      bulletBuffer.push(trimmed.replace(/^[*-]\s*/, ""));
    } else {
      flushBullets(`ul-${i}`);
      blocks.push(
        <p key={i} className="text-sm text-slate-300">
          {renderInlineBold(trimmed)}
        </p>
      );
    }
  });
  flushBullets("ul-end");

  return <div className="space-y-2">{blocks}</div>;
}