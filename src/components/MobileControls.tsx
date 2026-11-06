import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  Flame,
  Pause,
  Play,
} from 'lucide-react';
import type { Dir, RoomId } from '../game/types';
import { ROOMS } from '../game/rooms';

interface Props {
  inCombat: boolean;
  currentRoom: RoomId | null;
  onMoveDir: (dir: Dir) => void;
  onInteract: () => void;
  onTogglePauseOrFire: () => void;
  onOpenMap: () => void;
  paused: boolean;
}

export const MobileControls: React.FC<Props> = ({
  inCombat,
  currentRoom,
  onMoveDir,
  onInteract,
  onTogglePauseOrFire,
  onOpenMap,
  paused,
}) => {
  const [showDpad, setShowDpad] = useState(true);
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

  const roomDef = currentRoom ? ROOMS[currentRoom] : null;

  return (
    <div className="md:hidden pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between p-3 pb-safe-bottom select-none">
      {/* LEFT: Virtual D-Pad (Direction Controls) */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5">
        {showDpad && (
          <div className="relative w-36 h-36 rounded-full bg-slate-950/85 border border-cyan-500/40 shadow-[0_0_25px_rgba(0,0,0,0.8)] backdrop-blur-md p-1.5 flex items-center justify-center">
            {/* Center Core */}
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700/80 flex items-center justify-center text-[10px] font-extrabold text-cyan-300">
              WASD
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
              className="absolute top-1 left-1/2 -translate-x-1/2 w-11 h-11 rounded-t-xl bg-slate-900/90 hover:bg-cyan-500/30 active:bg-cyan-500/50 border border-cyan-400/40 text-cyan-200 flex items-center justify-center shadow-lg active:scale-95 transition"
            >
              <ArrowUp className="w-5 h-5" />
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
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-11 h-11 rounded-b-xl bg-slate-900/90 hover:bg-cyan-500/30 active:bg-cyan-500/50 border border-cyan-400/40 text-cyan-200 flex items-center justify-center shadow-lg active:scale-95 transition"
            >
              <ArrowDown className="w-5 h-5" />
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
              className="absolute left-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-l-xl bg-slate-900/90 hover:bg-cyan-500/30 active:bg-cyan-500/50 border border-cyan-400/40 text-cyan-200 flex items-center justify-center shadow-lg active:scale-95 transition"
            >
              <ArrowLeft className="w-5 h-5" />
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
              className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-r-xl bg-slate-900/90 hover:bg-cyan-500/30 active:bg-cyan-500/50 border border-cyan-400/40 text-cyan-200 flex items-center justify-center shadow-lg active:scale-95 transition"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowDpad((v) => !v)}
          className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-950/80 text-slate-300 border border-slate-700/80 shadow backdrop-blur-md"
        >
          {showDpad ? 'Hide D-Pad' : 'Show D-Pad'}
        </button>
      </div>

      {/* RIGHT: Primary Action Thumb Buttons */}
      <div className="pointer-events-auto flex flex-col items-end gap-2.5">
        {/* Quick Map Button */}
        <button
          type="button"
          onClick={onOpenMap}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/50 shadow-[0_4px_16px_rgba(0,0,0,0.7)] backdrop-blur-md active:scale-95 transition"
          aria-label="Open Sector Map"
        >
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>Star Map [M]</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Action E Button: Interact with Current Room */}
          <button
            type="button"
            onClick={onInteract}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 shadow-[0_8px_24px_rgba(0,0,0,0.85)] active:scale-95 transition backdrop-blur-md ${
              roomDef
                ? 'bg-gradient-to-br from-cyan-950 to-slate-900 border-cyan-400 text-cyan-200'
                : 'bg-slate-950/90 border-slate-700 text-slate-400'
            }`}
            aria-label="Interact Console (E)"
          >
            <span className="text-base font-black tracking-wide leading-none">E</span>
            <span className="text-[9px] font-extrabold mt-1 truncate max-w-[56px] text-center">
              {roomDef ? roomDef.name.split(' ')[0] : 'Bridge'}
            </span>
          </button>

          {/* Action Space Button: Fire in Combat / Pause Outside */}
          <button
            type="button"
            onClick={onTogglePauseOrFire}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 shadow-[0_8px_24px_rgba(0,0,0,0.85)] active:scale-95 transition backdrop-blur-md ${
              inCombat
                ? 'bg-gradient-to-br from-red-600 to-amber-700 border-red-300 text-white animate-pulse'
                : paused
                  ? 'bg-amber-400 border-amber-200 text-slate-950 font-black'
                  : 'bg-slate-900/90 border-slate-600 text-slate-200'
            }`}
            aria-label={inCombat ? 'Fire Weapons (Space)' : 'Toggle Pause (Space)'}
          >
            {inCombat ? (
              <>
                <Flame className="w-5 h-5 text-yellow-300 animate-pulse" />
                <span className="text-[10px] font-black uppercase mt-0.5">FIRE</span>
              </>
            ) : paused ? (
              <>
                <Play className="w-5 h-5" />
                <span className="text-[10px] font-extrabold mt-0.5">PLAY</span>
              </>
            ) : (
              <>
                <Pause className="w-5 h-5 text-cyan-300" />
                <span className="text-[10px] font-extrabold mt-0.5 text-cyan-200">PAUSE</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
