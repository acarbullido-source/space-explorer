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
    <div className="w-full flex flex-col items-center gap-1.5 sm:gap-2 pointer-events-auto">
      {/* Weapons Card Row */}
      <div className="w-full flex flex-nowrap sm:flex-wrap items-stretch justify-center gap-1.5 sm:gap-2 max-w-full overflow-x-auto pb-0.5 px-1 overscroll-contain touch-pan-x">
        {equippedWeapons.map((slot, idx) => {
          const def = WEAPONS[slot.weaponId];
          const isSelected = selectedSlot === idx;
          const isTargeted = !!slot.targetRoomId;
          const canAfford = plasma >= def.cost;

          return (
            <div
              key={`${slot.weaponId}-${idx}`}
              onClick={() => onSelectSlot(idx)}
              className={`relative flex flex-col justify-between flex-1 min-w-[105px] sm:min-w-[165px] max-w-[195px] sm:w-52 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer backdrop-blur-md shadow-xl ${
                isSelected
                  ? 'bg-slate-900/95 border-cyan-400 ring-2 ring-cyan-400/60'
                  : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header: Tier Pill + Plasma Cost */}
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span
                  className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${def.badgeColor}`}
                >
                  {def.tier}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] sm:text-[11px] font-mono font-bold text-cyan-300">
                  <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                  {def.cost}P
                </span>
              </div>

              {/* Weapon Name */}
              <div className="text-[11px] sm:text-xs font-black text-white truncate my-0.5">
                {def.name}
              </div>

              {/* Plain-Language Tooltip & Mechanic (Desktop) */}
              <div className="hidden sm:block text-[10px] text-slate-300 line-clamp-2 leading-snug my-1">
                {def.tooltip}
              </div>

              {/* Special Status Ticker */}
              {slot.weaponId === 'beam' && slot.consecutiveHits > 0 && (
                <div className="text-[9px] sm:text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{slot.consecutiveHits}x Heat</span>
                </div>
              )}
              {slot.weaponId === 'nova' && slot.charged && (
                <div className="text-[9px] sm:text-[10px] font-bold text-red-300 flex items-center gap-1 animate-pulse">
                  <Flame className="w-3 h-3 text-red-400 shrink-0" />
                  <span>Charged!</span>
                </div>
              )}

              {/* Footer: Target Lock Badge */}
              <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                {isTargeted ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold bg-red-500/20 text-red-200 border border-red-400/50 truncate">
                    <Crosshair className="w-2.5 h-2.5 text-red-400 shrink-0" />
                    <span className="truncate">{slot.targetRoomId}</span>
                  </span>
                ) : (
                  <span className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-1">
                    <HelpCircle className="w-2.5 h-2.5 shrink-0" />
                    <span>Tap to aim</span>
                  </span>
                )}
                {!canAfford && (
                  <span className="text-[9px] font-bold text-amber-400">Low P</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Execution / Tactical Turn Button */}
      {inCombat && enemyPresent && (
        <div className="w-full flex items-center justify-center gap-2 px-1">
          <button
            type="button"
            disabled={!hasEnoughPlasma}
            onClick={onExecuteTurn}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2 rounded-xl sm:rounded-2xl text-xs font-black tracking-wide shadow-2xl transition active:scale-95 ${
              hasEnoughPlasma
                ? 'bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] border border-red-300'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Play className="w-4 h-4 fill-white shrink-0" />
            <span>FIRE / END TURN</span>
            {totalCost > 0 && <span className="font-mono text-cyan-200 ml-0.5">[{totalCost}P]</span>}
          </button>

          {onAutoCloakRetreat && (
            <button
              type="button"
              onClick={onAutoCloakRetreat}
              title="Disengage and emergency warp back to Home Garage with current cargo"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-extrabold bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-lg shrink-0"
            >
              <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">Auto-Cloak</span>
              <span>Retreat</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
