import { ROOMS } from './rooms';
import type { Cell, Dir, Layout, PlacedRoom, RoomId, Rot } from './types';

/** SVG units per tile */
export const TILE = 56;
/** Chassis grid the rooms can be arranged on */
export const CHASSIS = { w: 13, h: 8 };

export const key = (c: Cell) => `${c.x},${c.y}`;
export const same = (a: Cell | null | undefined, b: Cell | null | undefined) =>
  !!a && !!b && a.x === b.x && a.y === b.y;

export const DIRS: Record<Dir, Cell> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};
const ORDER: Dir[] = ['N', 'E', 'S', 'W'];
export const DIR_ANGLE: Record<Dir, number> = { E: 0, S: 90, W: 180, N: -90 };

export const rotateDir = (d: Dir, rot: number): Dir => ORDER[(ORDER.indexOf(d) + rot) % 4];
export const add = (a: Cell, b: Cell, k = 1): Cell => ({ x: a.x + b.x * k, y: a.y + b.y * k });

export function dims(p: PlacedRoom) {
  const d = ROOMS[p.id];
  return p.rot % 2 === 0 ? { w: d.w, h: d.h } : { w: d.h, h: d.w };
}

/** Rotate a local cell clockwise `rot` quarter turns inside a w×h footprint. */
function rotLocal(c: Cell, w: number, h: number, rot: Rot): Cell {
  switch (rot) {
    case 0:
      return { x: c.x, y: c.y };
    case 1:
      return { x: h - 1 - c.y, y: c.x };
    case 2:
      return { x: w - 1 - c.x, y: h - 1 - c.y };
    case 3:
      return { x: c.y, y: w - 1 - c.x };
  }
}

export function roomCells(p: PlacedRoom): Cell[] {
  const d = ROOMS[p.id];
  const out: Cell[] = [];
  for (let ly = 0; ly < d.h; ly++)
    for (let lx = 0; lx < d.w; lx++) {
      const l = rotLocal({ x: lx, y: ly }, d.w, d.h, p.rot);
      out.push({ x: p.x + l.x, y: p.y + l.y });
    }
  return out;
}

export function consoleCell(p: PlacedRoom): Cell {
  const d = ROOMS[p.id];
  const l = rotLocal(d.console, d.w, d.h, p.rot);
  return { x: p.x + l.x, y: p.y + l.y };
}

export function occupancy(layout: Layout): Map<string, RoomId> {
  const m = new Map<string, RoomId>();
  for (const p of layout) for (const c of roomCells(p)) m.set(key(c), p.id);
  return m;
}

export function hatchOf(p: PlacedRoom): { dir: Dir; cells: Cell[]; mid: Cell } | null {
  const def = ROOMS[p.id];
  if (!def.hatch) return null;
  const dir = rotateDir(def.hatch, p.rot);
  const cells = roomCells(p);
  const set = new Set(cells.map(key));
  const edge = cells
    .filter((c) => !set.has(key(add(c, DIRS[dir]))))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  return { dir, cells: edge, mid: edge[Math.floor((edge.length - 1) / 2)] };
}

export function airlockExposed(layout: Layout, occ = occupancy(layout)): boolean {
  const a = layout.find((r) => r.id === 'airlock');
  if (!a) return false;
  const h = hatchOf(a)!;
  return h.cells.every((c) => !occ.has(key(add(c, DIRS[h.dir]))));
}

/** Which side of a room faces open space (first match from `prefer`). */
export function exposedSide(p: PlacedRoom, occ: Map<string, string>, prefer: Dir[]): Dir | null {
  const cells = roomCells(p);
  const set = new Set(cells.map(key));
  for (const dir of prefer) {
    const edge = cells.filter((c) => !set.has(key(add(c, DIRS[dir]))));
    if (edge.length && edge.every((c) => !occ.has(key(add(c, DIRS[dir]))))) return dir;
  }
  return null;
}

