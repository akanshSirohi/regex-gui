// Regex utilities and rendering helpers (JSX)

import { parse as parseAst, generate } from "regexp-tree";
import {
  makeLiteral,
  makePredef,
  makeAnchor,
  makeBoundary,
  makeCharClass,
  makeGroup,
  makeAlt,
  makeLook,
  makeBackref,
} from "./nodes.js";

export const escapeLiteral = (s) => s.replace(/[.*+?^${}()|[\\]\\]/g, (m) => `\\${m}`);

export const escapeCharClass = (s) => s.replace(/[\\\]\-^]/g, (m) => `\\${m}`); // escape \\ ] - ^ inside []

export const quantToString = (q) => {
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

export const predefToString = (p) => ({ digit: "\\d", nondigit: "\\D", word: "\\w", nonword: "\\W", space: "\\s", nonspace: "\\S", any: "." }[p]);

export const renderCharClass = (cc) => {
  if (cc.raw) {
    return `[${cc.negate ? "^" : ""}${cc.raw}]`;
  }
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

export const nodeToPattern = (n) => {
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
      return `${n.which === "word" ? "\\b" : "\\B"}${quantToString(n.quant)}`;
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
      const quant = quantToString(n.quant);
      if (n.grouped || quant) {
        return `(?:${branches})${quant}`;
      }
      return branches;
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

export const summarizeNode = (n) => {
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

// Build a description tree for a node and its children
export const describeNodeTree = (node) => {
  const item = { id: node.id, label: summarizeNode(node) };
  if (node.type === "group" || node.type === "look") {
    item.children = node.nodes.map(describeNodeTree);
  } else if (node.type === "alternation") {
    item.children = node.branches.map((branch, i) => ({
      id: `${node.id}-b${i}`,
      label: `Option ${i + 1}`,
      children: branch.map(describeNodeTree),
    }));
  }
  return item;
};

export const defaultQuant = { kind: "one" };

export const computeMatches = (pattern, flags, text) => {
  try {
    const re = new RegExp(pattern, flags);
    const matches = [];
    if (flags.includes("g")) {
      let m;
      while ((m = re.exec(text))) {
        matches.push({ start: m.index, end: m.index + m[0].length, groups: m.groups ?? Array.from(m).slice(1) });
        if (m[0] === "") {
          re.lastIndex++;
        }
      }
    } else {
      const m = re.exec(text);
      if (m) matches.push({ start: m.index, end: m.index + m[0].length, groups: m.groups ?? Array.from(m).slice(1) });
    }
    return { matches };
  } catch (e) {
    return { error: e?.message || String(e), matches: [] };
  }
};

export const highlightText = (text, ranges) => {
  if (ranges.length === 0) return [<span key="full">{text}</span>];
  const out = [];
  let idx = 0;
  ranges.sort((a, b) => a.start - b.start);
  for (const r of ranges) {
    if (idx < r.start) out.push(<span key={`n-${idx}-${r.start}`}>{text.slice(idx, r.start)}</span>);
    out.push(
      <mark key={`m-${r.start}-${r.end}`} className="bg-amber-300/60 text-black rounded px-0.5">
        {text.slice(r.start, r.end)}
      </mark>
    );
    idx = r.end;
  }
  if (idx < text.length) out.push(<span key={`t-${idx}`}>{text.slice(idx)}</span>);
  return out;
};

// Parse a regex pattern/flags into the app's node representation
export const parseRegex = (pattern, flags = "") => {
  const flagObj = { g: false, i: false, m: false, s: false, u: false, y: false };
  for (const f of flags) if (flagObj.hasOwnProperty(f)) flagObj[f] = true;

  const ast = parseAst(new RegExp(pattern, flags));

  const quantFrom = (q) => {
    if (!q) return { kind: "one" };
    const greedy = q.greedy !== false;
    switch (q.kind) {
      case "+":
        return { kind: "oneOrMore", greedy };
      case "*":
        return { kind: "zeroOrMore", greedy };
      case "?":
        return { kind: "zeroOrOne", greedy };
      case "Range":
        if (q.from === q.to) return { kind: "exact", n: q.from, greedy };
        if (q.to === undefined || q.to === null) return { kind: "atLeast", n: q.from, greedy };
        return { kind: "range", min: q.from, max: q.to, greedy };
      default:
        return { kind: "one" };
    }
  };

  const convertCharClass = (n) => {
    const cc = makeCharClass();
    let body = generate(n);
    if (body.startsWith("[")) body = body.slice(1, -1);
    if (body.startsWith("^")) {
      cc.payload.negate = true;
      body = body.slice(1);
    }
    const rawBody = body;
    const remove = (token) => {
      if (body.includes(token)) {
        body = body.replace(token, "");
        return true;
      }
      return false;
    };
    if (remove("a-z")) cc.payload.sets.az = true;
    if (remove("A-Z")) cc.payload.sets.AZ = true;
    if (remove("0-9")) cc.payload.sets.d09 = true;
    if (remove("_")) cc.payload.sets.underscore = true;
    if (remove("\\s")) cc.payload.sets.whitespace = true;
    cc.payload.custom = body;
    cc.payload.raw = rawBody;
    return cc;
  };

  const convert = (node) => {
    switch (node.type) {
      case "Alternative":
        return convertSeq(node.expressions);
      case "Char": {
        if (node.kind === "meta") {
          const map = {
            "\\d": "digit",
            "\\D": "nondigit",
            "\\w": "word",
            "\\W": "nonword",
            "\\s": "space",
            "\\S": "nonspace",
            ".": "any",
          };
          const which = map[node.value];
          if (which) return [makePredef(which)];
        }
        const lit = makeLiteral();
        lit.text = node.value;
        return [lit];
      }
      case "Repetition": {
        const [child] = convert(node.expression);
        child.quant = quantFrom(node.quantifier);
        return [child];
      }
      case "Group": {
        const g = makeGroup();
        g.capturing = node.capturing !== false;
        if (node.name) g.name = node.name;
        g.nodes = node.expression ? convert(node.expression) : [];
        return [g];
      }
      case "Disjunction": {
        const branches = [];
        const collect = (n) => {
          if (n.type === "Disjunction") {
            collect(n.left);
            collect(n.right);
          } else if (n.type === "Alternative") {
            branches.push(convertSeq(n.expressions));
          } else {
            branches.push(convert(n));
          }
        };
        collect(node);
        const alt = makeAlt();
        alt.grouped = false;
        alt.branches = branches.map((b) => (Array.isArray(b) ? b : b));
        return [alt];
      }
      case "Assertion": {
        if (node.kind === "^") return [makeAnchor("start")];
        if (node.kind === "$") return [makeAnchor("end")];
        if (node.kind === "\\b") return [makeBoundary("word")];
        if (node.kind === "\\B") return [makeBoundary("nonword")];
        if (node.kind === "Lookahead" || node.kind === "Lookbehind") {
          const look = makeLook();
          look.direction = node.kind === "Lookahead" ? "ahead" : "behind";
          look.positive = !node.negative;
          look.nodes = node.assertion ? convert(node.assertion) : [];
          return [look];
        }
        return [];
      }
      case "CharacterClass": {
        return [convertCharClass(node)];
      }
      case "Backreference": {
        const br = makeBackref();
        br.ref = node.kind === "name" ? { name: node.reference } : { index: node.reference };
        return [br];
      }
      default:
        return [];
    }
  };

  const convertSeq = (exprs) => {
    const out = [];
    let buf = "";
    const flush = () => {
      if (buf) {
        const lit = makeLiteral();
        lit.text = buf;
        out.push(lit);
        buf = "";
      }
    };
    for (const e of exprs) {
      if (e.type === "Char" && e.kind === "simple") {
        buf += e.value;
        continue;
      }
      if (
        e.type === "Repetition" &&
        e.expression.type === "Char" &&
        e.expression.kind === "simple"
      ) {
        flush();
        const lit = makeLiteral();
        lit.text = e.expression.value;
        lit.quant = quantFrom(e.quantifier);
        out.push(lit);
        continue;
      }
      flush();
      out.push(...convert(e));
    }
    flush();
    return out;
  };

  const body = ast.body;
  const nodes = body.type === "Alternative" ? convertSeq(body.expressions) : convert(body);
  return { nodes, flags: flagObj };
};

