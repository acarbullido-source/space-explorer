import type { LucideIcon } from 'lucide-react';
import { Cog, DoorOpen, FlaskConical, Navigation, Radio, Sprout } from 'lucide-react';
import type { Cell, Dir, Layout, RoomId, SystemId } from './types';

export interface RoomTheme {
  accent: string;
  floor: string;
  floorAlt: string;
  text: string;
  bg: string;
  border: string;
}

export interface RoomDef {
  id: RoomId;
  name: string;
  label: string;
  icon: LucideIcon;
  w: number;
  h: number;
  console: Cell;
  hatch?: Dir;
  system?: SystemId;
  maxHp: number;
  theme: RoomTheme;
}

export const ROOMS: Record<RoomId, RoomDef> = {
  bridge: {
    id: 'bridge',
    name: 'Bridge',
    label: 'Steer ship, scan space & fire weapons.',
    icon: Navigation,
    w: 3,
    h: 2,
    console: { x: 2, y: 0 },
    system: 'weapons',
    maxHp: 4,
    theme: {
      accent: '#22d3ee',
      floor: '#0a2730',
      floorAlt: '#0d313c',
      text: 'text-cyan-300',
      bg: 'bg-cyan-500/15',
      border: 'border-cyan-400/50',
    },
  },
  comms: {
    id: 'comms',
    name: 'Comms & Quarters',
    label: 'Talk to other ships, trade & rest crew.',
    icon: Radio,
    w: 3,
    h: 2,
    console: { x: 0, y: 1 },
    maxHp: 4,
    theme: {
      accent: '#c084fc',
      floor: '#1f1030',
      floorAlt: '#26143a',
      text: 'text-purple-300',
      bg: 'bg-purple-500/15',
      border: 'border-purple-400/50',
    },
  },
  life: {
    id: 'life',
    name: 'Life Support',
    label: 'Keep air breathable & grow crew food.',
    icon: Sprout,
    w: 2,
    h: 2,
    console: { x: 0, y: 0 },
    system: 'life',
    maxHp: 4,
    theme: {
      accent: '#4ade80',
      floor: '#0b2616',
      floorAlt: '#0e2e1b',
      text: 'text-green-300',
      bg: 'bg-green-500/15',
      border: 'border-green-400/50',
    },
  },
  science: {
    id: 'science',
    name: 'Science Lab',
    label: 'Upgrade tech, shields & auto-repairs.',
    icon: FlaskConical,
    w: 3,
    h: 2,
    console: { x: 0, y: 0 },
    system: 'shields',
    maxHp: 4,
    theme: {
      accent: '#60a5fa',
      floor: '#0d1a38',
      floorAlt: '#112044',
      text: 'text-blue-300',
      bg: 'bg-blue-500/15',
      border: 'border-blue-400/50',
    },
  },
  airlock: {
    id: 'airlock',
    name: 'Airlock',
    label: 'Spacewalk for scrap or dock with another ship.',
    icon: DoorOpen,
    w: 2,
    h: 2,
    console: { x: 0, y: 0 },
    hatch: 'S',
    maxHp: 4,
    theme: {
      accent: '#fbbf24',
      floor: '#2a1f07',
      floorAlt: '#33260a',
      text: 'text-amber-300',
      bg: 'bg-amber-500/15',
      border: 'border-amber-400/50',
    },
  },
  engineering: {
    id: 'engineering',
    name: 'Engineering & Cargo',
    label: 'Manage engines, cargo scrap & Plasma fuel.',
    icon: Cog,
    w: 3,
    h: 4,
    console: { x: 2, y: 1 },
    system: 'engines',
    maxHp: 4,
    theme: {
      accent: '#fb923c',
      floor: '#2e1509',
      floorAlt: '#381a0b',
      text: 'text-orange-300',
      bg: 'bg-orange-500/15',
      border: 'border-orange-400/50',
    },
  },
};

export const ROOM_ORDER: RoomId[] = ['bridge', 'comms', 'life', 'science', 'airlock', 'engineering'];

export const SYSTEMS: Record<
  SystemId,
  { room: RoomId; name: string; short: string; desc: string; base: number; color: string }
> = {
  shields: {
    room: 'science',
    name: 'Shields',
    short: 'SHD',
    desc: 'Powers magnetic deflection layers.',
    base: 4,
    color: '#38bdf8',
  },
  weapons: {
    room: 'bridge',
    name: 'Weapons',
    short: 'WPN',
    desc: 'Powers equipped weapon projectors.',
    base: 4,
    color: '#22d3ee',
  },
  engines: {
    room: 'engineering',
    name: 'Engines',
    short: 'ENG',
    desc: 'Controls turn speed and dodge chance.',
    base: 4,
    color: '#fb923c',
  },
  life: {
    room: 'life',
    name: 'Life & Repairs',
    short: 'LSS',
    desc: 'Keeps air/food at 100% and powers auto-repair drones.',
    base: 3,
    color: '#4ade80',
  },
};

export const SYSTEM_ORDER: SystemId[] = ['shields', 'weapons', 'engines', 'life'];

export const DEFAULT_LAYOUT: Layout = [
  { id: 'engineering', x: 1, y: 2, rot: 0 },
  { id: 'life', x: 4, y: 2, rot: 0 },
  { id: 'airlock', x: 4, y: 4, rot: 0 },
  { id: 'science', x: 6, y: 2, rot: 0 },
  { id: 'comms', x: 6, y: 4, rot: 0 },
  { id: 'bridge', x: 9, y: 3, rot: 0 },
];