export interface Door {
  id: string;
  a: Cell;
  b: Cell;
  rooms: [string, string];
}

/** One automatic sliding door in the middle of every wall shared by two rooms. */
export function computeDoors(layout: Layout, occ = occupancy(layout)): Door[] {
  const groups = new Map<string, { a: Cell; b: Cell; ra: RoomId; rb: RoomId }[]>();
  for (const p of layout)
    for (const c of roomCells(p)) {
      if (occ.get(key(c)) !== p.id) continue;
      for (const dir of ['E', 'S'] as Dir[]) {
        const n = add(c, DIRS[dir]);
        const rb = occ.get(key(n));
        if (!rb || rb === p.id) continue;
        const id = [p.id, rb].sort().join('|');
        const list = groups.get(id) ?? [];
        list.push({ a: c, b: n, ra: p.id, rb });
        groups.set(id, list);
      }
    }
  return [...groups].map(([id, list]) => {
    list.sort((u, v) => u.a.y - v.a.y || u.a.x - v.a.x);
    const m = list[Math.floor(list.length / 2)];
    return { id, a: m.a, b: m.b, rooms: [m.ra, m.rb] };
  });
}

export interface DockInfo {
  dir: Dir;
  hatch: Cell;
  tube: Cell[];
  entry: Cell;
  partner: { x: number; y: number; w: number; h: number };
  partnerCells: Cell[];
  crateSpots: Cell[];
}

/** Where a partner ship attaches when the docking clamps engage. */
export function computeDock(layout: Layout): DockInfo | null {
  const a = layout.find((r) => r.id === 'airlock');
  if (!a) return null;
  const h = hatchOf(a)!;
  const d = DIRS[h.dir];
  const perp = d.x === 0 ? { x: 1, y: 0 } : { x: 0, y: 1 };
  const occ = occupancy(layout);
  for (let gap = 1; gap <= 4; gap++) {
    const tube = Array.from({ length: gap }, (_, i) => add(h.mid, d, i + 1));
    const entry = add(h.mid, d, gap + 1);
    const cells: Cell[] = [];
    for (let depth = 0; depth < 3; depth++)
      for (let o = -1; o <= 1; o++) cells.push(add(add(entry, d, depth), perp, o));
    if ([...tube, ...cells].some((c) => occ.has(key(c)))) continue;
    const xs = cells.map((c) => c.x);
    const ys = cells.map((c) => c.y);
    const far = add(entry, d, 2);
    return {
      dir: h.dir,
      hatch: h.mid,
      tube,
      entry,
      partner: { x: Math.min(...xs), y: Math.min(...ys), w: 3, h: 3 },
      partnerCells: cells,
      crateSpots: [add(far, perp, -1), add(far, perp, 1)],
    };
  }
  return null;
}

export interface MothershipDockInfo {
  dir: Dir;
  /** Pressurized airlock collar tiles connecting both ships */
  collar: Cell[];
  /** Doorway pairs linking player airlock <-> collar <-> partner airlock */
  collarLinks: [Cell, Cell][];
  /** Partner's 6-room layout rigidly rotated and shifted into local world space */
  partnerLayout: Layout;
  /** Partner ship bounding box in local world space */
  partnerBounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Quarter-turns clockwise applied to partnerBaseLayout */
  rotSteps: Rot;
  /** Translation applied after rotation */
  shift: Cell;
  /** Map a fractional or integer point from partner's local grid to our world grid */
  mapPartnerPointToWorld: (pt: { x: number; y: number }) => { x: number; y: number };
  /** Map an integer cell from partner's local grid to our world grid */
  mapPartnerCellToWorld: (c: Cell) => Cell;
  /** Map an integer cell from our world grid back to partner's local grid */
  mapWorldToPartnerCell: (c: Cell) => Cell;
}

const OPPOSITE_DIR: Record<Dir, Dir> = {
  N: 'S',
  S: 'N',
  E: 'W',
  W: 'E',
};

