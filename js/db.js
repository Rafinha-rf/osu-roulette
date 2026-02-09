export class OsuDatabase {
    constructor() {
        this.dbName = 'OsuRouletteDB';
        this.version = 1; 
        this.db = null;
    }

    async open() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('history')) {
                    db.createObjectStore('history', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (e) => reject(e.target.error);
        });
    }

    async saveHistory(mapa) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');
            const data = {
                id: mapa.id,
                title: mapa.title,
                artist: mapa.artist,
                cover: mapa.cover,
                sr: mapa.sr,
                diffColor: mapa.diffColor,
                url: mapa.url,
                timestamp: Date.now()
            };

            store.put(data);

            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
                const items = getAllRequest.result;
                if (items.length > 8) {
                    items.sort((a, b) => a.timestamp - b.timestamp);
                    const toDelete = items.slice(0, items.length - 8);
                    toDelete.forEach(item => store.delete(item.id));
                }
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject(e);
        });
    }

    async getAllHistory() {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readonly');
            const store = transaction.objectStore('history');
            const request = store.getAll();

            request.onsuccess = () => {
                const sorted = request.result.sort((a, b) => b.timestamp - a.timestamp);
                resolve(sorted);
            };
            request.onerror = (e) => reject(e);
        });
    }

    async clearHistory() {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readwrite');
            
            const store = transaction.objectStore('history'); 
            
            store.clear();
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject(e);
        });
    }
}