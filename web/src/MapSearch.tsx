import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Clock, MapPin, Search } from "lucide-react";
import { useDash } from "./context";

/** Lower-case and strip accents so "Bengalúru" and "bengaluru" match. */
const norm = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

// Other spellings people type for the regions that exist.
const ALIASES: Record<string, string[]> = {
  bangalore: ["bengaluru", "bangalore", "blr"],
  koshi: ["koshi", "kosi", "madhesh"],
  kathmandu: ["kathmandu", "ktm"],
};

/**
 * Location search on the map. A dropdown of the available regions that you can also type into.
 * Only real regions ever appear; anything else shows a "more locations soon" note.
 */
export default function MapSearch() {
  const d = useDash();
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);

  const query = norm(text);
  const matches = useMemo(() => {
    if (!typing || !query) return d.cities;
    return d.cities.filter((row) =>
      [row.name, row.id, ...(ALIASES[row.id] || [])].some((word) => norm(word).includes(query))
    );
  }, [d.cities, query, typing]);

  useEffect(() => setActive(0), [query, open]);

  // close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  });

  function close() {
    setOpen(false);
    setTyping(false);
    setText("");
  }

  function choose(id: string) {
    if (id !== d.city) d.setCity(id);
    close();
    input.current?.blur();
  }

  const shown = typing ? text : d.cityName;
  const noMatch = typing && query !== "" && matches.length === 0;

  return (
    <div className="map-search" ref={box}>
      <div className={`ms-field ${open ? "open" : ""}`}>
        <Search size={16} aria-hidden />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label="Search a location"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search a location"
          value={shown}
          onFocus={(event) => {
            setOpen(true);
            event.currentTarget.select();
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setTyping(true);
            setText(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, Math.max(0, matches.length - 1)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (matches[active]) choose(matches[active].id);
            } else if (event.key === "Escape") {
              close();
              input.current?.blur();
            }
          }}
        />
        <button
          type="button"
          className="ms-toggle"
          aria-label={open ? "Close the list of locations" : "Show the list of locations"}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) close();
            else {
              setOpen(true);
              input.current?.focus();
            }
          }}
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {open && (
        <div className="ms-menu">
          {noMatch ? (
            <p className="ms-empty" role="status">
              <Clock size={15} aria-hidden /> More locations are being added soon.
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Locations">
              {matches.map((row, index) => (
                <li
                  key={row.id}
                  role="option"
                  aria-selected={row.id === d.city}
                  className={`${index === active ? "active" : ""} ${row.id === d.city ? "current" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(row.id)}
                >
                  <MapPin size={15} aria-hidden />
                  <span>{row.name}</span>
                  {row.id === d.city && <Check size={15} aria-label="Current location" />}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