function rotatePointInChassisCw(
  pt: { x: number; y: number },
  rotSteps: Rot,
): { x: number; y: number } {
  const cw = CHASSIS.w;
  const ch = CHASSIS.h;
  switch (rotSteps) {
    case 0:
      return { x: pt.x, y: pt.y };
    case 1:
      return { x: ch - 1 - pt.y, y: pt.x };
    case 2:
      return { x: cw - 1 - pt.x, y: ch - 1 - pt.y };
    case 3:
      return { x: pt.y, y: cw - 1 - pt.x };
  }
}

function invRotatePointInChassisCw(
  pt: { x: number; y: number },
  rotSteps: Rot,
): { x: number; y: number } {
  const cw = CHASSIS.w;
  const ch = CHASSIS.h;
  switch (rotSteps) {
    case 0:
      return { x: pt.x, y: pt.y };
    case 1:
      return { x: pt.y, y: ch - 1 - pt.x };
    case 2:
      return { x: cw - 1 - pt.x, y: ch - 1 - pt.y };
    case 3:
      return { x: cw - 1 - pt.y, y: pt.x };
  }
}

function rotateLayoutInChassisCw(baseLayout: Layout, rotSteps: Rot): Layout {
  let cur: Layout = baseLayout.map((p) => ({ ...p }));
  let boxW = CHASSIS.w;
  let boxH = CHASSIS.h;
  for (let s = 0; s < rotSteps; s++) {
    cur = cur.map((p) => {
      const { h } = dims(p);
      return {
        id: p.id,
        x: boxH - p.y - h,
        y: p.x,
        rot: ((p.rot + 1) % 4) as Rot,
      };
    });
    const tmp = boxW;
    boxW = boxH;
    boxH = tmp;
  }
  return cur;
}

/**
 * Merge two full 6-room ship layouts at their Airlock collars with an exact
 * invertible rigid transformation so both players can walk seamlessly across either ship.
 */
export function computeMothershipDock(
  playerLayout: Layout,
  partnerBaseLayout: Layout,
): MothershipDockInfo | null {
  const a1 = playerLayout.find((r) => r.id === 'airlock');
  const a2Base = partnerBaseLayout.find((r) => r.id === 'airlock');
  if (!a1 || !a2Base) return null;

  const h1 = hatchOf(a1);
  const h2Base = hatchOf(a2Base);
  if (!h1 || !h2Base || h1.cells.length === 0 || h2Base.cells.length === 0) return null;

  const targetDir = OPPOSITE_DIR[h1.dir];
  const rotSteps = ((ORDER.indexOf(targetDir) - ORDER.indexOf(h2Base.dir) + 4) % 4) as Rot;
  const rotatedPartner = rotateLayoutInChassisCw(partnerBaseLayout, rotSteps);
  const a2Rot = rotatedPartner.find((r) => r.id === 'airlock');
  if (!a2Rot) return null;
  const h2Rot = hatchOf(a2Rot);
  if (!h2Rot || h2Rot.cells.length === 0) return null;

  const occ1 = occupancy(playerLayout);
  const d1 = DIRS[h1.dir];
  const pairCount = Math.min(h1.cells.length, h2Rot.cells.length);

  for (let gap = 2; gap <= 6; gap++) {
    const targetHatch0 = add(h1.cells[0], d1, gap + 1);
    const shift: Cell = {
      x: targetHatch0.x - h2Rot.cells[0].x,
      y: targetHatch0.y - h2Rot.cells[0].y,
    };

    const partnerLayout: Layout = rotatedPartner.map((p) => ({
      ...p,
      x: p.x + shift.x,
      y: p.y + shift.y,
    }));
    const occ2 = occupancy(partnerLayout);

    // Check ship-to-ship overlap
    let overlap = false;
    for (const k of occ2.keys()) {
      if (occ1.has(k)) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    const collar: Cell[] = [];
    const collarLinks: [Cell, Cell][] = [];
    for (let i = 0; i < pairCount; i++) {
      const cStart = h1.cells[i];
      const cEnd: Cell = {
        x: h2Rot.cells[i].x + shift.x,
        y: h2Rot.cells[i].y + shift.y,
      };
      const lane = Array.from({ length: gap }, (_, s) => add(cStart, d1, s + 1));
      for (const lc of lane) {
        if (occ1.has(key(lc)) || occ2.has(key(lc))) {
          overlap = true;
          break;
        }
        collar.push(lc);
      }
      if (overlap) break;
      collarLinks.push([cStart, lane[0]]);
      collarLinks.push([lane[lane.length - 1], cEnd]);
    }
    if (overlap) continue;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of partnerLayout) {
      const { w, h } = dims(p);
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + w);
      maxY = Math.max(maxY, p.y + h);
    }

    return {
      dir: h1.dir,
      collar,
      collarLinks,
      partnerLayout,
      partnerBounds: { minX, minY, maxX, maxY },
      rotSteps,
      shift,
      mapPartnerPointToWorld: (pt) => {
        const r = rotatePointInChassisCw(pt, rotSteps);
        return { x: r.x + shift.x, y: r.y + shift.y };
      },
      mapPartnerCellToWorld: (c) => {
        const r = rotatePointInChassisCw(c, rotSteps);
        return { x: Math.round(r.x + shift.x), y: Math.round(r.y + shift.y) };
      },
      mapWorldToPartnerCell: (c) => {
        const unshifted = { x: c.x - shift.x, y: c.y - shift.y };
        const l = invRotatePointInChassisCw(unshifted, rotSteps);
        return { x: Math.round(l.x), y: Math.round(l.y) };
      },
    };
  }

  return null;
}

