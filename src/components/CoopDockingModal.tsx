import React, { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Compass,
  Copy,
  Flame,
  Globe,
  Radio,
  Rocket,
  Shield,
  Unlink,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { GameState } from '../game/types';
import type { Action } from '../game/state';
import { poolMothershipPlasma } from '../game/coop';

interface Props {
  open: boolean;
  state: GameState;
  dispatch: React.Dispatch<Action>;
  onClose: () => void;
}

export const CoopDockingModal: React.FC<Props> = ({ open, state, dispatch, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const [roomCodeInput, setRoomCodeInput] = useState(state.mothership.roomCode || '7249');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      const onDown = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e)) dialog.close();
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      return () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    }
  }, []);

  const isDocked = state.mothership.active && !!state.mothership.partner;
  const partner = state.mothership.partner;
  const pooled = isDocked && partner
    ? poolMothershipPlasma(state.plasma, partner.plasma)
    : null;

  const copyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomCodeInput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="backdrop:bg-slate-950/80 backdrop:backdrop-blur-sm bg-slate-950 text-slate-100 rounded-3xl border border-cyan-500/50 p-0 shadow-[0_25px_60px_rgba(0,0,0,0.9)] max-w-2xl w-[94vw] max-h-[90vh] max-h-[90dvh] flex flex-col overflow-hidden overscroll-contain"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 border-b border-cyan-500/30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 id={titleId} className="text-base font-extrabold text-white flex items-center gap-2">
              Co-Op Ship Docking ("Mothership" Mode)
              {isDocked && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/50">
                  DOCK CLAMPS LOCKED
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Link two vessels into a unified Mothership. Pool Plasma reserves, share shields & walk freely between decks.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto overscroll-contain">
        {isDocked && partner ? (
          /* ================= ACTIVE MOTHERSHIP VIEW ================= */
          <div className="space-y-4">
            {/* Active Status Hero Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-cyan-950/40 border border-cyan-500/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Rocket className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="text-sm font-black text-white">Unified Mothership Active</div>
                    <div className="text-xs text-cyan-200">
                      Partner: {partner.name} ({partner.isAiWingman ? 'AI Wingman' : 'Player Wingman'})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'TOGGLE_PRIMARY_SHIP' })}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 flex items-center gap-1.5 transition"
                >
                  <Compass className="w-3.5 h-3.5" />
                  Primary Ship: {state.mothership.primaryShip === 'player' ? 'Player Vessel' : 'Partner Vessel'}
                </button>
              </div>

              {/* Pooled Plasma & Safety Reserve Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> Pooled Plasma Tank
                    </span>
                    <span className="font-mono text-white font-extrabold">
                      {state.plasma} / {state.maxPlasma}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-sky-300"
                      style={{
                        width: `${Math.min(100, Math.round((state.plasma / Math.max(1, state.maxPlasma)) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Plasma pooled for firing weapons & jumps across both vessels.
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" /> 15% Safety Reserves
                    </span>
                    <span className="font-mono text-emerald-300 font-extrabold">Guaranteed</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Player Reserve: <span className="text-white font-mono">{pooled?.playerReserve ?? 25} Plasma</span> • Partner Reserve: <span className="text-white font-mono">{pooled?.partnerReserve ?? 20} Plasma</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Neither ship will ever be left stranded upon undocking.
                  </div>
                </div>
              </div>

              {/* Mothership Perks Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-slate-200">+1 Magnetic Shield bubble layer</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-slate-200">+16 Coordinated laser support in combat</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-slate-200">Free crew walkthrough across boarding tunnel</span>
                </div>
              </div>
            </div>

            {/* Undock Action Button */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Undocking will safely restore individual vessel fuel tanks with &gt;15% reserves.
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: 'UNDOCK_MOTHERSHIP' })}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-rose-500 hover:bg-rose-400 text-white flex items-center gap-1.5 shadow"
              >
                <Unlink className="w-4 h-4" /> Undock Vessels
              </button>
            </div>
          </div>
        ) : (
          /* ================= DOCKING SELECTION VIEW ================= */
          <div className="space-y-4">
            {/* OPTION 1: Local AI Wingman Simulation */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">Option 1: Valkyrie AI Wingman (Instant Co-Op)</div>
                    <div className="text-xs text-slate-400">
                      Simulate a 2-ship fleet immediately. Valkyrie brings 80 Hull, 110 Plasma fuel, and an autonomous AI pilot.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'DOCK_MOTHERSHIP', mode: 'local_ai' })}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-1.5 shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                >
                  <Users className="w-4 h-4" /> Dock AI Wingman
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  <strong className="text-white">Shields:</strong> +1 Shared Bubble
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  <strong className="text-white">Combat:</strong> +16 Laser Burst
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  <strong className="text-white">Crew:</strong> Valkyrie Pilot
                </div>
              </div>
            </div>

            {/* OPTION 2: Local Multiplayer Room Code */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">Option 2: 4-Digit Local Multiplayer Sync</div>
                    <div className="text-xs text-slate-400">
                      Open another browser window or tab and enter the same 4-digit frequency to link ships via BroadcastChannel.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm font-bold text-white">
                  <Globe className="w-4 h-4 text-purple-400" />
                  <input
                    type="text"
                    maxLength={4}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-16 bg-transparent outline-none text-center font-bold tracking-widest text-purple-300"
                    placeholder="7249"
                  />
                </div>
                <button
                  type="button"
                  onClick={copyCode}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Code'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'DOCK_MOTHERSHIP',
                      mode: 'network_code',
                      roomCode: roomCodeInput,
                    })
                  }
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-purple-400 hover:bg-purple-300 text-slate-950 flex items-center gap-1.5 ml-auto shadow"
                >
                  <Rocket className="w-4 h-4" /> Connect & Dock Code #{roomCodeInput}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
};
export default CoopDockingModal;
