import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Candidate, Search, AppSettings } from '../types';

interface CVScreenerDB extends DBSchema {
    searches: {
        key: number;
        value: Search;
        indexes: { 'by-status': string };
    };
    candidates: {
        key: string;
        value: Candidate;
        indexes: { 'by-search': number; 'by-status': string; 'by-email': string };
    };
    settings: {
        key: string;
        value: AppSettings;
    };
}

const DB_NAME = 'cv-screener-db';
const DB_VERSION = 1;

class DBService {
    private db: Promise<IDBPDatabase<CVScreenerDB>>;

    constructor() {
        this.db = openDB<CVScreenerDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Searches store
                const searchStore = db.createObjectStore('searches', { keyPath: 'id', autoIncrement: true });
                searchStore.createIndex('by-status', 'status');

                // Candidates store
                const candidateStore = db.createObjectStore('candidates', { keyPath: 'id' });
                candidateStore.createIndex('by-search', 'searchId');
                candidateStore.createIndex('by-status', 'status');
                candidateStore.createIndex('by-email', 'email');

                // Settings store
                db.createObjectStore('settings');
            },
        });
    }

    // Search Methods
    async getAllSearches(): Promise<Search[]> {
        return (await this.db).getAll('searches');
    }

    async getSearch(id: number): Promise<Search | undefined> {
        return (await this.db).get('searches', id);
    }

    async saveSearch(search: Search): Promise<number> {
        const db = await this.db;
        const id = await db.put('searches', search);
        return id;
    }

    async deleteSearch(id: number): Promise<void> {
        return (await this.db).delete('searches', id);
    }

    // Candidate Methods
    async getCandidatesBySearch(searchId: number): Promise<Candidate[]> {
        return (await this.db).getAllFromIndex('candidates', 'by-search', searchId);
    }

    async saveCandidate(candidate: Candidate): Promise<string> {
        return (await this.db).put('candidates', candidate);
    }

    async deleteCandidate(id: string): Promise<void> {
        return (await this.db).delete('candidates', id);
    }

    // Settings Methods
    async getSettings(): Promise<AppSettings | undefined> {
        return (await this.db).get('settings', 'app-settings');
    }

    async saveSettings(settings: AppSettings): Promise<string> {
        return (await this.db).put('settings', settings, 'app-settings');
    }
}

export const db = new DBService();
