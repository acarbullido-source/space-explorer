import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
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
import { MobileControls } from './components/MobileControls';
import { PlasmaAllocationPanel } from './components/PlasmaAllocationPanel';
import { SectorMapModal } from './components/SectorMapModal';
import { ShipView } from './components/ShipView';
import { SpaceViewportObjects } from './components/SpaceViewportObjects';
import { StarfieldCanvas } from './components/StarfieldCanvas';
import { StoryEventModal } from './components/StoryEventModal';
import { BIOMES } from './game/biomes';
import {
  MothershipRealtimeSession,
  type CombatExecuteTurnBroadcast,
  type ShipSystemUpdateBroadcast,
} from './game/coop';
import {
  DIRS,
  add,
  buildWalk,
  canStep,
  clampRoom,
  computeDock,
  computeMothershipDock,
  consoleCell,
  findPath,
  key,
  occupancy,
  rotateRoom,
  same,
  snapAirlock,
  validateLayout,
} from './game/layout';
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
  isRoomManned,
  mannedRoom,
  netPlasmaPerTurn,
  reducer,
  shieldMax,
  type Action,
} from './game/state';
import type { Cell, Dir, GameState, Layout, PlacedRoom, RoomId } from './game/types';
import {
  getOrCreateClientId,
  getSavedShipName,
  getSupabaseConfig,
} from './lib/supabase';

const SHARED_SYSTEM_ACTIONS = new Set<Action['type']>([
  'SET_POWER',
  'CONVERT',
  'REFILL_PLASMA_XP',
  'ENGINE_MODE',
  'HEALING',
  'HAIL',
  'TRADE',
  'HELP',
  'EVA',
  'RESEARCH',
  'ANALYZE',
  'MINE_OBJECT',
  'POD_ACTION',
  'COLLECT_ARTIFACT',
  'LASER_RECHARGE',
  'ENGAGE_VESSEL',
  'UPGRADE_MODULE',
  'REPAIR_ROOM',
  'SIGN_TREATY',
  'SWAP_WEAPON',
  'JUMP',
  'NEXT_SECTOR',
  'EMERGENCY_AUTO_CLOAK',
  'DISMISS_AUTO_CLOAK',
  'TRIGGER_STORY_EVENT',
  'CHOOSE_STORY_OPTION',
  'CLOSE_STORY_EVENT',
  'CLAIM_ARK_ARTIFACT',
  'SET_BIOME',
  'PAUSE',
  'TICK',
]);

