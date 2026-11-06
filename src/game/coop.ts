import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';
import type { BiomeId } from './biomes';
import type { FactionId } from './factions';
import { consoleCell } from './layout';
import type { ArkArtifactId, StoryEventDef } from './storyEvents';
import type {
  AutoCloakState,
  Cell,
  CombatProjectile,
  Crew,
  Encounter,
  EngineMode,
  FloatingDamage,
  Fx,
  Layout,
  LogEntry,
  RoomId,
  SectorNode,
  SystemId,
  UpgradeId,
  WeaponSlot,
} from './types';
import type { UpgradeModuleId } from './upgrades';

export type MothershipTransport = 'supabase' | 'broadcast_fallback' | 'local_ai';
export type MothershipChannelStatus =
  | 'disconnected'
  | 'connecting'
  | 'waiting_partner'
  | 'docked'
  | 'error';

export interface ShipPresenceEntry {
  clientId: string;
  shipName: string;
  joinedAt: number;
  layout: Layout;
  hull: number;
  maxHull: number;
  soloPlasma: number;
  soloMaxPlasma: number;
  shieldLayers: number;
  roomHp: Record<RoomId, number>;
  power: Record<SystemId, number>;
  crewCell: Cell;
  crewFacing: number;
}

export interface PartnerShip {
  id: string;
  name: string;
  isAiWingman: boolean;
  joinedAt?: number;
  layout: Layout;
  crew: Crew;
  hull: number;
  maxHull: number;
  plasma: number;
  maxPlasma: number;
  shieldLayers: number;
  roomHp: Record<RoomId, number>;
  power: Record<SystemId, number>;
}

export interface MothershipState {
  active: boolean;
  primaryShip: 'player' | 'partner';
  partner: PartnerShip | null;
  mode: 'local_ai' | 'network_code';
  transport: MothershipTransport;
  channelStatus: MothershipChannelStatus;
  errorMessage?: string;
  roomCode: string;
  connected: boolean;
  presenceShips: ShipPresenceEntry[];
  localCombatReady: boolean;
  partnerCombatReady: boolean;
  primaryTargetRoomId: string | null;
  wingmanTargetRoomId: string | null;
}

/* ------------------------------------------------------------------ */
/* Simultaneous Real-Time Broadcast Event Payloads                     */
/* ------------------------------------------------------------------ */

export interface CrewMoveBroadcast {
  senderId: string;
  shipName: string;
  /** Fractional tile coordinates in sender's world frame */
  pos: { x: number; y: number };
  /** Discrete logical tile in sender's world frame */
  cell: Cell;
  /** Facing index (0:E, 1:S, 2:W, 3:N) in sender's world frame */
  facing: number;
  /** Current room ID on sender's or partner's ship (or 'collar') */
  roomId: string | null;
  /** Room console currently manned (+25%) by this astronaut */
  mannedRoomId: RoomId | null;
}

export interface ShipSystemUpdateBroadcast {
  senderId: string;
  reason: string;
  power: Record<SystemId, number>;
  reactor: number;
  plasma: number;
  maxPlasma: number;
  scrap: number;
  rankXp: number;
  spendXp: number;
  reputation: number;
  hull: number;
  maxHull: number;
  shieldLayers: number;
  shieldCharge: number;
  roomHpByClient: Record<string, Record<RoomId, number>>;
  oxygen: number;
  food: number;
  artifacts: number;
  analyzing: number;
  eva: number;
  engineMode: EngineMode;
  healing: boolean;
  upgrades: Record<UpgradeId, number>;
  moduleLevels: Record<UpgradeModuleId, number>;
  equippedWeapons: WeaponSlot[];
  sector: number;
  current: number;
  nodes: SectorNode[];
  encounter: Encounter;
  biome: BiomeId;
  faction: FactionId;
  flareWarning: boolean;
  arkCodex: Record<ArkArtifactId, boolean>;
  activeStoryEvent: StoryEventDef | null;
  storyOutcome: { text: string; rewardDesc?: string } | null;
  paused: boolean;
  turn: number;
  latestLog?: LogEntry;
}

