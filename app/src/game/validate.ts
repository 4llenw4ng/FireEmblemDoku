import type { Puzzle } from "../types";
import { RECORDS_BY_NAME } from "./index";

export type GuessResult = "correct" | "wrong" | "duplicate" | "unknown";

/**
 * A guess is by name. If any record with that name satisfies both the row and
 * column trait, it's correct (name collisions across games are rare and either
 * match is accepted). Only correct placements consume a name for the board.
 */
export function checkGuess(
  puzzle: Puzzle,
  rowIdx: number,
  colIdx: number,
  name: string,
  usedNames: ReadonlySet<string>,
): GuessResult {
  if (usedNames.has(name)) return "duplicate";
  const records = RECORDS_BY_NAME.get(name);
  if (!records) return "unknown";
  const row = puzzle.rows[rowIdx];
  const col = puzzle.cols[colIdx];
  const ok = records.some((c) => row.test(c) && col.test(c));
  return ok ? "correct" : "wrong";
}
