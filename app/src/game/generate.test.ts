import { describe, expect, it } from "vitest";
import { RECORDS_BY_NAME } from "./index";
import { generatePuzzle } from "./generate";

const SEED_COUNT = 3000;

describe("generatePuzzle", () => {
  it("never produces a board with an unsolvable cell", () => {
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const puzzle = generatePuzzle({ seed });
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          expect(
            puzzle.cellCandidates[r][c].length,
            `seed ${seed} cell [${r}][${c}] = ${puzzle.rows[r].label} × ${puzzle.cols[c].label}`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it("every listed candidate actually satisfies both traits", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { rows, cols, cellCandidates } = generatePuzzle({ seed });
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          for (const name of cellCandidates[r][c]) {
            const records = RECORDS_BY_NAME.get(name)!;
            expect(
              records.some((ch) => rows[r].test(ch) && cols[c].test(ch)),
              `seed ${seed}: ${name} listed under ${rows[r].label} × ${cols[c].label}`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it("is deterministic for a given seed", () => {
    const a = generatePuzzle({ seed: 12345 });
    const b = generatePuzzle({ seed: 12345 });
    expect(a.rows.map((t) => t.id)).toEqual(b.rows.map((t) => t.id));
    expect(a.cols.map((t) => t.id)).toEqual(b.cols.map((t) => t.id));
  });

  it("can enforce a higher minimum candidate count", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const puzzle = generatePuzzle({ seed, minCandidatesPerCell: 3 });
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          expect(puzzle.cellCandidates[r][c].length).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
});
