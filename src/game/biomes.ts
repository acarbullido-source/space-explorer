export type BiomeId =
  | 'shattered_cradle'
  | 'helios_forge'
  | 'dark_graveyard'
  | 'beacon_highway'
  | 'fracture_frontier';

export interface BiomeDef {
  id: BiomeId;
  name: string;
  subtitle: string;
  rule: string;
  primaryColor: string;
  secondaryColor: string;
  solarPlasmaMultiplier: number;
  flareRisk: boolean;
  requiresAntimatter: boolean;
  photonicFreeJumps: boolean;
  freeLaserRecharge: boolean;
  description: string;
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  shattered_cradle: {
    id: 'shattered_cradle',
    name: 'The Shattered Cradle',
    subtitle: 'Earth Debris Field',
    rule: 'Calm Space: High asteroid scrap density & human refugee stations.',
    primaryColor: '#38bdf8',
    secondaryColor: '#94a3b8',
    solarPlasmaMultiplier: 1.0,
    flareRisk: false,
    requiresAntimatter: false,
    photonicFreeJumps: false,
    freeLaserRecharge: false,
    description: 'The shattered remains of humanity’s birthplace. Plentiful iron scrap and peaceful survivor outposts drift in high orbit.',
  },
  helios_forge: {
    id: 'helios_forge',
    name: 'The Helios Forge',
    subtitle: 'Red Giant Binary',
    rule: 'Solar Flare Risk: Solar plasma output is 2x, but periodic solar flares deal 10 hull damage unless Active Magnetic Shielding Lv 2+ is installed.',
    primaryColor: '#f97316',
    secondaryColor: '#ef4444',
    solarPlasmaMultiplier: 2.0,
    flareRisk: true,
    requiresAntimatter: false,
    photonicFreeJumps: false,
    freeLaserRecharge: false,
    description: 'Blistering dual suns flood your solar generators with 2x Plasma, but scorching coronal flares threaten unshielded hulls.',
  },
  dark_graveyard: {
    id: 'dark_graveyard',
    name: 'The Dark Graveyard',
    subtitle: 'Deep Nebula',
    rule: 'Zero Sunlight: Solar generators produce 0 Plasma. Kilopower Nuclear Reactors produce full power. Hidden shipwrecks visible with Optical Tracking.',
    primaryColor: '#a855f7',
    secondaryColor: '#6366f1',
    solarPlasmaMultiplier: 0.0,
    flareRisk: false,
    requiresAntimatter: false,
    photonicFreeJumps: false,
    freeLaserRecharge: false,
    description: 'A pitch-black cosmic shroud where no star shines. Nuclear reactors keep systems online while optical arrays spot silent derelicts.',
  },
  beacon_highway: {
    id: 'beacon_highway',
    name: 'The Beacon Highway',
    subtitle: 'Laser Trade Hub',
    rule: 'Laser Corridors: Photonic Sails jump for 0 Plasma & Beaming Receivers recharge free. High Rep gives 25% discount; Outlaws face patrols.',
    primaryColor: '#eab308',
    secondaryColor: '#22d3ee',
    solarPlasmaMultiplier: 1.0,
    flareRisk: false,
    requiresAntimatter: false,
    photonicFreeJumps: true,
    freeLaserRecharge: true,
    description: 'Interconnected trade corridor bathed in beamed laser power. Photonic sails ride free and merchants offer steep ally discounts.',
  },
  fracture_frontier: {
    id: 'fracture_frontier',
    name: 'The Fracture Frontier',
    subtitle: 'Deep Alien Space',
    rule: 'Fracture Space: Requires Plasma Antimatter Drives. High-reward alien anomalies, Ark Artifact shrines & Co-Op Boss nodes.',
    primaryColor: '#10b981',
    secondaryColor: '#c084fc',
    solarPlasmaMultiplier: 1.0,
    flareRisk: false,
    requiresAntimatter: true,
    photonicFreeJumps: false,
    freeLaserRecharge: false,
    description: 'Dimensional fissure space tearing at the edge of the galaxy. Ancient alien shrines guard the final secrets of the Ark.',
  },
};

export const BIOME_ORDER: BiomeId[] = [
  'shattered_cradle',
  'helios_forge',
  'dark_graveyard',
  'beacon_highway',
  'fracture_frontier',
];

export function getBiomeBySector(sector: number): BiomeDef {
  const idx = (sector - 1) % BIOME_ORDER.length;
  return BIOMES[BIOME_ORDER[idx]];
}
