import React, { useEffect, useId, useRef } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Lock,
  Radio,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import type { GameState } from '../game/types';
import type { Action } from '../game/state';
import { FACTIONS } from '../game/factions';
import { checkBlueRequirement } from '../game/storyEvents';

interface Props {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}

export const StoryEventModal: React.FC<Props> = ({ state, dispatch }) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const event = state.activeStoryEvent;
  const outcome = state.storyOutcome;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (event) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [event]);

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
        if (pressedOutside && outside(e)) {
          dispatch({ type: 'CLOSE_STORY_EVENT' });
        }
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      return () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    }
  }, [dispatch]);

  if (!event) return <dialog ref={dialogRef} className="hidden" />;

  const faction = FACTIONS[event.factionId] ?? FACTIONS.terran;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      onClose={() => dispatch({ type: 'CLOSE_STORY_EVENT' })}
      className="w-full max-w-2xl rounded-2xl bg-slate-950/95 text-slate-100 border border-cyan-500/50 shadow-[0_30px_90px_rgba(0,0,0,0.95)] p-0 backdrop:bg-black/80 backdrop:backdrop-blur-md overflow-hidden"
    >
      {/* Header with Faction Badge & Glow */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{
          borderColor: `${faction.themeColor}40`,
          backgroundColor: `${faction.themeColor}15`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl border bg-slate-950/90"
            style={{ borderColor: faction.themeColor }}
          >
            <Radio className="w-5 h-5" style={{ color: faction.themeColor }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                style={{
                  color: faction.themeColor,
                  borderColor: `${faction.themeColor}60`,
                  backgroundColor: `${faction.themeColor}20`,
                }}
              >
                {faction.name} Anomaly
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {faction.speciesName}
              </span>
            </div>
            <h2 id={titleId} className="text-base font-extrabold text-white mt-0.5">
              {event.title}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => dispatch({ type: 'CLOSE_STORY_EVENT' })}
          className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
          aria-label="Dismiss anomaly"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Situation (STRICT: Max 2 Short Plain Sentences) */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            {event.situation}
          </p>
        </div>

        {/* Outcome View (If an option has been chosen) */}
        {outcome ? (
          <div className="rounded-xl bg-cyan-950/40 border border-cyan-400/50 p-4.5 space-y-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-300">
                  Event Outcome
                </h3>
                <p className="text-sm text-white mt-1 leading-relaxed">
                  {outcome.text}
                </p>
              </div>
            </div>

            {outcome.rewardDesc && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-cyan-500/20">
                <span className="text-xs font-bold text-slate-400">Rewards:</span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" /> {outcome.rewardDesc}
                </span>
              </div>
            )}

            <button
              type="button"
              autoFocus
              onClick={() => dispatch({ type: 'CLOSE_STORY_EVENT' })}
              className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)] transition"
            >
              Continue Journey
            </button>
          </div>
        ) : (
          /* Decision Options */
          <div className="space-y-2.5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Choose Action:
            </div>

            <div className="space-y-2">
              {event.options.map((opt, idx) => {
                const isBlue = !!opt.isBlue;
                const blueReq = opt.blueReq;
                const canSelect = isBlue && blueReq ? checkBlueRequirement(blueReq, state) : true;

                if (isBlue) {
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!canSelect}
                      onClick={() => dispatch({ type: 'CHOOSE_STORY_OPTION', optionIndex: idx })}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                        canSelect
                          ? 'bg-gradient-to-r from-sky-950/80 to-blue-950/60 hover:from-sky-900/90 hover:to-blue-900/70 border-sky-400/80 shadow-[0_0_16px_rgba(56,189,248,0.25)] text-white cursor-pointer'
                          : 'bg-slate-900/40 border-slate-800/80 text-slate-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                              canSelect
                                ? 'bg-sky-400/25 text-sky-200 border border-sky-300/50'
                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}
                          >
                            {canSelect ? (
                              <Zap className="w-3 h-3 text-sky-300" />
                            ) : (
                              <Lock className="w-3 h-3 text-slate-500" />
                            )}
                            🔵 Blue Option
                          </span>
                          {blueReq && (
                            <span
                              className={`text-[11px] font-mono font-bold ${
                                canSelect ? 'text-cyan-300' : 'text-slate-500'
                              }`}
                            >
                              [{blueReq.label}]
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold leading-snug">
                          {opt.text.replace(/^🔵\s*\[[^\]]+\]\s*/, '')}
                        </div>
                      </div>

                      {canSelect ? (
                        <span className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-sky-400 text-slate-950">
                          Engage
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] text-slate-500 font-mono">
                          Locked
                        </span>
                      )}
                    </button>
                  );
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => dispatch({ type: 'CHOOSE_STORY_OPTION', optionIndex: idx })}
                    className="w-full text-left p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white transition flex items-center justify-between gap-3"
                  >
                    <span className="text-xs font-semibold">{opt.text}</span>
                    <span className="shrink-0 text-xs font-bold text-slate-400">Select</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tactical Note */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span className="flex items-center gap-1 text-slate-400">
            <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
            🔵 Blue options unlock automatically with ship modules, crew staffing, or Co-Op docking.
          </span>
          <span className="font-mono text-slate-400">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">Esc</kbd> to close
          </span>
        </div>
      </div>
    </dialog>
  );
};
