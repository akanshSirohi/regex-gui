import { makeAnchor, makeGroup, makeCharClass, makeLiteral } from "../utils/nodes.js";

export const sampleEmail = () => {
  const nodes = [];
  nodes.push(makeAnchor("start"));

  const localPart = makeGroup();
  const localCharSet = makeCharClass();
  localCharSet.payload = { negate: false, sets: { az: true, AZ: true, d09: true, underscore: true, whitespace: false }, custom: ".+-" };
  localCharSet.quant = { kind: "oneOrMore", greedy: true };
  localPart.nodes.push(localCharSet);
  nodes.push(localPart);

  const at = makeLiteral();
  at.text = "@";
  nodes.push(at);

  const domain = makeGroup();
  const domainChars = makeCharClass();
  domainChars.payload = { negate: false, sets: { az: true, AZ: true, d09: true, underscore: true, whitespace: false }, custom: "-" };
  domainChars.quant = { kind: "oneOrMore", greedy: true };
  domain.nodes.push(domainChars);

  const dot = makeLiteral();
  dot.text = ".";
  domain.nodes.push(dot);

  const tld = makeCharClass();
  tld.payload = { negate: false, sets: { az: true, AZ: false, d09: false, underscore: false, whitespace: false }, custom: "" };
  tld.quant = { kind: "atLeast", n: 2, greedy: true };
  domain.nodes.push(tld);

  nodes.push(domain);
  nodes.push(makeAnchor("end"));
  return nodes;
};

