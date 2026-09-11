import type { ReactNode } from "react";
import { exampleAnswer } from "../game/index";
import type { CellState, Puzzle } from "../types";

interface Props {
  puzzle: Puzzle;
  cells: CellState[][];
  revealed: boolean;
  onCellClick: (row: number, col: number) => void;
  /** Rendered as a trailing row spanning the 3 cell columns (not the
   * row-label column) — using the board's own grid instead of a lookalike
   * one elsewhere guarantees pixel-exact alignment under the cells. */
  footer?: ReactNode;
}

function HeaderLabel({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center p-1 text-center text-xs font-semibold leading-tight text-slate-700 dark:text-slate-200 sm:text-sm">
      {text}
    </div>
  );
}

export function Board({ puzzle, cells, revealed, onCellClick, footer }: Props) {
  return (
    <div className="grid grid-cols-[minmax(68px,0.7fr)_repeat(3,1fr)] gap-0.5 sm:gap-1">
      <div />
      {puzzle.cols.map((c) => (
        <HeaderLabel key={c.id} text={c.label} />
      ))}

      {puzzle.rows.map((row, r) => (
        <div key={row.id} className="contents">
          <HeaderLabel text={row.label} />
          {puzzle.cols.map((col, c) => {
            const cell = cells[r][c];
            const candidateCount = puzzle.cellCandidates[r][c].length;
            const base =
              "relative flex aspect-square flex-col items-center justify-center border border-slate-300 dark:border-slate-700 p-1 text-center transition";
            if (cell.status === "empty") {
              const example = revealed
                ? exampleAnswer(row, col, puzzle.cellCandidates[r][c])
                : null;
              return (
                <button
                  key={col.id}
                  onClick={() => onCellClick(r, c)}
                  disabled={revealed}
                  className={`${base} ${
                    example
                      ? "bg-slate-50 dark:bg-slate-800/60"
                      : "bg-white hover:bg-indigo-50 disabled:cursor-default disabled:hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:disabled:hover:bg-slate-800"
                  }`}
                >
                  {example && (
                    <>
                      <span className="text-xs font-semibold text-slate-500 sm:text-sm dark:text-slate-300">
                        {example.name}
                      </span>
                      <span className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                        {example.game}
                      </span>
                      {candidateCount > 1 && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          +{candidateCount - 1} more
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            }
            return (
              <div key={col.id} className={`${base} bg-emerald-50 dark:bg-emerald-900/40`}>
                <span className="absolute right-1 top-1 text-xs text-emerald-600 dark:text-emerald-400">
                  ✓
                </span>
                <span className="text-xs font-semibold text-emerald-900 sm:text-sm dark:text-emerald-50">
                  {cell.name}
                </span>
                {revealed && (
                  <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {candidateCount} possible
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {footer && (
        <div className="col-span-3 col-start-2 flex justify-center pt-4">
          {footer}
        </div>
      )}
    </div>
  );
}
