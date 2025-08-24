import React, { useState } from "react";
import { Badge, ToggleChip, IconBtn, Modal } from "../ui.jsx";
import QuantEditor from "./QuantEditor.jsx";
import Palette from "../Palette.jsx";
import { defaultQuant, summarizeNode } from "../../utils/regex.jsx";

export const LiteralEditor = ({ node, onChange }) => (
  <div className="space-y-3">
    <label className="text-sm text-slate-300">Text (special chars will be escaped)</label>
    <input className="input" value={node.text} onChange={(e) => onChange({ ...node, text: e.target.value })} />
    <div>
      <div className="text-sm text-slate-300 mb-1">Quantifier</div>
      <QuantEditor q={node.quant ?? defaultQuant} onChange={(q) => onChange({ ...node, quant: q })} />
    </div>
  </div>
);

export const PredefEditor = ({ node, onChange }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {[
        { k: "digit", label: "Digit \\d" },
        { k: "nondigit", label: "Non-digit \\D" },
        { k: "word", label: "Word char \\w" },
        { k: "nonword", label: "Non-word \\W" },
        { k: "space", label: "Whitespace \\s" },
        { k: "nonspace", label: "Non-whitespace \\S" },
        { k: "any", label: "Any ." },
      ].map((opt) => (
        <button
          key={opt.k}
          onClick={() => onChange({ ...node, which: opt.k })}
          className={`px-3 py-2 rounded-lg border text-left ${
            node.which === opt.k ? "bg-indigo-600/80 border-indigo-400 text-white" : "bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700"
          }`}
        >
          <div className="text-sm font-medium">{opt.label}</div>
          <div className="text-[11px] opacity-70">{opt.k}</div>
        </button>
      ))}
    </div>
    <div>
      <div className="text-sm text-slate-300 mb-1">Quantifier</div>
      <QuantEditor q={node.quant ?? defaultQuant} onChange={(q) => onChange({ ...node, quant: q })} />
    </div>
  </div>
);

export const BoundaryEditor = ({ node, onChange }) => (
  <div className="space-y-3">
    <div className="flex gap-2">
      <ToggleChip label="Word boundary \\b" checked={node.which === "word"} onChange={(v) => onChange({ ...node, which: v ? "word" : "nonword" })} />
      <ToggleChip label="Non-word boundary \\B" checked={node.which === "nonword"} onChange={(v) => onChange({ ...node, which: v ? "nonword" : "word" })} />
    </div>
    <div>
      <div className="text-sm text-slate-300 mb-1">Quantifier</div>
      <QuantEditor q={node.quant ?? defaultQuant} onChange={(q) => onChange({ ...node, quant: q })} />
    </div>
  </div>
);

export const CharClassEditor = ({ node, onChange }) => {
  const p = node.payload;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <ToggleChip label="Negate [^...]" checked={p.negate} onChange={(v) => onChange({ ...node, payload: { ...p, negate: v } })} />
        <Badge>Inside [] special: \\ \\] - ^ are escaped</Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <ToggleChip label="a-z" checked={p.sets.az} onChange={(v) => onChange({ ...node, payload: { ...p, sets: { ...p.sets, az: v } } })} />
        <ToggleChip label="A-Z" checked={p.sets.AZ} onChange={(v) => onChange({ ...node, payload: { ...p, sets: { ...p.sets, AZ: v } } })} />
        <ToggleChip label="0-9" checked={p.sets.d09} onChange={(v) => onChange({ ...node, payload: { ...p, sets: { ...p.sets, d09: v } } })} />
        <ToggleChip label="_ (underscore)" checked={p.sets.underscore} onChange={(v) => onChange({ ...node, payload: { ...p, sets: { ...p.sets, underscore: v } } })} />
        <ToggleChip label="Whitespace \\s" checked={p.sets.whitespace} onChange={(v) => onChange({ ...node, payload: { ...p, sets: { ...p.sets, whitespace: v } } })} />
      </div>
      <div>
        <label className="text-sm text-slate-300">Custom characters</label>
        <input className="input" value={p.custom} onChange={(e) => onChange({ ...node, payload: { ...p, custom: e.target.value } })} placeholder="e.g. .,:-@#" />
      </div>
      <div>
        <div className="text-sm text-slate-300 mb-1">Quantifier</div>
        <QuantEditor q={node.quant ?? defaultQuant} onChange={(q) => onChange({ ...node, quant: q })} />
      </div>
    </div>
  );
};

