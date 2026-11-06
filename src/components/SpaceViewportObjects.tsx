import React, { useState } from 'react';
import {
  Anchor,
  Compass,
  Crosshair,
  HeartHandshake,
  LifeBuoy,
  Pickaxe,
  Radio,
  Sparkles,
  Store,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type { Action } from '../game/state';
import type { GameState, RoomId, SpaceObject, SpaceObjectKind } from '../game/types';

interface Props {
  state: GameState;
  editMode: boolean;
  dispatch: React.Dispatch<Action>;
  onOpenRoomModal: (room: RoomId) => void;
}

const KIND_STYLE: Record<
  SpaceObjectKind,
  {
    icon: React.FC<{ className?: string }>;
    badge: string;
    shortHint: string;
    border: string;
    bg: string;
    text: string;
    hint: string;
  }
> = {
  asteroid: {
    icon: Pickaxe,
    badge: 'Mine Scrap',
    shortHint: '+Scrap',
    border: 'border-amber-400/70',
    bg: 'bg-amber-950/90 hover:bg-amber-900/90',
    text: 'text-amber-300',
    hint: '+10–25 Scrap • +5 XP',
  },
  junk: {
    icon: Wrench,
    badge: 'Harvest Junk',
    shortHint: '+Scrap',
    border: 'border-amber-400/70',
    bg: 'bg-amber-950/90 hover:bg-amber-900/90',
    text: 'text-amber-300',
    hint: '+10–25 Scrap • +5 XP',
  },
  pod: {
    icon: LifeBuoy,
    badge: 'SOS Pod',
    shortHint: 'SOS Choice',
    border: 'border-cyan-400/80',
    bg: 'bg-cyan-950/90 hover:bg-cyan-900/90',
    text: 'text-cyan-300',
    hint: 'Rescue (+50 XP, +20 Rep) or Salvage (+30 Scrap)',
  },
  artifact: {
    icon: Sparkles,
    badge: 'Relic',
    shortHint: '+75 XP',
    border: 'border-blue-400/80',
    bg: 'bg-blue-950/90 hover:bg-blue-900/90',
    text: 'text-blue-300',
    hint: 'Haul & Analyze (+75 XP)',
  },
  shop: {
    icon: Store,
    badge: 'Trade Dock',
    shortHint: 'Dock/Trade',
    border: 'border-purple-400/80',
    bg: 'bg-purple-950/90 hover:bg-purple-900/90',
    text: 'text-purple-300',
    hint: 'Dock & Trade Spendable XP',
  },
  relay: {
    icon: Zap,
    badge: 'Laser Relay',
    shortHint: '+55 Plasma',
    border: 'border-sky-400/80',
    bg: 'bg-sky-950/90 hover:bg-sky-900/90',
    text: 'text-sky-300',
    hint: 'Beam +55 Plasma (+10 XP)',
  },
  vessel: {
    icon: Radio,
    badge: 'Vessel',
    shortHint: 'Hail/Fight',
    border: 'border-emerald-400/80',
    bg: 'bg-emerald-950/90 hover:bg-emerald-900/90',
    text: 'text-emerald-300',
    hint: 'Hail via Comms or Engage',
  },
};

export const SpaceViewportObjects: React.FC<Props> = ({
  state,
  editMode,
  dispatch,
  onOpenRoomModal,
}) => {
  const [activeObjId, setActiveObjId] = useState<string | null>(null);

  if (editMode) return null;

  const activeObjects = state.encounter.objects.filter((o) => !o.resolved);
  const selectedObj = activeObjects.find((o) => o.id === activeObjId) ?? null;

  const handleObjectClick = (obj: SpaceObject) => {
    if (obj.kind === 'asteroid' || obj.kind === 'junk') {
      dispatch({ type: 'MINE_OBJECT', objectId: obj.id });
      setActiveObjId(null);
      return;
    }
    if (obj.kind === 'artifact') {
      dispatch({ type: 'COLLECT_ARTIFACT', objectId: obj.id });
      setActiveObjId(null);
      return;
    }
    if (obj.kind === 'relay') {
      dispatch({ type: 'LASER_RECHARGE', objectId: obj.id });
      setActiveObjId(null);
      return;
    }
    setActiveObjId((prev) => (prev === obj.id ? null : obj.id));
  };

  return (
    <>
      {/* Mining / Rescue / Laser Beam SVG Flash Layer */}
      {state.fx.beamTarget && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <svg
            key={state.fx.beamTarget.id}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full pointer-events-none"
          >
            <line
              x1={50}
              y1={50}
              x2={state.fx.beamTarget.x * 100}
              y2={10}
              stroke={state.fx.beamTarget.color}
              strokeWidth={0.65}
              strokeDasharray="1.5 1"
              className="animate-pulseGlow"
            />
            <circle
              cx={state.fx.beamTarget.x * 100}
              cy={10}
              r={2.5}
              fill="none"
              stroke={state.fx.beamTarget.color}
              strokeWidth={0.45}
            />
          </svg>
        </div>
      )}

      {/* Docked Sector Radar / Nearby Space Objects Strip (Never overlaps the ship!) */}
      {activeObjects.length > 0 && (
        <div className="pointer-events-none absolute top-1.5 inset-x-2 z-20 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-1.5 max-w-full overflow-x-auto touch-pan-x px-2.5 py-1.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-[0_8px_30px_rgba(0,0,0,0.85)] backdrop-blur-md">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0 pr-1 border-r border-slate-800">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Nearby</span> ({activeObjects.length})
            </span>

            {activeObjects.map((obj) => {
              const isAnomaly =
                obj.label.startsWith('Anomaly:') || obj.id.startsWith('story-beacon');
              const style = KIND_STYLE[obj.kind];
              const Icon = isAnomaly ? Sparkles : style.icon;
              const isSelected = selectedObj?.id === obj.id;
              const badgeBorder = isAnomaly
                ? 'border-violet-400/90 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : style.border;
              const badgeBg = isAnomaly
                ? 'bg-gradient-to-r from-violet-950/95 to-cyan-950/95 hover:from-violet-900 hover:to-cyan-900'
                : style.bg;

              return (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => handleObjectClick(obj)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-left shrink-0 transition active:scale-95 ${badgeBg} ${badgeBorder} ${
                    isSelected ? 'ring-2 ring-white' : ''
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isAnomaly ? 'text-violet-300' : style.text
                    }`}
                  />
                  <span className="text-xs font-extrabold text-white whitespace-nowrap">
                    {obj.label}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded bg-black/40 whitespace-nowrap ${
                      isAnomaly ? 'text-violet-200' : style.text
                    }`}
                  >
                    {isAnomaly ? '🔵 Event' : style.shortHint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Centered Modal for Escape Pods, Neutral Vessels, and Satellite Shops */}
      {selectedObj && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm"
          onClick={() => setActiveObjId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-slate-950 border border-cyan-400/60 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-sm font-extrabold text-white truncate">
                  {selectedObj.label}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 shrink-0">
                  {selectedObj.direction}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveObjId(null)}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedObj.kind === 'pod' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Life signs detected inside the damaged pod. Choose how to respond:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'POD_ACTION', objectId: selectedObj.id, mode: 'rescue' });
                      setActiveObjId(null);
                    }}
                    className="flex flex-col items-start p-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-left transition"
                  >
                    <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                      <HeartHandshake className="w-4 h-4" /> Rescue Survivors
                    </span>
                    <span className="text-[11px] text-slate-200 mt-1">
                      +50 XP • +20 Reputation
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'POD_ACTION', objectId: selectedObj.id, mode: 'salvage' });
                      setActiveObjId(null);
                    }}
                    className="flex flex-col items-start p-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-left transition"
                  >
                    <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4" /> Salvage Hull
                    </span>
                    <span className="text-[11px] text-slate-200 mt-1">
                      +30 Scrap • −15 Reputation
                    </span>
                  </button>
                </div>
              </div>
            )}

            {selectedObj.kind === 'vessel' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Neutral {state.encounter.species} vessel holding position nearby.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'HAIL' });
                      onOpenRoomModal('comms');
                      setActiveObjId(null);
                    }}
                    className="flex flex-col items-start p-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/60 text-left transition"
                  >
                    <span className="text-xs font-extrabold text-purple-300 flex items-center gap-1.5">
                      <Radio className="w-4 h-4" /> Hail on Comms
                    </span>
                    <span className="text-[11px] text-slate-200 mt-1">
                      Open trade & diplomacy
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'ENGAGE_VESSEL', objectId: selectedObj.id });
                      setActiveObjId(null);
                    }}
                    className="flex flex-col items-start p-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/60 text-left transition"
                  >
                    <span className="text-xs font-extrabold text-red-300 flex items-center gap-1.5">
                      <Crosshair className="w-4 h-4" /> Engage Combat
                    </span>
                    <span className="text-[11px] text-slate-200 mt-1">
                      Fight for scrap (−10 Rep)
                    </span>
                  </button>
                </div>
              </div>
            )}

            {selectedObj.kind === 'shop' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Orbital shop & laser beaming station ready for docking.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'HAIL' });
                      onOpenRoomModal('comms');
                      setActiveObjId(null);
                    }}
                    className="flex flex-col items-start p-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/60 text-left transition"
                  >
                    <span className="text-xs font-extrabold text-purple-300 flex items-center gap-1.5">
                      <Store className="w-4 h-4" /> Trade Spendable XP
                    </span>
                    <span className="text-[11px] text-slate-200 mt-1">
                      Buy Plasma, hull repairs & scrap
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRoomModal('science');
                      setActiveObjId(null);
                    }}
                    className="flex flex-col items-start p-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/60 text-left transition"
                  >
                    <span className="text-xs font-extrabold text-blue-300 flex items-center gap-1.5">
                      <Anchor className="w-4 h-4" /> Upgrade Ship Tech
                    </span>
                    <span className="text-[11px] text-slate-200 mt-1">
                      Spend XP or Scrap in Science Lab
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