export const App: React.FC = () => {
  const clientId = useMemo(() => getOrCreateClientId(), []);
  const [state, dispatch] = useReducer(reducer, 20261105, initialState);
  const [openModal, setOpenModal] = useState<RoomId | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [coopOpen, setCoopOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draftLayout, setDraftLayout] = useState<Layout>(() => state.layout.map((p) => ({ ...p })));
  const [selectedRoom, setSelectedRoom] = useState<RoomId | null>('bridge');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCombatView, setMobileCombatView] = useState<'player' | 'enemy'>('enemy');

  // Smooth crew tile-to-tile position & active walking path
  const [crewPos, setCrewPos] = useState<{ x: number; y: number }>(() => ({
    x: state.crew.cell.x,
    y: state.crew.cell.y,
  }));
  const [crewFacing, setCrewFacing] = useState<number>(0); // 0:E, 1:S, 2:W, 3:N
  const [path, setPath] = useState<Cell[]>([]);
  const pendingModalRoom = useRef<RoomId | null>(null);

  // Realtime Multiplayer Session & Sync Refs
  const sessionRef = useRef<MothershipRealtimeSession | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pathRef = useRef(path);
  pathRef.current = path;
  const crewPosRef = useRef(crewPos);
  crewPosRef.current = crewPos;
  const crewFacingRef = useRef(crewFacing);
  crewFacingRef.current = crewFacing;
  const pendingBroadcastRef = useRef<{
    kind: 'system' | 'target_lock' | 'combat_turn';
    reason?: string;
  } | null>(null);
  const lastCrewBroadcastAtRef = useRef<number>(0);
  const lastBroadcastCellKeyRef = useRef<string>('');

  const inCombat = hostileActive(state);
  const isNetworkCoop =
    state.mothership.active &&
    state.mothership.mode === 'network_code' &&
    !!state.mothership.partner &&
    !state.mothership.partner.isAiWingman;

  const dock = useMemo(
    () => (state.docked ? computeDock(state.layout) : null),
    [state.docked, state.layout],
  );
  const mothershipDock = useMemo(
    () =>
      state.mothership.active && state.mothership.partner
        ? computeMothershipDock(state.layout, state.mothership.partner.layout)
        : null,
    [state.mothership.active, state.mothership.partner, state.layout],
  );
  const walk = useMemo(
    () => buildWalk(state.layout, dock, mothershipDock),
    [state.layout, dock, mothershipDock],
  );
  const validation = useMemo(() => validateLayout(draftLayout), [draftLayout]);

  const buildShipSystemUpdatePayload = useCallback(
    (s: GameState, reason: string): ShipSystemUpdateBroadcast => {
      const roomHpByClient: Record<string, Record<RoomId, number>> = {
        [clientId]: { ...s.roomHp },
      };
      if (s.mothership.partner && !s.mothership.partner.isAiWingman) {
        roomHpByClient[s.mothership.partner.id] = { ...s.mothership.partner.roomHp };
      }
      return {
        senderId: clientId,
        reason,
        power: { ...s.power },
        reactor: s.reactor,
        plasma: s.plasma,
        maxPlasma: s.maxPlasma,
        scrap: s.scrap,
        rankXp: s.rankXp,
        spendXp: s.spendXp,
        reputation: s.reputation,
        hull: s.hull,
        maxHull: s.maxHull,
        shieldLayers: s.shieldLayers,
        shieldCharge: s.shieldCharge,
        roomHpByClient,
        oxygen: s.oxygen,
        food: s.food,
        artifacts: s.artifacts,
        analyzing: s.analyzing,
        eva: s.eva,
        engineMode: s.engineMode,
        healing: s.healing,
        upgrades: { ...s.upgrades },
        moduleLevels: { ...s.moduleLevels },
        equippedWeapons: s.equippedWeapons.map((w) => ({ ...w })),
        sector: s.sector,
        current: s.current,
        nodes: s.nodes,
        encounter: s.encounter,
        biome: s.biome,
        faction: s.faction,
        flareWarning: s.flareWarning,
        arkCodex: { ...s.arkCodex },
        activeStoryEvent: s.activeStoryEvent,
        storyOutcome: s.storyOutcome,
        paused: s.paused,
        turn: s.turn,
        latestLog: s.log.length > 0 ? s.log[s.log.length - 1] : undefined,
      };
    },
    [clientId],
  );

  const buildCombatExecuteTurnPayload = useCallback(
    (s: GameState): CombatExecuteTurnBroadcast => {
      const roomHpByClient: Record<string, Record<RoomId, number>> = {
        [clientId]: { ...s.roomHp },
      };
      if (s.mothership.partner && !s.mothership.partner.isAiWingman) {
        roomHpByClient[s.mothership.partner.id] = { ...s.mothership.partner.roomHp };
      }
      return {
        senderId: clientId,
        turn: s.turn,
        plasma: s.plasma,
        maxPlasma: s.maxPlasma,
        scrap: s.scrap,
        rankXp: s.rankXp,
        spendXp: s.spendXp,
        reputation: s.reputation,
        hull: s.hull,
        maxHull: s.maxHull,
        shieldLayers: s.shieldLayers,
        shieldCharge: s.shieldCharge,
        roomHpByClient,
        equippedWeapons: s.equippedWeapons.map((w) => ({ ...w })),
        encounter: s.encounter,
        combatPhase: s.combatPhase,
        projectiles: s.projectiles,
        floatingDamages: s.floatingDamages,
        fx: { ...s.fx },
        autoCloak: s.autoCloak,
        log: s.log,
        logId: s.logId,
      };
    },
    [clientId],
  );

  /** Connect to `mothership-room-<4-digit-code>` via Supabase Realtime or Local BroadcastChannel */
  const connectToRoomCode = useCallback(
    (
      rawCode: string,
      transport: 'supabase' | 'broadcast_fallback',
      shipName: string,
    ) => {
      const code = rawCode.replace(/[^0-9]/g, '').padStart(4, '0').slice(0, 4);
      if (sessionRef.current) {
        sessionRef.current.destroy();
        sessionRef.current = null;
      }

      if (typeof window !== 'undefined') {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('dock', code);
        window.history.replaceState({}, '', nextUrl.toString());
      }

      dispatch({
        type: 'START_NETWORK_MOTHERSHIP',
        roomCode: code,
        transport,
      });

      const cur = stateRef.current;
      const soloMaxPlasma =
        200 + cur.upgrades.reactor * 40 + (cur.moduleLevels?.kilopower_reactor ?? 0) * 25;
      const soloPlasma = cur.mothership.active
        ? Math.min(soloMaxPlasma, Math.round(cur.plasma * 0.5))
        : cur.plasma;

      const session = new MothershipRealtimeSession({
        roomCode: code,
        clientId,
        transport,
        initialPresence: {
          clientId,
          shipName: shipName.trim() || 'ISS Horizon',
          joinedAt: Date.now(),
          layout: cur.layout,
          hull: cur.hull,
          maxHull: cur.maxHull,
          soloPlasma,
          soloMaxPlasma,
          shieldLayers: cur.shieldLayers,
          roomHp: { ...cur.roomHp },
          power: { ...cur.power },
          crewCell: cur.crew.cell,
          crewFacing: crewFacingRef.current,
        },
        callbacks: {
          onChannelStatus: (status, errorMessage) => {
            dispatch({ type: 'SET_MOTHERSHIP_STATUS', status, errorMessage });
          },
          onPresenceSync: ({ ships, partner, isPrimary }) => {
            const wasDockedWithPartner =
              stateRef.current.mothership.active &&
              stateRef.current.mothership.partner?.id === partner?.clientId;

            if (partner && !wasDockedWithPartner && isPrimary) {
              pendingBroadcastRef.current = {
                kind: 'system',
                reason: 'initial_dock_sync',
              };
            }

            dispatch({
              type: 'SYNC_PRESENCE_MOTHERSHIP',
              ships,
              partner,
              isPrimary,
            });

            if (partner && !wasDockedWithPartner) {
              // Broadcast exact initial crew sub-tile coordinates & Primary state snapshot
              window.setTimeout(() => {
                const liveSession = sessionRef.current;
                const liveState = stateRef.current;
                if (!liveSession || !liveState.mothership.active) return;

                liveSession.sendCrewMove({
                  senderId: clientId,
                  shipName: getSavedShipName(),
                  pos: { ...crewPosRef.current },
                  cell: liveState.crew.cell,
                  facing: crewFacingRef.current,
                  roomId: occupancy(liveState.layout).get(key(liveState.crew.cell)) ?? null,
                  mannedRoomId: mannedRoom(liveState),
                });

                if (liveState.mothership.primaryShip === 'player') {
                  liveSession.sendShipSystemUpdate(
                    buildShipSystemUpdatePayload(liveState, 'initial_dock_handshake'),
                  );
                }
              }, 220);
            }
          },
          onPartnerLeft: () => {
            setPath([]);
            pendingModalRoom.current = null;
            dispatch({ type: 'UNDOCK_MOTHERSHIP', reason: 'partner_left' });
          },
          onRemoteUndock: (payload) => {
            if (sessionRef.current) {
              sessionRef.current.destroy();
              sessionRef.current = null;
            }
            setPath([]);
            pendingModalRoom.current = null;
            dispatch({
              type: 'UNDOCK_MOTHERSHIP',
              reason: 'partner_left',
              sharedPlasmaSnapshot: payload.sharedPlasmaSnapshot,
            });
          },
          onCrewMove: (payload) => {
            const liveState = stateRef.current;
            const partnerLayout = liveState.mothership.partner?.layout;
            const mDock = partnerLayout
              ? computeMothershipDock(liveState.layout, partnerLayout)
              : null;
            const worldPos = mDock
              ? mDock.mapPartnerPointToWorld(payload.pos)
              : payload.pos;
            const worldCell = mDock
              ? mDock.mapPartnerCellToWorld(payload.cell)
              : payload.cell;
            const worldFacing = mDock
              ? (payload.facing + mDock.rotSteps) % 4
              : payload.facing;

            dispatch({
              type: 'PARTNER_CREW_MOVED',
              pos: worldPos,
              cell: worldCell,
              facing: worldFacing,
            });
          },
          onShipSystemUpdate: (payload) => {
            dispatch({
              type: 'APPLY_SHIP_SYSTEM_UPDATE',
              payload,
              myClientId: clientId,
            });
          },
          onCombatTargetLock: (payload) => {
            dispatch({
              type: 'APPLY_COMBAT_TARGET_LOCK',
              payload,
            });
          },
          onCombatExecuteTurn: (payload) => {
            dispatch({
              type: 'APPLY_COMBAT_EXECUTE_TURN',
              payload,
              myClientId: clientId,
            });
          },
        },
      });

      sessionRef.current = session;
    },
    [clientId, buildShipSystemUpdatePayload],
  );

  /** Cleanly undock from either Network Co-Op or Local AI Wingman */
  const handleRequestUndock = useCallback(() => {
    const cur = stateRef.current;
    if (sessionRef.current) {
      if (cur.mothership.active) {
        sessionRef.current.sendUndock({
          senderId: clientId,
          sharedPlasmaSnapshot: cur.plasma,
        });
      }
      sessionRef.current.destroy();
      sessionRef.current = null;
    }

    if (typeof window !== 'undefined') {
      const nextUrl = new URL(window.location.href);
      if (nextUrl.searchParams.has('dock')) {
        nextUrl.searchParams.delete('dock');
        window.history.replaceState({}, '', nextUrl.toString());
      }
    }

    setPath([]);
    pendingModalRoom.current = null;
    dispatch({ type: 'UNDOCK_MOTHERSHIP', reason: 'manual' });
  }, [clientId]);

  /** Tear down Realtime subscription on unmount */
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.destroy();
        sessionRef.current = null;
      }
    };
  }, []);

  /** Auto-join `?dock=XXXX` URL param or show one-time Supabase/Local Setup Modal if env vars aren't set */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const dockParam = params.get('dock');
    const supaCfg = getSupabaseConfig();

    if (dockParam && /^\d{4}$/.test(dockParam)) {
      if (supaCfg.isConfigured) {
        connectToRoomCode(dockParam, 'supabase', getSavedShipName());
        setCoopOpen(true);
      } else {
        setCoopOpen(true);
      }
      return;
    }

    if (!supaCfg.isConfigured) {
      const dismissed = window.sessionStorage.getItem('space_explorer_setup_dismissed');
      if (dismissed !== '1') {
        window.sessionStorage.setItem('space_explorer_setup_dismissed', '1');
        setCoopOpen(true);
      }
    }
  }, [connectToRoomCode]);

  /** Wrapped dispatch that queues Simultaneous Realtime Broadcast events on local actions */
  const playerDispatch = useCallback((action: Action) => {
    const cur = stateRef.current;
    const netCoop =
      cur.mothership.active &&
      cur.mothership.mode === 'network_code' &&
      !!cur.mothership.partner &&
      !cur.mothership.partner.isAiWingman;

    if (netCoop) {
      if (action.type === 'EXECUTE_COMBAT_TURN') {
        if (cur.mothership.primaryShip === 'player') {
          pendingBroadcastRef.current = { kind: 'combat_turn' };
          dispatch(action);
        } else {
          pendingBroadcastRef.current = { kind: 'target_lock' };
          dispatch({ type: 'SET_COMBAT_READY' });
        }
        return;
      }

      if (action.type === 'SET_WEAPON_TARGET' || action.type === 'SET_COMBAT_READY') {
        pendingBroadcastRef.current = { kind: 'target_lock' };
        dispatch(action);
        return;
      }

      if (SHARED_SYSTEM_ACTIONS.has(action.type)) {
        pendingBroadcastRef.current = { kind: 'system', reason: action.type };
        dispatch(action);
        return;
      }
    }

    dispatch(action);
  }, []);

  /** Effect A: Flush queued `SHIP_SYSTEM_UPDATE`, `COMBAT_TARGET_LOCK`, or `COMBAT_EXECUTE_TURN` */
  useEffect(() => {
    const pending = pendingBroadcastRef.current;
    if (!pending) return;
    pendingBroadcastRef.current = null;

    const session = sessionRef.current;
    if (!session || !isNetworkCoop) return;

    if (pending.kind === 'system') {
      session.sendShipSystemUpdate(
        buildShipSystemUpdatePayload(state, pending.reason ?? 'update'),
      );
    } else if (pending.kind === 'target_lock') {
      const myRole: 'primary' | 'wingman' =
        state.mothership.primaryShip === 'player' ? 'primary' : 'wingman';
      const focusRoomId =
        myRole === 'primary'
          ? state.mothership.primaryTargetRoomId
          : state.mothership.wingmanTargetRoomId;
      session.sendCombatTargetLock({
        senderId: clientId,
        senderRole: myRole,
        equippedWeapons: state.equippedWeapons,
        focusRoomId,
        ready: state.mothership.localCombatReady,
      });
    } else if (pending.kind === 'combat_turn') {
      session.sendCombatExecuteTurn(buildCombatExecuteTurnPayload(state));
    }
  }, [
    state,
    isNetworkCoop,
    clientId,
    buildShipSystemUpdatePayload,
    buildCombatExecuteTurnPayload,
  ]);

  /** Effect B: When BOTH players mark Ready in combat, Primary Control Ship resolves & broadcasts turn */
  useEffect(() => {
    if (
      isNetworkCoop &&
      inCombat &&
      state.mothership.primaryShip === 'player' &&
      state.mothership.localCombatReady &&
      state.mothership.partnerCombatReady
    ) {
      pendingBroadcastRef.current = { kind: 'combat_turn' };
      dispatch({ type: 'EXECUTE_COMBAT_TURN' });
    }
  }, [
    isNetworkCoop,
    inCombat,
    state.mothership.primaryShip,
    state.mothership.localCombatReady,
    state.mothership.partnerCombatReady,
  ]);

  /** Broadcast live `CREW_MOVE` updates (immediate on discrete tile/console step, ~45ms throttled sub-tile) */
  useEffect(() => {
    const session = sessionRef.current;
    if (!session || !isNetworkCoop) return;

    const now = performance.now();
    const cellKey = `${state.crew.cell.x},${state.crew.cell.y},${crewFacing}`;
    const discreteChanged = cellKey !== lastBroadcastCellKeyRef.current;

    if (!discreteChanged && now - lastCrewBroadcastAtRef.current < 45) {
      return;
    }

    lastCrewBroadcastAtRef.current = now;
    if (discreteChanged) {
      lastBroadcastCellKeyRef.current = cellKey;
      session.updateSelfPresence({
        crewCell: state.crew.cell,
        crewFacing,
      });
    }

    let currentRoomId: string | null =
      occupancy(state.layout).get(key(state.crew.cell)) ?? null;
    if (!currentRoomId && mothershipDock) {
      currentRoomId =
        occupancy(mothershipDock.partnerLayout).get(key(state.crew.cell)) ??
        (mothershipDock.collar.some((c) => same(c, state.crew.cell)) ? 'collar' : null);
    }

    session.sendCrewMove({
      senderId: clientId,
      shipName: getSavedShipName(),
      pos: { x: crewPos.x, y: crewPos.y },
      cell: state.crew.cell,
      facing: crewFacing,
      roomId: currentRoomId,
      mannedRoomId: mannedRoom(state),
    });
  }, [crewPos, state, crewFacing, isNetworkCoop, clientId, mothershipDock]);

  /** Clear combat projectiles & floating damage numbers cleanly after volley animation */
  useEffect(() => {
    if (state.projectiles.length === 0 && state.floatingDamages.length === 0) return;
    const timer = window.setTimeout(() => {
      dispatch({ type: 'CLEAR_COMBAT_FX' });
    }, 1150);
    return () => window.clearTimeout(timer);
  }, [state.projectiles, state.floatingDamages]);

  // Keep crew sprite synced if layout resets, undocks, or saves
  useEffect(() => {
    if (path.length === 0) {
      setCrewPos({ x: state.crew.cell.x, y: state.crew.cell.y });
    }
  }, [state.crew.cell, path.length]);

  // Real-time Turn Ticker when not paused or in Edit Mode or Combat
  // In Network Co-Op, Primary Control Ship drives the peaceful turn clock and syncs via SHIP_SYSTEM_UPDATE
  useEffect(() => {
    if (state.paused || editMode || state.gameOver || inCombat) return;
    if (isNetworkCoop && state.mothership.primaryShip !== 'player') return;
    const id = window.setInterval(() => {
      playerDispatch({ type: 'TICK' });
    }, TURN_MS);
    return () => window.clearInterval(id);
  }, [
    state.paused,
    editMode,
    state.gameOver,
    inCombat,
    isNetworkCoop,
    state.mothership.primaryShip,
    playerDispatch,
  ]);

  // Smooth Crew Walking Animation Loop
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

  const findRoomAtCell = useCallback(
    (cell: Cell): { roomId: RoomId; piece: PlacedRoom } | null => {
      const ownId = occupancy(state.layout).get(key(cell));
      if (ownId) {
        const piece = state.layout.find((r) => r.id === ownId)!;
        return { roomId: ownId, piece };
      }
      if (mothershipDock) {
        const partnerId = occupancy(mothershipDock.partnerLayout).get(key(cell));
        if (partnerId) {
          const piece = mothershipDock.partnerLayout.find((r) => r.id === partnerId)!;
          return { roomId: partnerId, piece };
        }
      }
      return null;
    },
    [state.layout, mothershipDock],
  );

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

  const handleMobileMoveDir = useCallback(
    (dir: Dir) => {
      if (editMode) return;
      const origin =
        pathRef.current.length > 0 ? pathRef.current[pathRef.current.length - 1] : state.crew.cell;
      const next = add(origin, DIRS[dir]);
      if (canStep(walk, origin, next)) {
        pendingModalRoom.current = null;
        setPath((prev) => [...prev, next]);
      }
    },
    [editMode, walk, state.crew.cell],
  );

  const handleMobileInteract = useCallback(() => {
    if (editMode) return;
    const hit = findRoomAtCell(state.crew.cell);
    if (hit) {
      const cCell = consoleCell(hit.piece);
      if (!same(state.crew.cell, cCell)) {
        walkTo(cCell, hit.roomId);
      }
      setOpenModal(hit.roomId);
    } else {
      setOpenModal('bridge');
    }
  }, [editMode, state.crew.cell, findRoomAtCell, walkTo]);

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
          playerDispatch({ type: 'EXECUTE_COMBAT_TURN' });
        } else {
          playerDispatch({ type: 'PAUSE' });
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
        const hit = findRoomAtCell(state.crew.cell);
        if (hit) {
          const cCell = consoleCell(hit.piece);
          if (!same(state.crew.cell, cCell)) {
            walkTo(cCell, hit.roomId);
          }
          setOpenModal(hit.roomId);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    openModal,
    mapOpen,
    shopOpen,
    coopOpen,
    editMode,
    selectedRoom,
    state.crew.cell,
    walk,
    walkTo,
    inCombat,
    findRoomAtCell,
    playerDispatch,
  ]);

  const canRearrange = canEditLayout(state) && !state.mothership.active;

  const enterEditMode = () => {
    if (state.mothership.active) return;
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
  const currentRoom = findRoomAtCell(state.crew.cell)?.roomId ?? null;

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden flex flex-col justify-between text-slate-100 select-none">
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
        onDismissAutoCloak={() => playerDispatch({ type: 'DISMISS_AUTO_CLOAK' })}
      />

      {/* =================================================================== */}
      {/* 1. TOP HUD BAR (RESPONSIVE: MOBILE COMPACT + DESKTOP FULL)          */}
      {/* =================================================================== */}
      <header className="relative z-20 bg-slate-950/95 border-b border-slate-800/90 backdrop-blur-md safe-top">
        {/* MOBILE COMPACT TOP ROW (md:hidden) */}
        <div className="flex md:hidden items-center justify-between gap-1.5 px-3 py-1.5">
          {/* Quick Core Indicators */}
          <div className="flex items-center gap-1.5">
            {/* Hull */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold">
              <Wrench className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className={hullPct <= 25 ? 'text-red-400 font-extrabold' : 'text-white'}>
                {hullPct}%
              </span>
            </div>

            {/* Shields */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold text-sky-300">
              <Shield className="w-3 h-3 text-sky-400 shrink-0" />
              <span>
                {state.shieldLayers}/{shieldMax(state)}
              </span>
            </div>

            {/* Plasma */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-300">
              <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>{state.plasma}P</span>
            </div>
          </div>

          {/* Action Quick Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
              aria-label="Sector Map"
              title="Sector Map (M)"
            >
              <Compass className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShopOpen(true)}
              className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/50"
              aria-label="16 Upgrades"
              title="16 Upgrades (Shop)"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCoopOpen(true)}
              className={`p-1.5 rounded-lg border ${
                state.mothership.active
                  ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/60'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/50'
              }`}
              aria-label="Co-Op Mothership"
              title="Co-Op Docking"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-200 border border-slate-700"
              aria-label="Toggle Stats Menu"
            >
              {mobileMenuOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* MOBILE COLLAPSIBLE DRAWER (md:hidden) */}
        {mobileMenuOpen && (
          <div className="md:hidden px-3.5 py-3 border-t border-slate-800 bg-slate-950/95 max-h-[75dvh] overflow-y-auto overscroll-contain touch-pan-y space-y-2.5 shadow-2xl">
            <div className="flex items-center justify-between text-xs">
              {/* Scrap Conversion */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-amber-300 font-bold">Scrap: {state.scrap}</span>
                <button
                  type="button"
                  disabled={state.scrap < convertScrapCost(state) || state.plasma >= state.maxPlasma}
                  onClick={() => playerDispatch({ type: 'CONVERT' })}
                  className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400/20 text-amber-200 border border-amber-400/50"
                >
                  +Plasma
                </button>
              </div>

              {/* Spendable XP */}
              <div className="flex items-center gap-1 font-mono text-amber-300 font-bold">
                <Coins className="w-3.5 h-3.5" /> {state.spendXp} Spend XP
              </div>
            </div>

            {/* Rank & Reputation */}
            <div className="flex items-center justify-between text-xs bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-bold text-white">{rankInfo.current.title}</span>
                <span className="text-[10px] text-slate-400">({state.rankXp} XP)</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${repBadge.bg} ${repBadge.color}`}
              >
                {repBadge.label} ({state.reputation})
              </span>
            </div>

            {/* Biome System Rule */}
            {(() => {
              const bDef = BIOMES[state.biome ?? 'shattered_cradle'];
              return (
                <div
                  className="p-2 rounded-xl border text-xs flex items-center justify-between"
                  style={{
                    backgroundColor: `${bDef.primaryColor}15`,
                    borderColor: `${bDef.primaryColor}50`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: bDef.primaryColor }} />
                    <span className="font-bold text-white truncate max-w-[220px]">
                      {bDef.name}: {bDef.rule}
                    </span>
                  </div>
                  {state.flareWarning && (
                    <span className="px-1.5 py-0.2 rounded font-black text-[9px] bg-red-500 text-white animate-pulse">
                      FLARE!
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Plasma Allocation inside Mobile Drawer */}
            <PlasmaAllocationPanel state={state} dispatch={playerDispatch} compact />

            {canRearrange && !editMode && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  enterEditMode();
                }}
                className="w-full py-1.5 rounded-xl text-xs font-extrabold bg-cyan-400 text-slate-950 flex items-center justify-center gap-1.5"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Edit Ship Layout
              </button>
            )}
          </div>
        )}

        {/* DESKTOP FULL TOP ROW (hidden md:flex) */}
        <div className="hidden md:flex flex-wrap items-center justify-between gap-2 px-3.5 py-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* WIDGET 1: Hull Integrity */}
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

            {/* WIDGET 2: Magnetic Shields */}
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

            {/* WIDGET 3: Plasma Reserve */}
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

            {/* WIDGET 4: Scrap Cargo */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Scrap Cargo</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-extrabold font-mono text-amber-300">
                    {state.scrap}
                  </span>
                  <button
                    type="button"
                    disabled={state.scrap < convertScrapCost(state) || state.plasma >= state.maxPlasma}
                    onClick={() => playerDispatch({ type: 'CONVERT' })}
                    title={`Convert ${convertScrapCost(state)} Scrap into +30 Plasma`}
                    className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-400/20 hover:bg-amber-400/35 disabled:opacity-35 text-amber-200 border border-amber-400/50"
                  >
                    +Plasma
                  </button>
                </div>
              </div>
            </div>

            {/* WIDGET 5: Dual-XP & Sector Reputation Slider */}
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
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

              <div
                className="min-w-[125px]"
                title="Sector Reputation (−100 Outlaw to +100 Trusted Ally)"
              >
                <div className="flex items-center justify-between gap-1.5 text-[10px]">
                  <span
                    className={`px-1.5 py-0.2 rounded border font-extrabold ${repBadge.bg} ${repBadge.color}`}
                  >
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
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                  : state.mothership.channelStatus === 'waiting_partner'
                    ? 'bg-purple-500/25 border-purple-400 text-purple-200 animate-pulse'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-200'
              }`}
              title="Co-Op Ship Docking: Link via 4-digit code or AI Wingman"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              {state.mothership.active ? (
                <span>
                  Mothership{' '}
                  {state.mothership.mode === 'network_code'
                    ? `#${state.mothership.roomCode}`
                    : `(${state.plasma}P)`}
                </span>
              ) : state.mothership.channelStatus === 'waiting_partner' ? (
                <span>Waiting #{state.mothership.roomCode}…</span>
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

            {canRearrange && !editMode && (
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
                onClick={() => playerDispatch({ type: 'PAUSE' })}
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
                onClick={() => playerDispatch({ type: 'TICK' })}
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
            dispatch={playerDispatch}
            onOpenRoomModal={(room) => setOpenModal(room)}
          />
        )}

        {/* Normal Freeflight Ship View (or Merged 12-Room Mothership View) */}
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
          <div className="w-full h-full flex flex-col items-center justify-between gap-2 max-w-[1240px] px-2 py-1">
            {/* Mobile View Switcher between Your Vessel and Enemy Ship (lg:hidden) */}
            <div className="lg:hidden w-full flex items-center justify-center gap-2 pt-0.5 shrink-0 z-20">
              <button
                type="button"
                onClick={() => setMobileCombatView('player')}
                className={`flex-1 py-1 px-2.5 rounded-xl text-xs font-extrabold border transition flex items-center justify-center gap-1.5 ${
                  mobileCombatView === 'player'
                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Your Ship ({hullPct}%)</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileCombatView('enemy')}
                className={`flex-1 py-1 px-2.5 rounded-xl text-xs font-extrabold border transition flex items-center justify-center gap-1.5 ${
                  mobileCombatView === 'enemy'
                    ? 'bg-red-500/30 border-red-400 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5 text-red-400" />
                <span>Target: {state.encounter.enemy.name}</span>
              </button>
            </div>

            <div className="w-full flex-1 flex flex-col lg:flex-row items-center justify-between gap-4 overflow-hidden">
              {/* Left: Player / Merged Mothership Cutaway */}
              <div
                className={`flex-1 w-full h-full flex-col items-center justify-center relative ${
                  mobileCombatView === 'enemy' ? 'hidden lg:flex' : 'flex'
                }`}
              >
                <div className="absolute top-1 left-2 z-10 text-[10px] font-extrabold uppercase tracking-wider text-cyan-300 bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                  {state.mothership.active
                    ? 'Docked Mothership (Click Any Room to Man +25%)'
                    : 'Your Vessel (Click Rooms to Man)'}
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

              {/* Right: Enemy Ship Cutaway & Dual Co-Op Targetable Rooms */}
              <div
                className={`flex-1 w-full h-full flex-col items-center justify-center relative ${
                  mobileCombatView === 'player' ? 'hidden lg:flex' : 'flex'
                }`}
              >
                <EnemyShipView
                  enemy={state.encounter.enemy}
                  equippedWeapons={state.equippedWeapons}
                  selectedWeaponSlot={state.selectedWeaponSlot}
                  targetRoomId={
                    state.equippedWeapons[state.selectedWeaponSlot ?? 0]?.targetRoomId ?? null
                  }
                  coopActive={state.mothership.active}
                  primaryTargetRoomId={state.mothership.primaryTargetRoomId}
                  wingmanTargetRoomId={state.mothership.wingmanTargetRoomId}
                  onTargetRoom={(roomId) => {
                    const slotIdx = state.selectedWeaponSlot ?? 0;
                    playerDispatch({
                      type: 'SET_WEAPON_TARGET',
                      slotIndex: slotIdx,
                      targetRoomId: roomId,
                    });
                  }}
                />
              </div>
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
      <footer
        className={`relative z-20 ${
          inCombat ? 'flex' : 'hidden md:flex'
        } flex-wrap items-end justify-between gap-2 px-3 pb-2 pt-1 pointer-events-none`}
      >
        {/* BOTTOM-LEFT: Unified Plasma Allocation Panel + Compact Control Legend */}
        <div className="pointer-events-auto hidden md:flex flex-wrap items-end gap-2">
          <PlasmaAllocationPanel state={state} dispatch={playerDispatch} compact />

          <div className="hidden sm:block rounded-2xl bg-slate-950/90 border border-slate-800/90 px-3 py-2 shadow-xl backdrop-blur-md space-y-0.5 text-[10px]">
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
                  <strong className="text-amber-300">
                    {isNetworkCoop && state.mothership.primaryShip !== 'player'
                      ? 'Toggle Ready'
                      : 'Execute Turn'}
                  </strong>
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
          <div className="pointer-events-auto flex justify-center w-full flex-1 max-w-xl mx-auto">
            <EquippedWeaponsHUD
              equippedWeapons={state.equippedWeapons}
              selectedSlot={state.selectedWeaponSlot}
              onSelectSlot={(idx) => {
                dispatch({ type: 'SELECT_WEAPON_SLOT', index: idx });
                setMobileCombatView('enemy');
              }}
              onExecuteTurn={() => playerDispatch({ type: 'EXECUTE_COMBAT_TURN' })}
              onAutoCloakRetreat={() => playerDispatch({ type: 'EMERGENCY_AUTO_CLOAK' })}
              plasma={state.plasma}
              inCombat={inCombat}
              enemyPresent={!!state.encounter.enemy}
              coopNetworkActive={isNetworkCoop}
              isPrimaryShip={state.mothership.primaryShip === 'player'}
              localCombatReady={state.mothership.localCombatReady}
              partnerCombatReady={state.mothership.partnerCombatReady}
              onToggleCombatReady={() => playerDispatch({ type: 'SET_COMBAT_READY' })}
            />
          </div>
        )}

        {/* BOTTOM-RIGHT: 6 Ship Rooms Dock + Event Log Ticker (Outside Combat) */}
        {!inCombat && (
          <div className="pointer-events-auto hidden md:flex flex-col items-end gap-1.5">
            {state.log.length > 0 && (
              <div className="px-3 py-1 rounded-full bg-slate-950/90 border border-slate-800 text-[11px] text-cyan-200 shadow-lg max-w-md truncate">
                {state.log[state.log.length - 1].text}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-1.5 bg-slate-950/90 border border-slate-800/90 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
              {ROOM_ORDER.map((id) => {
                const def = ROOMS[id];
                const Icon = def.icon;
                const roomManned = isRoomManned(state, id);
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
                      roomManned
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
                        {roomManned && (
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

      {/* DOCKED MOBILE CONTROL DECK (6-ROOM STRIP + ACTIONS + TOGGLEABLE D-PAD) */}
      {!editMode && !openModal && !mapOpen && !shopOpen && !coopOpen && !state.activeStoryEvent && (
        <MobileControls
          state={state}
          inCombat={inCombat}
          currentRoom={currentRoom}
          onMoveDir={handleMobileMoveDir}
          onInteract={handleMobileInteract}
          onSelectRoomConsole={handleConsoleClick}
          onWalkToRoom={(_id, cell) => {
            setMobileCombatView('player');
            walkTo(cell, null);
          }}
          onTogglePause={() => playerDispatch({ type: 'PAUSE' })}
          onStepTurn={() => playerDispatch({ type: 'TICK' })}
          onOpenMap={() => setMapOpen(true)}
          onTogglePowerDrawer={() => setMobileMenuOpen((v) => !v)}
          powerDrawerOpen={mobileMenuOpen}
        />
      )}

      {/* ROOM COMMAND CONSOLE MODAL */}
      <ConsoleModal
        room={openModal}
        state={state}
        dispatch={playerDispatch}
        onClose={() => setOpenModal(null)}
        onMoveToConsole={(roomId) => {
          const ownPiece = state.layout.find((r) => r.id === roomId);
          const partnerPiece = mothershipDock?.partnerLayout.find((r) => r.id === roomId);
          if (ownPiece && partnerPiece) {
            const c1 = consoleCell(ownPiece);
            const c2 = consoleCell(partnerPiece);
            const d1 = Math.abs(c1.x - state.crew.cell.x) + Math.abs(c1.y - state.crew.cell.y);
            const d2 = Math.abs(c2.x - state.crew.cell.x) + Math.abs(c2.y - state.crew.cell.y);
            walkTo(d2 < d1 ? c2 : c1, roomId);
          } else if (ownPiece) {
            walkTo(consoleCell(ownPiece), roomId);
          }
        }}
        onSelectRoom={(roomId) => setOpenModal(roomId)}
        onOpenSectorMap={() => setMapOpen(true)}
        onOpenCoopDocking={() => setCoopOpen(true)}
      />

      {/* STANDALONE SECTOR MAP MODAL (M KEY OR BUTTON) */}
      <SectorMapModal
        open={mapOpen}
        state={state}
        dispatch={playerDispatch}
        onClose={() => setMapOpen(false)}
      />

      {/* 16 UPGRADES & SATELLITE SHOP MODAL */}
      <GarageShopModal
        open={shopOpen}
        state={state}
        dispatch={playerDispatch}
        onClose={() => setShopOpen(false)}
        onOpenRearrange={() => {
          if (canRearrange) enterEditMode();
        }}
      />

      {/* CO-OP MOTHERSHIP DOCKING & SUPABASE SETUP MODAL */}
      <CoopDockingModal
        open={coopOpen}
        state={state}
        dispatch={playerDispatch}
        onClose={() => setCoopOpen(false)}
        onConnectRoomCode={connectToRoomCode}
        onRequestUndock={handleRequestUndock}
      />

      {/* FTL-STYLE "BLUE OPTION" STORY EVENT MODAL */}
      <StoryEventModal state={state} dispatch={playerDispatch} />
    </div>
  );
};
export default App;