export const GroupEditor = ({ node, onChange }) => {
  const [editingIdx, setEditingIdx] = useState(null);

  const updateChild = (idx, newNode) => {
    const next = [...node.nodes];
    next[idx] = newNode;
    onChange({ ...node, nodes: next });
  };

  const addNode = (n) => onChange({ ...node, nodes: [...node.nodes, n] });

  const removeIdx = (idx) => onChange({ ...node, nodes: node.nodes.filter((_, i) => i !== idx) });

  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= node.nodes.length) return;
    const next = [...node.nodes];
    const t = next[idx];
    next[idx] = next[j];
    next[j] = t;
    onChange({ ...node, nodes: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <ToggleChip label="Capturing" checked={node.capturing} onChange={(v) => onChange({ ...node, capturing: v, name: v ? node.name : undefined })} />
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300">Name</label>
          <input className="input" value={node.name ?? ""} onChange={(e) => onChange({ ...node, name: e.target.value || undefined, capturing: true })} placeholder="optional (JS named group)" />
        </div>
      </div>

      <Palette onAdd={addNode} minimal />

      <div className="space-y-2">
        {node.nodes.length === 0 && <div className="text-sm text-slate-400">No items yet. Add building blocks above.</div>}
        {node.nodes.map((child, idx) => (
          <div key={child.id} className="flex items-center justify-between bg-slate-800/60 rounded-xl p-2 border border-slate-700">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>{child.type}</Badge>
              <div className="text-sm text-slate-100">{summarizeNode(child)}</div>
            </div>
            <div className="flex items-center gap-1">
              <IconBtn title="Move up" onClick={() => move(idx, -1)}>↑</IconBtn>
              <IconBtn title="Move down" onClick={() => move(idx, 1)}>↓</IconBtn>
              <IconBtn title="Edit" onClick={() => setEditingIdx(idx)}>✎</IconBtn>
              <IconBtn title="Delete" onClick={() => removeIdx(idx)}>🗑</IconBtn>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-sm text-slate-300 mb-1">Quantifier (applies to the WHOLE group)</div>
        <QuantEditor q={node.quant ?? defaultQuant} onChange={(q) => onChange({ ...node, quant: q })} />
      </div>

      {editingIdx !== null && <InlineEditor node={node.nodes[editingIdx]} onChange={(n) => updateChild(editingIdx, n)} onClose={() => setEditingIdx(null)} />}
    </div>
  );
};

export const AlternationEditor = ({ node, onChange }) => {
  const addBranch = () => onChange({ ...node, branches: [...node.branches, []] });
  const addToBranch = (i, n) => {
    const next = node.branches.map((b, idx) => (idx === i ? [...b, n] : b));
    onChange({ ...node, branches: next });
  };
  const updateInBranch = (i, j, n) => {
    const next = node.branches.map((b, idx) => (idx === i ? b.map((x, k) => (k === j ? n : x)) : b));
    onChange({ ...node, branches: next });
  };
  const removeInBranch = (i, j) => {
    const next = node.branches.map((b, idx) => (idx === i ? b.filter((_, k) => k !== j) : b));
    onChange({ ...node, branches: next });
  };

  const [show, setShow] = useState(false);
  const [inlineCfg, setInlineCfg] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={addBranch} className="btn">+ Add option</button>
        <span className="text-xs text-slate-400">Each option is a sequence of blocks; regex will be (?:opt1|opt2|...)</span>
      </div>

      {node.branches.length === 0 && <div className="text-sm text-slate-400">No options yet.</div>}

      <div className="space-y-4">
        {node.branches.map((branch, i) => (
          <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-2">
            <div className="text-slate-200 font-medium mb-1">Option {i + 1}</div>
            <Palette onAdd={(n) => addToBranch(i, n)} minimal />
            {branch.length === 0 && <div className="text-sm text-slate-400">Empty option</div>}
            {branch.map((bn, j) => (
              <div key={bn.id} className="flex items-center justify-between bg-slate-900/60 rounded-lg p-2 border border-slate-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{bn.type}</Badge>
                  <div className="text-sm text-slate-100">{summarizeNode(bn)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <IconBtn
                    title="Edit"
                    onClick={() => {
                      const close = () => setShow(false);
                      setShow(true);
                      setInlineCfg({ target: { i, j }, node: bn, onSave: (newN) => updateInBranch(i, j, newN), onClose: close });
                    }}
                  >
                    ✎
                  </IconBtn>
                  <IconBtn title="Delete" onClick={() => removeInBranch(i, j)}>🗑</IconBtn>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div>
        <div className="text-sm text-slate-300 mb-1">Quantifier</div>
        <QuantEditor q={node.quant ?? defaultQuant} onChange={(q) => onChange({ ...node, quant: q })} />
      </div>

      {show && inlineCfg && (
        <Modal title="Edit block" onClose={inlineCfg.onClose}>
          <NodeEditor node={inlineCfg.node} onChange={inlineCfg.onSave} />
        </Modal>
      )}
    </div>
  );
};

export const LookEditor = ({ node, onChange }) => {
  const setDir = (dir) => onChange({ ...node, direction: dir });
  const setPos = (pos) => onChange({ ...node, positive: pos });

  const updateChild = (idx, newNode) => {
    const next = [...node.nodes];
    next[idx] = newNode;
    onChange({ ...node, nodes: next });
  };

  const addNode = (n) => onChange({ ...node, nodes: [...node.nodes, n] });
  const removeIdx = (idx) => onChange({ ...node, nodes: node.nodes.filter((_, i) => i !== idx) });

  const [editing, setEditing] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <ToggleChip label="Lookahead" checked={node.direction === 'ahead'} onChange={(v) => setDir(v ? 'ahead' : 'behind')} />
        <ToggleChip label="Lookbehind" checked={node.direction === 'behind'} onChange={(v) => setDir(v ? 'behind' : 'ahead')} />
        <ToggleChip label="Positive" checked={node.positive} onChange={(v) => setPos(v)} />
        <ToggleChip label="Negative" checked={!node.positive} onChange={(v) => setPos(!v)} />
        <span className="text-xs text-slate-400">Note: Lookbehind isn't supported in some older JS engines.</span>
      </div>
      <Palette onAdd={addNode} minimal />
      <div className="space-y-2">
        {node.nodes.length === 0 && <div className="text-sm text-slate-400">Add inner blocks for the assertion.</div>}
        {node.nodes.map((child, idx) => (
          <div key={child.id} className="flex items-center justify-between bg-slate-800/60 rounded-xl p-2 border border-slate-700">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>{child.type}</Badge>
              <div className="text-sm text-slate-100">{summarizeNode(child)}</div>
            </div>
            <div className="flex items-center gap-1">
              <IconBtn title="Edit" onClick={() => setEditing(idx)}>✎</IconBtn>
              <IconBtn title="Delete" onClick={() => removeIdx(idx)}>🗑</IconBtn>
            </div>
          </div>
        ))}
      </div>
      {editing !== null && <InlineEditor node={node.nodes[editing]} onChange={(n) => updateChild(editing, n)} onClose={() => setEditing(null)} />}
    </div>
  );
};

export const InlineEditor = ({ node, onChange, onClose }) => (
  <Modal title={`Edit ${node.type}`} onClose={onClose}>
    <NodeEditor node={node} onChange={onChange} />
  </Modal>
);

export const NodeEditor = ({ node, onChange }) => {
  switch (node.type) {
    case "literal":
      return <LiteralEditor node={node} onChange={onChange} />;
    case "predef":
      return <PredefEditor node={node} onChange={onChange} />;
    case "boundary":
      return <BoundaryEditor node={node} onChange={onChange} />;
    case "charclass":
      return <CharClassEditor node={node} onChange={onChange} />;
    case "group":
      return <GroupEditor node={node} onChange={onChange} />;
    case "alternation":
      return <AlternationEditor node={node} onChange={onChange} />;
    case "look":
      return <LookEditor node={node} onChange={onChange} />;
    case "anchor":
      return (
        <div className="space-y-2">
          <div className="text-slate-300 text-sm">Anchors don't take quantifiers. Choose start ^ or end $ from the chip below.</div>
          <div className="flex gap-2">
            <ToggleChip label="Start ^" checked={node.which === 'start'} onChange={(v) => onChange({ ...node, which: v ? 'start' : 'end' })} />
            <ToggleChip label="End $" checked={node.which === 'end'} onChange={(v) => onChange({ ...node, which: v ? 'end' : 'start' })} />
          </div>
        </div>
      );
    case "backref":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-300">Index</label>
              <input className="input w-24" type="number" min={1} value={node.ref.index ?? 1} onChange={(e) => onChange({ ...node, ref: { index: Number(e.target.value) || 1 } })} />
            </div>
            <div className="text-xs text-slate-400">or</div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-300">Name</label>
              <input className="input" placeholder="groupName" value={node.ref.name ?? ""} onChange={(e) => onChange({ ...node, ref: { name: e.target.value || undefined } })} />
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-300 mb-1">Quantifier</div>
            <QuantEditor q={node.quant ?? defaultQuant} onChange={(q) => onChange({ ...node, quant: q })} />
          </div>
        </div>
      );
    default:
      return null;
  }
};
