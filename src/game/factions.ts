export type FactionId = 'terran' | 'lithoid' | 'vexx' | 'solaris';

export interface FactionDef {
  id: FactionId;
  name: string;
  speciesName: string;
  archetype: string;
  themeColor: string;
  accentColor: string;
  translatorReq: number; // 0 for Terran, 1 for Lithoid, 2 for Vexx, 3 for Solaris
  outlawFriendly: boolean;
  behaviorDesc: string;
  combatStyle: string;
  primaryWeapons: string[];
  greetingDecrypted: string;
  greetingEncrypted: string;
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  terran: {
    id: 'terran',
    name: 'Terran Remnant',
    speciesName: 'Human Survivors',
    archetype: 'Homeworld Refugee Flotilla',
    themeColor: '#f59e0b',
    accentColor: '#94a3b8',
    translatorReq: 0,
    outlawFriendly: false,
    behaviorDesc: 'Speaks clear English without a translator. Trades XP and Plasma for Food and Repairs.',
    combatStyle: 'Standard defensive kinetic volleys and pulse repeaters.',
    primaryWeapons: ['Plasma Repeater', 'Pulse Laser'],
    greetingDecrypted: 'Greetings, captain. The Remnant is holding evacuation lanes for surviving human ships.',
    greetingEncrypted: 'Greetings, captain. The Remnant is holding evacuation lanes for surviving human ships.',
  },
  lithoid: {
    id: 'lithoid',
    name: 'Lithoid Weavers',
    speciesName: 'Silicon Resonants',
    archetype: 'Crystalline Mineral Artisans',
    themeColor: '#22d3ee',
    accentColor: '#38bdf8',
    translatorReq: 1,
    outlawFriendly: false,
    behaviorDesc: 'Requires Universal AI Translator Lv 1. Trades large Plasma reserves in exchange for refined Scrap.',
    combatStyle: 'Continuous thermal plasma heat beams that melt bulkheads over time.',
    primaryWeapons: ['Thermal Plasma Beam', 'Resonance Prisms'],
    greetingDecrypted: 'Harmonic resonance confirmed. We exchange pure energetic plasma for raw metallic scrap.',
    greetingEncrypted: '[Chittering crystalline refraction clicks — Universal AI Translator Lv 1 required]',
  },
  vexx: {
    id: 'vexx',
    name: 'Vexx Syndicate',
    speciesName: 'Cyber Corsairs',
    archetype: 'Black Market Cybernetics Guild',
    themeColor: '#22c55e',
    accentColor: '#15803d',
    translatorReq: 2,
    outlawFriendly: true,
    behaviorDesc: 'Requires Translator Lv 2 for peace, or welcomes Outlaw players (Rep −25+) into Black Market shops.',
    combatStyle: 'Aggressive arc-lightning whips that chain through systems and siphon energy.',
    primaryWeapons: ['Arc-Plasma Whip', 'Siphon Plasma Torpedo'],
    greetingDecrypted: 'Well, look what jumped in. Power down weapons or browse our black-market contraband.',
    greetingEncrypted: '[Hissing scrambled cybernetic static — Translator Lv 2 or Outlaw Rep (−25+) required]',
  },
  solaris: {
    id: 'solaris',
    name: 'Solaris Choir',
    speciesName: 'Ascended Photonic Beings',
    archetype: 'Guardians of the Earth Ark',
    themeColor: '#eab308',
    accentColor: '#a855f7',
    translatorReq: 3,
    outlawFriendly: false,
    behaviorDesc: 'Requires Translator Lv 3. Ancient energy beings guarding the 5 lost Earth Ark Artifacts.',
    combatStyle: 'Heavy nova blast cannons and coronal solar shockwaves.',
    primaryWeapons: ['Plasma Nova Cannon', 'Coronal Lance'],
    greetingDecrypted: 'We sing the harmonic truth of the shattered cradle. Only true seekers may claim the Ark.',
    greetingEncrypted: '[Harmonic blinding photon oscillations — Universal AI Translator Lv 3 required]',
  },
};

export const FACTION_ORDER: FactionId[] = ['terran', 'lithoid', 'vexx', 'solaris'];

export function getFactionForSector(sector: number, kind?: string): FactionDef {
  if (kind === 'garage') return FACTIONS.terran;
  if (sector === 1) return FACTIONS.terran;
  if (sector === 2) return FACTIONS.lithoid;
  if (sector === 3) return FACTIONS.vexx;
  if (sector >= 4) return FACTIONS.solaris;
  return FACTIONS[FACTION_ORDER[(sector - 1) % FACTION_ORDER.length]];
}
