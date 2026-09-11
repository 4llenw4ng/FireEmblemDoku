import type { Character } from "../types";

/**
 * The raw `starting_class` field has ~167 distinct values across the 12 games
 * (localization drift, promoted vs base, game-specific names). This collapses
 * them into recognizable puzzle archetypes. A class can carry more than one tag
 * (e.g. "Mage Knight" -> mage + cavalier).
 */
export const ARCHETYPES = [
  "lord",
  "cavalier",
  "armor",
  "soldier",
  "myrmidon",
  "mercenary",
  "fighter",
  "archer",
  "nomad",
  "mage",
  "darkMage",
  "healer",
  "pegasus",
  "wyvern",
  "thief",
  "dancer",
  "manakete",
  "laguz",
  "villager",
  "royal",
] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  lord: "Lord",
  cavalier: "Cavalier",
  armor: "Armored",
  soldier: "Soldier",
  myrmidon: "Myrmidon",
  mercenary: "Mercenary",
  fighter: "Fighter",
  archer: "Archer",
  nomad: "Nomad",
  mage: "Mage",
  darkMage: "Dark Mage",
  healer: "Healer",
  pegasus: "Pegasus Knight",
  wyvern: "Wyvern Rider",
  thief: "Thief",
  dancer: "Dancer",
  manakete: "Manakete",
  laguz: "Laguz",
  villager: "Villager",
  royal: "Royalty",
};

