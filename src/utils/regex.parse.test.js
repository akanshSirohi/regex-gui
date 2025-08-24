import { describe, it, expect } from "vitest";
import { parseRegex, nodeToPattern } from "./regex.jsx";

const strip = (nodes) =>
  nodes.map(({ id, nodes, branches, ...rest }) => ({
    ...rest,
    ...(nodes ? { nodes: strip(nodes) } : {}),
    ...(branches ? { branches: branches.map(strip) } : {}),
  }));

describe("parseRegex", () => {
  it("parses literals", () => {
    const { nodes } = parseRegex("abc", "");
    expect(strip(nodes)).toEqual([
      { type: "literal", text: "abc", quant: { kind: "one" } },
    ]);
  });

  it("parses groups and alternation", () => {
    const { nodes } = parseRegex("(a|b)", "");
    expect(strip(nodes)).toEqual([
      {
        type: "group",
        capturing: true,
        nodes: [
          {
            type: "alternation",
            branches: [[{ type: "literal", text: "a", quant: { kind: "one" } }], [{ type: "literal", text: "b", quant: { kind: "one" } }]],
            quant: { kind: "one" },
          },
        ],
        quant: { kind: "one" },
      },
    ]);
  });

  it("parses quantifiers", () => {
    const { nodes } = parseRegex("a{2,3}", "");
    expect(strip(nodes)).toEqual([
      { type: "literal", text: "a", quant: { kind: "range", min: 2, max: 3, greedy: true } },
    ]);
  });

  it("parses lookarounds", () => {
    const { nodes } = parseRegex("(?=a)b", "");
    expect(strip(nodes)).toEqual([
      {
        type: "look",
        direction: "ahead",
        positive: true,
        nodes: [{ type: "literal", text: "a", quant: { kind: "one" } }],
        quant: { kind: "one" },
      },
      { type: "literal", text: "b", quant: { kind: "one" } },
    ]);
  });

  it("parses character classes without adding digits", () => {
    const { nodes } = parseRegex("([A-Z])\\w+", "");
    const group = nodes[0];
    const cc = group.nodes[0];
    expect(cc.payload.sets).toEqual({
      az: false,
      AZ: true,
      d09: false,
      underscore: false,
      whitespace: false,
    });
  });

  it("preserves complex character class ranges", () => {
    const pattern = "([13][a-km-zA-HJ-NP-Z0-9]{26,33})";
    const { nodes } = parseRegex(pattern, "g");
    const round = nodes.map(nodeToPattern).join("");
    expect(round).toEqual(pattern);
  });
});