export interface Walk {
  roomAt: Map<string, string>;
  doorSet: Set<string>;
}

export function buildWalk(
  layout: Layout,
  dock: DockInfo | null,
  mothershipDock: MothershipDockInfo | null = null,
): Walk {
  const occ = occupancy(layout);
  const roomAt = new Map<string, string>(occ);
  const doorSet = new Set<string>();
  const link = (a: Cell, b: Cell) => {
    doorSet.add(`${key(a)}|${key(b)}`);
    doorSet.add(`${key(b)}|${key(a)}`);
  };
  for (const d of computeDoors(layout, occ)) link(d.a, d.b);

  if (mothershipDock) {
    const partnerOcc = occupancy(mothershipDock.partnerLayout);
    for (const [cellKey, rId] of partnerOcc.entries()) {
      roomAt.set(cellKey, `partner:${rId}`);
    }
    for (const d of computeDoors(mothershipDock.partnerLayout, partnerOcc)) {
      link(d.a, d.b);
    }
    for (const c of mothershipDock.collar) {
      roomAt.set(key(c), 'collar');
    }
    for (const [ca, cb] of mothershipDock.collarLinks) {
      link(ca, cb);
    }
  }

  if (dock) {
    dock.tube.forEach((c) => roomAt.set(key(c), 'tube'));
    dock.partnerCells.forEach((c) => roomAt.set(key(c), 'partner'));
    link(dock.hatch, dock.tube[0]);
    link(dock.tube[dock.tube.length - 1], dock.entry);
  }
  return { roomAt, doorSet };
}

export function canStep(w: Walk, a: Cell, b: Cell): boolean {
  if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) return false;
  const ra = w.roomAt.get(key(a));
  const rb = w.roomAt.get(key(b));
  if (!ra || !rb) return false;
  if (ra === rb) return true;
  return w.doorSet.has(`${key(a)}|${key(b)}`);
}

