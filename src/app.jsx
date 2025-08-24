import React, { useMemo, useState } from "react";
import { Section, Badge, IconBtn, Modal } from "./components/ui.jsx";
import Palette from "./components/Palette.jsx";
import { NodeEditor } from "./components/editors/NodeEditors.jsx";
import { sampleEmail } from "./templates/samples.js";
import { nodeToPattern, summarizeNode, computeMatches, highlightText } from "./utils/regex.jsx";
import { makeAnchor, makeLiteral } from "./utils/nodes.js";

export default function RegexBuilderApp() {
  const [nodes, setNodes] = useState([makeAnchor("start"), makeLiteral(), makeAnchor("end")]);
  const [flags, setFlags] = useState({ g: true, i: true, m: false, s: false, u: false, y: false });
  const [testText, setTestText] = useState("Try your regex here. For example, test 123, test 456.");
  const [showExplain, setShowExplain] = useState(true);
  const [modalNode, setModalNode] = useState(null);

  const applyEmailTemplate = () => {
    const t = sampleEmail();
    setNodes(t);
    setFlags({ g: true, i: true, m: false, s: false, u: true, y: false });
  };

  const addNode = (n) => setNodes((prev) => [...prev, n]);
  const removeNode = (idx) => setNodes((prev) => prev.filter((_, i) => i !== idx));
  const moveNode = (idx, dir) =>
    setNodes((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const arr = [...prev];
      const t = arr[idx];
      arr[idx] = arr[j];
      arr[j] = t;
      return arr;
    });
  const updateNode = (idx, n) => setNodes((prev) => prev.map((x, i) => (i === idx ? n : x)));

  const pattern = useMemo(() => nodes.map(nodeToPattern).join(""), [nodes]);
  const flagsStr = useMemo(() => Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join(""), [flags]);

  const { error, matches } = useMemo(() => computeMatches(pattern, flagsStr, testText), [pattern, flagsStr, testText]);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch {
      /* ignore */
    }
  };

  const explain = () => nodes.map((n, i) => `${i + 1}. ${summarizeNode(n)}`).join("\n");

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Regex Builder</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="pill" onClick={applyEmailTemplate}>✨ Email template</button>
            <button
              className="pill"
              onClick={() => {
                setNodes([makeAnchor("start"), makeLiteral(), makeAnchor("end")]);
                setFlags({ g: true, i: true, m: false, s: false, u: false, y: false });
              }}
            >
              ↺ Reset
            </button>
            <button className="pill" onClick={() => setShowExplain(!showExplain)}>{showExplain ? "Hide" : "Show"} explain</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-4">
          <Section title="Building blocks">
            <Palette onAdd={addNode} />
            <div className="mt-3 text-xs text-slate-400">
              Tip: Add blocks left-to-right to form your pattern. Edit blocks to set quantifiers (how many), names, and options.
            </div>
          </Section>

          <div className="lg:col-span-2 space-y-4">
            <Section title="Your pattern" right={<Flags flags={flags} setFlags={setFlags} />}>
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-emerald-300 text-sm overflow-x-auto whitespace-pre">/{pattern || ""}/{flagsStr || ""}</code>
                    <button className="btn" onClick={() => copy(`/${pattern}/${flagsStr}`)}>Copy regex</button>
                    <button className="pill" onClick={() => copy(pattern)}>Copy pattern only</button>
                    <button className="pill" onClick={() => copy(flagsStr)}>Copy flags</button>
                  </div>
                  {error && <div className="text-sm text-rose-400">⚠️ Error: {error}</div>}
                </div>

                <div className="space-y-2">
                  {nodes.length === 0 && <div className="text-sm text-slate-400">No blocks yet. Add from the left panel.</div>}
                  {nodes.map((n, idx) => (
                    <div key={n.id} className="flex items-center justify-between bg-slate-800/60 rounded-xl p-2 border border-slate-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge title={n.type}>{n.type}</Badge>
                        <div className="text-sm text-slate-100">{summarizeNode(n)}</div>
                        <code className="text-xs bg-slate-900/70 border border-slate-700 rounded px-1.5 py-0.5">{nodeToPattern(n)}</code>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconBtn title="Move up" onClick={() => moveNode(idx, -1)}>↑</IconBtn>
                        <IconBtn title="Move down" onClick={() => moveNode(idx, 1)}>↓</IconBtn>
                        <IconBtn title="Edit" onClick={() => setModalNode({ idx })}>✎</IconBtn>
                        <IconBtn title="Delete" onClick={() => removeNode(idx)}>🗑</IconBtn>
                      </div>
                    </div>
                  ))}
                </div>

                {showExplain && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 whitespace-pre-wrap">
                    {nodes.length ? explain() : "Add blocks to see an explanation."}
                  </div>
                )}
              </div>
            </Section>

            <Section title="Test against a string">
              <div className="space-y-3">
                <textarea className="input min-h-[120px]" value={testText} onChange={(e) => setTestText(e.target.value)} />
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-base leading-relaxed">
                  {highlightText(testText, matches.map((m) => ({ start: m.start, end: m.end })))}
                </div>
                <div className="text-sm text-slate-300">
                  {matches.length} match{matches.length !== 1 ? "es" : ""}.
                  <span className="opacity-70"> (Switch on <code>g</code> to find all)</span>
                </div>
                {matches.length > 0 && (
                  <div className="overflow-auto">
                    <table className="w-full text-sm border border-slate-800 rounded-xl overflow-hidden">
                      <thead className="bg-slate-900/60 text-slate-300">
                        <tr>
                          <th className="px-2 py-1 text-left">#</th>
                          <th className="px-2 py-1 text-left">Range</th>
                          <th className="px-2 py-1 text-left">Match</th>
                          <th className="px-2 py-1 text-left">Groups</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matches.map((m, i) => (
                          <tr key={i} className="odd:bg-slate-900/40">
                            <td className="px-2 py-1">{i + 1}</td>
                            <td className="px-2 py-1">[{m.start}, {m.end})</td>
                            <td className="px-2 py-1"><code className="bg-slate-900/70 border border-slate-800 rounded px-1.5 py-0.5">{testText.slice(m.start, m.end)}</code></td>
                            <td className="px-2 py-1">
                              {Array.isArray(m.groups)
                                ? m.groups.length
                                  ? m.groups.map((g, gi) => (
                                      <span key={gi} className="pill mr-1">
                                        {gi + 1}:{g ?? "<null>"}
                                      </span>
                                    ))
                                  : <span className="text-slate-400">—</span>
                                : Object.keys(m.groups).length
                                  ? Object.entries(m.groups).map(([k, v]) => (
                                      <span key={k} className="pill mr-1">
                                        {k}:{v}
                                      </span>
                                    ))
                                  : <span className="text-slate-400">—</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Section>
          </div>
        </div>
      </div>

      {modalNode && (
        <Modal title={`Edit block #${modalNode.idx + 1}`} onClose={() => setModalNode(null)}>
          <NodeEditor node={nodes[modalNode.idx]} onChange={(n) => updateNode(modalNode.idx, n)} />
        </Modal>
      )}

      <footer className="max-w-7xl mx-auto px-4 pb-10 pt-4 text-xs text-slate-400">
        <div className="flex flex-wrap gap-2 items-center">
          <span>Pro tips:</span>
          <span className="pill">Use ^ and $ anchors to match full strings</span>
          <span className="pill">Turn on m flag to make ^/$ work per line</span>
          <span className="pill">Use groups to capture parts of the match</span>
          <span className="pill">Use alternation to allow multiple options</span>
        </div>
      </footer>
    </div>
  );
}

const Flags = ({ flags, setFlags }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {[
      { k: "g", desc: "global (find all)" },
      { k: "i", desc: "ignore case" },
      { k: "m", desc: "multiline ^ $" },
      { k: "s", desc: "dotAll enables . to match newline" },
      { k: "u", desc: "unicode" },
      { k: "y", desc: "sticky" },
    ].map(({ k, desc }) => (
      <label key={k} className="pill cursor-pointer select-none">
        <input type="checkbox" className="mr-1" checked={flags[k]} onChange={(e) => setFlags({ ...flags, [k]: e.target.checked })} />
        <span className="uppercase font-semibold">{k}</span>
        <span className="opacity-70">{desc}</span>
      </label>
    ))}
  </div>
);
