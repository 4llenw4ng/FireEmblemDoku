This folder holds one icon per class archetype (see src/traits/classTags.ts ARCHETYPES).
Expected filenames (case-sensitive), any of .png/.svg/.webp:
  lord, cavalier, armor, soldier, myrmidon, mercenary, fighter, archer, nomad,
  mage, darkMage, healer, pegasus, wyvern, thief, dancer, manakete, laguz,
  villager, royal
Drop e.g. cavalier.png here and the app picks it up automatically (Board.tsx
tries .png/.svg/.webp in that order and just omits the icon if none exist).
