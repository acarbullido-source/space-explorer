import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  Gamepad2,
  Pause,
  Play,
  SkipForward,
  Terminal,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import type { Cell, Dir, GameState, RoomId } from '../game/types';
import { ROOMS, ROOM_ORDER } from '../game/rooms';
import { consoleCell } from '../game/layout';
import { mannedRoom } from '../game/state';

interface Props {
  state: GameState;
  inCombat: boolean;
  currentRoom: RoomId | null;
  onMoveDir: (dir: Dir) => void;
  onInteract: () => void;
  onSelectRoomConsole: (roomId: RoomId, cell: Cell) => void;
  onWalkToRoom: (roomId: RoomId, cell: Cell) => void;
  onTogglePause: () => void;
  onStepTurn: () => void;
  onOpenMap: () => void;
  onTogglePowerDrawer: () => void;
  powerDrawerOpen: boolean;
}

const SHORT_ROOM_NAME: Record<RoomId, string> = {
  bridge: 'Bridge',
  comms: 'Comms',
  life: 'Life',
  science: 'Shields',
  airlock: 'Airlock',
  engineering: 'Engines',
};

export const MobileControls: React.FC<Props> = ({
  state,
  inCombat,
  currentRoom,
  onMoveDir,
  onInteract,
  onSelectRoomConsole,
  onWalkToRoom,
  onTogglePause,
  onStepTurn,
  onOpenMap,
  onTogglePowerDrawer,
  powerDrawerOpen,
}) => {
  const [showDpad, setShowDpad] = useState(false);
  const repeatTimer = useRef<number | null>(null);

  const startMove = (dir: Dir) => {
    onMoveDir(dir);
    if (repeatTimer.current) clearInterval(repeatTimer.current);
    repeatTimer.current = window.setInterval(() => {
      onMoveDir(dir);
    }, 180);
  };

  const stopMove = () => {
    if (repeatTimer.current) {
      clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (repeatTimer.current) clearInterval(repeatTimer.current);
    };
  }, []);

  const manned = mannedRoom(state);
  const roomDef = currentRoom ? ROOMS[currentRoom] : null;

  return (
    <div className="md:hidden relative z-20 w-full bg-slate-950/95 border-t border-slate-800/90 px-2.5 pt-2 pb-2 safe-bottom select-none">
      {/* Optional Pop-Up Directional D-Pad (Only shown when toggled by player) */}
      {showDpad && (
        <div className="absolute bottom-full left-3 mb-2 z-30 flex flex-col items-start gap-1">
          <div className="relative w-32 h-32 rounded-2xl bg-slate-950/95 border border-cyan-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.9)] backdrop-blur-md p-1.5 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setShowDpad(false)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 text-slate-200 flex items-center justify-center shadow"
              aria-label="Close D-Pad"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700/80 flex items-center justify-center text-[9px] font-extrabold text-cyan-300">
              STEP
            </div>

            {/* UP (N) */}
            <button
              type="button"
              aria-label="Move Up"
              onPointerDown={(e) => {
                e.preventDefault();
                startMove('N');
              }}
              onPointerUp={stopMove}
              onPointerLeave={stopMove}
              onPointerCancel={stopMove}
              className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-10 rounded-t-xl bg-slate-900 hover:bg-cyan-500/30 active:bg-cyan-500/50 border border-cyan-400/40 text-cyan-200 flex items-center justify-center active:scale-95"
            >
              <ArrowUp className="w-4 h-4" />
            </button>

            {/* DOWN (S) */}
            <button
              type="button"
              aria-label="Move Down"
              onPointerDown={(e) => {
                e.preventDefault();
                startMove('S');
              }}
              onPointerUp={stopMove}
              onPointerLeave={stopMove}
              onPointerCancel={stopMove}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-10 rounded-b-xl bg-slate-900 hover:bg-cyan-500/30 active:bg-cyan-500/50 border border-cyan-400/40 text-cyan-200 flex items-center justify-center active:scale-95"
            >
              <ArrowDown className="w-4 h-4" />
            </button>

            {/* LEFT (W) */}
            <button
              type="button"
              aria-label="Move Left"
              onPointerDown={(e) => {
                e.preventDefault();
                startMove('W');
              }}
              onPointerUp={stopMove}
              onPointerLeave={stopMove}
              onPointerCancel={stopMove}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-l-xl bg-slate-900 hover:bg-cyan-500/30 active:bg-cyan-500/50 border border-cyan-400/40 text-cyan-200 flex items-center justify-center active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* RIGHT (E) */}
            <button
              type="button"
              aria-label="Move Right"
              onPointerDown={(e) => {
                e.preventDefault();
                startMove('E');
              }}
              onPointerUp={stopMove}
              onPointerLeave={stopMove}
              onPointerCancel={stopMove}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-r-xl bg-slate-900 hover:bg-cyan-500/30 active:bg-cyan-500/50 border border-cyan-400/40 text-cyan-200 flex items-center justify-center active:scale-95"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ROW 1: 6-Room Quick Crew & Console Strip */}
      <div className="grid grid-cols-6 gap-1 mb-1.5">
        {ROOM_ORDER.map((id) => {
          const def = ROOMS[id];
          const Icon = def.icon;
          const isManned = manned === id;
          const isHere = currentRoom === id;
          const hp = state.roomHp[id];
          const p = state.layout.find((r) => r.id === id)!;
          const cCell = consoleCell(p);

          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (inCombat) {
                  // In combat, tapping a room walks crew there to man it (+25%) or repair it
                  onWalkToRoom(id, cCell);
                } else {
                  // Outside combat, tapping a room walks crew there and opens its console
                  onSelectRoomConsole(id, cCell);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl border transition active:scale-95 ${
                isManned
                  ? 'bg-emerald-950/60 border-emerald-400/80'
                  : isHere
                    ? 'bg-slate-900 border-cyan-400/70'
                    : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-1">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: def.theme.accent }} />
                {isManned && <UserCheck className="w-2.5 h-2.5 text-emerald-400" />}
              </div>
              <span className="text-[10px] font-bold text-white truncate max-w-full leading-tight mt-0.5">
                {SHORT_ROOM_NAME[id]}
              </span>
              <div className="flex items-center gap-0.5 mt-0.5">
                {Array.from({ length: def.maxHp }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1 rounded-sm ${
                      i < hp ? 'bg-emerald-400' : 'bg-red-500/60'
                    }`}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* ROW 2: Primary Action Bar (Out of Combat) */}
      {!inCombat && (
        <div className="grid grid-cols-5 gap-1.5">
          {/* 1. Toggle D-Pad */}
          <button
            type="button"
            onClick={() => setShowDpad((v) => !v)}
            className={`flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-[11px] font-extrabold border transition active:scale-95 ${
              showDpad
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>D-Pad</span>
          </button>

          {/* 2. Open Current Room Console */}
          <button
            type="button"
            onClick={onInteract}
            className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-[11px] font-extrabold bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 transition active:scale-95"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span className="truncate">{roomDef ? SHORT_ROOM_NAME[currentRoom!] : 'Console'}</span>
          </button>

          {/* 3. Toggle Power & Stats Drawer */}
          <button
            type="button"
            onClick={onTogglePowerDrawer}
            className={`flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-[11px] font-extrabold border transition active:scale-95 ${
              powerDrawerOpen
                ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                : 'bg-slate-900 border-slate-800 text-cyan-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Power</span>
          </button>

          {/* 4. Pause / Play + Step Turn */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onTogglePause}
              className={`flex-1 flex items-center justify-center py-2 rounded-xl text-[11px] font-extrabold border transition active:scale-95 ${
                state.paused
                  ? 'bg-amber-400 border-amber-300 text-slate-950'
                  : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
              aria-label={state.paused ? 'Resume' : 'Pause'}
            >
              {state.paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onStepTurn}
              className="flex-1 flex items-center justify-center py-2 rounded-xl text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-cyan-300 active:scale-95"
              title="Advance 1 Turn"
            >
              <SkipForward className="w-3 h-3 mr-0.5" />
              {state.turn}
            </button>
          </div>

          {/* 5. Open Star Map */}
          <button
            type="button"
            onClick={onOpenMap}
            className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-[11px] font-extrabold bg-sky-500/20 border border-sky-400/60 text-sky-200 transition active:scale-95"
          >
            <Compass className="w-3.5 h-3.5 text-sky-300 shrink-0" />
            <span>Map</span>
          </button>
        </div>
      )}
    </div>
  );
};
