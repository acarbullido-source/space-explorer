import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Coins,
  Compass,
  Crosshair,
  Flame,
  Globe,
  LayoutGrid,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Shield,
  ShoppingBag,
  SkipForward,
  Star,
  Swords,
  UserCheck,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { CombatFxLayer } from './components/CombatFxLayer';
import { ConsoleModal } from './components/ConsoleModal';
import { CoopDockingModal } from './components/CoopDockingModal';
import { EnemyShipView } from './components/EnemyShipView';
import { EquippedWeaponsHUD } from './components/EquippedWeaponsHUD';
import { GarageShopModal } from './components/GarageShopModal';
import { PlasmaAllocationPanel } from './components/PlasmaAllocationPanel';
import { SectorMapModal } from './components/SectorMapModal';
import { ShipView } from './components/ShipView';
import { SpaceViewportObjects } from './components/SpaceViewportObjects';
import { StarfieldCanvas } from './components/StarfieldCanvas';
import { StoryEventModal } from './components/StoryEventModal';
import { BIOMES } from './game/biomes';
import {
  DIRS,
  add,
  buildWalk,
  canStep,
  clampRoom,
  computeDock,
  consoleCell,
  findPath,
  key,
  occupancy,
  rotateRoom,
  same,
  snapAirlock,
  validateLayout,
} from '../src/game/layout';
import { DEFAULT_LAYOUT, ROOMS, ROOM_ORDER } from './game/rooms';
import {
  CREW_BASE_SPEED,
  TURN_MS,
  canEditLayout,
  convertScrapCost,
  getRank,
  getReputationBadge,
  hostileActive,
  initialState,
  mannedRoom,
  netPlasmaPerTurn,
  reducer,
  shieldMax,
} from './game/state';
import type { Cell, Dir, Layout, RoomId } from './game/types';

