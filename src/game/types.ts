import type { WeaponId } from './weapons';
import type { UpgradeModuleId } from './upgrades';
import type { DiplomacyState } from './diplomacy';
import type { MothershipState } from './coop';
import type { BiomeId } from './biomes';
import type { FactionId } from './factions';
import type { ArkArtifactId, StoryEventDef } from './storyEvents';

export type RoomId = 'bridge' | 'comms' | 'life' | 'science' | 'airlock' | 'engineering';
export type Rot = 0 | 1 | 2 | 3;
export type Dir = 'N' | 'E' | 'S' | 'W';

export interface Cell {
  x: number;
  y: number;
}

export interface PlacedRoom {
  id: RoomId;
  x: number;
  y: number;
  rot: Rot;
}

export type Layout = PlacedRoom[];

/** The 4 unified FTL-style power systems */
export type SystemId = 'shields' | 'weapons' | 'engines' | 'life';
export type EnemySys = 'weapons' | 'shields' | 'engines';
export type EngineMode = 'evasion' | 'saver';
export type NodeType =
  | 'garage'
  | 'shop'
  | 'relay'
  | 'junk'
  | 'derelict'
  | 'trader'
  | 'hostile'
  | 'distress'
  | 'empty'
  | 'exit';
export type UpgradeId = 'shields' | 'drones' | 'reactor' | 'hull' | 'weapons' | 'scanner' | 'sails';
export type OfferId = 'repair' | 'plasma' | 'food' | 'medkit' | 'sell_scrap' | 'buy_scrap';
export type Tone = 'info' | 'good' | 'bad' | 'warn';
export type ViewportDir = 'Front' | 'Left' | 'Right' | 'Rear';

export type SpaceObjectKind =
  | 'asteroid'
  | 'junk'
  | 'pod'
  | 'artifact'
  | 'shop'
  | 'relay'
  | 'vessel';

export interface SpaceObject {
  id: string;
  kind: SpaceObjectKind;
  label: string;
  direction: ViewportDir;
  /** Normalised screen coordinates (0..1) outside the central ship hull */
  x: number;
  y: number;
  vx: number;
  vy: number;
  resolved: boolean;
}

export interface LogEntry {
  id: number;
  text: string;
  tone: Tone;
}

export interface SectorNode {
  id: number;
  x: number;
  y: number;
  col: number;
  type: NodeType;
  relay: boolean;
  links: number[];
  visited: boolean;
}

export interface WeaponSlot {
  weaponId: WeaponId;
  targetRoomId: string | null;
  /** Which co-op vessel aimed this weapon ('primary' = P1, 'wingman' = P2) */
  lockedByRole?: 'primary' | 'wingman';
  /** For Nova Cannon: 0 = uncharged, 1 = charging */
  charged: boolean;
  /** For Thermal Beam: consecutive hits on same target (1, 2, 3) */
  consecutiveHits: number;
  lastTargetId: string | null;
}

export interface EnemyRoom {
  id: string; // 'bridge' | 'weapons' | 'shields' | 'engines'
  name: string;
  hp: number;
  maxHp: number;
  gx: number;
  gy: number;
  gw: number;
  gh: number;
  color: string;
  burnTurns: number;
  neighbors: string[];
}

export interface Enemy {
  name: string;
  faction?: FactionId;
  hull: number;
  maxHull: number;
  shields: number;
  maxShields: number;
  shieldCharge: number;
  charge: number;
  speed: number;
  rooms: EnemyRoom[];
  activeWeaponName: string;
}

export interface Encounter {
  kind: NodeType;
  name: string;
  species: string;
  faction?: FactionId;
  biome?: BiomeId;
  junk: number;
  dockable: boolean;
  partner: 'derelict' | 'trader' | null;
  hailed: boolean;
  hailText: string;
  helped: boolean;
  looted: boolean;
  enemy: Enemy | null;
  objects: SpaceObject[];
  hasStoryAnomaly?: boolean;
  storyEventId?: string;
}

export interface Docked {
  partner: 'derelict' | 'trader';
  crates: Cell[];
}

export interface Crew {
  cell: Cell;
  health: number;
  stamina: number;
  restBuff: number;
}

export interface CombatProjectile {
  id: number;
  weaponId: WeaponId | 'enemy';
  source: 'player' | 'enemy';
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  color: string;
  type: 'bolt' | 'beam' | 'bomb' | 'whip' | 'cannon' | 'torpedo';
  progress: number;
}

export interface FloatingDamage {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
}

export interface Fx {
  hitRoom: RoomId | null;
  hitId: number;
  shot: number;
  enemyHit: number;
  jump: number;
  beamTarget: { x: number; y: number; color: string; id: number } | null;
}

export interface AutoCloakState {
  active: boolean;
  banner: string;
}

export interface GameState {
  seed: number;
  layout: Layout;
  crew: Crew;
  roomHp: Record<RoomId, number>;
  power: Record<SystemId, number>;
  reactor: number;
  hull: number;
  maxHull: number;
  shieldLayers: number;
  shieldCharge: number;
  weaponCharge: number;
  /** Universal Plasma tank reserve (0 .. maxPlasma) */
  plasma: number;
  maxPlasma: number;
  scrap: number;
  /** Lifetime XP that never decreases — unlocks Narrative Ranks & diplomatic perks */
  rankXp: number;
  /** Spendable XP currency — used for upgrades, trading, or refilling Plasma */
  spendXp: number;
  /** Sector Reputation from -100 (Outlaw) to +100 (Trusted Ally) */
  reputation: number;
  oxygen: number;
  food: number;
  artifacts: number;
  analyzing: number;
  eva: number;
  engineMode: EngineMode;
  healing: boolean;
  restCooldown: number;
  upgrades: Record<UpgradeId, number>;
  docked: Docked | null;
  sector: number;
  nodes: SectorNode[];
  current: number;
  encounter: Encounter;
  turn: number;
  paused: boolean;
  target: EnemySys | null;
  gameOver: string | null;
  log: LogEntry[];
  logId: number;
  fx: Fx;

  /* Combat & Weapons Extension */
  equippedWeapons: WeaponSlot[];
  arsenal: WeaponId[];
  selectedWeaponSlot: number | null;
  combatPhase: 'planning' | 'executing';
  projectiles: CombatProjectile[];
  floatingDamages: FloatingDamage[];
  autoCloak: AutoCloakState | null;

  /* 16 Multi-Level Ship Upgrades (Levels 0 to 5) */
  moduleLevels: Record<UpgradeModuleId, number>;

  /* Alien Diplomacy */
  diplomacy: DiplomacyState;

  /* Co-Op Mothership Mode */
  mothership: MothershipState;
  partnerCrewPos: { x: number; y: number } | null;
  partnerCrewCell: Cell | null;
  partnerCrewFacing: number;

  /* 5 Solar System Biomes & 4 Factions */
  biome: BiomeId;
  faction: FactionId;
  flareWarning: boolean;

  /* Earth Ark Codex (5 Artifacts) & FTL Blue Option Story Events */
  arkCodex: Record<ArkArtifactId, boolean>;
  activeStoryEvent: StoryEventDef | null;
  storyOutcome: { text: string; rewardDesc?: string } | null;
}
