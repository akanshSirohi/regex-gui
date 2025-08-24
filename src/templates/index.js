import { makeAnchor, makeGroup, makeCharClass, makeLiteral, makePredef, makeLook } from "../utils/nodes.js";

// Helper to create a digit class with quantifier
const digits = (quant) => {
  const c = makeCharClass();
  c.payload = { negate: false, sets: { az: false, AZ: false, d09: true, underscore: false, whitespace: false }, custom: "" };
  c.quant = quant;
  return c;
};

// Helper to create a letter class (lowercase)
const lower = (quant) => {
  const c = makeCharClass();
  c.payload = { negate: false, sets: { az: true, AZ: false, d09: false, underscore: false, whitespace: false }, custom: "" };
  c.quant = quant;
  return c;
};

// Helper to create a letter class (uppercase)
const upper = (quant) => {
  const c = makeCharClass();
  c.payload = { negate: false, sets: { az: false, AZ: true, d09: false, underscore: false, whitespace: false }, custom: "" };
  c.quant = quant;
  return c;
};

// Helper for generic char class
const charClass = (payload, quant) => {
  const c = makeCharClass();
  c.payload = { negate: false, sets: { az: false, AZ: false, d09: false, underscore: false, whitespace: false }, custom: "", ...payload };
  c.quant = quant;
  return c;
};

const literal = (text, quant) => {
  const l = makeLiteral();
  l.text = text;
  if (quant) l.quant = quant;
  return l;
};

// Email address
const buildEmail = () => {
  const nodes = [];
  nodes.push(makeAnchor("start"));

  const local = makeGroup();
  const localChars = charClass(
    { sets: { az: true, AZ: true, d09: true, underscore: true, whitespace: false }, custom: ".+-" },
    { kind: "oneOrMore", greedy: true }
  );
  local.nodes.push(localChars);
  nodes.push(local);

  nodes.push(literal("@"));

  const domain = makeGroup();
  const domainChars = charClass(
    { sets: { az: true, AZ: true, d09: true, underscore: true }, custom: "-" },
    { kind: "oneOrMore", greedy: true }
  );
  domain.nodes.push(domainChars);
  domain.nodes.push(literal("."));
  const tld = charClass(
    { sets: { az: true } },
    { kind: "atLeast", n: 2, greedy: true }
  );
  domain.nodes.push(tld);
  nodes.push(domain);
  nodes.push(makeAnchor("end"));

  const flags = { g: true, i: true, m: false, s: false, u: true, y: false };
  const testText = "Contact me at user@example.com";
  return { nodes, flags, testText };
};

// Phone number ###-###-####
const buildPhone = () => {
  const nodes = [];
  nodes.push(makeAnchor("start"));
  nodes.push(digits({ kind: "exact", n: 3, greedy: true }));
  nodes.push(literal("-"));
  nodes.push(digits({ kind: "exact", n: 3, greedy: true }));
  nodes.push(literal("-"));
  nodes.push(digits({ kind: "exact", n: 4, greedy: true }));
  nodes.push(makeAnchor("end"));
  const flags = { g: true, i: false, m: false, s: false, u: false, y: false };
  const testText = "Call 123-456-7890 today";
  return { nodes, flags, testText };
};

// URL http(s)://domain.tld
const buildURL = () => {
  const nodes = [];
  nodes.push(makeAnchor("start"));
  nodes.push(literal("http"));
  const s = literal("s");
  s.quant = { kind: "zeroOrOne", greedy: true };
  nodes.push(s);
  nodes.push(literal("://"));
  const host = charClass(
    { sets: { az: true, AZ: true, d09: true, underscore: true }, custom: "-." },
    { kind: "oneOrMore", greedy: true }
  );
  nodes.push(host);
  nodes.push(literal("."));
  const tld = charClass(
    { sets: { az: true, AZ: true } },
    { kind: "atLeast", n: 2, greedy: true }
  );
  nodes.push(tld);
  nodes.push(makeAnchor("end"));
  const flags = { g: true, i: true, m: false, s: false, u: false, y: false };
  const testText = "Visit https://example.com for more";
  return { nodes, flags, testText };
};

// IPv4 address
const buildIPv4 = () => {
  const nodes = [];
  nodes.push(makeAnchor("start"));
  const seg = makeGroup();
  seg.nodes.push(digits({ kind: "range", min: 1, max: 3, greedy: true }));
  seg.nodes.push(literal("."));
  seg.quant = { kind: "exact", n: 3, greedy: true };
  nodes.push(seg);
  nodes.push(digits({ kind: "range", min: 1, max: 3, greedy: true }));
  nodes.push(makeAnchor("end"));
  const flags = { g: true, i: false, m: false, s: false, u: false, y: false };
  const testText = "Valid IP 192.168.0.1 inside";
  return { nodes, flags, testText };
};