export const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, 20261105, initialState);
  const [openModal, setOpenModal] = useState<RoomId | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [coopOpen, setCoopOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draftLayout, setDraftLayout] = useState<Layout>(() => state.layout.map((p) => ({ ...p })));
  const [selectedRoom, setSelectedRoom] = useState<RoomId | null>('bridge');

  // Smooth crew tile-to-tile position & active walking path
  const [crewPos, setCrewPos] = useState<{ x: number; y: number }>(() => ({
    x: state.crew.cell.x,
    y: state.crew.cell.y,
  }));
  const [crewFacing, setCrewFacing] = useState<number>(0); // 0:E, 1:S, 2:W, 3:N
  const [path, setPath] = useState<Cell[]>([]);
  const pendingModalRoom = useRef<RoomId | null>(null);

  const inCombat = hostileActive(state);
  const dock = useMemo(
    () =>
      state.docked || (state.mothership.active && state.mothership.partner)
        ? computeDock(state.layout)
        : null,
    [state.docked, state.mothership.active, state.mothership.partner, state.layout],
  );
  const walk = useMemo(() => buildWalk(state.layout, dock), [state.layout, dock]);
  const manned = useMemo(() => mannedRoom(state), [state]);
  const validation = useMemo(() => validateLayout(draftLayout), [draftLayout]);

  // Keep crew sprite synced if layout resets or saves
  useEffect(() => {
    if (path.length === 0) {
      setCrewPos({ x: state.crew.cell.x, y: state.crew.cell.y });
    }
  }, [state.crew.cell, path.length]);

  // Real-time Turn Ticker when not paused or in Edit Mode or Combat
  useEffect(() => {
    if (state.paused || editMode || state.gameOver || inCombat) return;
    const id = window.setInterval(() => {
      dispatch({ type: 'TICK' });
    }, TURN_MS);
    return () => window.clearInterval(id);
  }, [state.paused, editMode, state.gameOver, inCombat]);

  // Smooth Crew Walking Animation Loop
  const stateRef = useRef(state);
  stateRef.current = state;
  const pathRef = useRef(path);
  pathRef.current = path;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const curPath = pathRef.current;
      if (curPath.length > 0) {
        const target = curPath[0];
        const speed =
          CREW_BASE_SPEED * (stateRef.current.crew.restBuff > 0 ? 1.15 : 1);
        setCrewPos((pos) => {
          const dx = target.x - pos.x;
          const dy = target.y - pos.y;
          const dist = Math.hypot(dx, dy);
          if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
            if (Math.abs(dx) >= Math.abs(dy)) setCrewFacing(dx > 0 ? 0 : 2);
            else setCrewFacing(dy > 0 ? 1 : 3);
          }
          const move = speed * dt;
          if (dist <= move) {
            dispatch({ type: 'CREW_CELL', cell: target });
            const rest = curPath.slice(1);
            setPath(rest);
            if (rest.length === 0 && pendingModalRoom.current) {
              setOpenModal(pendingModalRoom.current);
              pendingModalRoom.current = null;
            }
            return { x: target.x, y: target.y };
          }
          return {
            x: pos.x + (dx / dist) * move,
            y: pos.y + (dy / dist) * move,
          };
        });
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const walkTo = useCallback(
    (dest: Cell, openRoomWhenDone: RoomId | null = null) => {
      if (editMode) return;
      const p = findPath(walk, state.crew.cell, dest);
      if (!p) return;
      pendingModalRoom.current = openRoomWhenDone;
      if (p.length === 0 && openRoomWhenDone) {
        setOpenModal(openRoomWhenDone);
        pendingModalRoom.current = null;
      } else {
        setPath(p);
      }
    },
    [editMode, walk, state.crew.cell],
  );

  const handleConsoleClick = useCallback(
    (roomId: RoomId, cell: Cell) => {
      if (editMode) return;
      if (same(state.crew.cell, cell)) {
        setOpenModal(roomId);
      } else {
        walkTo(cell, roomId);
        setOpenModal(roomId);
      }
    },
    [editMode, state.crew.cell, walkTo],
  );

  // Global Keyboard Controls: WASD, E, M (Sector Map), Spacebar (Execute Turn / Pause), Esc
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        if (shopOpen) {
          setShopOpen(false);
          return;
        }
        if (coopOpen) {
          setCoopOpen(false);
          return;
        }
        if (mapOpen) {
          setMapOpen(false);
          return;
        }
        if (openModal) {
          setOpenModal(null);
          return;
        }
        if (editMode) {
          setEditMode(false);
          return;
        }
      }

      if (e.code === 'KeyM' && !editMode) {
        e.preventDefault();
        setOpenModal(null);
        setShopOpen(false);
        setCoopOpen(false);
        setMapOpen((v) => !v);
        return;
      }

      if (e.code === 'Space' && !openModal && !mapOpen && !shopOpen && !coopOpen && !editMode) {
        e.preventDefault();
        if (inCombat) {
          dispatch({ type: 'EXECUTE_COMBAT_TURN' });
        } else {
          dispatch({ type: 'PAUSE' });
        }
        return;
      }

      if (editMode && selectedRoom) {
        const dirMap: Record<string, Dir> = {
          ArrowUp: 'N',
          ArrowRight: 'E',
          ArrowDown: 'S',
          ArrowLeft: 'W',
          KeyW: 'N',
          KeyD: 'E',
          KeyS: 'S',
          KeyA: 'W',
        };
        const d = dirMap[e.code];
        if (d) {
          e.preventDefault();
          const delta = DIRS[d];
          setDraftLayout((prev) => {
            let next = prev.map((r) =>
              r.id === selectedRoom ? clampRoom({ ...r, x: r.x + delta.x, y: r.y + delta.y }) : r,
            );
            if (selectedRoom === 'airlock') next = snapAirlock(next);
            return next;
          });
          return;
        }
        if (e.code === 'KeyR') {
          e.preventDefault();
          setDraftLayout((prev) => {
            let next = prev.map((r) => (r.id === selectedRoom ? rotateRoom(r) : r));
            if (selectedRoom === 'airlock') next = snapAirlock(next);
            return next;
          });
          return;
        }
      }

      if (openModal || mapOpen || shopOpen || coopOpen || editMode) return;

      const moveMap: Record<string, Dir> = {
        KeyW: 'N',
        KeyD: 'E',
        KeyS: 'S',
        KeyA: 'W',
      };
      const dir = moveMap[e.code];
      if (dir) {
        e.preventDefault();
        const origin =
          pathRef.current.length > 0 ? pathRef.current[pathRef.current.length - 1] : state.crew.cell;
        const next = add(origin, DIRS[dir]);
        if (canStep(walk, origin, next)) {
          pendingModalRoom.current = null;
          setPath((prev) => [...prev, next]);
        }
        return;
      }

      if (e.code === 'KeyE') {
        e.preventDefault();
        const occRoom = occupancy(state.layout).get(key(state.crew.cell));
        if (occRoom) {
          const p = state.layout.find((r) => r.id === occRoom)!;
          const cCell = consoleCell(p);
          if (!same(state.crew.cell, cCell)) {
            walkTo(cCell, occRoom);
          }
          setOpenModal(occRoom);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openModal, mapOpen, editMode, selectedRoom, state.crew.cell, state.layout, walk, walkTo, inCombat]);

  const enterEditMode = () => {
    setOpenModal(null);
    setMapOpen(false);
    setPath([]);
    setDraftLayout(state.layout.map((p) => ({ ...p })));
    setEditMode(true);
  };

  const saveEditLayout = () => {
    if (!validation.valid) return;
    dispatch({ type: 'SAVE_LAYOUT', layout: draftLayout });
    setEditMode(false);
  };

  // Derived HUD metrics
  const hullPct = Math.round((state.hull / Math.max(1, state.maxHull)) * 100);
  const hullSegments = 10;
  const filledHullSegments = Math.ceil((hullPct / 100) * hullSegments);
  const hullColor =
    hullPct > 60 ? 'bg-emerald-400' : hullPct > 30 ? 'bg-amber-400' : 'bg-red-500';

  const netPlasma = netPlasmaPerTurn(state);
  const plasmaPct = Math.round((state.plasma / Math.max(1, state.maxPlasma)) * 100);
  const rankInfo = getRank(state.rankXp);
  const repBadge = getReputationBadge(state.reputation);
  const repSliderPct = Math.round(((state.reputation + 100) / 200) * 100);
  const currentRoom = occupancy(state.layout).get(key(state.crew.cell)) ?? null;

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col justify-between text-slate-100 select-none">
      {/* Animated Parallax Starfield + 5 Biome Backgrounds */}
      <StarfieldCanvas
        sector={state.sector}
        nodeKind={state.encounter.kind}
        jumpFx={state.fx.jump}
        paused={state.paused || editMode}
        junkCount={state.encounter.junk}
        biome={state.biome}
        flareWarning={state.flareWarning}
      />

      {/* Combat Visual Effects Layer & Non-Destructive Auto-Cloak Banner */}
      <CombatFxLayer
        projectiles={state.projectiles}
        floatingDamages={state.floatingDamages}
        autoCloak={state.autoCloak}
        onDismissAutoCloak={() => dispatch({ type: 'DISMISS_AUTO_CLOAK' })}
      />

      {/* =================================================================== */}
      {/* 1. TOP HUD BAR (5 ICON-DRIVEN VISUAL WIDGETS + ACTION CONTROLS)     */}
      {/* =================================================================== */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-950/90 border-b border-slate-800/90 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          {/* WIDGET 1: Hull Integrity (Segmented green/yellow/red armor bar 0-100%) */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <Wrench className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase text-slate-400">
                <span>Hull Integrity</span>
                <span className="font-mono text-white">{hullPct}%</span>
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                {Array.from({ length: hullSegments }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-2.5 h-2 rounded-[2px] transition-all ${
                      i < filledHullSegments ? hullColor : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* WIDGET 2: Magnetic Shields (Blue bubble pips that recharge each turn) */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <Shield className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase text-slate-400">
                <span>Shields</span>
                <span className="font-mono text-sky-300">
                  {state.shieldLayers}/{shieldMax(state)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: Math.max(2, shieldMax(state)) }).map((_, i) => {
                  const active = i < state.shieldLayers;
                  return (
                    <span
                      key={i}
                      className={`w-4 h-2.5 rounded-full border transition-all ${
                        active
                          ? 'bg-sky-400 border-sky-200 shadow-[0_0_8px_#38bdf8]'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* WIDGET 3: Plasma Reserve (The Universal Resource + net/turn indicator) */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.12)]">
            <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-[165px]">
              <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
                <span className="uppercase text-cyan-300">Plasma Reserve</span>
                <span className="font-mono text-white">
                  {state.plasma} / {state.maxPlasma}{' '}
                  <span className={netPlasma >= 0 ? 'text-emerald-300' : 'text-amber-300'}>
                    ({netPlasma >= 0 ? `+${netPlasma}` : netPlasma}/turn)
                  </span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-sky-300 shadow-[0_0_10px_#22d3ee] transition-all"
                  style={{ width: `${plasmaPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* WIDGET 4: Scrap Cargo (Wrench icon + quick convert into Plasma) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Scrap Cargo</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-extrabold font-mono text-amber-300">{state.scrap}</span>
                <button
                  type="button"
                  disabled={state.scrap < convertScrapCost(state) || state.plasma >= state.maxPlasma}
                  onClick={() => dispatch({ type: 'CONVERT' })}
                  title={`Convert ${convertScrapCost(state)} Scrap into +30 Plasma`}
                  className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-400/20 hover:bg-amber-400/35 disabled:opacity-35 text-amber-200 border border-amber-400/50"
                >
                  +Plasma
                </button>
              </div>
            </div>
          </div>

          {/* WIDGET 5: Dual-XP (Rank XP + Spendable XP) & Sector Reputation Slider */}
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
            {/* Rank XP (Lifetime) */}
            <div title={`Narrative Rank Perk: ${rankInfo.current.perk}`}>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <Star className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-white">{rankInfo.current.title}</span>
                <span className="font-mono text-slate-400">({state.rankXp} XP)</span>
              </div>
              <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${Math.round(rankInfo.progress * 100)}%` }}
                />
              </div>
            </div>

            {/* Spendable XP (Currency) */}
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40"
              title="Spendable XP — buy upgrades, trade, or refill Plasma"
            >
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              <div className="leading-none">
                <div className="text-[9px] uppercase font-bold text-amber-200">Spend XP</div>
                <div className="text-xs font-extrabold font-mono text-white">{state.spendXp}</div>
              </div>
            </div>

            {/* System Reputation Meter (-100 Outlaw to +100 Trusted Ally) */}
            <div className="min-w-[125px]" title="Sector Reputation (−100 Outlaw to +100 Trusted Ally)">
              <div className="flex items-center justify-between gap-1.5 text-[10px]">
                <span className={`px-1.5 py-0.2 rounded border font-extrabold ${repBadge.bg} ${repBadge.color}`}>
                  {repBadge.label}
                </span>
                <span className="font-mono text-slate-300">
                  {state.reputation > 0 ? `+${state.reputation}` : state.reputation}
                </span>
              </div>
              <div className="relative w-full h-1.5 rounded-full bg-gradient-to-r from-red-500 via-slate-500 to-emerald-400 mt-1">
                <span
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-950 shadow"
                  style={{ left: `${repSliderPct}%` }}
                />
              </div>
            </div>

            {/* WIDGET 6: Solar System Biome & 1 Plain-Language System Rule */}
            {(() => {
              const bDef = BIOMES[state.biome ?? 'shattered_cradle'];
              return (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border transition"
                  style={{ borderColor: `${bDef.primaryColor}50` }}
                  title={`${bDef.name} (${bDef.subtitle}): ${bDef.rule}`}
                >
                  <div
                    className="p-1 rounded-lg border bg-slate-950/80 shrink-0"
                    style={{ borderColor: `${bDef.primaryColor}80` }}
                  >
                    {state.biome === 'helios_forge' ? (
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                    ) : (
                      <Globe className="w-3.5 h-3.5" style={{ color: bDef.primaryColor }} />
                    )}
                  </div>
                  <div className="leading-tight">
                    <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-400">
                      <span style={{ color: bDef.primaryColor }}>{bDef.name}</span>
                      {state.flareWarning && (
                        <span className="px-1.5 py-0.2 rounded font-black bg-red-500 text-white animate-pulse">
                          FLARE WARNING
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-white max-w-[210px] truncate">
                      {bDef.rule.split(':')[0]}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right: Sector Map, Co-Op Docking, 16 Upgrades, Edit Ship Layout, Pause & Turn */}
        <div className="flex items-center gap-1.5">
          {/* Co-Op Mothership Mode Button */}
          <button
            type="button"
            onClick={() => setCoopOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition ${
              state.mothership.active
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.35)]'
                : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-200'
            }`}
            title="Co-Op Ship Docking: Merge fleet, pool Plasma reserves, share shields & walk between decks"
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            {state.mothership.active ? (
              <span>Mothership ({state.plasma}P)</span>
            ) : (
              <span>Co-Op Dock</span>
            )}
          </button>

          {/* 16 Upgrades & Satellite Trade Hub Button */}
          <button
            type="button"
            onClick={() => setShopOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/60 transition"
            title="16 Multi-Level Ship Upgrades & Satellite Shop Goods"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
            Upgrades (16)
          </button>

          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 transition"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-300" />
            Sector Map (M)
          </button>

          {canEditLayout(state) && !editMode && (
            <button
              type="button"
              onClick={enterEditMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.4)] transition"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Edit Ship Layout
            </button>
          )}

          {!inCombat && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'PAUSE' })}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                state.paused
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
              }`}
            >
              {state.paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {state.paused ? 'PAUSED' : 'LIVE'}
            </button>
          )}

          {!inCombat && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'TICK' })}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700"
              title="Advance 1 Turn"
            >
              <SkipForward className="w-3.5 h-3.5 text-cyan-400" />
              T{state.turn}
            </button>
          )}

          {inCombat && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-red-500/20 text-red-300 border border-red-500/50 animate-pulse">
              <Swords className="w-3.5 h-3.5 text-red-400" />
              TACTICAL COMBAT
            </span>
          )}
        </div>
      </header>

      {/* =================================================================== */}
      {/* 2. MAIN CUTAWAY VIEWPORT (SPLIT IN COMBAT)                          */}
      {/* =================================================================== */}
      <main className="relative z-10 flex-1 flex items-center justify-center overflow-hidden px-4">
        {/* Drifting Clickable Space Objects (When not in combat) */}
        {!inCombat && (
          <SpaceViewportObjects
            state={state}
            editMode={editMode}
            dispatch={dispatch}
            onOpenRoomModal={(room) => setOpenModal(room)}
          />
        )}

        {/* Normal Freeflight Single Ship View */}
        {!inCombat && (
          <ShipView
            state={state}
            crewPos={crewPos}
            crewFacing={crewFacing}
            path={path}
            editMode={editMode}
            draftLayout={draftLayout}
            selectedRoom={selectedRoom}
            onSelectRoom={setSelectedRoom}
            onChangeDraft={setDraftLayout}
            onTileClick={(cell) => walkTo(cell, null)}
            onConsoleClick={handleConsoleClick}
            onRightClick={() => {
              setPath([]);
              pendingModalRoom.current = null;
              dispatch({ type: 'TARGET', target: null });
            }}
          />
        )}

        {/* FTL SPLIT VIEWPORT DURING COMBAT */}
        {inCombat && state.encounter.enemy && (
          <div className="w-full h-full flex flex-col lg:flex-row items-center justify-between gap-4 max-w-[1240px] px-2 py-1">
            {/* Left: Player Ship Cutaway */}
            <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative">
              <div className="absolute top-1 left-2 text-[10px] font-extrabold uppercase tracking-wider text-cyan-300 bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                Your Vessel (WASD / Click to Man Systems)
              </div>
              <ShipView
                state={state}
                crewPos={crewPos}
                crewFacing={crewFacing}
                path={path}
                editMode={false}
                draftLayout={draftLayout}
                selectedRoom={selectedRoom}
                onSelectRoom={setSelectedRoom}
                onChangeDraft={setDraftLayout}
                onTileClick={(cell) => walkTo(cell, null)}
                onConsoleClick={handleConsoleClick}
                onRightClick={() => {
                  setPath([]);
                  pendingModalRoom.current = null;
                  dispatch({ type: 'TARGET', target: null });
                }}
              />
            </div>

            {/* Center: Tactical Divider */}
            <div className="hidden lg:flex flex-col items-center justify-center px-1">
              <div className="p-2 rounded-full bg-red-500/20 border border-red-500/40 text-red-400">
                <Crosshair className="w-5 h-5 animate-spin" />
              </div>
              <div className="h-32 w-px bg-gradient-to-b from-transparent via-red-500/60 to-transparent my-2" />
              <span className="text-[10px] font-black uppercase tracking-wider text-red-400 [writing-mode:vertical-lr] rotate-180">
                TARGET LOCKED
              </span>
            </div>

            {/* Right: Enemy Ship Cutaway & Targetable Rooms */}
            <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative">
              <EnemyShipView
                enemy={state.encounter.enemy}
                equippedWeapons={state.equippedWeapons}
                selectedWeaponSlot={state.selectedWeaponSlot}
                targetRoomId={state.equippedWeapons[state.selectedWeaponSlot ?? 0]?.targetRoomId ?? null}
                onTargetRoom={(roomId) => {
                  const slotIdx = state.selectedWeaponSlot ?? 0;
                  dispatch({
                    type: 'SET_WEAPON_TARGET',
                    slotIndex: slotIdx,
                    targetRoomId: roomId,
                  });
                }}
              />
            </div>
          </div>
        )}

        {/* ORBITAL GARAGE EDIT SHIP LAYOUT FLOATING TOOLBAR */}
        {editMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-950/95 border border-cyan-400/60 shadow-[0_15px_45px_rgba(0,0,0,0.85)] backdrop-blur-md">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                Orbital Garage — Drag Rooms to Rearrange
              </span>
            </div>

            {validation.valid ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/50">
                <Check className="w-3.5 h-3.5" /> Connected & Airlock Clear
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-400/50">
                <AlertTriangle className="w-3.5 h-3.5" />
                {validation.overlaps.size > 0
                  ? 'Rooms overlapping!'
                  : validation.disconnected.size > 0
                    ? 'All rooms must connect by doors!'
                    : 'Airlock hatch must face open outer hull!'}
              </span>
            )}

            <div className="flex items-center gap-1.5">
              {selectedRoom && (
                <button
                  type="button"
                  onClick={() =>
                    setDraftLayout((prev) => {
                      let next = prev.map((r) => (r.id === selectedRoom ? rotateRoom(r) : r));
                      if (selectedRoom === 'airlock') next = snapAirlock(next);
                      return next;
                    })
                  }
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-slate-700"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Rotate (R)
                </button>
              )}
              <button
                type="button"
                onClick={() => setDraftLayout(DEFAULT_LAYOUT.map((p) => ({ ...p })))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                type="button"
                disabled={!validation.valid}
                onClick={saveEditLayout}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-slate-950"
              >
                <Check className="w-3.5 h-3.5" /> Save Layout
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* 3. BOTTOM HUD: UNIFIED PLASMA PANEL + CONTROL LEGEND + COMBAT/DOCK  */}
      {/* =================================================================== */}
      <footer className="relative z-20 flex flex-wrap items-end justify-between gap-2.5 px-3.5 pb-2.5 pt-1 pointer-events-none">
        {/* BOTTOM-LEFT: Unified Plasma Allocation Panel + Compact Control Legend */}
        <div className="pointer-events-auto flex flex-wrap items-end gap-2">
          <PlasmaAllocationPanel state={state} dispatch={dispatch} compact />

          <div className="rounded-2xl bg-slate-950/90 border border-slate-800/90 px-3 py-2 shadow-xl backdrop-blur-md space-y-0.5 text-[10px]">
            <div className="font-extrabold uppercase tracking-wider text-cyan-300 mb-0.5">
              Controls
            </div>
            <div className="text-slate-300">
              <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 font-mono text-white">
                WASD
              </kbd>{' '}
              / Click Tile: Move crew
            </div>
            {inCombat ? (
              <>
                <div className="text-slate-300">
                  <span className="text-red-300 font-bold">Click Enemy Room:</span> Lock target
                </div>
                <div className="text-slate-300">
                  <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 font-mono text-white">
                    Space
                  </kbd>{' '}
                  <strong className="text-amber-300">Execute Turn</strong>
                </div>
              </>
            ) : (
              <>
                <div className="text-slate-300">
                  <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 font-mono text-white">
                    E
                  </kbd>{' '}
                  / Click Console: Room modal
                </div>
                <div className="text-slate-300">
                  <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 font-mono text-white">
                    M
                  </kbd>{' '}
                  Sector Map •{' '}
                  <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 font-mono text-white">
                    Space
                  </kbd>{' '}
                  Pause
                </div>
              </>
            )}
            <div className="text-slate-300">
              <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 font-mono text-white">
                Esc
              </kbd>{' '}
              Close modal
            </div>
          </div>
        </div>

        {/* BOTTOM-CENTER: EQUIPPED WEAPON CARDS HUD IN COMBAT */}
        {inCombat && (
          <div className="pointer-events-auto flex justify-center flex-1 max-w-xl mx-auto">
            <EquippedWeaponsHUD
              equippedWeapons={state.equippedWeapons}
              selectedSlot={state.selectedWeaponSlot}
              onSelectSlot={(idx) => dispatch({ type: 'SELECT_WEAPON_SLOT', index: idx })}
              onExecuteTurn={() => dispatch({ type: 'EXECUTE_COMBAT_TURN' })}
              onAutoCloakRetreat={() => dispatch({ type: 'EMERGENCY_AUTO_CLOAK' })}
              plasma={state.plasma}
              inCombat={inCombat}
              enemyPresent={!!state.encounter.enemy}
            />
          </div>
        )}

        {/* BOTTOM-RIGHT: 6 Ship Rooms Dock + Event Log Ticker (Outside Combat) */}
        {!inCombat && (
          <div className="pointer-events-auto flex flex-col items-end gap-1.5">
            {state.log.length > 0 && (
              <div className="px-3 py-1 rounded-full bg-slate-950/90 border border-slate-800 text-[11px] text-cyan-200 shadow-lg">
                {state.log[state.log.length - 1].text}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-1.5 bg-slate-950/90 border border-slate-800/90 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
              {ROOM_ORDER.map((id) => {
                const def = ROOMS[id];
                const Icon = def.icon;
                const isManned = manned === id;
                const isHere = currentRoom === id;
                const hp = state.roomHp[id];
                const p = state.layout.find((r) => r.id === id)!;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleConsoleClick(id, consoleCell(p))}
                    title={def.label}
                    className={`group relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition ${
                      isManned
                        ? 'bg-emerald-950/50 border-emerald-400/70'
                        : isHere
                          ? 'bg-slate-900 border-cyan-400/60'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color: def.theme.accent }} />
                    <div className="text-left">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-white">{def.name}</span>
                        {isManned && (
                          <span className="inline-flex items-center px-1 rounded text-[9px] font-extrabold bg-emerald-500/25 text-emerald-300">
                            <UserCheck className="w-2.5 h-2.5 mr-0.5" />
                            +25%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: def.maxHp }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-2 h-1 rounded-sm ${
                              i < hp ? 'bg-emerald-400' : 'bg-red-500/50'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </footer>

      {/* ROOM COMMAND CONSOLE MODAL */}
      <ConsoleModal
        room={openModal}
        state={state}
        dispatch={dispatch}
        onClose={() => setOpenModal(null)}
        onMoveToConsole={(roomId) => {
          const p = state.layout.find((r) => r.id === roomId);
          if (p) walkTo(consoleCell(p), roomId);
        }}
        onOpenSectorMap={() => setMapOpen(true)}
        onOpenCoopDocking={() => setCoopOpen(true)}
      />

      {/* STANDALONE SECTOR MAP MODAL (M KEY OR BUTTON) */}
      <SectorMapModal
        open={mapOpen}
        state={state}
        dispatch={dispatch}
        onClose={() => setMapOpen(false)}
      />

      {/* 16 UPGRADES & SATELLITE SHOP MODAL */}
      <GarageShopModal
        open={shopOpen}
        state={state}
        dispatch={dispatch}
        onClose={() => setShopOpen(false)}
        onOpenRearrange={() => {
          if (canEditLayout(state)) enterEditMode();
        }}
      />

      {/* CO-OP MOTHERSHIP DOCKING MODAL */}
      <CoopDockingModal
        open={coopOpen}
        state={state}
        dispatch={dispatch}
        onClose={() => setCoopOpen(false)}
      />

      {/* FTL-STYLE "BLUE OPTION" STORY EVENT MODAL */}
      <StoryEventModal state={state} dispatch={dispatch} />
    </div>
  );
};
export default App;
