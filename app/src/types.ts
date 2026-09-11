export const STATS = ["HP", "Str", "Mag", "Skl", "Spd", "Luck", "Def", "Res"] as const;
export type Stat = (typeof STATS)[number];

export interface Character {
  name: string;
  game: string;
  starting_class: string;
  weapon_types: string[];
  gender: "Male" | "Female" | null;
  growths: Record<Stat, number | null>;
  high_growth_stats: Stat[];
  low_growth_stats: Stat[];
  is_recruitable_enemy: boolean;
  recruit_note: string | null;
  chapter_joined: string | null;
}

export type TraitGroup =
  | "class"
  | "weapon"
  | "game"
  | "gender"
  | "recruit"
  | "highGrowth"
  | "lowGrowth";

export type Axis = "row" | "col";

export interface Trait {
  id: string;
  label: string;
  group: TraitGroup;
  axis: Axis;
  test: (c: Character) => boolean;
}

export interface Puzzle {
  rows: Trait[];
  cols: Trait[];
  /** cellCandidates[rowIdx][colIdx] = names of characters satisfying both traits */
  cellCandidates: string[][][];
}

export type CellState =
  | { status: "empty" }
  | { status: "correct"; name: string };
