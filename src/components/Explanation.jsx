import React, { useState } from "react";
import { describeNodeTree } from "../utils/regex.jsx";

const TreeNode = ({ node, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className="ml-2">
      <div className="flex items-center gap-1">
        {hasChildren && (
          <button
            className="text-xs text-slate-400"
            onClick={() => setOpen(!open)}
          >
            {open ? "▼" : "▶"}
          </button>
        )}
        <span>{node.label}</span>
      </div>
      {hasChildren && open && (
        <div className="ml-4 border-l border-slate-700 pl-2">
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function Explanation({ nodes }) {
  const tree = nodes.map(describeNodeTree);
  return (
    <div className="space-y-1">
      {tree.map((n) => (
        <TreeNode key={n.id} node={n} defaultOpen />
      ))}
    </div>
  );
}
