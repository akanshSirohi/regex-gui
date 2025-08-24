import React, { useState } from "react";
import { Modal } from "./ui.jsx";
import { parseRegex } from "../utils/regex.jsx";

export default function ImportRegexModal({ onClose, onImport }) {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const res = parseRegex(pattern, flags);
      onImport(res);
      onClose();
    } catch (err) {
      setError(err?.message || String(err));
    }
  };

  return (
    <Modal title="Import regex" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-300">Pattern</label>
          <input className="input" value={pattern} onChange={(e) => setPattern(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-300">Flags</label>
          <input className="input" value={flags} onChange={(e) => setFlags(e.target.value)} />
        </div>
        {error && <div className="text-sm text-rose-400">{error}</div>}
        <div className="flex items-center gap-2 justify-end">
          <button type="button" className="pill" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn">
            Import
          </button>
        </div>
      </form>
    </Modal>
  );
}
