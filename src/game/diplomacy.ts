export type AlienSpeciesId = 'Varn' | 'Kessi' | 'Oru' | 'Thal' | 'Myrr';

export interface AlienSpeciesProfile {
  id: AlienSpeciesId;
  name: string;
  archetype: string;
  homeworld: string;
  accentColor: string;
  greeting: string;
  tradeSpecialty: string;
  treatyPerk: string;
}

export const ALIEN_SPECIES: Record<AlienSpeciesId, AlienSpeciesProfile> = {
  Varn: {
    id: 'Varn',
    name: 'Varn Consortium',
    archetype: 'Cybernetic Merchant Guild',
    homeworld: 'Varn Prime (Silicon Rings)',
    accentColor: '#38bdf8',
    greeting: 'Greetings traveler. The Consortium assesses your trade index favorably.',
    tradeSpecialty: 'Advanced Computer Cores & Tech Blueprints',
    treatyPerk: '+15% trade discount across all galaxy stations',
  },
  Kessi: {
    id: 'Kessi',
    name: 'Kessi Stargazers',
    archetype: 'Nomadic Photonic Navigators',
    homeworld: 'The Wandering Flotilla',
    accentColor: '#c084fc',
    greeting: 'Peace be across your hull. May your sails catch the stellar winds.',
    tradeSpecialty: 'Ancient Relics & Photonic Star Charts',
    treatyPerk: 'Reveals all hidden star lanes in current sector',
  },
  Oru: {
    id: 'Oru',
    name: 'Oru Miners Collective',
    archetype: 'Industrial Asteroid Guild',
    homeworld: 'Smoldering Belt 8',
    accentColor: '#fb923c',
    greeting: 'Hard work makes strong steel! Got scrap to refine, captain?',
    tradeSpecialty: 'Refined Plasma Fuel & Heavy Armor Plating',
    treatyPerk: '+20% extra Scrap harvested from asteroids & space junk',
  },
  Thal: {
    id: 'Thal',
    name: 'Thal Dominion',
    archetype: 'Honorable Spaceborne Warriors',
    homeworld: 'Thalor Stronghold',
    accentColor: '#f43f5e',
    greeting: 'State your intentions clearly. The Dominion honors strength and truth.',
    tradeSpecialty: 'Plasma Projectors & Shield Generators',
    treatyPerk: 'Hostile raiders will immediately flee or surrender on sight',
  },
  Myrr: {
    id: 'Myrr',
    name: 'Myrr Symbionts',
    archetype: 'Bio-Organic Terraformers',
    homeworld: 'Verdant Deep',
    accentColor: '#4ade80',
    greeting: 'Life breathes through the void. We welcome your carbon vessel.',
    tradeSpecialty: 'Bioregenerative Food & Crew Gene-Therapy',
    treatyPerk: 'Life support passively regenerates crew health 2x faster',
  },
};

export interface DiplomacyState {
  alliances: AlienSpeciesId[];
  activeTreaty: AlienSpeciesId | null;
  dialogueHistory: string[];
}
