import React, { useMemo, useState } from "react";

// ------------------------------------------------------------
// Regex Builder — Single Page App
// - Default export React component for Canvas preview
// - Clean, approachable UI with building blocks
// - Outputs usable JS regex + live tester with highlighting
// ------------------------------------------------------------

// Types removed for plain JavaScript build.

// ------------------- Utilities ------------------------------

const uid = () => Math.random().toString(36).slice(2);

const escapeLiteral = (s) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, (m) => `\\${m}`);

const escapeCharClass = (s) =>
  s.replace(/[\\\]\-^]/g, (m) => `\\${m}`); // escape \ ] - ^ inside []

const quantToString = (q) => {
  if (!q) return "";
  switch (q.kind) {
    case "one":
      return "";
    case "zeroOrOne":
      return `?${q.greedy ? "" : "?"}`;
    case "oneOrMore":
      return `+${q.greedy ? "" : "?"}`;
    case "zeroOrMore":
      return `*${q.greedy ? "" : "?"}`;
    case "exact":
      return `{${q.n}}${q.greedy ? "" : "?"}`;
    case "atLeast":
      return `{${q.n},}${q.greedy ? "" : "?"}`;
    case "range":
      return `{${q.min},${q.max}}${q.greedy ? "" : "?"}`;
  }
};

const predefToString = (p) =>
  ({ digit: "\\d", nondigit: "\\D", word: "\\w", nonword: "\\W", space: "\\s", nonspace: "\\S", any: "." }[p]);

const renderCharClass = (cc) => {
  const parts = [];
  if (cc.sets.az) parts.push("a-z");
  if (cc.sets.AZ) parts.push("A-Z");
  if (cc.sets.d09) parts.push("0-9");
  if (cc.sets.underscore) parts.push("_");
  if (cc.sets.whitespace) parts.push("\\s");
  if (cc.custom) parts.push(escapeCharClass(cc.custom));
  const body = parts.join("");
  return `[${cc.negate ? "^" : ""}${body}]`;
};

const nodeToPattern = (n) => {
  switch (n.type) {
    case "literal": {
      const body = escapeLiteral(n.text);
      return `${body}${quantToString(n.quant)}`;
    }
    case "predef":
      return `${predefToString(n.which)}${quantToString(n.quant)}`;
    case "anchor":
      return n.which === "start" ? "^" : "$";
    case "boundary":
      return `${n.which === "word" ? "\\b" : "\\B"}${quantToString(n.quant)}`; // quant on boundary rarely used
    case "charclass":
      return `${renderCharClass(n.payload)}${quantToString(n.quant)}`;
    case "backref": {
      const ref = n.ref.name ? `k<${n.ref.name}>` : `${n.ref.index ?? 1}`;
      return `\\${ref}${quantToString(n.quant)}`;
    }
    case "group": {
      const inner = n.nodes.map(nodeToPattern).join("");
      const cap = n.capturing ? (n.name ? `?<${n.name}>` : "") : "?:";
      const open = n.capturing ? `(${cap}` : `(${cap}`; // cap already handles both
      return `${open}${inner})${quantToString(n.quant)}`;
    }
    case "alternation": {
      const branches = n.branches.map((b) => b.map(nodeToPattern).join("")).join("|");
      return `(?:${branches})${quantToString(n.quant)}`;
    }
    case "look": {
      const inner = n.nodes.map(nodeToPattern).join("");
      const lead = n.direction === "ahead" ? (n.positive ? "?=" : "?!") : n.positive ? "?<=" : "?<!";
      return `(${lead}${inner})${quantToString(n.quant)}`;
    }
    default:
      return "";
  }
};

const summarizeNode = (n) => {
  switch (n.type) {
    case "literal":
      return `Text: "${n.text}"`;
    case "predef":
      return {
        digit: "Digit \\d",
        nondigit: "Non-digit \\D",
        word: "Word char \\w",
        nonword: "Non-word \\W",
        space: "Whitespace \\s",
        nonspace: "Non-whitespace \\S",
        any: "Any char .",
      }[n.which];
    case "anchor":
      return n.which === "start" ? "Start ^" : "End $";
    case "boundary":
      return n.which === "word" ? "Word boundary \\b" : "Non-word boundary \\B";
    case "charclass": {
      const p = renderCharClass(n.payload);
      return `Char Class ${p}`;
    }
    case "group":
      return n.capturing ? `Group ${n.name ? `"${n.name}"` : "( )"}` : "Non-capturing (?: )";
    case "alternation":
      return `Alternation (${n.branches.length} options)`;
    case "look":
      return `${n.direction === "ahead" ? "Lookahead" : "Lookbehind"} ${n.positive ? "+" : "-"}`;
    case "backref":
      return `Backref ${n.ref.name ? `name:${n.ref.name}` : `#${n.ref.index ?? 1}`}`;
  }
};

