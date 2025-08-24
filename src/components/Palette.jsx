import React from "react";
import { makeLiteral, makeCharClass, makePredef, makeBoundary, makeAnchor, makeGroup, makeAlt, makeLook, makeBackref } from "../utils/nodes.js";

export default function Palette({ onAdd, minimal }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      <button className="tile" onClick={() => onAdd(makeLiteral())}>Literal<span>text</span></button>
      <button className="tile" onClick={() => onAdd(makeCharClass())}>Character Set<span>[...]</span></button>
      <button className="tile" onClick={() => onAdd(makePredef("digit"))}>Digits<span>\\d</span></button>
      <button className="tile" onClick={() => onAdd(makePredef("word"))}>Word<span>\\w</span></button>
      <button className="tile" onClick={() => onAdd(makePredef("space"))}>Whitespace<span>\\s</span></button>
      {!minimal && <button className="tile" onClick={() => onAdd(makePredef("any"))}>Any char<span>.</span></button>}
      <button className="tile" onClick={() => onAdd(makeBoundary("word"))}>Word boundary<span>\\b</span></button>
      <button className="tile" onClick={() => onAdd(makeAnchor("start"))}>Start anchor<span>^</span></button>
      <button className="tile" onClick={() => onAdd(makeAnchor("end"))}>End anchor<span>$</span></button>
      <button className="tile" onClick={() => onAdd(makeGroup())}>Group<span>( )</span></button>
      <button className="tile" onClick={() => onAdd(makeAlt())}>Alternation<span>|</span></button>
      {!minimal && <button className="tile" onClick={() => onAdd(makeLook())}>Lookaround<span>?= ?!</span></button>}
      {!minimal && <button className="tile" onClick={() => onAdd(makeBackref())}>Backref<span>\\1</span></button>}
    </div>
  );
}

