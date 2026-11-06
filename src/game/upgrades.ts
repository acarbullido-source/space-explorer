import type { RoomId } from './types';

export type UpgradeModuleId =
  | 'computing_cores'
  | 'optical_tracking'
  | 'ai_translator'
  | 'bioregenerative'
  | 'magnetic_shielding'
  | 'self_healing'
  | 'predictive_maintenance'
  | 'whipple_shields'
  | 'rotary_bays'
  | 'plasma_generator'
  | 'plasma_synthesizer'
  | 'kilopower_reactor'
  | 'laser_beaming'
  | 'variable_engines'
  | 'photonic_sails'
  | 'antimatter_drives';

export interface UpgradeModuleDef {
  id: UpgradeModuleId;
  room: RoomId;
  name: string;
  summary: string;
  maxLevel: number;
  startLevel: number;
  xpCosts: number[]; // cost for levels 1, 2, 3, 4, 5
  scrapCosts: number[];
  getEffectDesc: (lvl: number) => string;
}

export const ALL_UPGRADES: Record<UpgradeModuleId, UpgradeModuleDef> = {
  // Bridge Upgrades
  computing_cores: {
    id: 'computing_cores',
    room: 'bridge',
    name: 'Neuromorphic Computing Cores',
    summary: 'Brain-like AI chip. Act first in combat and boost weapon accuracy (+5% per level).',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [25, 45, 75, 110, 160],
    scrapCosts: [15, 25, 40, 60, 90],
    getEffectDesc: (lvl) => (lvl === 0 ? 'Not installed' : `+${lvl * 5}% Weapon accuracy, +${lvl * 8} combat initiative speed`),
  },
  optical_tracking: {
    id: 'optical_tracking',
    room: 'bridge',
    name: 'Optical Tracking Arrays',
    summary: 'Silent infrared cameras. Spot hidden hazards and stealth ships without giving away your position.',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [20, 40, 65, 95, 140],
    scrapCosts: [10, 20, 35, 50, 75],
    getEffectDesc: (lvl) => (lvl === 0 ? 'Not installed' : `Reveals stealth ships & unscanned star lanes up to ${lvl + 1} hops away`),
  },

  // Comms & Quarters Upgrades
  ai_translator: {
    id: 'ai_translator',
    room: 'comms',
    name: 'Universal AI Translator',
    summary: 'Understand any alien language. Unlocks peaceful dialogue, alliances, and bonus XP trades.',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [25, 50, 80, 120, 175],
    scrapCosts: [15, 25, 45, 65, 95],
    getEffectDesc: (lvl) =>
      lvl === 0
        ? 'Basic subspace radio only'
        : `Tier ${lvl} Alien Linguistics: +${lvl * 5}% trade discount, pacifies hostile ships on Hail, unlocks Alliance Treaties`,
  },

  // Life Support (ECLSS) Upgrades
  bioregenerative: {
    id: 'bioregenerative',
    room: 'life',
    name: 'Bioregenerative Systems',
    summary: 'Hydroponic algae farm. Recycles 100% of air and food so Life Support uses zero Plasma.',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [30, 55, 85, 130, 180],
    scrapCosts: [20, 35, 50, 75, 110],
    getEffectDesc: (lvl) =>
      lvl === 0
        ? 'Standard chemical scrubbers'
        : `Recycles ${lvl * 20}% of air/food automatically; at Lv 5 Life Support consumes 0 Plasma/turn`,
  },

  // Science Lab Upgrades
  magnetic_shielding: {
    id: 'magnetic_shielding',
    room: 'science',
    name: 'Active Magnetic Shielding',
    summary: 'Deflects cosmic radiation, solar flares, and adds +1 Shield layer per level.',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [35, 60, 95, 140, 200],
    scrapCosts: [25, 40, 65, 90, 130],
    getEffectDesc: (lvl) => (lvl === 0 ? 'Basic shield coil' : `+${lvl} Max magnetic shield bubble layers`),
  },
  self_healing: {
    id: 'self_healing',
    room: 'science',
    name: 'Self-Healing Materials',
    summary: 'Smart hull nanotech. Automatically heals 5% to 25% of hull damage every turn.',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [30, 55, 85, 125, 180],
    scrapCosts: [20, 35, 55, 80, 115],
    getEffectDesc: (lvl) => (lvl === 0 ? 'Standard titanium plating' : `Auto-heals ${lvl * 5}% of hull damage per turn`),
  },
  predictive_maintenance: {
    id: 'predictive_maintenance',
    room: 'science',
    name: 'Predictive Maintenance',
    summary: 'Smart sensors & repair drones. Fixes damaged rooms automatically before they break down.',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [25, 50, 75, 115, 165],
    scrapCosts: [15, 30, 45, 70, 100],
    getEffectDesc: (lvl) => (lvl === 0 ? 'Manual crew repairs only' : `Drones auto-patch damaged rooms every ${Math.max(1, 4 - lvl)} turns`),
  },

  // Airlock & Exterior Hull Upgrades
  whipple_shields: {
    id: 'whipple_shields',
    room: 'airlock',
    name: 'Whipple Shield Enhancements',
    summary: 'Layered Kevlar & foam armor. Cuts asteroid and physical impact damage by 10% per level.',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [20, 40, 70, 105, 150],
    scrapCosts: [15, 25, 45, 65, 95],
    getEffectDesc: (lvl) => (lvl === 0 ? 'Standard hull foam' : `Reduces asteroid/collision impact damage by ${lvl * 10}%`),
  },
  rotary_bays: {
    id: 'rotary_bays',
    room: 'airlock',
    name: 'Rotary Cargo & Launch Bays',
    summary: 'Revolving launch bay. Fire mining or defense drones in any direction instantly.',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [25, 45, 75, 110, 160],
    scrapCosts: [20, 35, 50, 75, 105],
    getEffectDesc: (lvl) => (lvl === 0 ? 'Single tether winch' : `Deploys ${lvl} mining drones at once; auto-harvests space junk in 1 turn`),
  },

  // Engineering & Cargo Upgrades
  plasma_generator: {
    id: 'plasma_generator',
    room: 'engineering',
    name: 'Plasma Generator (Starts at Lv 1)',
    summary: 'Solar & radiation collector. Passively creates free Plasma every turn (+4/turn per level).',
    maxLevel: 5,
    startLevel: 1,
    xpCosts: [0, 40, 70, 110, 160],
    scrapCosts: [0, 25, 45, 70, 100],
    getEffectDesc: (lvl) => `Passively generates +${lvl * 4} Plasma every turn into your reserve`,
  },
  plasma_synthesizer: {
    id: 'plasma_synthesizer',
    room: 'engineering',
    name: 'Plasma Synthesizer (Starts at Lv 1)',
    summary: 'Turns raw mined Scrap into pure Plasma fuel (improves conversion ratio per level).',
    maxLevel: 5,
    startLevel: 1,
    xpCosts: [0, 35, 65, 100, 150],
    scrapCosts: [0, 20, 40, 65, 95],
    getEffectDesc: (lvl) => `Converts ${Math.max(4, 9 - lvl)} Scrap into +${30 + lvl * 5} pure Plasma fuel`,
  },
  kilopower_reactor: {
    id: 'kilopower_reactor',
    room: 'engineering',
    name: 'Kilopower Nuclear Reactors',
    summary: 'Compact fission core. Guarantees steady Plasma generation even in dark deep-space sectors.',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [30, 55, 90, 135, 190],
    scrapCosts: [25, 40, 65, 95, 135],
    getEffectDesc: (lvl) => (lvl === 0 ? 'Standard core only' : `+${lvl * 2} Max Reactor power pips and guaranteed +${lvl * 3} dark-sector Plasma`),
  },
  laser_beaming: {
    id: 'laser_beaming',
    room: 'engineering',
    name: 'Laser Power Beaming Receivers',
    summary: 'Hull capture arrays. Receive free wireless Plasma when near Garage or Shop laser relays.',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [20, 40, 65, 100, 145],
    scrapCosts: [15, 25, 40, 60, 90],
    getEffectDesc: (lvl) => (lvl === 0 ? 'No beaming receiver' : `Beams +${30 + lvl * 15} free wireless Plasma at relays/garages`),
  },
  variable_engines: {
    id: 'variable_engines',
    room: 'engineering',
    name: 'Variable-Thrust Ion Engines',
    summary: 'Switchable thrusters. Toggle between High-Dodge mode in combat and 50% Fuel-Saver mode in travel.',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [25, 50, 80, 120, 175],
    scrapCosts: [20, 30, 50, 75, 110],
    getEffectDesc: (lvl) => (lvl === 0 ? 'Fixed thrust' : `High-Dodge grants +${10 + lvl * 5}% dodge chance; Fuel-Saver reduces jump costs`),
  },
  photonic_sails: {
    id: 'photonic_sails',
    room: 'engineering',
    name: 'Photonic Sails',
    summary: 'Giant reflective laser sails. Travel between civilized relay beacons for 0 Plasma cost.',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [25, 45, 75, 115, 165],
    scrapCosts: [15, 30, 50, 75, 105],
    getEffectDesc: (lvl) => (lvl === 0 ? 'Travel always uses fuel' : `0 Plasma travel along relay corridors, +${lvl * 2}/turn solar plasma in transit`),
  },
  antimatter_drives: {
    id: 'antimatter_drives',
    room: 'engineering',
    name: 'Plasma Antimatter Drives',
    summary: 'Near-light-speed engine. Unlocks long-range star jumps and emergency combat warp.',
    maxLevel: 5,
    startLevel: 0,
    xpCosts: [40, 75, 120, 175, 250],
    scrapCosts: [30, 55, 90, 135, 195],
    getEffectDesc: (lvl) => (lvl === 0 ? 'Standard sub-light jump drive' : `Allows skipping up to ${lvl} beacons ahead on map & emergency combat warp`),
  },
};

export const UPGRADES_BY_ROOM: Record<RoomId, UpgradeModuleId[]> = {
  bridge: ['computing_cores', 'optical_tracking'],
  comms: ['ai_translator'],
  life: ['bioregenerative'],
  science: ['magnetic_shielding', 'self_healing', 'predictive_maintenance'],
  airlock: ['whipple_shields', 'rotary_bays'],
  engineering: [
    'plasma_generator',
    'plasma_synthesizer',
    'kilopower_reactor',
    'laser_beaming',
    'variable_engines',
    'photonic_sails',
    'antimatter_drives',
  ],
};

export const ALL_UPGRADE_IDS: UpgradeModuleId[] = [
  'computing_cores',
  'optical_tracking',
  'ai_translator',
  'bioregenerative',
  'magnetic_shielding',
  'self_healing',
  'predictive_maintenance',
  'whipple_shields',
  'rotary_bays',
  'plasma_generator',
  'plasma_synthesizer',
  'kilopower_reactor',
  'laser_beaming',
  'variable_engines',
  'photonic_sails',
  'antimatter_drives',
];
