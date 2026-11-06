import React, { useId, useState } from 'react';
import {
  Activity,
  Anchor,
  Apple,
  BedDouble,
  BookOpen,
  Check,
  Coins,
  Compass,
  Eye,
  Flame,
  Fuel,
  Handshake,
  HeartHandshake,
  HeartPulse,
  LifeBuoy,
  Link2,
  Lock,
  MapPin,
  Package,
  Pickaxe,
  Radio,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Unlink,
  UserCheck,
  Users,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { ROOMS, ROOM_ORDER } from '../game/rooms';
import { ARK_ARTIFACTS, ARK_ARTIFACT_IDS } from '../game/storyEvents';
import {
  convertPlasmaGain,
  convertScrapCost,
  evasion,
  getRank,
  getReputationBadge,
  hostileActive,
  lifeRates,
  mannedRoom,
  offers,
  shieldMax,
  type Action,
} from '../game/state';
import type { GameState, RoomId, ViewportDir } from '../game/types';
import { WEAPONS, WEAPON_ORDER, type WeaponId } from '../game/weapons';
import { ALL_UPGRADES, UPGRADES_BY_ROOM, type UpgradeModuleId } from '../game/upgrades';
import { ALIEN_SPECIES, type AlienSpeciesId } from '../game/diplomacy';
import { PlasmaAllocationPanel } from './PlasmaAllocationPanel';

interface Props {
  room: RoomId | null;
  state: GameState;
  dispatch: React.Dispatch<Action>;
  onClose: () => void;
  onMoveToConsole: (room: RoomId) => void;
  onSelectRoom?: (room: RoomId) => void;
  onOpenSectorMap: () => void;
  onOpenCoopDocking?: () => void;
}

const UpgradeCard: React.FC<{
  moduleId: UpgradeModuleId;
  state: GameState;
  dispatch: React.Dispatch<Action>;
}> = ({ moduleId, state, dispatch }) => {
  const def = ALL_UPGRADES[moduleId];
  const curLvl = state.moduleLevels[moduleId] ?? 0;
  const isMax = curLvl >= def.maxLevel;
  const xpCost = isMax ? null : def.xpCosts[curLvl];
  const scrapCost = isMax ? null : def.scrapCosts[curLvl];
  const canXp = xpCost !== null && state.spendXp >= xpCost;
  const canScrap = scrapCost !== null && state.scrap >= scrapCost;

  return (
    <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-2.5">
      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-white text-xs">{def.name}</span>
          <div className="flex items-center gap-1 font-mono text-[11px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`w-3 h-1.5 rounded-sm ${
                  i < curLvl ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'bg-slate-800'
                }`}
              />
            ))}
            <span className="text-white font-bold ml-1">Lv.{curLvl}/5</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-300 italic mt-0.5">"{def.summary}"</div>
        <div className="mt-1.5 p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] text-cyan-200">
          <strong className="text-white">Active: </strong>
          {def.getEffectDesc(curLvl)}
        </div>
      </div>

      {isMax ? (
        <div className="flex items-center justify-center gap-1 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/40">
          <Check className="w-3.5 h-3.5" /> MAX LEVEL 5
        </div>
      ) : (
        <div className="flex gap-1.5 pt-1 border-t border-slate-800/80">
          <button
            type="button"
            disabled={!canXp}
            onClick={() => dispatch({ type: 'UPGRADE_MODULE', moduleId, currency: 'xp' })}
            className="flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/35 disabled:opacity-35 text-amber-200 border border-amber-400/50 flex items-center justify-center gap-1 transition"
          >
            <Coins className="w-3 h-3" /> {xpCost} XP
          </button>
          <button
            type="button"
            disabled={!canScrap}
            onClick={() => dispatch({ type: 'UPGRADE_MODULE', moduleId, currency: 'scrap' })}
            className="flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-orange-500/20 hover:bg-orange-500/35 disabled:opacity-35 text-orange-200 border border-orange-400/50 flex items-center justify-center gap-1 transition"
          >
            <Wrench className="w-3 h-3" /> {scrapCost} Scrap
          </button>
        </div>
      )}
    </div>
  );
};

export const ConsoleModal: React.FC<Props> = ({
  room,
  state,
  dispatch,
  onClose,
  onMoveToConsole,
  onSelectRoom,
  onOpenSectorMap,
  onOpenCoopDocking,
}) => {
  const titleId = useId();
  const [viewportDir, setViewportDir] = useState<ViewportDir>('Front');

  if (!room) {
    return null;
  }

  const def = ROOMS[room];
  const Icon = def.icon;
  const manned = mannedRoom(state);
  const isManned = manned === room;
  const rates = lifeRates(state);
  const rankInfo = getRank(state.rankXp);
  const repBadge = getReputationBadge(state.reputation);
  const dirObjects = state.encounter.objects.filter(
    (o) => !o.resolved && o.direction === viewportDir,
  );

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
        className="w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl bg-slate-950/95 text-slate-100 border border-slate-700/90 shadow-[0_25px_70px_rgba(0,0,0,0.9)] p-0 overflow-hidden"
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-3.5 sm:px-5 py-3 border-b shrink-0 ${def.theme.border} ${def.theme.bg}`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className="p-2 rounded-xl bg-slate-950/80 border shrink-0"
              style={{ borderColor: def.theme.accent }}
            >
              <Icon className="w-5 h-5" style={{ color: def.theme.accent }} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={titleId} className="text-sm sm:text-base font-extrabold tracking-wide text-white truncate">
                  {def.name}
                </h2>
                {isManned ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/60">
                    <UserCheck className="w-3 h-3" />
                    MANNED (+25%)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMoveToConsole(room)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/60 transition"
                  >
                    Walk Crew Here (+25%)
                  </button>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">{def.label}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close console modal"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6-Room Quick Switcher Tab Strip */}
        {onSelectRoom && (
          <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-800 bg-slate-950/90 overflow-x-auto touch-pan-x shrink-0">
            {ROOM_ORDER.map((rId) => {
              const rDef = ROOMS[rId];
              const RIcon = rDef.icon;
              const active = rId === room;
              const rManned = manned === rId;
              return (
                <button
                  key={rId}
                  type="button"
                  onClick={() => onSelectRoom(rId)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border shrink-0 transition ${
                    active
                      ? 'bg-slate-800 text-white border-cyan-400 shadow'
                      : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <RIcon className="w-3.5 h-3.5" style={{ color: rDef.theme.accent }} />
                  <span>{rDef.name.split(' ')[0]}</span>
                  {rManned && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 space-y-4 flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y">
        {/* 1. BRIDGE / COCKPIT */}
        {room === 'bridge' && (
          <div className="space-y-4">
            {/* Directional Viewports with Interactive Space Objects */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" /> Directional Space Viewports
                </span>
                <div className="flex gap-1">
                  {(['Front', 'Left', 'Right', 'Rear'] as const).map((dir) => {
                    const count = state.encounter.objects.filter(
                      (o) => !o.resolved && o.direction === dir,
                    ).length;
                    return (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => setViewportDir(dir)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          viewportDir === dir
                            ? 'bg-cyan-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <span>{dir}</span>
                        {count > 0 && (
                          <span
                            className={`px-1.5 rounded-full text-[10px] ${
                              viewportDir === dir ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-500/20 text-cyan-300'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive objects inside selected directional window */}
              <div className="rounded-xl bg-gradient-to-r from-slate-950 via-cyan-950/25 to-slate-950 border border-cyan-500/30 p-3 space-y-2">
                {dirObjects.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dirObjects.map((obj) => (
                      <div
                        key={obj.id}
                        className="rounded-lg bg-slate-900/90 border border-slate-700/80 p-2.5 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-bold text-white">{obj.label}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{obj.kind} in {obj.direction} sector</div>
                        </div>

                        {(obj.kind === 'asteroid' || obj.kind === 'junk') && (
                          <button
                            type="button"
                            onClick={() => dispatch({ type: 'MINE_OBJECT', objectId: obj.id })}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1 shrink-0"
                          >
                            <Pickaxe className="w-3 h-3" /> Mine (+Scrap)
                          </button>
                        )}

                        {obj.kind === 'artifact' && (
                          <button
                            type="button"
                            onClick={() => dispatch({ type: 'COLLECT_ARTIFACT', objectId: obj.id })}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-blue-400 hover:bg-blue-300 text-slate-950 flex items-center gap-1 shrink-0"
                          >
                            <Sparkles className="w-3 h-3" /> Haul (+75 XP)
                          </button>
                        )}

                        {obj.kind === 'relay' && (
                          <button
                            type="button"
                            onClick={() => dispatch({ type: 'LASER_RECHARGE', objectId: obj.id })}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-1 shrink-0"
                          >
                            <Zap className="w-3 h-3" /> Beam +55 Plasma
                          </button>
                        )}

                        {obj.kind === 'pod' && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => dispatch({ type: 'POD_ACTION', objectId: obj.id, mode: 'rescue' })}
                              className="px-2 py-1 rounded text-[10px] font-extrabold bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center gap-0.5"
                              title="+50 XP, +20 Reputation"
                            >
                              <HeartHandshake className="w-3 h-3" /> Rescue
                            </button>
                            <button
                              type="button"
                              onClick={() => dispatch({ type: 'POD_ACTION', objectId: obj.id, mode: 'salvage' })}
                              className="px-2 py-1 rounded text-[10px] font-extrabold bg-amber-400 hover:bg-amber-300 text-slate-950"
                              title="+30 Scrap, -15 Reputation"
                            >
                              Salvage
                            </button>
                          </div>
                        )}

                        {(obj.kind === 'vessel' || obj.kind === 'shop') && (
                          <button
                            type="button"
                            onClick={() => dispatch({ type: 'HAIL' })}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-purple-400 hover:bg-purple-300 text-slate-950 shrink-0"
                          >
                            Hail
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-2 px-1 text-xs text-slate-400">
                    <span className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-cyan-400" />
                      {viewportDir} camera clear at {state.encounter.name}. Check other directions or jump!
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Deep Space Story Anomaly Card */}
            {state.encounter.hasStoryAnomaly && (
              <div className="rounded-xl bg-gradient-to-r from-violet-950/80 to-slate-900 border border-violet-400/60 p-3.5 flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                    Deep Space Story Anomaly Detected
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Subspace scans picked up an alien beacon with interactive 🔵 Blue Upgrade Options.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'TRIGGER_STORY_EVENT' })}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-violet-400 hover:bg-violet-300 text-slate-950 flex items-center gap-1.5 shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                >
                  <Sparkles className="w-4 h-4" /> Investigate Anomaly
                </button>
              </div>
            )}

            {/* Sector Map Jump Button */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Navigation & Photonic Sails
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Open the Sector Star Map (<kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px]">M</kbd>) to jump between beacons (0 Plasma between Laser Relays).
                </div>
              </div>
              <div className="flex items-center gap-2">
                {state.encounter.kind === 'exit' && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'NEXT_SECTOR' })}
                    className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center gap-1.5"
                  >
                    <Rocket className="w-4 h-4" /> Warp Next Sector
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSectorMap();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                >
                  <MapPin className="w-4 h-4" /> Open Sector Map (M)
                </button>
              </div>
            </div>

            {/* Bridge Armory & 6 Plasma Weapons Manager */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-cyan-400" /> Bridge Armory: 3 Active Weapon Bays
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Universal Arsenal: 6 Plasma Weapons
                </span>
              </div>

              {/* 3 Active Equipped Slots */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {state.equippedWeapons.map((slot, sIdx) => {
                  const def = WEAPONS[slot.weaponId];
                  return (
                    <div
                      key={sIdx}
                      className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 flex flex-col justify-between gap-1.5 shadow"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-extrabold uppercase text-slate-400">
                          Bay #{sIdx + 1}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full font-bold uppercase ${def.badgeColor}`}
                        >
                          {def.tier}
                        </span>
                      </div>
                      <div className="text-xs font-black text-white">{def.name}</div>
                      <div className="text-[10px] text-cyan-300 font-mono">
                        {def.cost} Plasma/turn
                      </div>
                      <div className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                        {def.tooltip}
                      </div>

                      {/* Swap Weapon Dropdown */}
                      <div className="mt-1 pt-1.5 border-t border-slate-800/80">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                          Swap Equipped:
                        </label>
                        <select
                          value={slot.weaponId}
                          onChange={(e) =>
                            dispatch({
                              type: 'SWAP_WEAPON',
                              slotIndex: sIdx,
                              newWeaponId: e.target.value as WeaponId,
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-white font-bold cursor-pointer"
                        >
                          {WEAPON_ORDER.map((wId) => {
                            const opt = WEAPONS[wId];
                            return (
                              <option key={wId} value={wId}>
                                {opt.name} ({opt.tier.toUpperCase()} • {opt.cost}P)
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bridge Multi-Level Upgrades */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" /> Bridge Upgrades (Lv 1–5)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  XP: {state.spendXp} • Scrap: {state.scrap}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {UPGRADES_BY_ROOM.bridge.map((mId) => (
                  <UpgradeCard key={mId} moduleId={mId} state={state} dispatch={dispatch} />
                ))}
              </div>
            </div>

            {/* Master Unified Plasma Allocation Panel */}
            <PlasmaAllocationPanel state={state} dispatch={dispatch} />
          </div>
        )}

        {/* 2. COMMS & QUARTERS */}
        {room === 'comms' && (
          <div className="space-y-4">
            {/* Rank & Sector Reputation Diplomatic Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 flex items-center gap-3">
                <Star className="w-6 h-6 text-amber-300 shrink-0" />
                <div>
                  <div className="text-xs font-extrabold text-white">
                    Rank {rankInfo.current.level}: {rankInfo.current.title} ({state.rankXp} XP)
                  </div>
                  <div className="text-[11px] text-amber-200">{rankInfo.current.perk}</div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold text-white">Sector Reputation</div>
                  <div className="text-[11px] text-slate-400">Score: {state.reputation} (−100 to +100)</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${repBadge.bg} ${repBadge.color}`}>
                  {repBadge.label}
                </span>
              </div>
            </div>

            {/* Hail & Spendable XP Trade */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Radio className="w-4 h-4" /> Subspace Hail & XP Trade (Spendable XP: {state.spendXp})
                </span>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'HAIL' })}
                  className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-purple-400 hover:bg-purple-300 text-slate-950"
                >
                  Hail {state.encounter.name}
                </button>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200">
                {state.encounter.hailed
                  ? state.encounter.hailText
                  : 'Click "Hail" to open subspace comms or use your Diplomatic Rank perk.'}
              </div>

              {state.encounter.kind === 'distress' && !state.encounter.helped && (
                <button
                  type="button"
                  disabled={state.plasma < 20}
                  onClick={() => dispatch({ type: 'HELP' })}
                  className="px-3 py-2 rounded-lg text-xs font-extrabold bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-slate-950 flex items-center gap-1.5"
                >
                  <LifeBuoy className="w-4 h-4" /> Beam 20 Plasma to Stranded Ship (+50 XP, +20 Reputation, +1 Relic)
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {offers(state).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    disabled={!o.ok}
                    onClick={() => dispatch({ type: 'TRADE', offer: o.id })}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-left"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{o.label}</div>
                      <div className="text-[11px] text-slate-400">{o.detail}</div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300 shrink-0 ml-2">
                      {o.cost} {o.currency === 'xp' ? 'XP' : 'Scrap'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rest in Bunk */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BedDouble className="w-6 h-6 text-purple-300" />
                <div>
                  <div className="text-sm font-bold text-white">Rest in Crew Bunk</div>
                  <div className="text-xs text-slate-400">
                    Restores 100% stamina and grants +15% crew walking speed.
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={hostileActive(state) || state.restCooldown > 0}
                onClick={() => dispatch({ type: 'REST' })}
                className="px-4 py-2 rounded-lg text-xs font-extrabold bg-purple-400 hover:bg-purple-300 disabled:opacity-40 text-slate-950"
              >
                {state.restCooldown > 0 ? `Ready in ${state.restCooldown}t` : 'Rest Now'}
              </button>
            </div>

            {/* Comms Upgrades (Universal AI Translator) */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-400" /> Comms Upgrades
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  XP: {state.spendXp} • Scrap: {state.scrap}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {UPGRADES_BY_ROOM.comms.map((mId) => (
                  <UpgradeCard key={mId} moduleId={mId} state={state} dispatch={dispatch} />
                ))}
              </div>
            </div>

            {/* Alien Diplomacy & Treaties Panel */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Handshake className="w-4 h-4 text-purple-400" /> Alien Diplomacy & Alliances (5 Species)
                </span>
                {state.diplomacy.activeTreaty && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/50">
                    Active: {state.diplomacy.activeTreaty}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(ALIEN_SPECIES) as AlienSpeciesId[]).map((spId) => {
                  const sp = ALIEN_SPECIES[spId];
                  const isAllied = state.diplomacy.alliances.includes(spId);
                  const isActive = state.diplomacy.activeTreaty === spId;
                  const transLvl = state.moduleLevels.ai_translator ?? 0;
                  const unlocked = transLvl >= 1 || state.reputation >= 40;
                  return (
                    <div
                      key={spId}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-sm" style={{ color: sp.accentColor }}>
                            {sp.name}
                          </span>
                          {isActive && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{sp.archetype}</div>
                        <div className="text-[11px] text-slate-300 italic mt-1">
                          {unlocked ? `"${sp.greeting}"` : '[Encrypted waveform — upgrade Translator]'}
                        </div>
                        <div className="text-[10px] text-emerald-300 mt-1">
                          <strong>Perk: </strong>{sp.treatyPerk}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!unlocked || isActive}
                        onClick={() => dispatch({ type: 'SIGN_TREATY', species: spId })}
                        className="w-full py-1 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 text-cyan-200 border border-cyan-400/40 transition"
                      >
                        {isActive ? 'Active Treaty' : isAllied ? 'Select Treaty' : 'Sign Treaty (+100 XP)'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. LIFE SUPPORT / ECLSS */}
        {room === 'life' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-green-300 flex items-center gap-1.5">
                    <Wind className="w-4 h-4" /> Breathable Oxygen
                  </span>
                  <span className="text-xs font-mono text-white">
                    {Math.round(state.oxygen)}% ({rates.oxygen >= 0 ? '+' : ''}
                    {rates.oxygen.toFixed(1)}/t)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${Math.round(state.oxygen)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-green-300 flex items-center gap-1.5">
                    <Apple className="w-4 h-4" /> Hydroponic Food
                  </span>
                  <span className="text-xs font-mono text-white">
                    {Math.round(state.food)}% ({rates.food >= 0 ? '+' : ''}
                    {rates.food.toFixed(1)}/t)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-lime-400 transition-all"
                    style={{ width: `${Math.round(state.food)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HeartPulse className="w-6 h-6 text-green-300" />
                <div>
                  <div className="text-sm font-bold text-white">Passive Crew Healing & Auto-Repairs</div>
                  <div className="text-xs text-slate-400">
                    Heals crew each turn and powers auto-repair drones when allocated 3+ power pips.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: 'HEALING' })}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold transition ${
                  state.healing
                    ? 'bg-emerald-400 text-slate-950'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {state.healing ? 'Healing ON' : 'Healing OFF'}
              </button>
            </div>

            {/* Life Support Upgrades (Bioregenerative Systems) */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-green-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-green-400" /> Life Support Upgrades
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  XP: {state.spendXp} • Scrap: {state.scrap}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {UPGRADES_BY_ROOM.life.map((mId) => (
                  <UpgradeCard key={mId} moduleId={mId} state={state} dispatch={dispatch} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. SCIENCE LAB */}
        {room === 'science' && (
          <div className="space-y-4">
            {/* Shield Status Monitor */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-blue-300" />
                <div>
                  <div className="text-sm font-bold text-white">
                    Magnetic Shields: {state.shieldLayers} / {shieldMax(state)} Bubbles
                  </div>
                  <div className="text-xs text-slate-400">
                    Recharge progress: {Math.round(state.shieldCharge * 100)}%
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: Math.max(1, shieldMax(state)) }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-6 h-3 rounded-full ${
                      i < state.shieldLayers ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Ancient Artifact Analyzer (+75 XP) */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-blue-300" />
                <div>
                  <div className="text-sm font-bold text-white">
                    Ancient Artifact Analyzer ({state.artifacts} aboard)
                  </div>
                  <div className="text-xs text-slate-400">
                    {state.analyzing > 0
                      ? `Decoding relic (${state.analyzing} turns left) for +75 XP…`
                      : 'Analyze hauled artifacts for +75 XP, +35 Plasma, and Scrap.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={state.artifacts <= 0 || state.analyzing > 0}
                onClick={() => dispatch({ type: 'ANALYZE' })}
                className="px-4 py-2 rounded-lg text-xs font-extrabold bg-blue-400 hover:bg-blue-300 disabled:opacity-40 text-slate-950"
              >
                {state.analyzing > 0 ? 'Analyzing…' : 'Analyze (+75 XP)'}
              </button>
            </div>

            {/* Earth Ark Codex Tracker (5 Artifact Slots) */}
            <div className="rounded-xl bg-slate-900/90 border border-amber-500/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-400/50">
                    <BookOpen className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                      Earth Ark Codex Tracker
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      5 Lost Relics detailing Earth's destruction and the path to New Earth
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-amber-300">
                    {Object.values(state.arkCodex).filter(Boolean).length} / 5 Recovered
                  </span>
                  <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-yellow-200 transition-all shadow-[0_0_8px_#f59e0b]"
                      style={{
                        width: `${(Object.values(state.arkCodex).filter(Boolean).length / 5) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {Object.values(state.arkCodex).filter(Boolean).length === 5 && (
                <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-400/60 text-xs text-amber-100 flex items-center gap-2 font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    THE ARK MYSTERY SOLVED: All 5 artifacts decoded! Navigational jump coordinates to New Earth are secured!
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                {ARK_ARTIFACT_IDS.map((artId) => {
                  const art = ARK_ARTIFACTS[artId];
                  const isFound = !!state.arkCodex[artId];

                  return (
                    <div
                      key={artId}
                      className={`p-3 rounded-xl border transition ${
                        isFound
                          ? 'bg-gradient-to-r from-amber-950/40 to-slate-900/80 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                          : 'bg-slate-950/60 border-slate-800/80 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isFound ? (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span
                            className={`text-xs font-extrabold ${
                              isFound ? 'text-amber-200' : 'text-slate-400'
                            }`}
                          >
                            {art.name}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            isFound
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {isFound ? 'DECODED' : `Sector ${art.sectorOrigin} Anomaly`}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        {isFound ? art.lore : art.summary}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Science Lab Upgrades (Active Magnetic Shielding, Self-Healing Materials, Predictive Maintenance) */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-400" /> Science Lab Upgrades (Lv 1–5)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  XP: {state.spendXp} • Scrap: {state.scrap}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {UPGRADES_BY_ROOM.science.map((mId) => (
                  <UpgradeCard key={mId} moduleId={mId} state={state} dispatch={dispatch} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. AIRLOCK */}
        {room === 'airlock' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Anchor className="w-6 h-6 text-amber-300" />
                <div>
                  <div className="text-sm font-bold text-white">
                    EVA Salvage Drone ({state.encounter.junk} orbital targets)
                  </div>
                  <div className="text-xs text-slate-400">
                    {state.eva > 0
                      ? `EVA tether out — returning in ${state.eva} turns…`
                      : 'Launch EVA tether or click asteroids/junk in space for +10–25 Scrap & +5 XP.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={state.eva > 0 || !!state.docked}
                onClick={() => dispatch({ type: 'EVA' })}
                className="px-4 py-2 rounded-lg text-xs font-extrabold bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950"
              >
                {state.eva > 0 ? 'Spacewalking…' : 'Launch EVA Drone'}
              </button>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {state.docked ? (
                  <Unlink className="w-6 h-6 text-amber-300" />
                ) : (
                  <Link2 className="w-6 h-6 text-amber-300" />
                )}
                <div>
                  <div className="text-sm font-bold text-white">Magnetic Docking Clamps</div>
                  <div className="text-xs text-slate-400">
                    {state.docked
                      ? 'Clamps locked! Walk your crew through the airlock tunnel to loot crates.'
                      : state.encounter.dockable
                        ? `Target in range: ${state.encounter.name}`
                        : 'No dockable hulk at this beacon.'}
                  </div>
                </div>
              </div>
              {state.docked ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'UNDOCK' })}
                  className="px-4 py-2 rounded-lg text-xs font-extrabold bg-rose-500 hover:bg-rose-400 text-white"
                >
                  Undock Ship
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!state.encounter.dockable || state.eva > 0}
                  onClick={() => dispatch({ type: 'DOCK' })}
                  className="px-4 py-2 rounded-lg text-xs font-extrabold bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950"
                >
                  Engage Clamps
                </button>
              )}
            </div>

            {/* Co-Op Mothership Docking Station */}
            <div className="rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-cyan-950/40 border border-cyan-500/40 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-cyan-300" />
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    Co-Op Ship Docking ("Mothership" Mode)
                    {state.mothership.active && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/50">
                        DOCKED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300">
                    {state.mothership.active
                      ? `Locked with ${state.mothership.partner?.name ?? 'Wingman'}. Plasma & Shields pooled with 15% safety reserves.`
                      : 'Dock with an AI Wingman or join local multiplayer with a 4-digit code.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenCoopDocking) onOpenCoopDocking();
                }}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-1.5 shadow"
              >
                <Users className="w-4 h-4" />
                {state.mothership.active ? 'Manage Mothership' : 'Dock Partner Ship'}
              </button>
            </div>

            {/* Airlock Upgrades (Whipple Shield Enhancements, Rotary Cargo & Launch Bays) */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-400" /> Airlock & Hull Upgrades
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  XP: {state.spendXp} • Scrap: {state.scrap}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {UPGRADES_BY_ROOM.airlock.map((mId) => (
                  <UpgradeCard key={mId} moduleId={mId} state={state} dispatch={dispatch} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. ENGINEERING & CARGO */}
        {room === 'engineering' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Scrap to Plasma Synthesizer */}
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-orange-300" />
                  <div>
                    <div className="text-xs text-slate-400">Scrap Cargo: {state.scrap}</div>
                    <div className="text-sm font-extrabold text-white">Convert Scrap → Plasma</div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={state.scrap < convertScrapCost(state) || state.plasma >= state.maxPlasma}
                  onClick={() => dispatch({ type: 'CONVERT' })}
                  className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-orange-400 hover:bg-orange-300 disabled:opacity-40 text-slate-950"
                >
                  {convertScrapCost(state)} Scrap → +{convertPlasmaGain()} Plasma
                </button>
              </div>

              {/* Spendable XP to Plasma Quick Refill */}
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Fuel className="w-6 h-6 text-cyan-300" />
                  <div>
                    <div className="text-xs text-slate-400">
                      Plasma: {state.plasma}/{state.maxPlasma}
                    </div>
                    <div className="text-sm font-extrabold text-white">XP Rapid Recharge</div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={state.spendXp < 15 || state.plasma >= state.maxPlasma}
                  onClick={() => dispatch({ type: 'REFILL_PLASMA_XP' })}
                  className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 flex items-center gap-1"
                >
                  <Coins className="w-3.5 h-3.5" /> 15 XP → +60 Plasma
                </button>
              </div>
            </div>

            {/* Engine Thrust Toggle */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">
                  Engine Thrust Mode (Dodge: {evasion(state)}%)
                </div>
                <div className="text-xs text-slate-400">
                  High Evasion adds +15% dodge (−2 Plasma/turn). Plasma Saver maximizes net Plasma gain.
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'ENGINE_MODE', mode: 'saver' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    state.engineMode === 'saver'
                      ? 'bg-orange-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Plasma Saver
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'ENGINE_MODE', mode: 'evasion' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    state.engineMode === 'evasion'
                      ? 'bg-orange-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  High Evasion
                </button>
              </div>
            </div>

            {/* Engineering & Propulsion Upgrades (All 7 modules) */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-orange-400" /> Engineering & Propulsion Upgrades
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  XP: {state.spendXp} • Scrap: {state.scrap}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {UPGRADES_BY_ROOM.engineering.map((mId) => (
                  <UpgradeCard key={mId} moduleId={mId} state={state} dispatch={dispatch} />
                ))}
              </div>
            </div>

            {/* Embedded Plasma Power Allocation Panel */}
            <PlasmaAllocationPanel state={state} dispatch={dispatch} />
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
