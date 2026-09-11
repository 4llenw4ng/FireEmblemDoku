import { COL_POOL, CHARACTERS, ROW_POOL } from "../traits/registry";
import type { Character, Trait } from "../types";

/** name -> every record with that name (a name can span multiple games) */
export const RECORDS_BY_NAME = new Map<string, Character[]>();
for (const c of CHARACTERS) {
  const list = RECORDS_BY_NAME.get(c.name);
  if (list) list.push(c);
  else RECORDS_BY_NAME.set(c.name, [c]);
}

export const ALL_NAMES: string[] = [...RECORDS_BY_NAME.keys()].sort((a, b) =>
  a.localeCompare(b),
);

/**
 * trait id -> set of *record indices* (into CHARACTERS) that satisfy it.
 *
 * Indexing by record, not by name, is deliberate: a puzzle answer must be a
 * single character record that satisfies BOTH its row and column trait. If we
 * indexed by name, a name whose two records each satisfy a different trait
 * would look like a valid answer to the generator but be rejected by
 * checkGuess. Record-level sets keep generation and validation in agreement.
 */
export const TRAIT_INDEX = new Map<string, Set<number>>();
for (const trait of [...ROW_POOL, ...COL_POOL]) {
  const idxs = new Set<number>();
  CHARACTERS.forEach((c, i) => {
    if (trait.test(c)) idxs.add(i);
  });
  TRAIT_INDEX.set(trait.id, idxs);
}

/** Distinct character names with at least one record satisfying both traits. */
export function candidatesFor(row: Trait, col: Trait): string[] {
  const rowSet = TRAIT_INDEX.get(row.id)!;
  const colSet = TRAIT_INDEX.get(col.id)!;
  const [small, large] =
    rowSet.size < colSet.size ? [rowSet, colSet] : [colSet, rowSet];
  const names = new Set<string>();
  for (const i of small) if (large.has(i)) names.add(CHARACTERS[i].name);
  return [...names];
}

/**
 * Picks one concrete example answer for a cell, with the game it comes from
 * (used on the "give up & reveal" screen for unsolved cells). Resolves to the
 * specific record that actually satisfies both traits, not just any record
 * sharing that name.
 */
export function exampleAnswer(
  row: Trait,
  col: Trait,
  candidateNames: readonly string[],
): { name: string; game: string } | null {
  for (const name of candidateNames) {
    const match = RECORDS_BY_NAME.get(name)?.find(
      (c) => row.test(c) && col.test(c),
    );
    if (match) return { name, game: match.game };
  }
  return null;
}
