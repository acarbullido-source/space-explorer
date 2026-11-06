import { DEFAULT_LAYOUT, ROOMS, ROOM_ORDER, SYSTEMS, SYSTEM_ORDER } from './rooms';
import { computeDock, consoleCell, key, occupancy, same, validateLayout } from './layout';
import { generateSector, pick, rand, randInt, type Rng } from './sector';
import type {
  Cell,
  EnemySys,
  Encounter,
  Enemy,
  EnemyRoom,
  EngineMode,
  FloatingDamage,
  GameState,
  Layout,
  NodeType,
  OfferId,
  RoomId,
  SpaceObject,
  SpaceObjectKind,
  SystemId,
  Tone,
  UpgradeId,
  ViewportDir,
} from './types';
import { WEAPONS, type WeaponId } from './weapons';
import { ALL_UPGRADES, type UpgradeModuleId } from './upgrades';
import { ALIEN_SPECIES, type AlienSpeciesId } from './diplomacy';
import { createAiWingman, poolMothershipPlasma } from './coop';
import { BIOMES, getBiomeBySector, type BiomeId } from './biomes';
import { FACTIONS, getFactionForSector } from './factions';
import {
  ARK_ARTIFACTS,
  STORY_EVENTS,
  checkBlueRequirement,
  type ArkArtifactId,
} from './storyEvents';

/** Real-time length of one turn while unpaused outside combat. */
export const TURN_MS = 4000;
/** Crew walking speed in tiles per second. */
export const CREW_BASE_SPEED = 3.4;
export const MANNED_BONUS = 1.25;

export interface RankTier {
  level: number;
  title: string;
  minXp: number;
  perk: string;
}

export const RANKS: RankTier[] = [
  { level: 1, title: 'Cadet', minXp: 0, perk: 'Standard clearance' },
  { level: 2, title: 'Pilot', minXp: 75, perk: '+5% trade discount' },
  { level: 3, title: 'Captain', minXp: 200, perk: '+10% trade discount & peaceful hails' },
  { level: 4, title: 'Commander', minXp: 400, perk: '+15% trade discount & +2/t core plasma' },
  { level: 5, title: 'Star Envoy', minXp: 700, perk: 'Allied beacons beam free plasma' },
];

export function getRank(rankXp: number): {
  current: RankTier;
  next: RankTier | null;
  progress: number;
} {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (rankXp >= RANKS[i].minXp) idx = i;
  }
  const current = RANKS[idx];
  const next = RANKS[idx + 1] ?? null;
  const progress = next
    ? Math.min(1, (rankXp - current.minXp) / Math.max(1, next.minXp - current.minXp))
    : 1;
  return { current, next, progress };
}

export function getReputationBadge(rep: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (rep <= -50) return { label: 'Outlaw', color: 'text-red-300', bg: 'bg-red-500/20 border-red-400/50' };
  if (rep < -10) return { label: 'Suspect', color: 'text-amber-300', bg: 'bg-amber-500/20 border-amber-400/50' };
  if (rep <= 15) return { label: 'Neutral', color: 'text-slate-200', bg: 'bg-slate-700/40 border-slate-500/50' };
  if (rep < 60) return { label: 'Friendly', color: 'text-cyan-300', bg: 'bg-cyan-500/20 border-cyan-400/50' };
  return { label: 'Trusted Ally', color: 'text-emerald-300', bg: 'bg-emerald-500/20 border-emerald-400/50' };
}

export const UPGRADES: Record<
  UpgradeId,
  { name: string; desc: string; scrapCosts: number[]; xpCosts: number[] }
> = {
  sails: {
    name: 'Photonic Sails',
    desc: '0 Plasma jumps between any Relay nodes & +3/t solar Plasma',
    scrapCosts: [15],
    xpCosts: [35],
  },
  shields: {
    name: 'Shield Boost',
    desc: '+1 magnetic shield bubble capacity',
    scrapCosts: [20, 35],
    xpCosts: [40, 75],
  },
  drones: {
    name: 'Repair Drones',
    desc: 'Auto-fix damaged rooms every turn',
    scrapCosts: [25, 40],
    xpCosts: [45, 80],
  },
  reactor: {
    name: 'Plasma Core',
    desc: '+2 max power pips & +40 max Plasma tank',
    scrapCosts: [15, 25, 40],
    xpCosts: [30, 55, 90],
  },
  hull: {
    name: 'Hull Armor',
    desc: '+15 max hull & instant +15 hull repair',
    scrapCosts: [20, 30],
    xpCosts: [35, 60],
  },
  weapons: {
    name: 'Laser Focus',
    desc: '+1 weapon damage per volley',
    scrapCosts: [25, 40],
    xpCosts: [50, 85],
  },
  scanner: {
    name: 'Deep Scanner',
    desc: 'Reveals every beacon on the Sector Map',
    scrapCosts: [15],
    xpCosts: [30],
  },
};

export const UPGRADE_ORDER: UpgradeId[] = [
  'sails',
  'reactor',
  'shields',
  'weapons',
  'hull',
  'drones',
  'scanner',
];

export const ENEMY_SYS_LABEL: Record<EnemySys, string> = {
  weapons: 'Weapons',
  shields: 'Shields',
  engines: 'Engines',
};

const DIRECTIONS: ViewportDir[] = ['Front', 'Left', 'Right', 'Rear'];

export type Action =
  | { type: 'TICK' }
  | { type: 'PAUSE'; value?: boolean }
  | { type: 'CREW_CELL'; cell: Cell }
  | { type: 'SET_POWER'; sys: SystemId; value: number }
  | { type: 'TARGET'; target: EnemySys | null }
  | { type: 'FIRE' }
  | { type: 'SELECT_WEAPON_SLOT'; index: number | null }
  | { type: 'SET_WEAPON_TARGET'; slotIndex: number; targetRoomId: string | null }
  | { type: 'SWAP_WEAPON'; slotIndex: number; newWeaponId: WeaponId }
  | { type: 'EXECUTE_COMBAT_TURN' }
  | { type: 'EMERGENCY_AUTO_CLOAK' }
  | { type: 'DISMISS_AUTO_CLOAK' }
  | { type: 'JUMP'; node: number }
  | { type: 'NEXT_SECTOR' }
  | { type: 'CONVERT' }
  | { type: 'REFILL_PLASMA_XP' }
  | { type: 'ENGINE_MODE'; mode: EngineMode }
  | { type: 'HEALING' }
  | { type: 'REST' }
  | { type: 'HAIL' }
  | { type: 'TRADE'; offer: OfferId }
  | { type: 'HELP' }
  | { type: 'EVA' }
  | { type: 'DOCK' }
  | { type: 'UNDOCK' }
  | { type: 'RESEARCH'; id: UpgradeId; currency: 'scrap' | 'xp' }
  | { type: 'ANALYZE' }
  | { type: 'MINE_OBJECT'; objectId: string }
  | { type: 'POD_ACTION'; objectId: string; mode: 'rescue' | 'salvage' }
  | { type: 'COLLECT_ARTIFACT'; objectId: string }
  | { type: 'LASER_RECHARGE'; objectId: string }
  | { type: 'ENGAGE_VESSEL'; objectId: string }
  | { type: 'SAVE_LAYOUT'; layout: Layout }
  | { type: 'UPGRADE_MODULE'; moduleId: UpgradeModuleId; currency: 'xp' | 'scrap' }
  | { type: 'SIGN_TREATY'; species: AlienSpeciesId }
  | { type: 'DOCK_MOTHERSHIP'; mode: 'local_ai' | 'network_code'; roomCode?: string }
  | { type: 'UNDOCK_MOTHERSHIP' }
  | { type: 'TOGGLE_PRIMARY_SHIP' }
  | { type: 'MOVE_PARTNER_CREW'; cell: Cell }
  | { type: 'TRIGGER_STORY_EVENT'; eventId?: string }
  | { type: 'CHOOSE_STORY_OPTION'; optionIndex: number }
  | { type: 'CLOSE_STORY_EVENT' }
  | { type: 'CLAIM_ARK_ARTIFACT'; artifactId: ArkArtifactId }
  | { type: 'SET_BIOME'; biomeId: BiomeId }
  | { type: 'RESTART'; seed: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function push(s: GameState, text: string, tone: Tone = 'info') {
  s.logId += 1;
  s.log = [...s.log.slice(-29), { id: s.logId, text, tone }];
}

function awardXp(s: GameState, amount: number) {
  if (amount <= 0) return;
  const before = getRank(s.rankXp).current.level;
  s.rankXp += amount;
  s.spendXp += amount;
  const after = getRank(s.rankXp).current;
  if (after.level > before) {
    push(s, `Promoted to Rank ${after.level}: ${after.title}! (${after.perk})`, 'good');
  }
}

/* ------------------------------------------------------------------ */
/* Interactive Viewport Space Objects                                  */
/* ------------------------------------------------------------------ */

function perimeterPos(r: Rng, slot: number, total: number): { x: number; y: number; dir: ViewportDir } {
  const angle = (slot / Math.max(1, total)) * Math.PI * 2 + (rand(r) - 0.5) * 0.35;
  const rx = 0.38 + rand(r) * 0.07;
  const ry = 0.34 + rand(r) * 0.06;
  const x = clamp(0.5 + Math.cos(angle) * rx, 0.07, 0.93);
  const y = clamp(0.5 + Math.sin(angle) * ry, 0.14, 0.84);
  const dir: ViewportDir =
    Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))
      ? Math.cos(angle) >= 0
        ? 'Front'
        : 'Rear'
      : Math.sin(angle) >= 0
        ? 'Right'
        : 'Left';
  return { x, y, dir };
}

