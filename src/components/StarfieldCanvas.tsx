import React, { useEffect, useRef } from 'react';
import type { NodeType } from '../game/types';
import { getBiomeBySector, type BiomeId } from '../game/biomes';

interface Props {
  sector: number;
  nodeKind: NodeType;
  jumpFx: number;
  paused: boolean;
  junkCount: number;
  biome?: BiomeId;
  flareWarning?: boolean;
}

interface Star {
  x: number;
  y: number;
  r: number;
  layer: number;
  alpha: number;
  phase: number;
  hue: string;
}

interface Debris {
  angle: number;
  dist: number;
  speed: number;
  size: number;
  rot: number;
  rotSpeed: number;
  pts: [number, number][];
  glow: boolean;
}

export const StarfieldCanvas: React.FC<Props> = ({
  sector,
  nodeKind,
  jumpFx,
  paused,
  junkCount,
  biome,
  flareWarning,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({ sector, nodeKind, jumpFx, paused, junkCount, biome, flareWarning });
  propsRef.current = { sector, nodeKind, jumpFx, paused, junkCount, biome, flareWarning };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // 3 parallax star layers
    const hues = ['#e2e8f0', '#bae6fd', '#fde68a', '#ddd6fe'];
    const stars: Star[] = Array.from({ length: 190 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: (i % 3) * 0.55 + 0.6,
      layer: (i % 3) + 1,
      alpha: 0.35 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      hue: hues[i % hues.length],
    }));

    // Shattered Earth orbital debris chunks
    const debris: Debris[] = Array.from({ length: 42 }, (_, i) => {
      const sides = 5 + (i % 3);
      const pts: [number, number][] = [];
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        const rad = 0.62 + ((i * 17 + s * 31) % 38) / 100;
        pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
      }
      return {
        angle: (i / 42) * Math.PI * 2,
        dist: 170 + (i % 7) * 26 + (i * 13) % 35,
        speed: (0.00012 + (i % 5) * 0.00005) * (i % 2 === 0 ? 1 : -0.7),
        size: 4 + (i % 5) * 3.5,
        rot: i * 0.7,
        rotSpeed: (i % 2 === 0 ? 1 : -1) * 0.004,
        pts,
        glow: i % 5 === 0,
      };
    });

    let raf = 0;
    let running = true;
    let lastJump = propsRef.current.jumpFx;
    let warpStreak = 0;

    const onVisibility = (e: Event) => {
      const ev = e as CustomEvent & { skipped?: boolean };
      if (ev.skipped) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    container.addEventListener('contentvisibilityautostatechange', onVisibility);

    let t = 0;
    const loop = () => {
      if (!running) return;
      const {
        sector: curSec,
        nodeKind: kind,
        jumpFx: jfx,
        paused: isPaused,
        junkCount: junk,
        biome: curBiomeProp,
        flareWarning: isFlareWarning,
      } = propsRef.current;

      const activeBiome = curBiomeProp ?? getBiomeBySector(curSec).id;

      if (jfx !== lastJump) {
        lastJump = jfx;
        warpStreak = 1;
      }
      warpStreak = Math.max(0, warpStreak - 0.035);
      const dt = isPaused ? 0.2 : 1;
      t += 0.016 * dt;

      // 1. Base space backdrop with biome-specific color tints
      const bg = ctx.createRadialGradient(
        width * 0.22,
        height * 0.82,
        40,
        width * 0.5,
        height * 0.5,
        Math.max(width, height),
      );

      if (activeBiome === 'helios_forge') {
        bg.addColorStop(0, '#2d0f08');
        bg.addColorStop(0.45, '#140604');
        bg.addColorStop(1, '#050202');
      } else if (activeBiome === 'dark_graveyard') {
        bg.addColorStop(0, '#10061e');
        bg.addColorStop(0.45, '#05030b');
        bg.addColorStop(1, '#020104');
      } else if (activeBiome === 'beacon_highway') {
        bg.addColorStop(0, '#091c28');
        bg.addColorStop(0.45, '#040d16');
        bg.addColorStop(1, '#020509');
      } else if (activeBiome === 'fracture_frontier') {
        bg.addColorStop(0, '#061a14');
        bg.addColorStop(0.45, '#080816');
        bg.addColorStop(1, '#030209');
      } else {
        // Shattered Cradle (Default)
        bg.addColorStop(0, '#1a0f1e');
        bg.addColorStop(0.45, '#070b16');
        bg.addColorStop(1, '#020409');
      }

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // 2. Ambient Nebula Wash
      const neb = ctx.createRadialGradient(
        width * 0.78,
        height * 0.22,
        10,
        width * 0.78,
        height * 0.22,
        width * 0.55,
      );

      if (activeBiome === 'helios_forge') {
        neb.addColorStop(0, 'rgba(249, 115, 22, 0.16)');
        neb.addColorStop(0.5, 'rgba(239, 68, 68, 0.08)');
      } else if (activeBiome === 'dark_graveyard') {
        neb.addColorStop(0, 'rgba(168, 85, 247, 0.12)');
        neb.addColorStop(0.5, 'rgba(99, 102, 241, 0.06)');
      } else if (activeBiome === 'beacon_highway') {
        neb.addColorStop(0, 'rgba(34, 211, 238, 0.12)');
        neb.addColorStop(0.5, 'rgba(234, 179, 8, 0.06)');
      } else if (activeBiome === 'fracture_frontier') {
        neb.addColorStop(0, 'rgba(16, 185, 129, 0.14)');
        neb.addColorStop(0.5, 'rgba(192, 132, 252, 0.08)');
      } else {
        neb.addColorStop(0, 'rgba(34, 211, 238, 0.09)');
        neb.addColorStop(0.5, 'rgba(168, 85, 247, 0.05)');
      }
      neb.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, width, height);

      // 3. Parallax stars
      const speedMul = 1 + warpStreak * 28;
      for (const s of stars) {
        s.x -= 0.00018 * s.layer * dt * speedMul;
        if (s.x < 0) s.x += 1;
        const sx = s.x * width;
        const sy = s.y * height;
        const twinkle = 0.65 + 0.35 * Math.sin(t * 2 + s.phase);
        ctx.globalAlpha = s.alpha * twinkle;
        ctx.strokeStyle = s.hue;
        ctx.fillStyle = s.hue;
        if (warpStreak > 0.05) {
          ctx.lineWidth = s.r;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + warpStreak * 55 * s.layer, sy);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // =====================================================================
      // 4. DISTINCT CELESTIAL BACKGROUNDS PER BIOME
      // =====================================================================

      if (activeBiome === 'helios_forge') {
        // --- HELIOS FORGE: Red Giant Binary Suns & Coronal Flares ---
        const s1x = width * 0.18;
        const s1y = height * 0.78;
        const s1r = Math.min(width, height) * 0.22;

        const s2x = width * 0.32;
        const s2y = height * 0.68;
        const s2r = Math.min(width, height) * 0.14;

        // Flare warning pulse
        if (isFlareWarning) {
          ctx.save();
          const flarePulse = 0.2 + 0.15 * Math.sin(t * 8);
          ctx.fillStyle = `rgba(239, 68, 68, ${flarePulse})`;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }

        // Sun 1 (Primary Red Giant)
        const g1 = ctx.createRadialGradient(s1x, s1y, s1r * 0.2, s1x, s1y, s1r * 2.2);
        g1.addColorStop(0, 'rgba(255, 237, 213, 0.95)');
        g1.addColorStop(0.35, 'rgba(249, 115, 22, 0.85)');
        g1.addColorStop(0.7, 'rgba(239, 68, 68, 0.45)');
        g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g1;
        ctx.beginPath();
        ctx.arc(s1x, s1y, s1r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Sun 2 (Secondary Binary Partner)
        const g2 = ctx.createRadialGradient(s2x, s2y, s2r * 0.2, s2x, s2y, s2r * 1.8);
        g2.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
        g2.addColorStop(0.4, 'rgba(245, 158, 11, 0.8)');
        g2.addColorStop(0.8, 'rgba(220, 38, 38, 0.3)');
        g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(s2x, s2y, s2r * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Coronal Flare Magnetic Arches connecting the suns
        ctx.save();
        ctx.strokeStyle = isFlareWarning ? '#ef4444' : '#fb923c';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 20;
        ctx.lineWidth = isFlareWarning ? 4.5 : 2.5;
        const archWave = Math.sin(t * 3) * 20;
        ctx.beginPath();
        ctx.moveTo(s1x, s1y - s1r * 0.8);
        ctx.bezierCurveTo(
          (s1x + s2x) / 2,
          s1y - s1r * 1.6 + archWave,
          s2x,
          s2y - s2r * 1.6 - archWave,
          s2x,
          s2y - s2r * 0.7,
        );
        ctx.stroke();
        ctx.restore();
      } else if (activeBiome === 'dark_graveyard') {
        // --- DARK GRAVEYARD: Deep Nebula & Derelict Shipwrecks ---
        // Massive eerie violet clouds
        const nebDark = ctx.createRadialGradient(
          width * 0.35,
          height * 0.65,
          50,
          width * 0.35,
          height * 0.65,
          width * 0.6,
        );
        nebDark.addColorStop(0, 'rgba(126, 34, 206, 0.22)');
        nebDark.addColorStop(0.5, 'rgba(79, 70, 229, 0.12)');
        nebDark.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebDark;
        ctx.fillRect(0, 0, width, height);

        // Distant derelict ship hulks drifting in parallax
        const hulks = [
          { x: 0.24, y: 0.72, size: 45, rot: 0.35 + Math.sin(t * 0.3) * 0.05 },
          { x: 0.68, y: 0.32, size: 30, rot: -0.8 + Math.cos(t * 0.2) * 0.06 },
        ];
        ctx.save();
        for (const h of hulks) {
          const hx = width * h.x;
          const hy = height * h.y;
          ctx.translate(hx, hy);
          ctx.rotate(h.rot);
          ctx.fillStyle = '#090d16';
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-h.size * 0.6, -h.size * 0.2);
          ctx.lineTo(h.size * 0.5, -h.size * 0.35);
          ctx.lineTo(h.size * 0.7, 0);
          ctx.lineTo(h.size * 0.4, h.size * 0.35);
          ctx.lineTo(-h.size * 0.6, h.size * 0.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Broken engine glow
          ctx.fillStyle = 'rgba(192, 132, 252, 0.25)';
          ctx.fillRect(-h.size * 0.65, -h.size * 0.1, 4, h.size * 0.2);
          ctx.rotate(-h.rot);
          ctx.translate(-hx, -hy);
        }
        ctx.restore();
      } else if (activeBiome === 'beacon_highway') {
        // --- BEACON HIGHWAY: Intersecting Glowing Laser Conduits ---
        ctx.save();
        const lanes = [
          { y: height * 0.38, angle: 0.15, color: '#22d3ee' },
          { y: height * 0.62, angle: -0.12, color: '#eab308' },
        ];

        for (const lane of lanes) {
          ctx.strokeStyle = lane.color;
          ctx.shadowColor = lane.color;
          ctx.shadowBlur = 14;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([25, 15]);
          ctx.lineDashOffset = -t * 120;
          ctx.beginPath();
          ctx.moveTo(0, lane.y - width * Math.tan(lane.angle) * 0.5);
          ctx.lineTo(width, lane.y + width * Math.tan(lane.angle) * 0.5);
          ctx.stroke();

          // Beaming power pulses
          const pulseX = ((t * 220) % (width + 200)) - 100;
          const pulseY = lane.y + (pulseX - width * 0.5) * Math.tan(lane.angle);
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(pulseX, pulseY, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.setLineDash([]);
        ctx.restore();
      } else if (activeBiome === 'fracture_frontier') {
        // --- FRACTURE FRONTIER: Dimensional Spatial Rift / Wormhole ---
        const rx = width * 0.22;
        const ry = height * 0.78;
        const rr = Math.min(width, height) * 0.25;

        // Gravitational lens distortion rings
        ctx.save();
        for (let ring = 3; ring >= 1; ring--) {
          const ringRad = rr * (1 + ring * 0.35 + Math.sin(t * 2 + ring) * 0.08);
          ctx.strokeStyle = ring % 2 === 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(192, 132, 252, 0.4)';
          ctx.lineWidth = 2;
          ctx.setLineDash([12, 10]);
          ctx.lineDashOffset = t * 30 * (ring % 2 === 0 ? 1 : -1);
          ctx.beginPath();
          ctx.ellipse(rx, ry, ringRad, ringRad * 0.48, t * 0.2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Accretion vortex
        const riftGrad = ctx.createRadialGradient(rx, ry, rr * 0.05, rx, ry, rr);
        riftGrad.addColorStop(0, '#020617'); // Singularity black center
        riftGrad.addColorStop(0.35, '#042f2e');
        riftGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.6)');
        riftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = riftGrad;
        ctx.beginPath();
        ctx.ellipse(rx, ry, rr, rr * 0.5, t * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // --- SHATTERED CRADLE: Shattered Earth with Magma Fractures ---
        const ex = width * 0.16;
        const ey = height * 0.86;
        const er = Math.min(width, height) * 0.24;

        // Magma core glow
        const glow = ctx.createRadialGradient(ex, ey, er * 0.15, ex, ey, er * 1.45);
        glow.addColorStop(0, 'rgba(251, 146, 60, 0.42)');
        glow.addColorStop(0.45, 'rgba(239, 68, 68, 0.18)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ex, ey, er * 1.45, 0, Math.PI * 2);
        ctx.fill();

        // Broken planet body
        ctx.save();
        ctx.beginPath();
        ctx.arc(ex, ey, er, 0, Math.PI * 2);
        ctx.clip();

        const bodyGrad = ctx.createLinearGradient(ex - er, ey - er, ex + er, ey + er);
        bodyGrad.addColorStop(0, '#1e293b');
        bodyGrad.addColorStop(0.55, '#0f172a');
        bodyGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(ex - er, ey - er, er * 2, er * 2);

        // Glowing magma tectonic fractures
        ctx.strokeStyle = 'rgba(251, 113, 36, 0.78)';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.2;
        const cracks = [
          [[-0.7, -0.2], [-0.2, -0.05], [0.15, -0.35], [0.65, -0.15]],
          [[-0.4, 0.35], [0.05, 0.1], [0.4, 0.3], [0.75, 0.05]],
          [[-0.1, -0.65], [-0.2, -0.05], [0.05, 0.1], [-0.15, 0.6]],
        ];
        for (const path of cracks) {
          ctx.beginPath();
          path.forEach(([px, py], idx) => {
            const x = ex + px * er;
            const y = ey + py * er;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }
        ctx.restore();

        // Thin broken atmosphere rim
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ex, ey, er + 2, -Math.PI * 0.85, -Math.PI * 0.08);
        ctx.stroke();

        // Orbital satellite garage ring when at garage/shop
        if (kind === 'garage' || kind === 'shop') {
          ctx.save();
          ctx.translate(ex, ey);
          ctx.rotate(-0.32);
          ctx.strokeStyle =
            kind === 'garage' ? 'rgba(34, 211, 238, 0.38)' : 'rgba(192, 132, 252, 0.38)';
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 7]);
          ctx.beginPath();
          ctx.ellipse(0, 0, er * 1.55, er * 0.42, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // Orbiting shattered Earth rock chunks + salvageable space junk
        const activeCount = debris.length + junk * 3;
        for (let i = 0; i < activeCount; i++) {
          const d = debris[i % debris.length];
          d.angle += d.speed * dt;
          d.rot += d.rotSpeed * dt;
          const cx = ex + Math.cos(d.angle) * (d.dist + (i >= debris.length ? 160 : 0));
          const cy = ey + Math.sin(d.angle) * (d.dist * 0.55) - (i >= debris.length ? 180 : 0);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(d.rot);
          ctx.beginPath();
          d.pts.forEach(([px, py], idx) => {
            if (idx === 0) ctx.moveTo(px * d.size, py * d.size);
            else ctx.lineTo(px * d.size, py * d.size);
          });
          ctx.closePath();
          ctx.fillStyle = d.glow ? '#334155' : '#1e293b';
          ctx.fill();
          ctx.strokeStyle = d.glow ? 'rgba(251, 146, 60, 0.7)' : 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('contentvisibilityautostatechange', onVisibility);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="starfield-layer fixed inset-0 pointer-events-none select-none z-0"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
