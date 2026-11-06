import React, { useMemo, useRef, useState } from 'react';
import { Package, RotateCw, Sparkles, UserCheck, Wrench } from 'lucide-react';
import {
  CHASSIS,
  DIRS,
  DIR_ANGLE,
  TILE,
  add,
  airlockExposed,
  clampRoom,
  computeDock,
  computeDoors,
  consoleCell,
  dims,
  exposedSide,
  hatchOf,
  key,
  occupancy,
  roomCells,
  rotateRoom,
  same,
  snapAirlock,
  validateLayout,
} from '../game/layout';
import { ROOMS } from '../game/rooms';
import { mannedRoom } from '../game/state';
import type { Cell, Dir, GameState, Layout, PlacedRoom, RoomId } from '../game/types';

interface Props {
  state: GameState;
  crewPos: { x: number; y: number };
  crewFacing: number;
  path: Cell[];
  editMode: boolean;
  draftLayout: Layout;
  selectedRoom: RoomId | null;
  onSelectRoom: (id: RoomId | null) => void;
  onChangeDraft: (layout: Layout) => void;
  onTileClick: (cell: Cell) => void;
  onConsoleClick: (room: RoomId, cell: Cell) => void;
  onRightClick: () => void;
}

export const ShipView: React.FC<Props> = ({
  state,
  crewPos,
  crewFacing,
  path,
  editMode,
  draftLayout,
  selectedRoom,
  onSelectRoom,
  onChangeDraft,
  onTileClick,
  onConsoleClick,
  onRightClick,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<{
    roomId: RoomId;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<RoomId | null>(null);

  const activeLayout = editMode ? draftLayout : state.layout;
  const occ = useMemo(() => occupancy(activeLayout), [activeLayout]);
  const doors = useMemo(() => computeDoors(activeLayout, occ), [activeLayout, occ]);
  const dock = useMemo(
    () =>
      !editMode && (state.docked || (state.mothership.active && state.mothership.partner))
        ? computeDock(state.layout)
        : null,
    [editMode, state.docked, state.mothership.active, state.mothership.partner, state.layout],
  );
  const validation = useMemo(() => validateLayout(draftLayout), [draftLayout]);
  const manned = useMemo(() => (editMode ? null : mannedRoom(state)), [editMode, state]);

  // Compute outer hull bounding polygon around rooms (and docked partner ship if active)
  const bounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of activeLayout) {
      const { w, h } = dims(p);
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + w);
      maxY = Math.max(maxY, p.y + h);
    }
    if (dock) {
      minX = Math.min(minX, dock.partner.x);
      minY = Math.min(minY, dock.partner.y);
      maxX = Math.max(maxX, dock.partner.x + dock.partner.w);
      maxY = Math.max(maxY, dock.partner.y + dock.partner.h);
      for (const t of dock.tube) {
        minX = Math.min(minX, t.x);
        minY = Math.min(minY, t.y);
        maxX = Math.max(maxX, t.x + 1);
        maxY = Math.max(maxY, t.y + 1);
      }
    }
    if (!isFinite(minX)) return { minX: 1, minY: 1, maxX: 12, maxY: 7 };
    return { minX, minY, maxX, maxY };
  }, [activeLayout, dock]);

  const clientToGrid = (clientX: number, clientY: number): { gx: number; gy: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const loc = pt.matrixTransform(ctm.inverse());
    return { gx: loc.x / TILE - 1, gy: loc.y / TILE - 1 };
  };

  const handleRoomPointerDown = (e: React.PointerEvent<SVGGElement>, p: PlacedRoom) => {
    if (!editMode || e.button !== 0) return;
    e.stopPropagation();
    const g = clientToGrid(e.clientX, e.clientY);
    if (!g) return;
    onSelectRoom(p.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({
      roomId: p.id,
      offsetX: g.gx - p.x,
      offsetY: g.gy - p.y,
    });
  };

  const handleRoomPointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!editMode || !dragState) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const g = clientToGrid(e.clientX, e.clientY);
    if (!g) return;
    const nextX = Math.round(g.gx - dragState.offsetX);
    const nextY = Math.round(g.gy - dragState.offsetY);
    const current = draftLayout.find((r) => r.id === dragState.roomId);
    if (!current) return;
    const clamped = clampRoom({ ...current, x: nextX, y: nextY });
    if (clamped.x === current.x && clamped.y === current.y) return;
    let updated = draftLayout.map((r) => (r.id === dragState.roomId ? clamped : r));
    if (dragState.roomId === 'airlock') {
      updated = snapAirlock(updated);
    }
    onChangeDraft(updated);
  };

  const handleRoomPointerUp = () => {
    if (dragState) setDragState(null);
  };

  const rotateSelected = (id: RoomId, e?: React.MouseEvent) => {
    e?.stopPropagation();
    let updated = draftLayout.map((r) => (r.id === id ? rotateRoom(r) : r));
    if (id === 'airlock') updated = snapAirlock(updated);
    onChangeDraft(updated);
  };

  // Determine whether a door has crew nearby so it slides open
  const isDoorOpen = (a: Cell, b: Cell) => {
    const d1 = Math.hypot(crewPos.x - a.x, crewPos.y - a.y);
    const d2 = Math.hypot(crewPos.x - b.x, crewPos.y - b.y);
    return Math.min(d1, d2) < 1.35;
  };

  const viewW = (CHASSIS.w + 2) * TILE;
  const viewH = (CHASSIS.h + 4) * TILE;

  const engRoom = activeLayout.find((r) => r.id === 'engineering');
  const bridgeRoom = activeLayout.find((r) => r.id === 'bridge');
  const airlockRoom = activeLayout.find((r) => r.id === 'airlock');
  const engSide: Dir = (engRoom && exposedSide(engRoom, occ, ['W', 'N', 'S', 'E'])) || 'W';
  const bridgeSide: Dir = (bridgeRoom && exposedSide(bridgeRoom, occ, ['E', 'N', 'S', 'W'])) || 'E';

  const hoveredDef = hoveredRoom ? ROOMS[hoveredRoom] : null;

  return (
    <div
      className="relative w-full h-full flex items-center justify-center select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        onRightClick();
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full h-full max-w-[1180px] max-h-[760px] drop-shadow-[0_18px_45px_rgba(0,0,0,0.85)]"
      >
        <defs>
          <radialGradient id="shieldBubble" cx="50%" cy="50%" r="50%">
            <stop offset="65%" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="93%" stopColor="#38bdf8" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.48" />
          </radialGradient>
          <linearGradient id="hullMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>
          <linearGradient id="thrusterFlame" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Coordinate group shifted by 1 tile margin */}
        <g transform={`translate(${TILE}, ${TILE})`}>
          {/* Orbital Garage / Shop Docking Cradle Ring */}
          {(state.encounter.kind === 'garage' || state.encounter.kind === 'shop') && (
            <g className="opacity-70">
              <rect
                x={-TILE * 0.45}
                y={-TILE * 0.35}
                width={(CHASSIS.w + 0.9) * TILE}
                height={(CHASSIS.h + 0.7) * TILE}
                rx={28}
                fill="none"
                stroke={state.encounter.kind === 'garage' ? '#22d3ee' : '#c084fc'}
                strokeWidth={2}
                strokeDasharray="14 10"
                opacity={0.4}
              />
              {/* Orbital clamp arms */}
              {[2, 6, 10].map((gx) => (
                <g key={gx}>
                  <rect
                    x={gx * TILE + 12}
                    y={-TILE * 0.35}
                    width={32}
                    height={12}
                    rx={3}
                    fill="#1e293b"
                    stroke="#38bdf8"
                    strokeWidth={1}
                  />
                  <rect
                    x={gx * TILE + 12}
                    y={CHASSIS.h * TILE + TILE * 0.35 - 12}
                    width={32}
                    height={12}
                    rx={3}
                    fill="#1e293b"
                    stroke="#38bdf8"
                    strokeWidth={1}
                  />
                </g>
              ))}
            </g>
          )}

          {/* Shield Elliptical Energy Barrier */}
          {!editMode && state.shieldLayers > 0 && (
            <ellipse
              cx={((bounds.minX + bounds.maxX) / 2) * TILE}
              cy={((bounds.minY + bounds.maxY) / 2) * TILE}
              rx={((bounds.maxX - bounds.minX) / 2 + 1.45) * TILE}
              ry={((bounds.maxY - bounds.minY) / 2 + 1.25) * TILE}
              fill="url(#shieldBubble)"
              stroke="#38bdf8"
              strokeWidth={1.5 + state.shieldLayers * 0.8}
              strokeDasharray={state.shieldLayers >= 2 ? undefined : '10 6'}
              opacity={0.45 + state.shieldLayers * 0.18}
            />
          )}

          {/* Edit Mode Chassis Blueprint Grid */}
          {editMode && (
            <g>
              <rect
                x={0}
                y={0}
                width={CHASSIS.w * TILE}
                height={CHASSIS.h * TILE}
                rx={14}
                fill="rgba(8, 47, 73, 0.22)"
                stroke="#22d3ee"
                strokeWidth={1.5}
                strokeDasharray="6 6"
              />
              {Array.from({ length: CHASSIS.h }).map((_, gy) =>
                Array.from({ length: CHASSIS.w }).map((__, gx) => {
                  const isEdge = gx === 0 || gy === 0 || gx === CHASSIS.w - 1 || gy === CHASSIS.h - 1;
                  return (
                    <rect
                      key={`${gx},${gy}`}
                      x={gx * TILE}
                      y={gy * TILE}
                      width={TILE}
                      height={TILE}
                      fill={isEdge ? 'rgba(251, 191, 36, 0.04)' : 'transparent'}
                      stroke="rgba(56, 189, 248, 0.16)"
                      strokeWidth={1}
                    />
                  );
                }),
              )}
            </g>
          )}

          {/* Outer Spaceship Hull Plating Silhouette */}
          {!editMode && (
            <g>
              {/* Main armored hull skirt around all rooms */}
              <path
                d={`M ${(bounds.minX - 0.45) * TILE} ${(bounds.minY + 0.3) * TILE}
                    L ${(bounds.minX + 0.2) * TILE} ${(bounds.minY - 0.38) * TILE}
                    L ${(bounds.maxX - 0.3) * TILE} ${(bounds.minY - 0.38) * TILE}
                    L ${(bounds.maxX + 0.75) * TILE} ${((bounds.minY + bounds.maxY) / 2) * TILE}
                    L ${(bounds.maxX - 0.3) * TILE} ${(bounds.maxY + 0.38) * TILE}
                    L ${(bounds.minX + 0.2) * TILE} ${(bounds.maxY + 0.38) * TILE}
                    L ${(bounds.minX - 0.45) * TILE} ${(bounds.maxY - 0.3) * TILE}
                    Z`}
                fill="url(#hullMetal)"
                stroke="#475569"
                strokeWidth={3}
                strokeLinejoin="round"
              />
              {/* Wing panel seam lines */}
              <line
                x1={bounds.minX * TILE}
                y1={(bounds.minY - 0.2) * TILE}
                x2={(bounds.maxX - 0.5) * TILE}
                y2={(bounds.minY - 0.2) * TILE}
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="18 8"
              />
              <line
                x1={bounds.minX * TILE}
                y1={(bounds.maxY + 0.2) * TILE}
                x2={(bounds.maxX - 0.5) * TILE}
                y2={(bounds.maxY + 0.2) * TILE}
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="18 8"
              />
            </g>
          )}

          {/* Rear Engine Thruster Nozzles & Plasma Plumes */}
          {engRoom && (
            <g>
              {(() => {
                const { h } = dims(engRoom);
                if (engSide === 'W') {
                  const nozzles = [engRoom.y + 0.65, engRoom.y + h / 2, engRoom.y + h - 0.65];
                  const plumeLen =
                    state.power.engines <= 0 || state.roomHp.engineering <= 0
                      ? 0
                      : state.engineMode === 'evasion'
                        ? 58
                        : 34;
                  return nozzles.map((ny, idx) => (
                    <g key={idx}>
                      <rect
                        x={engRoom.x * TILE - 16}
                        y={ny * TILE - 11}
                        width={16}
                        height={22}
                        rx={3}
                        fill="#334155"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                      />
                      {plumeLen > 0 && !editMode && (
                        <ellipse
                          cx={engRoom.x * TILE - 16 - plumeLen / 2}
                          cy={ny * TILE}
                          rx={plumeLen / 2}
                          ry={9}
                          fill="url(#thrusterFlame)"
                          className="animate-pulseGlow"
                        />
                      )}
                    </g>
                  ));
                }
                return null;
              })()}
            </g>
          )}

          {/* Front Bridge Cockpit Glass Canopy */}
          {bridgeRoom && bridgeSide === 'E' && (
            <g>
              {(() => {
                const { w, h } = dims(bridgeRoom);
                const x = (bridgeRoom.x + w) * TILE;
                const y = bridgeRoom.y * TILE;
                return (
                  <path
                    d={`M ${x} ${y + 8} L ${x + 26} ${y + (h * TILE) / 2} L ${x} ${y + h * TILE - 8} Z`}
                    fill="rgba(34, 211, 238, 0.24)"
                    stroke="#22d3ee"
                    strokeWidth={2}
                  />
                );
              })()}
            </g>
          )}

          {/* Weapon Laser Fire Beam Effect */}
          {state.fx.shot > 0 && bridgeRoom && state.encounter.enemy && (
            <g key={state.fx.shot} className="pointer-events-none">
              <line
                x1={(bridgeRoom.x + dims(bridgeRoom).w) * TILE + 20}
                y1={(bridgeRoom.y + dims(bridgeRoom).h / 2) * TILE}
                x2={CHASSIS.w * TILE + 120}
                y2={(bridgeRoom.y + dims(bridgeRoom).h / 2) * TILE - 40}
                stroke="#22d3ee"
                strokeWidth={5}
                strokeLinecap="round"
                opacity={0.85}
              />
            </g>
          )}

          {/* Rooms & Interior Tiles */}
          {activeLayout.map((p) => {
            const def = ROOMS[p.id];
            const { w, h } = dims(p);
            const cells = roomCells(p);
            const cCell = consoleCell(p);
            const hp = state.roomHp[p.id];
            const isManned = manned === p.id;
            const isHit = state.fx.hitRoom === p.id && state.fx.hitId > 0;
            const isSelected = editMode && selectedRoom === p.id;
            const hasOverlap = editMode && validation.overlaps.has(p.id);
            const isDisconnected = editMode && validation.disconnected.has(p.id);
            const badAirlock = editMode && p.id === 'airlock' && !validation.airlockOk;
            const hasError = hasOverlap || isDisconnected || badAirlock;
            const Icon = def.icon;
            const hatch = hatchOf(p);

            return (
              <g
                key={p.id}
                onPointerDown={(e) => handleRoomPointerDown(e, p)}
                onPointerMove={handleRoomPointerMove}
                onPointerUp={handleRoomPointerUp}
                onPointerCancel={handleRoomPointerUp}
                onMouseEnter={() => setHoveredRoom(p.id)}
                onMouseLeave={() => setHoveredRoom((prev) => (prev === p.id ? null : prev))}
                className={editMode ? 'room-drag-handle' : 'cursor-pointer'}
              >
                {/* Individual floor tiles */}
                {cells.map((c) => {
                  const alt = (c.x + c.y) % 2 === 1;
                  const onPath = !editMode && path.some((pc) => same(pc, c));
                  return (
                    <g
                      key={key(c)}
                      onClick={(e) => {
                        if (editMode) return;
                        e.stopPropagation();
                        onTileClick(c);
                      }}
                    >
                      <rect
                        x={c.x * TILE}
                        y={c.y * TILE}
                        width={TILE}
                        height={TILE}
                        fill={alt ? def.theme.floorAlt : def.theme.floor}
                        stroke="rgba(148, 163, 184, 0.16)"
                        strokeWidth={1}
                      />
                      {/* Subtle corner deck rivets */}
                      <circle cx={c.x * TILE + 5} cy={c.y * TILE + 5} r={1} fill="rgba(255,255,255,0.16)" />
                      <circle cx={(c.x + 1) * TILE - 5} cy={(c.y + 1) * TILE - 5} r={1} fill="rgba(255,255,255,0.16)" />
                      {onPath && (
                        <circle
                          cx={(c.x + 0.5) * TILE}
                          cy={(c.y + 0.5) * TILE}
                          r={5}
                          fill={def.theme.accent}
                          opacity={0.75}
                        />
                      )}
                    </g>
                  );
                })}

                {/* Room Outer Bulkhead Wall Border */}
                <rect
                  x={p.x * TILE + 1.5}
                  y={p.y * TILE + 1.5}
                  width={w * TILE - 3}
                  height={h * TILE - 3}
                  rx={6}
                  fill={hp === 0 ? 'rgba(239, 68, 68, 0.18)' : isHit ? 'rgba(239, 68, 68, 0.25)' : 'none'}
                  stroke={hasError ? '#ef4444' : isSelected ? '#ffffff' : def.theme.accent}
                  strokeWidth={isSelected ? 3.5 : 2.5}
                />

                {/* Airlock Exterior Hatch Striping */}
                {hatch && (
                  <g>
                    {hatch.cells.map((hc) => {
                      const hx = hc.x * TILE;
                      const hy = hc.y * TILE;
                      const strip =
                        hatch.dir === 'S'
                          ? { x: hx + 6, y: hy + TILE - 6, w: TILE - 12, h: 6 }
                          : hatch.dir === 'N'
                            ? { x: hx + 6, y: hy, w: TILE - 12, h: 6 }
                            : hatch.dir === 'E'
                              ? { x: hx + TILE - 6, y: hy + 6, w: 6, h: TILE - 12 }
                              : { x: hx, y: hy + 6, w: 6, h: TILE - 12 };
                      return (
                        <rect
                          key={key(hc)}
                          x={strip.x}
                          y={strip.y}
                          width={strip.w}
                          height={strip.h}
                          fill={airlockExposed(activeLayout, occ) ? '#fbbf24' : '#ef4444'}
                          rx={2}
                        />
                      );
                    })}
                  </g>
                )}

                {/* Interactive Glowing Console Tile */}
                <g
                  onClick={(e) => {
                    if (editMode) return;
                    e.stopPropagation();
                    onConsoleClick(p.id, cCell);
                  }}
                >
                  <rect
                    x={cCell.x * TILE + 7}
                    y={cCell.y * TILE + 7}
                    width={TILE - 14}
                    height={TILE - 14}
                    rx={8}
                    fill={isManned ? 'rgba(34, 197, 94, 0.28)' : 'rgba(15, 23, 42, 0.82)'}
                    stroke={isManned ? '#4ade80' : def.theme.accent}
                    strokeWidth={2}
                    className="animate-pulseGlow"
                  />
                  {/* Console terminal screen bar */}
                  <rect
                    x={cCell.x * TILE + 13}
                    y={cCell.y * TILE + 12}
                    width={TILE - 26}
                    height={9}
                    rx={2}
                    fill={isManned ? '#4ade80' : def.theme.accent}
                    opacity={0.9}
                  />
                  <text
                    x={(cCell.x + 0.5) * TILE}
                    y={(cCell.y + 0.72) * TILE}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize={9}
                    fontWeight={700}
                    fontFamily="monospace"
                  >
                    [E]
                  </text>
                </g>

                {/* Central Room Icon, Name, Health Pips, and Manned Badge */}
                <foreignObject
                  x={p.x * TILE}
                  y={p.y * TILE}
                  width={w * TILE}
                  height={h * TILE}
                  className="pointer-events-none"
                >
                  <div className="w-full h-full flex flex-col items-center justify-between p-1.5">
                    {/* Top row: Room Name + Health Bar Pips */}
                    <div className="w-full flex items-center justify-between gap-1 px-1">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider truncate px-1.5 py-0.5 rounded bg-slate-950/85 border border-white/10"
                        style={{ color: def.theme.accent }}
                      >
                        {def.name}
                      </span>
                      <div className="flex items-center gap-0.5 bg-slate-950/85 px-1 py-0.5 rounded border border-white/10">
                        {Array.from({ length: def.maxHp }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-2 h-2 rounded-[2px] ${
                              i < hp
                                ? hp <= 1
                                  ? 'bg-red-400'
                                  : 'bg-emerald-400'
                                : 'bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Center Watermark Icon */}
                    <div
                      className="flex items-center justify-center rounded-full p-2 border"
                      style={{
                        backgroundColor: 'rgba(2, 6, 23, 0.55)',
                        borderColor: `${def.theme.accent}55`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: def.theme.accent }} />
                    </div>

                    {/* Bottom row: MANNED (+25%) Badge or Edit Rotate Button */}
                    <div className="w-full flex items-center justify-center min-h-[20px]">
                      {!editMode && isManned && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide bg-emerald-500/25 text-emerald-300 border border-emerald-400/70 shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                          <UserCheck className="w-2.5 h-2.5" />
                          MANNED (+25%)
                        </span>
                      )}
                      {!editMode && !isManned && hp < def.maxHp && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/25 text-red-300 border border-red-400/50">
                          <Wrench className="w-2.5 h-2.5" />
                          DAMAGED
                        </span>
                      )}
                      {editMode && (
                        <button
                          type="button"
                          onClick={(e) => rotateSelected(p.id, e)}
                          className="pointer-events-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/90 hover:bg-slate-800 text-cyan-200 border border-cyan-400/50"
                        >
                          <RotateCw className="w-2.5 h-2.5" />
                          Rotate
                        </button>
                      )}
                    </div>
                  </div>
                </foreignObject>
              </g>
            );
          })}

          {/* Automatic Sliding Doors Between Adjacent Rooms */}
          {doors.map((d) => {
            const open = !editMode && isDoorOpen(d.a, d.b);
            const verticalWall = d.a.x !== d.b.x;
            const wx = Math.max(d.a.x, d.b.x) * TILE;
            const wy = Math.max(d.a.y, d.b.y) * TILE;
            if (verticalWall) {
              const cy = (d.a.y + 0.5) * TILE;
              const leaf = open ? 5 : 13;
              return (
                <g key={d.id}>
                  <rect x={wx - 4} y={cy - 15} width={8} height={30} fill="#020617" />
                  <rect
                    x={wx - 3}
                    y={cy - 14}
                    width={6}
                    height={leaf}
                    rx={1.5}
                    fill={open ? '#22d3ee' : '#94a3b8'}
                  />
                  <rect
                    x={wx - 3}
                    y={cy + 14 - leaf}
                    width={6}
                    height={leaf}
                    rx={1.5}
                    fill={open ? '#22d3ee' : '#94a3b8'}
                  />
                </g>
              );
            } else {
              const cx = (d.a.x + 0.5) * TILE;
              const leaf = open ? 5 : 13;
              return (
                <g key={d.id}>
                  <rect x={cx - 15} y={wy - 4} width={30} height={8} fill="#020617" />
                  <rect
                    x={cx - 14}
                    y={wy - 3}
                    width={leaf}
                    height={6}
                    rx={1.5}
                    fill={open ? '#22d3ee' : '#94a3b8'}
                  />
                  <rect
                    x={cx + 14 - leaf}
                    y={wy - 3}
                    width={leaf}
                    height={6}
                    rx={1.5}
                    fill={open ? '#22d3ee' : '#94a3b8'}
                  />
                </g>
              );
            }
          })}

          {/* Docked Partner Ship & Boarding Tube (Supports both Derelict/Trader Docking and Mothership Co-Op) */}
          {dock && (state.docked || (state.mothership.active && state.mothership.partner)) && (
            <g>
              {/* Pressurized Docking Tunnel with Magnetic Accordion Clamps */}
              {dock.tube.map((c) => (
                <g
                  key={key(c)}
                  onClick={() => onTileClick(c)}
                  className="cursor-pointer"
                >
                  <rect
                    x={c.x * TILE + 6}
                    y={c.y * TILE + 6}
                    width={TILE - 12}
                    height={TILE - 12}
                    rx={6}
                    fill="#1e293b"
                    stroke={state.mothership.active ? '#22d3ee' : '#fbbf24'}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  {/* Subtle magnetic clamp hatch lights */}
                  <circle
                    cx={(c.x + 0.5) * TILE}
                    cy={(c.y + 0.5) * TILE}
                    r={3}
                    fill={state.mothership.active ? '#22d3ee' : '#fbbf24'}
                    opacity={0.8}
                  />
                </g>
              ))}

              {/* Partner Ship Interior Grid */}
              {dock.partnerCells.map((c) => (
                <g
                  key={key(c)}
                  onClick={() => onTileClick(c)}
                  className="cursor-pointer"
                >
                  <rect
                    x={c.x * TILE}
                    y={c.y * TILE}
                    width={TILE}
                    height={TILE}
                    fill={
                      state.mothership.active
                        ? '#082f49'
                        : state.docked?.partner === 'derelict'
                          ? '#1c1917'
                          : '#172554'
                    }
                    stroke={state.mothership.active ? 'rgba(34, 211, 238, 0.4)' : 'rgba(251, 191, 36, 0.28)'}
                    strokeWidth={1}
                  />
                  {/* Deck rivets */}
                  <circle cx={c.x * TILE + 5} cy={c.y * TILE + 5} r={1} fill="rgba(255,255,255,0.2)" />
                  <circle cx={(c.x + 1) * TILE - 5} cy={(c.y + 1) * TILE - 5} r={1} fill="rgba(255,255,255,0.2)" />
                </g>
              ))}

              {/* Partner Hull Perimeter Border */}
              <rect
                x={dock.partner.x * TILE}
                y={dock.partner.y * TILE}
                width={dock.partner.w * TILE}
                height={dock.partner.h * TILE}
                rx={8}
                fill="none"
                stroke={state.mothership.active ? '#38bdf8' : '#fbbf24'}
                strokeWidth={2.5}
              />

              {/* Mothership Wingman Label & Status */}
              {state.mothership.active && state.mothership.partner && (
                <g className="pointer-events-none">
                  <rect
                    x={dock.partner.x * TILE + 8}
                    y={dock.partner.y * TILE - 20}
                    width={dock.partner.w * TILE - 16}
                    height={18}
                    rx={4}
                    fill="rgba(15, 23, 42, 0.85)"
                    stroke="#38bdf8"
                    strokeWidth={1}
                  />
                  <text
                    x={(dock.partner.x + dock.partner.w / 2) * TILE}
                    y={dock.partner.y * TILE - 7}
                    fill="#38bdf8"
                    fontSize={9}
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {state.mothership.primaryShip === 'partner' ? '★ PRIMARY HELM' : 'WINGMAN (MOTHERSHIP)'}
                  </text>
                </g>
              )}

              {/* Salvage / Gift Crates on Derelict/Trader Deck */}
              {state.docked?.crates.map((crate) => (
                <g
                  key={key(crate)}
                  onClick={() => onTileClick(crate)}
                  className="cursor-pointer"
                >
                  <rect
                    x={crate.x * TILE + 12}
                    y={crate.y * TILE + 12}
                    width={TILE - 24}
                    height={TILE - 24}
                    rx={6}
                    fill="rgba(251, 191, 36, 0.25)"
                    stroke="#fbbf24"
                    strokeWidth={2}
                  />
                  <foreignObject
                    x={crate.x * TILE + 12}
                    y={crate.y * TILE + 12}
                    width={TILE - 24}
                    height={TILE - 24}
                    className="pointer-events-none"
                  >
                    <div className="w-full h-full flex items-center justify-center text-amber-300">
                      <Package className="w-4 h-4" />
                    </div>
                  </foreignObject>
                </g>
              ))}

              {/* Partner Crew Member Sprite stationed in Mothership Wingman deck */}
              {state.mothership.active && state.mothership.partner && (
                <g
                  transform={`translate(${
                    ((state.partnerCrewPos?.x ?? dock.partnerCells[0]?.x ?? dock.partner.x) + 0.5) * TILE
                  }, ${
                    ((state.partnerCrewPos?.y ?? dock.partnerCells[0]?.y ?? dock.partner.y) + 0.5) * TILE
                  })`}
                  className="pointer-events-none"
                >
                  {/* Partner soft selection halo */}
                  <circle r={18} fill="rgba(251, 146, 60, 0.25)" stroke="#fb923c" strokeWidth={1.5} />
                  {/* Backpack */}
                  <rect x={-12} y={-8} width={7} height={16} rx={2.5} fill="#fdba74" stroke="#0f172a" strokeWidth={1.5} />
                  {/* Shoulders / Torso */}
                  <ellipse cx={-1} cy={0} rx={9} ry={12} fill="#ffedd5" stroke="#0f172a" strokeWidth={1.8} />
                  {/* Helmet dome */}
                  <circle cx={1} cy={0} r={8.5} fill="#fed7aa" stroke="#0f172a" strokeWidth={1.8} />
                  {/* Visor */}
                  <path d="M 1 -5.5 Q 8.5 0 1 5.5 Q 4.5 0 1 -5.5 Z" fill="#c084fc" stroke="#7e22ce" strokeWidth={1} />
                </g>
              )}
            </g>
          )}

          {/* Active EVA Spacewalk Tether & Floating Salvage Astronaut */}
          {!editMode && state.eva > 0 && airlockRoom && (
            <g>
              {(() => {
                const h = hatchOf(airlockRoom)!;
                const d = DIRS[h.dir];
                const startX = (h.mid.x + 0.5) * TILE;
                const startY = (h.mid.y + 0.5) * TILE;
                const evaCell = add(h.mid, d, 2);
                const endX = (evaCell.x + 0.5) * TILE;
                const endY = (evaCell.y + 0.5) * TILE;
                return (
                  <g>
                    <path
                      d={`M ${startX} ${startY} Q ${(startX + endX) / 2 + 18} ${(startY + endY) / 2 - 14} ${endX} ${endY}`}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={2.5}
                      strokeDasharray="5 4"
                    />
                    <circle
                      cx={endX}
                      cy={endY}
                      r={14}
                      fill="rgba(251, 191, 36, 0.2)"
                      stroke="#fbbf24"
                      strokeWidth={2}
                    />
                    <foreignObject x={endX - 12} y={endY - 12} width={24} height={24}>
                      <div className="w-full h-full flex items-center justify-center text-amber-300">
                        <Sparkles className="w-4 h-4 animate-spin" />
                      </div>
                    </foreignObject>
                  </g>
                );
              })()}
            </g>
          )}

          {/* Top-Down Astronaut Player Crew Sprite */}
          {!editMode && (
            <g
              transform={`translate(${(crewPos.x + 0.5) * TILE}, ${(crewPos.y + 0.5) * TILE}) rotate(${DIR_ANGLE[['E', 'S', 'W', 'N'][crewFacing] as Dir] ?? 0})`}
              className="pointer-events-none"
            >
              {/* Soft selection halo */}
              <circle
                r={18}
                fill={state.crew.restBuff > 0 ? 'rgba(192, 132, 252, 0.22)' : 'rgba(34, 211, 238, 0.2)'}
                stroke={state.crew.restBuff > 0 ? '#c084fc' : '#22d3ee'}
                strokeWidth={1.5}
              />
              {/* Life-support backpack */}
              <rect x={-12} y={-8} width={7} height={16} rx={2.5} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.5} />
              {/* Shoulders / Suit torso */}
              <ellipse cx={-1} cy={0} rx={9} ry={12} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.8} />
              {/* Helmet dome */}
              <circle cx={1} cy={0} r={8.5} fill="#ffffff" stroke="#0f172a" strokeWidth={1.8} />
              {/* Gold/Cyan reflective visor facing forward (+X) */}
              <path
                d="M 1 -5.5 Q 8.5 0 1 5.5 Q 4.5 0 1 -5.5 Z"
                fill="#22d3ee"
                stroke="#0284c7"
                strokeWidth={1}
              />
            </g>
          )}
        </g>
      </svg>

      {/* Plain-Language Room Tooltip Banner (Minimal Text, Icon-First) */}
      {hoveredDef && !editMode && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-slate-700/80 shadow-lg backdrop-blur-md">
          <hoveredDef.icon className="w-4 h-4 shrink-0" style={{ color: hoveredDef.theme.accent }} />
          <span className="text-xs font-bold text-white">{hoveredDef.name}:</span>
          <span className="text-xs text-slate-300">{hoveredDef.label}</span>
        </div>
      )}
    </div>
  );
};
