import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Candidate, Search, AppSettings, ChatMessage } from '../types';

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
    chatMessages: {
        key: string;
        value: ChatMessage;
        indexes: { 'by-search': number };
    };
}

const DB_NAME = 'cv-screener-db';
const DB_VERSION = 2;

class DBService {
    private db: Promise<IDBPDatabase<CVScreenerDB>>;

    constructor() {
        this.db = openDB<CVScreenerDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                if (oldVersion < 1) {
                    const searchStore = db.createObjectStore('searches', { keyPath: 'id', autoIncrement: true });
                    searchStore.createIndex('by-status', 'status');

                    const candidateStore = db.createObjectStore('candidates', { keyPath: 'id' });
                    candidateStore.createIndex('by-search', 'searchId');
                    candidateStore.createIndex('by-status', 'status');
                    candidateStore.createIndex('by-email', 'email');

                    db.createObjectStore('settings');
                }
                if (oldVersion < 2) {
                    if (!db.objectStoreNames.contains('chatMessages')) {
                        const chatStore = db.createObjectStore('chatMessages', { keyPath: 'id' });
                        chatStore.createIndex('by-search', 'searchId');
                    }
                }
            },
        });
    }

    async getAllSearches(): Promise<Search[]> {
        return (await this.db).getAll('searches');
    }

    async getSearch(id: number): Promise<Search | undefined> {
        return (await this.db).get('searches', id);
    }

    async saveSearch(search: Search): Promise<number> {
        return (await this.db).put('searches', search);
    }

    async deleteSearch(id: number): Promise<void> {
        const chatMessages = await this.getChatMessages(id);
        for (const msg of chatMessages) {
            await (await this.db).delete('chatMessages', msg.id);
        }
        return (await this.db).delete('searches', id);
    }

    async getCandidatesBySearch(searchId: number): Promise<Candidate[]> {
        return (await this.db).getAllFromIndex('candidates', 'by-search', searchId);
    }

    async saveCandidate(candidate: Candidate): Promise<string> {
        return (await this.db).put('candidates', candidate);
    }

    async deleteCandidate(id: string): Promise<void> {
        return (await this.db).delete('candidates', id);
    }

    async getSettings(): Promise<AppSettings | undefined> {
        return (await this.db).get('settings', 'app-settings');
    }

    async saveSettings(settings: AppSettings): Promise<string> {
        return (await this.db).put('settings', settings, 'app-settings');
    }

    async getChatMessages(searchId: number): Promise<ChatMessage[]> {
        return (await this.db).getAllFromIndex('chatMessages', 'by-search', searchId);
    }

    async saveChatMessage(message: ChatMessage): Promise<string> {
        return (await this.db).put('chatMessages', message);
    }
}

export const db = new DBService();
