import { COL_POOL, ROW_POOL } from "../traits/registry";
import type { Puzzle, Trait } from "../types";
import { TRAIT_INDEX, candidatesFor } from "./index";

/** Deterministic PRNG so a seed reproduces a board (daily mode later). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Reject a triple where one trait's character set is a subset of another's
 * (e.g. Myrmidon ⊆ Sword-wielder) — that pairing makes a dull row/column. */
function tooRedundant(traits: Trait[]): boolean {
  for (let i = 0; i < traits.length; i++) {
    for (let j = 0; j < traits.length; j++) {
      if (i === j) continue;
      const a = TRAIT_INDEX.get(traits[i].id)!;
      const b = TRAIT_INDEX.get(traits[j].id)!;
      if (a.size === 0) return true;
      let subset = true;
      for (const n of a) {
        if (!b.has(n)) {
          subset = false;
          break;
        }
      }
      if (subset) return true;
    }
  }
  return false;
}

function pickAxis(
  pool: readonly Trait[],
  rng: () => number,
  maxPerGroup: Partial<Record<string, number>>,
): Trait[] | null {
  const order = shuffled(pool, rng);
  const chosen: Trait[] = [];
  const groupCount: Record<string, number> = {};
  for (const t of order) {
    const cap = maxPerGroup[t.group] ?? 3;
    if ((groupCount[t.group] ?? 0) >= cap) continue;
    chosen.push(t);
    groupCount[t.group] = (groupCount[t.group] ?? 0) + 1;
    if (chosen.length === 3) break;
  }
  return chosen.length === 3 ? chosen : null;
}

/** Build the 9-cell candidate grid, or return null the moment any cell is
 * empty. This is the hard solvability gate: a puzzle is only usable if every
 * intersection has at least `minPerCell` matching characters. */
function buildGrid(
  rows: Trait[],
  cols: Trait[],
  minPerCell: number,
): string[][][] | null {
  const grid: string[][][] = [];
  for (const row of rows) {
    const rowCells: string[][] = [];
    for (const col of cols) {
      const cands = candidatesFor(row, col);
      if (cands.length < minPerCell) return null;
      rowCells.push(cands);
    }
    grid.push(rowCells);
  }
  return grid;
}

export interface GenerateOptions {
  seed?: number;
  /** minimum matching characters required in every one of the 9 cells */
  minCandidatesPerCell?: number;
  maxAttempts?: number;
}

/**
 * Returns a puzzle whose 9 cells are each guaranteed to have at least
 * `minCandidatesPerCell` valid answers. Throws if no such board is found
 * within `maxAttempts` — it never returns a partially-unsolvable board.
 */
export function generatePuzzle(opts: GenerateOptions = {}): Puzzle {
  const {
    seed = (Math.random() * 2 ** 32) >>> 0,
    minCandidatesPerCell = 1,
    maxAttempts = 2000,
  } = opts;
  const rng = mulberry32(seed);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rows = pickAxis(ROW_POOL, rng, { weapon: 2, class: 2 });
    const cols = pickAxis(COL_POOL, rng, { game: 2, highGrowth: 2, lowGrowth: 2 });
    if (!rows || !cols) continue;
    if (tooRedundant(rows) || tooRedundant(cols)) continue;

    const cellCandidates = buildGrid(rows, cols, minCandidatesPerCell);
    if (cellCandidates) {
      const puzzle = { rows, cols, cellCandidates };
      assertSolvable(puzzle);
      return puzzle;
    }
  }

  throw new Error(
    `generatePuzzle: no fully-solvable board in ${maxAttempts} attempts (seed ${seed})`,
  );
}

/** Throws if any cell has zero candidates. Cheap final guard against a
 * regression in the generator ever shipping an unsolvable board. */
export function assertSolvable(puzzle: Puzzle): void {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (puzzle.cellCandidates[r][c].length === 0) {
        throw new Error(
          `Unsolvable cell [${r}][${c}]: ${puzzle.rows[r].label} × ${puzzle.cols[c].label}`,
        );
      }
    }
  }
}

/**
 * Draws a fresh random puzzle for the UI. Retries with new seeds if a draw
 * happens to throw, so a caller never has to handle generation failure.
 */
export function newRandomPuzzle(minCandidatesPerCell = 1): Puzzle {
  for (let i = 0; i < 25; i++) {
    try {
      return generatePuzzle({ minCandidatesPerCell });
    } catch {
      // try another seed
    }
  }
  // Last resort: relax the per-cell minimum to 1 and try hard once more.
  return generatePuzzle({ minCandidatesPerCell: 1, maxAttempts: 10000 });
}
