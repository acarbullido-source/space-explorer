import React, { useId } from 'react';
import {
  Compass,
  Flame,
  Globe,
  Lock,
  MapPin,
  Radio,
  Rocket,
  Sailboat,
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
  const titleId = useId();

  if (!open) return null;

  const curNode = state.nodes[state.current];
  const canScan = sensorsOn(state);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90dvh] flex flex-col rounded-2xl bg-slate-950/95 text-slate-100 border border-cyan-500/50 shadow-[0_25px_70px_rgba(0,0,0,0.9)] p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 border-b border-cyan-500/30 bg-cyan-500/10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-slate-950/90 border border-cyan-400 shrink-0">
              <Compass className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-sm sm:text-base font-extrabold tracking-wide text-white flex flex-wrap items-center gap-2">
                <span>Sector {state.sector} Star Map</span>
                {state.upgrades.sails > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/50">
                    <Sailboat className="w-3 h-3" />
                    Photonic Sails
                  </span>
                )}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300">
                Tap any connected beacon to jump. Cyan dashed lanes use Photonic Sails for 0 Plasma!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sector map"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Star Map Graph */}
        <div className="p-3.5 sm:p-5 space-y-3.5 flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y">
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
                {/* Invisible large touch hit-target for mobile */}
                {canJump && (
                  <circle
                    cx={n.x * 680}
                    cy={n.y * 260}
                    r={28}
                    fill="transparent"
                  />
                )}
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
                  r={canJump ? 11 : 7.5}
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

        {/* Quick 1-Tap Connected Beacon Jump Buttons (Great for Mobile & Desktop) */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            Connected Beacons — Tap to Jump
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {curNode.links.map((lid) => {
              const targetNode = state.nodes[lid];
              if (!targetNode) return null;
              const known =
                targetNode.visited ||
                canScan ||
                targetNode.type === 'garage' ||
                targetNode.type === 'exit' ||
                targetNode.relay;
              const meta = known
                ? NODE_META[targetNode.type]
                : { label: 'Unscanned Beacon', color: '#64748b' };
              const { cost, photonic } = jumpPlasmaCost(state, targetNode.id);
              const canAfford = state.plasma >= cost;

              return (
                <button
                  key={targetNode.id}
                  type="button"
                  disabled={!canAfford}
                  onClick={() => {
                    dispatch({ type: 'JUMP', node: targetNode.id });
                    onClose();
                  }}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 hover:border-cyan-400/60 text-left transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="text-xs font-extrabold text-white truncate">
                      {meta.label}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-mono font-bold shrink-0 px-2 py-0.5 rounded-md ${
                      photonic
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    {photonic ? '0P (Sail)' : `−${cost}P`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-sky-300">
              <Radio className="w-3.5 h-3.5" /> Dashed ring = Laser Relay Beacon (0 Plasma jump between relays with Photonic Sails)
            </span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
