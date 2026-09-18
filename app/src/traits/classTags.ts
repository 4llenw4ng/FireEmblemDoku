import type { Character } from "../types";

/**
 * The raw `starting_class` field has ~167 distinct values across the 12 games
 * (localization drift, promoted vs base, game-specific names). This collapses
 * them into recognizable puzzle archetypes. A class can carry more than one tag
 * (e.g. "Mage Knight" -> mage + cavalier; a promoted-class character often also
 * still counts for its base-tier row, which is intentional).
 */
export const ARCHETYPES = [
  "lord",
  "cavalier",
  "paladin",
  "armor",
  "general",
  "soldier",
  "myrmidon",
  "swordmaster",
  "mercenary",
  "hero",
  "fighter",
  "warrior",
  "archer",
  "sniper",
  "nomad",
  "nomadTrooper",
  "mage",
  "sage",
  "darkMage",
  "druid",
  "healer",
  "bishop",
  "pegasus",
  "falcon",
  "wyvern",
  "wyvernLord",
  "thief",
  "assassin",
  "dancer",
  "manakete",
  "laguz",
  "villager",
] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  lord: "Lord",
  cavalier: "Cavalier",
  paladin: "Paladin",
  armor: "Knight",
  general: "General",
  soldier: "Soldier",
  myrmidon: "Myrmidon",
  swordmaster: "Swordmaster",
  mercenary: "Mercenary",
  hero: "Hero",
  fighter: "Fighter",
  warrior: "Warrior",
  archer: "Archer",
  sniper: "Sniper",
  nomad: "Nomad",
  nomadTrooper: "Nomad Trooper",
  mage: "Mage",
  sage: "Sage",
  darkMage: "Dark Mage",
  druid: "Druid",
  healer: "Healer",
  bishop: "Bishop",
  pegasus: "Pegasus Knight",
  falcon: "Falcon Knight",
  wyvern: "Wyvern Rider",
  wyvernLord: "Wyvern Lord",
  thief: "Thief",
  assassin: "Assassin",
  dancer: "Dancer",
  manakete: "Manakete",
  laguz: "Laguz",
  villager: "Villager",
};