/** Breadth-first path. Returns the steps after `from` (empty if already there). */
export function findPath(w: Walk, from: Cell, to: Cell): Cell[] | null {
  if (!w.roomAt.has(key(to))) return null;
  if (same(from, to)) return [];
  const prev = new Map<string, Cell | null>([[key(from), null]]);
  const queue: Cell[] = [from];
  while (queue.length) {
    const c = queue.shift()!;
    for (const d of Object.values(DIRS)) {
      const n = add(c, d);
      const k = key(n);
      if (prev.has(k) || !canStep(w, c, n)) continue;
      prev.set(k, c);
      if (same(n, to)) {
        const path: Cell[] = [n];
        let p = c;
        while (!same(p, from)) {
          path.unshift(p);
          p = prev.get(key(p))!;
        }
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

export interface Validation {
  overlaps: Set<RoomId>;
  outOfBounds: Set<RoomId>;
  disconnected: Set<RoomId>;
  airlockOk: boolean;
  valid: boolean;
}

export function inBounds(p: PlacedRoom) {
  const { w, h } = dims(p);
  return p.x >= 0 && p.y >= 0 && p.x + w <= CHASSIS.w && p.y + h <= CHASSIS.h;
}

export function clampRoom(p: PlacedRoom): PlacedRoom {
  const { w, h } = dims(p);
  return {
    ...p,
    x: Math.max(0, Math.min(CHASSIS.w - w, p.x)),
    y: Math.max(0, Math.min(CHASSIS.h - h, p.y)),
  };
}

export function validateLayout(layout: Layout): Validation {
  const counts = new Map<string, RoomId[]>();
  for (const p of layout)
    for (const c of roomCells(p)) {
      const list = counts.get(key(c)) ?? [];
      list.push(p.id);
      counts.set(key(c), list);
    }
  const overlaps = new Set<RoomId>();
  counts.forEach((ids) => ids.length > 1 && ids.forEach((id) => overlaps.add(id)));
  const outOfBounds = new Set<RoomId>(layout.filter((p) => !inBounds(p)).map((p) => p.id));

  const occ = occupancy(layout);
  const adj = new Map<string, Set<string>>();
  for (const d of computeDoors(layout, occ)) {
    const [a, b] = d.rooms;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  }
  const seen = new Set<string>(['bridge']);
  const queue = ['bridge'];
  while (queue.length) {
    const r = queue.shift()!;
    adj.get(r)?.forEach((n) => {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    });
  }
  const disconnected = new Set<RoomId>(layout.filter((p) => !seen.has(p.id)).map((p) => p.id));
  const airlockOk = airlockExposed(layout, occ);
  return {
    overlaps,
    outOfBounds,
    disconnected,
    airlockOk,
    valid: !overlaps.size && !outOfBounds.size && !disconnected.size && airlockOk,
  };
}

/** Rotate 90° clockwise around the room's centre, kept inside the chassis. */
export function rotateRoom(p: PlacedRoom): PlacedRoom {
  const before = dims(p);
  const cx = p.x + before.w / 2;
  const cy = p.y + before.h / 2;
  const next: PlacedRoom = { ...p, rot: ((p.rot + 1) % 4) as Rot };
  const after = dims(next);
  return clampRoom({ ...next, x: Math.round(cx - after.w / 2), y: Math.round(cy - after.h / 2) });
}

/** If the airlock hatch is blocked, turn it so the hatch faces open space. */
export function snapAirlock(layout: Layout): Layout {
  const idx = layout.findIndex((r) => r.id === 'airlock');
  if (idx < 0 || airlockExposed(layout)) return layout;
  const others = occupancy(layout.filter((r) => r.id !== 'airlock'));
  const base = layout[idx];
  for (let i = 1; i < 4; i++) {
    let cand: PlacedRoom = base;
    for (let k = 0; k < i; k++) cand = rotateRoom(cand);
    if (roomCells(cand).some((c) => others.has(key(c)))) continue;
    const next = layout.map((r, j) => (j === idx ? cand : r));
    if (airlockExposed(next)) return next;
  }
  return layout;
}