// keyword (matched as a lowercase substring of the class name) -> archetype tags
const KEYWORD_TAGS: Array<[string, Archetype[]]> = [
  // --- mounted, non-flying ---
  ["cavalier", ["cavalier"]],
  ["paladin", ["cavalier"]],
  ["social knight", ["cavalier"]],
  ["lance knight", ["cavalier"]],
  ["axe knight", ["cavalier"]],
  ["sword knight", ["cavalier"]],
  ["bow knight", ["cavalier", "archer"]],
  ["arch knight", ["cavalier", "archer"]],
  ["free knight", ["cavalier"]],
  ["forrest knight", ["cavalier"]],
  ["duke knight", ["cavalier"]],
  ["gold knight", ["cavalier"]],
  ["silver knight", ["cavalier"]],
  ["great knight", ["cavalier", "armor"]],
  ["lord knight", ["cavalier", "lord"]],
  ["master knight", ["cavalier"]],
  ["dark knight", ["cavalier", "mage"]],
  ["mage knight", ["cavalier", "mage"]],
  ["troubadour", ["healer", "cavalier"]],
  ["valkyri", ["healer", "cavalier"]],
  ["blade paladin", ["cavalier"]],
  // --- armored ---
  ["knight", ["armor"]], // bare "Knight" = Armor Knight in the older games
  ["armour", ["armor"]],
  ["armor", ["armor"]],
  ["general", ["armor"]],
  ["baron", ["armor"]],
  // --- lance infantry ---
  ["soldier", ["soldier"]],
  ["halberdier", ["soldier"]],
  ["spear fighter", ["soldier"]],
  ["spear master", ["soldier"]],
  ["sergeant", ["soldier"]],
  ["lance armour", ["soldier", "armor"]],
  // --- sword infantry ---
  ["myrmidon", ["myrmidon"]],
  ["swordmaster", ["myrmidon"]],
  ["swordfighter", ["myrmidon"]],
  ["sword fighter", ["myrmidon"]],
  ["trueblade", ["myrmidon"]],
  ["sword armour", ["myrmidon", "armor"]],
  ["armor sword", ["myrmidon", "armor"]],
  ["black knight", ["myrmidon", "armor"]],
  // --- mercenary line ---
  ["mercenary", ["mercenary"]],
  ["hero", ["mercenary"]],
  ["ranger", ["mercenary"]],
  ["dread fighter", ["mercenary"]],
  // --- axe infantry ---
  ["fighter", ["fighter"]],
  ["warrior", ["fighter"]],
  ["brigand", ["fighter"]],
  ["bandit", ["fighter"]],
  ["pirate", ["fighter"]],
  ["berserker", ["fighter"]],
  ["mountain thief", ["fighter", "thief"]],
  ["oni savage", ["fighter"]],
  ["oni chieftain", ["fighter"]],
  ["war master", ["fighter"]],
  // --- bows ---
  ["archer", ["archer"]],
  ["sniper", ["archer"]],
  ["bow fighter", ["archer"]],
  ["hunter", ["archer"]],
  ["ballistician", ["archer"]],
  ["gunner", ["archer"]],
  // --- mounted bow ---
  ["nomad", ["nomad", "archer"]],
  ["nomadic trooper", ["nomad", "archer"]],
  ["kinshi knight", ["nomad", "archer", "pegasus"]],
  // --- anima magic ---
  ["mage", ["mage"]],
  ["sage", ["mage"]],
  ["grandmaster", ["mage"]],
  ["tactician", ["mage"]],
  ["pupil", ["mage"]],
  ["diviner", ["mage"]],
  // --- dark magic ---
  ["shaman", ["darkMage"]],
  ["dark mage", ["darkMage"]],
  ["druid", ["darkMage"]],
  ["sorcerer", ["darkMage"]],
  ["loputo", ["darkMage"]],
  ["loptr", ["darkMage"]],
  ["necromancer", ["darkMage"]],
  ["onmyoji", ["darkMage"]],
  ["dark flier", ["darkMage", "pegasus"]],
  ["dark sage", ["darkMage"]],
  ["witch", ["darkMage"]],
  // --- staff / faith ---
  ["priest", ["healer"]],
  ["cleric", ["healer"]],
  ["bishop", ["healer"]],
  ["sister", ["healer"]],
  ["saint", ["healer"]],
  ["curate", ["healer"]],
  ["monk", ["healer"]],
  ["shrine maiden", ["healer"]],
  ["war monk", ["healer", "fighter"]],
  ["war cleric", ["healer", "fighter"]],
  // --- flying: pegasus ---
  ["pegasus", ["pegasus"]],
  ["falcon", ["pegasus"]],
  ["sky knight", ["pegasus"]],
  // --- flying: wyvern / dragon-rider ---
  ["wyvern", ["wyvern"]],
  ["dracoknight", ["wyvern"]],
  ["dragon knight", ["wyvern"]],
  ["dragon rider", ["wyvern"]],
  ["dragonmaster", ["wyvern"]],
  ["dragon master", ["wyvern"]],
  ["malig knight", ["wyvern", "darkMage"]],
  // --- thief line ---
  ["thief", ["thief"]],
  ["assassin", ["thief"]],
  ["rogue", ["thief"]],
  ["trickster", ["thief"]],
  ["outlaw", ["thief", "archer"]],
  ["adventurer", ["thief", "archer"]],
  ["ninja", ["thief"]],
  ["puppeteer", ["thief"]],
  ["mechanist", ["thief", "archer"]],
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
  ["dragon prince", ["manakete", "royal"]],
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
  // --- royalty / unique story classes ---
  ["lord", ["lord"]],
  ["prince", ["lord", "royal"]],
  ["princess", ["lord", "royal"]],
  ["queen", ["royal"]],
  ["king", ["royal"]],
  ["emperor", ["royal"]],
  ["empress", ["royal"]],
  ["chancellor", ["royal"]],
  ["conqueror", ["royal", "fighter"]],
];

const cache = new WeakMap<Character, Archetype[]>();

export function classTagsOf(c: Character): Archetype[] {
  const hit = cache.get(c);
  if (hit) return hit;
  const cls = c.starting_class.toLowerCase();
  const tags = new Set<Archetype>();
  for (const [keyword, archetypes] of KEYWORD_TAGS) {
    if (cls.includes(keyword)) archetypes.forEach((a) => tags.add(a));
  }
  const result = [...tags];
  cache.set(c, result);
  return result;
}
