import { useMemo, useReducer } from "react";
import { Board } from "./components/Board";
import { SearchModal } from "./components/SearchModal";
import { newRandomPuzzle } from "./game/generate";
import { checkGuess } from "./game/validate";
import type { CellState, Puzzle } from "./types";

const TOTAL_GUESSES = 9;

interface State {
  puzzle: Puzzle;
  cells: CellState[][];
  guessesLeft: number;
  usedNames: Set<string>;
  active: { row: number; col: number } | null;
  status: "playing" | "done";
  lastError: string | null;
  /** bumped on every wrong guess so the modal can re-fire its shake */
  wrongTick: number;
}

type Action =
  | { type: "newPuzzle" }
  | { type: "openCell"; row: number; col: number }
  | { type: "closeCell" }
  | { type: "guess"; name: string }
  | { type: "reveal" };

const emptyCells = (): CellState[][] =>
  Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => ({ status: "empty" }) as CellState),
  );

function init(): State {
  return {
    puzzle: newRandomPuzzle(),
    cells: emptyCells(),
    guessesLeft: TOTAL_GUESSES,
    usedNames: new Set(),
    active: null,
    status: "playing",
    lastError: null,
    wrongTick: 0,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "newPuzzle":
      return init();

    case "openCell":
      if (state.status !== "playing") return state;
      if (state.cells[action.row][action.col].status !== "empty") return state;
      return { ...state, active: { row: action.row, col: action.col }, lastError: null };

    case "closeCell":
      return { ...state, active: null };

    case "reveal":
      return { ...state, status: "done", active: null };

    case "guess": {
      if (!state.active) return state;
      const { row, col } = state.active;
      const result = checkGuess(state.puzzle, row, col, action.name, state.usedNames);

      // These don't cost a guess — just tell the player why nothing happened.
      if (result === "duplicate")
        return { ...state, lastError: `${action.name} is already on the board.` };
      if (result === "unknown")
        return { ...state, lastError: `No character named "${action.name}".` };

      const guessesLeft = state.guessesLeft - 1;
      const outOfGuesses = guessesLeft <= 0;

      if (result === "wrong") {
        // Cell stays open and unlocked; the guess still counts.
        return {
          ...state,
          guessesLeft,
          wrongTick: state.wrongTick + 1,
          active: outOfGuesses ? null : state.active,
          status: outOfGuesses ? "done" : "playing",
          lastError: null,
        };
      }

      const cells = state.cells.map((r) => r.slice());
      cells[row][col] = { status: "correct", name: action.name };
      const usedNames = new Set(state.usedNames).add(action.name);
      const filled = cells.every((r) => r.every((c) => c.status === "correct"));

      return {
        ...state,
        cells,
        usedNames,
        guessesLeft,
        active: null,
        status: outOfGuesses || filled ? "done" : "playing",
        lastError: null,
      };
    }
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const { puzzle, cells, guessesLeft, active, status } = state;

  const score = useMemo(
    () => cells.flat().filter((c) => c.status === "correct").length,
    [cells],
  );
  const revealed = status === "done";

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 py-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Fire Emblem Doku</h1>
        <button
          onClick={() => dispatch({ type: "newPuzzle" })}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          New Puzzle
        </button>
      </header>

      <div className="mb-3 flex items-center justify-between text-sm">
        <span>
          Guesses left: <strong>{guessesLeft}</strong>
        </span>
        <span>
          Score: <strong>{score}</strong> / {TOTAL_GUESSES}
        </span>
      </div>

      <Board
        puzzle={puzzle}
        cells={cells}
        revealed={revealed}
        onCellClick={(row, col) => dispatch({ type: "openCell", row, col })}
      />

      {state.lastError && (
        <p className="mt-3 text-sm text-rose-600">{state.lastError}</p>
      )}

      {status === "playing" ? (
        <button
          onClick={() => dispatch({ type: "reveal" })}
          className="mt-4 text-sm text-slate-500 underline hover:text-slate-700 dark:hover:text-slate-300"
        >
          Give up &amp; reveal
        </button>
      ) : (
        <div className="mt-4 rounded-md bg-slate-100 p-4 text-sm dark:bg-slate-800">
          <p className="font-semibold">
            Finished — {score} / {TOTAL_GUESSES} correct.
          </p>
          <p className="mt-1 text-slate-500">
            Unsolved cells show a character who fits, and how many other
            answers there were.
          </p>
        </div>
      )}

      {active && (
        <SearchModal
          rowLabel={puzzle.rows[active.row].label}
          colLabel={puzzle.cols[active.col].label}
          guessesLeft={guessesLeft}
          wrongTick={state.wrongTick}
          onPick={(name) => dispatch({ type: "guess", name })}
          onClose={() => dispatch({ type: "closeCell" })}
        />
      )}
    </div>
  );
}