// keyword (matched as a lowercase substring of the class name) -> archetype tags
const KEYWORD_TAGS: Array<[string, Archetype[]]> = [
  // --- mounted, non-flying ---
  ["cavalier", ["cavalier"]],
  ["social knight", ["cavalier"]],
  ["lance knight", ["cavalier"]],
  ["axe knight", ["cavalier"]],
  ["sword knight", ["cavalier"]],
  ["bow knight", ["cavalier", "archer"]],
  ["arch knight", ["cavalier", "archer"]],
  ["free knight", ["cavalier"]],
  ["forrest knight", ["cavalier"]],
  ["duke knight", ["cavalier"]],
  ["great knight", ["cavalier", "armor"]],
  ["lord knight", ["cavalier", "lord"]],
  ["dark knight", ["cavalier", "mage"]],
  ["mage knight", ["cavalier", "mage"]],
  ["troubadour", ["healer", "cavalier"]],
  ["valkyri", ["healer", "cavalier"]],
  // --- promoted cavalier: Paladin ---
  ["paladin", ["paladin"]],
  ["gold knight", ["paladin"]],
  ["silver knight", ["paladin"]],
  ["master knight", ["paladin"]],
  ["blade paladin", ["paladin"]],
  // --- armored ---
  ["knight", ["armor"]], // bare "Knight" = Armor Knight in the older games
  ["armour", ["armor"]],
  ["armor", ["armor"]],
  ["baron", ["armor"]],
  // --- promoted armor: General ---
  ["general", ["general"]],
  // --- lance infantry ---
  ["soldier", ["soldier"]],
  ["halberdier", ["soldier"]],
  ["spear fighter", ["soldier"]],
  ["spear master", ["soldier"]],
  ["sergeant", ["soldier"]],
  ["lance armour", ["soldier", "armor"]],
  // --- sword infantry ---
  ["myrmidon", ["myrmidon"]],
  ["swordfighter", ["myrmidon"]],
  ["sword fighter", ["myrmidon"]],
  ["trueblade", ["myrmidon"]],
  ["sword armour", ["myrmidon", "armor"]],
  ["armor sword", ["myrmidon", "armor"]],
  ["black knight", ["myrmidon", "armor"]],
  // --- promoted myrmidon: Swordmaster ---
  ["swordmaster", ["swordmaster"]],
  // --- mercenary line ---
  ["mercenary", ["mercenary"]],
  ["ranger", ["mercenary"]],
  ["dread fighter", ["mercenary"]],
  // --- promoted mercenary: Hero ---
  ["hero", ["hero"]],
  // --- axe infantry ---
  ["fighter", ["fighter"]],
  ["brigand", ["fighter"]],
  ["bandit", ["fighter"]],
  ["pirate", ["fighter"]],
  ["berserker", ["fighter"]],
  ["mountain thief", ["fighter", "thief"]],
  ["oni savage", ["fighter"]],
  ["oni chieftain", ["fighter"]],
  ["war master", ["fighter"]],
  // --- promoted fighter: Warrior ---
  ["warrior", ["warrior"]],
  // --- bows ---
  ["archer", ["archer"]],
  ["bow fighter", ["archer"]],
  ["hunter", ["archer"]],
  ["ballistician", ["archer"]],
  ["gunner", ["archer"]],
  // --- promoted archer: Sniper ---
  ["sniper", ["sniper"]],
  // --- mounted bow ---
  ["nomad", ["nomad", "archer"]],
  ["kinshi knight", ["nomad", "archer", "pegasus"]],
  // --- promoted nomad: Nomad Trooper ---
  ["nomadic trooper", ["nomadTrooper", "archer"]],
  ["nomad trooper", ["nomadTrooper", "archer"]],
  // --- anima magic ---
  ["mage", ["mage"]],
  ["grandmaster", ["mage"]],
  ["tactician", ["mage"]],
  ["pupil", ["mage"]],
  ["diviner", ["mage"]],
  // --- promoted mage: Sage ---
  ["sage", ["sage"]],
  // --- dark magic ---
  ["shaman", ["darkMage"]],
  ["dark mage", ["darkMage"]],
  ["sorcerer", ["darkMage"]],
  ["loputo", ["darkMage"]],
  ["loptr", ["darkMage"]],
  ["necromancer", ["darkMage"]],
  ["onmyoji", ["darkMage"]],
  ["dark flier", ["darkMage", "pegasus"]],
  ["dark sage", ["darkMage"]],
  ["witch", ["darkMage"]],
  // --- promoted dark mage: Druid ---
  ["druid", ["druid"]],
  // --- staff / faith ---
  ["priest", ["healer"]],
  ["cleric", ["healer"]],
  ["sister", ["healer"]],
  ["saint", ["healer"]],
  ["curate", ["healer"]],
  ["monk", ["healer"]],
  ["shrine maiden", ["healer"]],
  ["war monk", ["healer", "fighter"]],
  ["war cleric", ["healer", "fighter"]],
  // --- promoted healer: Bishop ---
  ["bishop", ["bishop"]],
  // --- flying: pegasus ---
  ["pegasus", ["pegasus"]],
  ["sky knight", ["pegasus"]],
  // --- promoted pegasus: Falcon Knight ---
  ["falco", ["falcon"]], // matches both "Falcon Knight" and "Falcoknight"
  // --- flying: wyvern / dragon-rider ---
  ["wyvern", ["wyvern"]],
  ["dracoknight", ["wyvern"]],
  ["dragon knight", ["wyvern"]],
  ["dragon rider", ["wyvern"]],
  ["dragonmaster", ["wyvern"]],
  ["dragon master", ["wyvern"]],
  ["malig knight", ["wyvern", "darkMage"]],
  // --- promoted wyvern: Wyvern Lord ---
  ["wyvern lord", ["wyvernLord"]],
  // --- thief line ---
  ["thief", ["thief"]],
  ["rogue", ["thief"]],
  ["trickster", ["thief"]],
  ["outlaw", ["thief", "archer"]],
  ["adventurer", ["thief", "archer"]],
  ["ninja", ["thief"]],
  ["puppeteer", ["thief"]],
  ["mechanist", ["thief", "archer"]],
  // --- promoted thief: Assassin ---
  ["assassin", ["assassin"]],
  // --- dance / song ---
  ["dancer", ["dancer"]],
  ["bard", ["dancer"]],
  ["heron", ["dancer", "laguz"]],
  ["songstress", ["dancer"]],
  // --- dragons ---
  ["manakete", ["manakete"]],
  ["mamkute", ["manakete"]],
  ["chameleon", ["manakete"]],
  ["red dragon", ["manakete", "laguz"]],
  ["white dragon", ["manakete", "laguz"]],
  ["dragon tribe", ["manakete", "laguz"]],
  ["dragon prince", ["manakete"]],
  // --- laguz / beast tribes ---
  ["beast tribe", ["laguz"]],
  ["bird tribe", ["laguz"]],
  ["cat", ["laguz"]],
  ["tiger", ["laguz"]],
  ["lion", ["laguz"]],
  ["hawk", ["laguz"]],
  ["raven", ["laguz"]],
  ["wolf", ["laguz"]],
  ["taguel", ["laguz"]],
  ["kitsune", ["laguz"]],
  ["wolfskin", ["laguz"]],
  // --- trainees / commoners ---
  ["villager", ["villager"]],
  ["journeyman", ["villager", "fighter"]],
  ["recruit", ["villager", "soldier"]],
  ["apothecary", ["villager", "archer"]],
  ["merchant", ["villager"]],
  // --- lords ---
  ["lord", ["lord"]],
  ["prince", ["lord"]],
  ["princess", ["lord"]],
];

// A character's STARTING class determines their archetype -- someone who
// begins the game already promoted (e.g. Seth in Sacred Stones, Titania in
// Path of Radiance) is a Paladin, not a Cavalier, at that point. Substring
// keyword matching keeps base/promoted tiers naturally exclusive for most
// pairs (different words don't share substrings), but a few promoted names
// literally contain their base name or an unrelated word ("Wyvern Lord"
// contains both "wyvern" and "lord"; "Nomadic Trooper" contains "nomad") and
// need an explicit override to strip the accidental extra tag(s).
const TAG_OVERRIDES: Partial<Record<Archetype, Archetype[]>> = {
  nomadTrooper: ["nomad"],
  wyvernLord: ["wyvern", "lord"],
};

const cache = new WeakMap<Character, Archetype[]>();

export function classTagsOf(c: Character): Archetype[] {
  const hit = cache.get(c);
  if (hit) return hit;
  const cls = c.starting_class.toLowerCase();
  const tags = new Set<Archetype>();
  for (const [keyword, archetypes] of KEYWORD_TAGS) {
    if (cls.includes(keyword)) archetypes.forEach((a) => tags.add(a));
  }
  for (const [promoted, toRemove] of Object.entries(TAG_OVERRIDES)) {
    if (tags.has(promoted as Archetype)) toRemove.forEach((a) => tags.delete(a));
  }
  const result = [...tags];
  cache.set(c, result);
  return result;
}
