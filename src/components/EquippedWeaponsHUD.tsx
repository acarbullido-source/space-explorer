import React from 'react';
import {
  Crosshair,
  Flame,
  HelpCircle,
  Play,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { WeaponSlot } from '../game/types';
import { WEAPONS } from '../game/weapons';

interface Props {
  equippedWeapons: WeaponSlot[];
  selectedSlot: number | null;
  onSelectSlot: (index: number) => void;
  onExecuteTurn: () => void;
  onAutoCloakRetreat?: () => void;
  plasma: number;
  inCombat: boolean;
  enemyPresent: boolean;
}

export const EquippedWeaponsHUD: React.FC<Props> = ({
  equippedWeapons,
  selectedSlot,
  onSelectSlot,
  onExecuteTurn,
  onAutoCloakRetreat,
  plasma,
  inCombat,
  enemyPresent,
}) => {
  const totalCost = equippedWeapons.reduce((sum, slot) => {
    if (!slot.targetRoomId) return sum;
    return sum + WEAPONS[slot.weaponId].cost;
  }, 0);

  const hasEnoughPlasma = plasma >= totalCost;

  return (
    <div className="flex flex-col items-center gap-2 pointer-events-auto">
      {/* Weapons Card Row */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {equippedWeapons.map((slot, idx) => {
          const def = WEAPONS[slot.weaponId];
          const isSelected = selectedSlot === idx;
          const isTargeted = !!slot.targetRoomId;
          const canAfford = plasma >= def.cost;

          return (
            <div
              key={`${slot.weaponId}-${idx}`}
              onClick={() => onSelectSlot(idx)}
              className={`relative flex flex-col justify-between w-48 sm:w-52 p-2.5 rounded-2xl border transition-all cursor-pointer backdrop-blur-md shadow-xl ${
                isSelected
                  ? 'bg-slate-900/95 border-cyan-400 ring-2 ring-cyan-400/60 scale-105'
                  : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header: Tier Pill + Plasma Cost */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${def.badgeColor}`}
                >
                  {def.tier}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-cyan-300">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  {def.cost} Plasma
                </span>
              </div>

              {/* Weapon Name */}
              <div className="text-xs font-black text-white truncate my-0.5">
                {def.name}
              </div>

              {/* Plain-Language Tooltip & Mechanic */}
              <div className="text-[10px] text-slate-300 line-clamp-2 leading-snug my-1">
                {def.tooltip}
              </div>

              {/* Special Status Ticker */}
              {slot.weaponId === 'beam' && slot.consecutiveHits > 0 && (
                <div className="text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Heat Multiplier: {slot.consecutiveHits}x damage
                </div>
              )}
              {slot.weaponId === 'nova' && slot.charged && (
                <div className="text-[10px] font-bold text-red-300 flex items-center gap-1 animate-pulse">
                  <Flame className="w-3 h-3 text-red-400" />
                  Charged! Primed to fire 65 dmg + burn!
                </div>
              )}

              {/* Footer: Target Lock Badge */}
              <div className="mt-1 pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                {isTargeted ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-500/20 text-red-200 border border-red-400/50">
                    <Crosshair className="w-3 h-3 text-red-400" />
                    Aiming: {slot.targetRoomId}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" />
                    Click to aim
                  </span>
                )}
                {!canAfford && (
                  <span className="text-[9px] font-bold text-amber-400">Low Plasma</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Execution / Tactical Turn Button */}
      {inCombat && enemyPresent && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!hasEnoughPlasma}
            onClick={onExecuteTurn}
            className={`flex items-center gap-2 px-6 py-2 rounded-2xl text-xs font-black tracking-wide shadow-2xl transition transform hover:scale-105 active:scale-95 ${
              hasEnoughPlasma
                ? 'bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] border border-red-300'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Play className="w-4 h-4 fill-white" />
            <span>FIRE / END TURN (Spacebar)</span>
            {totalCost > 0 && <span className="font-mono text-cyan-200 ml-1">[{totalCost} Plasma]</span>}
          </button>

          {onAutoCloakRetreat && (
            <button
              type="button"
              onClick={onAutoCloakRetreat}
              title="Disengage and emergency warp back to Home Garage with current cargo"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-extrabold bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-lg"
            >
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>Auto-Cloak Retreat</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