export interface CombatTargetLockBroadcast {
  senderId: string;
  senderRole: 'primary' | 'wingman';
  equippedWeapons: WeaponSlot[];
  focusRoomId: string | null;
  ready: boolean;
}

export interface CombatExecuteTurnBroadcast {
  senderId: string;
  turn: number;
  plasma: number;
  maxPlasma: number;
  scrap: number;
  rankXp: number;
  spendXp: number;
  reputation: number;
  hull: number;
  maxHull: number;
  shieldLayers: number;
  shieldCharge: number;
  roomHpByClient: Record<string, Record<RoomId, number>>;
  equippedWeapons: WeaponSlot[];
  encounter: Encounter;
  combatPhase: 'planning' | 'executing';
  projectiles: CombatProjectile[];
  floatingDamages: FloatingDamage[];
  fx: Fx;
  autoCloak: AutoCloakState | null;
  log: LogEntry[];
  logId: number;
}

export interface MothershipUndockBroadcast {
  senderId: string;
  sharedPlasmaSnapshot: number;
}

export const DEFAULT_PARTNER_LAYOUT: Layout = [
  { id: 'airlock', x: 4, y: 0, rot: 2 }, // faces North towards player's South airlock
  { id: 'engineering', x: 1, y: 1, rot: 0 },
  { id: 'science', x: 4, y: 2, rot: 0 },
  { id: 'bridge', x: 7, y: 1, rot: 0 },
  { id: 'life', x: 7, y: 3, rot: 0 },
  { id: 'comms', x: 4, y: 4, rot: 0 },
];

export function createAiWingman(): PartnerShip {
  const bridge = DEFAULT_PARTNER_LAYOUT.find((r) => r.id === 'bridge')!;
  return {
    id: 'wingman-alpha',
    name: 'Valkyrie Wingman (AI Co-Op)',
    isAiWingman: true,
    layout: DEFAULT_PARTNER_LAYOUT,
    crew: {
      cell: consoleCell(bridge),
      health: 100,
      stamina: 100,
      restBuff: 0,
    },
    hull: 80,
    maxHull: 80,
    plasma: 110,
    maxPlasma: 160,
    shieldLayers: 1,
    roomHp: {
      bridge: 4,
      comms: 4,
      life: 4,
      science: 4,
      airlock: 4,
      engineering: 4,
    },
    power: {
      shields: 2,
      weapons: 2,
      engines: 2,
      life: 1,
    },
  };
}

export function createPartnerShipFromPresence(entry: ShipPresenceEntry): PartnerShip {
  return {
    id: entry.clientId,
    name: entry.shipName,
    isAiWingman: false,
    joinedAt: entry.joinedAt,
    layout: entry.layout,
    crew: {
      cell: entry.crewCell,
      health: 100,
      stamina: 100,
      restBuff: 0,
    },
    hull: entry.hull,
    maxHull: entry.maxHull,
    plasma: entry.soloPlasma,
    maxPlasma: entry.soloMaxPlasma,
    shieldLayers: entry.shieldLayers,
    roomHp: { ...entry.roomHp },
    power: { ...entry.power },
  };
}

/** Calculate pooled Mothership Plasma while maintaining 15% safety reserves on undock. */
export function poolMothershipPlasma(
  playerPlasma: number,
  partnerPlasma: number,
): {
  total: number;
  playerReserve: number;
  partnerReserve: number;
} {
  const playerReserve = Math.round(playerPlasma * 0.15);
  const partnerReserve = Math.round(partnerPlasma * 0.15);
  return {
    total: playerPlasma + partnerPlasma,
    playerReserve,
    partnerReserve,
  };
}

export function generateDockingCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export interface MothershipRealtimeCallbacks {
  onChannelStatus: (status: MothershipChannelStatus, errorMessage?: string) => void;
  onPresenceSync: (info: {
    ships: ShipPresenceEntry[];
    partner: ShipPresenceEntry | null;
    isPrimary: boolean;
  }) => void;
  onPartnerLeft: () => void;
  onCrewMove: (payload: CrewMoveBroadcast) => void;
  onShipSystemUpdate: (payload: ShipSystemUpdateBroadcast) => void;
  onCombatTargetLock: (payload: CombatTargetLockBroadcast) => void;
  onCombatExecuteTurn: (payload: CombatExecuteTurnBroadcast) => void;
  onRemoteUndock: (payload: MothershipUndockBroadcast) => void;
}

