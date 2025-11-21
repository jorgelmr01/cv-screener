import { create } from 'zustand';
import { db } from '../services/db';
import { Candidate, Search, AppSettings } from '../types';

interface AppState {
    // Data
    searches: Search[];
    currentSearch: Search | null;
    candidates: Candidate[];
    settings: AppSettings;

    // UI State
    isLoading: boolean;
    error: string | null;

    // Actions
    init: () => Promise<void>;
    setSettings: (settings: AppSettings) => Promise<void>;

    // Search Actions
    loadSearches: () => Promise<void>;
    createSearch: (search: Omit<Search, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
    selectSearch: (id: number) => Promise<void>;
    updateSearch: (search: Search) => Promise<void>;

    // Candidate Actions
    addCandidate: (candidate: Candidate) => Promise<void>;
    updateCandidate: (candidate: Candidate) => Promise<void>;
    deleteCandidate: (id: string) => Promise<void>;
    moveCandidate: (id: string, status: Candidate['status']) => Promise<void>;
    toggleFavorite: (candidateId: string) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
    apiKey: '',
    selectedModel: 'gpt-4o-mini',
    theme: 'light',
};

export const useAppStore = create<AppState>((set, get) => ({
    searches: [],
    currentSearch: null,
    candidates: [],
    settings: DEFAULT_SETTINGS,
    isLoading: false,
    error: null,

    init: async () => {
        set({ isLoading: true });
        try {
            const settings = await db.getSettings();
            const searches = await db.getAllSearches();

            set({
                settings: settings || DEFAULT_SETTINGS,
                searches: searches || []
            });

            // Load last active search if possible (could be stored in localStorage)
            const lastSearchId = localStorage.getItem('lastSearchId');
            if (lastSearchId) {
                await get().selectSearch(parseInt(lastSearchId));
            }
        } catch (error) {
            console.error('Failed to initialize app:', error);
            set({ error: 'Failed to load application data' });
        } finally {
            set({ isLoading: false });
        }
    },

    setSettings: async (settings) => {
        await db.saveSettings(settings);
        set({ settings });
    },

    loadSearches: async () => {
        const searches = await db.getAllSearches();
        set({ searches });
    },

    createSearch: async (searchData) => {
        const now = new Date().toISOString();
        const settings = get().settings;

        // Use default criteria from settings if available, otherwise use hardcoded defaults
        const evaluationCriteria = settings.defaultEvaluationCriteria || {
            relevance: { name: 'Relevancia', desc: '¿Qué tan relevante es el perfil para el puesto?' },
            education: { name: 'Educación', desc: '¿Cumple con los requisitos educativos?' },
            previousJobs: { name: 'Experiencia', desc: '¿Tiene experiencia relevante en puestos similares?' },
            proactivity: { name: 'Proactividad', desc: '¿Muestra signos de proactividad y logros?' }
        };

        const newSearch: Search = {
            ...searchData,
            evaluationCriteria, // Use the determined criteria
            status: 'active',
            createdAt: now,
            updatedAt: now,
        };

        const id = await db.saveSearch(newSearch);
        newSearch.id = id;

        set(state => ({
            searches: [...state.searches, newSearch],
            currentSearch: newSearch,
            candidates: [] // New search has no candidates
        }));

        localStorage.setItem('lastSearchId', id.toString());
        return id;
    },

    selectSearch: async (id) => {
        set({ isLoading: true });
        try {
            const search = await db.getSearch(id);
            if (search) {
                const candidates = await db.getCandidatesBySearch(id);
                set({ currentSearch: search, candidates });
                localStorage.setItem('lastSearchId', id.toString());
            }
        } catch (error) {
            console.error('Failed to select search:', error);
            set({ error: 'Failed to load search' });
        } finally {
            set({ isLoading: false });
        }
    },

    updateSearch: async (search) => {
        const updatedSearch = { ...search, updatedAt: new Date().toISOString() };
        await db.saveSearch(updatedSearch);
        set(state => ({
            searches: state.searches.map(s => s.id === search.id ? updatedSearch : s),
            currentSearch: state.currentSearch?.id === search.id ? updatedSearch : state.currentSearch
        }));
    },

    addCandidate: async (candidate) => {
        await db.saveCandidate(candidate);
        set(state => ({
            candidates: [...state.candidates, candidate]
        }));
    },

    updateCandidate: async (candidate) => {
        const updatedCandidate = { ...candidate, updatedAt: new Date().toISOString() };
        await db.saveCandidate(updatedCandidate);
        set(state => ({
            candidates: state.candidates.map(c => c.id === candidate.id ? updatedCandidate : c)
        }));
    },

    deleteCandidate: async (id) => {
        await db.deleteCandidate(id);
        set(state => ({
            candidates: state.candidates.filter(c => c.id !== id)
        }));
    },

    moveCandidate: async (id, status) => {
        const candidate = get().candidates.find(c => c.id === id);
        if (candidate) {
            const updatedCandidate = { ...candidate, status, updatedAt: new Date().toISOString() };
            await get().updateCandidate(updatedCandidate);
        }
    },

    toggleFavorite: async (candidateId: string) => {
        const state = get();
        const candidate = state.candidates.find(c => c.id === candidateId);
        if (candidate) {
            const updatedCandidate = { ...candidate, isFavorite: !candidate.isFavorite, updatedAt: new Date().toISOString() };
            await db.saveCandidate(updatedCandidate);
            set(state => ({
                candidates: state.candidates.map(c => c.id === candidateId ? updatedCandidate : c)
            }));
        }
    }
}));