const defaultQuant = { kind: "one" };

// ------------------- UI Helpers -----------------------------

const Badge = ({ children, title }) => (
  <span title={title} className="inline-flex items-center rounded-full bg-slate-800/70 text-slate-100 px-2 py-0.5 text-xs">
    {children}
  </span>
);

const Section = ({ title, right, children }) => (
  <div className="bg-slate-900/60 backdrop-blur rounded-2xl p-4 shadow-lg border border-slate-800">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-slate-200 font-semibold tracking-wide">{title}</h2>
      {right}
    </div>
    {children}
  </div>
);

const ToggleChip = ({ label, checked, onChange }) => (
  <button onClick={()=>onChange(!checked)} className={`px-2.5 py-1 rounded-full text-xs border transition ${checked?"bg-emerald-600/80 border-emerald-400 text-white":"bg-slate-800/70 border-slate-600 text-slate-300 hover:bg-slate-700"}`}>
    {label}
  </button>
);

const IconBtn = ({ title, onClick, children }) => (
  <button title={title} onClick={onClick} className="p-1.5 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-200 border border-slate-700">
    {children}
  </button>
);

// ------------------- Modals ---------------------------------

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="w-[min(720px,96vw)] max-h-[90vh] overflow-auto bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        <IconBtn title="Close" onClick={onClose}>✖</IconBtn>
      </div>
      {children}
    </div>
  </div>
);

// ------------------- Quantifier Editor ----------------------

const QuantEditor = ({ q, onChange }) => {
  const kind = q?.kind ?? "one";
  const greedy = q?.greedy ?? true;
  const isGreedyEditable = ["zeroOrOne","oneOrMore","zeroOrMore","exact","atLeast","range"].includes(kind);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          {k:"one", label:"Exactly once"},
          {k:"zeroOrOne", label:"Optional ?"},
          {k:"oneOrMore", label:"One+ +"},
          {k:"zeroOrMore", label:"Zero+ *"},
          {k:"exact", label:"Exact {n}"},
          {k:"atLeast", label:"At least {n,}"},
          {k:"range", label:"Range {m,n}"},
        ].map((opt)=> (
          <button key={opt.k} onClick={()=>{
            if (opt.k === "one") onChange({kind:"one"});
            else if (opt.k === "zeroOrOne") onChange({kind:"zeroOrOne", greedy:true});
            else if (opt.k === "oneOrMore") onChange({kind:"oneOrMore", greedy:true});
            else if (opt.k === "zeroOrMore") onChange({kind:"zeroOrMore", greedy:true});
            else if (opt.k === "exact") onChange({kind:"exact", n:1, greedy:true});
            else if (opt.k === "atLeast") onChange({kind:"atLeast", n:1, greedy:true});
            else if (opt.k === "range") onChange({kind:"range", min:0, max:3, greedy:true});
          }} className={`px-3 py-2 rounded-lg border text-left ${kind===opt.k?"bg-indigo-600/80 border-indigo-400 text-white":"bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700"}`}>
            <div className="text-sm font-medium">{opt.label}</div>
            <div className="text-[11px] opacity-70">{opt.k}</div>
          </button>
        ))}
      </div>

      {kind === "exact" && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300">n</label>
          <input type="number" min={0} className="input" value={q?.n ?? 1} onChange={(e)=>onChange({kind:"exact", n: Number(e.target.value)||0, greedy})} />
        </div>
      )}
      {kind === "atLeast" && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300">n</label>
          <input type="number" min={0} className="input" value={q?.n ?? 1} onChange={(e)=>onChange({kind:"atLeast", n: Number(e.target.value)||0, greedy})} />
        </div>
      )}
      {kind === "range" && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">min</label>
            <input type="number" min={0} className="input" value={q?.min ?? 0} onChange={(e)=>onChange({kind:"range", min: Number(e.target.value)||0, max:q?.max ?? 3, greedy})} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">max</label>
            <input type="number" min={0} className="input" value={q?.max ?? 3} onChange={(e)=>onChange({kind:"range", min:q?.min ?? 0, max: Number(e.target.value)||0, greedy})} />
          </div>
        </div>
      )}

      {isGreedyEditable && (
        <div className="flex items-center gap-2">
          <ToggleChip label={greedy?"Greedy":"Lazy"} checked={!(!greedy)} onChange={(v)=>onChange({ ...(q || {}), greedy: v })} />
          <span className="text-xs text-slate-400">Greedy repeats match as much as possible; Lazy uses minimal.</span>
        </div>
      )}
    </div>
  );
};

