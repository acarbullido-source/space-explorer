import type { GameState, RoomId } from './types';
import type { UpgradeModuleId } from './upgrades';
import type { FactionId } from './factions';

export type ArkArtifactId =
  | 'ark_core'
  | 'genesis_key'
  | 'seed_matrix'
  | 'resonance_crystal'
  | 'nav_chart';

export interface ArkArtifactDef {
  id: ArkArtifactId;
  name: string;
  summary: string;
  lore: string;
  sectorOrigin: number;
}

export const ARK_ARTIFACTS: Record<ArkArtifactId, ArkArtifactDef> = {
  ark_core: {
    id: 'ark_core',
    name: 'Ark Data Core Beta',
    summary: 'Telemetry logs from Earth’s final planetary evacuation.',
    lore: 'Recovered flight black-boxes show humanity’s Ark Fleet escaped moments before the crust fractured into orbit.',
    sectorOrigin: 1,
  },
  genesis_key: {
    id: 'genesis_key',
    name: 'Antimatter Genesis Key',
    summary: 'The experimental drive containment catalyst that triggered the fracture.',
    lore: 'Humanity sought unlimited zero-point energy to heal Earth, but the untested antimatter catalyst ruptured the planetary mantle.',
    sectorOrigin: 2,
  },
  seed_matrix: {
    id: 'seed_matrix',
    name: 'Bioregenerative Seed Matrix',
    summary: 'Frozen DNA archives of 10,000 lost Earth species.',
    lore: 'Cryo-stabilized genetic vaults containing the complete biosphere flora and fauna ready to terraform a new paradise.',
    sectorOrigin: 3,
  },
  resonance_crystal: {
    id: 'resonance_crystal',
    name: 'Solaris Resonance Crystal',
    summary: 'Alien harmonic prism left behind in the epicenter crater.',
    lore: 'The Solaris Choir witnessed the catastrophe and trapped the destructive shockwave inside a crystalline lattice.',
    sectorOrigin: 4,
  },
  nav_chart: {
    id: 'nav_chart',
    name: 'Stellar Beacon Nav-Chart',
    summary: 'Coordinates to the promised sanctuary world beyond the fracture.',
    lore: 'Hyper-spatial jump vectors pointing directly to New Earth—a pristine, verdant twin world awaiting the survivors.',
    sectorOrigin: 5,
  },
};

export const ARK_ARTIFACT_IDS: ArkArtifactId[] = [
  'ark_core',
  'genesis_key',
  'seed_matrix',
  'resonance_crystal',
  'nav_chart',
];

export interface BlueRequirement {
  type: 'module' | 'manned' | 'mothership' | 'reputation';
  moduleId?: UpgradeModuleId;
  minLevel?: number;
  room?: RoomId;
  minRep?: number;
  label: string;
}

export interface StoryOption {
  text: string;
  isBlue?: boolean;
  blueReq?: BlueRequirement;
  outcomeText: string;
  reward?: {
    xp?: number;
    spendXp?: number;
    scrap?: number;
    plasma?: number;
    hull?: number;
    reputation?: number;
    arkArtifact?: ArkArtifactId;
  };
}

export interface StoryEventDef {
  id: string;
  title: string;
  factionId: FactionId;
  situation: string; // STRICT: max 2 short plain-language sentences!
  options: StoryOption[];
}