type FallbackPacket =
  | { kind: 'PRESENCE_ANNOUNCE'; entry: ShipPresenceEntry }
  | { kind: 'PRESENCE_PING'; requesterId: string }
  | { kind: 'PRESENCE_LEAVE'; clientId: string }
  | { kind: 'BROADCAST'; event: string; payload: unknown; senderId: string };

/**
 * Manages simultaneous Mothership multiplayer over Supabase Realtime
 * (`mothership-room-<4-digit-code>`) using Presence + low-latency Broadcast,
 * with seamless fallback to local browser BroadcastChannel when offline/unconfigured.
 */
export class MothershipRealtimeSession {
  public readonly roomCode: string;
  public readonly channelName: string;
  public readonly clientId: string;
  public readonly transport: 'supabase' | 'broadcast_fallback';

  private supabaseChannel: RealtimeChannel | null = null;
  private fallbackChannel: BroadcastChannel | null = null;
  private fallbackPeers = new Map<string, { entry: ShipPresenceEntry; lastSeen: number }>();
  private fallbackHeartbeatId: number | null = null;
  private selfPresence: ShipPresenceEntry;
  private callbacks: MothershipRealtimeCallbacks;
  private hadPartner = false;
  private destroyed = false;
  private unloadHandler: () => void;

  constructor(opts: {
    roomCode: string;
    clientId: string;
    transport: 'supabase' | 'broadcast_fallback';
    initialPresence: ShipPresenceEntry;
    callbacks: MothershipRealtimeCallbacks;
  }) {
    this.roomCode = opts.roomCode;
    this.channelName = `mothership-room-${opts.roomCode}`;
    this.clientId = opts.clientId;
    this.transport = opts.transport;
    this.selfPresence = opts.initialPresence;
    this.callbacks = opts.callbacks;

    this.unloadHandler = () => {
      this.destroy();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.unloadHandler);
    }

