import charactersRaw from "../data/characters.json";
import type { Character, Stat, Trait } from "../types";
import { ARCHETYPES, ARCHETYPE_LABEL, classTagsOf } from "./classTags";

export const CHARACTERS = charactersRaw as Character[];

// Must match LOW_GROWTH_MAX / HIGH_GROWTH_MIN in scraper/scrape_serenes.py,
// which is what actually computed each character's high/low_growth_stats.
const LOW_GROWTH_MAX = 20;
const HIGH_GROWTH_MIN = 60;

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
  iconBase: `/icons/weapons/${w.toLowerCase()}`,
}));

const classTraits: Trait[] = ARCHETYPES.map((a) => ({
  id: `class:${a}`,
  label: ARCHETYPE_LABEL[a],
  group: "class",
  axis: "row",
  test: (c) => classTagsOf(c).includes(a),
  iconBase: `/icons/classes/${a}`,
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

// Growth-trait columns, grouped by stat. Str and Mag are combined into one
// "Str/Mag" trait: pre-Awakening GBA-and-earlier games track a single
// combined Strength/Magic stat per unit, so showing separate Str and Mag
// growth columns would either be redundant (both true for the same reason)
// or read as a real distinction that doesn't exist for those characters.
const GROWTH_STAT_GROUPS: { id: string; label: string; stats: Stat[] }[] = [
  { id: "HP", label: "HP", stats: ["HP"] },
  { id: "StrMag", label: "Str/Mag", stats: ["Str", "Mag"] },
  { id: "Skl", label: "Skl", stats: ["Skl"] },
  { id: "Spd", label: "Spd", stats: ["Spd"] },
  { id: "Luck", label: "Luck", stats: ["Luck"] },
  { id: "Def", label: "Def", stats: ["Def"] },
  { id: "Res", label: "Res", stats: ["Res"] },
];

const highGrowthTraits: Trait[] = GROWTH_STAT_GROUPS.map((g) => ({
  id: `highGrowth:${g.id}`,
  label: `High (≥${HIGH_GROWTH_MIN}) ${g.label} growth`,
  group: "highGrowth",
  axis: "col",
  test: (c) => g.stats.some((s) => c.high_growth_stats.includes(s)),
}));

const lowGrowthTraits: Trait[] = GROWTH_STAT_GROUPS.map((g) => ({
  id: `lowGrowth:${g.id}`,
  label: `Low (≤${LOW_GROWTH_MAX}) ${g.label} growth`,
  group: "lowGrowth",
  axis: "col",
  test: (c) => g.stats.some((s) => c.low_growth_stats.includes(s)),
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
