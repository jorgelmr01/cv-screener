import { create } from 'zustand';
import { db } from '../services/db';
import { Candidate, Search, AppSettings, ActivityLogEntry, ChatMessage } from '../types';
import { getStageLabel } from '../types/pipeline';

interface AppState {
    searches: Search[];
    currentSearch: Search | null;
    candidates: Candidate[];
    settings: AppSettings;
    chatMessages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];

    init: () => Promise<void>;
    setSettings: (settings: AppSettings) => Promise<void>;

    loadSearches: () => Promise<void>;
    createSearch: (search: Omit<Search, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
    selectSearch: (id: number) => Promise<void>;
    updateSearch: (search: Search) => Promise<void>;
    deleteSearch: (id: number) => Promise<void>;
    duplicateSearch: (id: number) => Promise<number>;

    addCandidate: (candidate: Candidate) => Promise<void>;
    updateCandidate: (candidate: Candidate) => Promise<void>;
    deleteCandidate: (id: string) => Promise<void>;
    moveCandidate: (id: string, status: Candidate['status'], rejectionReason?: string) => Promise<void>;
    toggleFavorite: (candidateId: string) => Promise<void>;
    bulkMoveCandidate: (ids: string[], status: Candidate['status']) => Promise<void>;
    bulkDeleteCandidates: (ids: string[]) => Promise<void>;
    bulkAddTag: (ids: string[], tag: string) => Promise<void>;

    addChatMessage: (message: ChatMessage) => Promise<void>;
    loadChatMessages: (searchId: number) => Promise<void>;

    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    removeToast: (id: string) => void;
}

