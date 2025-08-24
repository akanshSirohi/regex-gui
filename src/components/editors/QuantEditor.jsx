import React from "react";
import { ToggleChip } from "../ui.jsx";

export default function QuantEditor({ q, onChange }) {
  const kind = q?.kind ?? "one";
  const greedy = q?.greedy ?? true;
  const isGreedyEditable = ["zeroOrOne", "oneOrMore", "zeroOrMore", "exact", "atLeast", "range"].includes(kind);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          { k: "one", label: "Exactly once" },
          { k: "zeroOrOne", label: "Optional ?" },
          { k: "oneOrMore", label: "One+ +" },
          { k: "zeroOrMore", label: "Zero+ *" },
          { k: "exact", label: "Exact {n}" },
          { k: "atLeast", label: "At least {n,}" },
          { k: "range", label: "Range {m,n}" },
        ].map((opt) => (
          <button
            key={opt.k}
            onClick={() => {
              if (opt.k === "one") onChange({ kind: "one" });
              else if (opt.k === "zeroOrOne") onChange({ kind: "zeroOrOne", greedy: true });
              else if (opt.k === "oneOrMore") onChange({ kind: "oneOrMore", greedy: true });
              else if (opt.k === "zeroOrMore") onChange({ kind: "zeroOrMore", greedy: true });
              else if (opt.k === "exact") onChange({ kind: "exact", n: 1, greedy: true });
              else if (opt.k === "atLeast") onChange({ kind: "atLeast", n: 1, greedy: true });
              else if (opt.k === "range") onChange({ kind: "range", min: 0, max: 3, greedy: true });
            }}
            className={`px-3 py-2 rounded-lg border text-left ${
              kind === opt.k
                ? "bg-indigo-600/80 border-indigo-400 text-white"
                : "bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700"
            }`}
          >
            <div className="text-sm font-medium">{opt.label}</div>
            <div className="text-[11px] opacity-70">{opt.k}</div>
          </button>
        ))}
      </div>

      {kind === "exact" && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300">n</label>
          <input
            type="number"
            min={0}
            className="input"
            value={q?.n ?? 1}
            onChange={(e) => onChange({ kind: "exact", n: Number(e.target.value) || 0, greedy })}
          />
        </div>
      )}
      {kind === "atLeast" && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300">n</label>
          <input
            type="number"
            min={0}
            className="input"
            value={q?.n ?? 1}
            onChange={(e) => onChange({ kind: "atLeast", n: Number(e.target.value) || 0, greedy })}
          />
        </div>
      )}
      {kind === "range" && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">min</label>
            <input
              type="number"
              min={0}
              className="input"
              value={q?.min ?? 0}
              onChange={(e) => onChange({ kind: "range", min: Number(e.target.value) || 0, max: q?.max ?? 3, greedy })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">max</label>
            <input
              type="number"
              min={0}
              className="input"
              value={q?.max ?? 3}
              onChange={(e) => onChange({ kind: "range", min: q?.min ?? 0, max: Number(e.target.value) || 0, greedy })}
            />
          </div>
        </div>
      )}

      {isGreedyEditable && (
        <div className="flex items-center gap-2">
          <ToggleChip label={greedy ? "Greedy" : "Lazy"} checked={!(!greedy)} onChange={(v) => onChange({ ...(q || {}), greedy: v })} />
          <span className="text-xs text-slate-400">Greedy repeats match as much as possible; Lazy uses minimal.</span>
        </div>
      )}
    </div>
  );
}

