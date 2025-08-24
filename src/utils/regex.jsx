// Regex utilities and rendering helpers (JSX)

export const escapeLiteral = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, (m) => `\\${m}`);

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