function spawnSpaceObjects(r: Rng, kind: NodeType, species: string): SpaceObject[] {
  const specs: { kind: SpaceObjectKind; label: string }[] = [];

  specs.push({ kind: 'asteroid', label: 'Iron Asteroid' });
  specs.push({ kind: 'junk', label: 'Orbital Scrap Cluster' });

  if (kind === 'garage') {
    specs.push({ kind: 'relay', label: 'Earth Laser Relay' });
    specs.push({ kind: 'artifact', label: 'Old-Earth Data Core' });
    specs.push({ kind: 'pod', label: 'Cryo Escape Pod' });
  } else if (kind === 'shop') {
    specs.push({ kind: 'shop', label: `${species} Trade Dock` });
    specs.push({ kind: 'relay', label: 'Solar Beaming Relay' });
    specs.push({ kind: 'asteroid', label: 'Rich Ore Asteroid' });
  } else if (kind === 'relay') {
    specs.push({ kind: 'relay', label: 'Photonic Laser Relay' });
    specs.push({ kind: 'artifact', label: 'Drifting Relic' });
    specs.push({ kind: 'pod', label: 'Stranded Shuttle' });
  } else if (kind === 'junk') {
    specs.push({ kind: 'asteroid', label: 'Dense Asteroid' });
    specs.push({ kind: 'junk', label: 'Hull Wreckage' });
    specs.push({ kind: 'artifact', label: 'Ancient Artifact' });
  } else if (kind === 'derelict') {
    specs.push({ kind: 'pod', label: 'Damaged Escape Pod' });
    specs.push({ kind: 'artifact', label: 'Sealed Vault Relic' });
    specs.push({ kind: 'junk', label: 'Debris Cluster' });
  } else if (kind === 'trader' || kind === 'empty') {
    specs.push({ kind: 'vessel', label: `${species} Patrol Vessel` });
    specs.push({ kind: 'pod', label: 'Stranded Courier Pod' });
    if (rand(r) < 0.65) specs.push({ kind: 'artifact', label: 'Ancient Artifact' });
  } else if (kind === 'distress') {
    specs.push({ kind: 'pod', label: `${species} Escape Pod` });
    specs.push({ kind: 'vessel', label: `Stranded ${species} Ship` });
    specs.push({ kind: 'artifact', label: 'Signal Beacon Relic' });
  } else if (kind === 'hostile') {
    specs.push({ kind: 'asteroid', label: 'Cover Asteroid' });
    specs.push({ kind: 'pod', label: 'Ejected Life Pod' });
  } else if (kind === 'exit') {
    specs.push({ kind: 'relay', label: 'Sector Gate Relay' });
    specs.push({ kind: 'artifact', label: 'Gatekeeper Relic' });
  }

  return specs.map((sp, i) => {
    const pos = perimeterPos(r, i, specs.length);
    return {
      id: `obj-${i}-${Math.round(rand(r) * 99999)}`,
      kind: sp.kind,
      label: sp.label,
      direction: DIRECTIONS[i % DIRECTIONS.length] ?? pos.dir,
      x: pos.x,
      y: pos.y,
      vx: (rand(r) - 0.5) * 0.0006,
      vy: (rand(r) - 0.5) * 0.0006,
      resolved: false,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Enemy Generation & Rooms Cutaway                                   */
/* ------------------------------------------------------------------ */

export function makeEnemyRooms(_r: Rng, sector: number): EnemyRoom[] {
  const hpBase = sector >= 2 ? 3 : 2;
  return [
    {
      id: 'weapons',
      name: 'Weapons Bay',
      hp: hpBase,
      maxHp: hpBase,
      gx: 2,
      gy: 0,
      gw: 2,
      gh: 2,
      color: '#22d3ee',
      burnTurns: 0,
      neighbors: ['bridge', 'shields'],
    },
    {
      id: 'bridge',
      name: 'Helm & Bridge',
      hp: hpBase,
      maxHp: hpBase,
      gx: 4,
      gy: 1,
      gw: 2,
      gh: 2,
      color: '#38bdf8',
      burnTurns: 0,
      neighbors: ['weapons', 'shields'],
    },
    {
      id: 'shields',
      name: 'Shield Core',
      hp: hpBase,
      maxHp: hpBase,
      gx: 2,
      gy: 2,
      gw: 2,
      gh: 2,
      color: '#60a5fa',
      burnTurns: 0,
      neighbors: ['weapons', 'engines', 'bridge'],
    },
    {
      id: 'engines',
      name: 'Thruster Array',
      hp: hpBase,
      maxHp: hpBase,
      gx: 0,
      gy: 1,
      gw: 2,
      gh: 2,
      color: '#fb923c',
      burnTurns: 0,
      neighbors: ['shields'],
    },
  ];
}

function makeEnemy(r: Rng, sector: number, customName?: string): Enemy {
  const faction = getFactionForSector(sector);
  const maxHull = 60 + sector * 25 + randInt(r, 0, 15);
  const maxShields = sector >= 2 ? 2 : rand(r) < 0.6 ? 1 : 0;
  const rooms = makeEnemyRooms(r, sector);
  return {
    name: customName ?? `${faction.name} Skirmisher`,
    faction: faction.id,
    hull: maxHull,
    maxHull,
    shields: maxShields,
    maxShields,
    shieldCharge: 0,
    charge: rand(r) * 0.4,
    speed: 15 + sector * 5,
    rooms,
    activeWeaponName: faction.primaryWeapons[0] ?? 'Pulse Laser',
  };
}

export function makeEncounter(r: Rng, kind: NodeType, sector: number): Encounter {
  const biome = getBiomeBySector(sector);
  const faction = getFactionForSector(sector, kind);
  const objects = spawnSpaceObjects(r, kind, faction.speciesName);
  const hasStory = kind === 'distress' || kind === 'derelict' || rand(r) < 0.4;
  const storyEv = STORY_EVENTS.find((ev) => ev.factionId === faction.id) ?? STORY_EVENTS[0];

  if (hasStory) {
    objects.push({
      id: `story-beacon-${Date.now()}-${randInt(r, 1, 999)}`,
      kind: 'artifact',
      label: `Anomaly: ${storyEv.title}`,
      direction: 'Front',
      x: 0.78,
      y: 0.28,
      vx: 0.0001,
      vy: -0.0001,
      resolved: false,
    });
  }

  const e: Encounter = {
    kind,
    name: '',
    species: faction.speciesName,
    faction: faction.id,
    biome: biome.id,
    junk: objects.filter((o) => o.kind === 'asteroid' || o.kind === 'junk').length,
    dockable: false,
    partner: null,
    hailed: false,
    hailText: '',
    helped: false,
    looted: false,
    enemy: null,
    objects,
    hasStoryAnomaly: hasStory,
    storyEventId: hasStory ? storyEv.id : undefined,
  };
  switch (kind) {
    case 'garage':
      e.name = 'Home Garage (Cradle)';
      break;
    case 'shop':
      e.name = `${faction.name} Satellite Dock`;
      break;
    case 'relay':
      e.name = `${biome.name} Laser Relay`;
      break;
    case 'junk':
      e.name = `${biome.subtitle} Debris Field`;
      break;
    case 'derelict':
      e.name = `${faction.name} Derelict Hulk`;
      e.dockable = true;
      e.partner = 'derelict';
      break;
    case 'trader':
      e.name = `${faction.name} Merchant`;
      e.dockable = true;
      e.partner = 'trader';
      break;
    case 'hostile':
      e.enemy = makeEnemy(r, sector);
      e.name = e.enemy.name;
      break;
    case 'distress':
      e.name = `${faction.name} Distress Signal`;
      break;
    case 'empty':
      e.name = `${biome.name} Patrol Zone`;
      break;
    case 'exit':
      e.name = `${biome.name} Hyper Gate`;
      break;
  }
  return e;
}

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

export function initialState(seed: number): GameState {
  const r: Rng = { seed };
  const nodes = generateSector(r, 1);
  const encounter = makeEncounter(r, 'garage', 1);
  const bridge = DEFAULT_LAYOUT.find((p) => p.id === 'bridge')!;
  return {
    seed: r.seed,
    layout: DEFAULT_LAYOUT.map((p) => ({ ...p })),
    crew: { cell: consoleCell(bridge), health: 100, stamina: 90, restBuff: 0 },
    roomHp: Object.fromEntries(ROOM_ORDER.map((id) => [id, ROOMS[id].maxHp])) as Record<RoomId, number>,
    power: { shields: 2, weapons: 2, engines: 2, life: 2 },
    reactor: 10,
    hull: 100,
    maxHull: 100,
    shieldLayers: 1,
    shieldCharge: 0,
    weaponCharge: 0,
    plasma: 140,
    maxPlasma: 200,
    scrap: 35,
    rankXp: 25,
    spendXp: 50,
    reputation: 15,
    oxygen: 100,
    food: 90,
    artifacts: 1,
    analyzing: 0,
    eva: 0,
    engineMode: 'saver',
    healing: false,
    restCooldown: 0,
    upgrades: {
      sails: 1,
      shields: 0,
      drones: 0,
      reactor: 0,
      hull: 0,
      weapons: 0,
      scanner: 0,
    },
    docked: null,
    sector: 1,
    nodes,
    current: 0,
    encounter,
    turn: 1,
    paused: false,
    target: null,
    gameOver: null,
    log: [
      { id: 1, text: 'Docked at Home Garage above shattered Earth. Click space objects to mine or rescue!', tone: 'info' },
      { id: 2, text: 'Press M (or click Sector Map) to jump between beacons.', tone: 'info' },
    ],
    logId: 2,
    fx: { hitRoom: null, hitId: 0, shot: 0, enemyHit: 0, jump: 0, beamTarget: null },

    /* Combat extension */
    equippedWeapons: [
      { weaponId: 'repeater', targetRoomId: 'weapons', charged: false, consecutiveHits: 0, lastTargetId: null },
      { weaponId: 'beam', targetRoomId: 'shields', charged: false, consecutiveHits: 0, lastTargetId: null },
      { weaponId: 'caster', targetRoomId: 'engines', charged: false, consecutiveHits: 0, lastTargetId: null },
    ],
    arsenal: ['repeater', 'beam', 'caster', 'whip', 'nova', 'torpedo'],
    selectedWeaponSlot: 0,
    combatPhase: 'planning',
    projectiles: [],
    floatingDamages: [],
    autoCloak: null,

    /* 16 Multi-Level Ship Upgrades (Levels 0 to 5) */
    moduleLevels: {
      computing_cores: 0,
      optical_tracking: 0,
      ai_translator: 0,
      bioregenerative: 0,
      magnetic_shielding: 0,
      self_healing: 0,
      predictive_maintenance: 0,
      whipple_shields: 0,
      rotary_bays: 0,
      plasma_generator: 1, // Starts at Lv 1
      plasma_synthesizer: 1, // Starts at Lv 1
      kilopower_reactor: 0,
      laser_beaming: 0,
      variable_engines: 0,
      photonic_sails: 0,
      antimatter_drives: 0,
    },

    /* Alien Diplomacy */
    diplomacy: {
      alliances: [],
      activeTreaty: null,
      dialogueHistory: [],
    },

    /* Co-Op Mothership Mode */
    mothership: {
      active: false,
      primaryShip: 'player',
      partner: null,
      mode: 'local_ai',
      roomCode: '7249',
      connected: false,
    },
    partnerCrewPos: null,

    /* 5 Solar System Biomes & 4 Factions */
    biome: 'shattered_cradle',
    faction: 'terran',
    flareWarning: false,

    /* Earth Ark Codex (5 Artifacts) & FTL Blue Option Story Events */
    arkCodex: {
      ark_core: false,
      genesis_key: false,
      seed_matrix: false,
      resonance_crystal: false,
      nav_chart: false,
    },
    activeStoryEvent: null,
    storyOutcome: null,
  };
}

/* ------------------------------------------------------------------ */
/* Derived values                                                      */
/* ------------------------------------------------------------------ */

export function mannedRoom(s: GameState): RoomId | null {
  for (const p of s.layout) if (same(consoleCell(p), s.crew.cell)) return p.id;
  return null;
}

export function crewLocation(s: GameState): RoomId | 'tube' | 'partner' | null {
  const room = occupancy(s.layout).get(key(s.crew.cell));
  if (room) return room;
  if (s.docked) {
    const dock = computeDock(s.layout);
    if (dock?.tube.some((c) => same(c, s.crew.cell))) return 'tube';
    if (dock?.partnerCells.some((c) => same(c, s.crew.cell))) return 'partner';
  }
  return null;
}

export const maxPower = (s: GameState, sys: SystemId) =>
  SYSTEMS[sys].base + (sys === 'shields' ? 2 * s.upgrades.shields : 0);

export const usedPower = (s: GameState) => SYSTEM_ORDER.reduce((n, k) => n + s.power[k], 0);

/** Net Plasma gain/drain per turn based on solar/reactor generation vs allocated system pips. */
export function netPlasmaPerTurn(s: GameState): number {
  const engHp = s.roomHp.engineering / ROOMS.engineering.maxHp;
  const engManned = mannedRoom(s) === 'engineering' ? 3 : 0;
  const biomeDef = BIOMES[s.biome ?? 'shattered_cradle'];
  const solarMult = biomeDef.solarPlasmaMultiplier;

  const sailsBonus =
    (s.upgrades.sails > 0 ? 3 : 0) + ((s.moduleLevels?.photonic_sails ?? 0) * 2);
  const relayBonus =
    s.encounter.kind === 'garage' || s.encounter.kind === 'relay' || s.encounter.kind === 'shop'
      ? 5 + (s.moduleLevels?.laser_beaming ?? 0) * 3
      : 0;
  const rankBonus = getRank(s.rankXp).current.level >= 4 ? 2 : 0;

  // Solar generation affected by biome sunlight (2x in Helios Forge, 0 in Dark Graveyard)
  const solarGen = Math.round(
    (8 * engHp + (s.moduleLevels?.plasma_generator ?? 1) * 4 + sailsBonus) * solarMult,
  );
  // Fission / nuclear reactors produce continuous power regardless of solar occlusion
  const reactorGen =
    Math.round((s.upgrades.reactor * 2) * engHp) + ((s.moduleLevels?.kilopower_reactor ?? 0) * 3);

  const generation = solarGen + reactorGen + engManned + relayBonus + rankBonus;

  // Bioregenerative systems reduce Life Support power drain (at Lv 5: 0 drain)
  const bioLvl = s.moduleLevels?.bioregenerative ?? 0;
  const bioMult = Math.max(0, 1 - bioLvl * 0.2);
  const lifeDrain = Math.round(s.power.life * bioMult);

  const drain =
    s.power.shields +
    s.power.weapons +
    s.power.engines +
    lifeDrain +
    (s.engineMode === 'evasion' ? 2 : 0);

  // Partner ship auxiliary plasma support in Mothership mode
  const partnerBonus = s.mothership?.active && s.mothership.partner ? 4 : 0;

  return generation - drain + partnerBonus;
}

export function output(s: GameState, id: RoomId): number {
  const def = ROOMS[id];
  const hp = s.roomHp[id] / def.maxHp;
  const pw = def.system ? Math.min(1, s.power[def.system] / SYSTEMS[def.system].base) : 1;
  const hasPlasma = s.plasma > 0 ? 1 : 0.35;
  return hp * pw * hasPlasma * (mannedRoom(s) === id ? MANNED_BONUS : 1);
}

export const shieldMax = (s: GameState) => {
  if (s.plasma <= 0) return 0;
  const base = Math.floor((s.power.shields * s.roomHp.science) / ROOMS.science.maxHp / 2 + 1e-6);
  const magShielding = s.moduleLevels?.magnetic_shielding ?? 0;
  const partnerShield = s.mothership?.active && s.mothership.partner ? 1 : 0;
  return base + magShielding + partnerShield;
};

export function evasion(s: GameState): number {
  if (s.roomHp.bridge <= 0 || s.plasma <= 0) return 0;
  const varLvl = s.moduleLevels?.variable_engines ?? 0;
  let v =
    output(s, 'engineering') * 30 +
    (s.engineMode === 'evasion' ? 15 + varLvl * 5 : 0) +
    (mannedRoom(s) === 'bridge' ? 5 : 0);

  // Nova Cannon charging penalty: -50% dodge
  const novaCharging = s.equippedWeapons.some(
    (w) => w.weaponId === 'nova' && w.charged && w.targetRoomId,
  );
  if (novaCharging) {
    v *= 0.5;
  }
  return Math.round(clamp(v, 0, 75));
}

export function jumpPlasmaCost(
  s: GameState,
  targetNodeId?: number,
): { cost: number; photonic: boolean; blocked?: string } {
  // Fracture Frontier entry check
  if (s.biome === 'fracture_frontier' && (s.moduleLevels?.antimatter_drives ?? 0) < 1) {
    return {
      cost: 999,
      photonic: false,
      blocked: 'Fracture Space anomaly! Requires Plasma Antimatter Drives (Lv 1+) to jump.',
    };
  }

  if (targetNodeId !== undefined) {
    const cur = s.nodes[s.current];
    const dest = s.nodes[targetNodeId];
    if (
      cur &&
      dest &&
      cur.relay &&
      dest.relay &&
      (s.upgrades.sails > 0 || (s.moduleLevels?.photonic_sails ?? 0) > 0 || s.biome === 'beacon_highway')
    ) {
      return { cost: 0, photonic: true };
    }
  }
  const varEngSavings = (s.moduleLevels?.variable_engines ?? 0) * 2;
  const baseCost = s.engineMode === 'evasion' ? 25 : 15;
  return { cost: Math.max(5, baseCost - varEngSavings), photonic: false };
}

export const weaponDamage = (s: GameState) => 2 + s.upgrades.weapons;
export const convertScrapCost = (s: GameState) => {
  const synthLvl = s.moduleLevels?.plasma_synthesizer ?? 1;
  const base = s.roomHp.engineering >= ROOMS.engineering.maxHp ? 8 : 10;
  return Math.max(4, base - (synthLvl - 1));
};
export const convertPlasmaGain = (s?: GameState) => {
  const synthLvl = s?.moduleLevels?.plasma_synthesizer ?? 1;
  return 30 + (synthLvl - 1) * 5;
};

export function priceMult(s: GameState): number {
  const rank = getRank(s.rankXp).current.level;
  const repFactor = (s.reputation / 100) * 0.2;
  const rankFactor = (rank - 1) * 0.05;
  const commsFactor = 0.12 * output(s, 'comms');
  const translatorFactor = (s.moduleLevels?.ai_translator ?? 0) * 0.05;
  const treatyDiscount = s.diplomacy?.activeTreaty === 'Varn' ? 0.15 : 0;
  // Beacon Highway: +25 reputation grants 25% discount
  const highwayDiscount = s.biome === 'beacon_highway' && s.reputation >= 25 ? 0.25 : 0;
  // Vexx Black Market: Outlaw reputation (-25 or lower) grants 20% discount
  const vexxDiscount = s.faction === 'vexx' && s.reputation <= -25 ? 0.20 : 0;

  return clamp(
    1.2 -
      repFactor -
      rankFactor -
      commsFactor -
      translatorFactor -
      treatyDiscount -
      highwayDiscount -
      vexxDiscount,
    0.35,
    1.45,
  );
}

export const sensorsOn = (s: GameState) => output(s, 'comms') >= 0.5 || s.upgrades.scanner > 0;
export const hostileActive = (s: GameState) => !!s.encounter.enemy && s.encounter.enemy.hull > 0;
export const canEditLayout = (s: GameState) =>
  s.encounter.kind === 'garage' || s.encounter.kind === 'shop' || s.encounter.kind === 'relay';

export function lifeRates(s: GameState) {
  const life = output(s, 'life');
  return {
    oxygen: life * 8 - 3.5,
    food: life * 2.2 - 1.0 - (s.healing ? 1.2 : 0),
  };
}

export interface Offer {
  id: OfferId;
  label: string;
  detail: string;
  currency: 'xp' | 'scrap';
  cost: number;
  ok: boolean;
}

export function offers(s: GameState): Offer[] {
  const m = priceMult(s);
  const p = (n: number) => Math.max(5, Math.round(n * m));
  const raw: Omit<Offer, 'ok'>[] = [
    { id: 'repair', label: 'Hull Patch (+25%)', detail: 'Restore 25 Hull Armor', currency: 'xp', cost: p(20) },
    { id: 'plasma', label: 'Plasma Cell (+60)', detail: 'Refill 60 Plasma Reserve', currency: 'xp', cost: p(18) },
    { id: 'food', label: 'Hydro Rations (+35%)', detail: 'Refill crew food & air', currency: 'xp', cost: p(12) },
    { id: 'medkit', label: 'Nano Medkit (+50 HP)', detail: 'Heal crew health', currency: 'xp', cost: p(15) },
    { id: 'buy_scrap', label: 'Bulk Scrap (+20)', detail: 'Buy 20 raw Scrap', currency: 'xp', cost: p(25) },
    { id: 'sell_scrap', label: 'Refine Scrap (−15)', detail: '+25 Spendable XP & +40 Plasma', currency: 'scrap', cost: 15 },
  ];
  return raw.map((o) => ({
    ...o,
    ok:
      (o.currency === 'xp' ? s.spendXp >= o.cost : s.scrap >= o.cost) &&
      (o.id !== 'repair' || s.hull < s.maxHull) &&
      (o.id !== 'plasma' || s.plasma < s.maxPlasma) &&
      (o.id !== 'medkit' || s.crew.health < 100),
  }));
}

/* ------------------------------------------------------------------ */
/* Non-destructive Emergency Auto-Cloak & Retreat                      */
/* ------------------------------------------------------------------ */

export function triggerAutoCloakRetreat(s: GameState, r: Rng, reason?: string) {
  s.hull = 25;
  s.plasma = Math.max(12, Math.round(s.maxPlasma * 0.06));
  s.current = 0;
  s.docked = null;
  s.eva = 0;
  s.combatPhase = 'planning';
  s.projectiles = [];
  s.target = null;

  s.encounter = makeEncounter(r, 'garage', 1);
  s.encounter.objects.push(
    {
      id: `emergency-scrap-1-${s.turn}`,
      kind: 'junk',
      label: 'Free Earth Orbit Salvage',
      direction: 'Front',
      x: 0.82,
      y: 0.32,
      vx: 0.0002,
      vy: -0.0001,
      resolved: false,
    },
    {
      id: `emergency-scrap-2-${s.turn}`,
      kind: 'asteroid',
      label: 'Home Asteroid Cluster',
      direction: 'Left',
      x: 0.18,
      y: 0.28,
      vx: -0.0001,
      vy: 0.0002,
      resolved: false,
    },
    {
      id: `emergency-scrap-3-${s.turn}`,
      kind: 'junk',
      label: 'Orbital Scrap Debris',
      direction: 'Right',
      x: 0.85,
      y: 0.72,
      vx: -0.0002,
      vy: -0.0002,
      resolved: false,
    },
  );
  s.encounter.junk = 3;

  s.roomHp.bridge = Math.max(1, s.roomHp.bridge - 1);
  s.roomHp.science = Math.max(1, s.roomHp.science - 1);

  s.autoCloak = {
    active: true,
    banner:
      reason ??
      'Hull Critical! Emergency Auto-Cloak Engaged — Warping to Earth Garage.',
  };
  s.fx.jump += 1;
  push(s, 'Emergency Auto-Cloak engaged! Warped back to Home Garage.', 'warn');
  push(s, 'Free orbital scrap is floating outside the bay — mine it to synthesize Plasma!', 'good');
}

/* ------------------------------------------------------------------ */
/* Turn-Based Combat Execution Loop                                    */
/* ------------------------------------------------------------------ */

export function executeCombatTurnDraft(s: GameState, r: Rng) {
  const e = s.encounter.enemy;
  if (!e || e.hull <= 0) return;

  s.combatPhase = 'executing';
  s.turn += 1;
  const manned = mannedRoom(s);
  const fd: FloatingDamage[] = [];
  let nextFdId = Date.now();

  const addFd = (text: string, x: number, y: number, color: string) => {
    fd.push({ id: nextFdId++, text, x, y, color, alpha: 1 });
  };

  // 1. Initiative Check (Computing Cores grant +8 initiative speed per level)
  const computingBonus = (s.moduleLevels?.computing_cores ?? 0) * 8;
  const playerSpeed = 20 + s.power.engines * 6 + (manned === 'engineering' ? 10 : 0) + computingBonus;
  const enemyEngRoom = e.rooms.find((rm) => rm.id === 'engines');
  const enemySpeed = enemyEngRoom && enemyEngRoom.hp > 0 ? e.speed : 0;
  const playerActsFirst = playerSpeed >= enemySpeed;

  // Evasion stats
  const playerDodge = evasion(s);
  const enemyBridgeRoom = e.rooms.find((rm) => rm.id === 'bridge');
  const enemyDodgeBase = enemyEngRoom && enemyEngRoom.hp > 0 ? 15 : 0;
  const enemyDodge = enemyBridgeRoom && enemyBridgeRoom.hp > 0 ? enemyDodgeBase + 5 : 0;

  const resolvePlayerWeapons = () => {
    for (const slot of s.equippedWeapons) {
      if (!slot.targetRoomId) continue;
      const def = WEAPONS[slot.weaponId];
      if (s.plasma < def.cost) {
        push(s, `Skipped ${def.name}: need ${def.cost} Plasma.`, 'warn');
        continue;
      }

      const targetRoom = e.rooms.find((rm) => rm.id === slot.targetRoomId);
      if (!targetRoom) continue;

      // Deduct Plasma cost
      s.plasma = Math.max(0, s.plasma - def.cost);

      // Weapon 5: Plasma Nova Cannon (Turn 1 charges, Turn 2 fires)
      if (slot.weaponId === 'nova') {
        if (!slot.charged) {
          slot.charged = true;
          push(s, 'Plasma Nova Cannon charging! (−50% dodge this turn).', 'warn');
          addFd('CHARGING...', 680, 200, '#ef4444');
          continue;
        } else {
          slot.charged = false; // fire now!
        }
      }

      // Check Enemy Dodge
      if (rand(r) * 100 < enemyDodge) {
        push(s, `${def.name} shot missed — enemy dodged!`, 'warn');
        addFd('DODGED', 680, 200, '#94a3b8');
        continue;
      }

      // Execute specific weapon mechanics
      switch (slot.weaponId) {
        // 1. Plasma Repeater: 4 quick bolts (6 damage each) stripping light shields
        case 'repeater': {
          let totalDmg = 0;
          for (let b = 0; b < 4; b++) {
            if (e.shields > 0) {
              e.shields -= 1;
              addFd('SHIELD STRIPPED', 680, 160 + b * 18, '#38bdf8');
            } else {
              totalDmg += 6;
            }
          }
          if (totalDmg > 0) {
            e.hull = Math.max(0, e.hull - totalDmg);
            targetRoom.hp = Math.max(0, targetRoom.hp - 1);
            addFd(`−${totalDmg}`, 680, 210, '#4ade80');
            push(s, `Plasma Repeater 4-bolt hit: −${totalDmg} damage to ${targetRoom.name}!`, 'good');
          }
          break;
        }

        // 2. Thermal Plasma Beam: consecutive hits deal 1x (12), 2x (24), 3x (36)
        case 'beam': {
          if (slot.lastTargetId === slot.targetRoomId) {
            slot.consecutiveHits = Math.min(3, slot.consecutiveHits + 1);
          } else {
            slot.consecutiveHits = 1;
            slot.lastTargetId = slot.targetRoomId;
          }
          const dmg = 12 * slot.consecutiveHits;
          if (e.shields > 0) {
            e.shields -= 1;
            addFd('SHIELD ABSORBED', 680, 180, '#38bdf8');
          } else {
            e.hull = Math.max(0, e.hull - dmg);
            targetRoom.hp = Math.max(0, targetRoom.hp - 1);
            addFd(`−${dmg} (${slot.consecutiveHits}x Heat)`, 680, 200, '#34d399');
            push(s, `Thermal Beam (${slot.consecutiveHits}x Heat) dealt −${dmg} to ${targetRoom.name}!`, 'good');
          }
          break;
        }

        // 3. Plasma Caster: 28 direct room damage + 14 splash to adjacent rooms
        case 'caster': {
          if (e.shields > 0) {
            e.shields -= 1;
            addFd('SHIELD HIT', 680, 180, '#38bdf8');
          } else {
            e.hull = Math.max(0, e.hull - 28);
            targetRoom.hp = Math.max(0, targetRoom.hp - 1);
            addFd('−28 DIRECT', 680, 200, '#fbbf24');

            // Splash 14 damage to neighbors
            for (const nId of targetRoom.neighbors) {
              const nRoom = e.rooms.find((rm) => rm.id === nId);
              if (nRoom) {
                e.hull = Math.max(0, e.hull - 14);
                nRoom.hp = Math.max(0, nRoom.hp - 1);
                addFd(`−14 SPLASH (${nRoom.name})`, 680, 230, '#f59e0b');
              }
            }
            push(s, `Plasma Caster detonation: −28 direct + splash damage!`, 'good');
          }
          break;
        }

        // 4. Arc-Plasma Whip: 25 damage and arcs 50% to up to 2 secondary targets
        case 'whip': {
          if (e.shields > 0) {
            e.shields -= 1;
            addFd('SHIELD HIT', 680, 180, '#38bdf8');
          } else {
            e.hull = Math.max(0, e.hull - 25);
            targetRoom.hp = Math.max(0, targetRoom.hp - 1);
            addFd('−25 WHIP', 680, 200, '#f59e0b');

            // Arc to up to 2 secondary rooms
            const otherRooms = e.rooms.filter((rm) => rm.id !== targetRoom.id);
            otherRooms.slice(0, 2).forEach((sec) => {
              e.hull = Math.max(0, e.hull - 13);
              sec.hp = Math.max(0, sec.hp - 1);
              addFd(`−13 ARC (${sec.name})`, 680, 230, '#f59e0b');
            });
            push(s, `Arc-Plasma Whip struck ${targetRoom.name} and chained lightning!`, 'good');
          }
          break;
        }

        // 5. Plasma Nova Cannon: 65 damage + 15 burn damage for 2 turns
        case 'nova': {
          if (e.shields > 0) {
            e.shields -= 1;
            addFd('SHIELD CRACKED', 680, 180, '#38bdf8');
          } else {
            e.hull = Math.max(0, e.hull - 65);
            targetRoom.hp = Math.max(0, targetRoom.hp - 2);
            targetRoom.burnTurns = 2;
            addFd('−65 NOVA BLAST!', 680, 200, '#ef4444');
            push(s, `Plasma Nova Cannon BLASTED ${targetRoom.name} for −65 dmg + burning!`, 'good');
          }
          break;
        }

        // 6. Siphon Plasma Torpedo: Pierces 50% shields, steals 25 Plasma on hull hit
        case 'torpedo': {
          const effectiveShields = Math.floor(e.shields * 0.5);
          if (effectiveShields > 0) {
            e.shields = Math.max(0, e.shields - 1);
            addFd('SHIELD PIERCED', 680, 180, '#38bdf8');
          } else {
            e.hull = Math.max(0, e.hull - 35);
            targetRoom.hp = Math.max(0, targetRoom.hp - 1);
            s.plasma = Math.min(s.maxPlasma, s.plasma + 25);
            addFd('−35 (+25 Plasma Stolen)', 680, 200, '#f43f5e');
            push(s, `Siphon Torpedo pierced armor! −35 dmg and siphoned +25 Plasma!`, 'good');
          }
          break;
        }
      }
    }
  };

  const resolveEnemyAttack = () => {
    if (!e || e.hull <= 0) return;
    const enemyWpnRoom = e.rooms.find((rm) => rm.id === 'weapons');
    if (enemyWpnRoom && enemyWpnRoom.hp <= 0) {
      push(s, 'Enemy Weapons Bay is OFFLINE — enemy cannot fire!', 'good');
      addFd('WEAPONS OFFLINE', 680, 160, '#22d3ee');
      return;
    }

    if (rand(r) * 100 < playerDodge) {
      push(s, 'Enemy laser volley dodged!', 'good');
      addFd('EVADED!', 280, 200, '#22d3ee');
    } else if (s.shieldLayers > 0) {
      s.shieldLayers -= 1;
      s.shieldCharge = 0;
      push(s, 'Magnetic Shields absorbed the enemy volley.', 'info');
      addFd('SHIELD BLOCKED', 280, 180, '#38bdf8');
    } else {
      const whippleReduction = (s.moduleLevels?.whipple_shields ?? 0) * 0.1;
      const rawDmg = 12 + s.sector * 3 + randInt(r, 0, 4);
      const dmg = Math.max(3, Math.round(rawDmg * (1 - Math.min(0.5, whippleReduction))));
      s.hull = Math.max(0, s.hull - dmg);
      const targetPlayerRoom = pick(r, ROOM_ORDER);
      s.roomHp[targetPlayerRoom] = Math.max(0, s.roomHp[targetPlayerRoom] - 1);
      s.fx.hitRoom = targetPlayerRoom;
      s.fx.hitId += 1;
      addFd(`−${dmg}% Hull`, 280, 210, '#ef4444');
      push(s, `Enemy hit your ${ROOMS[targetPlayerRoom].name}! (−${dmg}% Hull)`, 'bad');
    }
  };

  // Execution Phase Order
  if (playerActsFirst) {
    resolvePlayerWeapons();
    if (e.hull > 0) resolveEnemyAttack();
  } else {
    resolveEnemyAttack();
    if (s.hull > 0) resolvePlayerWeapons();
  }

  // AI Wingman Auxiliary Support Volley (in Mothership mode)
  if (s.mothership?.active && s.mothership.partner && e.hull > 0) {
    const wingmanDmg = 16;
    if (e.shields > 0) {
      e.shields -= 1;
      addFd('WINGMAN SHIELD HIT', 680, 160, '#38bdf8');
      push(s, 'AI Wingman laser stripped 1 enemy shield bubble!', 'good');
    } else {
      e.hull = Math.max(0, e.hull - wingmanDmg);
      addFd(`−${wingmanDmg} WINGMAN VOLLEY`, 680, 190, '#38bdf8');
      push(s, `AI Wingman coordinated volley dealt −${wingmanDmg} damage to enemy!`, 'good');
    }
  }

  // Apply burn damage ticks from Nova Cannon
  for (const rm of e.rooms) {
    if (rm.burnTurns > 0) {
      rm.burnTurns -= 1;
      e.hull = Math.max(0, e.hull - 15);
      addFd(`−15 Burn (${rm.name})`, 680, 230, '#ef4444');
      push(s, `Burning plasma cloud dealt −15 to ${rm.name}!`, 'good');
    }
  }

  // Floating damage numbers
  s.floatingDamages = fd;

  // Check Victory
  if (e.hull <= 0) {
    const xpGain = randInt(r, 120, 240);
    const scrapGain = randInt(r, 45, 80);
    const plasmaGain = 50;
    awardXp(s, xpGain);
    s.scrap += scrapGain;
    s.plasma = Math.min(s.maxPlasma, s.plasma + plasmaGain);
    s.encounter.enemy = null;
    s.encounter.name = 'Pirate Wreckage Field';
    s.encounter.objects.push(
      {
        id: `wreck-${s.turn}`,
        kind: 'junk',
        label: 'Raider Hulk Wreckage',
        direction: 'Front',
        x: 0.78,
        y: 0.3,
        vx: 0.0001,
        vy: -0.0001,
        resolved: false,
      },
      {
        id: `wreck-salvage-${s.turn}`,
        kind: 'junk',
        label: 'Scrap Cargo Core',
        direction: 'Right',
        x: 0.82,
        y: 0.65,
        vx: -0.0002,
        vy: 0.0001,
        resolved: false,
      },
    );
    s.encounter.junk += 2;
    push(
      s,
      `VICTORY! Enemy defeated: +${xpGain} Spendable XP, +${scrapGain} Scrap, +${plasmaGain} Plasma synthesized!`,
      'good',
    );
    s.combatPhase = 'planning';
    return;
  }

  // Check Defeat ("Auto-Cloak & Retreat")
  if (s.hull <= 0) {
    triggerAutoCloakRetreat(
      s,
      r,
      'Hull Critical! Emergency Auto-Cloak Engaged — Warping to Earth Garage.',
    );
    return;
  }

  // Re-enter planning phase for next combat turn
  s.combatPhase = 'planning';
}

/* ------------------------------------------------------------------ */
/* Peaceful Turn Simulation (outside combat)                           */
/* ------------------------------------------------------------------ */

function tickDraft(s: GameState, r: Rng) {
  // If in combat, turns are executed strictly via Spacebar / EXECUTE_COMBAT_TURN
  if (hostileActive(s)) return;

  s.turn += 1;
  const manned = mannedRoom(s);

  // 1. Universal Plasma Reserve update
  const netPlasma = netPlasmaPerTurn(s);
  s.plasma = clamp(s.plasma + netPlasma, 0, s.maxPlasma);

  // 2. Space objects gentle drift
  for (const obj of s.encounter.objects) {
    if (obj.resolved) continue;
    obj.x = clamp(obj.x + obj.vx, 0.06, 0.94);
    obj.y = clamp(obj.y + obj.vy, 0.14, 0.84);
    if (obj.x <= 0.07 || obj.x >= 0.93) obj.vx = -obj.vx;
    if (obj.y <= 0.15 || obj.y >= 0.83) obj.vy = -obj.vy;
  }

  // 3. Life support & Auto-repairs
  const rates = lifeRates(s);
  s.oxygen = clamp(s.oxygen + rates.oxygen, 0, 100);
  s.food = clamp(s.food + rates.food, 0, 100);
  if ((s.healing || s.power.life >= 2) && s.food > 10) {
    s.crew.health = Math.min(100, s.crew.health + 4);
  }
  if (s.oxygen < 20) {
    s.crew.health -= 6;
    if (s.turn % 3 === 0) push(s, 'Oxygen critical! Power Life Support.', 'bad');
  }
  if (s.food <= 0) {
    s.crew.stamina -= 5;
  }
  s.crew.stamina = clamp(s.crew.stamina - 0.5, 0, 100);
  s.crew.restBuff = Math.max(0, s.crew.restBuff - 1);
  s.restCooldown = Math.max(0, s.restCooldown - 1);

  // Crew repairs room
  const here = occupancy(s.layout).get(key(s.crew.cell));
  if (here && s.roomHp[here] < ROOMS[here].maxHp) {
    s.roomHp[here] += 1;
    push(s, `Repaired ${ROOMS[here].name}.`, 'good');
  }

  // Auto-repairs from drones or 3+ life pips
  const droneActive = s.upgrades.drones > 0 || s.power.life >= 3;
  if (droneActive && s.plasma > 0) {
    const worst = ROOM_ORDER.filter((id) => s.roomHp[id] < ROOMS[id].maxHp).sort(
      (a, b) => s.roomHp[a] / ROOMS[a].maxHp - s.roomHp[b] / ROOMS[b].maxHp,
    )[0];
    if (worst) {
      s.roomHp[worst] += 1;
      push(s, `Auto-repair patched ${ROOMS[worst].name}.`, 'good');
    }
  }

  // Predictive Maintenance: smart sensors & drones auto-patch damaged rooms
  const predLvl = s.moduleLevels?.predictive_maintenance ?? 0;
  if (predLvl > 0 && s.turn % Math.max(1, 5 - predLvl) === 0) {
    const broken = ROOM_ORDER.find((id) => s.roomHp[id] < ROOMS[id].maxHp);
    if (broken) {
      s.roomHp[broken] = Math.min(ROOMS[broken].maxHp, s.roomHp[broken] + 1);
      push(s, `Predictive repair drones auto-fixed ${ROOMS[broken].name}.`, 'good');
    }
  }

  // Self-Healing Materials: smart nanotech auto-heals 5% to 25% of hull damage every turn
  const selfHealLvl = s.moduleLevels?.self_healing ?? 0;
  if (selfHealLvl > 0 && s.hull < s.maxHull) {
    const missing = s.maxHull - s.hull;
    const healAmount = Math.max(1, Math.round(missing * (selfHealLvl * 0.05)));
    s.hull = Math.min(s.maxHull, s.hull + healAmount);
    push(s, `Smart nanotech self-healed +${healAmount}% Hull.`, 'good');
  }

  // Active Treaty Perk: Myrr Symbionts (Crew gene-therapy doubles passive healing)
  if (s.diplomacy?.activeTreaty === 'Myrr' && s.crew.health < 100) {
    s.crew.health = Math.min(100, s.crew.health + 4);
  }

  // Mothership Co-Op Partner background recharge
  if (s.mothership?.active && s.mothership.partner) {
    s.mothership.partner.plasma = clamp(s.mothership.partner.plasma + 3, 0, s.mothership.partner.maxPlasma);
    if (s.mothership.partner.shieldLayers < 2) {
      s.mothership.partner.shieldLayers += 1;
    }
  }

  // 4. Magnetic Shields recharge
  const smax = shieldMax(s);
  if (s.shieldLayers >= smax) {
    s.shieldLayers = smax;
    s.shieldCharge = 0;
  } else if (s.plasma > 0) {
    s.shieldCharge += 0.55 * (s.roomHp.science / ROOMS.science.maxHp) * (manned === 'science' ? MANNED_BONUS : 1);
    if (s.shieldCharge >= 1) {
      s.shieldLayers += 1;
      s.shieldCharge = 0;
    }
  }

  // 5. Spacewalk
  if (s.eva > 0) {
    s.eva -= 1;
    s.oxygen = Math.max(0, s.oxygen - 2);
    if (s.eva === 0) {
      const gain = randInt(r, 12, 22);
      s.scrap += gain;
      awardXp(s, 10);
      s.encounter.junk = Math.max(0, s.encounter.junk - 1);
      push(s, `EVA drone returned: +${gain} Scrap, +10 XP.`, 'good');
    }
  }

  // 6. Artifact analysis
  if (s.analyzing > 0) {
    s.analyzing = Math.max(0, s.analyzing - (manned === 'science' ? 2 : 1));
    if (s.analyzing === 0) {
      const bonusScrap = randInt(r, 15, 25);
      const bonusPlasma = 35;
      s.scrap += bonusScrap;
      s.plasma = Math.min(s.maxPlasma, s.plasma + bonusPlasma);
      awardXp(s, 75);
      push(s, `Artifact decoded: +75 XP, +${bonusScrap} Scrap, +${bonusPlasma} Plasma!`, 'good');
    }
  }

  // 7. Helios Forge Solar Flares & Biome Hazard Checks
  if (s.biome === 'helios_forge') {
    if (s.turn % 6 === 5) {
      s.flareWarning = true;
      push(s, 'Warning: Coronal mass ejection detected from binary suns! Solar flare imminent next turn.', 'warn');
    } else if (s.turn % 6 === 0 && s.flareWarning) {
      s.flareWarning = false;
      const magShieldLvl = s.moduleLevels?.magnetic_shielding ?? 0;
      if (magShieldLvl >= 2) {
        s.plasma = Math.min(s.maxPlasma, s.plasma + 25);
        push(s, 'Active Magnetic Shielding (Lv 2+) absorbed the coronal flare (+25 Plasma)!', 'good');
      } else {
        s.hull = Math.max(0, s.hull - 10);
        push(s, 'Coronal solar flare hit! Unshielded ship suffered 10 Hull damage.', 'bad');
        if (s.hull <= 0) {
          triggerAutoCloakRetreat(s, r, 'Coronal Solar Flare Breached Hull! Emergency Auto-Cloak Warped to Earth Garage.');
        }
      }
    }
  } else {
    s.flareWarning = false;
  }

  s.crew.health = clamp(s.crew.health, 0, 100);
  if (s.hull <= 0) {
    triggerAutoCloakRetreat(s, r);
  }
}

function lootCrate(s: GameState, r: Rng) {
  if (!s.docked) return;
  if (s.docked.partner === 'derelict') {
    const g = randInt(r, 14, 24);
    s.scrap += g;
    s.plasma = Math.min(s.maxPlasma, s.plasma + 25);
    awardXp(s, 25);
    let msg = `Boarded crate: +${g} Scrap, +25 Plasma, +25 XP`;
    if (rand(r) < 0.45) {
      s.artifacts += 1;
      msg += ', +1 Artifact';
    }
    push(s, `${msg}!`, 'good');
  } else {
    s.food = Math.min(100, s.food + 25);
    s.plasma = Math.min(s.maxPlasma, s.plasma + 30);
    awardXp(s, 20);
    push(s, 'Partner gift crate: +30 Plasma, +20 XP!', 'good');
  }
  if (!s.docked.crates.length) s.encounter.looted = true;
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

export function reducer(state: GameState, a: Action): GameState {
  if (a.type === 'RESTART') return initialState(a.seed);
  if (state.gameOver) return state;

  switch (a.type) {
    case 'PAUSE':
      return { ...state, paused: a.value ?? !state.paused };
    case 'TARGET':
      return { ...state, target: a.target };
    case 'SELECT_WEAPON_SLOT':
      return { ...state, selectedWeaponSlot: a.index };
    case 'SET_WEAPON_TARGET': {
      const weapons = state.equippedWeapons.map((slot, idx) =>
        idx === a.slotIndex ? { ...slot, targetRoomId: a.targetRoomId } : slot,
      );
      return { ...state, equippedWeapons: weapons };
    }
    case 'SWAP_WEAPON': {
      const weapons = state.equippedWeapons.map((slot, idx) =>
        idx === a.slotIndex
          ? {
              weaponId: a.newWeaponId,
              targetRoomId: slot.targetRoomId,
              charged: false,
              consecutiveHits: 0,
              lastTargetId: null,
            }
          : slot,
      );
      return { ...state, equippedWeapons: weapons };
    }
    case 'DISMISS_AUTO_CLOAK':
      return { ...state, autoCloak: null };
    case 'CREW_CELL': {
      if (same(state.crew.cell, a.cell)) return state;
      const crate = state.docked?.crates.find((c) => same(c, a.cell));
      const next: GameState = {
        ...state,
        crew: { ...state.crew, cell: a.cell, stamina: Math.max(0, state.crew.stamina - 0.12) },
      };
      if (!crate) return next;
      const s = structuredClone(next);
      const r = { seed: s.seed };
      s.docked!.crates = s.docked!.crates.filter((c) => !same(c, a.cell));
      lootCrate(s, r);
      s.seed = r.seed;
      return s;
    }
    default:
      break;
  }

  const s = structuredClone(state);
  const r: Rng = { seed: s.seed };
  const crewAboard = () => {
    const loc = crewLocation(s);
    return loc !== 'tube' && loc !== 'partner';
  };

  switch (a.type) {
    case 'TICK':
      tickDraft(s, r);
      break;

    case 'EXECUTE_COMBAT_TURN':
      executeCombatTurnDraft(s, r);
      break;

    case 'EMERGENCY_AUTO_CLOAK':
      triggerAutoCloakRetreat(s, r, 'Emergency Tactical Auto-Cloak Retreat Initiated.');
      break;

    case 'SET_POWER': {
      const others = usedPower(s) - s.power[a.sys];
      s.power[a.sys] = clamp(Math.round(a.value), 0, Math.min(maxPower(s, a.sys), s.reactor - others));
      s.shieldLayers = Math.min(s.shieldLayers, shieldMax(s));
      break;
    }

    case 'FIRE':
      executeCombatTurnDraft(s, r);
      break;

    case 'JUMP': {
      const cur = s.nodes[s.current];
      if (!cur.links.includes(a.node)) break;
      if (!crewAboard()) {
        push(s, 'Bring your crew back aboard before jumping.', 'warn');
        break;
      }
      if (s.roomHp.engineering <= 0 || s.power.engines <= 0) {
        push(s, 'Power up Engines before jumping.', 'bad');
        break;
      }
      const { cost, photonic } = jumpPlasmaCost(s, a.node);
      if (s.plasma < cost) {
        push(s, `Need ${cost} Plasma to jump (Convert Scrap or use Relay).`, 'bad');
        break;
      }
      s.plasma -= cost;
      s.current = a.node;
      const node = s.nodes[a.node];
      node.visited = true;
      s.docked = null;
      s.eva = 0;
      s.target = null;
      s.encounter = makeEncounter(r, node.type, s.sector);
      s.biome = getBiomeBySector(s.sector).id;
      s.faction = getFactionForSector(s.sector, s.encounter.kind).id;
      s.fx.jump += 1;
      awardXp(s, 10);
      push(
        s,
        photonic
          ? `Photonic Sails ride the relay beam to ${s.encounter.name} (0 Plasma, +10 XP)!`
          : `Jumped to ${s.encounter.name} (−${cost} Plasma, +10 XP).`,
        'info',
      );
      if (s.encounter.enemy) {
        s.paused = true;
        s.combatPhase = 'planning';
        push(s, 'Hostile vessel detected! Planning phase engaged (Press Spacebar to Fire).', 'bad');
      }
      break;
    }

    case 'NEXT_SECTOR': {
      if (s.encounter.kind !== 'exit') break;
      s.sector += 1;
      s.nodes = generateSector(r, s.sector);
      s.current = 0;
      s.encounter = makeEncounter(r, 'relay', s.sector);
      s.biome = getBiomeBySector(s.sector).id;
      s.faction = getFactionForSector(s.sector, s.encounter.kind).id;
      s.fx.jump += 1;
      awardXp(s, 60);
      push(s, `Warped to Sector ${s.sector}: ${BIOMES[s.biome].name}! +60 XP.`, 'good');
      break;
    }

    case 'CONVERT': {
      const cost = convertScrapCost(s);
      if (s.scrap < cost || s.plasma >= s.maxPlasma) break;
      s.scrap -= cost;
      const gain = convertPlasmaGain();
      s.plasma = Math.min(s.maxPlasma, s.plasma + gain);
      push(s, `Synthesized +${gain} Plasma from ${cost} Scrap.`, 'good');
      break;
    }

    case 'REFILL_PLASMA_XP': {
      if (s.spendXp < 15 || s.plasma >= s.maxPlasma) break;
      s.spendXp -= 15;
      s.plasma = Math.min(s.maxPlasma, s.plasma + 60);
      push(s, 'Recharged +60 Plasma using 15 Spendable XP.', 'good');
      break;
    }

    case 'ENGINE_MODE':
      s.engineMode = a.mode;
      push(s, a.mode === 'evasion' ? 'Engines: High Evasion (+15% dodge).' : 'Engines: Plasma Saver.', 'info');
      break;

    case 'HEALING':
      s.healing = !s.healing;
      push(s, s.healing ? 'Med-Bay passive healing enabled.' : 'Med-Bay passive healing paused.', 'info');
      break;

    case 'REST': {
      if (hostileActive(s)) {
        push(s, "Can't rest while under fire!", 'warn');
        break;
      }
      if (s.restCooldown > 0) break;
      s.crew.stamina = 100;
      s.crew.restBuff = 8;
      s.restCooldown = 5;
      push(s, 'Rested in crew bunk: 100% stamina & +15% walking speed.', 'good');
      tickDraft(s, r);
      break;
    }

    case 'HAIL': {
      const e = s.encounter;
      e.hailed = true;
      const badge = getReputationBadge(s.reputation).label;
      const rank = getRank(s.rankXp).current;
      const fDef = FACTIONS[e.faction ?? s.faction ?? 'terran'] ?? FACTIONS.terran;
      const translatorLvl = s.moduleLevels?.ai_translator ?? 0;
      const canUnderstand =
        fDef.translatorReq === 0 ||
        translatorLvl >= fDef.translatorReq ||
        (fDef.outlawFriendly && s.reputation <= -25);

      const factionGreeting = canUnderstand ? fDef.greetingDecrypted : fDef.greetingEncrypted;

      const lines: Record<NodeType, string> = {
        garage: `Earth Orbital Control: "Welcome home, ${rank.title}. Clamps & scrap fields green."`,
        shop: `${e.species} Quartermaster (${badge}): "${factionGreeting}"`,
        relay: `Relay AI: "Photonic beam locked. Free solar Plasma streaming to your reserve."`,
        trader: `${e.species} Merchant: "${factionGreeting}"`,
        hostile:
          s.reputation >= 50 && rank.level >= 3 && e.enemy
            ? `${e.enemy.name}: "Wait—you're the ${rank.title} Ally! Ceasing fire (+25 XP)."`
            : '"Power down your shields or be turned into orbital dust!"',
        distress: `${e.species} Captain: "${factionGreeting} Life support failing—please help!"`,
        derelict: 'Only eerie static echoes from the derelict hull.',
        junk: 'Short-range scanner shows rich metallic asteroids & scrap.',
        empty: `${e.species} Patrol: "${factionGreeting}"`,
        exit: 'Sector Gate: "Long-range photonic corridor ready for warp."',
      };
      e.hailText = lines[e.kind];
      if (e.kind === 'hostile' && s.reputation >= 50 && rank.level >= 3 && e.enemy) {
        e.enemy = null;
        awardXp(s, 25);
        push(s, 'Diplomatic Rank pacified the hostile vessel without a shot! (+25 XP)', 'good');
      }
      break;
    }

    case 'TRADE': {
      const o = offers(s).find((x) => x.id === a.offer);
      if (!o || !o.ok) break;
      if (o.currency === 'xp') s.spendXp -= o.cost;
      else s.scrap -= o.cost;

      if (o.id === 'repair') s.hull = Math.min(s.maxHull, s.hull + 25);
      if (o.id === 'plasma') s.plasma = Math.min(s.maxPlasma, s.plasma + 60);
      if (o.id === 'food') {
        s.food = Math.min(100, s.food + 35);
        s.oxygen = Math.min(100, s.oxygen + 35);
      }
      if (o.id === 'medkit') s.crew.health = Math.min(100, s.crew.health + 50);
      if (o.id === 'buy_scrap') s.scrap += 20;
      if (o.id === 'sell_scrap') {
        s.spendXp += 25;
        s.plasma = Math.min(s.maxPlasma, s.plasma + 40);
      }
      push(s, `${o.label}: complete.`, 'good');
      break;
    }

    case 'HELP': {
      const e = s.encounter;
      if (e.kind !== 'distress' || e.helped || s.plasma < 20) break;
      s.plasma -= 20;
      e.helped = true;
      s.reputation = clamp(s.reputation + 20, -100, 100);
      s.artifacts += 1;
      awardXp(s, 50);
      e.hailText = `${e.species} Captain: "You saved our crew! Take this ancient relic."`;
      push(s, `Assisted ${e.species} ship: +50 XP, +20 Reputation, +1 Artifact!`, 'good');
      break;
    }

    case 'EVA': {
      if (hostileActive(s)) {
        push(s, 'Too dangerous to spacewalk during combat!', 'warn');
        break;
      }
      if (s.docked) {
        push(s, 'Undock before launching EVA tether.', 'warn');
        break;
      }
      if (s.eva > 0) break;
      s.eva = 2;
      s.oxygen = Math.max(0, s.oxygen - 4);
      push(s, 'EVA drone launched to harvest orbital scrap…', 'info');
      break;
    }

    case 'DOCK': {
      const e = s.encounter;
      if (!e.dockable || !e.partner || s.docked || s.eva > 0) break;
      const dock = computeDock(s.layout);
      if (!dock) {
        push(s, 'Airlock side blocked — rearrange rooms at a Garage.', 'warn');
        break;
      }
      const crates = e.looted ? 0 : e.partner === 'derelict' ? 2 : 1;
      s.docked = { partner: e.partner, crates: dock.crateSpots.slice(0, crates) };
      push(s, 'Docking clamps locked! Walk your crew across the boarding tunnel.', 'good');
      break;
    }

    case 'UNDOCK':
      if (!crewAboard()) {
        push(s, 'Walk your crew back inside your ship before undocking!', 'warn');
        break;
      }
      s.docked = null;
      push(s, 'Docking clamps released.', 'info');
      break;

    case 'RESEARCH': {
      const up = UPGRADES[a.id];
      const lvl = s.upgrades[a.id];
      const cost = a.currency === 'xp' ? up.xpCosts[lvl] : up.scrapCosts[lvl];
      if (cost === undefined) break;
      if (a.currency === 'xp') {
        if (s.spendXp < cost) break;
        s.spendXp -= cost;
      } else {
        if (s.scrap < cost) break;
        s.scrap -= cost;
      }
      s.upgrades[a.id] = lvl + 1;
      if (a.id === 'reactor') {
        s.reactor += 2;
        s.maxPlasma += 40;
        s.plasma = Math.min(s.maxPlasma, s.plasma + 40);
      }
      if (a.id === 'hull') {
        s.maxHull += 15;
        s.hull = Math.min(s.maxHull, s.hull + 15);
      }
      awardXp(s, 15);
      push(s, `Installed ${up.name} Lv.${lvl + 1} (+15 Rank XP)!`, 'good');
      break;
    }

    case 'ANALYZE':
      if (s.artifacts <= 0 || s.analyzing > 0) break;
      s.artifacts -= 1;
      s.analyzing = 2;
      push(s, 'Science Lab analyzing Ancient Artifact (2 turns)…', 'info');
      break;

    case 'MINE_OBJECT': {
      const obj = s.encounter.objects.find((o) => o.id === a.objectId);
      if (!obj || obj.resolved) break;
      obj.resolved = true;
      if (obj.label.startsWith('Anomaly:') || obj.id.startsWith('story-beacon')) {
        const ev = s.encounter.storyEventId
          ? STORY_EVENTS.find((e) => e.id === s.encounter.storyEventId)
          : STORY_EVENTS.find((e) => e.factionId === s.faction) ?? STORY_EVENTS[0];
        if (ev) {
          s.activeStoryEvent = ev;
          s.storyOutcome = null;
          s.paused = true;
          push(s, `Deep space anomaly beacon scanned: ${ev.title}!`, 'info');
          break;
        }
      }
      const rotaryBonus = (s.moduleLevels?.rotary_bays ?? 0) * 5;
      const rawGain = randInt(r, 10, 25) + rotaryBonus;
      const oruMult = s.diplomacy?.activeTreaty === 'Oru' ? 1.2 : 1.0;
      const scrapGain = Math.round(rawGain * oruMult);
      s.scrap += scrapGain;
      awardXp(s, 5);
      s.encounter.junk = Math.max(0, s.encounter.junk - 1);
      s.fx.beamTarget = { x: obj.x, y: obj.y, color: '#fbbf24', id: (s.fx.beamTarget?.id ?? 0) + 1 };
      push(s, `Mining beam harvested ${obj.label}: +${scrapGain} Scrap, +5 XP!`, 'good');
      break;
    }

    case 'POD_ACTION': {
      const obj = s.encounter.objects.find((o) => o.id === a.objectId);
      if (!obj || obj.resolved) break;
      obj.resolved = true;
      s.fx.beamTarget = {
        x: obj.x,
        y: obj.y,
        color: a.mode === 'rescue' ? '#4ade80' : '#ef4444',
        id: (s.fx.beamTarget?.id ?? 0) + 1,
      };
      if (a.mode === 'rescue') {
        awardXp(s, 50);
        s.reputation = clamp(s.reputation + 20, -100, 100);
        push(s, `Rescued survivors from ${obj.label}: +50 XP, +20 Reputation!`, 'good');
      } else {
        s.scrap += 30;
        s.reputation = clamp(s.reputation - 15, -100, 100);
        push(s, `Salvaged ${obj.label} hull: +30 Scrap, −15 Reputation.`, 'warn');
      }
      break;
    }

    case 'COLLECT_ARTIFACT': {
      const obj = s.encounter.objects.find((o) => o.id === a.objectId);
      if (!obj || obj.resolved) break;
      obj.resolved = true;
      if (obj.label.startsWith('Anomaly:') || obj.id.startsWith('story-beacon')) {
        const ev = s.encounter.storyEventId
          ? STORY_EVENTS.find((e) => e.id === s.encounter.storyEventId)
          : STORY_EVENTS.find((e) => e.factionId === s.faction) ?? STORY_EVENTS[0];
        if (ev) {
          s.activeStoryEvent = ev;
          s.storyOutcome = null;
          s.paused = true;
          push(s, `Boarded anomaly beacon: ${ev.title}!`, 'info');
          break;
        }
      }
      s.artifacts += 1;
      s.fx.beamTarget = { x: obj.x, y: obj.y, color: '#60a5fa', id: (s.fx.beamTarget?.id ?? 0) + 1 };
      if (s.analyzing === 0) {
        s.artifacts -= 1;
        s.analyzing = 2;
        push(s, `Hauled ${obj.label} aboard — Science Lab analyzing for +75 XP!`, 'good');
      } else {
        push(s, `Hauled ${obj.label} aboard (+1 Artifact in Science Lab).`, 'good');
      }
      break;
    }

    case 'LASER_RECHARGE': {
      const obj = s.encounter.objects.find((o) => o.id === a.objectId);
      if (!obj || obj.resolved) break;
      obj.resolved = true;
      const gain = 55;
      s.plasma = Math.min(s.maxPlasma, s.plasma + gain);
      awardXp(s, 10);
      s.fx.beamTarget = { x: obj.x, y: obj.y, color: '#22d3ee', id: (s.fx.beamTarget?.id ?? 0) + 1 };
      push(s, `Laser Relay beamed +${gain} Plasma into your reserve (+10 XP)!`, 'good');
      break;
    }

    case 'ENGAGE_VESSEL': {
      const obj = s.encounter.objects.find((o) => o.id === a.objectId);
      if (!obj || obj.resolved) break;
      obj.resolved = true;
      s.encounter.enemy = makeEnemy(r, s.sector, obj.label);
      s.reputation = clamp(s.reputation - 10, -100, 100);
      s.paused = true;
      s.combatPhase = 'planning';
      push(s, `Engaged ${obj.label} in combat! (−10 Reputation). Plan targets, then press Spacebar to fire.`, 'warn');
      break;
    }

    case 'SAVE_LAYOUT': {
      if (!canEditLayout(s) || !validateLayout(a.layout).valid) break;
      s.layout = a.layout.map((p) => ({ ...p }));
      s.crew.cell = consoleCell(s.layout.find((p) => p.id === 'bridge')!);
      s.docked = null;
      push(s, 'Saved custom ship layout.', 'good');
      break;
    }

    case 'UPGRADE_MODULE': {
      const def = ALL_UPGRADES[a.moduleId];
      const curLvl = s.moduleLevels[a.moduleId] ?? 0;
      if (curLvl >= def.maxLevel) {
        push(s, `${def.name} is already at MAX level (Lv. 5)!`, 'warn');
        break;
      }
      const costIdx = curLvl;
      const xpCost = def.xpCosts[costIdx] ?? 999;
      const scrapCost = def.scrapCosts[costIdx] ?? 999;
      const cost = a.currency === 'xp' ? xpCost : scrapCost;

      if (a.currency === 'xp') {
        if (s.spendXp < cost) {
          push(s, `Need ${cost} Spendable XP to upgrade ${def.name}.`, 'bad');
          break;
        }
        s.spendXp -= cost;
      } else {
        if (s.scrap < cost) {
          push(s, `Need ${cost} Scrap to upgrade ${def.name}.`, 'bad');
          break;
        }
        s.scrap -= cost;
      }

      const nextLvl = curLvl + 1;
      s.moduleLevels[a.moduleId] = nextLvl;
      awardXp(s, 20);

      // Immediate bonuses
      if (a.moduleId === 'kilopower_reactor') {
        s.reactor += 2;
        s.maxPlasma += 25;
        s.plasma = Math.min(s.maxPlasma, s.plasma + 25);
      } else if (a.moduleId === 'laser_beaming') {
        s.plasma = Math.min(s.maxPlasma, s.plasma + 30 + nextLvl * 10);
      } else if (a.moduleId === 'magnetic_shielding') {
        s.shieldLayers = Math.min(shieldMax(s), s.shieldLayers + 1);
      }

      push(s, `Upgraded ${def.name} to Level ${nextLvl}! (+20 XP)`, 'good');
      break;
    }

    case 'SIGN_TREATY': {
      const species = ALIEN_SPECIES[a.species];
      if (!species) break;
      if (s.diplomacy.alliances.includes(a.species)) {
        s.diplomacy.activeTreaty = a.species;
        push(s, `Active treaty switched to ${species.name} (${species.treatyPerk}).`, 'good');
        break;
      }
      s.diplomacy.alliances.push(a.species);
      s.diplomacy.activeTreaty = a.species;
      s.diplomacy.dialogueHistory.push(`Treaty signed with ${species.name}: ${species.treatyPerk}`);
      s.reputation = clamp(s.reputation + 25, -100, 100);
      awardXp(s, 100);
      push(
        s,
        `Alliance Treaty ratified with ${species.name}! Perk: ${species.treatyPerk} (+100 XP, +25 Rep)`,
        'good',
      );
      break;
    }

    case 'DOCK_MOTHERSHIP': {
      if (s.mothership.active) {
        push(s, 'Mothership docking clamps are already locked!', 'warn');
        break;
      }
      const partner = createAiWingman();
      s.mothership = {
        active: true,
        primaryShip: 'player',
        partner,
        mode: a.mode,
        roomCode: a.roomCode ?? s.mothership.roomCode,
        connected: true,
      };
      const pooled = poolMothershipPlasma(s.plasma, partner.plasma);
      s.plasma = pooled.total;
      s.maxPlasma = s.maxPlasma + partner.maxPlasma;
      s.partnerCrewPos = { ...partner.crew.cell };
      push(
        s,
        `MOTHERSHIP DOCKED! ${partner.name} joined formation. Plasma & Shields pooled with 15% safety reserves!`,
        'good',
      );
      break;
    }

    case 'UNDOCK_MOTHERSHIP': {
      if (!s.mothership.active || !s.mothership.partner) break;
      const total = s.plasma;
      const playerSafe = Math.max(20, Math.round(total * 0.55));
      s.plasma = Math.min(200 + s.upgrades.reactor * 40, playerSafe);
      s.maxPlasma = 200 + s.upgrades.reactor * 40;
      s.mothership.active = false;
      s.mothership.partner = null;
      s.mothership.connected = false;
      s.partnerCrewPos = null;
      push(s, 'Mothership undocked! Both ships maintain guaranteed 15% safety plasma reserves.', 'info');
      break;
    }

    case 'TOGGLE_PRIMARY_SHIP': {
      if (!s.mothership.active) break;
      s.mothership.primaryShip = s.mothership.primaryShip === 'player' ? 'partner' : 'player';
      push(
        s,
        `Primary control toggled to ${s.mothership.primaryShip === 'player' ? 'Player Vessel' : 'Wingman Vessel'}.`,
        'info',
      );
      break;
    }

    case 'MOVE_PARTNER_CREW':
      s.partnerCrewPos = a.cell;
      break;

    case 'TRIGGER_STORY_EVENT': {
      const ev = a.eventId
        ? STORY_EVENTS.find((e) => e.id === a.eventId)
        : s.encounter.storyEventId
          ? STORY_EVENTS.find((e) => e.id === s.encounter.storyEventId)
          : STORY_EVENTS.find((e) => e.factionId === s.faction) ?? STORY_EVENTS[0];
      if (ev) {
        s.activeStoryEvent = ev;
        s.storyOutcome = null;
        s.paused = true;
        push(s, `Investigating story anomaly: ${ev.title}`, 'info');
      }
      break;
    }

    case 'CHOOSE_STORY_OPTION': {
      if (!s.activeStoryEvent) break;
      const opt = s.activeStoryEvent.options[a.optionIndex];
      if (!opt) break;
      if (opt.isBlue && opt.blueReq) {
        if (!checkBlueRequirement(opt.blueReq, s)) {
          push(s, `Requirement not met: ${opt.blueReq.label}`, 'warn');
          break;
        }
      }
      let rewardText = '';
      if (opt.reward) {
        const parts: string[] = [];
        if (opt.reward.xp) {
          awardXp(s, opt.reward.xp);
          parts.push(`+${opt.reward.xp} Rank XP`);
        }
        if (opt.reward.spendXp) {
          s.spendXp += opt.reward.spendXp;
          parts.push(`+${opt.reward.spendXp} Spend XP`);
        }
        if (opt.reward.scrap) {
          s.scrap = Math.max(0, s.scrap + opt.reward.scrap);
          parts.push(`${opt.reward.scrap > 0 ? '+' : ''}${opt.reward.scrap} Scrap`);
        }
        if (opt.reward.plasma) {
          s.plasma = clamp(s.plasma + opt.reward.plasma, 0, s.maxPlasma);
          parts.push(`${opt.reward.plasma > 0 ? '+' : ''}${opt.reward.plasma} Plasma`);
        }
        if (opt.reward.hull) {
          s.hull = clamp(s.hull + opt.reward.hull, 0, s.maxHull);
          parts.push(`${opt.reward.hull > 0 ? '+' : ''}${opt.reward.hull} Hull`);
        }
        if (opt.reward.reputation) {
          s.reputation = clamp(s.reputation + opt.reward.reputation, -100, 100);
          parts.push(`${opt.reward.reputation > 0 ? '+' : ''}${opt.reward.reputation} Reputation`);
        }
        if (opt.reward.arkArtifact) {
          s.arkCodex[opt.reward.arkArtifact] = true;
          const art = ARK_ARTIFACTS[opt.reward.arkArtifact];
          parts.push(`Ark Codex: [${art.name}]`);
          push(s, `RECOVERED EARTH ARK ARTIFACT: [${art.name}]!`, 'good');
        }
        if (parts.length > 0) {
          rewardText = parts.join(', ');
        }
      }
      s.storyOutcome = {
        text: opt.outcomeText,
        rewardDesc: rewardText || undefined,
      };
      push(s, opt.outcomeText, 'good');
      break;
    }

    case 'CLOSE_STORY_EVENT':
      s.activeStoryEvent = null;
      s.storyOutcome = null;
      break;

    case 'CLAIM_ARK_ARTIFACT': {
      const art = ARK_ARTIFACTS[a.artifactId];
      if (art && !s.arkCodex[a.artifactId]) {
        s.arkCodex[a.artifactId] = true;
        awardXp(s, 150);
        s.reputation = clamp(s.reputation + 15, -100, 100);
        push(s, `ARK CODEX RECOVERED: [${art.name}]! (+150 XP, +15 Rep)`, 'good');
        const recoveredCount = Object.values(s.arkCodex).filter(Boolean).length;
        if (recoveredCount === 5) {
          push(s, 'ALL 5 EARTH ARK ARTIFACTS RECOVERED! The mystery of Earth is solved!', 'good');
        }
      }
      break;
    }

    case 'SET_BIOME':
      s.biome = a.biomeId;
      push(s, `Entered Biome: ${BIOMES[a.biomeId]?.name ?? a.biomeId}`, 'info');
      break;
  }

  s.seed = r.seed;
  return s;
}
