import React from 'react';
import { Flame, Shield, Sprout, Zap, Cog } from 'lucide-react';
import { SYSTEMS, SYSTEM_ORDER } from '../game/rooms';
import { maxPower, netPlasmaPerTurn, usedPower, type Action } from '../game/state';
import type { GameState, SystemId } from '../game/types';

interface Props {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  compact?: boolean;
}

const SYS_ICON: Record<SystemId, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  shields: Shield,
  weapons: Flame,
  engines: Cog,
  life: Sprout,
};

export const PlasmaAllocationPanel: React.FC<Props> = ({ state, dispatch, compact = false }) => {
  const freePips = state.reactor - usedPower(state);
  const netPlasma = netPlasmaPerTurn(state);

  return (
    <div className="rounded-2xl bg-slate-950/90 border border-slate-800/90 p-3 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          Plasma Power Routing
        </span>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-emerald-300">{freePips} free pips</span>
          <span
            className={`px-1.5 py-0.5 rounded font-bold ${
              netPlasma >= 0
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            }`}
          >
            {netPlasma >= 0 ? `+${netPlasma}` : netPlasma}/turn
          </span>
        </div>
      </div>

      <div className={`grid ${compact ? 'grid-cols-4 gap-2' : 'grid-cols-2 sm:grid-cols-4 gap-2.5'}`}>
        {SYSTEM_ORDER.map((sys) => {
          const meta = SYSTEMS[sys];
          const Icon = SYS_ICON[sys];
          const cap = maxPower(state, sys);
          const cur = state.power[sys];
          return (
            <div
              key={sys}
              title={meta.desc}
              className="rounded-xl bg-slate-900/90 border border-slate-800 p-2 flex flex-col items-center justify-between gap-1.5"
            >
              {/* Top Icon + Label */}
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-100">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
                <span className="truncate">{compact ? meta.short : meta.name}</span>
              </div>

              {/* FTL Vertical Power Pips */}
              <div className="flex flex-col-reverse gap-1 my-0.5">
                {Array.from({ length: cap }).map((_, i) => {
                  const active = i < cur;
                  return (
                    <span
                      key={i}
                      className="w-9 h-2 rounded-[2px] transition-all"
                      style={{
                        backgroundColor: active ? meta.color : '#1e293b',
                        boxShadow: active ? `0 0 8px ${meta.color}88` : 'none',
                      }}
                    />
                  );
                })}
              </div>

              {/* Tactile - / + Controls */}
              <div className="flex items-center gap-1 w-full justify-center">
                <button
                  type="button"
                  disabled={cur <= 0}
                  onClick={() => dispatch({ type: 'SET_POWER', sys, value: cur - 1 })}
                  aria-label={`Decrease ${meta.name} power`}
                  className="w-6 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-xs font-extrabold text-white border border-slate-700"
                >
                  −
                </button>
                <span className="text-[10px] font-mono font-bold text-slate-300 w-6 text-center">
                  {cur}/{cap}
                </span>
                <button
                  type="button"
                  disabled={cur >= cap || freePips <= 0}
                  onClick={() => dispatch({ type: 'SET_POWER', sys, value: cur + 1 })}
                  aria-label={`Increase ${meta.name} power`}
                  className="w-6 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-xs font-extrabold text-white border border-slate-700"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