    if (this.transport === 'supabase') {
      this.initSupabase();
    } else {
      this.initBroadcastFallback();
    }
  }

  private initSupabase(): void {
    const supabase = getSupabaseClient();
    if (!supabase) {
      this.callbacks.onChannelStatus(
        'error',
        'Supabase URL & Anon Key are not configured yet.',
      );
      return;
    }

    this.callbacks.onChannelStatus('connecting');

    const channel = supabase.channel(this.channelName, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: this.clientId },
      },
    });
    this.supabaseChannel = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        this.evaluateSupabasePresence();
      })
      .on('presence', { event: 'join' }, () => {
        this.evaluateSupabasePresence();
      })
      .on('presence', { event: 'leave' }, () => {
        this.evaluateSupabasePresence();
      })
      .on('broadcast', { event: 'CREW_MOVE' }, ({ payload }) => {
        if (this.destroyed || !payload) return;
        const data = payload as CrewMoveBroadcast;
        if (data.senderId === this.clientId) return;
        this.callbacks.onCrewMove(data);
      })
      .on('broadcast', { event: 'SHIP_SYSTEM_UPDATE' }, ({ payload }) => {
        if (this.destroyed || !payload) return;
        const data = payload as ShipSystemUpdateBroadcast;
        if (data.senderId === this.clientId) return;
        this.callbacks.onShipSystemUpdate(data);
      })
      .on('broadcast', { event: 'COMBAT_TARGET_LOCK' }, ({ payload }) => {
        if (this.destroyed || !payload) return;
        const data = payload as CombatTargetLockBroadcast;
        if (data.senderId === this.clientId) return;
        this.callbacks.onCombatTargetLock(data);
      })
      .on('broadcast', { event: 'COMBAT_EXECUTE_TURN' }, ({ payload }) => {
        if (this.destroyed || !payload) return;
        const data = payload as CombatExecuteTurnBroadcast;
        if (data.senderId === this.clientId) return;
        this.callbacks.onCombatExecuteTurn(data);
      })
      .on('broadcast', { event: 'MOTHERSHIP_UNDOCK' }, ({ payload }) => {
        if (this.destroyed || !payload) return;
        const data = payload as MothershipUndockBroadcast;
        if (data.senderId === this.clientId) return;
        this.hadPartner = false;
        this.callbacks.onRemoteUndock(data);
      })
      .subscribe(async (status, err) => {
        if (this.destroyed) return;
        if (status === 'SUBSCRIBED') {
          this.callbacks.onChannelStatus('waiting_partner');
          await channel.track(this.selfPresence);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.callbacks.onChannelStatus(
            'error',
            err?.message ?? 'Unable to connect to Supabase Realtime channel.',
          );
        }
      });
  }

  private evaluateSupabasePresence(): void {
    if (this.destroyed || !this.supabaseChannel) return;
    const raw = this.supabaseChannel.presenceState<ShipPresenceEntry>();
    const byClient = new Map<string, ShipPresenceEntry>();

    for (const entries of Object.values(raw)) {
      for (const item of entries) {
        if (item && typeof item.clientId === 'string') {
          byClient.set(item.clientId, item);
        }
      }
    }

    this.processSortedShips([...byClient.values()]);
  }

  private initBroadcastFallback(): void {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      this.callbacks.onChannelStatus('error', 'BroadcastChannel is not supported in this browser.');
      return;
    }

    this.callbacks.onChannelStatus('waiting_partner');
    const bc = new BroadcastChannel(this.channelName);
    this.fallbackChannel = bc;
    this.fallbackPeers.set(this.clientId, {
      entry: this.selfPresence,
      lastSeen: Date.now(),
    });

    bc.onmessage = (ev: MessageEvent<FallbackPacket>) => {
      if (this.destroyed || !ev.data) return;
      const msg = ev.data;
      if (msg.kind === 'PRESENCE_ANNOUNCE') {
        if (msg.entry.clientId === this.clientId) return;
        this.fallbackPeers.set(msg.entry.clientId, {
          entry: msg.entry,
          lastSeen: Date.now(),
        });
        this.evaluateFallbackPresence();
      } else if (msg.kind === 'PRESENCE_PING') {
        if (msg.requesterId === this.clientId) return;
        bc.postMessage({
          kind: 'PRESENCE_ANNOUNCE',
          entry: this.selfPresence,
        } satisfies FallbackPacket);
      } else if (msg.kind === 'PRESENCE_LEAVE') {
        if (msg.clientId === this.clientId) return;
        this.fallbackPeers.delete(msg.clientId);
        this.evaluateFallbackPresence();
      } else if (msg.kind === 'BROADCAST') {
        if (msg.senderId === this.clientId) return;
        if (msg.event === 'CREW_MOVE') {
          this.callbacks.onCrewMove(msg.payload as CrewMoveBroadcast);
        } else if (msg.event === 'SHIP_SYSTEM_UPDATE') {
          this.callbacks.onShipSystemUpdate(msg.payload as ShipSystemUpdateBroadcast);
        } else if (msg.event === 'COMBAT_TARGET_LOCK') {
          this.callbacks.onCombatTargetLock(msg.payload as CombatTargetLockBroadcast);
        } else if (msg.event === 'COMBAT_EXECUTE_TURN') {
          this.callbacks.onCombatExecuteTurn(msg.payload as CombatExecuteTurnBroadcast);
        } else if (msg.event === 'MOTHERSHIP_UNDOCK') {
          this.hadPartner = false;
          this.callbacks.onRemoteUndock(msg.payload as MothershipUndockBroadcast);
        }
      }
    };

    bc.postMessage({
      kind: 'PRESENCE_ANNOUNCE',
      entry: this.selfPresence,
    } satisfies FallbackPacket);
    bc.postMessage({
      kind: 'PRESENCE_PING',
      requesterId: this.clientId,
    } satisfies FallbackPacket);

    this.fallbackHeartbeatId = window.setInterval(() => {
      if (this.destroyed || !this.fallbackChannel) return;
      const now = Date.now();
      this.fallbackPeers.set(this.clientId, {
        entry: this.selfPresence,
        lastSeen: now,
      });
      for (const [cid, record] of this.fallbackPeers.entries()) {
        if (cid !== this.clientId && now - record.lastSeen > 6500) {
          this.fallbackPeers.delete(cid);
        }
      }
      this.fallbackChannel.postMessage({
        kind: 'PRESENCE_ANNOUNCE',
        entry: this.selfPresence,
      } satisfies FallbackPacket);
      this.evaluateFallbackPresence();
    }, 2000);

    this.evaluateFallbackPresence();
  }

  private evaluateFallbackPresence(): void {
    const ships = [...this.fallbackPeers.values()].map((r) => r.entry);
    this.processSortedShips(ships);
  }

  private processSortedShips(allShips: ShipPresenceEntry[]): void {
    const sorted = [...allShips]
      .sort((a, b) => a.joinedAt - b.joinedAt || a.clientId.localeCompare(b.clientId))
      .slice(0, 2);

    const isPrimary = sorted.length === 0 || sorted[0].clientId === this.clientId;
    const partner = sorted.find((s) => s.clientId !== this.clientId) ?? null;

    if (partner) {
      this.hadPartner = true;
      this.callbacks.onChannelStatus('docked');
      this.callbacks.onPresenceSync({ ships: sorted, partner, isPrimary });
    } else {
      if (this.hadPartner) {
        this.hadPartner = false;
        this.callbacks.onPartnerLeft();
      } else {
        this.callbacks.onPresenceSync({ ships: sorted, partner: null, isPrimary: true });
      }
    }
  }

  public updateSelfPresence(partial: Partial<ShipPresenceEntry>): void {
    if (this.destroyed) return;
    this.selfPresence = { ...this.selfPresence, ...partial };
    if (this.supabaseChannel) {
      void this.supabaseChannel.track(this.selfPresence);
    } else if (this.fallbackChannel) {
      this.fallbackPeers.set(this.clientId, {
        entry: this.selfPresence,
        lastSeen: Date.now(),
      });
      this.fallbackChannel.postMessage({
        kind: 'PRESENCE_ANNOUNCE',
        entry: this.selfPresence,
      } satisfies FallbackPacket);
    }
  }

  private sendEvent(event: string, payload: unknown): void {
    if (this.destroyed) return;
    if (this.supabaseChannel) {
      void this.supabaseChannel.send({
        type: 'broadcast',
        event,
        payload,
      });
    } else if (this.fallbackChannel) {
      this.fallbackChannel.postMessage({
        kind: 'BROADCAST',
        event,
        payload,
        senderId: this.clientId,
      } satisfies FallbackPacket);
    }
  }

  public sendCrewMove(payload: CrewMoveBroadcast): void {
    this.sendEvent('CREW_MOVE', payload);
  }

  public sendShipSystemUpdate(payload: ShipSystemUpdateBroadcast): void {
    this.sendEvent('SHIP_SYSTEM_UPDATE', payload);
  }

  public sendCombatTargetLock(payload: CombatTargetLockBroadcast): void {
    this.sendEvent('COMBAT_TARGET_LOCK', payload);
  }

  public sendCombatExecuteTurn(payload: CombatExecuteTurnBroadcast): void {
    this.sendEvent('COMBAT_EXECUTE_TURN', payload);
  }

  public sendUndock(payload: MothershipUndockBroadcast): void {
    this.sendEvent('MOTHERSHIP_UNDOCK', payload);
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.unloadHandler);
    }

    if (this.fallbackHeartbeatId !== null) {
      window.clearInterval(this.fallbackHeartbeatId);
      this.fallbackHeartbeatId = null;
    }

    if (this.fallbackChannel) {
      try {
        this.fallbackChannel.postMessage({
          kind: 'PRESENCE_LEAVE',
          clientId: this.clientId,
        } satisfies FallbackPacket);
        this.fallbackChannel.close();
      } catch {
        // Ignore teardown errors
      }
      this.fallbackChannel = null;
    }

    if (this.supabaseChannel) {
      const ch = this.supabaseChannel;
      this.supabaseChannel = null;
      const supabase = getSupabaseClient();
      void ch.untrack().finally(() => {
        if (supabase) {
          void supabase.removeChannel(ch);
        }
      });
    }
  }
}
