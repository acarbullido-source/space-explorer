import React from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';
import type { AutoCloakState, CombatProjectile, FloatingDamage } from '../game/types';

interface Props {
  projectiles: CombatProjectile[];
  floatingDamages: FloatingDamage[];
  autoCloak: AutoCloakState | null;
  onDismissAutoCloak?: () => void;
}

export const CombatFxLayer: React.FC<Props> = ({
  projectiles,
  floatingDamages,
  autoCloak,
  onDismissAutoCloak,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {/* Projectiles & Beams */}
      {projectiles.length > 0 && (
        <svg
          viewBox="0 0 960 460"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full pointer-events-none"
        >
          {projectiles.map((p) => {
            if (p.type === 'beam') {
              return (
                <line
                  key={p.id}
                  x1={p.startX}
                  y1={p.startY}
                  x2={p.targetX}
                  y2={p.targetY}
                  stroke={p.color}
                  strokeWidth={4.5}
                  strokeLinecap="round"
                  className="animate-pulseGlow"
                />
              );
            }
            if (p.type === 'whip') {
              const midX = (p.startX + p.targetX) / 2 + (Math.random() - 0.5) * 30;
              const midY = (p.startY + p.targetY) / 2 + (Math.random() - 0.5) * 30;
              return (
                <path
                  key={p.id}
                  d={`M ${p.startX} ${p.startY} Q ${midX} ${midY} ${p.targetX} ${p.targetY}`}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={3.5}
                  strokeDasharray="6 3"
                />
              );
            }
            // Moving projectile
            const curX = p.startX + (p.targetX - p.startX) * p.progress;
            const curY = p.startY + (p.targetY - p.startY) * p.progress;
            return (
              <g key={p.id} transform={`translate(${curX}, ${curY})`}>
                <circle r={p.type === 'cannon' ? 10 : p.type === 'torpedo' ? 8 : 5} fill={p.color} />
                <circle
                  r={p.type === 'cannon' ? 18 : p.type === 'torpedo' ? 14 : 9}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={2}
                  opacity={0.6}
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* Floating Damage & Combat Status Numbers */}
      {floatingDamages.map((fd) => (
        <div
          key={fd.id}
          style={{
            left: `${Math.min(92, Math.max(8, (fd.x / 960) * 100))}%`,
            top: `${Math.min(86, Math.max(14, (fd.y / 460) * 100))}%`,
            opacity: fd.alpha,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 font-black text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-all pointer-events-none select-none tracking-wider"
        >
          <span
            style={{ color: fd.color }}
            className="px-2 py-0.5 rounded bg-black/60 border border-white/10"
          >
            {fd.text}
          </span>
        </div>
      ))}

      {/* Non-Destructive Emergency Auto-Cloak Stealth Retreat Banner */}
      {autoCloak && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyan-950/40 backdrop-blur-md animate-fadeIn">
          {/* Hexagonal Blue Stealth Cloak Grid Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />

          <div className="relative max-w-lg w-full rounded-3xl bg-slate-950/95 border-2 border-cyan-400 p-6 text-center space-y-4 shadow-[0_0_60px_rgba(34,211,238,0.5)]">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 mx-auto flex items-center justify-center text-cyan-300">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/50">
                <Sparkles className="w-3.5 h-3.5" />
                Emergency Auto-Cloak Engaged
              </div>
              <h2 className="text-xl font-black text-white tracking-wide">
                Tactical Stealth Retreat
              </h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
              {autoCloak.banner}
            </p>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-left text-xs space-y-1">
              <div className="font-bold text-cyan-200">Orbital Safety Guarantee:</div>
              <div className="text-slate-300">
                • Warped back to Home Garage in Earth orbit.
              </div>
              <div className="text-slate-300">
                • 25% Hull integrity & 5% Plasma reserve preserved.
              </div>
              <div className="text-slate-300">
                • Free orbital scrap clusters spawned outside the bay — mine scrap & synthesize Plasma to repair systems!
              </div>
            </div>

            <button
              type="button"
              onClick={onDismissAutoCloak}
              className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.6)] transition transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Enter Home Garage & Synthesize Repairs
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
