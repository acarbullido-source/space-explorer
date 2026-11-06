import type { NodeType, SectorNode } from './types';

/** Mutable seed holder so reducers stay deterministic. */
export interface Rng {
  seed: number;
}

/** mulberry32 */
export function rand(r: Rng): number {
  r.seed = (r.seed + 0x6d2b79f5) | 0;
  let t = r.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const randInt = (r: Rng, min: number, max: number) => min + Math.floor(rand(r) * (max - min + 1));
export const pick = <T,>(r: Rng, arr: readonly T[]): T => arr[Math.floor(rand(r) * arr.length)];

function weightedType(r: Rng, sector: number, col: number): NodeType {
  const table: [NodeType, number][] = [
    ['hostile', sector === 1 && col === 1 ? 0 : 18 + sector * 4],
    ['junk', 18],
    ['derelict', 14],
    ['trader', 12],
    ['distress', 12],
    ['relay', 10],
    ['empty', 8],
    ['shop', 8],
  ];
  const total = table.reduce((s, [, w]) => s + w, 0);
  let roll = rand(r) * total;
  for (const [t, w] of table) {
    roll -= w;
    if (roll <= 0) return t;
  }
  return 'empty';
}

export const SECTOR_COLS = 6;

export function generateSector(r: Rng, sector: number): SectorNode[] {
  const nodes: SectorNode[] = [];
  const cols: number[][] = [];
  for (let c = 0; c < SECTOR_COLS; c++) {
    const edge = c === 0 || c === SECTOR_COLS - 1;
    const count = edge ? 1 : randInt(r, 2, 3);
    cols.push([]);
    for (let i = 0; i < count; i++) {
      const y = count === 1 ? 0.5 : 0.18 + (i / (count - 1)) * 0.64 + (rand(r) - 0.5) * 0.12;
      const x = 0.07 + c * (0.86 / (SECTOR_COLS - 1)) + (edge ? 0 : (rand(r) - 0.5) * 0.06);
      const type: NodeType =
        c === 0 ? (sector === 1 ? 'garage' : 'relay') : c === SECTOR_COLS - 1 ? 'exit' : weightedType(r, sector, c);
      const relay = type === 'garage' || type === 'relay' || type === 'shop' || type === 'exit' || rand(r) < 0.35;
      nodes.push({ id: nodes.length, x, y, col: c, type, relay, links: [], visited: c === 0 });
      cols[c].push(nodes.length - 1);
    }
  }
  if (!nodes.some((n) => n.type === 'shop')) {
    const shopNode = nodes[pick(r, cols[randInt(r, 2, 3)])];
    shopNode.type = 'shop';
    shopNode.relay = true;
  }

  const link = (a: number, b: number) => {
    if (nodes[a].links.includes(b)) return;
    nodes[a].links.push(b);
    nodes[b].links.push(a);
  };
  for (let c = 0; c < SECTOR_COLS - 1; c++) {
    const next = cols[c + 1];
    for (const a of cols[c]) {
      const sorted = [...next].sort((u, v) => Math.abs(nodes[u].y - nodes[a].y) - Math.abs(nodes[v].y - nodes[a].y));
      link(a, sorted[0]);
      if (sorted[1] !== undefined && rand(r) < 0.5) link(a, sorted[1]);
    }
    for (const b of next) {
      if (nodes[b].links.some((l) => nodes[l].col === c)) continue;
      const nearest = [...cols[c]].sort(
        (u, v) => Math.abs(nodes[u].y - nodes[b].y) - Math.abs(nodes[v].y - nodes[b].y),
      )[0];
      link(nearest, b);
    }
  }
  return nodes;
}
