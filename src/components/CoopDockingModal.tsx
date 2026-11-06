import React, { useEffect, useId, useState } from 'react';
import {
  AlertCircle,
  Check,
  Cloud,
  Compass,
  Copy,
  Database,
  Flame,
  KeyRound,
  Link2,
  Loader2,
  Radio,
  RefreshCw,
  Rocket,
  Shield,
  Sparkles,
  Unlink,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { generateDockingCode, poolMothershipPlasma } from '../game/coop';
import type { Action } from '../game/state';
import type { GameState } from '../game/types';
import {
  clearRuntimeSupabaseConfig,
  getSavedShipName,
  getSupabaseConfig,
  saveRuntimeSupabaseConfig,
  saveShipName,
} from '../lib/supabase';

interface Props {
  open: boolean;
  state: GameState;
  dispatch: React.Dispatch<Action>;
  onClose: () => void;
  onConnectRoomCode: (
    roomCode: string,
    transport: 'supabase' | 'broadcast_fallback',
    shipName: string,
  ) => void;
  onRequestUndock: () => void;
}

export const CoopDockingModal: React.FC<Props> = ({
  open,
  state,
  dispatch,
  onClose,
  onConnectRoomCode,
  onRequestUndock,
}) => {
  const titleId = useId();
  const [supaConfig, setSupaConfig] = useState(() => getSupabaseConfig());
  const [editingKeys, setEditingKeys] = useState(false);
  const [urlInput, setUrlInput] = useState(() => getSupabaseConfig().url);
  const [anonKeyInput, setAnonKeyInput] = useState(() => getSupabaseConfig().anonKey);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSavedToast, setConfigSavedToast] = useState(false);

  const [shipNameInput, setShipNameInput] = useState(() => getSavedShipName());
  const [roomCodeInput, setRoomCodeInput] = useState(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('dock');
      if (q && /^\d{4}$/.test(q)) return q;
    }
    return state.mothership.roomCode || '4821';
  });
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (open) {
      const latest = getSupabaseConfig();
      setSupaConfig(latest);
      if (latest.url) setUrlInput(latest.url);
      if (latest.anonKey) setAnonKeyInput(latest.anonKey);
    }
  }, [open]);

  useEffect(() => {
    if (state.mothership.roomCode && /^\d{4}$/.test(state.mothership.roomCode)) {
      setRoomCodeInput(state.mothership.roomCode);
    }
  }, [state.mothership.roomCode]);

  if (!open) return null;

  const isDocked = state.mothership.active && !!state.mothership.partner;
  const isWaitingNetwork =
    !isDocked &&
    (state.mothership.channelStatus === 'connecting' ||
      state.mothership.channelStatus === 'waiting_partner');
  const partner = state.mothership.partner;
  const pooled =
    isDocked && partner ? poolMothershipPlasma(state.plasma, partner.plasma) : null;

  const cleanCode = roomCodeInput.replace(/[^0-9]/g, '').padStart(4, '0').slice(0, 4);
  const activeCode =
    state.mothership.roomCode && /^\d{4}$/.test(state.mothership.roomCode)
      ? state.mothership.roomCode
      : cleanCode;

  const buildInviteUrl = (code: string) => {
    if (typeof window === 'undefined') return `?dock=${code}`;
    const u = new URL(window.location.href);
    u.searchParams.set('dock', code);
    return u.toString();
  };

  const copyCode = (code: string) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyInviteLink = (code: string) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(buildInviteUrl(code));
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSaveSupabaseKeys = () => {
    const ok = saveRuntimeSupabaseConfig(urlInput, anonKeyInput);
    if (!ok) {
      setConfigError(
        'Enter a valid https:// Supabase Project URL and public anon key.',
      );
      return;
    }
    setConfigError(null);
    const updated = getSupabaseConfig();
    setSupaConfig(updated);
    setEditingKeys(false);
    setConfigSavedToast(true);
    setTimeout(() => setConfigSavedToast(false), 2500);
  };

  const handleClearSavedKeys = () => {
    clearRuntimeSupabaseConfig();
    const updated = getSupabaseConfig();
    setSupaConfig(updated);
    setUrlInput('');
    setAnonKeyInput('');
    setEditingKeys(false);
  };

  const handleHostNewCode = () => {
    const fresh = generateDockingCode();
    setRoomCodeInput(fresh);
    const callsign = shipNameInput.trim() || 'ISS Horizon';
    saveShipName(callsign);
    onConnectRoomCode(
      fresh,
      supaConfig.isConfigured ? 'supabase' : 'broadcast_fallback',
      callsign,
    );
  };

  const handleJoinCode = (forceTransport?: 'supabase' | 'broadcast_fallback') => {
    if (roomCodeInput.replace(/[^0-9]/g, '').length !== 4) return;
    const code = roomCodeInput.replace(/[^0-9]/g, '');
    const callsign = shipNameInput.trim() || 'ISS Horizon';
    saveShipName(callsign);
    const transport =
      forceTransport ?? (supaConfig.isConfigured ? 'supabase' : 'broadcast_fallback');
    onConnectRoomCode(code, transport, callsign);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-950 text-slate-100 rounded-2xl sm:rounded-3xl border border-cyan-500/50 p-0 shadow-[0_25px_60px_rgba(0,0,0,0.9)] max-w-2xl w-full max-h-[90dvh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 border-b border-cyan-500/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-sm sm:text-base font-extrabold text-white flex flex-wrap items-center gap-2"
              >
                <span>Co-Op Airlock Docking (&ldquo;Mothership&rdquo;)</span>
                {isDocked && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/50">
                    AIRLOCK MERGED
                  </span>
                )}
                {isWaitingNetwork && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-400/50 animate-pulse">
                    BEACON #{activeCode}
                  </span>
                )}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2">
                Dock two ships via 4-digit code to merge grids, walk across both hulls, and share Plasma &amp; combat aim in real time.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition shrink-0 ml-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 sm:p-6 space-y-4 flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y">
          {/* Error Banner if Realtime Channel errored */}
          {state.mothership.channelStatus === 'error' && state.mothership.errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-extrabold text-rose-100">Realtime Channel Notice</div>
                <div>{state.mothership.errorMessage}</div>
              </div>
            </div>
          )}

          {isDocked && partner ? (
            /* ================= 1. ACTIVE DOCKED MOTHERSHIP VIEW ================= */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-cyan-950/40 border border-cyan-500/50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Rocket className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-sm font-black text-white flex flex-wrap items-center gap-2">
                        <span>Unified Mothership Active</span>
                        {state.mothership.mode === 'network_code' && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-400/50 text-[10px] font-mono text-purple-200">
                            mothership-room-{state.mothership.roomCode}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-cyan-200">
                        Docked with <strong>{partner.name}</strong> (
                        {partner.isAiWingman
                          ? 'Autonomous AI Wingman'
                          : state.mothership.transport === 'supabase'
                            ? 'Supabase Realtime Live'
                            : 'Local Tab Sync'}
                        )
                      </div>
                    </div>
                  </div>

                  {partner.isAiWingman ? (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'TOGGLE_PRIMARY_SHIP' })}
                      className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 flex items-center gap-1.5 transition"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      Primary: {state.mothership.primaryShip === 'player' ? 'Your Ship' : 'AI Ship'}
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-200 border border-emerald-400/40 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-emerald-300" />
                      {state.mothership.primaryShip === 'player'
                        ? 'Role: Primary Control Ship (P1)'
                        : 'Role: Docked Wingman Ship (P2)'}
                    </div>
                  )}
                </div>

                {/* Connected Presence Ships Roster (Network Co-Op) */}
                {state.mothership.mode === 'network_code' &&
                  state.mothership.presenceShips.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                        <span>Supabase Presence — Docked Ships ({state.mothership.presenceShips.length}/2)</span>
                        <button
                          type="button"
                          onClick={() => copyInviteLink(state.mothership.roomCode)}
                          className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1 font-bold normal-case"
                        >
                          {copiedLink ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Link2 className="w-3 h-3" />
                          )}
                          {copiedLink ? 'Invite Link Copied' : 'Copy ?dock Link'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {state.mothership.presenceShips.map((entry, idx) => (
                          <div
                            key={entry.clientId}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-white truncate">{entry.shipName}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                idx === 0
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-400/40'
                              }`}
                            >
                              {idx === 0 ? 'Primary Ship' : 'Wingman Ship'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Pooled Plasma & Safety Reserve Display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-300 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> Shared Plasma Reserve
                      </span>
                      <span className="font-mono text-white font-extrabold">
                        {state.plasma} / {state.maxPlasma}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-sky-300"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((state.plasma / Math.max(1, state.maxPlasma)) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Both crews can adjust power sliders, convert Scrap &amp; buy upgrades together.
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-300 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" /> Safe Split on Undock
                      </span>
                      <span className="font-mono text-emerald-300 font-extrabold">&ge;15% Floor</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Split Preview:{' '}
                      <span className="text-white font-mono">
                        ~{Math.max(pooled?.playerReserve ?? 30, Math.round(state.plasma * 0.5))}P
                      </span>{' '}
                      per ship
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Astronauts across the collar return safely to their home Airlock on undock.
                    </div>
                  </div>
                </div>

                {/* Mothership Perks Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-slate-200">Walk all 12 rooms &amp; man (+25%) live</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-slate-200">+1 Shared Magnetic Shield layer</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-slate-200">Dual P1/P2 reticles &amp; synced volleys</span>
                  </div>
                </div>
              </div>

              {/* Undock Action Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Undocking separates both grids, returns crew home &amp; splits Plasma safely.</span>
                </div>
                <button
                  type="button"
                  onClick={onRequestUndock}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-rose-500 hover:bg-rose-400 text-white flex items-center gap-1.5 shadow ml-auto"
                >
                  <Unlink className="w-4 h-4" /> Undock Vessels
                </button>
              </div>
            </div>
          ) : isWaitingNetwork ? (
            /* ================= 2. WAITING FOR PARTNER ON 4-DIGIT CHANNEL ================= */
            <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 border border-purple-400/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-300">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-purple-300">
                      {state.mothership.transport === 'supabase'
                        ? 'Supabase Realtime Channel Live'
                        : 'Local Browser BroadcastChannel Live'}
                    </div>
                    <div className="text-base font-black text-white">
                      Waiting for Player 2 on Airlock Code{' '}
                      <span className="font-mono text-cyan-300">#{activeCode}</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Channel: mothership-room-{activeCode}
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 self-start sm:self-center">
                  You are Primary Ship
                </span>
              </div>

              <p className="text-xs text-slate-300">
                Share this 4-digit code or invite link with your co-pilot. Your two ship grids will lock together automatically as soon as they connect.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyCode(activeCode)}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5"
                >
                  {copiedCode ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-cyan-300" />
                  )}
                  {copiedCode ? 'Copied Code!' : `Copy Code (${activeCode})`}
                </button>

                <button
                  type="button"
                  onClick={() => copyInviteLink(activeCode)}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-1.5 shadow"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-slate-950" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  {copiedLink ? 'Invite URL Copied!' : `Copy Invite Link (?dock=${activeCode})`}
                </button>

                <button
                  type="button"
                  onClick={onRequestUndock}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/40 ml-auto"
                >
                  Cancel Beacon
                </button>
              </div>
            </div>
          ) : (
            /* ================= 3. SETUP + HOST / JOIN SELECTION VIEW ================= */
            <div className="space-y-4">
              {/* SUPABASE ENVIRONMENT / IN-GAME CREDENTIAL SETUP CARD */}
              {!supaConfig.isConfigured || editingKeys ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-black text-white">
                          Supabase Realtime Setup (Online Multiplayer)
                        </div>
                        <p className="text-[11px] text-slate-300">
                          <code className="text-emerald-300">VITE_SUPABASE_URL</code> &amp;{' '}
                          <code className="text-emerald-300">VITE_SUPABASE_ANON_KEY</code> aren&apos;t set in env yet. Paste them below for online Co-Op, or play right away with Local / AI Wingman mode.
                        </p>
                      </div>
                    </div>
                    {editingKeys && (
                      <button
                        type="button"
                        onClick={() => setEditingKeys(false)}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        VITE_SUPABASE_URL
                      </label>
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://your-project.supabase.co"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 outline-none text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        VITE_SUPABASE_ANON_KEY
                      </label>
                      <input
                        type="password"
                        value={anonKeyInput}
                        onChange={(e) => setAnonKeyInput(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 outline-none text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  {configError && (
                    <div className="text-xs text-rose-300 font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{configError}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={handleSaveSupabaseKeys}
                      className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center gap-1.5 shadow"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Save &amp; Enable Supabase Realtime
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                      Fall Back to Local / Solo Mode
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-200">
                    <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Supabase Realtime Ready</strong> (
                      {supaConfig.source === 'env'
                        ? 'Configured via VITE_SUPABASE_* env'
                        : 'Saved in browser'}
                      )
                    </span>
                    {configSavedToast && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/25 text-emerald-200 text-[10px] font-bold">
                        Saved!
                      </span>
                    )}
                  </div>
                  {supaConfig.source === 'storage' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingKeys(true)}
                        className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200"
                      >
                        Edit Keys
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSavedKeys}
                        className="text-[11px] font-bold text-rose-300 hover:text-rose-200"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* OPTION 1: 4-DIGIT AIRLOCK DOCKING CODE (SUPABASE REALTIME OR LOCAL FALLBACK) */}
              <div className="p-4 rounded-2xl bg-slate-900/85 border border-purple-500/40 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white flex flex-wrap items-center gap-2">
                        <span>Option 1: 4-Digit Airlock Docking Code</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/40">
                          {supaConfig.isConfigured ? 'Supabase Realtime' : 'Local Tab Fallback'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {supaConfig.isConfigured
                          ? 'Host or join a shared mothership-room-XXXX channel across devices with zero server setup.'
                          : 'Test simultaneous 2-player docking across two browser tabs on this device via BroadcastChannel.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Callsign + Host New Session Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Your Ship Callsign
                    </label>
                    <input
                      type="text"
                      maxLength={24}
                      value={shipNameInput}
                      onChange={(e) => setShipNameInput(e.target.value)}
                      placeholder="ISS Horizon"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-purple-400 outline-none text-xs font-bold text-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleHostNewCode}
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 flex items-center justify-center gap-1.5 shadow"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Host New Session (Generate 4-Digit Code)
                    </button>
                  </div>
                </div>

                {/* Join Existing 4-Digit Code Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm font-bold text-white">
                    <span className="text-xs text-slate-400">CODE</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={roomCodeInput}
                      onChange={(e) =>
                        setRoomCodeInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))
                      }
                      className="w-16 bg-transparent outline-none text-center font-extrabold tracking-widest text-purple-300"
                      placeholder="4821"
                      aria-label="4-digit Airlock Docking Code"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => copyInviteLink(cleanCode)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
                    title={`Copy invite link (?dock=${cleanCode})`}
                  >
                    {copiedLink ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5 text-cyan-300" />
                    )}
                    {copiedLink ? 'Link Copied' : 'Copy ?dock Link'}
                  </button>

                  <button
                    type="button"
                    disabled={roomCodeInput.replace(/[^0-9]/g, '').length !== 4}
                    onClick={() => handleJoinCode()}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-purple-400 hover:bg-purple-300 disabled:opacity-40 text-slate-950 flex items-center gap-1.5 ml-auto shadow"
                  >
                    <Rocket className="w-4 h-4" />
                    {supaConfig.isConfigured
                      ? `Join Channel #${roomCodeInput || '----'}`
                      : `Join Local Tab #${roomCodeInput || '----'}`}
                  </button>
                </div>

                {supaConfig.isConfigured && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      disabled={roomCodeInput.replace(/[^0-9]/g, '').length !== 4}
                      onClick={() => handleJoinCode('broadcast_fallback')}
                      className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                    >
                      Or test offline across two local browser tabs (#{roomCodeInput || '4821'})
                    </button>
                  </div>
                )}
              </div>

              {/* OPTION 2: LOCAL AI WINGMAN (INSTANT CO-OP FALLBACK) */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">
                        Option 2: Valkyrie AI Wingman (Instant Co-Op)
                      </div>
                      <div className="text-xs text-slate-400">
                        No second player needed. Dock immediately with an AI-piloted sister ship (+110 Plasma, +1 Shield, +16 Laser Volley).
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'DOCK_MOTHERSHIP', mode: 'local_ai' });
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-1.5 shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.3)] ml-auto"
                  >
                    <Users className="w-4 h-4" /> Dock AI Wingman
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default CoopDockingModal;