// ------------------- Node Editors ---------------------------

const LiteralEditor = ({ node, onChange }) => (
  <div className="space-y-3">
    <label className="text-sm text-slate-300">Text (special chars will be escaped)</label>
    <input className="input" value={node.text} onChange={(e)=>onChange({...node, text:e.target.value})} />
    <div>
      <div className="text-sm text-slate-300 mb-1">Quantifier</div>
      <QuantEditor q={node.quant ?? defaultQuant} onChange={(q)=>onChange({...node, quant:q})} />
    </div>
  </div>
);

const PredefEditor = ({ node, onChange }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {([
        {k:"digit", label:"Digit \\d"},
        {k:"nondigit", label:"Non-digit \\D"},
        {k:"word", label:"Word char \\w"},
        {k:"nonword", label:"Non-word \\W"},
        {k:"space", label:"Whitespace \\s"},
        {k:"nonspace", label:"Non-whitespace \\S"},
        {k:"any", label:"Any ."},
      ]).map(opt=> (
        <button key={opt.k} onClick={()=>onChange({...node, which: opt.k})} className={`px-3 py-2 rounded-lg border text-left ${node.which===opt.k?"bg-indigo-600/80 border-indigo-400 text-white":"bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700"}`}>
          <div className="text-sm font-medium">{opt.label}</div>
          <div className="text-[11px] opacity-70">{opt.k}</div>
        </button>
      ))}
    </div>
    <div>
      <div className="text-sm text-slate-300 mb-1">Quantifier</div>
      <QuantEditor q={node.quant ?? defaultQuant} onChange={(q)=>onChange({...node, quant:q})} />
    </div>
  </div>
);

const BoundaryEditor = ({ node, onChange }) => (
  <div className="space-y-3">
    <div className="flex gap-2">
      <ToggleChip label="Word boundary \\b" checked={node.which==='word'} onChange={(v)=>onChange({...node, which: v?"word":"nonword"})} />
      <ToggleChip label="Non-word boundary \\B" checked={node.which==='nonword'} onChange={(v)=>onChange({...node, which: v?"nonword":"word"})} />
    </div>
    <div>
      <div className="text-sm text-slate-300 mb-1">Quantifier</div>
      <QuantEditor q={node.quant ?? defaultQuant} onChange={(q)=>onChange({...node, quant:q})} />
    </div>
  </div>
);

const CharClassEditor = ({ node, onChange }) => {
  const p = node.payload;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <ToggleChip label="Negate [^...]" checked={p.negate} onChange={(v)=>onChange({...node, payload:{...p, negate:v}})} />
        <Badge>Inside [] special: \\ \\] - ^ are escaped</Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <ToggleChip label="a-z" checked={p.sets.az} onChange={(v)=>onChange({...node, payload:{...p, sets:{...p.sets, az:v}}})} />
        <ToggleChip label="A-Z" checked={p.sets.AZ} onChange={(v)=>onChange({...node, payload:{...p, sets:{...p.sets, AZ:v}}})} />
        <ToggleChip label="0-9" checked={p.sets.d09} onChange={(v)=>onChange({...node, payload:{...p, sets:{...p.sets, d09:v}}})} />
        <ToggleChip label="_ (underscore)" checked={p.sets.underscore} onChange={(v)=>onChange({...node, payload:{...p, sets:{...p.sets, underscore:v}}})} />
        <ToggleChip label="Whitespace \\s" checked={p.sets.whitespace} onChange={(v)=>onChange({...node, payload:{...p, sets:{...p.sets, whitespace:v}}})} />
      </div>
      <div>
        <label className="text-sm text-slate-300">Custom characters</label>
        <input className="input" value={p.custom} onChange={(e)=>onChange({...node, payload:{...p, custom: e.target.value}})} placeholder="e.g. .,:-@#" />
      </div>
      <div>
        <div className="text-sm text-slate-300 mb-1">Quantifier</div>
        <QuantEditor q={node.quant ?? defaultQuant} onChange={(q)=>onChange({...node, quant:q})} />
      </div>
    </div>
  );
};

