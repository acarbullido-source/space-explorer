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
    border: string;
    bg: string;
    text: string;
    hint: string;
  }
> = {
  asteroid: {
    icon: Pickaxe,
    badge: 'Mine Scrap',
    border: 'border-amber-400/70',
    bg: 'bg-amber-950/85 hover:bg-amber-900/90',
    text: 'text-amber-300',
    hint: '+10–25 Scrap • +5 XP',
  },
  junk: {
    icon: Wrench,
    badge: 'Harvest Junk',
    border: 'border-amber-400/70',
    bg: 'bg-amber-950/85 hover:bg-amber-900/90',
    text: 'text-amber-300',
    hint: '+10–25 Scrap • +5 XP',
  },
  pod: {
    icon: LifeBuoy,
    badge: 'SOS Pod',
    border: 'border-cyan-400/80',
    bg: 'bg-cyan-950/85 hover:bg-cyan-900/90',
    text: 'text-cyan-300',
    hint: 'Rescue (+50 XP, +20 Rep) or Salvage (+30 Scrap)',
  },
  artifact: {
    icon: Sparkles,
    badge: 'Relic',
    border: 'border-blue-400/80',
    bg: 'bg-blue-950/85 hover:bg-blue-900/90',
    text: 'text-blue-300',
    hint: 'Haul & Analyze (+75 XP)',
  },
  shop: {
    icon: Store,
    badge: 'Trade Dock',
    border: 'border-purple-400/80',
    bg: 'bg-purple-950/85 hover:bg-purple-900/90',
    text: 'text-purple-300',
    hint: 'Dock & Trade Spendable XP',
  },
  relay: {
    icon: Zap,
    badge: 'Laser Relay',
    border: 'border-sky-400/80',
    bg: 'bg-sky-950/85 hover:bg-sky-900/90',
    text: 'text-sky-300',
    hint: 'Beam +55 Plasma (+10 XP)',
  },
  vessel: {
    icon: Radio,
    badge: 'Vessel',
    border: 'border-emerald-400/80',
    bg: 'bg-emerald-950/85 hover:bg-emerald-900/90',
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
    // Direct one-click action for Asteroids, Space Junk, Artifacts, and Laser Relays,
    // or open quick choice card for Escape Pods, Vessels, and Shops.
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
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {/* Mining / Rescue / Laser Beam SVG Flash */}
      {state.fx.beamTarget && (
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
            y2={state.fx.beamTarget.y * 100}
            stroke={state.fx.beamTarget.color}
            strokeWidth={0.55}
            strokeDasharray="1.5 1"
            className="animate-pulseGlow"
          />
          <circle
            cx={state.fx.beamTarget.x * 100}
            cy={state.fx.beamTarget.y * 100}
            r={2.2}
            fill="none"
            stroke={state.fx.beamTarget.color}
            strokeWidth={0.4}
          />
        </svg>
      )}

      {/* Drifting Interactive Space Objects */}
      {activeObjects.map((obj) => {
        const isAnomaly = obj.label.startsWith('Anomaly:') || obj.id.startsWith('story-beacon');
        const style = KIND_STYLE[obj.kind];
        const Icon = isAnomaly ? Sparkles : style.icon;
        const isSelected = selectedObj?.id === obj.id;
        const badgeBorder = isAnomaly
          ? 'border-violet-400/90 shadow-[0_0_18px_rgba(168,85,247,0.45)] animate-pulse'
          : style.border;
        const badgeBg = isAnomaly
          ? 'bg-gradient-to-r from-violet-950/90 to-cyan-950/90 hover:from-violet-900/95 hover:to-cyan-900/95'
          : style.bg;

        return (
          <div
            key={obj.id}
            style={{
              left: `${obj.x * 100}%`,
              top: `${obj.y * 100}%`,
            }}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
          >
            <button
              type="button"
              onClick={() => handleObjectClick(obj)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-[0_0_20px_rgba(0,0,0,0.85)] backdrop-blur-md transition transform hover:scale-105 ${badgeBg} ${badgeBorder} ${
                isSelected ? 'ring-2 ring-white scale-105' : ''
              }`}
            >
              <span
                className={`p-1 rounded-full ${
                  isAnomaly ? 'bg-violet-900/80 text-violet-200' : `bg-slate-950/80 ${style.text}`
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </span>
              <div className="text-left leading-tight pr-1">
                <div className="text-[11px] font-extrabold text-white flex items-center gap-1.5">
                  <span>{obj.label}</span>
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.2 rounded bg-black/40 ${
                      isAnomaly ? 'text-violet-300' : style.text
                    }`}
                  >
                    {isAnomaly ? '🔵 Story Event' : obj.direction}
                  </span>
                </div>
                <div className="text-[10px] text-slate-300">
                  {isAnomaly ? 'Click to trigger FTL Story Choice Modal' : style.hint}
                </div>
              </div>
            </button>
          </div>
        );
      })}

      {/* Interactive Choice Card for Escape Pods, Neutral Vessels, and Satellite Shops */}
      {selectedObj && (
        <div className="pointer-events-auto absolute bottom-28 left-1/2 -translate-x-1/2 z-30 w-full max-w-md rounded-2xl bg-slate-950/95 border border-cyan-400/60 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-extrabold text-white">{selectedObj.label}</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300">
                {selectedObj.direction} Viewport
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveObjId(null)}
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedObj.kind === 'pod' && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-300">
                Life signs detected inside the damaged pod. Choose how to respond:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'POD_ACTION', objectId: selectedObj.id, mode: 'rescue' });
                    setActiveObjId(null);
                  }}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-left"
                >
                  <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1">
                    <HeartHandshake className="w-3.5 h-3.5" /> Rescue Survivors
                  </span>
                  <span className="text-[11px] text-slate-200 mt-0.5">+50 XP • +20 Reputation</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'POD_ACTION', objectId: selectedObj.id, mode: 'salvage' });
                    setActiveObjId(null);
                  }}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-left"
                >
                  <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5" /> Salvage Hull
                  </span>
                  <span className="text-[11px] text-slate-200 mt-0.5">+30 Scrap • −15 Reputation</span>
                </button>
              </div>
            </div>
          )}

          {selectedObj.kind === 'vessel' && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-300">
                Neutral {state.encounter.species} vessel holding position nearby.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'HAIL' });
                    onOpenRoomModal('comms');
                    setActiveObjId(null);
                  }}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/60 text-left"
                >
                  <span className="text-xs font-extrabold text-purple-300 flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5" /> Hail on Comms
                  </span>
                  <span className="text-[11px] text-slate-200 mt-0.5">Open trade & diplomacy</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'ENGAGE_VESSEL', objectId: selectedObj.id });
                    setActiveObjId(null);
                  }}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/60 text-left"
                >
                  <span className="text-xs font-extrabold text-red-300 flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5" /> Engage Combat
                  </span>
                  <span className="text-[11px] text-slate-200 mt-0.5">Fight for scrap (−10 Rep)</span>
                </button>
              </div>
            </div>
          )}

          {selectedObj.kind === 'shop' && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-300">
                Orbital shop & laser beaming station ready for docking.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'HAIL' });
                    onOpenRoomModal('comms');
                    setActiveObjId(null);
                  }}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/60 text-left"
                >
                  <span className="text-xs font-extrabold text-purple-300 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" /> Trade Spendable XP
                  </span>
                  <span className="text-[11px] text-slate-200 mt-0.5">Buy Plasma, hull repairs & scrap</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenRoomModal('science');
                    setActiveObjId(null);
                  }}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/60 text-left"
                >
                  <span className="text-xs font-extrabold text-blue-300 flex items-center gap-1">
                    <Anchor className="w-3.5 h-3.5" /> Upgrade Ship Tech
                  </span>
                  <span className="text-[11px] text-slate-200 mt-0.5">Spend XP or Scrap in Science Lab</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
