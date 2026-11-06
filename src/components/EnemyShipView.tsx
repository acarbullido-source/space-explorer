import React from 'react';
import { Cog, Compass, Crosshair, Flame, Shield } from 'lucide-react';
import type { Enemy, WeaponSlot } from '../game/types';
import { WEAPONS } from '../game/weapons';
import { FACTIONS } from '../game/factions';

interface Props {
  enemy: Enemy;
  equippedWeapons: WeaponSlot[];
  selectedWeaponSlot: number | null;
  onTargetRoom: (roomId: string) => void;
  targetRoomId: string | null;
}

const ROOM_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  weapons: Crosshair,
  shields: Shield,
  engines: Cog,
  bridge: Compass,
};

const ROOM_COLORS: Record<string, string> = {
  weapons: '#22d3ee',
  shields: '#60a5fa',
  engines: '#fb923c',
  bridge: '#38bdf8',
};

export const EnemyShipView: React.FC<Props> = ({
  enemy,
  equippedWeapons,
  selectedWeaponSlot,
  onTargetRoom,
}) => {
  const hullPct = Math.round((enemy.hull / Math.max(1, enemy.maxHull)) * 100);
  const hullSegments = 10;
  const filledHullSegments = Math.ceil((hullPct / 100) * hullSegments);
  const hullColor =
    hullPct > 55 ? 'bg-red-400' : hullPct > 25 ? 'bg-amber-400' : 'bg-red-600';

  // Find which player weapons are targeting which rooms
  const targetingWeaponsByRoom: Record<string, string[]> = {};
  equippedWeapons.forEach((slot) => {
    if (slot.targetRoomId) {
      if (!targetingWeaponsByRoom[slot.targetRoomId]) {
        targetingWeaponsByRoom[slot.targetRoomId] = [];
      }
      targetingWeaponsByRoom[slot.targetRoomId].push(WEAPONS[slot.weaponId].name);
    }
  });

  const selectedWeapon =
    selectedWeaponSlot !== null ? equippedWeapons[selectedWeaponSlot] : null;
  const selectedWeaponDef = selectedWeapon ? WEAPONS[selectedWeapon.weaponId] : null;
  const factionDef = FACTIONS[enemy.faction ?? 'terran'] ?? FACTIONS.terran;

  return (
    <div className="relative flex flex-col items-center justify-center p-3 select-none">
      {/* Target Lock Guidance Header */}
      <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-950/85 border border-red-500/40 mb-2">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-red-400 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-extrabold text-white uppercase tracking-wide">
              {enemy.name}
            </span>
            <span
              className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider border"
              style={{
                color: factionDef.themeColor,
                borderColor: `${factionDef.themeColor}50`,
                backgroundColor: `${factionDef.themeColor}20`,
              }}
            >
              {factionDef.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Shields bubbles */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Shields:</span>
            {Array.from({ length: Math.max(1, enemy.maxShields) }).map((_, i) => (
              <span
                key={i}
                className={`w-3.5 h-2 rounded-full border transition-all ${
                  i < enemy.shields
                    ? 'bg-sky-400 border-sky-200 shadow-[0_0_6px_#38bdf8]'
                    : 'bg-slate-800 border-slate-700'
                }`}
              />
            ))}
          </div>
          {/* Hull integrity */}
          <div className="flex items-center gap-1 ml-2">
            <span className="text-[10px] font-mono font-bold text-white">
              {enemy.hull}/{enemy.maxHull}
            </span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: hullSegments }).map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-2 rounded-[1px] ${
                    i < filledHullSegments ? hullColor : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedWeaponDef && (
        <div className="text-[11px] text-cyan-300 font-bold mb-1 flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          Click an Enemy Room to lock target for: <span className="underline">{selectedWeaponDef.name}</span>
        </div>
      )}

      {/* Enemy Ship Top-Down Cutaway SVG */}
      <div className="relative w-full max-w-[440px] aspect-[16/10] flex items-center justify-center">
        <svg
          viewBox="0 0 440 260"
          className="w-full h-full drop-shadow-[0_15px_35px_rgba(0,0,0,0.85)]"
        >
          <defs>
            <radialGradient id="enemyShieldBubble" cx="50%" cy="50%" r="50%">
              <stop offset="65%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="92%" stopColor="#38bdf8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.45" />
            </radialGradient>
            <linearGradient id="enemyHullMetal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#331414" />
              <stop offset="50%" stopColor="#1e1313" />
              <stop offset="100%" stopColor="#0c0707" />
            </linearGradient>
            <linearGradient id="hullMetalTerran" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3d2a10" />
              <stop offset="50%" stopColor="#241a0d" />
              <stop offset="100%" stopColor="#0f0c08" />
            </linearGradient>
            <linearGradient id="hullMetalLithoid" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#083344" />
              <stop offset="50%" stopColor="#0c232f" />
              <stop offset="100%" stopColor="#031016" />
            </linearGradient>
            <linearGradient id="hullMetalVexx" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#052e16" />
              <stop offset="50%" stopColor="#0f1f14" />
              <stop offset="100%" stopColor="#020d06" />
            </linearGradient>
            <linearGradient id="hullMetalSolaris" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3b2d07" />
              <stop offset="50%" stopColor="#251a26" />
              <stop offset="100%" stopColor="#0d0614" />
            </linearGradient>
            <linearGradient id="enemyThrusterFlame" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#fb923c" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Magnetic Shield Barrier */}
          {enemy.shields > 0 && (
            <ellipse
              cx={220}
              cy={130}
              rx={195}
              ry={110}
              fill="url(#enemyShieldBubble)"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="8 6"
              opacity={0.7}
            />
          )}

          {/* 4 DISTINCT ALIEN FACTION SHIP SILHOUETTES */}
          {enemy.faction === 'lithoid' ? (
            /* --- LITHOID WEAVERS: Crystalline Faceted Spire & Diamond Winglets --- */
            <g>
              <polygon
                points="120,38 185,12 250,38 185,55"
                fill="#083344"
                stroke="#22d3ee"
                strokeWidth={2}
              />
              <polygon
                points="120,222 185,205 250,222 185,248"
                fill="#083344"
                stroke="#22d3ee"
                strokeWidth={2}
              />
              <path
                d="M 35 130
                   L 105 45
                   L 310 55
                   L 375 110
                   L 375 150
                   L 310 205
                   L 105 215
                   Z"
                fill="url(#hullMetalLithoid)"
                stroke="#22d3ee"
                strokeWidth={3}
                strokeLinejoin="round"
              />
              <path
                d="M 35 130 L 160 130 L 310 55 M 160 130 L 310 205"
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                opacity={0.65}
              />
              {/* Crystalline Thruster emitter */}
              {enemy.rooms.find((r) => r.id === 'engines')?.hp ?? 0 > 0 ? (
                <ellipse cx={392} cy={130} rx={18} ry={12} fill="#22d3ee" opacity={0.65} className="animate-pulseGlow" />
              ) : null}
            </g>
          ) : enemy.faction === 'vexx' ? (
            /* --- VEXX SYNDICATE: Spiked Barbed Cyber Skiff --- */
            <g>
              <path
                d="M 190 48 L 260 16 L 245 52 M 190 212 L 260 244 L 245 208"
                stroke="#15803d"
                strokeWidth={2.5}
                fill="#052e16"
              />
              <path
                d="M 35 130
                   L 75 70
                   L 140 45
                   L 330 48
                   L 360 80
                   L 405 65
                   L 380 130
                   L 405 195
                   L 360 180
                   L 330 212
                   L 140 215
                   L 75 190
                   Z"
                fill="url(#hullMetalVexx)"
                stroke="#22c55e"
                strokeWidth={3}
                strokeLinejoin="round"
              />
              <path
                d="M 85 98 L 130 98 L 155 68 M 85 162 L 130 162 L 155 192"
                stroke="#4ade80"
                strokeWidth={1.5}
                opacity={0.7}
              />
              {/* Cyber Thrusters */}
              {enemy.rooms.find((r) => r.id === 'engines')?.hp ?? 0 > 0 ? (
                <g>
                  <ellipse cx={400} cy={95} rx={16} ry={7} fill="#22c55e" opacity={0.8} className="animate-pulseGlow" />
                  <ellipse cx={400} cy={165} rx={16} ry={7} fill="#22c55e" opacity={0.8} className="animate-pulseGlow" />
                </g>
              ) : null}
            </g>
          ) : enemy.faction === 'solaris' ? (
            /* --- SOLARIS CHOIR: Radiant Concentric Ring Cruiser & Photonic Sails --- */
            <g>
              <ellipse
                cx={220}
                cy={130}
                rx={185}
                ry={90}
                fill="none"
                stroke="#eab308"
                strokeWidth={2.5}
                strokeDasharray="16 10"
                opacity={0.85}
              />
              <path
                d="M 50 130
                   Q 110 50 240 55
                   Q 340 60 375 130
                   Q 340 200 240 205
                   Q 110 210 50 130
                   Z"
                fill="url(#hullMetalSolaris)"
                stroke="#eab308"
                strokeWidth={3}
                strokeLinejoin="round"
              />
              <circle
                cx={220}
                cy={130}
                r={44}
                fill="none"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.75}
              />
              {/* Photonic Emitter */}
              {enemy.rooms.find((r) => r.id === 'engines')?.hp ?? 0 > 0 ? (
                <ellipse cx={392} cy={130} rx={22} ry={14} fill="#eab308" opacity={0.75} className="animate-pulseGlow" />
              ) : null}
            </g>
          ) : (
            /* --- TERRAN REMNANT: Heavy Industrial Armored Wedge --- */
            <g>
              <path
                d="M 45 130
                   L 95 60
                   L 330 60
                   L 385 92
                   L 385 168
                   L 330 200
                   L 95 200
                   Z"
                fill="url(#hullMetalTerran)"
                stroke="#f59e0b"
                strokeWidth={3}
                strokeLinejoin="round"
              />
              {/* Reinforced armor bridge plate & amber visor */}
              <polygon
                points="55,130 95,85 130,85 115,130 130,175 95,175"
                fill="#1e293b"
                stroke="#f59e0b"
                strokeWidth={1.5}
              />
              <path d="M 68 126 L 86 112 L 86 148 L 68 134 Z" fill="#fbbf24" opacity={0.9} />
              {/* Heavy Thrusters */}
              {enemy.rooms.find((r) => r.id === 'engines')?.hp ?? 0 > 0 ? (
                <g>
                  <rect x={385} y={98} width={15} height={20} rx={2} fill="#3d2a10" stroke="#f59e0b" strokeWidth={1.5} />
                  <rect x={385} y={142} width={15} height={20} rx={2} fill="#3d2a10" stroke="#f59e0b" strokeWidth={1.5} />
                  <ellipse cx={412} cy={108} rx={16} ry={7} fill="url(#enemyThrusterFlame)" className="animate-pulseGlow" />
                  <ellipse cx={412} cy={152} rx={16} ry={7} fill="url(#enemyThrusterFlame)" className="animate-pulseGlow" />
                </g>
              ) : null}
            </g>
          )}

          {/* Enemy Rooms Cutaway Grid */}
          {enemy.rooms.map((room) => {
            const rx = 80 + room.gx * 48;
            const ry = 75 + room.gy * 48;
            const rw = room.gw * 48;
            const rh = room.gh * 48;
            const Icon = ROOM_ICONS[room.id] ?? Crosshair;
            const isOffline = room.hp <= 0;
            const isDamaged = room.hp < room.maxHp && !isOffline;
            const isTargeted = !!targetingWeaponsByRoom[room.id]?.length;
            const roomColor = ROOM_COLORS[room.id] ?? room.color;

            return (
              <g
                key={room.id}
                onClick={() => onTargetRoom(room.id)}
                className="cursor-pointer group"
              >
                {/* Floor Tiles */}
                <rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  rx={6}
                  fill={isOffline ? '#2a0808' : isDamaged ? '#201108' : '#140c11'}
                  stroke={
                    isTargeted
                      ? '#ef4444'
                      : isOffline
                        ? '#dc2626'
                        : isDamaged
                          ? '#f59e0b'
                          : roomColor
                  }
                  strokeWidth={isTargeted ? 3.5 : 2}
                  className="transition-colors group-hover:stroke-white"
                />

                {/* Subtile grid pattern */}
                <line x1={rx + rw / 2} y1={ry} x2={rx + rw / 2} y2={ry + rh} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                <line x1={rx} y1={ry + rh / 2} x2={rx + rw} y2={ry + rh / 2} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

                {/* Burning Plasma Cloud Animation (from Nova Cannon) */}
                {room.burnTurns > 0 && (
                  <g className="animate-pulseGlow">
                    <circle cx={rx + rw / 2} cy={ry + rh / 2} r={rw / 2.8} fill="rgba(239, 68, 68, 0.35)" />
                    <circle cx={rx + rw / 2} cy={ry + rh / 2} r={rw / 4.2} fill="rgba(251, 146, 60, 0.55)" />
                  </g>
                )}

                {/* Central Room Icon */}
                <foreignObject
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  className="pointer-events-none"
                >
                  <div className="w-full h-full flex flex-col items-center justify-between p-1.5">
                    {/* Top: Name + HP Pips */}
                    <div className="w-full flex items-center justify-between gap-1 px-1">
                      <span
                        className="text-[9px] font-extrabold uppercase tracking-wider truncate px-1 py-0.2 rounded bg-black/75 border border-white/10"
                        style={{ color: roomColor }}
                      >
                        {room.name}
                      </span>
                      <div className="flex items-center gap-0.5 bg-black/80 px-1 py-0.5 rounded">
                        {Array.from({ length: room.maxHp }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-1.5 h-1.5 rounded-[1px] ${
                              i < room.hp
                                ? isDamaged
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400'
                                : 'bg-red-500'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Middle Icon */}
                    <div className="flex items-center justify-center">
                      {room.burnTurns > 0 ? (
                        <Flame className="w-5 h-5 text-red-400 animate-bounce" />
                      ) : (
                        <Icon
                          className="w-5 h-5 opacity-80"
                          style={{ color: isOffline ? '#ef4444' : roomColor }}
                        />
                      )}
                    </div>

                    {/* Bottom Status / Target Badges */}
                    <div className="w-full flex flex-col items-center justify-center min-h-[16px]">
                      {isOffline ? (
                        <span className="text-[8px] font-black uppercase tracking-wider text-red-300 bg-red-950/90 px-1 py-0.2 rounded border border-red-500/50">
                          OFFLINE
                        </span>
                      ) : isDamaged ? (
                        <span className="text-[8px] font-bold uppercase text-amber-300 bg-amber-950/80 px-1 py-0.2 rounded border border-amber-500/40">
                          DAMAGED
                        </span>
                      ) : null}
                    </div>
                  </div>
                </foreignObject>

                {/* Target Lock Reticle Banner */}
                {isTargeted && (
                  <g className="pointer-events-none">
                    <circle
                      cx={rx + rw / 2}
                      cy={ry + rh / 2}
                      r={24}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      className="animate-spin"
                    />
                    <rect
                      x={rx + 2}
                      y={ry + rh - 18}
                      width={rw - 4}
                      height={16}
                      rx={3}
                      fill="rgba(15, 23, 42, 0.95)"
                      stroke="#ef4444"
                      strokeWidth={1}
                    />
                    <text
                      x={rx + rw / 2}
                      y={ry + rh - 6}
                      textAnchor="middle"
                      fill="#fca5a5"
                      fontSize={8}
                      fontWeight={800}
                    >
                      🎯 LOCKED
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tactical Room Target Summary List */}
      <div className="w-full grid grid-cols-2 gap-1.5 mt-2">
        {enemy.rooms.map((room) => {
          const isTargeted = !!targetingWeaponsByRoom[room.id]?.length;
          const isOffline = room.hp <= 0;
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onTargetRoom(room.id)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition ${
                isTargeted
                  ? 'bg-red-500/25 border-red-400 text-red-200'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold flex items-center gap-1 text-white">
                  <span>{room.name}</span>
                  {room.burnTurns > 0 && <Flame className="w-3 h-3 text-red-400 inline" />}
                </div>
                <div className="text-[10px] text-slate-400">
                  {isOffline ? 'Offline (0 HP)' : `HP: ${room.hp}/${room.maxHp}`}
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-red-300">
                {isTargeted ? '🎯 LOCKED' : 'Click to aim'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
