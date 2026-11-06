import React, { useEffect, useId, useRef } from 'react';
import {
  Compass,
  Flame,
  Globe,
  Lock,
  MapPin,
  Radio,
  Rocket,
  Sailboat,
  Sparkles,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import { jumpPlasmaCost, sensorsOn, type Action } from '../game/state';
import type { GameState, NodeType } from '../game/types';
import { BIOMES, BIOME_ORDER, getBiomeBySector } from '../game/biomes';

interface Props {
  open: boolean;
  state: GameState;
  dispatch: React.Dispatch<Action>;
  onClose: () => void;
}

export const NODE_META: Record<NodeType, { label: string; color: string }> = {
  garage: { label: 'Home Garage', color: '#22d3ee' },
  shop: { label: 'Satellite Shop', color: '#c084fc' },
  relay: { label: 'Laser Relay', color: '#38bdf8' },
  junk: { label: 'Scrap Field', color: '#fbbf24' },
  derelict: { label: 'Derelict Hulk', color: '#f97316' },
  trader: { label: 'Neutral Trader', color: '#a855f7' },
  hostile: { label: 'Hostile Ship', color: '#ef4444' },
  distress: { label: 'SOS Pod', color: '#38bdf8' },
  empty: { label: 'Patrol Lane', color: '#94a3b8' },
  exit: { label: 'Sector Gate', color: '#4ade80' },
};

export const SectorMapModal: React.FC<Props> = ({ open, state, dispatch, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      const onDown = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e)) dialog.close();
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      return () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    }
  }, []);

  if (!open) return <dialog ref={dialogRef} className="hidden" />;

  const curNode = state.nodes[state.current];
  const canScan = sensorsOn(state);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = '';
        onClose();
      }}
      className="w-full max-w-3xl rounded-2xl bg-slate-950/95 text-slate-100 border border-cyan-500/50 shadow-[0_25px_70px_rgba(0,0,0,0.9)] p-0 backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-cyan-500/30 bg-cyan-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-950/90 border border-cyan-400">
            <Compass className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 id={titleId} className="text-base font-extrabold tracking-wide text-white flex items-center gap-2">
              Sector {state.sector} Star Map
              {state.upgrades.sails > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/50">
                  <Sailboat className="w-3 h-3" />
                  Photonic Sails Active (0 Plasma Relay-to-Relay)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-300">
              Click any connected beacon to jump. Cyan dashed lanes use Photonic Sails for 0 Plasma!
            </p>
          </div>
        </div>

        <form method="dialog">
          <button
            type="submit"
            value="close"
            aria-label="Close sector map"
            autoFocus
            className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Star Map Graph */}
      <div className="p-5 space-y-4">
        {/* 5 Solar System Biomes & System Rules */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" /> 5 Solar System Biomes
            </span>
            <span className="text-[11px] font-mono text-cyan-300 font-bold">
              Sector {state.sector} of 5
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {BIOME_ORDER.map((bId, idx) => {
              const bDef = BIOMES[bId];
              const isCurrent = state.biome === bId;
              const sectorNum = idx + 1;
              const isLocked = sectorNum > state.sector;

              return (
                <div
                  key={bId}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    isCurrent
                      ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                      : isLocked
                        ? 'bg-slate-950/40 border-slate-800/80 opacity-50'
                        : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      S{sectorNum}
                    </span>
                    {isCurrent ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-cyan-400 text-slate-950">
                        ACTIVE
                      </span>
                    ) : isLocked ? (
                      <Lock className="w-3 h-3 text-slate-600" />
                    ) : null}
                  </div>
                  <div
                    className="text-xs font-bold mt-1 truncate"
                    style={{ color: bDef.primaryColor }}
                  >
                    {bDef.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{bDef.subtitle}</div>
                </div>
              );
            })}
          </div>

          {/* Active Biome System Rule Card */}
          {(() => {
            const curBiome = BIOMES[state.biome] ?? getBiomeBySector(state.sector);
            const antimatterLvl = state.moduleLevels?.antimatter_drives ?? 0;
            const antimatterBlocked = curBiome.requiresAntimatter && antimatterLvl < 1;

            return (
              <div
                className="p-3 rounded-lg border flex items-start gap-2.5"
                style={{
                  backgroundColor: `${curBiome.primaryColor}15`,
                  borderColor: `${curBiome.primaryColor}50`,
                }}
              >
                {state.biome === 'helios_forge' ? (
                  <Flame className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                ) : state.biome === 'dark_graveyard' ? (
                  <Sun className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                ) : (
                  <Radio className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-extrabold text-white">
                      {curBiome.name} Rule:
                    </strong>
                    {antimatterBlocked && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-black bg-red-500/30 text-red-300 border border-red-400/50">
                        ANTIMATTER DRIVE REQUIRED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 mt-0.5 leading-snug">
                    {curBiome.rule}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 font-mono text-cyan-300">
              <Zap className="w-3.5 h-3.5" /> Plasma Reserve: {state.plasma} / {state.maxPlasma}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Current: <strong className="text-white">{state.encounter.name}</strong>
            </span>
          </div>
          {state.encounter.kind === 'exit' && (
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'NEXT_SECTOR' });
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center gap-1.5 shadow-[0_0_15px_rgba(52,211,153,0.5)]"
            >
              <Rocket className="w-4 h-4" /> Warp to Sector {state.sector + 1} (+60 XP)
            </button>
          )}
        </div>

        <svg viewBox="0 0 680 260" className="w-full h-64 rounded-xl bg-slate-950 border border-slate-800">
          {/* Star Lanes */}
          {state.nodes.map((n) =>
            n.links.map((lid) => {
              if (lid < n.id) return null;
              const t = state.nodes[lid];
              const active = n.id === state.current || lid === state.current;
              const relayLane = n.relay && t.relay && state.upgrades.sails > 0;
              return (
                <g key={`${n.id}-${lid}`}>
                  <line
                    x1={n.x * 680}
                    y1={n.y * 260}
                    x2={t.x * 680}
                    y2={t.y * 260}
                    stroke={relayLane ? '#38bdf8' : active ? '#22d3ee' : '#334155'}
                    strokeWidth={active ? 2.5 : 1.5}
                    strokeDasharray={relayLane ? '6 4' : active ? undefined : '3 5'}
                  />
                </g>
              );
            }),
          )}

          {/* Beacons */}
          {state.nodes.map((n) => {
            const isCur = n.id === state.current;
            const canJump = curNode.links.includes(n.id);
            const known = n.visited || canScan || n.type === 'garage' || n.type === 'exit' || n.relay;
            const meta = known ? NODE_META[n.type] : { label: 'Unscanned', color: '#64748b' };
            const { cost, photonic } = jumpPlasmaCost(state, n.id);

            return (
              <g
                key={n.id}
                onClick={() => {
                  if (!canJump) return;
                  dispatch({ type: 'JUMP', node: n.id });
                  onClose();
                }}
                className={canJump ? 'cursor-pointer' : 'opacity-80'}
              >
                {/* Relay Halo */}
                {n.relay && (
                  <circle
                    cx={n.x * 680}
                    cy={n.y * 260}
                    r={16}
                    fill="rgba(56, 189, 248, 0.08)"
                    stroke="rgba(56, 189, 248, 0.45)"
                    strokeWidth={1.2}
                    strokeDasharray="3 3"
                  />
                )}
                {isCur && (
                  <circle
                    cx={n.x * 680}
                    cy={n.y * 260}
                    r={21}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth={2.5}
                    className="animate-pulseGlow"
                  />
                )}
                <circle
                  cx={n.x * 680}
                  cy={n.y * 260}
                  r={canJump ? 10 : 7.5}
                  fill={meta.color}
                  stroke="#020617"
                  strokeWidth={2}
                />
                <text
                  x={n.x * 680}
                  y={n.y * 260 + 24}
                  textAnchor="middle"
                  fill={isCur ? '#22d3ee' : canJump ? '#ffffff' : '#94a3b8'}
                  fontSize={10}
                  fontWeight={700}
                >
                  {meta.label}
                </text>
                {canJump && (
                  <text
                    x={n.x * 680}
                    y={n.y * 260 - 15}
                    textAnchor="middle"
                    fill={photonic ? '#38bdf8' : '#fde68a'}
                    fontSize={9.5}
                    fontWeight={800}
                  >
                    {photonic ? '0 Plasma (Sail)' : `−${cost} Plasma`}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-sky-300">
              <Radio className="w-3.5 h-3.5" /> Dashed ring = Laser Relay Beacon (0 Plasma jump between relays with Photonic Sails)
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">M</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">Esc</kbd> to close
          </span>
        </div>
      </div>
    </dialog>
  );
};
