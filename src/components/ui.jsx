import React from "react";

export const Badge = ({ children, title }) => (
  <span title={title} className="inline-flex items-center rounded-full bg-slate-800/70 text-slate-100 px-2 py-0.5 text-xs">
    {children}
  </span>
);

export const Section = ({ title, right, children }) => (
  <div className="bg-slate-900/60 backdrop-blur rounded-2xl p-4 shadow-lg border border-slate-800">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-slate-200 font-semibold tracking-wide">{title}</h2>
      {right}
    </div>
    {children}
  </div>
);

export const ToggleChip = ({ label, checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`px-2.5 py-1 rounded-full text-xs border transition ${checked ? "bg-emerald-600/80 border-emerald-400 text-white" : "bg-slate-800/70 border-slate-600 text-slate-300 hover:bg-slate-700"}`}
  >
    {label}
  </button>
);

export const IconBtn = ({ title, onClick, children }) => (
  <button title={title} onClick={onClick} className="p-1.5 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-200 border border-slate-700">
    {children}
  </button>
);

export const Modal = ({ title, onClose, children }) => (
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