export const STORY_EVENTS: StoryEventDef[] = [
  {
    id: 'terran_evac_shuttle',
    title: 'Drifting Ark Evacuation Shuttle',
    factionId: 'terran',
    situation:
      'A damaged civilian transport drifts silently with failing life support. Survivors plead for an emergency power transfer.',
    options: [
      {
        text: 'Beam 20 Plasma to restart their life support.',
        outcomeText:
          'The civilians weep with relief as warm air returns to their cabin.',
        reward: { xp: 45, reputation: 15, plasma: -20 },
      },
      {
        text: 'Salvage the exterior hull plating for raw scrap.',
        outcomeText:
          'You strip heavy titanium panels from the abandoned sections.',
        reward: { scrap: 35, reputation: -10 },
      },
      {
        text: '🔵 [Bioregenerative Systems] Deploy hydroponic bio-filters and medical nanites.',
        isBlue: true,
        blueReq: {
          type: 'module',
          moduleId: 'bioregenerative',
          minLevel: 1,
          label: 'Bioregenerative Systems Lv 1+',
        },
        outcomeText:
          'Your bio-filters instantly stabilize the passengers. In gratitude, the captain hands over an encrypted Ark black box!',
        reward: {
          xp: 80,
          reputation: 25,
          plasma: 30,
          arkArtifact: 'ark_core',
        },
      },
      {
        text: '🔵 [Docked Mothership] Secure the shuttle inside your joint tractor beam cradle.',
        isBlue: true,
        blueReq: {
          type: 'mothership',
          label: 'Docked Mothership',
        },
        outcomeText:
          'Dual tractor beams gently lock the shuttle between both vessels, saving everyone with zero fuel waste.',
        reward: { xp: 75, reputation: 20, scrap: 25 },
      },
    ],
  },
  {
    id: 'helios_flare_cruiser',
    title: 'Trapped Lithoid Mineral Barge',
    factionId: 'lithoid',
    situation:
      'A crystal harvester is stranded inside a coronal solar magnetic loop. Their crystalline heat radiators are glowing dangerously hot.',
    options: [
      {
        text: 'Offer basic tow assistance through the solar storm.',
        outcomeText:
          'You pull them clear, but hull scorch marks sizzle across your armor.',
        reward: { xp: 50, hull: -10, plasma: 25 },
      },
      {
        text: 'Wait for the solar loop to collapse and scavenge the wreck.',
        outcomeText:
          'The coronal flare tears their barge apart, leaving behind molten ore.',
        reward: { scrap: 40, reputation: -15 },
      },
      {
        text: '🔵 [Active Magnetic Shielding Lv 2+] Modulate shields to absorb the solar loop.',
        isBlue: true,
        blueReq: {
          type: 'module',
          moduleId: 'magnetic_shielding',
          minLevel: 2,
          label: 'Active Magnetic Shielding Lv 2+',
        },
        outcomeText:
          'Your layered magnetic bubbles deflect the flare entirely, siphoning massive solar energy and the Antimatter Genesis Key!',
        reward: {
          xp: 90,
          plasma: 70,
          reputation: 20,
          arkArtifact: 'genesis_key',
        },
      },
      {
        text: '🔵 [Universal AI Translator Lv 1+] Transmit harmonic cooling frequencies.',
        isBlue: true,
        blueReq: {
          type: 'module',
          moduleId: 'ai_translator',
          minLevel: 1,
          label: 'Universal AI Translator Lv 1+',
        },
        outcomeText:
          'Your frequency calibration harmonizes their crystals, allowing safe vent of thermal build-up.',
        reward: { xp: 60, plasma: 50, reputation: 15 },
      },
    ],
  },
  {
    id: 'vexx_black_market_ambush',
    title: 'Vexx Syndicate Raider Outpost',
    factionId: 'vexx',
    situation:
      'Cyber corsairs surround your sensor grid with armed skiffs. Their warlord demands tribute or valuable contraband.',
    options: [
      {
        text: 'Pay 15 Scrap as a safe passage toll.',
        outcomeText:
          'The corsairs mock your caution but deactivate their weapon locks.',
        reward: { scrap: -15, xp: 20 },
      },
      {
        text: 'Fire warning lasers and prepare for combat.',
        outcomeText:
          'Weapons clash as the raiders scatter into tactical attack skirmish!',
        reward: { xp: 40, reputation: -5 },
      },
      {
        text: '🔵 [Universal AI Translator Lv 2+] Flash syndicate black-market clearance codes.',
        isBlue: true,
        blueReq: {
          type: 'module',
          moduleId: 'ai_translator',
          minLevel: 2,
          label: 'Universal AI Translator Lv 2+',
        },
        outcomeText:
          'The raiders recognize your smuggler credentials, trading stolen Earth cryo-vaults at zero cost!',
        reward: {
          xp: 85,
          scrap: 35,
          plasma: 40,
          arkArtifact: 'seed_matrix',
        },
      },
      {
        text: '🔵 [Whipple Shield Enhancements] Ram directly through their forward boarding clamp.',
        isBlue: true,
        blueReq: {
          type: 'module',
          moduleId: 'whipple_shields',
          minLevel: 2,
          label: 'Whipple Shields Lv 2+',
        },
        outcomeText:
          'Your reinforced Kevlar hull shatters their pirate skiff like glass without taking a single scratch.',
        reward: { xp: 65, scrap: 45, reputation: 10 },
      },
    ],
  },
  {
    id: 'solaris_photonic_shrine',
    title: 'Floating Solaris Energy Obelisk',
    factionId: 'solaris',
    situation:
      'A blinding photonic monument hovers in deep space, singing in resonant light. It projects sacred coronal geometry toward your vessel.',
    options: [
      {
        text: 'Attempt a respectful radio hail and bow sensors.',
        outcomeText:
          'The obelisk bathes your ship in warm, peaceful light, granting spiritual clarity.',
        reward: { xp: 50, reputation: 15 },
      },
      {
        text: 'Launch salvage drones to extract rare photonic crystals.',
        outcomeText:
          'A psychic shockwave strikes your bridge before drones return with hot crystals.',
        reward: { scrap: 30, hull: -10, reputation: -15 },
      },
      {
        text: '🔵 [Universal AI Translator Lv 3+] Harmonize with the ancient choir hymn.',
        isBlue: true,
        blueReq: {
          type: 'module',
          moduleId: 'ai_translator',
          minLevel: 3,
          label: 'Universal AI Translator Lv 3+',
        },
        outcomeText:
          'The obelisk chimes in joyful recognition, presenting the sacred Solaris Resonance Crystal to your crew!',
        reward: {
          xp: 120,
          reputation: 30,
          plasma: 60,
          arkArtifact: 'resonance_crystal',
        },
      },
      {
        text: '🔵 [Manned Science Lab] Channel sensor arrays into a harmonic feedback loop.',
        isBlue: true,
        blueReq: {
          type: 'manned',
          room: 'science',
          label: 'Manned Science Lab',
        },
        outcomeText:
          'Your science officer tunes sensors to record the complete alien frequency archive.',
        reward: { xp: 75, plasma: 40, spendXp: 35 },
      },
    ],
  },
  {
    id: 'fracture_dimensional_gate',
    title: 'The Fracture Frontier Gateway',
    factionId: 'solaris',
    situation:
      'A massive hyper-spatial rift tears through space before you. Beyond the emerald event horizon lies the path to New Earth.',
    options: [
      {
        text: 'Scan the rift perimeter cautiously from safe distance.',
        outcomeText:
          'You map exotic spacetime fluctuations and gather valuable scientific data.',
        reward: { xp: 55, spendXp: 30 },
      },
      {
        text: 'Fire probes directly into the swirling gravimetric core.',
        outcomeText:
          'The probe returns raw dimensional energy, though gravity shears ping your hull.',
        reward: { plasma: 45, hull: -5 },
      },
      {
        text: '🔵 [Plasma Antimatter Drives Lv 1+] Pierce the rift with near-light warp fields.',
        isBlue: true,
        blueReq: {
          type: 'module',
          moduleId: 'antimatter_drives',
          minLevel: 1,
          label: 'Plasma Antimatter Drives Lv 1+',
        },
        outcomeText:
          'Your antimatter drive stabilizes the rift! The gateway reveals the final Stellar Beacon Nav-Chart to New Earth!',
        reward: {
          xp: 150,
          reputation: 35,
          plasma: 80,
          arkArtifact: 'nav_chart',
        },
      },
      {
        text: '🔵 [Self-Healing Materials] Deploy nanite lattice to shield against spatial shear.',
        isBlue: true,
        blueReq: {
          type: 'module',
          moduleId: 'self_healing',
          minLevel: 2,
          label: 'Self-Healing Materials Lv 2+',
        },
        outcomeText:
          'Your smart hull nanotech absorbs the rift’s gravitational tidal stress, repairing micro-fractures in real time.',
        reward: { xp: 85, hull: 25, scrap: 30 },
      },
    ],
  },
];

export function checkBlueRequirement(req: BlueRequirement, state: GameState): boolean {
  if (req.type === 'module' && req.moduleId) {
    const lvl = state.moduleLevels[req.moduleId] ?? 0;
    return lvl >= (req.minLevel ?? 1);
  }
  if (req.type === 'manned' && req.room) {
    for (const p of state.layout) {
      if (p.id === req.room) {
        const inPlayer =
          state.crew.cell.x >= p.x &&
          state.crew.cell.x <= p.x + 3 &&
          state.crew.cell.y >= p.y &&
          state.crew.cell.y <= p.y + 3;
        const inPartner =
          !!state.partnerCrewCell &&
          state.partnerCrewCell.x >= p.x &&
          state.partnerCrewCell.x <= p.x + 3 &&
          state.partnerCrewCell.y >= p.y &&
          state.partnerCrewCell.y <= p.y + 3;
        return inPlayer || inPartner;
      }
    }
  }
  if (req.type === 'mothership') {
    return state.mothership.active && !!state.mothership.partner;
  }
  if (req.type === 'reputation') {
    return state.reputation >= (req.minRep ?? 0);
  }
  return false;
}
