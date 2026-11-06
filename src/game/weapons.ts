export type WeaponId = 'repeater' | 'beam' | 'caster' | 'whip' | 'nova' | 'torpedo';
export type WeaponTier = 'light' | 'medium' | 'heavy';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  tier: WeaponTier;
  cost: number;
  color: string;
  badgeColor: string;
  borderColor: string;
  tooltip: string;
  mechanic: string;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  repeater: {
    id: 'repeater',
    name: 'Plasma Repeater',
    tier: 'light',
    cost: 10,
    color: '#4ade80',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
    borderColor: 'border-emerald-400',
    tooltip: 'Rapid-fire space machine gun. Fires 4 quick bolts to strip light shields.',
    mechanic: 'Rolls 4 separate hits per turn (6 damage each).',
  },
  beam: {
    id: 'beam',
    name: 'Thermal Plasma Beam',
    tier: 'light',
    cost: 15,
    color: '#34d399',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
    borderColor: 'border-emerald-400',
    tooltip: 'Continuous heat beam. Deals 1x, 2x, then 3x damage if kept on the same room each turn.',
    mechanic: 'Tracks consecutive turns targeting the same room (12 -> 24 -> 36 damage) unless the target dodges.',
  },
  caster: {
    id: 'caster',
    name: 'Plasma Caster',
    tier: 'medium',
    cost: 25,
    color: '#fbbf24',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
    borderColor: 'border-amber-400',
    tooltip: 'Heavy plasma bomb. Hits hard and splashes 50% damage into next-door rooms.',
    mechanic: 'Deals 28 direct room damage + 14 damage to adjacent connected rooms.',
  },
  whip: {
    id: 'whip',
    name: 'Arc-Plasma Whip',
    tier: 'medium',
    cost: 30,
    color: '#f59e0b',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
    borderColor: 'border-amber-400',
    tooltip: 'Close-range lightning whip. Chains damage across nearby ships and drones.',
    mechanic: 'Deals 25 hull damage and arcs 50% damage to up to 2 secondary targets/drones.',
  },
  nova: {
    id: 'nova',
    name: 'Plasma Nova Cannon',
    tier: 'heavy',
    cost: 60,
    color: '#ef4444',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-400/50',
    borderColor: 'border-red-400',
    tooltip: 'Massive charge cannon. Charges for 1 turn (-50% dodge), then blasts the target and leaves a burning plasma cloud for 2 turns.',
    mechanic: 'Turn 1 charges; Turn 2 fires for 65 damage + 15 burn damage/turn for 2 turns.',
  },
  torpedo: {
    id: 'torpedo',
    name: 'Siphon Plasma Torpedo',
    tier: 'heavy',
    cost: 45,
    color: '#f43f5e',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-400/50',
    borderColor: 'border-rose-400',
    tooltip: 'Vampire torpedo. Pierces half of enemy shields and steals 25 Plasma on a hull hit.',
    mechanic: 'Ignores 50% of enemy shield pips; if it damages the hull, transfers 25 Plasma from the enemy to your tank.',
  },
};

export const WEAPON_ORDER: WeaponId[] = [
  'repeater',
  'beam',
  'caster',
  'whip',
  'nova',
  'torpedo',
];
