import React, { useState, useRef, useEffect } from "react";
import { FaMagic } from "react-icons/fa";

export default function TemplateDropdown({ templates, onSelect }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [open]);

  const toggle = () => setOpen((o) => !o);

  const choose = (t) => {
    setOpen(false);
    setHighlight(0);
    onSelect(t.build());
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % templates.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + templates.length) % templates.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(templates[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref} onKeyDown={onKeyDown}>
      <button className="pill" onClick={toggle} aria-haspopup="listbox" aria-expanded={open}>
        <FaMagic /> Templates
      </button>
      {open && (
        <ul
          className="absolute z-10 mt-1 w-52 max-h-60 overflow-auto bg-slate-900/90 border border-slate-700 rounded-xl p-1 shadow-lg"
          role="listbox"
        >
          {templates.map((t, i) => (
            <li key={t.id}>
              <button
                className={`tile w-full text-left ${highlight === i ? "bg-slate-700" : ""}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(t)}
                role="option"
                aria-selected={highlight === i}
              >
                {t.title}
                <span>{t.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

