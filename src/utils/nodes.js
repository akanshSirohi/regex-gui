// Node factories and IDs

export const uid = () => Math.random().toString(36).slice(2);

export const makeLiteral = () => ({ id: uid(), type: "literal", text: "abc", quant: { kind: "one" } });
export const makePredef = (which) => ({ id: uid(), type: "predef", which, quant: { kind: "one" } });
export const makeAnchor = (which) => ({ id: uid(), type: "anchor", which });
export const makeBoundary = (which) => ({ id: uid(), type: "boundary", which, quant: { kind: "one" } });
export const makeCharClass = () => ({ id: uid(), type: "charclass", payload: { negate: false, sets: { az: false, AZ: false, d09: false, underscore: false, whitespace: false }, custom: "" }, quant: { kind: "one" } });
export const makeGroup = () => ({ id: uid(), type: "group", capturing: true, nodes: [], quant: { kind: "one" } });
export const makeAlt = () => ({ id: uid(), type: "alternation", branches: [[]], quant: { kind: "one" } });
export const makeLook = () => ({ id: uid(), type: "look", direction: "ahead", positive: true, nodes: [], quant: { kind: "one" } });
export const makeBackref = () => ({ id: uid(), type: "backref", ref: { index: 1 }, quant: { kind: "one" } });

