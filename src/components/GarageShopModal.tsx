import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Activity,
  Check,
  Coins,
  Globe,
  Handshake,
  Lock,
  Radio,
  RotateCw,
  ShoppingBag,
  Wrench,
  X,
} from 'lucide-react';
import type { GameState, RoomId } from '../game/types';
import { offers, priceMult, type Action } from '../game/state';
import {
  ALL_UPGRADES,
  ALL_UPGRADE_IDS,
  UPGRADES_BY_ROOM,
  type UpgradeModuleId,
} from '../game/upgrades';
import { ALIEN_SPECIES, type AlienSpeciesId } from '../game/diplomacy';
import { ROOMS } from '../game/rooms';

interface Props {
  open: boolean;
  state: GameState;
  dispatch: React.Dispatch<Action>;
  onClose: () => void;
  onOpenRearrange: () => void;
}

export const GarageShopModal: React.FC<Props> = ({
  open,
  state,
  dispatch,
  onClose,
  onOpenRearrange,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const [activeTab, setActiveTab] = useState<'upgrades' | 'shop' | 'diplomacy'>('upgrades');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<RoomId | 'all'>('all');

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

  const translatorLvl = state.moduleLevels.ai_translator ?? 0;
  const translatorUnlocked = translatorLvl >= 1 || state.reputation >= 40;

  const filteredUpgrades: UpgradeModuleId[] =
    selectedRoomFilter === 'all'
      ? ALL_UPGRADE_IDS
      : UPGRADES_BY_ROOM[selectedRoomFilter];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="backdrop:bg-slate-950/80 backdrop:backdrop-blur-sm bg-slate-950 text-slate-100 rounded-3xl border border-cyan-500/50 p-0 shadow-[0_25px_60px_rgba(0,0,0,0.9)] max-w-4xl w-[94vw] max-h-[90vh] max-h-[90dvh] flex flex-col overflow-hidden overscroll-contain"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 border-b border-cyan-500/30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 id={titleId} className="text-base font-extrabold text-white flex items-center gap-2">
              Orbital Garage & Satellite Trade Hub
              <span className="text-xs font-mono font-normal text-cyan-300">
                ({state.encounter.name})
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-400 mt-0.5 font-mono">
              <span className="text-amber-300">Spendable XP: {state.spendXp}</span>
              <span className="text-orange-300">Scrap: {state.scrap}</span>
              <span className="text-cyan-300">Plasma: {state.plasma}/{state.maxPlasma}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenRearrange();
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-slate-700 transition"
          >
            <RotateCw className="w-3.5 h-3.5" /> Rearrange Rooms
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-slate-800 bg-slate-950/60 shrink-0 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('upgrades')}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-bold text-xs shrink-0 transition ${
            activeTab === 'upgrades'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" /> 16 Multi-Level Upgrades (Lv 1–5)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shop')}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-bold text-xs shrink-0 transition ${
            activeTab === 'shop'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Satellite Shop Goods
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('diplomacy')}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-bold text-xs shrink-0 transition ${
            activeTab === 'diplomacy'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" /> Alien Species & Treaties (5)
          {state.diplomacy.activeTreaty && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto overscroll-contain space-y-4">
        {/* ============================================================== */}
        {/* TAB 1: 16 MULTI-LEVEL SHIP UPGRADES                            */}
        {/* ============================================================== */}
        {activeTab === 'upgrades' && (
          <div className="space-y-4">
            {/* Room Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-bold mr-1">Filter by Room:</span>
              <button
                type="button"
                onClick={() => setSelectedRoomFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedRoomFilter === 'all'
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                All 16 Modules
              </button>
              {(Object.keys(UPGRADES_BY_ROOM) as RoomId[]).map((rId) => {
                const rDef = ROOMS[rId];
                return (
                  <button
                    key={rId}
                    type="button"
                    onClick={() => setSelectedRoomFilter(rId)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      selectedRoomFilter === rId
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{rDef.name}</span>
                    <span className="text-[10px] opacity-75">
                      ({UPGRADES_BY_ROOM[rId].length})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Upgrade Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredUpgrades.map((modId) => {
                const def = ALL_UPGRADES[modId];
                const roomDef = ROOMS[def.room];
                const curLvl = state.moduleLevels[modId] ?? 0;
                const isMax = curLvl >= def.maxLevel;
                const nextCostIdx = curLvl;
                const xpCost = isMax ? null : def.xpCosts[nextCostIdx];
                const scrapCost = isMax ? null : def.scrapCosts[nextCostIdx];
                const canAffordXp = xpCost !== null && state.spendXp >= xpCost;
                const canAffordScrap = scrapCost !== null && state.scrap >= scrapCost;

                return (
                  <div
                    key={modId}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-3"
                  >
                    <div>
                      {/* Room tag & level indicator */}
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{
                            backgroundColor: `${roomDef.theme.accent}20`,
                            color: roomDef.theme.accent,
                          }}
                        >
                          {roomDef.name}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-xs">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={`w-3.5 h-1.5 rounded-sm ${
                                i < curLvl
                                  ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
                                  : 'bg-slate-800'
                              }`}
                            />
                          ))}
                          <span className="ml-1 text-white font-bold">
                            Lv.{curLvl}/5
                          </span>
                        </div>
                      </div>

                      {/* Upgrade Name & Plain Summary */}
                      <div className="text-xs font-black text-white">{def.name}</div>
                      <div className="text-[11px] text-slate-300 italic mt-0.5">
                        "{def.summary}"
                      </div>

                      {/* Current Level Effect */}
                      <div className="mt-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-cyan-200">
                        <strong className="text-white">Active Effect: </strong>
                        {def.getEffectDesc(curLvl)}
                      </div>
                    </div>

                    {/* Upgrade action buttons */}
                    {isMax ? (
                      <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                        <Check className="w-4 h-4" /> MAX LEVEL 5 INSTALLED
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          disabled={!canAffordXp}
                          onClick={() =>
                            dispatch({
                              type: 'UPGRADE_MODULE',
                              moduleId: modId,
                              currency: 'xp',
                            })
                          }
                          className="flex-1 py-1.5 px-2 rounded-xl text-xs font-extrabold bg-amber-500/20 hover:bg-amber-500/35 disabled:opacity-35 text-amber-200 border border-amber-400/50 flex items-center justify-center gap-1 transition"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          Lv.{curLvl + 1}: {xpCost} XP
                        </button>
                        <button
                          type="button"
                          disabled={!canAffordScrap}
                          onClick={() =>
                            dispatch({
                              type: 'UPGRADE_MODULE',
                              moduleId: modId,
                              currency: 'scrap',
                            })
                          }
                          className="flex-1 py-1.5 px-2 rounded-xl text-xs font-extrabold bg-orange-500/20 hover:bg-orange-500/35 disabled:opacity-35 text-orange-200 border border-orange-400/50 flex items-center justify-center gap-1 transition"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          Lv.{curLvl + 1}: {scrapCost} Scrap
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: SATELLITE SHOP GOODS & TRADING                          */}
        {/* ============================================================== */}
        {activeTab === 'shop' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <span>
                Trade Index: <strong className="text-cyan-300">{(priceMult(state) * 100).toFixed(0)}%</strong> (Influenced by Sector Reputation, Narrative Rank, and Alien Treaties)
              </span>
              <span className="font-mono text-amber-300">Spendable XP: {state.spendXp}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {offers(state).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={!o.ok}
                  onClick={() => dispatch({ type: 'TRADE', offer: o.id })}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 disabled:opacity-35 border border-slate-800 text-left transition"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{o.label}</div>
                    <div className="text-[11px] text-slate-400">{o.detail}</div>
                  </div>
                  <span className="text-xs font-mono font-extrabold text-amber-300 shrink-0 ml-3">
                    {o.cost} {o.currency === 'xp' ? 'XP' : 'Scrap'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: ALIEN SPECIES & DIPLOMATIC TREATIES                     */}
        {/* ============================================================== */}
        {activeTab === 'diplomacy' && (
          <div className="space-y-4">
            {/* Universal AI Translator Status Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-purple-950/40 border border-purple-500/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Radio className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <div className="text-xs font-extrabold text-white">
                    Universal AI Translator: Tier {translatorLvl}/5
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {translatorUnlocked
                      ? 'Linguistic decryption active: alien communication decrypted and treaties signable.'
                      : 'Encrypted alien frequency: Upgrade Universal AI Translator in Comms to sign treaties!'}
                  </div>
                </div>
              </div>
              {!translatorUnlocked && (
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'UPGRADE_MODULE',
                      moduleId: 'ai_translator',
                      currency: 'xp',
                    })
                  }
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-purple-400 hover:bg-purple-300 text-slate-950 shrink-0"
                >
                  Unlock Translator (25 XP)
                </button>
              )}
            </div>

            {/* Alien Species Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(ALIEN_SPECIES) as AlienSpeciesId[]).map((spId) => {
                const sp = ALIEN_SPECIES[spId];
                const isAllied = state.diplomacy.alliances.includes(spId);
                const isActive = state.diplomacy.activeTreaty === spId;

                return (
                  <div
                    key={spId}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className="font-black text-sm"
                          style={{ color: sp.accentColor }}
                        >
                          {sp.name}
                        </span>
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/50">
                            ACTIVE TREATY
                          </span>
                        ) : isAllied ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-400/50">
                            ALLIED
                          </span>
                        ) : null}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {sp.archetype} • Homeworld: {sp.homeworld}
                      </div>

                      {/* Dialogue Greeting */}
                      <div className="mt-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 italic">
                        {translatorUnlocked ? (
                          `"${sp.greeting}"`
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1 font-mono">
                            <Lock className="w-3 h-3" /> [Encrypted Subspace Waveform — Translator Required]
                          </span>
                        )}
                      </div>

                      {/* Trade Specialty & Signature Treaty Perk */}
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="text-[11px] text-slate-300">
                          <strong className="text-white">Specialty: </strong>
                          {sp.tradeSpecialty}
                        </div>
                        <div className="text-[11px] text-emerald-300">
                          <strong className="text-white">Treaty Perk: </strong>
                          {sp.treatyPerk}
                        </div>
                      </div>
                    </div>

                    {/* Treaty Ratification Button */}
                    <div className="pt-2 border-t border-slate-800">
                      {isActive ? (
                        <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-400">
                          <Check className="w-4 h-4" /> Active Galaxy Perk Engaged
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!translatorUnlocked}
                          onClick={() => dispatch({ type: 'SIGN_TREATY', species: spId })}
                          className="w-full py-2 rounded-xl text-xs font-extrabold bg-cyan-500/20 hover:bg-cyan-500/35 disabled:opacity-40 text-cyan-200 border border-cyan-400/50 flex items-center justify-center gap-1.5 transition"
                        >
                          <Handshake className="w-3.5 h-3.5" />
                          {isAllied ? 'Switch to this Treaty' : 'Sign Treaty Alliance (+100 XP, +25 Rep)'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
};
export default GarageShopModal;
