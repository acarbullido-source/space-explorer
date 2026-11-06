import type { Crew, Layout, RoomId, SystemId } from './types';
import { consoleCell } from './layout';

export interface PartnerShip {
  id: string;
  name: string;
  isAiWingman: boolean;
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
  roomCode: string;
  connected: boolean;
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

/** Calculate pooled Mothership Plasma while maintaining 15% safety reserves on undock. */
export function poolMothershipPlasma(playerPlasma: number, partnerPlasma: number): {
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

/** BroadcastChannel abstraction for local multiplayer tab-to-tab sync with room code */
export class MultiplayerDockSync {
  private channel: BroadcastChannel | null = null;
  private roomCode: string = '';

  constructor(roomCode: string, onSync: (data: unknown) => void) {
    this.roomCode = roomCode;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(`space_explorer_dock_${roomCode}`);
      this.channel.onmessage = (e) => onSync(e.data);
    }
  }

  broadcast(message: unknown) {
    if (this.channel) {
      this.channel.postMessage({ roomCode: this.roomCode, payload: message });
    }
  }

  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
