import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_NAMES, RECORDS_BY_NAME } from "../game/index";

interface Props {
  rowLabel: string;
  colLabel: string;
  guessesLeft: number;
  /** increments in the parent on every wrong guess; drives the shake + counter pulse */
  wrongTick: number;
  onPick: (name: string) => void;
  onClose: () => void;
}

export function SearchModal({
  rowLabel,
  colLabel,
  guessesLeft,
  wrongTick,
  onPick,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [pulse, setPulse] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const firstTick = useRef(wrongTick);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // React to a wrong guess reported by the parent: shake the box, pulse the
  // guess counter, clear the selection. No error text.
  useEffect(() => {
    if (wrongTick === firstTick.current) return;
    setSelected(null);
    setShake(true);
    setPulse(true);
    inputRef.current?.focus();
    const t1 = setTimeout(() => setShake(false), 320);
    const t2 = setTimeout(() => setPulse(false), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrongTick]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_NAMES.filter((n) => n.toLowerCase().includes(q)).slice(0, 40);
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-slate-800 ${
          shake ? "animate-shake" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {rowLabel}
              </span>{" "}
              &times;{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {colLabel}
              </span>
            </p>
            <p className="whitespace-nowrap text-xs text-slate-400">
              Guesses left:{" "}
              <span
                className={`inline-block font-semibold transition-all duration-200 ${
                  pulse
                    ? "scale-150 text-rose-500"
                    : "scale-100 text-slate-500 dark:text-slate-300"
                }`}
              >
                {guessesLeft}
              </span>
            </p>
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Search a character by name…"
            className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900"
          />
        </div>

        <ul className="max-h-72 overflow-y-auto">
          {matches.map((name) => {
            const games = RECORDS_BY_NAME.get(name)!.map((c) => c.game);
            const isSel = name === selected;
            return (
              <li key={name}>
                <button
                  onClick={() => setSelected(name)}
                  onDoubleClick={() => onPick(name)}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                    isSel
                      ? "bg-indigo-600 text-white"
                      : "hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="font-medium">{name}</span>
                  <span
                    className={`text-xs ${isSel ? "text-indigo-100" : "text-slate-400"}`}
                  >
                    {[...new Set(games)].join(", ")}
                  </span>
                </button>
              </li>
            );
          })}
          {query.trim() && matches.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-400">
              No characters found
            </li>
          )}
        </ul>

        <div className="flex justify-end gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            disabled={!selected}
            onClick={() => selected && onPick(selected)}
            className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Confirm{selected ? ` ${selected}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