function createActivityEntry(
    action: ActivityLogEntry['action'],
    description: string,
    from?: string,
    to?: string
): ActivityLogEntry {
    return {
        id: crypto.randomUUID(),
        action,
        description,
        from,
        to,
        date: new Date().toISOString(),
    };
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
    chatMessages: [],
    isLoading: false,
    error: null,
    toasts: [],

    init: async () => {
        set({ isLoading: true });
        try {
            const settings = await db.getSettings();
            const searches = await db.getAllSearches();
            set({
                settings: settings || DEFAULT_SETTINGS,
                searches: searches || []
            });
            const lastSearchId = localStorage.getItem('lastSearchId');
            if (lastSearchId) {
                await get().selectSearch(parseInt(lastSearchId));
            }
        } catch (error) {
            console.error('Failed to initialize app:', error);
            set({ error: 'Error al cargar los datos de la aplicación' });
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
        const newSearch: Search = {
            ...searchData,
            createdAt: now,
            updatedAt: now,
        };
        const id = await db.saveSearch(newSearch);
        newSearch.id = id;
        set(state => ({
            searches: [...state.searches, newSearch],
            currentSearch: newSearch,
            candidates: []
        }));
        localStorage.setItem('lastSearchId', id.toString());
        get().addToast(`Búsqueda "${searchData.name}" creada`, 'success');
        return id;
    },

    selectSearch: async (id) => {
        set({ isLoading: true });
        try {
            const search = await db.getSearch(id);
            if (search) {
                const candidates = await db.getCandidatesBySearch(id);
                const chatMessages = await db.getChatMessages(id);
                set({ currentSearch: search, candidates, chatMessages: chatMessages || [] });
                localStorage.setItem('lastSearchId', id.toString());
            }
        } catch (error) {
            console.error('Failed to select search:', error);
            set({ error: 'Error al cargar la búsqueda' });
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

    deleteSearch: async (id) => {
        const candidates = await db.getCandidatesBySearch(id);
        await Promise.all(candidates.map(c => db.deleteCandidate(c.id)));
        await db.deleteSearch(id);
        set(state => ({
            searches: state.searches.filter(s => s.id !== id),
            currentSearch: state.currentSearch?.id === id ? null : state.currentSearch,
            candidates: state.currentSearch?.id === id ? [] : state.candidates
        }));
        const lastSearchId = localStorage.getItem('lastSearchId');
        if (lastSearchId && parseInt(lastSearchId) === id) {
            localStorage.removeItem('lastSearchId');
        }
        get().addToast('Búsqueda eliminada', 'info');
    },

    duplicateSearch: async (id) => {
        const search = await db.getSearch(id);
        if (!search) throw new Error('Search not found');
        const now = new Date().toISOString();
        const newSearch: Search = {
            name: `${search.name} (copia)`,
            jobDescription: search.jobDescription,
            personalizedInstructions: search.personalizedInstructions,
            evaluationCriteria: { ...search.evaluationCriteria },
            status: 'active',
            createdAt: now,
            updatedAt: now,
        };
        const newId = await db.saveSearch(newSearch);
        newSearch.id = newId;
        set(state => ({ searches: [...state.searches, newSearch] }));
        get().addToast(`Búsqueda duplicada como "${newSearch.name}"`, 'success');
        return newId;
    },

    addCandidate: async (candidate) => {
        const entry = createActivityEntry('created', 'Candidato añadido al proceso');
        const withLog = { ...candidate, activityLog: [entry] };
        await db.saveCandidate(withLog);
        set(state => ({ candidates: [...state.candidates, withLog] }));
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
        set(state => ({ candidates: state.candidates.filter(c => c.id !== id) }));
    },

    moveCandidate: async (id, status, rejectionReason) => {
        const candidate = get().candidates.find(c => c.id === id);
        if (candidate && candidate.status !== status) {
            const entry = createActivityEntry(
                'status_change',
                `Estado cambiado de ${getStageLabel(candidate.status)} a ${getStageLabel(status)}`,
                candidate.status,
                status
            );
            const log = [...(candidate.activityLog || []), entry];
            const updatedCandidate = {
                ...candidate,
                status,
                activityLog: log,
                updatedAt: new Date().toISOString(),
                ...(rejectionReason ? { rejectionReason } : {}),
            };
            await db.saveCandidate(updatedCandidate);
            set(state => ({
                candidates: state.candidates.map(c => c.id === id ? updatedCandidate : c)
            }));
        }
    },

    toggleFavorite: async (candidateId) => {
        const candidate = get().candidates.find(c => c.id === candidateId);
        if (candidate) {
            const entry = createActivityEntry(
                'favorite_toggled',
                candidate.isFavorite ? 'Removido de favoritos' : 'Marcado como favorito'
            );
            const updatedCandidate = {
                ...candidate,
                isFavorite: !candidate.isFavorite,
                activityLog: [...(candidate.activityLog || []), entry],
                updatedAt: new Date().toISOString()
            };
            await db.saveCandidate(updatedCandidate);
            set(state => ({
                candidates: state.candidates.map(c => c.id === candidateId ? updatedCandidate : c)
            }));
        }
    },

    bulkMoveCandidate: async (ids, status) => {
        const state = get();
        for (const id of ids) {
            await state.moveCandidate(id, status);
        }
        get().addToast(`${ids.length} candidatos movidos a ${getStageLabel(status)}`, 'success');
    },

    bulkDeleteCandidates: async (ids) => {
        for (const id of ids) {
            await db.deleteCandidate(id);
        }
        set(state => ({
            candidates: state.candidates.filter(c => !ids.includes(c.id))
        }));
        get().addToast(`${ids.length} candidatos eliminados`, 'info');
    },

    bulkAddTag: async (ids, tag) => {
        const state = get();
        const updates = state.candidates
            .filter(c => ids.includes(c.id))
            .map(c => {
                const tags = Array.from(new Set([...(c.tags || []), tag]));
                const entry = createActivityEntry('tag_added', `Tag "${tag}" añadido`);
                return { ...c, tags, activityLog: [...(c.activityLog || []), entry], updatedAt: new Date().toISOString() };
            });
        for (const c of updates) {
            await db.saveCandidate(c);
        }
        set(state => ({
            candidates: state.candidates.map(c => {
                const updated = updates.find(u => u.id === c.id);
                return updated || c;
            })
        }));
        get().addToast(`Tag "${tag}" añadido a ${ids.length} candidatos`, 'success');
    },

    addChatMessage: async (message) => {
        await db.saveChatMessage(message);
        set(state => ({ chatMessages: [...state.chatMessages, message] }));
    },

    loadChatMessages: async (searchId) => {
        const messages = await db.getChatMessages(searchId);
        set({ chatMessages: messages || [] });
    },

    addToast: (message, type = 'info') => {
        const id = crypto.randomUUID();
        set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => get().removeToast(id), 4000);
    },

    removeToast: (id) => {
        set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    },
}));