const GroupEditor = ({ node, onChange }) => {
  const [editingIdx, setEditingIdx] = useState(null);

  const updateChild = (idx, newNode) => {
    const next = [...node.nodes];
    next[idx] = newNode;
    onChange({ ...node, nodes: next });
  };

  const addNode = (n) => onChange({ ...node, nodes: [...node.nodes, n] });

  const removeIdx = (idx) => onChange({ ...node, nodes: node.nodes.filter((_,i)=>i!==idx) });

  const move = (idx, dir) => {
    const j = idx + dir;
    if (j<0 || j>=node.nodes.length) return;
    const next = [...node.nodes];
    const t = next[idx];
    next[idx] = next[j];
    next[j] = t;
    onChange({...node, nodes: next});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <ToggleChip label="Capturing" checked={node.capturing} onChange={(v)=>onChange({...node, capturing: v, name: v? node.name : undefined})} />
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300">Name</label>
          <input className="input" value={node.name ?? ""} onChange={(e)=>onChange({...node, name: e.target.value || undefined, capturing: true})} placeholder="optional (JS named group)" />
        </div>
      </div>

      <Palette onAdd={addNode} minimal />

      <div className="space-y-2">
        {node.nodes.length===0 && <div className="text-sm text-slate-400">No items yet. Add building blocks above.</div>}
        {node.nodes.map((child, idx)=> (
          <div key={child.id} className="flex items-center justify-between bg-slate-800/60 rounded-xl p-2 border border-slate-700">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>{child.type}</Badge>
              <div className="text-sm text-slate-100">{summarizeNode(child)}</div>
            </div>
            <div className="flex items-center gap-1">
              <IconBtn title="Move up" onClick={()=>move(idx,-1)}>↑</IconBtn>
              <IconBtn title="Move down" onClick={()=>move(idx,1)}>↓</IconBtn>
              <IconBtn title="Edit" onClick={()=>setEditingIdx(idx)}>✎</IconBtn>
              <IconBtn title="Delete" onClick={()=>removeIdx(idx)}>🗑</IconBtn>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-sm text-slate-300 mb-1">Quantifier (applies to the WHOLE group)</div>
        <QuantEditor q={node.quant ?? defaultQuant} onChange={(q)=>onChange({...node, quant:q})} />
      </div>

      {editingIdx!==null && (
        <InlineEditor node={node.nodes[editingIdx]} onChange={(n)=>updateChild(editingIdx, n)} onClose={()=>setEditingIdx(null)} />
      )}
    </div>
  );
};

const AlternationEditor = ({ node, onChange }) => {
  const addBranch = () => onChange({ ...node, branches: [...node.branches, []] });
  const addToBranch = (i, n) => {
    const next = node.branches.map((b, idx)=> idx===i? [...b, n] : b);
    onChange({ ...node, branches: next });
  };
  const updateInBranch = (i, j, n) => {
    const next = node.branches.map((b, idx)=> idx===i? b.map((x,k)=>k===j?n:x) : b);
    onChange({ ...node, branches: next });
  };
  const removeInBranch = (i, j) => {
    const next = node.branches.map((b, idx)=> idx===i? b.filter((_,k)=>k!==j) : b);
    onChange({ ...node, branches: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={addBranch} className="btn">+ Add option</button>
        <span className="text-xs text-slate-400">Each option is a sequence of blocks; regex will be (?:opt1|opt2|...)</span>
      </div>

      {node.branches.length===0 && <div className="text-sm text-slate-400">No options yet.</div>}

      <div className="space-y-4">
        {node.branches.map((branch, i)=> (
          <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-2">
            <div className="text-slate-200 font-medium mb-1">Option {i+1}</div>
            <Palette onAdd={(n)=>addToBranch(i,n)} minimal />
            {branch.length===0 && <div className="text-sm text-slate-400">Empty option</div>}
            {branch.map((bn, j)=> (
              <div key={bn.id} className="flex items-center justify-between bg-slate-900/60 rounded-lg p-2 border border-slate-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{bn.type}</Badge>
                  <div className="text-sm text-slate-100">{summarizeNode(bn)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <IconBtn title="Edit" onClick={()=>{
                    // inline pop modal editor
                    const close = () => setShow(false);
                    setShow(true);
                    setInlineCfg({ target: {i,j}, node: bn, onSave: (newN)=> updateInBranch(i,j,newN), onClose: close });
                  }}>✎</IconBtn>
                  <IconBtn title="Delete" onClick={()=>removeInBranch(i,j)}>🗑</IconBtn>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div>
        <div className="text-sm text-slate-300 mb-1">Quantifier</div>
        <QuantEditor q={node.quant ?? defaultQuant} onChange={(q)=>onChange({...node, quant:q})} />
      </div>

      {show && inlineCfg && (
        <Modal title="Edit block" onClose={inlineCfg.onClose}>
          <NodeEditor node={inlineCfg.node} onChange={inlineCfg.onSave} />
        </Modal>
      )}
    </div>
  );

  // local state for inline editor
  const [show, setShow] = useState(false);
  const [inlineCfg, setInlineCfg] = useState(null);
};

const LookEditor = ({ node, onChange }) => {
  const setDir = (dir) => onChange({...node, direction: dir});
  const setPos = (pos) => onChange({...node, positive: pos});

  const updateChild = (idx, newNode) => {
    const next = [...node.nodes];
    next[idx] = newNode;
    onChange({ ...node, nodes: next });
  };

  const addNode = (n) => onChange({ ...node, nodes: [...node.nodes, n] });
  const removeIdx = (idx) => onChange({ ...node, nodes: node.nodes.filter((_,i)=>i!==idx) });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <ToggleChip label="Lookahead" checked={node.direction==='ahead'} onChange={(v)=>setDir(v?"ahead":"behind")} />
        <ToggleChip label="Lookbehind" checked={node.direction==='behind'} onChange={(v)=>setDir(v?"behind":"ahead")} />
        <ToggleChip label="Positive" checked={node.positive} onChange={(v)=>setPos(v)} />
        <ToggleChip label="Negative" checked={!node.positive} onChange={(v)=>setPos(!v)} />
        <span className="text-xs text-slate-400">Note: Lookbehind isn't supported in some older JS engines.</span>
      </div>
      <Palette onAdd={addNode} minimal />
      <div className="space-y-2">
        {node.nodes.length===0 && <div className="text-sm text-slate-400">Add inner blocks for the assertion.</div>}
        {node.nodes.map((child, idx)=> (
          <div key={child.id} className="flex items-center justify-between bg-slate-800/60 rounded-xl p-2 border border-slate-700">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>{child.type}</Badge>
              <div className="text-sm text-slate-100">{summarizeNode(child)}</div>
            </div>
            <div className="flex items-center gap-1">
              <IconBtn title="Edit" onClick={()=>setEditing(idx)}>✎</IconBtn>
              <IconBtn title="Delete" onClick={()=>removeIdx(idx)}>🗑</IconBtn>
            </div>
          </div>
        ))}
      </div>
      {editing!==null && (
        <InlineEditor node={node.nodes[editing]} onChange={(n)=>updateChild(editing, n)} onClose={()=>setEditing(null)} />
      )}
    </div>
  );

  const [editing, setEditing] = useState(null);
};

// Entry point used by Group/Look to edit a child node inside a modal
const InlineEditor = ({ node, onChange, onClose }) => (
  <Modal title={`Edit ${node.type}`} onClose={onClose}>
    <NodeEditor node={node} onChange={onChange} />
  </Modal>
);

const NodeEditor = ({ node, onChange }) => {
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
            <ToggleChip label="Start ^" checked={node.which==='start'} onChange={(v)=>onChange({...node, which: v?"start":"end"})} />
            <ToggleChip label="End $" checked={node.which==='end'} onChange={(v)=>onChange({...node, which: v?"end":"start"})} />
          </div>
        </div>
      );
    case "backref":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-300">Index</label>
              <input className="input w-24" type="number" min={1} value={node.ref.index ?? 1} onChange={(e)=>onChange({...node, ref:{ index: Number(e.target.value)||1 }})} />
            </div>
            <div className="text-xs text-slate-400">or</div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-300">Name</label>
              <input className="input" placeholder="groupName" value={node.ref.name ?? ""} onChange={(e)=>onChange({...node, ref:{ name: e.target.value || undefined }})} />
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-300 mb-1">Quantifier</div>
            <QuantEditor q={node.quant ?? defaultQuant} onChange={(q)=>onChange({...node, quant:q})} />
          </div>
        </div>
      );
    default:
      return null;
  }
};

// ------------------- Palette -------------------------------

const makeLiteral = () => ({ id: uid(), type: "literal", text: "abc", quant: {kind:"one"} });
const makePredef = (which) => ({ id: uid(), type: "predef", which, quant:{kind:"one"} });
const makeAnchor = (which) => ({ id: uid(), type: "anchor", which });
const makeBoundary = (which) => ({ id: uid(), type: "boundary", which, quant:{kind:"one"} });
const makeCharClass = () => ({ id: uid(), type: "charclass", payload:{ negate:false, sets:{az:false,AZ:false,d09:true,underscore:false,whitespace:false}, custom:""}, quant:{kind:"one"} });
const makeGroup = () => ({ id: uid(), type: "group", capturing:true, nodes:[], quant:{kind:"one"} });
const makeAlt = () => ({ id: uid(), type: "alternation", branches:[[]], quant:{kind:"one"} });
const makeLook = () => ({ id: uid(), type: "look", direction:"ahead", positive:true, nodes:[], quant:{kind:"one"} });
const makeBackref = () => ({ id: uid(), type: "backref", ref:{ index:1 }, quant:{kind:"one"} });

const Palette = ({ onAdd, minimal }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
    <button className="tile" onClick={()=>onAdd(makeLiteral())}>Literal<span>text</span></button>
    <button className="tile" onClick={()=>onAdd(makeCharClass())}>Character Set<span>[...]</span></button>
    <button className="tile" onClick={()=>onAdd(makePredef("digit"))}>Digits<span>\\d</span></button>
    <button className="tile" onClick={()=>onAdd(makePredef("word"))}>Word<span>\\w</span></button>
    <button className="tile" onClick={()=>onAdd(makePredef("space"))}>Whitespace<span>\\s</span></button>
    {!minimal && <button className="tile" onClick={()=>onAdd(makePredef("any"))}>Any char<span>.</span></button>}
    <button className="tile" onClick={()=>onAdd(makeBoundary("word"))}>Word boundary<span>\\b</span></button>
    <button className="tile" onClick={()=>onAdd(makeAnchor("start"))}>Start anchor<span>^</span></button>
    <button className="tile" onClick={()=>onAdd(makeAnchor("end"))}>End anchor<span>$</span></button>
    <button className="tile" onClick={()=>onAdd(makeGroup())}>Group<span>( )</span></button>
    <button className="tile" onClick={()=>onAdd(makeAlt())}>Alternation<span>|</span></button>
    {!minimal && <button className="tile" onClick={()=>onAdd(makeLook())}>Lookaround<span>?= ?!</span></button>}
    {!minimal && <button className="tile" onClick={()=>onAdd(makeBackref())}>Backref<span>\\1</span></button>}
  </div>
);

// ------------------- Tester / Highlighter -------------------

const computeMatches = (pattern, flags, text) => {
  try {
    const re = new RegExp(pattern, flags);
    const matches = [];
    if (flags.includes("g")) {
      let m;
      while ((m = re.exec(text))) {
        matches.push({ start: m.index, end: m.index + m[0].length, groups: (m.groups ?? Array.from(m).slice(1)) });
        if (m[0] === "") { // avoid infinite loops on zero-length
          re.lastIndex++;
        }
      }
    } else {
      const m = re.exec(text);
      if (m) matches.push({ start: m.index, end: m.index + m[0].length, groups: (m.groups ?? Array.from(m).slice(1)) });
    }
    return { matches };
  } catch (e) {
    return { error: e?.message || String(e), matches: [] };
  }
};

const highlightText = (text, ranges) => {
  if (ranges.length===0) return [<span key="full">{text}</span>];
  const out = [];
  let idx = 0;
  ranges.sort((a,b)=>a.start-b.start);
  for (const r of ranges) {
    if (idx < r.start) out.push(<span key={`n-${idx}-${r.start}`}>{text.slice(idx, r.start)}</span>);
    out.push(<mark key={`m-${r.start}-${r.end}`} className="bg-amber-300/60 text-black rounded px-0.5">{text.slice(r.start, r.end)}</mark>);
    idx = r.end;
  }
  if (idx < text.length) out.push(<span key={`t-${idx}`}>{text.slice(idx)}</span>);
  return out;
};

// ------------------- Sample Templates -----------------------

const sampleEmail = () => [
  makeAnchor("start"),
  { id: uid(), type: "group", capturing: true, nodes: [
    { id: uid(), type: "charclass", payload:{ negate:false, sets:{az:true,AZ:true,d09:true,underscore:true,whitespace:false}, custom:".+-"}, quant:{kind:"oneOrMore", greedy:true} },
  ], quant:{kind:"one"} },
  makeLiteral(), // default "abc" -> we'll override to "@"
  { id: uid(), type: "group", capturing: true, nodes: [
    { id: uid(), type: "charclass", payload:{ negate:false, sets:{az:true,AZ:true,d09:true,underscore:true,whitespace:false}, custom:"-"}, quant:{kind:"oneOrMore", greedy:true} },
    { id: uid(), type: "literal", text: ".", quant:{kind:"one"} },
    { id: uid(), type: "charclass", payload:{ negate:false, sets:{az:true,AZ:false,d09:false,underscore:false,whitespace:false}, custom:""}, quant:{kind:"atLeast", n:2, greedy:true} },
  ], quant:{kind:"one"} },
  makeAnchor("end"),
];

// ------------------- Main App -------------------------------

export default function RegexBuilderApp() {
  const [nodes, setNodes] = useState([ makeAnchor("start"), makeLiteral(), makeAnchor("end") ]);
  const [flags, setFlags] = useState({ g: true, i: true, m: false, s: false, u: false, y: false });
  const [testText, setTestText] = useState("Try your regex here. For example, test 123, test 456.");
  const [showExplain, setShowExplain] = useState(true);
  const [modalNode, setModalNode] = useState(null);

  // Ensure sample email uses '@' literal
  const applyEmailTemplate = () => {
    const t = sampleEmail();
    // fix the literal '@'
    const lit = t.find(n=>n.type==='literal');
    if (lit) lit.text = "@";
    setNodes(t);
    setFlags({ g:true, i:true, m:false, s:false, u:true, y:false });
  };

  const addNode = (n) => setNodes((prev)=>[...prev, n]);
  const removeNode = (idx) => setNodes((prev)=> prev.filter((_,i)=>i!==idx));
  const moveNode = (idx, dir) => setNodes((prev)=>{
    const j = idx + dir; if (j<0 || j>=prev.length) return prev;
    const arr = [...prev]; const t = arr[idx]; arr[idx] = arr[j]; arr[j] = t; return arr;
  });
  const updateNode = (idx, n) => setNodes((prev)=> prev.map((x,i)=> i===idx?n:x));

  const pattern = useMemo(()=> nodes.map(nodeToPattern).join("") , [nodes]);
  const flagsStr = useMemo(()=> Object.entries(flags).filter(([,v])=>v).map(([k])=>k).join("") , [flags]);

  const { error, matches } = useMemo(()=> computeMatches(pattern, flagsStr, testText), [pattern, flagsStr, testText]);

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); alert("Copied!"); } catch { /* ignore */ }
  };

  const explain = () => nodes.map((n, i)=> `${i+1}. ${summarizeNode(n)}`).join("\n");

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      {/* Tailwind handles styling via src/index.css */}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Regex Builder</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="pill" onClick={applyEmailTemplate}>✨ Email template</button>
            <button className="pill" onClick={()=>{
              setNodes([ makeAnchor("start"), makeLiteral(), makeAnchor("end") ]);
              setFlags({ g:true, i:true, m:false, s:false, u:false, y:false });
            }}>↺ Reset</button>
            <button className="pill" onClick={()=>setShowExplain(!showExplain)}>{showExplain?"Hide":"Show"} explain</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left: Palette */}
          <Section title="Building blocks">
            <Palette onAdd={addNode} />
            <div className="mt-3 text-xs text-slate-400">
              Tip: Add blocks left-to-right to form your pattern. Edit blocks to set quantifiers (how many), names, and options.
            </div>
          </Section>

          {/* Middle: Sequence & Output */}
          <div className="lg:col-span-2 space-y-4">
            <Section title="Your pattern" right={<Flags flags={flags} setFlags={setFlags} />}>
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-emerald-300 text-sm overflow-x-auto whitespace-pre">
                      /{pattern || ""}/{flagsStr || ""}
                    </code>
                    <button className="btn" onClick={()=>copy(`/${pattern}/${flagsStr}`)}>Copy regex</button>
                    <button className="pill" onClick={()=>copy(pattern)}>Copy pattern only</button>
                    <button className="pill" onClick={()=>copy(flagsStr)}>Copy flags</button>
                  </div>
                  {error && <div className="text-sm text-rose-400">⚠️ Error: {error}</div>}
                </div>

                <div className="space-y-2">
                  {nodes.length===0 && <div className="text-sm text-slate-400">No blocks yet. Add from the left panel.</div>}
                  {nodes.map((n, idx)=> (
                    <div key={n.id} className="flex items-center justify-between bg-slate-800/60 rounded-xl p-2 border border-slate-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge title={n.type}>{n.type}</Badge>
                        <div className="text-sm text-slate-100">{summarizeNode(n)}</div>
                        <code className="text-xs bg-slate-900/70 border border-slate-700 rounded px-1.5 py-0.5">{nodeToPattern(n)}</code>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconBtn title="Move up" onClick={()=>moveNode(idx,-1)}>↑</IconBtn>
                        <IconBtn title="Move down" onClick={()=>moveNode(idx,1)}>↓</IconBtn>
                        <IconBtn title="Edit" onClick={()=>setModalNode({idx})}>✎</IconBtn>
                        <IconBtn title="Delete" onClick={()=>removeNode(idx)}>🗑</IconBtn>
                      </div>
                    </div>
                  ))}
                </div>

                {showExplain && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 whitespace-pre-wrap">
                    {nodes.length? explain(): "Add blocks to see an explanation."}
                  </div>
                )}
              </div>
            </Section>

            <Section title="Test against a string">
              <div className="space-y-3">
                <textarea className="input min-h-[120px]" value={testText} onChange={(e)=>setTestText(e.target.value)} />
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-base leading-relaxed">
                  {highlightText(testText, matches.map(m=>({start:m.start, end:m.end})))}
                </div>
                <div className="text-sm text-slate-300">{matches.length} match{matches.length!==1?"es":""}.
                  <span className="opacity-70"> (Switch on <code>g</code> to find all)</span>
                </div>
                {/* Groups table */}
                {matches.length>0 && (
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
                        {matches.map((m, i)=> (
                          <tr key={i} className="odd:bg-slate-900/40">
                            <td className="px-2 py-1">{i+1}</td>
                            <td className="px-2 py-1">[{m.start}, {m.end})</td>
                            <td className="px-2 py-1"><code className="bg-slate-900/70 border border-slate-800 rounded px-1.5 py-0.5">{testText.slice(m.start, m.end)}</code></td>
                            <td className="px-2 py-1">
                              {Array.isArray(m.groups)
                                ? (m.groups.length? m.groups.map((g,gi)=> <span key={gi} className="pill mr-1">{gi+1}:{g??"<null>"}</span>) : <span className="text-slate-400">—</span>)
                                : Object.keys(m.groups).length? Object.entries(m.groups).map(([k,v])=> <span key={k} className="pill mr-1">{k}:{v}</span>) : <span className="text-slate-400">—</span>
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
        <Modal title={`Edit block #${modalNode.idx+1}`} onClose={()=>setModalNode(null)}>
          <NodeEditor node={nodes[modalNode.idx]} onChange={(n)=>updateNode(modalNode.idx, n)} />
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
    {([
      {k:"g", desc:"global (find all)"},
      {k:"i", desc:"ignore case"},
      {k:"m", desc:"multiline ^ $"},
      {k:"s", desc:"dotAll enables . to match newline"},
      {k:"u", desc:"unicode"},
      {k:"y", desc:"sticky"},
    ]).map(({k, desc})=> (
      <label key={k} className="pill cursor-pointer select-none">
        <input type="checkbox" className="mr-1" checked={flags[k]} onChange={(e)=>setFlags({...flags, [k]:e.target.checked})} />
        <span className="uppercase font-semibold">{k}</span>
        <span className="opacity-70">{desc}</span>
      </label>
    ))}
  </div>
);
