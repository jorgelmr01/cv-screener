import { db } from './db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

class FileSystemService {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private dirHandle: any = null;

    isSupported(): boolean {
        return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async pickDirectory(): Promise<any | null> {
        if (!this.isSupported()) return null;
        try {
            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
            this.dirHandle = handle;
            await this.saveHandleToIDB(handle);
            return handle;
        } catch {
            return null;
        }
    }

    async restoreHandle(): Promise<boolean> {
        try {
            const handle = await this.loadHandleFromIDB();
            if (!handle) return false;
            const permission = await handle.queryPermission({ mode: 'readwrite' });
            if (permission === 'granted') {
                this.dirHandle = handle;
                return true;
            }
            const requested = await handle.requestPermission({ mode: 'readwrite' });
            if (requested === 'granted') {
                this.dirHandle = handle;
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    getDirectoryName(): string | null {
        return this.dirHandle?.name ?? null;
    }

    isConnected(): boolean {
        return this.dirHandle !== null;
    }

    async syncAll(): Promise<void> {
        if (!this.dirHandle) return;
        try {
            const searches = await db.getAllSearches();
            const dataDir = await this.dirHandle.getDirectoryHandle('cv-screener-data', { create: true });

            const searchesData = [];
            for (const search of searches) {
                const candidates = await db.getCandidatesBySearch(search.id!);
                const candidatesForExport = candidates.map(c => ({
                    ...c,
                    pdfDataUrl: undefined,
                    pdfUrl: undefined,
                }));
                searchesData.push({ search, candidates: candidatesForExport });
            }

            const settings = await db.getSettings();
            const exportData = {
                version: 1,
                exportedAt: new Date().toISOString(),
                settings,
                searches: searchesData,
            };

            const file = await dataDir.getFileHandle('backup.json', { create: true });
            const writable = await file.createWritable();
            await writable.write(JSON.stringify(exportData, null, 2));
            await writable.close();
        } catch (error) {
            console.error('Failed to sync data to filesystem:', error);
        }
    }

    async importFromFolder(): Promise<boolean> {
        if (!this.dirHandle) return false;
        try {
            const dataDir = await this.dirHandle.getDirectoryHandle('cv-screener-data');
            const file = await dataDir.getFileHandle('backup.json');
            const f = await file.getFile();
            const text = await f.text();
            const data = JSON.parse(text);

            if (data.settings) {
                await db.saveSettings(data.settings);
            }
            if (data.searches) {
                for (const entry of data.searches) {
                    await db.saveSearch(entry.search);
                    if (entry.candidates) {
                        for (const candidate of entry.candidates) {
                            await db.saveCandidate(candidate);
                        }
                    }
                }
            }
            return true;
        } catch {
            return false;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async saveHandleToIDB(handle: any): Promise<void> {
        const idbDb = await this.openMetaDB();
        const tx = idbDb.transaction('handles', 'readwrite');
        tx.objectStore('handles').put(handle, 'workDir');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async loadHandleFromIDB(): Promise<any | null> {
        try {
            const idbDb = await this.openMetaDB();
            const tx = idbDb.transaction('handles', 'readonly');
            return new Promise((resolve, reject) => {
                const request = tx.objectStore('handles').get('workDir');
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch {
            return null;
        }
    }

    private openMetaDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('cv-screener-meta', 1);
            request.onupgradeneeded = () => {
                request.result.createObjectStore('handles');
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

export const fileSystem = new FileSystemService();
