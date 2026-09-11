import { exampleAnswer } from "../game/index";
import type { CellState, Puzzle } from "../types";

interface Props {
  puzzle: Puzzle;
  cells: CellState[][];
  revealed: boolean;
  onCellClick: (row: number, col: number) => void;
}

function HeaderLabel({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center p-1 text-center text-xs font-semibold leading-tight text-slate-700 dark:text-slate-200 sm:text-sm">
      {text}
    </div>
  );
}

export function Board({ puzzle, cells, revealed, onCellClick }: Props) {
  return (
    <div className="grid grid-cols-[minmax(72px,0.7fr)_repeat(3,1fr)] gap-1 sm:gap-1.5">
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
              "relative flex aspect-square flex-col items-center justify-center rounded-md border p-1 text-center transition";
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
                      ? "border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/60"
                      : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50 disabled:cursor-default disabled:hover:border-slate-300 disabled:hover:bg-white dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                  }`}
                >
                  {example && (
                    <>
                      <span className="text-xs font-semibold text-slate-500 sm:text-sm dark:text-slate-300">
                        {example.name}
                      </span>
                      <span className="mt-0.5 text-[10px] text-slate-400">
                        {example.game}
                      </span>
                      {candidateCount > 1 && (
                        <span className="text-[10px] text-slate-400">
                          +{candidateCount - 1} more
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            }
            return (
              <div
                key={col.id}
                className={`${base} border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30`}
              >
                <span className="absolute right-1 top-1 text-xs text-emerald-600">
                  ✓
                </span>
                <span className="text-xs font-semibold sm:text-sm">
                  {cell.name}
                </span>
                {revealed && (
                  <span className="mt-0.5 text-[10px] text-slate-400">
                    {candidateCount} possible
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
