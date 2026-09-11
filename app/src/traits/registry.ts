import charactersRaw from "../data/characters.json";
import { STATS, type Character, type Stat, type Trait } from "../types";
import { ARCHETYPES, ARCHETYPE_LABEL, classTagsOf } from "./classTags";

export const CHARACTERS = charactersRaw as Character[];

export const GAMES: string[] = [
  "Shadow Dragon",
  "Mystery of the Emblem",
  "Echoes: Shadows of Valentia",
  "Genealogy of the Holy War",
  "Thracia 776",
  "Binding Blade",
  "Blazing Blade",
  "Sacred Stones",
  "Path of Radiance",
  "Radiant Dawn",
  "Awakening",
  "Fates",
];

const WEAPON_TYPES = [
  "Sword",
  "Lance",
  "Axe",
  "Bow",
  "Tome",
  "Staff",
  "Dragonstone",
  "Beaststone",
  "Dagger",
] as const;

// ---- Row pool: weapon + class archetype ----

// "Tome" lumps together Anima/Light/Dark magic (only FE1-FE10 distinguish
// them, and Awakening/Fates dropped the split entirely), so "Tome-wielder"
// reads as narrower than it is. Spell it out instead of implying just Anima.
const WEAPON_LABEL_OVERRIDES: Partial<Record<(typeof WEAPON_TYPES)[number], string>> = {
  Tome: "Magic-user (any Tome)",
};

const weaponTraits: Trait[] = WEAPON_TYPES.map((w) => ({
  id: `weapon:${w}`,
  label: WEAPON_LABEL_OVERRIDES[w] ?? `${w}-wielder`,
  group: "weapon",
  axis: "row",
  test: (c) => c.weapon_types.includes(w),
}));

const classTraits: Trait[] = ARCHETYPES.map((a) => ({
  id: `class:${a}`,
  label: ARCHETYPE_LABEL[a],
  group: "class",
  axis: "row",
  test: (c) => classTagsOf(c).includes(a),
}));

export const ROW_POOL: Trait[] = [...classTraits, ...weaponTraits];

// ---- Column pool: game + gender + recruit + growth ----

const gameTraits: Trait[] = GAMES.map((g) => ({
  id: `game:${g}`,
  label: g,
  group: "game",
  axis: "col",
  test: (c) => c.game === g,
}));

const genderTraits: Trait[] = (["Male", "Female"] as const).map((g) => ({
  id: `gender:${g}`,
  label: g,
  group: "gender",
  axis: "col",
  test: (c) => c.gender === g,
}));

const recruitTrait: Trait = {
  id: "recruit:enemy",
  label: "Recruitable enemy",
  group: "recruit",
  axis: "col",
  test: (c) => c.is_recruitable_enemy,
};

const highGrowthTraits: Trait[] = STATS.map((s: Stat) => ({
  id: `highGrowth:${s}`,
  label: `High ${s} growth`,
  group: "highGrowth",
  axis: "col",
  test: (c) => c.high_growth_stats.includes(s),
}));

const lowGrowthTraits: Trait[] = STATS.map((s: Stat) => ({
  id: `lowGrowth:${s}`,
  label: `Low ${s} growth`,
  group: "lowGrowth",
  axis: "col",
  test: (c) => c.low_growth_stats.includes(s),
}));

export const COL_POOL: Trait[] = [
  ...gameTraits,
  ...genderTraits,
  recruitTrait,
  ...highGrowthTraits,
  ...lowGrowthTraits,
];

export const TRAITS_BY_ID = new Map<string, Trait>(
  [...ROW_POOL, ...COL_POOL].map((t) => [t.id, t]),
);
