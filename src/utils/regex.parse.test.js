import { describe, it, expect } from "vitest";
import { parseRegex } from "./regex.jsx";

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
});