// Date YYYY-MM-DD
const buildDate = () => {
  const nodes = [];
  nodes.push(makeAnchor("start"));
  nodes.push(digits({ kind: "exact", n: 4, greedy: true }));
  nodes.push(literal("-"));
  nodes.push(digits({ kind: "exact", n: 2, greedy: true }));
  nodes.push(literal("-"));
  nodes.push(digits({ kind: "exact", n: 2, greedy: true }));
  nodes.push(makeAnchor("end"));
  const flags = { g: true, i: false, m: false, s: false, u: false, y: false };
  const testText = "Date 2024-01-31";
  return { nodes, flags, testText };
};

// Time HH:MM
const buildTime = () => {
  const nodes = [];
  nodes.push(makeAnchor("start"));
  nodes.push(digits({ kind: "exact", n: 2, greedy: true }));
  nodes.push(literal(":"));
  nodes.push(digits({ kind: "exact", n: 2, greedy: true }));
  nodes.push(makeAnchor("end"));
  const flags = { g: true, i: false, m: false, s: false, u: false, y: false };
  const testText = "Time 09:45";
  return { nodes, flags, testText };
};

// Credit card (simple) ####-####-####-####
const buildCreditCard = () => {
  const nodes = [];
  nodes.push(makeAnchor("start"));
  const block = makeGroup();
  block.nodes.push(digits({ kind: "exact", n: 4, greedy: true }));
  const sep = charClass({ custom: "- " }, { kind: "zeroOrOne", greedy: true });
  block.nodes.push(sep);
  block.quant = { kind: "exact", n: 3, greedy: true };
  nodes.push(block);
  nodes.push(digits({ kind: "exact", n: 4, greedy: true }));
  nodes.push(makeAnchor("end"));
  const flags = { g: true, i: false, m: false, s: false, u: false, y: false };
  const testText = "Card 1234-5678-9012-3456";
  return { nodes, flags, testText };
};

// Hex color #fff or #ffffff
const buildHexColor = () => {
  const nodes = [];
  nodes.push(makeAnchor("start"));
  nodes.push(literal("#"));
  const triplet = makeGroup();
  const hex = charClass({ sets: { az: true, AZ: true, d09: true } }, { kind: "exact", n: 3, greedy: true });
  triplet.nodes.push(hex);
  triplet.quant = { kind: "range", min: 1, max: 2, greedy: true };
  nodes.push(triplet);
  nodes.push(makeAnchor("end"));
  const flags = { g: true, i: true, m: false, s: false, u: false, y: false };
  const testText = "Colors #fff and #112233";
  return { nodes, flags, testText };
};

// Username 3-16 word chars/underscore
const buildUsername = () => {
  const nodes = [];
  nodes.push(makeAnchor("start"));
  const body = charClass(
    { sets: { az: true, AZ: true, d09: true, underscore: true } },
    { kind: "range", min: 3, max: 16, greedy: true }
  );
  nodes.push(body);
  nodes.push(makeAnchor("end"));
  const flags = { g: true, i: false, m: false, s: false, u: false, y: false };
  const testText = "User names: test_user";
  return { nodes, flags, testText };
};

// Password with at least one lower, upper and digit
const buildPassword = () => {
  const nodes = [];
  nodes.push(makeAnchor("start"));
  const lookLower = makeLook();
  lookLower.nodes.push(makePredef("any"));
  lookLower.nodes[0].quant = { kind: "zeroOrMore", greedy: true };
  lookLower.nodes.push(lower({ kind: "one", greedy: true }));
  const lookUpper = makeLook();
  lookUpper.nodes.push(makePredef("any"));
  lookUpper.nodes[0].quant = { kind: "zeroOrMore", greedy: true };
  lookUpper.nodes.push(upper({ kind: "one", greedy: true }));
  const lookDigit = makeLook();
  lookDigit.nodes.push(makePredef("any"));
  lookDigit.nodes[0].quant = { kind: "zeroOrMore", greedy: true };
  lookDigit.nodes.push(digits({ kind: "one", greedy: true }));
  nodes.push(lookLower);
  nodes.push(lookUpper);
  nodes.push(lookDigit);
  nodes.push(makePredef("any"));
  nodes[nodes.length - 1].quant = { kind: "atLeast", n: 8, greedy: true };
  nodes.push(makeAnchor("end"));
  const flags = { g: true, i: false, m: false, s: false, u: false, y: false };
  const testText = "Try Abc12345 as strong";
  return { nodes, flags, testText };
};

// Export templates array
export const templates = [
  { id: "email", title: "Email", description: "Basic email address", build: buildEmail },
  { id: "phone", title: "Phone", description: "US phone number", build: buildPhone },
  { id: "url", title: "URL", description: "HTTP/HTTPS link", build: buildURL },
  { id: "ipv4", title: "IPv4", description: "IPv4 address", build: buildIPv4 },
  { id: "date", title: "Date", description: "YYYY-MM-DD", build: buildDate },
  { id: "time", title: "Time", description: "HH:MM", build: buildTime },
  { id: "cc", title: "Credit card", description: "16 digit card", build: buildCreditCard },
  { id: "hex", title: "Hex color", description: "#rgb or #rrggbb", build: buildHexColor },
  { id: "user", title: "Username", description: "3-16 word chars", build: buildUsername },
  { id: "pass", title: "Password", description: "At least 8 chars with mix", build: buildPassword },
];

